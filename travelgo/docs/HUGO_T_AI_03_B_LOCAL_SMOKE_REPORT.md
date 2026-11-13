# T-AI-03-B-LOCAL-SMOKE — Ollama trước LIVE NLU

Ngày 08/11/2026 (Asia/Saigon). **Kết quả: BLOCKED ở readiness; technical inference smoke NOT RUN; VI01–VI24 LIVE NLU NOT RUN.** Không cài/tải Ollama, không bật provider, không gọi inference, Agent API hoặc PostgreSQL. Task dừng ở gate A vì không có local service/model đã xác minh.

## 1. Benchmark và contract đã đối chiếu

Đã đọc [báo cáo readiness trước](HUGO_T_AI_03_B_OLLAMA_READINESS_REPORT.md), [V2 APPROVED](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-approved.json), [lock V2](evidence/t-ai-03-b-v2-lock/nlu-manifest-v2-lock.json), `backend/src/agent/{liveProvider,decisionSchema,tools,limits}.ts`, `backend/src/services/agentService.ts` và harness `backend/scripts/t-ai-01-b-evaluate.cjs`. [Status evidence](evidence/t-ai-03-b-local-smoke/smoke-status.json) xác nhận SHA-256 APPROVED vẫn là **`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`**, khớp lock, `approvalStatus=APPROVED`, 24 ID và 24 request unique. Không đọc hoặc gửi nội dung VI01–VI24 tới model.

Source hiện hành gửi Ollama `POST /api/chat` trên HTTP loopback, `format:DECISION_SCHEMA`, `stream:false`, `temperature:0`, `num_ctx=16384`, `num_predict=2048`; timeout provider/orchestrator là **15 giây**. `parseDecision()` và `validateTool()` là validator runtime; response không hợp lệ bị từ chối. Factory yêu cầu `LLM_PROVIDER=ollama`, `LLM_LIVE_ENABLED=true`, `LLM_USAGE_APPROVED=true`, `OLLAMA_LOCAL_ONLY_CONFIRMED=true`, model hợp lệ không chứa `cloud`, URL loopback. Harness LIVE cũ còn hard-code V1 và yêu cầu `T_AI_01_B_LIVE_APPROVED=true`; không dùng nó để chấm V2.

## 2. Readiness thực tế

| Hạng mục | Evidence mới | Kết quả |
|---|---|---|
| Service `127.0.0.1:11434` | [Ollama snapshot](evidence/t-ai-03-b-local-smoke/ollama.json): HTTP socket trực tiếp tới `/api/tags`, không qua proxy | **BLOCKED:** không kết nối được |
| Ollama binary/process | `ollama --version`, PATH, hai đường dẫn cài thông dụng, process Ollama | **BLOCKED:** không thấy binary/process tại các vị trí đã kiểm |
| Model `qwen3:4b-instruct-2507-q4_K_M` | `/api/tags` không khả dụng; thư mục model mặc định không thấy | **BLOCKED:** tag/digest/size local **NOT VERIFIED**, digest=`null` |
| Local/cloud/proxy | Probe dùng socket `127.0.0.1`, không proxy; [config redacted](evidence/t-ai-03-b-local-smoke/configuration.json) có `OLLAMA_BASE_URL` default loopback hợp lệ, proxy env không có | **Probe local PASS**; **model/daemon local thực tế NOT VERIFIED** vì service vắng mặt; không gọi cloud |
| Backend provider config | Đọc process env và `backend/.env` dưới dạng boolean, không xuất secret | `LLM_PROVIDER=null`, model chưa cấu hình, LIVE/usage/local-only/evaluation đều `false`; factory hiện disabled |
| CPU/RAM/GPU/driver | [Hardware snapshot](evidence/t-ai-03-b-local-smoke/hardware.json) | i5-12400F/12 logical CPU; RAM 15,82 GiB, rảnh **3,84 GiB**; RTX 4060 8188 MiB VRAM, rảnh **6062 MiB**; driver **560.94**; Windows build 19045 |

Số RAM/VRAM rảnh là ảnh chụp tức thời. Windows 10 22H2 và driver 560.94 đạt mức yêu cầu Windows/NVIDIA mà [Ollama công bố](https://docs.ollama.com/windows), nhưng **khả năng model+KV cache chạy trong VRAM/15 giây chưa được đo**. Trang [tag model chính thức](https://ollama.com/library/qwen3:4b-instruct-2507-q4_K_M) xác nhận tag ứng viên tồn tại trong registry; điều đó **không chứng minh tag đã tải trên máy**. Không có digest local để đối chiếu registry.

## 3. Technical smoke và kết quả

| Kiểm | Trạng thái | Lý do |
|---|---|---|
| Input kỹ thuật riêng, không thuộc VI01–VI24 | NOT RUN | Service/model local chưa sẵn sàng và chưa có phê duyệt operator cho inference |
| JSON theo `DECISION_SCHEMA` và runtime validator | NOT RUN | Không có response model; tài liệu [Ollama structured outputs](https://docs.ollama.com/capabilities/structured-outputs) chỉ mô tả API, không phải kết quả của tag local |
| Latency, prompt/output token | NOT MEASURED | Không gọi model |
| GPU/CPU split, RAM/VRAM peak | NOT MEASURED | Không có model được nạp; `ollama ps` chưa khả dụng |
| `num_ctx=16384`, `num_predict=2048`, timeout 15 giây | NOT RUN | Đây là source contract hiện tại, chưa benchmark được |
| Provider lỗi/timeout runtime | NOT RUN | Source có nhánh timeout, malformed JSON, network/quota; task này không tạo fault response hoặc thay config để kích hoạt |
| 24 LIVE NLU V2 | **NOT RUN (24/24)** | Không mở benchmark trong smoke |

Không có PASS/FAIL về khả năng hiểu tiếng Việt của model hoặc độ tương thích schema. Không dùng output giả/mock để thay cho inference. Không đổi timeout, schema, prompt, expected hay production config.

## 4. Blocker và checklist operator

**Blocker chính:** Ollama service và model local chưa xác minh. Thao tác cần operator thực hiện ngoài task này:

1. Cài Ollama Windows từ [nguồn chính thức](https://ollama.com/download/windows), mở service; xác nhận `ollama --version` và `GET http://127.0.0.1:11434/api/tags` có phản hồi local. Nếu cài ở vị trí tùy biến, cung cấp đường dẫn/PATH cho đợt kiểm sau.
2. Sau khi phê duyệt tải model, cài đúng tag `qwen3:4b-instruct-2507-q4_K_M`; kiểm `ollama list`/`/api/tags`, ghi **digest local thực tế**, dung lượng và xác nhận không dùng `:cloud` hoặc URL ngoài loopback. Không tải model trong task này.
3. Operator phê duyệt **một lần inference smoke kỹ thuật**, phạm vi input không thuộc VI01–VI24, và xác nhận quyền sử dụng/local-only. Sau đó mới kiểm JSON Schema, validator, `done_reason`, latency/token, `ollama ps` GPU/CPU split, RAM/VRAM với đúng `num_ctx=16384`, `num_predict=2048`, timeout 15 giây.
4. Nếu smoke kỹ thuật FAIL vì schema/timeout/context, lưu response đã redact, số đo và lỗi; đề xuất FIX/đổi cấu hình qua quyết định riêng. **Không tự sửa contract production hoặc expected V2** để tạo PASS.

Các cờ runtime LIVE đang false. Chưa cần bật `T_AI_01_B_LIVE_APPROVED` hay chạy DB; chúng chỉ thuộc gate LIVE sau smoke. Khi mở LIVE sau này, phải dùng `travelgo_ai_m0_test`, guard, sentinel, 12 migration checksum, fingerprint, ledger/cleanup nếu có fixture.

## 5. Source integrity và NEXT TASK PLAN

[Baseline](evidence/t-ai-03-b-local-smoke/baseline.json) gồm **3.917 file** trước task; [audit cuối](evidence/t-ai-03-b-local-smoke/integrity-after.json) xác nhận file baseline không đổi, gồm V2 APPROVED/lock, V1, V2 draft/candidate, source Agent và evidence lịch sử. Script mới chỉ khảo sát loopback/hardware/config và ghi status; không sửa source ứng dụng hay database. Không migration/reset/seed, commit, push hoặc deploy.

**NEXT TASK — T-AI-03-B-LOCAL-SMOKE-RETRY:** Sau khi operator hoàn tất checklist và phê duyệt inference kỹ thuật, xác minh lại lock V2, local tag/digest/loopback/no-proxy và cấu hình; dùng input kỹ thuật tách khỏi 24 case để chạy đúng request options của provider. Lưu JSON Schema/runtime validation, HTTP/error mapping, latency/token, GPU/CPU split và peak RAM/VRAM. Nếu quá 15 giây hoặc không giữ 16k context, dừng, báo blocker và phương án FIX cho chủ dự án; không tự thay production contract. Chỉ khi smoke PASS và các cờ quyền sử dụng/riêng tư được duyệt mới tạo harness V2 LIVE riêng, preflight test DB và chạy 24 case trong **task T-AI-03-B-LIVE-V2** tiếp theo.

**Điểm dừng:** readiness BLOCKED; technical smoke/LIVE NLU chưa chạy. Không tự triển khai task kế tiếp.
