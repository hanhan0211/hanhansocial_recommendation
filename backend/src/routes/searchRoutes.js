import express from 'express';
import {
  searchAll,
  getSearchHistory,
  addSearchHistory,
  deleteSearchHistoryItem,
  clearAllSearchHistory
} from '../controllers/searchController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// 1. Tìm kiếm tổng hợp (Users, Posts, Hashtags)
router.get('/all', protect, searchAll);

// 2. Lấy lịch sử tìm kiếm
router.get('/history', protect, getSearchHistory);

// 3. Lưu lịch sử tìm kiếm mới
router.post('/history', protect, addSearchHistory);

// 4. Xóa toàn bộ lịch sử tìm kiếm (phải đứng trước route động /:id)
router.delete('/history/all', protect, clearAllSearchHistory);

// 5. Xóa một mục lịch sử cụ thể
router.delete('/history/:id', protect, deleteSearchHistoryItem);

export default router;
