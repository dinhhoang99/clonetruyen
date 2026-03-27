import { useState, useEffect, useCallback } from 'react';
import './index.css';
import {
  getPopularManga, getLatestUpdates, searchManga, getMangaDetails, getChapterImages, getSearchSuggestions,
  COUNTRIES, STATUSES, CHAPTER_COUNTS, SORT_OPTIONS, GENRES, toImgProxy
} from './api';

// ===== SKELETON CARD =====
const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton skeleton-img" />
    <div className="skeleton skeleton-text" />
    <div className="skeleton skeleton-text-sm" />
  </div>
);

// ===== MANGA CARD =====
const MangaCard = ({ manga, onClick, index }) => {
  const isNew = index < 5;
  const isHot = index >= 5 && index < 12;
  return (
    <div className="manga-card" onClick={() => onClick(manga)}>
      <div className="manga-card-img">
        {isNew && <span className="status-badge status-new">Mới</span>}
        {isHot && <span className="status-badge status-hot">🔥 Hot</span>}
        <img
          src={manga.thumbnail_url ? toImgProxy(manga.thumbnail_url) : 'https://placehold.co/200x300/1a1a2e/6c63ff?text=No+Cover'}
          alt={manga.title}
          loading="lazy"
          onError={(e) => { e.target.src = 'https://placehold.co/200x300/1a1a2e/6c63ff?text=No+Cover'; }}
        />
        <div className="manga-card-overlay">
          <div className="manga-card-overlay-title">{manga.title}</div>
          <button className="read-btn">Xem chi tiết →</button>
        </div>
      </div>
      <div className="manga-card-info">
        <div className="manga-card-title">{manga.title}</div>
      </div>
    </div>
  );
};

// ===== MANGA READER SCREEN =====
const MangaReaderScreen = ({ chapterInfo, onBack, onChapterSelect }) => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!chapterInfo?.url) return;
    let active = true;

    window.scrollTo({ top: 0, behavior: 'auto' });

    const loadChapterImages = async () => {
      setLoading(true);
      setError(null);
      setImages([]);

      try {
        const res = await getChapterImages(chapterInfo.url);
        if (!active) return;
        setImages(res.images || []);
      } catch (e) {
        if (!active) return;
        setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadChapterImages();

    return () => {
      active = false;
    };
  }, [chapterInfo?.url]);

  const chapterList = chapterInfo.allChapters || [];
  let currentIndex = chapterList.findIndex(c => c.url === chapterInfo.url);

  // Try to determine logic based on text, typically index 0 is latest chapter
  const isDescending = chapterList.length > 1 && parseInt(chapterList[0].name.replace(/\D/g, '') || 0) > parseInt(chapterList[chapterList.length-1].name.replace(/\D/g, '') || 0);
  
  const chapterNext = currentIndex !== -1 ? (isDescending ? chapterList[currentIndex - 1] : chapterList[currentIndex + 1]) : null;
  const chapterPrev = currentIndex !== -1 ? (isDescending ? chapterList[currentIndex + 1] : chapterList[currentIndex - 1]) : null;

  return (
    <div className="reader-screen">
      <div className="reader-header">
        <button className="reader-close-btn" onClick={onBack}>✕ Đóng</button>
        <div className="reader-title">
          {chapterInfo.mangaTitle} - {chapterInfo.name || chapterList[currentIndex]?.name || 'Đang tải...'}
        </div>
        <div>
          {chapterList.length > 0 && (
            <select
              className="reader-nav-select"
              value={chapterInfo.url}
              onChange={(e) => onChapterSelect({ url: e.target.value, name: e.target.options[e.target.selectedIndex].text })}
            >
              {chapterList.map((ch, i) => (
                <option key={i} value={ch.url}>{ch.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="reader-content">
        {loading && <div style={{ color: 'white', padding: 40 }}>Đang tải nội dung chương...</div>}
        {error && <div style={{ color: 'var(--accent2)', padding: 40 }}>⚠️ Lỗi: {error}</div>}
        
        {!loading && !error && images.length === 0 && (
          <div style={{ color: 'white', padding: 40 }}>Không tìm thấy hình ảnh nào cho chương này.</div>
        )}

        {images.map((img, i) => (
          <img
            key={i}
            src={toImgProxy(img)}
            alt={`Page ${i + 1}`}
            className="reader-img"
            loading={i < 3 ? "eager" : "lazy"}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        ))}

        {!loading && !error && (
          <div className="reader-nav">
            <button
              className="reader-nav-btn"
              disabled={!chapterPrev}
              onClick={() => chapterPrev && onChapterSelect(chapterPrev)}
            >
              ← Chương Trước
            </button>
            <button className="reader-nav-btn" onClick={onBack}>Về Trang Truyện</button>
            <button
              className="reader-nav-btn"
              disabled={!chapterNext}
              onClick={() => chapterNext && onChapterSelect(chapterNext)}
            >
              Chương Tiếp →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== MANGA DETAIL SCREEN =====
const MangaDetailScreen = ({ manga, onBack, onChapterPlay }) => {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!manga) return;
    let active = true;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const loadMangaDetail = async () => {
      setLoading(true);
      setError(null);
      setDetail(null);

      try {
        const detailData = await getMangaDetails(manga.url);
        if (!active) return;
        setDetail(detailData);
      } catch (e) {
        if (!active) return;
        setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadMangaDetail();

    return () => {
      active = false;
    };
  }, [manga]);

  if (!manga) return null;

  const statusColor = {
    'Đang tiến hành': '#43e97b',
    'Hoàn thành': '#6c63ff',
    'Tạm ngưng': '#ff6584',
    'Không rõ': '#9898b8',
  };

  return (
    <div className="detail-screen animation-slide-up">
      <button className="back-btn" onClick={onBack}>
        ← Quay lại danh sách
      </button>

      <div className="detail-header">
        <div className="detail-cover-wrapper">
          <img
            className="detail-cover"
            src={toImgProxy(detail?.thumbnail_url || manga.thumbnail_url) || 'https://placehold.co/200x300/1a1a2e/6c63ff?text=...'}
            alt={detail?.title || manga.title}
            onError={(e) => { e.target.src = 'https://placehold.co/200x300/1a1a2e/6c63ff?text=No+Cover'; }}
          />
        </div>
        <div className="detail-meta">
          <h1 className="detail-title">{detail?.title || manga.title}</h1>
          
          {loading && <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Đang tải thông tin chi tiết...</div>}
          
          {detail && (
            <>
              {detail.author && (
                <div className="detail-tag">✍️ <span>{detail.author}</span></div>
              )}
              <div className="detail-tag" style={{ color: statusColor[detail.status] || 'var(--text-secondary)' }}>
                ● {detail.status}
              </div>
              
              {detail.genres?.length > 0 && (
                <div className="detail-genres">
                  {detail.genres.map(g => (
                    <span key={g} className="detail-genre-chip">{g}</span>
                  ))}
                </div>
              )}
              
              <div className="detail-actions">
                {detail.chapters?.length > 0 && (
                  <button onClick={() => onChapterPlay(detail.chapters[detail.chapters.length - 1], manga, detail.chapters)} className="read-primary-btn">
                    📖 Đọc Chương Đầu
                  </button>
                )}
                {detail.chapters?.length > 1 && (
                  <button onClick={() => onChapterPlay(detail.chapters[0], manga, detail.chapters)} className="read-secondary-btn">
                    Mới Nhất
                  </button>
                )}
                <a
                  href={manga.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="source-link-btn"
                >
                  🔗 Nguồn TruyenQQ ↗
                </a>
              </div>
            </>
          )}
          {error && <div style={{ color: 'var(--accent2)', fontSize: 14 }}>⚠️ {error}</div>}
        </div>
      </div>

      <div className="detail-body">
        {detail?.description && (
          <div className="detail-section">
            <h2 className="detail-section-label">Nội dung</h2>
            <div className="detail-desc">{detail.description}</div>
          </div>
        )}

        {detail?.chapters?.length > 0 && (
          <div className="detail-section" style={{ marginTop: 32 }}>
            <h2 className="detail-section-label">Danh sách chương ({detail.chapters.length} chương)</h2>
            <div className="detail-chapter-list">
              {detail.chapters.map((ch, i) => (
                <button
                  key={i}
                  className="detail-chapter-item"
                  onClick={() => onChapterPlay(ch, manga, detail.chapters)}
                >
                  <span className="chapter-name">{ch.name}</span>
                  <span className="chapter-date">{ch.date}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ===== FILTER BAR =====
const FilterBar = ({ filters, onChange, onApply }) => (
  <div className="filter-bar">
    <div className="filter-group">
      <label className="filter-label">Quốc gia</label>
      <select className="filter-select" value={filters.country} onChange={e => onChange('country', e.target.value)}>
        {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    </div>
    <div className="filter-group">
      <label className="filter-label">Tình trạng</label>
      <select className="filter-select" value={filters.status} onChange={e => onChange('status', e.target.value)}>
        {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
    <div className="filter-group">
      <label className="filter-label">Số chương</label>
      <select className="filter-select" value={filters.minchapter} onChange={e => onChange('minchapter', e.target.value)}>
        {CHAPTER_COUNTS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
      </select>
    </div>
    <div className="filter-group">
      <label className="filter-label">Sắp xếp</label>
      <select className="filter-select" value={filters.sort} onChange={e => onChange('sort', e.target.value)}>
        {SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
      </select>
    </div>
    <button className="filter-btn" onClick={onApply}>Áp dụng bộ lọc</button>
  </div>
);

// ===== GENRE PICKER (tristate: none → include → exclude) =====
const GenrePicker = ({ genreStates, onToggle }) => (
  <div className="genre-section">
    <div className="genre-title">🎭 Thể loại (click để lọc / click lại để loại trừ)</div>
    <div className="genre-grid">
      {GENRES.map(g => {
        const state = genreStates[g.id] || 'none';
        return (
          <button
            key={g.id}
            className={`genre-chip ${state === 'include' ? 'included' : state === 'exclude' ? 'excluded' : ''}`}
            onClick={() => onToggle(g.id)}
            title={state === 'none' ? 'Click để thêm' : state === 'include' ? 'Click để loại trừ' : 'Click để bỏ chọn'}
          >
            {state === 'include' ? '✓ ' : state === 'exclude' ? '✕ ' : ''}{g.name}
          </button>
        );
      })}
    </div>
  </div>
);

// ===== MAIN APP =====
export default function App() {
  const [tab, setTab] = useState('popular'); // popular | latest | search
  const [page, setPage] = useState(1);
  const [manga, setManga] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedManga, setSelectedManga] = useState(null);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [source, setSource] = useState('truyenqq');

  // Search/filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ country: '0', status: '-1', minchapter: '0', sort: '4' });
  const [activeFilters, setActiveFilters] = useState({ country: '0', status: '-1', minchapter: '0', sort: '4' });
  const [genreStates, setGenreStates] = useState({});
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchSuggestions([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);

    const timer = setTimeout(async () => {
      try {
        const results = await getSearchSuggestions(searchQuery);
        setSearchSuggestions(results);
      } catch (e) {
        console.error('Lỗi lấy gợi ý tìm kiếm:', e);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let result;
      if (tab === 'popular') {
        result = await getPopularManga(page);
      } else if (tab === 'latest') {
        result = await getLatestUpdates(page);
      } else {
        // Build genre filters
        const included = Object.entries(genreStates).filter(([, v]) => v === 'include').map(([id]) => id);
        const excluded = Object.entries(genreStates).filter(([, v]) => v === 'exclude').map(([id]) => id);
        result = await searchManga(page, activeQuery, {
          ...activeFilters,
          category: included.join(','),
          notcategory: excluded.join(','),
        });
      }
      setManga(result.manga);
      setHasNextPage(result.hasNextPage);
    } catch (e) {
      setError(e.message || 'Không thể tải dữ liệu. Có thể do CORS hoặc website nguồn đang bảo trì.');
    } finally {
      setLoading(false);
    }
  }, [tab, page, activeQuery, activeFilters, genreStates]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setPage(1);
    setManga([]);
    setSelectedManga(null);
    setSelectedChapter(null);
    if (newTab !== 'search') setShowFilters(false);
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    setActiveQuery(searchQuery);
    setTab('search');
    setPage(1);
    setManga([]);
    setSelectedManga(null);
    setSelectedChapter(null);
  };

  const handleFilterApply = () => {
    setActiveFilters({ ...filters });
    setPage(1);
    setManga([]);
    fetchData();
  };

  const handleGenreToggle = (id) => {
    setGenreStates(prev => {
      const cur = prev[id] || 'none';
      const next = cur === 'none' ? 'include' : cur === 'include' ? 'exclude' : 'none';
      return { ...prev, [id]: next };
    });
  };

  const handleChapterPlay = (chapter, mangaObj, allChapters) => {
    setSelectedChapter({ ...chapter, mangaTitle: mangaObj?.title || selectedManga?.title || 'Đọc Truyện', allChapters });
  };

  const tabLabel = {
    popular: '⭐ Truyện Yêu Thích',
    latest: '🔥 Mới Cập Nhật',
    search: '🔍 Tìm Kiếm & Lọc',
  };

  const QUICK_GENRES = [
    { name: 'Action', id: '26' },
    { name: 'Romance', id: '36' },
    { name: 'Isekai', id: '85' },
    { name: 'Manhwa', id: '49' },
    { name: 'Comedy', id: '28' },
    { name: 'Harem', id: '47' },
    { name: 'School Life', id: '37' },
    { name: 'Fantasy', id: '30' },
    { name: 'Ngôn Tình', id: '87' },
    { name: 'Truyện Màu', id: '92' },
  ];

  const handleQuickGenre = (genre) => {
    setTab('search');
    setActiveQuery('');
    setSearchQuery('');
    setShowFilters(true);
    setFilters({ country: '0', status: '-1', minchapter: '0', sort: '4' });
    setActiveFilters({ country: '0', status: '-1', minchapter: '0', sort: '4' });
    setGenreStates({ [genre.id]: 'include' });
    setPage(1);
    setManga([]);
    setSelectedManga(null);
    setSelectedChapter(null);
  };

  if (selectedChapter) {
    return (
      <MangaReaderScreen
        chapterInfo={selectedChapter}
        onBack={() => setSelectedChapter(null)}
        onChapterSelect={(ch) => setSelectedChapter({ ...selectedChapter, url: ch.url, name: ch.name || ch.title })}
      />
    );
  }

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="header">
        <div className="header-inner">
          <div className="logo" onClick={() => handleTabChange('popular')} style={{cursor: 'pointer'}}>
            <div className="logo-icon">📚</div>
            <span className="logo-text">CloneTruyen</span>
          </div>
          
          <div className="source-selector">
            <select
              className="source-dropdown"
              value={source}
              onChange={(e) => {
                if (e.target.value !== 'truyenqq') {
                  alert('Nguồn này đang trong quá trình phát triển, vui lòng quay lại sau!');
                } else {
                  setSource(e.target.value);
                }
              }}
            >
              <option value="truyenqq">TruyenQQ</option>
              <option value="nettruyen">NetTruyen</option>
              <option value="blogtruyen">BlogTruyen</option>
            </select>
          </div>

          <form className="search-wrapper" onSubmit={handleSearch} style={{ position: 'relative' }}>
            <input
              id="search-input"
              className="search-input"
              type="text"
              placeholder="Tìm kiếm truyện (tự động sau 0.5s)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => { if (searchQuery) setShowSuggestions(true); }}
              onBlur={() => { setTimeout(() => setShowSuggestions(false), 200); }}
              autoComplete="off"
            />
            <button type="submit" className="search-btn" title="Tìm kiếm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </button>
            
            {showSuggestions && (isSearching || searchSuggestions.length > 0) && (
              <div className="search-dropdown">
                {isSearching ? (
                  <div className="search-dropdown-loading">Đang tải gợi ý...</div>
                ) : (
                  searchSuggestions.map((m, i) => (
                    <div key={i} className="search-dropdown-item" onClick={() => {
                        setSelectedManga({ url: m.url, title: m.title, thumbnail_url: m.thumbnail_url });
                        setSearchQuery('');
                        setShowSuggestions(false);
                    }}>
                       <img src={toImgProxy(m.thumbnail_url)} alt="" className="search-dropdown-img" />
                       <span className="search-dropdown-title">{m.title}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </form>
          <nav className="nav-tabs">
            <button id="tab-popular" className={`nav-tab ${tab === 'popular' ? 'active' : ''}`} onClick={() => handleTabChange('popular')}>⭐ Phổ biến</button>
            <button id="tab-latest" className={`nav-tab ${tab === 'latest' ? 'active' : ''}`} onClick={() => handleTabChange('latest')}>🔥 Mới nhất</button>
            <button
              id="tab-filter"
              className={`nav-tab ${tab === 'search' && !activeQuery ? 'active' : ''}`}
              onClick={() => { handleTabChange('search'); setShowFilters(true); setActiveQuery(''); }}
            >
              🎛️ Bộ lọc
            </button>
          </nav>
        </div>
      </header>

      {/* MAIN */}
      <main className="main">
        {selectedManga ? (
          <MangaDetailScreen manga={selectedManga} onBack={() => setSelectedManga(null)} onChapterPlay={handleChapterPlay} />
        ) : (
          <>
            {/* Quick genres bar */}
            <div className="quick-genres-bar">
              <span className="quick-genres-label">🏷️ Thể loại nhanh:</span>
              <div className="quick-genres-scroll">
                {QUICK_GENRES.map(g => (
                  <button key={g.id} className="quick-genre-btn" onClick={() => handleQuickGenre(g)}>
                    {g.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Section header */}
            <div className="section-header">
              <h1 className="section-title">
                {tabLabel[tab] || '📚 Danh sách truyện'}
                <span className="badge">{manga.length > 0 ? `${manga.length} truyện` : ''}</span>
              </h1>
              {tab === 'search' && (
                <button
                  className="filter-btn"
                  style={{ fontSize: 13 }}
                  onClick={() => setShowFilters(v => !v)}
                >
                  {showFilters ? 'Ẩn bộ lọc ▲' : 'Bộ lọc nâng cao ▼'}
                </button>
              )}
            </div>

            {/* Filters (only in search mode) */}
            {tab === 'search' && showFilters && (
              <>
                <FilterBar
                  filters={filters}
                  onChange={(key, val) => setFilters(prev => ({ ...prev, [key]: val }))}
                  onApply={handleFilterApply}
                />
                <GenrePicker genreStates={genreStates} onToggle={handleGenreToggle} />
              </>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="state-box">
                <div className="state-icon">😢</div>
                <div className="state-title">Không thể tải dữ liệu</div>
                <div className="state-msg">{error}</div>
                <button className="retry-btn" onClick={fetchData}>Thử lại</button>
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && manga.length === 0 && (
              <div className="state-box">
                <div className="state-icon">🔍</div>
                <div className="state-title">Không tìm thấy kết quả</div>
                <div className="state-msg">Thử tìm kiếm với từ khóa khác hoặc thay đổi bộ lọc.</div>
              </div>
            )}

            {/* Grid */}
            <div className="manga-grid">
              {loading
                ? Array.from({ length: 18 }).map((_, i) => <SkeletonCard key={i} />)
                : manga.map((m, i) => (
                  <MangaCard key={m.url + i} manga={m} onClick={setSelectedManga} index={i} />
                ))
              }
            </div>

            {/* Pagination */}
            {!loading && !error && manga.length > 0 && (
              <div className="pagination">
                <button
                  id="btn-prev"
                  className="page-btn"
                  disabled={page <= 1}
                  onClick={() => { setPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  ← Trước
                </button>
                {[...Array(Math.min(5, page + 2))].map((_, i) => {
                  const p = Math.max(1, page - 2) + i;
                  if (p > page + 2) return null;
                  return (
                    <button
                      key={p}
                      className={`page-btn ${p === page ? 'active' : ''}`}
                      onClick={() => { setPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  id="btn-next"
                  className="page-btn"
                  disabled={!hasNextPage}
                  onClick={() => { setPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                >
                  Tiếp →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>CloneTruyen Web Reader · Trình duyệt truyện tranh đa nguồn</p>
        <p style={{ marginTop: 4, fontSize: 12 }}>Được tối ưu hóa qua proxy · Chỉ dành cho mục đích giáo dục</p>
      </footer>
    </div>
  );
}
