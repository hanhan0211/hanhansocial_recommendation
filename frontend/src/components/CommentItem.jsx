import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiMoreHorizontal, FiFlag, FiTrash2 } from 'react-icons/fi';

const getSafeAvatar = (avatarUrl, fallbackName, updatedAt) => {
  if (avatarUrl && avatarUrl.trim() !== "") {
    const cacheBusted = updatedAt ? `${avatarUrl}?t=${new Date(updatedAt).getTime()}` : avatarUrl;
    return cacheBusted;
  }
  const name = fallbackName || "User";
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fbcfe8&color=be185d`;
};

const formatDate = (dateString) => {
  if (!dateString) return "";
  const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('vi-VN', options);
};

const renderCommentContent = (text) => {
  if (!text) return '';
  // Tách text bằng Regex chứa hashtag tiếng Việt và tiếng Anh
  const parts = text.split(/(#[a-zA-Z0-9_À-ỹ]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return (
        <Link
          key={index}
          to={`/explore/${encodeURIComponent(tag.toLowerCase())}`}
          className="text-blue-500 hover:text-blue-700 hover:underline font-semibold cursor-pointer"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
};

const CommentItem = ({
  comment,
  currentUser,
  postAuthorId,
  onDelete,
  onReport,
  onReply,
  parentId = null, // Nếu truyền vào thì đây là bình luận con (reply)
  isReply = false
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const menuRef = useRef(null);

  // Đóng menu khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const commenterId = comment.userId?._id || comment.userId;
  const postAuthorStr = postAuthorId?._id || postAuthorId;
  const currentUserStr = currentUser?._id;

  const isMyComment = currentUserStr === commenterId;
  const isMyPost = currentUserStr === postAuthorStr;

  const canDelete = isMyComment || isMyPost;
  const canReport = !isMyComment; // Không được báo cáo bình luận của chính mình

  const avatarSize = isReply ? "w-7 h-7" : "w-9 h-9";
  const fontSize = isReply ? "text-[13px]" : "text-[14px]";

  return (
    <div className={`space-y-3 pt-2 ${!isReply ? 'border-t border-slate-50' : ''}`}>
      <div className={`flex gap-3 items-start w-full ${fontSize} group`}>
        {/* Cột trái: Avatar */}
        <img
          src={getSafeAvatar(comment.userId?.avatar || comment.avatar, comment.userId?.username || comment.username, comment.userId?.updatedAt || comment.updatedAt)}
          className={`${avatarSize} rounded-full object-cover flex-shrink-0`}
          alt="avatar"
        />

        {/* Cột phải: Chiếm diện tích còn lại */}
        <div className="flex-1">
          {/* Dòng 1: Username + Nội dung bình luận và nút 3 chấm */}
          <div className="flex justify-between items-start w-full gap-2">
            <div className="text-slate-700 leading-relaxed break-words text-left flex-1">
              <span className="font-bold mr-2 text-slate-900 inline">{comment.userId?.username || comment.username || "Người dùng"}</span>
              <span className="inline">{renderCommentContent(comment.content)}</span>
            </div>

            {/* Dropdown Menu bên phải */}
            {(canDelete || canReport) && (
              <div className="relative flex-shrink-0" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1 hover:bg-slate-100 rounded-full text-gray-400 hover:text-gray-700 transition cursor-pointer"
                >
                  <FiMoreHorizontal size={isReply ? 16 : 18} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-1 w-32 bg-white border border-slate-100 rounded-xl shadow-lg py-1 z-40 animate-scale-in">
                    {canReport && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onReport(comment);
                        }}
                        className="w-full text-left px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <FiFlag size={14} />
                        Báo cáo
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          onDelete(comment._id);
                        }}
                        className={`w-full text-left px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition flex items-center gap-2 cursor-pointer font-medium ${canReport ? 'border-t border-slate-50' : ''}`}
                      >
                        <FiTrash2 size={14} />
                        Xóa
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dòng 2: Thời gian và nút Trả lời */}
          <div className="flex items-center gap-4 mt-1 text-[11px] sm:text-[12px] text-slate-400">
            <span>{formatDate(comment.createdAt)}</span>
            <button
              onClick={() => onReply(parentId || comment._id, comment.userId?.username || comment.username)}
              className="font-bold hover:text-pink-600 transition cursor-pointer"
            >
              Trả lời
            </button>
          </div>

          {/* Danh sách câu trả lời của Bình luận cha */}
          {!isReply && comment.replies?.length > 0 && (
            <div className="mt-2">
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[12px] font-bold text-slate-400 mb-2 flex items-center gap-2 hover:text-slate-600 cursor-pointer"
              >
                <span className="w-6 h-[1px] bg-slate-200"></span>
                {expanded ? "Ẩn" : `Xem câu trả lời (${comment.replies.length})`}
              </button>
              {expanded && (
                <div className="space-y-3 border-l-2 border-slate-100 pl-3 mt-2">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply._id}
                      comment={reply}
                      currentUser={currentUser}
                      postAuthorId={postAuthorId}
                      onDelete={onDelete}
                      onReport={onReport}
                      onReply={onReply}
                      parentId={comment._id}
                      isReply={true}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentItem;
