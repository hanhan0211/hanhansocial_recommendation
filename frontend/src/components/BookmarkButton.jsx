import React from "react";
import { FiBookmark } from "react-icons/fi";

const BookmarkButton = ({
  isSaved = false,
  onClick,
  disabled = false,
  size = 20,
  className = "",
  showLabel = false,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={isSaved ? "Bỏ lưu" : "Lưu bài viết"}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition font-semibold text-[14px] cursor-pointer disabled:opacity-50 ${
        isSaved
          ? "text-slate-900 hover:bg-slate-100"
          : "hover:bg-slate-200 text-slate-700"
      } ${className}`}
    >
      <FiBookmark
        size={size}
        className={isSaved ? "fill-black text-black" : ""}
      />
      {showLabel && (
        <span className="hidden sm:inline">{isSaved ? "Đã lưu" : "Lưu"}</span>
      )}
    </button>
  );
};

export default BookmarkButton;
