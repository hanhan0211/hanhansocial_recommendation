import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiArrowLeft, FiLoader } from 'react-icons/fi';
import api from '../api/axios';
import PostCard from '../components/PostCard';
import ShareModal from '../components/ShareModal';

const PostDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();

  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const myName = currentUser?.username || 'Người dùng';
  const myAvatar =
    currentUser?.avatar && currentUser.avatar.trim() !== ''
      ? currentUser.avatar
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=fbcfe8&color=be185d`;

  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savedPostIds, setSavedPostIds] = useState(() => new Set());
  const [sharePost, setSharePost] = useState(null);

  const [commentText, setCommentText] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [expandedReplies, setExpandedReplies] = useState({});

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchPostDetail = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`posts/${postId}`);
        setPost(res.data);
        setComments(res.data.comments || []);
      } catch (err) {
        setError(
          err.response?.data?.message || 'Không thể tải bài viết. Vui lòng thử lại.'
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

    if (postId) {
      fetchPostDetail();
      fetchSaved();
    }
  }, [postId, navigate, currentUser?.username]);

  const handleLike = async (id) => {
    try {
      const res = await api.put(`posts/${id}/like`, {});
      setPost((prev) => (prev ? { ...prev, likes: res.data } : prev));
    } catch (err) {
      console.error('Lỗi thả tim', err);
    }
  };

  const handleToggleSave = async (id) => {
    try {
      const res = await api.put(`users/save-post/${id}`, {});
      const ids = new Set(res.data.savedPosts.map((item) => item.toString()));
      setSavedPostIds(ids);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể lưu bài viết');
    }
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !post) return;
    try {
      const payload = {
        postId: post._id,
        content: commentText,
        parentId: replyingTo?.parentId || null,
      };
      const res = await api.post('comments', payload);
      const newComment = res.data;

      if (payload.parentId) {
        setExpandedReplies((prev) => ({ ...prev, [payload.parentId]: true }));
        setComments((prev) =>
          prev.map((c) =>
            c._id === payload.parentId
              ? { ...c, replies: [...(c.replies || []), newComment] }
              : c
          )
        );
      } else {
        setComments((prev) => [...prev, { ...newComment, replies: [] }]);
      }

      setCommentText('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Lỗi gửi bình luận', err);
    }
  };

  const handleReply = (parentId, username) => {
    setReplyingTo({ parentId, username });
    setCommentText(`@${username} `);
  };

  const toggleReplies = (commentId) => {
    setExpandedReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F7FE]">
        <FiLoader className="animate-spin text-3xl text-pink-500" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F7FE] gap-4 px-4">
        <p className="text-slate-600 text-center">{error || 'Bài viết không tồn tại.'}</p>
        <Link to="/home" className="text-pink-600 font-semibold hover:underline">
          Về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F7FE] text-slate-900 font-sans">
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 py-3 flex items-center gap-3 max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="p-2 rounded-full hover:bg-slate-100 cursor-pointer"
          aria-label="Quay lại"
        >
          <FiArrowLeft size={22} />
        </button>
        <h1 className="font-bold text-slate-900 text-[17px]">Bài viết</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <PostCard
          post={post}
          posts={[post]}
          currentUser={currentUser}
          comments={comments}
          showCommentsSection
          onLike={handleLike}
          onShare={setSharePost}
          onToggleSave={handleToggleSave}
          isSaved={savedPostIds.has(post._id?.toString())}
          commentText={commentText}
          onCommentTextChange={setCommentText}
          onSubmitComment={handleSubmitComment}
          replyingTo={replyingTo}
          onCancelReply={() => {
            setReplyingTo(null);
            setCommentText('');
          }}
          onReplyToComment={handleReply}
          expandedReplies={expandedReplies}
          onToggleReplies={toggleReplies}
          myAvatar={myAvatar}
        />
      </main>

      <ShareModal
        isOpen={!!sharePost}
        onClose={() => setSharePost(null)}
        post={sharePost}
      />
    </div>
  );
};

export default PostDetailPage;
