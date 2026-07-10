import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { FiSearch, FiX, FiLoader, FiClock } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

// ============================================================
// SearchBar - Dùng riêng cho Trang Chủ (HomePage)
// API: /api/users/home-search             → tìm kiếm + tự lưu lịch sử
// API: /api/users/home-search-history     → lấy 5 từ khóa gần nhất
// API: DELETE /api/users/home-search-history/:text → xóa 1 mục
// API: DELETE /api/users/home-search-history       → xóa toàn bộ
// KHÔNG ảnh hưởng đến trang Khám phá (ExplorePage)
// ============================================================

const SearchBar = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // ─── Lấy lịch sử tìm kiếm khi panel mở ───────────────────────────────────
  const fetchSearchHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('users/home-search-history', getAuthHeader());
      setSearchHistory(res.data || []);
    } catch (error) {
      console.error('Lỗi tải lịch sử tìm kiếm:', error);
      setSearchHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Tải lịch sử mỗi khi panel được mở
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setResults([]);
      fetchSearchHistory();
    }
  }, [isOpen, fetchSearchHistory]);

  // ─── Debounce tìm kiếm → gọi API home-search ─────────────────────────────
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      const trimmed = searchTerm.trim();
      if (!trimmed) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await api.get(
          `users/home-search?query=${encodeURIComponent(trimmed)}`,
          getAuthHeader()
        );
        setResults(response.data || []);
      } catch (error) {
        console.error('Lỗi tìm kiếm trang chủ:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // ─── Xóa MỘT mục lịch sử ─────────────────────────────────────────────────
  const handleDeleteOne = async (e, text) => {
    e.stopPropagation(); // không trigger click của nút cha
    try {
      await api.delete(
        `users/home-search-history/${encodeURIComponent(text)}`,
        getAuthHeader()
      );
      // Cập nhật UI ngay lập tức, không cần refetch
      setSearchHistory(prev => prev.filter(item => item.text !== text));
    } catch (error) {
      console.error('Lỗi xóa mục lịch sử:', error);
    }
  };

  // ─── Xóa TOÀN BỘ lịch sử ─────────────────────────────────────────────────
  const handleDeleteAll = async () => {
    try {
      await api.delete('users/home-search-history', getAuthHeader());
      setSearchHistory([]);
    } catch (error) {
      console.error('Lỗi xóa toàn bộ lịch sử:', error);
    }
  };

  // ─── Khi user click vào một từ khóa trong lịch sử ────────────────────────
  const handleHistoryClick = (text) => {
    setSearchTerm(text);
    if (inputRef.current) inputRef.current.focus();
  };

  // ─── Khi user click vào kết quả tìm kiếm ─────────────────────────────────
  const handleResultClick = (user) => {
    navigate(`/profile/${user.username}`);
    onClose();
    setSearchTerm('');
  };

  // ─── Xóa ô tìm kiếm ───────────────────────────────────────────────────────
  const handleClear = () => {
    setSearchTerm('');
    setResults([]);
    if (inputRef.current) inputRef.current.focus();
  };

  return (
    <>
      {/* Lớp nền mờ khi mở Search */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[55]"
          onClick={onClose}
        />
      )}

      {/* PANEL SEARCH TRƯỢT RA */}
      <div
        className={`fixed top-0 left-[260px] h-full w-[380px] bg-white shadow-2xl z-[60] transition-transform duration-300 border-r border-slate-100 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-[150%] opacity-0'
        }`}
      >
        <div className="p-6 pt-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-[24px] font-bold text-slate-900">Tìm kiếm</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full text-slate-400 md:hidden"
            >
              <FiX size={24} />
            </button>
          </div>

          {/* Ô tìm kiếm */}
          <div className="relative mb-6">
            <input
              ref={inputRef}
              type="text"
              placeholder="Tìm kiếm trên TVU Social..."
              className="w-full bg-slate-100 border-none rounded-xl py-3 px-4 pr-10 text-[14px] focus:ring-0 outline-none"
              value={searchTerm}
              autoFocus={isOpen}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim()) {
                  navigate(`/explore?q=${encodeURIComponent(searchTerm.trim())}`);
                  onClose();
                  setSearchTerm('');
                }
              }}
            />
            {searchTerm ? (
              <button
                onClick={handleClear}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <FiX size={16} />
              </button>
            ) : (
              <FiSearch
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            )}
          </div>
          <hr className="border-slate-100" />
        </div>

        {/* NỘI DUNG CHÍNH */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">

          {/* Trạng thái: chưa gõ gì → hiện lịch sử */}
          {searchTerm === '' ? (
            <div className="p-4">
              {/* Header lịch sử + nút Xóa tất cả */}
              <div className="flex justify-between items-center mb-3 px-2">
                <span className="font-bold text-slate-900 text-[15px]">Gần đây</span>
                {searchHistory.length > 0 && (
                  <button
                    onClick={handleDeleteAll}
                    className="text-pink-500 text-[13px] font-semibold hover:text-pink-700 transition cursor-pointer"
                  >
                    Xóa tất cả
                  </button>
                )}
              </div>

              {historyLoading ? (
                <div className="flex justify-center py-6">
                  <FiLoader className="animate-spin text-pink-400" size={20} />
                </div>
              ) : searchHistory.length > 0 ? (
                searchHistory.map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleHistoryClick(item.text)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer group"
                  >
                    {/* Icon đồng hồ */}
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-slate-200 transition">
                      <FiClock size={15} className="text-slate-500" />
                    </div>

                    {/* Từ khóa */}
                    <span className="text-[14px] text-slate-800 truncate flex-1">
                      {item.text}
                    </span>

                    {/* Nút X xóa mục này */}
                    <button
                      onClick={(e) => handleDeleteOne(e, item.text)}
                      title="Xóa khỏi lịch sử"
                      className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition opacity-0 group-hover:opacity-100 flex-shrink-0 cursor-pointer"
                    >
                      <FiX size={14} />
                    </button>
                  </div>
                ))
              ) : (
                <div className="flex items-center gap-3 p-3 text-slate-400 italic text-[13px]">
                  Chưa có tìm kiếm nào gần đây.
                </div>
              )}
            </div>

          /* Trạng thái: đang tải kết quả */
          ) : loading ? (
            <div className="flex justify-center p-10">
              <FiLoader className="animate-spin text-pink-500" size={24} />
            </div>

          /* Trạng thái: đang gõ (có hoặc không có kết quả đều hiện) */
          ) : (
            <div className="pt-2">
              <div 
                onClick={() => {
                  navigate(`/explore?q=${encodeURIComponent(searchTerm.trim())}`);
                  onClose();
                  setSearchTerm('');
                }}
                className="flex items-center gap-3 p-3 px-4 mb-2 hover:bg-slate-50 cursor-pointer transition rounded-xl group"
              >
                <div className="w-11 h-11 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-slate-600 group-hover:bg-pink-100 group-hover:text-pink-600 transition">
                  <FiSearch size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] text-slate-900 truncate">
                    Tìm kiếm "{searchTerm}"
                  </p>
                  <p className="text-[12px] text-slate-500">Xem tất cả bài viết, hashtag, v.v.</p>
                </div>
              </div>

              {results.length > 0 ? (
                <>
                  <p className="px-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2 mt-4">Gợi ý tài khoản</p>
                  {results.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleResultClick(user)}
                      className="flex items-center justify-between p-3 px-4 hover:bg-slate-50 cursor-pointer transition rounded-xl"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <img
                          src={
                            user.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=fbcfe8&color=be185d`
                          }
                          className="w-11 h-11 rounded-full object-cover border border-slate-100 flex-shrink-0"
                          alt="avt"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[14px] text-slate-900 truncate">
                            {user.username}
                          </p>
                          <p className="text-[12px] text-slate-500 truncate">
                            {user.fullname || 'Người dùng mới'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-center text-slate-400 pt-6 text-[13px]">
                  Không tìm thấy tài khoản nào khớp với "{searchTerm}".
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SearchBar;