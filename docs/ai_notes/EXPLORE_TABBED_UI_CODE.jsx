// ═══════════════════════════════════════════════════════════════════════════
// CODE THAY THẾ CHO GIAO DIỆN TABBED UI TRONG EXPLOREPAGE.JSX
// ═══════════════════════════════════════════════════════════════════════════
// Tìm đoạn code từ "Tìm kiếm gần đây" (dòng ~970) đến hết section "Dành riêng cho bạn"
// Xóa toàn bộ và thay bằng code bên dưới
// ═══════════════════════════════════════════════════════════════════════════

              {/* Tìm kiếm gần đây - Hiển thị nếu có lịch sử */}
              {searchHistory.length > 0 && (
                <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-50">
                    <h3 className="font-black text-[16px] text-slate-800 flex items-center gap-2">
                      <FiClock className="text-pink-500" /> Tìm kiếm gần đây
                    </h3>
                    <button
                      onClick={handleClearAllHistory}
                      className="text-pink-600 hover:text-pink-800 text-[13px] font-bold transition flex items-center gap-1 cursor-pointer"
                    >
                      <FiTrash2 size={14} /> Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {searchHistory.map((item) => (
                      <div
                        key={item._id}
                        onClick={() => handleSearch(item.text)}
                        className="group flex items-center gap-2 bg-slate-50 hover:bg-pink-50 border border-slate-100 hover:border-pink-200 rounded-full py-2 pl-4 pr-3.5 cursor-pointer transition-all duration-300"
                      >
                        <span className="text-[13.5px] font-bold text-slate-700 group-hover:text-pink-600 transition">
                          {item.text}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteHistoryItem(item._id, e)}
                          className="p-0.5 hover:bg-slate-200 hover:text-rose-500 text-slate-400 rounded-full transition cursor-pointer"
                          aria-label="Xóa từ khóa"
                        >
                          <FiX size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ============ TABS UI: THỊNH HÀNH vs DÀNH CHO BẠN ============ */}
              <div className="bg-white rounded-[32px] shadow-sm border border-slate-100 overflow-hidden">
                {/* Tabs Header */}
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setExploreTab('trending')}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-bold text-[15px] transition-all relative ${
                      exploreTab === 'trending'
                        ? 'text-pink-600 bg-pink-50/50'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <FiTrendingUp size={20} />
                    <span>🔥 Thịnh hành</span>
                    {exploreTab === 'trending' && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-rose-500" />
                    )}
                  </button>
                  
                  <button
                    onClick={() => setExploreTab('suggested')}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-bold text-[15px] transition-all relative ${
                      exploreTab === 'suggested'
                        ? 'text-violet-600 bg-violet-50/50'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-[20px]">✨</span>
                    <span>Dành cho bạn</span>
                    {exploreTab === 'suggested' && (
                      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                    )}
                  </button>
                </div>

                {/* Tab Content */}
                <div className="p-6">
                  {/* TAB 1: THỊNH HÀNH - Hiển thị Trending Hashtags */}
                  {exploreTab === 'trending' && (
                    <div className="animate-fade-in">
                      {trendingHashtags.length === 0 ? (
                        <div className="py-10 text-center text-slate-400 text-[13.5px]">
                          Chưa có xu hướng hashtag nào được ghi nhận.
                        </div>
                      ) : (
                        <>
                          <div className="mb-4">
                            <p className="text-[13.5px] text-slate-500 leading-relaxed">
                              Khám phá những hashtag đang được nhiều người quan tâm nhất trên HanHan Social
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {trendingHashtags.map((hashtag, idx) => (
                              <Link
                                key={hashtag._id || hashtag.name}
                                to={`/explore/${encodeURIComponent(hashtag.name)}`}
                                className="group p-4 bg-slate-50 hover:bg-gradient-to-tr hover:from-pink-50 hover:to-violet-50 border border-slate-100 hover:border-pink-200 rounded-2xl flex items-center justify-between transition-all duration-300 shadow-sm hover:shadow"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="w-8 h-8 rounded-xl bg-pink-100 text-pink-600 font-black text-[14px] flex items-center justify-center group-hover:bg-pink-600 group-hover:text-white transition duration-300">
                                    {idx + 1}
                                  </span>
                                  <span className="font-bold text-[15px] text-slate-800 group-hover:text-pink-600 transition">
                                    #{hashtag.name}
                                  </span>
                                </div>
                                <span className="text-[12px] font-bold px-3 py-1 bg-white border border-slate-100 text-slate-500 rounded-full group-hover:border-pink-200 group-hover:text-pink-500 transition">
                                  {hashtag.count || 0} bài đăng
                                </span>
                              </Link>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* TAB 2: DÀNH CHO BẠN - Hiển thị Bài viết gợi ý */}
                  {exploreTab === 'suggested' && (
                    <div className="animate-fade-in">
                      {exploreLoading && explorePosts.length === 0 ? (
                        <div className="py-10 flex flex-col items-center justify-center">
                          <FiLoader className="animate-spin text-3xl text-violet-500 mb-2" />
                          <p className="text-slate-400 text-[13px]">Đang tìm bài viết phù hợp với bạn...</p>
                        </div>
                      ) : explorePosts.length === 0 ? (
                        <div className="bg-gradient-to-br from-violet-50/50 to-pink-50/50 rounded-2xl p-8 text-center border border-violet-100/50">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 border border-violet-100 shadow-sm">
                            <FiCompass className="text-violet-400" size={24} />
                          </div>
                          <h3 className="font-bold text-slate-800 text-[15px]">Chưa có gợi ý</h3>
                          <p className="text-slate-400 text-[12.5px] mt-1.5 leading-relaxed">
                            Tương tác với nhiều bài viết hơn để nhận gợi ý cá nhân hóa!
                          </p>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4">
                            <p className="text-[13.5px] text-slate-500 leading-relaxed">
                              Những bài viết được gợi ý dựa trên sở thích và tương tác của bạn
                            </p>
                          </div>

                          {/* Danh sách bài viết */}
                          <div className="flex flex-col gap-6">
                            {explorePosts.map((post) => renderPostCard(post))}
                          </div>

                          {/* Nút Load More */}
                          {exploreHasMore && (
                            <div className="mt-6 text-center">
                              <button
                                onClick={() => fetchExplorePosts(true)}
                                disabled={exploreLoading}
                                className="px-6 py-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:from-slate-300 disabled:to-slate-400 text-white rounded-2xl font-bold text-[14px] shadow-lg shadow-violet-500/20 hover:shadow-xl hover:shadow-violet-500/30 transition duration-300 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                              >
                                {exploreLoading ? (
                                  <>
                                    <FiLoader className="animate-spin" size={18} />
                                    Đang tải...
                                  </>
                                ) : (
                                  <>
                                    <FiCompass size={18} />
                                    Khám phá thêm
                                  </>
                                )}
                              </button>
                            </div>
                          )}

                          {/* Thông báo hết bài */}
                          {!exploreHasMore && explorePosts.length > 0 && (
                            <div className="mt-6 text-center py-4 px-6 bg-gradient-to-r from-violet-50/50 to-purple-50/50 backdrop-blur-sm rounded-2xl border border-violet-100/50">
                              <p className="text-slate-400 text-[13px] font-medium">
                                🎉 Bạn đã xem hết tất cả gợi ý! Hãy quay lại sau để khám phá thêm.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
