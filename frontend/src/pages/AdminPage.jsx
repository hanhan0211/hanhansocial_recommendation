import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FiShield, FiUsers, FiSearch, FiArrowLeft, FiTrash2, FiRefreshCw } from 'react-icons/fi';
import { FaConnectdevelop } from 'react-icons/fa';

const AdminPage = () => {
  const navigate = useNavigate();
  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;

  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [stats, setStats]       = useState({ total: 0, admins: 0, newToday: 0 });

  // Guard: chỉ admin mới vào được
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/home');
    }
  }, [currentUser, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('users/admin/all');
      setUsers(res.data);
      const today = new Date().toDateString();
      setStats({
        total:    res.data.length,
        admins:   res.data.filter(u => u.role === 'admin').length,
        newToday: res.data.filter(u => new Date(u.createdAt).toDateString() === today).length,
      });
    } catch {
      // fallback: dùng search API
      try {
        const res = await api.get('users/search?q=&limit=200');
        setUsers(res.data);
        setStats({ total: res.data.length, admins: 0, newToday: 0 });
      } catch { /* ignore */ }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Đổi quyền thành "${newRole}"?`)) return;
    try {
      await api.put(`users/admin/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    } catch (e) {
      alert(e.response?.data?.message || 'Lỗi đổi quyền');
    }
  };

  const handleDelete = async (userId, username) => {
    if (!window.confirm(`Xóa tài khoản @${username}?`)) return;
    try {
      await api.delete(`users/admin/${userId}`);
      setUsers(prev => prev.filter(u => u._id !== userId));
    } catch (e) {
      alert(e.response?.data?.message || 'Lỗi xóa user');
    }
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.fullname?.toLowerCase().includes(search.toLowerCase())
  );

  if (!currentUser || currentUser.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans">
      {/* TOPBAR */}
      <header className="bg-white border-b border-slate-100 shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/home')} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition cursor-pointer">
            <FiArrowLeft size={20} />
            <span className="text-[14px] font-medium">Quay lại</span>
          </button>
          <div className="w-px h-6 bg-slate-200" />
          <div className="flex items-center gap-2 text-violet-600">
            <FaConnectdevelop size={24} />
            <span className="font-black text-[18px]">TVU Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-full text-[13px] font-bold">
            <FiShield size={14} />
            <span>{currentUser.username}</span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* STATS */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Tổng người dùng', value: stats.total, color: 'violet', icon: <FiUsers size={22} /> },
            { label: 'Tài khoản Admin', value: stats.admins, color: 'pink', icon: <FiShield size={22} /> },
            { label: 'Mới hôm nay', value: stats.newToday, color: 'emerald', icon: <FiUsers size={22} /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-white rounded-[24px] p-6 shadow-sm border border-slate-100 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center flex-shrink-0`}>
                {icon}
              </div>
              <div>
                <p className="text-slate-500 text-[13px]">{label}</p>
                <p className="text-[28px] font-black text-slate-900">{loading ? '—' : value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* USERS TABLE */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-bold text-[18px] text-slate-900">Danh sách người dùng</h2>
            <div className="flex items-center gap-3">
              <div className="relative">
                <FiSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Tìm theo tên, email..."
                  className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[14px] focus:outline-none focus:border-violet-400 w-56"
                />
              </div>
              <button onClick={fetchUsers} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white text-[13px] font-bold transition cursor-pointer">
                <FiRefreshCw size={14} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-[13px] font-semibold">
                    <th className="text-left px-6 py-3">Người dùng</th>
                    <th className="text-left px-6 py-3">Email</th>
                    <th className="text-left px-6 py-3">Quyền</th>
                    <th className="text-left px-6 py-3">Ngày tạo</th>
                    <th className="text-left px-6 py-3">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filtered.map(user => (
                    <tr key={user._id} className="hover:bg-slate-50/60 transition">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=ede9fe&color=7c3aed`}
                            className="w-9 h-9 rounded-xl object-cover"
                            alt={user.username}
                          />
                          <div>
                            <p className="font-bold text-[14px] text-slate-900">{user.fullname || user.username}</p>
                            <p className="text-[12px] text-slate-400">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-[13px] text-slate-600">{user.email}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-bold ${
                          user.role === 'admin'
                            ? 'bg-violet-100 text-violet-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role === 'admin' && <FiShield size={11} />}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-[13px] text-slate-500">
                        {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          {user._id !== currentUser._id && (
                            <>
                              <button
                                onClick={() => handleToggleRole(user._id, user.role)}
                                className="px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white text-[12px] font-bold transition cursor-pointer"
                              >
                                {user.role === 'admin' ? '↓ User' : '↑ Admin'}
                              </button>
                              <button
                                onClick={() => handleDelete(user._id, user.username)}
                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition cursor-pointer"
                              >
                                <FiTrash2 size={14} />
                              </button>
                            </>
                          )}
                          {user._id === currentUser._id && (
                            <span className="text-[12px] text-slate-400 italic">Bạn</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <p className="text-center text-slate-400 py-12 text-[14px]">Không tìm thấy người dùng nào.</p>
              )}
            </div>
          )}

          <div className="px-6 py-3 border-t border-slate-100 text-[13px] text-slate-400">
            Hiển thị {filtered.length} / {users.length} người dùng
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminPage;
