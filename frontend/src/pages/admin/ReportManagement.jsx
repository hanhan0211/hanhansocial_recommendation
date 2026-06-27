import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import { useSocket } from '../../context/SocketContext';
import {
  FiShield, FiAlertTriangle, FiFlag, FiSearch, FiRefreshCw,
  FiTrash2, FiCheck, FiX, FiCheckCircle, FiAlertCircle, FiEye
} from 'react-icons/fi';

/* ── Helpers ── */
const fmt = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
};

const getSafeAvatar = (avatarUrl, fallbackName, updatedAt) => {
  if (avatarUrl && avatarUrl.trim() !== "") {
    return updatedAt ? `${avatarUrl}?t=${new Date(updatedAt).getTime()}` : avatarUrl;
  }
  const name = fallbackName || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fbcfe8&color=be185d`;
};

/* ── Toast mini-system ── */
let _toastId = 0;
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'success') => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, push, remove };
};

/* ── Toast container ── */
const ToastContainer = ({ toasts, remove }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map(({ id, msg, type }) => (
      <div
        key={id}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold pointer-events-auto
          animate-[slideInRight_0.3s_ease-out]
          ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
      >
        {type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
        <span>{msg}</span>
        <button onClick={() => remove(id)} className="ml-1 opacity-70 hover:opacity-100 cursor-pointer">
          <FiX size={14} />
        </button>
      </div>
    ))}
  </div>
);

const ReportManagement = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'post' | 'comment'
  const { socket } = useSocket();
  
  // Modals state
  const [confirmResolveReport, setConfirmResolveReport] = useState(null); // report object to delete
  const [previewContent, setPreviewContent] = useState(null); // report object to preview
  const [resolvingId, setResolvingId] = useState(null);
  const [dismissingId, setDismissingId] = useState(null);

  const { toasts, push, remove } = useToast();

  const fetchReports = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const res = await api.get('/admin/reports');
      setReports(res.data);
      if (isBackground) {
        push('Có báo cáo vi phạm mới vừa được gửi tới!', 'success');
      }
    } catch (err) {
      push('Không thể tải danh sách báo cáo vi phạm', 'error');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Lắng nghe sự kiện báo cáo mới thời gian thực từ Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewReport = () => {
      console.log("🔌 Socket: Phát hiện có báo cáo vi phạm mới, đang tự động cập nhật danh sách...");
      fetchReports(true);
    };

    socket.on('new-report', handleNewReport);

    return () => {
      socket.off('new-report', handleNewReport);
    };
  }, [socket]);

  const handleReset = () => {
    setSearch('');
    setActiveTab('all');
    fetchReports();
  };

  /* 1. BỎ QUA BÁO CÁO (Dismiss) */
  const handleDismissReport = async (reportId) => {
    setDismissingId(reportId);
    try {
      await api.delete(`/admin/reports/${reportId}/dismiss`);
      // Lọc dòng vừa thao tác ra khỏi state
      setReports(prev => prev.filter(r => r._id !== reportId));
      push('Đã bỏ qua báo cáo thành công', 'success');
    } catch (err) {
      push(err.response?.data?.message || 'Lỗi khi bỏ qua báo cáo', 'error');
    } finally {
      setDismissingId(null);
    }
  };

  /* 2. XÓA NỘI DUNG VI PHẠM (Resolve) */
  const handleResolveReport = async () => {
    if (!confirmResolveReport) return;
    const reportId = confirmResolveReport._id;
    setResolvingId(reportId);
    try {
      await api.delete(`/admin/reports/${reportId}/resolve`);
      // Lọc dòng vừa thao tác ra khỏi state
      setReports(prev => prev.filter(r => r._id !== reportId));
      push('Đã xóa tận gốc nội dung vi phạm thành công', 'success');
      setConfirmResolveReport(null);
    } catch (err) {
      push(err.response?.data?.message || 'Lỗi khi xóa nội dung vi phạm', 'error');
    } finally {
      setResolvingId(null);
    }
  };

  // Tính toán thống kê
  const stats = {
    total: reports.length,
    posts: reports.filter(r => r.type === 'post').length,
    comments: reports.filter(r => r.type === 'comment').length,
  };

  // Lọc tìm kiếm & Tab phân loại
  const filtered = reports.filter(r => {
    const matchesSearch = 
      r.reason?.toLowerCase().includes(search.toLowerCase()) ||
      r.reportedBy?.username?.toLowerCase().includes(search.toLowerCase()) ||
      r.reportedBy?.fullname?.toLowerCase().includes(search.toLowerCase()) ||
      (r.postId?.content && r.postId.content.toLowerCase().includes(search.toLowerCase())) ||
      (r.commentId?.content && r.commentId.content.toLowerCase().includes(search.toLowerCase()));

    const matchesTab = activeTab === 'all' ? true : r.type === activeTab;

    return matchesSearch && matchesTab;
  });

  return (
    <div className="p-8">
      <ToastContainer toasts={toasts} remove={remove} />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center">
            <FiFlag size={20} />
          </div>
          <div>
            <h1 className="text-[26px] font-black text-slate-900 leading-tight">Quản lý Báo cáo vi phạm</h1>
            <p className="text-slate-500 text-[14.5px] mt-0.5">Xử lý tập trung bài viết và bình luận bị người dùng tố cáo</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Tổng số báo cáo', value: stats.total, icon: <FiFlag size={20} />, color: 'violet', filterTab: 'all' },
          { label: 'Báo cáo Bài viết', value: stats.posts, icon: <FiAlertTriangle size={20} />, color: 'emerald', filterTab: 'post' },
          { label: 'Báo cáo Bình luận', value: stats.comments, icon: <FiShield size={20} />, color: 'amber', filterTab: 'comment' },
        ].map(({ label, value, icon, color, filterTab }) => (
          <button
            key={label}
            onClick={() => setActiveTab(filterTab)}
            className={`text-left bg-white rounded-2xl p-5 shadow-sm border flex items-center gap-4 hover:border-violet-400 transition cursor-pointer group ${
              activeTab === filterTab ? 'border-violet-500 ring-2 ring-violet-500/10' : 'border-slate-100'
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110
              ${color === 'violet' ? 'bg-violet-50 text-violet-600' : ''}
              ${color === 'emerald' ? 'bg-emerald-50 text-emerald-600' : ''}
              ${color === 'amber' ? 'bg-amber-50 text-amber-600' : ''}
            `}>
              {icon}
            </div>
            <div>
              <p className="text-slate-500 text-[13px] font-semibold">{label}</p>
              <p className="text-[28px] font-black text-slate-900 leading-none mt-0.5">
                {loading ? <span className="inline-block w-8 h-6 bg-slate-100 rounded animate-pulse" /> : value}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/20">
          <div className="flex items-center gap-3">
            <h2 className="font-bold text-[16px] text-slate-900">Danh sách báo cáo cần duyệt</h2>
            <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold text-slate-600">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${activeTab === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'hover:text-slate-900'}`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setActiveTab('post')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${activeTab === 'post' ? 'bg-emerald-500 text-white shadow-sm' : 'hover:text-slate-900'}`}
              >
                Bài viết
              </button>
              <button
                onClick={() => setActiveTab('comment')}
                className={`px-2.5 py-1 rounded-md transition cursor-pointer ${activeTab === 'comment' ? 'bg-amber-500 text-white shadow-sm' : 'hover:text-slate-900'}`}
              >
                Bình luận
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm nội dung, lý do, username..."
                className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-violet-400 w-64 transition"
              />
            </div>
            <button
              onClick={handleReset}
              className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-200 transition cursor-pointer"
              title="Làm mới"
            >
              <FiRefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="flex justify-center items-center py-28">
            <div className="w-10 h-10 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-bold uppercase tracking-wider text-left border-b border-slate-100">
                  <th className="px-6 py-3.5">Phân loại</th>
                  <th className="px-6 py-3.5 w-[35%]">Nội dung bị tố cáo</th>
                  <th className="px-6 py-3.5 w-[30%]">Thông tin báo cáo</th>
                  <th className="px-6 py-3.5">Thời gian nhận</th>
                  <th className="px-6 py-3.5 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(report => {
                  const isPost = report.type === 'post';
                  const reportedUser = report.reportedBy;
                  
                  return (
                    <tr key={report._id} className="hover:bg-slate-50/50 transition">
                      {/* Cột 1: Phân loại */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black tracking-wide uppercase transition-all shadow-sm ${
                          isPost
                            ? 'bg-emerald-50 border border-emerald-100 text-emerald-600'
                            : 'bg-amber-50 border border-amber-100 text-amber-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isPost ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                          {isPost ? 'Bài viết' : 'Bình luận'}
                        </span>
                      </td>

                      {/* Cột 2: Nội dung tố cáo */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {isPost && report.postId?.images?.length > 0 && (
                            <img
                              src={report.postId.images[0]}
                              className="w-11 h-11 rounded-lg object-cover flex-shrink-0 border border-slate-100 shadow-sm"
                              alt="Thumbnail"
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] text-slate-800 line-clamp-2 leading-relaxed break-words">
                              {isPost
                                ? (report.postId?.content || <span className="text-slate-400 italic font-medium">[Bài viết không có chữ, chỉ có ảnh/video]</span>)
                                : (report.commentId?.content || <span className="text-red-500 font-bold italic">[Bình luận gốc đã bị xóa hoặc không tìm thấy]</span>)
                              }
                            </p>
                            <button
                              onClick={() => setPreviewContent(report)}
                              className="mt-1 flex items-center gap-1 text-[11px] text-violet-600 font-bold hover:text-violet-800 transition cursor-pointer"
                            >
                              <FiEye size={12} /> Xem đầy đủ
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Cột 3: Người báo cáo & Lý do */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={getSafeAvatar(reportedUser?.avatar, reportedUser?.username, reportedUser?.updatedAt)}
                            className="w-7 h-7 rounded-full object-cover border border-slate-100"
                            alt="Reporter avatar"
                          />
                          <div className="min-w-0">
                            <p className="text-[12.5px] font-bold text-slate-800 leading-tight">
                              {reportedUser?.fullname || reportedUser?.username || 'Ẩn danh'}
                            </p>
                            <p className="text-[11.5px] text-slate-400">@{reportedUser?.username || 'user'}</p>
                          </div>
                        </div>
                        <p className="text-[12.5px] text-slate-500 mt-2 font-medium">
                          Lý do: <span className="font-extrabold text-rose-600">{report.reason}</span>
                        </p>
                      </td>

                      {/* Cột 4: Thời gian nhận */}
                      <td className="px-6 py-4 text-[12.5px] text-slate-500">
                        {fmt(report.createdAt)}
                      </td>

                      {/* Cột 5: Hành động */}
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDismissReport(report._id)}
                            disabled={dismissingId === report._id || resolvingId === report._id}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 text-[12px] font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            title="Bỏ qua báo cáo vi phạm"
                          >
                            {dismissingId === report._id ? (
                              <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <><FiCheck size={13} /> Bỏ qua</>
                            )}
                          </button>
                          <button
                            onClick={() => setConfirmResolveReport(report)}
                            disabled={dismissingId === report._id || resolvingId === report._id}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white text-[12px] font-bold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                            title="Xóa nội dung vi phạm tận gốc"
                          >
                            <FiTrash2 size={13} /> Xóa nội dung
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && !loading && (
              <div className="text-center py-20 bg-slate-50/10">
                <FiFlag className="mx-auto text-slate-200 mb-3" size={40} />
                <p className="text-slate-400 text-[14px] font-semibold">Tuyệt vời! Không có báo cáo vi phạm nào.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-100 text-[12px] text-slate-400 flex items-center justify-between bg-slate-50/20">
          <span>Đang hiển thị <span className="font-semibold text-slate-600">{filtered.length}</span> / {reports.length} báo cáo</span>
          <span className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-400 rounded-full inline-block" /> {stats.posts} Bài viết</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-400 rounded-full inline-block" /> {stats.comments} Bình luận</span>
          </span>
        </div>
      </div>

      {/* ──────────────── MODAL PREVIEW CHI TIẾT ──────────────── */}
      {previewContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-[580px] rounded-[28px] shadow-2xl border border-slate-100 overflow-hidden relative flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <FiEye className="text-violet-500" size={18} />
                <h3 className="text-[17px] font-black text-slate-900">Chi tiết nội dung bị tố cáo</h3>
              </div>
              <button
                onClick={() => setPreviewContent(null)}
                className="w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full transition cursor-pointer"
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-[14px]">
              <div>
                <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-2">Loại nội dung</p>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase ${
                  previewContent.type === 'post' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {previewContent.type === 'post' ? 'Bài viết' : 'Bình luận'}
                </span>
              </div>

              <div>
                <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-2">Nội dung chi tiết</p>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 text-slate-800 break-words whitespace-pre-wrap leading-relaxed">
                  {previewContent.type === 'post'
                    ? (previewContent.postId?.content || <span className="text-slate-400 italic">[Không có văn bản]</span>)
                    : (previewContent.commentId?.content || <span className="text-red-500 font-bold italic">[Không tìm thấy nội dung bình luận]</span>)
                  }
                </div>
              </div>

              {previewContent.type === 'post' && previewContent.postId?.images?.length > 0 && (
                <div>
                  <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-2">Media đính kèm ({previewContent.postId.images.length})</p>
                  <div className="grid grid-cols-2 gap-3">
                    {previewContent.postId.images.map((img, index) => {
                      const isVideo = img.match(/\.(mp4|webm|ogg)$/i) || img.includes('video');
                      if (isVideo) {
                        return (
                          <video
                            key={index}
                            src={img}
                            controls
                            className="rounded-xl w-full h-32 object-cover border border-slate-100 shadow-sm bg-black"
                          />
                        );
                      }
                      return (
                        <img
                          key={index}
                          src={img}
                          alt="Post media attachment"
                          className="rounded-xl w-full h-32 object-cover border border-slate-100 shadow-sm"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-4 flex gap-6 text-[13px]">
                <div className="flex-1">
                  <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">Người tố cáo</p>
                  <p className="font-bold text-slate-800">@{previewContent.reportedBy?.username || 'user'}</p>
                </div>
                <div className="flex-1">
                  <p className="text-[12px] text-slate-400 font-bold uppercase tracking-wider mb-1">Lý do báo cáo</p>
                  <p className="font-extrabold text-rose-600">{previewContent.reason}</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setPreviewContent(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 font-bold text-[13px] hover:bg-slate-100 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────────── MODAL XÁC NHẬN XÓA NỘI DUNG ──────────────── */}
      {confirmResolveReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-[420px] rounded-[28px] p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setConfirmResolveReport(null)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full transition cursor-pointer"
            >
              <FiX size={18} />
            </button>
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center">
                <FiTrash2 size={20} />
              </div>
              <h3 className="text-[18px] font-black text-slate-900">Xác nhận xóa tận gốc</h3>
            </div>
            <p className="text-[13.5px] text-slate-500 mb-6 leading-relaxed">
              Bạn có chắc chắn muốn xóa vĩnh viễn {confirmResolveReport.type === 'post' ? 'Bài viết này cùng toàn bộ các bình luận liên quan' : 'Bình luận này và các câu trả lời con'}? Hành động này **không thể phục hồi**!
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmResolveReport(null)}
                className="flex-1 py-3 rounded-2xl border border-slate-200 text-[14px] font-bold text-slate-500 hover:bg-slate-50 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleResolveReport}
                disabled={resolvingId === confirmResolveReport._id}
                className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-[14px] font-bold transition disabled:bg-slate-300 shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {resolvingId === confirmResolveReport._id ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Đồng ý xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportManagement;
