# HUGO TRAVEL — CURRENT TASK HANDOFF DOCUMENT

**Checkpoint mới nhất ngày 28/11/2026 ICT** thuộc TASK21.41-B-FINAL. [Báo cáo](HUGO_21_41_B_FINAL_ACCEPTANCE_REPORT.md) · [Ma trận](HUGO_PRODUCTION_RELEASE_MATRIX.md)
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


## TASK21.40-B-RESUME checkpoint — 27/11/2026 ICT

Worktree DACN_WEB_REVIEW/travelgo, branch integration/web-backend @ 46839ea. Fresh two-hour task scope used exact isolated15457; V5 persisted review worker/native acceptance and R01–R24 data/native checks complete with R14 first FAIL preserved and R14B PASS. Browser Edge real auth/consent: B01–B03 PASS, B04 FAIL (validated quote omitted in detail prose), B05 NOT RUN. Renderer fixed and offline8/8, compatibility7/7, backend build PASS; no browser retry. Agent quota20→15, reserve10. Cleanup511/1600 DML, 8 audit rows deleted, temporary writer/worker roles and fence removed, public READ ONLY, outside-cohort59/59, schema61/20. Preview HTTP200 at http://127.0.0.1:5182/assistant with POST batch closed; automated Edge launch blocked by tool policy. Qwen/Ollama/Internet OFF, no commit/push/deploy. Full [report](HUGO_AI_21_40_B_REVIEW_INTELLIGENCE_WORKER_REPORT.md). Next task requires fresh browser authorization and source/expected lock; do not call LIVE READY or start21.40-C.


## TASK21.40-B-FINAL handoff — 27/11/2026 ICT

Worktree DACN_WEB_REVIEW/travelgo, integration/web-backend @ 46839ea. Current response grounding source adds verified stay dates/guest allocation and applied discount to native detail DTO; detail/search renderers show current total only while quote/snapshot are valid, keep review separate from price. Backend build PASS, targeted15/15, compatibility7/7 offline. Current-source B04/B05 browser NOT RUN because prior Edge launch was policy-blocked and fresh90-minute window expired; historical B04 FAIL remains. No new Agent requests or DML; fresh quota20/20 but no execution authorization remains. Prior cleanup511/1600 and outside-cohort59/59 remain last DB evidence. Old preview watchdog stopped task-owned API/frontend at02:46:28Z; URL5182 is not live. Linux worker signal/retention/container gate BLOCKED. Phase C scope prepared only; no C code, Qwen, commit, push or deploy. Full [B report](HUGO_AI_21_40_B_REVIEW_INTELLIGENCE_WORKER_REPORT.md).


## TASK21.40-C — 27/11/2026

`integration/web-backend` tại `46839ea`, source C trong worktree hiện tại. Agent dùng native Hotel và review V5, truy vấn catalog công khai theo mục tiêu và đưa dữ liệu đủ điều kiện sang Planner hiện có. Build PASS, development 21/21, native PostgreSQL 10/10 chỉ đọc. Holdout niêm phong 9/10, giữ nguyên FAIL HC06. Source cuối qua hồi quy đích. Positive native Planner còn thiếu catalog nhà hàng và điểm tham quan đủ điều kiện, HTTP chưa chạy và B04/B05 browser vẫn bị chặn. Runtime C dùng model OFF và không gọi Ollama. Phase D cần scope mới, với B04/B05 và các gate Linux/production còn mở. [Báo cáo C](HUGO_AI_21_40_C_ADVANCED_TRAVEL_CONSULTANT_REPORT.md) · [Checkpoint](../../docs/HUGO_CODEX_CONTINUATION.md)


## TASK21.40-D — 27/11/2026

`integration/web-backend` tại `46839ea`. Core provider hiện có dùng schema cho câu hỏi làm rõ và lựa chọn fact ID native. Giá, tồn, ưu đãi, review và dữ liệu Planner vẫn qua kiểm chứng phía server. Build PASS, 22/22 offline, 7/7 native chỉ đọc với provider mô phỏng. Đúng tag/digest và loopback, cold-load chặn bởi RAM/VRAM/GPU, 0 warm-load và inference. Model mặc định OFF, worker và preview dừng, không DML. HTTP thật, B04/B05 và các gate release vẫn mở. Dừng tại D. [Báo cáo D](HUGO_AI_21_40_D_QWEN_LIVE_INTEGRATION_REPORT.md) · [Checkpoint](../../docs/HUGO_CODEX_CONTINUATION.md)


## TASK21.41 — Bàn giao cuối ngày 27/11/2026 ICT

- Backend build PASS và vượt regression mục tiêu. HTTP Agent thực 9/9 với PostgreSQL READ ONLY hiện có, bao gồm giá/review, parity Hotel quote, xác thực DB session version và consent. Dùng token test đã ký ngắn hạn; browser/login thật chưa chạy. Target `hugotravel_web_integration_test_20261125` tại `127.0.0.1:15457`, 61 bảng/20 migration, fingerprints giữ nguyên; DML 0. Cùng principal còn reserve 10 khi kết thúc lượt.
- Qwen pin Phase D đúng, model chưa resident. RAM 5.330 rồi 3.758 MiB dưới ngưỡng 6.144; 0/24 inference. Candidate Linux có 2 image, Compose config, nginx -t, SPA 200, Linux signal 3/3 với callback queue mô phỏng. Model, worker, prune và ghi HotelStay production chưa bật. [Bằng chứng](evidence/release-2141-20261127/verification.json)
- WEB xác nhận browser manual hoặc route tự động đã duyệt cho B04/B05 và hành trình essential. Backend/DB kiểm quyền, HotelStay DML scoped, Planner dương, prune/restart native và shared quota. Vận hành cần staging GPU/stack, restore, host hardening, DNS/TLS và monitoring. Owner duyệt gói ghi, phạm vi browser, hợp nhất nguồn và quyết định 21.42.
- Source tại `DACN_WEB_REVIEW` @ `46839ea38453d42accb040e30e1973a171638b66` cộng lock cục bộ. DACN chính giữ nguyên. Mốc 09/12 là mục tiêu có điều kiện. [Khóa nguồn](evidence/release-2141-20261127/final-source-lock.json) · [Ma trận](HUGO_PRODUCTION_RELEASE_MATRIX.md) · [Runbook](HUGO_PRODUCTION_DEPLOYMENT_RUNBOOK.md)


## TASK21.41-A — 27/11/2026 ICT

- HTTP 12/12 trên app thật và PostgreSQL chỉ đọc với token harness. Quote Web/Agent 1.000.000 VND cùng room/rate/version và checkout prepare PASS. Retained snapshot và cross-owner đọc/reject đạt. HotelStay confirm/cancel, live inventory và review lifecycle bị chặn vì side effects ngoài allowlist hoặc rate nonrefundable.
- Planner native dương với hai fixture SYNTHETIC PostgreSQL, lịch ba ngày, giờ mở cửa, budget estimate/over và transport UNKNOWN. Chưa full E2E hoặc routing. Linux worker thực claim/recover, retry/FAILED, SIGTERM/SIGINT và actual prune. P06 PASS trong scope Linux isolated, P05/P08/P09 còn PARTIAL.
- DML 71/144 gồm cleanup 15/24, còn 0 fixture mới. Fingerprint 61 bảng và 20 migration giữ nguyên, role/fence gỡ, worker tắt. Qwen OFF, browser BLOCKED, B04 FAIL/B05 NOT RUN lịch sử.
- WEB/owner chốt route browser và delta DML cho side effects, sau đó nghiệm thu ghi thật. 21.41-B chỉ ở handoff PostgreSQL shared quota/session, chưa khởi động. Giữ DACN chính nguyên vẹn; không deploy, commit, push hay merge. [Báo cáo](HUGO_21_41_A_BUSINESS_ACCEPTANCE_REPORT.md) · [Runbook](HUGO_PRODUCTION_DEPLOYMENT_RUNBOOK.md)


## TASK21.41-B — 27/11/2026 ICT

- Code chung quota/lease/claims PostgreSQL đã có. Build PASS, 11/11 Windows và Linux theo component; bốn baseline FAIL đã đối chiếu và giữ trạng thái. DDL/DML 0. Migration 21, grants, 2 backend thật chờ P12 packet.
- Session local tiếp tục `persisted:false`. Giữ auth, TTL, revision, replay rejection và revoke dừng in-flight trên process sở hữu. Structured state bền và cross-process revocation cần quyết định privacy riêng.
- Rate hiện có của exact room `…041` NON_REFUNDABLE. Gói business delta gồm rate SYNTHETIC mới, exact audit và profile revisions, HotelStay, verified history/review V5 và cleanup ở isolated. Chờ scope mới trước viết.
- B04/B05 browser giữ BLOCKED_POLICY và historical FAIL/NOT RUN, Qwen OFF, P06 A giữ nguyên. DACN chính nguyên vẹn, source backup private có checksum. Dừng B, chưa mở 21.41-C. [Báo cáo và 2 gói quyền](HUGO_21_41_B_AI_RELIABILITY_REPORT.md)


## TASK21.41-B-FINAL — 28/11/2026 ICT

- P12 shared coordination native PASS hai backend trên exact isolated DB. P12 tổng PARTIAL vì structured session chưa được phép lưu, cross-process consent/revision còn thiếu. `persisted:false` giữ nguyên, một backend production cho Agent.
- Actual Partner update 10.000 VND/đêm, promo 50.000 VND, quote expiry, fixture stock và hard budget đạt. Checkout prepare và historical booking COMPLETED/reload/RBAC qua app thật. Confirm/cancel và last-room chưa đạt vì row-lock ACL ngoài phạm vi.
- Actual verified review và bảy chu kỳ V5 Linux/PostgreSQL đạt; B04/B05 browser BLOCKED_POLICY. Qwen 0 calls và worker production OFF.
- Gói 1 dùng 147/224 ops, gói 2 dùng 191/255, 0 record business mới hoặc role/fence tạm. Database 61 bảng public/21 migrations cùng 4 bảng/4 functions, settings pin NULL. Allowed metadata thay đổi ở ba bảng exact cohort, business values khớp. DACN chính giữ nguyên, dừng trước 21.41-C. [Báo cáo](HUGO_21_41_B_FINAL_ACCEPTANCE_REPORT.md) · [Integrity](evidence/reliability-2141bf-20261128/final-integrity.json)


## TASK21.41-C · 28/11/2026 ICT

Pilot HMAC row-lock IMPLEMENTED và OFFLINE PASS. Native H03–H16 chờ Packet 1 trên 15457. Hai image Linux và 15 test component, config no-public-DB, nginx syntax, standalone API/SPA đã kiểm. L01–L20 và P15 cần Packet 2. PostgreSQL cũ khớp 61 fingerprints chuẩn hóa, 21 checksum, `hotel_runtime` read-only. Browser B04/B05 BLOCKED_POLICY, P12 `persisted:false` và một backend. Qwen và production Worker OFF. Dừng trước 21.42. [Report C](HUGO_21_41_C_LINUX_RELEASE_READINESS_REPORT.md) · [Matrix](HUGO_PRODUCTION_RELEASE_MATRIX.md) · [Source groups](evidence/linux-release-2141c-20261128/source-consolidation.json)


## TASK21.41-C-FINAL · 28/11/2026 ICT

Packet 1 migration22 NATIVE PASS, fixture FAIL 42501 và rollback. 5/100 + 1/40 ops, 0 dữ liệu/roles tạm, 60 fingerprints business khớp, ledger 22/22. H03–H16 cần fence delta duyệt mới. Packet 2 migrations 01–21 dùng runtime roles thấp, integrated API/Worker/restart đã chạy qua private networks. Host loopback thất bại và L06/L10/L18/L19/L20 PARTIAL. P15 portable age restore synthetic đạt (backup 2,038 s, restore 6,555 s, service recovered 27,194 s). Không còn staging/restore resources. P18 image scan có critical/high, browser gate giữ nguyên, Qwen/production Worker OFF. [Báo cáo](HUGO_21_41_C_FINAL_ACCEPTANCE_REPORT.md)


## TASK21.41-RELEASE-CLOSURE · 28/11/2026 ICT

Release closure xác nhận H03–H16, 45/100 + 17/40 cumulative, 60 normalized business fingerprints và 22 migration checksums. Pilot disabled. Linux synthetic 20/20 qua các lượt, host loopback đã verify và cleanup 0 resources. P15 schema22 trên PostgreSQL15/PostGIS3.7 distribution đạt trong 25,100 giây đến API smoke. Trivy bốn candidate 0 critical/high. Hai moderate/npm mỗi workspace còn review. Browser BLOCKED_POLICY. P12 persisted:false, một Agent backend. Qwen OFF, production Worker OFF, 21.42 chưa mở. [Báo cáo](HUGO_21_41_RELEASE_CLOSURE_REPORT.md)


## TASK21.41-SOURCE-CONSOLIDATION · 28/11/2026 ICT

Đã chuẩn bị cây ứng viên, gói duyệt Git và bàn giao GPU staging. P17 PARTIAL. Owner duyệt commit, push và draft PR trước, rồi quyết định merge riêng sau review. TASK21.42-A cần duyệt riêng. Qwen OFF, P12 PARTIAL, persisted:false, một Agent backend.

[Checkpoint, nhóm commit và bàn giao TASK21.42-A](HUGO_21_41_SOURCE_CONSOLIDATION_REPORT.md)
