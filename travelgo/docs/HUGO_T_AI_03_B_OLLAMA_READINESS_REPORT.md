# T-AI-03-B-V2-LOCK & OLLAMA READINESS

Ngày 08/11/2026 (Asia/Saigon). **NLU V2 benchmark: APPROVED_LOCKED. Ollama local/model: NOT READY. JSON Schema/latency và LIVE_LLM: NOT RUN.** Đã thực hiện quyết định phê duyệt nội dung 24 case của chủ dự án. V2 là **benchmark biên soạn lại**, không phải khôi phục nguyên văn V1. Không chạy model, API Agent hoặc PostgreSQL; không cài/tải Ollama.

## 1. Khóa NLU V2 chính thức

Hash candidate được duyệt khớp chính xác `5f5a037239a5ddc7bee7b9c3a7f918c404b9a350a142698ed2d79a2ae553f33c`. Đã tạo riêng [manifest APPROVED](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json), [lock V2](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json) và [quyết định phê duyệt](evidence/t-ai-03-b-v2-lock/approval-decision.json). Manifest APPROVED chỉ đổi metadata `version` thành `T_AI_03_B_VI_V2_APPROVED` và `approvalStatus` thành `APPROVED`; **criteria và toàn bộ request/history/expected/toolOutcome của 24 case giữ nguyên byte JSON so với candidate**. Quyết định ghi rõ nguồn là chỉ đạo chủ dự án ở task này và phân loại `RECONSTRUCTED_BENCHMARK_NOT_VERBATIM_V1`.

| Artifact | SHA-256 |
|---|---|
| V1 manifest lịch sử | `e4369315ef9f0ded9943614438116bb897364593899e787cbc256b60f966e081` |
| [V2 candidate lịch sử](evidence/t-ai-03-b-v2-finalize/nlu-manifest-v2-candidate.json) | `5f5a037239a5ddc7bee7b9c3a7f918c404b9a350a142698ed2d79a2ae553f33c` |
| [V2 APPROVED](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json) | **`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`** |

Lock chứa SHA-256 của manifest APPROVED, candidate, provenance, quyết định và V1 nguồn; bản approved/lock/decision được đặt thuộc tính **read-only** trên Windows để tránh sửa nhầm. Thuộc tính này không phải chữ ký số hay bảo vệ chống người có quyền ghi; **hash và lock là cơ chế phát hiện thay đổi**. Không sửa V1, V1 lock, V2 draft, V2 candidate hoặc evidence cũ.

[Lock validation](evidence/t-ai-03-b-v2-lock/lock-validation.json): **8/8 PASS** — hash lịch sử/approval/lock; nội dung APPROVED = candidate ngoài đúng hai metadata; đủ VI01–VI24 unique `LIVE_LLM`; 0 request trùng; JSON strict UTF-8/NFC, không dấu thay thế; request/history qua `readConversation()`, expected qua `parseDecision()`/`validateTool()` hiện hành; provenance phủ từng field và VI16 còn nhãn `PROPOSED_RECONSTRUCTION`; ba file khóa read-only. Phân bố expected: 13 tool, 8 clarify, 3 unsupported. F01–F04 `MOCK_ONLY` vẫn tách khỏi 24 case LIVE.

## 2. Máy Windows và Ollama local — read-only

[Hardware snapshot](evidence/t-ai-03-b-v2-lock/hardware.json): Windows x64 build 19045 (Windows 10 22H2), i5-12400F/12 luồng logic, RAM 15,82 GiB (rảnh **3,46 GiB** lúc khảo sát), NVIDIA GeForce RTX 4060 **8188 MiB VRAM** (rảnh **5959 MiB**), driver **560.94**, dung lượng trống tại workspace ~201,45 GiB. CPU/GPU được nhận diện; RAM/VRAM rảnh là số đo nhất thời, chưa chứng minh model chạy được ở context 16k. Máy đạt ngưỡng Windows 10 22H2 và driver NVIDIA 551.61+ mà [Ollama công bố cho Windows](https://docs.ollama.com/windows).

[Ollama snapshot](evidence/t-ai-03-b-v2-lock/ollama.json): `ollama --version` không tìm thấy trên PATH; hai đường dẫn cài phổ biến và thư mục model mặc định không thấy; **kết nối trực tiếp không qua proxy** tới `127.0.0.1:11434/api/tags` thất bại. Không có tag/digest local để xác minh model. Đây là kết quả kiểm vị trí/cổng thông dụng, không chứng minh tuyệt đối rằng máy không có bản cài ở một đường dẫn tùy biến. [Configuration snapshot chỉ ghi boolean](evidence/t-ai-03-b-v2-lock/configuration.json): `LLM_PROVIDER` chưa chọn, `OLLAMA_MODEL` chưa cấu hình, các cờ LIVE/usage/local-only/evaluation đều false; không có proxy env trong process khảo sát. Không ghi secret hoặc URL tùy biến vào evidence.

Tag được đề cử [`qwen3:4b-instruct-2507-q4_K_M`](https://ollama.com/library/qwen3:4b-instruct-2507-q4_K_M) là model **ứng viên**, chưa phải model đã cài/đã chạy trên máy. [Danh sách tag Ollama](https://ollama.com/library/qwen3/tags) công bố 4B Q4_K_M ~2,5 GB, context lý thuyết 256K. File model nhỏ hơn VRAM rảnh không chứng minh model+KV cache ở GPU, đáp ứng timeout hay chất lượng NLU tiếng Việt. Không dùng tag `:cloud`; source HuGo cũng từ chối tên model chứa `cloud` và chỉ chấp nhận URL HTTP loopback.

## 3. JSON Schema, context và latency

**JSON Schema với model ứng viên: NOT RUN. Latency/token, GPU/CPU split, RAM/VRAM peak: NOT MEASURED.** Vì Ollama và tag local chưa sẵn sàng, không gửi input kỹ thuật thử nghiệm và không mở 24 case. [Ollama có API structured outputs](https://docs.ollama.com/capabilities/structured-outputs) qua `format` JSON Schema, nhưng tài liệu API không chứng minh tag cụ thể đáp ứng `DECISION_SCHEMA` của HuGo. Source hiện tại gửi `stream:false`, `format:DECISION_SCHEMA`, `temperature:0`, `num_predict=2048`, `num_ctx=16384`; provider/orchestrator giới hạn khoảng **15 giây** và kiểm envelope, token count, JSON decision và tool arguments. [Ollama lưu ý context lớn tốn thêm bộ nhớ và cho kiểm GPU/CPU split bằng `ollama ps`](https://docs.ollama.com/context-length). Đặc biệt 16k context lớn hơn mặc định 4k mà tài liệu nêu cho VRAM dưới 24 GiB; khả năng vận hành trên RTX 4060 8 GB phải được đo sau khi operator chuẩn bị model.

Không chỉnh production timeout/context, prompt, expected hoặc schema để che một kết quả chưa đo. Nếu thử kỹ thuật sau này không đạt 15 giây/16k, báo blocker và đề xuất lựa chọn kỹ thuật để chủ dự án duyệt riêng.

## 4. Blocker và checklist operator

| Gate | Hiện trạng | Điều kiện để mở |
|---|---|---|
| Ollama Windows/service | BLOCKED: command và loopback service không có | Operator cài từ [nguồn chính thức](https://ollama.com/download/windows), xác nhận `ollama --version`, `GET http://127.0.0.1:11434/api/tags` trực tiếp |
| Tag model local | BLOCKED: không có tag/digest local | Operator phê duyệt và tải đúng tag local; kiểm `ollama list`/`api/tags`, digest, dung lượng và không `:cloud` |
| JSON Schema/performance | NOT RUN | Sau khi model sẵn sàng và được phép inference: dùng **input kỹ thuật riêng**, đo schema validity, `done_reason`, latency, token, `ollama ps` GPU/CPU split, RAM/VRAM với `num_ctx=16384` và timeout 15 giây |
| Runtime LIVE flags | Chưa bật | Operator xác nhận `LLM_PROVIDER=ollama`, `OLLAMA_MODEL` đúng tag, `OLLAMA_BASE_URL` loopback (hoặc default), `OLLAMA_LOCAL_ONLY_CONFIRMED=true`, `LLM_USAGE_APPROVED=true`, `LLM_LIVE_ENABLED=true`; harness LIVE còn cần `T_AI_01_B_LIVE_APPROVED=true` |
| Test DB/data | Chưa truy cập trong task này | Trước LIVE tool/browser: exact `travelgo_ai_m0_test`, guard, sentinel, 12 migration checksum, fingerprint; ledger/cleanup nếu có fixture |

Operator cần tự chọn/cài/tải model sau khi có phê duyệt tương ứng. Không bật cloud, Gemini, billing, URL proxy hay key ở frontend/Git. Kiểm local không đủ chỉ bằng tên tag; phải có digest từ service local và thử contract/performance theo gate trên. Các cờ quyền sử dụng và local-only chưa được task này tự bật.

## 5. Source integrity và giới hạn

[Baseline](evidence/t-ai-03-b-v2-lock/baseline.json) ghi **3.903 file trước khi khóa**; [audit cuối](evidence/t-ai-03-b-v2-lock/integrity-after.json) xác nhận các file baseline không đổi, gồm V1/lock, V2 draft/candidate/provenance, source Agent/Planner và evidence lịch sử. Chỉ thêm harness/artifact/evidence/báo cáo task này. Không sửa Planner, pricing, Catalog, Booking, Trip, Map, Sentiment hay database schema; không migration, seed, reset, truncate, commit, push hoặc deploy. Không có DB write/fixture; cleanup không áp dụng.

## 6. NEXT TASK PLAN — T-AI-03-B-LIVE-V2, chưa thực hiện

**Dependency bắt buộc:** operator cài Ollama và tag local đã phê duyệt; xác minh service/digest/loopback, quyền sử dụng và riêng tư; benchmark V2 APPROVED hash `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e` khớp lock. Không dùng evaluator V1 hard-code nguyên trạng.

1. Tạo harness LIVE V2 riêng đọc approved manifest/lock; giữ exact expected/criteria, tách F01–F04 `MOCK_ONLY`. Trước NLU chạy một input kỹ thuật không thuộc VI01–VI24 để kiểm JSON Schema, 16k context, latency ≤15 giây, token/done fields và GPU/CPU split/RAM/VRAM. Nếu fail, dừng trước 24 case, giữ evidence và báo blocker; không sửa production contract trong cùng task.
2. Khi gate kỹ thuật PASS và được operator cho phép, preflight `travelgo_ai_m0_test`, guard/sentinel/12 checksum/fingerprint; xác nhận sentinel VI20 không có catalog. Fixture nếu cần phải có ledger exact ID, cleanup đúng FK và fingerprint after=before.
3. Chạy đúng VI01–VI24 với model thật qua Auth/Agent API → Catalog/Planner → PostgreSQL thật; ghi per-case PASS/FAIL/NOT RUN, decision/arguments đã redact, provenance tool, latency/token/resources. Kiểm multi-turn bằng history API thật; browser desktop 1440×900 và mobile 390×844 theo acceptance. Không sửa expected/prompt theo output để đổi FAIL thành PASS.
4. Chạy regression liên quan, cleanup, fingerprint và source audit; báo cáo đầy đủ giới hạn model và kết luận LIVE. Dừng sau báo cáo, không mở Trip/Booking mutation hoặc task khác.

**Điểm dừng task này:** V2 đã khóa chính thức; Ollama/model chưa ready nên không chạy thử JSON Schema, performance hay 24 LIVE NLU. Không tuyên bố LIVE_LLM PASS.
