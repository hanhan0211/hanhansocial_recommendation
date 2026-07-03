import UserPreference from "../models/UserPreference.js";
import mongoose from "mongoose";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE: Preference Service
 * ═══════════════════════════════════════════════════════════════════════════
 * MỤC ĐÍCH: Quản lý điểm tương tác giữa user và các tác giả
 * ═══════════════════════════════════════════════════════════════════════════
 */
import UserPreference from "../models/UserPreference.js";
import mongoose from "mongoose";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SERVICE: Preference Service
 * ═══════════════════════════════════════════════════════════════════════════
 * MỤC ĐÍCH: Quản lý điểm tương tác giữa user và các tác giả
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * ─────────────────────────────────────────────────────────────────────────
 * QUY TẮC TRỌNG SỐ ĐIỂM TƯƠNG TÁC
 * ─────────────────────────────────────────────────────────────────────────
 */
const SCORE_WEIGHTS = {
  LIKE: 1,      // User thích bài viết
  UNLIKE: -1,   // User bỏ thích
  COMMENT: 3,   // User bình luận
  UNCOMMENT: -3,// User hoặc tác giả xóa bình luận
  SAVE: 4,      // User lưu bài viết
  UNSAVE: -4,   // User bỏ lưu
  SEARCH: 2,    // User chủ động tìm kiếm từ khóa
};

const DECAY_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const WEEKLY_DECAY_RETENTION = 0.9;

const getDecayedScore = (item, fallbackDate = new Date()) => {
  const score = Number(item?.score || 0);
  const lastInteractedAt = item?.lastInteractedAt || fallbackDate;
  const lastTime = new Date(lastInteractedAt).getTime();

  if (!Number.isFinite(score) || !Number.isFinite(lastTime)) {
    return score;
  }

  const elapsedMs = Date.now() - lastTime;
  if (elapsedMs <= 0) {
    return score;
  }

  const elapsedIntervals = elapsedMs / DECAY_INTERVAL_MS;
  return score * Math.pow(WEEKLY_DECAY_RETENTION, elapsedIntervals);
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HÀM CHÍNH: CẬP NHẬT ĐIỂM TƯƠNG TÁC VỚI TÁC GIẢ
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * @param {ObjectId|String} userId - ID người dùng thực hiện hành động
 * @param {ObjectId|String} authorId - ID tác giả bài viết
 * @param {String} actionType - Loại hành động: LIKE, UNLIKE, COMMENT, SAVE, UNSAVE
 * @returns {Promise<void>}
 * 
 * CÁCH HOẠT ĐỘNG:
 * 1. Tìm UserPreference của userId, nếu chưa có thì tạo mới
 * 2. Tìm authorId trong mảng interactedAuthors:
 *    - Nếu CHƯA có: Push mới vào mảng với điểm ban đầu
 *    - Nếu ĐÃ có: Cộng/trừ điểm hiện tại
 * 3. Nếu điểm <= 0: Xóa authorId khỏi mảng (tiết kiệm storage)
 */
export const updateAuthorScore = async (userId, authorId, actionType) => {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('🎯 BẮT ĐẦU CẬP NHẬT ĐIỂM TƯƠNG TÁC');
    console.log('═'.repeat(80));
    console.log(`📝 User ID:    ${userId}`);
    console.log(`📝 Author ID:  ${authorId}`);
    console.log(`📝 Hành động:  ${actionType}`);

    // ─── VALIDATE INPUT ────────────────────────────────────────────────────
    if (!userId || !authorId || !actionType) {
      console.log('⚠️  CẢNH BÁO: Thiếu tham số bắt buộc - Bỏ qua cập nhật');
      console.log('═'.repeat(80) + '\n');
      return;
    }

    // ─── KIỂM TRA: KHÔNG TÍNH ĐIỂM CHO CHÍNH MÌNH ─────────────────────────
    if (userId.toString() === authorId.toString()) {
      console.log('ℹ️  INFO: User tương tác với bài viết của chính mình - Bỏ qua');
      console.log('═'.repeat(80) + '\n');
      return;
    }

    // ─── LẤY TRỌNG SỐ ĐIỂM ─────────────────────────────────────────────────
    const scoreChange = SCORE_WEIGHTS[actionType];
    if (scoreChange === undefined) {
      console.log(`⚠️  CẢNH BÁO: Loại hành động không hợp lệ: ${actionType}`);
      console.log('═'.repeat(80) + '\n');
      return;
    }
    console.log(`📊 Trọng số điểm: ${scoreChange > 0 ? '+' : ''}${scoreChange}`);

    // ─── CONVERT SANG ObjectId ────────────────────────────────────────────
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId.toString())
      : userId;
    const authorObjectId = mongoose.Types.ObjectId.isValid(authorId)
      ? new mongoose.Types.ObjectId(authorId.toString())
      : authorId;

    // ─── BƯỚC 1: TÌM UserPreference ───────────────────────────────────────
    console.log('\n🔍 BƯỚC 1: Tìm UserPreference...');
    let preference = await UserPreference.findOne({ userId: userObjectId });

    if (!preference) {
      // ─── TRƯỜNG HỢP 1: CHƯA CÓ PREFERENCE → TẠO MỚI ───────────────────
      console.log('   → Chưa có UserPreference, tạo mới...');
      
      if (scoreChange <= 0) {
        console.log('   Skip creating a new preference with a negative score');
        console.log('='.repeat(80) + '\n');
        return;
      }

      preference = new UserPreference({
        userId: userObjectId,
        interactedAuthors: [
          {
            authorId: authorObjectId,
            score: scoreChange,
            lastInteractedAt: new Date(),
          },
        ],
      });
      
      await preference.save();
      
      console.log('   ✅ TẠO MỚI thành công!');
      console.log(`   📌 Tác giả đầu tiên: ${authorId} với ${scoreChange} điểm`);
      console.log('═'.repeat(80) + '\n');
      return;
    }

    console.log('   ✅ Tìm thấy UserPreference');

    // ─── BƯỚC 2: TÌM authorId TRONG MẢNG interactedAuthors ────────────────
    console.log('\n🔍 BƯỚC 2: Kiểm tra tác giả trong mảng...');
    const authorIndex = preference.interactedAuthors.findIndex(
      (item) => item.authorId.toString() === authorObjectId.toString()
    );

    if (authorIndex >= 0) {
      // ─── TRƯỜNG HỢP 2: TÁC GIẢ ĐÃ CÓ → CẬP NHẬT ĐIỂM ──────────────────
      const oldScore = preference.interactedAuthors[authorIndex].score;
      const decayedOldScore = getDecayedScore(
        preference.interactedAuthors[authorIndex],
        preference.updatedAt
      );
      preference.interactedAuthors[authorIndex].score = decayedOldScore + scoreChange;
      preference.interactedAuthors[authorIndex].lastInteractedAt = new Date();
      const newScore = preference.interactedAuthors[authorIndex].score;

      console.log(`   ✅ Tác giả ĐÃ TỒN TẠI trong mảng`);
      console.log(`   📊 Điểm cũ: ${oldScore}`);
      console.log(`   📊 Thay đổi: ${scoreChange > 0 ? '+' : ''}${scoreChange}`);
      console.log(`   📊 Điểm mới: ${newScore}`);

      // ─── XÓA TÁC GIẢ NẾU ĐIỂM <= 0 ────────────────────────────────────
      if (newScore <= 0) {
        preference.interactedAuthors.splice(authorIndex, 1);
        console.log(`   🗑️  XÓA tác giả khỏi mảng (điểm <= 0)`);
      }
    } else {
      // ─── TRƯỜNG HỢP 3: TÁC GIẢ CHƯA CÓ → THÊM MỚI ─────────────────────
      console.log(`   ℹ️  Tác giả CHƯA có trong mảng`);
      
      // Chỉ thêm mới nếu điểm dương (tránh thêm author với điểm âm)
      if (scoreChange > 0) {
        preference.interactedAuthors.push({
          authorId: authorObjectId,
          score: scoreChange,
          lastInteractedAt: new Date(),
        });
        console.log(`   ✅ THÊM MỚI tác giả với ${scoreChange} điểm`);
      } else {
        console.log(`   ⚠️  Bỏ qua (không thêm tác giả với điểm âm)`);
      }
    }

    // ─── BƯỚC 3: LƯU VÀO DATABASE ──────────────────────────────────────────
    console.log('\n💾 BƯỚC 3: Lưu vào database...');
    await preference.save();
    console.log('   ✅ LƯU THÀNH CÔNG!');
    
    console.log('\n📊 TỔNG KẾT:');
    console.log(`   • Tổng số tác giả đang theo dõi: ${preference.interactedAuthors.length}`);
    console.log('═'.repeat(80) + '\n');

  } catch (error) {
    console.error('\n' + '═'.repeat(80));
    console.error('❌ LỖI KHI CẬP NHẬT ĐIỂM TƯƠNG TÁC');
    console.error('═'.repeat(80));
    console.error('📝 Chi tiết lỗi:', error.message);
    console.error('📝 Stack trace:', error.stack);
    console.error('═'.repeat(80) + '\n');
    // Không throw error để không làm gián đoạn flow chính của API
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HÀM PHỤ: LẤY DANH SÁCH TÁC GIẢ GỢI Ý (TOP SCORES)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * @param {ObjectId|String} userId - ID người dùng
 * @param {Number} limit - Số lượng tác giả tối đa
 * @returns {Promise<Array>} Mảng authorId được sắp xếp theo điểm cao nhất
 */
export const getTopRecommendedAuthors = async (userId, limit = 20) => {
  try {
    if (!userId) {
      return [];
    }

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId.toString())
      : userId;

    const preference = await UserPreference.findOne({ userId: userObjectId });

    if (!preference || !preference.interactedAuthors.length) {
      return []; // Chưa có dữ liệu tương tác
    }

    // Sắp xếp theo điểm giảm dần và lấy top N
    const topAuthors = preference.interactedAuthors
      .map(author => ({
        authorId: author.authorId,
        decayedScore: getDecayedScore(author, preference.updatedAt),
      }))
      .filter(author => author.decayedScore > 0)
      .sort((a, b) => b.decayedScore - a.decayedScore)
      .slice(0, limit)
      .map(author => author.authorId); // Trả về mảng ObjectId

    return topAuthors;
  } catch (error) {
    console.error('❌ Lỗi getTopRecommendedAuthors:', error.message);
    return [];
  }
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HÀM CHÍNH: CẬP NHẬT ĐIỂM TƯƠNG TÁC VỚI HASHTAG
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * @param {ObjectId|String} userId - ID người dùng
 * @param {Array<String>} hashtags - Mảng các hashtag
 * @param {String} actionType - Loại hành động: LIKE, COMMENT, SAVE
 */
export const updateHashtagScore = async (userId, hashtags, actionType) => {
  if (!hashtags || hashtags.length === 0) return;
  
  try {
    const scoreChange = SCORE_WEIGHTS[actionType];
    if (!scoreChange || scoreChange <= 0) return; // Chỉ cộng điểm, không trừ điểm hashtag

    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId.toString())
      : userId;

    let preference = await UserPreference.findOne({ userId: userObjectId });

    if (!preference) {
      preference = new UserPreference({
        userId: userObjectId,
        interactedHashtags: hashtags.map(tag => ({
          hashtag: tag,
          score: scoreChange,
          lastInteractedAt: new Date(),
        })),
      });
      await preference.save();
      return;
    }

    // Cập nhật điểm cho từng hashtag
    hashtags.forEach(tag => {
      const tagIndex = preference.interactedHashtags.findIndex(item => item.hashtag === tag);
      if (tagIndex >= 0) {
        const decayedOldScore = getDecayedScore(
          preference.interactedHashtags[tagIndex],
          preference.updatedAt
        );
        preference.interactedHashtags[tagIndex].score = decayedOldScore + scoreChange;
        preference.interactedHashtags[tagIndex].lastInteractedAt = new Date();
      } else {
        preference.interactedHashtags.push({
          hashtag: tag,
          score: scoreChange,
          lastInteractedAt: new Date(),
        });
      }
    });

    await preference.save();
  } catch (error) {
    console.error('❌ Lỗi khi cập nhật điểm Hashtag:', error.message);
  }
};

/**
 * LẤY TOP HASHTAG GỢI Ý CỦA USER
 */
export const getTopRecommendedHashtags = async (userId, limit = 5) => {
  try {
    if (!userId) return [];
    
    const userObjectId = mongoose.Types.ObjectId.isValid(userId)
      ? new mongoose.Types.ObjectId(userId.toString())
      : userId;

    const preference = await UserPreference.findOne({ userId: userObjectId });
    if (!preference || !preference.interactedHashtags.length) return [];

    return preference.interactedHashtags
      .map(item => ({
        hashtag: item.hashtag,
        decayedScore: getDecayedScore(item, preference.updatedAt),
      }))
      .filter(item => item.decayedScore > 0)
      .sort((a, b) => b.decayedScore - a.decayedScore)
      .slice(0, limit)
      .map(item => item.hashtag);
  } catch (error) {
    console.error('❌ Lỗi getTopRecommendedHashtags:', error.message);
    return [];
  }
};
