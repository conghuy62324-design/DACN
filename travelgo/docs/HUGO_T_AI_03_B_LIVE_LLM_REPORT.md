# T-AI-03-B — Live LLM Readiness & Vietnamese Agent E2E Evaluation

Ngày 08/11/2026 (Asia/Saigon). **LIVE_LLM: NOT RUN. 24/24 NLU case: NOT RUN. Browser LIVE: 0 execution.** Đã hoàn thành kiểm tra readiness read-only, bảo toàn manifest khóa, build/regression và T-AI-03-A integration regression. Không có provider/model thực sự được cấu hình; manifest NLU khóa bị mất chữ tiếng Việt. Không coi regression mock là bằng chứng LLM hiểu tiếng Việt.

## 1. Baseline, source và provider readiness

Đã đối chiếu T-AI-01, T-AI-01-B, T-AI-02, T-AI-03-A, roadmap và source `backend/src/agent/{liveProvider,provider,decisionSchema,conversation,tools}.ts`, `backend/src/services/agentService.ts`, API Auth/Agent và Chat UI. Không sửa source ứng dụng, prompt, transport, Planner, pricing/ranking/sentiment hay acceptance cũ. File mới chỉ gồm `backend/scripts/t-ai-03-b-{integrity,readiness,checks}.cjs`, báo cáo và evidence T-AI-03-B.

[Configuration snapshot đã redacted](evidence/t-ai-03-b/readiness-20261108T111253390Z/configuration.json): `LLM_PROVIDER` chưa chọn; `LLM_LIVE_ENABLED`, `LLM_USAGE_APPROVED`, `LLM_EXTERNAL_PROCESSING_APPROVED`, `OLLAMA_LOCAL_ONLY_CONFIRMED` và evaluation approval đều false. Không có Gemini key/model hoặc Ollama model được cấu hình; factory `createConfiguredProvider()` trả `configured=false`. Snapshot chỉ lưu boolean/presence, không đọc ra nội dung API key/JWT/URL riêng. Runtime production vì vậy tiếp tục trả 503 khi gọi Agent; không có mock fallback.

[Hardware snapshot](evidence/t-ai-03-b/readiness-20261108T111253390Z/hardware.json): Windows x64, i5-12400F/12 logical CPU, RAM tổng 15,8 GiB, RAM rảnh 3,5 GiB tại thời điểm khảo sát; NVIDIA RTX 4060 khoảng 8 GiB VRAM (khoảng 6,1 GiB rảnh). Có GPU nhưng chưa chứng minh model cụ thể chạy được hay hỗ trợ structured JSON. `ollama` không có trên PATH, không thấy thư mục model mặc định; [loopback `/api/tags`](evidence/t-ai-03-b/readiness-20261108T111253390Z/ollama-local.json) tại `127.0.0.1:11434` không kết nối được. Không cài Ollama, tải model, đăng ký Gemini, tạo key, bật billing hay gọi inference. Transport source hỗ trợ Gemini/Ollama và JSON schema; kiểm thử transport mock chỉ xác nhận contract của code, **chưa xác nhận một model thật chấp nhận schema**. Do thiếu model và quyền sử dụng, latency/token/cost thực: **NOT MEASURED**.

## 2. Integrity của bộ 24 NLU case khóa

Đã đọc nguyên byte [manifest gốc](evidence/t-ai-01-b/nlu-manifest.json) và [lock gốc](evidence/t-ai-01-b/nlu-manifest-lock.json), không chỉnh sửa. SHA-256 vẫn khớp: `e4369315ef9f0ded9943614438116bb897364593899e787cbc256b60f966e081`. Manifest có 24 `LIVE_LLM` case VI01–VI24 và 4 fault case `MOCK_ONLY` F01–F04.

[Audit nội dung](evidence/t-ai-03-b/readiness-20261108T111253390Z/manifest-audit.json) phát hiện **659 dấu `?` literal** trong title/request/expected của 24 LIVE case; cả VI01–VI24 đều bị ảnh hưởng. Ví dụ VI01 được khóa thành `T?m ?i?m tham quan ? ?? N?ng...` và expected city `?? N?ng`. Đây là nội dung đã mất ký tự, không phải lỗi hiển thị Unicode hay hash lệch. Chạy model với bản này sẽ không đánh giá trung thực khả năng hiểu tiếng Việt. Báo cáo T-AI-01-B có bảng tóm tắt tiếng Việt đúng dấu, nhưng không đủ để khôi phục chính xác toàn bộ request/expected đã khóa. **Không tự sửa manifest, expected hoặc hash để tạo PASS.** Cần bản manifest revision mới được chủ sở hữu duyệt; bản gốc và evidence lịch sử phải giữ nguyên.

## 3. Kết quả NLU, browser và tool fidelity

[Per-case results](evidence/t-ai-03-b/readiness-20261108T111253390Z/nlu-results.json) ghi rõ:

| Nhóm | IDs | PASS | FAIL | NOT RUN | Lý do |
|---|---|---:|---:|---:|---|
| NLU tiếng Việt LIVE | VI01–VI24 | 0 | 0 | **24** | Không có provider/model/approval; manifest khóa bị mất chữ tiếng Việt. |
| Fault cases mock riêng | F01–F04 | 0 | 0 | **4 trong task này** | Không tính vào NLU; transport/foundation regression cũ chạy riêng. |
| Edge desktop LIVE 1440×900 | Chưa mở | 0 | 0 | **NOT RUN** | Không gọi LLM thật. |
| Edge mobile LIVE 390×844 | Chưa mở | 0 | 0 | **NOT RUN** | Không gọi LLM thật. |

Tool selection, argument extraction, missing-field handling, multi-turn consistency, unauthorized action rejection và tool-result fidelity với **LIVE_LLM đều NOT RUN**; không có mẫu số để tính accuracy. Không có decision/arguments LIVE để redact, không có kết quả Catalog/Planner LIVE để đối chiếu. T-AI-03-A regression ở mục 5 kiểm luồng thật chỉ với scripted decision (`PROVIDER_MOCK_ONLY`), không được cộng vào 24 case NLU.

## 4. Privacy, security và database safety

Không có request tới Gemini/Ollama model, không gửi hội thoại ra ngoài, không bật provider, không cấp consent tự động. Code hiện hành vẫn yêu cầu authenticated `GET /api/agent/privacy`, version consent đúng request đối với Gemini, allowlist một tool đọc mỗi lượt, chặn Trip/Booking mutation; các kiểm tra này là source/regression mock, **chưa phải security acceptance với LIVE_LLM**. Không có API key hoặc thông tin account riêng trong evidence readiness.

[DB preflight read-only](evidence/t-ai-03-b/readiness-20261108T111253390Z/db-preflight.json) xác nhận exact `travelgo_ai_m0_test`, sentinel hợp lệ, 12 migration checksum khớp, `default_transaction_read_only=on`. [Ledger](evidence/t-ai-03-b/readiness-20261108T111253390Z/ledger.json): writes=0, không fixture, residual=0, cleanup không cần. [Fingerprint before](evidence/t-ai-03-b/readiness-20261108T111253390Z/before.json) và [after](evidence/t-ai-03-b/readiness-20261108T111253390Z/after.json) so [PASS 25/25 bảng, changed=[]](evidence/t-ai-03-b/readiness-20261108T111253390Z/fingerprint-compare-compare.log). Không reset/seed/truncate/migration/xóa volume.

## 5. Build và regression

[Offline checks](evidence/t-ai-03-b/checks-20261108T111330558Z/results.json) đều PASS: backend/frontend build; Agent Foundation **22/22**; Transport **19/19**; Chat UI unit **10/10**; Planner validation/cost **50/50**; Planner Modes **17/17**; Recommendation **8/8**. Child regression buộc `LLM_LIVE_ENABLED=false`, `ALLOW_TEST_DB_WRITES=false`.

T-AI-03-A integration regression cũng chạy lại đúng guard/opt-in test DB và provider scripted: [30/30 browser PASS](evidence/t-ai-03-a/run-20261108T111400876Z-7c298b8d/results.json), [ledger cleanup PASS, residual users/roles/places=0](evidence/t-ai-03-a/run-20261108T111400876Z-7c298b8d/ledger.json), [fingerprint 25/25 trùng](evidence/t-ai-03-a/run-20261108T111400876Z-7c298b8d/fingerprint-compare-compare.log). Đây là `PROVIDER_MOCK_ONLY + REAL_BACKEND + REAL_POSTGRESQL`, không phải LIVE_LLM và không tăng số case NLU.

## 6. Source integrity và lỗi OPEN

[SHA-256 baseline](evidence/t-ai-03-b/baseline.json) gồm 3.775 file trước task. [Audit cuối](evidence/t-ai-03-b/integrity-after.json) xác nhận không file baseline nào đổi hash, bao gồm source ứng dụng, manifest/lock NLU, evidence T-AI-01 đến T-AI-03-A và `backend/src/scripts/seedAttractions.ts`. Chỉ thêm harness/report/evidence T-AI-03-B và một thư mục run regression T-AI-03-A; không commit/push/deploy.

| ID | Severity | Trạng thái | Ảnh hưởng / xử lý |
|---|---|---|---|
| TAI03B-BLOCK-01 | P1 evaluation integrity | OPEN | Manifest khóa VI01–VI24 chứa 659 dấu `?` literal. Cần phục hồi nội dung từ nguồn gốc đáng tin cậy hoặc lập revision mới được duyệt; giữ hash/bản cũ, không chấm LIVE trên bản hỏng. |
| TAI03B-BLOCK-02 | P1 operational | OPEN | Chưa chọn provider/model, thiếu usage/privacy/local approval và credential/model. Ollama không cài/không phục vụ local. Cần operator quyết định và cấp điều kiện sử dụng, không tự bật dịch vụ. |
| Existing Map P2 / Ticket label / T13-B còn 28 CORE | Theo báo cáo trước | OPEN / NOT RUN | Ngoài phạm vi; không sửa hoặc tính vào Agent acceptance. |

**Kết luận:** Không thể công bố LIVE_LLM PASS hay FAIL. Task T-AI-03-B hoàn tất phần readiness/offline được phép và dừng ở **LIVE_LLM NOT RUN**. Browser live, NLU accuracy, provider latency/token/cost, privacy/security với model thật cần một run mới sau khi hai blocker được xử lý.

## 7. NEXT TASK PLAN — có thể copy trực tiếp, chưa thực hiện

```text
# TASK T-AI-03-B-UNBLOCK — Phục hồi NLU manifest và chuẩn bị provider LIVE

Bối cảnh: T-AI-03-B readiness PASS ở phần offline; 24 LIVE NLU case và browser LIVE NOT RUN. Manifest gốc SHA-256 e4369315ef9f0ded9943614438116bb897364593899e787cbc256b60f966e081 có 659 dấu ? literal; provider/model và approval chưa có.

Dependency cần chủ dự án/operator quyết định:
1. Cung cấp nguồn đáng tin cậy cho 24 câu/expected tiếng Việt hoặc duyệt bản revision mới. Giữ nguyên manifest/lock/evidence gốc; tạo file version mới, diff từng VI01–VI24, khóa hash trước khi chạy. Không sửa expected sau khi xem output model.
2. Chọn Ollama local hoặc Gemini. Nếu Ollama: operator cài daemon/model hợp lệ, xác nhận local-only, kiểm model hỗ trợ structured JSON và quota phần cứng. Nếu Gemini: operator cấp model/key backend-only, quyền sử dụng, hạn mức chi phí và phê duyệt xử lý dữ liệu bên ngoài; không ghi key vào repo/evidence.
3. Phê duyệt flag LIVE, giới hạn số request/chi phí, notice/consent và môi trường test. Không tự đăng ký dịch vụ, tải model lớn hoặc bật billing.

Sau khi dependency hoàn tất:
1. Preflight provider/model, manifest revision/hash, exact travelgo_ai_m0_test, sentinel, 12 checksum, fingerprint before. Nếu cần account/catalog fixture thì opt-in ghi DB riêng, ledger UUID/owner và cleanup exact ID/FK.
2. Chạy đúng 24 NLU case với LLM thật; so decision kind/tool, arguments, missing fields, multi-turn, unauthorized rejection, tool fidelity theo expected đã khóa. F01–F04 là fault MOCK_ONLY riêng, không cộng vào NLU.
3. Chạy Edge desktop 1440×900/mobile 390×844: React Chat UI → Auth/Agent API thật → LIVE LLM → Catalog/Planner thật → PostgreSQL test. Không mock API/provider/service trong nhóm LIVE. Kiểm consent, 429/timeout/error, không Trip/Booking mutation.
4. Lưu decision/arguments đã redact, HTTP status, DB/service projections, latency/token/cost nếu provider trả số liệu thực. Case FAIL giữ expected/evidence/severity, không sửa prompt/algorithm trong cùng lần đánh giá để đổi thành PASS.
5. Cleanup residual=0, fingerprint after=before; chạy build, Foundation/Transport/Chat UI/Planner/Recommendation và integration regression; audit source.

Đầu ra: báo cáo LIVE riêng, PASS/FAIL/NOT RUN của 24 case và từng browser execution, mẫu số metrics, lỗi còn mở, chi phí thực, kết luận có thể nghiệm thu LIVE_LLM hay chưa.

Điểm dừng: sau báo cáo; không triển khai Trip/Booking mutation, T13-B, Map/Ticket FIX, commit, push hoặc deploy.
```
