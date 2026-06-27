import mongoose from "mongoose";

const postSchema = new mongoose.Schema({
  // 1. GỠ BỎ required: true ở đây để cho phép đăng bài không cần text
  content: { 
    type: String, 
    required: false, 
    default: "" 
  },

    images: {
      type: Array,
      default: "",
    },

    hashtags: [
      {
        type: String,
      },
    ],

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Trạng thái ẩn/hiện do admin kiểm soát
    isHidden: {
      type: Boolean,
      default: false,
    },

    // 👇 THÊM PHẦN NÀY
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },

  { timestamps: true }
);

postSchema.virtual("comments", {
  ref: "Comment",
  localField: "_id",
  foreignField: "postId",
});

postSchema.set("toJSON", { virtuals: true });
postSchema.set("toObject", { virtuals: true });

export default mongoose.model("Post", postSchema);