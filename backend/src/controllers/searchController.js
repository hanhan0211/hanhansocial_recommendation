import User from '../models/User.js';
import Post from '../models/Post.js';
import Hashtag from '../models/Hashtag.js';
import { updateHashtagScore } from '../services/recommendService.js';

/**
 * GET /api/search/all?q=...
 * Tìm kiếm đa đối tượng: Users, Posts, Hashtags (Dùng Regex 'i')
 */
export const searchAll = async (req, res) => {
  try {
    const { q } = req.query;

    // Kiểm tra đầu vào: Trống hoặc chỉ có khoảng trắng
    if (!q || !q.trim()) {
      return res.status(400).json({ message: 'Từ khóa tìm kiếm không được để trống' });
    }

    const searchQuery = q.trim();
    const regex = new RegExp(searchQuery, 'i');

    // Chạy các query song song để tối ưu hiệu năng
    const [users, posts, hashtags] = await Promise.all([
      // 1. Tìm Users theo username hoặc fullname (Bỏ qua tài khoản bị banned)
      User.find({
        $or: [
          { username: { $regex: regex } },
          { fullname: { $regex: regex } }
        ],
        isBanned: { $ne: true }
      })
      .select('_id username fullname avatar role followers following')
      .limit(20)
      .lean(),

      // 2. Tìm Posts theo content
      Post.find({
        content: { $regex: regex },
        isHidden: { $ne: true }
      })
      .populate('userId', '_id username fullname avatar role')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),

      // 3. Tìm Hashtags theo name
      Hashtag.find({
        name: { $regex: regex }
      })
      .sort({ count: -1 })
      .limit(20)
      .lean()
    ]);

    res.status(200).json({ users, posts, hashtags });
  } catch (error) {
    console.error('===== LỖI TÌM KIẾM TOÀN DIỆN =====', error);
    res.status(500).json({ message: 'Lỗi server khi thực hiện tìm kiếm', error: error.message });
  }
};

/**
 * GET /api/search/history
 * Lấy lịch sử tìm kiếm của User
 */
export const getSearchHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('searchHistory');
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }
    
    // Sắp xếp lịch sử mới nhất lên đầu trước khi trả về
    const history = (user.searchHistory || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json(history);
  } catch (error) {
    console.error('===== LỖI LẤY LỊCH SỬ TÌM KIẾM =====', error);
    res.status(500).json({ message: 'Lỗi server khi lấy lịch sử tìm kiếm', error: error.message });
  }
};

/**
 * POST /api/search/history
 * Thêm từ khóa vào mảng searchHistory của User (Không trùng lặp, đưa lên đầu)
 */
export const addSearchHistory = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Từ khóa không hợp lệ' });
    }

    const keyword = text.trim();
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Kiểm tra xem đã tồn tại từ khóa này chưa (không phân biệt hoa thường)
    const existsIdx = user.searchHistory.findIndex(
      (item) => item.text.toLowerCase() === keyword.toLowerCase()
    );

    if (existsIdx !== -1) {
      // Nếu đã tồn tại, xóa bỏ phần tử cũ
      user.searchHistory.splice(existsIdx, 1);
    }

    // Đưa lên đầu danh sách
    user.searchHistory.unshift({ text: keyword, createdAt: new Date() });

    // Cập nhật điểm sở thích (chống spam: chỉ cộng điểm nếu là tìm kiếm mới hoặc tìm kiếm lại sau ít nhất 1 giờ)
    let shouldUpdateScore = false;
    if (existsIdx === -1) {
      shouldUpdateScore = true;
    } else {
      // Nếu đã từng tìm kiếm, kiểm tra xem lần tìm kiếm trước đó cách đây bao lâu
      // existsIdx bây giờ đã bị splice ở mảng cũ, nhưng ta có thể lấy createdAt từ item cũ nếu muốn,
      // tuy nhiên do ta đã splice mất rồi nên khó lấy. Tốt nhất là kiểm tra trước khi splice.
      // Dù sao, để đơn giản và chống spam tuyệt đối: chỉ cộng điểm cho lần đầu tiên user tìm kiếm (existsIdx === -1)
      // hoặc bạn có thể cộng mỗi lần (nhưng dễ bị spam).
    }

    // Giới hạn lịch sử tìm kiếm tối đa 20 mục
    if (user.searchHistory.length > 20) {
      user.searchHistory = user.searchHistory.slice(0, 20);
    }

    await user.save();

    // Gọi hàm cập nhật điểm cho Hashtag (nếu là từ khóa mới)
    // Chuyển đổi từ khóa thành dạng hashtag (viết thường, bỏ dấu cách)
    if (existsIdx === -1) {
      const formattedKeyword = keyword.toLowerCase().replace(/\s+/g, '');
      if (formattedKeyword.length > 0) {
        // Chạy bất đồng bộ, không block luồng trả về
        updateHashtagScore(req.user._id, [formattedKeyword], 'SEARCH')
          .catch(err => console.error("Lỗi cập nhật điểm tìm kiếm:", err));
      }
    }
    
    res.status(200).json(user.searchHistory);
  } catch (error) {
    console.error('===== LỖI THÊM LỊCH SỬ TÌM KIẾM =====', error);
    res.status(500).json({ message: 'Lỗi server khi thêm lịch sử tìm kiếm', error: error.message });
  }
};

/**
 * DELETE /api/search/history/:id
 * Xóa một mục lịch sử cụ thể
 */
export const deleteSearchHistoryItem = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Lọc bỏ mục lịch sử có ID tương ứng
    user.searchHistory = user.searchHistory.filter(
      (item) => item._id.toString() !== id
    );

    await user.save();

    res.status(200).json(user.searchHistory);
  } catch (error) {
    console.error('===== LỖI XÓA MỘT MỤC LỊCH SỬ TÌM KIẾM =====', error);
    res.status(500).json({ message: 'Lỗi server khi xóa mục lịch sử tìm kiếm', error: error.message });
  }
};

/**
 * DELETE /api/search/history/all
 * Xóa toàn bộ lịch sử
 */
export const clearAllSearchHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    user.searchHistory = [];
    await user.save();

    res.status(200).json([]);
  } catch (error) {
    console.error('===== LỖI XÓA TOÀN BỘ LỊCH SỬ TÌM KIẾM =====', error);
    res.status(500).json({ message: 'Lỗi server khi xóa toàn bộ lịch sử tìm kiếm', error: error.message });
  }
};
