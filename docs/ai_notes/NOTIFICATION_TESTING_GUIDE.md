# 🔔 HƯỚNG DẪN KIỂM TRA HỆ THỐNG THÔNG BÁO

## ✅ CÁC LOẠI THÔNG BÁO ĐÃ TÍCH HỢP

### 1. **LIKE** (Thích bài viết)
- **Khi nào**: User A thích bài viết của User B
- **Thông báo đến**: User B (tác giả bài viết)
- **Nội dung**: "User A đã thích bài viết của bạn"
- **Click vào**: Chuyển đến chi tiết bài viết
- **Icon**: ❤️ (Trái tim đỏ)

### 2. **COMMENT** (Bình luận)
- **Khi nào**: User A comment vào bài viết của User B
- **Thông báo đến**: User B (tác giả bài viết)
- **Nội dung**: "User A đã bình luận về bài viết của bạn: [nội dung comment]"
- **Click vào**: Chuyển đến chi tiết bài viết
- **Icon**: 💬 (Bong bóng chat xanh)

### 3. **FOLLOW** (Theo dõi)
- **Khi nào**: User A follow User B
- **Thông báo đến**: User B (người được follow)
- **Nội dung**: "User A đã bắt đầu theo dõi bạn"
- **Click vào**: Chuyển đến profile của User A
- **Icon**: 👤 (User tím)
- **Đặc biệt**: Có nút "Theo dõi lại"

### 4. **SAVE** (Lưu bài viết)
- **Khi nào**: User A lưu bài viết của User B
- **Thông báo đến**: User B (tác giả bài viết)
- **Nội dung**: "User A đã lưu bài viết của bạn"
- **Click vào**: Chuyển đến chi tiết bài viết
- **Icon**: 📌 (Bookmark xanh lá)

### 5. **MESSAGE** (Tin nhắn)
- **Khi nào**: User A gửi tin nhắn cho User B
- **Thông báo đến**: User B (người nhận)
- **Nội dung**: "User A đã gửi cho bạn một tin nhắn: [nội dung]"
- **Click vào**: Chuyển đến trang chat
- **Icon**: 📧 (Thư indigo)

---

## 🧪 CÁCH KIỂM TRA

### **Bước 1: Khởi động Backend & Frontend**

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### **Bước 2: Chuẩn bị 2 tài khoản**

Bạn cần 2 tài khoản để test:
- **Tài khoản A**: Người thực hiện hành động (like, comment, follow...)
- **Tài khoản B**: Người nhận thông báo

**Cách test:**
1. Mở 2 tab browser khác nhau (hoặc 1 tab thường + 1 tab ẩn danh)
2. Đăng nhập tài khoản A ở tab 1
3. Đăng nhập tài khoản B ở tab 2

### **Bước 3: Test từng loại thông báo**

#### ✅ **Test LIKE**
1. **Tab A**: Vào trang chủ, tìm bài viết của User B
2. **Tab A**: Click nút ❤️ (Like) vào bài viết
3. **Tab B**: Kiểm tra:
   - Badge thông báo tăng lên (số đỏ trên icon ❤️)
   - Vào trang `/notifications` xem có thông báo mới
   - Click vào thông báo → phải chuyển đến chi tiết bài viết

#### ✅ **Test COMMENT**
1. **Tab A**: Vào chi tiết bài viết của User B
2. **Tab A**: Viết comment và gửi
3. **Tab B**: Kiểm tra:
   - Badge thông báo tăng lên
   - Vào trang `/notifications` xem thông báo
   - Nội dung comment hiển thị trong thông báo
   - Click vào → chuyển đến chi tiết bài viết

#### ✅ **Test FOLLOW**
1. **Tab A**: Vào profile của User B
2. **Tab A**: Click nút "Follow"
3. **Tab B**: Kiểm tra:
   - Badge thông báo tăng lên
   - Vào trang `/notifications` xem thông báo
   - Có nút "Theo dõi lại"
   - Click vào thông báo → chuyển đến profile của User A

#### ✅ **Test SAVE**
1. **Tab A**: Vào bài viết của User B
2. **Tab A**: Click nút 📌 (Bookmark/Save)
3. **Tab B**: Kiểm tra:
   - Badge thông báo tăng lên
   - Vào trang `/notifications` xem thông báo
   - Click vào → chuyển đến chi tiết bài viết

#### ✅ **Test MESSAGE**
1. **Tab A**: Vào trang chat `/messages`
2. **Tab A**: Chọn User B và gửi tin nhắn
3. **Tab B**: Kiểm tra:
   - Badge thông báo tăng lên
   - Vào trang `/notifications` xem thông báo
   - Nội dung tin nhắn hiển thị
   - Click vào → chuyển đến trang chat

---

## 🔍 KIỂM TRA CONSOLE LOGS

### **Backend Console (Terminal 1)**

Khi có hành động, bạn sẽ thấy các log:

```
❤️ likePost called: { userId: '...', postId: '...', postAuthor: '...' }
❤️ Like - added like
🔔 Creating like notification for: ...
🔔 createNotification called: { recipientId: '...', senderId: '...', type: 'like', ... }
✅ Notification created: { _id: '...', ... }
✅ Populated notification: { ... }
🔌 Receiver socket ID: ...
✅ Notification sent via socket
```

### **Frontend Console (Browser F12)**

Khi nhận thông báo, bạn sẽ thấy:

```
🔌 Setting up notification listener
🔔 New notification received: { type: 'like', senderId: {...}, ... }
🔔 Badge received notification: { ... }
📊 Unread count: 1
```

---

## 🐛 TROUBLESHOOTING

### **Vấn đề 1: Không nhận được thông báo**

**Kiểm tra:**
1. Backend console có log "✅ Notification created" không?
2. Backend console có log "✅ Notification sent via socket" không?
3. Frontend console có log "🔔 New notification received" không?

**Giải pháp:**
- Refresh cả 2 tab
- Kiểm tra Socket connection: Backend phải có log "🔌 User online"
- Kiểm tra Database: `db.notifications.find().sort({createdAt: -1})`

### **Vấn đề 2: Badge không tăng**

**Kiểm tra:**
- Frontend console có log "📊 Unread count" không?
- API `/api/notifications/unread-count` có trả về đúng không?

**Giải pháp:**
- Refresh trang
- Clear localStorage và đăng nhập lại

### **Vấn đề 3: Click vào thông báo không chuyển trang**

**Kiểm tra:**
- Console có log "🔔 Notification clicked" không?
- Console có log "📍 Navigating to post" không?
- PostId có hợp lệ không?

**Giải pháp:**
- Kiểm tra route `/post/:postId` đã được định nghĩa chưa
- Kiểm tra postId trong notification có đúng format không

### **Vấn đề 4: Trang thông báo trống**

**Kiểm tra:**
- API `/api/notifications` có trả về data không?
- Console có log "✅ Notifications fetched" không?

**Giải pháp:**
```javascript
// Test API trong Console:
fetch('/api/notifications', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  }
})
.then(res => res.json())
.then(data => console.log('Notifications:', data));
```

---

## 📊 KIỂM TRA DATABASE

### **MongoDB Commands**

```javascript
// Xem tất cả thông báo
db.notifications.find().sort({createdAt: -1}).limit(10)

// Đếm thông báo theo type
db.notifications.aggregate([
  { $group: { _id: "$type", count: { $sum: 1 } } }
])

// Xem thông báo chưa đọc của user
db.notifications.find({
  recipientId: ObjectId("USER_ID_HERE"),
  isRead: false
})

// Xóa tất cả thông báo (để test lại từ đầu)
db.notifications.deleteMany({})
```

---

## ✨ TÍNH NĂNG NÂNG CAO

### **Tab Filtering**
- **All**: Hiển thị tất cả thông báo
- **Bình luận**: Chỉ hiển thị type "comment"
- **Theo dõi**: Chỉ hiển thị type "follow"
- **Tin nhắn**: Chỉ hiển thị type "message"
- **Tương tác**: Hiển thị type "like", "save", "share"

### **Real-time Updates**
- Thông báo mới tự động xuất hiện ở đầu danh sách
- Badge tự động cập nhật khi có thông báo mới
- Không cần refresh trang

### **Auto Mark as Read**
- Khi vào trang `/notifications`, tất cả thông báo tự động đánh dấu đã đọc
- Badge reset về 0

---

## 🎯 CHECKLIST HOÀN THÀNH

- [ ] Like bài viết → Nhận thông báo
- [ ] Comment bài viết → Nhận thông báo
- [ ] Follow user → Nhận thông báo
- [ ] Save bài viết → Nhận thông báo
- [ ] Gửi tin nhắn → Nhận thông báo
- [ ] Badge hiển thị số đúng
- [ ] Click thông báo navigate đúng
- [ ] Tab filtering hoạt động
- [ ] Real-time updates hoạt động
- [ ] Auto mark as read hoạt động

---

## 📝 GHI CHÚ

- Thông báo **KHÔNG** được tạo khi user tự thích/comment/save bài viết của chính mình
- Thông báo **KHÔNG** được tạo khi user tự follow chính mình
- Socket.io chỉ gửi thông báo cho user đang online
- User offline sẽ thấy thông báo khi đăng nhập lại

Chúc bạn test thành công! 🚀
