# 🔧 SỬA LỖI "Must supply api_key" - CLOUDINARY

## ❌ LỖI

```
Must supply api_key
Request failed with status code 500
```

## 🔍 NGUYÊN NHÂN

Cloudinary không nhận được API key từ file `.env`. Có thể do:
1. File `.env` không được load đúng thứ tự
2. uploadMiddleware load trước khi dotenv.config() chạy
3. Biến môi trường không được export đúng

## ✅ GIẢI PHÁP

### **Bước 1: Test Cloudinary Config**

Chạy file test để kiểm tra:

```bash
cd backend
node test-cloudinary.js
```

**Kết quả mong đợi:**
```
🔍 Testing Cloudinary Configuration...

📁 Environment Variables:
  CLOUDINARY_CLOUD_NAME: djillgu7j
  CLOUDINARY_API_KEY: 484818624767465
  CLOUDINARY_API_SECRET: ***cOYA

⚙️ Configuring Cloudinary...

✅ Cloudinary Config:
  cloud_name: djillgu7j
  api_key: 484818624767465
  api_secret: ***cOYA

🧪 Testing Cloudinary Connection...
✅ Cloudinary connection successful!
   Status: ok
```

**Nếu thấy "❌ Missing"** → File .env không được load đúng

### **Bước 2: Restart Backend**

**QUAN TRỌNG**: Phải restart backend sau khi sửa uploadMiddleware!

```bash
# Dừng backend (Ctrl + C)
# Khởi động lại:
cd backend
npm start
```

### **Bước 3: Kiểm tra Console Log**

Khi backend khởi động, bạn phải thấy:

```
🔑 Cloudinary Config Check:
  CLOUD_NAME: djillgu7j
  API_KEY: ✅ Exists
  API_SECRET: ✅ Exists
```

**Nếu thấy "❌ Missing"** → Làm theo Bước 4

### **Bước 4: Kiểm tra File .env**

1. **Mở file** `backend/.env`
2. **Đảm bảo không có khoảng trắng** thừa:

```env
CLOUDINARY_CLOUD_NAME=djillgu7j
CLOUDINARY_API_KEY=484818624767465
CLOUDINARY_API_SECRET=Qgc2V_P6-JJH7GzuitvsSfIcOYA
```

**KHÔNG ĐƯỢC:**
```env
CLOUDINARY_CLOUD_NAME = djillgu7j  ❌ (có khoảng trắng)
CLOUDINARY_API_KEY= 484818624767465  ❌ (có khoảng trắng)
```

3. **Lưu file** và restart backend

### **Bước 5: Test Upload Avatar**

1. Vào Profile → Settings
2. Chọn ảnh và upload
3. Kiểm tra Backend console:

```
👉 Dữ liệu req.file: {
  fieldname: 'avatar',
  originalname: 'image.jpg',
  path: 'https://res.cloudinary.com/...',
  ...
}
```

**Nếu không có req.file** → Multer không hoạt động

## 🐛 TROUBLESHOOTING

### **Vấn đề 1: Vẫn lỗi "Must supply api_key"**

**Giải pháp 1**: Hardcode tạm thời để test

Sửa `uploadMiddleware.js`:

```javascript
cloudinary.config({
  cloud_name: "djillgu7j",
  api_key: "484818624767465",
  api_secret: "Qgc2V_P6-JJH7GzuitvsSfIcOYA",
});
```

Nếu hardcode hoạt động → Vấn đề là dotenv không load được

**Giải pháp 2**: Load .env trong server.js trước tất cả

Sửa `server.js` - đưa dotenv lên đầu tiên:

```javascript
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../.env") });

// Sau đó mới import các module khác
import http from "http";
import express from "express";
// ...
```

### **Vấn đề 2: File .env không được đọc**

**Kiểm tra đường dẫn:**

```javascript
// Trong server.js hoặc uploadMiddleware.js
console.log("📁 .env path:", path.join(__dirname, "../.env"));
console.log("📁 File exists:", require('fs').existsSync(path.join(__dirname, "../.env")));
```

**Nếu file không tồn tại** → Tạo lại file .env

### **Vấn đề 3: Cloudinary credentials sai**

**Lấy lại credentials:**

1. Vào https://cloudinary.com/console
2. Đăng nhập
3. Copy **Cloud name**, **API Key**, **API Secret**
4. Paste vào `.env`
5. Restart backend

### **Vấn đề 4: Multer không nhận file**

**Kiểm tra Frontend:**

```javascript
// Trong ProfilePage.jsx
const formData = new FormData();
formData.append("avatar", selectedFile);

// Log để kiểm tra
console.log("📤 Uploading file:", selectedFile);
console.log("📤 File name:", selectedFile.name);
console.log("📤 File size:", selectedFile.size);
console.log("📤 File type:", selectedFile.type);
```

**Kiểm tra Backend:**

```javascript
// Trong userController.js
console.log("📥 Received file:", req.file);
console.log("📥 Body:", req.body);
```

## 📝 CHECKLIST

- [ ] File `.env` tồn tại trong `backend/`
- [ ] File `.env` có đầy đủ 3 biến Cloudinary
- [ ] Không có khoảng trắng thừa trong `.env`
- [ ] Đã restart backend sau khi sửa
- [ ] Backend console log "✅ Exists" cho API_KEY và API_SECRET
- [ ] Test file `test-cloudinary.js` chạy thành công
- [ ] Upload avatar không còn lỗi 500

## 🎯 GIẢI PHÁP NHANH

Nếu vẫn không được, thử cách này:

1. **Xóa node_modules và reinstall:**
```bash
cd backend
rm -rf node_modules
npm install
```

2. **Tạo file .env mới:**
```bash
cd backend
# Xóa file .env cũ
rm .env
# Tạo file mới
echo "CLOUDINARY_CLOUD_NAME=djillgu7j" > .env
echo "CLOUDINARY_API_KEY=484818624767465" >> .env
echo "CLOUDINARY_API_SECRET=Qgc2V_P6-JJH7GzuitvsSfIcOYA" >> .env
```

3. **Restart backend:**
```bash
npm start
```

---

Nếu vẫn lỗi, hãy gửi cho tôi:
1. Output của `node test-cloudinary.js`
2. Backend console log khi khởi động
3. Backend console log khi upload avatar

Tôi sẽ giúp bạn debug chi tiết hơn! 🚀
