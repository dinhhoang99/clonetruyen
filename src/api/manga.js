// Multi-Source Manga API - hỗ trợ các nguồn khác nhau
// Dùng Vite proxy (/proxy/*) để route request qua Node.js -> bypass Cloudflare 403

import { getSourceConfig, getSourcesList } from './sourceConfig';

let BASE_URL = 'https://truyenqqno.com';
let CURRENT_SOURCE_ID = 'truyenqq';
let CURRENT_SOURCE_CONFIG = getSourceConfig('truyenqq');

// Set current source động
export const setCurrentSource = (sourceId) => {
  const sourceConfig = getSourceConfig(sourceId);
  CURRENT_SOURCE_ID = sourceId;
  BASE_URL = sourceConfig.baseUrl;
  CURRENT_SOURCE_CONFIG = sourceConfig;
  console.log(`✓ API: Source changed to: ${sourceId}`);
  console.log(`✓ API: BASE_URL is now: ${BASE_URL}`);
  console.log(`✓ API: CURRENT_SOURCE_ID is now: ${CURRENT_SOURCE_ID}`);
  console.log(`✓ API: Config:`, sourceConfig);
};

// Lấy source config hiện tại
export const getCurrentSourceConfig = () => {
  console.log(`🔍 getCurrentSourceConfig called, returning config for ${CURRENT_SOURCE_ID}`);
  return CURRENT_SOURCE_CONFIG;
};

// Lấy danh sách các nguồn
export const getAvailableSources = () => getSourcesList();

// Trong dev: /proxy/path -> Node.js proxy -> truyenqqno.com/path (không bị CORS)
const fetchPage = async (url) => {
  let proxyUrl = url;

  // Nếu đã là proxy nội bộ thì dùng luôn
  if (!proxyUrl.startsWith('/proxy')) {
    if (proxyUrl.startsWith(BASE_URL)) {
      proxyUrl = proxyUrl.slice(BASE_URL.length);
    }
    if (!proxyUrl.startsWith('/')) proxyUrl = `/${proxyUrl}`;
    proxyUrl = `/proxy${proxyUrl}`;
  }

  const response = await fetch(proxyUrl, {
    headers: {
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'vi-VN,vi;q=0.9',
      'X-Source-URL': BASE_URL,  // Pass current source URL to proxy
    },
  });

  if (!response.ok) throw new Error(`Lỗi HTTP ${response.status} - ${response.statusText}`);
  return response.text();
};

// Parse HTML string thành document
const parseHTML = (html) => {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
};

// Sửa ảnh: thay thế đường dẫn tương đối thành tuyệt đối
const resolveImgUrl = (src) => {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  if (src.startsWith('//')) return 'https:' + src;
  return BASE_URL + (src.startsWith('/') ? src : '/' + src);
};

// Wrap URL ảnh qua Vite image proxy để bypass hotlink protection
// Browser sẽ gọi /img-proxy?url=https://... thay vì gọi thẳng vào truyenqqno.com
export const toImgProxy = (url) => {
  if (!url) return '';
  return `/img-proxy?url=${encodeURIComponent(url)}`;
};

// === MANGA FROM ELEMENT (dynamic dựa trên source config) ===
const mangaFromElement = (li, sourceId = CURRENT_SOURCE_ID) => {
  const sourceConfig = getSourceConfig(sourceId);
  const config = sourceConfig.selectors;
  
  // ZetTruyen: li là wrapper div, chứa both anchors (image + title)
  // Cấu trúc: <div><a>image</a></div> <div>title, chapter</div>
  let element = li;
  let anchor = null;
  let wrapper = null;
  
  if (sourceId === 'zettruyen') {
    if (li.tagName === 'DIV') {
      wrapper = li;  // li là wrapper div
      // Tìm anchor với image (first anchor with href)
      anchor = li.querySelector('a[href*="/truyen-tranh/"]');
    } else if (li.tagName === 'A') {
      anchor = li;
      wrapper = li.parentElement;  // Parent của anchor là wrapper div
    } else {
      anchor = li.querySelector('a[href*="/truyen-tranh/"]');
      wrapper = li;
    }
  } else {
    // Với các source khác
    anchor = li.querySelector(config.bookInfo) || 
             li.querySelector('a') ||
             li.closest('a');
    wrapper = li;
  }
  
  if (!anchor) return null;
  
  // Image - tìm trong anchor hoặc wrapper
  let img = anchor.querySelector(config.bookImage) || 
            anchor.querySelector('img') ||
            (wrapper && wrapper.querySelector('img'));
  
  const href = anchor.getAttribute('href') || anchor.getAttribute('data-href') || '';
  const url = href.startsWith('http') ? href : BASE_URL + (href.startsWith('/') ? href : '/' + href);
  
  // Lấy image src
  let rawSrc = img?.getAttribute('src') || 
               img?.getAttribute('data-src') || 
               img?.getAttribute('data-original') ||
               img?.getAttribute('lazy-src') || '';
  
  // Lấy title từ wrapper (cho ZetTruyen) hoặc từ anchor
  let title = '';
  if (sourceId === 'zettruyen' && wrapper) {
    // ZetTruyen: h3 nằm trong div.mt-2 hoặc inner anchor
    let titleEl = wrapper.querySelector('h3');
    title = titleEl?.textContent?.trim() || '';
  } else {
    title = anchor?.textContent?.trim() || '';
  }
  
  // Xóa khoảng trắng thừa
  title = title.replace(/\s+/g, ' ').trim();
  
  // Lấy chapter/last update từ wrapper (ZetTruyen)
  let timeAgo = '';
  let lastChapter = '';
  
  if (sourceId === 'zettruyen' && wrapper) {
    // Chapter: tìm link "Chương X"
    const chapEl = wrapper.querySelector('a[href*="/chuong-"]');
    lastChapter = chapEl?.textContent?.trim() || '';
    
    // TimeAgo: tìm span có class text-txt-secondary hoặc text-xs
    const timeEl = wrapper.querySelector('span.text-txt-secondary, span[class*="text-xs"], time');
    timeAgo = timeEl?.textContent?.trim() || '';
  } else {
    // Các source khác
    if (config.timeAgo) {
      const timeEl = wrapper.querySelector(config.timeAgo);
      timeAgo = timeEl?.getAttribute('data-time-ago') || timeEl?.textContent?.trim() || '';
    }
    if (config.lastChapter) {
      const chapEl = wrapper.querySelector(config.lastChapter);
      lastChapter = chapEl?.getAttribute('data-last-chapter') || chapEl?.textContent?.trim() || '';
    }
  }
  
  return {
    url,
    title: title || 'Không có tiêu đề',
    thumbnail_url: resolveImgUrl(rawSrc),
    time_ago: timeAgo,
    last_chapter: lastChapter,
    slug: href,
  };
};

// === PARSE HAS NEXT PAGE ===
const parseHasNextPage = (doc, sourceId = CURRENT_SOURCE_ID) => {
  const sourceConfig = getSourceConfig(sourceId);
  if (sourceConfig.selectors.nextPageButton) {
    return !!doc.querySelector(sourceConfig.selectors.nextPageButton);
  }
  // Fallback mặc định
  return !!doc.querySelector('.page_redirect > a:nth-last-child(2) > p:not(.active)');
};

// === POPULAR MANGA ===
export const getPopularManga = async (page = 1) => {
  try {
    console.log(`📍 getPopularManga called with page=${page}`);
    console.log(`   Current API state: CURRENT_SOURCE_ID=${CURRENT_SOURCE_ID}, BASE_URL=${BASE_URL}`);
    const sourceConfig = getCurrentSourceConfig();
    console.log(`   sourceConfig.popularPath=${sourceConfig.popularPath}`);
    const path = sourceConfig.popularPath.replace('{page}', page.toString());
    const fullUrl = BASE_URL + path;
    console.log(`   Full URL: ${fullUrl}`);
    console.log(`📍 Fetching popular from ${CURRENT_SOURCE_ID}: ${fullUrl}`);
    
    const html = await fetchPage(fullUrl);
    console.log(`   HTML length: ${html.length}`);
    console.log(`   HTML snippet: ${html.substring(0, 500)}...`);
    const doc = parseHTML(html);
    
    const listItemSelector = sourceConfig.selectors.listItem;
    console.log(`🔍 Using listItem selector: "${listItemSelector}"`);
    
    const elements = doc.querySelectorAll(listItemSelector);
    console.log(`   Found ${elements.length} elements`);
    
    if (elements.length === 0) {
      // Fallback: show what's in the page
      const debugAnchors = doc.querySelectorAll('a[href*="/truyen-tranh/"]');
      console.warn(`   ⚠️ No items found! But found ${debugAnchors.length} truyen-tranh anchors`);
      const debugDivs = doc.querySelectorAll('div[class*="hover"]');
      console.warn(`   ⚠️ Found ${debugDivs.length} divs with "hover" in class`);
    }
    
    const manga = [...elements]
      .map(el => mangaFromElement(el, CURRENT_SOURCE_ID))
      .filter(Boolean);
    
    console.log(`✅ Found ${manga.length} manga from ${CURRENT_SOURCE_ID}`);
    
    return { manga, hasNextPage: parseHasNextPage(doc, CURRENT_SOURCE_ID) };
  } catch (e) {
    console.error(`❌ Error fetching popular manga:`, e);
    throw e;
  }
};

// === LATEST UPDATES ===
export const getLatestUpdates = async (page = 1) => {
  try {
    const sourceConfig = getCurrentSourceConfig();
    const path = sourceConfig.latestPath.replace('{page}', page.toString());
    const fullUrl = BASE_URL + path;
    console.log(`📍 Fetching latest from ${CURRENT_SOURCE_ID}: ${fullUrl}`);
    
    const html = await fetchPage(fullUrl);
    const doc = parseHTML(html);
    
    const listItemSelector = sourceConfig.selectors.listItem;
    const manga = [...doc.querySelectorAll(listItemSelector)]
      .map(el => mangaFromElement(el, CURRENT_SOURCE_ID))
      .filter(Boolean);
    
    console.log(`✅ Found ${manga.length} latest from ${CURRENT_SOURCE_ID}`);
    
    return { manga, hasNextPage: parseHasNextPage(doc, CURRENT_SOURCE_ID) };
  } catch (e) {
    console.error(`❌ Error fetching latest manga:`, e);
    throw e;
  }
};

// === SEARCH MANGA (Full page) ===
export const searchManga = async (page = 1, query = '', filters = {}) => {
  const sourceConfig = getCurrentSourceConfig();
  let url;
  
  if (CURRENT_SOURCE_ID === 'zettruyen') {
    // ZetTruyen sử dụng API query parameters
    const u = new URL(BASE_URL + sourceConfig.searchPath);
    u.searchParams.set('name', query.trim());
    u.searchParams.set('page', page.toString());
    if (filters.status) u.searchParams.set('status', filters.status);
    if (filters.sort) u.searchParams.set('sort', filters.sort);
    if (filters.genres) u.searchParams.set('genres', filters.genres);
    url = u.toString();
  } else {
    // TruyenQQ, NetTruyen, BlogTruyen
    if (query.trim()) {
      const u = new URL(`${BASE_URL}/tim-kiem/trang-${page}.html`);
      u.searchParams.set('q', query.trim());
      url = u.toString();
    } else {
      const u = new URL(`${BASE_URL}/tim-kiem-nang-cao/trang-${page}.html`);
      if (filters.country) u.searchParams.set('country', filters.country);
      if (filters.status) u.searchParams.set('status', filters.status);
      if (filters.minchapter) u.searchParams.set('minchapter', filters.minchapter);
      if (filters.sort) u.searchParams.set('sort', filters.sort);
      if (filters.category) u.searchParams.set('category', filters.category);
      if (filters.notcategory) u.searchParams.set('notcategory', filters.notcategory);
      url = u.toString();
    }
  }
  
  const html = await fetchPage(url);
  const doc = parseHTML(html);
  
  const listItemSelector = sourceConfig.selectors.listItem;
  const manga = [...doc.querySelectorAll(listItemSelector)]
    .map(el => mangaFromElement(el, CURRENT_SOURCE_ID))
    .filter(Boolean);
  
  return { manga, hasNextPage: parseHasNextPage(doc, CURRENT_SOURCE_ID) };
};

// === GET MANGA BY GENRE ===
export const getMangaByGenre = async (genreId, page = 1) => {
  if (CURRENT_SOURCE_ID === 'zettruyen') {
    return await searchManga(page, '', { genres: genreId });
  }
  return await searchManga(page, '', { category: genreId, sort: '4' }); // sort=4 là theo view
};

// === AUTO SUGGEST SEARCH ===
export const getSearchSuggestions = async (query) => {
  const formData = new URLSearchParams();
  formData.append('search', query); // Tham số đúng theo main.js của trang
  formData.append('type', '0');

  const response = await fetch('/proxy/frontend/search/search', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (!response.ok) throw new Error('Network error');
  const html = await response.text();
  const doc = parseHTML(html);
  const lis = [...doc.querySelectorAll('li')];

  if (
    lis.length === 0 ||
    (lis.length === 1 && lis[0].textContent.toLowerCase().includes('không tìm thấy'))
  ) {
    return [];
  }

  return lis.map(li => {
    const a = li.querySelector('a');
    if (!a) return null;
    
    const img = li.querySelector('img');
    const titleEl = li.querySelector('h3, .name, strong, .title') || a;
    
    // Lấy time_ago và last_chapter từ data attributes
    let timeAgo = li.getAttribute('data-time-ago') || '';
    let lastChapter = li.getAttribute('data-last-chapter') || '';
    
    // Nếu không có, tìm từ element
    if (!timeAgo) {
      const timeEl = li.querySelector('[data-time-ago], .time-ago, time');
      timeAgo = timeEl?.getAttribute('data-time-ago') || timeEl?.textContent.trim() || '';
    }
    if (!lastChapter) {
      const chapEl = li.querySelector('[data-last-chapter], .last-chapter, strong');
      lastChapter = chapEl?.getAttribute('data-last-chapter') || chapEl?.textContent.trim() || '';
    }
    
    const href = a.getAttribute('href') || '';
    const rawSrc = img?.getAttribute('src') || 
                   img?.getAttribute('data-src') || 
                   img?.getAttribute('data-original') ||
                   img?.getAttribute('lazy-src') || '';
    
    return {
      url: href.startsWith('http') ? href : BASE_URL + href,
      title: titleEl.textContent.trim(),
      thumbnail_url: resolveImgUrl(rawSrc),
      time_ago: timeAgo,
      last_chapter: lastChapter,
    };
  }).filter(Boolean);
};


// === MANGA DETAILS ===
export const getMangaDetails = async (url) => {
  const sourceConfig = getCurrentSourceConfig();
  const html = await fetchPage(url);
  const doc = parseHTML(html);

  // Title
  const title = doc.querySelector(sourceConfig.selectors.detailTitle)?.textContent.trim() || '';

  // Author - dành cho ZetTruyen cần xử lý đặc biệt
  let author = '';
  if (CURRENT_SOURCE_ID === 'zettruyen') {
    // ZetTruyen: tìm thẻ chứa "Tác giả" rồi lấy sibling sau
    const authorElements = [...doc.querySelectorAll('*')].filter(el => 
      el.textContent.includes('Tác giả') && el.textContent.length < 50
    );
    if (authorElements.length > 0) {
      const parent = authorElements[0].closest('div') || authorElements[0];
      const nextEl = parent?.nextElementSibling;
      author = nextEl?.textContent.trim() || authorElements[0].nextElementSibling?.textContent.trim() || '';
    }
  } else {
    const info = doc.querySelector('.list-info');
    author = [...(info?.querySelectorAll('.org') || [])].map(e => e.textContent.trim()).join(', ');
  }

  // Genres
  let genres = [];
  if (CURRENT_SOURCE_ID === 'zettruyen') {
    // ZetTruyen: tìm thẻ chứa "Thể loại" rồi lấy links từ sibling
    const genreElements = [...doc.querySelectorAll('*')].filter(el =>
      el.textContent.includes('Thể loại') && el.textContent.length < 50
    );
    if (genreElements.length > 0) {
      const parent = genreElements[0].closest('div') || genreElements[0];
      const nextEl = parent?.nextElementSibling;
      genres = [...(nextEl?.querySelectorAll('a') || [])].map(e => e.textContent.trim());
    }
  } else {
    genres = [...doc.querySelectorAll('.list01 li')].map(e => e.textContent.trim());
  }

  // Status
  let status = 'Không rõ';
  if (CURRENT_SOURCE_ID === 'zettruyen') {
    const statusElements = [...doc.querySelectorAll('*')].filter(el =>
      el.textContent.includes('Trạng thái') && el.textContent.length < 50
    );
    if (statusElements.length > 0) {
      const parent = statusElements[0].closest('div') || statusElements[0];
      const nextEl = parent?.nextElementSibling;
      const statusText = nextEl?.textContent.trim() || '';
      status = parseStatus(statusText);
    }
  } else {
    const info = doc.querySelector('.list-info');
    const statusText = info?.querySelector('.status > p:last-child')?.textContent || '';
    status = parseStatus(statusText);
  }

  // Description
  let description = '';
  if (CURRENT_SOURCE_ID === 'zettruyen') {
    const descEl = doc.querySelector(sourceConfig.selectors.detailDescription);
    description = descEl?.textContent.trim() || '';
  } else {
    const descBlocks = [...doc.querySelectorAll(sourceConfig.selectors.detailDescription)];
    descBlocks.forEach(container => {
      const ps = container.querySelectorAll('p');
      if (ps.length > 0) description += [...ps].map(p => p.textContent.trim()).join('\n\n');
      else description += container.textContent.trim();
      description += '\n\n';
    });
  }

  // Thumbnail - handle lazy-loaded images
  let rawThumb = '';
  
  // Try various image selectors
  const imgSelectors = [
    'img[itemprop="image"]',
    'img.cover, img.thumbnail',
    'img[alt*="' + title.substring(0, 10) + '"]',
    'img:not([title*="avatar"])',
    'img'
  ];
  
  for (const selector of imgSelectors) {
    const img = doc.querySelector(selector);
    if (img) {
      rawThumb = img.getAttribute('src') || 
                 img.getAttribute('data-src') || 
                 img.getAttribute('data-original') ||
                 img.getAttribute('lazy-src') || '';
      if (rawThumb) break;
    }
  }
  
  const thumbnail_url = resolveImgUrl(rawThumb);

  // Chapters - sẽ fetch từ API nếu cần
  let chapters = [];
  if (CURRENT_SOURCE_ID === 'zettruyen' && sourceConfig.features?.api) {
    // ZetTruyen: sử dụng API để lấy chapters
    try {
      // Extract slug từ URL: /truyen-tranh/{slug}
      const urlParts = url.split('/').filter(Boolean);
      const truyenIndex = urlParts.indexOf('truyen-tranh');
      const slug = truyenIndex >= 0 ? urlParts[truyenIndex + 1] : '';
      
      if (slug) {
        chapters = await fetchZetTruyenChapters(slug);
      }
    } catch (e) {
      console.warn('Error fetching ZetTruyen chapters via API:', e);
    }
    
    // Fallback: parse từ HTML nếu API call thất bại
    if (chapters.length === 0) {
      chapters = [...doc.querySelectorAll(sourceConfig.selectors.detailChapters)].map(el => {
        const a = el.querySelector('a');
        const href = a?.getAttribute('href') || '';
        return {
          url: href.startsWith('http') ? href : BASE_URL + href,
          name: a?.textContent.trim() || '',
          date: el.querySelector(sourceConfig.selectors.chapterDate)?.textContent.trim() || '',
        };
      });
    }
  } else {
    chapters = [...doc.querySelectorAll(sourceConfig.selectors.detailChapters)].map(el => {
      const a = el.querySelector('a');
      const href = a?.getAttribute('href') || '';
      return {
        url: href.startsWith('http') ? href : BASE_URL + href,
        name: a?.textContent.trim() || '',
        date: el.querySelector(sourceConfig.selectors.chapterDate)?.textContent.trim() || '',
      };
    });
  }

  return { title, author, genres, description: description.trim(), thumbnail_url, status, chapters, url };
};

// === Fetch ZetTruyen Chapters via API ===
const fetchZetTruyenChapters = async (slug) => {
  try {
    const apiUrl = `${BASE_URL}/api/comics/${slug}/chapters?page=1&per_page=100&order=desc`;
    const response = await fetch(`/proxy${apiUrl.replace(BASE_URL, '')}`);
    if (!response.ok) return [];
    
    const result = await response.json();
    const data = result.data;
    if (!data || !data.chapters) return [];

    return data.chapters.map(chapter => ({
      url: `/truyen-tranh/${slug}/${chapter.chapterSlug.replace('chapter-', 'chuong-')}`,
      name: chapter.chapterName,
      date: chapter.updatedAt || '',
    }));
  } catch (e) {
    console.error('Error fetching chapters from ZetTruyen API:', e);
    return [];
  }
};

const parseStatus = (status) => {
  if (!status) return 'Không rõ';
  const s = status.toLowerCase();
  if (['đang tiến hành', 'đang cập nhật', 'đang ra'].some(x => s.includes(x.toLowerCase()))) return 'Đang tiến hành';
  if (['hoàn thành', 'đã hoàn thành'].some(x => s.includes(x.toLowerCase()))) return 'Hoàn thành';
  if (['tạm ngưng', 'tạm hoãn'].some(x => s.includes(x.toLowerCase()))) return 'Tạm ngưng';
  return 'Không rõ';
};

// === CHAPTER IMAGES ===
export const getChapterImages = async (url) => {
  const sourceConfig = getCurrentSourceConfig();
  const html = await fetchPage(url);
  const doc = parseHTML(html);
  
  // Sử dụng selector từ config
  const imageSelector = sourceConfig.selectors.chapterImages;
  const images = [...doc.querySelectorAll(imageSelector)].map(img => {
    // Thử các data attributes khác nhau
    const src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('src');
    return resolveImgUrl(src);
  }).filter(Boolean);

  // Lấy danh sách chapter để navigate next/prev
  const chapterSelect = doc.querySelector(sourceConfig.selectors.chapterSelect);
  const chapters = chapterSelect ? [...chapterSelect.querySelectorAll('option')].map(opt => ({
    name: opt.textContent.trim(),
    url: opt.value.startsWith('http') ? opt.value : BASE_URL + opt.value,
    selected: opt.selected || opt.hasAttribute('selected')
  })) : [];

  return { images, chapters };
};

// === FILTER DATA (dịch nguyên từ Kotlin) ===
export const COUNTRIES = [
  { label: 'Tất cả', value: '0' },
  { label: 'Trung Quốc', value: '1' },
  { label: 'Việt Nam', value: '2' },
  { label: 'Hàn Quốc', value: '3' },
  { label: 'Nhật Bản', value: '4' },
  { label: 'Mỹ', value: '5' },
];

export const STATUSES = [
  { label: 'Tất cả', value: '-1' },
  { label: 'Đang tiến hành', value: '0' },
  { label: 'Hoàn thành', value: '2' },
];

export const CHAPTER_COUNTS = [
  { label: 'Tất cả', value: '0' },
  { label: '>= 100 chương', value: '100' },
  { label: '>= 200 chương', value: '200' },
  { label: '>= 300 chương', value: '300' },
  { label: '>= 400 chương', value: '400' },
  { label: '>= 500 chương', value: '500' },
];

export const SORT_OPTIONS = [
  { label: 'Lượt xem (↓)', value: '4' },
  { label: 'Lượt xem (↑)', value: '5' },
  { label: 'Ngày cập nhật (↓)', value: '2' },
  { label: 'Ngày cập nhật (↑)', value: '3' },
  { label: 'Ngày đăng (↓)', value: '0' },
  { label: 'Ngày đăng (↑)', value: '1' },
];

export const GENRES = [
  { name: 'Action', id: '26' },
  { name: 'Adventure', id: '27' },
  { name: 'Anime', id: '62' },
  { name: 'Chuyển Sinh', id: '91' },
  { name: 'Cổ Đại', id: '90' },
  { name: 'Comedy', id: '28' },
  { name: 'Comic', id: '60' },
  { name: 'Demons', id: '99' },
  { name: 'Detective', id: '100' },
  { name: 'Doujinshi', id: '96' },
  { name: 'Drama', id: '29' },
  { name: 'Fantasy', id: '30' },
  { name: 'Gender Bender', id: '45' },
  { name: 'Harem', id: '47' },
  { name: 'Historical', id: '51' },
  { name: 'Horror', id: '44' },
  { name: 'Huyền Huyễn', id: '468' },
  { name: 'Isekai', id: '85' },
  { name: 'Josei', id: '54' },
  { name: 'Mafia', id: '69' },
  { name: 'Magic', id: '58' },
  { name: 'Manhua', id: '35' },
  { name: 'Manhwa', id: '49' },
  { name: 'Martial Arts', id: '41' },
  { name: 'Military', id: '101' },
  { name: 'Mystery', id: '39' },
  { name: 'Ngôn Tình', id: '87' },
  { name: 'One shot', id: '95' },
  { name: 'Psychological', id: '40' },
  { name: 'Romance', id: '36' },
  { name: 'School Life', id: '37' },
  { name: 'Sci-fi', id: '43' },
  { name: 'Seinen', id: '42' },
  { name: 'Shoujo', id: '38' },
  { name: 'Shoujo Ai', id: '98' },
  { name: 'Shounen', id: '31' },
  { name: 'Shounen Ai', id: '86' },
  { name: 'Slice of life', id: '46' },
  { name: 'Sports', id: '57' },
  { name: 'Supernatural', id: '32' },
  { name: 'Tragedy', id: '52' },
  { name: 'Trọng Sinh', id: '82' },
  { name: 'Truyện Màu', id: '92' },
  { name: 'Webtoon', id: '55' },
  { name: 'Xuyên Không', id: '88' },
];
