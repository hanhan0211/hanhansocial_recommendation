import Post from "../models/Post.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import Report from "../models/Report.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import { createNotification } from "./notificationController.js";
import Hashtag from "../models/Hashtag.js";
import { extractHashtags, decrementHashtags } from "../utils/hashtagUtils.js";
import { updateAuthorScore, getTopRecommendedAuthors, updateHashtagScore, getTopRecommendedHashtags } from "../services/recommendService.js";

const groupCommentsWithReplies = (comments = []) => {
  const normalized = comments.map((c) => (c.toObject ? c.toObject() : c));
  const parentComments = normalized.filter((c) => !c.parentId);
  return parentComments.map((parent) => {
    const replies = normalized.filter(
      (c) => c.parentId && c.parentId.toString() === parent._id.toString()
    );
    return { ...parent, replies };
  });
};
// TẠO BÀI VIẾT MỚI
export const createPost = async (req, res) => {
  try {
    const { content, images } = req.body;

    // Trích xuất các hashtag từ nội dung bài viết bằng helper
    const tags = extractHashtags(content);

    // 2. Tạo bài viết mới trong Database
    const newPost = await Post.create({
      content,
      images: images || [], // Nhét trọn bộ mảng link ảnh vào DB
      hashtags: tags,
      userId: req.user.id || req.user._id 
    });

    // ĐỒNG BỘ BẢNG HASHTAG: Có thì cộng 1, chưa có thì tự tạo mới với count = 1
    if (tags.length > 0) {
      await Promise.all(
        tags.map(tag => 
          Hashtag.findOneAndUpdate(
            { name: tag },
            { $inc: { count: 1 } },
            { upsert: true, new: true }
          )
        )
      );
    }

    // 3. Populate ngay lập tức để lấy avatar + username của chủ bài viết
    const populatedPost = await Post.findById(newPost._id).populate("userId", "username avatar role");

    // 4. Trả về dữ liệu hoàn chỉnh cho Frontend render
    res.status(201).json(populatedPost);
    
  } catch (error) {
    console.error("===== LỖI TẠO BÀI VIẾT =====", error);
    res.status(500).json({ message: "Lỗi server khi tạo bài viết", error: error.message });
  }
};

// lấy danh sách bài viết
// controllers/postController.js

export const getPosts = async (req, res) => {
  try {
    const posts = await Post.find({ isHidden: { $ne: true } })
      .populate("userId", "username avatar") // QUAN TRỌNG NHẤT: Lấy username và avatar từ bảng User
      .sort({ createdAt: -1 });
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Lấy bài viết ngẫu nhiên cho trang chủ (Random Feed) — giữ lại để tương thích
export const getRandomPosts = async (req, res) => {
  return getFeedPosts(req, res);
};

// ═══════════════════════════════════════════════════════════════════════════
// API: LẤY BÀI VIẾT TRANG CHỦ - HỆ THỐNG GỢI Ý CÁ NHÂN HÓA THÔNG MINH
// ═══════════════════════════════════════════════════════════════════════════
// @route   GET /api/posts?page=1&limit=10&seenIds=id1,id2,id3
// @access  Private (Yêu cầu đăng nhập)
// 
// THUẬT TOÁN: HYBRID 60/40
// - 60% bài viết từ những người đang follow (Tầng 1: Following)
// - 40% bài viết từ tác giả có điểm cao (Tầng 2: Recommended)
// - Xáo trộn ngẫu nhiên để tạo feed sinh động
// - Loại trừ bài viết đã xem (seenIds)
// ═══════════════════════════════════════════════════════════════════════════
export const getFeedPosts = async (req, res) => {
  try {
    console.log('\n' + '═'.repeat(100));
    console.log('🏠 BẮT ĐẦU XỬ LÝ FEED TRANG CHỦ');
    console.log('═'.repeat(100));

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 1: XÁC THỰC & LẤY THAM SỐ
    // ─────────────────────────────────────────────────────────────────────
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    // Query params
    const page = Math.max(1, parseInt(req.query.page || '1', 10));
    const limit = Math.min(parseInt(req.query.limit || '10', 10), 30);

    // Danh sách ID bài viết đã xem (Frontend gửi lên)
    // Format: ?seenIds=id1,id2,id3 HOẶC ?seenIds[]=id1&seenIds[]=id2
    const seenIdsRaw = req.query.seenIds || req.query.exclude || '';
    const seenIds = seenIdsRaw
      ? (Array.isArray(seenIdsRaw) ? seenIdsRaw : seenIdsRaw.split(','))
          .filter(id => mongoose.Types.ObjectId.isValid(id.trim()))
          .map(id => new mongoose.Types.ObjectId(id.trim()))
      : [];

    console.log(`📊 THÔNG SỐ REQUEST:`);
    console.log(`   • User ID:     ${userId}`);
    console.log(`   • Page:        ${page}`);
    console.log(`   • Limit:       ${limit}`);
    console.log(`   • Seen IDs:    ${seenIds.length} bài đã xem`);

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 2: LẤY DANH SÁCH FOLLOWING & RECOMMENDED AUTHORS
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n🔍 BƯỚC 2: Lấy danh sách Following & Recommended Authors...`);
    
    const currentUser = await User.findById(userId).select('following');
    const followingIds = (currentUser?.following || []).map(id => 
      new mongoose.Types.ObjectId(id.toString())
    );

    // Import service để lấy top recommended authors và hashtags
    const { getTopRecommendedAuthors, getTopRecommendedHashtags } = await import('../services/recommendService.js');
    let recommendedAuthorIds = await getTopRecommendedAuthors(userId, 30);
    const recommendedHashtags = await getTopRecommendedHashtags(userId, 5);
    
    // Loại trừ những người đã follow và chính mình khỏi recommended
    recommendedAuthorIds = recommendedAuthorIds.filter(authorId => {
      const authorIdStr = authorId.toString();
      const isFollowing = followingIds.some(fid => fid.toString() === authorIdStr);
      const isSelf = authorIdStr === userId.toString();
      return !isFollowing && !isSelf;
    });

    console.log(`   ✅ Following:   ${followingIds.length} người`);
    console.log(`   ✅ Recommended: ${recommendedAuthorIds.length} tác giả (đã loại following)`);
    console.log(`   ✅ Recommended: ${recommendedHashtags.length} chủ đề hashtags`);

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 3: TÍNH TOÁN TỶ LỆ 50/40/10 (ANTI-FILTER BUBBLE)
    // ─────────────────────────────────────────────────────────────────────
    let followingLimit = Math.ceil(limit * 0.5); // 50%
    let recommendedLimit = Math.ceil(limit * 0.4); // 40%
    let randomLimit = limit - followingLimit - recommendedLimit; // ~10%

    // Điều chỉnh nếu không có following
    if (followingIds.length === 0) {
      followingLimit = 0;
      recommendedLimit = Math.ceil(limit * 0.8); // 80% Recommend
      randomLimit = limit - recommendedLimit; // 20% Random
    }

    console.log(`\n📊 TỶ LỆ PHÂN BỔ (ANTI-FILTER BUBBLE):`);
    console.log(`   • Tầng 1 (Following):   ${followingLimit} bài`);
    console.log(`   • Tầng 2 (Recommended): ${recommendedLimit} bài`);
    console.log(`   • Tầng 3 (Random/Mới lạ): ${randomLimit} bài`);

    // ─────────────────────────────────────────────────────────────────────
    // PIPELINE POPULATE DÙN G CHUNG
    // ─────────────────────────────────────────────────────────────────────
    const populatePipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          content: 1,
          images: 1,
          hashtags: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: {
            _id: '$userDoc._id',
            username: '$userDoc.username',
            fullname: '$userDoc.fullname',
            avatar: '$userDoc.avatar',
            role: '$userDoc.role',
          },
        },
      },
    ];

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 4: TẦNG 1 - LẤY BÀI VIẾT TỪ FOLLOWING (60%)
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n🎯 BƯỚC 4: Lấy bài viết Tầng 1 (Following)...`);
    
    let followingPosts = [];
    if (followingIds.length > 0 && followingLimit > 0) {
      followingPosts = await Post.aggregate([
        {
          $match: {
            isHidden: { $ne: true },
            userId: { 
              $in: followingIds // Lấy bài của những người được follow
            },
            _id: { 
              $nin: seenIds // Loại trừ bài đã xem
            },
          },
        },
        {
          // Sắp xếp theo ngày đăng: Mới nhất lên trước
          $sort: { createdAt: -1 },
        },
        {
          $limit: followingLimit,
        },
        ...populatePipeline,
      ]);
    }

    console.log(`   ✅ Lấy được: ${followingPosts.length} bài từ following`);

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 5: TẦNG 2 - LẤY BÀI VIẾT TỪ RECOMMENDED AUTHORS (40%)
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n🎯 BƯỚC 5: Lấy bài viết Tầng 2 (Recommended)...`);
    
    let recommendedPosts = [];
    if (recommendedAuthorIds.length > 0 && recommendedLimit > 0) {
      // Danh sách ID bài đã lấy (để loại trừ)
      const alreadyHasIds = [...seenIds, ...followingPosts.map(p => p._id)];

      // Giới hạn: Tối đa 2 bài từ MỖI tác giả để đa dạng
      const maxPostsPerAuthor = 2;
      
      for (const authorId of recommendedAuthorIds.slice(0, 15)) {
        if (recommendedPosts.length >= recommendedLimit) break;

        const authorPosts = await Post.aggregate([
          {
            $match: {
              isHidden: { $ne: true },
              userId: authorId,
              _id: { 
                $nin: [...alreadyHasIds, ...recommendedPosts.map(p => p._id)] 
              },
            },
          },
          { $sample: { size: maxPostsPerAuthor } },
          { $limit: maxPostsPerAuthor },
          ...populatePipeline,
        ]);

        recommendedPosts.push(...authorPosts);
      }

      // Trim nếu vượt limit
      recommendedPosts = recommendedPosts.slice(0, recommendedLimit);
    }

    console.log(`   ✅ Lấy được: ${recommendedPosts.length} bài từ recommended (max 2/tác giả)`);

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 6: TẦNG 3 - BÀI VIẾT RANDOM/KHÁM PHÁ MỚI LẠ (10%)
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n🎯 BƯỚC 6: Lấy bài viết Tầng 3 (Random/Khám phá mới lạ)...`);
    
    let randomPosts = [];
    if (randomLimit > 0) {
      const alreadyHasIds = [...seenIds, ...followingPosts.map(p => p._id), ...recommendedPosts.map(p => p._id)];
      const usedAuthorIds = [userId, ...followingIds, ...recommendedAuthorIds.slice(0, 15)];

      randomPosts = await Post.aggregate([
        {
          $match: {
            isHidden: { $ne: true },
            _id: { $nin: alreadyHasIds },
            userId: { 
              $nin: usedAuthorIds, // Loại trừ hoàn toàn vòng tròn quen biết
              $ne: userId,
            },
          },
        },
        { $sample: { size: randomLimit } },
        ...populatePipeline,
      ]);
      console.log(`   ✅ Lấy được: ${randomPosts.length} bài ngẫu nhiên để phá vỡ Bong Bóng Lọc`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 6.5: FALLBACK - NẾU TỔNG VẪN CHƯA ĐỦ
    // ─────────────────────────────────────────────────────────────────────
    let allPosts = [...followingPosts, ...recommendedPosts, ...randomPosts];
    
    if (allPosts.length < limit) {
      let needed = limit - allPosts.length;
      console.log(`\n🔄 BƯỚC 6.5: Fallback - Cần thêm ${needed} bài...`);

      let alreadyHasIds = [...seenIds, ...allPosts.map(p => p._id)];
      const usedAuthorIds = [
        userId,
        ...followingIds,
        ...recommendedAuthorIds.slice(0, 15),
      ];

      // 6.1 Lấy bài từ Hashtag Gợi ý (nếu có)
      let hashtagFallbackPosts = [];
      if (recommendedHashtags.length > 0) {
        hashtagFallbackPosts = await Post.aggregate([
          {
            $match: {
              isHidden: { $ne: true },
              _id: { $nin: alreadyHasIds },
              userId: { 
                $nin: usedAuthorIds,
                $ne: userId,
              },
              hashtags: { $in: recommendedHashtags }
            },
          },
          { $sample: { size: needed } },
          ...populatePipeline,
        ]);
        
        allPosts = [...allPosts, ...hashtagFallbackPosts];
        needed = limit - allPosts.length;
        alreadyHasIds = [...seenIds, ...allPosts.map(p => p._id)];
        console.log(`   ✅ Lấy được: ${hashtagFallbackPosts.length} bài từ Hashtag Gợi ý`);
      }

      // 6.2 Lấy ngẫu nhiên (nếu vẫn chưa đủ)
      if (needed > 0) {
        const fallbackPosts = await Post.aggregate([
          {
            $match: {
              isHidden: { $ne: true },
              _id: { $nin: alreadyHasIds },
              userId: { 
                $nin: usedAuthorIds, // Loại trừ tác giả đã lấy
                $ne: userId, // Loại trừ chính mình
              },
            },
          },
          { $sample: { size: needed * 3 } },
          { $limit: needed },
          ...populatePipeline,
        ]);

        allPosts = [...allPosts, ...fallbackPosts];
        console.log(`   ✅ Đã thêm: ${fallbackPosts.length} bài ngẫu nhiên`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 7: XÁO TRỘN NGẪU NHIÊN (FISHER-YATES SHUFFLE)
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n🔀 BƯỚC 7: Xáo trộn ${allPosts.length} bài viết...`);
    
    for (let i = allPosts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPosts[i], allPosts[j]] = [allPosts[j], allPosts[i]];
    }
    
    console.log(`   ✅ Đã shuffle xong`);

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 8: KIỂM TRA HASMORE & TRẢ VỀ KẾT QUẢ
    // ─────────────────────────────────────────────────────────────────────
    const totalPosts = await Post.countDocuments({ isHidden: { $ne: true }, userId: { $ne: userId } });
    const totalSeenAndShown = seenIds.length + allPosts.length;
    // hasMore = true nếu số bài hiển chưa đủ so với tổng
    const hasMore = totalSeenAndShown < totalPosts;

    console.log(`\n📈 THỐNG KÊ:`);
    console.log(`   • Tổng bài trong DB:     ${totalPosts}`);
    console.log(`   • Đã xem trước đó:       ${seenIds.length}`);
    console.log(`   • Trả về lần này:        ${allPosts.length}`);
    console.log(`   • Còn bài để tải:        ${hasMore ? 'CÓ' : 'KHÔNG'}`);
    console.log('═'.repeat(100) + '\n');

    // Trả về Response
    res.json({
      posts: allPosts,
      hasMore,
      page,
      limit,
      followingCount: followingPosts.length,
      recommendedCount: recommendedPosts.length,
    });

  } catch (error) {
    console.error('\n' + '═'.repeat(100));
    console.error('❌ LỖI KHI LẤY FEED TRANG CHỦ');
    console.error('═'.repeat(100));
    console.error('📝 Chi tiết:', error.message);
    console.error('📝 Stack:', error.stack);
    console.error('═'.repeat(100) + '\n');
    
    res.status(500).json({ 
      message: 'Lỗi server khi lấy feed',
      error: error.message 
    });
  }
};



// Lấy chi tiết một bài viết (kèm comments)
export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "postId không hợp lệ" });
    }

    const post = await Post.findById(postId)
      .populate("userId", "username fullname avatar role")
      .populate({
        path: "comments",
        populate: { path: "userId", select: "username fullname avatar role" },
        options: { sort: { createdAt: 1 } },
      });

    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    const postObject = post.toObject();
    postObject.comments = groupCommentsWithReplies(post.comments || []);

    res.json(postObject);
  } catch (error) {
    console.error("===== LỖI LẤY CHI TIẾT BÀI VIẾT =====", error);
    res.status(500).json({ message: error.message || "Lỗi server khi lấy bài viết" });
  }
};
// XÓA BÀI VIẾT
export const deletePost = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    // Kiểm tra xem người đang xóa có phải là chủ bài viết không
    const authorId = post.userId || post.author;
    const reqUserId = req.user._id || req.user.id;

    if (!authorId || authorId.toString() !== reqUserId.toString()) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bài viết này!" });
    }

    // 1. Xóa các bình luận liên quan đến bài viết
    await Comment.deleteMany({ postId });

    // 2. Xóa các thông báo liên quan đến bài viết
    await Notification.deleteMany({ postId });

    // 3. Xóa các báo cáo liên quan đến bài viết
    await Report.deleteMany({ postId });

    // 4. Xóa bài viết này khỏi mảng savedPosts của tất cả người dùng
    await User.updateMany(
      { savedPosts: postId },
      { $pull: { savedPosts: postId } }
    );

    // 5. Xóa bài viết khỏi database
    await post.deleteOne();

    // 6. Giảm biến đếm hashtag và tự động dọn dẹp nếu count <= 0
    if (post.hashtags && post.hashtags.length > 0) {
      await decrementHashtags(post.hashtags);
    }

    res.status(200).json({ message: "Xóa bài viết thành công!" });
  } catch (error) {
    console.error("===== LỖI XÓA BÀI VIẾT =====", error);
    res.status(500).json({ message: "Lỗi server khi xóa bài viết", error: error.message });
  }
};
// THẢ TIM / BỎ THẢ TIM
export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Không tìm thấy bài viết" });

    // 1. Lấy ID user
    const userId = req.user.id || req.user._id;

    console.log("❤️ likePost called:", { userId, postId: req.params.id, postAuthor: post.userId });

    // 2. Đảm bảo mảng likes tồn tại
    if (!post.likes) {
      post.likes = [];
    }

    // 3. Kiểm tra xem user đã like chưa
    const isLiked = post.likes.some(id => id.toString() === userId.toString());

    if (isLiked) {
      // ĐÃ LIKE -> Bỏ like bằng filter (Ép tất cả về chuỗi để so sánh, an toàn tuyệt đối 100%)
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      console.log("❤️ Unlike - removed like");

      // 🎯 CẬP NHẬT ĐIỂM RECOMMENDATION (UNLIKE: -1 điểm)
      if (post.userId) {
        await updateAuthorScore(userId, post.userId, 'UNLIKE');
      }

      // 🎯 CẬP NHẬT ĐIỂM HASHTAG
      if (post.hashtags && post.hashtags.length > 0) {
        await updateHashtagScore(userId, post.hashtags, 'UNLIKE');
      }
    } else {
      // CHƯA LIKE -> Nhét tim vào
      post.likes.push(userId);
      console.log("❤️ Like - added like");

      // 🎯 CẬP NHẬT ĐIỂM RECOMMENDATION (LIKE: +1 điểm)
      if (post.userId) {
        await updateAuthorScore(userId, post.userId, 'LIKE');
      }

      // 🎯 CẬP NHẬT ĐIỂM HASHTAG
      if (post.hashtags && post.hashtags.length > 0) {
        await updateHashtagScore(userId, post.hashtags, 'LIKE');
      }

      // 🔔 TẠO THÔNG BÁO CHO TÁC GIẢ BÀI VIẾT
      if (post.userId && post.userId.toString() !== userId.toString()) {
        console.log("🔔 Creating like notification for:", post.userId);
        await createNotification({
          recipientId: post.userId,
          senderId: userId,
          type: "like",
          postId: post._id,
        });
      }
    }

    // Bắt buộc Mongoose phải ghi nhận sự thay đổi của mảng này trước khi lưu
    post.markModified('likes');
    
    // 4. Lưu lại
    await post.save();
    
    // 5. Trả về mảng tim mới
    res.json(post.likes);
    
  } catch (error) {
    console.error("===== CHI TIẾT LỖI THẢ TIM =====", error);
    res.status(500).json({ message: "Lỗi server khi thả tim", error: error.message });
  }
};

// BÁO CÁO BÀI VIẾT VI PHẠM
export const reportPost = async (req, res) => {
  try {
    const postId = req.params.id;
    const { reason } = req.body;
    const userId = req.user.id || req.user._id;

    if (!reason || reason.trim() === "") {
      return res.status(400).json({ message: "Lý do báo cáo không được để trống!" });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết để báo cáo!" });
    }

    // Tạo báo cáo mới
    const newReport = await Report.create({
      postId,
      reportedBy: userId,
      reason: reason.trim(),
    });

    // Phát tín hiệu socket tới admin
    try {
      const pendingCount = await Report.countDocuments({});
      const io = req.app.get('io');
      if (io) {
        io.emit('new-report', pendingCount);
        console.log(`🔌 Emitted new-report with pendingCount: ${pendingCount}`);
      }
    } catch (socketErr) {
      console.error("⚠️ Lỗi phát tín hiệu socket new-report:", socketErr);
    }

    res.status(201).json({ message: "Báo cáo bài viết thành công!", report: newReport });
  } catch (error) {
    console.error("===== LỖI BÁO CÁO BÀI VIẾT =====", error);
    res.status(500).json({ message: "Lỗi server khi báo cáo bài viết vi phạm", error: error.message });
  }
};

// LẤY DANH SÁCH BÀI VIẾT THEO HASHTAG
export const getPostsByHashtag = async (req, res) => {
  try {
    const hashtagName = (req.params.hashtagName || req.params.name || "").toLowerCase().trim();
    const posts = await Post.find({ hashtags: hashtagName, isHidden: { $ne: true } })
      .populate("userId", "username avatar fullname role")
      .populate({
        path: "comments",
        populate: { path: "userId", select: "username avatar fullname role" },
        options: { sort: { createdAt: 1 } },
      });
    
    // Ngẫu nhiên hóa thứ tự bài viết khi tải/reload trang
    const shuffledPosts = [...posts].sort(() => Math.random() - 0.5);
    
    // 🎯 CẬP NHẬT ĐIỂM RECOMMENDATION CHO HASHTAG (LIKE: giả vờ user thích chủ đề này, +1 điểm)
    if (req.user && req.user._id) {
      await updateHashtagScore(req.user._id, [hashtagName], 'LIKE');
    }

    res.json(shuffledPosts);
  } catch (error) {
    console.error("===== LỖI LẤY BÀI VIẾT THEO HASHTAG =====", error);
    res.status(500).json({ message: "Lỗi server khi lấy bài viết theo hashtag", error: error.message });
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// API: LẤY BÀI VIẾT TRANG KHÁM PHÁ - GỢI Ý CÁ NHÂN HÓA
// ═══════════════════════════════════════════════════════════════════════════
// @route   GET /api/posts/explore?limit=10&seenIds=id1,id2,id3
// @access  Private (Yêu cầu đăng nhập)
// 
// THUẬT TOÁN 2 TẦNG:
// - Bộ lọc tĩnh: Loại bỏ bài của chính mình và người đang follow
// - Tầng 1 (Cá nhân hóa): Lấy bài từ tác giả người lạ có điểm cao (50%)
// - Tầng 2 (Thịnh hành): Lấy bài thịnh hành (like+comment cao) (50%)
// - Trộn ngẫu nhiên và loại trừ bài đã xem
// ═══════════════════════════════════════════════════════════════════════════
export const getExplorePosts = async (req, res) => {
  try {
    console.log('\n' + '═'.repeat(100));
    console.log('🔍 BẮT ĐẦU XỬ LÝ TRANG KHÁM PHÁ (GỢI Ý THÔNG MINH)');
    console.log('═'.repeat(100));

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 1: XÁC THỰC & LẤY THAM SỐ
    // ─────────────────────────────────────────────────────────────────────
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: "Vui lòng đăng nhập" });
    }

    const limit = Math.min(parseInt(req.query.limit || '10', 10), 30);

    // Danh sách ID bài viết đã xem (frontend gửi lên)
    const seenIdsRaw = req.query.seenIds || '';
    const seenIds = seenIdsRaw
      ? (Array.isArray(seenIdsRaw) ? seenIdsRaw : seenIdsRaw.split(','))
          .filter(id => mongoose.Types.ObjectId.isValid(id.trim()))
          .map(id => new mongoose.Types.ObjectId(id.trim()))
      : [];

    console.log(`📊 THÔNG SỐ REQUEST:`);
    console.log(`   • User ID:     ${userId}`);
    console.log(`   • Limit:       ${limit}`);
    console.log(`   • Seen IDs:    ${seenIds.length} bài đã xem`);

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 2: LẤY DANH SÁCH FOLLOWING VÀ EXCLUSIONS
    // ─────────────────────────────────────────────────────────────────────
    const currentUser = await User.findById(userId).select('following');
    const followingIds = (currentUser?.following || []).map(id =>
      new mongoose.Types.ObjectId(id.toString())
    );

    // Danh sách loại trừ = chính mình + những người đã follow
    const excludeUserIds = [userId, ...followingIds];
    
    console.log(`   ✅ Loại trừ: ${excludeUserIds.length} users (bản thân + following)`);

    // ─────────────────────────────────────────────────────────────────────
    // PIPELINE POPULATE DÙNG CHUNG
    // ─────────────────────────────────────────────────────────────────────
    const populatePipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: { path: '$userDoc', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          content: 1,
          images: 1,
          hashtags: 1,
          likes: 1,
          createdAt: 1,
          updatedAt: 1,
          userId: {
            _id: '$userDoc._id',
            username: '$userDoc.username',
            fullname: '$userDoc.fullname',
            avatar: '$userDoc.avatar',
            role: '$userDoc.role',
          },
        },
      },
    ];

    // Tính toán phân bổ (40/40/20) - ANTI-FILTER BUBBLE
    let recommendedLimit = Math.ceil(limit * 0.4); // 40% Cá nhân hóa
    let trendingLimit = Math.ceil(limit * 0.4); // 40% Thịnh hành
    let randomLimit = limit - recommendedLimit - trendingLimit; // 20% Ngẫu nhiên

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 3: TẦNG 1 - CÁ NHÂN HÓA TỪ NGƯỜI LẠ (50%)
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n🎯 BƯỚC 3: Lấy bài từ tác giả lạ được gợi ý (Mục tiêu: ${recommendedLimit} bài)...`);
    
    let recommendedPosts = [];
    const { getTopRecommendedAuthors, getTopRecommendedHashtags } = await import('../services/recommendService.js');
    let topAuthors = await getTopRecommendedAuthors(userId, 30);
    const recommendedHashtags = await getTopRecommendedHashtags(userId, 5);
    
    // Lọc ra những tác giả lạ (chưa follow và không phải mình)
    let strangeRecommendedAuthors = topAuthors.filter(authorId => {
        return !excludeUserIds.some(excluded => excluded.toString() === authorId.toString());
    });

    if (strangeRecommendedAuthors.length > 0 && recommendedLimit > 0) {
      const maxPostsPerAuthor = 2; // Giới hạn 2 bài/tác giả để đa dạng
      for (const authorId of strangeRecommendedAuthors) {
        if (recommendedPosts.length >= recommendedLimit) break;

        const authorPosts = await Post.aggregate([
          {
            $match: {
              isHidden: { $ne: true },
              userId: authorId,
              _id: { 
                $nin: [...seenIds, ...recommendedPosts.map(p => p._id)] 
              },
            },
          },
          { $sample: { size: maxPostsPerAuthor } },
          { $limit: maxPostsPerAuthor },
          ...populatePipeline,
        ]);

        recommendedPosts.push(...authorPosts);
      }
      
      // Trim nếu vượt limit
      recommendedPosts = recommendedPosts.slice(0, recommendedLimit);
    }
    console.log(`   ✅ Lấy được: ${recommendedPosts.length} bài gợi ý cá nhân hóa`);

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 4: TẦNG 2 - THỊNH HÀNH TỪ NGƯỜI LẠ (50%)
    // ─────────────────────────────────────────────────────────────────────
    // Nếu tầng 1 không đủ, dồn limit cho tầng 2
    if (recommendedPosts.length < recommendedLimit) {
        trendingLimit += (recommendedLimit - recommendedPosts.length);
    }

    console.log(`\n🔥 BƯỚC 4: Lấy bài thịnh hành từ người lạ (Mục tiêu: ${trendingLimit} bài)...`);
    
    let trendingPosts = [];
    if (trendingLimit > 0) {
        const alreadyFetchedIds = recommendedPosts.map(p => p._id);
        
        trendingPosts = await Post.aggregate([
            {
                $match: {
                    isHidden: { $ne: true },
                    userId: { $nin: excludeUserIds }, // Chỉ người lạ
                    _id: { $nin: [...seenIds, ...alreadyFetchedIds] } // Chưa xem và chưa lấy ở tầng 1
                }
            },
            {
                // Thêm trường đếm số like
                $addFields: {
                    likesCount: { $size: { $ifNull: ["$likes", []] } }
                }
            },
            {
                // Ưu tiên bài nhiều like, sau đó đến bài mới
                $sort: { likesCount: -1, createdAt: -1 }
            },
            {
                $limit: trendingLimit
            },
            {
                // Bỏ trường likesCount tạm thời đi trước khi populate để trả về chuẩn
                $project: { likesCount: 0 }
            },
            ...populatePipeline
        ]);
    }
    console.log(`   ✅ Lấy được: ${trendingPosts.length} bài thịnh hành`);

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 5: TẦNG 3 - NGẪU NHIÊN (SERENDIPITY) (20%)
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n🎲 BƯỚC 5: Lấy bài ngẫu nhiên hoàn toàn (Mục tiêu: ${randomLimit} bài)...`);
    
    let randomPosts = [];
    let alreadyFetchedIds = [...seenIds, ...recommendedPosts.map(p => p._id), ...trendingPosts.map(p => p._id)];
    
    if (randomLimit > 0) {
      randomPosts = await Post.aggregate([
        {
          $match: {
            isHidden: { $ne: true },
            userId: { $nin: excludeUserIds },
            _id: { $nin: alreadyFetchedIds }
          }
        },
        { $sample: { size: randomLimit } },
        ...populatePipeline
      ]);
    }
    console.log(`   ✅ Lấy được: ${randomPosts.length} bài ngẫu nhiên`);

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 5.5: FALLBACK (NẾU THIẾU)
    // ─────────────────────────────────────────────────────────────────────
    let allPosts = [...recommendedPosts, ...trendingPosts, ...randomPosts];
    let fallbackPosts = [];

    if (allPosts.length < limit) {
        let needed = limit - allPosts.length;
        console.log(`\n🎲 BƯỚC 5.5: Fallback ngẫu nhiên (Cần thêm: ${needed} bài)...`);
        
        let alreadyFetchedIds = allPosts.map(p => p._id);
        
        // 5.1 Lấy bài từ Hashtag Gợi ý (nếu có)
        let hashtagFallbackPosts = [];
        if (recommendedHashtags.length > 0) {
          hashtagFallbackPosts = await Post.aggregate([
            {
                $match: {
                    isHidden: { $ne: true },
                    userId: { $nin: excludeUserIds },
                    _id: { $nin: [...seenIds, ...alreadyFetchedIds] },
                    hashtags: { $in: recommendedHashtags }
                }
            },
            { $sample: { size: needed } },
            ...populatePipeline
          ]);
          
          allPosts = [...allPosts, ...hashtagFallbackPosts];
          needed = limit - allPosts.length;
          alreadyFetchedIds = allPosts.map(p => p._id);
          console.log(`   ✅ Lấy được: ${hashtagFallbackPosts.length} bài từ Hashtag Gợi ý`);
        }

        // 5.2 Lấy ngẫu nhiên hoàn toàn (nếu vẫn chưa đủ)
        if (needed > 0) {
          fallbackPosts = await Post.aggregate([
              {
                  $match: {
                      isHidden: { $ne: true },
                      userId: { $nin: excludeUserIds },
                      _id: { $nin: [...seenIds, ...alreadyFetchedIds] }
                  }
              },
              { $sample: { size: needed } },
              ...populatePipeline
          ]);
          
          allPosts = [...allPosts, ...fallbackPosts];
          console.log(`   ✅ Lấy được: ${fallbackPosts.length} bài ngẫu nhiên hoàn toàn`);
        }
    }

    // ─────────────────────────────────────────────────────────────────────
    // BƯỚC 6: TRỘN NGẪU NHIÊN VÀ KIỂM TRA HASMORE
    // ─────────────────────────────────────────────────────────────────────
    console.log(`\n🔀 BƯỚC 6: Xáo trộn ${allPosts.length} bài viết...`);
    for (let i = allPosts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allPosts[i], allPosts[j]] = [allPosts[j], allPosts[i]];
    }

    // Kiểm tra xem còn bài của người lạ chưa xem trong DB không
    const remainingExplorable = await Post.countDocuments({
      isHidden: { $ne: true },
      userId: { $nin: excludeUserIds },
      _id: { $nin: seenIds }
    });

    const hasMore = remainingExplorable > allPosts.length;

    console.log(`\n📈 THỐNG KÊ KHÁM PHÁ:`);
    console.log(`   • Đã lấy:                        ${allPosts.length} bài`);
    console.log(`   • Tỷ lệ:                         ${recommendedPosts.length} Gợi ý / ${trendingPosts.length} Thịnh hành / ${fallbackPosts.length} Ngẫu nhiên`);
    console.log(`   • Tổng bài người lạ chưa xem:    ${remainingExplorable}`);
    console.log(`   • Còn bài để tải (hasMore):      ${hasMore ? 'CÓ' : 'KHÔNG'}`);
    console.log('═'.repeat(100) + '\n');

    res.json({
      posts: allPosts,
      hasMore,
      limit,
      resetSeenIds: false,
      recommendedCount: recommendedPosts.length,
      trendingCount: trendingPosts.length,
      fallbackCount: fallbackPosts.length
    });

  } catch (error) {
    console.error('\n' + '═'.repeat(100));
    console.error('❌ LỖI KHI LẤY TRANG KHÁM PHÁ');
    console.error('═'.repeat(100));
    console.error('📝 Chi tiết:', error.message);
    console.error('📝 Stack:', error.stack);
    console.error('═'.repeat(100) + '\n');

    res.status(500).json({
      message: 'Lỗi server khi lấy trang khám phá',
      error: error.message
    });
  }
};



