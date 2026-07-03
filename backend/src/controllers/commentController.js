import Comment from "../models/Comment.js";
import mongoose from "mongoose";
import Post from "../models/Post.js";
import { createNotification } from "./notificationController.js";
import { updateAuthorScore } from "../services/recommendService.js";

// TẠO COMMENT
export const createComment = async (req, res) => {
  try {
    const { content, postId, parentId } = req.body;
    const userId = req.user._id || req.user.id;

    console.log("🔔 createComment called:", { userId, postId, content });

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "postId không hợp lệ" });
    }

    const comment = await Comment.create({
      content,
      postId,
      parentId: parentId || null,
      userId: userId,
    });

    // POPULATE ngay để trả về tên + avatar cho Frontend
    const populatedComment = await Comment.findById(comment._id).populate("userId", "username avatar role");

    // 🔔 Tạo thông báo cho tác giả bài viết
    const post = await Post.findById(postId);
    console.log("📝 Post found for comment:", post);
    
    if (post && post.userId) {
      console.log("🔔 Creating comment notification for:", post.userId);
      console.log("🎯 BEFORE calling updateAuthorScore - userId:", userId, "authorId:", post.userId);

      // 🎯 CẬP NHẬT ĐIỂM RECOMMENDATION (COMMENT: +3 điểm)
      await updateAuthorScore(userId, post.userId, 'COMMENT');
      console.log("🎯 AFTER calling updateAuthorScore");

      await createNotification({
        recipientId: post.userId,
        senderId: userId,
        type: "comment",
        postId: postId,
        content: content.substring(0, 100), // Lấy 100 ký tự đầu
      });
    }

    res.json(populatedComment);
  } catch (error) {
    console.error("❌ Error in createComment:", error);
    res.status(500).json({ message: "Lỗi server khi tạo comment", error: error.message });
  }
};

// LẤY COMMENT + GROUP REPLY
export const getCommentsByPost = async (req, res) => {
  try {
    const { postId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return res.status(400).json({ message: "postId không hợp lệ" });
    }

    // THÊM POPULATE Ở ĐÂY
    const comments = await Comment.find({ postId })
      .populate("userId", "username avatar role") 
      .sort({ createdAt: 1 });

    const parentComments = comments.filter(c => !c.parentId);

    const result = parentComments.map(parent => {
      const replies = comments.filter(
        c => c.parentId && c.parentId.toString() === parent._id.toString()
      );
      return {
        ...parent._doc,
        replies
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "Lỗi server khi lấy comment", error: error.message });
  }
};

// BÁO CÁO BÌNH LUẬN
export const reportComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const reportedBy = req.user._id || req.user.id;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Lý do báo cáo không được để trống" });
    }

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    const { default: Report } = await import("../models/Report.js");

    const newReport = await Report.create({
      type: "comment",
      commentId: id,
      reportedBy,
      reason,
    });

    // Phát tín hiệu socket tới admin
    try {
      const pendingCount = await Report.countDocuments({});
      const io = req.app.get('io');
      if (io) {
        io.emit('new-report', pendingCount);
        console.log(`🔌 Emitted new-report with pendingCount: ${pendingCount}`);
      }
    } catch (socketErr) {
      console.error("⚠️ Lỗi phát tín hiệu socket new-report:", socketErr);
    }

    res.status(201).json({ message: "Báo cáo bình luận thành công!", report: newReport });
  } catch (error) {
    console.error("❌ Error in reportComment:", error);
    res.status(500).json({ message: "Lỗi server khi báo cáo bình luận", error: error.message });
  }
};

// XÓA BÌNH LUẬN
export const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id || req.user.id;

    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ message: "Không tìm thấy bình luận" });
    }

    const post = await Post.findById(comment.postId);
    if (!post) {
      return res.status(404).json({ message: "Không tìm thấy bài viết liên quan" });
    }

    // Kiểm tra quyền: tác giả bình luận HOẶC tác giả bài viết
    const isCommentAuthor = comment.userId.toString() === userId.toString();
    const isPostAuthor = post.userId && post.userId.toString() === userId.toString();

    if (!isCommentAuthor && !isPostAuthor) {
      return res.status(403).json({ message: "Bạn không có quyền xóa bình luận này" });
    }

    // 🎯 TRỪ ĐIỂM RECOMMENDATION KHI XÓA BÌNH LUẬN
    // Lưu ý: Người comment bị trừ điểm đối với tác giả bài viết
    if (post.userId && comment.userId.toString() !== post.userId.toString()) {
      await updateAuthorScore(comment.userId, post.userId, 'UNCOMMENT');
    }

    // Xóa bình luận
    await Comment.findByIdAndDelete(id);

    // Xóa tất cả các phản hồi (Replies)
    await Comment.deleteMany({ parentId: id });

    // Xóa các báo cáo liên quan (Cascade Delete)
    const { default: Report } = await import("../models/Report.js");
    await Report.deleteMany({ commentId: id });

    res.json({ message: "Xóa bình luận thành công" });
  } catch (error) {
    console.error("❌ Error in deleteComment:", error);
    res.status(500).json({ message: "Lỗi server khi xóa bình luận", error: error.message });
  }
};