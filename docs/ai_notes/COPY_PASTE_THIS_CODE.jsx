// ═══════════════════════════════════════════════════════════════════════════
// BƯỚC 1: THÊM CÁC STATE SAU VÀO DÒNG ~70 (SAU CÁC STATE HIỆN CÓ)
// ═══════════════════════════════════════════════════════════════════════════

// Explore Posts States - GỢI Ý BÀI VIẾT
const [explorePosts, setExplorePosts] = useState([]);
const [exploreSeenIds, setExploreSeenIds] = useState([]);
const [exploreHasMore, setExploreHasMore] = useState(true);
const [exploreLoading, setExploreLoading] = useState(false);


// ═══════════════════════════════════════════════════════════════════════════
// BƯỚC 2: THÊM HÀM NÀY SAU HÀM fetchTrendingHashtags (KHOẢNG DÒNG ~140)
// ═══════════════════════════════════════════════════════════════════════════

// Lấy bài viết gợi ý cho trang khám phá
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

  } catch (err) {
    console.error('Lỗi khi tải bài viết khám phá:', err);
  } finally {
    setExploreLoading(false);
  }
};


// ═══════════════════════════════════════════════════════════════════════════
// BƯỚC 3: TÌM useEffect HIỆN CÓ (KHOẢNG DÒNG ~190) VÀ SỬA THÀNH NHƯ SAU:
// ═══════════════════════════════════════════════════════════════════════════

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


// ═══════════════════════════════════════════════════════════════════════════
// BƯỚC 4: TÌM KHỐI "🔥 Xu hướng hiện tại" (KHOẢNG DÒNG 700-750)
//         VÀ THÊM CODE JSX BÊN DƯỚI NGAY SAU NÓ
// ═══════════════════════════════════════════════════════════════════════════

{/* Danh sách 🔥 Xu hướng hiện tại */}
<div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
  <div className="flex items-center gap-2 mb-6">
    <FiTrendingUp className="text-pink-500" size={22} />
    <h2 className="text-[18px] font-black text-slate-900">🔥 Xu hướng hiện tại</h2>
  </div>

  {trendingHashtags.length === 0 ? (
    <div className="py-10 text-center text-slate-400 text-[13.5px]">
      Chưa có xu hướng hashtag nào được ghi nhận.
    </div>
  ) : (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {trendingHashtags.map((hashtag, idx) => (
        <Link
          key={hashtag._id || hashtag.name}
          to={`/explore/${encodeURIComponent(hashtag.name)}`}
          className="group p-4 bg-slate-50 hover:bg-gradient-to-tr hover:from-pink-50 hover:to-violet-50 border border-slate-100 hover:border-pink-200 rounded-2xl flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow"
        >
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 font-black text-[14px] flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition duration-300">
              {idx + 1}
            </span>
            <span className="font-bold text-[15px] text-slate-800 group-hover:text-pink-600 transition">
              #{hashtag.name}
            </span>
          </div>
          <span className="text-[12px] font-bold px-3 py-1 bg-white border border-slate-100 text-slate-500 rounded-full group-hover:border-pink-200 group-hover:text-pink-500 transition">
            {hashtag.count || 0} bài đăng
          </span>
        </Link>
      ))}
    </div>
  )}
</div>

{/* ⭐⭐⭐ THÊM CODE NÀY NGAY BÊN DƯỚI ⭐⭐⭐ */}
{/* Section: ✨ Dành riêng cho bạn - HIỂN THỊ TẤT CẢ BÀI VIẾT */}
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
      {/* Danh sách bài viết */}
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
