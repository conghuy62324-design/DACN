# WEB-1 checkpoint — Giao diện thương mại v1 (21/11/2026)

**Trạng thái:** `OWNER_VISUAL_APPROVAL_PENDING` — chưa commit, chưa push (máy này chặn push: `origin` push URL = `NO_PUSH_LOCAL_ONLY`).
**Branch local:** `feature/web-ui-admin-partner` (gốc `e76d187`).
**Thiết kế:** `travelgo/docs/HUGO_WEB_DESIGN_SPEC.md` (tham khảo Booking.com, Traveloka, iVIVU; quyết định ở mục 8.1).

## Đã làm
- Gói A: design tokens `hg-tokens.css`, font Be Vietnam Pro, header sticky + drawer mobile, footer 4 cột, trang chủ mới (hero + ô tìm có tab dịch vụ, mosaic 8 điểm đến có fallback, ưu đãi, carousel nơi lưu trú, loại lưu trú, dịch vụ khác, banner AI).
- Gói B: trang kết quả (sidebar lọc 272px, card ngang/dọc, chip lọc, phân trang số, drawer lọc mobile), trang chi tiết (gallery mosaic + lightbox, anchor tabs, bảng hạng phòng, tiện nghi, quy định, đánh giá), checkout 3 bước 2 cột. Logic gọi API, giá server, idempotency giữ nguyên.
- Điều phối: thông báo lỗi tiếng Anh ở trang kết quả đổi sang tiếng Việt.

## Kiểm tra
- `npx tsc --noEmit` PASS; `npm run build` frontend PASS; backend build PASS.
- 257 file vùng AI khớp hash baseline (`protected-baseline.sha256`).
- Trình duyệt thật (không backend): 1440/1366/1280/1024/768/390/360 không cuộn ngang, chữ ≥12px. Ảnh: `docs/evidence/web-design-v1/`.
- **NOT RUN:** mọi trạng thái có dữ liệu thật, đăng nhập, checkout end-to-end — máy chưa có PostgreSQL/PostGIS (chờ cài Docker Desktop).

## Còn tồn
1. Ô "Điểm đến" hiện chữ `all` khi API lỗi (`LocationCombobox`, dùng chung Explore/Tours — chưa sửa; kiểm lại khi có backend).
2. Lớp mờ bottom sheet chọn khách (mobile) không phủ header.
3. CSS cũ `hotels.css`/`hotelStay.css`/`hotelPremium.css`, các file `components/home/*` cũ và CSS bù `pt-*` trong `hg-shell.css` chờ bước dọn C1.
4. e2e `t-ai-02` (`assistantNav`) tham chiếu nút đã bỏ — thuộc vùng AI, báo chủ dự án.
5. Ảnh hero và ô mosaic đầu cùng là Phú Quốc.

## Đợt 2 (cùng ngày) — các trang còn giao diện cũ
- Gói C: Khám phá, Nhà hàng, Tour, chi tiết Tour, Vé, Cẩm nang (danh sách/chi tiết/viết bài), chi tiết địa điểm (khung, giữ ReviewInsightsPanel + telemetry), 404/403, Chính sách, Nguồn ảnh; `hg-catalog.css`. Bỏ nội dung giả: giá gạch vé, bình luận mẫu, giá trị điền sẵn, nhãn "Bán chạy", ảnh Unsplash. "TravelGo" → "HuGo Travel".
- Gói D: Đăng nhập, Đăng ký, Hồ sơ (giữ nguyên 3 panel AI/review), Đơn đặt chỗ (lọc phía client), Yêu thích, Chuyến đi, Trở thành đối tác; vỏ `components/account/AccountShell`; `hg-account.css`.
- Điều phối: lỗi tiếng Anh ở chi tiết khách sạn → tiếng Việt; `LocationCombobox` hiện "Tất cả điểm đến" thay `all`; e2e `location-search.spec.ts` cập nhật chữ "HuGo Travel".
- Kiểm: tsc + build PASS; 257 file AI khớp hash; 12 trang ở 360px không tràn ngang, không chữ <12px.
- **NOT RUN:** các trang cần đăng nhập và mọi trạng thái có dữ liệu (chưa có DB); e2e chưa chạy.

## Đợt 3 (22/11/2026) — Admin + Partner trên mock API
- Mock API cục bộ NGOÀI repo: `D:\ĐỒ ÁN A\mock-api` (Node built-in, cổng 5099, dữ liệu SYNTHETIC, reset khi khởi động lại). Chỉ để dựng giao diện, **không dùng để nghiệm thu**. API đề xuất: `docs/web-team/PROPOSED_API_CONTRACTS.md` (chờ chủ dự án duyệt; CMS cần migration 19).
- Thiết kế: `docs/HUGO_WEB_ADMIN_PARTNER_SPEC.md` (quyết định điều phối mục 6.1: bỏ ô doanh thu, Partner navy, phần chưa có contract hoãn).
- Gói E: `components/backoffice/*`, `hg-backoffice.css`, `AdminLayout`, 9 trang admin mới + CMS (banner/sections/featured), trang cũ đổi giao diện; trang dùng API đề xuất nằm sau cờ `BO_FEATURES` (dev: `VITE_BO_FEATURES=all`).
- Gói F: `PartnerLayout`, `HotelManagementPage` tách theo URL `:hotelId/:section` + prop `embedded` (state/API vẫn chỉ ở file này), `pages/partner/hotel/*`, onboarding 6 bước, lịch giá & tồn tháng, ảnh, phòng, ưu đãi, đơn đặt, đánh giá; `hg-partner.css`.
- `AppRouter.tsx` (vùng VÀNG — cần AI owner review): thêm route admin/partner; đổi `/admin/hotels` → `AdminHotelModerationPage`.
- Kiểm: tsc + build PASS; 257 file AI khớp hash; điều phối tự xem Admin/Partner với mock ở 1440; partner 10 lượt ở 390/768 không tràn, chữ ≥12px.
- Tồn: e2e `t13b01`, `t13b02*`, `roles.spec` sẽ hỏng (bỏ `prompt/confirm`, nhãn tiếng Việt thay mã trạng thái) — cần sửa test; 3 lỗi giao diện nhỏ (breadcrumb 768, menu "Cơ sở", cột tổng tiền) đã sửa và kiểm lại.

## Bước tiếp
- Chủ dự án duyệt giao diện (bắt buộc theo tài liệu bàn giao trước WEB-2).
- Cài Docker Desktop → dựng DB test SYNTHETIC riêng, migration 1–18 → kiểm lại toàn bộ với dữ liệu.
- WEB-0 gap matrix (Admin/Partner/Customer: trang nào có API thật, trang nào placeholder) — làm được không cần DB.
