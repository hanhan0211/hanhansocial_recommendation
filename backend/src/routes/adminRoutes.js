import express from 'express';
import Post from '../models/Post.js';
import Comment from '../models/Comment.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import Like from '../models/Like.js';
import { protect } from '../middleware/authMiddleware.js';
import Report from '../models/Report.js';
import { decrementHashtags } from '../utils/hashtagUtils.js';

const router = express.Router();

// ── Middleware kiểm tra Admin ──
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền truy cập' });
  }
  next();
};

// ─────────────────────────────────────────────────────────────────
// GET /api/admin/posts
// Query: ?search=&page=1&limit=15
// ─────────────────────────────────────────────────────────────────
router.get('/posts', protect, adminOnly, async (req, res) => {
  try {
    const page    = Math.max(1, parseInt(req.query.page)  || 1);
    const limit   = Math.max(1, parseInt(req.query.limit) || 15);
    const search  = req.query.search?.trim() || '';
    const skip    = (page - 1) * limit;

    // Bước 1: Khai báo let query = {};
    let query = {};

    // Bước 2: Kiểm tra if (req.query.search)
    if (req.query.search) {
      const searchVal = req.query.search.trim();
      const matchedUsers = await User.find({
        $or: [
          { username: { $regex: searchVal, $options: 'i' } },
          { fullname: { $regex: searchVal, $options: 'i' } }
        ]
      }).select('_id').lean();
      
      const userIds = matchedUsers.map(u => u._id);

      query = {
        $or: [
          { userId: { $in: userIds } },
          { content: { $regex: searchVal, $options: 'i' } }
        ]
      };
    }

    console.log("🔍 Admin Post Query:", JSON.stringify(query, null, 2));

    // Bước 3: Dùng Post.find(query)...
    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('userId', 'username avatar fullname')
        .select('content images likes userId createdAt hashtags isHidden')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments(query),
    ]);

    // Đếm comment cho từng post
    const postIds = posts.map(p => p._id);
    const commentCounts = await Comment.aggregate([
      { $match: { postId: { $in: postIds } } },
      { $group: { _id: '$postId', count: { $sum: 1 } } },
    ]);
    const countMap = Object.fromEntries(commentCounts.map(c => [c._id.toString(), c.count]));

    const enriched = posts.map(p => ({
      ...p,
      likeCount:    p.likes?.length || 0,
      commentCount: countMap[p._id.toString()] || 0,
    }));

    res.json({
      posts:       enriched,
      currentPage: page,
      totalPages:  Math.ceil(total / limit),
      total,
    });
  } catch (err) {
    console.error('❌ GET /admin/posts error:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách bài viết' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/admin/posts/:id  — Cascade delete
// ─────────────────────────────────────────────────────────────────
router.delete('/posts/:id', protect, adminOnly, async (req, res) => {
  try {
    const postId = req.params.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: 'Không tìm thấy bài viết' });

    // Cascade delete song song bằng Promise.all
    await Promise.all([
      // 1. Xóa bài viết
      Post.findByIdAndDelete(postId),

      // 2. Xóa toàn bộ comments của bài viết
      Comment.deleteMany({ postId }),

      // 3. Xóa notifications liên quan đến bài viết
      Notification.deleteMany({ postId }),

      // 4. Xóa postId khỏi savedPosts của tất cả users đã lưu
      User.updateMany(
        { savedPosts: postId },
        { $pull: { savedPosts: postId } }
      ),
    ]);

    console.log(`🗑️ Admin xóa bài viết ${postId} (cascade)`);

    // Giảm biến đếm hashtag và tự động dọn dẹp nếu count <= 0
    if (post.hashtags && post.hashtags.length > 0) {
      await decrementHashtags(post.hashtags);
    }

    res.json({ message: 'Xóa bài viết thành công', postId });
  } catch (err) {
    console.error('❌ DELETE /admin/posts/:id error:', err);
    res.status(500).json({ message: 'Lỗi server khi xóa bài viết' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/summary — Lấy tổng quan & tăng trưởng trong tháng
// ─────────────────────────────────────────────────────────────────
router.get('/dashboard/summary', protect, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    // Ngày đầu tiên của tháng hiện tại (00:00:00)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalUsers, totalPosts, newUsersThisMonth, newPostsThisMonth] = await Promise.all([
      User.countDocuments({}),
      Post.countDocuments({}),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Post.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    res.json({
      summary: {
        users: totalUsers,
        posts: totalPosts,
        newUsers: newUsersThisMonth,
        newPosts: newPostsThisMonth,
      }
    });
  } catch (err) {
    console.error('❌ GET /admin/dashboard/summary error:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu tổng quan' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard/chart — Lấy dữ liệu gom nhóm 12 tháng theo năm
// ─────────────────────────────────────────────────────────────────
router.get('/dashboard/chart', protect, adminOnly, async (req, res) => {
  try {
    const yearNum = parseInt(req.query.year) || 2026;
    const startOfYear = new Date(yearNum, 0, 1);
    const endOfYear = new Date(yearNum + 1, 0, 1);

    // Gom nhóm bài viết theo từng tháng của năm chỉ định
    const [postMonthly, userMonthly] = await Promise.all([
      Post.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfYear, $lt: endOfYear }
          }
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 }
          }
        }
      ]),
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: startOfYear, $lt: endOfYear }
          }
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    // Tạo danh sách 12 tháng đầy đủ (Tháng 1 -> Tháng 12)
    const chartData = Array.from({ length: 12 }, (_, i) => {
      const monthIndex = i + 1;
      const postMatch = postMonthly.find(p => p._id === monthIndex);
      const userMatch = userMonthly.find(u => u._id === monthIndex);
      return {
        month: `Tháng ${monthIndex}`,
        users: userMatch ? userMatch.count : 0,
        posts: postMatch ? postMatch.count : 0
      };
    });

    res.json(chartData);
  } catch (err) {
    console.error('❌ GET /admin/dashboard/chart error:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy dữ liệu biểu đồ' });
  }
});

// ─────────────────────────────────────────────────────────────────
// GET /api/admin/reports — Lấy toàn bộ danh sách báo cáo vi phạm
// ─────────────────────────────────────────────────────────────────
router.get('/reports', protect, adminOnly, async (req, res) => {
  try {
    const reports = await Report.find({})
      .populate('reportedBy', 'username avatar fullname')
      .populate('postId', 'content images')
      .populate('commentId', 'content')
      .sort({ createdAt: -1 })
      .lean();

    res.json(reports);
  } catch (err) {
    console.error('❌ GET /admin/reports error:', err);
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách báo cáo vi phạm' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/admin/reports/:id/dismiss — Bỏ qua báo cáo (chỉ xóa document report)
// ─────────────────────────────────────────────────────────────────
router.delete('/reports/:id/dismiss', protect, adminOnly, async (req, res) => {
  try {
    const report = await Report.findByIdAndDelete(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo vi phạm' });
    }

    // Phát tín hiệu real-time cập nhật số lượng báo cáo cho Admin Sidebar
    try {
      const pendingCount = await Report.countDocuments({});
      const io = req.app.get('io');
      if (io) {
        io.emit('update-report-count', pendingCount);
        console.log(`🔌 Emitted update-report-count (dismiss) with pendingCount: ${pendingCount}`);
      }
    } catch (socketErr) {
      console.error("⚠️ Lỗi phát tín hiệu socket update-report-count:", socketErr);
    }

    res.json({ message: 'Đã bỏ qua báo cáo thành công', reportId: req.params.id });
  } catch (err) {
    console.error('❌ DELETE /admin/reports/:id/dismiss error:', err);
    res.status(500).json({ message: 'Lỗi server khi bỏ qua báo cáo' });
  }
});

// ─────────────────────────────────────────────────────────────────
// DELETE /api/admin/reports/:id/resolve — Xóa tận gốc nội dung vi phạm
// ─────────────────────────────────────────────────────────────────
router.delete('/reports/:id/resolve', protect, adminOnly, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ message: 'Không tìm thấy báo cáo vi phạm' });
    }

    if (report.type === 'post') {
      const postId = report.postId;
      const post = await Post.findById(postId);
      
      if (post) {
        // Cascade delete: Post, Comments, Notifications, Reports, Bookmarks
        await Promise.all([
          Post.findByIdAndDelete(postId),
          Comment.deleteMany({ postId }),
          Notification.deleteMany({ postId }),
          Report.deleteMany({ postId }),
          User.updateMany(
            { savedPosts: postId },
            { $pull: { savedPosts: postId } }
          )
        ]);
        console.log(`🗑️ Admin cascade deleted Post ${postId} from report resolve`);

        // Giảm biến đếm hashtag và tự động dọn dẹp nếu count <= 0
        if (post.hashtags && post.hashtags.length > 0) {
          await decrementHashtags(post.hashtags);
        }
      }

      // Phát tín hiệu xóa bài viết real-time tới tất cả người dùng
      try {
        const io = req.app.get('io');
        if (io) {
          io.emit('admin-deleted-post', postId);
          console.log(`🔌 Emitted admin-deleted-post with postId: ${postId}`);
        }
      } catch (socketErr) {
        console.error("⚠️ Lỗi phát tín hiệu socket admin-deleted-post:", socketErr);
      }
    } else if (report.type === 'comment') {
      const commentId = report.commentId;
      
      // Tìm bình luận để lấy parent postId trước khi xóa
      let postId = null;
      try {
        const targetComment = await Comment.findById(commentId);
        if (targetComment) {
          postId = targetComment.postId;
        }
      } catch (findErr) {
        console.error("⚠️ Lỗi tìm bình luận để lấy postId:", findErr);
      }

      // Cascade delete: Comment, Replies, Reports
      await Promise.all([
        Comment.findByIdAndDelete(commentId),
        Comment.deleteMany({ parentId: commentId }),
        Report.deleteMany({ commentId })
      ]);
      console.log(`🗑️ Admin cascade deleted Comment ${commentId} from report resolve`);

      // Phát tín hiệu xóa bình luận real-time tới tất cả người dùng
      try {
        const io = req.app.get('io');
        if (io) {
          io.emit('admin-deleted-comment', { postId, commentId });
          console.log(`🔌 Emitted admin-deleted-comment with postId: ${postId}, commentId: ${commentId}`);
        }
      } catch (socketErr) {
        console.error("⚠️ Lỗi phát tín hiệu socket admin-deleted-comment:", socketErr);
      }
    }

    // Cuối cùng xóa chính báo cáo này khỏi collection nếu chưa bị xóa bởi cascade
    await Report.findByIdAndDelete(req.params.id);

    // Phát tín hiệu cập nhật số lượng báo cáo cho Admin Sidebar
    try {
      const pendingCount = await Report.countDocuments({});
      const io = req.app.get('io');
      if (io) {
        io.emit('update-report-count', pendingCount);
        console.log(`🔌 Emitted update-report-count (resolve) with pendingCount: ${pendingCount}`);
      }
    } catch (socketErr) {
      console.error("⚠️ Lỗi phát tín hiệu socket update-report-count:", socketErr);
    }

    res.json({ message: 'Đã xóa nội dung vi phạm thành công', reportId: req.params.id });
  } catch (err) {
    console.error('❌ DELETE /admin/reports/:id/resolve error:', err);
    res.status(500).json({ message: 'Lỗi server khi xử lý xóa nội dung vi phạm' });
  }
});

// ─────────────────────────────────────────────────────────────────
// PUT /api/admin/posts/:id/toggle-visibility — Ẩn/Hiện bài viết
// ─────────────────────────────────────────────────────────────────
router.put('/posts/:id/toggle-visibility', protect, adminOnly, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    post.isHidden = !post.isHidden;
    await post.save();

    res.json({ message: `Đã ${post.isHidden ? 'ẩn' : 'hiện'} bài viết thành công`, isHidden: post.isHidden });
  } catch (err) {
    console.error('❌ PUT /admin/posts/:id/toggle-visibility error:', err);
    res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái bài viết' });
  }
});

// ─────────────────────────────────────────────────────────────────
// POST /api/admin/posts/:id/warn — Cảnh cáo người dùng
// ─────────────────────────────────────────────────────────────────
router.post('/posts/:id/warn', protect, adminOnly, async (req, res) => {
  try {
    const { reason } = req.body;
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }

    const notification = new Notification({
      recipientId: post.userId,
      senderId: req.user._id,
      type: 'warning',
      postId: post._id,
      content: `Quản trị viên đã gửi cảnh cáo cho bài viết của bạn. Lý do: ${reason}`
    });
    await notification.save();

    // Phát tín hiệu real-time
    try {
      const io = req.app.get('io');
      if (io) {
        io.to(post.userId.toString()).emit('newNotification', notification);
      }
    } catch (socketErr) {
      console.error("⚠️ Lỗi phát tín hiệu socket newNotification (warning):", socketErr);
    }

    res.json({ message: 'Đã gửi thông báo cảnh cáo thành công' });
  } catch (err) {
    console.error('❌ POST /admin/posts/:id/warn error:', err);
    res.status(500).json({ message: 'Lỗi server khi gửi cảnh cáo' });
  }
});

export default router;
