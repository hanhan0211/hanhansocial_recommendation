import express from "express";
import { handleGenerateCaption, handleRewriteContent, handleSuggestHashtags } from "../controllers/aiController.js";
import { protect, checkBanned } from "../middleware/authMiddleware.js";

const router = express.Router();

// Tạo caption AI từ ý tưởng
router.post("/generate-caption", protect, checkBanned, handleGenerateCaption);

// Viết lại nội dung theo tone mới
router.post("/rewrite", protect, checkBanned, handleRewriteContent);

// Gợi ý hashtag thông minh
router.post("/suggest-hashtags", protect, checkBanned, handleSuggestHashtags);

export default router;
