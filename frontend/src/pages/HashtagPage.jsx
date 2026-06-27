import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiLoader,
  FiSearch,
  FiFlag,
  FiHeart,
  FiMessageCircle,
  FiSend,
  FiBookmark,
  FiX,
  FiShield,
  FiChevronLeft,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
  FiShare2,
  FiUserMinus,
  FiCopy,
} from 'react-icons/fi';
import api from '../api/axios';
import ShareModal from '../components/ShareModal';
import ImageCarousel from '../components/ImageCarousel';
import PostDropdown from '../components/PostDropdown';
import BookmarkButton from '../components/BookmarkButton';
import CommentItem from '../components/CommentItem';
import { renderContentWithHashtags } from '../components/PostCard';

const HashtagPage = () => {
  const { hashtagName } = useParams();
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const myName = currentUser?.username || 'Người dùng';
  const myAvatar =
    currentUser?.avatar && currentUser.avatar.trim() !== ''
      ? currentUser.avatar
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=fbcfe8&color=be185d`;

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedPostIds, setSavedPostIds] = useState(() => new Set());
  const [sharePost, setSharePost] = useState(null);

  // States cho bình luận trong popup (y hệt Trang chủ)
  const [openCommentPostId, setOpenCommentPostId] = useState(null);
  const [postComments, setPostComments] = useState({});
  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [reportingComment, setReportingComment] = useState(null);
  const [commentReportReason, setCommentReportReason] = useState("");
  const [submittingCommentReport, setSubmittingCommentReport] = useState(false);


  // State Báo cáo & Mock Edit bài viết
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportPostId, setReportPostId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editPostId, setEditPostId] = useState(null);
  const [editContent, setEditContent] = useState('');

  const getSafeAvatar = (userObj) => {
    if (userObj?.avatar && userObj.avatar.trim() !== '') return userObj.avatar;
    const name = userObj?.username || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fbcfe8&color=be185d`;
  };

  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('vi-VN', options);
  };

  const fetchHashtagPosts = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`posts/hashtag/${encodeURIComponent(hashtagName)}`);
      setPosts(res.data || []);
    } catch (err) {
      setError(
        err.response?.data?.message || 'Không thể tải bài viết cho hashtag này. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchSaved = async () => {
    if (!currentUser?.username) return;
    try {
      const res = await api.get(`users/${currentUser.username}/saved-posts`);
      const ids = new Set(
        (res.data.savedPosts || res.data.posts || []).map((item) =>
          (item._id || item).toString()
        )
      );
      setSavedPostIds(ids);
    } catch {
      /* optional */
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (hashtagName) {
      fetchHashtagPosts();
      fetchSaved();
    }
  }, [hashtagName, navigate, currentUser?.username]);

  const handleLikePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.put(`posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(posts.map(post => post._id === postId ? { ...post, likes: response.data } : post));
    } catch (error) { console.error('Lỗi thả tim', error); }
  };

  const isPostSaved = (postId) =>
    savedPostIds.has(postId?.toString?.() ?? String(postId));

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
      console.error('Lỗi lưu bài viết:', error);
      alert(error.response?.data?.message || 'Không thể lưu bài viết');
    }
  };

  const toggleCommentSection = async (postId) => {
    setOpenCommentPostId(postId);
    setReplyingTo(null);
    setCommentText('');
    if (!postComments[postId]) {
      try {
        const response = await api.get(`comments/${postId}`);
        setPostComments(prev => ({ ...prev, [postId]: response.data }));
      } catch (error) { console.error('Lỗi lấy bình luận', error); }
    }
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
      setCommentText('');
      setReplyingTo(null); 
    } catch (error) { console.error('Lỗi gửi bình luận', error); }
  };

  const handleOpenShare = (post) => {
    setActiveMenuId(null);
    setSharePost(post);
  };

  const handleCopyLink = (postId) => {
    const link = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(link)
      .then(() => {
        alert('Đã sao chép liên kết bài viết vào bộ nhớ tạm!');
      })
      .catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        alert('Đã sao chép liên kết bài viết vào bộ nhớ tạm!');
      });
    setActiveMenuId(null);
  };

  const handleUnfollowUser = async (targetUserId) => {
    if (!window.confirm('Bạn có chắc chắn muốn bỏ theo dõi người này không?')) return;
    try {
      const token = localStorage.getItem('token');
      await api.put(`users/${targetUserId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã thay đổi trạng thái theo dõi người dùng này!');
      setActiveMenuId(null);
    } catch (error) {
      alert('Lỗi khi thay đổi trạng thái theo dõi: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleOpenReport = (postId) => {
    setReportPostId(postId);
    setReportReason('');
    setIsReportModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSubmitReport = async () => {
    if (!reportReason.trim()) {
      alert('Vui lòng chọn hoặc nhập lý do báo cáo!');
      return;
    }
    setSubmittingReport(true);
    try {
      const token = localStorage.getItem('token');
      await api.post(`posts/${reportPostId}/report`, { reason: reportReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Báo cáo vi phạm thành công! Cảm ơn đóng góp của bạn.');
      setIsReportModalOpen(false);
      setReportPostId(null);
      setReportReason('');
    } catch (error) {
      alert('Lỗi gửi báo cáo: ' + (error.response?.data?.message || error.message));
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleOpenEdit = (post) => {
    setEditPostId(post._id);
    setEditContent(post.content || '');
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleSaveEdit = () => {
    if (!editContent.trim()) {
      alert('Nội dung bài viết không được để trống!');
      return;
    }
    setPosts(prev => prev.map(p => p._id === editPostId ? { ...p, content: editContent } : p));
    alert('Cập nhật bài viết thành công!');
    setIsEditModalOpen(false);
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bình luận này không?')) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Đã xóa bình luận thành công!');
      
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
      alert('Lỗi khi xóa bình luận: ' + (error.response?.data?.message || error.message));
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


  const activePost = posts.find((p) => p._id === openCommentPostId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE]">
        <FiLoader className="animate-spin text-3xl text-pink-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-slate-900 font-sans pb-12">
      <style>
        {`
          .hide-scroll::-webkit-scrollbar { display: none; }
          .hide-scroll { -ms-overflow-style: none; scrollbar-width: none; }
          .animate-fade-in { animation: fadeIn 0.2s ease-out; }
          @keyframes fadeIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
          @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
          .animate-scale-up { animation: scaleUp 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        `}
      </style>

      {/* Header Sticky */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100/80 px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto shadow-sm">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-slate-100 cursor-pointer transition text-slate-700 animate-fade-in"
          aria-label="Quay lại"
        >
          <FiArrowLeft size={22} />
        </button>
        <h1 className="font-bold text-slate-900 text-[17px]">Khám phá các bài viết về #{hashtagName}</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Hashtag Card Header */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white shadow-sm flex items-center gap-4 mb-8">
          <div className="w-14 h-14 bg-gradient-to-tr from-pink-500 via-purple-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-[24px] font-black shadow-lg shadow-pink-500/20">
            #
          </div>
          <div>
            <h2 className="text-[22px] font-black text-slate-900 tracking-tight leading-tight">
              #{hashtagName?.toLowerCase()}
            </h2>
            <p className="text-slate-400 text-[13px] font-semibold mt-0.5">
              {posts.length > 0 ? `${posts.length} bài đăng thịnh hành` : 'Chưa có bài đăng'}
            </p>
          </div>
        </div>

        {/* Conditional Rendering: Empty State */}
        {posts.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-md rounded-[32px] p-12 border border-white/60 shadow-xl shadow-slate-200/50 text-center max-w-md mx-auto mt-8 relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-br from-pink-400 to-violet-500 rounded-full blur-3xl opacity-10 pointer-events-none" />
            <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner animate-pulse">
              <FiSearch className="text-pink-500 opacity-60" size={32} />
            </div>
            <h3 className="text-[18px] font-black text-slate-800 leading-tight">
              Không tìm thấy bài viết
            </h3>
            <p className="text-slate-400 text-[13.5px] mt-2.5 leading-relaxed px-2">
              Chưa có bài viết nào với thẻ #{hashtagName}. <br />Hãy là người đầu tiên!
            </p>
            <div className="mt-8 flex flex-col gap-3">
              <Link
                to="/home"
                className="inline-block py-3 px-6 bg-gradient-to-r from-pink-500 to-violet-600 hover:from-pink-600 hover:to-violet-700 text-white rounded-2xl font-bold text-[14px] shadow-lg shadow-pink-500/20 hover:shadow-xl hover:shadow-pink-500/30 transition duration-300"
              >
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : (
          /* Render post feed list matching HomePage.jsx exactly */
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <div key={post._id} className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 relative">
                <div className="flex justify-between items-center mb-4 px-2 relative">
                  {/* HEADER BÀI VIẾT - GẮN LINK PROFILE NGƯỜI ĐĂNG */}
                  <div className="flex items-center gap-3">
                    <Link to={`/profile/${post.userId?.username}`}>
                      <img src={getSafeAvatar(post.userId)} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 cursor-pointer" alt="author" />
                    </Link>
                    <div>
                      <Link to={`/profile/${post.userId?.username}`}>
                        <h3 className="font-bold text-[16px] text-slate-900 flex items-center gap-1 hover:text-pink-600 transition cursor-pointer">
                          {post.userId?.username || 'Người dùng ẩn danh'}
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
                    handleCopyLink={handleCopyLink}
                    handleUnfollowUser={handleUnfollowUser}
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
                      return (
                        <button onClick={() => handleLikePost(post._id)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition font-semibold text-[14px] cursor-pointer ${isLiked ? 'bg-pink-50 text-pink-600' : 'hover:bg-pink-50 text-slate-700 hover:text-pink-600'}`}>
                          <FiHeart className={`text-[20px] ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                          <span className="hidden sm:inline">{post.likes?.length || 0} Thích</span>
                        </button>
                      );
                    })()}
                    <button onClick={() => toggleCommentSection(post._id)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-pink-50 text-slate-700 hover:text-pink-600 transition font-semibold text-[14px] cursor-pointer">
                      <FiMessageCircle size={20} /> <span className="hidden sm:inline">Bình luận</span>
                    </button>
                    <button onClick={() => handleOpenShare(post)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-slate-200 text-slate-700 transition font-semibold text-[14px] cursor-pointer">
                      <FiSend size={20} /> <span className="hidden sm:inline">Chia sẻ</span>
                    </button>
                  </div>
                  <BookmarkButton
                    isSaved={isPostSaved(post._id)}
                    onClick={() => handleToggleSavePost(post._id)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* POPUP INSTAGRAM STYLE COMMENTS OVERLAY */}
      {activePost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => { setOpenCommentPostId(null); setReplyingTo(null); setCommentText(''); }}>
          <div className="bg-white w-full max-w-[1000px] h-[95vh] md:h-[80vh] rounded-[32px] overflow-hidden shadow-2xl flex flex-col md:flex-row relative border border-slate-100 animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => { setOpenCommentPostId(null); setReplyingTo(null); setCommentText(''); }} className="absolute top-4 right-4 z-50 w-10 h-10 flex items-center justify-center bg-white/80 hover:bg-rose-50 text-slate-700 hover:text-rose-500 rounded-full transition cursor-pointer shadow-md">
              <FiX size={20} />
            </button>
            <div className="w-full md:w-[55%] h-[250px] md:h-full bg-slate-950 flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-slate-100 relative">
              <ImageCarousel images={activePost.images || (activePost.image ? [activePost.image] : [])} postId={activePost._id} handleLikePost={handleLikePost} posts={posts} currentUser={currentUser} isPopup={true} />
            </div>
            <div className="w-full md:w-[45%] h-[350px] md:h-full flex flex-col bg-white">
              <div className="flex items-center gap-3 p-4 border-b border-slate-100 flex-shrink-0"><img src={getSafeAvatar(activePost.userId)} className="w-10 h-10 rounded-full object-cover" alt="avt" /><div><h4 className="font-bold text-[15px] text-slate-900">{activePost.userId?.username || 'Người dùng'}</h4><p className="text-[12px] text-slate-500">{formatDate(activePost.createdAt)}</p></div></div>
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
                {activePost.content && (
                  <div className="flex gap-3 pb-4 border-b border-slate-50">
                    <img src={getSafeAvatar(activePost.userId)} className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5" alt="avt" />
                    <div>
                      <span className="font-bold text-slate-900 mr-2">{activePost.userId?.username}</span>
                      <span className="text-slate-800 whitespace-pre-wrap break-words">
                        {renderContentWithHashtags(activePost.content)}
                      </span>
                    </div>
                  </div>
                )}
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
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-[13px] pt-10">Chưa có bình luận nào.</div>
                )}
              </div>
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex-shrink-0">
                {replyingTo && (
                  <div className="flex items-center justify-between bg-pink-50 px-3 py-1 rounded-t-xl border-x border-t border-pink-100 text-[12px] mb-1">
                    <p className="text-pink-600 truncate">Đang trả lời <b>{replyingTo.username}</b></p>
                    <button onClick={() => { setReplyingTo(null); setCommentText(''); }} className="text-pink-600 hover:bg-pink-100 p-0.5 rounded-full cursor-pointer"><FiX /></button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <img src={myAvatar} className="w-8 h-8 rounded-full object-cover" alt="my-avt" />
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      placeholder="Thêm bình luận..."
                      className={`w-full bg-white border border-slate-200 text-[13px] pl-4 pr-10 py-2.5 focus:outline-none focus:border-pink-400 shadow-sm ${replyingTo ? 'rounded-b-xl' : 'rounded-full'}`}
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(activePost._id)}
                    />
                    <button
                      onClick={() => handleSubmitComment(activePost._id)}
                      disabled={!commentText.trim()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-pink-600 text-white rounded-full hover:bg-pink-700 disabled:bg-slate-300 cursor-pointer"
                    >
                      <FiSend size={12} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BÁO CÁO VI PHẠM */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsReportModalOpen(false)}>
          <div className="bg-white w-full max-w-[480px] rounded-[28px] p-6 shadow-2xl border border-slate-100 relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
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
            
            <div className="flex flex-wrap gap-2 mb-4">
              {['Nội dung phản cảm', 'Spam / Tin giả', 'Ngược đãi / Bạo lực', 'Quấy rối / Bắt nạt', 'Bản quyền'].map((reason) => (
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
              placeholder="Nhập lý do chi tiết hơn ở đây..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] focus:outline-none focus:border-rose-400 focus:bg-white transition mb-6 shadow-inner resize-none h-24"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-[14px] font-bold text-slate-500 cursor-pointer transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={submittingReport || !reportReason.trim()}
                className="flex-1 py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-[14px] font-bold cursor-pointer transition shadow-lg shadow-rose-500/20"
              >
                {submittingReport ? 'Đang gửi...' : 'Báo cáo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SỬA BÀI VIẾT */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white w-full max-w-[500px] rounded-[28px] p-6 shadow-2xl border border-slate-100 relative animate-scale-up" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-rose-50 text-slate-500 hover:text-rose-500 rounded-full transition cursor-pointer"
            >
              <FiX size={18} />
            </button>
            <div className="flex items-center gap-3 text-pink-600 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-pink-50 flex items-center justify-center"><FiEdit2 size={20} /></div>
              <h3 className="text-[18px] font-black text-slate-900">Chỉnh sửa bài viết</h3>
            </div>
            <p className="text-[13.5px] text-slate-500 mb-4 leading-relaxed">
              Bạn có thể cập nhật lại nội dung mô tả của bài viết bên dưới.
            </p>
            
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Nhập nội dung mô tả mới ở đây..."
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-[13px] focus:outline-none focus:border-pink-400 focus:bg-white transition mb-6 shadow-inner resize-none h-32 font-medium"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="flex-1 py-3.5 rounded-2xl border border-slate-200 hover:bg-slate-50 text-[14px] font-bold text-slate-500 cursor-pointer transition"
              >
                Hủy
              </button>
              <button
                onClick={handleSaveEdit}
                className="flex-1 py-3.5 rounded-2xl bg-pink-600 hover:bg-pink-700 text-white text-[14px] font-bold cursor-pointer transition shadow-lg shadow-pink-500/20"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}

      <ShareModal
        isOpen={!!sharePost}
        onClose={() => setSharePost(null)}
        post={sharePost}
      />

      {/* MODAL BÁO CÁO BÌNH LUẬN */}
      {reportingComment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setReportingComment(null)}>
          <div className="bg-white w-full max-w-[480px] rounded-[28px] p-6 shadow-2xl border border-slate-100 relative" onClick={(e) => e.stopPropagation()}>
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
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[13.5px] focus:outline-none focus:border-rose-400 focus:bg-white transition mb-6 shadow-inner resize-none"
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
    </div>
  );
};

export default HashtagPage;
