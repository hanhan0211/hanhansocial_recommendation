import express from "express";
import { toggleLike } from "../controllers/likeController.js";
import { protect, checkBanned } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, checkBanned, toggleLike);

export default router;