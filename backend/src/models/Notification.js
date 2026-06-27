import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    // Người nhận thông báo
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Người thực hiện hành động (gây ra thông báo)
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Loại thông báo
    type: {
      type: String,
      enum: ["like", "comment", "share", "follow", "follow_request", "save", "message", "warning"],
      required: true,
    },
    // Bài viết liên quan (nếu có)
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },
    // Nội dung comment hoặc message (nếu có)
    content: {
      type: String,
      default: "",
    },
    // Trạng thái đã đọc
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index để tăng tốc query
notificationSchema.index({ recipientId: 1, createdAt: -1 });
notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ recipientId: 1, type: 1 });

export default mongoose.model("Notification", notificationSchema);
