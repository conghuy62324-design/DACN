# T-AI-03-B-LIVE-V2 — Giai đoạn A: LIVE preparation

Ngày 08/11/2026 (Asia/Saigon). **Trạng thái: READY_FOR_LIVE_APPROVAL.** Task này đã hoàn thành giai đoạn A, **chưa chạy LIVE NLU**. Yêu cầu giao chạy giai đoạn B chỉ sau khi operator/chủ dự án phê duyệt rõ phạm vi 24 case. Chưa có phê duyệt đó trong yêu cầu hiện tại; quyền chạy một inference ở task smoke trước không mở rộng sang 24 case. Vì vậy **0 request inference mới**, VI01–VI24 đều **NOT RUN**, browser LIVE **NOT RUN**, chưa có accuracy LIVE để báo cáo. Kết quả technical smoke 1/1 PASS ở [báo cáo trước](HUGO_T_AI_03_B_LOCAL_SMOKE_RETRY_REPORT.md) là bằng chứng tương thích kỹ thuật riêng, không được cộng vào bộ NLU.

## 1. Phạm vi được phép và benchmark

Đã đọc manifest [V2 APPROVED](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json), [lock](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json), báo cáo smoke, roadmap và Agent source hiện hành. SHA-256 bytes của manifest **`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`** khớp lock; 24 ID VI01–VI24 theo thứ tự, request không trùng. Đây là benchmark **V2 được biên soạn lại**, không phải nguyên văn V1. F01–F04 là MOCK_ONLY và không thuộc mẫu số 24. Không thay request, history, expected, criteria hoặc lock. [Bằng chứng lock](evidence/t-ai-03-b-live-v2/phase-a/benchmark.json).

| Chỉ số LIVE | Kết quả giai đoạn A |
|---|---:|
| PASS / FAIL / NOT RUN | **0 / 0 / 24** |
| Tool selection / arguments | NOT RUN, mẫu số thực thi 0/13 |
| Clarify / missing fields | NOT RUN, mẫu số thực thi 0/8 |
| Unsupported / security | NOT RUN, mẫu số thực thi 0/3 |
| Multi-turn | NOT RUN, mẫu số thực thi 0/5; các case này thuộc các nhóm trên |
| Tool fidelity và JSON/schema từ 24 case | NOT RUN, mẫu số thực thi 0 |
| Latency/token của 24 case | NOT RUN, không có mẫu đo |
| Browser desktop/mobile | NOT RUN / NOT RUN |

Không lấy 0/24 làm accuracy 0%; accuracy chưa xác định vì chưa có case nào được chạy. [Kết quả từng case](evidence/t-ai-03-b-live-v2/phase-a/nlu-results.json) và [dry run evaluator](evidence/t-ai-03-b-live-v2/phase-a/evaluator-dry-run.json) ghi riêng trạng thái NOT RUN:

| Case | Trạng thái | Case | Trạng thái | Case | Trạng thái | Case | Trạng thái |
|---|---|---|---|---|---|---|---|
| VI01 | NOT RUN | VI07 | NOT RUN | VI13 | NOT RUN | VI19 | NOT RUN |
| VI02 | NOT RUN | VI08 | NOT RUN | VI14 | NOT RUN | VI20 | NOT RUN |
| VI03 | NOT RUN | VI09 | NOT RUN | VI15 | NOT RUN | VI21 | NOT RUN |
| VI04 | NOT RUN | VI10 | NOT RUN | VI16 | NOT RUN | VI22 | NOT RUN |
| VI05 | NOT RUN | VI11 | NOT RUN | VI17 | NOT RUN | VI23 | NOT RUN |
| VI06 | NOT RUN | VI12 | NOT RUN | VI18 | NOT RUN | VI24 | NOT RUN |

## 2. Harness V2 đã triển khai

Thêm ba script riêng trong `backend/scripts/`:

- `t-ai-03-b-live-v2-integrity.cjs`: baseline/audit SHA-256 source và evidence lịch sử, bỏ qua build artifacts và evidence mới.
- `t-ai-03-b-live-v2-prepare.cjs`: preflight read-only cho V2 lock, Ollama tag/digest, Agent limits, DB guard/sentinel/checksum/catalog/fingerprint; ghi 24 NOT RUN. Đã thực thi PASS.
- `t-ai-03-b-live-v2-evaluate.cjs`: evaluator đọc V2 APPROVED/lock, mặc định **NO_INFERENCE** và đã dry run PASS. Nhánh `--live` được khóa bằng cờ phê duyệt riêng `T_AI_03_B_V2_LIVE_APPROVED=true` cùng các cờ provider local hiện hành. **Nhánh LIVE chưa được chạy hoặc chứng minh E2E trong task này.**

Thiết kế nhánh LIVE dùng `createConfiguredProvider()` và `AgentOrchestrator` thật, route `/api/agent/chat`, `catalogPlannerTools` thật; không dùng evaluator V1, không thay `AgentLimits`. Decision được bắt ngay từ provider trước logic server, rồi so với `expected` bất biến; HTTP status, tool call, kết quả trả từ adapter, lỗi, latency và token được ghi từng case. Không coi fallback `clarify` hoặc `tool_unavailable` của server là model decision đúng nếu decision model sai. Chạy tuần tự một principal; sau 20 request phải chờ cửa sổ 1 giờ của chính instance `AgentLimits` hết hạn mới chạy 4 case cuối, không tạo account mới để né rate limit, không retry tự động. Kiểm VRAM tối thiểu trước mỗi case; timeout/network/provider failure thì ngừng và đánh phần chưa chạy NOT RUN. Hash benchmark được kiểm trước từng case.

Nhánh NLU dùng JWT tổng hợp chỉ ở process test, **không phải login qua Auth API thật**; browser E2E sau này phải kiểm login thật riêng. JWT, API key và dữ liệu account/Booking riêng không được đưa vào prompt hoặc evidence. VI19 trong benchmark đã khóa có **từ** “Booking” trong nội dung prompt injection; đó không phải bản ghi Booking hay thông tin cá nhân. Harness không ghi token, raw prompt/model response hay dữ liệu riêng; chỉ ghi decision/arguments có lọc, metric và mã lỗi. Phần này mới được rà soát source/dry run, chưa được xác nhận bằng LIVE request.

## 3. Provider, nguồn dữ liệu và tài nguyên

[Ollama preflight](evidence/t-ai-03-b-live-v2/phase-a/ollama.json) trả HTTP từ **`127.0.0.1:11434`** qua socket trực tiếp, không proxy; tag `qwen3:4b-instruct-2507-q4_K_M`, digest **`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`**, size 2.497.293.803 byte. `localOllamaUrl()` chấp nhận loopback; không có proxy env/Node proxy. Global Agent LIVE vẫn tắt: [configuration redacted](evidence/t-ai-03-b-live-v2/phase-a/configuration.json) ghi `LLM_PROVIDER` chưa cấu hình, `LLM_LIVE_ENABLED`, `LLM_USAGE_APPROVED`, `OLLAMA_LOCAL_ONLY_CONFIRMED` và cờ phê duyệt V2 đều false. Chưa bật Cloud/Gemini. Source provider giữ `DECISION_SCHEMA`, `num_ctx=16384`, `num_predict=2048`, timeout 15 giây; smoke trước chứng minh **một** phản hồi schema/`parseDecision()` PASS, latency 4.630,6 ms, 947/6 token, GPU 100%. Không suy diễn sang 24 case.

[Hardware snapshot](evidence/t-ai-03-b-live-v2/phase-a/hardware.json): RAM 16.202 MiB, rảnh 3.502 MiB; RTX 4060 8.188 MiB VRAM, dùng 1.649 MiB/rảnh 6.309 MiB tại thời điểm kiểm, driver 560.94. Đây là snapshot idle khác thời điểm smoke; khi model nạp ở smoke trước chỉ còn khoảng 949 MiB VRAM. Chưa đo GPU/CPU split hay latency mới vì không inference. Read-only `nvidia-smi` thành công; truy vấn WMI/NetTCPConnection trong sandbox bị Access denied, nên dùng Node `os` và kiểm service trực tiếp bằng HTTP. Không cần quyền cao hơn để chứng minh các điều kiện đã nêu.

[DB preflight](evidence/t-ai-03-b-live-v2/phase-a/db-preflight.json) dùng **`travelgo_ai_m0_test`** chính xác, `NODE_ENV=test`, guard và sentinel PASS, session `default_transaction_read_only=on`, `ALLOW_TEST_DB_WRITES=false`, **12/12 migration checksum** khớp. Catalog APPROVED Đà Nẵng: 5 hotel, 1 restaurant, **0 attraction**; Hội An: **0 place**. Sentinel VI20 `HUGO_NO_CATALOG_TAI01B`: **0 place**. Có **27 Trip lịch sử**, không bị đụng tới. Thiếu catalog hiện là rủi ro cho browser E2E tạo lịch trình thành công và kiểm chi phí: phải chuẩn bị fixture task riêng có ledger/cleanup hoặc xác nhận expectation chỉ là cảnh báo thiếu catalog; không được tự tạo dữ liệu giả hay tự đổi expected V2.

## 4. Rate limits, database safety và regression

[Kiểm giới hạn offline](evidence/t-ai-03-b-live-v2/phase-a/limits-offline.json) bằng `AgentLimits` mặc định PASS: request thứ 21 cùng user bị `AGENT_RATE_LIMITED`, call provider đồng thời thứ 3 bị `AGENT_BUSY`; cơ chế thật là 20/user/giờ và concurrency 2. Harness LIVE chọn concurrency 1, cùng một principal và chờ reset sau case 20. Đây là kiểm cấu trúc offline, chưa xác nhận throughput model thật.

Ledger [giai đoạn A](evidence/t-ai-03-b-live-v2/phase-a/ledger.json): **0 write, 0 fixture, 0 residual**, cleanup không cần. Fingerprint read-only trước/sau [25/25 bảng trùng](evidence/t-ai-03-b-live-v2/phase-a/fingerprint-compare-compare.log); [so sánh sau regression](evidence/t-ai-03-b-live-v2/phase-a/fingerprint-regression-compare.log) với before cũng **25/25 trùng**. Không reset, seed, migration, truncate hoặc sửa 27 Trip lịch sử.

[Regression offline](evidence/t-ai-03-b-live-v2/phase-a/regression.json): backend build PASS; frontend build PASS. Lần build frontend đầu trong sandbox bị chặn đọc `vite.config.ts`; chạy lại cùng lệnh với quyền đọc được duyệt cho build PASS, không sửa source. Agent Foundation **22/22 MOCK_ONLY**, LLM Transport **19/19 MOCK_ONLY, 0 LIVE request**, Planner validation/costs **50/50**, Planner modes **17/17**, Recommendation unit **3/3 suite**, Chat UI unit **10/10 MOCK_ONLY**, Planner UI modes **6/6**. T-AI-03-A integration regression có ghi DB và browser LIVE desktop/mobile đều **NOT RUN** theo ranh giới giai đoạn A; kết quả lịch sử 30/30 scripted provider không được cộng vào LIVE V2. JSON Schema của model thật, tool fidelity, multi-turn và UI E2E cho 24 case đều chưa được kiểm lần này.

## 5. Lỗi, blocker và điều kiện tiếp tục

Không phát hiện lỗi production mới trong giai đoạn A. Các điều kiện còn thiếu:

1. **Approval gate:** operator/chủ dự án cần phê duyệt rõ **24 request NLU LIVE** với model local, quyền sử dụng dữ liệu benchmark và phạm vi browser E2E. Cờ smoke một request trước đây không đủ. Sau duyệt, bật riêng cho phiên test `T_AI_03_B_V2_LIVE_APPROVED=true`, `LLM_PROVIDER=ollama`, `OLLAMA_MODEL=qwen3:4b-instruct-2507-q4_K_M`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `LLM_LIVE_ENABLED=true`, `LLM_USAGE_APPROVED=true`, `OLLAMA_LOCAL_ONLY_CONFIRMED=true`; không bật global production Agent. Kiểm lại digest, lock, resource và test DB trước mỗi đợt.
2. **Catalog fixture gap (P2 test dependency):** DB hiện thiếu attraction Đà Nẵng và toàn bộ place Hội An. Nếu acceptance browser yêu cầu itinerary thành công, phải duyệt fixture đúng catalog, ledger UUID/owner, guard/checksum/fingerprint, cleanup FK và residual 0. Không lấy dữ liệu nền hoặc 27 Trip lịch sử làm fixture phá dữ liệu.
3. **LIVE reliability chưa biết:** một smoke 4,63 giây không chứng minh 24 request đều dưới 15 giây, JSON hợp lệ hoặc đủ VRAM khi model đã nạp. Dừng an toàn và giữ FAIL/NOT RUN nếu timeout, VRAM thấp, sai schema hoặc tool result sai. Không thay prompt, schema, expected hay timeout để làm PASS.
4. **Browser/Auth:** evaluator NLU dùng JWT tổng hợp, không thay thế desktop Edge 1440×900/mobile 390×844 qua Real Auth API, Agent API, Ollama, Catalog/Planner và PostgreSQL. Cần test riêng privacy, account isolation và không có Trip/Booking mutation.

## 6. Source integrity và NEXT TASK PLAN

[Baseline SHA-256](evidence/t-ai-03-b-live-v2/baseline.json) ghi **3.936 file source/evidence có trước**, loại backup demo cục bộ có thể chứa dữ liệu tài khoản, file build và artifact mới của task. Audit cuối tại [integrity-after](evidence/t-ai-03-b-live-v2/integrity-after.json) xác nhận **3.936/3.936 hash không đổi**; chỉ thêm ba harness/evidence/báo cáo của task này. Không sửa V1, V2 draft/candidate/APPROVED/lock, application source, Planner, pricing, Booking, Trip, Map, Sentiment hay T13-B. Không commit/push/deploy.

**NEXT TASK PLAN sau khi phê duyệt LIVE:** (1) operator chốt phạm vi 24 NLU và browser, xác nhận cấu hình local/digest/VRAM; quyết định fixture catalog cho itinerary thành công; (2) khóa source/manifest lần nữa, preflight exact DB/guard/sentinel/12 checksum/fingerprint, ledger trước mọi write; (3) chạy VI01–VI24 tuần tự bằng model thật, cùng principal theo cửa sổ 20/giờ, giữ PASS/FAIL/NOT RUN và accuracy đúng mẫu số; (4) nếu đủ điều kiện, browser Edge desktop/mobile qua auth thật, không mock, tách browser executions khỏi 24 NLU; (5) cleanup đúng ID, residual 0, fingerprint compare, chạy T-AI-03-A regression và audit source; (6) lập FIX TASK riêng cho lỗi, rồi mới đề xuất **T-AI-04**: cải thiện prompt/orchestration dựa trên lỗi LIVE được chứng minh, bổ sung điều kiện xác nhận và phân quyền trước mọi Trip/Booking mutation. Không triển khai T-AI-04 trong task này.

**Điểm dừng:** giai đoạn A READY_FOR_LIVE_APPROVAL; 24/24 NLU LIVE và browser E2E NOT RUN, chờ duyệt phạm vi LIVE.
