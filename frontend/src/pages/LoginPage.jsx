// src/pages/LoginPage.jsx

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FcGoogle } from 'react-icons/fc';
import { useGoogleLogin } from '@react-oauth/google';

const LoginPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    account: "",
    password: "",
  });
  const [errors, setErrors] = useState({});

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrors({
      ...errors,
      [e.target.name]: e.target.value.trim() ? "" : "Trường này không được để trống",
    });
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.account.trim()) newErrors.account = "Vui lòng nhập tài khoản (Tên đăng nhập hoặc Email).";
    if (!formData.password.trim()) newErrors.password = "Vui lòng nhập mật khẩu.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);

    try {
      const response = await api.post("auth/login", formData);

      localStorage.setItem("token", response.data.token);

      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }

      showToast("Đăng nhập thành công!", "success");
      if (response.data.user && response.data.user.role === 'admin') {
        setTimeout(() => window.location.href = "/admin", 1000);
      } else if (response.data.user && response.data.user.hasCompletedOnboarding === false) {
        setTimeout(() => window.location.href = "/onboarding", 1000);
      } else {
        setTimeout(() => window.location.href = "/home", 1000);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      if (!err.response) {
        showToast("Không kết nối được server. Hãy chạy backend: cd backend && npm run dev", "error");
      } else {
        showToast(msg || "Đăng nhập thất bại. Vui lòng kiểm tra lại.", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (codeResponse) => {
    try {
      setLoading(true);
      const response = await api.post("auth/google", {
        code: codeResponse.code,
      });

      localStorage.setItem("token", response.data.token);
      if (response.data.user) {
        localStorage.setItem("user", JSON.stringify(response.data.user));
      }
      showToast("Đăng nhập bằng Google thành công!", "success");
      if (response.data.user && response.data.user.role === 'admin') {
        setTimeout(() => window.location.href = "/admin", 1000);
      } else if (response.data.user && response.data.user.hasCompletedOnboarding === false) {
        setTimeout(() => window.location.href = "/onboarding", 1000);
      } else {
        setTimeout(() => window.location.href = "/home", 1000);
      }
    } catch (err) {
      const msg = err.response?.data?.message;
      showToast(msg || "Đăng nhập Google thất bại.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    flow: 'auth-code',
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      {toast.show && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-sm font-bold animate-fade-in z-50 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Chào mừng trở lại
          </h1>
          <p className="text-gray-500 mt-2.5 text-sm">
            Đăng nhập để tiếp tục khám phá
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Tên đăng nhập hoặc Email
            </label>
            <input
              type="text"
              name="account"
              placeholder="Nhập tên đăng nhập hoặc email"
              value={formData.account}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 rounded-lg border ${errors.account ? 'border-red-500 focus:ring-red-100 focus:border-red-500' : 'border-gray-300 focus:ring-blue-100 focus:border-blue-400'} bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 transition sm:text-sm`}
            />
            {errors.account && <p className="text-red-500 text-xs mt-1 font-medium">{errors.account}</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-2.5 rounded-lg border ${errors.password ? 'border-red-500 focus:ring-red-100 focus:border-red-500' : 'border-gray-300 focus:ring-blue-100 focus:border-blue-400'} bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 transition sm:text-sm`}
            />
            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password}</p>}
          </div>

          <div className="flex items-center justify-end">
            <div className="text-sm">
              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                className="font-medium text-blue-600 hover:text-blue-500 cursor-pointer"
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 transition duration-150 text-white font-semibold py-2.5 rounded-lg shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang đăng nhập...
              </>
            ) : "Đăng nhập"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Hoặc tiếp tục với</span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={() => loginWithGoogle()}
              className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition duration-150 cursor-pointer"
            >
              <FcGoogle className="h-5 w-5 mr-2" />
              Google
            </button>
          </div>
        </div>

        <p className="text-center text-sm text-gray-600 mt-8">
          Chưa có tài khoản?{" "}
          <Link
            to="/register"
            className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
          >
            Đăng ký
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
