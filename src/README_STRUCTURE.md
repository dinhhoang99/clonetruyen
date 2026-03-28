# 📦 Project Structure Guide

## Thư mục mới được tổ chức

```
src/
├── api/                          # API & Data Layer
│   ├── manga.js                  # Tất cả function liên quan đến manga
│   ├── sourceConfig.js           # Cấu hình source (TruyenQQ, ZetTruyen, etc.)
│   └── index.js                  # Export tất cả API functions
│
├── pages/                        # Các trang chính (tương ứng route)
│   ├── HomePage/
│   │   └── HomePage.jsx          # Trang chủ (Popular + Latest tabs)
│   ├── MangaDetailPage/
│   │   └── MangaDetailPage.jsx   # Chi tiết truyện (Title, Author, Genres, Chapters)
│   └── ReaderPage/
│       └── ReaderPage.jsx        # Đọc truyện (display chapter images)
│
├── components/                   # Các component tái sử dụng
│   ├── MangaCard/
│   │   ├── MangaCard.jsx         # Component hiển thị manga (image, title, chapter)
│   │   └── MangaCard.module.css  # Style cho MangaCard
│   └── SourceSelector/
│       ├── SourceSelector.jsx    # Dropdown chọn nguồn truyện
│       └── SourceSelector.module.css
│
├── styles/                       # Global styles
│   ├── App.css                   # Main app styles
│   ├── index.css                 # Global resets
│   └── variables.css             # Colors, fonts, spacing (tùy chọn)
│
├── App.jsx                       # Main app component (routing)
├── main.jsx                      # Entry point
├── App.css                       # (sẽ move sang styles/)
└── assets/                       # Images, icons, etc.
```

## Các file cần cập nhật import paths

### Từ:
```javascript
import { getPopularManga } from './api'
import { SOURCES, getSourceConfig } from './sourceConfig'
```

### Sang:
```javascript
import { getPopularManga, getSourceConfig } from './api'
import { SOURCES } from './api/sourceConfig'
```

## Lợi ích của cấu trúc mới

✅ **Dễ tìm file** - Mỗi trang có folder riêng  
✅ **Dễ bảo trì** - Tách API logic ra khỏi Component  
✅ **Scalable** - Thêm trang/component mới dễ dàng  
✅ **Team-friendly** - Mỗi người có thể làm việc trên feature khác nhau  
✅ **Code organization** - Clear separation of concerns

## Các bước thực hiện

1. ✅ Đã tạo folder structure
2. ⏳ Copy `api.js` → `api/manga.js`
3. ⏳ Copy `sourceConfig.js` → `api/sourceConfig.js`
4. ⏳ Tạo `api/index.js` để export tất cả
5. ⏳ Extract HomePage logicvào `pages/HomePage/HomePage.jsx`
6. ⏳ Extract MangaDetail logic → `pages/MangaDetailPage/HomePage.jsx`
7. ⏳ Extract Reader logic → `pages/ReaderPage/HomePage.jsx`
8. ⏳ Tạo `components/MangaCard/MangaCard.jsx`
9. ⏳ Tạo `components/SourceSelector/SourceSelector.jsx`
10. ⏳ Update `App.jsx` với import paths mới
11. ⏳ Move styles sang `styles/`
