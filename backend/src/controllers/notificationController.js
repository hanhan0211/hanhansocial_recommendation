import Notification from "../models/Notification.js";
import { io, getReceiverSocketId } from "../socket/socket.js";

// ==========================================
// HÀM TẠO VÀ GỬI THÔNG BÁO QUA SOCKET
// ==========================================
export const createNotification = async ({
  recipientId,
  senderId,
  type,
  postId = null,
  content = "",
}) => {
  try {
    console.log("🔔 createNotification called:", { recipientId, senderId, type, postId, content });

    // Không tạo thông báo nếu người gửi và người nhận là cùng 1 người
    if (recipientId.toString() === senderId.toString()) {
      console.log("🔔 Skipping notification - same user");
      return null;
    }

    // Tạo thông báo mới
    const notification = await Notification.create({
      recipientId,
      senderId,
      type,
      postId,
      content,
    });

    console.log("✅ Notification created:", notification);

    // Populate thông tin sender và post
    const populatedNotification = await Notification.findById(notification._id)
      .populate("senderId", "username fullname avatar")
      .populate({
        path: "postId",
        select: "content images",
      });

    console.log("✅ Populated notification:", populatedNotification);

    // Gửi thông báo real-time qua Socket.io
    if (io) {
      const receiverSocketId = getReceiverSocketId(recipientId);
      console.log("🔌 Receiver socket ID:", receiverSocketId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit("newNotification", populatedNotification);
        console.log("✅ Notification sent via socket");
      } else {
        console.log("❌ No socket connection for recipient");
      }
    } else {
      console.log("❌ Socket.io not initialized");
    }

    return populatedNotification;
  } catch (error) {
    console.error("❌ Lỗi createNotification:", error);
    return null;
  }
};

// ==========================================
// LẤY TẤT CẢ THÔNG BÁO CỦA USER
// ==========================================
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.query; // Lọc theo type nếu có

    const filter = { recipientId: userId };
    if (type) {
      filter.type = type;
    }

    const notifications = await Notification.find(filter)
      .populate("senderId", "username fullname avatar")
      .populate({
        path: "postId",
        select: "content images",
      })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(notifications);
  } catch (error) {
    console.error("❌ Lỗi getNotifications:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// ĐẾM SỐ THÔNG BÁO CHƯA ĐỌC
// ==========================================
// @route   GET /api/notifications/unread-count
// @access  Private
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;

    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    res.json({ unreadCount });
  } catch (error) {
    console.error("❌ Lỗi getUnreadCount:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// ĐÁNH DẤU TẤT CẢ THÔNG BÁO LÀ ĐÃ ĐỌC
// ==========================================
// @route   PUT /api/notifications/mark-as-read
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.updateMany(
      { recipientId: userId, isRead: false },
      { isRead: true }
    );

    res.json({ message: "Đã đánh dấu tất cả thông báo là đã đọc" });
  } catch (error) {
    console.error("❌ Lỗi markAllAsRead:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// ĐÁNH DẤU THÔNG BÁO THEO TYPE LÀ ĐÃ ĐỌC
// ==========================================
// @route   PUT /api/notifications/mark-type-as-read
// @access  Private
export const markByTypeAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type } = req.body;

    if (!type) {
      return res.status(400).json({ message: "Thiếu type thông báo" });
    }

    await Notification.updateMany(
      { recipientId: userId, type, isRead: false },
      { isRead: true }
    );

    // Trả về số thông báo chưa đọc còn lại
    const unreadCount = await Notification.countDocuments({
      recipientId: userId,
      isRead: false,
    });

    // Emit socket để NotificationBadge cập nhật real-time
    if (io) {
      const socketId = getReceiverSocketId(userId.toString());
      if (socketId) {
        io.to(socketId).emit("notificationUnreadCountUpdated", { unreadCount });
      }
    }

    res.json({ message: `Đã đánh dấu thông báo type "${type}" là đã đọc`, unreadCount });
  } catch (error) {
    console.error("❌ Lỗi markByTypeAsRead:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// ĐÁNH DẤU MỘT THÔNG BÁO LÀ ĐÃ ĐỌC
// ==========================================
// @route   PUT /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipientId: userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    res.json(notification);
  } catch (error) {
    console.error("❌ Lỗi markAsRead:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// XÓA THÔNG BÁO
// ==========================================
// @route   DELETE /api/notifications/:id
// @access  Private
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findOneAndDelete({
      _id: id,
      recipientId: userId,
    });

    if (!notification) {
      return res.status(404).json({ message: "Không tìm thấy thông báo" });
    }

    res.json({ message: "Đã xóa thông báo" });
  } catch (error) {
    console.error("❌ Lỗi deleteNotification:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// TẠO THÔNG BÁO TEST (CHỈ ĐỂ DEBUG)
// ==========================================
// @route   POST /api/notifications/test
// @access  Private
export const createTestNotification = async (req, res) => {
  try {
    const userId = req.user._id;
    const { type = "like" } = req.body;

    console.log("🧪 Creating test notification:", { userId, type });

    const notification = await createNotification({
      recipientId: userId,
      senderId: userId, // Tự gửi cho chính mình để test
      type: type,
      content: "Đây là thông báo test",
    });

    res.json({ message: "Test notification created", notification });
  } catch (error) {
    console.error("❌ Lỗi createTestNotification:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};
