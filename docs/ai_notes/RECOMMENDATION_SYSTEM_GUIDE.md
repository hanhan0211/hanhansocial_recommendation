# 🎯 HỆ THỐNG GỢI Ý BÀI VIẾT CÁ NHÂN HÓA (RECOMMENDATION SYSTEM)

## 📋 TỔNG QUAN

Hệ thống gợi ý bài viết dựa trên **Interaction Score-Based Algorithm** với thuật toán **Hybrid 60/40**:
- **60%** bài viết từ những người đang theo dõi (Following)
- **40%** bài viết từ những tác giả được gợi ý (dựa trên điểm tương tác)

---

## ✅ CÁC THÀNH PHẦN ĐÃ TÍCH HỢP

### 📦 PHẦN 1: MODEL `UserPreference`

**File:** `backend/src/models/UserPreference.js`

**Cấu trúc:**
```javascript
{
  userId: ObjectId,           // ID người dùng (unique)
  interactedAuthors: [
    {
      authorId: ObjectId,     // ID tác giả
      score: Number           // Điểm tương tác
    }
  ]
}
```

**Method có sẵn:**
- `getTopAuthors(limit)` - Lấy top tác giả theo điểm cao nhất

---

### ⚙️ PHẦN 2: SERVICE TÍNH ĐIỂM

**File:** `backend/src/services/recommendService.js`

#### 🎯 Quy Tắc Trọng Số:
- **LIKE**: +1 điểm
- **UNLIKE**: -1 điểm
- **COMMENT**: +3 điểm
- **SAVE**: +4 điểm
- **UNSAVE**: -4 điểm

#### 📌 Hàm Chính:

**1. `updateAuthorScore(userId, authorId, actionType)`**
- Cập nhật điểm tương tác khi user thực hiện hành động
- Tự động tạo mới UserPreference nếu chưa có
- Tự động xóa tác giả khi điểm <= 0 (tối ưu storage)

**2. `getRecommendedAuthors(userId, limit = 10)`**
- Lấy danh sách tác giả gợi ý dựa trên điểm cao nhất
- Trả về mảng `authorId[]`

---

### 🔗 PHẦN 3: TÍCH HỢP VÀO CONTROLLER

#### ✅ 1. **postController.js** - API Thích/Bỏ Thích

```javascript
// Import
import { updateAuthorScore } from "../services/recommendService.js";

// Trong hàm likePost()
if (isLiked) {
  // Bỏ like
  await updateAuthorScore(userId, post.userId, 'UNLIKE'); // -1 điểm
} else {
  // Thích
  await updateAuthorScore(userId, post.userId, 'LIKE'); // +1 điểm
}
```

#### ✅ 2. **commentController.js** - API Thêm Bình Luận

```javascript
// Import
import { updateAuthorScore } from "../services/recommendService.js";

// Trong hàm createComment()
if (post && post.userId) {
  await updateAuthorScore(userId, post.userId, 'COMMENT'); // +3 điểm
}
```

#### ✅ 3. **userController.js** - API Lưu/Bỏ Lưu Bài Viết

```javascript
// Import
import { updateAuthorScore } from '../services/recommendService.js';

// Trong hàm toggleSavePost()
if (alreadySaved) {
  // Bỏ lưu
  await updateAuthorScore(userId, post.userId, 'UNSAVE'); // -4 điểm
} else {
  // Lưu
  await updateAuthorScore(userId, post.userId, 'SAVE'); // +4 điểm
}
```

---

### 🏠 PHẦN 4: THUẬT TOÁN FEED TRANG CHỦ (HYBRID)

**API:** `GET /api/posts` (hàm `getFeedPosts`)

#### 📊 Query Parameters:
- `page`: Trang hiện tại (mặc định: 1)
- `limit`: Số lượng bài viết mỗi trang (mặc định: 10, tối đa: 30)
- `seenIds`: Danh sách ID bài viết đã xem (ngăn lặp lại), cách nhau bởi dấu phẩy
  - Ví dụ: `?seenIds=507f1f77bcf86cd799439011,507f191e810c19729de860ea`

#### 🔄 Luồng Xử Lý:

1. **Lấy danh sách Following** của user hiện tại
2. **Lấy danh sách Recommended Authors** (top 20 tác giả có điểm cao nhất)
3. **Tính toán tỷ lệ:**
   - 60% = `Math.ceil(limit * 0.6)` bài từ Following
   - 40% = `Math.floor(limit * 0.4)` bài từ Recommended Authors
4. **Query bài viết** với bộ lọc:
   - Loại trừ bài đã xem (`$nin: seenIds`)
   - Loại trừ bài của chính mình (`userId: { $ne: currentUserId }`)
5. **Gộp và xáo trộn** (Shuffle) kết quả bằng Fisher-Yates algorithm
6. **Trả về Response:**

```json
{
  "posts": [...],
  "hasMore": true,
  "page": 1,
  "limit": 10,
  "followingCount": 6,
  "recommendedCount": 4
}
```

#### 📝 Ví Dụ Gọi API từ Frontend:

```javascript
// Lần đầu tải trang
const response = await fetch('/api/posts?limit=10');

// Cuộn xuống tải thêm (Infinite Scroll)
const seenIds = posts.map(p => p._id).join(',');
const response = await fetch(`/api/posts?limit=10&seenIds=${seenIds}`);
```

---

## 🚀 CÁCH SỬ DỤNG

### 1️⃣ Backend đã tự động hoạt động
Không cần cấu hình thêm gì, hệ thống sẽ tự động:
- Cập nhật điểm khi user Like/Comment/Save bài viết
- Tính toán tác giả gợi ý dựa trên điểm tương tác
- Trả về feed Hybrid 60/40

### 2️⃣ Frontend cần điều chỉnh
Cập nhật API call trang chủ để truyền `seenIds`:

```javascript
// Ví dụ với React
const [posts, setPosts] = useState([]);
const [seenIds, setSeenIds] = useState([]);

const loadMorePosts = async () => {
  const params = new URLSearchParams({
    limit: 10,
    seenIds: seenIds.join(',')
  });
  
  const res = await fetch(`/api/posts?${params}`);
  const data = await res.json();
  
  setPosts(prev => [...prev, ...data.posts]);
  setSeenIds(prev => [...prev, ...data.posts.map(p => p._id)]);
};
```

---

## 📊 KIỂM TRA HỆ THỐNG

### ✅ Test Tính Điểm

1. Đăng nhập với 2 tài khoản khác nhau
2. User A tương tác với bài viết của User B:
   - Like: User B được +1 điểm
   - Comment: User B được +3 điểm
   - Save: User B được +4 điểm
3. Kiểm tra database:

```javascript
// MongoDB Shell
db.userpreferences.findOne({ userId: ObjectId("USER_A_ID") })
```

Kết quả mong đợi:
```json
{
  "userId": "USER_A_ID",
  "interactedAuthors": [
    {
      "authorId": "USER_B_ID",
      "score": 8  // 1 + 3 + 4 = 8
    }
  ]
}
```

### ✅ Test Feed Hybrid

1. User A follow 5 người
2. User A tương tác với 3 tác giả khác (không follow)
3. Gọi API `GET /api/posts?limit=10`
4. Kết quả mong đợi:
   - ~6 bài từ 5 người đang follow (60%)
   - ~4 bài từ 3 tác giả gợi ý (40%)
   - Thứ tự ngẫu nhiên (đã shuffle)

---

## 🔧 TÙY CHỈNH NÂNG CAO

### 1. Thay đổi trọng số điểm

Chỉnh sửa trong `backend/src/services/recommendService.js`:

```javascript
const SCORE_WEIGHTS = {
  LIKE: 2,      // Tăng từ 1 lên 2
  UNLIKE: -2,
  COMMENT: 5,   // Tăng từ 3 lên 5
  SAVE: 6,      // Tăng từ 4 lên 6
  UNSAVE: -6,
};
```

### 2. Thay đổi tỷ lệ Hybrid

Chỉnh sửa trong `backend/src/controllers/postController.js` (hàm `getFeedPosts`):

```javascript
const followingLimit = Math.ceil(limit * 0.7); // 70% từ following
const recommendedLimit = Math.floor(limit * 0.3); // 30% từ recommended
```

### 3. Tăng số lượng tác giả gợi ý

```javascript
const recommendedAuthorIds = await getRecommendedAuthors(userId, 50); // Tăng từ 20 lên 50
```

---

## 🐛 XỬ LÝ LỖI THƯỜNG GẶP

### ❌ Lỗi: "Cannot find module 'UserPreference'"
**Nguyên nhân:** Model chưa được import đúng

**Giải pháp:**
```javascript
import UserPreference from "../models/UserPreference.js";
```

### ❌ Lỗi: Feed chỉ hiển thị bài từ following
**Nguyên nhân:** User chưa có dữ liệu tương tác (bảng UserPreference rỗng)

**Giải pháp:** 
- Tương tác với một số bài viết (like, comment, save)
- Hoặc seed dữ liệu mẫu

### ❌ Lỗi: Điểm không cập nhật
**Nguyên nhân:** Hàm `updateAuthorScore` chạy không thành công

**Kiểm tra:**
```javascript
// Thêm log trong service
console.log('✅ Cập nhật điểm:', { userId, authorId, actionType, scoreChange });
```

---

## 📈 CHIẾN LƯỢC SCALE

### 1. Thêm Cache (Redis)
```javascript
// Cache recommended authors trong 5 phút
const cacheKey = `recommended:${userId}`;
let recommendedAuthorIds = await redis.get(cacheKey);

if (!recommendedAuthorIds) {
  recommendedAuthorIds = await getRecommendedAuthors(userId, 20);
  await redis.setex(cacheKey, 300, JSON.stringify(recommendedAuthorIds));
}
```

### 2. Background Job tính toán trước
Dùng cron job (node-cron) tính toán recommended authors mỗi 1 giờ:

```javascript
import cron from 'node-cron';

cron.schedule('0 * * * *', async () => {
  // Tính toán và cache cho tất cả active users
  const activeUsers = await User.find({ lastActive: { $gte: ... } });
  for (const user of activeUsers) {
    await getRecommendedAuthors(user._id, 20);
  }
});
```

### 3. Index Database
```javascript
// Đã có sẵn trong model
userPreferenceSchema.index({ userId: 1 });
userPreferenceSchema.index({ "interactedAuthors.authorId": 1 });
```

---

## ✨ TÍNH NĂNG MỞ RỘNG

### 1. Time Decay (Giảm điểm theo thời gian)
```javascript
// Giảm 10% điểm mỗi tháng
const timeDecayFactor = 0.9;
const monthsSinceLastInteraction = ...; // Tính toán
score = score * Math.pow(timeDecayFactor, monthsSinceLastInteraction);
```

### 2. Diversity Score (Đa dạng nội dung)
```javascript
// Thêm penalty cho tác giả đã xuất hiện nhiều trong feed gần đây
const recentlySeenAuthors = [...]; // Lưu trong session/cookie
if (recentlySeenAuthors.includes(authorId)) {
  score = score * 0.5; // Giảm 50% ưu tiên
}
```

### 3. Content-Based Filtering (Lọc theo nội dung)
```javascript
// Thêm điểm cho hashtag yêu thích
const favoriteHashtags = ['#travel', '#food'];
if (post.hashtags.some(tag => favoriteHashtags.includes(tag))) {
  score = score * 1.5; // Tăng 50% ưu tiên
}
```

---

## 📞 HỖ TRỢ

Nếu gặp vấn đề, kiểm tra log console:
- `✅` Thành công
- `⚠️` Cảnh báo
- `❌` Lỗi
- `🎯` Recommendation action
- `📊` Feed statistics

---

## 📝 CHANGELOG

### Version 1.0.0 (Initial Release)
- ✅ Model `UserPreference` với mảng `interactedAuthors`
- ✅ Service tính điểm với 5 action types
- ✅ Tích hợp vào Like/Comment/Save APIs
- ✅ Thuật toán Hybrid Feed 60/40
- ✅ Shuffle algorithm (Fisher-Yates)
- ✅ Query filter `seenIds` để tránh lặp lại

---

**Developed with ❤️ for KLTN Social & Recommend Project**
