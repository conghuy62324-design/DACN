# T-AI-04-A-FIX — Sửa hướng dẫn NLU Decision Routing

Ngày 09/11/2026 (Asia/Ho_Chi_Minh). **Trạng thái: FIX IMPLEMENTED — LIVE NLU NOT YET VALIDATED.** Đã sửa tối thiểu prompt và Ollama system context, build và regression offline PASS. **TAI03B-B1-01 (P1) vẫn OPEN** cho đến khi có phép đo model thật được phê duyệt riêng. Task này không gửi inference, không chạy lại VI01–VI24, không chạy Browser E2E và không truy cập DB.

## 1. Baseline và nhận định nguyên nhân

[Benchmark LIVE V2 trước FIX](HUGO_T_AI_03_B_LIVE_V2_B1_FINAL_REPORT.md): **3 PASS / 21 FAIL / 0 NOT RUN**, accuracy **12,5%**; tool **0/13**, clarify **0/8**, unsupported **3/3**, multi-turn **0/5**, JSON/schema **24/24**. Cả 24 parsed provider decisions là `{"kind":"unsupported"}` trước server fallback, không có tool call. [Điều tra offline](HUGO_T_AI_04_A_ROOT_CAUSE_OFFLINE_REPORT.md) xác nhận prompt cũ có pseudo-JSON và chưa phân biệt rõ cấm bịa kết quả với quyền gọi tool đọc; nhánh Ollama cũng không đưa descriptions của `AGENT_TOOLS` vào system message. Đây là **đặc điểm source đã xác nhận và nguyên nhân nghi vấn**, chưa chứng minh quan hệ nhân quả với collapse. Không đổi schema hay model để suy diễn kết quả.

## 2. Phạm vi và diff thực tế

| File | Trước | Sau | Tác động |
|---|---|---|---|
| [agentService.ts](../backend/src/services/agentService.ts) | SYSTEM nêu các nhánh bằng pseudo-JSON như `"name":"plan_trip" hoặc "search_places"`, thiếu quy tắc routing tích cực và ranh giới `unsupported`. | Quy tắc chọn `search_places`, `plan_trip`, `clarify`, `unsupported`; bốn ví dụ JSON hợp lệ; nêu rõ có thể gọi tool đọc nhưng không được bịa giá/địa điểm/lịch trình, lưu Trip hoặc đặt chỗ. | Chỉ đổi system prompt; nhánh orchestrator, auth, consent, rate limit và tool execution giữ nguyên. |
| [liveProvider.ts](../backend/src/agent/liveProvider.ts) | Ollama system message gồm prompt và `DECISION_SCHEMA`, không có `AGENT_TOOLS.description`. | Ghép tên, description, required và parameters của **chính `AGENT_TOOLS` đã allowlist** vào system message Ollama trước schema. Không tin `input.tools` hoặc history để thay metadata. | Model nhìn thấy mô tả tool hiện hành; vẫn dùng `format: DECISION_SCHEMA`, JSON decision, không bật native `tool_calls`. Gemini request không nhận thêm tool metadata. |
| [agentDecisionRouting.test.ts](../backend/src/tests/agentDecisionRouting.test.ts) | Chưa có. | 10 test MOCK_ONLY với fixture kỹ thuật ngoài benchmark: prompt, examples/validator, transport, ba nhánh trả lời, tool read-only, injection, history/account, auth và error/timeout. | Chỉ phục vụ regression offline, không chứng minh NLU model thật. |
| [t-ai-04-a-fix-integrity.cjs](../backend/scripts/t-ai-04-a-fix-integrity.cjs) | Chưa có. | Audit hash baseline/benchmark/evidence và ghi summary mới. | Không gọi DB, inference hoặc sửa evidence cũ. |

SHA-256 production source trước → sau: `agentService.ts` `011322a5…` → `418f6b3b…`; `liveProvider.ts` `5f2c4596…` → `c0835825…`. Hash đầy đủ ở [source-integrity.json](evidence/t-ai-04-a-fix/source-integrity.json). Không có file production khác đổi so với baseline B1 **3.960 file**.

## 3. Routing và guardrails

Prompt mới chọn `unsupported` cho intent ngoài tìm Catalog/lập lịch hoặc yêu cầu mutation/truy cập chéo; `clarify` cho intent phù hợp thiếu required fields; một `tool` đọc khi intent phù hợp và đủ tham số. `search_places` dùng `destinationCity`, `dailyBudgetPerPerson`; `plan_trip` dùng `departureCity`, `destinationCity`, `startDate`, `endDate`, `adults`, `totalBudget`, `transportation` theo [AGENT_TOOLS](../backend/src/agent/tools.ts). Ví dụ trong prompt là JSON decision, **không phải** địa điểm/giá/lịch trình trả về cho người dùng. Backend vẫn là bên thực thi tool và trả kết quả từ Recommendation/Planner thật.

`DECISION_SCHEMA`, `parseDecision()`, `validateTool()`, tool adapter, auth, consent, privacy, giới hạn một tool/lượt, `AgentLimits`, history, timeout 15 giây, loopback-only và cấm Trip/Booking mutation đều giữ nguyên. Ollama request vẫn `stream:false`, `temperature:0`, `num_ctx:16384`, `num_predict:2048`, `format:DECISION_SCHEMA`; không có native `tools` field. Metadata tool là bản compile-time `AGENT_TOOLS`, không chứa JWT, DB secret hay account context; user/history chỉ nằm ở các role message thấp hơn system. Test giả lập `save_trip` bị validator chặn trước executor. Test mock không chứng minh model thật chống mọi prompt injection, nên vẫn cần LIVE probe riêng.

## 4. Build, test và regression offline

Các log nằm ở [evidence T-AI-04-A-FIX](evidence/t-ai-04-a-fix/); [regression summary](evidence/t-ai-04-a-fix/regression-summary.json) ghi exit code và số test từng nhóm. Toàn bộ test dưới đây **MOCK_ONLY hoặc unit, không có Ollama/Gemini inference và không dùng DB**:

| Nhóm | Kết quả | Evidence |
|---|---:|---|
| Backend build | **PASS** | [build log](evidence/t-ai-04-a-fix/backend-build.log) |
| Decision routing mới | **10/10 PASS** | [routing log](evidence/t-ai-04-a-fix/agent-decision-routing.log) |
| Agent Foundation | **22/22 PASS** | [foundation log](evidence/t-ai-04-a-fix/agent-foundation.log) |
| LLM Transport | **19/19 PASS** | [transport log](evidence/t-ai-04-a-fix/agent-transport.log) |
| Planner validation/costs | **50/50 PASS** | [cost log](evidence/t-ai-04-a-fix/planner-validation-costs.log) |
| Planner modes | **17/17 PASS** | [modes log](evidence/t-ai-04-a-fix/planner-modes.log) |
| Recommendation unit | **16/16 PASS** (6+8+2) | [exposure](evidence/t-ai-04-a-fix/recommendation-exposure.log), [correctness](evidence/t-ai-04-a-fix/recommendation-correctness.log), [pagination](evidence/t-ai-04-a-fix/recommendation-pagination.log) |
| Chat UI unit | **10/10 PASS** | [UI unit log](evidence/t-ai-04-a-fix/chat-ui-unit.log) |

**Tổng 144/144 test PASS, 0 FAIL**; backend build PASS. Frontend source không đổi nên frontend build **NOT RUN** theo điều kiện “nếu bị ảnh hưởng”. Browser E2E **NOT RUN** theo điểm dừng task. Unit test kiểm JSON examples bằng `JSON.parse`, `DECISION_SCHEMA` branch/required shape, `parseDecision()` và `validateTool()`; request thật được dựng qua production provider với fake fetch, không mock response thành một lần model inference. Test kiểm history/account và body không chứa account/JWT/DB secrets. Nó không xác nhận chất lượng tiếng Việt hay accuracy LIVE.

## 5. Benchmark, source và dữ liệu

[Integrity audit](evidence/t-ai-04-a-fix/source-integrity.json) so sánh **3.960/3.960 hash baseline B1**: chỉ đúng **hai production file ở mục 2** thay đổi. `decisionSchema.ts`, `tools.ts`, `conversation.ts`, `limits.ts` vẫn khớp hash cũ. Manifest APPROVED giữ SHA-256 **`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`**; lock giữ SHA **`f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706`**. B1 `results.json` và 20 case file, final-resume `results.json` và 4 case file đều được rehash/đối chiếu, không ghi đè; báo cáo baseline trước FIX được giữ nguyên.

Không truy cập PostgreSQL trong task này, nên không có fixture, DB write, cleanup hoặc fingerprint mới cần thực hiện. 27 Trip lịch sử không bị tác động bởi các lệnh của task. Không migration, reset, seed, truncate, commit, push, deploy hoặc sửa Planner/pricing/Booking/Trip/Sentiment.

## 6. Rủi ro còn lại và trạng thái P1

Prompt và tool descriptions có thể cải thiện lựa chọn nhánh, nhưng **chưa có bằng chứng model Qwen3 thật sẽ chọn đúng**. Root `anyOf` và `temperature:0` vẫn như baseline; giả thuyết về tương tác decoder/schema chưa được kiểm. System context dài hơn làm giảm phần input còn lại dưới giới hạn byte/token hiện hành và có thể tăng latency/VRAM. Lệnh routing tích cực cũng có nguy cơ gọi tool cho intent hỗn hợp hoặc prompt injection; validator/authorization vẫn chặn mutation, nhưng cần đo LIVE riêng. Tool fidelity Catalog/Planner vẫn chưa được xác nhận vì benchmark gốc không có tool call. Không tuyên bố P1 CLOSED.

**Kết luận: FIX IMPLEMENTED — LIVE NLU NOT YET VALIDATED; TAI03B-B1-01 (P1) OPEN.**

## 7. NEXT TASK PLAN — `T-AI-04-B-LIVE-PROBE`

Sau phê duyệt inference riêng, khóa một bộ câu kỹ thuật **độc lập với VI01–VI24** gồm intent `search_places`, `plan_trip`, thiếu field cần `clarify`, intent `unsupported` và injection; không tinh chỉnh theo benchmark chính thức. Preflight local model/tag/digest, loopback/no proxy, RAM/VRAM, source hash và timeout 15 giây. Chạy số request được duyệt, một lần/case, lưu parsed decision trước fallback, raw response đã giới hạn/redact khi phù hợp, HTTP, token, latency và tool count. Nếu probe gọi tool thật/DB, chỉ dùng `travelgo_ai_m0_test` với exact guard, sentinel, 12 checksum, fingerprint before/after, fixture ledger và cleanup; tách lỗi NLU khỏi lỗi Catalog/Planner. Không đổi expected sau khi thấy output. Nếu probe đạt, đề xuất task đánh giá lại V2 APPROVED trên source mới với evidence riêng; Browser E2E là task khác. **Không thực hiện NEXT TASK trong T-AI-04-A-FIX.**
