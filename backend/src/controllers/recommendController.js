import Post from "../models/Post.js";

let userPreferences = {}; 
// dạng: { userId: { hashtag: score } }

// cập nhật sở thích
export const updatePreference = (userId, hashtags) => {
  if (!userPreferences[userId]) {
    userPreferences[userId] = {};
  }

  hashtags.forEach((tag) => {
    if (!userPreferences[userId][tag]) {
      userPreferences[userId][tag] = 0;
    }
    userPreferences[userId][tag] += 1;
  });
};

// API gợi ý
export const getRecommendedPosts = async (req, res) => {
  const userId = req.user.id;
  const prefs = userPreferences[userId] || {};

  const posts = await Post.find({ isHidden: { $ne: true } }); // 🔥 lấy từ MongoDB

  const result = posts.map((post) => {
    let score = 0;

    post.hashtags?.forEach((tag) => {
      if (prefs[tag]) {
        score += prefs[tag];
      }
    });

    return { ...post._doc, score };
  });

  result.sort((a, b) => b.score - a.score);

  res.json(result);
};