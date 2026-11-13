# T-AI-03-A — Agent UI → Backend → PostgreSQL Integration E2E

Ngày 08/11/2026 (Asia/Saigon). **PASS 15/15 case ở desktop và 15/15 case ở mobile giả lập.** Luồng chạy Edge → React/Vite → Express Auth/Agent route thật → AgentOrchestrator thật → Recommendation/Catalog hoặc TourPlannerService thật → `travelgo_ai_m0_test`. **Chỉ quyết định tool tại ranh giới LLM là scripted test double (`PROVIDER_MOCK_ONLY`); LIVE_LLM NOT RUN.** Không tuyên bố đã nghiệm thu NLU tiếng Việt.

## 1. Source, contract và harness

Đã đọc T-AI-01, T-AI-01-B, T-AI-02, API/Agent/Auth/Planner/Catalog source và Playwright harness. Không sửa source ứng dụng. Test injection dùng `createAgentRouter(AgentOrchestrator)` hiện có; không thêm biến bật mock ở production. `authRoutes`, JWT middleware, `agentChatController`, `TelemetryService.getConsent`, allowlist một tool/lượt, `RecommendationRepository` và `TourPlannerService` đều là source thật. Vite proxy đi tới Express chạy tại loopback; Playwright **không gọi `page.route`/mock `/api/agent/chat`**. Header `X-TAI03A-Backend` từ harness chứng minh response đến từ Express instance của run. Provider scripted chọn `clarify`, `unsupported`, `search_places` hoặc `plan_trip`; nó không tạo Place ID, giá hay itinerary.

File mới trong task:

| File | Vai trò |
|---|---|
| `backend/scripts/t-ai-03-a-manifest.json` | 15 expected khóa trước preflight; SHA-256 `ae0ec3404ba8867e0a4bd10769f0f15a1146ecdff6afcb9b570993a3863acf36`. |
| `backend/scripts/t-ai-03-a-probe.cjs` | Inventory read-only test DB/catalog trước fixture. |
| `backend/scripts/t-ai-03-a-run.cjs` | Exact guard/sentinel/checksum/fingerprint; fixture ledger; backend injection; browser run; cleanup/fingerprint. Ghi DB chỉ khi caller cấp `ALLOW_TEST_DB_WRITES=true`, `TEST_DATABASE_NAME=travelgo_ai_m0_test`. App Sequelize connections ép `default_transaction_read_only=on`; fixture writes/cleanup dùng client riêng và exact IDs. |
| `frontend/e2e/t-ai-03-a-real-integration.spec.ts`, `frontend/playwright.t-ai-03-a.config.ts` | 15 case × Edge desktop 1440×900, mobile 390×844; screenshots, actual HTTP status/body assertions. |
| `backend/scripts/t-ai-03-a-checks.cjs`, `backend/scripts/t-ai-03-a-integrity.cjs` | Build/regression và SHA-256 audit. |

## 2. Preflight, fixture và dữ liệu thật

Read-only [probe](evidence/t-ai-03-a/probe.json) xác nhận exact DB `travelgo_ai_m0_test`, sentinel hợp lệ, 12 migration checksum khớp, connection read-only. Catalog nền có 14 Place public nhưng không có giá 0/null cho cặp cần kiểm; vì vậy run tạo fixture tối thiểu với opt-in tường minh. [Preflight cuối](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/preflight.json) cũng ghi identity, read-only app, sentinel, 12 checksum và manifest hash **trước write**. [Manifest lock](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/manifest-lock.json) khớp source manifest.

[Ledger cuối](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/ledger.json) có owner/run UUID và exact ID của 4 Customer (A/B riêng cho desktop/mobile), 4 UserRole, 5 Place thuộc city riêng `TAI03A-699018f3`: hai attraction có giá 0 và null, một hotel, một restaurant, một attraction SUSPENDED. Tổng 13 row fixture. Password ngẫu nhiên chỉ truyền qua environment child test, không ghi trong ledger/HTTP evidence; account đã xóa sau run. Không dùng production/demo account, không seed toàn cục. [DB public projection](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/catalog-db-projection.json) chứa bốn Place public ID thật và xác nhận SUSPENDED ID không có trong catalog; `priceFrom=0, catalogPriceAvailable=true` và `priceFrom=null, catalogPriceAvailable=false` được giữ riêng.

## 3. Ma trận browser E2E

[Run cuối](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/results.json): **30 expected, 30 passed, 0 unexpected, 0 skipped**. Mỗi case có `.png` và `.json` riêng trong `desktop/` và `mobile/`; ảnh là Edge thật, kết quả Agent dùng backend/DB thật với quyết định provider scripted.

| Case | Expected/observed | Desktop | Mobile |
|---|---|---|---|
| C01 | Anonymous `/assistant` → login; API thiếu token → 401 | PASS | PASS |
| C02 | Customer fixture login qua Auth API thật, JWT và `/auth/me` đúng user; vào Assistant | PASS | PASS |
| C03 | `search_places` trả Place ID DB, category/city; giá 0 và null khác nhau; SUSPENDED bị ẩn | PASS | PASS |
| C04 | `plan_trip` trả itinerary service thật, `GROUP_VND_V1`, UI hiện đúng cost và over-budget warning | PASS | PASS |
| C05 | Lượt sau gửi đúng `history` backend trả; không gửi `system`/privileged tool | PASS | PASS |
| C06 | `needs_input` hỏi thiếu destinationCity | PASS | PASS |
| C07 | `unsupported` hiện đúng, không mutation | PASS | PASS |
| C08 | Điểm đến không khả thi → `tool_unavailable`, không bịa itinerary | PASS | PASS |
| C09 | 428 và GET privacy thật; không auto consent; click Đồng ý mới gửi version cho đúng một request | PASS | PASS |
| C10 | Provider disabled → 503, UI có link Planner | PASS | PASS |
| C11 | Agent API thật từ chối history role sai 400 và JWT sai 401 | PASS | PASS |
| C12 | Test controls qua Agent route thật tạo 429/502/504, UI không lộ raw error | PASS | PASS |
| C13 | Logout A/login B khi response A chậm: B nhận history trống, không thấy dữ liệu A | PASS | PASS |
| C14 | New conversation và refresh xóa history/draft trong RAM | PASS | PASS |
| C15 | Chat không gọi Trip/Booking mutation; DB app read-only | PASS | PASS |

Ảnh tiêu biểu: [Catalog desktop](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/desktop/C03.png), [Catalog mobile](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/mobile/C03.png), [Planner desktop](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/desktop/C04.png), [Planner mobile](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/mobile/C04.png), [privacy mobile](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/mobile/C09.png), [account switch desktop](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/desktop/C13.png). Mobile không tràn ngang trong Planner case; các điều khiển đăng nhập/chat/consent/logout thao tác được.

## 4. HTTP, provider và DB projections

[HTTP trace đã redacted](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/http-traffic.json) có 148 response Auth/Agent, không ghi login password/JWT. Riêng `POST /api/agent/chat`: 28×200, 4×401, 4×428, 2×400, 2×429, 2×502, 2×503, 2×504. `GET /api/agent/privacy` trả version `external-chat-v1`; request đầu 428 không có consent, retry sau click có `externalProcessingConsent`, lượt sau lại không có. [Provider trace](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/provider-decisions.json) ghi 32 lần gọi scripted và allowlist chỉ `plan_trip`, `search_places`; backend validator thực thi decision, không có privileged tool. Không có POST/PUT/PATCH/DELETE tới `/api/trips` hoặc `/api/bookings`.

Ví dụ response thật của run cuối: Catalog trả các ID `8f4dbc85-e7dd-499e-8daa-7e2ea991794b` (giá 0) và `fae16030-a9e0-4bc5-b9d2-9f50cd958b8b` (giá null). Planner chọn các Place ID thuộc DB fixture, trả `estimated=1.300.000 VND`, `budget=1 VND`, `overBudget=1.299.999 VND`, `budgetStatus=over_budget`; UI so đúng các giá trị server và hiển thị warnings/assumptions. Ngân sách 1 VND là đầu vào test để ép cảnh báo, không phải giá giả hoặc đề xuất du lịch thực tế.

## 5. Build và regression

[Checks run](evidence/t-ai-03-a/checks-20261108T104545779Z/results.json): backend build PASS, frontend build PASS, Agent Foundation **22/22**, Transport **19/19**, Chat UI unit **10/10**, Planner validation/cost **50/50**, Planner modes **17/17**, Recommendation **8/8**. [T-AI-02 browser regression](evidence/t-ai-03-a/checks-20261108T104545779Z/browser-mock/results.json) **34/34 PASS**, phân loại **UI MOCK_ONLY**. Regression này không được cộng vào 30 execution real-integration. Checks dùng `LLM_LIVE_ENABLED=false`, không chạy suite DB-write thiếu guard.

## 6. Cleanup, fingerprint và source integrity

[Cleanup cuối](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/cleanup.json) PASS theo ID/FK; residual users=0, roles=0, places=0. [Fingerprint before](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/before.json), [after](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/after.json), [compare](evidence/t-ai-03-a/run-20261108T104746219Z-699018f3/fingerprint-compare-compare.log): **25/25 bảng trùng, changed=[]**. Hai run trước cũng cleanup PASS và fingerprint 25/25 trùng; evidence nguyên vẹn tại `run-20261108T104212621Z-67bd41fe/` và `run-20261108T104348006Z-9523bb70/`. Không migration, reset, truncate, xóa volume, commit, push hoặc deploy.

[Baseline SHA-256](evidence/t-ai-03-a/baseline.json) gồm 3.447 file trước task; [audit sau](evidence/t-ai-03-a/integrity-after.json) ghi **changed=[]**, 3.447 file baseline không đổi, gồm evidence cũ và `backend/src/scripts/seedAttractions.ts`. Chỉ thêm harness/test/report T-AI-03-A, không sửa Planner, ranking, pricing, sentiment, Map, Ticket hay T13-B.

## 7. Lỗi và giới hạn OPEN

- Lượt run đầu có **28/30 PASS**, C13 desktop/mobile FAIL vì predicate Playwright nhầm `Request` thành `Response` (`r.request()`), **lỗi test harness**, không phải ứng dụng. Giữ nguyên evidence gốc; chỉ sửa predicate thành `r.method()`. Run kế tiếp và run cuối full 30/30 PASS với expected không đổi.
- **LIVE_LLM NOT RUN**: scripted provider chọn tool theo câu test, không chứng minh model hiểu tiếng Việt, dùng tool đúng trong hội thoại tự nhiên, quota/latency/cost thực hay việc Google/Ollama chấp nhận schema.
- DB catalog ở đây là fixture riêng trong PostgreSQL test, không phải dữ liệu du lịch production. Planner và pricing service thật chạy trên fixture đó.
- Map P2, Ticket label và 28 CORE T13-B NOT RUN giữ nguyên trạng thái; ngoài phạm vi task này.

**Đánh giá:** T-AI-03-A có thể đóng cho contract integration với provider test double và test DB. Cần T-AI-03-B riêng trước khi nghiệm thu LIVE_LLM.

## 8. NEXT TASK PLAN — có thể copy, chưa thực hiện

```text
# TASK T-AI-03-B — Nghiệm thu LIVE_LLM cho HuGo Travel Agent

Bối cảnh: T-AI-03-A đạt 15/15 case trên desktop/mobile qua browser → Express/Auth/Agent → PostgreSQL test, provider decision scripted. LIVE_LLM chưa chạy.

Dependency bắt buộc:
1. Duyệt provider, model, endpoint, hạn mức chi phí/request, quyền sử dụng và cách cấp secret backend-only; không ghi credential vào source/evidence.
2. Duyệt notice/consent cho provider bên ngoài nếu dùng Gemini; xác nhận version /api/agent/privacy và cách ghi nhận thao tác đồng ý từng request.
3. Chỉ dùng travelgo_ai_m0_test: exact DB, sentinel, 12 migration checksum, fingerprint before. Nếu tạo fixture, bật opt-in tường minh, ledger UUID/owner, cleanup exact ID/FK, residual=0, fingerprint after=before.

Thực hiện:
1. Khóa manifest NLU tiếng Việt nhiều lượt trước test: thiếu dữ liệu, đổi ý, viết tắt, ngày/ngân sách/số người, tìm Catalog, tạo Planner, unsupported, invalid tool input, prompt injection, tool/backend failure, quota và timeout.
2. Chạy Edge desktop 1440×900 và mobile 390×844 qua UI → Auth/Agent API thật → provider/model thật → Catalog/Planner thật → PostgreSQL test. Không mock /api/agent/chat, Catalog/Planner hay provider trong nhóm LIVE_LLM.
3. Đối chiếu decision/tool input với câu người dùng, Place IDs/visibility với DB, cost/warnings với Planner server. Không chấp nhận giá/Place/itinerary bịa; không Trip Save/Booking mutation.
4. Ghi status, request/response đã redacted, provider model/version, token/latency/cost thực nếu nhà cung cấp trả; không lộ API key, JWT, profile hoặc dữ liệu account khác. Giữ expected, FAIL thì lưu evidence/severity và đề xuất FIX riêng.
5. Chạy build, Agent/Transport/Chat UI/Planner/Recommendation regression; kiểm source integrity, fixture cleanup/fingerprint.

Đầu ra: docs/HUGO_T_AI_03_B_LIVE_LLM_REPORT.md và docs/evidence/t-ai-03-b/; phân biệt LIVE_LLM với PROVIDER_MOCK_ONLY/UI MOCK_ONLY, PASS/FAIL/NOT RUN từng case, giới hạn và quyết định nghiệm thu.

Điểm dừng: sau báo cáo. Không tự triển khai Trip/Booking mutation, T13-B-03, Map FIX, push hoặc deploy.
```
