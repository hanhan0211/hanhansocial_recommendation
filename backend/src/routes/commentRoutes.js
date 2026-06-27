import express from "express";
import { createComment, getCommentsByPost, reportComment, deleteComment } from "../controllers/commentController.js";
import { protect, checkBanned } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, checkBanned, createComment);
router.get("/:postId", getCommentsByPost);
router.post("/:id/report", protect, checkBanned, reportComment);
router.delete("/:id", protect, checkBanned, deleteComment);

export default router;