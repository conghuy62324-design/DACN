# HUGO TRAVEL — THIẾT KẾ GIAO DIỆN KHU QUẢN TRỊ (ADMIN) VÀ KÊNH ĐỐI TÁC (PARTNER)

**Mã tài liệu:** `HUGO-WEB-BACKOFFICE-SPEC-01` · **Ngày:** 21/11/2026 · **Vai trò soạn:** UI/UX designer
**Người dùng tài liệu:** 2 lập trình viên — **Gói E** (khung back-office dùng chung + Admin) và **Gói F** (Partner).
**Kế thừa:** `docs/HUGO_WEB_DESIGN_SPEC.md` mục 3 (token `--hg-*`), 6.2 (quy ước hợp đồng giữa gói), 7 (cách nghiệm thu), 8.1 (chữ navy trên nút cam). Nghiệp vụ: `docs/HUGO_TRAVEL_BAN_GIAO_WEB.md` mục 5, 7, 9. Hiện trạng: `docs/web-team/WEB0_GAP_MATRIX.md`. API đề xuất: `docs/web-team/PROPOSED_API_CONTRACTS.md` (viết tắt **PAC**, đã đối chiếu bản 21/11).
**Trạng thái:** chờ chủ dự án duyệt (mục 6).

> Đây là bản thiết kế, không phải code. Số đo là px CSS ở viewport 1440 trừ khi ghi khác.
> Không đổi logic gọi API, không đổi nghiệp vụ Booking/giá/tồn. Không sửa 3 file AI: `TravelWebPage.tsx`, `LanguageLexiconPage.tsx`, `TravelKnowledgeReview.tsx` (file thứ ba không có route riêng, nó được nhúng trong `TravelWebPage`, nên menu chỉ có 2 mục AI).
> **Không số liệu giả:** chỉ hiện số API trả về. Thiếu số thì hiện "—" kèm "Chưa có dữ liệu", không hiện 0. Không có ô "doanh thu" (API đang cộng `totalAmount` của đơn, không phải tiền đã thu). Admin không sửa tổng tiền/tồn phòng, không đánh dấu đã thanh toán/hoàn tiền/hoàn thành.

**Tham khảo đã xem (21/11):** `join.booking.com` (trang công khai: đăng ký nhiều bước, có thể lưu dở và quay lại; nhận/từ chối đơn; lịch chống overbooking), `traveloka.com/vi-vn/partnership` (quy trình đối tác 4 bước; cổng TERA là SPA nên không đọc được nội dung). `partner.booking.com` trả 403, không thử vượt. Chưa xem iVIVU. Phần còn lại theo pattern back-office phổ biến: sidebar nhóm chức năng, lịch giá/tồn dạng tháng, bảng + drawer chi tiết. Không chép thương hiệu.

---

## Mục lục
1. Khung back-office chung (Gói E sở hữu)
2. Gói E — Admin
3. Gói F — Partner
4. Ánh xạ file, hợp đồng giữa 2 gói, dòng thêm vào `AppRouter.tsx`
5. Checklist nghiệm thu theo viewport
6. Điểm cần điều phối/chủ dự án chốt

---

## 1. Khung back-office chung

### 1.1 Token bổ sung — `src/styles/hg-backoffice.css` (mới, Gói E)
Chỉ dùng `var(--hg-*)`. Tiền tố class `hgbo-`. **Không** viết selector thẻ toàn cục (`body`, `table`, `h1`…) để không làm đổi giao diện 2 trang AI đang chạy trong cùng layout. Import trong `BackofficeShell.tsx`.

```css
/* src/styles/hg-backoffice.css — HuGo back-office v1 (21/11/2026). Gói E sở hữu, Gói F chỉ đọc. */
:root{
  --hgbo-sidebar-w:248px;  --hgbo-rail-w:72px;   --hgbo-nav-drawer-w:280px;
  --hgbo-topbar-h:64px;    --hgbo-pad:24px;      --hgbo-content-max:1360px;
  --hgbo-nav-item-h:40px;  --hgbo-control-h:40px;
  --hgbo-table-head-h:44px; --hgbo-row-h:52px;
  --hgbo-panel-sm:480px;   --hgbo-panel-md:640px; --hgbo-panel-lg:880px;
  --hgbo-nav-bg:var(--hg-primary);
  --hgbo-nav-active:var(--hg-primary-hover);
  --hgbo-nav-hover:rgba(255,255,255,.08);
  --hgbo-nav-text:var(--hg-on-dark-muted);  /* #C9D6E2 trên #083B63 ≈ 7,9:1 */
  --hgbo-nav-marker:var(--hg-cta);          /* vạch 3px mục đang chọn: chỉ trang trí */
}
@media (max-width:767px){
  :root{ --hgbo-pad:16px; --hgbo-topbar-h:56px; --hgbo-control-h:44px; }
}
```

**Quy tắc màu ở back-office:** nút chính dùng **navy** (`--hg-primary`, chữ trắng). Cam `--hg-cta` chỉ dùng cho vạch đánh dấu mục menu đang chọn, không dùng cho nút. Cam là màu CTA của site công khai, giữ để site khách nổi bật. Hành động nguy hiểm dùng `--hg-danger` (chữ trắng, đạt AA).

### 1.2 Khung `BackofficeShell`

```
≥1280                                   1024–1279                 <1024
┌──────────┬───────────────────────────┐ ┌────┬──────────────────┐ ┌───────────────────────┐
│ Logo 64  │ Topbar 64 (sticky)        │ │ ◆  │ Topbar 64        │ │ ☰ Topbar 64/56        │
│──────────│ Breadcrumb · …· Xem website│ │────│                  │ ├───────────────────────┤
│ NHÓM     │───────────────────────────│ │ ▣  │ Nội dung         │ │ Nội dung (pad 24/16)  │
│ ▣ Mục    │ Nội dung nền --hg-bg      │ │ ▣  │                  │ │                       │
│ ▣ Mục ▌  │ pad 24, max 1360          │ │ ▣  │                  │ │ Drawer 280 từ trái,   │
│ 248px    │                           │ │72px│                  │ │ lớp mờ --hg-overlay   │
└──────────┴───────────────────────────┘ └────┴──────────────────┘ └───────────────────────┘
```

| Vùng | Quy cách |
|---|---|
| Sidebar ≥1280 | `position:fixed`, rộng 248, nền `--hgbo-nav-bg`, cuộn riêng (`overflow-y:auto`). Khối logo cao 64, padding 0 20: chữ "HuGo Travel" 16/700 trắng, dòng phụ 12/500 `--hgbo-nav-text` ("Quản trị hệ thống" hoặc "Kênh đối tác"). |
| Nhãn nhóm | 12px/600, `letter-spacing:.04em`, màu `--hgbo-nav-text`, padding 16 20 6. Không viết hoa toàn bộ để giữ dấu tiếng Việt dễ đọc. |
| Mục menu | Cao 40, margin 2 12, padding 0 12, bo 8, icon lucide 18, khoảng cách 12, chữ 14/500 `--hgbo-nav-text`. Hover: nền `--hgbo-nav-hover`, chữ trắng. Đang chọn: nền `--hgbo-nav-active`, chữ trắng 600, vạch trái 3px `--hgbo-nav-marker`, `aria-current="page"`. Badge số (tùy chọn): pill cao 20, chữ 12/700, nền trắng, chữ `--hg-primary`. Chỉ hiện khi API đã trả và giá trị > 0. |
| Sidebar 1024–1279 (rail) | Rộng 72, chỉ hiện icon 20 căn giữa, mục vuông 48×40. Thay nhãn nhóm bằng đường kẻ 1px `rgba(255,255,255,.12)`. Tên mục hiện bằng tooltip bên phải khi hover/focus (nền `--hg-text`, chữ trắng 13, bo 4); đồng thời đặt `aria-label`. Logo chỉ còn chữ "H" 20/800. |
| Sidebar <1024 | Ẩn. Nút ☰ 44×44 ở topbar mở drawer 280 (tối đa 86vw) trượt từ trái, `--hg-z-drawer`, lớp mờ `--hg-overlay`. Có focus trap; Esc, bấm lớp mờ hoặc chọn mục đều đóng drawer và trả focus về nút ☰. Drawer hiện đầy đủ nhãn như bản 248. |
| Topbar | Sticky top 0, cao `--hgbo-topbar-h`, nền `--hg-surface`, viền dưới `--hg-border`, `z-index:var(--hg-z-header)`, padding 0 `--hgbo-pad`. **Trái:** (☰ khi <1024) + breadcrumb 13px `--hg-muted`, phân cách "/", mục cuối `--hg-text` 600, các mục trước là link; <768 chỉ còn tên trang hiện tại 15/600. **Giữa:** `topbarSlot` (Partner đặt `PropertySwitcher`). **Phải:** link "Xem website" (icon `ExternalLink` 16 + chữ 14, mở `/` ở tab mới, `rel="noopener"`; <768 chỉ còn icon 44×44 kèm `aria-label`) · pill vai trò cao 24 ("Quản trị viên" nền `--hg-primary-50`, chữ `--hg-primary`; "Đối tác" cùng kiểu) · menu người dùng (tên 14/600, mở menu 240: họ tên, email, "Đăng xuất"). |
| Nội dung | `margin-left` bằng bề rộng sidebar; nền `--hg-bg` (body back-office đặt qua class `.hgbo-app`, không qua `body`). Padding `--hgbo-pad`, `max-width:var(--hgbo-content-max)`. Không cuộn ngang trang; bảng rộng thì cuộn ngang trong khung bảng. |

**Props:**
```ts
type NavItem = { to: string; label: string; icon: LucideIcon; end?: boolean; badge?: number; hidden?: boolean; disabledReason?: string };
type NavGroup = { label?: string; items: NavItem[] };
interface BackofficeShellProps {
  area: 'admin' | 'partner';
  brandSubtitle: string;           // "Quản trị hệ thống" | "Kênh đối tác"
  roleLabel: string;               // "Quản trị viên" | "Đối tác"
  nav: NavGroup[];
  breadcrumbs?: { label: string; to?: string }[]; // mặc định lấy từ BreadcrumbContext do trang đặt
  topbarSlot?: React.ReactNode;
  children?: React.ReactNode;      // mặc định <Outlet/>
}
```
Trang đặt breadcrumb qua hook `useBackofficeBreadcrumbs([{label:'Kiểm duyệt'},{label:'Khách sạn'}])`. Trang không gọi hook thì breadcrumb lấy theo nhãn mục menu đang chọn, để 2 trang AI không phải sửa.

### 1.3 Component dùng chung — `src/components/backoffice/*` (Gói E làm trước tiên)

| Component | Props chính | Kích thước / hành vi |
|---|---|---|
| `PageHeader` | `title`, `subtitle?`, `eyebrow?`, `actions?`, `meta?` (vd. "Nguồn: cơ sở dữ liệu · cập nhật 10:32"), `tabs?: BoTabItem[]` | H1 24/700 `--hg-text-heading` (<768: 20). Subtitle 14 `--hg-muted`. Actions căn phải, khoảng cách 8; <768 xuống dòng dưới tiêu đề, tối đa 2 nút, các nút còn lại gom vào menu "⋯". Khoảng cách tới nội dung 24. Có `tabs` thì vẽ `BoTabs` sát dưới. |
| `BoTabs` | `items:{key,label,to?,badge?,disabled?}[]`, `value`, `onChange?` | Kiểu gạch chân: cao 44, chữ 14/600, mục đang chọn có gạch 2px `--hg-primary`. Tab là link khi có `to` (đồng bộ URL). <768 cuộn ngang, có `scroll-snap`. Dùng `role="tablist"` khi không phải link. |
| `BoButton` | `variant: 'primary'\|'secondary'\|'danger'\|'ghost'`, `size?: 'md'\|'sm'`, `icon?`, `loading?` | md cao 40 (mobile 44), padding 0 16, chữ 14/600, bo 8. primary: nền `--hg-primary`, hover `--hg-primary-hover`. secondary: nền trắng, viền `--hg-border-strong`, chữ `--hg-primary`. danger: nền `--hg-danger`, chữ trắng. ghost: không nền, chữ `--hg-link`. Khi `loading`: spinner 16, giữ nguyên bề rộng, `aria-busy`. Nút chỉ có icon: 40×40 (mobile 44), bắt buộc `aria-label`. |
| `KpiTile` | `label`, `value: number\|null\|undefined`, `loading`, `href?`, `tone?: 'neutral'\|'warning'\|'danger'\|'success'`, `icon?`, `hint?` | Card trắng, viền `--hg-border`, bo 8, padding 20, cao tối thiểu 112. Label 13/500 muted; giá trị 28/700 `tabular-nums` (mobile 24). `null/undefined` → hiện "—" và hint "Chưa có dữ liệu". Không tự đổi thành 0. Khi `loading`: skeleton 96×28. Có `href` thì cả ô là link, hover viền `--hg-border-hover`. `tone` chỉ tô màu icon box 36×36 (nền `-50`). **Không có kiểu tiền tệ** (doanh thu chỉ khi có contract thanh toán). |
| `DataTable<T>` | `columns: {key, header, render?, sortable?, width?, align?, hideBelow?: 768\|1024\|1280, primary?}[]`, `rows`, `rowKey`, `loading`, `error?`, `onRetry?`, `empty: {title, description?, action?}`, `sort?`, `onSortChange?`, `pagination?: {page, limit, total, onChange}`, `onRowClick?`, `selectedKey?`, `rowActions?: (row) => RowAction[]`, `caption` (ẩn, cho screen reader), `mobile?: 'cards'\|'scroll'` (mặc định `cards`) | Khung trắng viền bo 8. Đầu bảng cao 44, nền `--hg-surface-muted`, chữ 13/600 muted, dính đầu trong khung cuộn. Dòng cao 52, chữ 14, viền dưới `--hg-border`; hover `--hg-primary-50`; dòng đang chọn có vạch trái 3px `--hg-primary`. Cột sắp xếp được có icon ↕ 14 và `aria-sort`; **chỉ bật sort khi API hỗ trợ hoặc đã có đủ dữ liệu ở client** (danh sách ≤100 bản ghi). Cột hành động căn phải: tối đa 2 nút ghost sm + menu "⋯". Phân trang: "Hiển thị 1–20 trên 134" (13 muted) + nút ‹ › 40 + số trang (rút gọn còn 5 nút); chọn cỡ trang 20/50/100 (API giới hạn 100). 768–1023: ẩn cột `hideBelow:1024`, cột primary dính trái khi cuộn ngang. <768 `cards`: mỗi dòng thành 1 card padding 16, dòng 1 là cột primary 15/600 + StatusPill bên phải, 2–3 dòng meta 13, hàng hành động dưới cùng (vùng chạm 44). |
| `FilterBar` | `search?: {value, onChange, placeholder, label}`, `children` (các ô lọc), `activeCount`, `onReset`, `onSubmit?` | ≥768: 1 hàng, tự xuống dòng; ô cao 40, ô tìm kiếm rộng 280 (icon Search 16), select tối thiểu 160; "Xóa lọc" là ghost, chỉ hiện khi `activeCount>0`. <768: ô tìm 100% + nút "Bộ lọc (n)" 44 mở bottom sheet cao 80dvh, cuối sheet có thanh dính "Áp dụng". **Trạng thái lọc ghi vào URL query** (`?status=PENDING&q=`), tải lại trang vẫn giữ. Debounce ô tìm 300ms nếu lọc ở client; nếu lọc ở server thì chỉ gửi khi Enter/Áp dụng. |
| `StatusPill` | `status: string`, `domain?: 'moderation'\|'booking'\|'partnerApp'\|'user'\|'cms'\|'media'\|'promotion'\|'review'`, `size?: 'sm'\|'md'` | Cao 24 (sm 22), padding 0 10, bo pill, chữ 12/600, chấm tròn 6 bên trái. Bảng màu ở 1.4. Mã lạ: kiểu neutral, hiện mã gốc. Không bao giờ hiện mã tiếng Anh khi đã có nhãn. |
| `DetailDrawer` | `open`, `onClose`, `title`, `subtitle?`, `status?`, `width?: 'sm'\|'md'\|'lg'` (480/640/880, mặc định md), `loading?`, `error?`, `footer?`, `children` | Trượt từ phải, cao 100dvh, nền trắng, `--hg-z-drawer`, lớp mờ `--hg-overlay`. Header dính cao 64 (tiêu đề 18/700 + pill + nút đóng 40). Thân padding 24, chia `DrawerSection` (tiêu đề 15/600, khoảng cách giữa section 24, `dl` 2 cột: nhãn 13 muted / giá trị 14). Footer dính cao 72, viền trên, các nút căn phải. Bề rộng thực: `min(width, 100vw - 72px)`. <768 full màn hình. Có focus trap, Esc đóng. **Drawer gắn với URL** (`/admin/bookings/:code`): mở bằng link được, đóng thì `navigate` về danh sách và giữ query. |
| `ConfirmDialog` | `open`, `title`, `description?`, `impact?: ReactNode` (danh sách hậu quả), `tone: 'default'\|'danger'`, `confirmLabel`, `cancelLabel='Hủy bỏ'`, `reason?: {required, label, placeholder?, min=3, max=500, presets?: string[]}`, `onConfirm(reason?) => Promise<void>`, `onClose` | Modal rộng 480, bo 12, padding 24, `--hg-z-modal`. Tiêu đề 18/700. Khối `impact` nền `--hg-warning-50`, viền `--hg-warning-border`, chữ 14. Ô lý do: textarea 4 dòng, bộ đếm "12/500" 12 muted, `presets` là chip chèn sẵn văn bản (vẫn sửa được). Nút xác nhận bị khóa cho đến khi lý do hợp lệ (đếm sau khi trim). Đang gửi: khóa cả 2 nút, không đóng được. Lỗi API: giữ dialog mở, hiện alert trong dialog, không xóa lý do đã nhập. <768: bottom sheet full chiều rộng. **Thay toàn bộ `window.prompt/confirm`** đang có trong `PartnerApplicationsPage` và `HotelManagementPage`. |
| `AuditList` | `items: {action, actorName?, at, reason?, from?, to?}[]`, `emptyText` | Dạng timeline: chấm 8 + vạch 1px. Mỗi mục: hành động 14/600 (đổi mã → nhãn tiếng Việt), "bởi {actorName} · {dd/MM/yyyy HH:mm}" 13 muted, lý do 14 trong khối `--hg-surface-muted`. Thiếu `actorName` thì bỏ phần "bởi", không ghi "Không rõ". API không trả lịch sử thì hiện `emptyText` ("Máy chủ chưa trả lịch sử cho mục này."). |
| `FormSection` | `title`, `description?`, `children`, `columns?: 1\|2` | Card trắng, viền, bo 8, padding 24 (mobile 16). Tiêu đề 16/700, mô tả 13 muted. Lưới 2 cột từ 1024, khoảng cách 16/20; dưới 1024 thành 1 cột. |
| `Field` set: `TextField`, `NumberField`, `SelectField`, `TextareaField`, `DateField`, `DateTimeField`, `CheckboxGroup`, `TriStateField` (Có/Không/Chưa rõ), `Switch` | `label`, `hint?`, `error?`, `required?`, `counter?` | Nhãn 13/600 nằm trên ô. Ô cao 40 (mobile 44), chữ 14 (mobile 16 để iOS không zoom), viền `--hg-border-strong`, focus `--hg-focus-ring`. Lỗi 13 `--hg-danger` ngay dưới ô, `aria-describedby`. Dấu bắt buộc "*" màu danger kèm chữ ẩn "bắt buộc". |
| `StickySaveBar` | `dirty`, `busy`, `onSave`, `onReset`, `saveLabel`, `statusText?` | Thanh dính đáy vùng nội dung, cao 64, nền trắng, viền trên, shadow-1. Trái: "Có thay đổi chưa lưu" (warning-text) hoặc "Đã đồng bộ" (muted). Phải: "Hủy thay đổi" (secondary) + nút lưu (primary). |
| `LoadingState` / `EmptyState` / `ErrorState` / `ApiPendingState` / `ConflictBanner` | Empty: `icon, title, description?, action?`. Error: `message, onRetry`. ApiPending: `feature, contractRef` (vd. "PAC §2.1"). Conflict: `onReload` | Loading dùng skeleton theo hình nội dung (bảng 5 dòng, ô KPI, lưới ảnh), không dùng spinner toàn trang. Empty/Error: khung trắng, padding 48, icon 40, tiêu đề 16/700, căn giữa. **`ApiPendingState`**: khung viền nét đứt `--hg-border-strong`, nội dung "Chức năng này chờ API được duyệt (PAC §x). Chưa có dữ liệu thật để hiển thị." Không đặt dữ liệu mẫu phía sau. **`ConflictBanner`** (lỗi 409 `*_VERSION_CONFLICT`, If-Match sai): alert `--hg-warning-50` "Dữ liệu đã được thay đổi ở nơi khác. Tải lại để xem bản mới nhất, thay đổi chưa lưu của bạn sẽ mất." + nút "Tải lại". |
| `ToastProvider` / `useToast()` | `toast({tone:'success'\|'error'\|'info', message, action?})` | Góc dưới phải, cách mép 16, rộng 360 (mobile: full chiều rộng trừ 32, nằm dưới cùng). Tối đa 3 toast chồng nhau. success/info tự tắt sau 5 giây; error giữ đến khi người dùng đóng. `aria-live` polite (error: assertive). Provider đặt sẵn trong `BackofficeShell`. |
| `ImageDropzone` | `accept`, `maxBytes`, `multiple`, `onFiles(File[])`, `hint` | Cao 160, viền nét đứt 2px `--hg-border-strong`, bo 8; khi kéo file vào: nền `--hg-primary-50`. Kiểm loại file/dung lượng ở client trước khi gửi (server vẫn là nơi quyết định). Bấm phím được (`button` + `input[type=file]` ẩn). Dùng cho ảnh khách sạn (F) và ảnh banner (E). |

### 1.4 `StatusPill` — nhãn và màu theo trạng thái

| Tone | Nền / chữ / chấm |
|---|---|
| neutral | `--hg-surface-muted` / `--hg-muted` / `--hg-subtle`, viền 1px `--hg-border` |
| info | `--hg-info-50` / `--hg-primary` / `--hg-link` |
| warning | `--hg-warning-50` / `--hg-warning-text` / `--hg-warning-text` |
| success | `--hg-success-50` / `--hg-success` / `--hg-success` |
| danger | `--hg-danger-50` / `--hg-danger` / `--hg-danger` |
| archived | trong suốt / `--hg-muted` / không chấm, viền nét đứt `--hg-border-strong` |

| Mã | Nhãn (domain) | Tone |
|---|---|---|
| `PENDING` | "Chờ duyệt" (moderation, partnerApp, review) · "Chờ xác nhận" (booking) | warning |
| `NEEDS_MORE_INFO` | "Cần bổ sung" | warning (icon `AlertCircle` 12) |
| `APPROVED` | "Đã duyệt" | success |
| `REJECTED` | "Bị từ chối" · booking: "Đã từ chối" | danger |
| `SUSPENDED` | "Tạm ngưng" | danger |
| `DRAFT` | "Bản nháp" | neutral |
| `SCHEDULED` | "Đã lên lịch" (cms) | info |
| `PUBLISHED` | "Đang hiển thị" (cms, review) | success |
| `HIDDEN` | "Đã ẩn" (review) | neutral |
| `ARCHIVED` | "Đã lưu trữ" · promotion: "Đã kết thúc" | archived |
| `ACTIVE` | "Hoạt động" (user, business) · "Đang áp dụng" (promotion, room, rate) | success |
| `CONFIRMED` | "Đã xác nhận" | info |
| `COMPLETED` | "Hoàn thành" | success |
| `CANCELLED` | "Đã hủy" | neutral |
| `RUNNING` / `UPCOMING` / `EXPIRED` (promotion `effective`) | "Đang hiệu lực" / "Sắp diễn ra" / "Hết hạn" | success / info / neutral |
| `VERIFIED` (review) | "Đã lưu trú" | info |
| Thanh toán (`paymentStatus`) | Chỉ hiện dạng chữ, không pill, không nút đổi: `UNPAID` "Chưa thanh toán", `PAID` "Đã thanh toán", `REFUNDED` "Đã hoàn tiền", mã khác hiện mã gốc | — |

### 1.5 Quy tắc chung cho mọi trang
1. **Thao tác nhạy cảm** (duyệt, từ chối, yêu cầu bổ sung, tạm ngưng, đổi vai trò, khóa tài khoản, hủy đơn, xuất bản/gỡ CMS, lưu trữ) luôn đi qua `ConfirmDialog`. Bắt buộc lý do 3–500 ký tự cho mọi thao tác từ chối/tạm ngưng/hủy/khóa/đổi quyền/gỡ xuống. Với duyệt/xuất bản, lý do không bắt buộc, trừ khi API đòi (ví dụ `/hotels/manage/:id/moderate` đang bắt buộc).
2. **Audit:** có dữ liệu lịch sử (`audit`, `statusHistory`, `revisions`, `decisionReason`) thì hiện bằng `AuditList` trong drawer/trang chi tiết. Không có thì ghi rõ "Máy chủ chưa trả lịch sử".
3. **Nút chỉ hiện khi API cho phép.** Không tự suy luận quyền ở client để mở thêm nút. Lỗi 403/409 từ server hiện nguyên thông điệp tiếng Việt trong dialog hoặc alert.
4. **Chức năng chưa có API** (❌ trong gap matrix, nằm trong PAC): dựng UI theo DTO của PAC, sau cờ hằng số `BO_FEATURES.<tên>` trong `components/backoffice/features.ts` (Gói E giữ file này). Cờ tắt thì hiện `ApiPendingState`. **Không trỏ vào mock server khi nghiệm thu.**
5. Ngày giờ theo `vi-VN`, múi `Asia/Ho_Chi_Minh`: "21/11/2026 10:32". Tiền: `1.250.000 ₫`. Số đếm dùng `tabular-nums`.
6. Giữ mọi `data-testid` và `aria-label` đang có (e2e cũ dùng, ví dụ "Chọn khách sạn", "Tìm booking", "Lọc trạng thái booking").
7. Quy ước code giữ như design spec 6.2: mỗi phần tử JSX một dòng, icon chỉ dùng `lucide-react`, không thêm thư viện (kéo-thả và lịch tự viết).

---

## 2. GÓI E — Admin

### 2.1 Menu (`AdminLayout.tsx` → `BackofficeShell area="admin"`)

| Nhóm | Mục | Route | Icon | Trang | API |
|---|---|---|---|---|---|
| — | Bảng điều khiển | `/admin` (end) | `LayoutDashboard` | `AdminDashboardPage` (làm lại) | ✅ `GET /admin/dashboard` |
| Đối tác | Hồ sơ đối tác | `/admin/partner-applications` | `FileCheck2` | `PartnerApplicationsPage` (làm lại) | ✅ |
| | Cơ sở kinh doanh | `/admin/businesses` | `Store` | `AdminBusinessesPage` (mới) | 🟡 chỉ có list; chi tiết ở PAC §8 |
| Kiểm duyệt | Khách sạn | `/admin/hotels` | `Building2` | `AdminHotelModerationPage` (mới, khung bọc) | ✅ (ẩn nếu `VITE_HOTEL_DOMAIN_ENABLED!=='true'`) |
| | Địa điểm | `/admin/places` | `MapPinned` | `AdminModerationPage` (làm lại) | ✅ |
| | Tour | `/admin/tours` | `Route` | như trên | ✅ |
| | Bài viết | `/admin/blogs` | `Newspaper` | như trên | ✅ |
| | Đánh giá & báo cáo | `/admin/reviews` | `MessageSquareWarning` | `AdminReviewsPage` (mới) | 🟡 `GET /reviews/moderation-queue` |
| Vận hành | Booking toàn hệ thống | `/admin/bookings` | `CalendarCheck` | `AdminBookingsPage` (mới) | 🟡 list + `GET /bookings/:code` |
| | Người dùng & vai trò | `/admin/users` | `Users` | `AdminUsersPage` (mới) | ❌ PAC §1 |
| Nội dung website | CMS trang chủ | `/admin/cms` | `LayoutTemplate` | `AdminCmsPage`, `AdminBannerEditorPage` (mới) | ❌ PAC §2 |
| | Ưu đãi | `/admin/promotions` | `BadgePercent` | `AdminPromotionsPage` (mới) | ❌ PAC §4.2 |
| Hệ thống | Cài đặt | `/admin/settings` | `Settings` | `AdminSettingsPage` (mới) | ❌ PAC §3 |
| Trí tuệ nhân tạo | Nguồn web & kiến thức | `/admin/travel-web` | `BookOpen` | `TravelWebPage` (**không sửa**) | — |
| | Từ điển tiếng Việt | `/admin/language-lexicon` | `Languages` | `LanguageLexiconPage` (**không sửa**) | — |

Badge số trên menu lấy từ một lần gọi `GET /admin/dashboard` khi layout mount: Hồ sơ đối tác = `pendingPartners`, Địa điểm/Tour/Bài viết = `pendingPlaces/Tours/Blogs`, Booking = `pendingBookings`. Gọi lỗi thì không hiện badge, không chặn layout. Bỏ mục placeholder `reports` khỏi menu, vì chưa có API báo cáo/xuất file. Route `:section` → `AdminSectionPage` vẫn giữ làm chốt dự phòng.

### 2.2 Bảng điều khiển — `/admin`
Nguồn: `PlatformService.getAdminDashboard()` (giữ nguyên lời gọi).
```
PageHeader "Bảng điều khiển" · meta "Nguồn: cơ sở dữ liệu · cập nhật HH:mm" · [Làm mới]
[Việc cần xử lý]  KpiTile×5 (tone warning khi >0, mỗi ô là link)
[Quy mô nền tảng] KpiTile×8 (neutral)
[Booking theo trạng thái]  thanh 100% xếp chồng + bảng chú giải   |  [Hoạt động quản trị gần đây] AuditList 8 mục
```
- **Việc cần xử lý:** Hồ sơ đối tác chờ duyệt `pendingPartners` → `/admin/partner-applications?status=PENDING`. Địa điểm `pendingPlaces` → `/admin/places`. Tour `pendingTours`. Bài viết `pendingBlogs`. Booking chờ xác nhận `pendingBookings` → `/admin/bookings`. Có thể thêm ô "Đánh giá cần xem": số dòng của `GET /reviews/moderation-queue`, bằng 100 thì hiện "100+". API trả 503 `REVIEW_INSIGHTS_UNAVAILABLE` thì ô hiện "—" với hint "Chưa bật trên máy chủ".
- **Quy mô:** Người dùng `totalUsers`, Khách hàng `totalCustomers`, Đối tác `totalPartners`, Doanh nghiệp `totalBusinesses`, Doanh nghiệp lưu trú `totalHotels` (API đếm Business loại HOTEL/HOMESTAY/RESORT nên không gọi là "khách sạn"), Nhà hàng `totalRestaurants`, Địa điểm `totalPlaces`, Tour `totalTours`.
- **Booking theo trạng thái:** thanh ngang cao 12, bo 6, 5 đoạn theo `pending/confirmed/completed/cancelled/rejectedBookings`, màu lấy từ tone của StatusPill. Dưới thanh là bảng 5 dòng: nhãn, số, tỉ lệ % làm tròn 1 chữ số. Tổng = `totalBookings`. Bằng 0 → EmptyState "Chưa có booking". Thanh màu có `role="img"` và `aria-label` liệt kê số.
- **Bỏ ô "Doanh thu ghi nhận"** (`totalRevenue` là tổng `totalAmount` của đơn chưa hủy, không phải tiền đã thu). Bỏ bộ lọc khoảng ngày và xuất CSV vì API chưa hỗ trợ; thêm lại khi có contract.
- Hoạt động gần đây: `recentActivity` (action đổi qua bảng nhãn, ví dụ `BOOKING_CANCELLED` → "Hủy booking", `PARTNER_APPLICATION_APPROVED` → "Duyệt hồ sơ đối tác"; mã chưa có nhãn thì đổi `_` thành khoảng trắng), `entityType`, thời gian.
- Lưới: Việc cần xử lý 5 cột ≥1280, 3 cột ở 1024, 2 cột ở 768/390. Quy mô 4/4/3/2/2. Hàng cuối 2 cột 7fr/5fr ≥1280, dưới đó 1 cột.

### 2.3 Hồ sơ đối tác — `/admin/partner-applications[/:id]`
- `BoTabs` theo trạng thái, lọc ở client: Chờ duyệt · Cần bổ sung · Đã duyệt · Bị từ chối · Tất cả (badge số). `FilterBar`: tìm theo tên doanh nghiệp/email/người đại diện.
- `DataTable`: Doanh nghiệp (tên 14/600 + loại 13 muted; primary) · Người đại diện · Liên hệ (email, điện thoại; ẩn <1024) · Địa chỉ (2 dòng, ẩn <1280) · Ngày nộp (`createdAt` nếu có) · Trạng thái · ⋯
- Bấm dòng → `DetailDrawer md`: Thông tin doanh nghiệp · Người đại diện & liên hệ · Tài liệu (chỉ khi API trả, nếu không: "Hồ sơ không kèm tài liệu") · Quyết định gần nhất (`decisionReason`, người/lúc nếu có).
- Footer drawer (chỉ khi `PENDING|NEEDS_MORE_INFO`): "Yêu cầu bổ sung" (secondary, lý do bắt buộc, preset: "Thiếu giấy phép kinh doanh", "Địa chỉ chưa rõ") · "Từ chối" (danger, lý do bắt buộc) · "Phê duyệt" (primary, lý do không bắt buộc; impact: "Hồ sơ chuyển sang Đã duyệt. Quyền đối tác và Business được cấp theo quy trình hiện có của máy chủ."). Vẫn gọi `PlatformService.decidePartnerApplication(id, status, reason)` như cũ.

### 2.4 Cơ sở kinh doanh — `/admin/businesses[/:id]`
- API hiện có: `GET /admin/businesses?page&limit` (không có tìm/lọc phía server). Bảng: Tên (primary) · Loại · Thành phố · Trạng thái · Ngày tạo · ⋯. Phân trang server. FilterBar chỉ lọc trong trang đang xem và ghi rõ "Lọc trong trang hiện tại" khi API chưa hỗ trợ lọc.
- Drawer md: dữ liệu của dòng. Khi `BO_FEATURES.adminBusinessDetail` bật (PAC §8: `GET /admin/businesses/:id`, `/:businessId/bookings`) thì thêm: thành viên, danh sách cơ sở/khách sạn, 10 booking gần nhất (link sang `/admin/bookings/:code`).
- "Tạm ngưng doanh nghiệp": **chưa có API** nên không vẽ nút. Ghi chú trong drawer: "Tạm ngưng doanh nghiệp chưa được hỗ trợ; tạm ngưng từng khách sạn tại Kiểm duyệt → Khách sạn."

### 2.5 Kiểm duyệt khách sạn — `/admin/hotels[/:hotelId[/:section]]`
`AdminHotelModerationPage.tsx` (Gói E) là khung mỏng:
```tsx
<PageHeader title="Kiểm duyệt khách sạn" subtitle="Duyệt đúng phiên bản nội dung. Giá và tồn phòng do đối tác quản lý." />
<HotelManagementPage admin embedded />   // Gói F sở hữu toàn bộ phần bên trong
```
Phần bên trong do **Gói F** dựng lại trong `HotelManagementPage` (mục 3.5), nhánh `admin`:
- **Không có `:hotelId`** → danh sách (`GET /admin/hotels`, ≤100 dòng, lọc/sắp xếp ở client): Khách sạn (primary) · Doanh nghiệp (`businessName`) · Trạng thái (`status`) · Nội dung (`v{contentVersion}`, đã duyệt `v{approvedContentVersion}` hoặc "chưa có") · pill **"Có thay đổi chờ duyệt"** (warning) khi `approvedContentVersion == null || contentVersion > approvedContentVersion` · Giá/tồn `v{commercialVersion}`. Bộ lọc: trạng thái, "Chỉ hiện mục có thay đổi chờ duyệt", tìm tên.
- **Có `:hotelId`**: `BoTabs` gồm `overview` Tổng quan · `content` Nội dung (hồ sơ, địa chỉ, hạng phòng, chính sách, chỉ đọc) · `media` Hình ảnh · `review-status` Quyết định & lịch sử.
- Tab **Quyết định & lịch sử**: bảng so sánh 2 cột "Đã công bố (v{approved})" | "Bản chờ duyệt (v{content})" cho các trường Tên, Địa chỉ, Hạng phòng, Mô tả (lấy từ `publishedSnapshot`). Dòng khác nhau tô nền `--hg-warning-50` kèm nhãn "Đã thay đổi". Không có snapshot: "Chưa có bản công bố trước để so sánh." Ba nút: "Duyệt nội dung v{n}" (primary) · "Từ chối và yêu cầu sửa" (danger) · "Tạm ngừng công khai" (danger, impact: "Khách sạn bị ẩn khỏi tìm kiếm và trang công khai"). Cả ba mở ConfirmDialog, **lý do bắt buộc** (API đòi), vẫn gọi `act('moderate','post',{decision,reason})`. Bên dưới là `AuditList` lấy từ `s.audit`.
- Tab **Hình ảnh**: lưới như 3.7 nhưng mỗi ảnh chỉ có "Duyệt ảnh" / "Từ chối ảnh". Mỗi nút mở ConfirmDialog có lý do (bỏ ô "Lý do kiểm duyệt ảnh" dùng chung đầu trang). Vẫn gọi `media/:id/review`.

### 2.6 Kiểm duyệt Địa điểm / Tour / Bài viết — `/admin/{places,tours,blogs}[/:id]`
Làm lại `AdminModerationPage` và giữ lời gọi `ManagementService.adminList/adminGet/moderate`.
- PageHeader "Duyệt {nhãn}" + `BoTabs` trạng thái: Chờ duyệt · Đã duyệt · Bị từ chối · Tạm ngưng · Bản nháp. Tab thay cho `<select>` cũ và vẫn truyền `status` lên API.
- `DataTable` thay cho lưới card: Ảnh (thumbnail 64×48, bo 4, `object-fit:cover`; không có ảnh thì ô `--hg-surface-muted` + icon) · Tên/Tiêu đề (primary, 2 dòng) · Doanh nghiệp/Tác giả · Cập nhật · Trạng thái · "Xem".
- `/:id` → `DetailDrawer lg`: ảnh lớn tối đa 320 cao, mô tả/nội dung (giữ `white-space:pre-wrap`, hiện văn bản thuần, không render HTML), thông tin Business. Footer: "Tạm ngưng" (danger, lý do bắt buộc) · "Từ chối" (danger, lý do bắt buộc) · "Phê duyệt" (primary). Nút đổi theo trạng thái hiện tại: đang APPROVED thì chỉ còn Tạm ngưng; đang SUSPENDED thì còn Phê duyệt lại.

### 2.7 Booking toàn hệ thống — `/admin/bookings[/:code]`
- API hiện có: `GET /admin/bookings?page&limit` (chưa có tìm/lọc phía server), `GET /bookings/:code` (SUPER_ADMIN), `PATCH /bookings/:id/status` (SUPER_ADMIN, qua `BookingService.changeStatus`). Đề xuất bổ sung ở PAC §8.
- **Tìm mã** ở đầu trang: ô "Mã đặt chỗ" rộng 320 + nút "Tìm". Gọi `GET /bookings/:code` và mở drawer ngay. Lỗi 404: "Không tìm thấy booking với mã này."
- `FilterBar` (trạng thái, khoảng ngày nhận phòng, khách sạn/Business) **chỉ hiện khi `BO_FEATURES.adminBookingFilters` bật**, tức khi API nhận query. Trước đó chỉ có tìm mã và phân trang, kèm dòng 13 muted "Bộ lọc sẽ có khi máy chủ hỗ trợ tìm theo trạng thái/ngày". Không lọc ở client trên 1 trang rồi trình bày như kết quả toàn hệ thống.
- Bảng: Mã (primary, font `tabular-nums`) · Khách (`customerName`; điện thoại ẩn <1280) · Dịch vụ/Khách sạn (`serviceName`, hạng phòng nếu `hotelStay`) · Ngày (`bookingDate` → `returnDate`) · SL · Tổng tiền (snapshot, căn phải, chỉ đọc) · Trạng thái · Thanh toán (chữ, ẩn <1280) · Tạo lúc (ẩn <1024).
- Drawer `lg` `/admin/bookings/:code`:
  1. Header: mã + StatusPill.
  2. **Tóm tắt lưu trú:** dùng lại `HotelBookingSummary` (Gói B, chỉ dùng, không sửa) khi có `hotelStay`; nếu không, `dl` dịch vụ/ngày/số lượng.
  3. **Khách & liên hệ** (chỉ những gì API trả).
  4. **Giá snapshot:** tổng tiền và các dòng giá do API trả, nhãn "Giá chốt lúc đặt (không chỉnh sửa)". Không có ô nhập nào.
  5. **Thanh toán:** chữ `paymentStatus`. Không nút đổi.
  6. **Lịch sử trạng thái:** `AuditList` từ `statusHistory` (cũ → mới, người, lý do, thời điểm) nếu API trả; nếu không thì ghi chú cần bổ sung.
  7. Footer: chỉ một nút **"Hủy đơn (xử lý ngoại lệ)"** (danger), hiện khi trạng thái `PENDING|CONFIRMED`. ConfirmDialog bắt buộc lý do, impact: "Tồn phòng được máy chủ trả lại đúng một lần. Hệ thống chưa có thanh toán nên không có hoàn tiền tự động." Gọi `PATCH /bookings/:id/status {status:'CANCELLED', reason}`. Lỗi `HOTEL_CANCELLATION_REVIEW_REQUIRED`/409 thì hiện nguyên thông điệp. **Không có nút** Xác nhận/Hoàn thành/Đánh dấu đã thanh toán/Sửa tổng tiền/Xóa đơn.

### 2.8 Đánh giá & báo cáo vi phạm — `/admin/reviews`
- API: `GET /reviews/moderation-queue` → `{id, targetId, comment, moderationStatus, reports}` (≤100), `PATCH /reviews/:id/moderation {status: PUBLISHED|HIDDEN|REJECTED, reason}` (lý do 3–500 khi không phải PUBLISHED). Trang mới gọi API trực tiếp; **không sửa** `components/common/ReviewModerationPanel.tsx` (đang dùng ở Profile).
- 503 `REVIEW_INSIGHTS_UNAVAILABLE` → EmptyState "Kiểm duyệt đánh giá chưa được bật trên máy chủ." (không phải lỗi đỏ).
- `BoTabs` lọc ở client: "Chờ duyệt" (`moderationStatus==='PENDING'`) · "Bị báo cáo" (`reports>0`) · Tất cả.
- Bảng: Nội dung (comment, tối đa 3 dòng, "Xem thêm" mở drawer; primary) · Đối tượng (link "Mở trang" → `/places/:targetId`, tab mới) · Báo cáo (số; >0 dùng pill danger "N báo cáo") · Trạng thái · Hành động: "Hiển thị" (primary sm) · "Ẩn" · "Từ chối". Ẩn và Từ chối mở ConfirmDialog có lý do bắt buộc, preset theo loại báo cáo: "Spam/quảng cáo", "Ngôn từ xúc phạm", "Lộ thông tin cá nhân", "Gây hiểu nhầm".
- Không hiện ô sửa nội dung, không hiện/sửa điểm sao (API hàng chờ không trả rating). Sau thao tác: toast "Đã cập nhật. Điểm tổng hợp công khai do máy chủ tính lại." rồi tải lại hàng chờ.

### 2.9 Người dùng & vai trò — `/admin/users[/:id]` (PAC §1, cờ `adminUsers`)
- FilterBar: tìm tên/email (gửi `search`), Vai trò (`role`), Trạng thái (`status`). Phân trang server 20.
- Bảng: Họ tên + email (primary; avatar 32 chữ cái đầu, không tải ảnh ngoài) · Điện thoại (ẩn <1280) · Vai trò (chip 22 cho từng role) · Trạng thái · Doanh nghiệp (`businessCount`) · Booking (`bookingCount`) · Ngày tạo.
- Drawer md: Thông tin (không có trường mật khẩu/token) · **Vai trò:** checkbox `CUSTOMER`, `PARTNER`; `SUPER_ADMIN` chỉ hiện dạng chip khóa kèm 🔒 và chú thích "Không cấp hoặc thu quyền quản trị qua giao diện". Nút "Lưu vai trò" mở ConfirmDialog có lý do bắt buộc; khi bỏ PARTNER thì impact ghi "Doanh nghiệp không bị xóa; tài khoản mất quyền truy cập kênh đối tác". · **Trạng thái:** "Khóa tài khoản" (danger) hoặc "Mở khóa", lý do bắt buộc · **Lịch sử** `AuditList` từ `audit`.
- Chặn ngay trên giao diện (server vẫn kiểm): người đang xem chính là user đó → mọi nút khóa, tooltip "Không thể tự thay đổi quyền hoặc trạng thái của chính mình". User có `SUPER_ADMIN` → khóa nút trạng thái. Lỗi `SELF_ACTION_FORBIDDEN`, `OWNER_PROTECTED`, `ROLE_GRANT_FORBIDDEN`, `USER_VERSION_CONFLICT` có thông điệp tiếng Việt riêng; lỗi conflict hiện `ConflictBanner`.

### 2.10 CMS trang chủ — `/admin/cms[/:tab]`, `/admin/cms/banners/new|:id` (PAC §2, cờ `cms`)
`AdminCmsPage` có `BoTabs`: **Banner** (`/admin/cms` = `/admin/cms/banners`) · **Các khối trang chủ** (`/admin/cms/sections`) · **Khách sạn nổi bật** (`/admin/cms/featured`). Phần Footer/SEO nằm ở Cài đặt (2.12).

**a) Danh sách banner**
- Đầu tab: alert info "Đang hiển thị trên trang chủ: {tiêu đề các banner PUBLISHED trong khung giờ}" (tính từ dữ liệu API) + nút "Thêm banner" (primary).
- Bảng: Ảnh (thumbnail desktop 96×32, tỉ lệ 3:1) · Tiêu đề (primary) + phụ đề 13 muted · Trạng thái (DRAFT/SCHEDULED/PUBLISHED/ARCHIVED) · Lịch hiển thị ("21/11 08:00 → 30/11 23:59" hoặc "Không giới hạn") · Thứ tự (nút ↑ ↓ 32×32 có `aria-label` "Đưa {tên} lên/xuống") · Cập nhật (`updatedBy`, `updatedAt`) · ⋯ (Sửa · Xem trước · Xuất bản/Gỡ xuống · Lưu trữ).
- Đổi thứ tự: chỉnh tại chỗ, hiện thanh "Thứ tự đã thay đổi · [Hủy] [Lưu thứ tự]". Lưu gọi `PUT /cms/banners/order` với **đủ mọi id không ARCHIVED**. Lỗi `CMS_ORDER_INVALID` thì tải lại.
- Bộ lọc tab con: Tất cả · Đang hiển thị · Đã lên lịch · Bản nháp · Đã lưu trữ.

**b) Form banner — `AdminBannerEditorPage`**
```
≥1280: [Form 1fr (tối đa 720)] [Xem trước 1fr, sticky top 88]
1024–1279: Form; xem trước nằm dưới form, có nút "Xem trước" để cuộn xuống
<1024: BoTabs "Nội dung" | "Xem trước" | "Lịch sử phiên bản"
Thanh dính đáy: "Bản nháp · phiên bản 4 · lưu 10:32"  [Lưu nháp] [Xuất bản]  (hoặc [Gỡ xuống] khi đang hiển thị)
```
- `FormSection` **Nội dung:** Tiêu đề* (≤60 ký tự, đếm ký tự; PAC cho tối đa 160 nhưng hero desktop 40px chỉ vừa khoảng 2 dòng) · Phụ đề (≤120) · ghi chú "Chỉ nhận văn bản thuần, không nhận HTML". Ký tự `<`/`>` báo lỗi ngay tại ô.
- **Ảnh:** 2 ô cạnh nhau ≥1024. "Ảnh desktop*" khuyến nghị 1920×640 (3:1), tối thiểu 1600 ngang. "Ảnh mobile*" khuyến nghị 1170×780 (3:2), tương ứng hero 390×260 của design spec. Mỗi ô là `ImageDropzone` (JPEG/PNG/WebP ≤10 MB) hoặc "Chọn ảnh có sẵn". Sau khi chọn: preview đúng tỉ lệ với vùng an toàn chữ (lớp phủ nét đứt 60% trái/dưới), cảnh báo khi ảnh nhỏ hơn mức tối thiểu. **Mô tả ảnh (alt)\*** (≤160, dùng chung cho 2 ảnh như PAC) · **Nguồn & giấy phép ảnh\*** (`imageCredit`, ví dụ "Tác giả / Nguồn / Giấy phép"), vì bàn giao yêu cầu ghi quyền ảnh. *Chú ý: PAC chưa có endpoint tải ảnh CMS, xem 6.4.*
- **Nút hành động (CTA):** Nhãn (≤24) · Đích: select loại "Tìm khách sạn" / "Trang điểm đến" / "Đường dẫn nội bộ", kèm ô path. Kiểm ở client giống server: bắt đầu bằng `/`, không `//`, không `javascript:`, ≤300. Bên dưới hiện "Sẽ mở: /hotels/search?…". Không nhận URL ngoài.
- **Lịch hiển thị:** Bắt đầu (datetime, trống = ngay khi xuất bản) · Kết thúc (trống = không giới hạn). Ghi chú "Giờ Việt Nam; máy chủ quyết định thời điểm hiển thị". Lỗi `endsAt ≤ startsAt` hiện tại ô.
- **Xem trước:** nút chuyển "Desktop | Mobile" (segmented 36). Desktop: khung 1440×440 thu nhỏ bằng `transform:scale()` cho vừa cột, bố cục theo design spec 4.4 (ảnh nền + `--hg-scrim`, H1 40/800 trắng, phụ đề, nút CTA cam chữ `--hg-cta-ink`). Mobile: khung 390×260, H1 26. Nhãn góc "Bản xem trước — chưa công khai". Component `BannerPreview` thuộc Gói E (6.5).
- **Xuất bản:** ConfirmDialog (lý do không bắt buộc), impact "Banner hiển thị từ {startsAt hoặc ngay bây giờ} đến {endsAt hoặc không giới hạn}" → `POST …/publish {version,startsAt,endsAt}`. Kết quả là `SCHEDULED` hoặc `PUBLISHED`. **Gỡ xuống:** danger, lý do bắt buộc → `unpublish` (về `DRAFT`). Khi sửa bản đang PUBLISHED, thanh trạng thái ghi "Đang sửa bản mới · trang chủ vẫn hiện phiên bản {n} cho đến khi xuất bản lại".
- **Lịch sử phiên bản** (≥1280 là khối gập dưới xem trước, <1024 là tab): danh sách `revisions` (Phiên bản n · StatusPill · tiêu đề · người · thời gian). Mỗi dòng có "Xem" (đưa nội dung vào khung xem trước, chỉ đọc) và "Khôi phục thành bản nháp" (ConfirmDialog: "Tạo bản nháp từ phiên bản n. Không tự xuất bản.") → `restore`.
- Lưu trữ: `DELETE` (xóa mềm), ConfirmDialog danger có lý do.

**c) Các khối trang chủ**
- Danh sách theo `position`, mỗi dòng cao 64: số thứ tự · tên khối (ô sửa tiêu đề tại chỗ, ≤60) · key 12 muted · `Switch` bật/tắt (`hero` và `search` khóa ở trạng thái bật, tooltip "Khối bắt buộc") · nút ↑ ↓ · "Cấu hình" (chỉ cho khối có `config`, mở drawer sm với các trường số như `limit` 1–12).
- Mọi thay đổi gom vào thanh "Có N thay đổi chưa lưu · [Hủy] [Lưu bố cục]". Lưu gửi lần lượt `PATCH /sections/:key` cho từng khối đổi bật/tắt/tiêu đề/config, rồi `PUT /sections/order` nếu thứ tự đổi. Có lỗi thì dừng, hiện khối lỗi, tải lại.
- Bên phải (≥1280, rộng 320) là "Sơ đồ trang chủ": các khối xếp dọc, cao 28, khối tắt hiện mờ nét đứt. Chỉ minh họa thứ tự, không phải preview thật.

**d) Khách sạn nổi bật**
- Danh sách đã chọn (≤12): ảnh 64×48 · tên · trạng thái · pill **"Không còn đủ điều kiện, sẽ tự ẩn"** (warning) khi `eligible=false` · ↑ ↓ · "Bỏ chọn".
- Nút "Thêm khách sạn" mở dialog 640: ô tìm gọi **API công khai sẵn có `GET /api/hotels`** (chỉ trả khách sạn đủ điều kiện công khai, nên không thể chọn bản ghi nháp). Kết quả: ảnh, tên, địa điểm, checkbox. Đã đủ 12 thì khóa thêm. Không tạo hay sao chép dữ liệu khách sạn.
- "Lưu danh sách" → `PUT /cms/featured-hotels {placeIds, version}`. Lỗi `422 CMS_FEATURED_NOT_ELIGIBLE` → đánh dấu đỏ các `ids` bị từ chối.

### 2.11 Ưu đãi — `/admin/promotions` (PAC §4.2, cờ `adminPromotions`)
- FilterBar: Khách sạn (select từ `GET /admin/hotels`) · Trạng thái (`DRAFT|ACTIVE|ARCHIVED`) · Hiệu lực (`UPCOMING|RUNNING|EXPIRED`, do server tính).
- Bảng: Tên (primary) · Khách sạn (`hotelName`) · Phạm vi ("Toàn khách sạn" / hạng phòng / gói giá) · Mức giảm ("10%", tối đa 500.000 ₫ / "200.000 ₫ cho cả kỳ") · Thời gian đặt · Thời gian lưu trú · Tối thiểu N đêm · Trạng thái + Hiệu lực.
- Drawer md chỉ đọc, footer có 1 nút "Đình chỉ ưu đãi" (danger, lý do bắt buộc) → `POST /admin/promotions/:id/suspend`. **Không có ô sửa** giá trị/điều kiện ưu đãi hay giá phòng.
- **Placement** (đưa ưu đãi lên mục "Ưu đãi" trang chủ): PAC chưa có trường này. Khi được duyệt (đề xuất ở 6.3) thì thêm cột "Trang chủ" (pill "Đang đặt ở mục Ưu đãi") và hành động "Đưa lên/Gỡ khỏi trang chủ". Hiện tại không vẽ.

### 2.12 Cài đặt — `/admin/settings` (PAC §3, cờ `settings`)
Một trang form, `StickySaveBar`, gửi `PATCH` kèm `version`.
- **Thông tin website:** Tên website · Khẩu hiệu · Email hỗ trợ · Điện thoại hỗ trợ (để trống nếu chưa có số thật; hint "Không nhập số minh họa") · Giờ hỗ trợ · Địa chỉ.
- **Liên kết chân trang:** bảng sửa tại chỗ (Nhóm · Nhãn · Đường dẫn · ↑↓ · Xóa), "Thêm liên kết". Chỉ nhận đường dẫn nội bộ `/…`; mạng xã hội nhận `https://`.
- **SEO cơ bản:** Tiêu đề mặc định (≤60) · Mô tả mặc định (≤160, có đếm) · khung xem trước kiểu kết quả tìm kiếm (tiêu đề 18 `--hg-link`, mô tả 13).
- **Thông báo toàn site:** Switch bật/tắt + nội dung (≤200, văn bản thuần) + xem trước dải thông báo.
- Khối info cuối trang: "Trang này không chứa khóa API, mật khẩu hay cấu hình máy chủ." Nội dung Điều khoản/Chính sách chưa có trong PAC nên chưa vẽ (6.3).

---

## 3. GÓI F — Partner

### 3.1 Menu (`PartnerLayout.tsx` → `BackofficeShell area="partner"`, `topbarSlot={<PropertySwitcher/>}`)
Bỏ màu teal hiện tại, dùng chung navy với Admin (6.7). `:hotelId` là khách sạn đang chọn trong switcher. Chưa chọn khách sạn thì các mục nhóm "Khách sạn" dẫn về `/partner/hotels` (danh sách + gợi ý "Chọn hoặc tạo khách sạn").

| Nhóm | Mục | Route | Icon | Ghi chú |
|---|---|---|---|---|
| — | Tổng quan | `/partner` (end) | `LayoutDashboard` | |
| Khách sạn | Cơ sở | `/partner/hotels/:hotelId/overview` | `Building2` | tab con: Tổng quan · Thông tin · Địa chỉ · Trạng thái duyệt |
| | Hình ảnh | `…/media` | `Images` | |
| | Phòng | `…/rooms` | `BedDouble` | |
| | Giá & tồn phòng | `…/calendar` | `CalendarRange` | tab con: Lịch tháng · Gói giá (`…/rates`) |
| | Ưu đãi | `…/promotions` | `BadgePercent` | |
| Vận hành | Đơn đặt | `/partner/bookings` | `ClipboardList` | badge = `pendingBookings` |
| | Đánh giá | `/partner/reviews` | `MessageSquare` | PAC §5 |
| Khách sạn | Chính sách | `…/policies` | `ScrollText` | đặt sau Đánh giá theo đúng thứ tự yêu cầu. Nếu muốn gom nhóm thì để cuối nhóm Khách sạn (6.7) |
| Dịch vụ khác | Địa điểm khác · Tour · Vé · Bài viết | `/partner/places`, `/tours`, `/tickets`, `/blogs` | `MapPinned`, `Route`, `Ticket`, `Newspaper` | giữ trang `PartnerResource*`, chỉ đổi giao diện |

Thứ tự hiển thị đúng yêu cầu: Tổng quan, Cơ sở, Hình ảnh, Phòng, Giá & tồn phòng, Ưu đãi, Đơn đặt, Đánh giá, Chính sách, rồi nhóm Dịch vụ khác. Cờ `VITE_HOTEL_DOMAIN_ENABLED!=='true'` thì ẩn Cơ sở/Hình ảnh/Phòng/Giá/Ưu đãi/Chính sách (giữ hành vi lọc hiện có).

### 3.2 `PropertySwitcher` (topbar) — `src/components/partner/PropertySwitcher.tsx`
- Nút cao 40, rộng 280 ≥1280 (240 ở 1024, 200 ở 768), viền `--hg-border-strong`: icon `Building2` 16 · tên khách sạn 14/600 cắt "…" · StatusPill sm · `ChevronDown`. <768: nút 44 tối đa 160 rộng (chỉ tên, cắt).
- Popover 360 (mobile: bottom sheet): ô tìm (khi >6 khách sạn) · danh sách `GET /partner/hotels` **nhóm theo `businessName`** (tiêu đề nhóm 12/600 muted) · mỗi dòng: tên, StatusPill, "Có thay đổi chưa gửi duyệt" (13 warning) khi `contentVersion > (approvedContentVersion ?? 0)` · dòng chọn có ✓ · cuối popover "+ Thêm khách sạn" → `/partner/hotels/new`.
- Đổi khách sạn: giữ nguyên section, thay `:hotelId` (đang ở `/partner/hotels/A/rooms` thì sang `/partner/hotels/B/rooms`). Nhớ lựa chọn cuối trong `localStorage['hg.partner.hotelId']`, bọc try/catch, chỉ để tiện. **URL là nguồn chính.**
- Context Business cho Tổng quan/Đơn đặt: lấy Business của khách sạn đang chọn (khớp `businessName` với `GET /partner/dashboard → businesses`). Không khớp được thì 2 trang đó hiện select Business riêng như hiện nay (6.6).

### 3.3 Tổng quan — `/partner`
Nguồn: `PlatformService.getPartnerDashboard(businessId)` + `GET /partner/hotels`.
```
PageHeader "Tổng quan" · subtitle "{Business} · {địa chỉ}" · StatusPill Business
[Đơn đặt]  KpiTile: Tổng booking · Chờ xác nhận (warning, link /partner/bookings?status=PENDING) · Đã xác nhận · Hoàn thành
[Khách sạn của bạn]  DataTable gọn: tên · trạng thái · "Có thay đổi chưa gửi duyệt" · [Giá & tồn] [Tiếp tục thiết lập]
[Dịch vụ khác]  4 ô nhỏ: Địa điểm · Tour · Vé · Bài viết (số từ metrics)
```
- **Bỏ ô "Doanh thu hoàn tất"** (`revenue` không có căn cứ thanh toán).
- Khách sạn đang `DRAFT` hoặc `REJECTED` hiện nút "Tiếp tục thiết lập" → `/partner/hotels/:id/setup`.
- Chưa có Business được cấp quyền: giữ EmptyState hiện tại, viết lại theo `EmptyState` ("Chưa có cơ sở được cấp quyền", "Liên hệ quản trị viên nếu hồ sơ đã được duyệt").
- "Booking theo ngày" và "phòng còn trống hôm nay" cần API tổng hợp, **chưa vẽ** (6.3).

### 3.4 Thiết lập khách sạn nhiều bước — `/partner/hotels/new`, `/partner/hotels/:hotelId/setup`
`PartnerHotelOnboardingPage` (mới, Gói F). Mọi bước gọi đúng endpoint `HotelManagementPage` đang dùng.

| Bước | Nội dung | Ghi | Hoàn tất khi |
|---|---|---|---|
| 1. Doanh nghiệp | Chọn Business (`GET /partner/businesses`). Không có Business thì EmptyState + link `/become-partner` | — | đã chọn |
| 2. Hồ sơ khách sạn | `ProfileFields` (tên, loại lưu trú, mô tả ngắn/dài) | (gộp với bước 3) | các trường bắt buộc hợp lệ |
| 3. Địa chỉ & tọa độ | `AddressFields`. Vĩ độ/kinh độ **bắt buộc** để tạo được bản nháp (server chặn 422). Hint: "Lấy tọa độ từ giấy tờ hoặc bản đồ của cơ sở. Không nhập 0,0 hay số ước lượng." Cảnh báo mềm khi tọa độ ngoài khoảng VN (vĩ 8–24, kinh 102–110) | **"Lưu nháp"** = `POST /partner/hotels` (tạo bản nháp; từ đây có `:hotelId`) | đã tạo |
| 4. Ảnh & tiện nghi | Upload theo 3.7 (cần ít nhất 1 ảnh khách sạn, chọn ảnh bìa) + tiện nghi/dịch vụ cấp khách sạn (`PUT profile`) | từng thao tác | ≥1 ảnh chưa lưu trữ |
| 5. Phòng, giá & tồn | Tạo ≥1 hạng phòng (3.8), ≥1 gói giá (3.9b), mở bán ít nhất 1 khoảng ngày trên lịch (3.9a) | từng thao tác | ≥1 room, ≥1 rate, có dòng tồn |
| 6. Gửi duyệt | Bảng kiểm tổng hợp (✓/✗ mỗi bước, link tới bước chưa xong) + ghi chú "Khách sạn chỉ hiển thị công khai sau khi quản trị viên duyệt." | `POST …/submit` (ConfirmDialog) | đã gửi |

- **Stepper:** ≥1024 là ngang: vòng tròn 28 (số hoặc ✓) + nhãn 13 + vạch nối 2px; trạng thái *Chưa làm* (viền `--hg-border-strong`), *Đang làm* (nền `--hg-primary`, chữ trắng), *Hoàn tất* (nền `--hg-success`), *Cần sửa* (nền `--hg-danger`). 768–1023: chỉ vòng tròn, nhãn bước hiện tại nằm dưới. <768: dòng "Bước 3/6 · Địa chỉ & tọa độ" + thanh tiến độ cao 4. Các bước bấm được để quay lại; bước sau chỉ mở khi bước trước xong (riêng bước 1–3 là một form).
- **Lưu nháp trước khi có `:hotelId`:** bước 1–3 tự lưu vào `sessionStorage` (try/catch), có dòng 13 muted "Chưa lưu lên hệ thống. Bấm Lưu nháp để tạo bản nháp." Sau khi tạo, mọi dữ liệu nằm trên server; mở `/setup` lúc nào cũng tính lại tiến độ từ `GET /partner/hotels/:id`.
- **Bị từ chối:** khi trạng thái `REJECTED`, đầu trang có alert danger: "Quản trị viên yêu cầu sửa: {lý do}" (mục `REJECTED` mới nhất trong `s.audit`) · "{thời gian}" · nút "Sửa và gửi lại". Bước liên quan không xác định được nên mọi bước hiện "Cần xem lại", bước 6 cho gửi lại.
- Thanh dính đáy: [Quay lại] · [Lưu nháp] (chỉ bước 1–3) · [Tiếp tục] (primary).

### 3.5 Tách `HotelManagementPage` thành trang con (chỉ tách giao diện)
**Nguyên tắc:** `HotelManagementEnabled` vẫn là **container duy nhất giữ state và lời gọi API** (`load`, `write`, `act`, `entityInput`, `If-Match: s.revision`, `Editor` reset khi `initial` đổi). Chỉ thay biến `tab` (số) bằng `section` đọc từ URL, và chuyển JSX từng tab sang component trình bày trong `src/pages/partner/hotel/*`, nhận props `{ s, write, act, load, admin, base }`. Giữ `key={s.identity.id+'-'+section}` để mỗi lần đổi mục vẫn mount lại như cũ.

```ts
// HotelManagementPage.tsx — prop mới (Gói F làm ngày 1)
export default function HotelManagementPage(props: { admin?: boolean; embedded?: boolean })
// đọc useParams(): hotelId?, section?
// không có hotelId → HotelListView (bảng + "Thêm khách sạn" → /partner/hotels/new)
// có hotelId mà không có section → <Navigate to="overview" replace/>
// embedded=true → không vẽ header H1 riêng (khung ngoài đã có PageHeader)
```

| Tab cũ (số) | `section` mới | Menu Partner | Component (`pages/partner/hotel/`) | Admin |
|---|---|---|---|---|
| 0 Tổng quan | `overview` | Cơ sở › Tổng quan | `HotelOverviewSection.tsx` | ✓ |
| 1 Thông tin | `profile` | Cơ sở › Thông tin | `HotelProfileSection.tsx` | gộp vào `content` |
| 2 Địa chỉ | `address` | Cơ sở › Địa chỉ | `HotelAddressSection.tsx` | gộp vào `content` |
| 9 Trạng thái kiểm duyệt | `review-status` | Cơ sở › Trạng thái duyệt | `HotelReviewStatusSection.tsx` | ✓ (2.5) |
| 3 Hình ảnh | `media` | Hình ảnh | `HotelMediaSection.tsx` | ✓ |
| 4 Hạng phòng | `rooms` | Phòng | `HotelRoomsSection.tsx` + `RoomForm.tsx` | gộp vào `content` |
| 5 Giá phòng (form gói giá) | `rates` | Giá & tồn › Gói giá | `HotelRatesSection.tsx` | — |
| 5 (lịch giá) + 6 Lịch tồn | `calendar` | Giá & tồn › Lịch tháng | `PriceInventoryCalendar.tsx` (thay giao diện `DayCalendar`, giữ body và path ghi) | — |
| 7 Ưu đãi | `promotions` | Ưu đãi | `HotelPromotionsSection.tsx` | — |
| 8 Quy định | `policies` | Chính sách | `HotelPoliciesSection.tsx` | — |
| (admin) | `content` | — | `HotelContentReview.tsx` | ✓ |

Thanh trên mọi trang con (thay dòng chữ "… · Nội dung v · Giá/tồn v"): StatusPill trạng thái place · "Nội dung v{contentVersion}" · "Đã duyệt v{approved}" hoặc "Chưa duyệt" · "Giá/tồn v{commercialVersion}" · nút ghost "Tải lại dữ liệu". Có `isDemo` thì thêm pill neutral "Dữ liệu thử nghiệm (SYNTHETIC)". Giữ thông báo "Giá tham khảo không xác nhận Booking hoặc giữ phòng" ở `overview`, dạng alert info.

### 3.6 Cơ sở — Thông tin / Địa chỉ / Trạng thái duyệt
- **Thông tin** (`PUT profile`, dùng `Editor` → `FormSection` + `StickySaveBar`): *Nhận diện* (tên, loại lưu trú, mô tả ngắn ≤160 có đếm, mô tả chi tiết textarea 8 dòng) · **Tiện nghi & dịch vụ khách sạn** (cấp khách sạn: `identity.amenities`, `profile.services`), kiểu `CheckboxGroup` 3 cột ≥1024, mô tả "Áp dụng cho toàn khách sạn (hồ bơi, lễ tân, bãi đỗ xe…). Tiện nghi trong phòng khai báo ở mục Phòng." Không đánh dấu dịch vụ tùy chọn là "đã bao gồm".
- Chính sách và giờ nhận/trả phòng **chuyển sang trang Chính sách** về mặt hiển thị. Payload vẫn là toàn bộ `profile(s)` như cũ, nên hai trang ghi cùng một endpoint mà không mất dữ liệu.
- **Địa chỉ** (`PUT address`): *Địa chỉ* (số nhà, đường, phường/xã, khu vực hành chính, tỉnh/thành*, địa danh du lịch) · *Tọa độ* (vĩ độ, kinh độ, nguồn địa chỉ*) + hint giữ nguyên câu hiện có "Không tự điền tọa độ…". Chưa có bản đồ (để 21.41).
- **Trạng thái duyệt:** thẻ tình trạng (StatusPill + "Nội dung v{n} đã gửi/chưa gửi") · nút "Gửi nội dung hiện tại để duyệt" (primary, ConfirmDialog: "Bản v{n} sẽ được gửi cho quản trị viên. Khách sạn chỉ thay đổi trên trang công khai sau khi được duyệt.") · `AuditList` từ `s.audit` (quyết định, lý do, thời điểm).

### 3.7 Hình ảnh — `…/media`
- `ImageDropzone multiple` (JPEG/PNG/WebP, ≤10 MiB/ảnh). Thả nhiều file → **hàng chờ tải lên**, mỗi dòng: thumbnail 64 (object URL cục bộ) · tên file · "Ảnh thuộc" (Khách sạn / từng hạng phòng) · Mô tả ảnh (alt)* · Quyền sử dụng ("Tôi có quyền sử dụng" / "Ảnh do tôi sở hữu") · trạng thái (Chờ · Đang tải · Xong · Lỗi + thông điệp server) · nút bỏ. Nút "Tải lên N ảnh" chỉ bật khi mọi dòng có alt.
- **Tải lần lượt từng ảnh** bằng đúng lời gọi hiện có (`POST …/media?rights&altText&roomTypeId`, body octet-stream, `If-Match`). Ảnh xong thì `await load()` để lấy `revision` mới rồi mới gửi ảnh kế tiếp, tránh lỗi If-Match. Một ảnh lỗi không dừng các ảnh còn lại.
- **Thư viện:** `BoTabs` lọc Tất cả · Khách sạn · {từng hạng phòng} (theo `roomTypeId`, không trộn ảnh phòng). Lưới card 4/4/3/2/2 cột, khoảng cách 16 (mobile 8). Card: ảnh 4:3 (`MediaPicture`, giữ cơ chế blob) · badge "Ảnh bìa" (nền `--hg-primary`, chữ trắng 12) ở góc trên trái khi `position===0` · StatusPill (Chờ duyệt/Đã duyệt/Bị từ chối/Đã lưu trữ) · alt 13, 2 dòng · dòng "Quyền: …" 12 muted · ảnh bị từ chối có thêm lý do (nếu API trả). Menu ⋯: "Đặt làm ảnh bìa" (`put {position:0}`) · "Sửa mô tả" (dialog 480 có ô alt, thay cho `prompt`) · "Lưu trữ ảnh" (ConfirmDialog danger, không cần lý do).
- **Sắp xếp:** mỗi card có nút ← → (32, `aria-label`) gửi `put {position:n}`. **Chỉ bật khi xác nhận API nhận `position` bất kỳ** (6.4), nếu chưa thì chỉ có "Đặt làm ảnh bìa". **Caption** và **nhóm ảnh** (sảnh, hồ bơi, nhà hàng…) chưa có trường trong API, nên chưa vẽ (6.4).
- Rỗng: EmptyState "Chưa có ảnh" + "Ảnh rõ nét giúp khách quyết định nhanh hơn. Chỉ tải ảnh bạn có quyền sử dụng."

### 3.8 Phòng — `…/rooms[?edit=<id>|new]`
- Bảng: Ảnh (ảnh đầu tiên của phòng, 64×48) · Hạng phòng (primary) · Sức chứa ("2 NL · 1 TE") · Diện tích · Hướng nhìn · Giá gói từ (`baseAmountVnd` của gói đầu, "Chưa có gói giá" khi thiếu; nhãn "₫/phòng/đêm") · Trạng thái · "Sửa". Nút "Thêm hạng phòng" (primary).
- `?edit=` mở `DetailDrawer lg` chứa `RoomForm` (vẫn là `Editor` với `freshRoom()`/`roomInput()`, `write('rooms[/id]', post|put)`):
  1. *Thông tin cơ bản:* tên*, mô tả*, diện tích m², trạng thái (Bản nháp / Đang áp dụng / Đã lưu trữ). Hint "Phòng đã có đơn thì lưu trữ, không xóa".
  2. *Sức chứa & giường:* tổng sức chứa, người lớn tối đa, trẻ em tối đa, số phòng ngủ, số phòng tắm, cấu hình giường (danh sách loại giường + số lượng, "+ Thêm giường"), giường phụ (`TriStateField`).
  3. *Đặc điểm phòng:* hướng nhìn (select `views`), ban công, cửa sổ, bếp, phòng tắm riêng, đều là `TriStateField` Có/Không/**Chưa rõ** (giữ `null` = chưa rõ, không ép thành Không).
  4. **Tiện nghi trong phòng** (cấp phòng, `amenities` 15 mã) dạng `CheckboxGroup` 3 cột (mobile 2) với nhãn tiếng Việt: Wi-Fi, TV, Máy lạnh, Tủ lạnh, Minibar, Bồn tắm, Vòi sen, Máy sấy tóc, Bếp, Ban công, Bàn làm việc, Hồ bơi riêng, Két sắt, Khăn tắm, Phòng tắm hỗ trợ người khuyết tật. Mô tả "Chỉ có trong hạng phòng này".
  - Footer drawer = `StickySaveBar`. Đóng drawer khi còn thay đổi chưa lưu thì hỏi "Bỏ thay đổi chưa lưu?".

### 3.9 Giá & tồn phòng
**a) Lịch tháng — `…/calendar`** (`PriceInventoryCalendar`)
```
Toolbar: [Hạng phòng ▾] [Gói giá ▾ (lọc theo hạng phòng)]   ‹  Tháng 11/2026  ›  [Hôm nay]     Chú giải
┌────┬────┬────┬────┬────┬────┬────┐ ┌─ Panel "Cập nhật 12/11 – 18/11 · 7 đêm" (360, sticky) ─┐
│ T2 │ T3 │ T4 │ T5 │ T6 │ T7 │ CN │ │ Tồn phòng — Deluxe            [✓ áp dụng]       │
├────┼────┼────┼────┼────┼────┼────┤ │ Số phòng bán được [ 5 ]  Đã đặt cao nhất: 3      │
│ 12 │ 13 │    │    │    │    │    │ │ ( ) Mở bán  ( ) Đóng bán         [Lưu tồn phòng] │
│1.250k  …                          │ │ Giá — Gói linh hoạt           [✓ áp dụng]       │
│Bán 5·Đặt 2·Còn 3                  │ │ Giá ₫/phòng/đêm [ 1.250.000 ]                     │
└───────────────────────────────────┘ │ ( ) Mở bán  ( ) Đóng bán         [Lưu giá]       │
                                      └──────────────────────────────────────────────────┘
```
- Lưới 7 cột, thứ Hai đầu tuần, tiêu đề cột cao 36 (13/600 muted). Ô ngày cao tối thiểu 96 (≥1280), 84 (1024), 72 (768, chỉ còn giá + "Còn N"), padding 8, viền `--hg-border`. Ngày ngoài tháng để trống.
- Nội dung ô: số ngày 13/600 · **giá** 14/600 dạng rút gọn "1.250k" (tooltip và `aria-label` có số đầy đủ "1.250.000 ₫"), thiếu thì "Chưa có giá" 12 muted · **tồn** 12–13: "Bán 5 · Đặt 2 · Còn 3" (Đặt = `allocatedQuantity`, **chỉ đọc**, tooltip "Hệ thống tự ghi khi có đơn; không chỉnh tay") · trạng thái:
  - Đóng bán (phòng hoặc giá): nền `--hg-surface-muted` + pill danger sm "Đóng bán" (tooltip ghi rõ đóng phần nào).
  - Hết phòng (còn 0): pill warning "Hết phòng".
  - Chưa thiết lập: viền nét đứt, chữ "Chưa thiết lập".
  - Ngày đã qua: mờ 50%, không chọn được.
  - Hôm nay: viền 2px `--hg-focus`.
- **Chọn ngày:** bấm 1 ngày; Shift+bấm hoặc kéo để chọn khoảng; bàn phím (lưới có `role="grid"`): mũi tên di chuyển, Shift+mũi tên mở rộng, Enter/Space chọn. Ô đã chọn: nền `--hg-primary-50`, viền `--hg-primary`. Tối đa 90 đêm (giới hạn API). Vượt quá thì báo ngay trên panel.
- **Panel cập nhật** (≥1280: cột phải 360 sticky; 1024–1279: drawer sm; <1024: bottom sheet): hiện "Đêm cuối: 18/11 (khách trả phòng 19/11)". Khoảng chọn là các đêm tính cả 2 đầu; khi gửi thì `to = đêm cuối + 1 ngày` đúng như `DayCalendar` (kết thúc không bao gồm). Hai khối độc lập, mỗi khối có checkbox "Áp dụng" và nút lưu riêng:
  - *Tồn phòng:* `sellableQuantity` (số ≥0). Hiện "Đã đặt cao nhất trong khoảng: N" và **chặn lưu nếu nhỏ hơn N** ("Không thể thấp hơn số phòng đã đặt"; server vẫn là nơi kiểm cuối) + Mở/Đóng bán → `write('rooms/{roomId}/inventory','put',{days:[{stayDate, sellableQuantity, closed, expectedVersion}]})`.
  - *Giá:* `amountVnd` (≥0, định dạng nghìn khi nhập) + Mở/Đóng bán → `write('rates/{rateId}/calendar','put',{days:[{stayDate, amountVnd, closed, expectedVersion}]})`.
  - `expectedVersion` lấy theo từng ngày từ `s.inventory`/`s.nightly`, giữ nguyên cách làm hiện tại. Lỗi 409 → `ConflictBanner`. Lưu xong toast "Đã cập nhật N ngày" và `load()`.
- **<768 (agenda):** danh sách ngày, mỗi dòng cao 64: "T4 12/11" · giá · "Còn 3/5" · pill. Bấm để chọn, giữ lâu (hoặc nút "Chọn nhiều") để chọn khoảng. Panel ở bottom sheet.
- Chú giải (≥1024 trên toolbar, mobile trong menu ⓘ): Đóng bán · Hết phòng · Chưa thiết lập · Hôm nay.
- Không tính hay hiện tổng tiền lưu trú ở client.

**b) Gói giá — `…/rates[?edit=]`**
- Bảng: Tên (primary) · Hạng phòng · Giá cơ sở ("1.250.000 ₫/phòng/đêm") · Bữa ăn · Hủy phòng ("Không hoàn tiền" / "Miễn phí trước N giờ") · Hiệu lực (từ–đến) · Trạng thái · "Sửa".
- Drawer lg `RateForm` (vẫn là `freshRate()`/`entityInput()`): *Cơ bản* (tên*, hạng phòng*, giá cơ sở VND*, hiệu lực từ–đến) · *Thời gian lưu trú* (tối thiểu/tối đa đêm) · *Người & trẻ em* (người lớn bao gồm, phụ thu người lớn/đêm, chính sách trẻ em, các khoảng tuổi trẻ em) · *Bữa ăn* · *Hủy phòng* (loại, số giờ trước hạn, điều khoản) · *Thuế & phí* (cách tính thuế, tỉ lệ, các phí, "Đã biết đủ phí bắt buộc"). Đơn vị giá luôn ghi rõ "VND · theo phòng/đêm". Có link "Sửa giá theo ngày" → `…/calendar` (chọn sẵn gói này).

### 3.10 Ưu đãi — `…/promotions[?edit=]`
- Danh sách: ưu tiên `GET /partner/hotels/:id/promotions` (PAC §4.1, có `effective`). Chưa có thì dùng `s.promotions` sẵn có trong dữ liệu khách sạn, nên **trang chạy được ngay**. Cột: Tên · Mức giảm · Phạm vi · Thời gian đặt · Thời gian lưu trú · Tối thiểu đêm · Trạng thái (+ Hiệu lực nếu API trả). Không tự tính "Đang hiệu lực" bằng giờ máy người dùng.
- Drawer md form (giữ payload hiện có): *Thông tin* (tên*, trạng thái Bản nháp/Đang áp dụng/Đã kết thúc) · *Mức giảm* (`kind`: "Giảm theo %" → ô % nhận 2 số lẻ, đổi ra bps như cũ; "Giảm số tiền cho cả kỳ" → VND; "Giảm tối đa" VND, để trống là không giới hạn) · *Phạm vi* (Toàn khách sạn / Hạng phòng / Gói giá; gói giá lọc theo hạng phòng đã chọn) · *Thời gian đặt* (bắt đầu–kết thúc, giờ VN) · *Thời gian lưu trú* (từ–đến) · *Điều kiện* (tối thiểu N đêm). Ghi chú cố định: "Việc áp dụng, cộng dồn và hết hạn ưu đãi do máy chủ quyết định theo giờ máy chủ."
- "Kết thúc ưu đãi" = lưu `status:'ARCHIVED'` (ConfirmDialog). Không xóa cứng. Không hiện giá gạch hay "giảm sốc" ở bất cứ đâu.

### 3.11 Đơn đặt — `/partner/bookings[/:id]`
Làm lại `PartnerBookingsPage`, giữ `ManagementService.partnerBookings/partnerBooking/partnerBookingStatus`.
- PageHeader "Đơn đặt" + select Business khi không suy ra được từ switcher (3.2).
- FilterBar: "Tìm mã, khách hoặc khách sạn" (giữ `aria-label="Tìm booking"`, maxLength 120) · Trạng thái (giữ `aria-label="Lọc trạng thái booking"`) · tab nhanh Chờ xác nhận · Đã xác nhận · Hoàn thành · Đã hủy/Từ chối · Tất cả. Gửi lọc lên server như hiện tại.
- Bảng: Mã (primary) + khách 13 muted · Dịch vụ/hạng phòng · Nhận → trả phòng · Số phòng/khách · Tổng tiền (chỉ đọc) · Trạng thái · "Xem".
- Drawer lg `/partner/bookings/:id`: `HotelBookingSummary partner` (chỉ dùng) · Khách & liên hệ · Thanh toán (chữ) · Lịch sử (nếu có). Footer theo lifecycle (`PENDING→CONFIRMED|REJECTED`, `CONFIRMED→COMPLETED`):
  - `PENDING`: "Từ chối" (danger, lý do bắt buộc, impact "Phòng giữ cho đơn được trả lại") · "Xác nhận đơn" (primary).
  - `CONFIRMED`: "Đánh dấu hoàn thành" (primary). Impact: "Chỉ hợp lệ sau ngày trả phòng; máy chủ sẽ từ chối nếu chưa đến hạn". Lỗi server hiện nguyên văn.
  - Trạng thái khác: không có nút. Không có ô sửa tổng tiền, thanh toán hay số phòng đã phân bổ.

### 3.12 Đánh giá — `/partner/reviews` (PAC §5, cờ `partnerReviews`)
- Đầu trang: 3 ô KPI lấy từ `summary` của API: Số đánh giá · Điểm trung bình (1 chữ số lẻ, "/5") · Chưa phản hồi. Không tự tính thêm điểm hạng mục.
- FilterBar: Khách sạn (mặc định khách sạn đang chọn → `placeId`) · Đã phản hồi/Chưa phản hồi · Từ N sao.
- Danh sách dạng card (không dùng bảng), mỗi card padding 20: sao (icon 16 `--hg-star`) + điểm · tên khách (API chỉ trả tên hiển thị) · pill "Đã lưu trú" nếu `VERIFIED` · ngày · nội dung 14/1.6 · khối **Phản hồi của cơ sở** (nền `--hg-surface-muted`, viền trái 3px `--hg-primary`, "bởi … · ngày").
- Hành động: "Phản hồi" / "Sửa phản hồi" mở ô textarea ngay trong card (1–2000 ký tự, văn bản thuần, đếm ký tự) → `PUT …/reply`. "Xóa phản hồi" có ConfirmDialog → `DELETE …/reply`. **Không** có nút sửa/xóa đánh giá của khách. "Báo cáo vi phạm" chưa có endpoint cho Partner (API hiện chỉ cho CUSTOMER) nên chưa vẽ (6.3).
- Gán đánh giá theo hạng phòng (room attribution) chỉ hiện khi API trả; không suy đoán phòng.

### 3.13 Chính sách — `…/policies`
`PUT profile` (giữ toàn bộ `profile(s)`): *Giờ nhận/trả phòng* (2 ô time) · *Trẻ em & giường phụ* · *Thú cưng* · *Hút thuốc* · *Quy định chung*. Mỗi ô là textarea 4 dòng, hint ví dụ ngắn. Giá trị mặc định "Chưa cung cấp" hiện dạng placeholder, không lưu thành nội dung thật. Chính sách hủy theo từng gói giá nằm ở Gói giá, có dòng dẫn "Chính sách hủy cấu hình theo từng gói giá → Gói giá".

### 3.14 Dịch vụ khác — `PartnerResourceListPage` / `PartnerResourceFormPage`
Chỉ đổi giao diện: PageHeader + DataTable + StatusPill + FormSection + StickySaveBar. Thay `confirm()` bằng ConfirmDialog. Giữ route `:resource`, lời gọi API và nút "Gửi duyệt".

---

## 4. Ánh xạ file và hợp đồng giữa 2 gói

### 4.1 Ánh xạ

| # | Thay đổi | File | Gói |
|---|---|---|---|
| E0 | **Làm đầu tiên (ngày 1):** token back-office, shell, toàn bộ component 1.3 (có thể làm bản chạy tối thiểu trước, đúng props) + `features.ts` | `src/styles/hg-backoffice.css` (mới), `src/components/backoffice/{BackofficeShell,PageHeader,BoTabs,BoButton,KpiTile,DataTable,FilterBar,StatusPill,DetailDrawer,ConfirmDialog,AuditList,FormSection,fields,StickySaveBar,States,Toast,ImageDropzone,statusLabels,features,index}.tsx/ts` (mới) | E |
| E1 | Admin layout dùng shell, menu 2.1, badge | `layouts/AdminLayout.tsx` | E |
| E2 | Dashboard | `pages/admin/AdminDashboardPage.tsx` | E |
| E3 | Hồ sơ đối tác + drawer `/:id` | `pages/admin/PartnerApplicationsPage.tsx` | E |
| E4 | Cơ sở kinh doanh | `pages/admin/AdminBusinessesPage.tsx` (mới) | E |
| E5 | Khung kiểm duyệt khách sạn | `pages/admin/AdminHotelModerationPage.tsx` (mới) | E |
| E6 | Kiểm duyệt Place/Tour/Blog | `pages/admin/AdminModerationPage.tsx` | E |
| E7 | Booking | `pages/admin/AdminBookingsPage.tsx` (mới) | E |
| E8 | Đánh giá & báo cáo | `pages/admin/AdminReviewsPage.tsx` (mới) | E |
| E9 | Người dùng & vai trò | `pages/admin/AdminUsersPage.tsx` (mới) | E |
| E10 | CMS (banner list, sections, featured) | `pages/admin/AdminCmsPage.tsx`, `pages/admin/cms/{BannerList,SectionsManager,FeaturedHotelsManager,BannerPreview,HotelPickerDialog}.tsx` (mới) | E |
| E11 | Form banner | `pages/admin/AdminBannerEditorPage.tsx` (mới) | E |
| E12 | Ưu đãi | `pages/admin/AdminPromotionsPage.tsx` (mới) | E |
| E13 | Cài đặt | `pages/admin/AdminSettingsPage.tsx` (mới) | E |
| E14 | Placeholder giữ làm dự phòng, chỉ đổi style sang EmptyState | `pages/admin/AdminSectionPage.tsx` | E |
| E15 | Route Admin **và** Partner (4.3) | `router/AppRouter.tsx` (vùng VÀNG, chỉ thêm dòng) | E (thêm hộ F) |
| F1 | Partner layout dùng shell, menu 3.1 | `layouts/PartnerLayout.tsx` | F |
| F2 | Switcher | `src/components/partner/PropertySwitcher.tsx` (mới) | F |
| F3 | Dashboard | `pages/partner/PartnerDashboardPage.tsx` | F |
| F4 | **Ngày 1:** HMP đọc `:hotelId/:section` + prop `embedded`; sau đó tách trang con và làm lại cả nhánh admin | `pages/partner/HotelManagementPage.tsx`, `pages/partner/hotel/*` (mới, các file ở bảng 3.5) | F |
| F5 | Onboarding | `pages/partner/PartnerHotelOnboardingPage.tsx` (mới) | F |
| F6 | Đơn đặt | `pages/partner/PartnerBookingsPage.tsx` | F |
| F7 | Đánh giá | `pages/partner/PartnerReviewsPage.tsx` (mới) | F |
| F8 | Dịch vụ khác | `pages/partner/PartnerResourceListPage.tsx`, `PartnerResourceFormPage.tsx`, `PartnerSectionPage.tsx` | F |
| F9 | CSS riêng Partner (lịch, lưới ảnh, stepper) | `src/styles/hg-partner.css` (mới, tiền tố `hgp-`, biến riêng `--hgp-*`) | F |

### 4.2 Hợp đồng dùng chung (không sửa file của gói kia)

| Thành phần | Chủ | Gói kia được làm gì |
|---|---|---|
| `components/backoffice/*`, `hg-backoffice.css`, `features.ts` | E | F chỉ import qua `components/backoffice/index.ts`. Cần prop mới thì nhờ E. Không chờ được thì F bọc component trong file của F, **không sửa file của E** |
| Props 1.2/1.3 | E | **Cố định từ ngày 1.** E có thể làm bản tối thiểu trước, F code theo props ngay |
| `HotelManagementPage` + `pages/partner/hotel/*` | F | E chỉ render `<HotelManagementPage admin embedded/>` trong `AdminHotelModerationPage`. **F làm prop `embedded` và đọc URL params ngày 1.** Prop mặc định giữ hành vi cũ, nên route cũ `/partner/hotels` vẫn chạy |
| `AppRouter.tsx` | E | F gửi danh sách route cho E (đã chốt ở 4.3). F không sửa file này |
| `HotelBookingSummary`, `HotelPriceBreakdown` (Gói B) | B | E và F chỉ dùng, không sửa |
| `ReviewModerationPanel` (dùng ở Profile, Gói D) | D | E không sửa, trang Admin gọi API trực tiếp |
| `TravelWebPage`, `LanguageLexiconPage`, `TravelKnowledgeReview` | Vùng AI | Không ai sửa. Shell không đặt CSS ảnh hưởng tới nội dung các trang này |
| `services/*`, `AuthContext`, `ProtectedRoute` | Không ai sửa | Gọi API mới trong PAC bằng `api` sẵn có, đặt trong file trang hoặc `pages/admin/api.ts` (E) / `pages/partner/hotel/api.ts` (F) |
| `hg-tokens.css` | A | Chỉ đọc |

**Thứ tự merge:** (1) E0 + route 4.3 + F4-ngày-1 → (2) E1/F1 layout → (3) các trang song song → (4) bật cờ `BO_FEATURES` từng mục khi backend PAC đã có và đã chạy thật với DB.

### 4.3 Dòng thêm vào `AppRouter.tsx` (Gói E thực hiện, gồm cả route Partner)

**(a) Thêm sau dòng 49** (`const HotelManagementPage=…`):
```tsx
const AdminHotelModerationPage=React.lazy(()=>import('../pages/admin/AdminHotelModerationPage').then(m=>({default:m.AdminHotelModerationPage})));
const AdminBusinessesPage=React.lazy(()=>import('../pages/admin/AdminBusinessesPage').then(m=>({default:m.AdminBusinessesPage})));
const AdminBookingsPage=React.lazy(()=>import('../pages/admin/AdminBookingsPage').then(m=>({default:m.AdminBookingsPage})));
const AdminReviewsPage=React.lazy(()=>import('../pages/admin/AdminReviewsPage').then(m=>({default:m.AdminReviewsPage})));
const AdminUsersPage=React.lazy(()=>import('../pages/admin/AdminUsersPage').then(m=>({default:m.AdminUsersPage})));
const AdminCmsPage=React.lazy(()=>import('../pages/admin/AdminCmsPage').then(m=>({default:m.AdminCmsPage})));
const AdminBannerEditorPage=React.lazy(()=>import('../pages/admin/AdminBannerEditorPage').then(m=>({default:m.AdminBannerEditorPage})));
const AdminPromotionsPage=React.lazy(()=>import('../pages/admin/AdminPromotionsPage').then(m=>({default:m.AdminPromotionsPage})));
const AdminSettingsPage=React.lazy(()=>import('../pages/admin/AdminSettingsPage').then(m=>({default:m.AdminSettingsPage})));
const PartnerHotelOnboardingPage=React.lazy(()=>import('../pages/partner/PartnerHotelOnboardingPage').then(m=>({default:m.PartnerHotelOnboardingPage})));
const PartnerReviewsPage=React.lazy(()=>import('../pages/partner/PartnerReviewsPage').then(m=>({default:m.PartnerReviewsPage})));
```

**(b) Dòng 61 (Admin), thay đúng 1 phần tử (thay đổi không-additive duy nhất):**
`<Route path="hotels" element={<HotelManagementPage admin/>}/>` →
```tsx
<Route path="hotels" element={<AdminHotelModerationPage/>}/><Route path="hotels/:hotelId" element={<AdminHotelModerationPage/>}/><Route path="hotels/:hotelId/:section" element={<AdminHotelModerationPage/>}/>
```
**(c) Dòng 61, chèn ngay trước** `<Route path=":section" element={<AdminSectionPage/>}/>`:
```tsx
<Route path="partner-applications/:id" element={<PartnerApplicationsPage/>}/><Route path="businesses" element={<AdminBusinessesPage/>}/><Route path="businesses/:id" element={<AdminBusinessesPage/>}/><Route path="bookings" element={<AdminBookingsPage/>}/><Route path="bookings/:code" element={<AdminBookingsPage/>}/><Route path="reviews" element={<AdminReviewsPage/>}/><Route path="users" element={<AdminUsersPage/>}/><Route path="users/:id" element={<AdminUsersPage/>}/><Route path="cms" element={<AdminCmsPage/>}/><Route path="cms/:tab" element={<AdminCmsPage/>}/><Route path="cms/banners/new" element={<AdminBannerEditorPage/>}/><Route path="cms/banners/:id" element={<AdminBannerEditorPage/>}/><Route path="promotions" element={<AdminPromotionsPage/>}/><Route path="settings" element={<AdminSettingsPage/>}/>
```
**(d) Dòng 62 (Partner), chèn ngay sau** `<Route path="hotels" element={<HotelManagementPage/>}/>`:
```tsx
<Route path="hotels/new" element={<PartnerHotelOnboardingPage/>}/><Route path="hotels/:hotelId/setup" element={<PartnerHotelOnboardingPage/>}/><Route path="hotels/:hotelId" element={<HotelManagementPage/>}/><Route path="hotels/:hotelId/:section" element={<HotelManagementPage/>}/><Route path="reviews" element={<PartnerReviewsPage/>}/>
```
Ghi chú xếp hạng route (react-router v6): đoạn tĩnh được điểm cao hơn đoạn động. Vì vậy `hotels/new` thắng `:resource/new`, `hotels/:hotelId` thắng `:resource/:id`, `reviews` thắng `:resource`, `bookings`/`users`/`settings`… thắng `:section`. Route đặt **trước** `:resource/*` để thắng khi bằng điểm. Hệ quả cần biết: `/partner/hotels/:id` không còn rơi vào `PartnerResourceFormPage`. Không đổi `ProtectedRoute`. AppRouter thuộc vùng VÀNG, nên gửi diff cho AI owner trước khi merge.

---

## 5. Checklist nghiệm thu theo viewport

**Cách kiểm:** như design spec mục 7, dùng trình duyệt thật với DB SYNTHETIC (không dùng mock). Ảnh lưu `docs/evidence/web-design-v1/backoffice/{trang}-{viewport}.png`.

### 5.1 Chung (mọi trang, mọi viewport)
- [ ] Không cuộn ngang trang (`scrollWidth <= innerWidth`). Bảng rộng chỉ cuộn trong khung bảng.
- [ ] Không chữ nội dung < 12px. Tiếng Việt có dấu, không lộ mã tiếng Anh (`PENDING`, `PER_ROOM_NIGHT`, `PERCENT_BPS`…) khi đã có nhãn.
- [ ] Không có số giả: không ô doanh thu; KPI thiếu dữ liệu hiện "—"; trang ❌ API hiện `ApiPendingState`, không có dữ liệu mẫu.
- [ ] Mọi thao tác nhạy cảm mở `ConfirmDialog`; nút xác nhận khóa đến khi lý do hợp lệ; không còn `window.prompt/confirm` (kiểm bằng grep).
- [ ] Admin không có nút sửa tổng tiền, đánh dấu đã thanh toán, hoàn thành đơn, chỉnh số phòng đã phân bổ, xóa đơn.
- [ ] Tab qua toàn trang thấy viền focus rõ. Drawer/dialog/menu điều hướng có focus trap, Esc đóng và trả focus đúng chỗ.
- [ ] Màu chỉ lấy từ token: grep `#0b1f3a|#063b3b|#142e50|cyan-|teal-` trong file của E/F phải rỗng.
- [ ] 2 trang AI (`/admin/travel-web`, `/admin/language-lexicon`) hiển thị và thao tác như trước. Hash 257 file vùng AI khớp `protected-baseline.sha256`.
- [ ] Đổi khách sạn ở switcher giữ nguyên mục đang xem; reload vẫn giữ ngữ cảnh (URL).
- [ ] Lỗi 409/If-Match hiện `ConflictBanner`, có "Tải lại".

### 5.2 Theo viewport

| Mục kiểm | 1440 | 1280 | 1024 | 768 | 390 |
|---|---|---|---|---|---|
| Sidebar | 248, nhãn nhóm + mục | 248 | rail 72, tooltip khi hover/focus | ẩn; ☰ mở drawer 280 | ẩn; drawer 280 (≤86vw) |
| Topbar | 64, breadcrumb đầy đủ, "Xem website" có chữ, pill vai trò | như 1440 | như 1440; switcher 240 | breadcrumb rút gọn; switcher 200 | 56; chỉ tên trang; "Xem website" là icon 44; switcher ≤160 |
| Vùng nội dung | pad 24, tối đa 1360 | pad 24 (rộng 984) | pad 24 (rộng 904) | pad 24 | pad 16 |
| PageHeader | H1 24, nút bên phải | ✔ | ✔ | ✔ | H1 20, nút xuống dòng, ≤2 nút + ⋯ |
| KPI "Việc cần xử lý" / "Quy mô" | 5 / 4 cột | 5 / 4 | 3 / 3 | 2 / 2 | 2 / 2, số 24 |
| DataTable | đủ cột | ẩn cột `hideBelow:1280` | ẩn `1280` | ẩn `1024`, cột primary dính trái | dạng card, hành động 44 |
| FilterBar | 1 hàng | 1 hàng | xuống dòng được | xuống dòng | ô tìm + "Bộ lọc (n)" → sheet 80dvh |
| DetailDrawer lg/md | 880 / 640 | 880 / 640 | `100vw-72` / 640 | full rộng | full màn hình |
| ConfirmDialog | 480 giữa màn hình | ✔ | ✔ | ✔ | bottom sheet, nút 44 |
| Banner editor | form + preview 2 cột, preview sticky | 2 cột | preview dưới form | tab Nội dung/Xem trước/Lịch sử | như 768 |
| Preview banner | desktop 1440×440 thu nhỏ; mobile 390×260 | ✔ | ✔ | ✔ | ✔, không tràn |
| Sections CMS | danh sách + sơ đồ 320 | ✔ | không có sơ đồ | ✔ | ↑↓ và switch ≥44 |
| Lịch giá/tồn | lưới 7 cột ô 96 + panel phải 360 | lưới + panel 360 | ô 84, panel drawer | ô 72 (giá + còn), bottom sheet | agenda từng ngày 64, bottom sheet |
| Lưới ảnh | 4 cột | 4 cột | 3 cột | 2 cột | 2 cột, gap 8 |
| Stepper onboarding | ngang, có nhãn | ngang | ngang, có nhãn | chỉ vòng tròn + nhãn bước hiện tại | "Bước n/6" + thanh tiến độ |
| Toast | góc dưới phải 360 | ✔ | ✔ | ✔ | đáy, rộng 100%-32 |

### 5.3 Trạng thái phải chụp minh chứng
- [ ] Mỗi bảng: loading (skeleton), rỗng, lỗi + "Thử lại", có dữ liệu, drawer mở.
- [ ] Dashboard Admin khi API lỗi; ô đánh giá khi máy chủ trả 503.
- [ ] Hồ sơ đối tác: dialog Từ chối khi chưa nhập lý do (nút khóa) và khi lỗi server.
- [ ] Kiểm duyệt khách sạn: danh sách có pill "Có thay đổi chờ duyệt"; bảng so sánh; lịch sử quyết định.
- [ ] Booking Admin: tìm mã đúng/sai; drawer đơn CONFIRMED có nút Hủy; đơn COMPLETED không có nút.
- [ ] Mỗi trang ❌: `ApiPendingState` khi cờ tắt.
- [ ] CMS (khi có API): banner nháp → xem trước desktop/mobile → xuất bản có lịch → trang chủ đổi sau reload; khôi phục revision; lỗi `CMS_FEATURED_NOT_ELIGIBLE`.
- [ ] Partner: onboarding lúc chưa có Business; bước 3 thiếu tọa độ; khách sạn bị từ chối có lý do; lịch chọn 7 đêm; lưu tồn thấp hơn số đã đặt (bị chặn); tải 3 ảnh trong đó 1 ảnh lỗi; ưu đãi chuyển sang Đã kết thúc; đơn PENDING xác nhận/từ chối.

---

## 6. Điểm cần điều phối / chủ dự án chốt

1. **Bỏ ô doanh thu** ở cả dashboard Admin (`totalRevenue`) và Partner (`revenue`): UI không hiện nữa, API giữ nguyên. Cần chủ dự án đồng ý.
2. **API admin còn thiếu so với nghiệp vụ** (bổ sung vào PAC §8): lọc `/admin/bookings` theo `status/search/from/to/placeId/businessId`; chi tiết booking có `statusHistory`; `GET /admin/businesses/:id` + bookings; tạm ngưng Business. Chưa có thì UI chỉ tìm theo mã và phân trang (2.4, 2.7).
3. **Chưa có trong PAC nên UI chưa vẽ:** (a) placement ưu đãi lên trang chủ (đề xuất: `cms_sections.offers.config.promotionIds`, kiểm `eligible` như featured); (b) Partner báo cáo vi phạm đánh giá; (c) nội dung Điều khoản/Chính sách trong Cài đặt; (d) số liệu "booking theo ngày" và lọc khoảng ngày cho dashboard; (e) thông báo in-app (PAC §7): khi được duyệt thì thêm chuông 40×40 trên topbar, cạnh "Xem website".
4. **Ảnh:** PAC chưa có endpoint tải ảnh banner CMS (chỉ nhận đường dẫn có sẵn). Cần chọn: thêm `POST /api/admin/cms/media`, hoặc tạm thời chỉ cho chọn ảnh static có manifest. Với ảnh khách sạn: xác nhận `PUT …/media/:id {position:n}` nhận số bất kỳ (để sắp xếp); `caption` và nhóm ảnh (sảnh/hồ bơi/…) cần trường mới. Chưa có thì chỉ có "Đặt làm ảnh bìa" và alt.
5. **Preview banner:** E tự làm `BannerPreview` theo kích thước design spec 4.4 (có thể lệch nếu Gói A đổi hero). Phương án tốt hơn: Gói A tách `HomeHero` thành component nhận props `banner`, E dùng lại. Cần Gói A đồng ý.
6. **Context Business ↔ khách sạn ở Partner:** `GET /partner/hotels` chỉ trả `businessName`, không trả `businessId`. Đề xuất thêm `businessId` (additive) để switcher suy ra Business chính xác. Chưa có thì giữ select Business riêng ở Tổng quan/Đơn đặt.
7. **Nhận diện Partner:** chuyển từ teal sang navy chung với Admin. Vị trí mục "Chính sách": theo đúng thứ tự yêu cầu (sau Đánh giá) hay gom cuối nhóm Khách sạn.
8. **AppRouter:** một thay đổi không-additive (`hotels` admin → `AdminHotelModerationPage`) và việc `/partner/hotels/:id` không còn vào `PartnerResourceFormPage`. AI owner review diff vì đây là vùng VÀNG.
9. Mọi trang dùng API PAC chỉ bật cờ sau khi backend thật + migration 19 được duyệt và chạy trên DB SYNTHETIC. Mock `D:\ĐỒ ÁN A\mock-api` chỉ dùng khi dựng giao diện, không dùng để nghiệm thu.

### 6.1 Quyết định của điều phối (22/11/2026) — áp dụng cho đợt này
1. **Bỏ ô doanh thu** ở cả hai dashboard (bàn giao mục 5.2: doanh thu chỉ khi có căn cứ payment).
2. API admin còn thiếu (lọc booking, lịch sử trạng thái, chi tiết/tạm ngưng Business): giao diện dùng đúng API đang có; phần thiếu hiện trạng thái "chờ API", không bịa dữ liệu.
3. Hạng mục chưa có contract (ưu đãi lên trang chủ, Partner báo cáo review, điều khoản trong Cài đặt, booking theo ngày, upload ảnh banner, chú thích/nhóm ảnh): **hoãn**, không vẽ trong đợt này.
4. `businessId` trong `GET /partner/hotels`: ghi vào đề xuất API; giao diện chạy được khi thiếu (giữ select Business).
5. **Preview banner:** Gói E tự làm `BannerPreview`, KHÔNG sửa file Gói A (`HomeHero`). Được import component của Gói A nếu dùng nguyên props hiện có.
6. **Partner đổi sang navy**; mục "Chính sách" đặt **sau "Đánh giá"** đúng thứ tự bàn giao 7.2.
7. **AppRouter:** chấp nhận thay đổi `/admin/hotels` → `AdminHotelModerationPage` và route `/partner/hotels/:hotelId/:section`; ghi vào báo cáo để AI owner review (vùng VÀNG).
8. Mọi trang dùng API đề xuất (PAC) để sau cờ `BO_FEATURES`; dữ liệu mock chỉ dùng để dựng giao diện.
