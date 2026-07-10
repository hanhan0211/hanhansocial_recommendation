import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  FiSettings, FiX, FiArrowLeft, FiLoader, FiCamera, FiGrid, FiBookmark,
  FiHeart, FiMessageCircle, FiPlus, FiShare2, FiUserPlus, FiUserCheck,
  FiList, FiFilter, FiTrendingUp, FiClock, FiAward, FiStar, FiAlignLeft,
  FiMoreHorizontal, FiFlag, FiTrash2, FiLock
} from 'react-icons/fi';
import { AiOutlinePushpin } from 'react-icons/ai';
import { BsCollectionPlay, BsGrid3X3, BsListUl } from 'react-icons/bs';
import { HiOutlineSparkles } from 'react-icons/hi';
import ImageCarousel from "../components/ImageCarousel.jsx";
import BookmarkButton from "../components/BookmarkButton.jsx";
import CommentItem from "../components/CommentItem.jsx";
import ModalShareProfile from "../components/ModalShareProfile.jsx";
import { useSocket } from '../context/SocketContext';
import { renderContentWithHashtags } from '../components/PostCard';

// Component render từng ô Grid cho bài viết (hỗ trợ hiển thị Text-only chuyên nghiệp)
const GridPostItem = ({ post, onClick, isVideo }) => {
  const hasMedia = (post.images && post.images.length > 0) || post.image;
  const firstMedia = post.images?.[0] || post.image;
  const isVideoPost = isVideo(firstMedia);

  return (
    <div
      onClick={onClick}
      className="relative aspect-square group cursor-pointer bg-slate-50 overflow-hidden rounded-sm hover:rounded-xl transition-all duration-300 shadow-sm border border-slate-100 hover:shadow-md"
    >
      {hasMedia ? (
        isVideoPost ? (
          <video
            src={firstMedia}
            className="w-full h-full object-cover aspect-square group-hover:scale-105 transition duration-500"
            muted
            playsInline
          />
        ) : (
          <img
            src={firstMedia}
            className="w-full h-full object-cover aspect-square group-hover:scale-105 transition duration-500"
            alt="post media"
            loading="lazy"
          />
        )
      ) : (
        /* Render Text-only post with beautiful gradient background */
        <div className="w-full h-full bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 flex items-center justify-center p-4 select-none group-hover:scale-105 transition duration-500">
          <p className="text-white text-center font-medium text-[12px] sm:text-[14px] leading-relaxed line-clamp-4 sm:line-clamp-5 px-1 tracking-wide">
            {post.content}
          </p>
        </div>
      )}

      {/* Top right indicator icons */}
      <div className="absolute top-2 right-2 flex gap-1 z-10">
        {post.isPinned && (
          <div className="bg-black/60 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
            <AiOutlinePushpin size={14} className="text-white" />
          </div>
        )}
        {hasMedia ? (
          <>
            {post.images && post.images.length > 1 && (
              <div className="bg-black/60 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
                <BsCollectionPlay size={14} className="text-white" />
              </div>
            )}
            {isVideoPost && (
              <div className="bg-black/60 backdrop-blur-sm rounded-full p-1.5 shadow-sm">
                <span className="text-white text-[10px] font-bold">▶</span>
              </div>
            )}
          </>
        ) : (
          /* Text-only post icon indicator */
          <div className="bg-white/20 backdrop-blur-md rounded-full p-1.5 border border-white/20 shadow-sm">
            <FiAlignLeft size={14} className="text-white" />
          </div>
        )}
      </div>

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-6 z-20">
        <div className="flex items-center gap-1.5 text-white font-bold">
          <FiHeart size={20} className="fill-white text-white" />
          <span>{post.likes?.length || 0}</span>
        </div>
        <div className="flex items-center gap-1.5 text-white font-bold">
          <FiMessageCircle size={20} className="fill-white text-white" />
          <span>{post.comments?.length || post.commentCount || 0}</span>
        </div>
      </div>
    </div>
  );
};

const ProfilePage = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  
  // States Modal chi tiết bài viết
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState(null); 
  const [expandedReplies, setExpandedReplies] = useState({});
  const [postComments, setPostComments] = useState({});
  const [activeCommentMenuId, setActiveCommentMenuId] = useState(null);
  const [reportingComment, setReportingComment] = useState(null);
  const [reportReason, setReportReason] = useState("");

  // States tính năng Chỉnh sửa hồ sơ (Edit Profile)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editUsername, setEditUsername] = useState("");
  const [editFullname, setEditFullname] = useState("");
  const [editBio, setEditBio] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'saved', 'status'

  const [isFollowing, setIsFollowing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid', 'list', 'masonry'
  const [filterMode, setFilterMode] = useState('recent'); // 'recent', 'popular', 'oldest'
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [savedPostIds, setSavedPostIds] = useState(() => new Set());
  const [savedPostsList, setSavedPostsList] = useState([]);
  const [loadingSaved, setLoadingSaved] = useState(false);

  // States cho Follow Requests (Private Account)
  const [followRequests, setFollowRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [settingsTab, setSettingsTab] = useState('general'); // 'general', 'requests'

  // States cho Followers/Following Modals
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);

  // States cho Settings (lưu vào localStorage)
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('userSettings');
    return saved ? JSON.parse(saved) : {
      privateAccount: false,
      pushNotifications: true,
      emailNotifications: true,
      darkMode: false,
      language: 'vi'
    };
  });

  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isOwnProfile = currentUser?.username?.toLowerCase() === username?.toLowerCase();

  // HÀM KIỂM TRA VIDEO
  const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|mov|webm|ogg)$/i) || url.includes('/video/upload/');
  };

  // HÀM BẢO VỆ ĐƯỜNG DẪN ẢNH: Hỗ trợ Cache-Busting bằng tham số t dựa trên updatedAt
  const getSafeAvatar = (avatarUrl, fallbackName, updatedAt) => {
    if (avatarUrl && typeof avatarUrl === 'string' && avatarUrl.trim() !== "") {
      const separator = avatarUrl.includes('?') ? '&' : '?';
      const version = updatedAt ? new Date(updatedAt).getTime() : '1';
      return `${avatarUrl}${separator}t=${version}`;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(fallbackName || 'User')}&background=fbcfe8&color=be185d`;
  };

  const fetchProfile = async () => {
    try {
      console.log("👉 Đang gọi API profile với username:", username);
      console.log("👉 Token hiện tại:", token ? "Có token" : "Không có token");
      console.log("👉 Current user:", currentUser);

      if (!token) {
        console.error("❌ Không có token, chuyển về trang login");
        window.location.href = '/login';
        return;
      }

      const res = await api.get(`users/profile/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileData(res.data);
      // Cập nhật trạng thái follow từ API
      if (res.data.isFollowing !== undefined) {
        setIsFollowing(res.data.isFollowing);
      }
      if (res.data.isPending !== undefined) {
        setIsPending(res.data.isPending);
      }
    } catch (err) {
      console.error("❌ Lỗi tải profile:", err);
      console.error("❌ Response data:", err.response?.data);
      console.error("❌ Status code:", err.response?.status);

      // Nếu lỗi 401, có thể token hết hạn
      if (err.response?.status === 401) {
        alert("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
    window.scrollTo(0, 0);
  }, [username]);

  // ==========================================
  // LOGIC CHI TIẾT BÀI VIẾT & BÌNH LUẬN
  // ==========================================
  const fetchCommentsForPost = async (postId) => {
    try {
      const response = await api.get(`comments/${postId}`);
      setPostComments(prev => ({ ...prev, [postId]: response.data }));
    } catch (error) { 
      console.error("Lỗi tải bình luận:", error); 
    }
  };

  const openPostDetail = (post) => {
    setSelectedPost(post);
    setReplyingTo(null);
    setCommentText("");
    fetchCommentsForPost(post._id);
  };

  const handleLikePost = async (postId) => {
    try {
      const response = await api.put(`posts/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileData(prev => ({
        ...prev,
        posts: prev.posts.map(p => p._id === postId ? { ...p, likes: response.data } : p)
      }));
      if (selectedPost?._id === postId) {
        setSelectedPost(prev => ({ ...prev, likes: response.data }));
      }
    } catch (error) { 
      console.error("Lỗi thả tim:", error); 
    }
  };

  const isPostSaved = (postId) =>
    savedPostIds.has(postId?.toString?.() ?? String(postId));

  const syncSavedIds = (ids) => {
    setSavedPostIds(new Set(ids.map((id) => id.toString())));
  };

  const fetchSavedPostIds = async () => {
    if (!isOwnProfile || !token) return;
    try {
      const res = await api.get(
        `users/${username}/saved-posts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      syncSavedIds(res.data.savedPosts || res.data.posts?.map((p) => p._id) || []);
    } catch (error) {
      console.error("Lỗi tải danh sách đã lưu:", error);
    }
  };

  const fetchSavedPosts = async () => {
    if (!isOwnProfile || !token) return;
    setLoadingSaved(true);
    try {
      const res = await api.get(
        `users/${username}/saved-posts`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSavedPostsList(res.data.posts || []);
      syncSavedIds(res.data.savedPosts || res.data.posts?.map((p) => p._id) || []);
    } catch (error) {
      console.error("Lỗi tải bài viết đã lưu:", error);
      if (error.response?.status === 403) {
        alert(error.response.data.message);
        setActiveTab("posts");
      }
    } finally {
      setLoadingSaved(false);
    }
  };

  const handleToggleSavePost = async (postId) => {
    try {
      const res = await api.put(
        `users/save-post/${postId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      syncSavedIds(res.data.savedPosts || []);
      if (activeTab === "saved" && isOwnProfile) {
        if (res.data.isSaved) {
          const post =
            profileData?.posts?.find((p) => p._id === postId) ||
            savedPostsList.find((p) => p._id === postId);
          if (post) {
            setSavedPostsList((prev) => [post, ...prev.filter((p) => p._id !== postId)]);
          } else {
            fetchSavedPosts();
          }
        } else {
          setSavedPostsList((prev) => prev.filter((p) => p._id !== postId));
        }
      }
      if (selectedPost?._id === postId && !res.data.isSaved) {
        setSelectedPost(null);
      }
    } catch (error) {
      console.error("Lỗi lưu bài viết:", error);
      alert(error.response?.data?.message || "Không thể lưu bài viết");
    }
  };

  useEffect(() => {
    if (!isOwnProfile && activeTab === "saved") {
      setActiveTab("posts");
    }
  }, [isOwnProfile, activeTab]);

  useEffect(() => {
    if (isOwnProfile) {
      fetchSavedPostIds();
    }
  }, [username, isOwnProfile]);

  useEffect(() => {
    if (activeTab === "saved" && isOwnProfile) {
      fetchSavedPosts();
    }
  }, [activeTab, isOwnProfile, username]);

  // Lắng nghe tín hiệu xóa bài viết & bình luận từ Admin qua Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleAdminDeletedPost = (deletedPostId) => {
      console.log(`🔌 Socket (Profile): Bài viết bị Admin xóa: ${deletedPostId}`);
      
      // Xóa khỏi danh sách bài đăng cá nhân
      setProfileData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          posts: prev.posts ? prev.posts.filter(p => p._id !== deletedPostId) : []
        };
      });

      // Xóa khỏi danh sách bài đăng đã lưu
      setSavedPostsList((prev) => prev.filter(p => p._id !== deletedPostId));

      // Đóng modal chi tiết nếu đang mở chính bài bị xóa
      setSelectedPost((prev) => {
        if (prev && prev._id === deletedPostId) {
          return null;
        }
        return prev;
      });
    };

    const handleAdminDeletedComment = ({ postId, commentId }) => {
      console.log(`🔌 Socket (Profile): Bình luận bị Admin xóa: ${commentId} trong bài viết: ${postId}`);
      setPostComments((prev) => {
        const postCommentsList = prev[postId] || [];
        const updated = postCommentsList.filter(c => c._id !== commentId);
        const fullyUpdated = updated.map(c => {
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.filter(r => r._id !== commentId)
            };
          }
          return c;
        });
        return { ...prev, [postId]: fullyUpdated };
      });
    };

    socket.on('admin-deleted-post', handleAdminDeletedPost);
    socket.on('admin-deleted-comment', handleAdminDeletedComment);

    return () => {
      socket.off('admin-deleted-post', handleAdminDeletedPost);
      socket.off('admin-deleted-comment', handleAdminDeletedComment);
    };
  }, [socket]);

  // 🔌 Lắng nghe event "follow-request-accepted" từ Socket.io
  // Khi chủ tài khoản riêng tư bấm "Cho phép" → emit tới người gửi yêu cầu
  // → Nếu người đó đang xem profile này → tự refresh ngay để thấy bài viết
  useEffect(() => {
    if (!socket) return;

    const handleFollowRequestAccepted = ({ profileOwnerUsername }) => {
      console.log(`🔌 Socket: Yêu cầu follow được chấp nhận bởi ${profileOwnerUsername}`);
      // Chỉ refresh nếu đang ở đúng trang profile của người vừa chấp nhận
      if (
        profileOwnerUsername &&
        username &&
        profileOwnerUsername.toLowerCase() === username.toLowerCase()
      ) {
        console.log('✅ Đang xem profile này → tự động refresh để hiện bài viết...');
        fetchProfile();
        // Cập nhật trạng thái follow ngay không cần chờ API
        setIsFollowing(true);
        setIsPending(false);
      }
    };

    socket.on('follow-request-accepted', handleFollowRequestAccepted);

    return () => {
      socket.off('follow-request-accepted', handleFollowRequestAccepted);
    };
  }, [socket, username]);

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này không?")) return;
    try {
      await api.delete(`comments/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPostComments((prev) => {
        const postCommentsList = prev[selectedPost._id] || [];
        const updated = postCommentsList.filter(c => c._id !== commentId);
        const fullyUpdated = updated.map(c => {
          if (c.replies) {
            return {
              ...c,
              replies: c.replies.filter(r => r._id !== commentId)
            };
          }
          return c;
        });
        return {
          ...prev,
          [selectedPost._id]: fullyUpdated
        };
      });
      setActiveCommentMenuId(null);
    } catch (error) {
      console.error("Lỗi xóa bình luận:", error);
      alert(error.response?.data?.message || "Không thể xóa bình luận");
    }
  };

  const handleReportComment = async (e) => {
    e.preventDefault();
    if (!reportReason.trim()) return;
    try {
      await api.post(`comments/${reportingComment._id}/report`, { reason: reportReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("Báo cáo bình luận thành công!");
      setReportingComment(null);
      setReportReason("");
      setActiveCommentMenuId(null);
    } catch (error) {
      console.error("Lỗi báo cáo bình luận:", error);
      alert(error.response?.data?.message || "Không thể báo cáo bình luận");
    }
  };

  const handleSubmitComment = async (e, postId) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const payload = { 
        postId, 
        content: commentText, 
        parentId: replyingTo ? replyingTo.parentId : null 
      };
      await api.post('comments', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchCommentsForPost(postId);
      setCommentText("");
      setReplyingTo(null);
    } catch (error) { 
      console.error("Lỗi gửi bình luận:", error); 
    }
  };

  const formatDate = (date) => {
    const d = new Date(date);
    return `Lúc ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')} ${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
  };

  // ==========================================
  // LOGIC CHỈNH SỬA HỒ SƠ (EDIT PROFILE)
  // ==========================================
  const handleOpenEditModal = () => {
    if (profileData?.user) {
      setEditUsername(profileData.user.username || "");
      setEditFullname(profileData.user.fullname || "");
      setEditBio(profileData.user.bio || "");
      setPreviewAvatar(getSafeAvatar(profileData.user.avatar, profileData.user.username));
      setSelectedFile(null);
      setIsEditModalOpen(true);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreviewAvatar(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();

    if (!/^[a-z0-9_.]{3,30}$/.test(editUsername)) {
      alert("Tên đăng nhập không hợp lệ (3-30 ký tự, chữ thường, số, chấm, gạch dưới, không khoảng cách).");
      return;
    }

    setIsUpdating(true);

    const payload = selectedFile
      ? new FormData()
      : {
          username: editUsername.trim().toLowerCase(),
          fullname: editFullname.trim(),
          bio: editBio.trim(),
        };

    if (selectedFile) {
      payload.append("username", editUsername.trim().toLowerCase());
      payload.append("fullname", editFullname.trim());
      payload.append("bio", editBio.trim());
      payload.append("avatar", selectedFile);
    }

    try {
      console.log("📤 Sending profile update...");
      const res = await api.put(`users/profile`, payload);

      console.log("✅ Profile update response:", res.data);

      if (res.data.user) {
        // Cập nhật localStorage
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updatedUser = {
          ...currentUser,
          ...res.data.user
        };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        console.log("✅ Updated localStorage:", updatedUser);
      }

      setIsEditModalOpen(false);
      setSelectedFile(null);
      alert("Cập nhật hồ sơ thành công!");
      
      if (res.data.user.username !== username) {
        navigate(`/profile/${res.data.user.username}`);
        window.location.reload();
      } else {
        await fetchProfile();
        window.location.reload();
      }
    } catch (error) {
      console.error("❌ Lỗi cập nhật profile:", error);
      console.error("❌ Error response:", error.response?.data);
      alert(error.response?.data?.message || "Cập nhật thất bại. Vui lòng kiểm tra lại!");
    } finally {
      setIsUpdating(false);
    }
  };

  // ==========================================
  // LOGIC MỚI: FOLLOW/UNFOLLOW, SHARE, FILTER, HIGHLIGHTS, SETTINGS
  // ==========================================
  const handleFollowToggle = async () => {
    try {
      if (!profileData?.user?._id) return;

      const res = await api.put(
        `users/${profileData.user._id}/follow`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setIsFollowing(res.data.isFollowing);
      if (res.data.isPending !== undefined) {
        setIsPending(res.data.isPending);
      }
      // Refresh profile data to update counts
      await fetchProfile();
    } catch (error) {
      console.error("Lỗi follow/unfollow:", error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  // Fetch followers list
  const fetchFollowers = async () => {
    try {
      setLoadingFollowers(true);
      const res = await api.get(`users/${username}/followers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowersList(res.data.followers || []);
      setShowFollowersModal(true);
    } catch (error) {
      console.error("Lỗi tải followers:", error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setLoadingFollowers(false);
    }
  };

  // Fetch following list
  const fetchFollowing = async () => {
    try {
      setLoadingFollowing(true);
      const res = await api.get(`users/${username}/following`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowingList(res.data.following || []);
      setShowFollowingModal(true);
    } catch (error) {
      console.error("Lỗi tải following:", error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra!');
    } finally {
      setLoadingFollowing(false);
    }
  };

  // Handle follow/unfollow from modal
  const handleModalFollowToggle = async (userId) => {
    try {
      const res = await api.put(
        `users/${userId}/follow`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update both followers and following lists
      setFollowersList(prev => prev.map(user =>
        user._id === userId ? { ...user, isFollowing: res.data.isFollowing } : user
      ));
      setFollowingList(prev => prev.map(user =>
        user._id === userId ? { ...user, isFollowing: res.data.isFollowing } : user
      ));

      // If we're on our own profile, refresh the profile data
      if (currentUser.username === username) {
        await fetchProfile();
      }
    } catch (error) {
      console.error("Lỗi follow/unfollow từ modal:", error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const handleShareProfile = () => {
    setShowShareModal(true);
  };



  const getFilteredPosts = () => {
    if (!posts) return [];
    let filtered = [...posts];

    // Lọc bài viết theo Tab hoạt động (Bài viết có media vs Trạng thái thuần text)
    if (activeTab === 'posts') {
      filtered = filtered.filter(post => (post.images && post.images.length > 0) || post.image);
    } else if (activeTab === 'status') {
      filtered = filtered.filter(post => (!post.images || post.images.length === 0) && !post.image);
    }

    switch(filterMode) {
      case 'popular':
        return filtered.sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'recent':
      default:
        return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
  };

  // LOGIC SETTINGS - LƯU VÀO LOCALSTORAGE & BACKEND
  const handleSettingChange = async (key, value) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    localStorage.setItem('userSettings', JSON.stringify(newSettings));

    // Apply dark mode ngay lập tức
    if (key === 'darkMode') {
      document.documentElement.classList.toggle('dark', value);
    }

    if (key === 'privateAccount') {
      try {
        const res = await api.put('users/profile', {
          isPrivateAccount: value
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Cập nhật lại trong localStorage 'user'
        const storedUser = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : {};
        storedUser.isPrivateAccount = res.data.user.isPrivateAccount;
        localStorage.setItem('user', JSON.stringify(storedUser));
        
        // Refresh profile để cập nhật trạng thái UI
        await fetchProfile();
      } catch (err) {
        console.error("Lỗi cập nhật chế độ riêng tư:", err);
      }
    }
  };

  const fetchFollowRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get('users/follow-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowRequests(res.data || []);
    } catch (err) {
      console.error("Lỗi lấy yêu cầu theo dõi:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleAcceptRequest = async (requesterId) => {
    try {
      await api.post(`users/follow-requests/${requesterId}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowRequests(prev => prev.filter(r => r._id !== requesterId));
      await fetchProfile();
    } catch (err) {
      console.error("Lỗi chấp nhận yêu cầu:", err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  const handleDeclineRequest = async (requesterId) => {
    try {
      await api.post(`users/follow-requests/${requesterId}/decline`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFollowRequests(prev => prev.filter(r => r._id !== requesterId));
    } catch (err) {
      console.error("Lỗi từ chối yêu cầu:", err);
      alert(err.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  useEffect(() => {
    if (showSettingsModal && isOwnProfile) {
      fetchFollowRequests();
      setSettingsTab('general');
    }
  }, [showSettingsModal, isOwnProfile]);

  useEffect(() => {
    if (isOwnProfile && profileData?.user) {
      setSettings(prev => ({
        ...prev,
        privateAccount: profileData.user.isPrivateAccount || false
      }));
    }
  }, [profileData, isOwnProfile]);

  const handleLogout = () => {
    if (confirm('Bạn có chắc muốn đăng xuất?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
  };

  const handleMessageClick = () => {
    navigate(`/messages?userId=${profileData.user._id}`);
  };

  if (loading) return <div className="p-20 text-center flex flex-col items-center gap-4"><FiLoader className="animate-spin text-pink-500" size={30}/> Đang tải hồ sơ...</div>;
  if (!profileData) return <div className="p-20 text-center italic text-slate-500">Người dùng không tồn tại.</div>;

  const { user, posts, postCount } = profileData;

  return (
    <div className="max-w-[935px] mx-auto pt-8 px-4 pb-20 font-sans bg-white">
      <Link to="/home" className="inline-flex items-center gap-2 mb-8 text-slate-800 hover:text-pink-600 font-bold transition">
        <FiArrowLeft size={22} /> Quay về Trang chủ
      </Link>

      {/* HEADER PROFILE - NÂNG CẤP */}
      <header className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-12 mb-8 pb-8 border-b border-slate-100">
        <div className="relative">
          <div className="w-[100px] h-[100px] md:w-[150px] md:h-[150px] rounded-full flex-shrink-0">
            <img
              src={getSafeAvatar(user.avatar, user.username)}
              className="w-full h-full rounded-full object-cover shadow-sm border border-slate-100"
              alt="avt"
            />
          </div>
          {/* Badge Verified */}
          <div className="absolute bottom-2 right-2 bg-blue-500 rounded-full p-1.5 border-2 border-white">
            <FiAward size={18} className="text-white" />
          </div>
        </div>

        <div className="flex-1 text-center md:text-left pt-2 w-full">
          <div className="flex flex-col md:flex-row items-center gap-5 mb-6 justify-center md:justify-start">
            <h2 className="text-[28px] font-light text-slate-800">{user.username}</h2>

            {currentUser.username === username ? (
              <div className="flex gap-2 flex-wrap justify-center">
                <button
                  onClick={handleOpenEditModal}
                  className="bg-slate-100 hover:bg-slate-200 font-bold py-1.5 px-6 rounded-xl text-[14px] transition cursor-pointer"
                >
                  Chỉnh sửa
                </button>
                <button
                  onClick={() => setShowStatsModal(true)}
                  className="bg-slate-100 hover:bg-slate-200 font-bold py-1.5 px-6 rounded-xl text-[14px] transition cursor-pointer"
                >
                  Thống kê
                </button>
                <button
                  onClick={handleShareProfile}
                  className="bg-slate-100 hover:bg-slate-200 font-bold py-1.5 px-4 rounded-xl text-[14px] transition cursor-pointer"
                >
                  <FiShare2 size={16} />
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleFollowToggle}
                  className={`font-bold py-1.5 px-8 rounded-xl text-[14px] transition flex items-center gap-2 ${
                    isFollowing
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-800 shadow-sm'
                      : isPending
                      ? 'bg-slate-100 hover:bg-slate-200 text-slate-500 shadow-sm'
                      : 'bg-pink-100 hover:bg-pink-200 text-pink-600'
                  }`}
                >
                  {isFollowing ? (
                    <FiUserCheck size={16} />
                  ) : isPending ? (
                    <FiClock size={16} />
                  ) : (
                    <FiUserPlus size={16} />
                  )}
                  {isFollowing ? 'Đang theo dõi' : isPending ? 'Đang chờ duyệt' : 'Theo dõi'}
                </button>

                {/* Nút Nhắn tin: Ẩn nếu TK riêng tư và chưa được duyệt follow */}
                {(!profileData?.user?.isPrivateAccount || isFollowing) && (
                  <button
                    onClick={handleMessageClick}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-1.5 px-6 rounded-xl text-[14px] transition"
                  >
                    Nhắn tin
                  </button>
                )}
              </div>
            )}
            {isOwnProfile && (
              <FiSettings size={22} className="cursor-pointer text-slate-600 hover:text-slate-900 transition" onClick={() => setShowSettingsModal(true)} />
            )}
          </div>

          {/* Stats với animation */}
          <div className="flex gap-8 mb-5 font-medium text-slate-700 justify-center md:justify-start">
            <div className="flex flex-col items-center md:items-start cursor-pointer hover:scale-105 transition">
              <span className="text-[20px] font-bold text-slate-900">{postCount}</span>
              <span className="text-[13px] text-slate-500">bài viết</span>
            </div>
            <div
              className="flex flex-col items-center md:items-start cursor-pointer hover:scale-105 transition"
              onClick={() => {
                if (profileData?.user?.isPrivateAccount && !isOwnProfile && !isFollowing) {
                  alert("Tài khoản này là riêng tư. Hãy theo dõi để xem người theo dõi.");
                  return;
                }
                fetchFollowers();
              }}
            >
              <span className="text-[20px] font-bold text-slate-900">
                {profileData?.user?.followerCount || 0}
              </span>
              <span className="text-[13px] text-slate-500">người theo dõi</span>
            </div>
            <div
              className="flex flex-col items-center md:items-start cursor-pointer hover:scale-105 transition"
              onClick={() => {
                if (profileData?.user?.isPrivateAccount && !isOwnProfile && !isFollowing) {
                  alert("Tài khoản này là riêng tư. Hãy theo dõi để xem những người đang theo dõi.");
                  return;
                }
                fetchFollowing();
              }}
            >
              <span className="text-[20px] font-bold text-slate-900">
                {profileData?.user?.followingCount || 0}
              </span>
              <span className="text-[13px] text-slate-500">đang theo dõi</span>
            </div>
          </div>

          <p className="font-bold text-slate-900 text-[15px]">{user.fullname || "Chưa cập nhật tên"}</p>
          <p className="text-slate-600 mt-1 max-w-md leading-relaxed text-[14px]">{user.bio}</p>

        </div>
      </header>

      {/* TABS ĐIỀU HƯỚNG VÀ BỘ LỌC */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center border-t border-slate-200 gap-2 sm:gap-0">
          {/* Tabs */}
          <div className="flex overflow-x-auto hide-scroll w-full sm:w-auto border-b sm:border-b-0 border-slate-100">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 text-[12px] sm:text-[13px] font-bold tracking-wide transition whitespace-nowrap ${
                activeTab === 'posts'
                  ? 'text-slate-900 border-b-2 sm:border-t-2 sm:border-b-0 border-slate-900 sm:-mt-[1px]'
                  : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent sm:border-0'
              }`}
            >
              <FiGrid size={16} />
              BÀI VIẾT
            </button>
            {isOwnProfile && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 text-[12px] sm:text-[13px] font-bold tracking-wide transition whitespace-nowrap ${
                  activeTab === 'saved'
                    ? 'text-slate-900 border-b-2 sm:border-t-2 sm:border-b-0 border-slate-900 sm:-mt-[1px]'
                    : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent sm:border-0'
                }`}
              >
                <FiBookmark size={16} />
                ĐÃ LƯU
              </button>
            )}
            <button
              onClick={() => setActiveTab('status')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-6 py-3 text-[12px] sm:text-[13px] font-bold tracking-wide transition whitespace-nowrap ${
                activeTab === 'status'
                  ? 'text-slate-900 border-b-2 sm:border-t-2 sm:border-b-0 border-slate-900 sm:-mt-[1px]'
                  : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent sm:border-0'
              }`}
            >
              <FiAlignLeft size={16} />
              TRẠNG THÁI
            </button>
          </div>

          {/* View Mode & Filter */}
          {(activeTab === 'posts' || activeTab === 'status') && (
            <div className="flex gap-2 items-center justify-end px-2 sm:px-0">
              {/* Filter Dropdown */}
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 text-[13px] font-bold text-slate-600 hover:text-slate-900 transition">
                  <FiFilter size={16} />
                  {filterMode === 'recent' && 'Mới nhất'}
                  {filterMode === 'popular' && 'Phổ biến'}
                  {filterMode === 'oldest' && 'Cũ nhất'}
                </button>
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg py-2 min-w-[150px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                  <button
                    onClick={() => setFilterMode('recent')}
                    className="w-full px-4 py-2 text-left text-[13px] hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FiClock size={14} /> Mới nhất
                  </button>
                  <button
                    onClick={() => setFilterMode('popular')}
                    className="w-full px-4 py-2 text-left text-[13px] hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FiTrendingUp size={14} /> Phổ biến
                  </button>
                  <button
                    onClick={() => setFilterMode('oldest')}
                    className="w-full px-4 py-2 text-left text-[13px] hover:bg-slate-50 flex items-center gap-2"
                  >
                    <FiClock size={14} /> Cũ nhất
                  </button>
                </div>
              </div>

              {/* View Mode Toggle */}
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded transition ${
                    viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                  }`}
                  title="Lưới"
                >
                  <BsGrid3X3 size={16} className={viewMode === 'grid' ? 'text-slate-900' : 'text-slate-500'} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded transition ${
                    viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-slate-200'
                  }`}
                  title="Danh sách"
                >
                  <BsListUl size={16} className={viewMode === 'list' ? 'text-slate-900' : 'text-slate-500'} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* GRID POSTS - CẢI TIẾN VỚI VIEW MODES */}
      {(activeTab === 'posts' || activeTab === 'status') && (
        <>
          {profileData?.user?.isPrivateAccount && !isOwnProfile && !isFollowing ? (
            <div className="text-center py-20 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 animate-fade-in flex flex-col items-center justify-center p-6">
              <div className="bg-gradient-to-tr from-pink-500 to-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                <FiLock size={26} />
              </div>
              <p className="text-[15px] font-extrabold text-slate-700 mb-1">
                Đây là tài khoản riêng tư
              </p>
              <p className="text-[13px] text-slate-400 max-w-[280px] mx-auto">
                Hãy theo dõi tài khoản này để xem các bài viết và hình ảnh/video của họ.
              </p>
            </div>
          ) : getFilteredPosts().length === 0 ? (
            <div className="text-center py-20 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 animate-fade-in">
              <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                {activeTab === 'posts' ? (
                  <FiGrid size={28} className="text-slate-400" />
                ) : (
                  <FiAlignLeft size={28} className="text-slate-400" />
                )}
              </div>
              <p className="text-[15px] font-semibold text-slate-700 mb-1">
                {activeTab === 'posts' ? 'Chưa có bài viết hình ảnh/video nào' : 'Chưa có trạng thái chữ nào'}
              </p>
              <p className="text-[13px] text-slate-400">
                {activeTab === 'posts' ? 'Các bài viết có đính kèm media của bạn sẽ xuất hiện tại đây.' : 'Các bài viết trạng thái ngắn của bạn sẽ xuất hiện tại đây.'}
              </p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' && (
                <div className="grid grid-cols-3 gap-1 md:gap-2">
                  {getFilteredPosts().map((post) => (
                    <GridPostItem
                      key={post._id}
                      post={post}
                      onClick={() => openPostDetail(post)}
                      isVideo={isVideo}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'list' && (
                <div className="space-y-6">
                  {getFilteredPosts().map((post) => {
                    const firstMedia = post.images?.[0] || post.image;
                    const isVideoPost = isVideo(firstMedia);
                    const hasMedia = (post.images && post.images.length > 0) || post.image;

                    return (
                      <div
                        key={post._id}
                        className="bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                        onClick={() => openPostDetail(post)}
                      >
                        <div className="flex gap-4 p-4">
                          {hasMedia && (
                            <div className="w-32 h-32 flex-shrink-0 rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                              {isVideoPost ? (
                                <video
                                  src={firstMedia}
                                  className="w-full h-full object-cover"
                                  muted
                                  playsInline
                                />
                              ) : (
                                <img
                                  src={firstMedia}
                                  className="w-full h-full object-cover"
                                  alt="p"
                                />
                              )}
                            </div>
                          )}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <img
                                  src={getSafeAvatar(user.avatar, user.username)}
                                  className="w-8 h-8 rounded-full object-cover"
                                  alt="avatar"
                                />
                                <span className="font-bold text-[14px]">{user.username}</span>
                                <span className="text-slate-400 text-[12px]">
                                  {new Date(post.createdAt).toLocaleDateString('vi-VN')}
                                </span>
                                {isVideoPost && (
                                  <span className="bg-pink-100 text-pink-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                    VIDEO
                                  </span>
                                )}
                              </div>
                              <p className="text-slate-700 text-[14px] line-clamp-3 mb-3 leading-relaxed">
                                {post.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-slate-500 text-[13px] mt-auto">
                              <div className="flex items-center gap-1 hover:text-pink-600 transition">
                                <FiHeart size={16} />
                                <span>{post.likes?.length || 0} lượt thích</span>
                              </div>
                              <div className="flex items-center gap-1 hover:text-purple-600 transition">
                                <FiMessageCircle size={16} />
                                <span>{post.commentCount || 0} bình luận</span>
                              </div>
                              {post.images && post.images.length > 1 && (
                                <div className="flex items-center gap-1">
                                  <BsCollectionPlay size={16} />
                                  <span>{post.images.length} media</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* TAB ĐÃ LƯU */}
      {activeTab === 'saved' && isOwnProfile && (
        <>
          {loadingSaved ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FiLoader className="animate-spin text-pink-500 mb-3" size={28} />
              <p className="text-slate-500 text-[14px]">Đang tải bài viết đã lưu...</p>
            </div>
          ) : savedPostsList.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <div className="bg-slate-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <FiBookmark size={32} className="text-slate-400" />
              </div>
              <p className="text-[16px] font-bold text-slate-700 mb-2">Chưa có bài viết đã lưu</p>
              <p className="text-[14px] text-slate-500">Lưu các bài viết yêu thích để xem lại sau</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1 md:gap-2">
              {savedPostsList.map((post) => (
                <GridPostItem
                  key={post._id}
                  post={post}
                  onClick={() => openPostDetail(post)}
                  isVideo={isVideo}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* MODAL CÀI ĐẶT (SETTINGS) */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-[550px] rounded-3xl overflow-hidden shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 z-10">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-[20px] text-slate-900">⚙️ Cài đặt tài khoản</h3>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="hover:bg-slate-100 p-2 rounded-full transition cursor-pointer"
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-col">
                {/* Quyền riêng tư */}
                <div>
                  <h4 className="font-bold text-[15px] text-slate-900 mb-3 flex items-center gap-2">
                    🔒 Quyền riêng tư
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition cursor-pointer">
                      <div>
                        <p className="font-bold text-[14px] text-slate-800">Tài khoản riêng tư</p>
                        <p className="text-[12px] text-slate-500">Chỉ người theo dõi mới xem được bài viết</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          className="sr-only peer"
                          checked={settings.privateAccount}
                          onChange={(e) => handleSettingChange('privateAccount', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-pink-500"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Logout Button */}
                <div className="mt-8 pt-6 border-t border-slate-100">
                  <button
                    onClick={() => {
                      if (window.confirm("Bạn có chắc chắn muốn đăng xuất không?")) {
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.href = '/login';
                      }
                    }}
                    className="w-full py-3.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[14px] font-bold transition flex items-center justify-center cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
              </div>
            </div>
      </div>
    </div>
  )}

      {/* MODAL THỐNG KÊ PROFILE */}
      {showStatsModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-[600px] rounded-3xl overflow-hidden shadow-2xl relative">
            <div className="bg-gradient-to-r from-pink-500 to-purple-500 p-6 text-white">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[20px]">📊 Thống kê tài khoản</h3>
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="hover:bg-white/20 p-2 rounded-full transition cursor-pointer"
                >
                  <FiX size={20} />
                </button>
              </div>
              <p className="text-pink-100 text-[14px]">Tổng quan hoạt động của bạn</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Thống kê tổng quan */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-pink-500 rounded-full p-2">
                      <FiHeart size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[24px] font-bold text-pink-900">
                        {posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0)}
                      </p>
                      <p className="text-[12px] text-pink-700">Tổng lượt thích</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-purple-500 rounded-full p-2">
                      <FiMessageCircle size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[24px] font-bold text-purple-900">
                        {posts.reduce((sum, post) => sum + (post.commentCount || 0), 0)}
                      </p>
                      <p className="text-[12px] text-purple-700">Tổng bình luận</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-500 rounded-full p-2">
                      <FiGrid size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[24px] font-bold text-blue-900">{postCount}</p>
                      <p className="text-[12px] text-blue-700">Tổng bài viết</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-orange-500 rounded-full p-2">
                      <FiTrendingUp size={20} className="text-white" />
                    </div>
                    <div>
                      <p className="text-[24px] font-bold text-orange-900">
                        {posts.length > 0 ? Math.round(posts.reduce((sum, post) => sum + (post.likes?.length || 0), 0) / posts.length) : 0}
                      </p>
                      <p className="text-[12px] text-orange-700">TB thích/bài</p>
                    </div>
                  </div>
                </div>
              </div>



            </div>
          </div>
        </div>
      )}

      {/* MODAL CHIA SẺ PROFILE */}
      <ModalShareProfile
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        profileUser={user}
      />

      {isEditModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-[500px] rounded-3xl overflow-hidden shadow-2xl relative p-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="font-bold text-[18px] text-slate-900">Chỉnh sửa hồ sơ</h3>
              <button onClick={() => setIsEditModalOpen(false)} className="hover:bg-slate-100 p-2 rounded-full transition cursor-pointer">
                <FiX size={20} />
              </button>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-6">
              {/* Khu vực Upload Avatar */}
              <div className="flex flex-col items-center justify-center">
                <div className="relative w-24 h-24 rounded-full border-2 border-pink-500 p-0.5 group">
                  <img src={previewAvatar} className="w-full h-full rounded-full object-cover" alt="Preview Avatar" />
                  <label htmlFor="avatarUpload" className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer text-white">
                    <FiCamera size={22} />
                  </label>
                  <input type="file" id="avatarUpload" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
                <label htmlFor="avatarUpload" className="text-pink-600 font-bold text-[13px] mt-2 cursor-pointer hover:underline">
                  Thay đổi ảnh đại diện
                </label>
              </div>

              {/* Tên đăng nhập */}
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Tên đăng nhập (Username)</label>
                <input 
                  type="text" 
                  value={editUsername} 
                  onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/\s/g, ''))} 
                  placeholder="Ví dụ: tvu_cute"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 text-[14px]"
                  required
                />
              </div>

              {/* Tên hiển thị */}
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Họ và tên (Fullname)</label>
                <input 
                  type="text" 
                  value={editFullname} 

                  onChange={(e) => setEditFullname(e.target.value)} 
                  placeholder="Nhập tên hiển thị..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 text-[14px]"
                />
              </div>

              {/* Tiểu sử */}
              <div>
                <label className="block text-[13px] font-bold text-slate-700 mb-1.5">Tiểu sử (Bio)</label>
                <textarea 
                  rows="3"
                  value={editBio} 
                  onChange={(e) => setEditBio(e.target.value)} 
                  placeholder="Giới thiệu đôi nét về bạn..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-pink-500 text-[14px] resize-none"
                />
              </div>

              {/* Các nút hành động */}
              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition text-[14px] cursor-pointer"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  disabled={isUpdating}
                  className="px-6 py-2 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-bold transition text-[14px] disabled:opacity-50 flex items-center gap-2 shadow-md cursor-pointer"
                >
                  {isUpdating && <FiLoader className="animate-spin" />}
                  {isUpdating ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL FOLLOWERS */}
      {showFollowersModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-[500px] rounded-3xl overflow-hidden shadow-2xl relative max-h-[80vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 z-10">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-[20px] text-slate-900">👥 Người theo dõi</h3>
                <button
                  onClick={() => setShowFollowersModal(false)}
                  className="hover:bg-slate-100 p-2 rounded-full transition cursor-pointer"
                >
                  <FiX size={20} />
                </button>
              </div>
              <p className="text-slate-500 text-[14px] mt-1">
                {followersList.length} người theo dõi {user.username}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingFollowers ? (
                <div className="flex justify-center items-center py-10">
                  <FiLoader className="animate-spin text-pink-500" size={30} />
                </div>
              ) : followersList.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FiUserPlus size={32} className="text-slate-400" />
                  </div>
                  <p className="text-[16px] font-bold text-slate-700 mb-2">Chưa có người theo dõi</p>
                  <p className="text-[14px] text-slate-500">Khi có người theo dõi, họ sẽ xuất hiện ở đây</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followersList.map((follower) => (
                    <div key={follower._id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition">
                      <Link
                        to={`/profile/${follower.username}`}
                        onClick={() => setShowFollowersModal(false)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <img
                          src={follower.avatar || `https://ui-avatars.com/api/?name=${follower.username}&background=fbcfe8&color=be185d`}
                          alt={follower.username}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[15px] text-slate-900 truncate">{follower.username}</p>
                          <p className="text-slate-500 text-[13px] truncate">
                            {follower.fullname || `@${follower.username}`}
                          </p>
                        </div>
                      </Link>
                      {currentUser._id !== follower._id && (
                        <button
                          onClick={() => handleModalFollowToggle(follower._id)}
                          className={`px-4 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer flex-shrink-0 ml-2 ${
                            follower.isFollowing
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white'
                          }`}
                        >
                          {follower.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL FOLLOWING */}
      {showFollowingModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white w-full max-w-[500px] rounded-3xl overflow-hidden shadow-2xl relative max-h-[80vh] flex flex-col">
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 z-10">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-[20px] text-slate-900">👤 Đang theo dõi</h3>
                <button
                  onClick={() => setShowFollowingModal(false)}
                  className="hover:bg-slate-100 p-2 rounded-full transition cursor-pointer"
                >
                  <FiX size={20} />
                </button>
              </div>
              <p className="text-slate-500 text-[14px] mt-1">
                {user.username} đang theo dõi {followingList.length} người
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingFollowing ? (
                <div className="flex justify-center items-center py-10">
                  <FiLoader className="animate-spin text-pink-500" size={30} />
                </div>
              ) : followingList.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <FiUserPlus size={32} className="text-slate-400" />
                  </div>
                  <p className="text-[16px] font-bold text-slate-700 mb-2">Chưa theo dõi ai</p>
                  <p className="text-[14px] text-slate-500">Khi bạn theo dõi ai đó, họ sẽ xuất hiện ở đây</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {followingList.map((followingUser) => (
                    <div key={followingUser._id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition">
                      <Link
                        to={`/profile/${followingUser.username}`}
                        onClick={() => setShowFollowingModal(false)}
                        className="flex items-center gap-3 flex-1 min-w-0"
                      >
                        <img
                          src={followingUser.avatar || `https://ui-avatars.com/api/?name=${followingUser.username}&background=fbcfe8&color=be185d`}
                          alt={followingUser.username}
                          className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[15px] text-slate-900 truncate">{followingUser.username}</p>
                          <p className="text-slate-500 text-[13px] truncate">
                            {followingUser.fullname || `@${followingUser.username}`}
                          </p>
                        </div>
                      </Link>
                      {currentUser._id !== followingUser._id && (
                        <button
                          onClick={() => handleModalFollowToggle(followingUser._id)}
                          className={`px-4 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer flex-shrink-0 ml-2 ${
                            followingUser.isFollowing
                              ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                              : 'bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white'
                          }`}
                        >
                          {followingUser.isFollowing ? 'Đang theo dõi' : 'Theo dõi'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT BÀI VIẾT */}
      {selectedPost && (() => {
        const hasMedia = (selectedPost.images && selectedPost.images.length > 0 && selectedPost.images[0] !== "") || (selectedPost.image && selectedPost.image !== "");
        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <div className={`bg-white w-full h-[90vh] flex rounded-[32px] overflow-hidden shadow-2xl relative animate-scale-in transition-all duration-300 ${hasMedia ? 'max-w-[1100px]' : 'max-w-[700px]'}`}>

              <button
                onClick={() => setSelectedPost(null)}
                className="absolute top-5 right-5 z-[120] w-9 h-9 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all cursor-pointer shadow-sm"
              >
                <FiX size={20} className="stroke-[2.5]" />
              </button>

              {/* TRÁI: Image Carousel */}
              {hasMedia && (
                <div className="w-[60%] bg-black flex items-center justify-center relative">
                   <ImageCarousel
                      images={selectedPost.images || [selectedPost.image]}
                      postId={selectedPost._id}
                      handleLikePost={handleLikePost}
                      currentUser={currentUser}
                   />
                </div>
              )}

              {/* PHẢI: Bình luận */}
              <div className={`${hasMedia ? 'w-[40%]' : 'w-full'} flex flex-col bg-white ${hasMedia ? 'border-l border-slate-100' : ''}`}>
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scroll">
                  {/* Caption của bài viết */}
                  {!hasMedia ? (
                    <div className="bg-gradient-to-br from-pink-50/70 via-purple-50/70 to-indigo-50/70 border border-purple-100/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-sm relative overflow-hidden select-none mb-4">
                      {/* Decorative double quote icon */}
                      <span className="absolute -top-4 -left-2 text-[100px] font-serif text-pink-200/40 leading-none select-none">“</span>
                      
                      <div className="flex flex-col items-center gap-3 mb-5 relative z-10">
                        <img
                          src={getSafeAvatar(user.avatar, user.username, user.updatedAt)}
                          className="w-14 h-14 rounded-full object-cover shadow-md border-2 border-white"
                          alt="avatar"
                        />
                        <div>
                          <div className="font-bold text-[16px] text-slate-900">{user.username}</div>
                          <div className="text-[12px] text-slate-400 mt-0.5">{formatDate(selectedPost.createdAt)}</div>
                        </div>
                      </div>

                      <p className="text-[16px] md:text-[18px] font-medium text-slate-800 leading-relaxed max-w-2xl px-4 relative z-10 italic">
                        "{renderContentWithHashtags(selectedPost.content)}"
                      </p>
                    </div>
                  ) : (
                    <div className="flex gap-3 text-[14px]">
                       <img
                         src={getSafeAvatar(user.avatar, user.username, user.updatedAt)}
                         className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                         alt="avatar"
                       />
                       <div className="flex-1">
                          <div className="font-bold text-slate-900">{user.username}</div>
                          <div className="text-slate-700 mt-0.5 whitespace-pre-wrap">{renderContentWithHashtags(selectedPost.content)}</div>
                          <div className="text-[11px] text-slate-400 mt-1">{formatDate(selectedPost.createdAt)}</div>
                       </div>
                    </div>
                  )}

                {/* Danh sách bình luận */}
                {postComments[selectedPost._id]?.map((comment) => (
                  <CommentItem
                    key={comment._id}
                    comment={comment}
                    currentUser={currentUser}
                    postAuthorId={selectedPost.userId?._id || selectedPost.userId}
                    onDelete={handleDeleteComment}
                    onReport={(targetComment) => {
                      setReportingComment(targetComment);
                      setReportReason("");
                    }}
                    onReply={(parentId, username) => {
                      setReplyingTo({ parentId, username });
                      setCommentText(`@${username} `);
                    }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between gap-2 px-4 py-2 border-t border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  {(() => {
                    const isLiked = selectedPost.likes?.includes(currentUser?._id);
                    return (
                      <button
                        type="button"
                        onClick={() => handleLikePost(selectedPost._id)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl transition font-semibold text-[13px] cursor-pointer ${isLiked ? 'bg-pink-50 text-pink-600' : 'hover:bg-pink-50 text-slate-700 hover:text-pink-600'}`}
                      >
                        <FiHeart className={`text-[18px] ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
                        <span>{selectedPost.likes?.length || 0}</span>
                      </button>
                    );
                  })()}
                </div>
                <BookmarkButton
                  isSaved={isPostSaved(selectedPost._id)}
                  onClick={() => handleToggleSavePost(selectedPost._id)}
                  className="!px-3 !py-2"
                />
              </div>

              {/* KHU VỰC NHẬP BÌNH LUẬN */}
              <div className="p-3 border-t border-slate-100 bg-white">
                {replyingTo && (
                  <div className="flex justify-between items-center bg-pink-50 px-3 py-1 rounded-lg text-[12px] mb-2 text-pink-700">
                    <span>Đang trả lời <b>{replyingTo.username}</b></span>
                    <button onClick={() => { setReplyingTo(null); setCommentText(""); }} className="hover:bg-pink-100 rounded-full p-0.5 cursor-pointer">
                      <FiX size={14} />
                    </button>
                  </div>
                )}
                <form onSubmit={(e) => handleSubmitComment(e, selectedPost._id)} className="flex items-center gap-2 px-2 py-1">
                  <img
                    src={getSafeAvatar(currentUser?.avatar, currentUser?.username, currentUser?.updatedAt)}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    alt="avatar"
                  />
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Thêm bình luận..."
                    className="flex-1 bg-transparent outline-none text-[13px] px-2"
                  />
                  <button type="submit" disabled={!commentText.trim()} className="text-pink-600 font-bold text-[13px] disabled:opacity-30 cursor-pointer">
                    Gửi
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )})()}
      {/* MODAL BÁO CÁO BÌNH LUẬN */}
      {reportingComment && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-[450px] rounded-3xl p-6 shadow-2xl animate-scale-in relative border border-slate-100">
            <button
              onClick={() => setReportingComment(null)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all cursor-pointer shadow-sm animate-pulse"
            >
              <FiX size={16} />
            </button>
            <div className="flex items-center gap-2.5 mb-4 text-red-600">
              <FiFlag className="text-[20px]" />
              <h3 className="text-[18px] font-bold">Báo cáo bình luận</h3>
            </div>
            
            <p className="text-[13px] text-slate-500 mb-4 bg-slate-50 p-3 rounded-2xl italic border border-slate-100">
              "{reportingComment.content}"
            </p>

            <form onSubmit={handleReportComment} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                  Lý do báo cáo
                </label>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Nhập lý do chi tiết..."
                  rows={4}
                  className="w-full text-[13px] border border-slate-200 focus:border-pink-500 rounded-2xl p-3 outline-none transition resize-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingComment(null)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-[13px] hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold text-[13px] hover:shadow-md transition cursor-pointer"
                >
                  Gửi báo cáo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
