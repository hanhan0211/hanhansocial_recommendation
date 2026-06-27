import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null, // reply comment
    },
  },
  { timestamps: true }
);

export default mongoose.model("Comment", commentSchema);