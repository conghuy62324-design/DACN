# HUGO TRAVEL — CURRENT TASK HANDOFF DOCUMENT
**DACN | TravelGo | Bàn giao tiến độ kỹ thuật & Phân định trách nhiệm nhóm**

- **Thời gian lập:** 20/11/2026 (Asia/Ho_Chi_Minh)
- **Branch:** `main` (workspace `DACN`)
- **Remote Repository:** `https://github.com/conghuy62324-design/DACN.git`
- **Tài liệu tham chiếu kèm theo:** `travelgo/docs/HUGO_TRAVEL_BAN_GIAO_WEB.md`, `travelgo/docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md`

---

## 0. CẬP NHẬT MỚI NHẤT — Thành viên WEB (23/11/2026)

> Mục này do thành viên WEB thêm. Các mục 1–8 bên dưới là nội dung gốc của chủ dự án (20/11/2026), giữ nguyên.

| Mục | Trạng thái |
|---|---|
| **Branch / HEAD** | `feature/web-ui-admin-partner` @ `62815c1` (gốc `e76d187`, 8 commit) |
| **Remote** | Đã push nhánh `feature/web-ui-admin-partner` lên `origin` (25/11/2026, được cấp quyền). Không push/merge `main` |
| **Working tree** | Sạch sau commit `62815c1` (kể cả 3 file tài liệu bàn giao, đã commit) |
| **Task / phase** | WEB-0 xong; WEB-1 xong phần giao diện, chờ duyệt; giao diện WEB-2/3/4 đã dựng trên mock; WEB-5/6 chưa |
| **Trạng thái** | `OWNER_VISUAL_APPROVAL_PENDING` — không tự chuyển PASS, không tự mở 21.40/21.41 |

**Đã làm:** giao diện mới cho website công khai, Admin (9 trang mới + CMS), Khách hàng, Partner (onboarding 6 bước, quản lý khách sạn theo mục, lịch giá & tồn). Bỏ nội dung giả và nhãn DEMO/SYNTHETIC hiển thị. Không sửa backend/schema/vùng AI (257 file khớp `docs/web-team/protected-baseline.sha256`). tsc + build PASS.

**Chưa làm / NOT RUN:** toàn bộ ma trận nghiệm thu với PostgreSQL thật (máy không cài được Docker); e2e (dự kiến hỏng `t13b01`, `t13b02*`, `roles.spec`); API mới và migration 19 (mới ở dạng đề xuất).

**Cần chủ dự án duyệt:** (1) giao diện; (2) `docs/web-team/PROPOSED_API_CONTRACTS.md` + hướng migration 19; (3) diff vùng Vàng: `frontend/src/router/AppRouter.tsx` (commit `7fc742a`), global CSS, Navbar/Footer; (4) e2e `t-ai-02` thuộc vùng AI.

**Nguồn / evidence:**
- Báo cáo đầy đủ: `docs/HUGO_WEB_TEAM_HANDOFF_REPORT.md`
- Hợp đồng dữ liệu cho AI: `docs/HUGO_WEB_API_AI_HANDOFF.md`
- Gap matrix, checkpoint, đề xuất API, hash: `docs/web-team/`
- Thiết kế: `docs/HUGO_WEB_DESIGN_SPEC.md`, `docs/HUGO_WEB_ADMIN_PARTNER_SPEC.md`
- Ảnh: `docs/evidence/web-design-v1/`
- Mock API dựng giao diện (ngoài repo, không dùng nghiệm thu): `D:\ĐỒ ÁN A\mock-api` trên máy thành viên

**Hạn chế đang áp dụng:** chỉ dữ liệu SYNTHETIC; chỉ push nhánh feature, không push/merge `main`, không force push; không sửa vùng AI; không ghi credentials vào tài liệu.

**Bước tiếp theo:** chủ dự án duyệt giao diện + PAC → dựng DB test SYNTHETIC → chạy nghiệm thu H/U/P/R/S → làm API + migration 19 → sửa e2e → mở PR vào nhánh tích hợp khi chủ dự án review.

---

## 1. Task hiện tại & Trạng thái

- **Task ID:** `TASK21.38-D-UI` — Premium Travel Website UI/UX & Photographic Imagery Redesign.
- **Trạng thái:** `OWNER_VISUAL_APPROVAL_PENDING` (Triển khai hoàn tất · Preview READ-ONLY đang hoạt động · Đang chờ Chủ dự án duyệt trực quan).
- **Mục tiêu của Checkpoint này:** Lưu lại toàn bộ tiến độ mã nguồn mới nhất lên GitHub repository và bàn giao 4 phân hệ phát triển Website (Frontend + Web API + Admin + Partner) cho thành viên trong nhóm trên branch riêng `feature/web-ui-admin-partner`.

---

## 2. Những chức năng đã hoàn thành (Completed Milestones)

Dự án đã hoàn thành các giai đoạn nền tảng cốt lõi từ 21.30 đến 21.38-D-UI:

1. **AI Agent Core V7.0 (Chủ dự án phụ trách):**
   - Đóng băng kiến trúc Agent Core, chạy chế độ deterministic Model-OFF và pass 84/84 tests hồi quy.
   - Hoàn tất các module: Vietnamese Conversation Semantics, Planning Intelligence, Advisory Reasoning, Geographic Evidence, Customer Memory, Review Intelligence, Cost Intelligence.
   - Tích hợp chuẩn giao tiếp với Local LLM (Ollama / Qwen2.5) và cơ chế slot filling / fallback an toàn.

2. **Hotel Domain Foundation (TASK 21.38-A):**
   - Thiết kế và triển khai migration `20261118_18_hotel_domain_foundation.sql` (52 bảng hệ thống, 18 migrations chuẩn).
   - Thiết lập 14 invariants về tính toàn vẹn dữ liệu khách sạn, phòng, giá và 3 quy tắc bản quyền hình ảnh (attribution).

3. **Hotel Management Partner & Admin (TASK 21.38-B):**
   - API và giao diện quản lý cơ sở lưu trú cho Partner và duyệt/kiểm duyệt cho Super Admin.
   - Quản lý hạng phòng (room types), gói giá (rate plans), quản lý tồn phòng (room inventory) và thư viện ảnh (hotel media endpoint `/api/hotel-media/`).

4. **Hotel Commercial Search & Filtering (TASK 21.38-C):**
   - API tìm kiếm thương mại theo điểm đến, ngày nhận/trả phòng, số lượng khách/phòng.
   - Bộ lọc đa tiêu chí: khoảng giá (Stay Total), hạng sao, đánh giá, tiện nghi, loại hình lưu trú.
   - Bảo toàn URL state, hỗ trợ pagination và đồng bộ client-server.

5. **HotelStay Booking Engine (TASK 21.38-D):**
   - Đặt phòng giao dịch an toàn với khóa đồng thời (concurrency locking) và chống trùng lặp (idempotency key replay).
   - Hủy phòng tự động theo chính sách hoàn hủy (cancellation policy) và hoàn trả tồn phòng nguyên vẹn.
   - Lưu trữ booking snapshot cố định giá và thông tin tại thời điểm đặt.

6. **Photographic Imagery & UI/UX Redesign (TASK 21.38-D-UI):**
   - Thay thế toàn bộ hình ảnh minh họa SVG phong cảnh bằng 24 tài nguyên ảnh chụp thực tế chất lượng cao từ Wikimedia Commons (CC BY 4.0, CC BY-SA 4.0, CC0) tối ưu thành 72 biến thể WebP responsive (480w, 960w, 1920w/1600w).
   - Tạo trang `/photo-credits` minh bạch nguồn gốc và bản quyền của từng bức ảnh.
   - Nâng cấp giao diện thương mại theo phong cách iVIVU và Booking.com:
     - `HotelLandingPage.tsx`: Hero banner, search bar nổi bật, destination mosaic, ưu đãi, danh sách khách sạn nổi bật.
     - `HotelSearchPage.tsx`: Thẻ ngang hiển thị thông tin rõ ràng, sidebar bộ lọc desktop và filter drawer mobile.
     - `HotelPublicDetail.tsx`: Mosaic gallery có lightbox fullscreen, danh sách phòng chi tiết, so sánh rate plans.
     - `HotelCheckoutPage.tsx`: Tóm tắt đặt phòng tinh gọn, minh bạch chi phí.
   - Kiểm thử tự động Playwright headless Edge: 15 ảnh BEFORE và 15 ảnh AFTER trên 3 viewports (1440px, 1366px, 390px) với `overflow: false` (không vỡ khung, không tràn ngang).

---

## 3. Những chức năng đang làm dở & Trạng thái TASK21.38-D-UI

- **Trạng thái:** `OWNER_VISUAL_APPROVAL_PENDING`. Mã nguồn đã được cấu trúc đầy đủ, build sạch, không lỗi runtime hay compile, nhưng **chưa được Chủ dự án duyệt trực quan** để merge chính thức.
- **Giữ nguyên trạng thái:** Không tự ý chuyển trạng thái sang PASS hoặc tự động mở các task tiếp theo (TASK21.38-E hay tích hợp AI 21.40).
- **Thanh toán:** Hiện dùng luồng xác nhận mô phỏng nội bộ / quote confirmation, chưa tích hợp cổng thanh toán trực tuyến bên ngoài (VNPay, MoMo, Stripe).
- **Bản đồ:** Tọa độ địa lý hiện dùng tương thích schema theo proposal đã duyệt; bản đồ tương tác và GIS routing nâng cao được hoãn (deferred sang mốc 21.41).

---

## 4. Phạm vi phân công phát triển Website giao cho Thành viên nhóm

Thành viên nhận bàn giao sẽ làm việc trên branch riêng:  
👉 **`feature/web-ui-admin-partner`**

Nhiệm vụ chính bao gồm hoàn thiện 4 phân hệ theo đúng tài liệu chi tiết tại `travelgo/docs/HUGO_TRAVEL_BAN_GIAO_WEB.md`:

1. **Phân hệ 01 — Trang chủ & Website công khai:**
   - Hoàn thiện giao diện thương mại, kết nối dữ liệu thật từ PostgreSQL qua Backend API.
   - Header, Footer, Hero CMS, Destination Mosaic, Danh sách và bộ lọc khách sạn, Trang chi tiết phòng và đặt phòng.
   - Tối ưu trải nghiệm người dùng tiếng Việt, responsive đa màn hình (Desktop 1440px/1366px, Tablet 768px, Mobile 390px/360px).
2. **Phân hệ 02 — Quản trị Admin / SUPER_ADMIN:**
   - Xây dựng CMS quản lý nội dung trang chủ (Banner, Hero, Sections, Điểm đến, Khuyến mãi).
   - Dashboard báo cáo số liệu vận hành từ cơ sở dữ liệu thật.
   - Quản lý tài khoản, phân quyền RBAC, duyệt hồ sơ đối tác (Partner applications).
   - Kiểm duyệt listing khách sạn, quản lý đơn đặt phòng và duyệt/ẩn bình luận đánh giá.
3. **Phân hệ 03 — Tài khoản & Trải nghiệm khách hàng (Customer):**
   - Đăng ký, đăng nhập, bảo vệ session, hồ sơ cá nhân, đổi mật khẩu.
   - Dashboard khách hàng: Chuyến đi sắp tới, Lịch sử đặt phòng (`My Bookings`) kèm tính năng hủy hợp lệ.
   - Danh sách điểm đến yêu thích (`Favorites`) và Đánh giá của tôi (`My Reviews`) dành cho khách đã hoàn thành lưu trú.
4. **Phân hệ 04 — Kênh đối tác lưu trú (Partner):**
   - Đăng ký đối tác, cập nhật thông tin doanh nghiệp.
   - Quản lý danh sách khách sạn, thêm/sửa hạng phòng, thiết lập giá và cập nhật tồn phòng theo ngày.
   - Quản lý danh sách đặt phòng và tiếp nhận booking từ khách hàng.

---

## 5. Quy định nghiêm ngặt về AI Agent (Protected Boundary)

> [!CAUTION]
> **AI AGENT CORE DO CHỦ DỰ ÁN PHỤ TRÁCH ĐỘC QUYỀN.**
> Thành viên phụ trách Website **TUYỆT ĐỐI KHÔNG** chỉnh sửa, can thiệp hoặc tiếp tục phát triển phần AI Agent.

- **Vùng cấm chỉnh sửa:**
  - `travelgo/backend/src/agent/` (toàn bộ logic reasoning, semantics, planning, memory, cost intelligence, advisory).
  - Tích hợp Ollama, mô hình Qwen, cấu hình prompt LLM.
  - Các script cô lập và kiểm thử AI (`backend/scripts/model-off-isolation.cjs`, `backend/scripts/agent-staging-profile.cjs`).
  - Không chỉnh sửa logic AI để khắc phục lỗi phát sinh từ giao diện hoặc Web API.
- **Quy tắc phối hợp:**
  - Thành viên tập trung hoàn thiện dữ liệu và giao diện nghiệp vụ chuẩn. Sau khi hoàn thành, Chủ dự án sẽ tích hợp Agent Core vào hệ thống tại mốc TASK 21.40.
  - Mọi thay đổi đối với shared routes, AuthContext, middleware dùng chung hoặc database schema phải được Chủ dự án review và phê duyệt trước khi tích hợp vào nhánh chính.

---

## 6. Môi trường Database & Preview

1. **Môi trường Preview Synthetic (TASK 21.38-D-UI):**
   - **Frontend Preview URL:** `http://127.0.0.1:5181`
   - **Backend API URL:** `http://127.0.0.1:5063` (Health check: `/api/health`)
   - **Docker Database Container:** `hugotravel_hotel_ui_test_20261119` (port `15456`, DB `hugotravel_hotel_ui_test_20261119`, role `hotel_runtime` READ-ONLY).
   - **Lệnh điều khiển Preview:**
     ```bash
     node travelgo/docs/evidence/travelgo-ai-agent-core/hotel-ui-2138d-20261119/preview.cjs start
     node travelgo/docs/evidence/travelgo-ai-agent-core/hotel-ui-2138d-20261119/preview.cjs stop
     ```

2. **Môi trường Development tiêu chuẩn (dành cho phát triển Web):**
   - **Database chính:** PostgreSQL 15 + PostGIS chạy qua Docker tại cổng mặc định `5432` hoặc theo file `docker-compose.yml`.
   - **Backend API dev:** Chạy tại cổng `5000` (hoặc cổng cấu hình trong `backend/.env`).
   - **Frontend Vite dev:** Chạy tại cổng `5173`.

---

## 7. Hướng dẫn thiết lập dự án cho thành viên (Setup Guide)

### Bước 1: Yêu cầu phần mềm cài sẵn
- **Git** (đã cấu hình SSH/Token để push vào nhánh `feature/web-ui-admin-partner`).
- **Node.js** phiên bản LTS (khuyên dùng v18.x, v20.x hoặc v22.x).
- **Docker Desktop** đang chạy (để khởi chạy PostgreSQL & PostGIS).

### Bước 2: Clone repository & Chuyển sang branch làm việc
```bash
git clone https://github.com/conghuy62324-design/DACN.git
cd DACN
git checkout feature/web-ui-admin-partner
```

### Bước 3: Khởi động Cơ sở dữ liệu Docker
Khởi động container PostgreSQL từ thư mục gốc hoặc qua script:
```powershell
.\start_project.ps1
```
Hoặc dùng `docker-compose up -d` trong thư mục cấu hình Docker của dự án.

### Bước 4: Cài đặt Dependencies & Khởi chạy

1. **Khởi chạy Backend:**
   ```bash
   cd travelgo/backend
   npm install
   # Tạo file .env từ file mẫu (không commit .env lên git):
   cp .env.example .env
   # Chạy backend ở chế độ dev:
   npm run dev
   ```

2. **Khởi chạy Frontend:**
   ```bash
   cd ../frontend
   npm install
   # Tạo file .env nếu cần từ file mẫu:
   cp .env.example .env
   # Chạy frontend ở chế độ dev:
   npm run dev
   ```

---

## 8. Các giới hạn chưa giải quyết (Known Limitations / Blockers)

1. **Model-OFF Mode:** Qwen/Ollama hiện được cấu hình ở chế độ Model-OFF để đảm bảo các test chạy ổn định và độc lập với tài nguyên máy. Không kích hoạt live inference khi chưa có sự đồng ý của Owner.
2. **Quy tắc Đặt phòng (Booking Scope V1):** Một đơn đặt phòng hiện chỉ hỗ trợ đặt nhiều phòng trong cùng một hạng phòng (single room-type multi-room allocation). Chưa hỗ trợ đặt phòng kết hợp nhiều loại phòng khác nhau trong một đơn (mixed-room types).
3. **Thanh toán:** Không triển khai thanh toán tiền thật và không thu thập/lưu trữ thông tin thẻ thanh toán của người dùng.
4. **Bản đồ & Tọa độ:** Không sử dụng API bản đồ trả phí; hiển thị bản đồ chi tiết được hoãn tới phase 21.41.
5. **Triển khai Production:** Dự án hiện được nghiệm thu trong môi trường cục bộ (local/Docker), chưa cấu hình deploy tự động lên VPS production.
