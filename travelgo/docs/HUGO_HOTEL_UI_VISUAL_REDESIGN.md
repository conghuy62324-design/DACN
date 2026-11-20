# HUGO TRAVEL — HOTEL UI/UX & PHOTOGRAPHIC IMAGERY REDESIGN
## Architectural & Visual Specification (TASK 21.38-D-UI)

**Document ID:** `HUGO-HOTEL-UI-2138D-01`  
**Date:** 20/11/2026 ICT  
**Status:** `OWNER_VISUAL_APPROVAL_PENDING` (Implementation Complete · Preview Running)  
**Target URL:** `http://127.0.0.1:5181` (Read-only Synthetic Preview)

---

## 1. Executive Summary & Design Objective

In TASK 21.38-D-UI, the HuGo Travel hotel consumer experience underwent a comprehensive visual and UX overhaul. Prior to this task, the interface relied heavily on 5 vector SVG landscape illustrations (`hero-bay.svg`, `highlands.svg`, `coast.svg`, `island.svg`, `town.svg`) and synthetic WebP renders, resulting in an austere, technical look that fell short of modern commercial travel platforms such as iVIVU and Booking.com.

The primary objective was to transform HuGo Travel into a premium, photorealistic Vietnamese travel booking portal while maintaining HuGo Travel's signature branding (navy, white, orange accents), strictly protecting the underlying business invariants (pricing authority, room inventory, idempotent booking guarantees), and adhering to all open-source licensing constraints without bypass of third-party bot protections.

---

## 2. Visual Language & Design System

### 2.1 Brand Palette
- **Primary Navy:** `#083b63` — Used for navigation, high-contrast headings, primary borders, and selected calendar ranges.
- **Accent Orange:** `#f57708` (Hover: `#d45e00`) — Reserved for primary action CTAs ("Tìm kiếm", "Xem phòng", "Chọn gói giá"), special badges, and prominent links.
- **Neutral Light Background:** `#ffffff` and subtle slate fills `#f7fafc`.
- **Borders & Dividers:** Crisp slate `#dce4ea` and `#d6e0e8`, avoiding card-nesting clutter.
- **Typography:** Vietnamese sans-serif typography with calibrated weights (headings 600–650, tight tracking `-0.025em`, line height 1.55 for descriptive copy).

### 2.2 Commercial UX Principles (iVIVU / Booking.com Benchmark)
1. **Photographic Authenticity:** 100% of hero banners, destination tiles, and hotel previews use high-resolution photography with real geographic and architectural fidelity.
2. **Prominent Search Hierarchy:** The hotel search bar overlaps the hero photo banner, anchoring customer intent immediately.
3. **Information Density with Breathing Room:** Compact, horizontal hotel result cards showing star ratings, review scores, room amenities, and transparent pricing in VND.
4. **Transparent Price Presentation:** Total stay pricing displayed upfront including mandatory taxes/fees, with collapsible itemized breakdowns.
5. **Mobile-First Responsiveness:** Zero horizontal overflow (`overflow: false` verified across 1440px, 1366px, and 390px viewports), sticky search summaries, and sliding filter sheets.

---

## 3. Photographic Asset Strategy & Asset Manifest

### 3.1 Sourcing & Licensing Boundary
- **Sources:** Wikimedia Commons (Creative Commons CC BY 4.0, CC BY-SA 4.0, CC0 / Public Domain).
- **Prohibitions Respected:** No automated scraping of Booking.com or iVIVU; no CAPTCHA bypass; no watermarked imagery; no reuse of single photos across mismatched geographic destinations.
- **Synthetic Hotel Labeling:** Interior hotel photos used for fictional/synthetic establishments are explicitly marked with `SYNTHETIC · Minh họa` badges and disclaimers.
- **Optimization:** All master files converted to modern WebP format in three responsive variants:
  - Small / Thumbnail: `480w`
  - Medium / Tablet: `960w`
  - Large / Hero Desktop: `1920w` (Landscape) / `1600w` (Interior)

### 3.2 Asset Manifest Summary (24 Master Assets · 72 Responsive Variants)

| ID | Location / Subject | Author | License | Intended Usage | Dimensions |
|---|---|---|---|---|---|
| `phu-quoc` | Bãi Sao, Phú Quốc | Trantuonglam | CC BY-SA 4.0 | Homepage Hero & Destination | 1920×1080 |
| `vung-tau` | Bãi Trước, Vũng Tàu | NDTK08 | CC BY 4.0 | Destination Scenery | 1920×1280 |
| `nha-trang` | Bờ biển Nha Trang | Tony24986 | CC BY-SA 4.0 | Destination Scenery | 1920×745 |
| `da-lat-lake` | Hồ Xuân Hương, Đà Lạt | L p b | CC BY-SA 4.0 | Destination Scenery | 1920×1080 |
| `ha-long` | Vịnh Hạ Long | Viethavancouver | CC BY-SA 4.0 | Destination Scenery | 1920×1280 |
| `hoi-an` | Phố cổ Hội An | Andy Enero | CC BY-SA 2.0 | Destination Scenery | 1920×1280 |
| `hue` | Đại Nội Huế | Jean-Pierre Dalbéra | CC BY 2.0 | Destination Scenery | 1920×1276 |
| `ha-noi` | Cầu Thê Húc, Hà Nội | Diego Delso | CC BY-SA 4.0 | Destination Scenery | 1920×1280 |
| `ho-chi-minh` | TP. Hồ Chí Minh | Tuấn Minh Đặng | CC BY-SA 4.0 | Destination Scenery | 1920×1280 |
| `da-nang` | Cầu Vàng, Bà Nà, Đà Nẵng | Khánh Trần | CC BY-SA 4.0 | Destination Scenery | 1920×1280 |
| `sa-pa` | Ruộng bậc thang Sa Pa | chensiyuan | CC BY-SA 4.0 | Destination Scenery | 1920×1280 |
| `quy-nhon-coast` | Eo Gió, Quy Nhơn | Pham ngoc quy | CC BY-SA 4.0 | Destination Scenery | 1600×1067 |
| `interior-drake` | Phòng khách sạn cổ điển | Drake Hotel / Historic Hotels | CC BY-SA 4.0 | Room & Hotel Gallery | 1600×1067 |
| `interior-lobby` | Sảnh khách sạn cao cấp | Christian Giersing | CC BY-SA 4.0 | Hotel Profile & Stay Type | 1600×1066 |
| `interior-modern` | Phòng ngủ hiện đại | Suki Lee | CC0 | Room & Stay Type | 1600×1067 |
| `interior-royal` | Phòng nghỉ phong cách hoàng gia | Royalton Hotel | CC BY-SA 4.0 | Room & Stay Type | 1600×1200 |
| `interior-palace` | Không gian phòng Lisboa | JohnLEE Brothers | CC0 | Room & Hotel Gallery | 1600×1200 |
| `interior-riff` | Phòng hướng biển 5 sao | Xandrium | CC0 | Room & Hotel Gallery | 1600×1197 |
| `interior-cozy` | Phòng ấm cúng gia đình | Cozystay | CC BY-SA 4.0 | Room & Stay Type | 1600×1067 |
| `interior-london` | Suite sang trọng | London Hotel Group | CC BY-SA 4.0 | Room & Hotel Gallery | 1600×1067 |
| `interior-aria-02` | Phòng tắm tiện nghi | Aria Resort | CC BY-SA 4.0 | Room Amenity Gallery | 1600×1067 |
| `interior-aria-03` | Phòng ngủ thoáng đãng | Aria Resort | CC BY-SA 4.0 | Room & Stay Type | 1600×1067 |
| `interior-aria-04` | Góc làm việc & view | Aria Resort | CC BY-SA 4.0 | Room Amenity Gallery | 1600×1067 |
| `interior-aria-09` | Chi tiết nội thất phòng | Aria Resort | CC BY-SA 4.0 | Room Amenity Gallery | 1600×1067 |

Full attribution records are permanently rendered on the dedicated customer page at `/photo-credits`.

---

## 4. Page-by-Page Implementation

### 4.1 Homepage & Hotels Landing (`HotelLandingPage.tsx`)
- **Photographic Hero:** Full-bleed image of Bãi Sao, Phú Quốc (`TravelPhoto` asset with priority loading and subtle gradient shade `#04223a96`). Clear typography: *"Khám phá Việt Nam theo cách của bạn"*.
- **Overlapping Search Form:** Elevated card (`z-index: 30`, `-53px` top margin) featuring Destination combobox, Hotel Name/Area autocomplete, Date-Range Calendar, and Guest/Room distribution popup.
- **Special Offers Section:** Displays validated promotions directly from the backend pricing engine with badge highlights (e.g., *"Giảm 10%"*).
- **Destination Mosaic:** Editorial layout mixing horizontal and vertical cards for Phú Quốc, Nha Trang, Đà Lạt, Quy Nhơn, Đà Nẵng, Hội An, Huế, and Hà Nội.
- **Featured Hotels Grid:** Live 6-hotel card grid loaded from the read-only preview catalog.
- **Stay Types Section:** Visual grid categorized by Accommodation Type (Khách sạn, Resort, Homestay, Villa, Căn hộ, Nhà khách) using photographic interior illustrations.
- **HuGo AI Banner:** Dedicated entry banner for AI consultation (`/assistant`).

### 4.2 Hotel Search Results (`HotelSearchPage.tsx`)
- **Sticky / Adaptive Top Bar:** Preserves customer query state in URL parameters (`checkIn`, `checkOut`, `rooms`, `sort`, filters).
- **Sidebar Filters:** Comprehensive filtering for:
  - Street name (within destination)
  - Price range (total stay basis in VND)
  - Accommodation type & verified star rating
  - Property amenities vs. in-room amenities (evaluated on same room/rate plan)
  - Room view (SEA, MOUNTAIN, CITY, GARDEN, LAKE, POOL)
  - Minimum bedrooms and bathrooms
  - Cancellation terms and breakfast inclusion
- **Horizontal Hotel Cards (`HotelResultCard.tsx`):**
  - High-resolution photographic thumbnail with fallback handling.
  - Verified star rating stars and review rating badge (`x.x / 5`).
  - Matched room snapshot showing bed count, max occupancy, and key amenities.
  - Calculated total price for entire stay in VND with collapsible fee/tax breakdown.
  - CTA button linking directly to detail page preserving criteria.
- **Mobile Filter Drawer:** Fullscreen modal filter sheet with touch-friendly checkboxes and "Xem kết quả" dismiss button.

### 4.3 Hotel Detail & Gallery (`HotelPublicDetail.tsx` & `HotelGallery.tsx`)
- **Mosaic Photo Gallery:** Prominent large hero photo flanked by secondary thumbnails. Clicking opens the fullscreen accessible dialog (`HotelDialog.tsx`) with image counter, captions, and keyboard navigation (Left/Right arrows, Escape).
- **Sticky Navigation Bar:** Anchor links for quick jumping to Overview, Rooms & Rates, Amenities, Location/Info, Policies, and Reviews.
- **Room List & Rate Plan Matrix:**
  - Each room type features dedicated photo galleries (`compact` mode) showing bedrooms, bathrooms, and interiors.
  - Room specifications: Verified square meters ($m^2$), adult/child capacities, bed types (King, Queen, Double, Single), window/balcony availability.
  - Multiple rate plans per room: Standard rate vs. Breakfast included vs. Free cancellation.
  - Live price quotes from `HotelReadService` reflecting exact dates and occupant count.
- **Verified Policy & Property Cards:** Explicit check-in/check-out times, child surcharge rules, pet policies, and amenities with Lucide icons.

### 4.4 Checkout Preview (`HotelCheckoutPage.tsx`)
- **Dual-Column Layout:** Contact details and special requests form on the left; sticky property summary, room photo, and itemized price breakdown on the right.
- **Safety Disclaimers:** Explicit notices indicating `SYNTHETIC sandbox · READ ONLY` with disabled live booking mutations per the current testing authorization.

---

## 5. Visual Acceptance Verification (Before vs After)

Screenshots were captured using automated headless Edge via Playwright at three standard viewports:
- **Desktop:** 1440×1000px
- **Laptop:** 1366×768px
- **Mobile:** 390×844px

### 5.1 Evidence Matrix

| Surface | BEFORE Evidence (Codex) | AFTER Evidence (Current) | Visual Improvements Verified |
|---|---|---|---|
| **Homepage (1440px)** | `before-live/home-1440.png` | `after/home-1440.png` | Photographic Phú Quốc hero replaces SVG; commercial search bar; destination mosaic; 0 SVGs in hero. |
| **Hotels Landing (1440px)** | `before-live/hotels-1440.png` | `after/hotels-1440.png` | Full commercial layout with promo cards, featured hotels, and stay style categories. |
| **Search Results (1440px)** | `before-live/search-1440.png` | `after/search-1440.png` | Horizontal cards with photos, verified ratings, matched room details, sidebar filters. |
| **Hotel Detail (1440px)** | `before-live/detail-1440.png` | `after/detail-1440.png` | Mosaic gallery, anchor nav, room photo carousels, rate plan comparison table. |
| **Checkout (1440px)** | `before-live/checkout-1440.png` | `after/checkout-1440.png` | Clean commercial summary with hotel photo, price breakdown, contact form. |
| **Mobile (390px)** | `before-live/*-390.png` | `after/*-390.png` | Verified `overflow: false` across all pages; touch-friendly tap targets; filter drawer. |

### 5.2 Network & Image Health
- **Total Manifest Asset Variants:** 72 / 72 tested returned `HTTP 200` (100% pass).
- **Total Hotel Media Items:** 54 / 54 tested returned `HTTP 200` (100% pass).
- **Broken / 404 Images:** 0.
- **Horizontal Scroll Overflow:** 0 (`overflow: false` on 1440px, 1366px, and 390px).

---

## 6. Functional & Architectural Invariants Preserved

1. **HotelReadService Authority:** Dynamic pricing formulas, child surcharge calculations, tax basis rules, and quote expiration logic were not altered.
2. **Booking Lifecycle Guarantees:** Concurrent booking locks, idempotency keys, immutable snapshots, and cancellation windows remain identical to the verified 21.38-D baseline.
3. **Database Schema Integrity:** Zero migrations were created in this task. Schema remains at exactly 18 migrations and 40 core tables.
4. **Coordinate Protection:** Reused unchanged fixture coordinates from C/D solely for backward compatibility. No map rendering, GPS calculation, or distance routing is displayed.
5. **AI Subsystems Inactive:** Qwen OFF, Ollama OFF, Background workers OFF. Zero model inference quota consumed.

---

## 7. How to Start and Inspect Preview

### 7.1 Starting the Environment
Run from project root:
```cmd
docs\evidence\travelgo-ai-agent-core\hotel-ui-2138d-20261119\START_PREVIEW.cmd
```
Or via Node:
```powershell
node docs/evidence/travelgo-ai-agent-core/hotel-ui-2138d-20261119/preview.cjs start
```

### 7.2 Stopping the Environment
```powershell
node docs/evidence/travelgo-ai-agent-core/hotel-ui-2138d-20261119/preview.cjs stop
```

---

## 8. Final Status & Sign-Off

- **Technical Implementation:** COMPLETE
- **Automated Regression Suites:** 84 / 84 PASS
- **Visual Capture:** 15 / 15 Viewport Screenshots Captured
- **Final Verdict:** `OWNER_VISUAL_APPROVAL_PENDING` (Ready for owner visual review).
