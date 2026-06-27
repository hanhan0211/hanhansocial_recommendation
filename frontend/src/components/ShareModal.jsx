import React, { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiLink, FiLoader } from 'react-icons/fi';
import api from '../api/axios';

const getAvatarUrl = (user) => {
  if (user?.avatar?.trim()) return user.avatar;
  const name = user?.username || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=e2e8f0&color=475569`;
};

const ShareModal = ({ isOpen, onClose, post }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [sendingTo, setSendingTo] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setToast('');
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        const storedUser = localStorage.getItem('user');
        const currentUser = storedUser ? JSON.parse(storedUser) : null;
        if (currentUser?.username) {
          const res = await api.get(`users/${currentUser.username}/following`);
          setUsers(res.data.following || []);
        } else {
          setUsers([]);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách chia sẻ:', err);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.fullname?.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleCopyLink = async () => {
    if (!post?._id) return;
    try {
      await navigator.clipboard.writeText(
        window.location.origin + '/post/' + post._id
      );
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = window.location.origin + '/post/' + post._id;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setToast('Đã sao chép liên kết bài viết!');
    setTimeout(() => onClose(), 900);
  };

  const handleFriendClick = async (friend) => {
    if (!post?._id || !friend?._id) return;

    try {
      setSendingTo(friend._id);
      await api.post(`messages/send/${friend._id}`, {
        content: 'Đã chia sẻ một bài viết',
        postId: post._id,
      });
      setToast('Đã gửi bài viết qua tin nhắn thành công!');
      setTimeout(() => onClose(), 900);
    } catch (err) {
      console.error('Lỗi gửi bài viết qua tin nhắn:', err);
      setToast(err.response?.data?.message || 'Gửi tin nhắn thất bại');
    } finally {
      setSendingTo(null);
    }
  };

  if (!isOpen || !post) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="relative w-full max-w-[420px] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl flex flex-col max-h-[88vh] sm:max-h-[85vh] animate-slide-up sm:animate-scale-in"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-modal-title"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0 relative">
          <button
            type="button"
            onClick={onClose}
            className="text-[15px] text-slate-600 hover:text-slate-900 font-medium transition cursor-pointer z-10"
          >
            Hủy
          </button>
          <h2
            id="share-modal-title"
            className="text-[16px] font-bold text-slate-900 absolute left-1/2 -translate-x-1/2"
          >
            Gửi đến
          </h2>
          <div className="w-[52px]" />
        </div>

        <div className="px-4 py-3 shrink-0">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px] pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm tài khoản..."
              className="w-full bg-slate-100 border-0 rounded-xl py-2.5 pl-10 pr-4 text-[14px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2 min-h-[140px] max-h-[340px] custom-scroll">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <FiLoader className="animate-spin text-2xl mb-2" />
              <p className="text-[13px]">Đang tải...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-center text-slate-400 text-[14px] py-10">
              {searchQuery ? 'Không tìm thấy người dùng' : 'Chưa có người để chia sẻ'}
            </p>
          ) : (
            <div className="grid grid-cols-3 gap-x-2 gap-y-5">
              {filteredUsers.map((user) => (
                <button
                  key={user._id}
                  type="button"
                  disabled={sendingTo === user._id}
                  onClick={() => handleFriendClick(user)}
                  className="flex flex-col items-center gap-2 group cursor-pointer disabled:opacity-50"
                >
                  <div className="relative">
                    <img
                      src={getAvatarUrl(user)}
                      alt={user.username}
                      className="w-[72px] h-[72px] rounded-full object-cover border border-slate-100 group-hover:opacity-90 transition"
                    />
                    {sendingTo === user._id && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                        <FiLoader className="animate-spin text-white text-xl" />
                      </div>
                    )}
                  </div>
                  <div className="w-full text-center px-0.5">
                    <p className="text-[13px] font-bold text-slate-900 truncate w-full">
                      {user.username}
                    </p>
                    <p className="text-[12px] text-slate-400 truncate w-full mt-0.5">
                      {user.fullname || user.username}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-100 px-4 py-5 shrink-0 bg-white rounded-b-[28px] flex justify-center">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex flex-col items-center gap-2 cursor-pointer group"
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-white shadow-sm bg-gradient-to-br from-slate-700 to-slate-900 transition group-hover:scale-105 ring-2 ring-slate-200 ring-offset-2">
              <FiLink size={22} />
            </div>
            <span className="text-[12px] text-slate-600 font-semibold">Sao chép liên kết</span>
          </button>
        </div>

        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-28 z-10 px-4 py-2.5 bg-slate-900 text-white text-[13px] font-medium rounded-full shadow-lg animate-fade-in whitespace-nowrap">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
};

export default ShareModal;
