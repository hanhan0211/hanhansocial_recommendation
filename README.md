# 🌐 ĐỀ TÀI: THIẾT KẾ VÀ PHÁT TRIỂN MẠNG XÃ HỘI CHIA SẺ NỘI DUNG TÍCH HỢP GỢI Ý THEO SỞ THÍCH NGƯỜI DÙNG

<div align="center">

**📚 Đồ án tốt nghiệp ngành Công nghệ Thông tin**
| Nội dung | Thông tin |
|-----------|-----------|
| **Giảng viên hướng dẫn** | ThS. Lê Minh Tự |
| **Sinh viên thực hiện** | Nguyễn Thị Ngọc Hân |
| **MSSV** | 110122069 |
| **Email** | hanhanjk04@gmail.com |

> 
</div>

---



## 🎯 Mục Tiêu Đồ Án
- Xây dựng một nền tảng **mạng xã hội chia sẻ nội dung** hoàn chỉnh với đầy đủ các chức năng cốt lõi: đăng bài viết, tương tác (thích, bình luận, chia sẻ), nhắn tin, theo dõi người dùng và thông báo thời gian thực.
- Tích hợp **hệ thống gợi ý cá nhân hóa (Recommendation System)** dựa trên hành vi tương tác của người dùng, giúp đề xuất nội dung phù hợp với sở thích cá nhân.
- Giải quyết **bài toán Cold Start** cho người dùng mới thông qua cơ chế Onboarding chọn chủ đề quan tâm.
- Tích hợp **trợ lý viết bài bằng AI** sử dụng Google Gemini, hỗ trợ người dùng tạo caption, viết lại nội dung và gợi ý hashtag thông minh.
- Xây dựng **trang quản trị (Admin Dashboard)** để quản lý người dùng, bài viết và xử lý báo cáo vi phạm.

---

## ✨ Tính Năng Chính

### 👤 Quản Lý Người Dùng
- Đăng ký, đăng nhập bằng email hoặc **Google OAuth 2.0**
- Quản lý hồ sơ cá nhân (avatar, bio, tên hiển thị)
- Tài khoản riêng tư với cơ chế yêu cầu theo dõi
- Tìm kiếm người dùng toàn cục

### 📝 Bài Viết & Tương Tác
- Đăng bài viết kèm nhiều ảnh hoặc video (lưu trữ trên Cloudinary)
- Thích / bỏ thích bài viết
- Bình luận và trả lời bình luận (comment lồng nhau)
- Lưu / bỏ lưu bài viết (Bookmark)
- Chia sẻ bài viết qua tin nhắn
- Báo cáo bài viết vi phạm
- Hệ thống Hashtag với trang trending

### 💬 Nhắn Tin Thời Gian Thực
- Chat 1-1 qua **Socket.IO**
- Chia sẻ bài viết trong cuộc trò chuyện
- Đếm số tin nhắn chưa đọc theo thời gian thực

### 🔔 Thông Báo
- Thông báo khi có người thích, bình luận, theo dõi, chia sẻ bài viết
- Đánh dấu đã đọc / chưa đọc
- Cập nhật thời gian thực qua Socket.IO

### 🔍 Tìm Kiếm Toàn Diện
- Tìm kiếm đa đối tượng: người dùng, bài viết, hashtag
- Lưu lịch sử tìm kiếm cá nhân
- Trang Hashtag với bài viết liên quan

### 🧠 Hệ Thống Gợi Ý Cá Nhân Hóa
- **Trang chủ (Home Feed):** Thuật toán Hybrid 60/40 — 60% bài viết từ người đang theo dõi, 40% từ tác giả được gợi ý
- **Trang khám phá (Explore):** Thuật toán 2 tầng — 50% gợi ý cá nhân hóa từ người lạ, 50% bài viết thịnh hành
- **Onboarding:** Giải quyết bài toán Cold Start bằng cách cho người dùng mới chọn 3 chủ đề quan tâm

### 🤖 Trợ Lý Viết Bài AI
- Tạo caption từ ý tưởng ngắn gọn
- Viết lại nội dung theo 5 giọng văn khác nhau
- Gợi ý hashtag thông minh dựa trên nội dung bài viết

### 🛡️ Trang Quản Trị (Admin)
- Dashboard thống kê tổng quan (biểu đồ Recharts)
- Quản lý người dùng (khóa / mở khóa tài khoản, phân quyền)
- Quản lý bài viết (ẩn / hiện, xóa bài viết)
- Xử lý báo cáo vi phạm từ người dùng

---

## 🏗️ Kiến Trúc Hệ Thống

Hệ thống được xây dựng theo mô hình **Client-Server**, tách biệt Frontend và Backend:

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Frontend)                        │
│          React 19 + Vite + TailwindCSS + Socket.IO-Client       │
│                        Port: 5173                               │
└──────────────────────────┬──────────────────────────────────────┘
                           │  HTTP REST API + WebSocket
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        SERVER (Backend)                         │
│              Express 5 + Node.js + Socket.IO                    │
│                        Port: 5000                               │
├─────────────┬───────────────┬───────────────┬───────────────────┤
│  Controllers│    Services   │   Middleware   │      Socket       │
│  (API Logic)│ (Recommend,AI)│  (Auth,Upload) │  (Real-time)      │
└──────┬──────┴───────┬───────┴───────┬───────┴───────────────────┘
       │              │               │
       ▼              ▼               ▼
┌─────────────┐ ┌───────────┐ ┌──────────────┐
│  MongoDB    │ │ Cloudinary│ │ Google Gemini│
│  Atlas      │ │ (Media)   │ │ (AI)         │
└─────────────┘ └───────────┘ └──────────────┘
```

### Luồng Dữ Liệu

1. **Frontend** gửi HTTP request hoặc kết nối WebSocket đến Backend.
2. **Middleware** xác thực JWT token và xử lý upload file.
3. **Controller** tiếp nhận request, gọi logic nghiệp vụ.
4. **Service** xử lý các tác vụ phức tạp (gợi ý, AI).
5. **Model** tương tác với MongoDB thông qua Mongoose.
6. Ảnh và video được lưu trữ trên **Cloudinary**.
7. Kết nối thời gian thực qua **Socket.IO** cho chat và thông báo.

---

## 🛠️ Công Nghệ Sử Dụng

### Frontend

| Công nghệ | Phiên bản | Mô tả |
|---|---|---|
| React | 19.x | Thư viện xây dựng giao diện người dùng |
| Vite | 8.x | Công cụ build nhanh cho dự án frontend |
| TailwindCSS | 4.x | Framework CSS tiện ích |
| React Router DOM | 7.x | Điều hướng SPA |
| Axios | 1.x | HTTP Client gọi API |
| Socket.IO Client | 4.x | Kết nối WebSocket thời gian thực |
| React Icons | 5.x | Bộ icon cho giao diện |
| Recharts | 3.x | Thư viện biểu đồ cho Admin Dashboard |
| React OAuth Google | 0.13.x | Đăng nhập bằng Google |

### Backend

| Công nghệ | Phiên bản | Mô tả |
|---|---|---|
| Node.js | 18+ | Môi trường chạy JavaScript phía server |
| Express | 5.x | Framework web cho Node.js |
| Mongoose | 9.x | ODM thao tác MongoDB |
| Socket.IO | 4.x | Thư viện WebSocket thời gian thực |
| JSON Web Token | 9.x | Xác thực người dùng |
| bcryptjs | 3.x | Mã hóa mật khẩu |
| Cloudinary | 1.x | Dịch vụ lưu trữ media đám mây |
| Multer | 2.x | Middleware xử lý upload file |
| Google GenAI | 2.x | SDK tích hợp Google Gemini AI |
| Google Auth Library | 10.x | Xác thực Google OAuth 2.0 |

### Cơ Sở Dữ Liệu & Dịch Vụ Bên Ngoài

| Dịch vụ | Mô tả |
|---|---|
| MongoDB Atlas | Cơ sở dữ liệu NoSQL trên đám mây |
| Cloudinary | Lưu trữ và quản lý ảnh, video |
| Google Gemini 2.5 Flash | Mô hình AI sinh nội dung |
| Google OAuth 2.0 | Đăng nhập qua tài khoản Google |

---

## 📂 Cấu Trúc Thư Mục

```
kltn_socialandrecommend/
├── backend/                          # Server-side
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                 # Kết nối MongoDB
│   │   ├── controllers/              # Xử lý logic API
│   │   │   ├── aiController.js       # API trợ lý AI
│   │   │   ├── authController.js     # Đăng ký, đăng nhập, Google OAuth
│   │   │   ├── commentController.js  # Bình luận
│   │   │   ├── followController.js   # Theo dõi / bỏ theo dõi
│   │   │   ├── hashtagController.js  # Quản lý hashtag
│   │   │   ├── likeController.js     # Thích / bỏ thích
│   │   │   ├── messageController.js  # Nhắn tin
│   │   │   ├── notificationController.js # Thông báo
│   │   │   ├── postController.js     # Bài viết + Feed + Explore
│   │   │   ├── recommendController.js# API gợi ý
│   │   │   ├── searchController.js   # Tìm kiếm toàn diện
│   │   │   └── userController.js     # Quản lý người dùng
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js      # Xác thực JWT
│   │   │   └── uploadMiddleware.js    # Xử lý upload Cloudinary
│   │   ├── models/                    # Schema MongoDB (Mongoose)
│   │   │   ├── Comment.js
│   │   │   ├── Follow.js
│   │   │   ├── Hashtag.js
│   │   │   ├── Like.js
│   │   │   ├── Message.js
│   │   │   ├── Notification.js
│   │   │   ├── Post.js
│   │   │   ├── Report.js
│   │   │   ├── User.js
│   │   │   └── UserPreference.js      # Dữ liệu gợi ý cá nhân hóa
│   │   ├── routes/                    # Định tuyến API
│   │   ├── services/
│   │   │   ├── aiService.js           # Tích hợp Google Gemini
│   │   │   └── recommendService.js    # Thuật toán gợi ý
│   │   ├── socket/
│   │   │   └── socket.js             # Cấu hình Socket.IO
│   │   ├── utils/
│   │   │   ├── cloudinaryUtils.js     # Tiện ích Cloudinary
│   │   │   └── hashtagUtils.js        # Tiện ích xử lý hashtag
│   │   └── server.js                  # Entry point
│   ├── .env                           # Biến môi trường
│   └── package.json
│
└── frontend/                          # Client-side
    ├── src/
    │   ├── api/
    │   │   └── axios.js               # Cấu hình Axios + Interceptor
    │   ├── components/                # Component tái sử dụng
    │   │   ├── BookmarkButton.jsx
    │   │   ├── CommentItem.jsx
    │   │   ├── CreatePostModal.jsx     # Modal tạo bài + AI Assistant
    │   │   ├── ImageCarousel.jsx
    │   │   ├── NotificationBadge.jsx
    │   │   ├── PostCard.jsx
    │   │   ├── SearchBar.jsx
    │   │   ├── ShareModal.jsx
    │   │   ├── SuggestedUsers.jsx
    │   │   └── TrendingSidebar.jsx
    │   ├── context/
    │   │   └── SocketContext.jsx       # Provider Socket.IO
    │   ├── layouts/
    │   │   └── AdminLayout.jsx        # Layout trang quản trị
    │   ├── pages/                     # Các trang chính
    │   │   ├── admin/                 # Trang quản trị
    │   │   │   ├── AdminDashboard.jsx
    │   │   │   ├── PostManagement.jsx
    │   │   │   ├── ReportManagement.jsx
    │   │   │   └── UserManagement.jsx
    │   │   ├── ChatPage.jsx
    │   │   ├── ExplorePage.jsx
    │   │   ├── HashtagPage.jsx
    │   │   ├── HomePage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── NotificationPage.jsx
    │   │   ├── OnboardingPage.jsx      # Chọn chủ đề (Cold Start)
    │   │   ├── PostDetailPage.jsx
    │   │   ├── ProfilePage.jsx
    │   │   └── RegisterPage.jsx
    │   ├── routes/
    │   │   └── AppRoutes.jsx          # Định tuyến SPA
    │   ├── App.jsx
    │   └── main.jsx                   # Entry point
    ├── .env.example
    ├── vite.config.js
    └── package.json
```

---

## ⚙️ Yêu Cầu Phần Mềm

Trước khi chạy chương trình, cần cài đặt các phần mềm sau:

| Phần mềm | Phiên bản tối thiểu | Link tải |
|---|---|---|
| **Node.js** | v18.0.0 trở lên | [https://nodejs.org](https://nodejs.org) |
| **npm** | v9.0.0 trở lên | Đi kèm khi cài Node.js |
| **Git** | Bất kỳ | [https://git-scm.com](https://git-scm.com) |
| **Trình duyệt web** | Chrome / Edge / Firefox phiên bản mới | — |

### Tài Khoản Dịch Vụ Bên Ngoài (Đã Cấu Hình Sẵn)

| Dịch vụ | Mục đích | Đăng ký |
|---|---|---|
| MongoDB Atlas | Cơ sở dữ liệu | [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas) |
| Cloudinary | Lưu trữ ảnh/video | [https://cloudinary.com](https://cloudinary.com) |
| Google Cloud Console | OAuth 2.0 + Gemini API Key | [https://console.cloud.google.com](https://console.cloud.google.com) |
| Google AI Studio | Lấy Gemini API Key miễn phí | [https://aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

> **Lưu ý:** Các API Key và thông tin kết nối đã được cấu hình sẵn trong file `.env` của Backend. Nếu muốn sử dụng tài khoản riêng, vui lòng tham khảo phần [Cấu Hình Biến Môi Trường](#-cấu-hình-biến-môi-trường).

---

## 🚀 Hướng Dẫn Cài Đặt Và Chạy Chương Trình

### Bước 1: Clone Dự Án

```bash
git clone https://github.com/hanhan0211/tn_da22ttd_110122069_nguyenthingochan_mxhchiasenoidung_recommendation.git
cd tn_da22ttd_110122069_nguyenthingochan_mxhchiasenoidung_recommendation
```

### Bước 2: Cài Đặt Dependencies Cho Backend

```bash
cd backend
npm install
```

### Bước 3: Cài Đặt Dependencies Cho Frontend

Mở một terminal mới:

```bash
cd frontend
npm install
```

### Bước 4: Chạy Backend Server

```bash
cd backend
npm run dev
```

> ✅ Backend sẽ chạy tại: **http://localhost:5000**

### Bước 5: Chạy Frontend

Mở terminal khác:

```bash
cd frontend
npm run dev
```

> ✅ Frontend sẽ chạy tại: **http://localhost:5173**

### Bước 6: Truy Cập Ứng Dụng

Mở trình duyệt và truy cập:

```
http://localhost:5173
```

> **Lưu ý:** Cần chạy **đồng thời cả Backend và Frontend** trên 2 terminal riêng biệt.

---

## 🔑 Cấu Hình Biến Môi Trường

### Backend (`backend/.env`)

```env
# Kết nối MongoDB Atlas
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>

# Cloudinary — Lưu trữ ảnh và video
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT — Mã hóa token xác thực
JWT_SECRET=your_jwt_secret_key

# Port server
PORT=5000

# Google OAuth 2.0 — Đăng nhập bằng Google
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google Gemini AI — Trợ lý viết bài
GEMINI_API_KEY=your_gemini_api_key
```

### Frontend (`frontend/.env`)

```env
# Socket.IO server URL
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🧠 Thuật Toán Gợi Ý

### Cơ Chế Chấm Điểm Tương Tác

Hệ thống ghi nhận mọi hành vi tương tác của người dùng và quy đổi thành điểm số:

| Hành động | Điểm | Mô tả |
|---|---|---|
| 👍 Like | +1 | Thích bài viết |
| 👎 Unlike | -1 | Bỏ thích bài viết |
| 💬 Comment | +3 | Bình luận bài viết |
| 🔖 Save | +4 | Lưu bài viết |
| ❌ Unsave | -4 | Bỏ lưu bài viết |

Điểm được tích lũy theo **tác giả** và **hashtag** để xây dựng hồ sơ sở thích người dùng.

### Thuật Toán Feed Trang Chủ (Hybrid 60/40)

```
Tầng 1 (60%): Bài viết mới nhất từ những người đang theo dõi
Tầng 2 (40%): Bài viết từ tác giả có điểm tương tác cao nhất
Fallback:      Bài viết theo hashtag yêu thích → Ngẫu nhiên
Bước cuối:     Xáo trộn ngẫu nhiên (Fisher-Yates Shuffle)
```

### Thuật Toán Trang Khám Phá (Explore)

```
Tầng 1 (50%): Bài viết từ người lạ có điểm gợi ý cao (cá nhân hóa)
Tầng 2 (50%): Bài viết thịnh hành (nhiều lượt thích, bình luận)
Fallback:      Bài viết theo hashtag yêu thích → Ngẫu nhiên
Bước cuối:     Xáo trộn ngẫu nhiên (Fisher-Yates Shuffle)
```

### Giải Quyết Bài Toán Cold Start

Người dùng mới chưa có dữ liệu tương tác sẽ được chuyển đến trang **Onboarding**, nơi họ chọn 3 chủ đề (hashtag) quan tâm. Hệ thống sử dụng các chủ đề này để khởi tạo điểm sở thích ban đầu, đảm bảo feed được cá nhân hóa ngay từ lần truy cập đầu tiên.

---

## 🤖 Trợ Lý AI

Tích hợp **Google Gemini 2.5 Flash** cung cấp 3 chức năng hỗ trợ sáng tạo nội dung:

| Chức năng | API Endpoint | Mô tả |
|---|---|---|
| 💡 Tạo caption | `POST /api/ai/generate-caption` | Sinh caption từ ý tưởng ngắn gọn |
| ✏️ Viết lại | `POST /api/ai/rewrite` | Viết lại nội dung theo giọng văn mới |
| #️⃣ Gợi ý hashtag | `POST /api/ai/suggest-hashtags` | Phân tích nội dung, gợi ý hashtag phù hợp |

**5 giọng văn hỗ trợ:** 😊 Thân thiện · 💼 Chuyên nghiệp · 😂 Hài hước · 💕 Lãng mạn · 🔥 Truyền cảm hứng

---

<div align="center">

**© 2026 by Nguyễn Thị Ngọc Hân. Dự án phục vụ mục đích học tập và nghiên cứu.**

</div>
