import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const listenersRef = useRef(new Set());
  const unreadListenersRef = useRef(new Set());
  const notificationListenersRef = useRef(new Set());
  const notifUnreadListenersRef = useRef(new Set());
  const location = useLocation();

  const subscribeNewMessage = useCallback((handler) => {
    listenersRef.current.add(handler);
    return () => listenersRef.current.delete(handler);
  }, []);

  const subscribeUnreadCountUpdate = useCallback((handler) => {
    unreadListenersRef.current.add(handler);
    return () => unreadListenersRef.current.delete(handler);
  }, []);

  const subscribeNewNotification = useCallback((handler) => {
    notificationListenersRef.current.add(handler);
    return () => notificationListenersRef.current.delete(handler);
  }, []);

  // Lắng nghe khi số thông báo chưa đọc thay đổi (vd: đọc tin nhắn → badge thông báo giảm)
  const subscribeNotifUnreadCountUpdate = useCallback((handler) => {
    notifUnreadListenersRef.current.add(handler);
    return () => notifUnreadListenersRef.current.delete(handler);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');

    if (!token || !user?._id) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io(SOCKET_URL, {
      auth: { userId: user._id },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => setIsConnected(true));
    newSocket.on('disconnect', () => setIsConnected(false));

    newSocket.on('newMessage', (message) => {
      listenersRef.current.forEach((handler) => handler(message));
    });

    newSocket.on('unreadCountUpdated', (data) => {
      unreadListenersRef.current.forEach((handler) => handler(data));
    });

    newSocket.on('newNotification', (notification) => {
      notificationListenersRef.current.forEach((handler) => handler(notification));
    });

    // Event khi notification unread count thay đổi (đọc tin nhắn → badge giảm)
    newSocket.on('notificationUnreadCountUpdated', (data) => {
      notifUnreadListenersRef.current.forEach((handler) => handler(data));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const value = {
    socket,
    isConnected,
    subscribeNewMessage,
    subscribeUnreadCountUpdate,
    subscribeNewNotification,
    subscribeNotifUnreadCountUpdate,
  };

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket phải được dùng bên trong SocketProvider');
  }
  return context;
};

export default SocketContext;
