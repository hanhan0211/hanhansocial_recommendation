import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import crypto from "crypto";
import { sendPasswordResetEmail } from "../services/emailService.js";

const hashResetCode = (code) =>
  crypto
    .createHash("sha256")
    .update(`${code}:${process.env.JWT_SECRET || "reset-secret"}`)
    .digest("hex");

const createResetCode = () => crypto.randomInt(100000, 1000000).toString();

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findUserByResetIdentifier = async (identifier) => {
  const value = identifier.trim().toLowerCase();
  if (value.includes("@")) {
    return User.findOne({ email: value });
  }

  return User.findOne({
    username: { $regex: new RegExp(`^${escapeRegex(value)}$`, "i") },
  });
};

export const register = async (req, res) => {
  try {
    const username = req.body.username?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password;
    const fullname = req.body.fullname?.trim() || "";

    if (!username || !email || !password) {
      return res.status(400).json({ message: "Vui lòng điền đầy đủ thông tin đăng ký." });
    }

    // Validate username
    const usernameRegex = /^[a-z0-9_.]{3,30}$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({ message: "Tên đăng nhập không hợp lệ. Chỉ chấp nhận chữ thường, số, dấu chấm và gạch dưới (3-30 ký tự)." });
    }

    // Validate email
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Định dạng email không hợp lệ." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mật khẩu phải có ít nhất 6 ký tự." });
    }

    // Kiểm tra xem email đã được đăng ký trước đó chưa
    const existingUser = await User.findOne({
      $or: [{ email }, { username: { $regex: new RegExp(`^${username}$`, 'i') } }],
    });
    if (existingUser) {
      const message =
        existingUser.email === email
          ? "Email này đã được sử dụng!"
          : "Tên đăng nhập này đã được sử dụng!";
      return res.status(400).json({ message });
    }

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);

    // Tạo user mới
    const user = await User.create({
      username,
      fullname,
      email,
      password: hashedPassword,
    });

    res.status(201).json({ message: "Đăng ký thành công!", user });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi đăng ký", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const identifier = (req.body.account || req.body.email || req.body.username || "").trim();
    const password = req.body.password;

    if (!identifier || !password) {
      return res.status(400).json({
        message: "Vui lòng nhập tài khoản và mật khẩu.",
      });
    }

    const safeIdentifier = identifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: { $regex: new RegExp(`^${safeIdentifier}$`, "i") } },
      ],
    });

    if (!user) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác." });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Tên đăng nhập hoặc mật khẩu không chính xác." });
    }

    // ✅ Kiểm tra tài khoản bị khóa TRƯỚC khi cấp token
    if (user.isBanned) {
      return res.status(403).json({
        message: "Tài khoản của bạn đã bị khóa do vi phạm tiêu chuẩn cộng đồng.",
        code: "ACCOUNT_BANNED",
      });
    }

    // Tạo token
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // QUAN TRỌNG NHẤT: Trả về token và thông tin user cho Frontend
    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        hasCompletedOnboarding: user.hasCompletedOnboarding
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi đăng nhập", error: error.message });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const identifier = (req.body.email || req.body.account || req.body.username || "").trim();

    if (!identifier) {
      return res.status(400).json({ message: "Vui long nhap email hoac ten dang nhap." });
    }

    const user = await findUserByResetIdentifier(identifier);
    const genericMessage = "Neu email ton tai, ma xac nhan da duoc gui den hop thu cua ban.";

    if (!user) {
      return res.json({ message: genericMessage });
    }

    if (
      user.passwordResetLastSentAt &&
      Date.now() - user.passwordResetLastSentAt.getTime() < 60 * 1000
    ) {
      return res.status(429).json({ message: "Vui long doi 60 giay truoc khi gui lai ma." });
    }

    const code = createResetCode();
    user.passwordResetCodeHash = hashResetCode(code);
    user.passwordResetExpires = new Date(Date.now() + 10 * 60 * 1000);
    user.passwordResetAttempts = 0;
    user.passwordResetLastSentAt = new Date();
    await user.save();

    try {
      await sendPasswordResetEmail({
        to: user.email,
        code,
        username: user.fullname || user.username,
      });
    } catch (mailError) {
      user.passwordResetCodeHash = "";
      user.passwordResetExpires = null;
      user.passwordResetAttempts = 0;
      user.passwordResetLastSentAt = null;
      await user.save();
      throw mailError;
    }

    return res.json({ message: genericMessage });
  } catch (error) {
    console.error("requestPasswordReset error:", error);
    return res.status(500).json({
      message: error.message === "Missing email SMTP configuration."
        ? "Chua cau hinh email gui ma xac nhan."
        : `Khong the gui ma xac nhan: ${error.response || error.message}`,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const identifier = (req.body.email || req.body.account || req.body.username || "").trim();
    const code = req.body.code?.trim();
    const password = req.body.password;

    if (!identifier || !code || !password) {
      return res.status(400).json({ message: "Vui long nhap day du email/ten dang nhap, ma xac nhan va mat khau moi." });
    }

    if (!/^\d{6}$/.test(code)) {
      return res.status(400).json({ message: "Ma xac nhan phai gom 6 chu so." });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mat khau moi phai co it nhat 6 ky tu." });
    }

    const user = await findUserByResetIdentifier(identifier);
    if (!user || !user.passwordResetCodeHash || !user.passwordResetExpires) {
      return res.status(400).json({ message: "Ma xac nhan khong hop le hoac da het han." });
    }

    if (user.passwordResetExpires.getTime() < Date.now()) {
      user.passwordResetCodeHash = "";
      user.passwordResetExpires = null;
      user.passwordResetAttempts = 0;
      await user.save();
      return res.status(400).json({ message: "Ma xac nhan da het han. Vui long gui lai ma moi." });
    }

    if (user.passwordResetAttempts >= 5) {
      return res.status(429).json({ message: "Ban da nhap sai qua nhieu lan. Vui long gui lai ma moi." });
    }

    if (hashResetCode(code) !== user.passwordResetCodeHash) {
      user.passwordResetAttempts += 1;
      await user.save();
      return res.status(400).json({ message: "Ma xac nhan khong dung." });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordResetCodeHash = "";
    user.passwordResetExpires = null;
    user.passwordResetAttempts = 0;
    user.passwordResetLastSentAt = null;
    await user.save();

    return res.json({ message: "Dat lai mat khau thanh cong. Vui long dang nhap lai." });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ message: "Khong the dat lai mat khau. Vui long thu lai sau." });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "Không tìm thấy authorization code từ Google." });
    }

    // Validate environment variables
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      console.error("❌ Missing Google OAuth credentials in .env file");
      return res.status(500).json({ message: "Cấu hình Google OAuth không đầy đủ. Vui lòng liên hệ quản trị viên." });
    }

    const client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "postmessage"
    );

    let tokens;
    try {
      const tokenResponse = await client.getToken(code);
      tokens = tokenResponse.tokens;
    } catch (tokenError) {
      console.error("❌ Google getToken error:", tokenError.message);
      
      // Xử lý các loại lỗi cụ thể từ Google
      if (tokenError.message.includes("invalid_grant")) {
        return res.status(400).json({ 
          message: "Mã xác thực Google đã hết hạn hoặc không hợp lệ. Vui lòng thử đăng nhập lại.",
          code: "INVALID_GRANT"
        });
      }
      
      throw tokenError;
    }

    if (!tokens.id_token) {
      console.error("❌ No id_token received from Google");
      return res.status(400).json({ message: "Không nhận được thông tin xác thực từ Google." });
    }
    
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture } = payload;

    if (!email) {
      return res.status(400).json({ message: "Không thể lấy email từ Google." });
    }

    let user = await User.findOne({ email });

    if (!user) {
      let baseUsername = email.split('@')[0].toLowerCase().replace(/[^a-z0-9_.]/g, '');
      if (baseUsername.length < 3) baseUsername += "user";
      let username = baseUsername;
      
      let usernameExists = await User.findOne({ username });
      while (usernameExists) {
        const randomStr = Math.floor(1000 + Math.random() * 9000).toString();
        username = `${baseUsername}${randomStr}`;
        usernameExists = await User.findOne({ username });
      }

      const randomPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        username,
        email,
        fullname: name || username,
        avatar: picture || "",
        password: hashedPassword,
      });

      console.log(`✅ Created new user from Google: ${email}`);
    }

    if (user.isBanned) {
      return res.status(403).json({
        message: "Tài khoản của bạn đã bị khóa do vi phạm tiêu chuẩn cộng đồng.",
        code: "ACCOUNT_BANNED",
      });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log(`✅ Google login successful for: ${email}`);

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        fullname: user.fullname,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        hasCompletedOnboarding: user.hasCompletedOnboarding
      }
    });

  } catch (error) {
    console.error("===== GOOGLE LOGIN ERROR =====");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Stack trace:", error.stack);
    
    res.status(500).json({ 
      message: "Lỗi hệ thống khi đăng nhập bằng Google. Vui lòng thử lại sau.",
      error: error.message 
    });
  }
};
