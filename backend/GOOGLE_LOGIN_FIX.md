# 🔧 Hướng Dẫn Khắc Phục Lỗi Google Login

## ❌ Vấn Đề
Lỗi `invalid_grant` khi đăng nhập bằng Google OAuth 2.0

## ✅ Các Thay Đổi Đã Thực Hiện

### 1. Cải thiện xử lý lỗi trong `authController.js`
- ✅ Thêm validation cho GOOGLE_CLIENT_ID và GOOGLE_CLIENT_SECRET
- ✅ Xử lý riêng lỗi `invalid_grant` với thông báo rõ ràng cho người dùng
- ✅ Thêm logging chi tiết để debug dễ dàng hơn
- ✅ Xử lý trường hợp không nhận được `id_token`
- ✅ Thêm giá trị mặc định cho `name` và `picture` khi tạo user mới

### 2. Thông báo lỗi thân thiện cho người dùng
- Thay vì lỗi kỹ thuật, người dùng sẽ nhận được: "Mã xác thực Google đã hết hạn hoặc không hợp lệ. Vui lòng thử đăng nhập lại."

## 🔍 Nguyên Nhân Lỗi `invalid_grant`

Lỗi này xảy ra khi:

1. **Authorization code đã được sử dụng** → Code chỉ có thể dùng 1 lần duy nhất
2. **Code đã hết hạn** → Google code thường hết hạn sau 10 phút
3. **Redirect URI không khớp** → URI trong code phải khớp với cấu hình Google Console
4. **Clock skew** → Đồng hồ server không đồng bộ với Google
5. **Code bị can thiệp** → Code bị thay đổi trong quá trình truyền tải

## 🛠️ Cách Khắc Phục Trên Frontend

### Đảm bảo frontend gọi đúng flow:

```javascript
// ❌ SAI - Không được gọi lại với cùng code
const handleGoogleLogin = async (code) => {
  // Gọi backend với code này
  const response = await fetch('/api/auth/google', {
    method: 'POST',
    body: JSON.stringify({ code })
  });
  
  // ❌ Không được gọi lại với code này nữa!
};

// ✅ ĐÚNG - Đảm bảo code mới mỗi lần
const handleGoogleLogin = useCallback(async (code) => {
  try {
    const response = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      // Lưu token và chuyển hướng
      localStorage.setItem('token', data.token);
      navigate('/home');
    } else {
      // Hiển thị lỗi và yêu cầu đăng nhập lại
      if (data.code === 'INVALID_GRANT') {
        alert(data.message); // "Mã xác thực Google đã hết hạn..."
        // Trigger Google login lại để lấy code mới
      }
    }
  } catch (error) {
    console.error('Login failed:', error);
  }
}, []);
```

## 🔐 Kiểm Tra Cấu Hình Google Cloud Console

1. Truy cập: https://console.cloud.google.com/
2. Chọn project của bạn
3. Vào **APIs & Services > Credentials**
4. Kiểm tra OAuth 2.0 Client ID:
   - **Authorized JavaScript origins**: 
     - `http://localhost:5173`
     - `http://127.0.0.1:5173`
   - **Authorized redirect URIs**:
     - `http://localhost:5173`
     - `http://127.0.0.1:5173`
     - `postmessage` (nếu dùng popup flow)

## 🧪 Test Lại Hệ Thống

### 1. Khởi động server:
```bash
cd backend
npm run dev
```

### 2. Kiểm tra logs khi đăng nhập Google:
Bạn sẽ thấy các log rõ ràng hơn:
- ✅ `Google login successful for: user@example.com`
- ✅ `Created new user from Google: user@example.com`
- ❌ `Google getToken error: invalid_grant`

### 3. Nếu vẫn gặp lỗi, kiểm tra:
```bash
# Kiểm tra biến môi trường đã load đúng chưa
node -e "require('dotenv').config({path:'./backend/.env'}); console.log('GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID?.substring(0,20)+'...')"
```

## 📝 Lưu Ý Quan Trọng

1. **Mỗi authorization code chỉ dùng được 1 lần**
2. **Code hết hạn sau ~10 phút**
3. **Không log toàn bộ code ra console** (bảo mật)
4. **Frontend phải request code mới mỗi lần đăng nhập thất bại**
5. **Đảm bảo redirect_uri khớp 100% với Google Console**

## 🎯 Kết Quả Mong Đợi

Sau khi sửa:
- ✅ Người dùng nhận được thông báo lỗi dễ hiểu
- ✅ Developer nhận được logs chi tiết để debug
- ✅ Hệ thống không crash khi có lỗi Google OAuth
- ✅ Frontend có thể xử lý lỗi và yêu cầu login lại

## 🆘 Vẫn Gặp Vấn Đề?

Gửi logs sau đây để được hỗ trợ:
1. Console logs từ backend khi đăng nhập
2. Network tab trong Chrome DevTools (request/response của `/api/auth/google`)
3. Cấu hình redirect URIs trong Google Cloud Console
