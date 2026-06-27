// src/components/ImageCarousel.jsx
import React, { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiHeart } from 'react-icons/fi';

const ImageCarousel = ({ images, postId, handleLikePost }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showHeart, setShowHeart] = useState(false);

  // Đảm bảo danh sách ảnh luôn là một mảng hợp lệ
  const imgList = Array.isArray(images) ? images : (images ? [images] : []);

  // HÀM KIỂM TRA VIDEO
  const isVideo = (url) => {
    if (!url) return false;
    return url.match(/\.(mp4|mov|webm|ogg)$/i) || url.includes('/video/upload/');
  };

  const nextSlide = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === imgList.length - 1 ? 0 : prev + 1));
  };

  const prevSlide = (e) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev === 0 ? imgList.length - 1 : prev - 1));
  };

  // Hiệu ứng Double-click để thả tim giống Instagram
  const handleDoubleClick = (e) => {
    e.stopPropagation();
    if (handleLikePost && postId) {
      handleLikePost(postId);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 800); // Ẩn tim sau 0.8s
    }
  };

  if (imgList.length === 0) return null;

  const currentMedia = imgList[currentIndex];
  const isCurrentVideo = isVideo(currentMedia);

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black group select-none overflow-hidden rounded-2xl">
      {/* Hiển thị ảnh hoặc video */}
      {isCurrentVideo ? (
        <video
          src={currentMedia}
          controls
          autoPlay
          loop
          muted
          playsInline
          onDoubleClick={handleDoubleClick}
          className="w-full h-full object-cover max-h-[550px] transition-all duration-300"
        />
      ) : (
        <img
          src={currentMedia}
          alt={`slide-${currentIndex}`}
          onDoubleClick={handleDoubleClick}
          className="w-full h-full object-cover max-h-[550px] transition-all duration-300"
        />
      )}

      {/* Animation trái tim bự hiện lên giữa ảnh khi double-click */}
      {showHeart && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <FiHeart className="text-red-500 fill-red-500 w-24 h-24 drop-shadow-lg animate-bounce" />
        </div>
      )}

      {/* CHỈ HIỂN THỊ NÚT LƯỚT KHI CÓ NHIỀU HƠN 1 ẢNH/VIDEO */}
      {imgList.length > 1 && (
        <>
          {/* Nút Trái */}
          <button
            onClick={prevSlide}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 hover:bg-white text-black flex items-center justify-center shadow-md transition opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
          >
            <FiChevronLeft size={22} />
          </button>

          {/* Nút Phải */}
          <button
            onClick={nextSlide}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/70 hover:bg-white text-black flex items-center justify-center shadow-md transition opacity-0 group-hover:opacity-100 z-10 cursor-pointer"
          >
            <FiChevronRight size={22} />
          </button>

          {/* Các chấm tròn (Dots Indicator) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {imgList.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 bg-pink-500' : 'w-1.5 bg-white/60'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;