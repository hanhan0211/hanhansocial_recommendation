import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      console.log("👉 Token nhận được:", token ? "Có token" : "Không có token");

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("👉 Token decoded:", decoded);

      const userId = decoded.id || decoded._id;
      req.user = await User.findById(userId).select('-password');

      if (!req.user) {
        console.log("❌ Không tìm thấy user với ID:", userId);
        return res.status(401).json({ message: "Không có quyền truy cập, User không còn tồn tại" });
      }

      console.log("✅ User xác thực thành công:", req.user.username);
      next();
    } catch (error) {
      console.error("❌ Lỗi xác thực Token:", error.message);
      return res.status(401).json({ message: "Không có quyền truy cập, Token thất bại hoặc hết hạn" });
    }
  } else {
    console.log("❌ Không tìm thấy Authorization header");
    return res.status(401).json({ message: "Không có quyền truy cập, không tìm thấy token" });
  }
};

/**
 * Middleware checkBanned — đặt NGAY SAU protect.
 * Truy vấn DB lấy trạng thái isBanned mới nhất (tránh dùng cache từ JWT).
 * Nếu bị khóa → trả 403 và chặn request, không tiếp tục.
 */
export const checkBanned = async (req, res, next) => {
  try {
    // Lấy trạng thái mới nhất từ DB, không dùng req.user cache
    const freshUser = await User.findById(req.user._id).select('isBanned username');
    if (!freshUser) {
      return res.status(401).json({ message: "Tài khoản không tồn tại" });
    }
    if (freshUser.isBanned) {
      console.log(`🚫 User bị chặn: ${freshUser.username}`);
      return res.status(403).json({
        message: "Tài khoản của bạn đã bị khóa!",
        code: "ACCOUNT_BANNED",
      });
    }
    next();
  } catch (error) {
    console.error("❌ Lỗi checkBanned:", error.message);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};