import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios';
import {
  FiSearch, FiTrash2, FiRefreshCw, FiFileText, FiHeart,
  FiMessageCircle, FiChevronLeft, FiChevronRight, FiAlertTriangle, FiX,
  FiEye, FiEyeOff, FiBell
} from 'react-icons/fi';

/* ── Helpers ── */
const fmt = (d) => {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
};

const truncate = (str, n = 80) =>
  str && str.length > n ? str.slice(0, n) + '…' : (str || '');

/* ── Confirm Modal ── */
const ConfirmModal = ({ post, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-[scaleIn_0.2s_ease-out]">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
          <FiAlertTriangle size={20} className="text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="font-black text-[16px] text-slate-900">Xóa bài viết?</h3>
          <p className="text-slate-500 text-[13px] mt-1 leading-relaxed">
            Bạn có chắc muốn xóa bài viết này cùng toàn bộ bình luận, lượt thích và thông báo liên quan?
            <br /><span className="text-red-500 font-semibold">Hành động này không thể hoàn tác.</span>
          </p>
          {post?.content && (
            <p className="mt-3 px-3 py-2 bg-slate-50 rounded-lg text-[12px] text-slate-600 border-l-2 border-slate-300 italic">
              "{truncate(post.content, 100)}"
            </p>
          )}
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 cursor-pointer">
          <FiX size={18} />
        </button>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition cursor-pointer"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[13px] font-semibold transition cursor-pointer"
        >
          Xóa bài viết
        </button>
      </div>
    </div>
  </div>
);

/* ── Warn Modal ── */
const WarnModal = ({ post, reason, setReason, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-[scaleIn_0.2s_ease-out]">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <FiBell size={20} className="text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-black text-[16px] text-slate-900">Cảnh cáo người dùng</h3>
          <p className="text-slate-500 text-[13px] mt-1 leading-relaxed">
            Gửi cảnh cáo đến <strong>@{post?.userId?.username}</strong> về bài viết này.
          </p>
        </div>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 cursor-pointer">
          <FiX size={18} />
        </button>
      </div>
      <div className="mt-4">
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Nhập lý do cảnh cáo..."
          className="w-full h-24 p-3 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-amber-400 resize-none transition"
        ></textarea>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={onCancel}
          className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-semibold hover:bg-slate-50 transition cursor-pointer"
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          disabled={loading || !reason.trim()}
          className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-[13px] font-semibold transition cursor-pointer flex items-center justify-center"
        >
          {loading ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Gửi cảnh cáo'}
        </button>
      </div>
    </div>
  </div>
);

/* ── View Details Modal ── */
const ViewDetailsModal = ({ post, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
    <div className="bg-white w-full max-w-[580px] rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[90vh]">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <FiEye className="text-violet-500" size={18} />
          <h3 className="text-[17px] font-black text-slate-900">Chi tiết bài viết</h3>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full transition cursor-pointer"
        >
          <FiX size={16} />
        </button>
      </div>
      <div className="p-6 overflow-y-auto space-y-5 text-[14px]">
        {/* Tác giả */}
        <div className="flex items-center gap-3 mb-4">
          <img src={post.userId?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.userId?.username||'U')}&background=ede9fe&color=7c3aed`} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
          <div>
            <p className="font-bold text-slate-800">{post.userId?.fullname || post.userId?.username}</p>
            <p className="text-[12px] text-slate-500">@{post.userId?.username}</p>
          </div>
        </div>
        
        {/* Text */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-slate-800 break-words whitespace-pre-wrap leading-relaxed">
          {post.content || <span className="text-slate-400 italic">[Không có văn bản]</span>}
        </div>

        {/* Tags */}
        {post.hashtags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {post.hashtags.map(tag => (
              <span key={tag} className="text-[12px] text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full font-semibold">#{tag}</span>
            ))}
          </div>
        )}

        {/* Hình ảnh / Video */}
        {post.images?.length > 0 && (
          <div>
            <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-2">Media đính kèm ({post.images.length})</p>
            <div className="grid grid-cols-2 gap-3">
              {post.images.map((img, index) => {
                const isVideo = img.match(/\.(mp4|webm|ogg)$/i) || img.includes('video');
                if (isVideo) {
                  return (
                    <video key={index} src={img} controls className="rounded-xl w-full h-32 object-cover border border-slate-100 shadow-sm bg-black" />
                  );
                }
                return (
                  <img key={index} src={img} alt="Post media" className="rounded-xl w-full h-32 object-cover border border-slate-100 shadow-sm" />
                );
              })}
            </div>
          </div>
        )}

        {/* Tương tác */}
        <div className="border-t border-slate-100 pt-4 flex gap-6 text-[13px]">
          <div className="flex items-center gap-2 text-rose-500 font-bold">
            <FiHeart size={16} /> {post.likeCount} lượt thích
          </div>
          <div className="flex items-center gap-2 text-blue-500 font-bold">
            <FiMessageCircle size={16} /> {post.commentCount} bình luận
          </div>
        </div>
      </div>
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-[13px] hover:bg-slate-100 transition cursor-pointer">
          Đóng
        </button>
      </div>
    </div>
  </div>
);

/* ── Main Component ── */
const PostManagement = () => {
  const [posts, setPosts]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]           = useState(0);
  
  // Modals state
  const [deleting, setDeleting]     = useState(null); // postId đang xóa
  const [modal, setModal]           = useState(null); // post object cần xóa
  
  const [warnModal, setWarnModal]   = useState(null); // post object to warn
  const [warnReason, setWarnReason] = useState('');
  const [sendingWarn, setSendingWarn] = useState(false);
  
  const [viewModal, setViewModal]   = useState(null); // post object to view details
  const [togglingVisibility, setTogglingVisibility] = useState(null); // postId

  const [triggerFetch, setTriggerFetch] = useState(false);

  /* Fetch posts */
  const fetchPosts = useCallback(async (q = search, pg = currentPage) => {
    setLoading(true);
    try {
      const res = await api.get('/admin/posts', { params: { page: pg, limit: 15, search: q } });
      setPosts(res.data.posts);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
      setCurrentPage(res.data.currentPage);
    } catch (e) {
      console.error('Lỗi tải bài viết:', e);
    } finally {
      setLoading(false);
    }
  }, [currentPage, search]);

  useEffect(() => {
    fetchPosts(search, currentPage);
  }, [currentPage, triggerFetch]);

  /* Handlers */
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    fetchPosts(search, 1);
  };

  const handleReset = () => {
    setSearch("");
    setCurrentPage(1);
    fetchPosts("");
  };

  const goPage = (pg) => {
    if (pg < 1 || pg > totalPages) return;
    setCurrentPage(pg);
  };

  /* Delete flow */
  const openModal  = (post) => setModal(post);
  const closeModal = () => setModal(null);

  const handleDelete = async () => {
    if (!modal) return;
    const postId = modal._id;
    closeModal();
    setDeleting(postId);
    try {
      await api.delete(`/admin/posts/${postId}`);
      setPosts(prev => prev.filter(p => p._id !== postId));
      setTotal(prev => prev - 1);
    } catch (e) {
      alert(e.response?.data?.message || 'Lỗi khi xóa bài viết');
    } finally {
      setDeleting(null);
    }
  };

  /* Hide/Unhide flow */
  const handleToggleVisibility = async (postId) => {
    setTogglingVisibility(postId);
    try {
      const res = await api.put(`/admin/posts/${postId}/toggle-visibility`);
      setPosts(prev => prev.map(p => p._id === postId ? { ...p, isHidden: res.data.isHidden } : p));
    } catch (e) {
      alert(e.response?.data?.message || 'Lỗi khi ẩn/hiện bài viết');
    } finally {
      setTogglingVisibility(null);
    }
  };

  /* Warn flow */
  const openWarnModal = (post) => { setWarnModal(post); setWarnReason(''); };
  const closeWarnModal = () => { setWarnModal(null); setWarnReason(''); };

  const handleSendWarn = async () => {
    if (!warnModal || !warnReason.trim()) return;
    setSendingWarn(true);
    try {
      await api.post(`/admin/posts/${warnModal._id}/warn`, { reason: warnReason });
      closeWarnModal();
      // Optional: show a toast instead of alert
    } catch (e) {
      alert(e.response?.data?.message || 'Lỗi khi gửi cảnh cáo');
    } finally {
      setSendingWarn(false);
    }
  };

  /* View details flow */
  const openViewModal = (post) => setViewModal(post);
  const closeViewModal = () => setViewModal(null);

  return (
    <div className="p-8">
      {/* Confirm Modal */}
      {modal && <ConfirmModal post={modal} onConfirm={handleDelete} onCancel={closeModal} />}
      
      {/* Warn Modal */}
      {warnModal && <WarnModal post={warnModal} reason={warnReason} setReason={setWarnReason} onConfirm={handleSendWarn} onCancel={closeWarnModal} loading={sendingWarn} />}

      {/* View Modal */}
      {viewModal && <ViewDetailsModal post={viewModal} onCancel={closeViewModal} />}

      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[26px] font-black text-slate-900">Quản lý Bài viết</h1>
          <p className="text-slate-500 text-[14px] mt-1">
            Kiểm duyệt và xóa nội dung vi phạm trong hệ thống
          </p>
        </div>
        <span className="bg-slate-100 text-slate-600 text-[13px] font-semibold px-3 py-1.5 rounded-xl">
          {total} bài viết
        </span>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <form onSubmit={handleSearch} className="relative w-72">
            <button type="submit" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-600 transition cursor-pointer">
              <FiSearch size={15} />
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo nội dung hoặc tên người đăng..."
              className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-violet-400 w-full transition"
            />
          </form>
          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white transition cursor-pointer"
            title="Làm mới (Reset)"
          >
            <FiRefreshCw size={15} />
          </button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center items-center py-28">
            <div className="w-10 h-10 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-24">
            <FiFileText size={40} className="mx-auto text-slate-200 mb-3" />
            <p className="text-slate-400 text-[14px]">Không tìm thấy bài viết nào.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Người đăng</th>
                  <th className="text-left px-6 py-3 max-w-xs">Nội dung</th>
                  <th className="text-left px-6 py-3">Tương tác</th>
                  <th className="text-left px-6 py-3">Ngày đăng</th>
                  <th className="text-left px-6 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {posts.map(post => {
                  const author    = post.userId;
                  const thumbnail = post.images?.[0];
                  const isVideo   = thumbnail && (thumbnail.includes('.mp4') || thumbnail.includes('video'));
                  const isDeleting = deleting === post._id;

                  return (
                    <tr key={post._id} className={`hover:bg-slate-50/70 transition-colors ${isDeleting ? 'opacity-40 pointer-events-none' : ''} ${post.isHidden ? 'bg-slate-100/50 opacity-60' : ''}`}>
                      {/* Author */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={author?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author?.username||'U')}&background=ede9fe&color=7c3aed`}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                            alt={author?.username}
                            onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(author?.username||'U')}&background=ede9fe&color=7c3aed`; }}
                          />
                          <div>
                            <p className="font-semibold text-[13px] text-slate-900">{author?.fullname || author?.username}</p>
                            <p className="text-[11px] text-slate-400">@{author?.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Content + thumbnail */}
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex items-start gap-3">
                          {/* Thumbnail */}
                          {thumbnail && (
                            <div className="flex-shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                              {isVideo ? (
                                <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                  <span className="text-white text-[16px]">▶</span>
                                </div>
                              ) : (
                                <img
                                  src={thumbnail}
                                  alt="thumb"
                                  className="w-full h-full object-cover"
                                  onError={e => { e.target.style.display = 'none'; }}
                                />
                              )}
                            </div>
                          )}
                          {/* Text */}
                          <div className="min-w-0">
                            <p className="text-[13px] text-slate-700 leading-relaxed">
                              {truncate(post.content)}
                            </p>
                            {post.images?.length > 1 && (
                              <span className="text-[11px] text-slate-400 mt-0.5 block">+{post.images.length - 1} ảnh</span>
                            )}
                            {post.hashtags?.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {post.hashtags.slice(0, 3).map(tag => (
                                  <span key={tag} className="text-[10px] text-violet-500 bg-violet-50 px-1.5 py-0.5 rounded-full">#{tag}</span>
                                ))}
                              </div>
                            )}
                            {post.isHidden && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-md">Đang ẩn</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Interactions */}
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="flex items-center gap-1.5 text-[12px] text-rose-500">
                            <FiHeart size={12} /> {post.likeCount}
                          </span>
                          <span className="flex items-center gap-1.5 text-[12px] text-blue-500">
                            <FiMessageCircle size={12} /> {post.commentCount}
                          </span>
                        </div>
                      </td>

                      {/* Date */}
                      <td className="px-6 py-4 text-[13px] text-slate-500 whitespace-nowrap">
                        {fmt(post.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 flex-wrap w-48">
                          {/* Xem chi tiết */}
                          <button
                            onClick={() => openViewModal(post)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <FiEye size={14} />
                          </button>
                          
                          {/* Ẩn / Hiện */}
                          <button
                            onClick={() => handleToggleVisibility(post._id)}
                            disabled={togglingVisibility === post._id}
                            className={`p-1.5 rounded-lg transition cursor-pointer flex items-center justify-center ${
                              post.isHidden 
                                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300' 
                                : 'text-slate-500 hover:bg-slate-200'
                            }`}
                            title={post.isHidden ? "Đang ẩn (Click để hiện)" : "Đang hiện (Click để ẩn)"}
                          >
                            {togglingVisibility === post._id ? (
                                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : post.isHidden ? (
                                <FiEyeOff size={14} />
                            ) : (
                                <FiEye size={14} />
                            )}
                          </button>

                          {/* Cảnh cáo */}
                          <button
                            onClick={() => openWarnModal(post)}
                            className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-100 transition cursor-pointer"
                            title="Cảnh cáo người dùng"
                          >
                            <FiBell size={14} />
                          </button>

                          {/* Xóa bài */}
                          <button
                            onClick={() => openModal(post)}
                            disabled={isDeleting}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold
                              bg-red-50 text-red-600 hover:bg-red-500 hover:text-white
                              transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ml-auto"
                          >
                            {isDeleting ? (
                              <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <FiTrash2 size={12} />
                            )}
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[12px] text-slate-400">
            Trang <span className="font-semibold text-slate-600">{currentPage}</span> / {totalPages}
            &nbsp;·&nbsp; {total} bài viết
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => goPage(currentPage - 1)}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <FiChevronLeft size={16} />
            </button>
            {/* Page numbers */}
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pg = totalPages <= 7 ? i + 1 : (() => {
                if (currentPage <= 4) return i + 1;
                if (currentPage >= totalPages - 3) return totalPages - 6 + i;
                return currentPage - 3 + i;
              })();
              return (
                <button
                  key={pg}
                  onClick={() => goPage(pg)}
                  className={`w-7 h-7 rounded-lg text-[12px] font-semibold transition cursor-pointer ${
                    pg === currentPage
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pg}
                </button>
              );
            })}
            <button
              onClick={() => goPage(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostManagement;
