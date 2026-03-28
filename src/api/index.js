// API index - Re-export all functions from manga.js for cleaner imports
export {
  setCurrentSource,
  getCurrentSourceConfig,
  getAvailableSources,
  toImgProxy,
  getPopularManga,
  getLatestUpdates,
  searchManga,
  getMangaByGenre,
  getSearchSuggestions,
  getMangaDetails,
  getChapterImages,
  COUNTRIES,
  STATUSES,
  CHAPTER_COUNTS,
  SORT_OPTIONS,
  GENRES,
} from './manga';

export { SOURCES, getSourceConfig, getSourcesList } from './sourceConfig';
