// src/pages/RegisterPage.jsx

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import { FcGoogle } from 'react-icons/fc'; 
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { useGoogleLogin } from '@react-oauth/google';

const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3000);
  };

  const validateField = (name, value, currentFormData) => {
    let error = "";
    if (name === "username") {
      if (!/^[a-z0-9_.]{3,30}$/.test(value)) {
        error = "Chữ thường, số, dấu chấm, gạch dưới (3-30 ký tự)";
      }
    } else if (name === "email") {
      if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(value)) {
        error = "Email không hợp lệ";
      }
    } else if (name === "password") {
      if (value.length < 6) {
        error = "Mật khẩu tối thiểu 6 ký tự";
      }
    } else if (name === "confirmPassword") {
      if (value !== currentFormData.password) {
        error = "Mật khẩu không khớp";
      }
    }
    return error;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    let processedValue = value;
    if (name === "username") {
      processedValue = value.toLowerCase().replace(/\s/g, "");
    }
    
    const newFormData = { ...formData, [name]: processedValue };
    setFormData(newFormData);
    
    setErrors(prev => ({
      ...prev,
      [name]: validateField(name, processedValue, newFormData)
    }));
    
    if (name === "password" && newFormData.confirmPassword) {
       setErrors(prev => ({
         ...prev,
         confirmPassword: validateField("confirmPassword", newFormData.confirmPassword, newFormData)
       }));
    }
  };

  const isFormValid = () => {
    return Object.values(errors).every(err => err === "") && 
           Object.values(formData).every(val => val.trim() !== "");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid()) return;
    
    setLoading(true);

    try {
      await api.post("auth/register", formData);
      showToast("Đăng ký thành công 🚀. Đang chuyển hướng...", "success");
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      if (!err.response) {
        showToast("Không kết nối được server.", "error");
      } else {
        showToast(
          err.response?.data?.message || "Đăng ký thất bại. Vui lòng thử lại.",
          "error"
        );
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
      if (response.data.user && response.data.user.hasCompletedOnboarding === false) {
        setTimeout(() => window.location.href = "/onboarding", 1000);
      } else {
        setTimeout(() => window.location.href = "/home", 1000);
      }
    } catch (err) {
      showToast(err.response?.data?.message || "Đăng nhập Google thất bại.", "error");
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = useGoogleLogin({
    onSuccess: handleGoogleSuccess,
    flow: 'auth-code',
  });

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12 relative">
      
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full shadow-lg text-sm font-bold animate-fade-in z-50 ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
          {toast.message}
        </div>
      )}

      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-8">
        
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Tạo tài khoản
          </h1>
          <p className="text-gray-500 mt-2.5 text-sm">
            Tham gia cộng đồng chia sẻ nội dung ngay hôm nay
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Tên đăng nhập
            </label>
            <input
              type="text"
              name="username"
              placeholder="VD: nguyenvana"
              value={formData.username}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2.5 rounded-lg border ${errors.username ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'} text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition sm:text-sm`}
            />
            {errors.username && <p className="text-red-500 text-xs mt-1 font-medium">{errors.username}</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
              className={`w-full px-4 py-2.5 rounded-lg border ${errors.email ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'} text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition sm:text-sm`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1 font-medium">{errors.email}</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Tối thiểu 6 ký tự"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.password ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'} text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition sm:text-sm pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1 font-medium">{errors.password}</p>}
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">
              Nhập lại mật khẩu
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Xác nhận mật khẩu"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2.5 rounded-lg border ${errors.confirmPassword ? 'border-red-500 bg-red-50' : 'border-gray-300 bg-gray-50'} text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition sm:text-sm pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 focus:outline-none cursor-pointer"
              >
                {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className="w-full bg-blue-600 hover:bg-blue-700 transition duration-150 text-white font-semibold py-2.5 rounded-lg shadow-sm disabled:bg-blue-400 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                </>
            ) : "Đăng ký"}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Hoặc đăng ký bằng</span>
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
          Đã có tài khoản?{" "}
          <Link
            to="/login"
            className="text-blue-600 font-medium hover:text-blue-700 hover:underline"
          >
            Đăng nhập
          </Link>
        </p>

      </div>
    </div>
  );
};

export default RegisterPage;