# 📋 Quick Reference - Code Changes

## 🔧 6 Files Chính Đã Được Sửa

---

## 1️⃣ Backend: messageController.js

### Thêm 2 hàm API mới:

```javascript
// Line: ~158
export const getUnreadCount = async (req, res) => {
  try {
    const myId = req.user._id;
    const unreadCount = await Message.countDocuments({
      receiverId: myId,
      isRead: false,
    });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};

// Line: ~180
export const markAsRead = async (req, res) => {
  try {
    const myId = req.user._id;
    const senderId = req.params.senderId;
    
    if (!mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({ message: "ID người gửi không hợp lệ" });
    }

    const result = await Message.updateMany(
      { senderId, receiverId: myId, isRead: false },
      { isRead: true }
    );

    const unreadCount = await Message.countDocuments({
      receiverId: myId,
      isRead: false,
    });

    res.json({ modifiedCount: result.modifiedCount, unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message || "Lỗi Server Backend" });
  }
};
```

### Cập nhật getChatContacts:

```javascript
// Line: ~99 - Thêm isRead vào lastMessage
const contacts = Array.from(contactsMap.values()).map(({ user, lastMessage }) => ({
  _id: user._id,
  username: user.username,
  fullname: user.fullname,
  avatar: user.avatar,
  lastMessage: lastMessage
    ? {
        content: lastMessage.content,
        createdAt: lastMessage.createdAt,
        isSharePost: lastMessage.isSharePost,
        senderId: lastMessage.senderId,
        isRead: lastMessage.isRead,  // ← NEW
      }
    : null,
}));
```

### Cập nhật import:

```javascript
// Line: ~4
import { io, getReceiverSocketId, emitUnreadCountUpdate } from "../socket/socket.js";
```

### Cập nhật emitNewMessage:

```javascript
// Line: ~35 - Thêm phát event unreadCountUpdate
const emitNewMessage = (message) => {
  if (!io || !message) return;

  const senderId = message.senderId?._id?.toString() || message.senderId?.toString();
  const receiverId = message.receiverId?._id?.toString() || message.receiverId?.toString();

  const receiverSocketId = getReceiverSocketId(receiverId);
  const senderSocketId = getReceiverSocketId(senderId);

  if (receiverSocketId) {
    io.to(receiverSocketId).emit("newMessage", message);
  }
  if (senderSocketId && senderSocketId !== receiverSocketId) {
    io.to(senderSocketId).emit("newMessage", message);
  }

  // Phát cập nhật số đếm tin nhắn chưa đọc cho receiver
  emitUnreadCountUpdate(receiverId);
};
```

---

## 2️⃣ Backend: messageRoutes.js

### Thêm 2 route mới:

```javascript
// Line: 5 - Import 2 hàm mới
import {
  getChatContacts,
  getChatMessages,
  sendMessage,
  getUnreadCount,     // ← NEW
  markAsRead,         // ← NEW
} from "../controllers/messageController.js";

// Line: 13 & 14 - Thêm 2 route
router.get("/unread-count", protect, getUnreadCount);
router.put("/mark-as-read/:senderId", protect, markAsRead);
```

---

## 3️⃣ Backend: socket.js

### Thêm import Message:

```javascript
// Line: 2
import Message from "../models/Message.js";
```

### Thêm hàm emit unread count:

```javascript
// Line: ~37 - Hàm mới
export const emitUnreadCountUpdate = async (receiverId) => {
  if (!io || !receiverId) return;

  try {
    const unreadCount = await Message.countDocuments({
      receiverId,
      isRead: false,
    });

    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("unreadCountUpdated", { unreadCount });
    }
  } catch (error) {
    console.error("❌ Lỗi emitUnreadCountUpdate:", error);
  }
};
```

---

## 4️⃣ Frontend: SocketContext.jsx

### Thêm state & hook mới:

```javascript
// Line: ~16 - Thêm ref mới
const unreadListenersRef = useRef(new Set());

// Line: ~21 - Thêm hook subscribeUnreadCountUpdate
const subscribeUnreadCountUpdate = useCallback((handler) => {
  unreadListenersRef.current.add(handler);
  return () => unreadListenersRef.current.delete(handler);
}, []);

// Line: ~55 - Thêm socket event listener
newSocket.on('unreadCountUpdated', (data) => {
  unreadListenersRef.current.forEach((handler) => handler(data));
});

// Line: ~71 - Export hook mới
const value = {
  socket,
  isConnected,
  subscribeNewMessage,
  subscribeUnreadCountUpdate,  // ← NEW
};
```

---

## 5️⃣ Frontend: HomePage.jsx

### Thêm import:

```javascript
// Line: 4
import { useSocket } from '../context/SocketContext';
```

### Thêm state:

```javascript
// Line: ~161
const { subscribeUnreadCountUpdate } = useSocket();
const [unreadCount, setUnreadCount] = useState(0);
```

### Thêm fetch unreadCount & subscribe:

```javascript
// Line: ~305 - useEffect mới/cập nhật
useEffect(() => {
  const fetchPosts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      const response = await api.get('posts/random', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
    } catch (err) { setError("Không thể tải bảng tin lúc này."); } 
    finally { setLoading(false); }
  };
  
  const fetchUnreadCount = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const response = await api.get('messages/unread-count', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadCount(response.data.unreadCount || 0);
    } catch (err) {
      console.error('Lỗi tải số tin nhắn chưa đọc:', err);
    }
  };

  fetchPosts();
  fetchSavedPostIds();
  fetchUnreadCount();

  // Subscribe socket event để cập nhật unread count real-time
  const unsubscribe = subscribeUnreadCountUpdate((data) => {
    setUnreadCount(data.unreadCount || 0);
  });

  return unsubscribe;
}, [navigate, subscribeUnreadCountUpdate]);
```

### Cập nhật NavItem "Tin nhắn":

```javascript
// Line: ~376 - Trước
<NavItem icon={<FiSend className="text-[22px]" />} text="Tin nhắn" badge="2" />

// Sau
<div onClick={() => navigate('/messages')}>
  <NavItem 
    icon={<FiSend className="text-[22px]" />} 
    text="Tin nhắn" 
    badge={unreadCount > 0 ? unreadCount.toString() : null} 
  />
</div>
```

### Xóa button "Tin nhắn" ở góc dưới phải:

```javascript
// Line: ~568 - XÓA
// <button onClick={() => navigate('/messages')} className="fixed bottom-8 right-8 bg-pink-600 ...">
//   <FiSend size={22} /><span className="font-bold text-[16px]">Tin nhắn</span>
// </button>
```

---

## 6️⃣ Frontend: ChatPage.jsx

### Cập nhật import:

```javascript
// Line: 10
const { subscribeNewMessage, subscribeUnreadCountUpdate, isConnected } = useSocket();
//                             ↑ thêm subscribeUnreadCountUpdate
```

### Thêm hàm markContactAsRead:

```javascript
// Line: ~61
const markContactAsRead = useCallback(async (contactId) => {
  try {
    const res = await api.put(`messages/mark-as-read/${contactId}`);
    // Cập nhật contacts list để bỏ unread status
    setContacts((prev) =>
      prev.map((c) => {
        if (c._id?.toString() === contactId?.toString()) {
          return { ...c, hasUnread: false };
        }
        return c;
      })
    );
  } catch (err) {
    console.error('Lỗi đánh dấu đã đọc:', err);
  }
}, []);
```

### Cập nhật selectContact:

```javascript
// Line: ~79
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
```

### Thêm helper function:

```javascript
// Line: ~106
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
```

### Cập nhật render contact list:

```javascript
// Line: ~318 - Thêm unread check & green dot
contacts.map((contact) => {
  const isActive = selectedContact?._id?.toString() === contact._id?.toString();
  const preview = contact.lastMessage?.isSharePost
    ? '📎 Đã chia sẻ bài viết'
    : contact.lastMessage?.content || 'Bắt đầu trò chuyện';
  const unread = hasUnreadMessage(contact);  // ← NEW

  return (
    <button
      key={contact._id}
      type="button"
      onClick={() => selectContact(contact)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition cursor-pointer border-b border-slate-50 ${
        isActive ? 'bg-pink-50' : 'hover:bg-slate-50'
      }`}
    >
      <img src={getAvatar(contact)} alt="" className="w-11 h-11 rounded-xl object-cover shrink-0" />
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
```

---

## ⚡ Key Points Summary

| Feature | File | Key Changes |
|---------|------|-------------|
| Unread Count API | messageController.js | getUnreadCount function |
| Mark as Read API | messageController.js | markAsRead function |
| Socket Emit | socket.js | emitUnreadCountUpdate |
| Socket Listen | SocketContext.jsx | subscribeUnreadCountUpdate |
| Sidebar Badge | HomePage.jsx | unreadCount state + fetch |
| Green Dot | ChatPage.jsx | hasUnreadMessage + render |
| Auto Mark-as-Read | ChatPage.jsx | markContactAsRead call |

---

## 🎯 Deployment Checklist

Before deploying:
- [ ] Verify all 6 files have no syntax errors
- [ ] Test unread count API response
- [ ] Test mark-as-read API updates DB
- [ ] Check Socket events emit correctly
- [ ] Verify green dot displays properly
- [ ] Test real-time updates (< 2s)
- [ ] Check mobile responsive
- [ ] Clear browser cache & test

---

## 🐛 Debugging Commands

### Backend - Check Unread Count
```bash
# Mongoose shell
db.messages.countDocuments({receiverId: ObjectId("..."), isRead: false})
```

### Frontend - Check Socket Connection
```javascript
// Browser console
console.log(socket.connected)  // true/false
socket.emit('debug')           // Check if socket sends
```

### Test API Endpoints
```bash
# Check unread count
curl http://localhost:5000/api/messages/unread-count \
  -H "Authorization: Bearer TOKEN"

# Test mark-as-read
curl -X PUT http://localhost:5000/api/messages/mark-as-read/USER_ID \
  -H "Authorization: Bearer TOKEN"
```

---

Good luck with deployment! 🚀
