import mongoose from "mongoose";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { io, getReceiverSocketId, emitUnreadCountUpdate } from "../socket/socket.js";
import { createNotification } from "./notificationController.js";

const populateMessageQuery = (query) =>
  query
    .populate("senderId", "username fullname avatar")
    .populate("receiverId", "username fullname avatar")
    .populate({
      path: "postId",
      select: "content images createdAt userId",
      populate: { path: "userId", select: "username fullname avatar" },
    });

const emitNewMessage = (message) => {
  if (!io || !message) return;

  const senderId = message.senderId?._id?.toString() || message.senderId?.toString();
  const receiverId =
    message.receiverId?._id?.toString() || message.receiverId?.toString();

  const receiverSocketId = getReceiverSocketId(receiverId);
  const senderSocketId = getReceiverSocketId(senderId);

  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", message);
  }
  if (senderSocketId && senderSocketId !== receiverSocketId) {
    io.to(senderSocketId).emit("newMessage", message);
  }

  // Phát cập nhật số đếm tin nhắn chưa đọc cho receiver
  emitUnreadCountUpdate(receiverId);
};

// GET /api/messages/contacts — danh sách người đã follow + đã từng nhắn tin
export const getChatContacts = async (req, res) => {
  try {
    const myId = req.user._id;

    const me = await User.findById(myId).populate(
      "following",
      "username fullname avatar"
    );

    const contactsMap = new Map();

    (me?.following || []).forEach((user) => {
      if (user?._id) {
        contactsMap.set(user._id.toString(), {
          user,
          lastMessage: null,
        });
      }
    });

    const recentMessages = await Message.find({
      $or: [{ senderId: myId }, { receiverId: myId }],
    })
      .sort({ createdAt: -1 })
      .limit(200);

    for (const msg of recentMessages) {
      const partnerId =
        msg.senderId.toString() === myId.toString()
          ? msg.receiverId.toString()
          : msg.senderId.toString();

      if (!contactsMap.has(partnerId)) {
        const partner = await User.findById(partnerId).select(
          "username fullname avatar"
        );
        if (partner) {
          contactsMap.set(partnerId, { user: partner, lastMessage: null });
        }
      }

      const entry = contactsMap.get(partnerId);
      if (entry && !entry.lastMessage) {
        entry.lastMessage = msg;
      }
    }

    const contacts = Array.from(contactsMap.values()).map(({ user, lastMessage }) => ({
      _id: user._id,
      username: user.username,
      fullname: user.fullname,
      avatar: user.avatar,
      lastMessage: lastMessage
        ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            isSharePost: lastMessage.isSharePost,
            senderId: lastMessage.senderId,
            isRead: lastMessage.isRead,
          }
        : null,
    }));

    contacts.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt
        ? new Date(a.lastMessage.createdAt).getTime()
        : 0;
      const bTime = b.lastMessage?.createdAt
        ? new Date(b.lastMessage.createdAt).getTime()
        : 0;
      return bTime - aTime;
    });

    res.json(contacts);
  } catch (error) {
    console.error("❌ Lỗi getChatContacts:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// GET /api/messages/chat/:id
export const getChatMessages = async (req, res) => {
  try {
    const myId = req.user._id;
    const otherId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(otherId)) {
      return res.status(400).json({ message: "ID người dùng không hợp lệ" });
    }

    const messages = await populateMessageQuery(
      Message.find({
        $or: [
          { senderId: myId, receiverId: otherId },
          { senderId: otherId, receiverId: myId },
        ],
      }).sort({ createdAt: 1 })
    );

    const updateResult = await Message.updateMany(
      { senderId: otherId, receiverId: myId, isRead: false },
      { isRead: true }
    );

    // Nếu có tin nhắn vừa được đánh dấu đọc, emit cập nhật badge real-time
    if (updateResult.modifiedCount > 0) {
      emitUnreadCountUpdate(myId.toString());
    }

    res.json(messages);
  } catch (error) {
    console.error("❌ Lỗi getChatMessages:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// POST /api/messages/send/:id
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const receiverId = req.params.id;
    const { content, postId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(receiverId)) {
      return res.status(400).json({ message: "ID người nhận không hợp lệ" });
    }

    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({ message: "Không thể gửi tin nhắn cho chính mình" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Người nhận không tồn tại" });
    }

    // 🔒 Kiểm tra tài khoản riêng tư: Chặn nhắn tin nếu chưa được duyệt follow
    if (receiver.isPrivateAccount) {
      const isApprovedFollower = receiver.followers.some(
        (followerId) => followerId.toString() === senderId.toString()
      );
      if (!isApprovedFollower) {
        return res.status(403).json({
          message: "Tài khoản này là riêng tư. Bạn cần được chấp nhận theo dõi trước khi nhắn tin.",
        });
      }
    }

    if (!content?.trim() && !postId) {
      return res.status(400).json({ message: "Nội dung tin nhắn không được để trống" });
    }

    const message = await Message.create({
      senderId,
      receiverId,
      content: content?.trim() || "Đã chia sẻ một bài viết",
      isSharePost: Boolean(postId),
      postId: postId || null,
    });

    const populatedMessage = await populateMessageQuery(
      Message.findById(message._id)
    );

    emitNewMessage(populatedMessage);

    // 🔔 Tạo thông báo tin nhắn mới (chỉ khi người nhận không đang ở trong chat)
    // Frontend sẽ xử lý logic không hiện thông báo nếu đang ở trang chat
    await createNotification({
      recipientId: receiverId,
      senderId: senderId,
      type: "message",
      content: content?.substring(0, 100) || "Đã chia sẻ một bài viết",
    });

    res.status(201).json(populatedMessage);
  } catch (error) {
    console.error("❌ Lỗi sendMessage:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// GET /api/messages/unread-count — đếm tổng số tin nhắn chưa đọc
export const getUnreadCount = async (req, res) => {
  try {
    const myId = req.user._id;
    
    const unreadCount = await Message.countDocuments({
      receiverId: myId,
      isRead: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("❌ Lỗi getUnreadCount:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// PUT /api/messages/mark-as-read/:senderId — đánh dấu tin nhắn từ người nào đó là đã đọc
export const markAsRead = async (req, res) => {
  try {
    const myId = req.user._id;
    const senderId = req.params.senderId;

    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: "ID người gửi không hợp lệ" });
    }

    const result = await Message.updateMany(
      {
        senderId: senderId,
        receiverId: myId,
        isRead: false,
      },
      { isRead: true },
      { new: true }
    );

    // Đếm lại tổng số tin nhắn chưa đọc hiện tại
    const unreadCount = await Message.countDocuments({
      receiverId: myId,
      isRead: false,
    });

    // Emit socket event để cập nhật badge real-time trên các tab/trang khác
    emitUnreadCountUpdate(myId.toString());

    res.json({ 
      modifiedCount: result.modifiedCount,
      unreadCount 
    });
  } catch (error) {
    console.error("❌ Lỗi markAsRead:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};
