import React, { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { Link } from 'react-router-dom';
import { FiRefreshCw } from 'react-icons/fi';

const SuggestedUsers = () => {
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [followingStates, setFollowingStates] = useState({});

  const token = localStorage.getItem('token');

  const initFollowingStates = (users) => {
    const initialStates = {};
    users.forEach((user) => {
      initialStates[user._id] = false;
    });
    setFollowingStates(initialStates);
  };

  const fetchConnectSuggestions = useCallback(async (isRefresh = false) => {
    if (!token) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const res = await api.get('users/connect-suggestions', {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuggestedUsers(res.data);
      initFollowingStates(res.data);
    } catch (error) {
      console.error('Lỗi tải gợi ý kết nối:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  const handleRefresh = () => {
    fetchConnectSuggestions(true);
  };

  const handleFollowToggle = async (userId) => {
    try {
      const res = await api.put(
        `users/${userId}/follow`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setFollowingStates((prev) => ({
        ...prev,
        [userId]: res.data.isFollowing,
      }));

      if (res.data.isFollowing) {
        setSuggestedUsers((prev) => prev.filter((user) => user._id !== userId));
      }
    } catch (error) {
      console.error('Lỗi follow/unfollow:', error);
      alert(error.response?.data?.message || 'Có lỗi xảy ra!');
    }
  };

  useEffect(() => {
    if (token) {
      fetchConnectSuggestions(false);
    }
  }, [token, fetchConnectSuggestions]);

  if (loading) {
    return (
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
        <h3 className="text-[18px] font-bold text-slate-900 mb-6">Gợi ý kết nối</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex justify-between items-center animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-200" />
                <div>
                  <div className="w-24 h-4 bg-slate-200 rounded mb-2" />
                  <div className="w-20 h-3 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="w-20 h-8 bg-slate-200 rounded-xl" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[18px] font-bold text-slate-900">Gợi ý kết nối</h3>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 text-pink-600 text-[13px] font-bold hover:text-pink-800 disabled:opacity-60 transition cursor-pointer"
          title="Làm mới danh sách gợi ý"
        >
          <FiRefreshCw
            size={16}
            className={refreshing ? 'animate-spin' : ''}
          />
          <span>Làm mới</span>
        </button>
      </div>

      {suggestedUsers.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-slate-400 text-[14px]">Không có gợi ý kết nối mới</p>
          <p className="text-slate-300 text-[12px] mt-1">Bạn đã follow tất cả người dùng!</p>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="mt-4 text-pink-600 text-[13px] font-bold hover:underline cursor-pointer inline-flex items-center gap-1.5"
          >
            <FiRefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            Thử làm mới
          </button>
        </div>
      ) : (
        <div
          className={`flex flex-col gap-6 transition-opacity duration-200 ${
            refreshing ? 'opacity-60 pointer-events-none' : 'opacity-100'
          }`}
        >
          {suggestedUsers.map((user) => (
            <div key={user._id} className="flex justify-between items-center group">
              <Link
                to={`/profile/${user.username}`}
                className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
              >
                <img
                  src={
                    user.avatar ||
                    `https://ui-avatars.com/api/?name=${user.username}&background=fbcfe8&color=be185d`
                  }
                  alt={user.username}
                  className="w-12 h-12 rounded-xl object-cover shadow-sm flex-shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-[15px] text-slate-900 truncate group-hover:text-pink-600 transition">
                    {user.username}
                  </p>
                  <p className="text-slate-500 text-[13px] truncate">
                    {user.fullname || `@${user.username}`}
                  </p>
                </div>
              </Link>

              <button
                type="button"
                onClick={() => handleFollowToggle(user._id)}
                className={`px-4 py-2 rounded-xl text-[13px] font-bold transition cursor-pointer flex-shrink-0 ${
                  followingStates[user._id]
                    ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    : 'bg-pink-50 text-pink-600 hover:bg-pink-600 hover:text-white'
                }`}
              >
                {followingStates[user._id] ? 'Đang theo dõi' : 'Theo dõi'}
              </button>
            </div>
          ))}
        </div>
      )}

      {suggestedUsers.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-100">
          <Link
            to="/explore"
            className="text-pink-600 text-[13px] font-bold hover:text-pink-800 cursor-pointer block text-center"
          >
            Xem thêm người dùng →
          </Link>
        </div>
      )}
    </div>
  );
};

export default SuggestedUsers;
