# HUGO TRAVEL — BÁO CÁO BÀN GIAO CỦA THÀNH VIÊN WEB

- **Ngày lập:** 23/11/2026 (Asia/Ho_Chi_Minh)
- **Người làm:** thành viên WEB (không ghi đè `TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md`)
- **Căn cứ:** `docs/HUGO_TRAVEL_BAN_GIAO_WEB.md`
- **Branch:** `feature/web-ui-admin-partner`, gốc bàn giao `e76d187`, HEAD `62815c1` (8 commit giao diện + 1 commit tài liệu bàn giao; đã push lên `origin`, không đụng `main`)
- **Trạng thái:** `OWNER_VISUAL_APPROVAL_PENDING`. Giao diện xong trên **mock API cục bộ**; chưa có mục nghiệm thu nào chạy thật qua trình duyệt → API → PostgreSQL.

> Không tuyên bố production ready. Mọi dữ liệu dùng khi làm giao diện là SYNTHETIC trong bộ nhớ, không chạm DB cũ hay tài khoản Owner.

---

## 1. Tóm tắt một đoạn

Đã làm lại giao diện cho cả 4 phân hệ (website công khai, Admin, Khách hàng, Partner) theo phong cách tham khảo Booking.com, Traveloka, iVIVU, với bộ design token chung. Các trang đã có giữ nguyên route, cách gọi API, cách tính giá, luồng đặt phòng và mọi phần AI; chỉ thay phần trình bày. Các trang trước đây chỉ là placeholder ("đang phát triển") được làm mới. Chỗ nào backend chưa có API thì trang hiện "Chức năng chờ API", không đặt dữ liệu mẫu phía sau; đề xuất API nằm ở `docs/web-team/PROPOSED_API_CONTRACTS.md` chờ chủ dự án duyệt. Không sửa backend, database hay vùng AI (257 file AI khớp hash trước/sau).

Máy thành viên không cài được Docker nên chưa có PostgreSQL/PostGIS. Để xem giao diện có dữ liệu, đã dựng một mock API ngoài repo (`D:\ĐỒ ÁN A\mock-api`, Node built-in, cổng 5099). Mock **không** dùng để nghiệm thu.

---

## 2. Commit (đã push lên nhánh feature)

| Commit | Nội dung | Vùng |
|---|---|---|
| `c233cde` | Design tokens, font Be Vietnam Pro, header/footer, trang chủ mới | Xanh + global CSS/header/footer (Vàng) |
| `05a478b` | Khách sạn: kết quả, chi tiết, checkout | Xanh |
| `44369d3` | Khám phá, nhà hàng, tour, vé, cẩm nang, 404/403, chính sách, nguồn ảnh | Xanh |
| `6588356` | Tài khoản khách hàng | Xanh |
| `737500f` | Back-office Admin | Xanh |
| `9aacbb2` | Partner | Xanh |
| `7fc742a` | `AppRouter.tsx`: route Admin/Partner mới; `/admin/hotels` → `AdminHotelModerationPage` | **Vàng — cần AI owner review** |
| `62815c1` | Tài liệu WEB, gap matrix, đề xuất API, hash vùng AI, ảnh evidence | Docs |

Tổng `e76d187..62815c1`: 171 file, +23 561 / −3 152 dòng. Mọi file nằm trong `travelgo/frontend/` hoặc `travelgo/docs/`. Commit chia theo phân hệ; từng commit riêng lẻ chưa chắc build độc lập, cả chuỗi build PASS.

---

## 3. Chức năng đã làm / chưa làm

Ký hiệu: ✅ có UI + có API backend sẵn · 🟡 có UI, API backend thiếu một phần · ⏳ có UI, chờ API mới (đề xuất PAC) · ❌ chưa làm

### 3.1 Phân hệ 01 — Website công khai (WEB-1)
| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Header (Trang chủ, Khách sạn, Nhà hàng, Khám phá, Lịch trình, Trợ lý AI giữ route), drawer mobile, footer 4 cột | ✅ | Không có nút chết |
| Hero + ô tìm có tab dịch vụ, chọn ngày, khách/phòng/tuổi trẻ | ✅ | Hero chưa đọc CMS thật (chờ migration 19) |
| Mosaic điểm đến có fallback ảnh có giấy phép | ✅ | Bấm đi đúng search, giữ criteria |
| Ưu đãi, nơi lưu trú nổi bật, loại lưu trú, dịch vụ khác, banner AI | ✅ | Ưu đãi lấy từ promotion đang hiệu lực, không fake |
| Trang kết quả: sidebar 272px, card ngang/dọc, chip lọc, sort, phân trang số, drawer lọc mobile | ✅ | Logic lọc/URL giữ nguyên |
| Chi tiết: gallery mosaic + lightbox, anchor tabs, bảng hạng phòng, tiện nghi, quy định, đánh giá | ✅ | Không hiển thị khoảng cách suy diễn |
| Checkout 3 bước 2 cột | ✅ | Giá server, idempotency, xác nhận chủ động giữ nguyên |
| Khám phá, Nhà hàng, Tour, chi tiết Tour, Vé, Cẩm nang, chi tiết địa điểm, 404/403, chính sách, nguồn ảnh | ✅ | Giữ `ReviewInsightsPanel` + telemetry nguyên trạng |
| Bỏ nội dung giả | ✅ | Bỏ giá gạch, "Bán chạy", bình luận mẫu, giá điền sẵn; bỏ nhãn DEMO/SYNTHETIC hiển thị (logic chặn đặt cho bản ghi demo giữ nguyên) |
| Chỉ đường Google Maps | ❌ | Theo bàn giao: bản đồ nâng cao deferred |

### 3.2 Phân hệ 02 — Admin (WEB-2)
| Chức năng | Trang | Trạng thái |
|---|---|---|
| Bảng điều khiển (việc cần xử lý, quy mô) | `/admin` | ✅ (bỏ ô doanh thu vì chưa có căn cứ payment) |
| Hồ sơ đối tác: xem, duyệt/từ chối/yêu cầu bổ sung có lý do | `/admin/partner-applications[/:id]` | ✅ |
| Cơ sở kinh doanh | `/admin/businesses[/:id]` | 🟡 thiếu `GET /admin/businesses/:id`, `/:id/bookings` trong `adminRoutes.ts` |
| Kiểm duyệt khách sạn theo revision | `/admin/hotels[/:hotelId/:section]` | ✅ (dùng `HotelManagementPage` embedded) |
| Kiểm duyệt địa điểm/tour/bài viết | `/admin/places`, `/tours`, `/blogs` | ✅ |
| Booking toàn hệ thống | `/admin/bookings[/:code]` | 🟡 chi tiết đang dùng `GET /bookings/:code`; đề xuất route admin riêng |
| Đánh giá / báo cáo vi phạm | `/admin/reviews` | ✅ |
| Người dùng & vai trò (active/suspend, role) | `/admin/users[/:id]` | ⏳ PAC §1 |
| CMS: banner (draft/publish/lịch/khôi phục, preview desktop/mobile), sections, nổi bật | `/admin/cms…` | ⏳ PAC §2, cần migration 19 |
| Ưu đãi (xem/lọc/đình chỉ) | `/admin/promotions` | ⏳ PAC §4.2 |
| Cài đặt website không nhạy cảm | `/admin/settings` | ⏳ PAC §3 |
| Menu AI (TravelWeb, Language lexicon, Knowledge review) | giữ nguyên | Không sửa |

Trang ⏳ nằm sau cờ `BO_FEATURES` (`components/backoffice/features.ts`). Mặc định TẮT → hiện `ApiPendingState`. Chỉ bật khi dựng giao diện với mock: `VITE_BO_FEATURES=all`.

### 3.3 Phân hệ 03 — Khách hàng (WEB-3)
| Chức năng | Trạng thái | Ghi chú |
|---|---|---|
| Đăng nhập, đăng ký (validation tiếng Việt, hiện/ẩn mật khẩu) | ✅ | |
| Hồ sơ — xem | ✅ | 3 panel AI/review giữ nguyên |
| Hồ sơ — sửa, đổi mật khẩu | ⏳ | PAC §6 |
| Quên mật khẩu, xác minh email, avatar upload | ❌ | Chưa có backend, chưa đề xuất |
| Đơn đặt chỗ (lọc phía client), hủy hợp lệ | ✅ | |
| Yêu thích, Chuyến đi | ✅ | Logic Planner không sửa |
| Trở thành đối tác | ✅ | |
| Thông báo in-app | ⏳ | PAC §7 |
| Đánh giá của tôi (Phase E) | 🟡 | Panel cũ giữ nguyên; luồng review theo booking completed chưa kiểm (WEB-5) |

### 3.4 Phân hệ 04 — Partner (WEB-4)
| Chức năng | Trang | Trạng thái |
|---|---|---|
| Bảng điều khiển | `/partner` | ✅ |
| Onboarding khách sạn 6 bước (lưu nháp, tiến độ, gửi duyệt) | `/partner/hotels/new`, `/:hotelId/setup` | ✅ (UI gọi API managed hotel sẵn có) |
| Quản lý khách sạn theo mục: tổng quan, hồ sơ, địa chỉ, ảnh, phòng, giá & tồn (lịch tháng), chính sách, trạng thái duyệt | `/partner/hotels/:hotelId/:section` | ✅ |
| Tọa độ thiếu → 422 | | Giữ guard; form giải thích, không dùng 0,0 |
| Ưu đãi | mục `promotions` | ⏳ PAC §4.1 (bảng `hotel_promotions` có sẵn, thiếu route) |
| Đơn đặt + đổi trạng thái theo lifecycle | `/partner/bookings[/:id]` | ✅ |
| Đánh giá của cơ sở + phản hồi | `/partner/reviews` | ⏳ PAC §5 |
| Place/Tour/Vé/Blog của đối tác | `/partner/:resource…` | ✅ |

`HotelManagementPage` vẫn là nơi duy nhất giữ state và gọi API khách sạn; được tách hiển thị theo URL `:hotelId/:section` và có prop `embedded` để Admin dùng lại.

### 3.5 WEB-5, WEB-6
- WEB-5 (review Phase E, tương thích): mới kiểm responsive. Luồng review theo booking completed **NOT RUN** (cần DB).
- WEB-6 (regression cuối, preview, PR): chưa làm.

---

## 4. Files

### 4.1 File mới (chính)
- Style: `src/styles/hg-tokens.css`, `hg-shell.css`, `hg-home.css`, `hg-search-form.css`, `hg-results.css`, `hg-hotel-card.css`, `hg-detail.css`, `hg-dialog.css`, `hg-checkout.css`, `hg-catalog.css`, `hg-account.css`, `hg-backoffice.css`, `hg-partner.css`
- Trang chủ: `src/components/home/{HomeHero, ServiceSearchTabs, DestinationMosaic, OfferStrip, FeaturedStays, StayTypeStrip, ServiceLinks, AiBanner, SectionHeading}.tsx`
- Tài khoản: `src/components/account/{AccountShell, AccountState, AccountField, AuthLayout, accountErrors}`
- Back-office dùng chung: `src/components/backoffice/*` (BackofficeShell, DataTable, ConfirmDialog có ô lý do, DetailDrawer, FilterBar, StatusPill, States, Toast, StickySaveBar, ImageDropzone, features…)
- Admin: `src/pages/admin/{AdminBusinesses, AdminHotelModeration, AdminBookings, AdminReviews, AdminUsers, AdminCms, AdminBannerEditor, AdminPromotions, AdminSettings}Page.tsx`, `src/pages/admin/cms/*`
- Partner: `src/pages/partner/{PartnerHotelOnboardingPage, PartnerReviewsPage}.tsx`, `src/pages/partner/hotel/*`
- Service: `src/services/adminBackofficeService.ts`, `src/services/partnerBackofficeService.ts`

### 4.2 File sửa
Navbar, Footer, MainLayout, AdminLayout, PartnerLayout, `LocationCombobox` (hiện "Tất cả điểm đến" thay `all`), các component hotels/explore, các trang công khai/tài khoản/admin/partner cũ, `src/styles/index.css`, `frontend/index.html`, `router/AppRouter.tsx`, `e2e/location-search.spec.ts` (chữ "TravelGo" → "HuGo Travel").

### 4.3 Không đụng
`backend/**`, `database/**`, `backend/src/agent/**`, Assistant pages, `components/agent/*`, ReviewInsight, Planner, `TelemetryConsent`, TravelWebPage, LanguageLexiconPage, TravelKnowledgeReview, script AI. Kiểm bằng `sha256sum -c docs/web-team/protected-baseline.sha256` (257 file) → PASS.

---

## 5. Routes / APIs / Schema

- **Route mới:** xem bảng 3.2, 3.4. Đổi duy nhất route cũ: `/admin/hotels` từ `HotelManagementPage` sang `AdminHotelModerationPage` (trang này nhúng lại `HotelManagementPage`).
- **API backend:** không thêm, không sửa. Dùng API sẵn có; API mới chỉ ở dạng **đề xuất**: `docs/web-team/PROPOSED_API_CONTRACTS.md`.
- **Schema:** không đổi. CMS (banner, sections, featured, settings) và notification cần **migration 19** — chưa viết SQL, chờ chủ dự án duyệt hướng trong PAC.
- Hợp đồng dữ liệu cho AI: `docs/HUGO_WEB_API_AI_HANDOFF.md`.

---

## 6. Kiểm thử

| Kiểm | Kết quả | Ghi chú |
|---|---|---|
| `npx tsc --noEmit` (frontend) | **PASS** | |
| `npm run build` frontend | **PASS** | |
| Backend build | **PASS** | Đợt 1; backend không đổi sau đó |
| Hash 257 file vùng AI | **PASS** | Kiểm sau mỗi đợt và trước commit |
| Quét bí mật trong diff (key, token, mật khẩu, email cá nhân) | **PASS** | |
| Responsive trang công khai 360/390/768/1024/1280/1366/1440: không cuộn ngang, chữ ≥12px | **PASS (trên mock / không backend)** | Ảnh: `docs/evidence/web-design-v1/` |
| Admin/Partner xem tay ở 1440; Partner 10 lượt ở 390/768 | **PASS (trên mock)** | Chưa lưu ảnh Admin/Partner |
| Quét chữ DEMO/SYNTHETIC/Mock trên 15 trang + 13 API mock | **PASS** | |
| e2e Playwright | **NOT RUN** | Dự kiến hỏng: `t13b01`, `t13b02*`, `roles.spec` (bỏ `prompt/confirm`, nhãn trạng thái tiếng Việt). `t-ai-02` (`assistantNav`) tham chiếu nút đã bỏ — vùng AI, báo chủ dự án |
| Ma trận nghiệm thu H01–H04, U01–U04, P01–P05, R01–R02, S01–S03 | **NOT RUN** | Chưa có PostgreSQL/PostGIS trên máy thành viên |

---

## 7. Blocker

1. **Không có DB test**: máy không cài được Docker. Cần Docker Desktop hoặc PostgreSQL 15 + PostGIS portable, tạo target SYNTHETIC riêng, chạy migration 1–18 theo checksum.
2. **Chờ chủ dự án duyệt**: (a) giao diện (gate WEB-1); (b) `PROPOSED_API_CONTRACTS.md` + hướng migration 19; (c) diff `AppRouter.tsx` và global CSS/header/footer (vùng Vàng).
3. **e2e cần cập nhật** sau khi được duyệt giao diện.

## 8. Đề xuất migration / rollback
Chưa viết SQL. Hướng đề xuất trong PAC §2–3, §7: bảng mới (không sửa bảng cũ) cho banner + revision, sections, featured, settings, notifications; additive, có `version` cho khóa lạc quan, `audit_logs` cho thao tác quản trị. Rollback: `DROP` các bảng mới theo thứ tự phụ thuộc ngược; không động tới migration 1–18. Cần chủ dự án duyệt trước khi viết và chạy persistent.

## 9. Assets, giấy phép, quyền riêng tư
- Ảnh: dùng lại 24 ảnh Wikimedia Commons sẵn có (`src/assets/travel-photo-manifest.json`, trang `/photo-credits`). Không thêm ảnh mới, không hotlink.
- Font: Be Vietnam Pro (Google Fonts, SIL OFL).
- Không thu dữ liệu thẻ, không thêm tracking. Consent AI/telemetry giữ nguyên opt-in như cũ.
- Không commit `.env`, token, mật khẩu, dump DB. Tài khoản mock chỉ ghi trong README của mock-api (ngoài repo).

## 10. Chạy lại trên máy local
```powershell
# 1) Mock API (ngoài repo, chỉ để xem giao diện)
cd "D:\ĐỒ ÁN A\mock-api"; node server.mjs
# 2) Frontend trỏ vào mock
cd "D:\ĐỒ ÁN A\DACN\travelgo\frontend"
$env:VITE_PROXY_TARGET='http://localhost:5099'; $env:VITE_HOTEL_DOMAIN_ENABLED='true'; $env:VITE_BO_FEATURES='all'; npx vite --port 5190
```
URL đã kiểm HTTP 200 trên mock: `/`, `/hotels/search`, `/hotels/:id`, `/explore`, `/restaurants`, `/tours`, `/tickets`, `/blog`, `/admin`, `/partner`, `/bookings`, `/profile`.
Với backend thật: bỏ `VITE_PROXY_TARGET` (mặc định `http://localhost:5000`) và **không** bật `VITE_BO_FEATURES`.

## 11. Bước tiếp theo
1. Chủ dự án duyệt giao diện và diff vùng Vàng.
2. Dựng DB test SYNTHETIC → chạy ma trận nghiệm thu mục 11 của tài liệu bàn giao.
3. Sau khi PAC được duyệt: làm API + migration 19, tắt dần cờ `BO_FEATURES`.
4. Sửa e2e; dọn CSS cũ (`hotels.css`, `hotelStay.css`, `hotelPremium.css`, `components/home/*` cũ).
5. Mở PR vào nhánh tích hợp khi chủ dự án review (nhánh feature đã push; không tự merge `main`).
