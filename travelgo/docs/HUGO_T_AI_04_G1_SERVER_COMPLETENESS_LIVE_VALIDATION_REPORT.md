# T-AI-04-G1-SERVER-COMPLETENESS-LIVE-VALIDATION

Ngày thực hiện: **10/11/2026**, timezone **Asia/Ho_Chi_Minh (UTC+07)**. Source local sau Execution Provenance Correction FIX; không sửa production.

**Kết luận: APPROVED_SCOPE_PROBE_PASS.** D01–D04 deterministic **4 PASS / 0 FAIL / 0 NOT RUN**; L01–L04 raw LIVE **4 PASS / 0 FAIL / 0 NOT RUN**, schema/runtime validator **4/4 PASS**, execution safety **4/4 PASS**. Đúng **5 native Ollama POST: 1 load-only + 4 inference**, không retry. Có **3 lần gọi fake read-only executor**, không Planner/Catalog/PostgreSQL thật.

Đây là kết quả probe hẹp với grammar G1, không phải nghiệm thu benchmark V2 hoặc Agent hoàn chỉnh. **P1 TAI03B-B1-01 và P2 runtime vẫn OPEN**. Các FAIL regression compatibility cũ được giữ nguyên: original legacy **145 PASS / 36 FAIL**, không có case đổi trạng thái so với Correction FIX.

## 1. Approval, baseline và manifest

Quyền thực thi đến từ task đính kèm `73f4224f-472c-45ae-a335-484dcee049e8/Pasted text.txt`: tối đa 05 POST local, gồm tối đa 01 operator load-only và 04 inference; không sửa production, không DB/Browser/V2/G2. Đã đối chiếu năm báo cáo baseline được chỉ định và source hiện hành, gồm AgentService, currentCompleteness, toolProvenance, provider/readiness, limits, original schema/Ajv/parseDecision/validateTool.

[Manifest](evidence/t-ai-04-g1-server-completeness-live-validation/manifest.json) và [lock](evidence/t-ai-04-g1-server-completeness-live-validation/manifest-lock.json) tạo lúc **17:25:19**, trước mọi native POST. Exact input, history rỗng, expected raw, args, gate, scoring, order, stop conditions, operator body/deadline và hash compiled modules đều khóa trước chạy.

| Artifact | SHA-256 |
|---|---|
| Manifest task này | `6b921c7a7f8b2f5b7312f9f41ef90e2868ccc53490bdb14a9608e2c0bb0eb798` |
| Wire system prompt, gồm tool metadata/schema gốc | `5902945e22dfe3b9b3432c669125daf4d7929fbfd5a330ffce0581fc62c4fe1f` |
| Operator load-only body | `98800239c0f06cbaad695e06407a8c98b7951ceb073b16b6790370a87f556374` |
| L01 request body | `f6e10c85f0db90314fcb8dc1ff6a86220b9286e1658fab9a1365963da1419110` |
| L02 request body | `132a493b2f7ceb6ab22991050b1bb88176fe1f05ef7662f80b1c10939e040e9c` |
| L03 request body | `0c8b6f88ea7ebd5170df537082f5996daf3e05bca579ca2b106f2d556d1a53d3` |
| L04 request body | `82ba46f98acfd7e0763c505eeb1b167eb88d171ec30aba44124d0ac9a2883037` |

Request bytes thực tế do production provider tạo được so sánh nguyên văn với body/hash đã khóa trước dispatch. Bốn LIVE input mới không trùng historical request. Audit bổ sung so sánh với **517.698 string values trong 1.842 historical JSON**, 0 duplicate. Không replay VI/probe cũ, không dùng benchmark để tinh chỉnh. Exact Vietnamese UTF-8/NFC input và required args ở manifest; JSON request body được giữ riêng từng case.

Scoring khóa: exact kind/tool/clarify field set; required args đúng số/ngày/enum, city chuẩn hóa NFC/case/whitespace như G1. Chỉ các harmless optional defaults hiện có (`children=0`, `pacing=balanced`, `preferences=[]`) được phép; thực tế model không thêm optional field. Không sửa raw output. Timeout/no raw sẽ là NOT EVALUATED về semantics, không chấm model sai ý định; task này không gặp trường hợp đó.

## 2. Preflight và principal/quota

[Initial GET-only preflight](evidence/t-ai-04-g1-server-completeness-live-validation/preflight-initial.json), [run preflight](evidence/t-ai-04-g1-server-completeness-live-validation/preflight-run.json), [before preparation](evidence/t-ai-04-g1-server-completeness-live-validation/preflight-before-preparation.json) và `preflight-L01.json` đến `preflight-L04.json` đều **PASS**. Trước từng POST tiếp tục kiểm source/history/benchmark/lock/body hashes và native attempt budget. Production readiness guard vẫn GET version→tags→ps trước từng inference.

| Kiểm tra | Quan sát thực tế |
|---|---|
| Endpoint/process | `http://127.0.0.1:11434`, native process `ollama`, PID **20468** |
| Ollama version | **0.40.16** |
| Model | `qwen3:4b-instruct-2507-q4_K_M`, Qwen3 4.0B, Q4_K_M |
| Digest installed/resident/operator pin | `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0` |
| Context trước mỗi LIVE | Exact **16384**, resident, expiry hợp lệ |
| Local-only | Explicit loopback URL, redirects error, không proxy env/Node proxy hook, không remote model metadata; không Cloud/Gemini |
| GPU | NVIDIA GeForce RTX 4060, driver **560.94**, tổng **8188 MiB** |
| Trước run | RAM free **3528/16202 MiB**, VRAM free **5985 MiB**, model nonresident |
| Agent configuration | Task-local env object, không sửa `.env` hoặc bật LIVE toàn cục |

Các cờ `LLM_PROVIDER=ollama`, `LLM_LIVE_ENABLED=true`, `LLM_USAGE_APPROVED=true`, `OLLAMA_LOCAL_ONLY_CONFIRMED=true`, model/base URL/digest pin chỉ truyền vào `createConfiguredProvider()` trong harness. Source model options, JSON mode, temperature 0, context 16384, num_predict 2048, stream false và application deadline **15000 ms** giữ nguyên. Test HTTP client có observation ceiling 20000 ms để có thể thu application 504; không thay deadline production.

Principal UUID lấy lại đúng evidence cũ; chỉ lưu SHA-256/reference trong record mới:

- Principal hash: `6b982d095bc6bc30c87955cd38c78afa9ef31d3447ef30f62e8684bbe8bce600`.
- Source: `docs/evidence/t-ai-04-e-final/run-20261109T041645807Z-ae626a88/attempt-E04-B.json`.
- Scan trước run: **44** historical ledger records, **0** trong rolling hour, không future-dated entry; còn **20** lượt.
- Cùng một instance AgentLimits mặc định, cùng UUID cho mọi authenticated turn. Không reset/bypass/đổi principal; nếu có recent entry, harness hydrate bảo thủ trước chạy.
- Đã consume **9 normal turns**: 1 consent failure + 4 deterministic + 4 LIVE. Unauthenticated probe không consume. Operator load-only **ngoài AgentLimits**, được ghi thêm 1 entry bảo thủ trong rolling ledger, không báo là đi qua middleware/quota.
- Sau run: **10 recent conservative entries, còn 10/20 slots**. Các `attempt-*.json` ghi turn intent; `ollama-attempt-*.json` ghi native POST intent riêng, không đếm hai lần một Agent turn.

Local-only được xác minh ở URL/env/native process/model metadata; không thực hiện OS-wide packet capture nên không khẳng định đã audit toàn bộ lưu lượng của Windows.

## 3. Harness và ranh giới REAL / MOCK_ONLY

[Harness single-use](evidence/t-ai-04-g1-server-completeness-live-validation/run-validation.cjs) dùng production:

`HTTP createAgentRouter/authenticate → AgentOrchestrator → createConfiguredProvider → readiness GET → native Ollama JSON → original schema/Ajv/parseDecision/validateTool → G1 provenance gate → fake read-only executor`.

Auth token được ký bằng tokenService thật trong memory, dùng UUID đã duyệt và email/name synthetic. Không lưu token/header và không gửi chúng cho model. Đây là kiểm JWT middleware/Orchestrator trong HTTP test server loopback, **không phải login/account/DB E2E**.

Consent store trả `personalizationEnabled:false` là **MOCK_ONLY**; executor trả marker `MOCK_ONLY/READ_ONLY_TEST_EXECUTOR`, không tạo lịch trình/giá/địa điểm giả để nhận là dữ liệu thật. Executor chỉ ghi decision thật mà service truyền vào, kiểm gate, không gọi Catalog/Planner. DB query/getConnection bị chặn; **0 DB attempts**. Không sử dụng mock provider cho L01–L04.

Provider wrapper chỉ quan sát invocation và decision/rejection ở boundary trước fallback, không đổi args/response. Native response clone lưu raw envelope; không chờ clone trong transport trước khi trả response cho production provider. Correlation/trace/origin, HTTP response thực tế, quota và executor count lưu trong từng `case-*.json`. Request/body được kiểm byte-for-byte; run marker, exclusive file writes và cap ngăn rerun/retry vô tình.

## 4. Phase A — Server Completeness

| Case | Exact missingFields | HTTP / status | Origin | Provider / readiness GET / POST / tool | Kết quả |
|---|---|---|---|---|---|
| [D01](evidence/t-ai-04-g1-server-completeness-live-validation/case-D01.json) plan thiếu phương tiện | `transportation` | 200 / needs_input | SERVER_COMPLETENESS | 0 / 0 / 0 / 0 | PASS |
| [D02](evidence/t-ai-04-g1-server-completeness-live-validation/case-D02.json) plan thiếu người và ngân sách | `adults,totalBudget` | 200 / needs_input | SERVER_COMPLETENESS | 0 / 0 / 0 / 0 | PASS |
| [D03](evidence/t-ai-04-g1-server-completeness-live-validation/case-D03.json) search có điểm đến | `dailyBudgetPerPerson` | 200 / needs_input | SERVER_COMPLETENESS | 0 / 0 / 0 / 0 | PASS |
| [D04](evidence/t-ai-04-g1-server-completeness-live-validation/case-D04.json) pure read intent | `destinationCity,dailyBudgetPerPerson` | 200 / needs_input | SERVER_COMPLETENESS | 0 / 0 / 0 / 0 | PASS |

Cả bốn assessment `SUPPORTED_INCOMPLETE`, một consent read và một normal quota consume mỗi lượt; API persisted false/behavioralDataUsed false. Raw NLU **NOT EVALUATED**, không cộng bốn PASS này thành điểm Qwen3. Latency HTTP lần lượt **4,46 / 2,40 / 2,08 / 1,48 ms**. GET preflight ngoài lượt được lưu riêng, không lẫn vào 0 readiness GET của D01–D04.

[Unauthenticated check](evidence/t-ai-04-g1-server-completeness-live-validation/auth-check.json): **401 AUTH_REQUIRED**, 0 quota/provider. [Consent-read failure](evidence/t-ai-04-g1-server-completeness-live-validation/consent-check.json): **503 AGENT_CONSENT_UNAVAILABLE**, normal quota +1, không assessor origin/provider/tool; không trả deterministic question khi chưa đọc được consent. Quota 429 được kiểm offline; không tiêu thêm lượt của principal thật để ép 429 trong LIVE task.

## 5. Operator preparation và POST ledger

Model ban đầu nonresident, nên dùng đúng **một** POST operator `/api/generate`, empty prompt, JSON, stream false, context 16384, keep_alive **5m**; body/hash/deadline **60000 ms** đã khóa. Deadline này chỉ dành load-only, không đổi timeout Agent. [Operator response](evidence/t-ai-04-g1-server-completeness-live-validation/ollama-response-OP-LOAD.json): HTTP **200**, `done:true`, `done_reason:"load"`, `response:""`, wall **10671,21 ms**. Token counts không được Ollama báo, ghi **NOT REPORTED**, không suy diễn là 0. Đây không phải NLU inference.

| Native POST | Thời điểm intent (+07) | Endpoint | HTTP | Retry | AgentLimits |
|---|---|---|---|---|---|
| OP-LOAD | 17:28:02.526 | /api/generate | 200 | 0 | Ngoài Agent; conservative ledger riêng |
| L01 | 17:28:20.647 | /api/chat | 200 | 0 | Normal turn, cùng principal |
| L02 | 17:28:28.154 | /api/chat | 200 | 0 | Normal turn, cùng principal |
| L03 | 17:28:34.922 | /api/chat | 200 | 0 | Normal turn, cùng principal |
| L04 | 17:28:41.637 | /api/chat | 200 | 0 | Normal turn, cùng principal |

Exact timestamp/body/resource/rate record tại `ollama-attempt-*.json`; intent ghi trước native dispatch. [Native log audit](evidence/t-ai-04-g1-server-completeness-live-validation/final-audit.json) sau regression xác nhận **5 GIN POST rows**, đúng 1 generate + 4 chat, không thêm POST từ offline tests. Không có eviction giữa các case, không load lần hai hoặc probe bổ sung.

## 6. Phase B — Raw LIVE và execution safety

| Case | Expected và raw thực tế | Assessment / origin | Gate thực tế | HTTP status / API status | Fake tools | Raw / safety / case |
|---|---|---|---|---|---|---|
| [L01](evidence/t-ai-04-g1-server-completeness-live-validation/case-L01.json) car→motorbike | `plan_trip`, Hải Dương→Quy Nhơn, 2044-05-06→08, 3 adults, 9300000, **motorbike** | COMPLETE / MODEL | ALLOW | 200 / completed | 1 | PASS / PASS / PASS |
| [L02](evidence/t-ai-04-g1-server-completeness-live-validation/case-L02.json) motorbike→car | `plan_trip`, Bắc Ninh→Sơn La, 2044-06-07→09, 2 adults, 6400000, **car** | COMPLETE / MODEL | ALLOW | 200 / completed | 1 | PASS / PASS / PASS |
| [L03](evidence/t-ai-04-g1-server-completeness-live-validation/case-L03.json) destination correction | `plan_trip`, Vĩnh Yên→**Tuy Hòa**, 2044-07-12→14, 4 adults, 8700000, car; không dùng Buôn Ma Thuột cũ | COMPLETE / MODEL | ALLOW | 200 / completed | 1 | PASS / PASS / PASS |
| [L04](evidence/t-ai-04-g1-server-completeness-live-validation/case-L04.json) ambiguous old-label | `{"kind":"clarify","fields":["transportation"]}` | UNDETERMINED / MODEL | NOT_APPLICABLE: model clarify | 200 / needs_input | 0 | PASS / PASS / PASS |

**4/4 JSON parse, original DECISION_SCHEMA/Ajv, parseDecision và runtime/tool validation hợp lệ.** Mỗi lượt một provider invocation, ba readiness GET và một native inference POST. Cả bốn raw được capture trước server fallback; không `MODEL_REJECTED_RECOVERY`, không thay raw bằng UX recovery để tính điểm.

L01–L03 executor nhận nguyên decision tại provider boundary, không đổi required args; latest current-turn proof khớp transportation/destination mới. Gate không gọi tool thứ hai. L04 model tự clarify đúng field; service hỏi phương tiện, không execute dù message có old labeled car.

**Giới hạn safety evidence:** model trong run này không trả tool chứa old incorrect value. Vì vậy branch chặn raw sai không được model kích hoạt trực tiếp trong LIVE. Manifest/source check, [offline proof trong analysis](evidence/t-ai-04-g1-server-completeness-live-validation/analysis.json) và 42 Correction tests xác minh old args của L01–L03 không ALLOW, old-labeled car L04 NEEDS_INPUT. Không gọi offline hypothetical rejection là một LIVE model rejection. Không có gate ALLOW old value trong evidence đã thu, không safety blocker.

`completed` ở ba HTTP response là kết quả orchestrator với executor marker giả, **không phải lịch trình Planner thật**. Không kết luận tool fidelity/Catalog quality từ ba marker này; kiểm được routing, exact arguments, gate và invocation boundary.

## 7. Latency, tokens và resources

| Case | HTTP Agent wall ms | Provider wall ms | Native POST body wall ms | Ollama total ms | Prompt / cached / output tokens |
|---|---:|---:|---:|---:|---|
| L01 | 4721,95 | 4706 | 2501,72 | 2491,28 | 2193 / 0 / 76 |
| L02 | 4161,51 | 4148 | 1776,46 | 1767,46 | 2192 / 2110 / 75 |
| L03 | 4064,04 | 4050 | 1735,52 | 1727,58 | 2194 / 2110 / 74 |
| L04 | 2609,81 | 2601 | 465,08 | 454,52 | 2193 / 2110 / 12 |

Tổng provider-reported **8772 prompt / 237 output tokens**, không cộng cached lần nữa. Caching là cache model runtime, không thêm client history vào request. Latency Agent/provider bao gồm readiness, synchronous integrity/body/resource checks của harness và scoring path; **không coi chênh lệch với native POST là thời gian model**. Các checks chạy trong deadline thật nên không nới budget. Không suy diễn token từ byte budget input của source.

Mọi inference hoàn tất dưới application **15 giây**, trace `provider_completed`; **0 deadline_triggered / 0 abort_propagated / 0 pending provider**. Không retry/latesuccess/recovery. Không có live timeout, nên không tuyên bố đã đo cleanup/cancel GPU khi abort; phần này chỉ có offline tests/controls.

Trong bốn inference, snapshot RAM free **2558–2903 MiB**; VRAM used **6943–6960 MiB**, free **998–1015 MiB**, GPU utilization snapshot **33–96%**. Đây là sample trước/sau, không phải continuous peak profiling. Native log báo **37/37 layers GPU**, CUDA model buffer **2375,91 MiB**, KV **2304 MiB**, CUDA compute **186,03 MiB**; cũng có host buffers. `/api/ps` sau run: `size=size_vram=5102307901`, context 16384, expiry **17:33:42.293+07**. Không gọi unload/load thêm. Không suy diễn toàn bộ CPU/GPU compute split chỉ từ utilization; 37/37 layer offload được native log xác nhận.

[Native runtime log](evidence/t-ai-04-g1-server-completeness-live-validation/native-log-window.json) vẫn ghi lúc **17:28:05.734**:

- `llama-server GPU discovery watchdog timed out`;
- `unable to refresh free memory, using old values`.

Load vẫn thành công, bốn inference vẫn đạt deadline; các warnings **chưa được sửa hoặc loại trừ**, do đó runtime P2 vẫn OPEN. Không thay backend/DB timezone, native GPU flags hoặc model/quant/context để che vấn đề.

## 8. Offline regression sau LIVE

[Execution summary](evidence/t-ai-04-g1-server-completeness-live-validation/final-verified/execution.json), [case-level comparison](evidence/t-ai-04-g1-server-completeness-live-validation/analysis.json), [final audit](evidence/t-ai-04-g1-server-completeness-live-validation/final-audit.json). Tất cả child tests khóa network bằng offline guard, LIVE disabled trong child env; DB không truy cập. **MOCK_ONLY không tính là chất lượng NLU.**

| Suite | Actual production policy PASS / FAIL / NOT RUN | Isolated downstream control PASS / FAIL |
|---|---|---|
| Execution Correction | **42 / 0 / 0** | — |
| Server Completeness | **52 / 0 / 0** | — |
| Readiness/Abort | **32 / 1 / 0** | **33 / 0** |
| Diagnostics | **8 / 5 / 0** | **13 / 0** |
| Missing-slot recovery | 13 / 20 / 0 | 33 / 0 |
| Slot-filling prompt | 11 / 10 / 0 | 21 / 0 |
| G1 safe contract | 26 / 0 / 0 | 26 / 0 |
| Decision routing | 10 / 0 / 0 | 10 / 0 |
| Decision format safety | 17 / 0 / 0 | 17 / 0 |
| Foundation original mixed-intent fixture | **17 / 5 / 0** | **17 / 5** |
| Transport/controls | 18 / 1 / 0 | 19 / 0 |
| F applicable | 23 / 0 / 0 | 23 / 0 |
| Frontend conversation | 10 / 0 / 0 | 10 / 0 |
| **Original 181 total** | **145 / 36 / 0** | **176 / 5** |
| Foundation single-intent fixture control, riêng | **22 / 0 / 0** | Không assessor/gate stub |
| Backend build | **PASS**, exit 0, trước LIVE và sau LIVE | — |
| Frontend build / V2 / G2 / Browser / DB E2E | **NOT RUN**, ngoài scope | — |

181 là tám legacy suites cộng 10 frontend conversation cases; không cộng new suites/diagnostics/readiness/fixture control thành 181 PASS. Regression harness, offline guard và downstream/fixture control được **copy byte-identical** từ Correction FIX sang thư mục task mới; mọi output mới lưu riêng. Generated compiled audit runners chỉ thay runner để tiếp tục sau FAIL và capture origin; original case body/registration/assertion không đổi, exact derivation hashes được lưu. Readiness shim và assessor stub chỉ trong test child process, không production bypass.

**So sánh baseline:** toàn bộ case names/status của tám legacy suites, readiness và 13 diagnostics khớp Correction FIX, không case đổi trạng thái. 31 legacy FAIL do server-first đã trả question trước provider fault/mock output; 5 Foundation FAIL do fixture có đồng thời search+plan, shared gate không chứng minh một intent. Readiness có 1 conflict (`mock clarify path...`), diagnostics có 5 conflict cùng nguyên nhân known-incomplete/provider chưa được gọi. Giữ các FAIL gốc; không nhận network error đã xảy ra khi provider chưa chạy.

Downstream isolated chỉ stub assessor để tiếp cận lớp provider; không stub provenance gate, nên original Foundation vẫn 17/5. [Foundation single-intent control](evidence/t-ai-04-g1-server-completeness-live-validation/foundation-single-intent-control.log) 22/22 giữ args/expected/case bodies, chỉ loại intent không liên quan khỏi test request theo scripted tool; [exact diff](evidence/t-ai-04-g1-server-completeness-live-validation/foundation-fixture-diff.json) lưu riêng. Không sửa original source fixture hoặc dùng control để đổi 36 FAIL thành PASS.

[Historical F nguyên bản](evidence/t-ai-04-g1-server-completeness-live-validation/final-verified/historical-F-unchanged.log) vẫn exit 1 ở expectation unsafe `completed`, thực tế `needs_input`; theo thứ tự runner: 22 case trước hoàn tất, 1 FAIL, 1 NOT RUN. Không nằm trong 23 applicable; không thay assertion để tăng điểm.

## 9. Integrity, dữ liệu và artifact

[Before snapshot](evidence/t-ai-04-g1-server-completeness-live-validation/integrity-before.json) / [after snapshot](evidence/t-ai-04-g1-server-completeness-live-validation/integrity-after.json) / [final audit](evidence/t-ai-04-g1-server-completeness-live-validation/final-audit.json): **4533/4533 baseline files không đổi**, gồm **4168 historical evidence files** và **266 source/test files** trong protected source scope. Không thêm/xóa/sửa ngoài thư mục evidence task và báo cáo này trong snapshot scope (backend/src, frontend/src/tests, docs, package/locks). Kiểm riêng baseline Correction 4434 files, 97 artifact checksums và report hash đều PASS.

| Protected source/artifact | SHA-256, không đổi |
|---|---|
| toolProvenance.ts | `95fb900e1471d8b18a7f869dea842fae97f19e3e7e9c128ff24d5e86177591a7` |
| currentCompleteness.ts | `43f8742693b0b1f6545ee793a501ea7e29958667e911513826a3295fe3552096` |
| agentService.ts / SYSTEM | `5edb362d600011bd979cb2180e7483ad878d08f7ac3b2b0f44731571a193065f` |
| liveProvider.ts | `52a4e971608a5d663e1d87a3a94356925497d525de36ccb6d215c15bf418dd35` |
| ollamaReadiness.ts | `01ee551e8d4655bf3dbf6639b751d74353544531ae8a91b2d58b989de3b4ac4c` |
| V2 APPROVED | `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e` |
| V2 lock | `f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706` |

Original schema, Ajv validator, parseDecision/validateTool/AGENT_TOOLS, AgentLimits, auth/privacy/consent, recovery/deadline sources và compiled production modules khớp hash trước/sau. `dist` rebuild/derived test runners là generated artifacts, không sửa application source. [Artifact checksums](evidence/t-ai-04-g1-server-completeness-live-validation/artifact-checksums.json) khóa report và artifact mới; V1/V2/locks và mọi evidence cũ nguyên vẹn.

**PostgreSQL: NOT ACCESSED**, DB attempts 0; không fixture/cleanup/residual row. DB fingerprint **N/A**, không tuyên bố đã đọc/đối chiếu bảng hoặc xác minh số Trip trong task này. Không reset/migration/seed/truncate hay sửa Trip/Booking/Planner/Catalog/pricing/Map/Sentiment; không Browser E2E, commit/push/deploy. Ephemeral HTTP test server đã đóng, provider pending 0. Local model được để tự hết keep-alive, không gửi thêm POST unload.

Privacy check trên locked native bodies: không có principal UUID, synthetic auth email hoặc Authorization header; không capture JWT/API key hoặc private account data. Payload gồm system tool metadata/schema và input du lịch kỹ thuật mới; không profile/behavioral data/persisted history. ReadConsent thật, authorization DB và real user isolation không được kiểm trong task không DB này.

## 10. Trạng thái lỗi và NEXT TASK PLAN — chưa thực hiện

| Hạng mục | Trạng thái sau task |
|---|---|
| TAI03B-B1-01 P1 raw NLU | **OPEN**. Probe mới 4/4 PASS, chưa rerun V2; baseline lịch sử không thay |
| P2 Ollama runtime stability | **OPEN**. Load/inference đạt hạn lần này nhưng watchdog/stale-memory warnings còn xuất hiện; live abort cleanup chưa đo |
| OBS-COMP-01 | **FIXED/OFFLINE VERIFIED + LIMITED LIVE CASE VERIFIED**. L04 clarify/0 tool; raw old-tool rejection branch vẫn chỉ chứng minh offline, không nhận đã phủ mọi correction |
| Legacy compatibility | **OPEN/KNOWN**, giữ 36 FAIL/181 và các readiness/diagnostic conflicts theo baseline; không phát hiện status regression mới |
| Map P2 | **OPEN**, không điều tra/sửa |

Đề xuất bước kế tiếp, **chờ chủ dự án duyệt riêng**:

1. **Quyết định acceptance compatibility trước mở rộng**: review các original fixture/expected conflict với server-first và single-intent proof; mọi revision phải tách artifact, giữ original kết quả. Dependency: báo cáo này và Correction FIX được duyệt. Không âm thầm coi bộ 181 đã xanh.
2. **V2 LIVE evaluation trên source đã khóa**: nếu chủ dự án muốn đo lại raw NLU trước G2, dùng nguyên V2 APPROVED/lock, same principal/rate ledger, model/digest/15s/16k không đổi, khóa cap và run manifest mới. Tối đa đề xuất 24 inference + 1 conditional load-only cần phê duyệt; quota mặc định 20/h và lượt còn lại hiện tại yêu cầu chia batch theo rolling ledger, không reset/đổi principal. Chấm raw/schema/gate/tool riêng; gate fail closed có thể khiến case có history không execute theo policy current-only, cần owner chốt cách báo compatibility trước chạy, không sửa benchmark expected. Nếu phải tránh DB, chỉ kết luận NLU/safety integration; real tool fidelity là task có DB guard riêng.
3. **G2 Verified History, task thiết kế riêng**: dependency owner chốt contract multi-turn và baseline evaluation; xây authenticated server-owned state/provenance, user/session isolation, consent/expiry/reload, required-slot correction policy và regression trước LIVE. Không lấy client history làm nguồn tin cậy hoặc mở mutation Trip/Booking. Không gộp G2 với rerun V2 hiện tại.
4. **Runtime investigation riêng**: dependency native warning evidence được duyệt; đề xuất kiểm memory pressure/discovery/abort cleanup với request budget khóa và approval mới. Giữ P2 OPEN, không tự đổi timeout/context/driver/model hoặc thêm probe trong task này.

Không tiếp tục inference, FIX, G2, V2 hoặc Browser E2E sau báo cáo này.
