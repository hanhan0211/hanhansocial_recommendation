import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import axios from "../api/axios";
import { useSocket } from "../context/SocketContext";

const NotificationBadge = () => {
  const { subscribeNewNotification, subscribeNotifUnreadCountUpdate } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);

  // Lấy số lượng thông báo chưa đọc khi component mount
  useEffect(() => {
    fetchUnreadCount();
  }, []);

  // Lắng nghe thông báo mới → tăng badge
  useEffect(() => {
    if (!subscribeNewNotification) return;
    const unsubscribe = subscribeNewNotification(() => {
      setUnreadCount(prev => prev + 1);
    });
    return unsubscribe;
  }, [subscribeNewNotification]);

  // Lắng nghe khi notification count được cập nhật từ server (vd: đọc tin nhắn)
  useEffect(() => {
    if (!subscribeNotifUnreadCountUpdate) return;
    const unsubscribe = subscribeNotifUnreadCountUpdate((data) => {
      setUnreadCount(data.unreadCount ?? 0);
    });
    return unsubscribe;
  }, [subscribeNotifUnreadCountUpdate]);

  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const { data } = await axios.get("notifications/unread-count", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUnreadCount(data.unreadCount || 0);
    } catch (error) {
      console.error("❌ Lỗi lấy số thông báo chưa đọc:", error);
    }
  };

  const handleClick = () => {
    // Reset count khi user click vào thông báo
    setUnreadCount(0);
  };

  return (
    <Link
      to="/notifications"
      onClick={handleClick}
      className="flex items-center px-4 py-3.5 hover:bg-slate-50 text-slate-600 hover:text-slate-900 font-medium rounded-2xl cursor-pointer transition-all duration-200 group"
    >
      <div className="relative flex-shrink-0">
        <FiHeart className="text-[22px]" />
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-3 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>
      <span className="ml-4 text-[16px] whitespace-nowrap">Thông báo</span>
    </Link>
  );
};

export default NotificationBadge;
