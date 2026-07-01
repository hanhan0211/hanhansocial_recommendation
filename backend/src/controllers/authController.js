import User from "../models/User.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import sendEmail from "../utils/sendEmail.js";

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
    const email = req.body.email?.trim().toLowerCase();

    if (!email) {
      return res.status(400).json({ message: "Vui long nhap email." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Email nay chua duoc dang ky." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    try {
      await sendEmail({
        email: user.email,
        subject: "Ma OTP dat lai mat khau HanHan Social",
        message: `Ma OTP dat lai mat khau cua ban la ${otp}. Ma co hieu luc trong 10 phut.`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #111827;">
            <h2 style="margin: 0 0 12px;">Dat lai mat khau HanHan Social</h2>
            <p>Xin chao ${user.fullname || user.username || "ban"},</p>
            <p>Ma OTP dat lai mat khau cua ban la:</p>
            <div style="display: inline-block; padding: 14px 20px; border-radius: 10px; background: #f3f4f6; font-size: 28px; font-weight: 700; letter-spacing: 6px;">
              ${otp}
            </div>
            <p>Ma nay co hieu luc trong 10 phut. Neu ban khong yeu cau, hay bo qua email nay.</p>
          </div>
        `,
      });
    } catch (mailError) {
      user.resetPasswordOTP = "";
      user.resetPasswordOTPExpire = null;
      await user.save();
      throw mailError;
    }

    return res.json({ message: "Ma OTP da duoc gui den email cua ban." });
  } catch (error) {
    console.error("requestPasswordReset error:", error);
    return res.status(500).json({
      message:
        error.message === "Missing Gmail email configuration."
          ? "Chua cau hinh EMAIL_USER/EMAIL_PASS trong file .env."
          : "Khong the gui ma OTP. Vui long thu lai sau.",
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp?.trim();
    const newPassword = req.body.newPassword;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: "Vui long nhap day du email, OTP va mat khau moi." });
    }

    if (!/^\d{6}$/.test(otp)) {
      return res.status(400).json({ message: "Ma OTP phai gom 6 chu so." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mat khau moi phai co it nhat 6 ky tu." });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "Khong tim thay tai khoan voi email nay." });
    }

    if (!user.resetPasswordOTP || !user.resetPasswordOTPExpire) {
      return res.status(400).json({ message: "Ma OTP khong hop le hoac da het han." });
    }

    if (user.resetPasswordOTP !== otp) {
      return res.status(400).json({ message: "Ma OTP khong dung." });
    }

    if (user.resetPasswordOTPExpire.getTime() < Date.now()) {
      user.resetPasswordOTP = "";
      user.resetPasswordOTPExpire = null;
      await user.save();
      return res.status(400).json({ message: "Ma OTP da het han. Vui long gui lai ma moi." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOTP = "";
    user.resetPasswordOTPExpire = null;
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
