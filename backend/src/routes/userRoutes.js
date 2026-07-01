import express from 'express';
import {
  searchUsers,
  homeSearchUsers,
  getHomeSearchHistory,
  deleteHomeSearchHistory,
  getUserProfile,
  updateUserProfile,
  followUser,
  getSuggestedUsers,
  getConnectSuggestions,
  getShareSuggestions,
  getUserFollowers,
  getUserFollowing,
  toggleSavePost,
  getSavedPosts,
  getUserById,
  getFollowRequests,
  acceptFollowRequest,
  declineFollowRequest,
  completeOnboarding,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Middleware kiểm tra admin
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
  }
  next();
};

// ── ADMIN ROUTES (phải đứng TRƯỜC route động /:id) ──
// GET all users (new admin API)
router.get('/admin/users', protect, adminOnly, async (req, res) => {
  const { default: User } = await import('../models/User.js');
  const users = await User.find()
    .select('_id avatar username fullname email role isBanned createdAt')
    .sort({ createdAt: -1 });
  res.json(users);
});

// PUT toggle ban
router.put('/admin/users/:id/ban', protect, adminOnly, async (req, res) => {
  const { default: User } = await import('../models/User.js');
  if (req.params.id === req.user._id.toString())
    return res.status(400).json({ message: 'Không thể tự khóa tài khoản của mình' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
  user.isBanned = !user.isBanned;
  await user.save();
  res.json({ isBanned: user.isBanned });
});

// PUT toggle role
router.put('/admin/users/:id/role', protect, adminOnly, async (req, res) => {
  const { default: User } = await import('../models/User.js');
  if (req.params.id === req.user._id.toString())
    return res.status(400).json({ message: 'Không thể tự thay đổi role của mình' });
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
  user.role = user.role === 'admin' ? 'user' : 'admin';
  await user.save();
  res.json({ role: user.role });
});

// Legacy admin routes (giữ lại để không break)
router.get('/admin/all', protect, adminOnly, async (req, res) => {
  const { default: User } = await import('../models/User.js');
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json(users);
});


router.put('/admin/:id/role', protect, adminOnly, async (req, res) => {
  const { default: User } = await import('../models/User.js');
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ message: 'Role không hợp lệ' });
  const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
  if (!user) return res.status(404).json({ message: 'Không tìm thấy user' });
  res.json(user);
});

router.delete('/admin/:id', protect, adminOnly, async (req, res) => {
  const { default: User } = await import('../models/User.js');
  if (req.params.id === req.user._id.toString()) return res.status(400).json({ message: 'Không thể tự xóa mình' });
  await User.findByIdAndDelete(req.params.id);
  res.json({ message: 'Xóa thành công' });
});

// Search & Profile (các route cụ thể phải đứng TRƯỚC route động /:id)
router.get('/search', protect, searchUsers);

// ── TRANG CHỦ: Tìm kiếm người dùng + tự động lưu lịch sử ──
// Đặt TRƯỚC các route động để tránh conflict
router.get('/home-search', protect, homeSearchUsers);
router.get('/home-search-history', protect, getHomeSearchHistory);
router.delete('/home-search-history/:text', protect, deleteHomeSearchHistory); // Xóa 1 mục
router.delete('/home-search-history', protect, deleteHomeSearchHistory);       // Xóa toàn bộ

router.get('/suggested', protect, getSuggestedUsers);
router.get('/connect-suggestions', protect, getConnectSuggestions);
router.get('/share-suggestions', protect, getShareSuggestions);
router.get('/profile/:username', protect, getUserProfile);
router.put('/profile', protect, uploadAvatar, updateUserProfile);

// Bookmark / Saved posts
router.put('/save-post/:postId', protect, toggleSavePost);

// Onboarding
router.put('/onboarding', protect, completeOnboarding);

// Follow Requests (Private Accounts) - Phải đặt trước các route động để tránh trùng khớp
router.get('/follow-requests', protect, getFollowRequests);
router.post('/follow-requests/:requesterId/accept', protect, acceptFollowRequest);
router.post('/follow-requests/:requesterId/decline', protect, declineFollowRequest);

// Follow System
router.put('/:id/follow', protect, followUser);
router.get('/:username/saved-posts', protect, getSavedPosts);
router.get('/:username/followers', protect, getUserFollowers);
router.get('/:username/following', protect, getUserFollowing);

// Get user by ID — phải đứng CUỐI để không conflict với các route trên
router.get('/:id', protect, getUserById);

export default router;
