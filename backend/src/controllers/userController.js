import User from '../models/User.js'; // Đảm bảo tên file User.js khớp với thực tế
import Post from '../models/Post.js'; // Đảm bảo tên file Post.js khớp với thực tế
import { createNotification } from './notificationController.js';
import { updateAuthorScore, updateHashtagScore } from '../services/recommendService.js';
import { uploadAvatarToCloudinary } from '../middleware/uploadMiddleware.js';
import mongoose from 'mongoose';

// ==========================================
// LẤY THÔNG TIN USER THEO ID (cho chat với người lạ)
// ==========================================
// @route   GET /api/users/:id
// @access  Private
export const getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }

    const user = await User.findById(userId).select('_id username fullname avatar bio');

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    res.json(user);
  } catch (error) {
    console.error("❌ Lỗi getUserById:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 1. TÌM KIẾM NGƯỜI DÙNG (Dùng cho thanh Search)
// ==========================================
// @route   GET /api/users/search?query=...
// @access  Private
export const searchUsers = async (req, res) => {
  try {
    const keyword = req.query.query || req.query.q || '';

    if (!keyword.trim()) {
      return res.json([]);
    }

    // Tìm user khớp từ khóa trong CÁCH trường: username và fullname
    // Sử dụng $or để tìm kiếm linh hoạt, $regex với $options 'i' để case-insensitive
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: keyword, $options: 'i' } },
            { fullname: { $regex: keyword, $options: 'i' } }
          ]
        },
        { _id: { $ne: req.user._id } } // Loại trừ user đang đăng nhập
      ]
    })
      .select('_id username fullname avatar followers')
      .limit(20);
      
    res.json(users);
  } catch (error) {
    console.error("Lỗi searchUsers:", error);
    res.status(500).json({ message: "Lỗi Server Backend" });
  }
};

// ==========================================
// 1b. TÌM KIẾM NGƯỜI DÙNG - DÀNH RIÊNG TRANG CHỦ
// ==========================================
// @route   GET /api/users/home-search?query=...
// @access  Private
// Tìm theo username HOẶC fullname (linh hoạt với tài khoản mới chưa có fullname)
// Đồng thời tự động lưu từ khóa vào searchHistory của user hiện tại
export const homeSearchUsers = async (req, res) => {
  try {
    const keyword = (req.query.query || req.query.q || '').trim();

    if (!keyword) {
      return res.json([]);
    }

    // --- 1. Thực hiện tìm kiếm ---
    // Dùng $or kết hợp $regex + 'i' để tìm khớp một phần, không phân biệt hoa thường
    // Tài khoản mới chưa có fullname vẫn được tìm thấy qua username
    const users = await User.find({
      $and: [
        {
          $or: [
            { username: { $regex: keyword, $options: 'i' } },
            { fullname: { $regex: keyword, $options: 'i' } }
          ]
        },
        { _id: { $ne: req.user._id } } // Loại trừ chính mình
      ]
    })
      .select('_id username fullname avatar followers')
      .limit(15);

    // --- 2. Lưu từ khóa vào searchHistory của user hiện tại ---
    // Chạy bất đồng bộ, không block response
    User.findByIdAndUpdate(
      req.user._id,
      {
        $push: {
          searchHistory: {
            $each: [{ text: keyword, createdAt: new Date() }],
            $position: 0  // Thêm vào đầu mảng (mới nhất trước)
          }
        }
      }
    ).catch(err => console.error('❌ Lỗi lưu search history:', err));

    res.json(users);
  } catch (error) {
    console.error('❌ Lỗi homeSearchUsers:', error);
    res.status(500).json({ message: 'Lỗi Server Backend' });
  }
};

// ==========================================
// 1c. LẤY LỊCH SỬ TÌM KIẾM GẦN NHẤT - TRANG CHỦ
// ==========================================
// @route   GET /api/users/home-search-history
// @access  Private
// Trả về 5 từ khóa tìm kiếm gần nhất để hiển thị dropdown khi click thanh search
export const getHomeSearchHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('searchHistory');

    if (!user) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    // Lấy 5 từ khóa gần nhất, đã sắp xếp mới nhất trước (do $position: 0 khi push)
    const history = (user.searchHistory || [])
      .slice(0, 5)
      .map(item => ({ text: item.text, createdAt: item.createdAt }));

    res.json(history);
  } catch (error) {
    console.error('❌ Lỗi getHomeSearchHistory:', error);
    res.status(500).json({ message: 'Lỗi Server Backend' });
  }
};

// ==========================================
// 1d. XÓA LỊCH SỬ TÌM KIẾM - TRANG CHỦ
// ==========================================
// @route   DELETE /api/users/home-search-history          → xóa toàn bộ
// @route   DELETE /api/users/home-search-history/:text    → xóa 1 mục theo text
// @access  Private
export const deleteHomeSearchHistory = async (req, res) => {
  try {
    const userId = req.user._id;
    const textToDelete = req.params.text
      ? decodeURIComponent(req.params.text).trim()
      : null;

    let updateQuery;

    if (textToDelete) {
      // Xóa MỘT mục đầu tiên khớp với text (xóa cả bản ghi trùng lặp cùng tên)
      updateQuery = {
        $pull: { searchHistory: { text: textToDelete } }
      };
    } else {
      // Xóa TOÀN BỘ lịch sử
      updateQuery = { $set: { searchHistory: [] } };
    }

    await User.findByIdAndUpdate(userId, updateQuery);

    res.json({ message: textToDelete ? 'Đã xóa mục lịch sử' : 'Đã xóa toàn bộ lịch sử' });
  } catch (error) {
    console.error('❌ Lỗi deleteHomeSearchHistory:', error);
    res.status(500).json({ message: 'Lỗi Server Backend' });
  }
};

// ==========================================
// 2. LẤY THÔNG TIN HỒ SƠ & BÀI VIẾT CỦA USER
// ==========================================
// @route   GET /api/users/profile/:username
// @access  Private
export const getUserProfile = async (req, res) => {
  try {
    const usernameParam = decodeURIComponent(req.params.username);

    const targetUser = await User.findOne({
      username: { $regex: new RegExp(`^${usernameParam}$`, 'i') }
    }).select('-password');

    if (!targetUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại trong hệ thống" });
    }

    const currentUserId = req.user._id;
    const isFollowing = await User.exists({
      _id: currentUserId,
      following: targetUser._id
    });

    const isPending = targetUser.followRequests?.some(id => id.toString() === currentUserId.toString()) || false;
    const isOwnProfile = currentUserId.toString() === targetUser._id.toString();

    let posts = [];
    let postCount = 0;

    // Nếu không phải tài khoản riêng tư HOẶC là chủ tài khoản HOẶC đã follow thì mới trả về danh sách bài viết
    if (!targetUser.isPrivateAccount || isOwnProfile || isFollowing) {
      posts = await Post.find({ userId: targetUser._id, isHidden: { $ne: true } })
        .sort({ createdAt: -1 })
        .populate('comments');
      postCount = posts.length;
    } else {
      // Nếu là tài khoản riêng tư và chưa follow -> Chỉ trả về số lượng bài viết, ẩn bài viết
      postCount = await Post.countDocuments({ userId: targetUser._id, isHidden: { $ne: true } });
    }

    res.json({
      user: {
        ...targetUser.toObject(),
        followerCount: targetUser.followers?.length || 0,
        followingCount: targetUser.following?.length || 0,
      },
      posts: posts,
      postCount: postCount,
      isFollowing: !!isFollowing,
      isPending: isPending,
    });

  } catch (error) {
    console.error("❌ Lỗi nghiêm trọng tại getUserProfile:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 3. CẬP NHẬT HỒ SƠ (Đã fix triệt để lỗi tìm ID User)
// ==========================================
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    // Lấy ID user
    const userId = req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({
        message: "Lỗi xác thực: Không tìm thấy User ID từ Token gửi lên"
      });
    }

    // Truy vấn user từ Database
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy người dùng trong Database" });
    }

    // Cập nhật thông tin
    const nextUsername = req.body.username?.trim().toLowerCase();
    if (nextUsername && nextUsername !== user.username) {
      const usernameRegex = /^[a-z0-9_.]{3,30}$/;
      if (!usernameRegex.test(nextUsername)) {
        return res.status(400).json({ message: "Tên đăng nhập không hợp lệ" });
      }
      const usernameExists = await User.findOne({
        _id: { $ne: user._id },
        username: { $regex: new RegExp(`^${nextUsername}$`, 'i') },
      });
      if (usernameExists) {
        return res.status(400).json({ message: "Tên đăng nhập đã được sử dụng." });
      }
      user.username = nextUsername;
    }

    user.fullname = req.body.fullname !== undefined ? req.body.fullname.trim() : user.fullname;
    user.bio = req.body.bio !== undefined ? req.body.bio.trim() : user.bio;
    
    // Cập nhật chế độ riêng tư
    if (req.body.isPrivateAccount !== undefined) {
      user.isPrivateAccount = req.body.isPrivateAccount === true || req.body.isPrivateAccount === 'true';
    }

    // Cập nhật ảnh nếu có file upload
    if (req.file) {
      try {
        user.avatar = await uploadAvatarToCloudinary(req.file.buffer, req.file.mimetype);
        console.log("✅ Avatar updated to:", user.avatar);
      } catch (uploadError) {
        console.error("Avatar upload failed:", uploadError.message);
        return res.status(502).json({
          message: uploadError.message || "Khong the upload avatar len Cloudinary.",
        });
      }
    }

    const updatedUser = await user.save();

    return res.json({
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        fullname: updatedUser.fullname,
        avatar: updatedUser.avatar,
        bio: updatedUser.bio,
        email: updatedUser.email,
        isPrivateAccount: updatedUser.isPrivateAccount,
      }
    });
  } catch (error) {
    console.error("❌ Lỗi update profile:", error);
    return res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 4. FOLLOW/UNFOLLOW USER
// ==========================================
// @route   PUT /api/users/:id/follow
// @access  Private
export const followUser = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetUserId = req.params.id;

    console.log("👥 followUser called:", { currentUserId, targetUserId });

    // Không thể follow chính mình
    if (currentUserId.toString() === targetUserId.toString()) {
      return res.status(400).json({ message: "Bạn không thể follow chính mình" });
    }

    const currentUser = await User.findById(currentUserId);
    const targetUser = await User.findById(targetUserId);

    if (!currentUser || !targetUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const isFollowing = currentUser.following.some(id => id.toString() === targetUserId);
    const isPending = targetUser.followRequests?.some(id => id.toString() === currentUserId.toString()) || false;

    if (isFollowing) {
      // Unfollow: Xóa khỏi mảng following của currentUser và followers của targetUser
      currentUser.following = currentUser.following.filter(
        id => id.toString() !== targetUserId
      );
      targetUser.followers = targetUser.followers.filter(
        id => id.toString() !== currentUserId.toString()
      );

      await currentUser.save();
      await targetUser.save();

      console.log("👥 Unfollow successful");

      res.json({
        message: "Đã bỏ theo dõi",
        isFollowing: false,
        isPending: false,
        followerCount: targetUser.followers.length,
        followingCount: currentUser.following.length,
      });
    } else if (isPending) {
      // Hủy yêu cầu đang chờ duyệt
      targetUser.followRequests = targetUser.followRequests.filter(
        id => id.toString() !== currentUserId.toString()
      );
      
      await targetUser.save();
      
      console.log("👥 Cancelled follow request");

      res.json({
        message: "Đã hủy yêu cầu theo dõi",
        isFollowing: false,
        isPending: false,
        followerCount: targetUser.followers.length,
        followingCount: currentUser.following.length,
      });
    } else {
      // Nếu target là tài khoản riêng tư thì gửi yêu cầu chờ duyệt
      if (targetUser.isPrivateAccount) {
        if (!targetUser.followRequests) {
          targetUser.followRequests = [];
        }
        
        targetUser.followRequests.push(currentUserId);
        await targetUser.save();

        console.log("👥 Private follow request sent");

        // Tạo thông báo loại follow_request (yêu cầu chờ duyệt - tài khoản riêng tư)
        await createNotification({
          recipientId: targetUserId,
          senderId: currentUserId,
          type: "follow_request",
        });

        res.json({
          message: "Đã gửi yêu cầu theo dõi",
          isFollowing: false,
          isPending: true,
          followerCount: targetUser.followers.length,
          followingCount: currentUser.following.length,
        });
      } else {
        // Tài khoản công khai -> Follow ngay lập tức
        currentUser.following.push(targetUserId);
        targetUser.followers.push(currentUserId);

        await currentUser.save();
        await targetUser.save();

        console.log("👥 Follow successful");

        // 🔔 TẠO THÔNG BÁO CHO NGƯỜI ĐƯỢC FOLLOW
        console.log("🔔 Creating follow notification for:", targetUserId);
        await createNotification({
          recipientId: targetUserId,
          senderId: currentUserId,
          type: "follow",
        });

        res.json({
          message: "Đã theo dõi",
          isFollowing: true,
          isPending: false,
          followerCount: targetUser.followers.length,
          followingCount: currentUser.following.length,
        });
      }
    }
  } catch (error) {
    console.error("❌ Lỗi follow/unfollow:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 5. DANH SÁCH GỢI Ý CHO MODAL CHIA SẺ
// ==========================================
// @route   GET /api/users/share-suggestions
// @access  Private
export const getShareSuggestions = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId).populate({
      path: 'following',
      select: '_id username fullname avatar',
    });

    if (!currentUser) {
      return res.status(404).json({ message: 'Người dùng không tồn tại' });
    }

    let suggestions = (currentUser.following || [])
      .filter((user) => user != null)
      .map((user) => ({
        _id: user._id,
        username: user.username,
        fullname: user.fullname || '',
        avatar: user.avatar || '',
      }));

    if (suggestions.length === 0) {
      const fallbackUsers = await User.find({ _id: { $ne: currentUserId } })
        .select('_id username fullname avatar')
        .limit(6)
        .sort({ createdAt: -1 });

      suggestions = fallbackUsers.map((user) => ({
        _id: user._id,
        username: user.username,
        fullname: user.fullname || '',
        avatar: user.avatar || '',
      }));
    }

    res.json(suggestions);
  } catch (error) {
    console.error('❌ Lỗi getShareSuggestions:', error);
    res.status(500).json({ message: error.message || 'Lỗi Server Backend' });
  }
};

// ==========================================
// 6. GỢI Ý KẾT NỐI NGẪU NHIÊN (REFRESH)
// ==========================================
// @route   GET /api/users/connect-suggestions
// @access  Private
export const getConnectSuggestions = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId).select("following");

    if (!currentUser) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const excludeIds = [
      currentUserId,
      ...(currentUser.following || []),
    ];

    const eligibleCount = await User.countDocuments({
      _id: { $nin: excludeIds },
    });

    if (eligibleCount === 0) {
      return res.json([]);
    }

    const sampleSize = Math.min(5, eligibleCount);

    const suggestions = await User.aggregate([
      { $match: { _id: { $nin: excludeIds } } },
      { $sample: { size: sampleSize } },
      {
        $project: {
          _id: 1,
          username: 1,
          fullname: 1,
          avatar: 1,
          bio: 1,
        },
      },
    ]);

    res.json(suggestions);
  } catch (error) {
    console.error("❌ Lỗi getConnectSuggestions:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 7. LẤY DANH SÁCH GỢI Ý KẾT BẠN
// ==========================================
// @route   GET /api/users/suggested
// @access  Private
export const getSuggestedUsers = async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId);

    // Lấy danh sách user mà currentUser chưa follow và không phải chính mình
    const suggestedUsers = await User.find({
      _id: {
        $ne: currentUserId,
        $nin: currentUser.following
      }
    })
      .select('_id username fullname avatar bio')
      .limit(5)
      .sort({ createdAt: -1 }); // Ưu tiên user mới đăng ký

    res.json(suggestedUsers);
  } catch (error) {
    console.error("❌ Lỗi lấy suggested users:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 7. LẤY DANH SÁCH FOLLOWERS CỦA USER
// ==========================================
// @route   GET /api/users/:username/followers
// @access  Private
export const getUserFollowers = async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const currentUserId = req.user._id;

    // Tìm user theo username
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).populate({
      path: 'followers',
      select: '_id username fullname avatar bio',
    });

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Thêm trạng thái follow của currentUser với từng follower
    const followersWithStatus = await Promise.all(
      user.followers.map(async (follower) => {
        const isFollowing = await User.exists({
          _id: currentUserId,
          following: follower._id
        });

        return {
          ...follower.toObject(),
          isFollowing: !!isFollowing,
        };
      })
    );

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        avatar: user.avatar,
      },
      followers: followersWithStatus,
      count: user.followers.length,
    });
  } catch (error) {
    console.error("❌ Lỗi lấy followers:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 8. LẤY DANH SÁCH FOLLOWING CỦA USER
// ==========================================
// @route   GET /api/users/:username/following
// @access  Private
export const getUserFollowing = async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const currentUserId = req.user._id;

    // Tìm user theo username
    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, 'i') }
    }).populate({
      path: 'following',
      select: '_id username fullname avatar bio',
    });

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Thêm trạng thái follow của currentUser với từng người đang follow
    const followingWithStatus = await Promise.all(
      user.following.map(async (followingUser) => {
        const isFollowing = await User.exists({
          _id: currentUserId,
          following: followingUser._id
        });

        return {
          ...followingUser.toObject(),
          isFollowing: !!isFollowing,
        };
      })
    );

    res.json({
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        avatar: user.avatar,
      },
      following: followingWithStatus,
      count: user.following.length,
    });
  } catch (error) {
    console.error("❌ Lỗi lấy following:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 9. LƯU / BỎ LƯU BÀI VIẾT (TOGGLE BOOKMARK)
// ==========================================
// @route   PUT /api/users/save-post/:postId
// @access  Private
export const toggleSavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    if (!user.savedPosts) {
      user.savedPosts = [];
    }

    const alreadySaved = user.savedPosts.some(
      (id) => id.toString() === postId.toString()
    );

    if (alreadySaved) {
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== postId.toString()
      );

      console.log("🎯 BEFORE calling updateAuthorScore UNSAVE - userId:", userId, "authorId:", post.userId);
      // 🎯 CẬP NHẬT ĐIỂM RECOMMENDATION (UNSAVE: -4 điểm)
      if (post.userId) {
        await updateAuthorScore(userId, post.userId, 'UNSAVE');
      }
      console.log("🎯 AFTER calling updateAuthorScore UNSAVE");
    } else {
      user.savedPosts.push(postId);

      console.log("🎯 BEFORE calling updateAuthorScore SAVE - userId:", userId, "authorId:", post.userId);
      // 🎯 CẬP NHẬT ĐIỂM RECOMMENDATION (SAVE: +4 điểm)
      if (post.userId) {
        await updateAuthorScore(userId, post.userId, 'SAVE');
      }
      console.log("🎯 AFTER calling updateAuthorScore SAVE");

      // 🎯 CẬP NHẬT ĐIỂM HASHTAG (SAVE: +4 điểm)
      if (post.hashtags && post.hashtags.length > 0) {
        await updateHashtagScore(userId, post.hashtags, 'SAVE');
      }
      
      // 🔔 Tạo thông báo cho tác giả bài viết khi có người lưu
      if (post.userId) {
        await createNotification({
          recipientId: post.userId,
          senderId: userId,
          type: "save",
          postId: postId,
        });
      }
    }

    user.markModified("savedPosts");
    await user.save();

    res.json({
      message: alreadySaved ? "Đã bỏ lưu bài viết" : "Đã lưu bài viết",
      isSaved: !alreadySaved,
      savedPosts: user.savedPosts,
    });
  } catch (error) {
    console.error("❌ Lỗi toggle save post:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 10. LẤY DANH SÁCH BÀI VIẾT ĐÃ LƯU
// ==========================================
// @route   GET /api/users/:username/saved-posts
// @access  Private (chỉ chủ tài khoản)
export const getSavedPosts = async (req, res) => {
  try {
    const username = decodeURIComponent(req.params.username);
    const currentUserId = req.user._id;

    const user = await User.findOne({
      username: { $regex: new RegExp(`^${username}$`, "i") },
    }).populate({
      path: "savedPosts",
      populate: {
        path: "userId",
        select: "username fullname avatar role",
      },
    });

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    if (user._id.toString() !== currentUserId.toString()) {
      return res.status(403).json({
        message: "Bạn không có quyền xem bài viết đã lưu của người này",
      });
    }

    const posts = (user.savedPosts || [])
      .filter((post) => post != null)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      posts,
      savedPosts: posts.map((p) => p._id),
      count: posts.length,
    });
  } catch (error) {
    console.error("❌ Lỗi lấy saved posts:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 11. HỆ THỐNG YÊU CẦU THEO DÕI (PRIVATE ACCOUNT)
// ==========================================

// @route   GET /api/users/follow-requests
// @access  Private
export const getFollowRequests = async (req, res) => {
  try {
    const myId = req.user._id;
    const me = await User.findById(myId).populate('followRequests', '_id username fullname avatar bio');
    
    if (!me) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    res.json(me.followRequests || []);
  } catch (error) {
    console.error("❌ Lỗi lấy yêu cầu theo dõi:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// @route   POST /api/users/follow-requests/:requesterId/accept
// @access  Private
export const acceptFollowRequest = async (req, res) => {
  try {
    const myId = req.user._id;
    const { requesterId } = req.params;

    const me = await User.findById(myId);
    const requester = await User.findById(requesterId);

    if (!me || !requester) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Xóa khỏi followRequests
    me.followRequests = me.followRequests.filter(id => id.toString() !== requesterId);

    // Thêm requester vào followers của mình nếu chưa có
    if (!me.followers.some(id => id.toString() === requesterId)) {
      me.followers.push(requesterId);
    }

    // Thêm mình vào following của requester nếu chưa có
    if (!requester.following.some(id => id.toString() === myId.toString())) {
      requester.following.push(myId);
    }

    await me.save();
    await requester.save();

    // Tạo thông báo follow từ requester đến mình
    await createNotification({
      recipientId: myId,
      senderId: requesterId,
      type: "follow",
    });

    // 🔌 Emit socket tới requester để frontend của họ tự refresh profile ngay
    // Event: "follow-request-accepted" kèm profileOwnerId để biết profile nào cần reload
    const { io, getReceiverSocketId } = await import('../socket/socket.js');
    const requesterSocketId = getReceiverSocketId(requesterId.toString());
    if (io && requesterSocketId) {
      io.to(requesterSocketId).emit('follow-request-accepted', {
        profileOwnerId: myId.toString(),
        profileOwnerUsername: me.username,
      });
      console.log(`🔌 Emitted follow-request-accepted to requester ${requesterId}`);
    }

    res.json({ message: "Đã chấp nhận yêu cầu theo dõi", followerCount: me.followers.length });
  } catch (error) {
    console.error("❌ Lỗi chấp nhận yêu cầu theo dõi:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// @route   POST /api/users/follow-requests/:requesterId/decline
// @access  Private
export const declineFollowRequest = async (req, res) => {
  try {
    const myId = req.user._id;
    const { requesterId } = req.params;

    const me = await User.findById(myId);

    if (!me) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Xóa khỏi followRequests
    me.followRequests = me.followRequests.filter(id => id.toString() !== requesterId);
    await me.save();

    res.json({ message: "Đã từ chối yêu cầu theo dõi" });
  } catch (error) {
    console.error("❌ Lỗi từ chối yêu cầu theo dõi:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// ==========================================
// 12. HOÀN THÀNH ONBOARDING (CHỌN CHỦ ĐỀ)
// ==========================================
// @route   PUT /api/users/onboarding
// @access  Private
export const completeOnboarding = async (req, res) => {
  try {
    const { hashtags } = req.body;
    const userId = req.user._id;

    if (!hashtags || !Array.isArray(hashtags) || hashtags.length < 3) {
      return res.status(400).json({ message: "Vui lòng chọn ít nhất 3 chủ đề" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Đánh dấu đã hoàn thành onboarding
    user.hasCompletedOnboarding = true;
    await user.save();

    // Lưu các hashtag đã chọn với điểm số cao (để ưu tiên)
    // Gọi hàm updateHashtagScore (chúng ta sẽ truyền actionType giả định có điểm cao)
    // Tạm thời truyền mảng hashtag với trọng số lớn
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId.toString())
      : userId;

    const { default: UserPreference } = await import('../models/UserPreference.js');
    
    let preference = await UserPreference.findOne({ userId: userObjectId });

    if (!preference) {
      preference = new UserPreference({
        userId: userObjectId,
        interactedHashtags: hashtags.map(tag => ({ hashtag: tag, score: 10 })), // Điểm 10 cho sở thích ban đầu
      });
    } else {
      hashtags.forEach(tag => {
        const tagIndex = preference.interactedHashtags.findIndex(item => item.hashtag === tag);
        if (tagIndex >= 0) {
          preference.interactedHashtags[tagIndex].score += 10;
        } else {
          preference.interactedHashtags.push({ hashtag: tag, score: 10 });
        }
      });
    }

    await preference.save();

    res.json({
      message: "Hoàn tất chọn chủ đề",
      hasCompletedOnboarding: true,
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        avatar: user.avatar,
        bio: user.bio,
        email: user.email,
        role: user.role,
        hasCompletedOnboarding: true
      }
    });
  } catch (error) {
    console.error("❌ Lỗi completeOnboarding:", error);
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};
