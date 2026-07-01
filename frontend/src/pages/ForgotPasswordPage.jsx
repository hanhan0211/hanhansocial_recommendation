import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState("email");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
  });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "code" ? value.replace(/\D/g, "").slice(0, 6) : value,
    }));
  };

  const handleSendCode = async (e) => {
    e.preventDefault();
    const email = formData.email.trim().toLowerCase();

    if (!email) {
      showToast("Vui long nhap email.", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("auth/forgot-password", { email });
      setFormData((prev) => ({ ...prev, email }));
      setStep("reset");
      showToast("Ma xac nhan da duoc gui den email cua ban.", "success");
    } catch (error) {
      showToast(error.response?.data?.message || "Khong the gui ma xac nhan.", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!/^\d{6}$/.test(formData.code)) {
      showToast("Ma xac nhan phai gom 6 chu so.", "error");
      return;
    }

    if (formData.password.length < 6) {
      showToast("Mat khau moi phai co it nhat 6 ky tu.", "error");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("Mat khau xac nhan khong khop.", "error");
      return;
    }

    setLoading(true);
    try {
      await api.post("auth/reset-password", {
        email: formData.email.trim().toLowerCase(),
        code: formData.code,
        password: formData.password,
      });
      showToast("Dat lai mat khau thanh cong.", "success");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      showToast(error.response?.data?.message || "Khong the dat lai mat khau.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      {toast.show && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-sm font-bold animate-fade-in z-50 ${toast.type === "success" ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.message}
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">Quen mat khau</h1>
          <p className="text-gray-500 mt-2.5 text-sm">
            {step === "email" ? "Nhap email de nhan ma xac nhan" : "Nhap ma xac nhan va mat khau moi"}
          </p>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendCode} className="space-y-5">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 transition duration-150 text-white font-semibold py-2.5 rounded-lg shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? "Dang gui ma..." : "Gui ma xac nhan"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Ma xac nhan</label>
              <input
                type="text"
                name="code"
                inputMode="numeric"
                placeholder="6 chu so"
                value={formData.code}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition sm:text-sm tracking-[0.35em] text-center font-bold"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Mat khau moi</label>
              <input
                type="password"
                name="password"
                placeholder="Toi thieu 6 ky tu"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition sm:text-sm"
              />
            </div>

            <div>
              <label className="block mb-1.5 text-sm font-medium text-gray-700">Nhap lai mat khau</label>
              <input
                type="password"
                name="confirmPassword"
                placeholder="Xac nhan mat khau"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 transition duration-150 text-white font-semibold py-2.5 rounded-lg shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {loading ? "Dang dat lai..." : "Dat lai mat khau"}
            </button>

            <button
              type="button"
              onClick={handleSendCode}
              disabled={loading}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium disabled:text-blue-300"
            >
              Gui lai ma
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600">
          <Link to="/login" className="text-blue-600 font-medium hover:text-blue-700 hover:underline">
            Quay lai dang nhap
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
