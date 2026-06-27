import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

// Gắn token vào mọi request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý response errors tập trung
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status  = error.response?.status;
    const message = error.response?.data?.message || "";
    const code    = error.response?.data?.code    || "";

    // 🔴 403 + ACCOUNT_BANNED → kick user ra ngay lập tức
    if (status === 403 && (code === "ACCOUNT_BANNED" || message.includes("bị khóa"))) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Dùng alert để thông báo (sẽ chặn luồng)
      alert("🔒 " + (message || "Tài khoản của bạn đã bị khóa!"));

      // Redirect về trang login
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // 401 → token hết hạn / không hợp lệ → về login
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
