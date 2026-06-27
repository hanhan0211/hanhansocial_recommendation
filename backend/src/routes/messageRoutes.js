import express from "express";
import { protect, checkBanned } from "../middleware/authMiddleware.js";
import {
  getChatContacts,
  getChatMessages,
  sendMessage,
  getUnreadCount,
  markAsRead,
} from "../controllers/messageController.js";

const router = express.Router();

router.get("/contacts", protect, getChatContacts);
router.get("/chat/:id", protect, getChatMessages);
router.get("/unread-count", protect, getUnreadCount);
router.post("/send/:id", protect, checkBanned, sendMessage);
router.put("/mark-as-read/:senderId", protect, markAsRead);

export default router;
