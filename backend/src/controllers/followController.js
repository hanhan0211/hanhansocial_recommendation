import Follow from "../models/Follow.js";
import { createNotification } from "./notificationController.js";

// follow / unfollow
export const toggleFollow = async (req, res) => {
  const followerId = req.user._id || req.user.id;
  const { userId } = req.body;

  console.log("🔔 toggleFollow called:", { followerId, userId });

  if (followerId === userId) {
    return res.status(400).json({ message: "Không thể follow chính mình" });
  }

  try {
    const existing = await Follow.findOne({
      followerId,
      followingId: userId,
    });

    if (existing) {
      // unfollow
      await Follow.deleteOne({ _id: existing._id });
      return res.json({ message: "Unfollowed" });
    }

    // follow
    await Follow.create({
      followerId,
      followingId: userId,
    });

    // 🔔 Tạo thông báo cho người được follow
    console.log("🔔 Creating follow notification for:", userId);
    await createNotification({
      recipientId: userId,
      senderId: followerId,
      type: "follow",
    });

    res.json({ message: "Followed" });
  } catch (error) {
    console.error("❌ Error in toggleFollow:", error);
    res.status(500).json({ message: "Server error" });
  }
};