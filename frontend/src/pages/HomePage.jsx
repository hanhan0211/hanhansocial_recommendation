import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import {
  FiHome, FiSearch, FiHeart,
  FiPlusSquare, FiSend, FiMessageCircle, FiBookmark, FiMoreHorizontal, FiPlus,
  FiEdit2, FiTrash2, FiShare2, FiX, FiChevronLeft, FiChevronRight, FiTrendingUp,
  FiShield, FiFlag, FiUserMinus, FiCopy, FiCompass, FiCheckCircle
} from 'react-icons/fi';
import { BsPlayBtn } from 'react-icons/bs';
import { FaConnectdevelop } from "react-icons/fa";
import SearchBar from '../components/SearchBar';
import CreatePostModal from '../components/CreatePostModal';
import SuggestedUsers from '../components/SuggestedUsers';
import BookmarkButton from '../components/BookmarkButton';
import ShareModal from '../components/ShareModal';
import NotificationBadge from '../components/NotificationBadge'; 
import PostDropdown from '../components/PostDropdown'; 
import { renderContentWithHashtags } from '../components/PostCard';
import CommentItem from '../components/CommentItem';

// ================= COMPONENT CAROUSEL (CÔNG NGHỆ CHẶN KHỰNG VIDEO & TIM NEON) =================
const ImageCarousel = ({ images, postId, handleLikePost, posts, currentUser, isPopup = false }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [heartData, setHeartData] = useState({ show: false, x: 0, y: 0 });
  const [isPlaying, setIsPlaying] = useState(true); 
  
  const heartTimeoutRef = useRef(null);
  const videoRef = useRef(null);
  const clickTimeoutRef = useRef(null); 

  const validImages = images
    ? images.filter(img => img && typeof img === 'string' && img.trim() !== '')
    : [];

  // Đảm bảo video luôn phát/dừng theo biến isPlaying kể cả khi re-render
  useEffect(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, currentIndex]);

  if (validImages.length === 0) return null;

  // Xử lý Click đơn: Chờ 250ms để xem user có bấm cú thứ 2 không
  const handleSingleClick = (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);

    clickTimeoutRef.current = setTimeout(() => {
      setIsPlaying(prev => !prev);
    }, 250); 
  };

  // Xử lý Click đúp: Bắn tim và Like nếu chưa Like
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
    
    // Tìm bài viết để check trạng thái Like
    const targetPost = posts?.find(p => p._id === postId);
    const isAlreadyLiked = targetPost?.likes?.includes(currentUser?._id);

    // Chỉ bắn tim và gọi API nếu bài viết CHƯA được Like (Like mới)
    if (!isAlreadyLiked) {
      setIsPlaying(true); 
      if (heartTimeoutRef.current) clearTimeout(heartTimeoutRef.current);
      
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setHeartData({ show: true, x, y });
      
      heartTimeoutRef.current = setTimeout(() => {
        setHeartData(prev => ({ ...prev, show: false }));
      }, 800);

      if (postId && handleLikePost) {
        handleLikePost(postId);
      }
    } else {
      // Nếu đã like rồi, bấm đúp chỉ đơn giản là tiếp tục phát video, không làm gì thêm
      setIsPlaying(true);
    }
  };

  const prevSlide = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? validImages.length - 1 : prev - 1));
  };

  const nextSlide = (e) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === validImages.length - 1 ? 0 : prev + 1));
  };

  const checkIsVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|mov|webm|ogg)$/i) || url.includes('/video/upload/');
  };

  const currentMediaUrl = validImages[currentIndex];
  const isVideo = checkIsVideo(currentMediaUrl);
  const containerHeight = isPopup ? "h-full w-full" : "w-full aspect-[4/5] max-h-[550px]";

  return (
    <div 
      className={`relative bg-slate-950 rounded-[24px] overflow-hidden flex items-center justify-center select-none ${containerHeight}`}
      onClick={isVideo ? handleSingleClick : undefined}
      onDoubleClick={handleDoubleClick}
    >
      {isVideo ? (
        <>
          <video 
            ref={videoRef}
            src={currentMediaUrl} 
            muted
            loop
            playsInline
          className="w-full h-full object-cover transition-all duration-300 bg-black pointer-events-none"
          />
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none z-10">
              <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center text-slate-900 shadow-lg"><BsPlayBtn size={32} className="ml-1" /></div>
            </div>
          )}
        </>
      ) : (
        <img
          src={currentMediaUrl}
          alt="post-media"
          className="w-full h-full object-cover transition-all duration-300 pointer-events-none"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent && !parent.querySelector('.img-error-msg')) {
              const msg = document.createElement('p');
              msg.className = 'img-error-msg text-slate-500 text-sm';
              msg.textContent = 'Không tải được ảnh';
              parent.appendChild(msg);
            }
          }}
        />
      )}

      {heartData.show && (
        <div className="absolute pointer-events-none z-30 -translate-x-1/2 -translate-y-1/2" style={{ left: `${heartData.x}px`, top: `${heartData.y}px` }}>
          <FiHeart className="text-rose-500 fill-rose-500 text-[110px] animate-heartbeat-glow" strokeWidth={1.5} />
        </div>
      )}

      {validImages.length > 1 && (
        <>
          <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md transition cursor-pointer z-20"><FiChevronLeft size={20} /></button>
          <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-800 shadow-md transition cursor-pointer z-20"><FiChevronRight size={20} /></button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20 bg-black/20 px-2 py-1 rounded-full backdrop-blur-sm pointer-events-none">
            {validImages.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-pink-500' : 'w-1.5 bg-white/60'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const HomePage = () => {
  const navigate = useNavigate();
  const { subscribeUnreadCountUpdate, socket } = useSocket();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const myName = currentUser?.username || "Người dùng ẩn danh";
  const myAvatar = (currentUser?.avatar && currentUser.avatar.trim() !== "") 
    ? currentUser.avatar 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=fbcfe8&color=be185d`;

  const [posts, setPosts] = useState([]);
  const [savedPostIds, setSavedPostIds] = useState(() => new Set());
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [sharePost, setSharePost] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // State phục vụ Report bài viết
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportPostId, setReportPostId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);

  // State phục vụ Mock Edit bài viết
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [editContent, setEditContent] = useState("");

  // Hàm sao chép liên kết
  const handleCopyLink = (postId) => {
    const link = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        alert("Đã sao chép liên kết bài viết vào bộ nhớ tạm!");
      })
      .catch(() => {
        // Fallback
        const textarea = document.createElement("textarea");
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        alert("Đã sao chép liên kết bài viết vào bộ nhớ tạm!");
      });
    setActiveMenuId(null);
  };

  // Hàm Bỏ theo dõi (gọi API /api/users/:id/follow)
  const handleUnfollowUser = async (targetUserId) => {
    if (!window.confirm("Bạn có chắc chắn muốn bỏ theo dõi người này không?")) return;
    try {
      const token = localStorage.getItem('token');
      await api.put(`users/${targetUserId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Đã thay đổi trạng thái theo dõi người dùng này!");
      fetchFeed(true);
      setActiveMenuId(null);
    } catch (error) {
      alert("Lỗi khi thay đổi trạng thái theo dõi: " + (error.response?.data?.message || error.message));
    }
  };

  // Mở modal báo cáo
  const handleOpenReport = (postId) => {
    setReportPostId(postId);
    setReportReason("");
    setIsReportModalOpen(true);
    setActiveMenuId(null);
  };

  // Gửi báo cáo bài viết
  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      alert("Vui lòng chọn hoặc nhập lý do báo cáo!");
      return;
    }
    setSubmittingReport(true);
    try {
      const token = localStorage.getItem('token');
      await api.post(`posts/${reportPostId}/report`, { reason: reportReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Báo cáo vi phạm thành công! Cảm ơn đóng góp của bạn.");
      setIsReportModalOpen(false);
      setReportPostId(null);
      setReportReason("");
    } catch (error) {
      alert("Lỗi gửi báo cáo: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmittingReport(false);
    }
  };

  // Mở modal sửa bài viết
  const handleOpenEdit = (post) => {
    setEditPostId(post._id);
    setEditContent(post.content || "");
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  // Lưu mock sửa bài viết
  const handleSaveEdit = () => {
    if (!editContent.trim()) {
      alert("Nội dung bài viết không được để trống!");
      return;
    }
    // Update local post content
    setPosts(prev => prev.map(p => p._id === editPostId ? { ...p, content: editContent } : p));
    alert("Cập nhật bài viết thành công!");
    setIsEditModalOpen(false);
  };

  const sentinelRef = useRef(null);   // trigger load thêm
  const isFetchingRef = useRef(false); // chống gọi đồng thời
  const shownIdsRef = useRef(new Set()); // track ID đã hiển (gửi lên backend để exclude)

  // ─── Key localStorage (scope theo user để nhiều tài khoản không bị dính nhau) ───
  const seenIdsStorageKey = `feed_seenIds_${currentUser?._id || 'guest'}`;

  // ─── Hàm lưu seenIds vào localStorage (TTL 48 giờ) ────────────────────────
  const saveSeenIdsToStorage = (idsSet) => {
    try {
      const payload = {
        ids: Array.from(idsSet),
        expiry: Date.now() + 48 * 60 * 60 * 1000, // 48 giờ
      };
      localStorage.setItem(seenIdsStorageKey, JSON.stringify(payload));
    } catch (e) { /* quota exceeded – bỏ qua */ }
  };

  // ─── Hàm đọc seenIds từ localStorage (tự xóa nếu hết hạn) ───────────────
  const loadSeenIdsFromStorage = () => {
    try {
      const raw = localStorage.getItem(seenIdsStorageKey);
      if (!raw) return new Set();
      const { ids, expiry } = JSON.parse(raw);
      if (Date.now() > expiry) {
        localStorage.removeItem(seenIdsStorageKey);
        return new Set();
      }
      return new Set(ids);
    } catch (e) {
      return new Set();
    }
  };

  const [openCommentPostId, setOpenCommentPostId] = useState(null);
  const [postComments, setPostComments] = useState({});
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});

  // State phục vụ Báo cáo & Xóa bình luận ở Trang chủ
  const [reportingComment, setReportingComment] = useState(null);
  const [commentReportReason, setCommentReportReason] = useState("");
  const [submittingCommentReport, setSubmittingCommentReport] = useState(false);


  const getSafeAvatar = (userObj) => {
    if (userObj?.avatar && userObj.avatar.trim() !== "") return userObj.avatar;
    const name = userObj?.username || "User";
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fbcfe8&color=be185d`;
  };

  const handleLogout = () => {
    if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/login');
    }
  };

  const handlePostCreated = (newPost) => {
    if (newPost?._id) {
      shownIdsRef.current.add(newPost._id);
      saveSeenIdsToStorage(shownIdsRef.current); // Lưu ngay để reload không hiện lại
    }
    setPosts(prev => [newPost, ...prev]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenShare = (post) => {
    setActiveMenuId(null);
    setSharePost(post);
  };

  const handleCloseShare = () => setSharePost(null);

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Bạn có chắc muốn xóa bài viết này không?")) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.filter(post => post._id !== postId));
      setActiveMenuId(null);
      if (openCommentPostId === postId) setOpenCommentPostId(null);
    } catch (error) { alert("Lỗi khi xóa bài viết!"); }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Đã xóa bình luận thành công!");
      
      setPostComments(prev => {
        const updated = { ...prev };
        for (const postId in updated) {
          updated[postId] = updated[postId]
            .filter(c => c._id !== commentId)
            .map(c => ({
              ...c,
              replies: c.replies ? c.replies.filter(r => r._id !== commentId) : []
            }));
        }
        return updated;
      });
    } catch (error) {
      alert("Lỗi khi xóa bình luận: " + (error.response?.data?.message || error.message));
    }
  };

  const handleReportComment = async () => {
    if (!commentReportReason.trim()) {
      alert("Vui lòng chọn hoặc nhập lý do báo cáo!");
      return;
    }
    setSubmittingCommentReport(true);
    try {
      const token = localStorage.getItem('token');
      await api.post(`comments/${reportingComment._id}/report`, { reason: commentReportReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Báo cáo bình luận vi phạm thành công! Cảm ơn đóng góp của bạn.");
      setReportingComment(null);
      setCommentReportReason("");
    } catch (error) {
      alert("Lỗi gửi báo cáo bình luận: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmittingCommentReport(false);
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.put(`posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.map(post => post._id === postId ? { ...post, likes: response.data } : post));
    } catch (error) { console.error("Lỗi thả tim", error); }
  };

  const isPostSaved = (postId) =>
    savedPostIds.has(postId?.toString?.() ?? String(postId));

  const fetchSavedPostIds = async () => {
    if (!currentUser?.username) return;
    try {
      const token = localStorage.getItem('token');
      const res = await api.get(
        `users/${currentUser.username}/saved-posts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const ids = new Set(
        (res.data.savedPosts || res.data.posts || []).map((item) =>
          (item._id || item).toString()
        )
      );
      setSavedPostIds(ids);
    } catch (error) {
      console.error("Lỗi tải danh sách đã lưu:", error);
    }
  };

  const handleToggleSavePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.put(
        `users/save-post/${postId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const ids = new Set(res.data.savedPosts.map((id) => id.toString()));
      setSavedPostIds(ids);
    } catch (error) {
      console.error("Lỗi lưu bài viết:", error);
      alert(error.response?.data?.message || "Không thể lưu bài viết");
    }
  };

  const toggleCommentSection = async (postId) => {
    setOpenCommentPostId(postId);
    setReplyingTo(null);
    setCommentText("");
    if (!postComments[postId]) {
      try {
        const response = await api.get(`comments/${postId}`);
        setPostComments(prev => ({ ...prev, [postId]: response.data }));
      } catch (error) { console.error("Lỗi lấy bình luận", error); }
    }
  };

  const toggleRepliesVisibility = (commentId) => {
    setExpandedReplies(prev => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handleSubmitComment = async (postId) => {
    if (!commentText.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const payload = { postId, content: commentText, parentId: replyingTo ? replyingTo.parentId : null };
      const response = await api.post('comments', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newComment = response.data;
      const currentComments = postComments[postId] || [];
      setPostComments(prev => {
        if (payload.parentId) {
          setExpandedReplies(expPrev => ({ ...expPrev, [payload.parentId]: true }));
          return { ...prev, [postId]: currentComments.map(c => c._id === payload.parentId ? { ...c, replies: [...(c.replies || []), newComment] } : c) };
        } else {
          return { ...prev, [postId]: [...currentComments, { ...newComment, replies: [] }] };
        }
      });
      setCommentText("");
      setReplyingTo(null); 
    } catch (error) { console.error("Lỗi gửi bình luận", error); }
  };

  // ─── Fetch feed: 60% following (mới nhất) + 40% recommended (đã tương tác) ──
  const fetchFeed = useCallback(async (isInitial = false) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;
    try {
      // Gửi toàn bộ seenIds lên để backend loại trừ bài đã xem
      const seenParam = Array.from(shownIdsRef.current).join(',');

      const url = seenParam
        ? `posts/feed?limit=10&seenIds=${seenParam}`
        : `posts/feed?limit=10`;

      const res = await api.get(url);
      const { posts: newPosts, hasMore: more } = res.data;

      // Cập nhật Set ID đã hiển + đồng bộ xuống localStorage
      newPosts.forEach(p => shownIdsRef.current.add(p._id));
      saveSeenIdsToStorage(shownIdsRef.current);

      setPosts(prev => {
        if (isInitial) return newPosts;
        const existingIds = new Set(prev.map(p => p._id));
        return [...prev, ...newPosts.filter(p => !existingIds.has(p._id))];
      });
      setHasMore(more);
    } catch (err) {
      if (isInitial) setError('Không thể tải bảng tin lúc này.');
    } finally {
      if (isInitial) setLoading(false);
      setLoadingMore(false);
      isFetchingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seenIdsStorageKey]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }

    // ── Tắt scroll restoration của browser + ép về đỉnh sau frame render đầu ──
    // Lý do cần cả 2: browser có thể restore scroll position SAU useEffect sync
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    // requestAnimationFrame đảm bảo scroll chạy SAU khi browser vẽ xong frame đầu tiên
    const rafId = requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    });

    // ── Khôi phục seenIds từ localStorage (để không hiện lại bài đã xem khi reload) ──
    shownIdsRef.current = loadSeenIdsFromStorage();
    fetchFeed(true);
    fetchSavedPostIds();

    api.get('messages/unread-count')
      .then(r => setUnreadCount(r.data.unreadCount || 0))
      .catch(() => {});

    const unsubscribe = subscribeUnreadCountUpdate((data) => {
      setUnreadCount(data.unreadCount || 0);
    });

    return () => {
      cancelAnimationFrame(rafId);
      if ('scrollRestoration' in history) {
        history.scrollRestoration = 'auto';
      }
      unsubscribe();
    };
  }, [navigate, subscribeUnreadCountUpdate, fetchFeed]);

  // Lắng nghe tín hiệu xóa bài viết & bình luận từ Admin qua Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleAdminDeletedPost = (deletedPostId) => {
      console.log(`🔌 Socket: Bài viết bị Admin xóa: ${deletedPostId}`);
      setPosts(prev => prev.filter(p => p._id !== deletedPostId));
    };

    const handleAdminDeletedComment = ({ postId, commentId }) => {
      console.log(`🔌 Socket: Bình luận bị Admin xóa: ${commentId} trong bài viết: ${postId}`);
      setPostComments(prev => {
        const updated = { ...prev };
        if (updated[postId]) {
          updated[postId] = updated[postId]
            .filter(c => c._id !== commentId)
            .map(c => ({
              ...c,
              replies: c.replies ? c.replies.filter(r => r._id !== commentId) : []
            }));
        }
        return updated;
      });
    };

    socket.on('admin-deleted-post', handleAdminDeletedPost);
    socket.on('admin-deleted-comment', handleAdminDeletedComment);

    return () => {
      socket.off('admin-deleted-post', handleAdminDeletedPost);
      socket.off('admin-deleted-comment', handleAdminDeletedComment);
    };
  }, [socket]);

  // ─── IntersectionObserver: load thêm khi cuộn đến cuối ───────────────────
  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
          setLoadingMore(true);
          fetchFeed(false); // false = load thêm (không reset)
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, fetchFeed]);

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  const activePost = posts.find(p => p._id === openCommentPostId);

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-slate-900 font-sans p-4 relative">
      <style>
        {`
          .hide-scroll::-webkit-scrollbar { display: none; }
          .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
          .animate-fade-in { animation: fadeIn 0.2s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
          @keyframes heartbeatGlow {
            0% { transform: scale(0) rotate(-5deg); opacity: 0; filter: drop-shadow(0 0 0px rgba(244, 63, 94, 0)); }
            20% { transform: scale(1.3) rotate(8deg); opacity: 1; filter: drop-shadow(0 0 25px rgba(244, 63, 94, 0.8)); }
            35% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 15px rgba(244, 63, 94, 0.6)); }
            50% { transform: scale(1.2) rotate(3deg); opacity: 1; filter: drop-shadow(0 0 35px rgba(244, 63, 94, 0.9)); }
            70% { transform: scale(1) rotate(0deg); opacity: 1; filter: drop-shadow(0 0 10px rgba(244, 63, 94, 0.5)); }
            100% { transform: scale(1.5) translateY(-20px); opacity: 0; filter: drop-shadow(0 0 0px rgba(244, 63, 94, 0)); }
          }
          .animate-heartbeat-glow { animation: heartbeatGlow 0.8s cubic-bezier(0.17, 0.89, 0.32, 1.28) forwards; }
        `}
      </style>

      {/* SIDEBAR */}
      <nav className="fixed top-4 bottom-4 left-4 w-[260px] bg-white rounded-[32px] shadow-sm flex flex-col py-8 px-4 z-40 border border-slate-100">
        <div className="flex items-center px-4 mb-10 cursor-pointer text-pink-600">
          <FaConnectdevelop className="text-[32px] flex-shrink-0" />
          <span className="ml-3 font-black text-[22px] tracking-tight whitespace-nowrap">HanHan Social</span>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <NavItem icon={<FiHome className="text-[22px]" />} text="Trang chủ" isActive />
          <div onClick={() => navigate('/messages')}>
            <NavItem icon={<FiSend className="text-[22px]" />} text="Tin nhắn" badge={unreadCount > 0 ? unreadCount.toString() : null} />
          </div>

<div onClick={() => setIsSearchOpen(true)}>
  <NavItem icon={<FiSearch className="text-[22px]" />} text="Tìm kiếm" isActive={isSearchOpen} />
</div>
{/* Panel SearchBar sẽ tự động trượt ra đè lên nội dung chính */}
      <SearchBar isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* Sidebar các mục khác */}
      <div onClick={() => navigate('/explore')}>
        <NavItem icon={<FiCompass className="text-[22px]" />} text="Khám phá" />
      </div>
      <NotificationBadge />
      <div onClick={() => setIsCreateModalOpen(true)}>
        <NavItem icon={<FiPlusSquare className="text-[22px]" />} text="Tạo mới" />
      </div>

      {/* ── ADMIN ONLY ── */}
      {currentUser?.role === 'admin' && (
        <div onClick={() => navigate('/admin/users')}>
          <NavItem
            icon={<FiShield className="text-[22px]" />}
            text="Trang Quản Trị"
            isAdmin
          />
        </div>
      )}

    </div> {/* end flex-col gap-2 */}

    {/* PHẦN PROFILE CỦA MÌNH Ở CUỐI SIDEBAR */}
    <div className="mt-auto pt-4 border-t border-slate-100">
      <Link to={`/profile/${currentUser?.username}`} className="block">
        <div className="flex items-center p-3 hover:bg-slate-50 rounded-2xl cursor-pointer transition">
          <img src={myAvatar} className="w-10 h-10 rounded-full object-cover shadow-sm" alt="My Profile" />
          <div className="ml-3 overflow-hidden">
            <p className="font-bold text-[14px] text-slate-900 truncate">{myName}</p>
            <p className="text-[12px] text-slate-500">Xem hồ sơ</p>
          </div>
        </div>
      </Link>
    </div>
  </nav>

  {/* MAIN FEED */}
  <main className="ml-[280px] flex justify-center pb-20">
    <div className="flex w-full max-w-[1150px] pt-4 px-4 justify-center gap-10">
      <div className="w-full max-w-[650px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20"><div className="w-12 h-12 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin mb-4"></div><p className="text-slate-500 font-medium">Đang tải bảng tin...</p></div>
        ) : error ? (
          <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-center border border-red-100">{error}</div>
        ) : (
          posts.map((post) => (
            <div key={post._id} className="bg-white rounded-[32px] p-5 shadow-sm mb-8 border border-slate-100 relative">
              <div className="flex justify-between items-center mb-4 px-2 relative">
                {/* HEADER BÀI VIẾT - GẮN LINK PROFILE NGƯỜI ĐĂNG */}
                <div className="flex items-center gap-3">
                  <Link to={`/profile/${post.userId?.username}`}>
                    <img src={getSafeAvatar(post.userId)} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 cursor-pointer" alt="author" />
                  </Link>
                  <div>
                    <Link to={`/profile/${post.userId?.username}`}>
                      <h3 className="font-bold text-[16px] text-slate-900 flex items-center gap-1 hover:text-pink-600 transition cursor-pointer">
                        {post.userId?.username || "Người dùng ẩn danh"}
                        {post.userId?.role === 'admin' && <span className="text-pink-500 text-[12px] bg-pink-50 p-1 rounded-full">✔</span>}
                      </h3>
                    </Link>
                    <p className="text-[13px] text-slate-500">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
                
                <PostDropdown
                  post={post}
                  currentUser={currentUser}
                  onDeletePost={(deletedPostId) => setPosts(prev => prev.filter(p => p._id !== deletedPostId))}
                  onOpenReport={handleOpenReport}
                  onOpenEdit={handleOpenEdit}
                  onOpenShare={handleOpenShare}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={setActiveMenuId}
                  fetchFeed={fetchFeed}
                />
              </div>
              
              <div className="px-2 mb-4"><p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">{renderContentWithHashtags(post.content)}</p></div>
              
              <div className="mb-5 px-1">
                <ImageCarousel 
                  images={post.images || (post.image ? [post.image] : [])} 
                  postId={post._id} 
                  handleLikePost={handleLikePost} 
                  posts={posts} 
                  currentUser={currentUser} 
                />
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-2xl relative z-0">
                <div className="flex gap-2">
                  {(() => {
                    const isLiked = post.likes?.includes(currentUser?._id);
                    return <button onClick={() => handleLikePost(post._id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition font-semibold text-[14px] cursor-pointer ${isLiked ? 'bg-pink-50 text-pink-600' : 'hover:bg-pink-50 text-slate-700 hover:text-pink-600'}`}><FiHeart className={`text-[20px] ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} /><span className="hidden sm:inline">{post.likes?.length || 0} Thích</span></button>;
                  })()}
                  <button onClick={() => toggleCommentSection(post._id)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-pink-50 text-slate-700 hover:text-pink-600 transition font-semibold text-[14px] cursor-pointer"><FiMessageCircle size={20} /> <span className="hidden sm:inline">Bình luận</span></button>
                  <button onClick={() => handleOpenShare(post)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-slate-200 text-slate-700 transition font-semibold text-[14px] cursor-pointer"><FiSend size={20} /> <span className="hidden sm:inline">Chia sẻ</span></button>
                </div>
                <BookmarkButton
                  isSaved={isPostSaved(post._id)}
                  onClick={() => handleToggleSavePost(post._id)}
                />
              </div>
            </div>
          ))
        )}

        {/* Empty State: Nếu không có bài viết nào (do đã xem hết hoặc database trống) */}
        {!loading && !error && posts.length === 0 && (
          <div className="bg-white rounded-[32px] p-10 shadow-sm border border-slate-100 text-center mt-4 mb-8">
            <div className="w-20 h-20 bg-pink-50 rounded-full flex items-center justify-center mx-auto mb-5">
              <FiCheckCircle className="text-pink-500 text-4xl" />
            </div>
            <h3 className="text-[19px] font-bold text-slate-900 mb-2">Bạn đã xem hết bảng tin!</h3>
            <p className="text-slate-500 text-[14.5px] mb-6 max-w-sm mx-auto leading-relaxed">
              Bạn đã cập nhật tất cả bài viết mới nhất. Bạn có muốn làm mới bảng tin để xem lại từ đầu không?
            </p>
            <button 
              onClick={() => {
                shownIdsRef.current = new Set();
                saveSeenIdsToStorage(new Set());
                setLoading(true);
                fetchFeed(true);
              }}
              className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-2xl transition shadow-lg shadow-pink-500/30 cursor-pointer"
            >
              Làm mới bảng tin
            </button>
          </div>
        )}

        {/* Sentinel: IntersectionObserver bắt event cuộn đến đây */}
        <div ref={sentinelRef} className="h-4" />

        {/* Spinner load thêm */}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-8 h-8 border-4 border-pink-200 border-t-pink-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Hết bài */}
        {!hasMore && !loading && posts.length > 0 && (
          <div className="flex flex-col items-center py-8 text-slate-400 text-[13px]">
            <div className="w-12 h-[1px] bg-slate-200 mb-3" />
            <p>Bạn đã xem hết tất cả bài viết 🎉</p>
          </div>
        )}
      </div>

      {/* CỘT PHẢI - GỢI Ý KẾT NỐI — sticky, không nhảy layout */}
      <div className="hidden xl:block w-[340px] flex-shrink-0">
        <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto hide-scroll space-y-6 pb-4">
          {/* User Profile Card */}
          <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
              <Link to={`/profile/${currentUser?.username}`} className="flex items-center gap-4 cursor-pointer">
                <img src={myAvatar} className="w-14 h-14 rounded-2xl object-cover shadow-sm border-2 border-white ring-1 ring-slate-100" alt="my profile" />
                <div className="overflow-hidden">
                  <p className="font-bold text-[16px] text-slate-900 truncate">{myName}</p>
                  <p className="text-slate-500 text-[14px]">Online</p>
                </div>
              </Link>
              <div className="flex items-center gap-2">
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => navigate('/admin/users')}
                    title="Trang Quản Trị"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white text-[12px] font-bold transition cursor-pointer"
                  >
                    <FiShield size={14} />
                    <span>Admin</span>
                  </button>
                )}
                <button onClick={handleLogout} className="text-pink-600 text-[13px] font-bold hover:text-pink-800 cursor-pointer">Đăng xuất</button>
              </div>
            </div>
          </div>

          {/* Suggested Users Component */}
          <SuggestedUsers />
        </div>
      </div>
    </div>
  </main>
      {/* POPUP INSTAGRAM */}
      {activePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-[1000px] h-[600px] rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative">
            <button onClick={() => { setOpenCommentPostId(null); setReplyingTo(null); setCommentText(""); }} className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-slate-100/80 hover:bg-rose-50 text-slate-600 hover:text-rose-500 rounded-full transition cursor-pointer"><FiX size={20} /></button>
            <div className="w-full md:w-[55%] h-[250px] md:h-full bg-slate-950 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-slate-100 relative">
              <ImageCarousel images={activePost.images || (activePost.image ? [activePost.image] : [])} postId={activePost._id} handleLikePost={handleLikePost} posts={posts} currentUser={currentUser} isPopup={true} />
            </div>
            <div className="w-full md:w-[45%] h-[350px] md:h-full flex flex-col bg-white">
              <div className="flex items-center gap-3 p-4 border-b border-slate-100 flex-shrink-0"><img src={getSafeAvatar(activePost.userId)} className="w-10 h-10 rounded-full object-cover" alt="avt" /><div><h4 className="font-bold text-[15px] text-slate-900">{activePost.userId?.username || "Người dùng"}</h4><p className="text-[12px] text-slate-500">{formatDate(activePost.createdAt)}</p></div></div>
              <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
                <div className="flex gap-2">
                  {(() => {
                    const isLiked = activePost.likes?.includes(currentUser?._id);
                    return (
                      <button
                        onClick={() => handleLikePost(activePost._id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition font-semibold text-[13px] cursor-pointer ${isLiked ? 'bg-pink-50 text-pink-600' : 'hover:bg-pink-50 text-slate-700 hover:text-pink-600'}`}
                      >
                        <FiHeart className={`text-[18px] ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                        <span>{activePost.likes?.length || 0}</span>
                      </button>
                    );
                  })()}
                  <button onClick={() => toggleCommentSection(activePost._id)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-pink-50 text-slate-700 hover:text-pink-600 transition font-semibold text-[13px] cursor-pointer">
                    <FiMessageCircle size={18} /> Bình luận
                  </button>
                  <button onClick={() => handleOpenShare(activePost)} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 transition font-semibold text-[13px] cursor-pointer">
                    <FiSend size={18} /> Chia sẻ
                  </button>
                </div>
                <BookmarkButton
                  isSaved={isPostSaved(activePost._id)}
                  onClick={() => handleToggleSavePost(activePost._id)}
                  className="!px-3 !py-2"
                />
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4.5 hide-scroll text-[14px]">
                {activePost.content && <div className="flex gap-3 pb-4 border-b border-slate-50"><img src={getSafeAvatar(activePost.userId)} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" alt="avt" /><div><span className="font-bold text-slate-900 mr-2">{activePost.userId?.username}</span><span className="text-slate-800 whitespace-pre-wrap break-words">{renderContentWithHashtags(activePost.content)}</span></div></div>}
                {postComments[activePost._id]?.length > 0 ? (
                  postComments[activePost._id].map((comment) => (
                    <CommentItem
                      key={comment._id}
                      comment={comment}
                      currentUser={currentUser}
                      postAuthorId={activePost.userId?._id || activePost.userId}
                      onDelete={handleDeleteComment}
                      onReport={(targetComment) => {
                        setReportingComment(targetComment);
                        setCommentReportReason("");
                      }}
                      onReply={(parentId, username) => {
                        setReplyingTo({ parentId, username });
                        setCommentText(`@${username} `);
                      }}
                    />
                  ))
                ) : (<div className="h-full flex items-center justify-center text-slate-400 text-[13px] pt-10">Chưa có bình luận nào.</div>)}
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                {replyingTo && <div className="flex items-center justify-between bg-pink-50 px-3 py-1 rounded-t-xl border-x border-t border-pink-100 text-[12px] mb-1"><p className="text-pink-600 truncate">Đang trả lời <b>{replyingTo.username}</b></p><button onClick={() => { setReplyingTo(null); setCommentText(""); }} className="text-pink-600 hover:bg-pink-100 p-0.5 rounded-full cursor-pointer"><FiX /></button></div>}
                <div className="flex items-center gap-2"><img src={myAvatar} className="w-8 h-8 rounded-full object-cover" alt="my-avt" /><div className="flex-1 relative"><input type="text" placeholder="Thêm bình luận..." className={`w-full bg-white border border-slate-200 text-[13px] pl-4 pr-10 py-2.5 focus:outline-none focus:border-pink-400 shadow-sm ${replyingTo ? 'rounded-b-xl' : 'rounded-full'}`} value={commentText} onChange={(e) => setCommentText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(activePost._id)} /><button onClick={() => handleSubmitComment(activePost._id)} disabled={!commentText.trim()} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-pink-600 text-white rounded-full hover:bg-pink-700 disabled:bg-slate-300 cursor-pointer"><FiSend size={12} /></button></div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BÁO CÁO VI PHẠM */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-[480px] rounded-[28px] p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full transition cursor-pointer"
            >
              <FiX size={18} />
            </button>
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center"><FiFlag size={20} /></div>
              <h3 className="text-[18px] font-black text-slate-900">Báo cáo vi phạm</h3>
            </div>
            <p className="text-[13.5px] text-slate-500 mb-4 leading-relaxed">
              Vui lòng chọn hoặc nhập lý do báo cáo bài viết này. Chúng tôi sẽ xem xét báo cáo của bạn trong vòng 24 giờ.
            </p>
            
            {/* Gợi ý lý do nhanh */}
            <div className="flex flex-wrap gap-2 mb-4">
              {["Nội dung phản cảm", "Spam / Tin giả", "Ngược đãi / Bạo lực", "Quấy rối / Bắt nạt", "Bản quyền"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setReportReason(reason)}
                  className={`text-[12.5px] px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer border ${
                    reportReason === reason
                      ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="Nhập chi tiết lý do vi phạm tại đây..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13.5px] focus:outline-none focus:border-rose-400 focus:bg-white transition mb-6 resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[14px] font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={submittingReport || !reportReason.trim()}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white disabled:bg-slate-300 rounded-2xl text-[14px] font-bold transition cursor-pointer flex items-center justify-center gap-2"
              >
                {submittingReport ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Gửi báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MOCK CHỈNH SỬA BÀI VIẾT */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-[500px] rounded-[28px] p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full transition cursor-pointer"
            >
              <FiX size={18} />
            </button>
            <div className="flex items-center gap-3 text-blue-600 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center"><FiEdit2 size={20} /></div>
              <h3 className="text-[18px] font-black text-slate-900">Chỉnh sửa bài viết</h3>
            </div>
            
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Bạn đang nghĩ gì thế?..."
              rows={4}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13.5px] focus:outline-none focus:border-blue-400 focus:bg-white transition mb-6 resize-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[14px] font-bold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editContent.trim()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white disabled:bg-slate-300 rounded-2xl text-[14px] font-bold transition cursor-pointer"
              >
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BÁO CÁO BÌNH LUẬN */}
      {reportingComment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white w-full max-w-[480px] rounded-[28px] p-6 shadow-2xl border border-slate-100 relative">
            <button
              onClick={() => setReportingComment(null)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full transition cursor-pointer"
            >
              <FiX size={18} />
            </button>
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center"><FiFlag size={20} /></div>
              <h3 className="text-[18px] font-black text-slate-900">Báo cáo bình luận</h3>
            </div>
            <p className="text-[13.5px] text-slate-500 mb-4 leading-relaxed">
              Vui lòng chọn hoặc nhập lý do báo cáo bình luận của <b>@{reportingComment.userId?.username || reportingComment.username}</b>. Chúng tôi sẽ xử lý nghiêm ngặt các vi phạm.
            </p>
            
            {/* Gợi ý lý do nhanh */}
            <div className="flex flex-wrap gap-2 mb-4">
              {["Spam / Quảng cáo", "Nội dung phản cảm", "Quấy rối / Bắt nạt", "Tin giả / Lừa đảo", "Ngôn từ kích động thù hằn"].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setCommentReportReason(reason)}
                  className={`text-[12.5px] px-3.5 py-1.5 rounded-full font-semibold transition cursor-pointer border ${
                    commentReportReason === reason
                      ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>

            {/* Nhập lý do khác */}
            <textarea
              rows={3}
              value={commentReportReason}
              onChange={(e) => setCommentReportReason(e.target.value)}
              placeholder="Hoặc nhập lý do chi tiết hơn..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[13.5px] focus:outline-none focus:border-rose-400 focus:bg-white transition mb-6 shadow-inner"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setReportingComment(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[14px] font-bold transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleReportComment}
                disabled={submittingCommentReport || !commentReportReason.trim()}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white disabled:bg-slate-300 rounded-2xl text-[14px] font-bold transition cursor-pointer flex items-center justify-center gap-2"
              >
                {submittingCommentReport ? "Đang gửi..." : "Gửi báo cáo"}
              </button>
            </div>
          </div>
        </div>
      )}

      <CreatePostModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onPostCreated={handlePostCreated} />
      <ShareModal isOpen={!!sharePost} onClose={handleCloseShare} post={sharePost} />
    </div>
  );
};

const NavItem = ({ icon, text, isActive, isAdmin, hasRedDot, badge }) => (
  <div className={`flex items-center px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 ${
    isAdmin
      ? 'bg-violet-50 text-violet-600 font-bold hover:bg-violet-600 hover:text-white'
      : isActive
        ? 'bg-pink-50 text-pink-600 font-bold'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
  }`}>
    <div className="flex-shrink-0 relative">
      {icon}
      {hasRedDot && <span className="absolute top-0 right-0 bg-rose-500 w-2.5 h-2.5 rounded-full border-2 border-white" />}
      {badge && <span className="absolute -top-2 -right-3 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">{badge}</span>}
    </div>
    <span className="ml-4 text-[16px] whitespace-nowrap">{text}</span>
    {isAdmin && <span className="ml-auto text-[10px] font-black tracking-widest opacity-70">ADMIN</span>}
  </div>
);

export default HomePage;