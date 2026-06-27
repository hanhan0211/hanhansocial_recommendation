import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  FiGrid,
  FiUsers,
  FiFileText,
  FiArrowLeft,
  FiShield,
  FiFlag,
} from 'react-icons/fi';
import { FaConnectdevelop } from 'react-icons/fa';
import { useSocket } from '../context/SocketContext';
import api from '../api/axios';

const navItems = [
  { to: '/admin/dashboard', icon: <FiGrid size={18} />, label: 'Dashboard' },
  { to: '/admin/users',     icon: <FiUsers size={18} />, label: 'Người dùng' },
  { to: '/admin/posts',     icon: <FiFileText size={18} />, label: 'Bài viết' },
  { to: '/admin/reports',   icon: <FiFlag size={18} />, label: 'Báo cáo vi phạm' },
];

const AdminLayout = () => {
  const navigate = useNavigate();
  const [reportCount, setReportCount] = useState(0);
  const { socket } = useSocket();

  const user = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  })();

  // Lấy số lượng báo cáo vi phạm pending ban đầu
  useEffect(() => {
    const fetchInitialCount = async () => {
      try {
        const res = await api.get('/admin/reports');
        setReportCount(res.data.length);
      } catch (err) {
        console.error("⚠️ Lỗi lấy số lượng báo cáo ban đầu:", err);
      }
    };
    fetchInitialCount();
  }, []);

  // Lắng nghe tín hiệu socket cập nhật số lượng báo cáo thời gian thực
  useEffect(() => {
    if (!socket) return;

    const handleNewReport = (count) => {
      setReportCount(count);
    };

    const handleUpdateReportCount = (count) => {
      setReportCount(count);
    };

    socket.on('new-report', handleNewReport);
    socket.on('update-report-count', handleUpdateReportCount);

    return () => {
      socket.off('new-report', handleNewReport);
      socket.off('update-report-count', handleUpdateReportCount);
    };
  }, [socket]);

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans">
      {/* ── SIDEBAR ── */}
      <aside className="w-[240px] min-h-screen bg-[#0f172a] text-white flex flex-col fixed top-0 left-0 z-40 shadow-2xl">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2 text-violet-400">
            <FaConnectdevelop size={26} />
            <span className="font-black text-[17px] tracking-tight">HanHan Admin</span>
          </div>
        </div>

        {/* Admin badge */}
        <div className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <img
              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'A')}&background=4f46e5&color=fff`}
              className="w-9 h-9 rounded-full object-cover border-2 border-violet-500"
              alt="admin"
            />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-white truncate">{user.fullname || user.username}</p>
              <div className="flex items-center gap-1 text-violet-400 text-[11px] font-semibold">
                <FiShield size={10} /> <span>Quản trị viên</span>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                  isActive
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                    : 'text-slate-400 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {icon}
              <span className="flex-1">{label}</span>
              {to === '/admin/reports' && reportCount > 0 && (
                <span className="w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px] font-black animate-pulse shadow-lg shadow-rose-900/40">
                  {reportCount}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Back button */}
        <div className="px-3 pb-6">
          <button
            onClick={() => navigate('/home')}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-[14px] font-medium text-slate-400 hover:bg-white/10 hover:text-white transition cursor-pointer"
          >
            <FiArrowLeft size={17} />
            Quay lại Trang chủ
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 ml-[240px] min-h-screen bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
