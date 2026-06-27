# 🧪 HƯỚNG DẪN TEST NHANH EXPLORE TABBED UI

## 🚀 Khởi động

```bash
# Terminal 1: Backend
cd backend
npm start

# Terminal 2: Frontend
cd frontend
npm run dev
```

## ✅ CHECKLIST TEST

### 1. Test Tab "🔥 Thịnh hành" (Mặc định)
- [ ] Vào `http://localhost:5173/explore`
- [ ] Tab "🔥 Thịnh hành" được active (text màu hồng, gạch chân hồng)
- [ ] Hiển thị danh sách hashtags
- [ ] Click vào 1 hashtag → Chuyển sang `/explore/:tag`
- [ ] Nút Back → Quay lại tab "🔥 Thịnh hành"

### 2. Test Tab "✨ Dành cho bạn"
- [ ] Click vào tab "✨ Dành cho bạn"
- [ ] Gạch chân chuyển sang màu tím (violet)
- [ ] Hiển thị loading spinner (nếu lần đầu)
- [ ] Hiển thị 10 bài viết gợi ý
- [ ] Mỗi bài có: Avatar, username, nội dung, ảnh, nút Like/Comment/Share/Bookmark

### 3. Test Load More
- [ ] Scroll xuống tab "✨ Dành cho bạn"
- [ ] Click nút "Khám phá thêm"
- [ ] Loading spinner hiển thị
- [ ] Load thêm 10 bài mới
- [ ] Không lặp lại bài cũ
- [ ] Khi hết bài → Hiển thị "🎉 Bạn đã xem hết..."

### 4. Test Chuyển Tab
- [ ] Từ "🔥 Thịnh hành" → "✨ Dành cho bạn" → Mượt mà
- [ ] Từ "✨ Dành cho bạn" → "🔥 Thịnh hành" → Hashtags vẫn còn (không reload)
- [ ] Quay lại "✨ Dành cho bạn" → Bài viết vẫn còn (không reload)

### 5. Test Tính năng Search (Không bị ảnh hưởng)
- [ ] Gõ vào thanh search
- [ ] Kết quả hiển thị với tabs: Tất cả, Người dùng, Bài viết, Hashtag
- [ ] Click vào user → Chuyển sang profile
- [ ] Xóa search → Quay lại giao diện tabs "🔥 Thịnh hành"

### 6. Test Responsive
- [ ] Resize browser → Tabs vẫn đẹp
- [ ] Mobile view: Tabs nằm ngang, text rõ ràng
- [ ] Hashtags grid: Desktop 2 cột, Mobile 1 cột

### 7. Test Tương tác bài viết
- [ ] Tab "✨ Dành cho bạn" → Like 1 bài
- [ ] Comment 1 bài
- [ ] Save 1 bài
- [ ] Reload trang → Kiểm tra bài viết gợi ý có thay đổi không

## 🐛 CÁC LỖI THƯỜNG GẶP

### Lỗi 1: Tab không chuyển được
**Nguyên nhân**: State `exploreTab` chưa được khai báo
**Giải pháp**: Kiểm tra dòng ~57 có `const [exploreTab, setExploreTab] = useState('trending');`

### Lỗi 2: Bài viết không load
**Nguyên nhân**: useEffect không gọi `fetchExplorePosts()`
**Giải pháp**: Kiểm tra dòng ~210 có useEffect theo dõi `exploreTab`

### Lỗi 3: Gạch chân tab không hiển thị
**Nguyên nhân**: CSS gradient không render
**Giải pháp**: Kiểm tra `className` có `absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r...`

### Lỗi 4: Backend 401 Unauthorized
**Nguyên nhân**: Token hết hạn
**Giải pháp**: Logout → Login lại

## 📊 TEST PERFORMANCE

### Test 1: Thời gian load trang
- [ ] Vào `/explore` → Đo thời gian
- [ ] **Kỳ vọng**: < 1 giây (chỉ load hashtags)

### Test 2: Thời gian chuyển tab
- [ ] Click tab "✨ Dành cho bạn" → Đo thời gian
- [ ] **Kỳ vọng**: < 2 giây (API call + render)

### Test 3: Thời gian load more
- [ ] Click "Khám phá thêm" → Đo thời gian
- [ ] **Kỳ vọng**: < 1.5 giây

## 🎯 DEMO CHO GIẢNG VIÊN

### Kịch bản demo:

**Bước 1**: Mở trang Explore
```
"Đây là trang Khám phá với giao diện Tabbed UI mới, 
giúp người dùng dễ dàng chuyển đổi giữa Hashtags và 
Bài viết gợi ý cá nhân hóa"
```

**Bước 2**: Giới thiệu tab "🔥 Thịnh hành"
```
"Tab mặc định hiển thị các hashtag thịnh hành.
Người dùng có thể click vào để xem chi tiết"
```
→ Click vào 1 hashtag → Hiển thị bài viết theo tag

**Bước 3**: Quay lại và chuyển tab "✨ Dành cho bạn"
```
"Khi user click vào tab này, hệ thống sẽ gọi API 
để gợi ý bài viết dựa trên điểm tương tác"
```
→ Hiển thị loading → Hiển thị 10 bài

**Bước 4**: Giải thích thuật toán
```
"Hệ thống sử dụng thuật toán 2 tầng:
- 50% từ tác giả có điểm tương tác cao
- 50% từ bài viết thịnh hành (like + comment)
- Loại trừ: Bài của chính mình và người đang follow"
```

**Bước 5**: Demo Load More
```
"User có thể click 'Khám phá thêm' để xem thêm.
Hệ thống đảm bảo không lặp lại bài đã xem"
```
→ Click nút → Load thêm 10 bài

**Bước 6**: Highlight ưu điểm
```
"Ưu điểm:
✅ Giao diện tabs chuyên nghiệp
✅ Lazy loading tối ưu performance
✅ Smooth animation
✅ Không ảnh hưởng tính năng search"
```

## 🎊 KẾT QUẢ MONG ĐỢI

Sau khi test xong, bạn sẽ có:
- ✅ Explore Page với 2 tabs rõ ràng
- ✅ Chuyển đổi mượt mà, không lag
- ✅ Bài viết gợi ý cá nhân hóa hoạt động
- ✅ Load more không lặp lại
- ✅ UI đẹp, responsive

**Sẵn sàng ghi điểm tuyệt đối! 🚀**
