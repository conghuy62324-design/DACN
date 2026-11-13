# T-AI-03-B-LIVE-V2-B1-FINAL — Kết quả đủ 24 case NLU LIVE

Ngày 09/11/2026 (Asia/Ho_Chi_Minh). **Phép đo đã hoàn tất: 3 PASS / 21 FAIL / 0 NOT RUN.** VI21–VI24 được gọi đúng một lần/case bằng Ollama local; VI01–VI20 lấy nguyên vẹn từ [run B1](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/results.json), không phát lại request. **TAI03B-B1-01 (P1) vẫn OPEN**: cả 24 decision tại ranh giới provider đều là `{"kind":"unsupported"}`. Đây là kết quả NLU LIVE thất bại, không phải Agent E2E được nghiệm thu.

## 1. Điều kiện và cách thực thi

- Manifest V2 `APPROVED_LOCKED` giữ nguyên, SHA-256 **`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`** khớp lock và từng request/expected đã khóa. Model local `qwen3:4b-instruct-2507-q4_K_M`, digest **`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`**, được kiểm qua `127.0.0.1:11434/api/tags`; [model evidence](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/model.json).
- Mốc B1 **08/11/2026 20:51:03.947** đã qua; [gate mới](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/resume-gate.json) kiểm lúc **09/11/2026 09:13:23.369**. Tái sử dụng principal `9997f6db-bfa1-4377-96f3-5b5ea19dbf34` từ B1. `AgentLimits` vẫn mặc định 20 request/người/giờ, concurrency 2; run thực thi tuần tự, không override/reset/bypass. [Request ledger](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/request-count.json) ghi **20 request cũ + 4 POST mới**, không retry. Mỗi case mới có dấu `attempt-VIxx.json` trước khi gọi.
- Harness mới [final evaluator](../backend/scripts/t-ai-03-b-live-v2-b1-final-evaluate.cjs) dùng `createConfiguredProvider()` và `AgentOrchestrator` thật, route Agent thật, JWT tổng hợp cùng principal B1. Nó chặn POST ngoài `http://127.0.0.1:11434/api/chat`, chặn proxy env, giới hạn cứng 4 POST, giữ nguyên prompt, schema, `temperature:0`, `num_ctx:16384`, `num_predict:2048`, timeout 15 giây. Decision được ghi **sau parse/validation của provider nhưng trước fallback của orchestrator**. B1 và resume không lưu byte `message.content` thô, nên kết luận về raw JSON là trong giới hạn evidence này. Không dùng mock, Gemini/cloud, browser hay tài khoản demo.
- [Evidence B1](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/old-evidence-check.json) được kiểm đủ 20 file case, request hash/expected và SHA `results.json` trước run rồi kiểm lại khi tổng hợp. Không có thay đổi request/history/expected hoặc evidence cũ.

## 2. Preflight vận hành và dữ liệu

[DB preflight](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/db-preflight.json) PASS: exact DB `travelgo_ai_m0_test`, guard/sentinel PASS, connection `default_transaction_read_only=on`, `ALLOW_TEST_DB_WRITES=false`, **12/12 migration checksum** khớp, 27 `trip_sessions` lịch sử. Fingerprint [before](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/before.json) được chụp trước request đầu. Không tạo fixture; [ledger](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/ledger.json) ghi 0 write, cleanup không cần.

NVIDIA RTX 4060, driver 560.94. Trước run: RAM trống **2.766 MiB**, VRAM trống **5.866 MiB**, model chưa resident. Sau VI21: RAM trống **2.214 MiB**, VRAM trống **995 MiB**, `/api/ps` báo model resident **100% GPU** ([before](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/hardware-before.json), [after first](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/hardware-after-first.json)). Đây là snapshot trước/sau VI21, không phải GPU/CPU split riêng của từng request. VI21 cold load khoảng **9.919 ms** trong **10.457 ms** Ollama total; HTTP end-to-end **10.541 ms**, dưới timeout 15 giây. Các case sau 156–180 ms vì mỗi output chỉ 6 token.

## 3. Kết quả từng case

Các file [VI21](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/VI21.json), [VI22](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/VI22.json), [VI23](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/VI23.json), [VI24](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/VI24.json) lưu expected, parsed provider decision, HTTP, schema, missing fields, token và latency. VI01–VI20 trỏ về evidence B1 bất biến. Mọi HTTP là **200**, JSON/schema/runtime parse **PASS**, actual decision `unsupported`, `toolCalls=0`.

| ID | Expected đã khóa | Actual provider | HTTP | Latency ms | Prompt/output token | Kết quả |
|---|---|---|---:|---:|---:|---|
| VI01 | search_places | unsupported | 200 | 8.082 | 931/6 | **FAIL** |
| VI02 | search_places | unsupported | 200 | 166 | 930/6 | **FAIL** |
| VI03 | search_places | unsupported | 200 | 139 | 927/6 | **FAIL** |
| VI04 | plan_trip | unsupported | 200 | 149 | 961/6 | **FAIL** |
| VI05 | clarify | unsupported | 200 | 163 | 954/6 | **FAIL** |
| VI06 | clarify | unsupported | 200 | 156 | 931/6 | **FAIL** |
| VI07 | clarify | unsupported | 200 | 174 | 949/6 | **FAIL** |
| VI08 | clarify | unsupported | 200 | 130 | 952/6 | **FAIL** |
| VI09 | plan_trip, multi-turn | unsupported | 200 | 170 | 982/6 | **FAIL** |
| VI10 | plan_trip, multi-turn | unsupported | 200 | 163 | 1003/6 | **FAIL** |
| VI11 | plan_trip, multi-turn | unsupported | 200 | 151 | 1000/6 | **FAIL** |
| VI12 | plan_trip, multi-turn | unsupported | 200 | 171 | 1010/6 | **FAIL** |
| VI13 | plan_trip, multi-turn | unsupported | 200 | 136 | 1000/6 | **FAIL** |
| VI14 | plan_trip | unsupported | 200 | 155 | 964/6 | **FAIL** |
| VI15 | plan_trip | unsupported | 200 | 144 | 962/6 | **FAIL** |
| VI16 | plan_trip | unsupported | 200 | 155 | 958/6 | **FAIL** |
| VI17 | unsupported | unsupported | 200 | 160 | 919/6 | **PASS** |
| VI18 | unsupported | unsupported | 200 | 131 | 919/6 | **PASS** |
| VI19 | unsupported | unsupported | 200 | 132 | 931/6 | **PASS** |
| VI20 | plan_trip | unsupported | 200 | 165 | 965/6 | **FAIL** |
| VI21 | clarify: `adults` | unsupported | 200 | 10.541 | 949/6 | **FAIL** |
| VI22 | clarify: `destinationCity` | unsupported | 200 | 180 | 953/6 | **FAIL** |
| VI23 | clarify: `dailyBudgetPerPerson` | unsupported | 200 | 156 | 915/6 | **FAIL** |
| VI24 | clarify: `startDate`, `endDate` | unsupported | 200 | 173 | 942/6 | **FAIL** |

## 4. Tổng hợp và phân loại lỗi

[Analysis được tính từ 24 record](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/analysis.json): **3/24 PASS = 12,5%**, **21/24 FAIL**, 0 NOT RUN. Tool intent **0/13**, clarify/missing fields **0/8**, unsupported **3/3**, multi-turn **0/5**. Ba unsupported PASS chỉ phản ánh nhãn trùng expected, không chứng minh model phân biệt đúng các intent vì cả 24 đều cùng nhãn. Provider JSON/schema/runtime validation **24/24**, HTTP 200 **24/24**, `done_reason=stop`, không có timeout/network/provider error. Tổng token **22.907 prompt / 144 output**. Latency min **130 ms**, median **158 ms**, p95 nearest-rank **8.082 ms**, max **10.541 ms**, mean **918 ms**; hai giá trị cao là cold load ở hai run.

**TAI03B-B1-01 — P1 OPEN, NLU Decision Collapse.** Cả 13 intent cần tool và 8 intent cần clarify bị phân loại `unsupported`; thiếu fields thực tế là `null` ở VI21–VI24. Cả 24 parsed decision được chụp tại provider boundary trước fallback server; response API cũng có `status=unsupported`. Do đó lỗi quan sát là ở decision/classification path, không phải một server fallback đang biến decision đúng thành unsupported. Báo cáo [root-cause offline](HUGO_T_AI_04_A_ROOT_CAUSE_OFFLINE_REPORT.md) có các yếu tố khả dĩ về prompt/schema/tool description, nhưng chưa có bằng chứng xác định duy nhất nguyên nhân.

Không có tool call nên **Catalog/Planner và tool-result fidelity chưa thể đánh giá (0/0 call)**; không quy 13 tool case thành lỗi adapter. DB không phát sinh mutation. Không có browser LIVE E2E trong phạm vi này. Không có bằng chứng provider/HTTP/schema failure; không thay đổi model/prompt/schema/expected để làm PASS.

## 5. Bảo toàn và điểm dừng

[Fingerprint after/compare](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/fingerprint-compare-compare.log): **PASS, 25/25 bảng trùng, `changed=[]`**; 27 Trip lịch sử giữ nguyên. Cleanup: không có fixture, residual 0 theo ledger. [Source integrity trước](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/source-integrity-before.json) và [sau](evidence/t-ai-03-b-live-v2-b1-final/run-20261109T021318305Z-59ab853b/source-integrity-after.json): **3.960/3.960 file baseline bất biến, 0 changed**. Backend build PASS. Chỉ thêm hai script harness, evidence run riêng và báo cáo này; không sửa source production, benchmark/lock, evidence B1, AgentLimits hoặc dữ liệu DB. Không migration, seed, reset, truncate, commit, push hay deploy.

**NEXT TASK PLAN — `T-AI-04-A-FIX`:** dùng [phân tích offline](HUGO_T_AI_04_A_ROOT_CAUSE_OFFLINE_REPORT.md) để sửa tối thiểu decision routing ở source Agent sau khi xác nhận nguyên nhân; giữ manifest/expected khóa. Trước tiên kiểm unit/offline cho cả bốn nhánh, quyền truy cập, schema, bảo vệ dữ liệu và tool invocation; mọi inference mới phải được phê duyệt và lưu evidence tách khỏi benchmark 24 request đã chốt. Sau đó đánh giá lại NLU và browser E2E bằng task/ủy quyền riêng, không ghi đè run này. **Task hiện tại dừng tại báo cáo; chưa triển khai FIX.**
