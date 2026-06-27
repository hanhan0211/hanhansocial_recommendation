import React from 'react';
import { Link } from 'react-router-dom';

const getAvatar = (user) => {
  if (user?.avatar?.trim()) return user.avatar;
  const name = user?.username || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fbcfe8&color=be185d`;
};

const SharePostMessageCard = ({ post, isMine }) => {
  if (!post) return null;

  const author = post.userId;
  const thumbnail = post.images?.[0] || post.image || '';
  const isVideo =
    thumbnail &&
    (thumbnail.match(/\.(mp4|mov|webm|ogg)$/i) ||
      thumbnail.includes('/video/upload/'));

  return (
    <Link
      to={`/post/${post._id}`}
      className={`block max-w-[260px] rounded-xl overflow-hidden border transition hover:opacity-95 ${
        isMine
          ? 'border-pink-200 bg-white/90'
          : 'border-slate-200 bg-white'
      }`}
    >
      {thumbnail && (
        <div className="aspect-[4/3] bg-slate-100 overflow-hidden relative">
          {isVideo ? (
            <video
              src={thumbnail}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
          ) : (
            <img
              src={thumbnail}
              alt=""
              className="w-full h-full object-cover"
            />
          )}
          {isVideo && (
            <span className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              VIDEO
            </span>
          )}
        </div>
      )}
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <img
            src={getAvatar(author)}
            alt=""
            className="w-6 h-6 rounded-full object-cover"
          />
          <span className="text-[12px] font-bold text-slate-800 truncate">
            {author?.username || 'Người dùng'}
          </span>
        </div>
        {post.content && (
          <p className="text-[12px] text-slate-600 line-clamp-2 leading-snug">
            {post.content}
          </p>
        )}
        <p className="text-[11px] text-pink-600 font-semibold mt-2">Xem bài viết →</p>
      </div>
    </Link>
  );
};

export default SharePostMessageCard;
