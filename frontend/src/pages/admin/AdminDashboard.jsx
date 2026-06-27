import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
  FiUsers, FiFileText, FiShield, FiRefreshCw, FiArrowRight, FiTrendingUp
} from 'react-icons/fi';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingChart, setLoadingChart] = useState(true);

  const fetchSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await api.get('/admin/dashboard/summary');
      setSummary(res.data.summary);
    } catch (e) {
      console.error('Lỗi tải summary:', e);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchChart = async (year) => {
    setLoadingChart(true);
    try {
      const res = await api.get(`/admin/dashboard/chart?year=${year}`);
      setChartData(res.data);
    } catch (e) {
      console.error('Lỗi tải chart:', e);
    } finally {
      setLoadingChart(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchChart(selectedYear);
  }, [selectedYear]);

  const handleRefreshAll = () => {
    fetchSummary();
    fetchChart(selectedYear);
  };

  const menuActions = [
    {
      label: 'Quản lý Người dùng',
      desc: 'Xem, khóa tài khoản và cấp quyền Admin',
      icon: <FiUsers size={20} />,
      action: () => navigate('/admin/users'),
    },
    {
      label: 'Quản lý Bài viết',
      desc: 'Kiểm duyệt bài viết, bình luận và nội dung vi phạm',
      icon: <FiFileText size={20} />,
      action: () => navigate('/admin/posts'),
    },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-[28px] font-black text-slate-900 tracking-tight">Dashboard Quản trị</h1>
          <p className="text-slate-500 text-[14px] mt-1">
            Báo cáo thống kê hoạt động mạng xã hội HanHan và phân tích SaaS
          </p>
        </div>
        <button
          onClick={handleRefreshAll}
          disabled={loadingSummary || loadingChart}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[13px] font-semibold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer disabled:opacity-50 shadow-sm"
        >
          <FiRefreshCw size={14} className={loadingSummary || loadingChart ? 'animate-spin' : ''} />
          Làm mới dữ liệu
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Card 1: Users */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between transition hover:shadow-md">
          <div className="flex-1">
            <span className="text-[13px] text-slate-400 font-semibold uppercase tracking-wider block">
              Tổng thành viên
            </span>
            {loadingSummary ? (
              <div className="w-24 h-8 bg-slate-100 rounded-md animate-pulse mt-2" />
            ) : (
              <div>
                <span className="text-[34px] font-black text-slate-900 mt-1 block leading-none">
                  {summary?.users?.toLocaleString() || 0}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg mt-3">
                  <FiTrendingUp size={12} />
                  +{(summary?.newUsers || 0).toLocaleString()} mới tháng này
                </span>
              </div>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FiUsers size={26} />
          </div>
        </div>

        {/* Card 2: Posts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center justify-between transition hover:shadow-md">
          <div className="flex-1">
            <span className="text-[13px] text-slate-400 font-semibold uppercase tracking-wider block">
              Tổng bài viết đã đăng
            </span>
            {loadingSummary ? (
              <div className="w-24 h-8 bg-slate-100 rounded-md animate-pulse mt-2" />
            ) : (
              <div>
                <span className="text-[34px] font-black text-slate-900 mt-1 block leading-none">
                  {summary?.posts?.toLocaleString() || 0}
                </span>
                <span className="inline-flex items-center gap-1 text-[12px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg mt-3">
                  <FiTrendingUp size={12} />
                  +{(summary?.newPosts || 0).toLocaleString()} mới tháng này
                </span>
              </div>
            )}
          </div>
          <div className="w-14 h-14 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
            <FiFileText size={26} />
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-bold text-[17px] text-slate-900">Phân tích tăng trưởng bài viết và người dùng</h2>
            <p className="text-[12px] text-slate-400">So sánh số lượng tài khoản mới và bài viết được tạo theo từng tháng</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-slate-400 font-medium">Chọn năm:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-slate-700 focus:outline-none focus:border-violet-400 transition"
            >
              <option value={2025}>Năm 2025</option>
              <option value={2026}>Năm 2026</option>
              <option value={2027}>Năm 2027</option>
            </select>
          </div>
        </div>

        {loadingChart ? (
          <div className="h-[320px] w-full bg-slate-50/50 rounded-xl flex items-center justify-center animate-pulse">
            <span className="text-slate-400 text-[13px]">Đang tải dữ liệu biểu đồ...</span>
          </div>
        ) : (
          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  stroke="#94a3b8"
                  fontSize={11}
                  dy={10}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  stroke="#94a3b8"
                  fontSize={11}
                  dx={-10}
                />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)',
                    padding: '8px 12px',
                  }}
                  labelStyle={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}
                />
                <Legend
                  verticalAlign="top"
                  height={40}
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px', fontWeight: 'semibold', paddingBottom: '10px' }}
                />
                <Bar
                  dataKey="users"
                  name="Người dùng mới"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
                <Bar
                  dataKey="posts"
                  name="Bài viết mới"
                  fill="#7c3aed"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Navigation shortcuts & Info */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-between transition hover:shadow-md">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-bold text-[15px] mb-2">
              <FiShield size={18} className="text-violet-500" />
              Khu vực quản trị tối cao (SaaS Administration)
            </div>
            <p className="text-slate-500 text-[13px] leading-relaxed">
              Vui lòng rà soát kỹ lưỡng các thông tin bài viết và tài khoản để giữ an ninh hệ thống mạng xã hội HanHan. Hãy phân quyền và hành động một cách bảo mật nhất.
            </p>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50 flex gap-4">
            {menuActions.map(({ label, icon, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex items-center gap-2 text-[12px] font-bold text-violet-600 hover:text-violet-700 hover:underline cursor-pointer"
              >
                {icon}
                {label}
                <FiArrowRight size={12} />
              </button>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm flex flex-col justify-between transition hover:shadow-md">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold block mb-1">
              Trạng thái hệ thống
            </span>
            <span className="text-[18px] font-black block">
              Mọi dịch vụ hoạt động tốt
            </span>
          </div>
          <div className="flex items-center gap-2.5 text-emerald-400 text-[12px] mt-4 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            Hệ thống ổn định 100%
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
