import mongoose from "mongoose";

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MODEL: UserPreference
 * ═══════════════════════════════════════════════════════════════════════════
 * MỤC ĐÍCH: Lưu trữ điểm tương tác của user với các tác giả khác
 * SỬ DỤNG: Xây dựng hệ thống gợi ý bài viết cá nhân hóa
 * ═══════════════════════════════════════════════════════════════════════════
 */

const userPreferenceSchema = new mongoose.Schema(
  {
    // ID người dùng (unique - mỗi user chỉ có 1 bản ghi)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true, // Index để tăng tốc query findOne({ userId })
    },

    // Mảng chứa điểm tương tác với từng tác giả
    interactedAuthors: [
      {
        authorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        score: {
          type: Number,
          default: 0,
        },
      },
    ],

    // Mảng chứa điểm tương tác với các hashtag (Chủ đề)
    interactedHashtags: [
      {
        hashtag: {
          type: String,
          required: true,
          trim: true,
        },
        score: {
          type: Number,
          default: 0,
        },
      },
    ],
  },
  { 
    timestamps: true // Tự động thêm createdAt, updatedAt
  }
);

// Index compound để tăng tốc query tìm authorId trong mảng
userPreferenceSchema.index({ "interactedAuthors.authorId": 1 });
userPreferenceSchema.index({ "interactedAuthors.score": -1 }); // Sắp xếp theo điểm

// Index cho hashtag
userPreferenceSchema.index({ "interactedHashtags.hashtag": 1 });
userPreferenceSchema.index({ "interactedHashtags.score": -1 });

export default mongoose.model("UserPreference", userPreferenceSchema);
