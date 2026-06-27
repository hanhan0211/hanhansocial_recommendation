# 🎨 HƯỚNG DẪN TÍCH HỢP EXPLORE PAGE - FRONTEND

## 📝 CÁC BƯỚC THỰC HIỆN

### BƯỚC 1: Thêm State Mới vào ExplorePage.jsx

Tìm dòng khai báo state hiện có (khoảng dòng 45-60) và thêm các state sau:

```javascript
// ===== THÊM CÁC STATE MỚI CHO EXPLORE POSTS =====
const [explorePosts, setExplorePosts] = useState([]);
const [explorePage, setExplorePage] = useState(1);
const [exploreSeenIds, setExploreSeenIds] = useState([]);
const [exploreHasMore, setExploreHasMore] = useState(true);
const [exploreLoading, setExploreLoading] = useState(false);
```

---

### BƯỚC 2: Thêm Hàm Fetch Explore Posts

Thêm hàm này sau các hàm fetch hiện có (sau `fetchTrendingHashtags`):

```javascript
// ===== HÀM LẤY BÀI VIẾT CHO TRANG KHÁM PHÁ =====
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

    // Cập nhật seenIds
    setExploreSeenIds(prev => [
      ...prev,
      ...newPosts.map(p => p._id)
    ]);

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

### BƯỚC 3: Gọi Hàm trong useEffect

Tìm `useEffect` hiện có và cập nhật như sau:

```javascript
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    navigate('/login');
    return;
  }

  if (tag) {
    fetchHashtagPosts();
    fetchSaved();
    setSearchResults(null);
    setSearchQuery('');
  } else {
    fetchTrendingHashtags();
    fetchSearchHistory();
    fetchExplorePosts(); // ⭐ THÊM DÒNG NÀY
  }
}, [tag, navigate, currentUser?.username]);
```

---

### BƯỚC 4: Thêm Section "✨ Dành riêng cho bạn"

Tìm đoạn code hiển thị "🔥 Xu hướng hiện tại" (khoảng dòng 700-750) và thêm section mới **NGAY SAU** khối đó:

```javascript
{/* Danh sách 🔥 Xu hướng hiện tại */}
<div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
  <div className="flex items-center gap-2 mb-6">
    <FiTrendingUp className="text-pink-500" size={22} />
    <h2 className="text-[18px] font-black text-slate-900">🔥 Xu hướng hiện tại</h2>
  </div>
  
  {/* ... code xu hướng hashtag hiện có ... */}
</div>

{/* ===== THÊM SECTION MỚI Ở ĐÂY ===== */}
{/* Section: ✨ Dành riêng cho bạn */}
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
      {/* Danh sách bài viết Explore */}
      <div className="flex flex-col gap-6">
        {explorePosts.map((post) => renderPostCard(post))}
      </div>

      {/* Nút Load More */}
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

      {/* Thông báo hết bài */}
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

### BƯỚC 5: Import Thêm Icon (nếu chưa có)

Kiểm tra dòng import icons ở đầu file, đảm bảo có đủ các icon sau:

```javascript
import {
  FiCompass,
  FiArrowLeft,
  FiLoader,
  FiSearch,
  // ... các icon khác ...
} from 'react-icons/fi';
```

---

## ✅ KẾT QUẢ MONG ĐỢI

Sau khi hoàn thành các bước trên, trang Explore sẽ có:

1. ✅ **Thanh tìm kiếm** (giữ nguyên)
2. ✅ **Lịch sử tìm kiếm** (giữ nguyên)
3. ✅ **🔥 Xu hướng hiện tại** (giữ nguyên)
4. ✨ **✨ Dành riêng cho bạn** (MỚI - Cá nhân hóa)
   - Hiển thị bài viết gợi ý dựa trên điểm tương tác
   - Nút "Khám phá thêm" để load more
   - Infinite scroll
   - Không lặp lại bài đã xem (nhờ seenIds)

---

## 🎯 FLOW HOẠT ĐỘNG

```
User vào /explore
    ↓
1. Hiển thị Hashtag xu hướng
2. Hiển thị Lịch sử tìm kiếm
    ↓
3. GỌI API /api/posts/explore
    ↓
4. Backend tính toán:
   - 50% bài từ tác giả có điểm cao (cá nhân hóa)
   - 50% bài thịnh hành (trending)
   - Trộn ngẫu nhiên
    ↓
5. Hiển thị section "✨ Dành riêng cho bạn"
    ↓
6. User scroll xuống → Click "Khám phá thêm"
    ↓
7. Gọi lại API với seenIds để không lặp
    ↓
8. Append bài mới vào danh sách
```

---

## 🐛 XỬ LÝ LỖI

### Lỗi: "Cannot read property 'map' of undefined"
**Nguyên nhân:** State `explorePosts` chưa được khởi tạo  
**Giải pháp:** Kiểm tra dòng `const [explorePosts, setExplorePosts] = useState([]);`

### Lỗi: Bài viết lặp lại khi load more
**Nguyên nhân:** `seenIds` không được cập nhật  
**Giải pháp:** Kiểm tra dòng `setExploreSeenIds(prev => [...prev, ...newPosts.map(p => p._id)]);`

### Lỗi: API trả về 401 Unauthorized
**Nguyên nhân:** Token không hợp lệ hoặc hết hạn  
**Giải pháp:** Kiểm tra `localStorage.getItem('token')` và đăng nhập lại

---

## 📱 RESPONSIVE

Section "✨ Dành riêng cho bạn" tự động responsive nhờ Tailwind CSS:
- **Mobile**: Hiển thị 1 cột
- **Tablet**: Hiển thị 1 cột
- **Desktop**: Hiển thị 1 cột (giống PostCard)

---

## 🎨 CUSTOMIZATION

### Thay đổi số lượng bài viết mỗi lần load:
```javascript
const params = new URLSearchParams({
  limit: 15, // Thay đổi từ 10 → 15
  seenIds: exploreSeenIds.join(',')
});
```

### Thay đổi tỷ lệ Cá nhân hóa / Trending:
Vào file Backend `postController.js`, thay đổi:
```javascript
const personalizedLimit = Math.ceil(limit * 0.7); // 70% cá nhân hóa
const trendingLimit = limit - personalizedPosts.length; // 30% trending
```

---

## ✨ HOÀN TẤT!

Sau khi thực hiện các bước trên, khởi động lại server và test:

```bash
# Backend
cd backend
npm start

# Frontend (tab mới)
cd frontend
npm run dev
```

Truy cập `/explore` và enjoy! 🚀
