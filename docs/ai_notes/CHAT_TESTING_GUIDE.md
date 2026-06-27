# 🧪 Testing Guide - Chat System Optimization

## 📝 Hướng dẫn Test Từng Tính Năng

---

## Test 1: Navigation từ Sidebar sang ChatPage

### Mục tiêu:
- Kiểm tra nút "Tin nhắn" ở Sidebar hoạt động bình thường
- Không còn button ở góc dưới phải

### Các bước:
1. **Truy cập HomePage** (`/home`)
2. **Kiểm tra Sidebar bên trái:**
   - Tìm mục "Tin nhắn" (với icon FiSend)
   - Verifyring không có button "Tin nhắn" ở góc dưới phải (bottom-8 right-8)
3. **Click "Tin nhắn" ở Sidebar:**
   - ✅ Nên navigate sang `/messages` (ChatPage)
   - ✅ Transition phải mượt mà

### Expected Result:
```
HomePage Sidebar
├── Trang chủ
├── Reels
├── Tin nhắn  ← Click vào đây
├── Tìm kiếm
├── Khám phá
├── Thông báo
└── Tạo mới

(Không có button ở bottom-right)
```

---

## Test 2: Unread Count Badge Real-Time

### Mục tiêu:
- Hiển thị số tin nhắn chưa đọc trên badge "Tin nhắn"
- Cập nhật real-time khi có tin nhắn mới

### Các bước:

#### Bước 2.1: Setup 2 tài khoản
1. **Đăng nhập User A** trên trình duyệt
2. **Mở tab mới, đăng nhập User B**
3. Cả 2 user follow nhau

#### Bước 2.2: Kiểm tra badge khi không có tin
1. **Vào HomePage User A**
2. Sidebar "Tin nhắn":
   - ✅ Không hiển thị badge (hoặc badge = 0)

#### Bước 2.3: Send tin nhắn không đọc
1. **User B navigate sang ChatPage** (`/messages`)
2. **User B click vào User A** (select contact)
3. **User B gửi tin nhắn: "Hello User A"**
4. **Quay lại HomePage User B:**
   - ✅ Badge "Tin nhắn" không thay đổi (vì User B là người gửi)

#### Bước 2.4: Check User A nhận được tin
1. **Vào HomePage User A** (giữ tab này mở, không click ChatPage)
2. **Xem Sidebar "Tin nhắn":**
   - ✅ Badge hiển thị "1" (đỏ, số trắng)
   - ✅ Tự động update trong vòng 2-3 giây
3. **User B gửi 2 tin nữa:**
   - ✅ Badge User A cập nhật thành "3"
   - ✅ Real-time (không cần F5)

#### Bước 2.5: Mark as read (by viewing ChatPage)
1. **User A click "Tin nhắn" ở Sidebar:**
   - ✅ Navigate sang ChatPage
2. **User A click vào contact User B:**
   - ✅ Backend gọi API PUT `/api/messages/mark-as-read/:userId`
3. **User A quay lại HomePage:**
   - ✅ Badge "Tin nhắn" **biến mất** (hoặc = 0)

### Expected Network Calls:
```
GET /api/messages/unread-count                    → 200, {unreadCount: 3}
PUT /api/messages/mark-as-read/:senderId          → 200, {modifiedCount: 3, unreadCount: 0}
Socket: emit('unreadCountUpdated', {unreadCount}) → Realtime
```

---

## Test 3: Green Dot trên Contact List

### Mục tiêu:
- Hiển thị dấu chấm xanh kế bên tên contact nếu có tin chưa đọc
- Dấu chấm biến mất khi đọc tin

### Các bước:

#### Bước 3.1: Setup
1. **Đăng nhập 2 user** (User A & User B, follow nhau)
2. **User B gửi 2-3 tin cho User A**

#### Bước 3.2: Check dấu chấm trước khi đọc
1. **User A vào ChatPage** (`/messages`)
2. **Danh sách contact bên trái:**
   - ✅ Kế bên tên User B: hiển thị **dấu chấm xanh** (● emerald-500)
   - ✅ Tên User B **in đậm** (font-bold)
   - ✅ Text preview tin nhắn **in đậm** (font-medium)

#### Bước 3.3: Click contact để đọc
1. **User A click vào User B** (select contact)
2. **Backend tự động gọi API `PUT /api/messages/mark-as-read/:userId`**
3. **UI cập nhật tức thì:**
   - ✅ Dấu chấm **biến mất**
   - ✅ Tên User B trở lại bình thường (không in đậm)
   - ✅ Text preview bình thường (không in đậm)

#### Bước 3.4: Test lại với tin nhắn mới
1. **User B gửi tin mới cho User A**
2. **User A vẫn đang ở ChatPage của User B:**
   - ✅ Tin nhắn xuất hiện trong khung chat
   - ✅ Dấu chấm **tự động biến mất** (vì User A đang xem, auto mark-as-read)
3. **User A quay lại HomePage:**
   - ✅ Badge "Tin nhắn" vẫn = 0 (không có tin chưa đọc từ các contact khác)

### Expected Visual:

```
Danh sách contact - Có tin chưa đọc:
┌─────────────────────────────────┐
│ [Avatar] User B  ● (green dot)  │  ← Bold text
│         Hello User A             │  ← Bold text
└─────────────────────────────────┘

Danh sách contact - Đã đọc hết:
┌─────────────────────────────────┐
│ [Avatar] User B                 │  ← Normal text
│         Hello User A             │  ← Normal text
└─────────────────────────────────┘
```

---

## Test 4: Real-Time Socket Updates

### Mục tiêu:
- Kiểm tra Socket.io events hoạt động đúng
- Verify unread count + green dots update real-time

### Các bước:

#### Bước 4.1: Prepare
1. **Mở 2 browser tabs:**
   - Tab 1: User A HomePage
   - Tab 2: User B ChatPage (đã select User A)
2. **Inspect Network tab** trên User A browser

#### Bước 4.2: Send tin từ Tab 2
1. **User B (Tab 2) gửi tin: "Test real-time"**
2. **Kiểm tra Tab 1 (User A HomePage):**
   - ✅ Badge "Tin nhắn" cập nhật ngay (không cần F5)
   - ✅ Dấu chấm xanh xuất hiện ở danh sách contact (nếu xem ChatPage)
3. **Check Network Tab:**
   - ✅ WebSocket message được gửi
   - ✅ Không có HTTP request block

#### Bước 4.3: Verify Console
1. **Mở DevTools Console trên User A browser**
2. Check không có error liên quan đến:
   - Socket connection
   - API fetch
   - State update

### Expected Console Logs:
```javascript
// SocketContext.jsx - Connection
✓ Socket connected
✓ Listening: 'unreadCountUpdated'

// messageController.js - Backend
✓ User online: userId → socketId
✓ Emit newMessage
✓ Emit unreadCountUpdated
```

---

## Test 5: Mobile Responsive

### Mục tiêu:
- Kiểm tra dấu chấm + badge hiển thị đúng trên mobile

### Các bước:
1. **Mở DevTools → Toggle device toolbar (iPhone 12)**
2. **HomePage:**
   - ✅ Badge "Tin nhắn" vẫn visible
   - ✅ Sidebar vẫn navigate được
3. **ChatPage:**
   - ✅ Dấu chấm vẫn hiển thị trên contact list (mobile ver)
   - ✅ Click contact → auto mark-as-read

---

## Test 6: Edge Cases

### Case 1: Tin từ chính mình
1. **User A gửi tin cho User B**
2. **User A ChatPage:**
   - ✅ Không hiển thị dấu chấm xanh ở User B (vì là tin từ mình)
   - ✅ Dấu chấm chỉ hiển thị nếu tin từ **người khác**

### Case 2: Multiple unread contacts
1. **User A nhận tin từ User B, C, D, E** (chưa đọc)
2. **HomePage "Tin nhắn" badge:**
   - ✅ Hiển thị total = 4+ (hoặc tùy logic)
3. **ChatPage:**
   - ✅ 4 dấu chấm xanh ở 4 contact
4. **User A đọc từ User B:**
   - ✅ Badge giảm (-1)
   - ✅ Dấu chấm User B biến mất
   - ✅ Dấu chấm C, D, E vẫn còn

### Case 3: Disconnect & Reconnect
1. **Simulate network disconnect** (DevTools → offline)
2. **Gửi tin từ User B:**
   - ✅ User A backend nhận, lưu vào DB
3. **Reconnect User A:**
   - ✅ Socket reconnect
   - ✅ Badge + dấu chấm update lại
   - ✅ Tin nhắn sync đầy đủ

---

## 🧪 Automation Testing (Optional)

```javascript
// Example test cases using Cypress/Playwright
describe('Chat Optimization', () => {
  it('should display unread badge on sidebar', () => {
    // 1. Login User A
    // 2. User B sends message
    // 3. Assert badge text = '1'
  });

  it('should show green dot on unread contact', () => {
    // 1. Goto ChatPage
    // 2. Find contact with unread
    // 3. Assert green dot visible
  });

  it('should mark as read on contact select', () => {
    // 1. Click contact
    // 2. Assert API call to /mark-as-read
    // 3. Assert green dot disappears
  });

  it('should update real-time on new message', () => {
    // 1. HomePage open with WebSocket
    // 2. Send message from User B
    // 3. Assert badge updates in <3s
  });
});
```

---

## 📊 Debugging Checklist

Nếu gặp lỗi, kiểm tra:

### Backend:
- [ ] API `/api/messages/unread-count` trả về đúng format
- [ ] API `/api/messages/mark-as-read/:senderId` cập nhật DB
- [ ] Socket event `unreadCountUpdated` được phát sau `newMessage`
- [ ] Database: Collection `messages` có field `isRead` (default: false)

### Frontend:
- [ ] `useSocket()` hook được gọi trong HomePage
- [ ] `subscribeUnreadCountUpdate` listener được add/remove đúng
- [ ] Socket connection: `io.on('unreadCountUpdated')` 
- [ ] `markContactAsRead` API call khi `selectContact()`
- [ ] `hasUnreadMessage()` check `isRead === false` từ backend

### Network:
- [ ] WebSocket (wss://) kết nối thành công
- [ ] Không có CORS error trên API calls
- [ ] Message request/response times < 1s

---

## 🎯 Success Criteria

Dự án hoàn tất khi:
- ✅ Không có button "Tin nhắn" ở góc phải
- ✅ "Tin nhắn" ở Sidebar navigate sang `/messages`
- ✅ Badge "Tin nhắn" hiển thị unread count (real-time)
- ✅ Dấu chấm xanh ở contact nếu unread
- ✅ Auto mark-as-read khi click contact
- ✅ Tất cả update < 2 giây (real-time)
- ✅ Responsive trên mobile
- ✅ Không có error/warning trong console

---

## 📞 Support

Nếu gặp vấn đề:
1. Kiểm tra browser console (F12)
2. Kiểm tra backend logs
3. Kiểm tra Network tab (xem requests)
4. Restart server + clear browser cache
5. Verify MongoDB có field `isRead` trong Message collection

Good luck! 🚀
