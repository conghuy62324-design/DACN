# HUGO TRAVEL — BẢN THIẾT KẾ GIAO DIỆN WEB (DESIGN SPEC)

**Mã tài liệu:** `HUGO-WEB-DESIGN-SPEC-01` · **Ngày:** 21/11/2026 · **Vai trò soạn:** UI/UX designer
**Phạm vi:** website khách hàng (khung chung, Trang chủ, Danh sách khách sạn, Chi tiết khách sạn, Checkout).
**Người dùng tài liệu:** 2 lập trình viên — **Gói A** (Khung chung + Trang chủ) và **Gói B** (Danh sách + Chi tiết + Checkout).
**Trạng thái:** chờ chủ dự án duyệt (xem mục 8 — các quyết định cần duyệt).

> Đây là bản thiết kế, không phải code. Mọi số đo tính bằng px CSS ở viewport 1440 trừ khi ghi khác.
> Không đổi logic dữ liệu/API, không đổi nghiệp vụ Booking, không thiết kế lại khu chat AI.
> Không thêm số liệu giả: không lượt bán, không giá gạch, không review giả, không hotline giả, không "còn N phòng", không "N khách đã đặt hôm nay".

---

## Mục lục

1. Học được gì từ 3 site tham khảo
2. Đánh giá giao diện HuGo hiện tại
3. Design tokens (khối CSS dán sẵn)
4. Gói A — Khung chung + Trang chủ
5. Gói B — Danh sách kết quả + Chi tiết + Checkout
6. Bảng ánh xạ thay đổi → file, hợp đồng giữa 2 gói
7. Checklist nghiệm thu theo viewport
8. Quyết định cần chủ dự án duyệt

---

## 1. Học được gì từ 3 site tham khảo

**Cách khảo sát (21/11/2026):** dùng trình duyệt tích hợp, viewport 1366×900 và 390×844. Đo bằng `getBoundingClientRect` và `getComputedStyle`. Đã đóng các popup quảng cáo/đăng nhập bằng nút X hoặc phím Esc, không đăng nhập, không điền form, không tải ảnh. Không site nào hiện CAPTCHA, nên cả 3 site đều xem được.

| Site | Trang chủ | Kết quả tìm | Chi tiết KS | Mobile 390 |
|---|---|---|---|---|
| Booking.com (vi) | Xem được | Xem được (Đà Lạt) | Xem được | Kết quả tìm |
| Traveloka (vi-vn) | Xem được | Xem được (Vũng Tàu) | Xem được | Trang chủ |
| iVIVU | Xem được | Xem được (Đà Lạt) | Xem được | Trang chủ |

Chúng ta chỉ học bố cục, nhịp khoảng cách, phân cấp thông tin và pattern UX. Không lấy màu thương hiệu, logo, ảnh hay câu chữ của họ.

### 1.1 Booking.com — học cách bố trí kết quả tìm và bảng phòng

1. **Container hẹp, dễ quét: nội dung rộng 1100px.** Header 2 tầng cao tổng 124px: tầng thương hiệu 64px và tầng tab sản phẩm 60px (pill "Lưu trú" có viền). Ô tìm kiếm rộng 1100px, các trường cao ~51px, nút "Tìm" 90×51px chữ 20px. Ô tìm nằm đè lên mép dưới hero.
2. **Mọi H2 trên trang chủ đều 24px,** có 1 dòng phụ 14px màu xám. Các section cách nhau 300–650px theo chiều dọc, không dùng overline chữ hoa.
3. **"Điểm đến đang thịnh hành" là mosaic 2+3:** hàng 1 có 2 ô 545×270, hàng 2 có 3 ô 357×270, khoảng cách 16px, bo 8px. Tên thành phố 24px đậm đặt **góc trên trái** ảnh, chỉ có tên mà không có mô tả.
4. **Trang kết quả:** breadcrumb nằm ngay dưới thanh tìm. H1 20px dạng "Đà Lạt: tìm thấy N chỗ nghỉ". Sidebar 263px, trên cùng là ô "Hiển thị trên bản đồ", sau đó là "Ngân sách" (thanh trượt + histogram) và các nhóm checkbox có **số đếm bên phải**. Có nút chuyển "Xem ngang/Xem dọc".
5. **Card kết quả ngang 815×274:** padding 16, bo 8. Ảnh **240×240 đặt lùi vào trong card** (không tràn mép), bo 8, có nút tim ở góc. Tên 20px/700. Điểm review là ô vuông đặc ~32px ở **góc trên phải**, kèm nhãn chữ và số đánh giá. Cột giá căn phải: giá 20px, dòng "Đã bao gồm thuế và phí", nút "Xem chỗ trống" 143×36.
6. **Trang chi tiết:** thanh anchor tab ngay dưới breadcrumb (Tổng quan, Thông tin & giá, Tiện nghi, Quy tắc chung, Đánh giá). Gallery gồm ảnh chính ~553×360 bên trái, 2 ảnh chồng ~278×175 bên phải, một hàng 5 thumbnail ~110px và ô cuối "+89 ảnh". Cột phải 270px có ô điểm review, trích dẫn và bản đồ.
7. **Bảng phòng dạng table rộng 888px:** 4 cột "Loại chỗ nghỉ 390 · Giá cho N đêm 173 · Bữa ăn & chính sách 263 · Chọn số phòng 62" và cột CTA "Đặt chỗ" dính bên phải. Mỗi dòng chính sách có dấu tích xanh ("Hủy miễn phí trước …").
8. **Mobile 390:** dưới thanh tìm có thanh 3 nút "Sắp xếp · Lọc · Bản đồ", tiếp theo là một hàng chip lọc nhanh cuộn ngang. Card vẫn nằm ngang (ảnh ~128px bên trái), giá căn phải.
   *Không học:* "Chúng tôi còn 1 phòng", giá gạch, popup Genius/Black Friday che nội dung.

### 1.2 Traveloka — học tab dịch vụ trong ô tìm kiếm và carousel

1. **Ô tìm kiếm là một "card dịch vụ" bo ~12px rộng ~1234px, nằm giữa hero cao ~600px.** H1 32px/700 căn giữa phía trên. Header 2 tầng (~115px) trong suốt phủ lên hero.
2. **Hàng tab dịch vụ là các pill cao 36px, bo 20px,** gồm icon và nhãn 16px (Khách sạn, Vé máy bay, …). Tab đang chọn tô đặc màu chủ đạo, các tab khác chỉ có chữ. Bên dưới là các chip phụ 28px (Tất cả · Khách sạn · Biệt thự · Căn hộ). Cuối cùng là hàng trường nhập: nhãn nhỏ nằm **trên** trường, các trường dính liền thành một nhóm, nút tìm là ô vuông icon ~48px.
3. **Section dạng carousel ngang:** H2 24px. Một hàng chip thành phố (pill) đặt trên carousel để lọc. Mỗi lần thấy 4 card ~285px, ảnh ~170px, nhãn vị trí dạng pill phủ trên ảnh, nút mũi tên tròn 32px ở mép phải.
4. **Trang kết quả:** thanh tìm thu gọn 1 hàng dính dưới header. Sidebar ~250px gồm **nhiều card lọc riêng**: card bản đồ trên cùng, khoảng giá (thanh trượt + 2 ô số), lọc phổ biến, khu vực có số đếm. Mỗi nhóm thu gọn được bằng chevron.
5. **Toolbar trên danh sách có 2 dropdown pill:** "Xếp theo" và "Hiển thị giá: mỗi phòng mỗi đêm / tổng". Card có ảnh ~285px kèm chấm carousel. Hạng phòng khớp tiêu chí nằm trong khối nền xanh rất nhạt. Giá căn phải, có thêm dòng "Tổng … cho 1 phòng".
6. **Trang chi tiết:** thanh tìm thu gọn và hàng anchor tab (Tổng quan · Phòng · Vị trí · Tiện ích · Chính sách · Đánh giá) cùng dính trên cùng. Gallery có ảnh chính trái ~490×340 và lưới 2×3 bên phải, ô cuối phủ chữ "Xem tất cả hình ảnh". Dưới gallery là card tóm tắt (tên, sao, giá "từ" và nút "Chọn phòng" bên phải), tiếp theo là 3 card thông tin ngang (đánh giá · vị trí · tiện ích chính).
7. **Mỗi hạng phòng gồm ảnh trái và bảng phải:** các cột "Lựa chọn phòng · Khách · Giá/phòng/đêm · Phòng · Chọn". Phía trên có chip lọc nhanh ("Miễn phí hủy phòng") và lựa chọn cách hiển thị giá.
8. **Mobile:** ô tìm kiếm nằm trong header. Dịch vụ hiển thị thành lưới icon tròn ~56px có nhãn dưới (5 mục/hàng). Có thanh tab đáy gồm 4 mục.
   *Không học:* popup đăng nhập bật khi cuộn trang (gây khó chịu), banner tải app.

### 1.3 iVIVU — học mosaic điểm đến và bảng giá hạng phòng

1. **Header đơn 64px** gồm logo, tab sản phẩm (tab đang chọn có gạch chân) và "Tài khoản". Container **1140px** (lề trái 106px ở viewport 1366).
2. **Hero ~500px.** H1 36px căn trái kèm dòng phụ 16px. Ô tìm kiếm 2 hàng: hàng 1 là điểm đến toàn chiều ngang; hàng 2 gồm ngày nhận, biểu tượng số đêm, ngày trả, ô "1 phòng / 2 người lớn, 0 trẻ em" và nút cam "Tìm" ~96×54.
3. **Mosaic "Điểm đến yêu thích trong nước" (mẫu chính cho HuGo):** lưới **3 cột × 369px, khoảng cách 16px, hàng cao 200px**. Ô ngang chiếm 2 cột (755×200), ô dọc chiếm 2 hàng (369×416). Thứ tự: Phú Quốc (ngang) · Vũng Tàu (dọc) · Đà Lạt · Quy Nhơn · Nha Trang (dọc) · Đà Nẵng (ngang) · Phan Thiết · Phú Yên. Tên ~22px đậm cùng dòng phụ 13px ở **góc dưới trái**, có lớp tối nhẹ phía dưới ảnh. **Mobile vẫn giữ 3 cột:** cột 114px, hàng 124px, khoảng cách 8px.
4. **"Phong cách du lịch":** 4 card dọc 273×360, bo 10px.
5. **Trang kết quả:** H1 32px "Khách sạn Đà Lạt" kèm số lượng nhỏ, link "Xem bản đồ" bên phải. Sidebar 267px: ô tìm theo tên, Khu vực (mỗi dòng có mô tả phụ và số đếm), Ngân sách (khoảng giá dạng checkbox), Hạng sao. Trên danh sách có chip "Bạn đi cùng ai?" và dropdown sắp xếp.
6. **Card kết quả 849×201:** ảnh ~225px tràn mép trái. Cột giữa: tên 18px, sao, điểm, địa chỉ, chip tag. Cột phải ~180px: tên hạng phòng, "Gồm ăn sáng", giá kèm "/phòng/đêm" và nút cam 164×44 bo 10.
7. **Trang chi tiết:** tên, sao và địa chỉ ở trên; nút "Đặt ngay" bên phải. Gallery gồm ảnh chính ~580×345, 2 ảnh chồng ~275×165, một hàng 5 thumbnail ~150px và ô cuối "+20 hình". Cột phải 270px có bản đồ nhỏ và điểm review.
8. **"Bảng giá các hạng phòng" (mẫu chính cho HuGo):** phía trên có thanh ngày/khách với nút "Cập nhật". Mỗi hạng phòng gồm **card trái ~360px** (ảnh 310×235, tên, các dòng thông tin có icon: số khách, hướng nhìn, m², link "Xem chi tiết") và **danh sách gói giá bên phải**. Mỗi gói giá gồm checklist điều kiện, số khách ở giữa, khối giá kèm nút "Đặt 1 phòng". Cuối danh sách có nút "Xem thêm N lựa chọn khác".
   *Không học:* "Đã bán 16 phòng trong 24h", "924 khách đã đặt", giá gạch, hotline nổi bật.

### 1.4 Tổng hợp áp dụng cho HuGo

| Pattern | Lấy từ | Áp dụng ở HuGo |
|---|---|---|
| Tab dịch vụ trong ô tìm kiếm | Traveloka | Hero trang chủ: Khách sạn / Nhà hàng / Khám phá / Lịch trình |
| Mosaic 3 cột, ô ngang và ô dọc | iVIVU | Section "Điểm đến yêu thích trong nước" |
| Card kết quả ngang, ảnh lùi vào trong card, điểm review góc phải | Booking | `HotelResultCard` trên trang kết quả |
| Bảng hạng phòng: card phòng trái, các gói giá phải | iVIVU + Booking | `HotelPublicDetail` mục "Hạng phòng & giá" |
| Gallery: ảnh lớn, ảnh phụ, ô "+N ảnh" | cả 3 | `HotelGallery` |
| Thanh tìm thu gọn dính đầu trang, sidebar 250–280px | Booking/Traveloka | `HotelSearchPage` |
| Mobile: thanh "Sắp xếp · Lọc", drawer lọc | Booking | `HotelSearchPage` mobile |

---

## 2. Đánh giá giao diện HuGo hiện tại

**Nguồn đánh giá:** đọc toàn bộ code của `HotelLandingPage`, `HotelSearchPage`, `HotelPublicDetail`, `HotelCheckoutPage`, `components/hotels/*`, `Navbar`, `Footer`, `layouts/*`, 4 file CSS, cùng ảnh chụp thật ở `docs/evidence/travelgo-ai-agent-core/hotel-ui-2138d-20261119/after/*.png` (1440/1366/390, dữ liệu SYNTHETIC). Không chạy `npm run dev` lại vì backend không chạy, khung trang sẽ trống. Bộ ảnh evidence đã có dữ liệu nên phản ánh đúng hơn.

### 2.1 Điểm ổn (giữ lại)

- **Ảnh thật có giấy phép:** 24 ảnh gốc, 72 biến thể WebP 480/960/1920. `TravelPhoto` đã có `srcset`, `sizes`, lazy load, fallback khi lỗi và trang `/photo-credits`.
- **Search state nằm trên URL** (`hotelSearchState.ts`), nên back/forward/reload đều giữ tiêu chí. Hủy request cũ bằng `AbortController`, autocomplete có điều hướng bàn phím.
- **Trạng thái loading/empty/error có ở hầu hết các khối.** Date-range calendar 2 tháng, bảng phân bổ khách theo phòng, dialog có focus trap và Esc.
- **Thông tin giá trung thực:** STAY_TOTAL, chi tiết giá, "chưa giữ phòng", không bịa review ("Chưa có đánh giá").
- **Bố cục tổng thể đã đúng hướng:** hero ảnh, ô tìm đè lên hero, mosaic, card ngang, sidebar lọc, gallery mosaic, checkout 2 cột.

### 2.2 Điểm yếu

| # | Vấn đề | Bằng chứng trong code | Mức độ |
|---|---|---|---|
| W1 | **Chữ quá nhỏ:** nhiều chỗ 7–10px trên mobile và 9–11px trên desktop. Không đọc được, không đạt chuẩn | `hotels.css` @767: `.hotel-demo-badge{font-size:7px}`, `.hotel-card-address{font-size:9px}`; `hotelPremium.css`: `.premium-hero-location>span{font-size:7px}`, `.hotel-overline{font-size:8px}` | Cao |
| W2 | **3 bộ màu chồng nhau:** navy `#102d47` / `#083b63` / Tailwind `#0B1F3A`; cam `#e66b21` / `#f57708` / `orange-500 #F97316`. Navbar và Footer dùng màu khác trang | `hotels.css` dòng 1, `hotelPremium.css` dòng 2, `tailwind.config.js`, `Navbar.tsx` (`bg-orange-500`), `Footer.tsx` (`bg-[#102d47]`) | Cao |
| W3 | **CSS ghi đè 3 tầng** (`hotels.css`, `hotelStay.css`, `hotelPremium.css`) và hack `body:has(...) header.fixed a.rounded-full` để sửa Navbar từ CSS của trang. Rất khó bảo trì, dễ xung đột | `hotelPremium.css` cuối file | Cao |
| W4 | **Header `fixed`, có thay đổi padding khi cuộn** (`py-4` → `py-3`) nên nhảy layout. Mỗi trang tự bù bằng số cứng: `margin-top:72px`, `padding-top:76/87/92/95px`; sticky dùng `top:70/71px`, `top:185px` | `Navbar.tsx`, `hotels.css`, `hotelPremium.css` | Trung bình |
| W5 | **Menu desktop chỉ hiện từ 1280px trở lên** (`xl:`). Ở 1024–1279 phải dùng hamburger. Menu mobile xổ xuống đẩy nội dung, không có lớp phủ hay khóa cuộn | `Navbar.tsx` | Trung bình |
| W6 | **Mosaic điểm đến phụ thuộc API `/places/locations`.** Nếu API lỗi thì **toàn bộ mosaic biến mất** mà không có skeleton hay thông báo | `HotelLandingPage.tsx` (`.catch(()=>{})`) | Cao |
| W7 | **Mosaic 4 cột × 3 hàng (200/170/200)** khác mẫu iVIVU, ô nhỏ chỉ 150px nên chữ chật. Mobile 2 cột × 5 hàng rất dài (~900px) và ẩn ô thứ 8 | `hotelPremium.css` `.premium-destination-mosaic` | Trung bình |
| W8 | **Quá nhiều chữ cảnh báo lặp lại:** "SYNTHETIC" xuất hiện ở tên, badge, footnote, notice; mỗi card có 3–4 dòng chữ 9–10px. Overline chữ hoa ("HUGO TRAVEL · CHẠM ĐẾN VIỆT NAM") ở mọi section | evidence `home-1440.png`, `search-1440.png` | Trung bình |
| W9 | **Featured grid 3 cột × 2 hàng với 6 nút cam to giống nhau** nên trang chủ bị "cam" quá nhiều và kéo dài ~1100px | `hotel-featured-grid` | Trung bình |
| W10 | **Trang chi tiết bọc trong một khung trắng có viền giữa nền xám,** lại chứa các card bên trong (card lồng card). Thumbnail lặp dưới mosaic, nút "Xem tất cả 3 ảnh" thừa | `hotelPremium.css` `.hotel-detail-page>.hotel-container{border…}` | Trung bình |
| W11 | **Lightbox chỉ là dialog trắng 620px** (`.hd-dialog{width:min(620px,100%)}`) nên ảnh nhỏ, không phải toàn màn hình | `HotelDialog.tsx`, `hotelStay.css` | Trung bình |
| W12 | **Pagination chỉ có "Trước / Trang x/y / Sau",** không có số trang | `HotelSearchPage.tsx` | Thấp |
| W13 | **Nút cam `#f57708` + chữ trắng chỉ đạt tỉ lệ tương phản 2,6:1.** Không đạt WCAG AA (xem mục 8) | — | Cần quyết định |
| W14 | **Header có nút cam "Tạo lịch trình" trùng với mục "Lịch trình",** cạnh tranh với CTA "Tìm kiếm" của hero | `Navbar.tsx` | Thấp |
| W15 | **Code rất dày** (nhiều câu lệnh trên một dòng, JSX dài hàng trăm ký tự). Khó review và diff | toàn bộ `pages/Hotel*.tsx` | Trung bình |
| W16 | **`components/home/*` (9 file) là code chết:** không file nào import | grep toàn `src` | Thấp |

### 2.3 Ưu tiên sửa

1. **P0 – Nền tảng:** token màu/chữ thống nhất (W2), cỡ chữ tối thiểu 12px (W1), header sticky 64px với token `--hg-header-h` (W4), CSS mới tách theo gói và đóng băng CSS cũ (W3).
2. **P1 – Trang chủ:** tab dịch vụ trong ô tìm, mosaic 3 cột kiểu iVIVU có fallback (W6, W7), giảm chữ cảnh báo (W8), featured dạng carousel (W9), menu 1024px kèm drawer mobile (W5, W14).
3. **P1 – Kết quả/chi tiết:** card ngang kiểu Booking, bỏ card lồng card (W10), lightbox toàn màn hình (W11), bảng hạng phòng kiểu iVIVU.
4. **P2:** pagination có số trang (W12), checkout có bước, dọn CSS cũ sau khi merge.

---

## 3. Design tokens

**File mới:** `src/styles/hg-tokens.css` (Gói A sở hữu), import ở **dòng đầu** `src/index.css` (sau `@import "tailwindcss"`). Gói B chỉ dùng biến, không sửa file này. Nếu cần biến riêng, Gói B khai báo `--hgb-*` trong CSS của mình.

**Quy tắc:** chỉ dùng `var(--hg-*)` trong CSS mới, không viết mã màu hex trực tiếp. Tiền tố class mới là `hg-`.

```css
/* src/styles/hg-tokens.css — HuGo Travel design tokens v1 (21/11/2026) */
:root{
  /* ---------- Màu thương hiệu ---------- */
  --hg-primary:#083B63;          /* navy: header text, tiêu đề, nút phụ, tab active */
  --hg-primary-hover:#062E4D;
  --hg-primary-50:#E8F0F7;       /* nền nhạt: chip, icon box, hover dòng */
  --hg-primary-100:#D2E1EE;

  --hg-cta:#FF7900;              /* cam CTA: chỉ dùng cho NỀN nút hành động chính */
  --hg-cta-hover:#E66C00;
  --hg-cta-active:#CC6000;
  --hg-cta-ink:#FFFFFF;          /* chữ trên nút cam — xem mục 8, phương án AA: #062E4D */
  --hg-cta-50:#FFF1E5;           /* nền badge ưu đãi */
  --hg-cta-text:#B34F00;         /* chữ cam trên nền trắng/nhạt (đạt 4.7:1) — KHÔNG dùng #FF7900 cho chữ */

  /* ---------- Nền & bề mặt ---------- */
  --hg-bg:#F4F7FA;               /* nền trang danh sách/checkout, section xen kẽ */
  --hg-surface:#FFFFFF;          /* card, header, panel */
  --hg-surface-muted:#F7F9FB;    /* khối thông tin phụ trong trang trắng */
  --hg-overlay:rgba(4,28,48,.56);/* nền mờ dưới modal/drawer */
  --hg-lightbox-bg:rgba(7,18,28,.96);
  --hg-scrim:linear-gradient(0deg,rgba(4,28,48,.72) 0%,rgba(4,28,48,0) 62%); /* chữ trên ảnh */

  /* ---------- Viền ---------- */
  --hg-border:#DCE3EA;           /* viền card, divider */
  --hg-border-strong:#C3CFDA;    /* viền input */
  --hg-border-hover:#8FA3B6;

  /* ---------- Chữ ---------- */
  --hg-text:#10273D;             /* chữ chính (15.6:1 trên trắng) */
  --hg-text-heading:#083B63;
  --hg-muted:#5B6B7B;            /* chữ phụ (5.5:1 trên trắng, 5.1:1 trên --hg-bg) */
  --hg-subtle:#7A8896;           /* chỉ cho placeholder/disabled, KHÔNG cho nội dung */
  --hg-on-dark:#FFFFFF;
  --hg-on-dark-muted:#C9D6E2;
  --hg-link:#0B5CAD;

  /* ---------- Trạng thái ---------- */
  --hg-success:#1E7B4F;   --hg-success-50:#E7F5EE;
  --hg-danger:#C0362C;    --hg-danger-50:#FDECEA;
  --hg-warning-text:#8A5A00; --hg-warning-50:#FFF6E5; --hg-warning-border:#F1DFB8;
  --hg-info-50:#EEF5FB;
  --hg-star:#B97A00;             /* màu sao hạng khách sạn */
  --hg-focus:#1F6FD1;            /* viền focus 4.9:1 trên trắng */
  --hg-focus-ring:0 0 0 3px rgba(31,111,209,.35);

  /* ---------- Font ---------- */
  --hg-font:'Be Vietnam Pro','Inter',system-ui,-apple-system,'Segoe UI',Roboto,Arial,sans-serif;
  --hg-fw-regular:400; --hg-fw-medium:500; --hg-fw-semibold:600; --hg-fw-bold:700; --hg-fw-heavy:800;

  /* Thang cỡ chữ (px) — tối thiểu 12px cho mọi nội dung */
  --hg-fs-12:12px;  /* badge, chú thích, credit ảnh */
  --hg-fs-13:13px;  /* meta, breadcrumb, label phụ */
  --hg-fs-14:14px;  /* nội dung dày: card, filter, bảng */
  --hg-fs-15:15px;  /* nav, nút, body UI */
  --hg-fs-16:16px;  /* body văn bản, input mobile (tránh iOS zoom) */
  --hg-fs-18:18px;  /* tiêu đề card lớn, H3 */
  --hg-fs-20:20px;  /* tên KS trên card, giá card */
  --hg-fs-24:24px;  /* H2 mobile, giá nổi bật */
  --hg-fs-28:28px;  /* H2 desktop, H1 trang chi tiết */
  --hg-fs-32:32px;  /* H1 hero tablet */
  --hg-fs-40:40px;  /* H1 hero desktop */
  --hg-lh-tight:1.2; --hg-lh-snug:1.35; --hg-lh-body:1.6;
  --hg-ls-heading:-0.01em;

  /* ---------- Khoảng cách (bội số 4) ---------- */
  --hg-space-1:4px;  --hg-space-2:8px;  --hg-space-3:12px; --hg-space-4:16px;
  --hg-space-5:20px; --hg-space-6:24px; --hg-space-8:32px; --hg-space-10:40px;
  --hg-space-12:48px; --hg-space-16:64px;
  --hg-section-y:48px;           /* khoảng cách dọc giữa các section (mobile: 32px) */

  /* ---------- Bo góc ---------- */
  --hg-radius-sm:4px;   /* chip vuông, checkbox, badge */
  --hg-radius-md:8px;   /* card, input, nút, ảnh */
  --hg-radius-lg:12px;  /* ô tìm kiếm hero, modal, banner */
  --hg-radius-pill:999px;

  /* ---------- Bóng (tối đa 2 mức, nhẹ) ---------- */
  --hg-shadow-1:0 1px 2px rgba(8,59,99,.08);           /* header khi cuộn, card hover */
  --hg-shadow-2:0 8px 24px rgba(8,59,99,.12);          /* ô tìm kiếm hero, popover, dropdown */

  /* ---------- Layout ---------- */
  --hg-container:1240px;
  --hg-gutter:24px;              /* lề 2 bên ≥768px; mobile 16px */
  --hg-header-h:64px;            /* mobile 56px */
  --hg-page-offset:0px;          /* header sticky nên trang không cần bù. Gói B dùng var(--hg-page-offset, 72px) */
  --hg-sidebar-w:272px;
  --hg-control-h:48px;           /* input/nút chuẩn */
  --hg-control-h-lg:52px;        /* ô tìm kiếm hero */
  --hg-control-h-sm:40px;        /* nút phụ, select toolbar */
  --hg-z-header:50; --hg-z-sticky:30; --hg-z-dropdown:60; --hg-z-drawer:90; --hg-z-modal:100;
  --hg-ease:cubic-bezier(.2,.7,.2,1); --hg-dur:180ms;
}
@media (max-width:767px){
  :root{ --hg-gutter:16px; --hg-header-h:56px; --hg-section-y:32px; }
}
.hg-container{ width:min(var(--hg-container), 100% - 2*var(--hg-gutter)); margin-inline:auto; }
:where(.hg-scope) :focus-visible{ outline:2px solid var(--hg-focus); outline-offset:2px; }
@media (prefers-reduced-motion:reduce){ :root{ --hg-dur:0ms; } }
```

**Breakpoint (CSS biến không dùng được trong `@media`, nên quy ước bằng số):**

| Tên | Khoảng | Ghi chú |
|---|---|---|
| mobile | ≤ 767px | kiểm tra ở 360 và 390. Lề 16, header 56 |
| tablet | 768–1023px | lề 24, menu hamburger, không có sidebar lọc (dùng drawer) |
| laptop | 1024–1279px | **menu desktop hiện từ 1024**, sidebar 256px |
| desktop | ≥ 1280px | container 1240 (ở 1366 và 1440 nội dung đều rộng 1240px) |

**Font:** thêm Be Vietnam Pro (giấy phép OFL) vào `index.html`. Giữ Inter làm fallback:
`<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700;800&display=swap" rel="stylesheet">`.
Không đưa file font vào repo. `body{font-family:var(--hg-font)}`.

**Tailwind:** Navbar/Footer có thể dùng giá trị tùy ý như `bg-[var(--hg-primary)]`, nhưng ưu tiên chuyển sang class trong `hg-shell.css` cho dễ đọc. Không sửa `tailwind.config.js` trong đợt này; màu `brand.*` cũ coi như bỏ.

---

## 4. GÓI A — Khung chung + Trang chủ

**File thuộc Gói A:** `components/common/Navbar.tsx`, `components/common/Footer.tsx`, `layouts/MainLayout.tsx`, `layouts/CustomerLayout.tsx`, `pages/HotelLandingPage.tsx`, `pages/HomePage.tsx`, `pages/HotelsPage.tsx`, `components/home/*` (file mới), `components/hotels/SharedHotelSearchBar.tsx`, `components/hotels/HotelDateRange.tsx`, `components/hotels/TravelPhoto.tsx`, `index.html`, `src/index.css`, CSS mới `hg-tokens.css`, `hg-shell.css`, `hg-home.css`, `hg-search-form.css`.

### 4.1 Header (Navbar)

**Thay đổi chung:**
- Đổi `fixed` thành **`position:sticky; top:0`** (đặt trong `MainLayout` trước `<main>`). Chiều cao **cố định 64px** desktop và **56px** mobile, **không đổi padding khi cuộn**. Khi `scrollY>8` chỉ thêm `box-shadow:var(--hg-shadow-1)`.
- Nền `--hg-surface`, `border-bottom:1px solid var(--hg-border)`, `z-index:var(--hg-z-header)`. Bỏ `backdrop-blur`.
- Nội dung nằm trong `.hg-container` (1240px).

**Desktop (≥1024px), 3 vùng `display:flex; align-items:center; gap:32px`:**

| Vùng | Nội dung | Kích thước |
|---|---|---|
| Logo | icon la bàn trong ô 32×32 bo 8 nền `--hg-primary`, chữ "HuGo" (`--hg-primary`) + "Travel" (`--hg-cta`), 22px/800 | rộng ~150px, không co lại |
| Nav chính | Trang chủ `/` · Khách sạn `/hotels` · Nhà hàng `/restaurants` · Khám phá `/explore` · Lịch trình `/tour-planner` · Trợ lý AI `/assistant` (giữ điều kiện hiện có: chỉ hiện khi chưa đăng nhập hoặc là CUSTOMER) · **Thêm ▾** | mỗi mục cao 64, padding-inline 12, 15px/600 `--hg-text`; hover `--hg-primary`; **active: chữ `--hg-primary` + gạch chân 3px `--hg-cta` sát đáy header** (kiểu tab active của iVIVU) |
| Phải (`margin-left:auto`) | Nút tim (yêu thích) 40×40, badge số tròn 18px nền `--hg-cta`, chữ 11px/700 (ngoại lệ duy nhất dưới 12px, vì chỉ là số). Chưa đăng nhập: nút **"Đăng nhập"** viền 1px `--hg-primary`, cao 40, padding 0 16, bo 8, 15/600. Đã đăng nhập: giữ dropdown tài khoản hiện có (avatar 32 + tên tối đa 120px + chevron) | gap 8 |

- Dropdown **"Thêm"** gồm Tour du lịch `/tours`, Vé tham quan `/tickets`, Cẩm nang `/blog`, Chuyến đi của tôi `/my-trips`. Panel rộng 240, đặt top 100%, nền trắng, viền `--hg-border`, bo 8, `--hg-shadow-2`, padding 8. Mỗi mục cao 44 gồm icon 18 và nhãn 14/600, mô tả 13 `--hg-muted` (nếu có). Bỏ mũi tên tam giác xoay 45°.
- **Bỏ nút cam "Tạo lịch trình" ở header** vì trùng với mục "Lịch trình" và CTA hero (cần chủ dự án duyệt, mục 8). Nếu chủ dự án muốn giữ thì đổi sang nút viền navy, không dùng màu cam.
- Ở 1024–1279px: giảm padding-inline mục nav xuống 8 và font 14px. Nếu vẫn tràn, "Trợ lý AI" chuyển vào "Thêm".

**Mobile/tablet (<1024px):**
- Hàng header 56px (mobile) / 64px (tablet): logo (icon 28, chữ 18px) ở trái; bên phải có tim 40×40 và nút menu 40×40 (icon 24, `aria-label="Mở menu"`, `aria-expanded`).
- **Menu là drawer trượt từ phải,** không còn xổ xuống đẩy nội dung:
  - Lớp phủ `--hg-overlay` toàn màn hình, bấm vào để đóng.
  - Panel rộng `min(360px, 100vw)`, cao 100dvh, nền trắng, `z-index:var(--hg-z-drawer)`, trượt vào 180ms (tắt khi reduced-motion).
  - Đầu panel cao 56: logo và nút đóng X 40×40.
  - Danh sách link chính: mỗi dòng 48px gồm icon 20 (Lucide: Home, Hotel, UtensilsCrossed, Compass, CalendarDays, Sparkles) và nhãn 16/600; mục active có nền `--hg-primary-50` và chữ `--hg-primary`.
  - Nhóm "Dịch vụ khác" (tiêu đề 13/700 `--hg-muted`, uppercase không bắt buộc): Tour, Vé tham quan, Cẩm nang.
  - Nhóm tài khoản tách bằng divider: đã đăng nhập thì giữ đủ các link hiện có (Hồ sơ, Chuyến đi, Lịch sử đặt, Admin/Đối tác theo vai trò, Đăng xuất màu `--hg-danger`); chưa đăng nhập thì nút "Đăng nhập / Đăng ký" viền navy, rộng 100%, cao 48.
  - **Bỏ các accordion "Tour & Lịch trình"/"Dịch vụ"** và hiển thị phẳng để giảm số lần chạm.
- Hành vi: khóa cuộn body khi mở; focus vào nút đóng khi mở; Tab vòng trong panel; Esc và đổi route đều đóng menu (đã có); đóng xong thì trả focus về nút menu.

**Trạng thái:** focus-visible là viền 2px `--hg-focus`; mỗi mục nav có `aria-current="page"` khi active.

### 4.2 Footer

- Nền **`--hg-primary` (#083B63)** thay cho `#102d47`. Chữ `--hg-on-dark-muted`, tiêu đề cột màu trắng 15/700. Padding 48 trên, 24 dưới.
- **Desktop:** grid `1.4fr 1fr 1fr 1fr`, gap 40, trong `.hg-container`.
  - Cột 1: logo (bản trắng: icon nền trắng 10% + chữ trắng/cam) và đoạn giới thiệu 14px/1.6 tối đa 320px.
  - Cột 2 "Khám phá": Khách sạn, Nhà hàng, Điểm đến & trải nghiệm, Tour du lịch, Vé tham quan.
  - Cột 3 "Chuyến đi của bạn": Lập lịch trình, Trợ lý AI, Chuyến đi của tôi, Cẩm nang.
  - Cột 4 "Hỗ trợ & chính sách": Trở thành đối tác, Điều khoản sử dụng, Quyền riêng tư, Nguồn ảnh & bản quyền, và email/điện thoại **chỉ khi có biến môi trường** (giữ logic hiện có; không có thì ghi "Thông tin liên hệ đang được cập nhật.", 13px).
  - Link 14px, khoảng cách dòng 10px, hover chữ trắng + gạch chân.
- **Thanh đáy:** `border-top:1px solid rgba(255,255,255,.14)`, padding-top 20, margin-top 40, flex hai đầu: "© {năm} HuGo Travel" và "Thông tin dịch vụ cần được kiểm tra trước khi đặt.", cỡ 13px.
- **Tablet:** grid 2×2. **Mobile:** cột 1 toàn chiều ngang, sau đó 2 cột link (Khám phá | Chuyến đi), cột Hỗ trợ toàn chiều ngang; gap 32/24. Link cao tối thiểu 32 để dễ chạm.

### 4.3 Layout (`MainLayout`)

```
<div class="hg-scope hg-app">        // min-height:100dvh; display:flex; flex-direction:column; background:var(--hg-surface); font-family:var(--hg-font)
  <Navbar/>                          // sticky
  <main class="hg-main">             // flex:1; padding-top:0
  <Footer/>
  <BookingModal/> <TelemetryConsent/>  // giữ nguyên, không sửa logic
```

- **TelemetryConsent (vùng AI):** không sửa component. Gói A chỉ chỉnh vị trí qua CSS trong `hg-shell.css` (selector `[data-testid=telemetry-consent]`), áp dụng toàn site thay cho hack `body:has(...)`:
  - Desktop: hộp nổi góc dưới trái, rộng tối đa 420px, `bottom:16px; left:16px`, bo 12, `--hg-shadow-2`.
  - Mobile: dải dưới cùng full-width bo trên 12.
  - **Không được che CTA chính:** trang chi tiết/checkout có nút ở cột phải nên hộp nằm bên trái. Trên mobile, `main` có `padding-bottom` bằng chiều cao hộp khi hộp đang hiện (dùng `:has()` trên `.hg-app`).
  - Không đổi nội dung và không chọn sẵn đồng ý.

### 4.4 Hero + ô tìm kiếm có tab dịch vụ

**Component mới:** `components/home/HomeHero.tsx` (ảnh + tiêu đề) và `components/home/ServiceSearchTabs.tsx` (card tab + panel). `HotelLandingPage` dùng cả hai.

**Hero ảnh:**

| Thuộc tính | Desktop ≥1024 | Tablet 768–1023 | Mobile ≤767 |
|---|---|---|---|
| Chiều cao khối ảnh | **440px** | 380px | 260px |
| Ảnh | `TravelPhoto assetId="phu-quoc" eager sizes="100vw"`, `object-fit:cover`, giữ focal point | như desktop | như desktop |
| Lớp tối | `linear-gradient(90deg, rgba(4,28,48,.62) 0%, rgba(4,28,48,.22) 55%, rgba(4,28,48,0) 100%)` | như desktop | `linear-gradient(180deg, rgba(4,28,48,.55), rgba(4,28,48,.15))` |
| Padding-top nội dung | 64 | 40 | 24 |
| H1 | "Khám phá Việt Nam theo cách của bạn", **40px/700**, lh 1.2, trắng, max-width 640 | 32px | **26px**, max-width 320 |
| Dòng phụ | "Tìm nơi nghỉ, quán ngon và lên lịch trình cho chuyến đi sắp tới." 18px/400, `rgba(255,255,255,.92)`, max-width 560, margin-top 12 | 16px | 15px, 2 dòng |
| Credit ảnh | góc dưới phải, cách mép 16: "Bãi Sao, Phú Quốc · Ảnh: Trantuonglam · CC BY-SA 4.0" là link `/photo-credits`, **12px**, trắng 85% | như desktop | **ẩn trong hero**, chuyển xuống dưới card tìm kiếm (12px, `--hg-muted`, căn phải) |

- **Bỏ overline** "HUGO TRAVEL · CHẠM ĐẾN VIỆT NAM".
- Trang `/hotels` (HotelLandingPage không có `general`) dùng H1 "Một nơi nghỉ đẹp. Một kỳ nghỉ đáng nhớ." và **không hiện hàng tab dịch vụ** (chỉ có form khách sạn).

**Card tìm kiếm (`.hg-search-card`):**
- Nằm trong `.hg-container`, `position:relative; z-index:20; margin-top:-112px` (desktop), -96 (tablet), **-48 (mobile)**. Nền trắng, bo 12, `--hg-shadow-2`, viền 1px `--hg-border`.
- **Hàng tab** (`role="tablist"`, `aria-label="Chọn dịch vụ"`): cao 60, padding 10 16, `border-bottom:1px solid var(--hg-border)`, flex gap 8.
  - Tab là `<button role="tab">` cao 40, padding 0 16, bo pill, icon 18 + nhãn 15/600, `aria-selected`, `aria-controls`.
  - Chưa chọn: chữ `--hg-primary`, nền trong suốt, hover nền `--hg-primary-50`. **Đang chọn: nền `--hg-primary`, chữ trắng.**
  - Bàn phím: ←/→ chuyển tab, Home/End, Enter/Space chọn (roving tabindex).
  - **Mobile:** 4 tab chia đều 25% (`grid-template-columns:repeat(4,1fr)`), mỗi tab cao 64, icon 22 nằm trên, nhãn 13/600 nằm dưới; bo 8 thay cho pill; vẫn tô navy khi chọn.
- **4 tab, chỉ dùng route có thật trong `AppRouter.tsx`:**

| Tab | Icon (Lucide) | Panel | Khi bấm nút |
|---|---|---|---|
| Khách sạn (mặc định) | `Hotel` | `SharedHotelSearchBar variant="hero"` (mục 4.5) | `navigate(searchHref(value))` (giữ logic) |
| Nhà hàng | `UtensilsCrossed` | `LocationCombobox` "Điểm đến" + input "Tên nhà hàng, món ăn" + nút "Tìm nhà hàng" | `navigate('/restaurants?' + params)` với `locationId` (nếu có) và `search` (nếu có). `CatalogPageFilters` đã đọc 2 tham số này nên **không đổi logic trang đích** |
| Khám phá | `Compass` | Như Nhà hàng, input "Tên địa điểm, trải nghiệm", nút "Khám phá" | `navigate('/explore?' + params)` |
| Lịch trình | `CalendarDays` | Đoạn 15px "Tự sắp xếp điểm đến, thời gian và chi phí cho chuyến đi của bạn." + nút cam "Tạo lịch trình" (`/tour-planner`) + link phụ "Hỏi Trợ lý AI" (`/assistant`, chỉ hiện khi chưa đăng nhập hoặc là CUSTOMER) | Link điều hướng |

- Panel: padding 20 24 24 (desktop), 16 (mobile). Panel Nhà hàng/Khám phá dùng lưới `minmax(0,1.2fr) minmax(0,2fr) 180px`, gap 12, các trường cao 52. Mobile xếp 1 cột, nút rộng 100%.
- Đổi tab **không xóa** dữ liệu đã nhập của tab khác (mỗi tab giữ state riêng trong component). Tab đang chọn không ghi lên URL.
- **Dưới card** (cách 16): bỏ dải "Giá và điều kiện minh bạch…". Chỉ giữ credit ảnh trên mobile.

### 4.5 `SharedHotelSearchBar` + `HotelDateRange` (Gói A sở hữu, Gói B dùng)

**Thêm prop (không đổi prop cũ):**
```ts
variant?: 'hero' | 'bar'      // mặc định 'hero'
submitLabel?: string          // mặc định 'Tìm kiếm'; trang chi tiết dùng 'Cập nhật giá'
```
Component tự import `../../styles/hg-search-form.css`, bọc gốc bằng `.hg-search .hg-search--{variant}`.

**Variant `hero`** (trang chủ, `/hotels`):
- Lưới desktop ≥1200: `grid-template-columns: minmax(0,1.15fr) minmax(0,1.3fr) minmax(0,1.6fr) minmax(0,1.1fr) 148px; gap:12px; align-items:end`.
- Mỗi trường: nhãn **13px/600 `--hg-muted`** nằm trên (margin-bottom 6); ô nhập **cao 52**, bo 8, viền 1px `--hg-border-strong`, hover `--hg-border-hover`, focus thì viền `--hg-focus` + `--hg-focus-ring`; chữ giá trị 15/600 `--hg-text`; dòng phụ trong ô (số đêm, số phòng) **13px** `--hg-muted` (hiện tại 9–10px).
- Nút "Tìm kiếm": cao 52, rộng 100% cột, nền `--hg-cta`, chữ 16/700, icon Search 20, bo 8.
- **1024–1199:** lưới 6 cột: Điểm đến (span 3), Tên/khu vực (span 3); hàng 2 gồm Ngày (span 3), Khách (span 2), nút (span 1).
- **768–1023:** như trên.
- **≤767:** 1 cột theo thứ tự: Điểm đến, Tên/khu vực, Ngày (một nút toàn chiều ngang: "22/11 → 24/11 · 2 đêm"), Khách & phòng, nút Tìm (100%, cao 52). Khoảng cách 12. Input chữ **16px** để iOS không zoom.

**Variant `bar`** (trang kết quả, trang chi tiết): một hàng gọn. Ô cao **56** với **nhãn nằm trong ô** (nhãn 12/600 `--hg-muted` ở trên, giá trị 15/600 ở dưới, padding 8 12). Các ô chung viền và dính liền: bo 8 ở hai đầu, ô giữa có `border-left:0`. Lưới giống `hero` nhưng gap 0, nút rộng 140. Không có shadow. Dưới 1024: gói B tự ẩn bar và hiện thanh tóm tắt (mục 5.1).

**Popover chọn khách** (giữ logic, chỉ đổi giao diện):
- Desktop: panel rộng 360, neo dưới trường, bo 12, `--hg-shadow-2`, padding 20.
- Mỗi phòng là một nhóm có tiêu đề "Phòng 1" 15/700. **Đổi input số thành bộ đếm [−] số [+]:** nút 36×36 tròn viền `--hg-border-strong`, số 16/700 rộng 32 căn giữa, có `aria-label` "Giảm người lớn phòng 1". Bộ đếm vẫn gọi đúng hàm `roomUpdate` cũ với min/max cũ. Dropdown tuổi trẻ em giữ nguyên, cao 44.
- Chân panel: "+ Thêm phòng" (link `--hg-link`) và nút "Xong" navy cao 40.
- Mobile: bottom sheet (đã có), cao tối đa 85dvh, header sticky.

**Lịch (`HotelDateRange`):**
- Desktop: hiện 2 tháng trong `HotelDialog` (Gói B sở hữu dialog; Gói A chỉ style phần ruột `.premium-calendar-*` → đổi tên thành `.hg-cal-*` trong `hg-search-form.css`).
- Ô ngày **40×40**, chữ 14/500; ngày chọn nền `--hg-primary` chữ trắng; khoảng giữa nền `--hg-primary-50`; hôm nay có chấm 4px `--hg-cta`; ngày disabled opacity .35 và gạch ngang.
- Tên tháng 16/700; thứ (T2…CN) 12/600 `--hg-muted`.
- Chân lịch: "Xóa ngày" (link) · tóm tắt "2 đêm" 14px · nút "Áp dụng" cam cao 44.
- Mobile: 1 tháng hiển thị, cuộn dọc nhiều tháng; dialog toàn màn hình (variant `fullscreen` của HotelDialog, xem mục 6.2).

**Lỗi validate** (`stayError`): hiện ngay dưới form, 14px `--hg-danger`, có icon AlertCircle 16, `role="alert"`. Trường liên quan được viền `--hg-danger`.

### 4.6 Section: Điểm đến yêu thích trong nước (mosaic iVIVU)

**Component mới:** `components/home/DestinationMosaic.tsx`.

**Khung section:** `.hg-container`, padding-top `--hg-section-y`. Heading row: H2 "Điểm đến yêu thích trong nước" **28px/700** `--hg-text-heading` (mobile 24), dòng phụ 15px `--hg-muted` "Từ biển xanh đến phố núi — chọn nơi bạn muốn đến." Bên phải là link "Khám phá Việt Nam →" (`/explore`), 15/600 `--hg-link`. Mobile: link xuống dưới heading. Heading cách lưới 20.

**Lưới (≥1200):** `display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); grid-auto-rows:200px; gap:16px` (rộng mỗi cột ≈ 402px).

| # | Điểm đến | assetId | Vị trí lưới | Kích thước ≈ (1240) |
|---|---|---|---|---|
| 1 | Phú Quốc | `phu-quoc` | cột 1–2, hàng 1 (ngang) | 820×200 |
| 2 | Đà Lạt | `da-lat-lake` | cột 3, hàng 1–2 (dọc) | 402×416 |
| 3 | Nha Trang | `nha-trang` | cột 1, hàng 2 | 402×200 |
| 4 | Quy Nhơn | `quy-nhon-coast` | cột 2, hàng 2 | 402×200 |
| 5 | Hạ Long | `ha-long` | cột 1, hàng 3–4 (dọc) | 402×416 |
| 6 | Đà Nẵng | `da-nang` | cột 2–3, hàng 3 (ngang) | 820×200 |
| 7 | Hội An | `hoi-an` | cột 2, hàng 4 | 402×200 |
| 8 | Huế | `hue` | cột 3, hàng 4 | 402×200 |

- Tổng cao ≈ 848px. Ở 1024–1199: `grid-auto-rows:170px`. Ở 768–1023: `grid-auto-rows:150px; gap:12px`. **Mobile: giữ 3 cột như iVIVU,** `grid-auto-rows:124px; gap:8px` (ô ~114×124 ở 390, ~104×124 ở 360), cao ≈ 520px. Cùng một bản đồ vị trí cho mọi breakpoint.
- `sizes` cho `TravelPhoto`: ô ngang `(max-width:767px) 66vw, 820px`; ô dọc và ô thường `(max-width:767px) 33vw, 410px`.

**Ô (tile):**
- Là thẻ `<a>`, bo 8, `overflow:hidden; position:relative`, nền `--hg-primary-50` khi chưa tải ảnh.
- Lớp chữ dùng `--hg-scrim`.
- Chữ đặt góc dưới trái, cách mép 16 (mobile 10):
  - Tên: desktop 22px/700, tablet 18, mobile **15px**/700, trắng, `text-shadow:0 1px 8px rgba(0,0,0,.25)`.
  - Dòng 2 (chỉ ≥768): "Xem nơi lưu trú →" 13px/500 trắng 90%.
- **Không hiển thị số "N khách sạn"** vì chưa có API đếm eligible catalog; tuyệt đối không dùng số cứng.
- Hover: ảnh `scale(1.03)` trong 300ms. Focus-visible: outline 3px trắng, `outline-offset:-5px`, kèm viền ngoài `--hg-focus`.
- Link: `searchHref({...criteria, locationId, page:'1'})` (giữ logic), có `aria-label="Tìm nơi lưu trú tại {tên}"`.

**Dữ liệu và fallback (sửa W6, không đổi API):**
- Tên và `locationId` ưu tiên lấy từ `/places/locations` (như hiện tại).
- **Đang tải:** render ngay 8 ô skeleton đúng lưới, nền `--hg-primary-50` có hiệu ứng pulse.
- **API lỗi hoặc không khớp:** vẫn render đủ 8 ô với `locationId = asset.canonicalLocationId` từ manifest (dạng `destination:phu-quoc`, `searchHref` đã chấp nhận) và tên hiển thị lấy từ map tĩnh trong component (Phú Quốc, Đà Lạt, …). Trang tìm kiếm sẽ tự validate.
- Không thay ảnh bằng địa danh khác. Ảnh lỗi thì giữ khối nền và chữ (class `premium-image-failed` đổi tên thành `hg-img-failed`, dòng "Ảnh tạm thời chưa tải được" 12px).

**Hàng "Điểm đến khác"** (ngay dưới lưới, margin-top 16):
- Flex-wrap gap 8 gồm chip pill cao 40, padding 4 14 4 4. Mỗi chip có ảnh tròn 32×32 (`TravelPhoto` 480w) và tên 14/600; viền 1px `--hg-border`, hover viền `--hg-primary`.
- Các chip: **Hà Nội** (`ha-noi`), **TP. Hồ Chí Minh** (`ho-chi-minh`), **Sa Pa** (`sa-pa`), **Vũng Tàu** (`vung-tau`, *chỉ hiện khi `/places/locations` trả về id hợp lệ*, vì manifest không có `canonicalLocationId`).
- Phan Thiết và Phú Yên **chưa có ảnh hợp lệ**, nên không đưa vào cho tới khi bổ sung ảnh có license (ghi chú cho Admin/CMS sau).
- Mobile: chip cuộn ngang 1 hàng (`overflow-x:auto; scroll-snap-type:x proximity`), không xuống dòng.

### 4.7 Section: Ưu đãi

- Chỉ hiển thị khi có `offers.length>0` (giữ logic: promotion thật từ backend). Không có thì **ẩn cả section** (đúng như hiện tại), không hiện khung trống.
- Đặt **ngay sau card tìm kiếm** (margin-top 40) và trước mosaic, như iVIVU/Traveloka.
- Heading: H2 "Ưu đãi cho kỳ nghỉ của bạn" 28/700, dòng phụ 15 `--hg-muted` "Ưu đãi từ gói giá đã công bố. Chọn ngày để kiểm tra điều kiện.", link phải "Xem ưu đãi →".
- **Card ưu đãi (desktop):** lưới 2 cột gap 24. Card cao 200, grid `40% 1fr`, viền `--hg-border`, bo 8, không có shadow.
  - Ảnh `object-fit:cover`.
  - Nội dung padding 20, flex dọc gap 6:
    - Badge "Giảm 10%" (pill cao 24, padding 0 10, nền `--hg-cta-50`, chữ `--hg-cta-text` 12/700).
    - Tên ưu đãi 18/700, tối đa 2 dòng (clamp).
    - Tên khách sạn 14 `--hg-text`.
    - Điều kiện 13 `--hg-muted` gộp 1 dòng: "Lưu trú 18/11/2026 – 18/02/2027 · tối thiểu 2 đêm".
    - Đẩy xuống đáy: "Xem chi tiết →" 14/600 `--hg-link`.
  - Badge "Minh họa" (nếu `isDemo`) đặt trên ảnh góc trên trái (style chung mục 4.12). **Bỏ dòng chữ "Chỉ phòng/gói giá trong phạm vi ưu đãi · SYNTHETIC"** trong card, chuyển ý này thành tooltip/`title` hoặc chú thích chung dưới section (13px).
- **Mobile:** carousel ngang, card rộng 85%, `scroll-snap-align:start`, gap 12. Card dọc: ảnh trên cao 150, nội dung padding 16.
- Loading: dùng chung skeleton của danh sách khách sạn (section chỉ hiện khi đã có dữ liệu, nên không cần skeleton riêng). Error: ẩn section (không chặn trang).

### 4.8 Section: Khách sạn nổi bật (carousel)

**Component mới:** `components/home/FeaturedStays.tsx` (khung carousel). Card bên trong là `HotelResultCard compact` (Gói B sở hữu style card, xem mục 5.2.3).

- Section có nền full-bleed `--hg-bg`, padding 48 0 (mobile 32 0).
- Heading: H2 "Nơi lưu trú để bạn khám phá", dòng phụ "Thông tin đã được duyệt. Chọn ngày để xem giá và phòng trống.", link phải "Xem tất cả →" (`searchHref(criteria)`).
- **Tab lọc** (giữ `mode`: `relevance`/`recent`): kiểu chip pill (Traveloka) cao 36, padding 0 16, 14/600. Chưa chọn: viền `--hg-border-strong`, nền trắng. Đang chọn: nền `--hg-primary`, chữ trắng. Có `aria-pressed`. Cách heading 16, cách carousel 20.
- **Carousel:**
  - Track: `display:grid; grid-auto-flow:column; grid-auto-columns:calc((100% - 3*16px)/4); gap:16px; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none`.
  - 1024–1279: `calc((100% - 2*16px)/3)`. 768–1023: `calc((100% - 16px)/2.2)`. Mobile: `82%`, gap 12.
  - Nút trước/sau (chỉ ≥1024): tròn 40×40, nền trắng, viền `--hg-border`, `--hg-shadow-1`, icon Chevron 20, đặt `position:absolute; top:90px` (giữa vùng ảnh), `left:-20px`/`right:-20px`. Khi không cuộn được thì ẩn bằng `hidden`. Có `aria-label` "Xem nơi lưu trú trước/sau". Mỗi lần bấm cuộn `track.clientWidth`.
  - Track có `role="region"`, `aria-label="Nơi lưu trú nổi bật"` và `tabIndex=0` để cuộn bằng bàn phím.
- Notice SYNTHETIC: **1 dòng** dưới tab, kiểu notice chung (mục 4.12), chỉ khi `data.scope==='ISOLATED_SYNTHETIC_PREVIEW'`.
- **Loading:** 4 card skeleton (ảnh 180 + 3 thanh 14px rộng 80%/60%/40%), `role="status"`, chữ ẩn "Đang tải nơi lưu trú".
- **Error:** khối `.hg-state` (mục 4.12) gồm icon, "Chưa tải được nơi lưu trú", nội dung lỗi và nút "Thử lại" (gọi `refresh`).
- **Empty:** `.hg-state` gồm "Nơi lưu trú đang được chuẩn bị" và link "Khám phá Việt Nam".

### 4.9 Section: Loại lưu trú

- Heading H2 "Một nơi ở, nhiều phong cách". Ngay dưới là chú thích 13px `--hg-muted`: "Ảnh minh họa phong cách, không phải cơ sở lưu trú cụ thể." **Bỏ chữ "Ảnh minh họa phong cách" lặp ở từng ô.**
- Lưới 6 cột (`hotelTypes`: Khách sạn, Resort, Homestay, Villa, Căn hộ, Nhà khách), gap 16. Ô là `<a>`: ảnh tỉ lệ 4:3 (≈193×145 ở 1240), bo 8; tên 16/600 `--hg-text` cách ảnh 10. Hover: tên `--hg-primary` + gạch chân, ảnh scale 1.03.
- 768–1023: 3 cột. **Mobile:** cuộn ngang, ô rộng 140 (ảnh 140×105), gap 12.
- Link: `searchHref({...criteria, accommodationType:type, page:'1'})` (giữ logic).

### 4.10 Section: Dịch vụ khác

- Chỉ hiện ở trang chủ (`general`). Heading H2 "Trọn vẹn hơn một chuyến đi".
- **Lưới 3 cột × 2 hàng,** gap 16. Tile `<a>` cao 88, padding 16 20, viền `--hg-border`, bo 8, flex gap 16:
  - Icon box 48×48 bo 8, nền `--hg-primary-50`, icon 24 `--hg-primary`.
  - Chữ: tiêu đề 16/700, mô tả 13 `--hg-muted` 1 dòng.
  - Mũi tên ChevronRight 18 `--hg-muted` đẩy sang phải.
  - Hover: viền `--hg-primary`, mũi tên dịch phải 2px.

| Tiêu đề | Mô tả | Route |
|---|---|---|
| Nhà hàng | Ẩm thực địa phương | `/restaurants` |
| Khám phá | Điểm đến & trải nghiệm | `/explore` |
| Lập lịch trình | Tự sắp xếp hành trình | `/tour-planner` |
| Tour du lịch | Gói tour theo điểm đến | `/tours` |
| Vé tham quan | Vé điểm du lịch | `/tickets` |
| Cẩm nang | Kinh nghiệm du lịch | `/blog` |

- Tablet: 2 cột. Mobile: 2 cột, tile cao 72, ẩn mô tả, icon box 40.

### 4.11 Banner Trợ lý AI

- Chỉ giữ link/nút, không thiết kế lại khu chat.
- Khối `.hg-container`, margin 48 auto 64 (mobile 32 auto 40). Nền **`--hg-primary`**, bo 12, padding 32 40.
- Grid `56px 1fr auto`, gap 24, căn giữa dọc:
  - Icon Sparkles 28 trắng trong vòng tròn 56, nền `rgba(255,255,255,.12)`.
  - Chữ: H2 "Bắt đầu từ điều bạn thích" 24/700 trắng; mô tả 15 `--hg-on-dark-muted` "Chia sẻ mong muốn, HuGo giúp bạn sắp xếp ý tưởng cho chuyến đi."
  - Nút cam "Trò chuyện với HuGo →" cao 48, padding 0 24.
- Điều kiện hiển thị nút: giữ quy tắc như Navbar (chưa đăng nhập hoặc CUSTOMER). Với vai trò khác, thay bằng nút viền trắng "Lập lịch trình" → `/tour-planner`.
- Mobile: xếp dọc, ẩn icon, padding 24 20, nút rộng 100%.

### 4.12 Thành phần dùng chung trong trang chủ (style Gói A, class `hg-`)

- **Thứ tự section trang chủ:** Hero → Card tìm kiếm → Ưu đãi (nếu có) → Điểm đến → Khách sạn nổi bật (nền xám) → Loại lưu trú → Dịch vụ khác → Banner AI → Footer.
- **Heading section:** H2 28/700 (mobile 24), lh 1.25, `letter-spacing:-0.01em`, `--hg-text-heading`; dòng phụ 15/400 `--hg-muted`, margin-top 6; khối heading cách nội dung 20 (mobile 16). **Bỏ toàn bộ `.hotel-overline`.**
- **Notice cảnh báo** `.hg-notice`: padding 10 14, bo 8, nền `--hg-warning-50`, viền 1px `--hg-warning-border`, chữ 13px `--hg-warning-text`, icon Info 16. Mỗi trang **tối đa 1 notice SYNTHETIC**.
- **Badge minh họa trên ảnh** `.hg-badge-illustrative`: đặt top 10 left 10, cao 22, padding 0 8, bo 4, nền `rgba(255,255,255,.92)`, chữ **12px**/600 `--hg-warning-text`, nội dung "Minh họa". Badge này là nhãn bắt buộc cho ảnh SYNTHETIC.
- **Khối trạng thái** `.hg-state`: căn giữa, padding 32, bo 8, viền dashed 1px `--hg-border-strong`, nền `--hg-surface-muted`. Gồm icon 32 `--hg-muted`, tiêu đề 18/700, mô tả 14 `--hg-muted` (max 520), nút phụ viền navy cao 40.
- **Skeleton:** nền `--hg-primary-50`, animation pulse 1.4s (tắt khi reduced-motion).

---

## 5. GÓI B — Danh sách kết quả + Chi tiết + Checkout

**File thuộc Gói B:** `pages/HotelSearchPage.tsx`, `components/hotels/HotelResultCard.tsx`, `pages/HotelPublicDetail.tsx`, `components/hotels/HotelGallery.tsx`, `components/hotels/HotelDialog.tsx`, `pages/HotelCheckoutPage.tsx`, `components/hotels/HotelBookingSummary.tsx`, `components/hotels/HotelPriceBreakdown.tsx`, phần wrapper hotel trong `pages/PlaceDetailPage.tsx` (dòng 35–40, chỉ khi cần), CSS mới `hg-hotel-card.css`, `hg-results.css`, `hg-detail.css`, `hg-dialog.css`, `hg-checkout.css`.

**Quy ước:** mỗi trang import CSS mới **sau** các file CSS cũ. Gốc trang có class `hg-scope hg-page-{results|detail|checkout}`. Mọi phần bù header dùng `padding-top: var(--hg-page-offset, 72px)`, mọi `top` của phần tử sticky dùng `var(--hg-header-h, 64px)`.

### 5.1 Trang danh sách kết quả (`HotelSearchPage`)

**Khung tổng (desktop ≥1024):**
```
[Header 64 — sticky]
[Thanh tìm thu gọn: nền trắng, viền dưới, sticky top:var(--hg-header-h), padding 12 0, cao 80]
[.hg-container]
  Breadcrumb (margin 16 0 12)
  Hàng tiêu đề: H1 + số kết quả | Toolbar (sắp xếp)
  Chip bộ lọc đang áp dụng
  Notice SYNTHETIC (nếu có, 1 dòng)
  [Grid: 272px | 1fr, gap 24]
     Sidebar lọc (sticky) | Danh sách card + pagination + dòng cập nhật
```
- Nền trang `--hg-bg`, padding-bottom 64.

**Thanh tìm thu gọn:** `SharedHotelSearchBar variant="bar"` (Gói A). Không có shadow; khi đã dính thì thêm `--hg-shadow-1`.

**Breadcrumb:** "Trang chủ › Khách sạn › Kết quả tìm kiếm", chữ 13px `--hg-muted`, link `--hg-link`, phân cách ChevronRight 14. Mục cuối `aria-current="page"` màu `--hg-text`.

**Hàng tiêu đề:**
- H1 **22px/700** `--hg-text-heading`. Giữ logic text: có `nameOrAddress` thì "Nơi lưu trú cho “…”", không có thì "Tìm nơi nghỉ phù hợp với bạn".
- Bên dưới: status 14px `--hg-muted` "N nơi lưu trú phù hợp" (`role="status"`).
- Bên phải: label "Sắp xếp" 13/600 và select cao 40, min-width 200, bo 8, giữ nguyên các option và điều kiện `disabled`. Option giá bị disabled khi chưa có ngày, kèm tooltip "Chọn ngày để sắp xếp theo giá".

**Chip lọc đang áp dụng:** flex-wrap gap 8, mỗi chip cao 32, padding 0 10, bo pill, nền `--hg-primary-50`, chữ 13/600 `--hg-primary`, icon X 14, `aria-label="Bỏ lọc {nhãn}"`. Cuối hàng có link "Xóa tất cả" 13/600 `--hg-link`.

**Sidebar lọc (272px):**
- Nền trắng, viền `--hg-border`, bo 8. `position:sticky; top:calc(var(--hg-header-h,64px) + 80px + 16px)`, `max-height:calc(100dvh - var(--hg-header-h,64px) - 112px)`, `overflow-y:auto` (thanh cuộn mảnh).
- Đầu sidebar cao 52, padding 0 16: "Bộ lọc" 16/700 và link "Xóa bộ lọc" 13/600 `--hg-link`. Đầu này `position:sticky; top:0` bên trong sidebar.
- **Mỗi nhóm lọc** là một `<fieldset>` padding 16, `border-top:1px solid var(--hg-border)`. Legend 14/700 `--hg-text`, cách nội dung 10. Ghi chú phụ 12px `--hg-muted`. Nhóm có nút thu gọn (chevron 18, `aria-expanded`); mặc định mở các nhóm đang có giá trị và 4 nhóm đầu.
- Thứ tự nhóm (giữ đúng tham số hiện có, không thêm điều kiện backend không hỗ trợ):
  1. **Ngân sách · tổng kỳ lưu trú:** 2 ô số "Tối thiểu" / "Tối đa" đặt cạnh nhau (grid 2 cột gap 8), cao 40, có hậu tố "₫". Khi chưa có ngày thì disabled và hiện ghi chú "Chọn ngày để lọc theo tổng giá".
  2. **Điều kiện gói giá:** checkbox Có ưu đãi · Bao gồm bữa sáng · Có hoàn hủy trước hạn.
  3. **Loại lưu trú:** select cao 40 (giữ select; có thể đổi sang radio list 6 mục, mỗi dòng 36).
  4. **Hạng sao có xác minh:** hàng 5 nút pill "5★ … 1★" (cao 32, chọn được 1). Giữ tham số `stars` 1 giá trị.
  5. **Điểm đánh giá:** radio "Từ 4,5/5", "Từ 4/5", "Từ 3/5", "Không giới hạn".
  6. **Tiện nghi khách sạn:** checkbox (Wi-Fi khu vực chung, Bãi đỗ xe, Hồ bơi).
  7. **Tiện nghi trong cùng hạng phòng:** checkbox (5 mục hiện có).
  8. **Hướng nhìn:** select.
  9. **Phòng ngủ / phòng tắm tối thiểu:** 2 ô số.
  10. **Tên đường:** input (disabled khi chưa chọn điểm đến).
- Dòng checkbox: cao 36, checkbox 18×18 `accent-color:var(--hg-primary)`, nhãn 14/400 `--hg-text`.
- Ghi chú pháp lý cuối sidebar ("Các điều kiện phòng và giá phải khớp…") 12px `--hg-muted`, padding 16.

**Card kết quả ngang** (style trong `hg-hotel-card.css`, chi tiết ở mục 5.2).

**Pagination:**
- `nav aria-label="Phân trang"`, căn giữa, margin 24 0 8.
- Nút "Trước" và "Sau" cao 40, padding 0 14, viền `--hg-border-strong`, bo 8, icon chevron.
- Ở giữa là các nút số trang 40×40, bo 8. Trang hiện tại: nền `--hg-primary`, chữ trắng, `aria-current="page"`. Hiển thị trang 1, trang cuối, ±1 quanh trang hiện tại, còn lại là "…".
- Dùng `data.page`, `data.total`, `data.limit` sẵn có, không đổi API.
- Ẩn pagination khi chỉ có 1 trang.

**Dòng cập nhật cuối danh sách:** "Cập nhật lúc 08:31. Báo giá không giữ phòng. …" 13px `--hg-muted`, căn giữa.

**Trạng thái của vùng danh sách** (dùng `.hg-state` như mục 4.12):

| Trạng thái | Hiển thị |
|---|---|
| Loading | 3 skeleton card ngang (ảnh 240×240 + 4 thanh + cột giá 2 thanh), `role="status"` |
| Tiêu chí sai (`invalid`) | `.hg-state` icon AlertTriangle, "Kiểm tra lại tiêu chí", nội dung lỗi, `role="alert"` |
| Chưa bật domain | `.hg-state` icon Hotel, "Danh sách đang được chuẩn bị" |
| Error | `.hg-state` "Chưa tải được kết quả" + nút "Thử lại" |
| Empty | `.hg-state` icon Search, "Chưa tìm thấy nơi lưu trú phù hợp", gợi ý, nút "Xóa bộ lọc" |
| Giá hết hiệu lực (`useHotelSearch` set error) | `.hg-notice` kèm nút "Tải lại giá" |

**Tablet 768–1023:**
- Ẩn sidebar.
- Toolbar gồm nút "Bộ lọc · N" (viền, cao 40) và select Sắp xếp.
- Card ngang 2 vùng: `200px | 1fr`; khối giá chuyển xuống dưới phần thông tin (cột 2), căn trái, có viền trên.

**Mobile ≤767:**
- Thanh tìm thu gọn được thay bằng **nút tóm tắt** cao 56, sticky `top:var(--hg-header-h)`, nền trắng, viền dưới. Bên trong có icon Search 18, dòng 1 "Điểm đến / từ khóa" 15/600, dòng 2 "22/11 → 24/11 · 2 người lớn · 1 phòng" 13 `--hg-muted`, chữ "Sửa" 14/600 `--hg-link`.
  - Bấm vào mở **sheet toàn màn hình** (dùng `HotelDialog variant="fullscreen"`, tiêu đề "Sửa tìm kiếm") chứa `SharedHotelSearchBar variant="hero"`. Tìm xong thì đóng sheet.
- **Toolbar dính** dưới nút tóm tắt (top header+56): grid 2 cột gap 8, padding 8 16, nền trắng. Gồm nút "Sắp xếp" (select dạng nút, cao 44, icon ArrowUpDown) và nút "Bộ lọc · N" (cao 44, icon SlidersHorizontal).
- Chip lọc đang áp dụng: 1 hàng cuộn ngang.
- **Drawer lọc:** bottom sheet cao 92dvh, bo trên 12.
  - Header sticky cao 56: "Bộ lọc" 18/700 và nút X 44×44.
  - Nội dung là các nhóm như sidebar, chữ input 16px.
  - Footer sticky cao 72, padding 12 16, `border-top`: "Xóa tất cả" (nút viền, 40%) và **"Xem kết quả"** (nút cam, 60%, cao 48).
  - Focus trap, Esc đóng, khóa cuộn body.
- **Card dọc:** ảnh tỉ lệ 16:9 (≈358×201 ở 390), bo trên 8; nội dung padding 16; khối giá ở đáy, flex 2 đầu: bên trái tổng giá 22/800 và dòng phụ, bên phải nút "Xem phòng" cao 44.

### 5.2 Card kết quả (`HotelResultCard`)

#### 5.2.1 Card ngang (trang kết quả, ≥1024)

- `display:grid; grid-template-columns:240px minmax(0,1fr) 208px; gap:16px; padding:16px`.
- Nền trắng, viền `--hg-border`, bo 8, min-height 272. Hover: viền `--hg-border-hover` + `--hg-shadow-1`. Danh sách card cách nhau 16.

| Vùng | Nội dung & style |
|---|---|
| **Ảnh** (240×240, bo 8, `overflow:hidden`) | `img` cover, hover scale 1.03. Badge "Minh họa" (nếu `isDemo`) ở góc trên trái theo style `.hg-badge-illustrative` (12px, **không còn 7–9px**). Lỗi ảnh: nền `--hg-primary-50` + icon ImageOff 24 + chữ "Chưa có ảnh" 12px |
| **Thông tin** (flex dọc, gap 6) | Eyebrow: loại lưu trú 13/600 `--hg-muted` + sao `★` 14px `--hg-star` (`aria-label` "4 sao đã xác minh"). **Tên 20/700 `--hg-text-heading`**, clamp 2 dòng, hover gạch chân. Địa chỉ 14 `--hg-muted` với icon MapPin 14, clamp 2 dòng. Review: có thì hiện badge điểm (pill cao 26, padding 0 8, nền `--hg-primary`, chữ trắng 13/700 "4,6/5") + "12 đánh giá đã công bố" 13 `--hg-muted`; chưa có thì "Chưa có đánh giá" 13 `--hg-muted`. **Hạng phòng khớp** (`selected`): margin-top 8, padding-left 12, `border-left:3px solid var(--hg-primary-100)` (không phải card lồng): tên phòng 14/700, dòng thông tin 13 `--hg-muted` ("Hướng thành phố · Tối đa 4 khách/phòng · 1 phòng ngủ · 1 phòng tắm"), tối đa 4 tiện nghi dạng chip (cao 24, padding 0 8, nền `--hg-surface-muted`, viền `--hg-border`, chữ 12/500, icon Check 12), dòng bữa sáng `--hg-success` 13/600 kèm icon Coffee, dòng hoàn hủy 13: "Không hoàn hủy" màu `--hg-muted`, có điều kiện thì `--hg-success` |
| **Giá** (cột phải, `border-left:1px solid var(--hg-border)`, padding-left 16, flex dọc căn phải, đẩy xuống đáy) | Badge ưu đãi (nếu có, style ở 4.7). "2 đêm · 1 phòng" 13 `--hg-muted`. **Tổng giá 24/800 `--hg-text-heading`** (`data-testid="hotel-total"` giữ nguyên). "Tổng kỳ lưu trú · đã gồm thuế/phí bắt buộc" 12 `--hg-muted`. Ưu đãi áp dụng "−120.000 ₫" 13/600 `--hg-success`. `<details>` "Chi tiết giá" 13/600 `--hg-link` (nội dung 13px, căn trái trong popover nhỏ). **Nút "Xem phòng"** cam, rộng 100%, cao 44, margin-top 8. Dòng cuối 12 `--hg-muted`: "Chưa giữ phòng" và (nếu `!bookingEnabled`) "Chưa hỗ trợ đặt trực tuyến". **Chưa chọn ngày:** thay khối giá bằng "Chọn ngày để xem giá" 16/700, "Tham khảo X ₫/phòng/đêm" 13 (nếu có `referenceVnd`), nút "Xem phòng" |

- Gộp các dòng nhỏ: hiện tại có 4 dòng chữ 10px dưới giá; mới chỉ còn **tối đa 2 dòng 12px**. Câu "Giá tại thời điểm kiểm tra, chưa giữ phòng" rút thành "Chưa giữ phòng".

#### 5.2.2 Card ở tablet/mobile
Xem mục 5.1.

#### 5.2.3 Card `compact` (trang chủ, carousel "Nơi lưu trú")

- Flex dọc, nền trắng, viền `--hg-border`, bo 8, `overflow:hidden`, cao 100% của ô carousel. **Toàn card hover:** `--hg-shadow-1`.
- Ảnh cao **180**, tràn mép trên. Badge "Minh họa" như trên.
- Thông tin padding 14 16 0:
  - Eyebrow 12/600.
  - Tên 17/700 clamp 2 dòng (`min-height` 2 dòng để các card thẳng hàng).
  - Địa chỉ 13 clamp 1 dòng.
  - Review 13.
  - Ẩn khối hạng phòng.
- Giá padding 12 16 16, đẩy xuống đáy:
  - Có quote: tổng 20/800, "Tổng N đêm" 12.
  - Không có: "Chọn ngày để xem giá" 15/700 và "Tham khảo …/phòng/đêm" 12.
  - Nút **"Xem phòng"** dạng **viền navy** (không dùng nền cam, tránh 6 nút cam liền nhau), cao 40, rộng 100%.
- Ẩn `<details>` chi tiết giá trong compact.

### 5.3 Trang chi tiết khách sạn (`HotelPublicDetail`)

**Khung tổng:**
- Nền trang **trắng** (bỏ khung trắng viền nằm trong nền xám, W10).
- `.hg-container`, padding-top `var(--hg-page-offset,72px)` + 16.
- **Không dùng card bao ngoài.** Các section phân tách bằng `border-top:1px solid var(--hg-border)` và padding 40 0.

**1. Breadcrumb** (13px như 5.1): "← Kết quả tìm kiếm" (giữ link cũ) · "Khách sạn" · `{address.provinceOrCity}` (chữ thường, không link nếu không có id) · tên khách sạn (cắt 40 ký tự).

**2. Header khách sạn** (margin 12 0 20), flex 2 đầu:
- Trái:
  - Eyebrow loại hình + sao (như card).
  - **H1 28/700** (mobile 24) `--hg-text-heading`.
  - Địa chỉ 15 `--hg-muted` với icon MapPin 16.
  - Dòng review: badge điểm (cao 28) + "N đánh giá đã công bố" (là link anchor `#hd-reviews`), hoặc "Chưa có đánh giá".
- Phải: nút "Chia sẻ" (viền `--hg-border-strong`, cao 40, icon Share2) và nút cam **"Xem phòng"** cao 44 (anchor `#hd-rooms`). Thông báo sao chép link hiện dạng toast nhỏ 13px dưới nút trong 3s (`role="status"`).
- Notice SYNTHETIC: 1 dòng `.hg-notice` dưới header.

**3. Gallery** (`HotelGallery`, mặc định non-compact):
- Desktop: **cao tổng 400px, gap 8, bo ngoài 8.** Bố cục theo số ảnh `n`:

| n | Lưới | Ghi chú |
|---|---|---|
| 1 | 1 ô full 400 | — |
| 2 | `2fr 1fr`, mỗi ô cao 400 | — |
| 3–4 | `2fr 1fr`; ô chính chiếm 2 hàng, bên phải 2 ô chồng (196 mỗi ô) | kiểu Booking/iVIVU |
| ≥5 | `2fr 1fr 1fr`; ô chính chiếm 2 hàng, bên phải lưới 2×2 (196 mỗi ô) | kiểu Traveloka/Airbnb |

- Ô cuối cùng đang hiện, nếu còn ảnh ẩn, phủ lớp `rgba(8,59,99,.55)` và chữ trắng 16/700 "+N ảnh" căn giữa.
- Nút "Xem tất cả N ảnh" (nền trắng, cao 36, padding 0 12, bo 8, 13/600, icon Images 16) đặt `position:absolute; right:12px; bottom:12px` trên mosaic.
- **Bỏ dải thumbnail dưới mosaic trên desktop** (trùng lặp).
- Mỗi ô là `<button>` có `aria-label` "Mở ảnh {i}/{n}", hover sáng nhẹ (`filter:brightness(1.05)`).
- **Mobile:** carousel 1 ảnh, tỉ lệ 4:3 (≈358×268), bo 8, vuốt trái/phải (giữ logic touch). Pill đếm "1/8" (nền `rgba(0,0,0,.6)`, chữ trắng 12/600, cao 24) ở góc dưới phải. Mũi tên 36×36 trắng mờ ở 2 bên. Chạm vào ảnh mở lightbox. Bỏ thumbnail mobile.
- Không có ảnh: khối cao 240 (mobile 200), nền `--hg-surface-muted`, icon ImageOff, chữ "Chưa có ảnh được duyệt." 14px.

**Lightbox** (`HotelDialog variant="fullscreen"`):
- Phủ toàn màn hình, nền `--hg-lightbox-bg`, `z-index:var(--hg-z-modal)`.
- Header cao 56, padding 0 16: bên trái là bộ đếm "3 / 12" trắng 14/600 kèm tên khách sạn 14 `--hg-on-dark-muted`; bên phải là nút đóng X 44×44 trắng.
- Ảnh: `object-fit:contain; max-height:calc(100dvh - 56px - 96px); max-width:min(1200px, 100vw - 160px)`, căn giữa.
- Chú thích `altText` 13px `--hg-on-dark-muted`, căn giữa dưới ảnh.
- Nút trước/sau tròn 48×48, nền `rgba(255,255,255,.12)`, icon trắng 24, đặt ở 2 mép (cách 24). Mobile ẩn nút và dùng vuốt.
- Dải thumbnail đáy: cao 72, padding 12; thumb 80×56 bo 4, opacity .6; thumb đang chọn có opacity 1 và viền 2px trắng; cuộn ngang và tự cuộn tới thumb đang chọn.
- Bàn phím: ←/→, Esc, Home/End. Giữ focus trap. Preload ảnh kế tiếp.

**4. Thanh anchor tab:**
- `nav` sticky `top:var(--hg-header-h,64px)`, cao 52, nền trắng, `border-bottom:1px solid var(--hg-border)`, `z-index:var(--hg-z-sticky)`, tràn toàn chiều ngang. Nội dung trong container, cuộn ngang trên mobile (ẩn scrollbar).
- Mục: Tổng quan · Hạng phòng & giá · Tiện nghi · Vị trí & thông tin · Quy định · Đánh giá. Mỗi mục cao 52, padding 0 14, 15/600 `--hg-muted`. **Active:** chữ `--hg-primary` + gạch chân 3px `--hg-primary`, `aria-current="true"`.
- Active theo scrollspy bằng `IntersectionObserver` (`rootMargin:'-120px 0px -60% 0px'`).
- Desktop ≥1024: khi đã cuộn qua header khách sạn, hiện ở bên phải thanh tab nút cam nhỏ "Xem phòng" (cao 36) và giá thấp nhất **chỉ khi đã có quote** (không bịa giá "từ").
- Các section: `scroll-margin-top:calc(var(--hg-header-h,64px) + 52px + 16px)`.

**5. Tổng quan** (`#hd-overview`):
- Grid `minmax(0,1fr) 360px`, gap 40.
- Trái: H2 "Tổng quan" 24/700. Bỏ overline và tiêu đề marketing "Tận hưởng theo cách của bạn". Đoạn `summary` 16/1.7 `--hg-text`, đoạn `description` 15/1.7 `--hg-muted`. Mô tả dài hơn 6 dòng thì clamp và thêm nút "Xem thêm".
- Phải: panel `--hg-surface-muted`, bo 8, padding 20, **không viền** (tránh card lồng):
  - "Thông tin lưu trú" 16/700.
  - Giờ nhận/trả: icon Clock 16 kèm "Nhận phòng 15:00 · Trả phòng 11:00" 14px, hoặc chữ chưa duyệt.
  - Review tóm tắt.
  - Câu "Giá theo ngày, số khách và gói giá cụ thể." 13 `--hg-muted`.
  - Nút viền navy "Chọn phòng" (anchor).
- Mobile: 1 cột, panel ở dưới.

**6. Hạng phòng & giá** (`#hd-rooms`) — **kiểu iVIVU + Booking:**
- H2 "Hạng phòng & giá", dòng phụ 14 `--hg-muted` (giữ câu về 1 hạng phòng/gói giá cho toàn bộ số phòng).
- **Thanh ngày/khách:** `SharedHotelSearchBar variant="bar" submitLabel="Cập nhật giá"`, margin 16 0 20 (giữ logic `updateCriteria`/`search`).
- Alert khi tiêu chí đổi hoặc giá hết hạn: `.hg-notice` kèm nút "Cập nhật báo giá" (giữ logic). Chưa có ngày: `.hg-notice` dạng info (nền `--hg-info-50`, chữ `--hg-text`) "Chọn ngày để xem tổng giá và tình trạng phòng."
- **Mỗi hạng phòng** là một khối `article`: viền `--hg-border`, bo 8, `overflow:hidden`, margin-bottom 20. Grid desktop `300px minmax(0,1fr)`.
  - **Cột trái** (padding 16, nền `--hg-surface-muted`, `border-right:1px solid var(--hg-border)`):
    - Ảnh phòng 268×180 bo 6. Bấm vào mở lightbox ảnh phòng. Có pill "N ảnh" ở góc dưới phải.
    - Tên phòng 18/700, margin 12 0 8.
    - Danh sách thông tin 14px, mỗi dòng có icon 16 `--hg-muted`, gap 6: diện tích (Maximize) · sức chứa "2 người lớn · tối đa 1 trẻ em" (Users) · giường (BedDouble) · "1 phòng ngủ · 1 phòng tắm" (DoorOpen) · hướng nhìn (Eye).
    - Tối đa 4 tiện nghi phòng dạng chip 12px, cuối là link "Xem chi tiết phòng →" 14/600 `--hg-link` (mở dialog chi tiết phòng như hiện có).
    - Dòng "Ban công: Có · Cửa sổ: … · Giường phụ: …" **chuyển vào dialog chi tiết phòng**, không hiện trong cột trái.
  - **Cột phải — bảng gói giá:**
    - Hàng tiêu đề (chỉ ≥1024): cao 40, nền `--hg-surface-muted`, `border-bottom`, chữ 13/700 `--hg-muted`. Grid các cột `minmax(0,1fr) 96px 200px 132px`: "Lựa chọn" · "Sức chứa" · "Giá cho N đêm" (N lấy từ quote, chưa có thì "Giá") · (trống).
    - **Mỗi gói giá** là một dòng cùng grid, padding 16, `border-top:1px solid var(--hg-border)` (trừ dòng đầu), căn trên:

| Cột | Nội dung |
|---|---|
| Lựa chọn | Tên gói 15/700. Checklist 14px, mỗi dòng có icon 16: bữa sáng (đã gồm thì Check `--hg-success` "Bao gồm bữa sáng"; chưa thì Minus `--hg-muted` "Không kèm bữa sáng"), hoàn hủy (miễn phí có hạn thì Check `--hg-success` + điều khoản; không hoàn hủy thì Info `--hg-muted` "Không hoàn hủy"). Select ưu đãi (nếu có `promotionChoices`) cao 40, max-width 280, label 13/600 "Ưu đãi của gói giá" |
| Sức chứa | Icon Users 18 kèm "×2" 14/600, `aria-label` "Tối đa 2 người lớn" (lấy từ `room.maxAdults`) |
| Giá | Căn phải. Có quote: **tổng 22/800 `--hg-text-heading`** (`data-testid` giữ nguyên), "Tổng 2 đêm · 1 phòng" 13 `--hg-muted`, "Đã gồm thuế/phí bắt buộc" 12 `--hg-muted`, `<details>` "Chi tiết giá" 13 `--hg-link` mở `HotelPriceBreakdown` (popover trong luồng, rộng 100% cột). Chỉ có giá tham khảo: "X ₫" 18/700 + "Tham khảo/phòng/đêm" 12. Không đáp ứng: chữ 14 `--hg-muted` (giữ thông điệp hiện có). Đang chờ giá mới: "Đang chờ kiểm tra giá mới" 14 |
| CTA | Nút cam **"Chọn"** cao 44, rộng 100%, chỉ hiện khi có quote hợp lệ (giữ điều kiện `checkout`). Bên dưới 12 `--hg-muted`: "Chưa giữ phòng"; nếu `!bookingEnabled` thì "Chỉ xem trước checkout" |

  - Hơn 3 gói giá: hiện 3 gói đầu, cuối bảng có nút text "Xem thêm N lựa chọn ▾" 14/600 `--hg-link`, cao 44, căn giữa.
  - Không có gói: một dòng `.hg-notice` info "Chưa có gói giá đang áp dụng cho hạng phòng."
- **Tablet (768–1023):** room grid `240px 1fr`. Bảng gói giá ẩn hàng tiêu đề; mỗi dòng thành 2 tầng: (Lựa chọn) ở trên, rồi (Sức chứa · Giá · CTA) ở dưới, flex 2 đầu.
- **Mobile:**
  - Khối phòng xếp dọc: ảnh 16:9 full ở trên, thông tin phòng padding 16.
  - Các gói giá nối tiếp, mỗi gói cách nhau bằng `border-top` (không phải card con), padding 16.
  - Trong mỗi gói: tên và checklist, sau đó hàng giá flex 2 đầu (giá 22/800 bên trái, nút "Chọn" 44 rộng 120 bên phải).
  - Ẩn hàng tiêu đề bảng.

**7. Tiện nghi** (`#hd-amenities`):
- H2 "Tiện nghi" và dòng phụ 14 `--hg-muted` "Tiện nghi chung của nơi lưu trú. Tiện nghi trong từng phòng được ghi ở mục Hạng phòng."
- Lưới 4 cột (tablet 3, mobile 2), gap 12 24. Mỗi mục 15px kèm icon 20 `--hg-success` (Check) hoặc icon riêng theo mã (Wifi, Waves, ParkingCircle, ArrowUpDown, Dumbbell, Sparkles, UtensilsCrossed, ConciergeBell, Baby).
- Nhóm "Dịch vụ được khai báo" là H3 16/700, margin-top 24, cùng lưới.

**8. Vị trí & thông tin** (`#hd-information`):
- H2. `dl` lưới 3 cột (mobile 2), gap 16 24: `dt` 13/600 `--hg-muted`, `dd` 15 `--hg-text`.
- Ghi chú 13 `--hg-muted` "Chưa có khoảng cách hoặc chỉ đường được xác minh." (giữ). **Không đặt bản đồ** (deferred).

**9. Quy định** (`#hd-policies`) — kiểu bảng Booking:
- Danh sách `dl`. Mỗi dòng grid `220px 1fr`, padding 16 0, `border-top`:
  - Cột trái: icon 20 `--hg-muted` + nhãn 15/700 (Nhận/trả phòng: Clock; Trẻ em: Baby; Thú cưng: PawPrint; Hút thuốc: CigaretteOff; Quy định chung: FileText).
  - Cột phải: nội dung 15/1.6.
- Mobile: nhãn ở trên, nội dung ở dưới.
- Ghi chú phụ thu 13 `--hg-muted` ở cuối.

**10. Đánh giá** (`#hd-reviews`):
- Có review: grid `260px 1fr`, gap 32.
  - Trái: panel `--hg-surface-muted` padding 20, bo 8; điểm trung bình **40/800 `--hg-primary`** "4,6", "/5" 16 `--hg-muted`, "Dựa trên N đánh giá đã công bố" 13.
  - Phải: danh sách review. Mỗi review padding 16 0, `border-top`:
    - Header: avatar chữ cái tròn 36 (nền `--hg-primary-50`, chữ `--hg-primary` 14/700), tên 15/700, ngày 13 `--hg-muted`, điểm pill bên phải.
    - Nhãn "Lưu trú đã xác minh" (chip 12/600 nền `--hg-success-50` chữ `--hg-success`) hoặc "Chưa xác minh lưu trú" (12 `--hg-muted`).
    - Nội dung 15/1.6, clamp 5 dòng kèm "Xem thêm".
  - Hơn 5 review: nút "Xem thêm đánh giá" (hiển thị thêm 5 mỗi lần, lấy từ dữ liệu đã tải; không đổi API).
- Không có review: `.hg-state` gọn (padding 24): "Chưa có đánh giá", "Chỉ hiển thị đánh giá công khai đã được duyệt." 14px. Câu SYNTHETIC chỉ hiện khi `isDemo`.
- Error: `.hg-notice` lỗi "Chưa tải được đánh giá đã công bố."

**Dialog chi tiết phòng** (`HotelDialog` thường, rộng 880):
- Gallery phòng (mosaic, cao 320).
- Thông tin phòng đầy đủ: lưới 2 cột, gồm cả "Ban công / Cửa sổ / Bếp riêng / Phòng tắm riêng / Giường phụ", giá trị `null` hiển thị "Chưa cung cấp".
- Mô tả.
- Mục "Chính sách gói giá" là danh sách.
- Mobile: toàn màn hình.

**Trạng thái trang:**
- Loading: skeleton header (2 thanh), khối gallery 400 và 2 khối phòng.
- Error: `.hg-state` kèm nút "Kiểm tra lại thông tin" (giữ logic `setRefresh`).

### 5.4 Checkout (`HotelCheckoutPage`)

**Khung:** nền `--hg-bg`, container 1240, padding-top `var(--hg-page-offset,72px)` + 16, padding-bottom 64.

**1. Breadcrumb:** "← Quay lại khách sạn" (giữ link).

**2. Thanh bước** (thuần UI, suy từ state, không đổi logic):
- 3 bước: ① Chọn phòng (luôn "xong") · ② Thông tin & xác nhận (đang làm khi chưa có `booking`) · ③ Hoàn tất (khi có `booking`).
- Mỗi bước: vòng tròn 28 (xong thì nền `--hg-success` và icon Check trắng; đang làm thì nền `--hg-primary` và số trắng; chưa tới thì viền `--hg-border-strong` và số `--hg-muted`), nhãn 14/600. Các bước nối nhau bằng đường 2px dài 48 `--hg-border`.
- Cách tiêu đề 24. Mobile chỉ hiện vòng tròn và nhãn của bước hiện tại.

**3. Tiêu đề:** H1 26/700 "Xem lại lựa chọn & xác nhận" (hoặc "Đơn đặt phòng của bạn"), dòng phụ 15 `--hg-muted`. Notice SYNTHETIC 1 dòng.

**4. Layout:** grid `minmax(0,1fr) 380px`, gap 24, `align-items:start`.

**Cột trái** gồm các khối **liền nhau, không lồng nhau**. Mỗi khối nền trắng, viền `--hg-border`, bo 8, padding 24, margin-bottom 16:
- **a. Chưa đăng nhập:** khối căn giữa padding 32: icon LockKeyhole 32 `--hg-primary`, H2 20/700 "Đăng nhập để tiếp tục", mô tả 15 `--hg-muted`, nút cam "Đăng nhập" cao 48 (giữ `state.from`). Sai vai trò: `.hg-notice` lỗi.
- **b. "Thông tin liên hệ"** (H2 18/700, dòng phụ 13 `--hg-muted` "Sửa thông tin đơn không thay đổi hồ sơ tài khoản."):
  - Lưới 2 cột gap 16 gồm Họ tên (span 2), Email, Số điện thoại.
  - Label 14/600 `--hg-text`, đặt trên input, cách 6. Input cao 48, bo 8, chữ 16.
  - Lỗi trường: 13px `--hg-danger` ngay dưới trường, viền đỏ.
  - Mobile 1 cột.
- **c. "Yêu cầu đặc biệt (không bắt buộc)":** textarea min-height 112, bộ đếm "0/2000" 12 `--hg-muted` căn phải, ghi chú 13 `--hg-muted` "Chỉ là yêu cầu, chưa có nghĩa cơ sở đã chấp thuận."
- **d. "Kiểm tra & xác nhận":**
  - Chưa `prepared`: nút cam "Kiểm tra giá & điều kiện" cao 48, min-width 260. Mobile rộng 100%. Nếu disabled vì preview READ ONLY thì có `.hg-notice` info ngay trên nút.
  - Có `prepared`: block có viền trái 3px `--hg-success` và padding-left 16 (không phải card lồng):
    - Dòng Check "Báo giá vừa kiểm tra từ server. Chưa giữ phòng hoặc tạo đơn." 14px.
    - Điều khoản hủy 14px, hạn hủy 14/600.
    - Checkbox đồng ý 18×18 kèm nhãn 15px, cả dòng là vùng bấm cao tối thiểu 44.
    - Nút cam "Xác nhận đặt phòng" cao 48 (disabled khi chưa tick).
  - Link "Kiểm tra đơn đã gửi" 14/600 `--hg-link` dưới cùng.
  - Lỗi chung: `.hg-notice` lỗi (`role="alert"`) ngay dưới nút vừa bấm.
  - Hết hạn: `.hg-notice` kèm nút "Lấy lại báo giá".

**Cột phải — Tóm tắt** (sticky `top:calc(var(--hg-header-h,64px) + 16px)`, nền trắng, viền, bo 8, `overflow:hidden`):
- Ảnh khách sạn full-width cao 168 (`object-fit:cover`).
- Padding 20:
  - "Lựa chọn của bạn" 13/700 `--hg-muted`.
  - Tên khách sạn 18/700, địa chỉ 13 `--hg-muted`.
  - Divider.
  - Tên phòng 15/700, tên gói 14.
  - Khối ngày là lưới 2 cột có viền 1px `--hg-border`, bo 8, padding 12: "Nhận phòng" 12/600 `--hg-muted` + "T7, 22/11/2026" 15/700; "Trả phòng" tương tự (format `vi-VN`, chỉ đổi hiển thị).
  - "2 đêm · 1 phòng" 14, rồi phân bổ khách theo phòng 13 `--hg-muted`.
  - Divider.
  - `HotelPriceBreakdown`.
  - Điều kiện hủy 13.
  - Notice "Chưa thanh toán. Không có cổng thanh toán/thẻ trong bước này." dạng `.hg-notice` info 13.

**Mobile:** cột phải chuyển lên **trên** form thành accordion `details` mặc định đóng. Summary cao 56: "Tóm tắt đặt phòng" 15/700, tổng giá 16/800 bên phải, chevron. Mở ra là nội dung như desktop, không có ảnh (ảnh chỉ 120). Không lặp CTA trong sticky bar.

**`HotelPriceBreakdown`** (dùng ở card, chi tiết, checkout, booking summary):
- Mỗi dòng flex 2 đầu, padding 6 0, 14px: nhãn `--hg-muted`, giá trị `--hg-text` 600.
- "Giá từng đêm" là `details` 13px.
- Dòng ưu đãi `--hg-success`.
- Dòng **Tổng**: `border-top:1px solid var(--hg-border)`, padding-top 12, margin-top 6; nhãn 15/700, giá trị **22/800 `--hg-text-heading`**.
- Chú thích "VND · tổng kỳ lưu trú · đã tính các khoản bắt buộc. Chưa thu tiền." 12 `--hg-muted`. Bỏ ký hiệu kỹ thuật "STAY_TOTAL" khỏi chữ hiển thị.
- Dòng có giá trị 0 ₫ (phụ thu trẻ em, ưu đãi = 0) **ẩn đi**, trừ dòng thuế/phí. Chỉ là hiển thị, dữ liệu không đổi.

**Sau khi đặt (`booking`) — `HotelBookingSummary`:**
- Khối trắng padding 24, bo 8, viền.
- Header flex: "Mã đặt phòng" 12/600 `--hg-muted` + mã **22/800 font-variant-numeric:tabular-nums** bên trái; pill trạng thái (cao 28, 13/700) bên phải. Màu pill: PENDING nền `--hg-warning-50` chữ `--hg-warning-text`; CONFIRMED/COMPLETED nền `--hg-success-50` chữ `--hg-success`; CANCELLED/REJECTED nền `--hg-danger-50` chữ `--hg-danger`.
- Thân: grid `1fr 340px` (mobile 1 cột), gồm `dl` thông tin (dt 13/600 `--hg-muted`, dd 15) và `HotelPriceBreakdown`.
- Footer: link "Xem lại khách sạn" và nút "Hủy đặt phòng" (viền `--hg-danger`, chữ `--hg-danger`, cao 40). Xác nhận hủy là khối inline nền `--hg-danger-50` có 2 nút (giữ logic).
- Dưới khối: nút cam "Xem đơn của tôi" (`/bookings`) và nút viền "Bắt đầu một đơn mới". Đổi chữ "Xem My Bookings" thành **"Xem đơn của tôi"** (tiếng Việt).

---

## 6. Bảng ánh xạ thay đổi → file, hợp đồng giữa 2 gói

### 6.1 Ánh xạ

| # | Thay đổi | File | Gói |
|---|---|---|---|
| A1 | Design tokens | `src/styles/hg-tokens.css` (mới), import trong `src/index.css` | A |
| A2 | Font Be Vietnam Pro, `body` dùng `--hg-font` | `index.html`, `src/index.css` | A |
| A3 | Header sticky 64/56, nav từ 1024, dropdown "Thêm", bỏ CTA cam, drawer mobile | `components/common/Navbar.tsx`, `src/styles/hg-shell.css` (mới) | A |
| A4 | Footer navy 4 cột | `components/common/Footer.tsx`, `hg-shell.css` | A |
| A5 | Layout `.hg-app`, vị trí TelemetryConsent (chỉ CSS) | `layouts/MainLayout.tsx`, `hg-shell.css` | A |
| A6 | Hero + card tab dịch vụ | `components/home/HomeHero.tsx` (mới), `components/home/ServiceSearchTabs.tsx` (mới), `pages/HotelLandingPage.tsx`, `src/styles/hg-home.css` (mới) | A |
| A7 | Prop `variant`, `submitLabel`, style form, bộ đếm khách | `components/hotels/SharedHotelSearchBar.tsx`, `src/styles/hg-search-form.css` (mới, import trong component) | A |
| A8 | Style lịch `.hg-cal-*`, mobile 1 tháng | `components/hotels/HotelDateRange.tsx`, `hg-search-form.css` | A |
| A9 | Mosaic 3 cột + fallback + chip điểm đến khác | `components/home/DestinationMosaic.tsx` (mới), `hg-home.css` | A |
| A10 | Section Ưu đãi | `components/home/OfferStrip.tsx` (mới), `hg-home.css` | A |
| A11 | Carousel Nơi lưu trú (khung) | `components/home/FeaturedStays.tsx` (mới), `hg-home.css` | A |
| A12 | Loại lưu trú, Dịch vụ khác, Banner AI | `components/home/StayTypeStrip.tsx`, `ServiceLinks.tsx`, `AiBanner.tsx` (mới), `hg-home.css` | A |
| A13 | Đổi class lỗi ảnh thành `hg-img-failed` (giữ export API) | `components/hotels/TravelPhoto.tsx` | A |
| A14 | `/hotels` dùng chung landing (không đổi logic redirect) | `pages/HotelsPage.tsx`, `pages/HomePage.tsx` (không cần sửa trừ khi đổi tên prop) | A |
| B1 | Khung trang kết quả, thanh tìm thu gọn, toolbar, chip, sidebar, pagination số, mobile toolbar + drawer + sheet sửa tìm | `pages/HotelSearchPage.tsx`, `src/styles/hg-results.css` (mới) | B |
| B2 | Card ngang, card dọc, card compact | `components/hotels/HotelResultCard.tsx`, `src/styles/hg-hotel-card.css` (mới, import trong component) | B |
| B3 | Trang chi tiết: header, anchor tab + scrollspy, tổng quan, bảng hạng phòng, tiện nghi, thông tin, quy định, đánh giá | `pages/HotelPublicDetail.tsx`, `src/styles/hg-detail.css` (mới) | B |
| B4 | Gallery mosaic theo n ảnh, carousel mobile | `components/hotels/HotelGallery.tsx`, `hg-detail.css` | B |
| B5 | `HotelDialog` thêm `variant='fullscreen'`, lightbox | `components/hotels/HotelDialog.tsx`, `src/styles/hg-dialog.css` (mới, import trong component) | B |
| B6 | Checkout: thanh bước, khối form, tóm tắt sticky/accordion | `pages/HotelCheckoutPage.tsx`, `src/styles/hg-checkout.css` (mới) | B |
| B7 | Tóm tắt đơn | `components/hotels/HotelBookingSummary.tsx`, `hg-checkout.css` | B |
| B8 | Bảng giá chi tiết | `components/hotels/HotelPriceBreakdown.tsx`, `hg-checkout.css` (+ import trong component để dùng ở card/chi tiết) | B |
| B9 | Wrapper hotel trong PlaceDetail (chỉ nếu cần thêm class gốc) | `pages/PlaceDetailPage.tsx` dòng 35–40 | B |
| C1 | Dọn CSS cũ (`hotels.css`, `hotelStay.css`, `hotelPremium.css`), bỏ hack `body:has`, xóa `components/home/*` cũ không dùng | các file đó | **Sau khi cả A và B đã merge**, làm thành 1 commit riêng do Gói A thực hiện, Gói B review |

### 6.2 Hợp đồng dùng chung (không sửa file của gói kia)

| Thành phần | Chủ sở hữu | Gói kia được làm gì |
|---|---|---|
| `hg-tokens.css` | A | B chỉ đọc biến. Cần token mới thì nhờ A, hoặc định nghĩa `--hgb-*` trong CSS của B |
| `SharedHotelSearchBar` (`variant`, `submitLabel`) | A | B dùng `variant="bar"` (kết quả, chi tiết) và `variant="hero"` (sheet sửa tìm mobile). **A làm prop này trước tiên (ngày 1)**, signature như mục 4.5 |
| `HotelDateRange` | A | B không dùng trực tiếp |
| `TravelPhoto`, `travelPhotos` | A | B được dùng, không đổi props |
| `LocationCombobox` (dùng chung với Explore/Tours/Tickets) | **Không ai sửa TSX** | A chỉ style trong phạm vi `.hg-search [data-location-picker]` |
| `HotelDialog` (`variant?: 'default' \| 'fullscreen'`) | B | A dùng cho lịch: desktop `default` với `wide`; mobile `fullscreen`. **B làm prop này trước tiên (ngày 1)**. Mặc định giữ hành vi cũ |
| `HotelResultCard` (kể cả `compact`), export `hotelTypes`, `roomViews`, `amenityLabels`, `vnd` | B | A chỉ đặt card vào carousel, **không viết CSS nhắm `.hotel-result-card`/`.hg-card`**. Không đổi tên export |
| `HotelPriceBreakdown` | B | A không dùng |
| `useHotelSearch`, `utils/hotelSearchState.ts`, `services/*` | **Không ai sửa** | — |
| `TelemetryConsent`, `components/agent/*`, `AssistantPage` | **Không ai sửa** (vùng AI) | A chỉ chỉnh vị trí bằng CSS |
| `hotels.css`, `hotelStay.css`, `hotelPremium.css` | **Đóng băng** trong đợt này | CSS mới ghi đè bằng scope `.hg-scope …`. Chỉ xóa ở bước C1 |

**Thứ tự merge khuyến nghị:**
1. A merge token + shell + prop `variant`.
2. B rebase, merge `HotelDialog variant` + các trang.
3. A merge trang chủ.
4. C1 dọn dẹp.

Nhờ `var(--hg-page-offset, 72px)` và `var(--hg-header-h, 64px)` có giá trị dự phòng, B không vỡ layout dù merge trước A.

**Quy ước code** (sửa W15, chỉ áp dụng cho file của mình):
- Mỗi phần tử JSX một dòng, mỗi câu lệnh một dòng; có thể chạy Prettier trên file mình sở hữu.
- Class mới có tiền tố `hg-`. Không inline style trừ `objectPosition` sẵn có.
- Không thêm thư viện (lightbox, carousel tự viết bằng CSS scroll-snap). Icon chỉ dùng `lucide-react`.
- Giữ nguyên mọi `data-testid` để e2e cũ còn chạy.

---

## 7. Checklist nghiệm thu giao diện

**Cách kiểm:** trình duyệt thật, đặt viewport đúng kích thước, chụp ảnh lưu vào `docs/evidence/…/web-design-v1/{trang}-{viewport}.png`. Mỗi ô dưới đây phải đạt (✔) thì mới gửi chủ dự án duyệt.

### 7.1 Chung (mọi trang, mọi viewport)
- [ ] Không cuộn ngang: `document.documentElement.scrollWidth <= innerWidth`.
- [ ] Không có chữ nội dung < 12px (kiểm bằng script `getComputedStyle(el).fontSize`). Ngoại lệ duy nhất: số trên badge tim 11px.
- [ ] Màu chỉ lấy từ token: không còn `#102d47`, `#f57708`, `#e66b21`, `orange-500` ở header, footer và 4 trang.
- [ ] Header không nhảy khi cuộn; sticky đúng; trên trang chi tiết thanh anchor dính ngay dưới header, không chồng lên nhau.
- [ ] Tab qua toàn trang: mọi phần tử tương tác có viền focus `--hg-focus` nhìn rõ. Dialog/drawer có focus trap, Esc đóng và trả focus đúng chỗ.
- [ ] Vùng chạm ≥ 44×44 trên mobile (nút, checkbox kèm nhãn, chip, mũi tên).
- [ ] Mỗi trang tối đa 1 notice SYNTHETIC; ảnh minh họa có badge "Minh họa" 12px.
- [ ] Không có số liệu giả (lượt bán, giá gạch, "còn N phòng", review/hotline giả, số "N khách sạn" cứng).
- [ ] TelemetryConsent không che CTA chính; không đồng ý mặc định.
- [ ] Tiếng Việt có dấu đầy đủ, không còn chữ tiếng Anh lộ ra ("My Bookings", "STAY_TOTAL").

### 7.2 Theo viewport

| Mục kiểm | 1440 | 1366 | 768 | 390 | 360 |
|---|---|---|---|---|---|
| Container nội dung | 1240, căn giữa | 1240 | 720 (lề 24) | 358 (lề 16) | 328 |
| Header | 64, menu đầy đủ, "Thêm ▾" | 64, menu đầy đủ | 64, hamburger + drawer 360 | 56, hamburger, drawer full | 56, logo không bị cắt |
| Hero cao | 440 | 440 | 380 | 260 | 260 |
| H1 hero | 40px, ≤2 dòng | 40px | 32px | 26px, ≤3 dòng | 26px |
| Card tìm kiếm | tab pill 1 hàng; form 5 cột 1 hàng, trường cao 52 | như 1440 | form 2 hàng (3+3 / 3+2+1) | tab 4 ô icon-trên-chữ; form 1 cột; nút 100% | tab vẫn 4 ô, nhãn không xuống dòng hoặc tối đa 2 dòng gọn |
| Tab dịch vụ | ←/→ chuyển tab; Nhà hàng → `/restaurants?locationId&search` | ✔ | ✔ | ✔ chạm | ✔ |
| Mosaic | 3 cột, hàng 200, 8 ô đúng vị trí | 3 cột, hàng 200 | hàng 150, gap 12 | 3 cột, hàng 124, gap 8, tên 15px không tràn | ô ~104px, tên "Đà Nẵng" vẫn 1 dòng |
| Mosaic khi API lỗi | 8 ô vẫn hiện, link đúng | ✔ | ✔ | ✔ | ✔ |
| Featured | carousel 4 card + nút mũi tên | 4 card | 2,2 card, không có nút | 82% card, vuốt | ✔ |
| Loại lưu trú | 6 cột | 6 cột | 3 cột | cuộn ngang 140px | ✔ |
| Dịch vụ khác | 3×2 | 3×2 | 2 cột | 2 cột, ẩn mô tả | ✔ |
| Footer | 4 cột | 4 cột | 2×2 | 1 + 2 + 1 | ✔ |
| **Kết quả: layout** | sidebar 272 + card 3 vùng (240/1fr/208) | như 1440 | không có sidebar, nút "Bộ lọc", card 200/1fr giá ở dưới | nút tóm tắt 56 sticky, toolbar 2 nút 44 sticky, card dọc | ✔, giá 22px không xuống dòng |
| Kết quả: sidebar sticky, cuộn riêng | ✔ | ✔ | — | — | — |
| Kết quả: drawer lọc | — | — | ✔ | sheet 92dvh, footer "Xem kết quả" dính | ✔ |
| Kết quả: pagination số | ✔ | ✔ | ✔ | ✔ (rút gọn còn 5 nút) | ✔ |
| **Chi tiết: gallery** | mosaic 400 theo n ảnh, "+N ảnh" | ✔ | mosaic cao 320 | carousel 4:3 + bộ đếm | ✔ |
| Lightbox | toàn màn hình, ←/→/Esc, thumbnail | ✔ | ✔ | vuốt, không có nút mũi tên | ✔ |
| Anchor tab | sticky, scrollspy đúng mục | ✔ | ✔ cuộn ngang | ✔ cuộn ngang | ✔ |
| Bảng hạng phòng | 300 + bảng 4 cột có hàng tiêu đề | ✔ | 240 + dòng 2 tầng | xếp dọc; giá + "Chọn" cùng hàng | nút "Chọn" ≥ 44 cao, không tràn |
| **Checkout** | 2 cột 1fr/380, tóm tắt sticky | ✔ | 2 cột 1fr/320 | 1 cột, tóm tắt accordion ở trên | ✔ |
| Checkout: input | cao 48, chữ 16 | ✔ | ✔ | ✔, không zoom iOS | ✔ |

### 7.3 Trạng thái phải chụp minh chứng
- [ ] Trang chủ: loading skeleton (mosaic + featured), featured lỗi (có "Thử lại"), featured rỗng, ưu đãi ẩn khi không có.
- [ ] Kết quả: loading, rỗng, lỗi, tiêu chí sai, có 3 chip lọc + "Xóa tất cả".
- [ ] Chi tiết: chưa chọn ngày (giá tham khảo), có quote, giá hết hạn hoặc tiêu chí đổi (alert), gói không đáp ứng, không ảnh, không review.
- [ ] Checkout: chưa đăng nhập, sai vai trò, form, đã `prepared`, hết hạn, đặt xong (pill trạng thái), xác nhận hủy.
- [ ] Popover khách (desktop) và bottom sheet (mobile); lịch 2 tháng (desktop) và 1 tháng (mobile).

---

## 8. Quyết định cần chủ dự án duyệt

1. **Tương phản nút cam:** `#FF7900` với chữ trắng chỉ đạt **2,6:1**, không đạt WCAG AA cho chữ 15–16px. Hai phương án:
   - (a) Giữ chữ trắng (đúng nhận diện, giống iVIVU) và ghi nhận ngoại lệ. Token đang để mặc định theo phương án này.
   - (b) Đổi `--hg-cta-ink:#062E4D` (navy đậm trên cam đạt **5,3:1**).

   Nhà thiết kế khuyến nghị **(b)** nếu dự án cần chứng minh tiêu chí truy cập. Chỉ cần đổi 1 biến.
2. **Bỏ nút cam "Tạo lịch trình" trên header** (giữ mục "Lịch trình" và tab Lịch trình ở hero). Nếu muốn giữ thì dùng nút viền navy.
3. **Bộ 8 ô mosaic** (Phú Quốc, Đà Lạt, Nha Trang, Quy Nhơn, Hạ Long, Đà Nẵng, Hội An, Huế) và chip (Hà Nội, TP.HCM, Sa Pa, Vũng Tàu). **Phan Thiết và Phú Yên chưa có ảnh hợp lệ**, cần bổ sung ảnh có license trước khi đưa vào.
4. **Featured dạng carousel** (thay cho lưới 3×2) và nút "Xem phòng" dạng viền trong card compact.
5. **Card kết quả mobile dạng dọc** (theo tài liệu bàn giao 4.2). Booking dùng card ngang ảnh nhỏ, có thể đổi nếu chủ dự án thích mật độ cao hơn.

### 8.1 Quyết định của điều phối (21/11/2026) — áp dụng cho đợt này
1. Chọn **(b)**: `--hg-cta-ink:#062E4D` (chữ navy đậm trên nút cam, đạt AA). Muốn quay về chữ trắng chỉ đổi 1 biến.
2. **Bỏ** nút cam "Tạo lịch trình" trên header.
3. Mosaic dùng 8 ô + 4 chip như mục 3. Phan Thiết, Phú Yên **hoãn** đến khi có ảnh có giấy phép.
4. Featured dùng **carousel**, nút "Xem phòng" dạng viền.
5. Card kết quả mobile dạng **dọc**.
Tất cả vẫn chờ chủ dự án duyệt trực quan (giữ nguyên trạng thái OWNER_VISUAL_APPROVAL_PENDING).
