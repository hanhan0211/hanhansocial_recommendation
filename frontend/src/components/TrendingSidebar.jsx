import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrendingUp, FiLoader } from 'react-icons/fi';
import api from '../api/axios';

const TrendingSidebar = () => {
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchTrendingHashtags = async () => {
    try {
      setLoading(true);
      const res = await api.get('hashtags/trending');
      setTrends(res.data || []);
    } catch (error) {
      console.error('Lỗi khi tải hashtag thịnh hành:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrendingHashtags();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-sm p-6 w-full flex flex-col items-center justify-center min-h-[180px]">
        <FiLoader className="animate-spin text-pink-500" size={24} />
        <span className="text-[12px] text-slate-400 mt-2 font-medium">Đang tải xu hướng...</span>
      </div>
    );
  }

  if (trends.length === 0) return null;

  return (
    <div className="bg-white rounded-[24px] border border-slate-100/80 shadow-sm p-5 w-full relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-pink-100/30 rounded-full blur-2xl pointer-events-none" />

      <h3 className="text-[16px] text-slate-900 tracking-tight font-black flex items-center gap-2 pb-3 border-b border-slate-100">
        <FiTrendingUp className="text-pink-500 animate-bounce" size={18} />
        Xu hướng hiện tại
      </h3>

      <div className="flex flex-col gap-1 mt-3">
        {trends.map((item) => (
          <div
            key={item._id}
            onClick={() => navigate(`/hashtag/${encodeURIComponent(item.name)}`)}
            className="p-3 rounded-2xl hover:bg-pink-50/40 active:bg-pink-50/80 hover:border-pink-100/40 border border-transparent transition duration-200 cursor-pointer flex justify-between items-center group"
          >
            <div className="flex flex-col">
              <span className="text-pink-600 group-hover:text-pink-700 font-bold text-[14px] transition">
                #{item.name}
              </span>
              <span className="text-slate-400 text-[11.5px] mt-0.5 font-medium">
                {item.count} bài viết
              </span>
            </div>
            
            {/* Elegant right arrow on hover */}
            <span className="text-pink-400/0 group-hover:text-pink-400/100 transition duration-200 text-[16px] transform translate-x-1 group-hover:translate-x-0">
              →
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrendingSidebar;
