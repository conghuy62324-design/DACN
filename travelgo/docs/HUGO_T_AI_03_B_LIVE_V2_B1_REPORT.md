# T-AI-03-B-LIVE-V2-B1 — Đợt 1 NLU Ollama thật

Ngày 08/11/2026 (Asia/Saigon). **Kết quả: 3 PASS / 17 FAIL / 4 NOT RUN.** Đã gửi đúng **20 request inference local**, mỗi VI01–VI20 một lần, tuần tự với một principal. VI21–VI24 chưa chạy vì cửa sổ 20 request/user/giờ chưa hết. Đây là kết quả NLU LIVE một phần, **không phải 24/24 PASS** và không bao gồm browser E2E.

## 1. Phê duyệt, benchmark và cách chạy

Chủ dự án đã phê duyệt tối đa 24 lượt inference trên model Ollama local cho VI01–VI24, tối đa một lượt/case; B1 không có quyền chạy browser LIVE, tạo fixture, gọi cloud/Gemini hoặc gửi request bổ sung để sửa kết quả. Đã đọc [báo cáo giai đoạn A](HUGO_T_AI_03_B_LIVE_V2_REPORT.md), [technical smoke](HUGO_T_AI_03_B_LOCAL_SMOKE_RETRY_REPORT.md), Agent provider/limits/tools và [manifest APPROVED](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json)/[lock](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json). SHA-256 manifest **`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`** khớp lock trước run và được harness kiểm lại trước từng case. Không sửa request, history, expected, criteria, prompt hoặc source production.

Đã sao chép harness V2 thành [evaluator B1](../backend/scripts/t-ai-03-b-live-v2-b1-evaluate.cjs), đặt evidence riêng. Bản B1 giới hạn cứng ở VI01–VI20, không đợi rồi tự chạy VI21–VI24. Bật `LLM_PROVIDER=ollama`, `OLLAMA_MODEL=qwen3:4b-instruct-2507-q4_K_M`, `OLLAMA_BASE_URL=http://127.0.0.1:11434`, `LLM_LIVE_ENABLED=true`, `LLM_USAGE_APPROVED=true`, `OLLAMA_LOCAL_ONLY_CONFIRMED=true` và cờ approval B1 **chỉ trong process test**, không sửa `.env` hoặc bật Agent production. Provider `createConfiguredProvider()` thật, `AgentOrchestrator` thật, route Agent API thật và `catalogPlannerTools` thật; không mock LLM/API/service. Principal là JWT tổng hợp trong process test, không phải login browser. Không lưu JWT/API key/raw model response. Mỗi [case evidence](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/results.json) lưu SHA-256 của input đã khóa, expected, decision model trước fallback server, HTTP, token và latency; input nguyên văn vẫn ở manifest APPROVED.

## 2. Preflight và bảo vệ dữ liệu

[Model evidence](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/model.json): direct `127.0.0.1:11434`, tag **`qwen3:4b-instruct-2507-q4_K_M`**, digest **`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`**. Loopback URL được allowlist, không có proxy env/Cloud/Gemini. Trước request đầu model chưa resident; GPU NVIDIA RTX 4060 nhận diện, driver 560.94, RAM rảnh 3.794 MiB, VRAM rảnh 6.219 MiB. Sau VI01, Ollama `/api/ps` xác nhận model resident **100% GPU**, VRAM rảnh 1.218 MiB, RAM rảnh 2.893 MiB; sau run VRAM rảnh 1.202 MiB và RAM rảnh 2.889 MiB. [Hardware before](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/hardware-before.json), [after first](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/hardware-after-first.json), [after run](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/hardware-after.json). Không đo GPU/CPU split từng request; `/api/ps` là bằng chứng residency sau VI01.

[DB preflight](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/db-preflight.json) xác nhận **`travelgo_ai_m0_test`** chính xác, guard/sentinel PASS, `default_transaction_read_only=on`, `ALLOW_TEST_DB_WRITES=false`, **12/12 migration checksum** khớp. Catalog APPROVED Đà Nẵng có 5 hotel, 1 restaurant, 0 attraction; Hội An 0 place; sentinel VI20 không có place. Có 27 Trip lịch sử. Không tạo fixture hoặc ghi DB; [ledger](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/ledger.json) ghi 0 write/fixture. [Fingerprint before/after](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/fingerprint-compare-compare.log) **25/25 bảng trùng**, residual 0. Vì model không gọi tool ở cả 20 case, Catalog/Planner không thực thi; dữ liệu thiếu nêu trên là giới hạn đã biết, **không phải nguyên nhân của 17 FAIL quan sát được**.

## 3. Kết quả từng case

| ID | Expected | Decision model thật | HTTP | Thời gian ms | Prompt/output token | Kết quả |
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
| VI21 | manifest APPROVED | chưa gọi | — | — | — | **NOT RUN** |
| VI22 | manifest APPROVED | chưa gọi | — | — | — | **NOT RUN** |
| VI23 | manifest APPROVED | chưa gọi | — | — | — | **NOT RUN** |
| VI24 | manifest APPROVED | chưa gọi | — | — | — | **NOT RUN** |

Mỗi dòng thực thi có file `VIxx.json` trong [run evidence](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/). Không có retry; tổng `inferencePosts=20`, đúng số case đã chạy. VI21–VI24 ghi NOT RUN, không lấy kết quả dry run/MOCK_ONLY làm LIVE.

## 4. Accuracy, schema, tool và lỗi

[Derived analysis](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/analysis.json) tính từ evidence gốc, không sửa assertion/expected:

| Chỉ số | Tử số / mẫu số thực thi | Diễn giải |
|---|---:|---|
| Case PASS | **3/20 = 15%** | 4 case còn lại chưa chạy, chưa có accuracy cuối của 24 |
| Tool case đúng | **0/13** | Model chọn `unsupported` ở toàn bộ 13 case |
| Clarify/missing fields đúng | **0/4** | Model chọn `unsupported`, không trả danh sách trường thiếu |
| Unsupported đúng | **3/3** | Chỉ chứng minh output phù hợp ba case này; model cũng chọn cùng nhãn cho mọi case khác |
| Multi-turn đúng | **0/5** | VI09–VI13 là tập con của 13 tool case, không cộng vào 20 |
| JSON/schema/runtime parse | **20/20** | Provider trả decision hợp lệ; HTTP 200 và `done_reason=stop` |
| Tool selection toàn đợt | **3/20** | Trùng ba case unsupported |
| Tool adapter/result fidelity | **0/0 đánh giá được** | **0 tool call**; 13 case tool bị chặn từ NLU, chưa kết luận Catalog/Planner đúng/sai |

`results.json` gốc có metric `toolResultFidelity=0/13` theo số **case kỳ vọng tool**; vì không case nào gọi tool, không được đọc chỉ số này như 13 lỗi của adapter. `analysis.json` giữ evidence gốc và diễn giải đúng mẫu số thực sự quan sát được. Arguments thực tế của 13 tool case: **không có**, vì decision là `unsupported`; missing fields thực tế của 4 clarify case: **không có**. Server trả `unsupported` theo decision model, không phải fallback được chấm PASS giả. VI20 đáng lẽ kiểm cảnh báo catalog thiếu nhưng model không tới Planner, nên tool outcome VI20 **NOT EVALUABLE**.

**Lỗi TAI03B-B1-01, P1 — NLU decision collapse:** cả 20 request có nội dung khác nhau đều nhận `{kind:"unsupported"}`; 17 request hợp lệ/missing-field bị phân loại sai. Đây là lỗi hành vi LIVE của model/prompt/schema path hiện tại, chưa xác định chính xác nguyên nhân. Không có bằng chứng để quy lỗi cho Catalog, Planner hoặc DB; cũng không thể kết luận ba case security PASS chứng minh model hiểu đúng ý định vì output luôn cùng một nhãn. Đề xuất FIX TASK riêng điều tra một cách có kiểm soát sau khi chốt kết quả benchmark; không chỉnh prompt/schema/expected hay gửi thêm request trong B1. Không có provider timeout, lỗi mạng, schema, HTTP hoặc rò dữ liệu quan sát được trong run này.

Latency toàn đợt: min **130 ms**, median **155,5 ms**, p95 **174 ms**, max **8.082 ms**, mean **550 ms**. VI01 cold load **7.596 ms** trong 8.032 ms Ollama total; các case còn lại ngắn vì model luôn xuất 6 token `unsupported`. Tổng prompt **19.148 token**, output **120 token**. Các số latency nhanh **không** chứng minh tốc độ cho decision tool có arguments dài vì nhánh đó chưa được model chọn. Không case nào vượt timeout 15 giây; VRAM không dưới ngưỡng dừng 512 MiB.

## 5. Rate window, source integrity và điểm dừng

[Rate-window evidence](evidence/t-ai-03-b-live-v2-b1/run-20261108T125101122Z-d593f9b0/rate-window.json) ghi cùng một principal UUID, request đầu **12:51:01.947 UTC** ngày 08/11/2026; thời điểm sớm nhất được phép tiếp tục **13:51:03.947 UTC**, tương ứng **20:51:03.947 Asia/Saigon** ngày 08/11/2026. Khi lập báo cáo, thời điểm này chưa tới. Harness dừng sau VI20; không đổi principal, reset server hay chạy VI21–VI24. Rate limiter của Agent hiện ở bộ nhớ process; dù process test đã kết thúc, lần tiếp tục phải tôn trọng mốc `eligibleAfter` đã lưu và dùng cùng principal UUID theo ledger. Không tự chạy B2.

[Source baseline SHA-256](evidence/t-ai-03-b-live-v2-b1/baseline.json) và [audit cuối](evidence/t-ai-03-b-live-v2-b1/integrity-after.json) đối chiếu source/evidence có trước với task mới, loại backup demo cục bộ có thể chứa dữ liệu account, `.env`, build artifacts và evidence B1. Chỉ thêm harness/evidence/báo cáo B1; không sửa source production, benchmark APPROVED/lock, T-AI-03-B giai đoạn A hoặc evidence cũ. Không migration/reset/seed/truncate, commit/push/deploy.

**NEXT TASK PLAN:** Sau 20:51:03.947 Asia/Saigon và khi operator/chủ dự án giao tiếp tục, (1) kiểm lại lock/hash, model digest/loopback/GPU, exact DB/guard/sentinel/12 checksum và fingerprint; (2) dùng cùng principal UUID, chạy **chỉ VI21–VI24** mỗi case tối đa một lượt, không retry, giữ nguyên expected và lưu evidence riêng; (3) cập nhật kết quả 24 case, tách lỗi NLU, provider và tool, fingerprint after/cleanup; (4) lập FIX TASK riêng cho TAI03B-B1-01 dựa trên evidence, không làm trong đợt đo. Browser LIVE, catalog fixture và T-AI-04 vẫn ngoài phạm vi B1 và cần task/phê duyệt riêng.

**Kết luận:** B1 đã hoàn thành đợt VI01–VI20 theo quyền thực thi. **3 PASS / 17 FAIL / 4 NOT RUN**. Dừng, chờ cửa sổ rate limit và chỉ đạo tiếp theo.
