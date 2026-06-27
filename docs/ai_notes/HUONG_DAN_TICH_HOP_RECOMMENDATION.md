# 📘 HƯỚNG DẪN TÍCH HỢP HỆ THỐNG GỢI Ý CÁ NHÂN HÓA

## 🎯 TỔNG QUAN

Hệ thống recommendation đã được xây dựng hoàn chỉnh với 3 thành phần chính:
1. **Model** - Lưu trữ điểm tương tác
2. **Service** - Tính toán và cập nhật điểm
3. **Controller** - API Feed thông minh

---

## ✅ PHẦN 1: MODEL ĐÃ TẠO

**File:** `backend/src/models/UserPreference.js`

```javascript
{
  userId: ObjectId (unique),      // ID người dùng
  interactedAuthors: [
    {
      authorId: ObjectId,          // ID tác giả
      score: Number (default 0)    // Điểm tương tác
    }
  ]
}
```

**Không cần làm gì thêm** - Model đã sẵn sàng!

---

## ✅ PHẦN 2: SERVICE TÍNH ĐIỂM

**File:** `backend/src/services/recommendService.js`

### 📊 Quy Tắc Trọng Số:
| Hành Động | Điểm | Khi Nào |
|-----------|------|---------|
| **LIKE** | +1 | User thích bài viết |
| **UNLIKE** | -1 | User bỏ thích |
| **COMMENT** | +3 | User bình luận |
| **SAVE** | +4 | User lưu bài viết |
| **UNSAVE** | -4 | User bỏ lưu |

### 🔌 CÁCH TÍCH HỢP VÀO CÁC API HIỆN CÓ:

#### 1️⃣ **API LIKE/UNLIKE** (`postController.js` - hàm `likePost`)

**VỊ TRÍ CHÈN:** Sau khi đã xác định Like hay Unlike

```javascript
// File: backend/src/controllers/postController.js

// Import ở đầu file
import { updateAuthorScore } from "../services/recommendService.js";

// Trong hàm likePost
export const likePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const userId = req.user.id || req.user._id;
    
    const isLiked = post.likes.some(id => id.toString() === userId.toString());

    if (isLiked) {
      // Bỏ like
      post.likes = post.likes.filter(id => id.toString() !== userId.toString());
      
      // ✨ CHÈN Ở ĐÂY - UNLIKE
      if (post.userId) {
        await updateAuthorScore(userId, post.userId, 'UNLIKE');
      }
    } else {
      // Thích
      post.likes.push(userId);
      
      // ✨ CHÈN Ở ĐÂY - LIKE
      if (post.userId) {
        await updateAuthorScore(userId, post.userId, 'LIKE');
      }

      // Tạo notification (code cũ của bạn)
      if (post.userId && post.userId.toString() !== userId.toString()) {
        await createNotification({...});
      }
    }

    await post.save();
    res.json(post.likes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

---

#### 2️⃣ **API COMMENT** (`commentController.js` - hàm `createComment`)

**VỊ TRÍ CHÈN:** Sau khi tìm thấy post và trước khi tạo notification

```javascript
// File: backend/src/controllers/commentController.js

// Import ở đầu file
import { updateAuthorScore } from "../services/recommendService.js";

// Trong hàm createComment
export const createComment = async (req, res) => {
  try {
    const { content, postId, parentId } = req.body;
    const userId = req.user._id || req.user.id;

    const comment = await Comment.create({
      content,
      postId,
      parentId: parentId || null,
      userId: userId,
    });

    const populatedComment = await Comment.findById(comment._id)
      .populate("userId", "username avatar role");

    // Tìm post để lấy authorId
    const post = await Post.findById(postId);
    
    if (post && post.userId) {
      // ✨ CHÈN Ở ĐÂY - COMMENT
      await updateAuthorScore(userId, post.userId, 'COMMENT');

      // Tạo notification (code cũ của bạn)
      await createNotification({
        recipientId: post.userId,
        senderId: userId,
        type: "comment",
        postId: postId,
        content: content.substring(0, 100),
      });
    }

    res.json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

---

#### 3️⃣ **API SAVE/UNSAVE** (`userController.js` - hàm `toggleSavePost`)

**VỊ TRÍ CHÈN:** Trong phần if/else của Save hoặc Unsave

```javascript
// File: backend/src/controllers/userController.js

// Import ở đầu file
import { updateAuthorScore } from '../services/recommendService.js';

// Trong hàm toggleSavePost
export const toggleSavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(postId);
    const user = await User.findById(userId);

    const alreadySaved = user.savedPosts.some(
      (id) => id.toString() === postId.toString()
    );

    if (alreadySaved) {
      // Bỏ lưu
      user.savedPosts = user.savedPosts.filter(
        (id) => id.toString() !== postId.toString()
      );

      // ✨ CHÈN Ở ĐÂY - UNSAVE
      if (post.userId) {
        await updateAuthorScore(userId, post.userId, 'UNSAVE');
      }
    } else {
      // Lưu
      user.savedPosts.push(postId);

      // ✨ CHÈN Ở ĐÂY - SAVE
      if (post.userId) {
        await updateAuthorScore(userId, post.userId, 'SAVE');
      }
      
      // Tạo notification (code cũ của bạn)
      if (post.userId) {
        await createNotification({
          recipientId: post.userId,
          senderId: userId,
          type: "save",
          postId: postId,
        });
      }
    }

    user.markModified("savedPosts");
    await user.save();

    res.json({
      message: alreadySaved ? "Đã bỏ lưu bài viết" : "Đã lưu bài viết",
      isSaved: !alreadySaved,
      savedPosts: user.savedPosts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
```

---

## ✅ PHẦN 3: API FEED ĐÃ REFACTOR

**File:** `backend/src/controllers/postController.js` - Hàm `getFeedPosts`

### 📊 THUẬT TOÁN HYBRID 60/40:

```
┌─────────────────────────────────────────────────────────────┐
│                    FEED TRANG CHỦ                            │
├─────────────────────────────────────────────────────────────┤
│  60% │ Tầng 1: Following                                     │
│      │ - Lấy bài từ danh sách following                     │
│      │ - Loại trừ bài đã xem ($nin: seenIds)               │
├──────┼──────────────────────────────────────────────────────┤
│  40% │ Tầng 2: Recommended Authors                          │
│      │ - Lấy top authors theo điểm cao nhất                 │
│      │ - Loại trừ người đã following                        │
│      │ - Tối đa 2 bài/tác giả (đa dạng)                    │
│      │ - Loại trừ bài đã xem ($nin: seenIds)               │
├──────┼──────────────────────────────────────────────────────┤
│  ?%  │ Fallback: Random (nếu chưa đủ)                       │
│      │ - Lấy từ tác giả khác chưa xuất hiện                │
│      │ - Đảm bảo luôn đủ limit bài                         │
├──────┴──────────────────────────────────────────────────────┤
│  🔀 Shuffle tất cả bài viết (Fisher-Yates)                  │
└─────────────────────────────────────────────────────────────┘
```

### 🔧 TOÁN TỬ MONGODB SỬ DỤNG:

| Toán Tử | Chức Năng | Ví Dụ |
|---------|-----------|-------|
| `$in` | Tìm giá trị TRONG mảng | `userId: { $in: followingIds }` |
| `$nin` | Tìm giá trị KHÔNG TRONG mảng | `_id: { $nin: seenIds }` |
| `$ne` | Không bằng | `userId: { $ne: currentUserId }` |
| `$sample` | Lấy ngẫu nhiên N docs | `{ $sample: { size: 10 } }` |
| `$sort` | Sắp xếp | `{ $sort: { createdAt: -1 } }` |
| `$limit` | Giới hạn kết quả | `{ $limit: 10 }` |
| `$lookup` | Join collection | `$lookup: { from: 'users', ... }` |

---

## 🧪 KIỂM TRA HỆ THỐNG

### 1️⃣ **Khởi động lại server:**
```bash
cd backend
npm start
```

### 2️⃣ **Test tính điểm (Terminal Log):**

Khi bạn Like/Comment/Save, sẽ thấy log chi tiết:
```
═════════════════════════════════════════════════════════════════════════════════
🎯 BẮT ĐẦU CẬP NHẬT ĐIỂM TƯƠNG TÁC
═════════════════════════════════════════════════════════════════════════════════
📝 User ID:    6a1459f01dd220086b434caf
📝 Author ID:  6a145956461693fbd7563baa
📝 Hành động:  LIKE
📊 Trọng số điểm: +1

🔍 BƯỚC 1: Tìm UserPreference...
   ✅ Tìm thấy UserPreference

🔍 BƯỚC 2: Kiểm tra tác giả trong mảng...
   ✅ Tác giả ĐÃ TỒN TẠI trong mảng
   📊 Điểm cũ: 18
   📊 Thay đổi: +1
   📊 Điểm mới: 19

💾 BƯỚC 3: Lưu vào database...
   ✅ LƯU THÀNH CÔNG!
═════════════════════════════════════════════════════════════════════════════════
```

### 3️⃣ **Test Feed API (Postman/Browser):**

```
GET /api/posts?limit=10&seenIds=6a1459ac461693fbd756497a,6a1459ad461693fbd756497e
```

**Response:**
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

**Terminal Log:**
```
═══════════════════════════════════════════════════════════════════════════════════
🏠 BẮT ĐẦU XỬ LÝ FEED TRANG CHỦ
═══════════════════════════════════════════════════════════════════════════════════
📊 THÔNG SỐ REQUEST:
   • User ID:     6a1459f01dd220086b434caf
   • Page:        1
   • Limit:       10
   • Seen IDs:    2 bài đã xem

🔍 BƯỚC 2: Lấy danh sách Following & Recommended Authors...
   ✅ Following:   5 người
   ✅ Recommended: 3 tác giả (đã loại following)

📊 TỶ LỆ 60/40:
   • Tầng 1 (Following):   6 bài (60%)
   • Tầng 2 (Recommended): 4 bài (40%)

🎯 BƯỚC 4: Lấy bài viết Tầng 1 (Following)...
   ✅ Lấy được: 6 bài từ following

🎯 BƯỚC 5: Lấy bài viết Tầng 2 (Recommended)...
   ✅ Lấy được: 4 bài từ recommended (max 2/tác giả)

🔀 BƯỚC 7: Xáo trộn 10 bài viết...
   ✅ Đã shuffle xong

📈 THỐNG KÊ:
   • Tổng bài trong DB:     847
   • Đã xem trước đó:       2
   • Trả về lần này:        10
   • Còn bài để tải:        CÓ
═══════════════════════════════════════════════════════════════════════════════════
```

---

## 📱 FRONTEND - CÁCH TRUYỀN seenIds

### React Example:
```javascript
const [posts, setPosts] = useState([]);
const [seenIds, setSeenIds] = useState([]);
const [hasMore, setHasMore] = useState(true);

const loadPosts = async () => {
  try {
    // Tạo query string
    const params = new URLSearchParams({
      limit: 10,
      seenIds: seenIds.join(',') // "id1,id2,id3"
    });

    const res = await fetch(`/api/posts?${params}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await res.json();

    // Append bài mới vào list
    setPosts(prev => [...prev, ...data.posts]);
    
    // Cập nhật danh sách đã xem
    setSeenIds(prev => [...prev, ...data.posts.map(p => p._id)]);
    
    // Cập nhật hasMore
    setHasMore(data.hasMore);
  } catch (error) {
    console.error('Lỗi tải feed:', error);
  }
};

// Load lần đầu khi mount
useEffect(() => {
  loadPosts();
}, []);

// Infinite scroll
const handleScroll = () => {
  if (hasMore && !loading) {
    loadPosts();
  }
};
```

---

## 🎯 KẾT QUẢ MONG ĐỢI

### ✅ SAU KHI TÍCH HỢP:

1. **Tính điểm tự động:**
   - User Like → Tác giả +1 điểm
   - User Comment → Tác giả +3 điểm
   - User Save → Tác giả +4 điểm
   - Unlike/Unsave → Trừ điểm tương ứng

2. **Feed thông minh:**
   - 60% từ following
   - 40% từ tác giả có điểm cao (chưa follow)
   - Không lặp lại bài cũ (nhờ seenIds)
   - Đa dạng (max 2 bài/tác giả recommended)

3. **UX tốt hơn:**
   - Không thấy bài lặp lại khi reload
   - Khám phá tác giả mới phù hợp sở thích
   - Load more hoạt động mượt mà

---

## 🐛 DEBUG

### Log không xuất hiện?
→ Check xem đã import `updateAuthorScore` chưa

### Điểm không cập nhật?
→ Check Terminal, xem có log `🎯 BẮT ĐẦU CẬP NHẬT` không

### Feed vẫn lặp lại?
→ Check Frontend có truyền `seenIds` đúng format không

### Feed thiếu bài?
→ Check Terminal log `📊 TỶ LỆ 60/40` xem có fallback không

---

## ✨ HOÀN TẤT!

Hệ thống đã sẵn sàng! Bạn chỉ cần:
1. ✅ Chèn `updateAuthorScore` vào 3 API (Like/Comment/Save)
2. ✅ Frontend truyền `seenIds` khi call `/api/posts`
3. ✅ Restart server và test!

---

**Developed with ❤️ for KLTN Social & Recommend Project**
