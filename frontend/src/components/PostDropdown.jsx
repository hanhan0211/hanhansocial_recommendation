import React, { useState } from 'react';
import {
  FiMoreHorizontal,
  FiFlag,
  FiUserMinus,
  FiUserPlus,
  FiSend,
  FiCopy,
  FiEdit3,
  FiTrash2,
  FiX
} from 'react-icons/fi';
import api from '../api/axios';

const PostDropdown = ({
  post,
  currentUser,
  onDeletePost,
  onOpenReport,
  onOpenEdit,
  onOpenShare,
  activeMenuId,
  setActiveMenuId,
  fetchFeed
}) => {
  const [submittingFollow, setSubmittingFollow] = useState(false);

  if (!post || !currentUser) return null;

  // Xác định quyền sở hữu bài viết
  const authorId = post.userId?._id || post.userId;
  const isMyPost = currentUser?._id?.toString() === authorId?.toString();

  // Xác định trạng thái Follow
  const isFollowing = currentUser?.following?.some(
    (id) => id?.toString() === authorId?.toString()
  );


  // Follow / Unfollow User
  const handleToggleFollow = async () => {
    if (submittingFollow) return;
    setSubmittingFollow(true);
    try {
      const token = localStorage.getItem('token');
      await api.put(`users/${authorId}/follow`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Cập nhật lại localStorage user data để UI đồng bộ follow
      const updatedFollowing = isFollowing
        ? currentUser.following.filter(id => id.toString() !== authorId.toString())
        : [...(currentUser.following || []), authorId];
      
      const updatedUser = { ...currentUser, following: updatedFollowing };
      localStorage.setItem('user', JSON.stringify(updatedUser));

      alert(isFollowing ? "Đã bỏ theo dõi người dùng!" : "Đã theo dõi người dùng!");
      
      // KHÔNG gọi fetchFeed(true) ở đây nữa để tránh làm mất bài viết hiện tại khỏi màn hình
      setActiveMenuId(null);
    } catch (error) {
      alert("Lỗi khi cập nhật trạng thái theo dõi: " + (error.response?.data?.message || error.message));
    } finally {
      setSubmittingFollow(false);
    }
  };

  // Xử lý xóa bài viết và cập nhật UI ngay lập tức
  const handleDelete = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bài viết này không?")) return;
    try {
      const token = localStorage.getItem('token');
      await api.delete(`posts/${post._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert("Xóa bài viết thành công!");
      if (onDeletePost) {
        onDeletePost(post._id);
      }
      setActiveMenuId(null);
    } catch (error) {
      alert("Lỗi khi xóa bài viết: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setActiveMenuId(activeMenuId === post._id ? null : post._id)}
        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition cursor-pointer"
      >
        <FiMoreHorizontal className="text-xl" />
      </button>

      {activeMenuId === post._id && (
        <div className="absolute right-2 top-10 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-2.5 z-50 overflow-hidden animate-fade-in">
          {isMyPost ? (
            <>
              <button
                onClick={() => {
                  if (onOpenEdit) onOpenEdit(post);
                  setActiveMenuId(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[13.5px] font-semibold transition cursor-pointer"
              >
                <FiEdit3 size={16} className="text-blue-500" />
                Chỉnh sửa bài viết
              </button>
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 text-[13.5px] font-semibold transition cursor-pointer"
              >
                <FiTrash2 size={16} />
                Xóa bài viết
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  if (onOpenReport) onOpenReport(post._id);
                  setActiveMenuId(null);
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 text-red-600 text-[13.5px] font-semibold transition cursor-pointer"
              >
                <FiFlag size={16} />
                Báo cáo vi phạm
              </button>
              <button
                onClick={handleToggleFollow}
                disabled={submittingFollow}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[13.5px] font-semibold transition cursor-pointer disabled:opacity-50"
              >
                {isFollowing ? (
                  <>
                    <FiUserMinus size={16} className="text-amber-500" />
                    Bỏ theo dõi
                  </>
                ) : (
                  <>
                    <FiUserPlus size={16} className="text-pink-500" />
                    Theo dõi
                  </>
                )}
              </button>
            </>
          )}

          <div className="h-[1px] bg-slate-100 my-1.5 mx-4"></div>

          <button
            onClick={() => {
              if (onOpenShare) onOpenShare(post);
              setActiveMenuId(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-[13.5px] font-semibold transition cursor-pointer"
          >
            <FiSend size={16} className="text-violet-500" />
            Chia sẻ qua tin nhắn
          </button>
        </div>
      )}
    </div>
  );
};

export default PostDropdown;
