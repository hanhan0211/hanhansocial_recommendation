# 🔍 HƯỚNG DẪN HOÀN CHỈNH - TRANG KHÁM PHÁ CÁ NHÂN HÓA

## 📋 TỔNG QUAN

Tích hợp tính năng **"✨ Dành riêng cho bạn"** vào trang Khám phá với:
- ✅ Giữ nguyên 100% giao diện hiện tại (Search, History, Trending Hashtags)
- ✅ Thêm section mới với bài viết gợi ý cá nhân hóa
- ✅ Infinite scroll với Load More
- ✅ Không lặp lại bài đã xem

---

## 🎯 THUẬT TOÁN 2 TẦNG

```
┌─────────────────────────────────────────────────────────────┐
│              EXPLORE PAGE - PERSONALIZED FEED               │
├─────────────────────────────────────────────────────────────┤
│  BỘ LỌC: Loại trừ chính mình + Following                   │
├─────────────────────────────────────────────────────────────┤
│  50% │ Tầng 1: Cá nhân hóa                                  │
│      │ - Lấy từ tác giả người lạ có điểm cao               │
│      │ - Tối đa 2 bài/tác giả                              │
├──────┼──────────────────────────────────────────────────────┤
│  50% │ Tầng 2: Thịnh hành (Trending)                       │
│      │ - Sắp xếp theo like + comment                       │
│      │ - Từ người lạ chưa follow                           │
├──────┴──────────────────────────────────────────────────────┤
│  🔀 Shuffle ngẫu nhiên (Fisher-Yates)                       │
│  🚫 Loại trừ bài đã xem ($nin: seenIds)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## ✅ BACKEND - ĐÃ HOÀN THÀNH

### 1. Model UserPreference
- **File:** `backend/src/models/UserPreference.js` ✅
- Lưu điểm tương tác giữa user và tác giả

### 2. Service Tính Điểm
- **File:** `backend/src/services/recommendService.js` ✅
- Hàm `updateAuthorScore()` - Cập nhật điểm tự động
- Hàm `getTopRecommendedAuthors()` - Lấy top tác giả

### 3. Controller Explore
- **File:** `backend/src/controllers/postController.js` ✅
- Hàm `getExplorePosts()` - API mới cho trang khám phá
- Endpoint: `GET /api/posts/explore`

### 4. Route
- **File:** `backend/src/routes/postRoutes.js` ✅
- Đã thêm route `router.get("/explore", protect, getExplorePosts);`

---

## 🎨 FRONTEND - CÁCH TÍCH HỢP

### FILE CẦN SỬA: `frontend/src/pages/ExplorePage.jsx`

#### BƯỚC 1: Thêm State (Dòng ~50)

```javascript
// Thêm vào phần khai báo state
const [explorePosts, setExplorePosts] = useState([]);
const [explorePage, setExplorePage] = useState(1);
const [exploreSeenIds, setExploreSeenIds] = useState([]);
const [exploreHasMore, setExploreHasMore] = useState(true);
const [exploreLoading, setExploreLoading] = useState(false);
```

---

#### BƯỚC 2: Thêm Hàm Fetch (Sau hàm `fetchTrendingHashtags`)

```javascript
// Hàm lấy bài viết cho trang khám phá
const fetchExplorePosts = async (isLoadMore = false) => {
  if (!isLoadMore) {
    setExploreLoading(true);
  }

  try {
    const token = localStorage.getItem('token');
    if (!token) return;

    const params = new URLSearchParams({
      limit: 10,
      seenIds: exploreSeenIds.join(',')
    });

    const res = await api.get(`posts/explore?${params}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const newPosts = res.data.posts || [];

    if (isLoadMore) {
      setExplorePosts(prev => [...prev, ...newPosts]);
    } else {
      setExplorePosts(newPosts);
    }

    setExploreSeenIds(prev => [...prev, ...newPosts.map(p => p._id)]);
    setExploreHasMore(res.data.hasMore);
    setExplorePage(prev => prev + 1);

  } catch (err) {
    console.error('Lỗi khi tải bài viết khám phá:', err);
  } finally {
    setExploreLoading(false);
  }
};
```

---

#### BƯỚC 3: Gọi Hàm trong useEffect

Tìm `useEffect` hiện có và thêm:

```javascript
} else {
  fetchTrendingHashtags();
  fetchSearchHistory();
  fetchExplorePosts(); // ⭐ THÊM DÒNG NÀY
}
```

---

#### BƯỚC 4: Thêm UI Section

Tìm khối **"🔥 Xu hướng hiện tại"** và thêm section sau **NGAY BÊN DƯỚI**:

```jsx
{/* Danh sách 🔥 Xu hướng hiện tại */}
<div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
  {/* ... code hiện có ... */}
</div>

{/* ⭐ THÊM SECTION MỚI Ở ĐÂY ⭐ */}
<div className="bg-gradient-to-br from-white via-pink-50/20 to-violet-50/20 rounded-[32px] p-6 shadow-sm border border-pink-100/50">
  <div className="flex items-center justify-between mb-6">
    <div className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center text-white animate-pulse">
        ✨
      </div>
      <h2 className="text-[18px] font-black text-slate-900">Dành riêng cho bạn</h2>
    </div>
    <span className="text-[12px] font-bold px-3 py-1.5 bg-white/80 backdrop-blur-sm border border-pink-200 text-pink-600 rounded-full shadow-sm">
      Cá nhân hóa
    </span>
  </div>

  <p className="text-[13.5px] text-slate-500 mb-6 leading-relaxed">
    Những bài viết được gợi ý dựa trên sở thích và tương tác của bạn
  </p>

  {exploreLoading && explorePosts.length === 0 ? (
    <div className="py-10 flex flex-col items-center justify-center">
      <FiLoader className="animate-spin text-3xl text-pink-500 mb-2" />
      <p className="text-slate-400 text-[13px]">Đang tìm bài viết phù hợp với bạn...</p>
    </div>
  ) : explorePosts.length === 0 ? (
    <div className="bg-white/60 rounded-2xl p-8 text-center border border-slate-100">
      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
        <FiCompass className="text-slate-400" size={24} />
      </div>
      <h3 className="font-bold text-slate-800 text-[15px]">Chưa có gợi ý</h3>
      <p className="text-slate-400 text-[12.5px] mt-1.5 leading-relaxed">
        Tương tác với nhiều bài viết hơn để nhận gợi ý cá nhân hóa!
      </p>
    </div>
  ) : (
    <>
      <div className="flex flex-col gap-6">
        {explorePosts.map((post) => renderPostCard(post))}
      </div>

      {exploreHasMore && (
        <div className="mt-6 text-center">
          <button
            onClick={() => fetchExplorePosts(true)}
            disabled={exploreLoading}
            className="px-6 py-3 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl font-bold text-[14px] shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/30 transition duration-300 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
          >
            {exploreLoading ? (
              <>
                <FiLoader className="animate-spin" size={18} />
                Đang tải...
              </>
            ) : (
              <>
                <FiCompass size={18} />
                Khám phá thêm
              </>
            )}
          </button>
        </div>
      )}

      {!exploreHasMore && explorePosts.length > 0 && (
        <div className="mt-6 text-center py-4 px-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-[13px] font-medium">
            🎉 Bạn đã xem hết tất cả gợi ý! Hãy quay lại sau để khám phá thêm.
          </p>
        </div>
      )}
    </>
  )}
</div>
```

---

## 🧪 TEST HOÀN CHỈNH

### 1. Khởi động Backend & Frontend

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Test Flow

1. **Đăng nhập** vào tài khoản
2. **Vào trang Explore** (`/explore`)
3. **Kiểm tra:**
   - ✅ Thanh tìm kiếm vẫn hoạt động
   - ✅ Lịch sử tìm kiếm hiển thị đúng
   - ✅ Xu hướng hashtag hiển thị đúng
   - ✅ Section "✨ Dành riêng cho bạn" xuất hiện
   - ✅ Hiển thị 10 bài viết gợi ý
4. **Scroll xuống** và click "Khám phá thêm"
5. **Kiểm tra:**
   - ✅ Load thêm 10 bài mới
   - ✅ Không lặp lại bài cũ
   - ✅ Nút hiển thị "Đang tải..." khi loading

### 3. Kiểm tra Console Log (Backend)

```
═══════════════════════════════════════════════════════════════════════════════
🔍 BẮT ĐẦU XỬ LÝ TRANG KHÁM PHÁ
═══════════════════════════════════════════════════════════════════════════════
📊 THÔNG SỐ REQUEST:
   • User ID:     6a1459f01dd220086b434caf
   • Limit:       10
   • Seen IDs:    0 bài đã xem

🔍 BƯỚC 2: Lấy danh sách Following (để loại trừ)...
   ✅ Following:   5 người
   ✅ Loại trừ:    6 người (bản thân + following)

🎯 BƯỚC 3: Tầng 1 - Lấy bài từ tác giả có điểm cao...
   • Recommended Authors: 3 tác giả
   ✅ Tầng 1: 5 bài cá nhân hóa

🔥 BƯỚC 4: Tầng 2 - Lấy bài thịnh hành...
   ✅ Tầng 2: 5 bài thịnh hành

🔀 BƯỚC 5: Xáo trộn 10 bài viết...
   ✅ Đã shuffle xong

📈 THỐNG KÊ:
   • Tổng bài khám phá:     847
   • Đã xem trước đó:       0
   • Trả về lần này:        10
   • Còn bài để tải:        CÓ
═══════════════════════════════════════════════════════════════════════════════
```

---

## 🎨 GIAO DIỆN TRANG EXPLORE

```
┌──────────────────────────────────────────────┐
│  🔍 KHÁM PHÁ                 [← Quay lại]    │
├──────────────────────────────────────────────┤
│                                               │
│  🔎 [Tìm kiếm mọi người, bài viết, hashtag] │
│                                               │
├──────────────────────────────────────────────┤
│  🕐 Tìm kiếm gần đây          [Xóa tất cả]  │
│  ┌──────┬──────┬──────┬──────┐              │
│  │ tag1 │ tag2 │ tag3 │ tag4 │              │
│  └──────┴──────┴──────┴──────┘              │
├──────────────────────────────────────────────┤
│  🔥 Xu hướng hiện tại                        │
│  ┌──────────────┬──────────────┐            │
│  │ 1. #travel   │ 2. #food     │            │
│  │ 847 bài đăng │ 523 bài đăng │            │
│  ├──────────────┼──────────────┤            │
│  │ 3. #music    │ 4. #coding   │            │
│  │ 412 bài đăng │ 389 bài đăng │            │
│  └──────────────┴──────────────┘            │
├──────────────────────────────────────────────┤
│  ✨ Dành riêng cho bạn        [Cá nhân hóa] │
│  Những bài viết được gợi ý dựa trên sở thích│
│                                               │
│  ┌────────────────────────────────────────┐ │
│  │ Post 1 (Cá nhân hóa)                   │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ Post 2 (Thịnh hành)                    │ │
│  └────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────┐ │
│  │ Post 3 (Cá nhân hóa)                   │ │
│  └────────────────────────────────────────┘ │
│                                               │
│        [🔍 Khám phá thêm]                    │
└──────────────────────────────────────────────┘
```

---

## 📊 SO SÁNH TRƯỚC/SAU

### TRƯỚC (Chỉ có Trending Hashtags):
```
/explore
  ├── Search Bar
  ├── Search History
  └── 🔥 Trending Hashtags (4-8 tags)
```

### SAU (Thêm Personalized Feed):
```
/explore
  ├── Search Bar
  ├── Search History
  ├── 🔥 Trending Hashtags (4-8 tags)
  └── ✨ Dành riêng cho bạn (10+ posts)
       ├── Cá nhân hóa (50%)
       ├── Thịnh hành (50%)
       ├── Load More button
       └── Infinite Scroll
```

---

## 🐛 TROUBLESHOOTING

### Lỗi 1: Section không hiển thị
**Kiểm tra:**
- State `explorePosts` đã khai báo chưa?
- Hàm `fetchExplorePosts()` có được gọi trong useEffect không?
- Console có log lỗi không?

### Lỗi 2: Bài viết lặp lại
**Kiểm tra:**
- `seenIds` có được truyền đúng trong API call không?
- `setExploreSeenIds()` có cập nhật sau mỗi lần fetch không?

### Lỗi 3: API trả về 401
**Giải pháp:**
- Kiểm tra token trong localStorage
- Đăng nhập lại nếu token hết hạn

### Lỗi 4: Không có bài gợi ý
**Nguyên nhân:**
- User chưa có dữ liệu tương tác (bảng UserPreference rỗng)
- User đã follow tất cả tác giả có điểm cao

**Giải pháp:**
- Tương tác với một số bài viết (like, comment, save)
- Refresh lại trang sau vài phút

---

## ✨ TÍNH NĂNG BONUS

### 1. Refresh Gợi Ý
Thêm nút refresh để lấy gợi ý mới:

```jsx
<button
  onClick={() => {
    setExploreSeenIds([]);
    setExplorePosts([]);
    fetchExplorePosts();
  }}
  className="..."
>
  🔄 Làm mới
</button>
```

### 2. Filter Loại Bài Viết
Thêm filter chỉ hiển thị bài có ảnh/video:

```javascript
const filteredPosts = explorePosts.filter(post => 
  post.images && post.images.length > 0
);
```

---

## 📈 KẾT QUẢ

✅ Trang Explore hoàn chỉnh với 2 nguồn content:
1. **Trending** - Xu hướng chung
2. **Personalized** - Cá nhân hóa dựa trên điểm tương tác

✅ UX tốt hơn:
- Khám phá nội dung mới phù hợp sở thích
- Không lặp lại bài cũ
- Load more mượt mà

✅ Backend thông minh:
- Loại trừ following tự động
- Kết hợp 2 tầng cá nhân hóa + trending
- Shuffle để đa dạng

---

**🎉 HOÀN TẤT! Hãy restart server và trải nghiệm tính năng mới!**
