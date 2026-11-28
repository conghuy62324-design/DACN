# HUGO TRAVEL — CURRENT TASK HANDOFF DOCUMENT

**Checkpoint hiện hành TASK21.41-B-FINAL (28/11/2026 ICT).** [Bàn giao kỹ thuật](../travelgo/docs/HUGO_CURRENT_TASK_HANDOFF.md) · [Ma trận](../travelgo/docs/HUGO_PRODUCTION_RELEASE_MATRIX.md)
**DACN | TravelGo | Bàn giao tiến độ kỹ thuật & Phân định trách nhiệm nhóm**

- **Thời gian lập:** 20/11/2026 (Asia/Ho_Chi_Minh)
- **Branch:** `main` (workspace `DACN`)
- **Remote Repository:** `https://github.com/conghuy62324-design/DACN.git`
- **Tài liệu tham chiếu kèm theo:** `travelgo/docs/HUGO_TRAVEL_BAN_GIAO_WEB.md`, `travelgo/docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md`

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


## WEB-INTEGRATION-02 handoff —25/11/2026 ICT

Active integration source: <workspace>/DACN_WEB_REVIEW\travelgo, branch integration/web-backend, base46839ea. Main e76d187 and feature/web-ui-admin-partner46839ea are unchanged. Do not reset/clean/stash/overwrite either worktree. Integration edits are uncommitted, as requested.

Verdict WEB_INTEGRATION_02_PARTIAL_NATIVE_PASS. Backend CMS/account/Admin/Partner foundation, native19v3 schema and actual HTTP/browser work are documented at [HUGO_WEB_BACKEND_INTEGRATION.md](../travelgo/docs/HUGO_WEB_BACKEND_INTEGRATION.md), with [API matrix](../travelgo/docs/HUGO_WEB_REAL_API_MATRIX.md) and [SQL review](../travelgo/docs/HUGO_WEB_DATABASE_MIGRATION_REVIEW.md).

Preview http://127.0.0.1:5182/ → API5064 → task-owned hugotravel_web_integration_test_20261125 at15457;59/19. Enforced READ ONLY after exact transient cleanup: DML revoked, default read-only, HTTP mutations403. Retained only SYNTHETIC preview accounts/Businesses/two CMS documents/security epochs; no Hotel/Booking/Trip/review rows. Separate Edge is opened with SYNTHETIC Admin, not real Owner. Safe reopen tools: travelgo/tools/OPEN_WEB_INTEGRATION_ADMIN.cmd or OPEN_WEB_INTEGRATION_CUSTOMER.cmd, using only task DPAPI blob outside repo. No plaintext secrets.

257/257 WEB and owner raw baseline verified. Staging40/40 fingerprint,130Place/20Business/17migrations unchanged; original DB not accessed; old Hotel UI52/18 audit READ ONLY and container restored stopped;3000 untouched. Qwen/Ollama/Agent/worker/Maps/payment/VPS OFF. No commit/push/merge/deploy.

Blocking acceptance: prior C/D coordinate permission was UI-target-only. A question for unchanged reuse in new WEB target was sent; no reply assumed. Positive Hotel/room/rate/inventory, promotion freshness, HotelStay and populated review-reply tests are NOT RUN. Do not reopen writes or reuse expired scope without validating fresh authorization/source/IDs/caps. Do not treat partial native or real browser login as complete website/AI LIVE READY.

Full CMS public/Admin UI is03; full Customer/Partner UI04. They have NOT started. Preserve historical AI evidence/verdicts; only append current results. Do not change protected AI modules to adapt to new web contracts. Final source lock is travelgo/docs/evidence/web-integration-02-20261125/runtime-source-lock-v5.json.


## 21.40-A0 — AI CORE RECOVERY HANDOFF (26/11/2026 ICT)

**AI_21_40_A0_PARTIAL** — đã sửa AI backend và kiểm offline, chưa LIVE READY. Workspace tiếp tục: <workspace>/DACN_WEB_REVIEW, branch integration/web-backend, HEAD46839ea38453d42accb040e30e1973a171638b66. DACN/main e76d187 nguyên vẹn. Không merge/commit/push/deploy.

- Owner đóng băng WEB-INTEGRATION-02-FIX/03–06, frontend/Assistant UI và business development. Toàn bộ uncommitted WEB02 được giữ; WEB freeze839/839, main protected AI257/257. Old manifest/evidence giữ nguyên.3 protected AI sources được sửa theo quyền A0; không chạy checker cũ rồi ghi đè baseline để che drift.
- Actual Core là V6.8/V7.0 functional, NATURAL_CHAT_V3/CORE_INTENT_V2. Incremental fixes: typed room/stay constraints, absolute budget change, amenity withdrawal đồng bộ, giữ hotel khi hỏi room type, availability UNKNOWN thay vì sửa ngày Trip. Native Hotel read adapter chưa bind; không thay services nghiệp vụ.
- Development16/24→23/24, D01 oracle mismatch còn FAIL; holdout lần đầu11/12, H04 tổng tiền phòng chưa hiểu, **không tune sau holdout**. Targeted20/20,V62 20/20,review18/18,V63 18/18,build PASS. V5 legacy19/21 như exact before source,2 FAIL cũ giữ nguyên.
- Existing integration container15457 đã start đúng volume;59 bảng/19 migration, hotel_runtime READ ONLY/no DML;59/59 native fingerprints trước/sau bằng nhau.0 Place/Trip/Booking,5 user/8 role/2 SYN businesses giữ nguyên. Không kết nối original5432/protected15452, không Owner/DPAPI action.
- API5064/frontend5182 chưa start. WEB launcher chặn Agent; source lock v5 cũ drift6 entries do3 AI TS/3 dist được sửa. Không bypass/update old lock. Actual Assistant browser và quota acceptance NOT RUN/BLOCKED, cần packet mới trước actual Agent turns; cap20/h reserve10 và principal không được tự đổi.
- Qwen/worker OFF, native model/metadata/warm-load/Internet0. Không chạy A1/A2. A1 đề xuất xử lý money-role/holdout mới, oracle debt và fresh bounded READ ONLY Assistant runtime.

Chi tiết: [AI21.40-A0 report](../travelgo/docs/HUGO_AI_21_40_A0_CORE_RECOVERY_REPORT.md). Evidence/source lock: travelgo/docs/evidence/ai-core-recovery-a0-20261126/. Giữ nguyên history phía trên; dừng A0 để owner quyết định.


## 21.40-A1/A2 — NATIVE AI–HOTEL LIVE HANDOFF (26/11/2026 ICT)

**AI_A1_A2_BOUNDED_NATIVE_BROWSER_PASS_WITH_FINAL_SAFETY_DELTA**, SYNTHETIC và model OFF; không AI LIVE READY. Mở workspace <workspace>/DACN_WEB_REVIEW, integration/web-backend, HEAD46839ea. Main e76d187/old WEB02/A0 giữ nguyên, không merge/commit/push/deploy.

- Actual native/HTTP S01–S16:16/16. Shared HotelReadService/pricing cho website và native search/detail/quote; price/promo/inventory/amenity/publication freshness, same-room/address/occupancy/expiry/authorization/protection đã kiểm.
- Actual Edge existing Assistant5/5, desktop/mobile, consent/send và updated Partner price visible. Same CUSTOMER A2c840c54-1933-4c93-8358-4e706a9eb8d0,1login+5chat +1ephemeral cleanup entry; fresh final remaining13/20/reserve10. Không thêm batch hoặc tự gửi nữa.
- Preview http://127.0.0.1:5182/assistant; new API5064/Vite5182/final source lockv3, loopback READ ONLY/BATCH CLOSED. Edge đã đăng nhập SYNTHETIC CUSTOMER để xem. Không Owner thật, secrets không trong handoff. Start/stop/status: node travelgo/backend/scripts/ai-hotel-preview.cjs status|start|stop; kiểm actual listeners/PIDs, không dựa runtime.json. Old WEB launcher/lock không sửa.
- Retained exact3 SYN hotels20/21/24 từ C,4rooms/4rates/16inventory/2promotions/3media và3profile/3address trên15457.38 fixture INSERT,240/600 total DML attempts (218writer+22cleanup),22audits cleanup; outside-cohort59/59 unchanged. Temporary writer role/fences đã DROP, public runtime no DML. Không chạm original5432/staging15452/Owner/Trip/Booking/review/memory/knowledge.
- H04 fixed/newdevelopment7/7; newholdout9/10 còn standalone street thiếu service/context, giữ FAIL. V2contract7/7,V62compat20/20; A0fakeDTO19/20 do thiếu required profile.services, native fullDTO/browser PASS. Historical V5/A0 evidence không sửa. Build PASS,806 hashes locked before holdout;4 explicit safety/operator deltas to finalv3.
- Frontend không sửa. Authorized WEB delta: hotels/postgresStore.ts exact acceptance-role guard + API handoff append. Pricing/Booking/Planner/Recommendation/RBAC/consent/geography/migrations giữ nguyên. Qwen/worker OFF, model/Internet/paid calls0.
- Review room attribution contract prepared,0 actual review rows; phaseB cần fresh scoped authorization và lifecycle/revision/privacy tests. Roadmap26/11–09/12/2026 conditional, chưa thuê/mua/deploy; không bắt đầu B.

Report: [A1/A2 live integration](../travelgo/docs/HUGO_AI_21_40_A1_A2_LIVE_BUSINESS_INTEGRATION_REPORT.md); sync/roadmap trong travelgo/docs. Evidence: travelgo/docs/evidence/ai-live-hotel-a1a2-20261126/. Không gọi bounded fixture/browser PASS là production/Qwen reasoning PASS.

Final safety patch: generic people count requires adult/child composition;2 negative cases PASS,5 explicit-adult browser parser decisions identical offline. Actual native/browser PASS is v2; final v3 has no new browser batch (cap5), only HTTP/read-only/persistence check. API reload did not authorize/spend extra chat; ledger stays13 and backend batch seal blocks further POST chat. Owner can view existing chat/Hotel preview. Do not label v3 full browser/Qwen/production PASS.


## 21.40-B current handoff — 27/11/2026 ICT

Open <workspace>/DACN_WEB_REVIEW\travelgo on integration/web-backend; do not switch to DACN main or merge. TASK21.40-B is PARTIAL/BLOCKED: isolated15457 ECONNREFUSED, scoped write window expired; no further DB DML/worker/browser without fresh authorization. Migration20 and four SYNTHETIC reviews plus initial worker2 completions have receipts, but R03–R24/final readback/cleanup/role revocation/browser NOT RUN. Review development12/12, holdout9/10 FAIL preserved, targeted offline7/7, build PASS. Main AI257/257 unchanged. Old A1 browser5/5 was v2 only; B0 chat. See travelgo/docs/HUGO_AI_21_40_B_REVIEW_INTELLIGENCE_WORKER_REPORT.md and proposed resumption packet in travelgo/docs/evidence/review-worker-b-20261126/. Qwen, external knowledge and production worker OFF. Do not start21.40-C.

B correction: current extractor method V5 after fixing budget/book false cleanliness and trailing pool-quality polarity. Review/Memory18/18, targeted B8/8, V5 development12/12; old V4 holdout9/10 FAIL not rerun. Initial actual worker2 completions were V4; V5 native acceptance remains BLOCKED.

B read-only restart: exact old container/volume15457 restored with no reset. Public runtime read-only,61/20,4SYN reviews,2links,6events,2V4 insights; outside-cohort59/59 PASS. V5 reader withholds V4 caches. Writer/worker roles are expired but not dropped; native writes, cleanup and browser still blocked until fresh approval. API/frontend not running.


## TASK21.40-C — 27/11/2026

Checkpoint hiện hành nằm ở [HUGO_CODEX_CONTINUATION.md](HUGO_CODEX_CONTINUATION.md). C đã triển khai nhánh tư vấn đa dịch vụ và qua build, development 21/21, native chỉ đọc 10/10. Holdout 9/10 được giữ nguyên sau hồi quy đích. B04/B05 vẫn bị chặn. [Handoff hiện hành](../travelgo/docs/HUGO_CURRENT_TASK_HANDOFF.md) · [Báo cáo C](../travelgo/docs/HUGO_AI_21_40_C_ADVANCED_TRAVEL_CONSULTANT_REPORT.md)


## TASK21.40-D — 27/11/2026

Đã triển khai code tích hợp Qwen native, grounding và fallback. Build PASS, 22/22 offline, 7/7 native chỉ đọc với provider mô phỏng. Qwen thật BLOCKED_RESOURCE, 0/24 lượt. HTTP chưa chạy, B04/B05 vẫn bị chặn. [Checkpoint](HUGO_CODEX_CONTINUATION.md) · [Báo cáo D](../travelgo/docs/HUGO_AI_21_40_D_QWEN_LIVE_INTEGRATION_REPORT.md)


## TASK21.41-C · 28/11/2026 ICT

Checkpoint C hoàn tất phần source và offline trước phê duyệt. Packet 1 xin HotelStay DDL/DML exact. Packet 2 xin Linux staging và restore target mới. [Handoff hiện hành](../travelgo/docs/HUGO_CURRENT_TASK_HANDOFF.md) · [Report C](../travelgo/docs/HUGO_21_41_C_LINUX_RELEASE_READINESS_REPORT.md)


## TASK21.41-C-FINAL · 28/11/2026 ICT

Hai packet owner đã chạy theo thứ tự. Migration22 giữ lại theo duyệt. HotelStay mutation chờ column SELECT delta. Linux private integrated đạt một phần, portable restore synthetic đạt, hai project đã dọn. [Handoff hiện hành](../travelgo/docs/HUGO_CURRENT_TASK_HANDOFF.md) · [Báo cáo](../travelgo/docs/HUGO_21_41_C_FINAL_ACCEPTANCE_REPORT.md)


## TASK21.41-RELEASE-CLOSURE · 28/11/2026 ICT

HotelStay H03–H16 native/HTTP đạt, Linux synthetic L01–L20 đạt theo receipts và restore schema22 đạt trên image distribution. Browser, production data, GPU, public TLS và release approval còn mở. [Handoff project](../travelgo/docs/HUGO_CURRENT_TASK_HANDOFF.md) · [Báo cáo](../travelgo/docs/HUGO_21_41_RELEASE_CLOSURE_REPORT.md)


## TASK21.41-SOURCE-CONSOLIDATION · 28/11/2026 ICT

Đã chuẩn bị cây ứng viên, gói duyệt Git và bàn giao GPU staging. P17 PARTIAL. Owner duyệt commit, push và draft PR trước, rồi quyết định merge riêng sau review. TASK21.42-A cần duyệt riêng. Qwen OFF, P12 PARTIAL, persisted:false, một Agent backend.

[Checkpoint, nhóm commit và bàn giao TASK21.42-A](../travelgo/docs/HUGO_21_41_SOURCE_CONSOLIDATION_REPORT.md)
