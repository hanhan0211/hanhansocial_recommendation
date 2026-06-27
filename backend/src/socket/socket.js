import { Server } from "socket.io";
import Message from "../models/Message.js";

export let io = null;
export const userSocketMap = {};

export const getReceiverSocketId = (receiverId) => {
  if (!receiverId) return null;
  const socketId = userSocketMap[receiverId.toString()];
  console.log(`🔌 Getting socket for user ${receiverId}: ${socketId}`);
  return socketId || null;
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    const userId = socket.handshake.auth?.userId || socket.handshake.query?.userId;

    if (userId) {
      userSocketMap[userId.toString()] = socket.id;
      socket.join(userId.toString());
      console.log(`🔌 User online: ${userId} → ${socket.id}`);
      console.log(`🔌 Active connections:`, Object.keys(userSocketMap));
    }

    socket.on("disconnect", () => {
      if (userId && userSocketMap[userId.toString()] === socket.id) {
        delete userSocketMap[userId.toString()];
        console.log(`🔌 User offline: ${userId}`);
        console.log(`🔌 Active connections:`, Object.keys(userSocketMap));
      }
    });
  });

  console.log("✅ Socket.io initialized");
  return io;
};

// Hàm phát event unreadCountUpdated tới receiver
export const emitUnreadCountUpdate = async (receiverId) => {
  if (!io || !receiverId) return;

  try {
    const unreadCount = await Message.countDocuments({
      receiverId,
      isRead: false,
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("unreadCountUpdated", { unreadCount });
      console.log(`📧 Sent unread count update to ${receiverId}: ${unreadCount}`);
    }
  } catch (error) {
    console.error("❌ Lỗi emitUnreadCountUpdate:", error);
  }
};
