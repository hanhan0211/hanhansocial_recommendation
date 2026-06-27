import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markAsRead,
  markByTypeAsRead,
  deleteNotification,
  createTestNotification,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Tất cả routes đều yêu cầu đăng nhập
router.use(protect);

// GET /api/notifications - Lấy tất cả thông báo
router.get("/", getNotifications);

// GET /api/notifications/unread-count - Đếm số thông báo chưa đọc
router.get("/unread-count", getUnreadCount);

// PUT /api/notifications/mark-as-read - Đánh dấu tất cả là đã đọc
router.put("/mark-as-read", markAllAsRead);

// PUT /api/notifications/mark-type-as-read - Đánh dấu theo type là đã đọc
router.put("/mark-type-as-read", markByTypeAsRead);

// PUT /api/notifications/:id/read - Đánh dấu một thông báo là đã đọc
router.put("/:id/read", markAsRead);

// DELETE /api/notifications/:id - Xóa thông báo
router.delete("/:id", deleteNotification);

// POST /api/notifications/test - Tạo thông báo test
router.post("/test", createTestNotification);

export default router;
