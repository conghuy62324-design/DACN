# T-AI-02 — Chat UI cho HuGo Travel Agent

Ngày hoàn thành: 08/11/2026 (Asia/Saigon). **Kết quả: PASS cho phạm vi UI/MOCK_ONLY; LIVE_LLM NOT RUN.** Không chạy API/DB thật trong E2E này, nên kết quả không chứng minh chất lượng NLU hoặc luồng HTTP → PostgreSQL.

## 1. Căn cứ và phạm vi

Đã đối chiếu `HUGO_T_AI_01_AGENT_FOUNDATION_REPORT.md`, `HUGO_T_AI_01_B_LIVE_PROVIDER_REPORT.md`, `HUGO_AI_AGENT_MVP_ROADMAP.md`, source Agent backend, AuthContext, router, CustomerLayout/Navbar, API client và Planner. Backend hiện có `POST /api/agent/chat`, `GET /api/agent/privacy`, hội thoại `STATELESS`, bốn trạng thái `completed`, `needs_input`, `unsupported`, `tool_unavailable`, kết quả `places`/`itinerary` và consent version `external-chat-v1`. Frontend dùng đúng các endpoint đó. Ảnh Planner do người dùng gửi chỉ là ngữ cảnh giao diện; Chat UI giữ màu sắc và navigation HuGo hiện có, không can thiệp Planner.

## 2. Source và kiến trúc đã triển khai

| File | Thay đổi |
|---|---|
| `frontend/src/types/agent.ts` | Type request, privacy, response union, kết quả Catalog/Planner theo contract backend. |
| `frontend/src/utils/agentContract.ts` | Kiểm envelope, history, context, kết quả và thông báo lỗi an toàn; response không hợp lệ thành 502, không tạo success giả. |
| `frontend/src/services/agentService.ts` | Dùng lại Axios `api`, gửi đúng `message`, server history và consent của **một** request; GET privacy. |
| `frontend/src/utils/agentConversation.ts` | State trong RAM, lấy history từ backend, reset/cancel, khóa double submit, sequence/account guard, giữ câu hỏi và nháp khi lỗi. |
| `frontend/src/pages/AssistantPage.tsx` | Route UI `/assistant`, nhập tiếng Việt, Enter/Shift+Enter, loading, thông báo, reset, cuộn có kiểm soát, rendering theo status. |
| `frontend/src/components/agent/AgentResultCard.tsx` | Catalog, ngày/hoạt động Planner, `GROUP_VND_V1`, budget, assumptions, violations, warnings; không tính lại giá. |
| `frontend/src/components/agent/PrivacyConsentModal.tsx` | Notice lấy từ API, hai lựa chọn rõ ràng, mặc định focus **Từ chối**. |
| `frontend/src/router/AppRouter.tsx` | Route được bảo vệ bằng `ProtectedRoute` cho `CUSTOMER`. |
| `frontend/src/components/common/Navbar.tsx` | Liên kết “Trợ lý AI” trong menu Tour desktop/mobile. |
| `frontend/src/services/api.ts` | Chỉ với Agent: giữ status/code lỗi và không console-log raw provider response; 401 cũ không được logout account mới. |
| `frontend/tests/agentConversation.test.ts`, `frontend/e2e/t-ai-02-assistant-ui.spec.ts`, `frontend/playwright.t-ai-02.config.ts` | Unit và Edge E2E độc lập, API fixtures gắn nhãn `MOCK_ONLY`. |
| `backend/scripts/t-ai-02-{browser,checks,integrity}.cjs` | Runner/evidence và audit riêng của task; không đổi backend runtime. |

Luồng: Customer → `ProtectedRoute` → `AssistantPage` → `AgentConversation` → `AgentService` → `api` → `POST /api/agent/chat` → backend Agent. Response được kiểm schema trước khi render; `history` server trả mới được gửi ở lượt sau. 428 → `GET /api/agent/privacy` → dialog → chỉ khi bấm Đồng ý mới gửi lại cùng câu hỏi với `externalProcessingConsent`. 503/lỗi có Planner link và retry chủ động; không fallback bằng dữ liệu giả. Không lưu chat vào localStorage/sessionStorage/DB; refresh, logout và đổi account mở session trống. Không có Trip/Booking mutation.

## 3. Nghiệm thu và evidence

| Nhóm | Kết quả | Bằng chứng |
|---|---|---|
| Backend build | PASS | [`backend-build.log`](evidence/t-ai-02/checks-20261108T074332311Z/backend-build.log) |
| Frontend build | PASS | [`frontend-build.log`](evidence/t-ai-02/checks-20261108T074332311Z/frontend-build.log) |
| Agent Foundation | 22/22 PASS, provider `MOCK_ONLY`, catalog synthetic, DB NOT USED | [`agent-unit-http-mock.log`](evidence/t-ai-02/checks-20261108T074332311Z/agent-unit-http-mock.log) |
| Agent Transport | 19/19 PASS, test double/local fake Ollama; LIVE_LLM NOT RUN | [`transport-unit-http-mock.log`](evidence/t-ai-02/checks-20261108T074332311Z/transport-unit-http-mock.log) |
| Chat UI unit | 10/10 PASS, `MOCK_ONLY` | [`assistant-ui-unit.log`](evidence/t-ai-02/checks-20261108T074332311Z/assistant-ui-unit.log) |
| RBAC unit | PASS | [`rbac-unit.log`](evidence/t-ai-02/checks-20261108T074332311Z/rbac-unit.log) |
| Planner validation/cost | 50/50 PASS | [`planner-validation-costs.log`](evidence/t-ai-02/checks-20261108T074332311Z/planner-validation-costs.log) |
| Planner modes | 17/17 PASS | [`planner-modes.log`](evidence/t-ai-02/checks-20261108T074332311Z/planner-modes.log) |
| Recommendation correctness | 8/8 PASS | [`recommendation-correctness.log`](evidence/t-ai-02/checks-20261108T074332311Z/recommendation-correctness.log) |
| Edge desktop 1440×900 | 17/17 PASS, API `MOCK_ONLY` | [`run.log`](evidence/t-ai-02/browser-20261108T034330839Z/run.log), [`results.json`](evidence/t-ai-02/browser-20261108T034330839Z/results.json) |
| Edge mobile giả lập 390×844 | 17/17 PASS, API `MOCK_ONLY` | cùng run; screenshots và request JSON riêng theo case |
| LIVE_LLM, HTTP → PostgreSQL thật | **NOT RUN** | Không có provider key/live approval; browser intercept toàn bộ `/api/**`, DB NOT USED |

Browser matrix (mỗi dòng PASS cả desktop/mobile; 34 execution):

| Case | Expected đã kiểm | Evidence mẫu |
|---|---|---|
| U01–U02 | Anonymous chuyển login; CUSTOMER vào từ navigation; PARTNER-only không có quyền route | [`desktop/U01.png`](evidence/t-ai-02/browser-20261108T034330839Z/desktop/U01.png), [`mobile/U02.png`](evidence/t-ai-02/browser-20261108T034330839Z/mobile/U02.png) |
| U03–U04 | Enter/Shift+Enter, busy/double submit, multi-turn dùng exact server history; unsupported/tool unavailable hiển thị đúng | [`desktop/U03.json`](evidence/t-ai-02/browser-20261108T034330839Z/desktop/U03.json), [`mobile/U04.png`](evidence/t-ai-02/browser-20261108T034330839Z/mobile/U04.png) |
| U05–U06 | Catalog giữ giá 0 và null riêng, escape HTML; Planner hiện chi phí, assumptions, warnings, constraint; không repricing/Trip/Booking | [`desktop/U05.png`](evidence/t-ai-02/browser-20261108T034330839Z/desktop/U05.png), [`mobile/U06.png`](evidence/t-ai-02/browser-20261108T034330839Z/mobile/U06.png) |
| E400/E401/E429/E502/E503/E504/E000 | Thông báo an toàn, giữ nháp và retry chủ động; 401 logout; 503 có Planner; network failure không bịa phản hồi | [`mobile/E503.png`](evidence/t-ai-02/browser-20261108T034330839Z/mobile/E503.png), [`desktop/E401.json`](evidence/t-ai-02/browser-20261108T034330839Z/desktop/E401.json) |
| U07 | 428 không auto retry; từ chối giữ nháp; chỉ click Đồng ý mới gửi version từ API; lượt sau không tự carry consent | [`mobile/U07.png`](evidence/t-ai-02/browser-20261108T034330839Z/mobile/U07.png), [`desktop/U07.json`](evidence/t-ai-02/browser-20261108T034330839Z/desktop/U07.json) |
| U08–U09 | Reset/refresh xóa memory; response chậm account A không xuất hiện ở B, B gửi history trống | [`desktop/U08.json`](evidence/t-ai-02/browser-20261108T034330839Z/desktop/U08.json), [`mobile/U09.json`](evidence/t-ai-02/browser-20261108T034330839Z/mobile/U09.json) |
| U10 | Không cuộn mất vị trí người đang đọc; response malformed bị từ chối; mobile không tràn ngang | [`desktop/U10.png`](evidence/t-ai-02/browser-20261108T034330839Z/desktop/U10.png), [`mobile/U10.png`](evidence/t-ai-02/browser-20261108T034330839Z/mobile/U10.png) |

Các JSON browser chứa request body thực tế tại Axios/Playwright interception và `rawSecretLogs: []`; fixtures được đặt tên `MOCK_ONLY`. Không có API key, profile hay Booking data trong body. Screenshots chụp UI thật của Edge nhưng response là test fixture. Browser không kết nối backend/PostgreSQL, không tạo fixture DB; guard/sentinel/ledger/cleanup và fingerprint DB **N/A** cho run này, không được suy diễn thành fingerprint 25/25. `LLM_LIVE_ENABLED=false` trong runner regression.

## 4. Toàn vẹn source và dữ liệu

Baseline hash: [`baseline.json`](evidence/t-ai-02/baseline.json), 3.349 file trước sửa. Audit cuối: [`integrity-after.json`](evidence/t-ai-02/integrity-after.json), gồm SHA-256 từng file. Ba file đã có từ trước và đổi hash là `Navbar.tsx`, `AppRouter.tsx`, `api.ts`, đều thuộc Chat UI. 3.346 file baseline khác giữ nguyên, bao gồm evidence lịch sử. File Agent/frontend và runner mới ở bảng mục 2. `backend/src/scripts/seedAttractions.ts` xuất hiện sau baseline (creation 08/11/2026 11:54 giờ địa phương) do thay đổi song song ngoài task; không thuộc T-AI-02, không được chạy hoặc chỉnh sửa. Không migration, seed, reset, truncate, commit, push hay deploy.

## 5. OPEN và giới hạn

- **LIVE_LLM NOT RUN:** chưa xác nhận Gemini/Ollama thật, hiểu tiếng Việt, chi phí provider, quota thực hay độ đúng lịch trình trong môi trường tích hợp. Mock chỉ chứng minh UI/contract đã mô phỏng.
- **HTTP → PostgreSQL thật NOT RUN:** browser test intercept API nên chưa chứng minh wiring production, Catalog thật hay cost Planner thật ở trang Chat.
- Conversation chỉ ở RAM theo MVP; reload xóa lịch sử và UI báo rõ. Consent là xác nhận từng request, không ghi DB bởi frontend.
- Existing Map P2 OPEN từ T13-B; T13-B còn 28 CORE NOT RUN. Không đổi các kết quả này.

## 6. NEXT TASK PLAN — đề xuất, chưa thực hiện

```text
# TASK T-AI-03 — Nghiệm thu Chat UI với Agent/LLM thật

Mục tiêu: nghiệm thu end-to-end /assistant → API Agent → Catalog/Planner → PostgreSQL test → provider LLM thật, không thay acceptance của T-AI-02.

Dependency:
1. Duyệt provider (Gemini hoặc Ollama), model, endpoint, quota/budget và cách cấp secret cho test; không ghi key vào repo/evidence.
2. Bật LIVE_LLM chỉ trong môi trường test được duyệt và kiểm security/consent version hiện hành.
3. Chỉ dùng travelgo_ai_m0_test; kiểm exact DB, guard, sentinel, 12 migration checksums, fingerprint before rồi mới tạo fixture có ledger; cleanup theo ID/FK và fingerprint after.

Thực hiện:
1. Khóa manifest kịch bản tiếng Việt: hỏi thiếu thông tin, nhiều lượt, Catalog Place, Planner itinerary/cost/warnings, unsupported, tool failure, 428 đồng ý/từ chối, 429/502/503/504, logout/account switch.
2. Chạy desktop 1440×900 và mobile giả lập 390×844 qua browser → API thật → PostgreSQL test → LLM thật; ghi raw HTTP status và DB projections an toàn, redact secret/private data.
3. Đối chiếu lịch trình/giá với output Planner và Catalog thật, không chấp nhận provider tự bịa địa điểm/giá; kiểm không có Trip/Booking mutation.
4. Phân biệt LIVE_LLM, provider test double và UI MOCK_ONLY trong mọi kết quả. Giữ expected; FAIL thì lưu evidence/severity, không âm thầm sửa code hay đổi assertion.
5. Chạy build, regression Agent Foundation/Transport/Planner/Recommendation, kiểm source integrity và DB cleanup/fingerprint.

Đầu ra: docs/HUGO_T_AI_03_LIVE_AGENT_E2E_REPORT.md và docs/evidence/t-ai-03/; PASS/FAIL/NOT RUN từng case, bug/risks, chi phí test, quyết định có thể nghiệm thu LIVE_LLM hay chưa.

Điểm dừng: sau báo cáo. Không tự sửa Map, không triển khai T13-B-03, Trip/Booking mutation, push hoặc deploy.
```
