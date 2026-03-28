import { useState, useEffect, useCallback } from 'react';
import './index.css';
import {
  getPopularManga, getLatestUpdates, searchManga, getMangaDetails, getChapterImages, getSearchSuggestions, getMangaByGenre,
  COUNTRIES, STATUSES, CHAPTER_COUNTS, SORT_OPTIONS, GENRES, toImgProxy
} from './api';

// Router tĩnh (History API) + cache để trở về không gọi lại API.
const buildUrl = ({ tab = 'popular', page = 1, mangaUrl, chapterUrl }) => {
  const params = new URLSearchParams();
  params.set('tab', tab);
  params.set('page', page.toString());
  if (mangaUrl) params.set('manga', mangaUrl);
  if (chapterUrl) params.set('chapter', chapterUrl);
  const query = params.toString();
  return query ? `?${query}` : '/';
};

const parseInitialRoute = () => {
  const qs = new URLSearchParams(window.location.search);
  return {
    tab: qs.get('tab') || 'popular',
    page: Number(qs.get('page') || '1'),
    mangaUrl: qs.get('manga') || qs.get('url') || null,
    chapterUrl: qs.get('chapter') || null,
  };
};

const pageDataCache = {
  popular: new Map(),
  latest: new Map(),
  search: new Map(),
  genre: new Map(),
};
const mangaDetailCache = new Map();
const chapterImageCache = new Map();



// ===== MANGA CARD HORIZONTAL =====
const MangaCardHorizontal = ({ manga, onClick }) => (
  <div className="manga-card-horizontal" onClick={() => onClick(manga)}>
    <div className="manga-card-horizontal-img">
      <img
        src={manga.thumbnail_url ? toImgProxy(manga.thumbnail_url) : 'https://placehold.co/150x200/1a1a2e/6c63ff?text=No+Cover'}
        alt={manga.title}
        loading="lazy"
        onError={(e) => { e.target.src = 'https://placehold.co/150x200/1a1a2e/6c63ff?text=No+Cover'; }}
      />
    </div>
    <div className="manga-card-horizontal-info">
      <div className="manga-card-horizontal-title">{manga.title}</div>
    </div>
  </div>
);

const SkeletonCard = () => (
  <div className="manga-card">
    <div className="manga-card-img">
      <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.08)' }} />
    </div>
    <div className="manga-card-info">
      <div style={{ width: '80%', height: 14, background: 'rgba(255,255,255,0.08)', borderRadius: 4, margin: '8px 0' }} />
      <div style={{ width: '60%', height: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }} />
    </div>
  </div>
);

// ===== HORIZONTAL SCROLL SECTION =====
const HorizontalScrollSection = ({ title, manga, loading, onMangaClick, onViewAll }) => (
  <section className="horizontal-section">
    <div className="section-header-horizontal">
      <h2 className="section-title-horizontal">{title}</h2>
      {onViewAll && (
        <button className="view-all-btn" onClick={onViewAll}>
          Xem tất cả →
        </button>
      )}
    </div>
    <div className="horizontal-scroll-container">
      <div className="horizontal-scroll-track">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card-horizontal">
              <div className="skeleton skeleton-img-horizontal" />
              <div className="skeleton skeleton-text-horizontal" />
            </div>
          ))
        ) : (
          manga.map((m, i) => (
            <MangaCardHorizontal key={m.url + i} manga={m} onClick={onMangaClick} />
          ))
        )}
      </div>
    </div>
  </section>
);

// ===== HOME PAGE =====
const HomePage = ({ onMangaClick }) => {
  const [popularManga, setPopularManga] = useState([]);
  const [latestManga, setLatestManga] = useState([]);
  const [latestPage, setLatestPage] = useState(1);
  const [pageWindowStart, setPageWindowStart] = useState(1);
  const [hasNextLatestPage, setHasNextLatestPage] = useState(true);
  const [loading, setLoading] = useState({
    popular: true,
    latest: true,
  });

  useEffect(() => {
    const loadHomeData = async () => {
      // Load popular manga
      if (pageDataCache.popular.has('popular|1')) {
        setPopularManga(pageDataCache.popular.get('popular|1').manga.slice(0, 12));
        setLoading(prev => ({ ...prev, popular: false }));
      } else {
        try {
          const result = await getPopularManga(1);
          pageDataCache.popular.set('popular|1', result);
          setPopularManga(result.manga.slice(0, 12));
        } catch (e) {
          console.error('Error loading popular manga:', e);
        } finally {
          setLoading(prev => ({ ...prev, popular: false }));
        }
      }
    };

    loadHomeData();
  }, []);

  useEffect(() => {
    const loadLatest = async () => {
      setLoading(prev => ({ ...prev, latest: true }));
      const cacheKey = `latest|${latestPage}`;
      if (pageDataCache.latest.has(cacheKey)) {
        const cached = pageDataCache.latest.get(cacheKey);
        setLatestManga(cached.manga.slice(0, 35));
        setHasNextLatestPage(cached.hasNextPage || false);
        setLoading(prev => ({ ...prev, latest: false }));
        return;
      }

      try {
        const result = await getLatestUpdates(latestPage);
        pageDataCache.latest.set(cacheKey, result);
        setLatestManga(result.manga.slice(0, 35));
        setHasNextLatestPage(result.hasNextPage || false);
      } catch (e) {
        console.error('Error loading latest manga:', e);
      } finally {
        setLoading(prev => ({ ...prev, latest: false }));
      }
    };

    // Adjust pageWindowStart when latestPage changes
    if (latestPage < pageWindowStart) {
      setPageWindowStart(Math.max(1, latestPage - 2));
    } else if (latestPage > pageWindowStart + 4) {
      setPageWindowStart(latestPage - 2);
    }

    loadLatest();
  }, [latestPage]);

  return (
    <div className="home-page">
      <HorizontalScrollSection
        title="⭐ Truyện Hay"
        manga={popularManga}
        loading={loading.popular}
        onMangaClick={onMangaClick}
      />

      <section className="grid-section">
        <div className="section-header-horizontal">
          <h2 className="section-title-horizontal">🔥 Truyện Mới</h2>
        </div>
        <div className="manga-grid manga-grid-home">
          {loading.latest ? (
            Array.from({ length: 35 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : (
            latestManga.map((m, i) => (
              <MangaCard key={m.url + i} manga={m} onClick={onMangaClick} index={i} />
            ))
          )}
        </div>

        <div className="pagination-controls pagination-center">
          <button 
            className="page-nav-btn" 
            onClick={() => setLatestPage(1)}
            disabled={latestPage === 1}
            title="Trang đầu"
          >
            |&lt;
          </button>
          
          <button 
            className="page-nav-btn" 
            onClick={() => setLatestPage(Math.max(1, latestPage - 1))}
            disabled={latestPage === 1}
            title="Trang trước"
          >
            &lt;
          </button>

          <div className="page-numbers">
            {Array.from({ length: 5 }).map((_, i) => {
              const pageNum = pageWindowStart + i;
              return (
                <button
                  key={pageNum}
                  className={`page-btn ${latestPage === pageNum ? 'active' : ''}`}
                  onClick={() => setLatestPage(pageNum)}
                  disabled={latestPage === pageNum}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button 
            className="page-nav-btn" 
            onClick={() => setLatestPage(latestPage + 1)}
            disabled={!hasNextLatestPage}
            title="Trang sau"
          >
            &gt;
          </button>

          <button 
            className="page-nav-btn" 
            onClick={() => {
              // Estimate last page based on hasNextPage
              const estimatedLastPage = latestPage + (hasNextLatestPage ? 10 : 0);
              setLatestPage(estimatedLastPage);
            }}
            disabled={!hasNextLatestPage}
            title="Trang cuối"
          >
            &gt;|
          </button>
        </div>
      </section>
    </div>
  );
};

// ===== MANGA CARD =====
const MangaCard = ({ manga, onClick, index }) => {
  const isNew = index < 5;
  const isHot = index >= 5 && index < 12;
  return (
    <div className="manga-card" onClick={() => onClick(manga)}>
      <div className="manga-card-img">
        {isNew && <span className="status-badge status-new">Mới</span>}
        {isHot && <span className="status-badge status-hot">🔥 Hot</span>}
        {manga.date && (
          <span className="manga-card-date">{manga.date}</span>
        )}
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
        {manga.lastChapter && (
          <div className="manga-card-chapters">
            📖 {manga.lastChapter}
          </div>
        )}
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

      const cacheKey = chapterInfo.url;
      if (chapterImageCache.has(cacheKey)) {
        setImages(chapterImageCache.get(cacheKey));
        setLoading(false);
        return;
      }

      try {
        const res = await getChapterImages(chapterInfo.url);
        if (!active) return;
        const imgs = res.images || [];
        chapterImageCache.set(cacheKey, imgs);
        setImages(imgs);
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
  const [showFullDescription, setShowFullDescription] = useState(false);

  useEffect(() => {
    if (!manga) return;
    let active = true;

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const cacheKey = manga.url;
    if (mangaDetailCache.has(cacheKey)) {
      setDetail(mangaDetailCache.get(cacheKey));
      setLoading(false);
      return;
    }

    const loadMangaDetail = async () => {
      setLoading(true);
      setError(null);
      setDetail(null);

      try {
        const detailData = await getMangaDetails(manga.url);
        if (!active) return;
        setDetail(detailData);
        mangaDetailCache.set(cacheKey, detailData);
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
            <div className="detail-desc">
              {showFullDescription ? detail.description : detail.description.slice(0, 300) + (detail.description.length > 300 ? '...' : '')}
            </div>
            {detail.description.length > 300 && (
              <button
                className="show-more-btn"
                onClick={() => setShowFullDescription(!showFullDescription)}
              >
                {showFullDescription ? 'Ẩn bớt ↑' : 'Xem thêm ↓'}
              </button>
            )}
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
  const initialRoute = parseInitialRoute();
  const [tab, setTab] = useState(initialRoute.tab); // popular | latest | search
  const [page, setPage] = useState(initialRoute.page);
  const [manga, setManga] = useState([]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedManga, setSelectedManga] = useState(
    initialRoute.mangaUrl ? { url: decodeURIComponent(initialRoute.mangaUrl), title: '', thumbnail_url: '' } : null
  );
  const [selectedChapter, setSelectedChapter] = useState(
    initialRoute.chapterUrl ? { url: decodeURIComponent(initialRoute.chapterUrl), name: '', mangaTitle: '', allChapters: [] } : null
  );
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

  const syncHistoryState = () => {
    const state = {
      tab,
      page,
      selectedManga,
      selectedChapter,
      searchQuery,
      activeQuery,
      showFilters,
      filters,
      activeFilters,
      genreStates,
    };
    const url = buildUrl({
      tab,
      page,
      mangaUrl: selectedManga?.url ? encodeURIComponent(selectedManga.url) : undefined,
      chapterUrl: selectedChapter?.url ? encodeURIComponent(selectedChapter.url) : undefined,
    });
    window.history.replaceState(state, '', url);
  };

  const pushHistoryState = (nextState = {}) => {
    const state = {
      tab,
      page,
      selectedManga,
      selectedChapter,
      searchQuery,
      activeQuery,
      showFilters,
      filters,
      activeFilters,
      genreStates,
      ...nextState,
    };
    const url = buildUrl({
      tab: state.tab,
      page: state.page,
      mangaUrl: state.selectedManga?.url ? encodeURIComponent(state.selectedManga.url) : undefined,
      chapterUrl: state.selectedChapter?.url ? encodeURIComponent(state.selectedChapter.url) : undefined,
    });
    window.history.pushState(state, '', url);
  };

  useEffect(() => {
    const onPopState = (event) => {
      const state = event.state;
      if (!state) return;
      setTab(state.tab || 'popular');
      setPage(state.page || 1);
      setSearchQuery(state.searchQuery || '');
      setActiveQuery(state.activeQuery || '');
      setShowFilters(state.showFilters || false);
      setFilters(state.filters || { country: '0', status: '-1', minchapter: '0', sort: '4' });
      setActiveFilters(state.activeFilters || { country: '0', status: '-1', minchapter: '0', sort: '4' });
      setGenreStates(state.genreStates || {});
      setSelectedManga(state.selectedManga || null);
      setSelectedChapter(state.selectedChapter || null);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    syncHistoryState();
  }, [tab, page, selectedManga, selectedChapter, searchQuery, activeQuery, showFilters, filters, activeFilters, genreStates]);

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

    // Check cache first
    const cacheKey = tab.startsWith('genre-') ? `${tab}|${page}` : `${tab}|${page}|${activeQuery}|${JSON.stringify(activeFilters)}|${JSON.stringify(genreStates)}`;
    const cacheType = tab.startsWith('genre-') ? 'genre' : tab;
    if (pageDataCache[cacheType]?.has(cacheKey)) {
      const cached = pageDataCache[cacheType].get(cacheKey);
      setManga(cached.manga);
      setHasNextPage(cached.hasNextPage);
      setLoading(false);
      return;
    }

    try {
      let result;
      if (tab === 'popular') {
        result = await getPopularManga(page);
      } else if (tab === 'latest') {
        result = await getLatestUpdates(page);
      } else if (tab.startsWith('genre-')) {
        const genreId = tab.split('-')[1];
        result = await getMangaByGenre(genreId, page);
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

      // Cache result
      if (pageDataCache[cacheType]) {
        pageDataCache[cacheType].set(cacheKey, result);
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

  const openManga = (mangaObj) => {
    setSelectedManga(mangaObj);
    setSelectedChapter(null);
    pushHistoryState({ selectedManga: mangaObj, selectedChapter: null });
  };

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setPage(1);
    setManga([]);
    setSelectedManga(null);
    setSelectedChapter(null);
    if (newTab !== 'search') setShowFilters(false);
    pushHistoryState({ tab: newTab, page: 1, selectedManga: null, selectedChapter: null });
  };

  const goToHome = () => {
    setTab('popular');
    setPage(1);
    setManga([]);
    setSelectedManga(null);
    setSelectedChapter(null);
    setShowFilters(false);
    pushHistoryState({ tab: 'popular', page: 1, selectedManga: null, selectedChapter: null });
  };

  const handleSearch = (e) => {
    e?.preventDefault();
    setActiveQuery(searchQuery);
    setTab('search');
    setPage(1);
    setManga([]);
    setSelectedManga(null);
    setSelectedChapter(null);
    pushHistoryState({ tab: 'search', page: 1, activeQuery: searchQuery, selectedManga: null, selectedChapter: null });
  };

  const handleFilterApply = () => {
    const newActiveFilters = { ...filters };
    setActiveFilters(newActiveFilters);
    setPage(1);
    setManga([]);
    pushHistoryState({ tab: 'search', page: 1, activeFilters: newActiveFilters, selectedManga: null, selectedChapter: null });
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
    const nextChapter = { ...chapter, mangaTitle: mangaObj?.title || selectedManga?.title || 'Đọc Truyện', allChapters };
    setSelectedChapter(nextChapter);
    pushHistoryState({ selectedChapter: nextChapter, selectedManga: mangaObj ?? selectedManga });
  };

  const tabLabel = {
    popular: '⭐ Truyện Yêu Thích',
    latest: '🔥 Mới Cập Nhật',
    search: '🔍 Tìm Kiếm & Lọc',
  };

  // Dynamic genre tabs
  const getGenreTabLabel = (tab) => {
    if (!tab.startsWith('genre-')) return tabLabel[tab] || '📚 Danh sách truyện';
    const genreId = tab.split('-')[1];
    const genre = GENRES.find(g => g.id === genreId);
    return genre ? `🎭 ${genre.name}` : '🎭 Thể Loại';
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
    const genreTab = `genre-${genre.id}`;
    setTab(genreTab);
    setPage(1);
    setManga([]);
    setSelectedManga(null);
    setSelectedChapter(null);
    pushHistoryState({ tab: genreTab, page: 1, selectedManga: null, selectedChapter: null });
  };

  if (selectedChapter) {
    return (
      <MangaReaderScreen
        chapterInfo={selectedChapter}
        onBack={() => window.history.back()}
        onChapterSelect={(ch) => {
          const nextChapter = { ...selectedChapter, url: ch.url, name: ch.name || ch.title };
          setSelectedChapter(nextChapter);
          pushHistoryState({ selectedChapter: nextChapter });
        }}
      />
    );
  }

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="header">
        <div className="header-inner">
          <div className="logo" onClick={goToHome} style={{cursor: 'pointer'}}>
            <div className="logo-icon">📚</div>
            <span className="logo-text">CloneTruyen</span>
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
                        openManga({ url: m.url, title: m.title, thumbnail_url: m.thumbnail_url });
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
        </div>
      </header>

      {/* MAIN */}
      <main className="main">
        {selectedChapter ? (
          <MangaReaderScreen
            chapterInfo={selectedChapter}
            onBack={() => window.history.back()}
            onChapterSelect={(ch) => {
              const nextChapter = { ...selectedChapter, url: ch.url, name: ch.name || ch.title };
              setSelectedChapter(nextChapter);
              pushHistoryState({ selectedChapter: nextChapter });
            }}
          />
        ) : selectedManga ? (
          <MangaDetailScreen manga={selectedManga} onBack={() => window.history.back()} onChapterPlay={handleChapterPlay} />
        ) : (
          <HomePage onMangaClick={openManga} />
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
