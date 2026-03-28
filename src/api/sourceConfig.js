// Source configurations - Tập trung cấu hình cho tất cả nguồn truyện
export const SOURCES = {
  truyenqq: {
    id: 'truyenqq',
    name: 'TruyenQQ',
    baseUrl: 'https://truyenqqno.com',
    popularPath: '/truyen-yeu-thich/trang-{page}.html',
    latestPath: '/truyen-moi-cap-nhat/trang-{page}.html',
    searchPath: '/search',
    selectors: {
      listItem: 'ul.grid > li',
      bookInfo: '.book_info .qtip a',
      bookImage: '.book_avatar img',
      timeAgo: '.time-chap, .time-ago, time',
      lastChapter: '.last-chapter, strong',
      nextPageButton: '.page_redirect > a:nth-last-child(2) > p:not(.active)',
      detailTitle: 'h1',
      detailAuthor: '.list-info .org',
      detailGenres: '.list01 li',
      detailDescription: '.story-detail-info',
      detailChapters: 'div.works-chapter-list div.works-chapter-item',
      chapterName: '.chapter-name, strong',
      chapterDate: '.time-chap',
      chapterImages: '.page-chapter img, .story-see-content img',
      chapterSelect: '.select-chapter, select[name="chapter"]',
    },
    features: {
      supportsSearch: true,
      supportsGenres: true,
      supportsFilters: true,
    }
  },
  nettruyen: {
    id: 'nettruyen',
    name: 'NetTruyen',
    baseUrl: 'https://nettruyen.com',
    popularPath: '/genre/trang-{page}.html',
    latestPath: '/new-comic/trang-{page}.html',
    searchPath: '/search',
    selectors: {
      listItem: 'div.item',
      bookInfo: 'a.name',
      bookImage: 'img',
      timeAgo: '.time-ago, span.time',
      lastChapter: '.chapter-name, strong',
      nextPageButton: 'a.page-next',
      detailTitle: 'h1',
      detailAuthor: '.author',
      detailGenres: '.genres a',
      detailDescription: '.content-desc',
      detailChapters: 'div.chapter-list a',
      chapterName: 'span',
      chapterDate: '.time',
      chapterImages: '.page-reading img',
      chapterSelect: 'select.chapter-select',
    },
    features: {
      supportsSearch: true,
      supportsGenres: true,
      supportsFilters: false,
    }
  },
  blogtruyen: {
    id: 'blogtruyen',
    name: 'BlogTruyen',
    baseUrl: 'https://blogtruyen.com',
    popularPath: '/hot/trang-{page}.html',
    latestPath: '/all/trang-{page}.html',
    searchPath: '/search',
    selectors: {
      listItem: 'div.item',
      bookInfo: 'h3 a',
      bookImage: 'img',
      timeAgo: '.time-ago, span.date',
      lastChapter: '.chapter-name, strong',
      nextPageButton: 'a.next',
      detailTitle: 'h1',
      detailAuthor: '.author',
      detailGenres: '.genre a',
      detailDescription: 'div.detail-content',
      detailChapters: 'div.chapter-list a',
      chapterName: 'span',
      chapterDate: '.time',
      chapterImages: 'img.lazy',
      chapterSelect: 'select.chapter-select',
    },
    features: {
      supportsSearch: true,
      supportsGenres: true,
      supportsFilters: false,
    }
  },
  zettruyen: {
    id: 'zettruyen',
    name: 'ZetTruyen',
    baseUrl: 'https://www.zettruyen.africa',
    popularPath: '/tim-kiem-nang-cao?sort=rating&page={page}',
    latestPath: '/tim-kiem-nang-cao?sort=latest&page={page}',
    searchPath: '/tim-kiem-nang-cao',
    selectors: {
      listItem: 'div[class*="hover:cursor-pointer"]',
      bookInfo: 'a[href*="/truyen-tranh/"]',
      bookImage: 'img',
      timeAgo: 'span.text-txt-secondary, span[class*="text-xs"]',
      lastChapter: 'a[href*="/chuong-"]',
      nextPageButton: 'a.page-next, button[aria-label*="next"]',
      detailTitle: 'h1, h2',
      detailAuthor: 'span.author, div.author',
      detailStatus: '.status',
      detailGenres: 'span.badge, a.tag',
      detailDescription: 'p.description, div.description',
      detailChapters: 'a.chapter-item, .chapter-item',
      chapterName: '.chapter-name, span',
      chapterDate: '.time, span[class*="text-xs"]',
      chapterImages: 'img.mx-auto, img.object-cover',
      chapterSelect: 'select.chapter-select',
    },
    features: {
      supportsSearch: true,
      supportsGenres: true,
      supportsFilters: true,
      api: {
        baseUrl: 'https://www.zettruyen.africa/api',
        chaptersPath: '/comics/{slug}/chapters',
      }
    }
  }
};

// Hàm lấy source config hiện tại
export const getSourceConfig = (sourceId = 'truyenqq') => {
  return SOURCES[sourceId] || SOURCES.truyenqq;
};

// Hàm lấy danh sách các nguồn
export const getSourcesList = () => {
  return Object.values(SOURCES).map(source => ({
    id: source.id,
    name: source.name,
  }));
};
