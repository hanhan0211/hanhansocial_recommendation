import Hashtag from '../models/Hashtag.js';

/**
 * Trích xuất các hashtag từ nội dung văn bản.
 * Chấp nhận chữ, số, dấu gạch dưới _.
 * @param {string} content - Nội dung bài viết
 * @returns {string[]} Mảng các hashtag đã làm sạch (chữ thường, không trùng lặp, tối đa 10 tags)
 */
export const extractHashtags = (content) => {
  if (!content || typeof content !== "string") return [];

  // Tìm tất cả các từ bắt đầu bằng dấu # (chỉ gồm chữ, số, dấu gạch dưới _)
  const regex = /#([a-zA-Z0-9_]+)/g;
  const tags = [];
  let match;

  while ((match = regex.exec(content)) !== null) {
    // Loại bỏ dấu # và chuyển về chữ thường để tránh phân mảnh DB
    tags.push(match[1].toLowerCase());
  }

  // Loại bỏ các hashtag trùng lặp trong cùng 1 bài viết
  const uniqueTags = [...new Set(tags)];

  // CHỐNG SPAM: Chỉ lấy tối đa 10 hashtag đầu tiên
  return uniqueTags.slice(0, 10);
};

/**
 * Giảm count của hashtag khi xóa bài viết và xóa hẳn khỏi DB nếu count <= 0
 * @param {string[]} tags - Mảng các hashtag cần giảm biến đếm
 */
export const decrementHashtags = async (tags) => {
  if (!tags || !Array.isArray(tags) || tags.length === 0) return;

  try {
    await Promise.all(
      tags.map(async (tag) => {
        const lowerTag = tag.toLowerCase().trim();
        const updated = await Hashtag.findOneAndUpdate(
          { name: lowerTag },
          { $inc: { count: -1 } },
          { new: true }
        );

        // Nếu count giảm xuống 0 (hoặc nhỏ hơn) thì xóa luôn để dọn rác DB
        if (updated && updated.count <= 0) {
          await Hashtag.deleteOne({ _id: updated._id });
        }
      })
    );
  } catch (error) {
    console.error('❌ Lỗi giảm biến đếm hashtag:', error);
  }
};
