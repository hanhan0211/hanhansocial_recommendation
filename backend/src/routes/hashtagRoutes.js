import express from 'express';
import { getTrendingHashtags } from '../controllers/hashtagController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Lấy danh sách hashtag thịnh hành
router.get('/trending', protect, getTrendingHashtags);

export default router;
