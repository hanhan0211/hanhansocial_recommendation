import { useEffect, useState, useRef } from 'react';
import { BrowserRouter } from 'react-router-dom';
import AppRoutes from './routes/AppRoutes';
import { SocketProvider } from './context/SocketContext';
import { FiEyeOff } from 'react-icons/fi';

function App() {
  const [showMindfulModal, setShowMindfulModal] = useState(false);
  const timerRef = useRef(null);

  const startTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    // Tự động hiện cảnh báo sau 30 phút sử dụng liên tục (trong thực tế)
    timerRef.current = setTimeout(() => {
      setShowMindfulModal(true);
    }, 30 * 60 * 1000); 
  };

  useEffect(() => {
    startTimer();

    // Hotkey bí mật để demo (Bấm Shift + M)
    const handleKeyDown = (e) => {
      if (e.shiftKey && (e.key === 'M' || e.key === 'm')) {
        setShowMindfulModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    // Vô hiệu hóa chuột phải (Right-click) trên toàn bộ thẻ IMG và VIDEO
    const handleContextMenu = (e) => {
      if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const handleDismissMindful = () => {
    setShowMindfulModal(false);
    startTimer(); // Bắt đầu đếm lại
  };

  return (
    <BrowserRouter>
      <SocketProvider>
        <AppRoutes />
        
        {/* Mindful Scrolling Overlay */}
        {showMindfulModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in">
            <div className="bg-white max-w-md w-full p-8 rounded-3xl shadow-2xl text-center flex flex-col items-center">
              <div className="w-20 h-20 bg-pink-100 rounded-full flex items-center justify-center mb-6 shadow-inner">
                <FiEyeOff size={40} className="text-pink-600" />
              </div>
              <h2 className="text-[22px] font-extrabold text-slate-900 mb-2">Đã đến lúc nghỉ ngơi!</h2>
              <p className="text-slate-600 text-[15px] mb-8 leading-relaxed">
                Bạn đã lướt ứng dụng một khoảng thời gian khá dài rồi. Hãy tạm rời mắt khỏi màn hình, uống một ngụm nước và thư giãn một chút nhé! 🧘‍♀️🍵
              </p>
              <button 
                onClick={handleDismissMindful}
                className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3.5 rounded-xl transition cursor-pointer"
              >
                Tôi biết rồi
              </button>
            </div>
          </div>
        )}
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
