import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import {
  FiShield, FiUsers, FiSearch, FiRefreshCw, FiLock, FiUnlock,
  FiUserCheck, FiUserX, FiCheckCircle, FiAlertCircle, FiX,
} from 'react-icons/fi';

/* ── Helpers ── */
const fmt = (dateStr) => {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

/* ── Toast mini-system ── */
let _toastId = 0;
const useToast = () => {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, type = 'success') => {
    const id = ++_toastId;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);
  const remove = useCallback((id) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  return { toasts, push, remove };
};

/* ── Toast container ── */
const ToastContainer = ({ toasts, remove }) => (
  <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
    {toasts.map(({ id, msg, type }) => (
      <div
        key={id}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-[13px] font-semibold pointer-events-auto
          animate-[slideInRight_0.3s_ease-out]
          ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}
      >
        {type === 'success' ? <FiCheckCircle size={16} /> : <FiAlertCircle size={16} />}
        <span>{msg}</span>
        <button onClick={() => remove(id)} className="ml-1 opacity-70 hover:opacity-100 cursor-pointer">
          <FiX size={14} />
        </button>
      </div>
    ))}
  </div>
);

/* ── Main Component ── */
const UserManagement = () => {
  const currentUser = (() => {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
  })();

  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [acting, setActing]   = useState({}); // { [userId]: 'ban' | 'role' }
  const { toasts, push, remove } = useToast();

  /* Fetch users */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users/admin/users');
      setUsers(res.data);
    } catch {
      push('Không thể tải danh sách người dùng', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* Reset bộ lọc người dùng */
  const handleResetUsers = () => {
    setSearch('');
    fetchUsers();
  };

  useEffect(() => { fetchUsers(); }, []);

  /* Toggle Ban */
  const handleToggleBan = async (userId, currentBanned) => {
    setActing(prev => ({ ...prev, [userId]: 'ban' }));
    // Optimistic update ngay lập tức
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: !currentBanned } : u));
    try {
      const res = await api.put(`/users/admin/users/${userId}/ban`);
      // Sync với kết quả thực từ server
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: res.data.isBanned } : u));
      push(res.data.isBanned ? '🔒 Đã khóa tài khoản thành công' : '🔓 Đã mở khóa tài khoản thành công', 'success');
    } catch (e) {
      // Rollback nếu lỗi
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: currentBanned } : u));
      push(e.response?.data?.message || 'Lỗi khi thay đổi trạng thái', 'error');
    } finally {
      setActing(prev => { const n = { ...prev }; delete n[userId]; return n; });
    }
  };

  /* Toggle Role */
  const handleToggleRole = async (userId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Đổi quyền thành "${newRole}" cho user này?`)) return;
    setActing(prev => ({ ...prev, [userId]: 'role' }));
    setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u));
    try {
      const res = await api.put(`/users/admin/users/${userId}/role`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: res.data.role } : u));
      push(res.data.role === 'admin' ? '⬆️ Đã cấp quyền Admin' : '⬇️ Đã thu hồi quyền Admin', 'success');
    } catch (e) {
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, role: currentRole } : u));
      push(e.response?.data?.message || 'Lỗi khi đổi quyền', 'error');
    } finally {
      setActing(prev => { const n = { ...prev }; delete n[userId]; return n; });
    }
  };

  const stats = {
    total:  users.length,
    admins: users.filter(u => u.role === 'admin').length,
    banned: users.filter(u => u.isBanned).length,
  };

  const filtered = users.filter(u =>
    u.username?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.fullname?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <ToastContainer toasts={toasts} remove={remove} />

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[26px] font-black text-slate-900">Quản lý Người dùng</h1>
        <p className="text-slate-500 text-[14px] mt-1">Xem và quản lý toàn bộ tài khoản trong hệ thống</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Tổng người dùng', value: stats.total,  icon: <FiUsers size={20} />,  color: 'violet' },
          { label: 'Tài khoản Admin', value: stats.admins, icon: <FiShield size={20} />, color: 'blue'   },
          { label: 'Bị khóa',         value: stats.banned, icon: <FiLock size={20} />,   color: 'red'    },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0
              ${color === 'violet' ? 'bg-violet-100 text-violet-600' : ''}
              ${color === 'blue'   ? 'bg-blue-100 text-blue-600'     : ''}
              ${color === 'red'    ? 'bg-red-100 text-red-500'       : ''}
            `}>
              {icon}
            </div>
            <div>
              <p className="text-slate-500 text-[13px]">{label}</p>
              <p className="text-[28px] font-black text-slate-900 leading-none mt-0.5">
                {loading ? <span className="inline-block w-8 h-6 bg-slate-100 rounded animate-pulse" /> : value}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-[16px] text-slate-900">Danh sách người dùng</h2>
          <div className="flex items-center gap-3">
            <div className="relative">
              <FiSearch size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Tìm tên, email..."
                className="pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-[13px] focus:outline-none focus:border-violet-400 w-52 transition"
              />
            </div>
            <button
              onClick={handleResetUsers}
              className="p-2 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-600 hover:text-white transition cursor-pointer"
              title="Làm mới"
            >
              <FiRefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Table body */}
        {loading ? (
          <div className="flex justify-center items-center py-28">
            <div className="w-10 h-10 border-4 border-violet-100 border-t-violet-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[11px] font-semibold uppercase tracking-wider">
                  <th className="text-left px-6 py-3">Người dùng</th>
                  <th className="text-left px-6 py-3">Email</th>
                  <th className="text-left px-6 py-3">Vai trò</th>
                  <th className="text-left px-6 py-3">Trạng thái</th>
                  <th className="text-left px-6 py-3">Ngày tham gia</th>
                  <th className="text-left px-6 py-3">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(user => {
                  const isSelf   = user._id === currentUser._id;
                  const isBusy   = !!acting[user._id];
                  const banBusy  = acting[user._id] === 'ban';
                  const roleBusy = acting[user._id] === 'role';

                  return (
                    <tr
                      key={user._id}
                      className={`hover:bg-slate-50/70 transition-colors ${user.isBanned ? 'bg-red-50/30' : ''}`}
                    >
                      {/* Avatar + name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            <img
                              src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username||'U')}&background=ede9fe&color=7c3aed`}
                              className={`w-9 h-9 rounded-full object-cover ${user.isBanned ? 'opacity-50 grayscale' : ''} transition`}
                              alt={user.username}
                              onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username||'U')}&background=ede9fe&color=7c3aed`; }}
                            />
                            {user.isBanned && (
                              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white flex items-center justify-center">
                                <FiLock size={7} className="text-white" />
                              </span>
                            )}
                          </div>
                          <div>
                            <p className={`font-bold text-[14px] leading-tight ${user.isBanned ? 'text-slate-400 line-through' : 'text-slate-900'}`}>
                              {user.fullname || user.username}
                              {isSelf && <span className="ml-1.5 text-[10px] text-violet-500 font-semibold no-underline">(Bạn)</span>}
                            </p>
                            <p className="text-[12px] text-slate-400">@{user.username}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-6 py-4 text-[13px] text-slate-600">{user.email}</td>

                      {/* Role badge */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                          user.role === 'admin'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.role === 'admin' && <FiShield size={10} />}
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>

                      {/* Status badge — đổi màu tức thì nhờ optimistic update */}
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold transition-all duration-300 ${
                          user.isBanned
                            ? 'bg-red-100 text-red-600'
                            : 'bg-emerald-100 text-emerald-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                            user.isBanned ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'
                          }`} />
                          {user.isBanned ? 'Bị khóa' : 'Hoạt động'}
                        </span>
                      </td>

                      {/* Join date */}
                      <td className="px-6 py-4 text-[13px] text-slate-500">{fmt(user.createdAt)}</td>

                      {/* Actions */}
                      <td className="px-6 py-4">
                        {isSelf ? (
                          <span className="text-[12px] text-slate-400 italic">—</span>
                        ) : (
                          <div className="flex items-center gap-2">
                            {/* Ban / Unban button */}
                            <button
                              onClick={() => handleToggleBan(user._id, user.isBanned)}
                              disabled={isBusy}
                              title={user.isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold
                                transition-all duration-200 cursor-pointer
                                disabled:opacity-60 disabled:cursor-not-allowed
                                ${user.isBanned
                                  ? 'bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700'
                                  : 'bg-red-50 text-red-600 hover:bg-red-500 hover:text-white'
                                }`}
                            >
                              {banBusy ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : user.isBanned ? (
                                <><FiUnlock size={12} /> Mở khóa</>
                              ) : (
                                <><FiLock size={12} /> Khóa</>
                              )}
                            </button>

                            {/* Toggle Role button */}
                            <button
                              onClick={() => handleToggleRole(user._id, user.role)}
                              disabled={isBusy}
                              title={user.role === 'admin' ? 'Thu hồi quyền Admin' : 'Cấp quyền Admin'}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold
                                transition-all duration-200 cursor-pointer
                                disabled:opacity-60 disabled:cursor-not-allowed
                                ${user.role === 'admin'
                                  ? 'bg-orange-50 text-orange-600 hover:bg-orange-500 hover:text-white'
                                  : 'bg-violet-50 text-violet-600 hover:bg-violet-500 hover:text-white'
                                }`}
                            >
                              {roleBusy ? (
                                <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                              ) : user.role === 'admin' ? (
                                <><FiUserX size={12} /> Thu hồi</>
                              ) : (
                                <><FiUserCheck size={12} /> Cấp quyền</>
                              )}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && !loading && (
              <div className="text-center py-20">
                <FiUsers size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-[14px]">Không tìm thấy người dùng nào.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 text-[12px] text-slate-400 flex items-center justify-between">
          <span>Hiển thị <span className="font-semibold text-slate-600">{filtered.length}</span> / {users.length} người dùng</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-red-400 rounded-full inline-block" /> {stats.banned} bị khóa
          </span>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
