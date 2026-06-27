# 🚀 HƯỚNG DẪN NHANH - HỆ THỐNG RECOMMENDATION

## ✅ CÁC FILE ĐÃ TẠO/CHỈNH SỬA

### 📦 Files Mới:
1. `backend/src/models/UserPreference.js` - Model lưu điểm tương tác
2. `backend/src/services/recommendService.js` - Service tính điểm & gợi ý
3. `backend/src/testRecommendation.js` - Script test hệ thống

### ✏️ Files Đã Chỉnh Sửa:
1. `backend/src/controllers/postController.js` - Thêm logic LIKE/UNLIKE + Feed Hybrid
2. `backend/src/controllers/commentController.js` - Thêm logic COMMENT
3. `backend/src/controllers/userController.js` - Thêm logic SAVE/UNSAVE

---

## 🎯 QUY TẮC ĐIỂM

| Hành Động | Điểm | Mô Tả |
|-----------|------|-------|
| **LIKE** | +1 | User thích bài viết |
| **UNLIKE** | -1 | User bỏ thích |
| **COMMENT** | +3 | User bình luận |
| **SAVE** | +4 | User lưu bài viết |
| **UNSAVE** | -4 | User bỏ lưu |

---

## 📊 THUẬT TOÁN FEED

### Hybrid 60/40:
- **60%** bài viết từ những người đang follow
- **40%** bài viết từ tác giả gợi ý (dựa trên điểm cao nhất)
- **Shuffle** ngẫu nhiên để đa dạng

### API Endpoint:
```
GET /api/posts?limit=10&seenIds=id1,id2,id3
```

---

## 🧪 KIỂM TRA HỆ THỐNG

### Chạy script test:
```bash
cd backend
node src/testRecommendation.js
```

### Kiểm tra database:
```javascript
// MongoDB Shell hoặc Compass
db.userpreferences.find().pretty()
```

---

## 💻 CODE MẪU FRONTEND

### Tải bài viết với seenIds:
```javascript
const [posts, setPosts] = useState([]);
const [seenIds, setSeenIds] = useState([]);

const loadPosts = async () => {
  const params = new URLSearchParams({
    limit: 10,
    seenIds: seenIds.join(',')
  });
  
  const res = await fetch(`/api/posts?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await res.json();
  
  setPosts(prev => [...prev, ...data.posts]);
  setSeenIds(prev => [...prev, ...data.posts.map(p => p._id)]);
};

// Gọi khi mount component
useEffect(() => {
  loadPosts();
}, []);
```

---

## 🔍 DEBUG TIPS

### 1. Kiểm tra điểm có cập nhật không:
```javascript
// Thêm console.log trong recommendService.js
console.log('✅ Cập nhật điểm:', { userId, authorId, actionType, scoreChange });
```

### 2. Kiểm tra feed có hybrid đúng không:
```javascript
// Check response từ API
{
  "posts": [...],
  "followingCount": 6,  // 60%
  "recommendedCount": 4, // 40%
  "hasMore": true
}
```

### 3. Kiểm tra tác giả gợi ý:
```javascript
import { getRecommendedAuthors } from './services/recommendService.js';
const authors = await getRecommendedAuthors(userId, 10);
console.log('Top authors:', authors);
```

---

## ⚡ HOẠT ĐỘNG NGAY

Hệ thống đã sẵn sàng! Không cần cấu hình thêm gì cả:

1. ✅ **Backend tự động cập nhật điểm** khi user Like/Comment/Save
2. ✅ **Feed tự động trộn 60/40** theo following + recommended
3. ✅ **Tự động xóa tác giả** khi điểm <= 0 (tối ưu storage)

---

## 📚 TÀI LIỆU CHI TIẾT

Xem file `RECOMMENDATION_SYSTEM_GUIDE.md` để biết thêm chi tiết về:
- Cấu trúc database
- API documentation
- Tùy chỉnh nâng cao
- Chiến lược scale

---

## 🎉 DONE!

Hệ thống Recommendation đã hoàn chỉnh và sẵn sàng sử dụng trong production!

**Các tính năng chính:**
- ✅ Tính điểm tương tác tự động
- ✅ Gợi ý tác giả thông minh
- ✅ Feed Hybrid 60/40
- ✅ Tối ưu performance với MongoDB Aggregation
- ✅ Shuffle algorithm để đa dạng nội dung
