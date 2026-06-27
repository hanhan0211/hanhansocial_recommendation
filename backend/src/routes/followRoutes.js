import express from "express";
import { toggleFollow } from "../controllers/followController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", protect, toggleFollow);

export default router;