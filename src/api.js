// TruyenQQ API - chuyển đổi từ Kotlin extension Tachiyomi
// Dùng Vite proxy (/proxy/*) để route request qua Node.js -> bypass Cloudflare 403

const BASE_URL = 'https://truyenqqno.com';

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
  return BASE_URL + (src.startsWith('/') ? src : '/' + src);
};

// Wrap URL ảnh qua Vite image proxy để bypass hotlink protection
// Browser sẽ gọi /img-proxy?url=https://... thay vì gọi thẳng vào truyenqqno.com
export const toImgProxy = (url) => {
  if (!url) return '';
  return `/img-proxy?url=${encodeURIComponent(url)}`;
};

// === MANGA FROM ELEMENT (dịch từ mangaFromElement) ===
const mangaFromElement = (li) => {
  const anchor = li.querySelector('.book_info .qtip a');
  const img = li.querySelector('.book_avatar img');
  if (!anchor) return null;
  const href = anchor.getAttribute('href') || '';
  const url = href.startsWith('http') ? href : BASE_URL + href;
  const rawSrc = img?.getAttribute('src') || img?.getAttribute('data-src') || '';
  return {
    url,
    title: anchor.textContent.trim(),
    thumbnail_url: resolveImgUrl(rawSrc),
    slug: href,
  };
};

// === PARSE HAS NEXT PAGE ===
const parseHasNextPage = (doc) =>
  !!doc.querySelector('.page_redirect > a:nth-last-child(2) > p:not(.active)');

// === POPULAR MANGA ===
export const getPopularManga = async (page = 1) => {
  const html = await fetchPage(`${BASE_URL}/truyen-yeu-thich/trang-${page}.html`);
  const doc = parseHTML(html);
  const manga = [...doc.querySelectorAll('ul.grid > li')].map(mangaFromElement).filter(Boolean);
  return { manga, hasNextPage: parseHasNextPage(doc) };
};

// === LATEST UPDATES ===
export const getLatestUpdates = async (page = 1) => {
  const html = await fetchPage(`${BASE_URL}/truyen-moi-cap-nhat/trang-${page}.html`);
  const doc = parseHTML(html);
  const manga = [...doc.querySelectorAll('ul.grid > li')].map(mangaFromElement).filter(Boolean);
  return { manga, hasNextPage: parseHasNextPage(doc) };
};

// === SEARCH MANGA (Full page) ===
export const searchManga = async (page = 1, query = '', filters = {}) => {
  let url;
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
  const html = await fetchPage(url);
  const doc = parseHTML(html);
  const manga = [...doc.querySelectorAll('ul.grid > li')].map(mangaFromElement).filter(Boolean);
  return { manga, hasNextPage: parseHasNextPage(doc) };
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
    const href = a.getAttribute('href') || '';
    const rawSrc = img?.getAttribute('src') || img?.getAttribute('data-src') || img?.getAttribute('data-original') || '';
    return {
      url: href.startsWith('http') ? href : BASE_URL + href,
      title: titleEl.textContent.trim(),
      thumbnail_url: resolveImgUrl(rawSrc),
    };
  }).filter(Boolean);
};


// === MANGA DETAILS ===
export const getMangaDetails = async (url) => {
  const html = await fetchPage(url);
  const doc = parseHTML(html);
  const info = doc.querySelector('.list-info');

  const title = doc.querySelector('h1')?.textContent.trim() || '';
  const author = [...(info?.querySelectorAll('.org') || [])].map(e => e.textContent.trim()).join(', ');
  const genres = [...doc.querySelectorAll('.list01 li')].map(e => e.textContent.trim());

  const descBlocks = [...doc.querySelectorAll('.story-detail-info')];
  let description = '';
  descBlocks.forEach(container => {
    const ps = container.querySelectorAll('p');
    if (ps.length > 0) description += [...ps].map(p => p.textContent.trim()).join('\n\n');
    else description += container.textContent.trim();
    description += '\n\n';
  });

  const rawThumb = doc.querySelector('img[itemprop="image"]')?.getAttribute('src') || '';
  const thumbnail_url = resolveImgUrl(rawThumb);
  const statusText = info?.querySelector('.status > p:last-child')?.textContent || '';
  const status = parseStatus(statusText);

  // Chapters
  const chapters = [...doc.querySelectorAll('div.works-chapter-list div.works-chapter-item')].map(el => {
    const a = el.querySelector('a');
    const href = a?.getAttribute('href') || '';
    return {
      url: href.startsWith('http') ? href : BASE_URL + href,
      name: a?.textContent.trim() || '',
      date: el.querySelector('.time-chap')?.textContent.trim() || '',
    };
  });

  return { title, author, genres, description: description.trim(), thumbnail_url, status, chapters, url };
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
  const html = await fetchPage(url);
  const doc = parseHTML(html);
  
  // Thông thường trang dọc TruyenQQ để hình trong .page-chapter img (lazy)
  const images = [...doc.querySelectorAll('.page-chapter img, .story-see-content img')].map(img => {
    // TruyenQQ thường dùng data-src hoặc src
    const src = img.getAttribute('data-src') || img.getAttribute('data-original') || img.getAttribute('src');
    return resolveImgUrl(src);
  }).filter(Boolean);

  // Lấy danh sách chapter để navigate next/prev
  const chapterSelect = doc.querySelector('.select-chapter, select[name="chapter"]');
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
