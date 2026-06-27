import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import { useSocket } from "../context/SocketContext";

const NotificationPage = () => {
  const navigate = useNavigate();
  const { subscribeNewNotification } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Lấy thông tin user hiện tại
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    setCurrentUser(user);
    console.log("👤 Current user:", user);
  }, []);

  // Lấy danh sách thông báo
  useEffect(() => {
    fetchNotifications();
    markAllAsRead();
  }, []);

  // Lắng nghe thông báo real-time
  useEffect(() => {
    if (!subscribeNewNotification) return;

    console.log("🔌 Setting up notification listener");
    const unsubscribe = subscribeNewNotification((notification) => {
      console.log("🔔 New notification received:", notification);
      setNotifications((prev) => [notification, ...prev]);
    });

    return unsubscribe;
  }, [subscribeNewNotification]);

  const fetchNotifications = async () => {
    try {
      console.log("📡 Fetching notifications...");
      const token = localStorage.getItem("token");
      const { data } = await axios.get("/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("✅ Notifications fetched:", data);
      setNotifications(data);
    } catch (error) {
      console.error("❌ Lỗi lấy thông báo:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        "/notifications/mark-as-read",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      console.log("✅ Marked all notifications as read");
    } catch (error) {
      console.error("❌ Lỗi đánh dấu đã đọc:", error);
    }
  };

  // Chấp nhận yêu cầu theo dõi (từ trang thông báo)
  // Gọi song song: accept API + xóa notification khỏi DB
  const handleAcceptFollowRequest = async (e, senderId, notificationId) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Chạy cả 2 API song song: chấp nhận follow + xóa notification khỏi DB
      await Promise.all([
        axios.post(`/users/follow-requests/${senderId}/accept`, {}, { headers }),
        axios.delete(`/notifications/${notificationId}`, { headers }),
      ]);

      // Xóa khỏi UI state ngay
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (error) {
      console.error("❌ Lỗi chấp nhận yêu cầu:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  // Từ chối/xóa yêu cầu theo dõi (từ trang thông báo)
  // Gọi song song: decline API + xóa notification khỏi DB
  const handleDeclineFollowRequest = async (e, senderId, notificationId) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Chạy cả 2 API song song: từ chối follow + xóa notification khỏi DB
      await Promise.all([
        axios.post(`/users/follow-requests/${senderId}/decline`, {}, { headers }),
        axios.delete(`/notifications/${notificationId}`, { headers }),
      ]);

      // Xóa khỏi UI state ngay
      setNotifications((prev) => prev.filter((n) => n._id !== notificationId));
    } catch (error) {
      console.error("❌ Lỗi từ chối yêu cầu:", error);
      alert(error.response?.data?.message || "Có lỗi xảy ra!");
    }
  };

  // Lọc thông báo theo tab
  const getFilteredNotifications = () => {
    switch (activeTab) {
      case "replies":
        return notifications.filter((n) => n.type === "comment");
      case "follows":
        // Hiện cả follow (thật) lẫn follow_request (đang chờ duyệt)
        return notifications.filter((n) => ["follow", "follow_request"].includes(n.type));
      case "messages":
        return notifications.filter((n) => n.type === "message");
      case "interactions":
        return notifications.filter((n) =>
          ["like", "share", "save"].includes(n.type)
        );
      default:
        return notifications;
    }
  };

  const filteredNotifications = getFilteredNotifications();

  // Render icon theo loại thông báo
  const renderNotificationIcon = (type) => {
    const iconClasses = "absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs";
    
    switch (type) {
      case "like":
        return (
          <div className={`${iconClasses} bg-red-500`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" />
            </svg>
          </div>
        );
      case "comment":
        return (
          <div className={`${iconClasses} bg-blue-500`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "follow":
        return (
          <div className={`${iconClasses} bg-purple-500`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
          </div>
        );
      // Yêu cầu theo dõi đang chờ duyệt (tài khoản riêng tư)
      case "follow_request":
        return (
          <div className={`${iconClasses} bg-orange-400`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case "save":
        return (
          <div className={`${iconClasses} bg-green-500`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
            </svg>
          </div>
        );
      case "message":
        return (
          <div className={`${iconClasses} bg-indigo-500`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
          </div>
        );
      case "warning":
        return (
          <div className={`${iconClasses} bg-amber-500`}>
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
        );
      default:
        return null;
    }
  };

  // Render nội dung thông báo
  const renderNotificationContent = (notification) => {
    const sender = notification.senderId;
    const senderName = sender?.fullname || sender?.username || "Người dùng";

    switch (notification.type) {
      case "like":
        return (
          <span>
            <strong className="font-semibold">{senderName}</strong> đã thích bài viết của bạn
          </span>
        );
      case "comment":
        return (
          <span>
            <strong className="font-semibold">{senderName}</strong> đã bình luận về bài viết của bạn
            {notification.content && (
              <span className="text-gray-500">: "{notification.content}"</span>
            )}
          </span>
        );
      case "follow":
        return (
          <span>
            <strong className="font-semibold">{senderName}</strong> đã bắt đầu theo dõi bạn
          </span>
        );
      // Yêu cầu theo dõi chưa được duyệt
      case "follow_request":
        return (
          <span>
            <strong className="font-semibold">{senderName}</strong>{" "}
            muốn theo dõi bạn
          </span>
        );
      case "save":
        return (
          <span>
            <strong className="font-semibold">{senderName}</strong> đã lưu bài viết của bạn
          </span>
        );
      case "message":
        return (
          <span>
            <strong className="font-semibold">{senderName}</strong> đã gửi cho bạn một tin nhắn
            {notification.content && (
              <span className="text-gray-500">: "{notification.content}"</span>
            )}
          </span>
        );
      case "warning":
        return (
          <span>
            <strong className="font-semibold text-amber-600">Cảnh cáo từ hệ thống</strong>
            {notification.content && (
              <span className="text-gray-700 ml-1">{notification.content}</span>
            )}
          </span>
        );
      default:
        return <span>Thông báo mới</span>;
    }
  };

  // Xử lý click vào thông báo
  const handleNotificationClick = (notification) => {
    console.log("🔔 Notification clicked:", notification);
    
    if (notification.type === "follow") {
      // Navigate đến profile của người follow
      navigate(`/profile/${notification.senderId?.username}`);
    } else if (notification.type === "message") {
      // Navigate đến trang chat
      navigate("/messages");
    } else if (notification.postId) {
      // Navigate đến chi tiết bài viết cho like, comment, save
      const postId = notification.postId._id || notification.postId;
      console.log("📍 Navigating to post:", postId);
      navigate(`/post/${postId}`);
    }
  };

  // Render thumbnail bài viết
  const renderPostThumbnail = (notification) => {
    if (!notification.postId) return null;

    const post = notification.postId;
    const imageUrl = post.images?.[0];

    if (imageUrl) {
      const isVideo = imageUrl.match(/\.(mp4|webm|ogg)$/i) || imageUrl.includes('video');
      if (isVideo) {
        return (
          <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-200">
            <span className="text-white text-[12px]">▶</span>
          </div>
        );
      }
      return (
        <img
          src={imageUrl}
          alt="Post thumbnail"
          className="w-12 h-12 rounded-lg object-cover"
        />
      );
    }

    if (post.content) {
      return (
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center text-xs text-gray-500 p-1 overflow-hidden">
          {post.content.substring(0, 20)}...
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center">
          <button
            onClick={() => navigate(-1)}
            className="mr-4 p-2 hover:bg-gray-100 rounded-full"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold">Hoạt động</h1>
        </div>

        {/* Tab Bar */}
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex space-x-6 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab("all")}
              className={`pb-3 px-1 whitespace-nowrap font-medium text-sm transition-colors ${
                activeTab === "all"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setActiveTab("replies")}
              className={`pb-3 px-1 whitespace-nowrap font-medium text-sm transition-colors ${
                activeTab === "replies"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Bình luận
            </button>
            <button
              onClick={() => setActiveTab("follows")}
              className={`pb-3 px-1 whitespace-nowrap font-medium text-sm transition-colors ${
                activeTab === "follows"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Theo dõi
            </button>
            <button
              onClick={() => setActiveTab("messages")}
              className={`pb-3 px-1 whitespace-nowrap font-medium text-sm transition-colors ${
                activeTab === "messages"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Tin nhắn
            </button>
            <button
              onClick={() => setActiveTab("interactions")}
              className={`pb-3 px-1 whitespace-nowrap font-medium text-sm transition-colors ${
                activeTab === "interactions"
                  ? "text-black border-b-2 border-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Tương tác
            </button>
          </div>
        </div>
      </div>

      {/* Notification List */}
      <div className="max-w-2xl mx-auto">
        {filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-center">
              Chưa có thông báo nào trong tab này
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                onClick={() => handleNotificationClick(notification)}
                className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {/* Avatar với icon */}
                <div className="relative flex-shrink-0">
                  <img
                    src={
                      notification.senderId?.avatar ||
                      "https://via.placeholder.com/40"
                    }
                    alt={notification.senderId?.username}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {renderNotificationIcon(notification.type)}
                </div>

                {/* Nội dung */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 leading-relaxed">
                    {renderNotificationContent(notification)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.createdAt).toLocaleDateString(
                      "vi-VN",
                      {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </p>

                  {/* Nút Cho phép / Xóa — chỉ hiện cho thông báo follow_request (chưa được duyệt) */}
                  {notification.type === "follow_request" && (
                    <div className="mt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => handleAcceptFollowRequest(e, notification.senderId?._id, notification._id)}
                        className="px-4 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Cho phép
                      </button>
                      <button
                        onClick={(e) => handleDeclineFollowRequest(e, notification.senderId?._id, notification._id)}
                        className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition-colors cursor-pointer"
                      >
                        Xóa
                      </button>
                    </div>
                  )}
                </div>

                {/* Thumbnail bài viết */}
                {["like", "comment", "save", "share"].includes(
                  notification.type
                ) && (
                  <div className="flex-shrink-0">
                    {renderPostThumbnail(notification)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPage;
