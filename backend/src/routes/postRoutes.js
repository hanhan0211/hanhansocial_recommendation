import express from "express";
import { getPosts, getRandomPosts, getFeedPosts, getExplorePosts, getPostById, createPost, deletePost, likePost, reportPost, getPostsByHashtag } from "../controllers/postController.js";
import { protect, checkBanned } from "../middleware/authMiddleware.js";

const router = express.Router();

// tạo bài viết (có bảo vệ)
router.post("/", protect, checkBanned, createPost);

// lấy danh sách bài viết theo hashtag
router.get("/hashtag/:hashtagName", protect, getPostsByHashtag);

// lấy bài viết cho trang khám phá (Explore Page) - GỢI Ý CÁ NHÂN HÓA
router.get("/explore", protect, getExplorePosts);

// lấy danh sách bài viết
router.get("/", getPosts);
router.get("/feed", protect, getFeedPosts);
router.get("/random", protect, getRandomPosts);
router.get("/:postId", getPostById);
router.delete("/:id", protect, checkBanned, deletePost);
router.put("/:id/like", protect, checkBanned, likePost);
router.post("/:id/report", protect, checkBanned, reportPost);

export default router;