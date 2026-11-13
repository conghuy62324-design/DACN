# T-AI-03-B-LOCAL-SMOKE-RETRY — Ollama technical inference

Ngày 08/11/2026 (Asia/Saigon). **Kết quả: PASS cho một technical smoke local. 24/24 NLU V2: NOT RUN.** Chủ dự án cho phép tối đa một inference kỹ thuật tới `127.0.0.1`; đã gửi **đúng một** `POST /api/chat`, không dùng VI01–VI24, Cloud hoặc Gemini. Đây là kết quả tương thích kỹ thuật của một request, chưa chứng minh NLU tiếng Việt hay Agent E2E.

## 1. Preflight — PASS trước inference

Đã đọc [báo cáo smoke trước](HUGO_T_AI_03_B_LOCAL_SMOKE_REPORT.md), V2 APPROVED/lock, source `backend/src/agent/{liveProvider,decisionSchema,tools,limits}.ts`, `backend/src/services/agentService.ts` và harness. [Preflight evidence](evidence/t-ai-03-b-local-smoke-retry/preflight.json) xác nhận:

| Kiểm | Kết quả thực tế |
|---|---|
| NLU V2 | SHA-256 APPROVED `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`, khớp lock; 24 case giữ nguyên |
| Ollama | `0.40.15`; binary tại `%LOCALAPPDATA%/Programs/Ollama/ollama.exe`. Lệnh `ollama` không có trên PATH của shell hiện tại, nên kiểm bằng đường dẫn binary đầy đủ |
| Service | Socket trực tiếp `127.0.0.1:11434`, listener PID 7252; không bind `0.0.0.0` theo `netstat`; `/api/tags` trả model |
| Tag/digest local | `qwen3:4b-instruct-2507-q4_K_M`, digest API **`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`**, kích thước tag 2.497.293.803 byte |
| Model files | Manifest nằm dưới `~/.ollama/models/manifests/registry.ollama.ai/library/qwen3/…`; SHA-256 registry blob **khớp digest API**; SHA-256 model blob 2.497.280.480 byte khớp `85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9` |
| Model metadata | `qwen3`, 4.0B, `Q4_K_M`, context công bố 262.144 từ `ollama show`. Đây là metadata, chưa phải context thực tế của request |
| Network/privacy | Kiểm tags và inference qua Node HTTP socket trực tiếp tới `127.0.0.1`, không dùng proxy; không có proxy env/`OLLAMA_HOST`, tag không có `:cloud`; backend Agent LIVE toàn cục vẫn tắt |
| Hardware | Windows build 19045, i5-12400F/12 luồng logic, 15,82 GiB RAM; RTX 4060 8188 MiB VRAM, driver 560.94; snapshot preflight rảnh khoảng 6103 MiB VRAM |

Digest API là digest của registry layer trong manifest local; SHA-256 file manifest local là giá trị khác (`6214d088…`) và không được dùng thay digest tag. Model blob lớn cũng được hash toàn bộ và đối chiếu. [Readiness snapshot](evidence/t-ai-03-b-local-smoke-retry/ollama.json), [hardware](evidence/t-ai-03-b-local-smoke-retry/hardware.json) và [configuration redacted](evidence/t-ai-03-b-local-smoke-retry/configuration.json) lưu các quan sát trước request. Không đổi `.env`, không bật Agent LIVE toàn cục.

## 2. Một technical inference — PASS

[Request reservation](evidence/t-ai-03-b-local-smoke-retry/inference-request-reserved.json) được tạo bằng `wx` trước khi gửi, ngăn chạy script lần hai trong cùng evidence run. Input riêng: yêu cầu **đổi màu giao diện HuGo sang tím**, khác toàn bộ VI01–VI24; không có dữ liệu account. System prompt được lấy nguyên từ `AgentService`, schema từ `DECISION_SCHEMA` hiện hành. Request dùng `format:DECISION_SCHEMA`, `stream:false`, `temperature:0`, `num_ctx=16384`, `num_predict=2048`, HTTP trực tiếp loopback và timeout đúng **15.000 ms**. Không gọi tool, Catalog, Planner hoặc PostgreSQL.

[Response/evidence đầy đủ](evidence/t-ai-03-b-local-smoke-retry/technical-inference-result.json):

| Chỉ số | Kết quả |
|---|---:|
| Request inference | **1/1**, HTTP **200** |
| Wall latency | **4.630,6 ms**, dưới 15.000 ms; không timeout |
| Ollama `total_duration` | **4.618,8 ms** |
| Cold load `load_duration` | **4.204,0 ms** — chiếm phần lớn lần đầu |
| Prompt / output tokens | **947 / 6** |
| Prompt / output eval duration | **296,6 / 90,9 ms** |
| `done_reason` | `stop` |
| Response | `{"kind":"unsupported"}` — đúng cho yêu cầu đổi màu giao diện |
| JSON/schema | Parse JSON PASS; validator `DECISION_SCHEMA` PASS; `parseDecision()` PASS. `validateTool()` không áp dụng vì decision `unsupported` và không có tool call |
| Envelope/limits | `done=true`, assistant role, token count trong giới hạn; response 369 byte; PASS |

`ollama ps` sau request báo **`100% GPU`, context `16384`, runner `llamacpp`**, model còn nạp. GPU memory dùng từ **1906 MiB** trước lên **7009 MiB** sau (rảnh **949 MiB**); mức cao nhất được lấy mẫu trong request là 7009 MiB. RAM rảnh thấp nhất được lấy mẫu **2,57 GiB** trên tổng 15,82 GiB. Tải model lần đầu vẫn đạt dưới 15 giây trong điều kiện máy hiện tại; chỉ một mẫu, chưa đo độ ổn định khi VRAM bị chiếm thêm, nhiều lượt hoặc concurrency. Không tăng timeout để tạo PASS.

## 3. Phân loại và giới hạn bằng chứng

| Hạng mục | Trạng thái |
|---|---|
| Local service, tag/digest/blob, network và GPU readiness | **PASS** |
| Một request JSON Schema + runtime decision validator, 16k context, 15s timeout | **PASS** |
| Error/timeout response path của provider với model thật | **NOT RUN** — request duy nhất thành công; không dùng request thứ hai để gây lỗi |
| Full backend Agent Auth/Consent/Catalog/Planner/PostgreSQL E2E | **NOT RUN** |
| NLU V2 VI01–VI24 | **NOT RUN (24/24)** |

Request được tạo tương đương nhánh Ollama của provider và kiểm output qua schema/validator hiện hành, nhưng **không đi qua HTTP Agent API hoặc toàn bộ `AgentOrchestrator`**. Kết quả này xác nhận một tương tác kỹ thuật local hoạt động; không đo accuracy của 24 NLU case. Vẫn cần gate quyền sử dụng/riêng tư và harness V2 trước LIVE. Model còn khoảng 949 MiB VRAM trống sau tải nên có rủi ro áp lực VRAM khi máy chạy thêm tác vụ GPU. CLI thiếu PATH là điểm vận hành nhỏ; binary và service hoạt động qua đường dẫn đầy đủ.

Không phát hiện lỗi production cần sửa từ smoke này. Không sửa code, prompt, schema, timeout, model, benchmark hoặc expected. Không có DB write/fixture; cleanup không áp dụng.

## 4. Source integrity

[Baseline SHA-256](evidence/t-ai-03-b-local-smoke-retry/baseline.json) ghi **3.927 file** trước task. [Audit cuối](evidence/t-ai-03-b-local-smoke-retry/integrity-after.json) xác nhận các file baseline không đổi, gồm V2 APPROVED/lock, V1, V2 draft/candidate, Agent/Planner source và evidence cũ. Chỉ thêm harness/evidence/báo cáo task này. Không migration/reset/seed, commit/push/deploy hoặc sửa Trip, Booking, Planner, Catalog, pricing, sentiment, T13-B.

## 5. NEXT TASK PLAN — T-AI-03-B-LIVE-V2, chưa thực hiện

1. Operator/chủ dự án duyệt phạm vi 24 request LIVE, quyền sử dụng local model và môi trường test. Chỉ bật cờ cần thiết trong môi trường backend/test cho phiên LIVE; không bật global Agent ngoài phiên đã duyệt. Khóa source và xác nhận lại SHA V2 `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`, tag/digest local và headroom RAM/VRAM.
2. Tạo harness V2 riêng đọc **APPROVED/lock**, giữ nguyên criteria/expected; không dùng harness V1 hard-code. Preflight đúng `travelgo_ai_m0_test`, guard, sentinel, 12 migration checksum, fingerprint; nếu cần fixture thì ledger exact ID và cleanup đúng FK. Xác nhận sentinel VI20 không có catalog.
3. Chạy đúng VI01–VI24 bằng model thật; lưu per-case PASS/FAIL/NOT RUN, decision/arguments đã redact, lỗi/severity, latency/token và service/DB fidelity. Kiểm browser desktop 1440×900 và mobile 390×844, history multi-turn API thật, Auth/Consent, không Trip/Booking mutation. Không chỉnh expected/prompt theo model để đổi FAIL thành PASS.
4. Sau run, cleanup, fingerprint after=before, regression và source audit; báo cáo số case/metric thực tế và giới hạn của model. Dừng sau báo cáo, không push/deploy hoặc mở task khác.

**Điểm dừng task này:** technical smoke local PASS; 24 LIVE NLU chưa chạy.
