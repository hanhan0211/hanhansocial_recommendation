import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    fullname: {
      type: String,
      default: "",
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
      maxlength: 200,
    },
    role: {
      type: String,
      default: "user",
      enum: ["user", "admin"],
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    isPrivateAccount: {
      type: Boolean,
      default: false,
    },
    followRequests: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Hệ thống Follow/Unfollow
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    savedPosts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Post",
      },
    ],
    // Lịch sử tìm kiếm
    searchHistory: [
      {
        text: {
          type: String,
          required: true,
          trim: true,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    // Trạng thái đã hoàn thành chọn chủ đề (Onboarding)
    hasCompletedOnboarding: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index để tăng tốc query
// Đã có unique:true trên username nên không cần index riêng
userSchema.index({ followers: 1 });
userSchema.index({ following: 1 });

// Virtual để lấy số lượng followers/following
userSchema.virtual('followerCount').get(function() {
  return this.followers?.length || 0;
});

userSchema.virtual('followingCount').get(function() {
  return this.following?.length || 0;
});

// Method để kiểm tra xem user A có follow user B không
userSchema.methods.isFollowing = function(userId) {
  return this.following.some(id => id.toString() === userId.toString());
};

// Method để kiểm tra xem user A có được user B follow không
userSchema.methods.isFollowedBy = function(userId) {
  return this.followers.some(id => id.toString() === userId.toString());
};

export default mongoose.model("User", userSchema);