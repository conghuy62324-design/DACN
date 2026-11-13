# T-AI-04-G1-READINESS-CONTROLLED-CHECK

Ngày 10/11/2026, Asia/Ho_Chi_Minh. **Controlled LIVE readiness smoke PASS**, đúng **2/2 POST local**: một operator load-only và một inference qua production provider/orchestrator. **Không retry hoặc hidden inference.** Guard lạnh trả `AGENT_OLLAMA_NOT_READY` trước preparation, không phát POST. Technical inference trả đúng `{"kind":"unsupported"}`, original schema/runtime hợp lệ, service unsupported, **0 tool**, khoảng **1.375 ms**.

**P1 NLU vẫn OPEN; P2 readiness/deadline vẫn OPEN về runtime stability/root cause.** Guard được kiểm chứng LIVE trong trạng thái cold → prepared → warm, nhưng một unsupported smoke không phân biệt được NLU khỏe với hiện tượng luôn trả unsupported. Không nghiệm thu tool routing/slot filling/V2 từ kết quả này. Native deadline/abort fault **NOT RUN** vì lượt inference không timeout; kiểm tra offline tương ứng PASS.

## 1. Baseline, phạm vi và request lock

Đã đọc [Readiness/Abort Guard FIX](HUGO_T_AI_04_G1_READINESS_ABORT_GUARD_FIX_REPORT.md), [Readiness/Raw Clarify investigation](HUGO_T_AI_04_G1_READINESS_RAW_CLARIFY_INVESTIGATION_REPORT.md), [M01–M06 LIVE check](HUGO_T_AI_04_G1_MISSING_SLOT_LIVE_CHECK_REPORT.md), source provider/deadline/readiness/limits/orchestrator/schema/runtime và harness/evidence lịch sử. Baseline FIX offline: 33 readiness tests + 13 diagnostic + 181 applicable regression PASS, backend build PASS. Source FIX local khớp hashes báo cáo trước.

Quyền thực thi: attachment `b54b89e7-7c54-4ae7-b016-aa30ea56316b/Pasted text.txt`, tối đa **hai POST tổng cộng**, tính cả chuẩn bị model. Không sửa production, env file hoặc cấu hình Ollama/GPU; chỉ tạo harness/evidence/report mới. LIVE bật bằng config object trong process test; không bật toàn cục. Chỉ consent và executor là test dependencies; provider, orchestrator, GET guard, HTTP Ollama, model và schema/runtime là thật. Executor fail closed nếu bị gọi; thực tế không có invocation.

Khóa trước POST lúc **14:14:37.946 UTC+07** trong [request plan](evidence/t-ai-04-g1-readiness-controlled-check/request-plan.json); hash trong [manifest lock](evidence/t-ai-04-g1-readiness-controlled-check/manifest-lock.json):

| Artifact | SHA-256 |
|---|---|
| Request plan | `5d87ceb5fb33fcc5d226955fb6fd2caf2f8c9201c5b244994ce6ca78921c1548` |
| [Load-only body](evidence/t-ai-04-g1-readiness-controlled-check/operator-load-request-body.json) | `98800239c0f06cbaad695e06407a8c98b7951ceb073b16b6790370a87f556374` |
| [Production chat body](evidence/t-ai-04-g1-readiness-controlled-check/application-request-body.json) | `a61b549ddd12a76624a8ad598fcaa8188ec95a540d6ef5cb53d520d11b0158e9` |
| Production SYSTEM + tool metadata + schema | `5902945e22dfe3b9b3432c669125daf4d7929fbfd5a330ffce0581fc62c4fe1f` — không đổi |

Planning không gọi model: lấy SYSTEM literal từ source/compiled module đã hash, đối chiếu bằng nhau, ghép body theo code production; runtime phải khớp **exact bytes/hash trước khi POST**. Message UTF-8 NFC, không trùng trong **1.714 historical JSON artifacts**, gồm manifests VI/P/D/E/G/S/M; prompt byte-budget **10.376 ≤ 12.288**. Không dùng benchmark để chỉnh prompt/expected.

Input kỹ thuật RC01 duy nhất gửi model:

> Kiểm tra kỹ thuật RC01: hãy phân tích cấu trúc tinh thể của muối ăn và viết một bài thơ ngắn về đại số tuyến tính.

Expected khóa: exact `{"kind":"unsupported"}`, service unsupported, zero tools. Input không yêu cầu nghiệp vụ du lịch. RC00 dùng cùng message để kiểm guard khi cold nhưng **không gọi model**, không phải NLU case thứ hai.

## 2. Preflight và quota

[Preflight ngay trước run](evidence/t-ai-04-g1-readiness-controlled-check/preflight-run.json) **PASS**, bắt đầu **14:20:01.676 UTC+07**; sau đó preflight độc lập trước [load](evidence/t-ai-04-g1-readiness-controlled-check/preflight-before-load.json) và [smoke](evidence/t-ai-04-g1-readiness-controlled-check/preflight-before-smoke.json) đều PASS. Full integrity, model pin, local/no-proxy, resource snapshot và rolling ledger được kiểm lại; readiness guard còn thực hiện GET chính nó trong lượt application.

| Kiểm tra | Kết quả |
|---|---|
| Service | Ollama **0.40.16**, `http://127.0.0.1:11434`; native listener PID **20468**, process `ollama` |
| Exact tag | `qwen3:4b-instruct-2507-q4_K_M` |
| Approved digest | `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0` |
| Operator pin | `OLLAMA_MODEL_DIGEST` đặt trong provider config object, không sửa env file; tags/ps và pin phải khớp |
| Local-only | Native fetch tới exact loopback, redirect error, không proxy env/Node proxy/transport hook; tags không remote/cloud metadata; không Cloud/Gemini |
| Hardware | RTX 4060 8.188 MiB, driver **560.94**, RAM **16.202 MiB** |
| Residency trước run | `/api/ps`: models `[]`; chưa ready, không suy từ version/tags 200 thành ready |
| Nguồn principal | Cùng UUID đọc từ historical E04-B ledger; kiểm exact UUID trong harness; không tạo account/session mới, không log raw account data |
| Rolling hour trước run | **41 known historical attempt records, 0 recent**, 20 slot còn lại theo conservative ledger |
| Source/benchmark/history | PASS; toàn bộ baseline và artifact FIX trước khớp |

Phạm vi xác nhận local-only là URL/env/native listener/model metadata và transport allowlist; không phải packet capture hoặc xác minh toàn bộ egress của mọi ứng dụng Windows.

Preflight đầu lúc **14:12:01** dừng trước HTTP/POST tại parser ledger: chín record cũ dùng `createdAt` thay vì `at`. [Inspection](evidence/t-ai-04-g1-readiness-controlled-check/ledger-schema-inspection.json) xác nhận JSON hợp lệ và timestamp lịch sử có sẵn. Harness chỉ bổ sung đọc cả hai field, **không bỏ qua chín record**, không sửa ledger cũ hoặc quota. [Preflight đọc đúng ledger](evidence/t-ai-04-g1-readiness-controlled-check/preflight-validated-ledger.json) PASS lúc 14:13:10; chưa có POST ở giai đoạn này. Một syntax check của harness trước LIVE cũng bắt tên biến trùng; đã sửa tên biến local trước run, không đổi body/hash/expected. Không có request mạng nào từ script chưa parse được.

AgentLimits mặc định **20/giờ, concurrency 2** giữ nguyên source. Một instance dùng xuyên RC00 và RC01; harness chạy tuần tự, concurrency thực tế 1. Historical recent=0 do thời gian thật đã qua cửa sổ các run trước, không reset clock/quota. Có **hai normal Agent turns**: cold rejection và smoke; mỗi turn tiêu thụ quota theo contract. Operator load **không đi qua AgentLimits**, ghi riêng và vẫn tính vào task POST cap/conservative rolling ledger. Không tuyên bố quota ứng dụng kiểm soát POST operator trực tiếp.

[Rate-window after](evidence/t-ai-04-g1-readiness-controlled-check/rate-window-after.json): 44 known entries, 3 recent gồm **một readiness turn không POST + một operator POST + một application POST**. Đây là conservative accounting, không phải ba inference. Principal chỉ lưu bằng SHA-256/reference ở evidence mới; future harness cần đọc cả principalHash/reference và `at/createdAt`, không chỉ schema cũ.

## 3. Kết quả cold guard và POST budget

| Hạng mục | Kết quả | POST | Raw NLU |
|---|---|---:|---|
| RC00 — model nonresident | **PASS**, 503 `AGENT_OLLAMA_NOT_READY`, khoảng **46,09 ms**, 0 tool | **0** | **NOT EVALUATED** |
| RC-LOAD — operator preparation | **PASS**, HTTP 200, empty response, done_reason load; resident đúng 16k sau load | **1** | **NOT EVALUATED** |
| RC01 — production warm smoke | **PASS**, HTTP Ollama 200, raw/schema/runtime/service đúng unsupported, 0 tool | **1** | **PASS — một technical case** |
| **Tổng** | **Controlled smoke PASS** | **2/2** | **1 case đo model**, không phải 3 NLU cases |

[Cold guard result](evidence/t-ai-04-g1-readiness-controlled-check/cold-guard-result.json): provider boundary `ReadinessError` 503; service giữ safe code `AGENT_OLLAMA_NOT_READY`. Trace RC00 chỉ có version/tags/ps GET, `model_not_resident`, `readiness_check_failed: not_resident`, `request_rejected_safely`; `inferenceStarted:false` suốt lượt. Không có provider success, không fallback clarify, không chat POST trước preparation.

[Attempt ledger](evidence/t-ai-04-g1-readiness-controlled-check/attempt-RC-LOAD.json) của operator và [application ledger](evidence/t-ai-04-g1-readiness-controlled-check/attempt-RC01.json) được ghi trước native fetch, xác minh body hash, rate và task cap; run marker write-once ngăn chạy lại. [Runtime analysis](evidence/t-ai-04-g1-readiness-controlled-check/runtime-analysis.json) đối chiếu **2 POST intents = 2 native transport POST = 2 native server POST log rows**, đúng `/api/generate` và `/api/chat`, không retry. [RC00 ledger](evidence/t-ai-04-g1-readiness-controlled-check/attempt-RC00-GUARD.json) ghi rõ `postAttempt:false`.

## 4. Operator preparation minh bạch

Tài liệu Ollama chính thức mô tả preload bằng empty API request; request `keep_alive` là duration của lần gọi, không cần sửa cấu hình toàn cục. [Ollama FAQ](https://docs.ollama.com/faq#how-can-i-preload-a-model-into-ollama-to-get-faster-response-times), [Generate API](https://docs.ollama.com/api/generate).

Exact body đã khóa:

```json
{"model":"qwen3:4b-instruct-2507-q4_K_M","prompt":"","stream":false,"format":"json","keep_alive":"5m","options":{"temperature":0,"num_predict":2048,"num_ctx":16384}}
```

**14:20:10.243 → 14:20:21.908 UTC+07**, wall **11.666,32 ms**, deadline operator khóa **60.000 ms**. Deadline này chỉ dành cho load-only được task cho phép; không thay production timeout 15.000 ms. Response thật trong [RC-LOAD envelope](evidence/t-ai-04-g1-readiness-controlled-check/RC-LOAD-ollama-response.json):

```json
{"model":"qwen3:4b-instruct-2507-q4_K_M","created_at":"2026-11-10T07:20:21.9030967Z","response":"","done":true,"done_reason":"load"}
```

Response không có token counts hoặc `load_duration`: **không biết**, không gán 0 hoặc trình bày wall time như field server load-duration. Không có nội dung nghiệp vụ hay generated decision, không NLU score, không tool. Chỉ thực hiện một lần, không download/restart/GPU setting change/unload POST.

[Sau preparation](evidence/t-ai-04-g1-readiness-controlled-check/post-preparation-readiness.json) và preflight-before-smoke: tag/digest exact, `context_length:16384`, expiry còn hạn, `size=size_vram=5102307901` bytes, ready=true. Không bypass guard: production guard tiếp tục thực hiện GET riêng và chỉ sau `readiness_verified` mới cho chat POST.

## 5. Production inference và validation

Chuỗi thật: `createConfiguredProvider(operatorEnv)` → transparent provider-boundary capture → `AgentOrchestrator` với cùng principal/default AgentLimits → production GET readiness → Ollama JSON mode → original Ajv/parseDecision → unsupported safety path. Provider transport chỉ forward native response; không mock thành công, sửa output hoặc inject decision.

Giữ nguyên SYSTEM/schema/tools/validators/G1, `format:"json"`, `stream:false`, `temperature:0`, `num_ctx:16384`, `num_predict:2048`, timeout **15.000 ms**. Chỉ fake consent=false và executor fail-closed để tránh DB/real tool. Agent HTTP route và Browser E2E **NOT RUN**; gọi trực tiếp orchestrator, không suy ra HTTP Agent 200 từ object service. HTTP Ollama thực tế **200**.

[Raw envelope](evidence/t-ai-04-g1-readiness-controlled-check/RC01-ollama-response.json), [smoke result](evidence/t-ai-04-g1-readiness-controlled-check/smoke-result.json):

```json
{"kind":"unsupported"}
```

| Trục chấm | Kết quả |
|---|---|
| HTTP/envelope | 200, done=true, done_reason=stop, assistant text |
| JSON parse | PASS |
| Original DECISION_SCHEMA/Ajv | PASS |
| parseDecision/runtime | PASS; validateTool arguments N/A vì kind unsupported |
| Exact locked semantic expected | PASS, không extra properties |
| Provider boundary | Trả decision hợp lệ, không provider rejection/recovery |
| Orchestrator | status unsupported; STATELESS, persisted=false, behavioralDataUsed=false |
| Executor | **0 fake / 0 real**; không Catalog/Planner/Trip/Booking |
| Raw NLU | **1/1 technical unsupported PASS**, không benchmark/V2 score |
| General NLU / slot filling / tool fidelity | **NOT EVALUATED** |

Capture raw response dùng clone đọc bất đồng bộ, không await capture trong wrapper trước khi trả native response về provider. Raw output/boundary decision được giữ riêng với service fallback; thực tế không fallback hoặc recovery trong RC01.

## 6. Deadline, trace và latency

[Lifecycle events](evidence/t-ai-04-g1-readiness-controlled-check/readiness-lifecycle-events.json) ghi correlation UUID kỹ thuật, timestamp, operation/reason allowlist; không JWT/key/profile/account/raw private conversation. Full body chỉ chứa production system/public examples và technical input đã khóa, không dữ liệu account.

| RC01 event | Thời gian UTC+07 / elapsed provider |
|---|---|
| Provider request started | **14:20:29.272**, 0 ms |
| GET version/tags/ps settled | Trong khoảng **15–46 ms** |
| Readiness verified | **14:20:29.319**, **47 ms** |
| Native chat POST started | **14:20:29.483**; sau readiness và ledger checks |
| Native fetch settled | **14:20:30.642**, fetch khoảng **1.159,02 ms** |
| Provider completed / service unsupported | **14:20:30.646**, tổng khoảng **1.374,63 ms** |
| Deadline/abort events | **0**, không timeout hoặc abort được kích hoạt |

Wall latency gồm GET guard, các kiểm body/source/rate của harness và validation; không gọi đó là model-only latency hoặc overhead thuần production. Ollama envelope báo **total 1.155,74 ms**, load **4,78 ms**, prompt-eval **1.016,54 ms**, generation **108,02 ms**; **2.138 prompt / 6 output tokens**. Không suy token của load-only từ số này.

Không tăng timeout, đổi context hoặc bypass guard để đạt PASS. Fetch/body/provider đều đã settle trong lượt này; không có late tool. **Native timeout/abort sau FIX chưa được fault-test LIVE** — không chủ động gửi POST thứ ba để kiểm. Late response/no success/held concurrency slot vẫn được xác minh bằng 33 offline tests + 13 diagnostic, không gán thành LIVE cancellation PASS. Fetch settlement và HTTP completion không phải bằng chứng toàn bộ GPU cleanup; không tuyên bố GPU đã unload/cleanup khi chỉ có client event.

## 7. RAM/VRAM, residency và warning còn lại

Snapshots từ [runtime analysis](evidence/t-ai-04-g1-readiness-controlled-check/runtime-analysis.json), không phải continuous profiler:

| Mốc UTC+07 | RAM free MiB | VRAM used / free MiB | Residency / context |
|---|---:|---:|---|
| 14:20:05.799 — preflight run | 2.962 | 1.959 / 5.999 | Không resident |
| 14:20:09.833 — trước load | 2.925 | 1.945 / 6.013 | Không resident |
| 14:20:21.970 — sau load | 2.463 | 7.026 / 932 | Resident, **16384** |
| 14:20:28.970 — trước smoke | 2.644 | 6.883 / 1.075 | Resident, **16384** |
| 14:20:30.710 — sau smoke | 2.590 | 6.871 / 1.087 | Resident, **16384** |

Trước cold load, harness so headroom với allocation lịch sử **5.102.307.901 bytes (~4.866 MiB)** đã quan sát ở M run; không thêm ngưỡng VRAM tùy ý vào production. Đây là planning estimate, không bảo đảm thành công. Không đặt ngưỡng RAM mới, đổi context hoặc driver.

[Native log window](evidence/t-ai-04-g1-readiness-controlled-check/ollama-log-window.json) và structured warning trong analysis xác nhận lúc **14:20:13.260** vẫn có:

- `llama-server GPU discovery watchdog timed out`.
- `unable to refresh free memory, using old values`.

Model vẫn load được: server ghi loaded runners lúc **14:20:21.900**, load-only HTTP 200/11,65 s; chat HTTP 200/1,15 s. Không thấy aborting load/Load failed/499 trong task window. Sự vắng mặt này không chứng minh mọi cold-load sau đều ổn định.

Log ghi `offloaded 37/37 layers to GPU`, CUDA model buffer **2.375,91 MiB**, KV **2.304 MiB**, compute **186,03 MiB**. API ps báo toàn bộ model allocation ở VRAM; đây là residency/allocation, **không phải tỷ lệ thời gian GPU/CPU compute**. Không đo peak, p95, cleanup latency hoặc compute split chính xác.

Runtime vẫn dùng memory values cũ: log nhắc free **7.099 MiB**, snapshot trước load **6.013 MiB**; khác thời điểm nên không quy chênh lệch đó thành nguyên nhân failure đã được chứng minh. Load thành công trong một sample không giải quyết watchdog/root cause. Log là file runtime append tự nhiên, chỉ lưu snapshot/hash tại lúc đọc; không yêu cầu file live giữ nguyên.

[Late read-only audit](evidence/t-ai-04-g1-readiness-controlled-check/late-readonly-audit.json) lúc **14:31:00.223**: `/api/ps` không còn model resident, sau expiry đã ghi **14:25:30.642**. Điều này phù hợp keep-alive 5 phút; không coi snapshot idle muộn là trạng thái của smoke lúc 14:20. Không reload hoặc phát application request thêm. Native server log tới sau regression/report vẫn chỉ có **hai generate/chat POST**, xác nhận regression không tiêu thụ thêm inference local.

## 8. Regression sau LIVE

[Runner](evidence/t-ai-04-g1-readiness-controlled-check/run-regression.cjs), [summary](evidence/t-ai-04-g1-readiness-controlled-check/regression-summary.json). Tất cả **MOCK_ONLY_OFFLINE**, không phát Ollama POST hoặc cộng vào NLU LIVE:

| Suite | PASS / FAIL |
|---|---:|
| Readiness/abort tests, không shim | **33 / 0** |
| Diagnostic kế thừa | **13 / 0** |
| Missing-slot recovery | 33 / 0 |
| Slot-filling prompt | 21 / 0 |
| G1 safe contract | 26 / 0 |
| Decision routing | 10 / 0 |
| Decision format safety | 17 / 0 |
| Agent foundation | 22 / 0 |
| Transport/controls | 19 / 0 |
| F applicable runner | 23 / 0 |
| Frontend conversation | 10 / 0 |
| **Applicable regression kế thừa** | **181 / 0** |
| Backend build trước và sau LIVE | **PASS**, exit 0 |
| Frontend build | **NOT RUN**, không sửa frontend |

Giữ byte-identical legacy readiness shim và hai scheduling adapters từ task FIX, chỉ đặt bản copy trong evidence mới/dist test runner. [Compatibility hashes](evidence/t-ai-04-g1-readiness-controlled-check/regression-compatibility.json): **0 assertion thay đổi**; mock control-plane fixtures không chứng minh readiness thật. Foundation/adapter tests dùng synthetic catalog/test loader, không truy cập real Catalog/Planner/PostgreSQL.

[Historical F](evidence/t-ai-04-g1-readiness-controlled-check/regression/historical-F.log) vẫn là **22 PASS trước stop / 1 FAIL / 1 NOT RUN** tại expected unsafe completed, actual needs_input. Đây là assertion lịch sử được báo riêng, không đổi expected hoặc tính vào 181 applicable; không che lỗi bằng sửa assertion.

## 9. Source, benchmark và evidence integrity

[Before](evidence/t-ai-04-g1-readiness-controlled-check/integrity-before.json) / [after](evidence/t-ai-04-g1-readiness-controlled-check/integrity-after.json): **4.215/4.215 file baseline khớp**, **0 thay đổi / 0 additions ngoài artifact task**, gồm backend/src, frontend/src/tests, docs và package/locks. **3.856 historical evidence files** nguyên vẹn. Artifact/report FIX trước cũng khớp checksums riêng; không sửa working tree ngoài harness/evidence/report mới. Dist được build lại, thêm compiled compatibility test runner; không sửa source ứng dụng hoặc test source lịch sử.

| Source/artifact giữ nguyên | SHA-256 |
|---|---|
| liveProvider.ts | `52a4e971608a5d663e1d87a3a94356925497d525de36ccb6d215c15bf418dd35` |
| provider.ts | `8e4ead59f206be166c1bb26d4b5d6f5a537a8c55dfad34a55744fc5b9edf137e` |
| ollamaReadiness.ts | `01ee551e8d4655bf3dbf6639b751d74353544531ae8a91b2d58b989de3b4ac4c` |
| AgentService/SYSTEM | `b3deaf407cb86167fc63ac846a2eda4821128f5318c8178b133866fd8ed8d36e` |
| V2 APPROVED | `0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e` |
| V2 lock | `f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706` |

Không sửa model/tag/quantization, prompt/schema/tools/validators, G1 provenance/recovery, AgentLimits, auth/consent/privacy, Planner/Catalog/Trip/Booking/pricing/Map/sentiment. Không truy cập PostgreSQL, không fixture hoặc DB fingerprint/cleanup mới (**N/A**), không migration/reset/seed/truncate. Không chạy V2/G2/Browser E2E, commit/push/deploy.

## 10. Kết luận nghiệm thu và trạng thái lỗi

| Điều kiện | Kết luận |
|---|---|
| Cold model được nhận diện đúng; không chat trước preparation | **PASS LIVE**, RC00 503, 0 POST |
| Chuẩn bị model minh bạch, tính đúng cap | **PASS**, một load-only có body/hash/deadline/ledger |
| Resident đúng tag/digest/context cho phép technical production request | **PASS LIVE**, original schema/runtime/service đúng |
| Không hidden inference/retry/unauthorized tool | **PASS trong phạm vi**, 2 POST, 1 model decision, 0 tool |
| Deadline/config/limits được giữ nguyên | **PASS source + offline regression**; không native timeout được kích hoạt |
| Native late-response/abort fault | **NOT RUN LIVE**; offline PASS, không mở thêm POST |
| Source/benchmark/history | **PASS** |
| **P1 TAI03B-B1-01** | **OPEN** — unsupported smoke không đánh giá missing-slot/tool routing hoặc sửa điểm V2 |
| **P2 readiness/deadline runtime** | **OPEN** — guard LIVE acceptance đạt nhưng watchdog/stale memory vẫn có; native abort/stability chưa nghiệm thu rộng |
| Map P2 | Giữ OPEN, không điều tra/sửa |

Task controlled check hoàn tất PASS theo phạm vi; không tuyên bố AI Agent hoàn chỉnh, NLU production-ready hoặc GPU runtime ổn định dài hạn.

## 11. Quy trình chuẩn bị local demo

1. Operator kiểm source/hash, principal/quota hợp lệ, exact model/digest pin, service loopback và GPU/RAM; GET version/tags/ps. Không chỉ dựa vào version 200. API ps cung cấp residency/context tại thời điểm đọc, không guarantee generation. [Ollama ps API](https://docs.ollama.com/api/ps).
2. Đã resident đúng digest/context/expiry: bỏ preparation. Chưa resident: cần **ngân sách POST được duyệt riêng cho demo tiếp theo**, có body/hash/ledger và deadline operator rõ ràng, rồi chỉ một load-only theo quy trình này. Hai POST task hiện tại đã hết, không tự dùng lại.
3. Xác minh lại GET ps đúng **16384**, tag/digest, RAM/VRAM sau load. Chưa ready thì dừng, không gửi chat để thử cold-load hoặc tự retry. Không bypass readiness, đổi principal, tăng application timeout hoặc restart GPU/service để có PASS.
4. Giữ application timeout 15s. Keep-alive request lần này là 5 phút, không thay server default. Sau idle/expiry phải kiểm lại; GET không tự preload. Không giữ model vô hạn hoặc phát heartbeat inference ngầm. Cần load mới thì phê duyệt/count riêng, không có auto-unload POST ngoài budget.
5. Readiness 503 là trạng thái vận hành, raw NLU **NOT EVALUATED**. Timeout/network phải giữ đúng lỗi, không biến thành clarify. Ghi model decision/schema/service outcome độc lập; một unsupported smoke không thay benchmark. Nếu warning tiếp diễn hoặc latency vượt contract, lưu evidence và đề xuất runtime task riêng.

## 12. NEXT TASK PLAN — đề xuất, chưa thực hiện

**`T-AI-04-G1-SERVER-COMPLETENESS-POLICY-FIX`**, dependency: chủ dự án duyệt kết quả controlled check và chốt server-first policy/origin accounting trước khi sửa.

- Rà soát/reuse validated current-slot assessor trong grammar hẹp đã có; phân biệt **SUPPORTED_INCOMPLETE / COMPLETE / UNDETERMINED / UNSUPPORTED** theo evidence/contract. Không mở rộng grammar hoặc tin client history để lấp slot.
- Với current intent được chứng minh nhưng thiếu required: đề xuất deterministic clarification trước provider, đúng missing set, zero LLM/zero tool; ghi `decisionOrigin=SERVER` và raw NLU NOT EVALUATED. COMPLETE/UNDETERMINED phải có policy rõ, không giả unsupported/complete để tránh model. Chốt ảnh hưởng quota/consent/authorization trước code.
- Giữ original schema/allowlist/required fields, G1 execution gate, typed recovery và lỗi backend/readiness/timeout; raw invalid model vẫn FAIL dù UX recovery tốt. Không dùng default/model inference để hoàn thiện thiếu adults/budget/transportation; không Trip/Booking mutation.
- Offline tests cho omitted-one/multi, unset/negation/contradiction, valid plan/search, natural prose/unknown, unsupported/injection, stale/cross-account history, origin metrics, quota/readiness order và no-tool/no-LLM paths; giữ historical assertions/evidence và báo compatibility cụ thể. Build + regression + integrity trước báo cáo.
- **Không mặc nhiên cấp inference mới từ NEXT PLAN**. Nếu cần LIVE revalidation, khóa case mới/expected/body/POST cap và owner approval trong task riêng sau FIX; V2/G2/Browser/DB E2E tiếp tục ngoài phạm vi. P2 GPU watchdog/stability cần điều tra riêng có kiểm soát, không gộp runtime config/timeout/model change vào completeness FIX.

Đã dừng sau báo cáo. Không tự thực hiện NEXT TASK hoặc gửi thêm POST.
