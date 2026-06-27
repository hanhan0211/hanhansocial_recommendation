import React, { useState, useRef } from 'react';
import api from '../api/axios';
import { FiX, FiImage, FiLoader, FiPlus, FiVideo, FiChevronLeft } from 'react-icons/fi';
import { uploadToCloudinary } from '../utils/uploadImage';

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CON: AI Assistant Panel
// ═══════════════════════════════════════════════════════════════════════════
const AI_TONES = [
  { key: 'casual', label: '😊 Thân thiện', color: 'bg-blue-50 text-blue-600 border-blue-200' },
  { key: 'professional', label: '💼 Chuyên nghiệp', color: 'bg-slate-50 text-slate-600 border-slate-200' },
  { key: 'funny', label: '😂 Hài hước', color: 'bg-yellow-50 text-yellow-600 border-yellow-200' },
  { key: 'romantic', label: '💕 Lãng mạn', color: 'bg-pink-50 text-pink-600 border-pink-200' },
  { key: 'inspirational', label: '🔥 Truyền cảm hứng', color: 'bg-orange-50 text-orange-600 border-orange-200' },
];

const AiPanel = ({ currentContent, onUseCaption, onClose }) => {
  const [activeTab, setActiveTab] = useState('generate'); // generate | rewrite | hashtag
  const [idea, setIdea] = useState('');
  const [tone, setTone] = useState('casual');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // ─── TẠO CAPTION ───────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!idea.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/ai/generate-caption', { idea: idea.trim(), tone });
      setResult({ type: 'caption', ...res.data });
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tạo caption. Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  };

  // ─── VIẾT LẠI NỘI DUNG ────────────────────────────────────────────
  const handleRewrite = async () => {
    if (!currentContent?.trim()) {
      setError('Bạn cần viết nội dung trước rồi mới nhờ AI viết lại nhé!');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/ai/rewrite', { content: currentContent.trim(), tone });
      setResult({ type: 'rewrite', ...res.data });
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi viết lại. Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  };

  // ─── GỢI Ý HASHTAG ────────────────────────────────────────────────
  const handleSuggestHashtags = async () => {
    const contentToAnalyze = currentContent?.trim() || idea?.trim();
    if (!contentToAnalyze) {
      setError('Bạn cần nhập nội dung hoặc ý tưởng để AI gợi ý hashtag!');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await api.post('/ai/suggest-hashtags', { content: contentToAnalyze });
      setResult({ type: 'hashtags', ...res.data });
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi gợi ý hashtag. Thử lại nhé!');
    } finally {
      setLoading(false);
    }
  };

  // ─── SỬ DỤNG KẾT QUẢ ──────────────────────────────────────────────
  const handleUseResult = () => {
    if (!result) return;
    if (result.type === 'caption') {
      const hashtagStr = result.hashtags?.length > 0
        ? '\n\n' + result.hashtags.map(t => `#${t}`).join(' ')
        : '';
      onUseCaption(result.caption + hashtagStr);
    } else if (result.type === 'rewrite') {
      onUseCaption(result.rewrittenContent);
    }
  };

  const handleUseHashtag = (tag) => {
    const hashtagText = ` #${tag}`;
    onUseCaption((currentContent || '') + hashtagText);
  };

  const tabs = [
    { key: 'generate', label: '💡 Tạo caption', icon: '💡' },
    { key: 'rewrite', label: '✏️ Viết lại', icon: '✏️' },
    { key: 'hashtag', label: '#️⃣ Hashtag', icon: '#️⃣' },
  ];

  return (
    <div className="absolute inset-0 bg-white rounded-[32px] z-10 flex flex-col overflow-hidden animate-fade-in">
      {/* HEADER */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100" style={{ background: 'linear-gradient(135deg, #f0e6ff 0%, #fce4ec 100%)' }}>
        <button onClick={onClose} className="p-1.5 hover:bg-white/50 rounded-full transition cursor-pointer">
          <FiChevronLeft className="text-lg text-purple-700" />
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xl">✨</span>
          <h3 className="font-bold text-[16px] text-purple-800">Trợ lý AI</h3>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-slate-100">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setResult(null); setError(''); }}
            className={`flex-1 py-3 text-[13px] font-bold transition cursor-pointer ${
              activeTab === tab.key
                ? 'text-purple-600 border-b-2 border-purple-500 bg-purple-50/30'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 hide-scroll">
        {/* TONE SELECTOR (cho generate & rewrite) */}
        {(activeTab === 'generate' || activeTab === 'rewrite') && (
          <div>
            <p className="text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Giọng văn</p>
            <div className="flex flex-wrap gap-1.5">
              {AI_TONES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setTone(t.key)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition cursor-pointer ${
                    tone === t.key
                      ? t.color + ' ring-2 ring-purple-300 ring-offset-1'
                      : 'bg-white text-slate-400 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TAB: TẠO CAPTION */}
        {activeTab === 'generate' && (
          <div>
            <p className="text-[12px] font-bold text-slate-500 mb-2 uppercase tracking-wide">Ý tưởng của bạn</p>
            <textarea
              className="w-full h-[70px] bg-slate-50 border border-slate-200 rounded-2xl p-3 text-[14px] text-slate-700 placeholder-slate-400 outline-none focus:border-purple-400 resize-none transition"
              placeholder="VD: Đi biển cuối tuần với bạn bè, ăn hải sản..."
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
            />
            <button
              onClick={handleGenerate}
              disabled={loading || !idea.trim()}
              className="w-full mt-2 py-2.5 rounded-xl font-bold text-[14px] text-white transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
            >
              {loading ? <><FiLoader className="animate-spin" /> AI đang viết...</> : '✨ Tạo caption'}
            </button>
          </div>
        )}

        {/* TAB: VIẾT LẠI */}
        {activeTab === 'rewrite' && (
          <div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 mb-2">
              <p className="text-[11px] font-bold text-slate-400 mb-1">NỘI DUNG HIỆN TẠI:</p>
              <p className="text-[13px] text-slate-600 line-clamp-3">
                {currentContent?.trim() || <span className="italic text-slate-400">Chưa có nội dung — hãy viết gì đó trước nhé!</span>}
              </p>
            </div>
            <button
              onClick={handleRewrite}
              disabled={loading || !currentContent?.trim()}
              className="w-full py-2.5 rounded-xl font-bold text-[14px] text-white transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
            >
              {loading ? <><FiLoader className="animate-spin" /> AI đang viết lại...</> : '✏️ Viết lại theo tone mới'}
            </button>
          </div>
        )}

        {/* TAB: GỢI Ý HASHTAG */}
        {activeTab === 'hashtag' && (
          <div>
            <p className="text-[12px] text-slate-500 mb-2">AI sẽ phân tích nội dung bài viết và gợi ý hashtag phù hợp.</p>
            <button
              onClick={handleSuggestHashtags}
              disabled={loading || (!currentContent?.trim() && !idea?.trim())}
              className="w-full py-2.5 rounded-xl font-bold text-[14px] text-white transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
            >
              {loading ? <><FiLoader className="animate-spin" /> AI đang phân tích...</> : '#️⃣ Gợi ý hashtag'}
            </button>
          </div>
        )}

        {/* ERROR */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-[13px] p-3 rounded-2xl">
            ⚠️ {error}
          </div>
        )}

        {/* RESULT */}
        {result && (
          <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-4 space-y-3 animate-fade-in">
            <p className="text-[11px] font-bold text-purple-500 uppercase tracking-wide">✨ Kết quả từ AI</p>

            {/* Caption / Rewrite result */}
            {(result.type === 'caption' || result.type === 'rewrite') && (
              <>
                <p className="text-[14px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {result.type === 'caption' ? result.caption : result.rewrittenContent}
                </p>
                {result.type === 'caption' && result.hashtags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {result.hashtags.map((tag, i) => (
                      <span key={i} className="text-[12px] bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleUseResult}
                  className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-[14px] transition cursor-pointer"
                >
                  ✅ Sử dụng nội dung này
                </button>
              </>
            )}

            {/* Hashtag result */}
            {result.type === 'hashtags' && result.hashtags?.length > 0 && (
              <>
                <p className="text-[12px] text-slate-500">Nhấn vào hashtag để thêm vào bài viết:</p>
                <div className="flex flex-wrap gap-2">
                  {result.hashtags.map((tag, i) => (
                    <button
                      key={i}
                      onClick={() => handleUseHashtag(tag)}
                      className="text-[13px] bg-white border border-purple-200 text-purple-600 px-3 py-1.5 rounded-full font-semibold hover:bg-purple-100 hover:border-purple-400 transition cursor-pointer"
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENT CHÍNH: CreatePostModal (có tích hợp AI)
// ═══════════════════════════════════════════════════════════════════════════
const CreatePostModal = ({ isOpen, onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]); 
  // State previewUrls giờ sẽ lưu object để biết file đó là ảnh hay video: { url, isVideo }
  const [previewUrls, setPreviewUrls] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const fileInputRef = useRef(null);

  const storedUser = localStorage.getItem('user');
  const currentUser = storedUser ? JSON.parse(storedUser) : null;
  const myName = currentUser?.username || "Người dùng";
  const myAvatar = (currentUser?.avatar && currentUser.avatar.trim() !== "") 
    ? currentUser.avatar 
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(myName)}&background=fbcfe8&color=be185d`;

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      
      // Kiểm tra xem file là video hay ảnh để preview cho chuẩn
      const newPreviews = files.map(file => ({
        url: URL.createObjectURL(file),
        isVideo: file.type.startsWith('video/')
      }));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const removeMedia = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() && selectedFiles.length === 0) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      let mediaUrls = [];
      if (selectedFiles.length > 0) {
        mediaUrls = await uploadToCloudinary(selectedFiles);
      }

      const response = await api.post(
        'posts', 
        { content, images: mediaUrls }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      onPostCreated(response.data);
      onClose();
      setContent('');
      setSelectedFiles([]);
      setPreviewUrls([]);
      setShowAiPanel(false);
    } catch (err) {
      alert("Lỗi khi đăng bài! Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Khi AI trả về caption → chèn vào textarea
  const handleAiUseCaption = (text) => {
    setContent(text);
    setShowAiPanel(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-[550px] rounded-[32px] shadow-2xl overflow-hidden animate-fade-in relative">
        
        {/* AI PANEL OVERLAY */}
        {showAiPanel && (
          <AiPanel
            currentContent={content}
            onUseCaption={handleAiUseCaption}
            onClose={() => setShowAiPanel(false)}
          />
        )}

        {/* HEADER */}
        <div className="flex justify-between items-center p-5 border-b border-slate-100 relative">
          <h3 className="font-bold text-[18px] text-slate-900 w-full text-center">Tạo bài viết mới</h3>
          <button onClick={onClose} className="absolute right-5 p-2 text-slate-400 hover:text-rose-500 rounded-full transition cursor-pointer">
            <FiX className="text-xl" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto max-h-[80vh] hide-scroll">
          {/* USER INFO + NÚT AI */}
          <div className="flex gap-3 mb-4 items-center justify-between">
            <div className="flex gap-3 items-center">
              <img src={myAvatar} className="w-11 h-11 rounded-full object-cover shadow-sm" alt="Avatar" />
              <p className="font-bold text-slate-900">{myName}</p>
            </div>
            {/* NÚT MỞ AI ASSISTANT */}
            <button
              onClick={() => setShowAiPanel(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-[13px] font-bold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 cursor-pointer"
              style={{ background: 'linear-gradient(135deg, #8b5cf6, #d946ef)' }}
            >
              <span>✨</span>
              <span>Viết bằng AI</span>
            </button>
          </div>

          <textarea
            className="w-full h-[100px] outline-none resize-none text-[17px] text-slate-800 placeholder-slate-400"
            placeholder={`${myName} ơi, bạn đang nghĩ gì thế?`}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          ></textarea>

          {/* LƯỚI PREVIEW ẢNH & VIDEO */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {previewUrls.map((media, index) => (
              <div key={index} className="relative aspect-square bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
                {media.isVideo ? (
                  <video src={media.url} className="w-full h-full object-cover" muted autoPlay loop />
                ) : (
                  <img src={media.url} className="w-full h-full object-cover" alt="preview" />
                )}
                <button 
                  onClick={() => removeMedia(index)}
                  className="absolute -top-1 -right-1 bg-rose-500 text-white p-1 rounded-full shadow-md hover:bg-rose-600 transition cursor-pointer z-10"
                >
                  <FiX size={12} />
                </button>
              </div>
            ))}
            
            <button 
              onClick={() => fileInputRef.current.click()}
              className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-pink-300 hover:text-pink-500 transition cursor-pointer bg-slate-50/50"
            >
              <FiPlus size={24} />
              <span className="text-[11px] font-bold mt-1 text-center">Ảnh / Video</span>
            </button>
          </div>

          {/* CHÚ Ý: accept="image/*,video/*" để cho phép chọn cả video */}
          <input type="file" hidden ref={fileInputRef} accept="image/*,video/*" multiple onChange={handleFileChange} />

          <button 
            onClick={handleSubmit}
            disabled={loading || (!content.trim() && selectedFiles.length === 0)}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white font-bold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 disabled:bg-pink-200 cursor-pointer"
          >
            {loading ? <><FiLoader className="animate-spin" /> Đang tải lên {selectedFiles.length} file...</> : 'Đăng bài'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreatePostModal;