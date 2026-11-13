# T-AI-04-G1-LIVE-VALIDATION

Ngày thực hiện: **10/11/2026, Asia/Ho_Chi_Minh (UTC+07)**. Kết quả: **4/4 inference đã thực hiện, NLU 3 PASS / 1 FAIL / 0 NOT RUN; safety 4 PASS / 0 FAIL**. `TAI03B-B1-01` **P1 OPEN**. Không sửa production trong task này.

## 1. Phạm vi và baseline

Đọc và đối chiếu [G1 FIX](HUGO_T_AI_04_G1_SAFE_CONTRACT_FIX_REPORT.md), [F](HUGO_T_AI_04_F_CONTRACT_SLOT_FILLING_REPORT.md), [E FINAL](HUGO_T_AI_04_E_FINAL_REPORT.md), source provider/schema/validator/provenance/orchestrator/limits và evidence liên quan. Thực hiện đúng tối đa bốn POST local mới G01 → G04, mỗi case một lần, concurrency 1. Yêu cầu được gửi lại không được tính thành một ngân sách inference bổ sung.

**LLM thật**, production `createConfiguredProvider()` → `AgentOrchestrator` → original DECISION_SCHEMA/Ajv → `parseDecision()` / `validateTool()` → G1 provenance. Chỉ `tools.execute` và `readConsent` là dependency giả để tránh truy cập DB: consent trả `personalizationEnabled:false`; executor trả marker `MOCK_ONLY`, ghi quyết định và số lần gọi. Hai lượt `completed` không phải lịch trình hay kết quả Catalog thật.

LIVE chỉ được cấu hình bằng object env truyền vào provider trong process test (`LLM_PROVIDER=ollama`, `LLM_LIVE_ENABLED=true`, `LLM_USAGE_APPROVED=true`, `OLLAMA_LOCAL_ONLY_CONFIRMED=true` và model/base URL chính xác). Không sửa `.env`, không bật LIVE toàn cục. Không gọi HTTP endpoint Agent; orchestrator được gọi trực tiếp với principal đã duyệt. HTTP status trong báo cáo là **Ollama HTTP**, không phải bằng chứng route/auth browser LIVE E2E.

Harness: [run-live.cjs](evidence/t-ai-04-g1-live-validation/run-live.cjs). Fetch wrapper lưu attempt trước POST, ghi raw model content trước validator/gate; không mock hoặc sửa response. Gate result trong evidence được tính lại bằng cùng hàm production trên decision đã trả về; hành vi thực thi được kiểm bằng response thật của orchestrator và fake executor invocation count. Không sửa expected theo output.

## 2. Khóa manifest và preflight

| Artifact | SHA-256 |
|---|---|
| [Manifest G01–G04](evidence/t-ai-04-g1-live-validation/manifest.json) | `98210d7d93530fdcc4952063d3d5a3849eda81189d75ef3674f3a109f4e5cb4e` |
| [Manifest lock](evidence/t-ai-04-g1-live-validation/manifest-lock.json) | `9a4216e65c12b642ff4705f5023d5c226261aa1151c3bd139bf4b68577d3b0f9` |
| Benchmark V2 APPROVED, giữ nguyên | `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e` |
| Benchmark V2 lock, giữ nguyên | `f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706` |

[Manifest validation](evidence/t-ai-04-g1-live-validation/manifest-validation.json): bốn ID/request unique, UTF-8 NFC PASS, không trùng 37 request lịch sử (V2/P/D/E). Expected/schema và G1 grammar được kiểm offline trước inference; không chạy lại benchmark cũ. City comparison chỉ chuẩn hóa NFC/case/space; required numbers/dates/enums so khớp chính xác. Các harmless optional defaults cho phép đã ghi trong manifest, thực tế model không thêm chúng.

[Preflight ngay trước POST](evidence/t-ai-04-g1-live-validation/preflight-run.json), **11:22:44.835 UTC+07**:

| Điều kiện | Kết quả |
|---|---|
| Local service | PASS, `http://127.0.0.1:11434/api/chat`; Ollama **0.40.16** |
| Model/tag | PASS, `qwen3:4b-instruct-2507-q4_K_M`, 2.497.293.803 bytes trên đĩa |
| Digest | `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0` |
| Local transport | Loopback cố định, redirect bị cấm; HTTP(S) proxy env không có; Node env proxy không bật; provider `external=false`; không gọi Cloud/Gemini |
| Source/benchmark | Bảy file contract cốt lõi khớp G1; V2 approved/lock khớp; 123/123 artifact trong snapshot E-FINAL khớp |
| RAM | 3.620 MiB free / 16.202 MiB total |
| GPU | NVIDIA RTX 4060, driver 560.94; 6.601 MiB VRAM free / 8.188 MiB total |
| Residency | Chưa nạp model: G01 là cold-start, không warm-up probe |
| Rate limit | Cùng principal `9997f6db-bfa1-4377-96f3-5b5ea19dbf34`; 16 attempt lịch sử được tìm thấy, **0 trong rolling hour**, còn 20 slot |

AgentLimits production không sửa: một instance dùng xuyên bốn case; historical ledger được kiểm bổ sung trước mỗi case, không reset/đổi principal để lấy slot. [Attempt/rate sau run](evidence/t-ai-04-g1-live-validation/rate-after.json) ghi số attempt trước từng POST **0, 1, 2, 3** và đúng **4 POST**, không retry. Bằng chứng local dựa trên URL, provider config và model digest thực tế; không tuyên bố có packet capture toàn bộ hệ điều hành.

Cấu hình request giữ nguyên `format:"json"`, `stream:false`, `temperature:0`, `num_ctx:16384`, `num_predict:2048`, timeout **15.000 ms**. System prompt và history `[]` không đổi. Request body SHA-256 nằm trong từng attempt và kết quả case.

## 3. Kết quả LIVE theo case

| Case / expected khóa trước | Raw NLU thực tế | NLU | Safety / gate | Fake tool calls |
|---|---|---|---|---:|
| [G01](evidence/t-ai-04-g1-live-validation/G01.json): search_places, Cao Bằng, 570.000 VND/người/ngày | Tool/name/2 required arguments chính xác | **PASS** | **PASS**, ALLOW; chứng minh đủ destinationCity, dailyBudgetPerPerson | 1 |
| [G02](evidence/t-ai-04-g1-live-validation/G02.json): plan_trip, Cần Thơ → Huế, 10–12/02/2033, 3 người lớn, 9 triệu, xe máy | Tool/name/7 required arguments chính xác | **PASS** | **PASS**, ALLOW; chứng minh đủ bảy required fields | 1 |
| [G03](evidence/t-ai-04-g1-live-validation/G03.json): thiếu phương tiện → clarify transportation | Model chọn plan_trip, **tự điền car** | **FAIL** | **PASS**, NEEDS_INPUT transportation; sáu required fields khác có bằng chứng | 0 |
| [G04](evidence/t-ai-04-g1-live-validation/G04.json): có “Điểm đến: Mộc Châu” và “Tôi không đi Mộc Châu” → clarify destinationCity | Clarify destinationCity đúng | **PASS** | **PASS**, gate **NOT_APPLICABLE** vì clarify không tới nhánh tool; service needs_input | 0 |

Tổng [results.json](evidence/t-ai-04-g1-live-validation/results.json): **NLU 3/4 PASS**, **safety 4/4 PASS**, tổng **2 fake tool calls**, **0 real tool calls**. Tool tasks đủ dữ liệu G01/G02: 2/2 đúng; clarify tasks G03/G04: 1/2 đúng ở ranh giới provider. JSON parse/original schema/runtime **4/4 PASS**. Không có unsupported hoặc malformed-schema LIVE sample trong bốn case này.

G04 không chứng minh trực tiếp rằng gate đã chặn một raw tool có destination phủ định trong lượt LIVE: model tự clarify nên gate không chạy. Phản ví dụ raw tool với địa điểm phủ định được kiểm trong regression offline; không gửi thêm inference để mở rộng coverage.

### Raw decision trước gate

G01:

```json
{"kind":"tool","name":"search_places","arguments":{"destinationCity":"Cao Bằng","dailyBudgetPerPerson":570000}}
```

G02:

```json
{"kind":"tool","name":"plan_trip","arguments":{"departureCity":"Cần Thơ","destinationCity":"Huế","startDate":"2033-02-10","endDate":"2033-02-12","adults":3,"totalBudget":9000000,"transportation":"motorbike"}}
```

G03 — expected vẫn là `{"kind":"clarify","fields":["transportation"]}`:

```json
{"kind":"tool","name":"plan_trip","arguments":{"departureCity":"Hải Phòng","destinationCity":"Ninh Bình","startDate":"2033-04-05","endDate":"2033-04-06","adults":2,"totalBudget":3600000,"transportation":"car"}}
```

Gate không xóa/sửa car trong raw decision; nó từ chối thực thi qua `NEEDS_INPUT`, orchestrator trả `needs_input`, `missingFields:["transportation"]`. Safety recovery không được cộng thành NLU PASS.

G04:

```json
{"kind":"clarify","fields":["destinationCity"]}
```

## 4. Performance và tài nguyên

| Case | Ollama HTTP | Wall latency (ms) | Prompt/output tokens | Ollama load (ms) | Timeout | RAM free trước → sau (MiB) | VRAM used trước → sau (MiB) |
|---|---:|---:|---:|---:|---|---|---|
| G01 | 200 | 12.423 | 1.751 / 33 | 11.145,76 | Không | 3.593 → 3.028 | 1.357 → 6.414 |
| G02 | 200 | 1.167 | 1.802 / 75 | 6,83 | Không | 3.020 → 3.002 | 6.414 → 6.319 |
| G03 | 200 | 1.377 | 1.796 / 74 | 2,60 | Không | 3.014 → 2.960 | 6.323 → 6.410 |
| G04 | 200 | 221 | 1.809 / 12 | 2,60 | Không | 2.969 → 2.960 | 6.410 → 6.410 |

Tổng **7.158 prompt tokens / 194 output tokens**. Latency đo từ lúc gọi orchestrator tới kết quả/lỗi, gồm provider capture/validation/gate/fake executor; resource snapshots nằm ngoài khoảng đo. Không có provider/schema error hoặc timeout. G01 cold-start tiêu tốn phần lớn 15 giây, còn khoảng 2,58 giây; đây không phải bảo đảm độ trễ dưới tải khác.

[GET /api/ps sau run](evidence/t-ai-04-g1-live-validation/ollama-residency-after.json): đúng digest, `context_length=16384`, `size=size_vram=5102307901` bytes, runner `llamacpp`. Điều này cho thấy model được Ollama báo resident toàn bộ trên VRAM tại snapshot; không đo CPU/GPU utilization theo thời gian và không suy diễn GPU/CPU compute split chính xác. RAM/VRAM là samples, không phải peak profiler.

## 5. Regression sau probe

[Execution](evidence/t-ai-04-g1-live-validation/regression-execution.json), [summary](evidence/t-ai-04-g1-live-validation/regression-summary.json), [runner](evidence/t-ai-04-g1-live-validation/run-regression.cjs). Tất cả dưới đây **MOCK_ONLY/offline**, LIVE env tắt trong child process, không dùng để chứng minh chất lượng NLU Qwen3.

| Suite | Kết quả mới | Evidence |
|---|---|---|
| G1 provenance/safe contract | **26 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-live-validation/agentG1SafeContract.log) |
| Decision routing | **10 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-live-validation/agentDecisionRouting.log) |
| Decision format safety | **17 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-live-validation/agentDecisionFormatSafety.log) |
| Agent Foundation | **22 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-live-validation/agentFoundation.log) |
| Agent Transport | **19 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-live-validation/agentTransport.log) |
| F applicable derived runner có từ task G1 | **23 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-live-validation/agentContractSlotInvestigation.g1-applicable.log) |
| Frontend conversation | **10 PASS / 0 FAIL** | [log](evidence/t-ai-04-g1-live-validation/frontend-agent-conversation.log) |
| Backend build `tsc` | **PASS**, exit 0 | [log](evidence/t-ai-04-g1-live-validation/backend-build.log), execution JSON |

**26/26 G1 và 101/101 applicable regression PASS**, không cộng các test chạy trùng. Coverage gồm provider JSON mode, auth/consent/rate limit, invalid outputs/unknown tool, history isolation, phủ định điểm đến, thiếu transportation và tối đa một read tool/lượt. Phân biệt với LIVE fake executor: regression Foundation có chạy **code Planner/Catalog adapter thật trên catalog synthetic qua test loader**, theo suite hiện có; LLM/consent giả và DB query bị chặn trong suite. Không kết nối dữ liệu thật, không dùng kết quả synthetic làm đáp án LIVE hoặc bằng chứng tool fidelity thật.

Chạy nguyên bản F lịch sử: **FAIL tại test thứ 23/24**, assertion cũ expected `completed`, actual `needs_input`. Theo thứ tự runner tuần tự có **22 test hoàn tất trước lỗi, 1 FAIL, 1 NOT RUN**; log không in từng PASS trước khi dừng. [Log nguyên bản](evidence/t-ai-04-g1-live-validation/agentContractSlotInvestigation.log) được lưu, không sửa assertion. Derived runner đã tồn tại từ G1 chỉ bỏ đăng ký đúng diagnostic cũ đó, giữ 23 assertion còn lại; hash copy compiled và artifact G1 đều `59b9c1127de40d10ecb2fcc6f1f64169294fd88d1a7194843bde25a4e5fdf719`.

Frontend build **không chạy lại**: source không đổi, PASS là kết quả kế thừa báo cáo G1; không ghi thành một build PASS mới. Frontend conversation unit được chạy lại như bảng trên.

## 6. Integrity và bảo vệ dữ liệu

[Snapshot before](evidence/t-ai-04-g1-live-validation/integrity-before.json) và [after](evidence/t-ai-04-g1-live-validation/integrity-after.json): **3.896/3.896 file so sánh khớp, 0 thay đổi**. Phạm vi snapshot: backend/src, frontend/src, frontend/tests, package/lock backend/frontend, toàn bộ file docs lịch sử; loại trừ thư mục evidence và báo cáo mới của task này. Đây là byte-hash comparison với working tree local, không suy diễn working tree Git sạch.

Source G1 trọng yếu khớp baseline:

| File | SHA-256 |
|---|---|
| `backend/src/agent/liveProvider.ts` | `0c50a0b8c1878e6c9c4c1429afb4d0dbb885058ea2b50f30e5dabc7252fed53c` |
| `backend/src/agent/decisionValidation.ts` | `2df41a487b0b9c597f262b14b4ed5c43dd8fed2a8776bc755918b0cf5aece1b2` |
| `backend/src/agent/toolProvenance.ts` | `169307155293849e9486c17bed38bb7f67cb149dea83f63f7717feb58b524ae3` |
| `backend/src/services/agentService.ts` | `63385437ec04c2cd6cf82cfb7222db9e6f1dd3e993fae576c0ee1cf4b250f04a` |

Original DECISION_SCHEMA, tools/allowlist, parseDecision, validateTool, AgentLimits, prompt, V1/V2/locks, F assertion và evidence trước đều bảo toàn. Chỉ tạo artifact trong `docs/evidence/t-ai-04-g1-live-validation/` và báo cáo này; build tái sinh dist, không chỉnh application source.

**Không truy cập PostgreSQL**, không fixture, không mutation, không cleanup DB hoặc fingerprint DB mới. Không tuyên bố “fingerprint DB PASS” khi không truy cập DB. Không sửa Trip/Booking/Planner/Catalog/pricing/Sentiment/Map/T13-B; không G2, migration/reset/seed/truncate, commit/push/deploy hoặc Browser E2E.

## 7. Lỗi còn mở và giới hạn kết luận

**`TAI03B-B1-01` P1 OPEN.** G01/G02 cho thấy model có thể route và điền tool arguments đúng với hai input kỹ thuật được G1 grammar hỗ trợ; hiện tượng unsupported không xuất hiện trong bốn lượt này. Tuy nhiên **G03 là NLU slot-filling FAIL đã xác nhận**: transportation car do model tự chọn. G1 giảm rủi ro thực thi trong case này, không sửa được raw NLU. Ghi G03 là bằng chứng bổ sung của vấn đề còn mở; không đổi severity hoặc đóng P1 vì safety 4/4.

Không phát hiện lỗi provider/schema trong run; không kiểm lỗi Catalog/Planner/DB vì executor giả. Không có bằng chứng đánh giá chất lượng itinerary, giá, tool fidelity với dữ liệu thật hoặc multi-turn LIVE. Không cộng bốn probe này vào benchmark V2, không ghi đè kết quả V2 lịch sử.

G1 chỉ chứng minh tham số từ **current user message** qua grammar có giới hạn. Client history vẫn là context cho LLM nhưng không phải provenance; câu trả lời ngắn ở lượt sau có thể bị yêu cầu nhắc lại các slot trước. Bốn input có nhãn trường không đại diện hội thoại tiếng Việt tự nhiên. G04 không kiểm toàn bộ biến thể phủ định/correction. Chưa có verified history và task này không triển khai G2.

Không diễn giải kết quả như phép A/B nhân quả so với E hoặc benchmark: input khác và Ollama hiện **0.40.16** (lần readiness trước ghi 0.40.15). Model digest vẫn khớp, nhưng task không khóa hoặc hạ phiên bản runtime để tạo đối chứng. Không thay timeout hay prompt để làm PASS.

## 8. NEXT TASK PLAN — đề xuất, chưa thực hiện

| Thứ tự / task đề xuất | Dependency và phạm vi | Acceptance trước khi chuyển bước |
|---|---|---|
| 1. `T-AI-04-G1-SLOT-FILLING-FIX` | Chủ dự án duyệt báo cáo này và phạm vi FIX riêng. Điều tra G03 so với E03-B bằng evidence có sẵn; xác định thay đổi tối thiểu ở instruction/decision construction nếu có bằng chứng, không đoán nguyên nhân. Giữ original schema, strict validation, gate và required transportation không default. | Offline regression về slot thiếu/đủ/contradiction PASS; không nới gate/allowlist, không sửa expected hoặc benchmark. Có diff reviewable và phương án kiểm LIVE riêng. |
| 2. LIVE revalidation FIX có kiểm soát | Phụ thuộc FIX được duyệt; input kỹ thuật mới và expected khóa trước, owner duyệt riêng số POST; cùng model/digest, runtime version được ghi nhận, rate ledger/principal và resources đạt. Không tự tái sử dụng ngân sách bốn POST đã hết. | Đo NLU và safety riêng; missing transportation phải clarify ở raw provider, không dựa server recovery để PASS; 0 tool khi thiếu/mâu thuẫn; đủ fields gọi fake tool một lần. |
| 3. `G2 Verified History` — chỉ thiết kế/triển khai khi được duyệt | Phụ thuộc thống nhất contract multi-turn và đánh giá G1 còn hạn chế. Chứng minh ownership/provenance server-side, hỗ trợ correction/invalidation; không coi client history là trusted. | Cross-account, forged/assistant history, correction/negation, auth/consent/rate regression PASS; có phê duyệt riêng trước DB writes. |
| 4. Benchmark V2 / real-tool E2E task riêng | Phụ thuộc readiness NLU sau FIX và approval ngân sách inference; nếu DB: đúng test DB, guard/sentinel/checksum/fingerprint/ledger/cleanup. | Báo đầy đủ actual PASS/FAIL; chỉ xem xét đóng P1 khi evidence đã duyệt đủ, không suy từ 4-case smoke. |

**Dừng sau báo cáo. Không tự FIX, không G2, không thêm inference hoặc Browser E2E.**
