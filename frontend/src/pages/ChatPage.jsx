import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiHome,
  FiLoader,
  FiSend,
} from 'react-icons/fi';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import SharePostMessageCard from '../components/SharePostMessageCard';

const getAvatar = (user) => {
  if (user?.avatar?.trim()) return user.avatar;
  const name = user?.username || 'User';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=fbcfe8&color=be185d`;
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const ChatPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { subscribeNewMessage, subscribeUnreadCountUpdate, isConnected } = useSocket();

  const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
  const myId = storedUser?._id;

  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const chatUserIdParam = searchParams.get('userId');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchContacts = useCallback(async () => {
    try {
      setLoadingContacts(true);
      const res = await api.get('messages/contacts');
      setContacts(res.data);
      return res.data;
    } catch (err) {
      console.error('Lỗi tải danh sách chat:', err);
      return [];
    } finally {
      setLoadingContacts(false);
    }
  }, []);

  const fetchMessages = useCallback(async (contactId) => {
    if (!contactId) return;
    try {
      setLoadingMessages(true);
      const res = await api.get(`messages/chat/${contactId}`);
      setMessages(res.data);
      setTimeout(scrollToBottom, 100);
    } catch (err) {
      console.error('Lỗi tải tin nhắn:', err);
    } finally {
      setLoadingMessages(false);
    }
  }, []);

  const markContactAsRead = useCallback(async (contactId) => {
    try {
      await api.put(`messages/mark-as-read/${contactId}`);
      // Cập nhật contacts list để bỏ unread status
      setContacts((prev) =>
        prev.map((c) => {
          if (c._id?.toString() === contactId?.toString()) {
            return { ...c, hasUnread: false };
          }
          return c;
        })
      );

      // Đánh dấu notification type "message" là đã đọc → badge thông báo biến mất
      await api.put('notifications/mark-type-as-read', { type: 'message' });
    } catch (err) {
      console.error('Lỗi đánh dấu đã đọc:', err);
    }
  }, []);

  const selectContact = useCallback(
    (contact) => {
      setSelectedContact(contact);
      setSearchParams({ userId: contact._id });
      fetchMessages(contact._id);

      // Nếu contact này có tin chưa đọc từ họ, đánh dấu là đã đọc
      const lastMsgFromContact = contact.lastMessage;
      if (
        lastMsgFromContact &&
        lastMsgFromContact.senderId?.toString() !== myId?.toString()
      ) {
        markContactAsRead(contact._id);
      }
    },
    [fetchMessages, setSearchParams, myId, markContactAsRead]
  );

  // Helper function để check nếu contact có tin chưa đọc
  const hasUnreadMessage = (contact) => {
    if (!contact.lastMessage) return false;
    const lastMsgSenderId = contact.lastMessage.senderId?._id
      ? contact.lastMessage.senderId._id.toString()
      : contact.lastMessage.senderId?.toString?.() ||
        contact.lastMessage.senderId;
    // Nếu tin nhắn cuối cùng từ người khác (không phải mình) VÀ chưa đọc
    return (
      lastMsgSenderId !== myId?.toString() &&
      contact.lastMessage.isRead === false
    );
  };

  const appendMessageIfRelevant = useCallback(
    (message) => {
      const senderId = message.senderId?._id || message.senderId;
      const receiverId = message.receiverId?._id || message.receiverId;
      const partnerId =
        senderId?.toString() === myId?.toString()
          ? receiverId?.toString()
          : senderId?.toString();

      if (
        selectedContact &&
        partnerId === selectedContact._id?.toString()
      ) {
        setMessages((prev) => {
          if (prev.some((m) => m._id === message._id)) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 50);
      }

      setContacts((prev) => {
        const updated = prev.map((c) => {
          if (c._id?.toString() !== partnerId) return c;
          return {
            ...c,
            lastMessage: {
              content: message.content,
              createdAt: message.createdAt,
              isSharePost: message.isSharePost,
              senderId: message.senderId?._id || message.senderId,
            },
          };
        });
        return updated.sort((a, b) => {
          const aT = a.lastMessage?.createdAt
            ? new Date(a.lastMessage.createdAt).getTime()
            : 0;
          const bT = b.lastMessage?.createdAt
            ? new Date(b.lastMessage.createdAt).getTime()
            : 0;
          return bT - aT;
        });
      });
    },
    [myId, selectedContact]
  );

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    fetchContacts().then(async (list) => {
      if (chatUserIdParam && list.length) {
        const found = list.find((c) => c._id === chatUserIdParam);
        if (found) {
          selectContact(found);
        } else {
          // User không có trong contacts → fetch thông tin user và tạo contact tạm
          try {
            const res = await api.get(`users/${chatUserIdParam}`);
            const newContact = {
              _id: res.data._id,
              username: res.data.username,
              fullname: res.data.fullname,
              avatar: res.data.avatar,
              lastMessage: null,
            };
            setContacts((prev) => [newContact, ...prev]);
            selectContact(newContact);
          } catch (err) {
            console.error('Lỗi tải thông tin user:', err);
          }
        }
      }
    });
  }, [navigate, fetchContacts, chatUserIdParam, selectContact]);

  useEffect(() => {
    const unsubscribe = subscribeNewMessage(appendMessageIfRelevant);
    return unsubscribe;
  }, [subscribeNewMessage, appendMessageIfRelevant]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedContact || sending) return;

    try {
      setSending(true);
      const res = await api.post(`messages/send/${selectedContact._id}`, {
        content: inputText.trim(),
      });
      setMessages((prev) => {
        if (prev.some((m) => m._id === res.data._id)) return prev;
        return [...prev, res.data];
      });
      setInputText('');
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
      alert(err.response?.data?.message || 'Không gửi được tin nhắn');
    } finally {
      setSending(false);
    }
  };

  const renderMessageBubble = (msg) => {
    const senderId = msg.senderId?._id || msg.senderId;
    const isMine = senderId?.toString() === myId?.toString();

    return (
      <div
        key={msg._id}
        className={`flex mb-3 ${isMine ? 'justify-end' : 'justify-start'}`}
      >
        <div
          className={`max-w-[75%] flex flex-col gap-1 ${
            isMine ? 'items-end' : 'items-start'
          }`}
        >
          {msg.isSharePost && msg.postId ? (
            <SharePostMessageCard post={msg.postId} isMine={isMine} />
          ) : null}

          {msg.content && (
            <div
              className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed shadow-sm ${
                isMine
                  ? 'bg-pink-600 text-white rounded-br-md'
                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-md'
              }`}
            >
              {msg.content}
            </div>
          )}

          <span className="text-[10px] text-slate-400 px-1">
            {formatTime(msg.createdAt)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F4F7FE] font-sans">
      <header className="bg-white border-b border-slate-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/home')}
            className="p-2 rounded-full hover:bg-slate-100 cursor-pointer"
          >
            <FiArrowLeft size={22} />
          </button>
          <div>
            <h1 className="font-bold text-slate-900 text-[17px]">Tin nhắn</h1>
            <p className="text-[11px] text-slate-400">
              {isConnected ? '● Đang kết nối real-time' : '○ Đang kết nối...'}
            </p>
          </div>
        </div>
        <Link
          to="/home"
          className="p-2 rounded-full hover:bg-slate-100 text-slate-600"
          title="Trang chủ"
        >
          <FiHome size={22} />
        </Link>
      </header>

      <div className="max-w-6xl mx-auto p-4">
        <div className="relative bg-white rounded-[28px] border border-slate-100 shadow-sm overflow-hidden flex h-[calc(100vh-140px)] min-h-[500px]">
          {/* Sidebar danh sách */}
          <aside className="w-full md:w-[320px] border-r border-slate-100 flex flex-col shrink-0">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-[15px]">Hộp thoại</h2>
              <p className="text-[12px] text-slate-400 mt-0.5">
                Người bạn follow & đã nhắn tin
              </p>
            </div>

            <div className="flex-1 overflow-y-auto custom-scroll">
              {loadingContacts ? (
                <div className="flex justify-center py-12">
                  <FiLoader className="animate-spin text-pink-500 text-2xl" />
                </div>
              ) : contacts.length === 0 ? (
                <p className="text-center text-slate-400 text-[13px] p-6">
                  Chưa có cuộc trò chuyện. Hãy follow ai đó để bắt đầu nhắn tin!
                </p>
              ) : (
                contacts.map((contact) => {
                  const isActive =
                    selectedContact?._id?.toString() === contact._id?.toString();
                  const preview = contact.lastMessage?.isSharePost
                    ? '📎 Đã chia sẻ bài viết'
                    : contact.lastMessage?.content || 'Bắt đầu trò chuyện';
                  const unread = hasUnreadMessage(contact);

                  return (
                    <button
                      key={contact._id}
                      type="button"
                      onClick={() => selectContact(contact)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition cursor-pointer border-b border-slate-50 ${
                        isActive ? 'bg-pink-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <img
                        src={getAvatar(contact)}
                        alt=""
                        className="w-11 h-11 rounded-xl object-cover shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className={`font-bold text-[14px] ${unread ? 'text-slate-900 font-bold' : 'text-slate-900'} truncate flex items-center gap-2`}>
                          {contact.username}
                          {unread && (
                            <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full inline-block flex-shrink-0" title="Có tin nhắn chưa đọc"></span>
                          )}
                        </p>
                        <p className={`text-[12px] ${unread ? 'text-slate-700 font-medium' : 'text-slate-500'} truncate`}>
                          {preview}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>

          {/* Khung chat */}
          <section className="hidden md:flex flex-1 flex-col min-w-0">
            {!selectedContact ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 text-[14px]">
                Chọn một cuộc trò chuyện để bắt đầu
              </div>
            ) : (
              <>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                  <img
                    src={getAvatar(selectedContact)}
                    alt=""
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <p className="font-bold text-slate-900">
                      {selectedContact.username}
                    </p>
                    <p className="text-[12px] text-slate-400">
                      {selectedContact.fullname || `@${selectedContact.username}`}
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/80 custom-scroll">
                  {loadingMessages ? (
                    <div className="flex justify-center py-12">
                      <FiLoader className="animate-spin text-pink-500 text-2xl" />
                    </div>
                  ) : messages.length === 0 ? (
                    <p className="text-center text-slate-400 text-[13px] py-8">
                      Chưa có tin nhắn. Hãy gửi lời chào!
                    </p>
                  ) : (
                    messages.map(renderMessageBubble)
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  onSubmit={handleSend}
                  className="p-4 border-t border-slate-100 bg-white flex gap-2"
                >
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Nhập tin nhắn..."
                    className="flex-1 bg-slate-100 border-0 rounded-full px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-pink-200"
                  />
                  <button
                    type="submit"
                    disabled={!inputText.trim() || sending}
                    className="w-11 h-11 rounded-full bg-pink-600 text-white flex items-center justify-center hover:bg-pink-700 disabled:bg-slate-300 cursor-pointer shrink-0"
                  >
                    {sending ? (
                      <FiLoader className="animate-spin" size={18} />
                    ) : (
                      <FiSend size={18} />
                    )}
                  </button>
                </form>
              </>
            )}
          </section>

          {/* Mobile: full width chat when selected */}
          {selectedContact && (
            <section className="md:hidden flex flex-1 flex-col min-w-0 absolute inset-0 top-[57px] bg-white z-10">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedContact(null);
                    setSearchParams({});
                  }}
                  className="p-1.5 rounded-full hover:bg-slate-100"
                >
                  <FiArrowLeft size={20} />
                </button>
                <img
                  src={getAvatar(selectedContact)}
                  alt=""
                  className="w-9 h-9 rounded-xl object-cover"
                />
                <p className="font-bold text-slate-900">{selectedContact.username}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50/80">
                {loadingMessages ? (
                  <FiLoader className="animate-spin text-pink-500 mx-auto mt-8" />
                ) : (
                  messages.map(renderMessageBubble)
                )}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={handleSend} className="p-3 border-t flex gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Nhập tin nhắn..."
                  className="flex-1 bg-slate-100 rounded-full px-4 py-2.5 text-[14px]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  className="w-10 h-10 rounded-full bg-pink-600 text-white flex items-center justify-center"
                >
                  <FiSend size={16} />
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
