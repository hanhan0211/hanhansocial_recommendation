import Hashtag from '../models/Hashtag.js';

/**
 * GET /api/hashtags/trending
 * Lấy danh sách các hashtag thịnh hành nhất
 */
export const getTrendingHashtags = async (req, res) => {
  try {
    // Lọc bỏ những hashtag có count <= 0, sắp xếp theo count giảm dần, lấy tối đa 10 tags
    const trending = await Hashtag.find({ count: { $gt: 0 } })
      .sort({ count: -1 })
      .limit(10)
      .lean();

    res.status(200).json(trending);
  } catch (error) {
    console.error('===== LỖI LẤY HASHTAG THỊNH HÀNH =====', error);
    res.status(500).json({ message: 'Lỗi server khi lấy hashtag thịnh hành', error: error.message });
  }
};
