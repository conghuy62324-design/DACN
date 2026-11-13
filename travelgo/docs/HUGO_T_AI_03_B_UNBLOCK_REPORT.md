# T-AI-03-B-UNBLOCK — NLU V2 draft và Ollama local readiness

Ngày 08/11/2026 (Asia/Saigon). **Phần chuẩn bị: PASS. V2: BLOCKED chờ chủ dự án duyệt nội dung. Ollama local: BLOCKED chờ operator cài và xác thực model. LIVE_LLM/24 NLU: NOT RUN.** Không gọi model, không tải/cài model, không truy cập DB, không sửa source ứng dụng hay evidence lịch sử.

## 1. Nguồn và nguyên nhân lỗi manifest

Đã kiểm [T-AI-03-B](HUGO_T_AI_03_B_LIVE_LLM_REPORT.md), [T-AI-01-B](HUGO_T_AI_01_B_LIVE_PROVIDER_REPORT.md), [roadmap](HUGO_AI_AGENT_MVP_ROADMAP.md), manifest/lock V1, các kết quả evaluation/readiness, source evaluator và Git history. `git log --all -- docs/evidence/t-ai-01-b/nlu-manifest.json` và `git rev-list --all --objects` không tìm thấy bản manifest đã commit. Các bản `nlu-results.json` chỉ sao lại câu V1 hỏng. Báo cáo T-AI-01-B có bảng tóm tắt tiếng Việt đúng dấu cho VI01–VI24, nhưng không chứa nguyên văn đầy đủ request/history. VI15 là ngoại lệ: request không dấu trong V1 còn nguyên văn.

V1 chứa **659 dấu `?` literal** trong 24 LIVE case, không phải lỗi font lúc xem. Hash byte V1 vẫn khớp [lock V1](evidence/t-ai-01-b/nlu-manifest-lock.json): `e4369315ef9f0ded9943614438116bb897364593899e787cbc256b60f966e081`. Chữ đã bị thay mất **trước khi khóa V1**; bằng chứng hiện có không chỉ ra chính xác công cụ/bước đã thay chữ. Không tuyên bố khôi phục nguyên văn câu gốc. [V1](evidence/t-ai-01-b/nlu-manifest.json), lock và evidence cũ giữ nguyên.

## 2. V2 dự thảo, nguồn gốc và diff

[Manifest V2 dự thảo](evidence/t-ai-03-b-unblock/nlu-manifest-v2-draft.json) có đúng VI01–VI24, UTF-8 NFC, `approvalStatus=PENDING_OWNER_REVIEW`. [Provenance từng field](evidence/t-ai-03-b-unblock/nlu-v2-provenance.json) dùng ba nhãn:

- `V1_UNCHANGED`: field còn nguyên, gồm kind/tool, số, ngày, enum, tập field thiếu, toolOutcome, criteria và request không dấu VI15.
- `SUMMARY_SUPPORTED_VALUE`: tên thành phố Hà Nội/Đà Nẵng/Hội An được bảng T-AI-01-B và mảnh V1 cùng hỗ trợ; **không phải bản gốc nguyên byte**.
- `PROPOSED_RECONSTRUCTION`: câu tiếng Việt/title/history viết lại từ mảnh V1 và bảng tóm tắt; chủ dự án cần duyệt.

[Diff V1→V2 từng JSON path](evidence/t-ai-03-b-unblock/v1-v2-diff.json) ghi nguyên giá trị V1/V2 và provenance của **78 field đổi**: 56 `PROPOSED_RECONSTRUCTION`, 22 `SUMMARY_SUPPORTED_VALUE`. V2 không chứa F01–F04 vì bốn fault case `MOCK_ONLY` vẫn thuộc V1 và không tính trong 24 NLU LIVE. Không có expected nghiệp vụ mới; chỉ thay cách viết tên thành phố bị hỏng, còn mọi expected khác và toolOutcome sao từ V1.

| Case | Ý định/expected được giữ từ V1 và bảng T-AI-01-B | Nguồn câu tiếng Việt V2 |
|---|---|---|
| VI01 | search_places attraction, Đà Nẵng, 500000/người/ngày | Đề xuất; city có bảng hỗ trợ |
| VI02 | search_places hotel, Đà Nẵng, 500000/người/ngày | Đề xuất; city có bảng hỗ trợ |
| VI03 | search_places restaurant, Đà Nẵng, 500000/người/ngày | Đề xuất; city có bảng hỗ trợ |
| VI04 | plan_trip Hà Nội→Đà Nẵng, 15–17/06/2030, 2 adults, 5000000, car | Đề xuất; city có bảng hỗ trợ |
| VI05 | clarify departureCity | Đề xuất |
| VI06 | clarify startDate/endDate | Đề xuất |
| VI07 | clarify totalBudget | Đề xuất |
| VI08 | clarify transportation | Đề xuất |
| VI09 | multi-turn bổ sung departureCity, plan_trip giữ field cũ | Message/history đề xuất; expected city có bảng hỗ trợ |
| VI10 | đổi totalBudget=7000000, giữ field khác | Message/history đề xuất; expected city có bảng hỗ trợ |
| VI11 | đổi adults=3, giữ field khác | Message/history đề xuất; expected city có bảng hỗ trợ |
| VI12 | đổi endDate=2030-06-18, giữ field khác | Message/history đề xuất; expected city có bảng hỗ trợ |
| VI13 | đổi destinationCity=Hội An, giữ field khác | Message/history đề xuất; expected city có bảng hỗ trợ |
| VI14 | viết tắt có giải nghĩa, plan_trip đủ arguments | Đề xuất; city có bảng hỗ trợ |
| VI15 | request không dấu, plan_trip đủ arguments | **Request nguyên văn V1**; title đề xuất, city expected có bảng hỗ trợ |
| VI16 | “5 triệu” → totalBudget=5000000 | Đề xuất; city có bảng hỗ trợ |
| VI17 | Booking/payment → unsupported, zero tools | Đề xuất |
| VI18 | sửa Trip account khác → unsupported, zero tools | Đề xuất |
| VI19 | prompt injection mutation/giá giả → unsupported, zero tools | Message đề xuất; title V1 giữ nguyên |
| VI20 | destination thiếu catalog → plan_trip rồi `tool_unavailable` | Đề xuất; sentinel nguyên V1 |
| VI21 | clarify adults | Đề xuất |
| VI22 | clarify destinationCity | Đề xuất |
| VI23 | search thiếu budget → clarify dailyBudgetPerPerson | Đề xuất |
| VI24 | ngày thiếu năm → clarify startDate/endDate, không đoán năm | Đề xuất |

Chạy `node backend/scripts/t-ai-03-b-unblock-build-v2.cjs` rồi `node backend/scripts/t-ai-03-b-unblock-validate.cjs`: [validation](evidence/t-ai-03-b-unblock/v2-validation.json) **8/8 kiểm PASS**: V1 hash/lock, V2 JSON UTF-8/metadata, 24 ID unique, schema case, không `?`/U+FFFD trong text/expected, NFC, giữ expected ngoài tên city, provenance phủ mọi diff. V2 SHA-256 `6bc1afaae17d9ecb973aab9c6331faa7beace7b09035d8a4bbec20e4ef82f5fb` **chỉ để đối chiếu bản dự thảo hiện tại, chưa phải hash khóa chính thức**. Nội dung V2 đang **BLOCKED chờ duyệt**; không chạy LIVE_NLU trên V2 khi chưa duyệt.

## 3. Ollama và phần cứng — khảo sát read-only

[Hardware](evidence/t-ai-03-b-unblock/hardware.json): Windows x64 build 19045 (Windows 10 22H2), i5-12400F/12 logical CPUs, RAM 15,82 GiB (rảnh ~3,2 GiB lúc khảo sát), RTX 4060 8188 MiB VRAM (rảnh ~6141 MiB), NVIDIA driver 560.94; disk tại workspace rảnh ~201,54 GiB. [Ollama snapshot](evidence/t-ai-03-b-unblock/ollama.json): `ollama --version` không có trên PATH, hai đường dẫn cài phổ biến không tồn tại, thư mục model mặc định không có, `GET http://127.0.0.1:11434/api/tags` không kết nối. Không thể biết model local khác nằm ở vị trí tùy biến chưa cấu hình; hiện **không có model local được xác nhận**. WMI/CIM query bị Access denied; OS build lấy từ Node `os.release()`, GPU/driver từ `nvidia-smi`.

[Tài liệu Ollama Windows](https://docs.ollama.com/windows) yêu cầu Windows 10 22H2+ và driver NVIDIA 551.61+; thông số hiện tại qua hai ngưỡng này. Ollama vẫn cần cài thực tế và kiểm model. Ứng viên **để operator xem xét**, không phải model đã nghiệm thu: [`qwen3:4b-instruct-2507-q4_K_M`](https://ollama.com/library/qwen3%3A4b-instruct-2507-q4_K_M), 4.02B/Q4_K_M, file khoảng 2,5 GB; [tag chính thức](https://ollama.com/library/qwen3/tags) công bố context tối đa 256K. Qwen/Ollama mô tả họ model hỗ trợ đa ngôn ngữ, nhưng **khả năng hiểu 24 case tiếng Việt của ứng viên chưa được đo**. Kích thước file nhỏ hơn VRAM rảnh không chứng minh model+KV cache cùng nằm GPU hoặc chạy trong timeout 15 giây. Không có số liệu tốc độ, RAM/VRAM peak hay latency/token.

[Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs) nhận JSON schema trong `format`; đó là năng lực API, **chưa chứng minh model ứng viên trả đúng `DECISION_SCHEMA` của HuGo**. [Tài liệu context](https://docs.ollama.com/context-length) nêu context lớn tốn bộ nhớ hơn và cần dùng `ollama ps` để xem GPU/CPU split. Source HuGo cố định `num_ctx=16384`, `num_predict=2048`, `temperature=0`, timeout 15 giây. Context 16k có thể gây thiếu VRAM hoặc chậm trên máy 8 GB; đây là rủi ro cần benchmark trước 24 NLU. Không tự đổi transport/timeout trong task này.

## 4. API contract và kiểm soát chi phí/riêng tư

[Configuration snapshot chỉ có boolean](evidence/t-ai-03-b-unblock/configuration.json): provider chưa chọn, live/usage/local-only/evaluation đều false, model chưa cấu hình; không ghi giá trị secret. `backend/src/agent/liveProvider.ts` yêu cầu đồng thời `LLM_PROVIDER=ollama`, `LLM_LIVE_ENABLED=true`, `LLM_USAGE_APPROVED=true`, `OLLAMA_LOCAL_ONLY_CONFIRMED=true`, và `OLLAMA_MODEL` hợp lệ, không chứa `cloud`. `OLLAMA_BASE_URL` mặc định `http://127.0.0.1:11434`; nếu ghi rõ phải là HTTP loopback, không path/query/credential và không redirect. Provider gọi `POST /api/chat`, `stream:false`, `format:DECISION_SCHEMA`; trả lỗi nếu envelope/decision/schema/tool không đúng. `LLM_EXTERNAL_PROCESSING_APPROVED` và `GEMINI_API_KEY` không phải điều kiện của nhánh Ollama local. Không đưa key vào frontend/Git.

Harness cũ `backend/scripts/t-ai-01-b-evaluate.cjs` còn đọc **V1 hard-coded** và cần `--live` cùng `T_AI_01_B_LIVE_APPROVED=true`; **không dùng harness cũ để chấm V2**. Task LIVE kế tiếp cần harness revision riêng trỏ tới V2 đã duyệt và hash mới đã khóa, giữ assertion/criteria V1. Hiện tất cả flag vẫn false, không có inference. Chạy local model không phát sinh Gemini/Ollama cloud usage nếu operator chỉ dùng model local và loopback, nhưng máy vẫn dùng điện/disk; cần xác nhận không có suffix `:cloud`, không đăng nhập hoặc bật cloud/billing. [Ollama phân biệt local và cloud](https://ollama.com/download/windows).

## 5. Việc operator/chủ dự án cần làm trước LIVE

1. **Chủ dự án duyệt hoặc chỉnh V2:** xem toàn bộ [24 request/expected](evidence/t-ai-03-b-unblock/nlu-manifest-v2-draft.json), đặc biệt 56 field đề xuất và multi-turn VI09–VI13. Sau duyệt, tạo bản immutable/hash lock mới trong task LIVE; không chỉnh expected sau khi xem output model. Nếu chưa đủ căn cứ nội dung, giữ `BLOCKED`.
2. **Operator cài Ollama từ [trang Windows chính thức](https://ollama.com/download/windows)** theo [hướng dẫn Windows](https://docs.ollama.com/windows), xác nhận `ollama --version`, `GET /api/tags` ở loopback và đường dẫn model/dung lượng. Chưa thực hiện các bước này trong task.
3. **Operator phê duyệt tag local cụ thể** sau xem model/license và dung lượng; khi được phép mới chạy `ollama pull qwen3:4b-instruct-2507-q4_K_M` (chỉ là lệnh dự kiến, **chưa chạy**). Kiểm `ollama list`/`api/tags`, không dùng `:cloud`, không cấu hình URL ngoài loopback. Trước 24 case, thử tương thích schema/`done_reason`, tải 16k context, GPU split (`ollama ps`), RAM/VRAM và latency với giới hạn 15 giây; đây là inference trong task sau, cần duyệt riêng.
4. **Duyệt quyền LIVE và môi trường:** `LLM_USAGE_APPROVED`, `OLLAMA_LOCAL_ONLY_CONFIRMED`, `LLM_LIVE_ENABLED`, `T_AI_01_B_LIVE_APPROVED`; chỉ đặt trong môi trường backend/test sau khi model và manifest đạt gate. Bảo toàn notice/consent/auth hiện có; nếu có DB fixture thì exact `travelgo_ai_m0_test`, sentinel, 12 checksum, fingerprint, ledger/cleanup theo quy trình cũ.

## 6. Source integrity và giới hạn

[Baseline SHA-256](evidence/t-ai-03-b-unblock/baseline.json) ghi 3.879 file trước khi dựng V2. [Audit cuối](evidence/t-ai-03-b-unblock/integrity-after.json) xác nhận các file baseline không đổi; chỉ thêm script/evidence/báo cáo task này. V1/lock trùng hash lịch sử, source Agent/Planner/Auth/Consent/Trip/Booking không đổi. Script mới chỉ dựng draft, validate và khảo sát read-only. Không sửa schema/migration, không truy cập PostgreSQL hay tạo fixture; cleanup không cần, writes=0. Không cài/tải Ollama, không Gemini/billing, không commit/push/deploy. Map P2/T13-B và các lỗi task khác giữ nguyên trạng thái trước đó.

## 7. NEXT TASK PLAN — chỉ thực hiện sau khi duyệt

**T-AI-03-B-LIVE-V2** (dependency: V2 content được chủ dự án duyệt; operator đã cài Ollama và model local cụ thể; schema/16k context/timeout khả thi; bốn flag LIVE được duyệt). Khóa bản V2 và hash, tạo evaluator revision riêng đọc đúng V2, giữ nguyên expected/criteria và F01–F04 tách `MOCK_ONLY`. Preflight model/port/local-only và DB test guard/sentinel/12 checksum/fingerprint; nếu cần fixture thì ledger và cleanup exact ID. Chạy đúng VI01–VI24 với model thật, lưu decision/arguments đã redact, expected vs actual, tool/service/DB provenance, latency/token/VRAM, PASS/FAIL/NOT RUN theo từng case, không sửa expected theo output. Chạy browser desktop 1440×900/mobile 390×844 qua Auth/Agent/Catalog/Planner/PostgreSQL thật khi fixture sẵn sàng; kiểm riêng privacy/consent/error. Cleanup, fingerprint compare, regression và source audit. Dừng sau báo cáo LIVE; không Trip/Booking mutation, T13-B, Map hay deploy.

**Điểm dừng hiện tại:** V2 là bản dự thảo để chủ dự án duyệt. Không có kết quả NLU/model thật để nghiệm thu AI LIVE.
