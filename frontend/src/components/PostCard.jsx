import React from 'react';
import { Link } from 'react-router-dom';
import {
  FiHeart,
  FiMessageCircle,
  FiSend,
  FiX,
} from 'react-icons/fi';
import ImageCarousel from './ImageCarousel';
import BookmarkButton from './BookmarkButton';

export const getSafeAvatar = (userObj) => {
  if (userObj?.avatar && userObj.avatar.trim() !== '') return userObj.avatar;
  const name = userObj?.username || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fbcfe8&color=be185d`;
};

export const formatPostDate = (dateString) => {
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  };
  return new Date(dateString).toLocaleDateString('vi-VN', options);
};

export const renderContentWithHashtags = (text) => {
  if (!text) return '';
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith('#')) {
      const tag = part.slice(1);
      return (
        <Link
          key={index}
          to={`/hashtag/${tag}`}
          className="text-blue-500 hover:underline cursor-pointer font-medium"
        >
          {part}
        </Link>
      );
    }
    return part;
  });
};

const PostCard = ({
  post,
  currentUser,
  posts = [],
  comments = [],
  showCommentsSection = false,
  onToggleComments,
  onLike,
  onShare,
  onToggleSave,
  isSaved = false,
  commentText = '',
  onCommentTextChange,
  onSubmitComment,
  replyingTo = null,
  onCancelReply,
  onReplyToComment,
  expandedReplies = {},
  onToggleReplies,
  myAvatar,
}) => {
  if (!post) return null;

  const isLiked = post.likes?.some(
    (id) => id?.toString() === currentUser?._id?.toString()
  );
  const mediaList = post.images || (post.image ? [post.image] : []);
  return (
    <article className="bg-white rounded-[32px] p-5 shadow-sm border border-slate-100 relative">
      <div className="flex items-center gap-3 mb-4 px-2">
        <Link to={`/profile/${post.userId?.username}`}>
          <img
            src={getSafeAvatar(post.userId)}
            className="w-12 h-12 rounded-2xl object-cover border border-slate-100"
            alt="author"
          />
        </Link>
        <div>
          <Link to={`/profile/${post.userId?.username}`}>
            <h3 className="font-bold text-[16px] text-slate-900 flex items-center gap-1 hover:text-pink-600 transition">
              {post.userId?.username || 'Người dùng ẩn danh'}
              {post.userId?.role === 'admin' && (
                <span className="text-pink-500 text-[12px] bg-pink-50 p-1 rounded-full">✔</span>
              )}
            </h3>
          </Link>
          <p className="text-[13px] text-slate-500">{formatPostDate(post.createdAt)}</p>
        </div>
      </div>

      {post.content && (
        <div className="px-2 mb-4">
          <p className="text-[15px] text-slate-800 leading-relaxed whitespace-pre-wrap">
            {renderContentWithHashtags(post.content)}
          </p>
        </div>
      )}

      {mediaList.length > 0 && (
        <div className="mb-5 px-1">
          <ImageCarousel
            images={mediaList}
            postId={post._id}
            handleLikePost={onLike}
          />
        </div>
      )}

      <div className="flex justify-between items-center bg-slate-50 p-2 rounded-2xl">
        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onLike?.(post._id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition font-semibold text-[14px] cursor-pointer ${
              isLiked
                ? 'bg-pink-50 text-pink-600'
                : 'hover:bg-pink-50 text-slate-700 hover:text-pink-600'
            }`}
          >
            <FiHeart className={`text-[20px] ${isLiked ? 'fill-pink-500 text-pink-500' : ''}`} />
            <span>{post.likes?.length || 0} Thích</span>
          </button>
          <button
            type="button"
            onClick={() => (onToggleComments ? onToggleComments(post._id) : null)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-pink-50 text-slate-700 hover:text-pink-600 transition font-semibold text-[14px] cursor-pointer"
          >
            <FiMessageCircle size={20} />
            <span>Bình luận</span>
          </button>
          {onShare && (
            <button
              type="button"
              onClick={() => onShare(post)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl hover:bg-slate-200 text-slate-700 transition font-semibold text-[14px] cursor-pointer"
            >
              <FiSend size={20} />
              <span>Chia sẻ</span>
            </button>
          )}
        </div>
        {onToggleSave && (
          <BookmarkButton isSaved={isSaved} onClick={() => onToggleSave(post._id)} />
        )}
      </div>

      {showCommentsSection && (
        <div className="mt-5 pt-5 border-t border-slate-100">
          <h4 className="text-[14px] font-bold text-slate-800 mb-4 px-2">
            Bình luận ({comments.length})
          </h4>

          <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto custom-scroll px-1">
            {comments.length > 0 ? (
              comments.map((comment) => (
                <div key={comment._id} className="flex gap-3">
                  <img
                    src={getSafeAvatar(comment.userId)}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 mt-0.5"
                    alt=""
                  />
                  <div className="flex-1 overflow-hidden">
                    <div>
                      <span className="font-bold text-slate-900 mr-2">
                        {comment.userId?.username}
                      </span>
                      <span className="text-slate-700 break-words">{comment.content}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-[12px] text-slate-400">
                      <span>{formatPostDate(comment.createdAt)}</span>
                      {onReplyToComment && (
                        <button
                          type="button"
                          onClick={() =>
                            onReplyToComment(comment._id, comment.userId?.username)
                          }
                          className="font-bold hover:text-pink-600 cursor-pointer"
                        >
                          Trả lời
                        </button>
                      )}
                    </div>
                    {comment.replies?.length > 0 && (
                      <div className="mt-1.5 ml-1">
                        <button
                          type="button"
                          onClick={() => onToggleReplies?.(comment._id)}
                          className="flex items-center gap-2 text-[12px] font-bold text-slate-500 hover:text-slate-700 py-1 cursor-pointer"
                        >
                          <span className="w-6 h-[1px] bg-slate-300 inline-block" />
                          {expandedReplies[comment._id]
                            ? 'Ẩn'
                            : `Xem (${comment.replies.length})`}
                        </button>
                        {expandedReplies[comment._id] && (
                          <div className="mt-2 space-y-3.5 border-l-2 border-slate-100 pl-3">
                            {comment.replies.map((reply) => (
                              <div key={reply._id} className="flex gap-2 text-[13px]">
                                <img
                                  src={getSafeAvatar(reply.userId)}
                                  className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                                  alt=""
                                />
                                <div className="flex-1 overflow-hidden">
                                  <div>
                                    <span className="font-bold text-slate-900 mr-2">
                                      {reply.userId?.username}
                                    </span>
                                    <span className="text-slate-700 break-words">
                                      {reply.content}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 mt-1 text-[11px] text-slate-400">
                                    <span>{formatPostDate(reply.createdAt)}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-400 text-[13px] py-4">
                Chưa có bình luận nào. Hãy là người đầu tiên!
              </p>
            )}
          </div>

          {onSubmitComment && (
            <div className="px-1">
              {replyingTo && (
                <div className="flex items-center justify-between bg-pink-50 px-3 py-1.5 rounded-t-xl border-x border-t border-pink-100 text-[12px] mb-0">
                  <p className="text-pink-600 truncate">
                    Đang trả lời <b>{replyingTo.username}</b>
                  </p>
                  <button
                    type="button"
                    onClick={onCancelReply}
                    className="text-pink-600 hover:bg-pink-100 p-0.5 rounded-full cursor-pointer"
                  >
                    <FiX />
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <img
                  src={myAvatar || getSafeAvatar(currentUser)}
                  className="w-8 h-8 rounded-full object-cover"
                  alt=""
                />
                <div className="flex-1 relative">
                  <input
                    type="text"
                    placeholder="Thêm bình luận..."
                    className={`w-full bg-slate-50 border border-slate-200 text-[13px] pl-4 pr-10 py-2.5 focus:outline-none focus:border-pink-400 ${
                      replyingTo ? 'rounded-b-xl' : 'rounded-full'
                    }`}
                    value={commentText}
                    onChange={(e) => onCommentTextChange?.(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSubmitComment()}
                  />
                  <button
                    type="button"
                    onClick={onSubmitComment}
                    disabled={!commentText?.trim()}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-pink-600 text-white rounded-full hover:bg-pink-700 disabled:bg-slate-300 cursor-pointer"
                  >
                    <FiSend size={12} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
};

export default PostCard;
