import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearNotice = () => {
    setMessage("");
    setError("");
  };

  const handleSendOTP = async (event) => {
    event.preventDefault();
    clearNotice();

    if (!email.trim()) {
      setError("Vui lòng nhập email.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        "auth/forgot-password",
        { email: email.trim() },
        { timeout: 20000 }
      );

      setMessage(response.data.message || "Mã OTP đã được gửi đến email của bạn.");
      setStep(2);
    } catch (err) {
      const timeoutMessage =
        "Gửi mã quá lâu. Vui lòng kiểm tra backend, mạng hoặc cấu hình Gmail App Password.";
      setError(
        err.code === "ECONNABORTED"
          ? timeoutMessage
          : err.response?.data?.message || "Không thể gửi mã OTP. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    clearNotice();

    if (!/^\d{6}$/.test(otp)) {
      setError("Mã OTP phải gồm đúng 6 số.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(
        "auth/reset-password",
        {
          email: email.trim(),
          otp,
          newPassword,
        },
        { timeout: 15000 }
      );

      setMessage(response.data.message || "Đổi mật khẩu thành công.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(
        err.code === "ECONNABORTED"
          ? "Kết nối quá lâu. Vui lòng thử lại."
          : err.response?.data?.message || "Không thể đổi mật khẩu. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl border border-slate-100">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Quên mật khẩu</h1>
          <p className="mt-2 text-sm text-slate-500">
            {step === 1
              ? "Nhập email để nhận mã OTP xác nhận."
              : `Mã OTP đã được gửi đến ${email}.`}
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendOTP} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Đang gửi email..." : "Gửi mã xác nhận"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Mã OTP
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-lg font-bold tracking-[0.35em] text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Mật khẩu mới
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white shadow-md shadow-blue-100 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {loading ? "Đang đổi mật khẩu..." : "Xác nhận đổi mật khẩu"}
            </button>

            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={loading}
              className="w-full text-sm font-semibold text-blue-600 transition hover:text-blue-700 disabled:text-blue-300"
            >
              Nhập lại email
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-slate-500">
          Đã nhớ mật khẩu?{" "}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;
