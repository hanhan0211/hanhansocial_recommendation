import React, { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiLink, FiLoader, FiX, FiSend, FiCheck, FiUsers } from 'react-icons/fi';
import api from '../api/axios';

const getAvatarUrl = (user) => {
  if (user?.avatar?.trim()) return user.avatar;
  const name = user?.username || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fbcfe8&color=be185d`;
};

const ModalShareProfile = ({ isOpen, onClose, profileUser }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [sendingTo, setSendingTo] = useState(null);
  const [sentFriendIds, setSentFriendIds] = useState(new Set());

  const currentUser = useMemo(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  }, []);

  const profileUrl = useMemo(() => {
    if (!profileUser?.username) return '';
    return `${window.location.origin}/profile/${profileUser.username}`;
  }, [profileUser]);

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
      setToast('');
      setSentFriendIds(new Set());
      return;
    }

    const fetchFriends = async () => {
      if (!currentUser?.username) return;
      try {
        setLoading(true);
        // Lấy danh sách bạn bè mà người dùng hiện tại đang follow
        const res = await api.get(`users/${currentUser.username}/following`);
        setFriends(res.data.following || []);
      } catch (err) {
        console.error('Lỗi tải danh sách bạn bè:', err);
        setFriends([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFriends();
  }, [isOpen, currentUser]);

  const filteredFriends = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return friends;
    return friends.filter(
      (f) =>
        f.username?.toLowerCase().includes(query) ||
        f.fullname?.toLowerCase().includes(query)
    );
  }, [friends, searchQuery]);

  const showToastNotification = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 2500);
  };

  const handleCopyLink = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      showToastNotification('📋 Đã sao chép liên kết trang cá nhân!');
    } catch (err) {
      // Fallback cho trình duyệt cũ
      const textarea = document.createElement('textarea');
      textarea.value = profileUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToastNotification('📋 Đã sao chép liên kết trang cá nhân!');
    }
  };

  const handleSendToFriend = async (friend) => {
    if (!friend?._id || !profileUser?.username) return;

    try {
      setSendingTo(friend._id);
      
      const shareContent = `Đã chia sẻ trang cá nhân của @${profileUser.username}: ${profileUrl}`;
      
      // Gọi API POST /api/messages/send/:id
      await api.post(`messages/send/${friend._id}`, {
        content: shareContent
      });

      // Đánh dấu đã gửi
      setSentFriendIds(prev => {
        const next = new Set(prev);
        next.add(friend._id);
        return next;
      });

      showToastNotification(`✨ Đã gửi cho @${friend.username} thành công!`);
    } catch (err) {
      console.error('Lỗi chia sẻ trang cá nhân:', err);
      showToastNotification(err.response?.data?.message || 'Gửi thất bại, vui lòng thử lại.');
    } finally {
      setSendingTo(null);
    }
  };

  if (!isOpen || !profileUser) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[480px] bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-600 p-6 text-white shrink-0 relative">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <FiUsers size={22} className="animate-bounce" />
              <h3 className="font-bold text-[20px] tracking-wide">Chia sẻ trang cá nhân</h3>
            </div>
            <button
              onClick={onClose}
              className="bg-white/20 hover:bg-white/35 p-2 rounded-full transition cursor-pointer text-white flex items-center justify-center"
            >
              <FiX size={18} />
            </button>
          </div>
          <p className="text-pink-100 text-[13px] mt-1.5 opacity-90">
            Chia sẻ hồ sơ của @{profileUser.username} tới bạn bè hoặc sao chép liên kết.
          </p>
        </div>

        <div className="p-5 flex flex-col flex-1 overflow-hidden space-y-5">
          {/* Mục 1: Link & Sao chép */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 shadow-inner">
            <label className="block text-[12px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
              Đường dẫn trang cá nhân
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={profileUrl}
                readOnly
                className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-[13px] text-slate-600 focus:outline-none select-all truncate"
              />
              <button
                onClick={handleCopyLink}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2 rounded-xl font-bold text-[13px] transition flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
              >
                <FiLink size={14} />
                Sao chép
              </button>
            </div>
          </div>

          {/* Mục 2: Gửi cho bạn bè */}
          <div className="flex-1 flex flex-col overflow-hidden min-h-[220px]">
            <div className="flex justify-between items-center mb-3 shrink-0">
              <label className="text-[12px] font-extrabold text-slate-500 uppercase tracking-wider">
                Gửi qua tin nhắn nội bộ
              </label>
              {friends.length > 0 && (
                <span className="text-[11px] bg-purple-50 text-purple-600 font-bold px-2 py-0.5 rounded-full">
                  {friends.length} đang theo dõi
                </span>
              )}
            </div>

            {/* Ô tìm kiếm nhanh */}
            <div className="relative mb-3 shrink-0">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[16px] pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm theo tên hoặc tài khoản..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition"
              />
            </div>

            {/* Danh sách bạn bè để chọn gửi */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 custom-scroll">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                  <FiLoader className="animate-spin text-2xl mb-2 text-pink-500" />
                  <p className="text-[12px]">Đang tải danh sách bạn bè...</p>
                </div>
              ) : filteredFriends.length === 0 ? (
                <div className="text-center py-12 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-slate-400 text-[13px]">
                    {searchQuery ? 'Không tìm thấy kết quả phù hợp' : 'Danh sách bạn bè trống'}
                  </p>
                </div>
              ) : (
                filteredFriends.map((friend) => {
                  const isSent = sentFriendIds.has(friend._id);
                  const isSending = sendingTo === friend._id;

                  return (
                    <div
                      key={friend._id}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-50/80 rounded-xl border border-transparent hover:border-slate-100 transition duration-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={getAvatarUrl(friend)}
                          alt={friend.username}
                          className="w-10 h-10 rounded-full object-cover border border-slate-100 flex-shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-[14px] text-slate-800 truncate">
                            {friend.username}
                          </p>
                          <p className="text-slate-400 text-[12px] truncate">
                            {friend.fullname || `@${friend.username}`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSendToFriend(friend)}
                        disabled={isSent || isSending}
                        className={`px-4 py-2 rounded-xl text-[12px] font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer min-w-[85px] justify-center ${
                          isSent
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 cursor-default shadow-none'
                            : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white hover:shadow-indigo-100'
                        }`}
                      >
                        {isSending ? (
                          <FiLoader className="animate-spin" size={14} />
                        ) : isSent ? (
                          <>
                            <FiCheck size={14} />
                            Đã gửi
                          </>
                        ) : (
                          <>
                            <FiSend size={12} />
                            Gửi
                          </>
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Toast Notification Overlay */}
        {toast && (
          <div className="absolute left-1/2 -translate-x-1/2 bottom-6 z-[250] px-4 py-2.5 bg-slate-900/95 backdrop-blur-sm text-white text-[13px] font-semibold rounded-2xl shadow-xl animate-fade-in flex items-center gap-2 whitespace-nowrap">
            <span>{toast}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalShareProfile;
