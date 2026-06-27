import Like from "../models/Like.js";
import Post from "../models/Post.js";
import { updatePreference } from "./recommendController.js";
import { createNotification } from "./notificationController.js"; 
export const toggleLike = async (req, res) => {
  const userId = req.user._id || req.user.id;
  const { postId } = req.body;

  console.log("🔔 toggleLike called:", { userId, postId });

  try {
    // tìm like
    const existing = await Like.findOne({ userId, postId });

    if (existing) {
      await existing.deleteOne();
      return res.json({ message: "Unliked" });
    }

    // tạo like
    await Like.create({ userId, postId });

    // 🔥 lấy post để update preference
    const post = await Post.findById(postId);
    console.log("📝 Post found:", post);

    if (post && post.hashtags) {
      updatePreference(userId, post.hashtags);
    }

    // 🔔 Tạo thông báo cho tác giả bài viết
    if (post && post.userId) {
      console.log("🔔 Creating notification for:", post.userId);
      await createNotification({
        recipientId: post.userId,
        senderId: userId,
        type: "like",
        postId: postId,
      });
    }

    res.json({ message: "Liked" });
  } catch (error) {
    console.error("❌ Error in toggleLike:", error);
    res.status(500).json({ message: "Server error" });
  }
};