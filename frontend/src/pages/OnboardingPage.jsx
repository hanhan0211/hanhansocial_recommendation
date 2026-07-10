import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { FiCheck } from 'react-icons/fi';

const GRADIENTS = [
  'bg-gradient-to-br from-purple-500 to-indigo-600',
  'bg-gradient-to-br from-pink-500 to-rose-500',
  'bg-gradient-to-br from-teal-400 to-emerald-500',
  'bg-gradient-to-br from-orange-400 to-red-500',
  'bg-gradient-to-br from-blue-500 to-cyan-500',
  'bg-gradient-to-br from-yellow-400 to-orange-500',
  'bg-gradient-to-br from-fuchsia-500 to-purple-600',
  'bg-gradient-to-br from-sky-400 to-blue-600',
  'bg-gradient-to-br from-green-400 to-teal-500',
  'bg-gradient-to-br from-rose-400 to-pink-600',
];

const OnboardingPage = () => {
  const navigate = useNavigate();
  const [hashtags, setHashtags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch trending hashtags on mount
  useEffect(() => {
    const fetchHashtags = async () => {
      try {
        const response = await api.get('/hashtags/trending');
        // Extract up to 20 hashtags
        const fetchedTags = response.data.slice(0, 20).map(tag => tag.name);
        
        // If not enough trending tags, add some default ones
        const defaultTags = ['nhiep_anh', 'am_thuc', 'du_lich', 'thoi_trang', 'cong_nghe', 'giai_tri', 'the_thao', 'nghe_thuat', 'am_nhac', 'game'];
        const combined = [...new Set([...fetchedTags, ...defaultTags])].slice(0, 15);
        
        setHashtags(combined);
      } catch (err) {
        console.error('Failed to fetch hashtags:', err);
        // Fallback
        setHashtags(['nhiep_anh', 'am_thuc', 'du_lich', 'thoi_trang', 'cong_nghe', 'giai_tri', 'the_thao', 'nghe_thuat', 'am_nhac', 'game']);
      } finally {
        setLoading(false);
      }
    };
    fetchHashtags();
  }, []);

  const toggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      if (selectedTags.length >= 3) {
        setError('Bạn chỉ được chọn tối đa 3 chủ đề');
        setTimeout(() => setError(''), 3000);
        return;
      }
      setError('');
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = async () => {
    if (selectedTags.length !== 3) {
      setError('Vui lòng chọn đủ 3 chủ đề bạn yêu thích');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await api.put('/users/onboarding', { hashtags: selectedTags });
      
      // Update local storage user data
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        user.hasCompletedOnboarding = true;
        localStorage.setItem('user', JSON.stringify(user));
      }
      
      navigate('/home');
    } catch (err) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white md:bg-gray-50 flex flex-col items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8 bg-white p-6 md:p-10 md:rounded-3xl md:shadow-xl border border-gray-100">
        <div className="text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight">
            Chào mừng bạn đến với TVU!
          </h2>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Hãy chọn đúng <span className="font-semibold text-blue-600">3 chủ đề</span> mà bạn quan tâm để chúng tôi có thể đề xuất những nội dung phù hợp nhất dành riêng cho bạn.
          </p>
        </div>

        <div className="mt-10">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {hashtags.map((tag, index) => {
              const isSelected = selectedTags.includes(tag);
              const gradient = GRADIENTS[index % GRADIENTS.length];
              
              return (
                <div
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`
                    relative cursor-pointer rounded-2xl overflow-hidden aspect-square flex flex-col items-center justify-center p-4 transition-all duration-300 transform 
                    ${isSelected ? 'ring-4 ring-offset-2 ring-blue-500 scale-95 shadow-inner' : 'hover:scale-105 hover:shadow-lg shadow-md'}
                    ${gradient}
                  `}
                >
                  {/* Overlay for unselected state to make text pop */}
                  {!isSelected && <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>}
                  {isSelected && <div className="absolute inset-0 bg-black/40"></div>}
                  
                  <span className={`relative z-10 font-bold text-white text-center break-words w-full text-sm md:text-base drop-shadow-md ${isSelected ? 'opacity-50' : 'opacity-100'}`}>
                    #{tag}
                  </span>

                  {isSelected && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center animate-pop-in">
                      <div className="bg-white rounded-full p-2 shadow-lg">
                        <FiCheck className="text-blue-600 text-xl font-bold" />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-md animate-fade-in">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-medium">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-col sm:flex-row items-center justify-between border-t border-gray-100 pt-6">
          <p className="text-sm text-gray-500 mb-4 sm:mb-0">
            Đã chọn: <span className="font-bold text-gray-900">{selectedTags.length}</span> / {hashtags.length}
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting || selectedTags.length !== 3}
            className={`
              w-full sm:w-auto px-8 py-3 rounded-full font-bold text-white shadow-lg transition-all duration-300 flex justify-center items-center
              ${selectedTags.length === 3 && !submitting 
                ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/30 transform hover:-translate-y-1' 
                : 'bg-gray-300 cursor-not-allowed shadow-none'}
            `}
          >
            {submitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Đang xử lý...
              </>
            ) : (
              'Bắt đầu khám phá'
            )}
          </button>
        </div>
      </div>
      
      {/* Custom animations */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pop-in {
          0% { transform: scale(0.5); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop-in {
          animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}} />
    </div>
  );
};

export default OnboardingPage;
