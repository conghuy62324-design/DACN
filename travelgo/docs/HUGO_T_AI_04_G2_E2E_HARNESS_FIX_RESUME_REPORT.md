# T-AI-04-G2-E2E-HARNESS-FIX-AND-RESUME

Ngày **11/11/2026**, Asia/Saigon. **PHASE_A_PASS**; desktop E01 và mobile E07 đã hoàn tất Browser → Agent → Ollama → real Catalog → PostgreSQL, **cả hai PASS** trong phạm vi search đã khóa. **1 load-only +2 inference =3/3 native POST**, không retry/hidden warm-up. PostgreSQL **25/25 bảng unchanged, Trip27/27**, source/benchmark/evidence cũ nguyên vẹn. Planner vẫn thiếu dữ liệu; **P1/P2 OPEN**.

**SEARCH_LIVE_E2E_RESULT_RECORDED / PLANNER_E2E_BLOCKED_DATA_READINESS**

## 1. Baseline và phạm vi

Đã đọc đầy đủ bốn báo cáo được giao và diagnosis/proposed patch/manifest/results-reviewed/data-readiness của lượt cũ. Baseline giữ nguyên:6 LIVE checks PASS,H01 harness FAIL,0 native POST; E01/E07 cũ NOT RUN; Planner blocked; frontend49/74,backend68/79/61/42/52; legacy145/36. [Owner task](evidence/t-ai-04-g2-e2e-harness-fix-resume/owner-task.txt) cấp ngân sách **mới**, không kế thừa cap cũ. Không production edits,benchmark edits,fixture,DB mutation,V2 LIVE hoặc deploy.

## 2. Harness root cause và review patch

Hàm cũ chỉ thay khi toàn bộ string là token, vì vậy URL reset vẫn chứa literal `$desktop.id`. Frontend đã gửi server-created ID đúng. Giữ nguyên run/500/evidence gốc. Proposed `replaceAll` đã review nhưng có nguy cơ thay substring không phải token; chọn [binding.cjs](evidence/t-ai-04-g2-e2e-harness-fix-resume/binding.cjs): complete lexical tokens, recursive value binding giữ numeric types, explicit URL component encoding, unresolved/nested token reject. Không lấy client UUID làm session ID. [Review/derivation](evidence/t-ai-04-g2-e2e-harness-fix-resume/harness-review.json), [runner](evidence/t-ai-04-g2-e2e-harness-fix-resume/run-live.cjs), [preparation](evidence/t-ai-04-g2-e2e-harness-fix-resume/prepare-harness.cjs).

## 3. Offline acceptance

[12 independent checks](evidence/t-ai-04-g2-e2e-harness-fix-resume/binding.test.cjs), [log](evidence/t-ai-04-g2-e2e-harness-fix-resume/binding-acceptance-02.log): **12 PASS/0 FAIL**. Whole value,absolute URL/path,reset/revoke,start/continue,UUID uniqueness/replay,server-ID binding,unknown token,wrong endpoint/method/body/client ID,template hash,encoding và partial-substring cases đều được kiểm. Exact method/path/body,template hash,canonical bound-body hash,raw body hash evidence,native exact bytes và compiled hashes vẫn giữ.

## 4. Dry integration và PHASE A gate

Actual React/Vite → local HTTP Express → production router/auth/Agent/store/reset/revoke, fake provider/consent,in-memory sessions. [Dry results](evidence/t-ai-04-g2-e2e-harness-fix-resume/dry-02/results.json): **5/5 PASS** gồm start,continue,reset,foreign-owner revoke404,owned revoke200/session removed. Reset giữ ID/expiry và tăng revision2→3; fake provider không được gọi. [Gate](evidence/t-ai-04-g2-e2e-harness-fix-resume/phase-a-gate.json): **PHASE_A_PASS**,0 Ollama POST,0 PostgreSQL connections,source/history integrity PASS.

Lượt offline ban đầu bị sandbox chặn Vite/esbuild đọc thư mục cha,0 app checks; [log](evidence/t-ai-04-g2-e2e-harness-fix-resume/dry/vite-live.log) và [initial gate](evidence/t-ai-04-g2-e2e-harness-fix-resume/phase-a-gate-initial.json) giữ nguyên. Các boolean integration trong initial gate mô tả planned coverage,không phải measured PASS; [erratum](evidence/t-ai-04-g2-e2e-harness-fix-resume/offline-environment-initial.json) phân loại **NOT RUN**. Chạy lại offline trong fresh dry-02 với quyền đọc phù hợp,không đổi production/expected. PHASE B chỉ bắt đầu sau final gate PASS.

## 5. Resume manifest và setup

[Manifest](evidence/t-ai-04-g2-e2e-harness-fix-resume/manifest.json) SHA-256 **3141dbc12f4b372a4f750a7109ede47b9ca6bc3d3e4695efb7ddaa2d53aa544c**, [lock](evidence/t-ai-04-g2-e2e-harness-fix-resume/manifest-lock.json). Tham chiếu manifest cũ/hash và6 PASS đã đo; exact E01/E07 cases/native bodies/scoring giữ nguyên. Native hashes: E01 **62248fcef049971375e3746e53c970a636a41aff29891399050291e5f66c86f8**, E07 **9a0c16488e40675e17d7d6c5cbbbfb3442c6b4d2ad8fdc4fae436ce931a72680**.

Old process/session đã dispose. D01/D02 là prerequisite duy nhất để có server-owned desktop ID/revision2; reset đưa revision3 để E01 continue đúng manifest cũ. Đây là setup bắt buộc,không retry inference cũ (cũ0). Không replay negative checks đã PASS. D-END/M-END chỉ cleanup owned memory sessions. Chuỗi **7 main Agent quota turns +1 conservative operator entry**, secondary LIVE0.

## 6. Quota,TTL,auth/consent preflight

[Preflight](evidence/t-ai-04-g2-e2e-harness-fix-resume/preflight-initial.json) **PASS_READONLY_AND_GET_ONLY**. Cùng principal SHA **6b982d095bc6bc30c87955cd38c78afa9ef31d3447ef30f62e8684bbe8bce600**; scanner đọc cả `at`/`createdAt`, lấy timestamp mới nhất,scan tất cả historical attempts gồm4 main turns cũ; không dùng timestamp cũ như quota hiện tại. Run cũ đã ngoài rolling hour. Bốn main dry turns cùng principal được **tính bảo thủ thêm**,không loại khỏi ledger: recent4,còn16,đủ8. Sau LIVE:4 dry+7 main+1 operator=12 recent,còn8. Default20/h không reset/đổi account/bypass; AgentLimits process hydrate historical entries bảo thủ.

G2 TTL15 phút absolute,session IDs chỉ nhận response server; reset/continue không kéo dài expiry. Desktop ID **a53e5df4-777d-4bb9-9441-b629d1bcf1d2**,revision1→2→3→4,expiry **2026-11-11T02:34:38.743Z**. Mobile ID **36ede36d-1f4d-4345-a68d-2ee34b5da035**,revision1,expiry **2026-11-11T02:35:11.527Z**. Trước mỗi inference kiểm remaining TTL>90s,chain<15min,providerPending0,readiness và quota.

**Authenticated test session qua test-signed JWT/production authenticate**,không real-login E2E; approved UUID không có DB account,không tạo account hoặc đọc password. GET /auth/me chiếu signed test claims. Agent và consent read thật. G2 opt-in và exact LOCAL_DEMO_SLOTS_V1 acknowledgement bằng click thật; telemetry-consent panel chưa có decision được giữ nguyên,không click lưu vì sẽ ghi DB.

## 7. Ollama/model preflight

GET version/tags/ps,loopback listener process ollama,local-only/no proxy/cloud và exact digest đều PASS. Model **qwen3:4b-instruct-2507-q4_K_M**,digest **0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0**,endpoint127.0.0.1:11434. Initial nonresident; conditional load-only theo exact body/deadline60000ms đã duyệt trả200/done_reason=load/response empty; không technical probe hay second load.

JSON mode,stream false,temp0,num_ctx16384,num_predict2048,application deadline15000ms,concurrency1 giữ nguyên. [Before-model](evidence/t-ai-04-g2-e2e-harness-fix-resume/preflight-before-model.json), [E01 readiness](evidence/t-ai-04-g2-e2e-harness-fix-resume/preflight-E01.json), [E07 readiness](evidence/t-ai-04-g2-e2e-harness-fix-resume/preflight-E07.json), [model-ready](evidence/t-ai-04-g2-e2e-harness-fix-resume/model-ready.json). Model resident exact16k trước cả hai inference; pending0,không eviction trong chuỗi. Verification ở URL/env/process/metadata/log scope,không OS-wide packet capture.

## 8. Database safety và current Catalog readiness

Exact **travelgo_ai_m0_test**,configured127.0.0.1:5432,sentinel **hugotravel-isolated-test-database-v1**,**12/12 migration checksums**,schema fingerprint match baseline. [DB guard](evidence/t-ai-04-g2-e2e-harness-fix-resume/db-preflight.json), [read-only harness](evidence/t-ai-04-g2-e2e-harness-fix-resume/readonly-db.cjs):startup/per-connection default_transaction_read_only=on,verify READ ONLY trước queries,SELECT/SHOW SQL guard;0 forbidden query. Role **postgres là superuser**,không least-privilege. Không thay grants/role/schema. Server internal Docker IP hiện172.18.0.3/32 (lượt trước .2); DB identity/sentinel/schema/migrations và25 table contents vẫn khớp.

[Fresh direct-service snapshot](evidence/t-ai-04-g2-e2e-harness-fix-resume/data-readiness.json) được đo trước inference,deepEqual exact expected cho cả hai budgets. **HuGo Seafood350000 VND,HuGo Riverside Hotel1200000 VND**. Snapshot readiness tách biệt khỏi actual tool E2E PASS. Không seed/migrate/truncate hoặc sửa Trip/Booking/user.

## 9. Native POST ledger

| Entry | Endpoint | HTTP | Count | Kết quả |
|---|---|---:|---:|---|
| OP-LOAD | /api/generate,empty prompt |200|1|done_reason=load,empty response|
| E01 | /api/chat |200|1|Exact raw search tool|
| E07 | /api/chat |200|1|Exact raw search tool|
| Tổng | | |**3/3**|0 retry,0 hidden warm-up|

`ollama-attempt-*` ghi trước dispatch,`ollama-response-*` giữ native raw/envelope/body SHA/resources/timing. [Final audit](evidence/t-ai-04-g2-e2e-harness-fix-resume/native-final-audit.json) đối chiếu server.log window **3 POST**,2 chat+1 generate,không phát sinh thêm sau regression. Sau cap chỉ cleanup memory/read-only audit; không gọi model thêm hoặc unload bằng POST.

## 10. Desktop E01 LIVE

Viewport **1440×900**,actual React/Vite3354→Express3355→production router/auth/Agent/provider/schema/gate/search executor→Catalog/PostgreSQL,**không Playwright route mocking**. Exact input: “Tìm địa điểm; Điểm đến: Đà Nẵng; Ngân sách mỗi người mỗi ngày: 462000 VND”. Fresh request UUID,continue ID/revision3; HTTP200 completed/revision4. Raw exact search_places/Đà Nẵng/462000;original schema/runtime valid,gate ALLOW,**1 actual read tool**,2 additional DB queries,exact Catalog result rendered. [Case](evidence/t-ai-04-g2-e2e-harness-fix-resume/case-E01.json), [screenshot](evidence/t-ai-04-g2-e2e-harness-fix-resume/E01.png).

## 11. Mobile E07 LIVE

Emulated **390×844**,không physical device. Exact input: “Tìm địa điểm; Điểm đến: Đà Nẵng; Ngân sách mỗi người mỗi ngày: 638000 VND”. G2 acknowledgement và fresh start UUID;server ID mới/revision1; HTTP200 completed. Raw exact search_places/Đà Nẵng/638000;schema/runtime valid,gate ALLOW,**1 actual read tool**,2 additional DB queries;hai place names/prices và Catalog warning render. [Case](evidence/t-ai-04-g2-e2e-harness-fix-resume/case-E07.json), [screenshot](evidence/t-ai-04-g2-e2e-harness-fix-resume/E07.png).

## 12. Raw NLU và scoring tách lớp

| Case | Browser/UI | Raw NLU | G2 History | Safety | Real Tool Fidelity | Runtime |
|---|---|---|---|---|---|---|
| E01 | PASS | PASS | PASS | PASS | PASS | PASS |
| E07 | PASS | PASS | PASS | PASS | PASS | PASS |

Native JSON trước fallback được parse bằng original schema/Ajv/parser/runtime validator và đối chiếu exact expected;review độc lập deepEqual raw decision/arguments,không repair output. **2 raw PASS/0 FAIL**,5 deterministic responses **NOT EVALUATED raw NLU**. Không lấy completeness hoặc direct Catalog readiness cộng vào raw/fidelity. [Reviewed results](evidence/t-ai-04-g2-e2e-harness-fix-resume/results-reviewed.json) giữ riêng từng lớp và native raw.

## 13. Verified History,lifecycle và Safety

Authenticated principal bind qua production owned store;server-created IDs/latest revisions,fresh request UUIDs vàcurrent-turn proof ghi SET destination/daily budget đúng. E01 intent search mới chỉ giữ2 search slots,không carry stale Planner budget/date/transport. Reset clear slots thật,giữ replay/absolute expiry. D-END/M-END revoke đúng owned session;final **0 active sessions,0 serialized travel bytes**,2 security-only start tombstones/1 owner epoch còn theo bounded TTL,không phải chat persistence/JWT revocation.

Mỗi inference ALLOW duy nhất1 read-only search tool;không unauthorized/stale execution/DB write. Ownership-negative revoke dry404 có evidence riêng. Natural15min expiry,replay/cross-owner negatives,logout/reload/G1 switch/in-flight races **NOT RUN LIVE trong resume**;6 kiểm tra lịch sử vàoffline regressions vẫn giữ độc lập. Không nhận resume đã mở rộng coverage sang các mục đó.

## 14. Real Catalog/UI fidelity

Actual executor output=locked fresh direct-service output=API result=rendered names/prices. Seafood **350.000 ₫**,Riverside **1.200.000 ₫**;cảnh báo giá catalog không phải booking quote giữ nguyên. Không fake place/price/itinerary hoặc Booking mutation. DOM assertions kiểm exact names,formatted prices,no horizontal overflow;mobile screenshot thấy rõ hai cards. Desktop full-page screenshot có fixed navbar che một phần tên card tại vị trí chụp;DOM checks PASS nhưng **không claim pixel-perfect/unobstructed screenshot**. Không sửa production CSS ngoài scope.

## 15. DB fingerprint và cleanup

[Before](evidence/t-ai-04-g2-e2e-harness-fix-resume/fingerprint-before.json), [after LIVE](evidence/t-ai-04-g2-e2e-harness-fix-resume/fingerprint-after.json), [after regression](evidence/t-ai-04-g2-e2e-harness-fix-resume/fingerprint-final.json), [final compare](evidence/t-ai-04-g2-e2e-harness-fix-resume/fingerprint-final-compare.json): **25/25 unchanged**,changed=[],Trip**27→27**. Before hiện tại cũng khớp fingerprint-final lượt cũ. Current identity/readonly/schema được kiểm lại,không tái dùng historical fingerprint làm phép đo mới.0 fixture/DB mutation/SQL cleanup;chỉ dispose memory,đóng đúng browser/backend/Vite child. Final port check3352/3354/3355 không còn listener.

## 16. Runtime và P2

| Case | Native POST ms | Provider wall ms | Browser turn ms | Prompt / cached / output tokens |
|---|---:|---:|---:|---|
| E01 | 1303.0 | 3974.1 | 4113 | 2294 / 0 / 32 |
| E07 | 813.3 | 3261.6 | 3391 | 2294 / 2236 / 32 |

Load-only **11842.0ms**,không tính là inference. Provider wall gồm readiness và synchronous harness integrity/resource checks trước native dispatch;nên không trộn với native latency. E07 có2236 cached prompt tokens,không hidden warm-up. No timeout/deadline/abort,pending0. Initial free RAM2521/16202MiB,VRAM5898/8188MiB;after E07 RAM1785MiB,VRAM1076MiB;model offload37/37 layers,16k context. [Runtime log](evidence/t-ai-04-g2-e2e-harness-fix-resume/native-log-window.json),[final audit](evidence/t-ai-04-g2-e2e-harness-fix-resume/native-final-audit.json).

Log có INFO waiting-for-runner “llm server error” trong authorized load vàcontext16384 nhỏ hơn training262144;load sau đó thành công. Không terminal load/GPU allocation failure,watchdog/timeout/abort trong window quan sát. Hai lượt search thành công **không đủ đóng P2 runtime lịch sử**;không đổi model/GPU flags/context/timeout để lấy PASS.

## 17. Regression/build và lỗi runner offline

| Suite | Actual kết quả mới |
|---|---|
| Frontend G1/G2 unit | **10/10 +39/39 PASS** |
| Mocked browser | **74/74 PASS**,desktop37/mobile37;0 skip/flaky/retry;MOCK_ONLY |
| Backend G2/Natural/Compatibility | **68/68,79/79,61/61 PASS** |
| Execution Correction/Completeness | **42/42,52/52 PASS** |
| Original legacy181 | **145 PASS/36 FAIL**,từng tên/status khớp baseline |
| Downstream isolated controls181 | **176 PASS/5 FAIL**,không production-policy PASS |
| Readiness/diagnostics | **32/1 và8/5** actual;controls**33/0 và13/0**,giữ historical conflicts |
| Foundation single-intent control | **22/22 PASS**,original17/5 giữ nguyên |
| Historical F unmodified | Exit1 fail-fast như baseline,không suy total PASS |
| Backend/frontend build | **PASS/PASS** |

[Comparison](evidence/t-ai-04-g2-e2e-harness-fix-resume/regression-comparison.json),[full execution](evidence/t-ai-04-g2-e2e-harness-fix-resume/final-verified/execution.json),[frontend units](evidence/t-ai-04-g2-e2e-harness-fix-resume/frontend-unit-final.json),[mock browser raw](evidence/t-ai-04-g2-e2e-harness-fix-resume/browser-01/results.json),[boundary audit](evidence/t-ai-04-g2-e2e-harness-fix-resume/offline-boundary-audit.json). Các offline Node processes kế thừa deny-native/PG connect guard;49 audit files ghi0 forbidden network/PG connect. Final server log xác nhận0 additional native POST,DB fingerprint không đổi.

Hai lỗi preparation mới được giữ raw evidence: (1) Foundation control ban đầu dừng EEXIST vì tôi copy sẵn file mà write-once runner sẽ tự sinh;giữ copy riêng rồi chạy lại **chỉ Foundation control**,unchanged assertions,22 PASS,hash derived fixture khớp baseline. [Observation](evidence/t-ai-04-g2-e2e-harness-fix-resume/foundation-runner-observation.json),initial status FAIL nằm nguyên trong additional-offline-results. (2) Windows tái sử dụng PID làm audit filename va chạm tại npm bootstrap;giữ log,đổi **chỉ filename** thànhPID+UUID. Browser vẫn exit0,74 PASS/errors0. [Observation](evidence/t-ai-04-g2-e2e-harness-fix-resume/audit-filename-observation.json). Không biến lỗi runner này thành production hoặc raw NLU FAIL/PASS.

## 18. Integrity và P1/P2

[Before](evidence/t-ai-04-g2-e2e-harness-fix-resume/integrity-before.json)/[after](evidence/t-ai-04-g2-e2e-harness-fix-resume/integrity-after.json): **6267 protected files unchanged**,changed=[],old report/evidence/manifest/benchmark vàoriginal tests giữ nguyên;84 compiled modules hash-match. Source production changes0;chỉ thêm report/evidence/test harness ở task mới. Build/derived test outputs nằm generated dist. [Artifact seal](evidence/t-ai-04-g2-e2e-harness-fix-resume/artifact-checksums.json) khóa report vàartifacts mới. Working tree đã có nhiều thay đổi từ trước,không claim clean Git tree/không revert chúng.

**H01 FIXED/OFFLINE+LIVE VERIFIED**. **TAI03B-B1-01 P1 raw NLU OPEN**,search2/2 không chứng minh natural correction multi-turn đã hết lỗi. **P2 runtime OPEN**,budget grammar/Map/VI14/T13-B untouched. Candidate SYSTEM B không apply. Không production rollout/commit/push/deploy,V2 inference hoặc Planner fixture.

## 19. Remaining Planner blocker và NEXT TASK PLAN

Đà Nẵng hiện0 eligible attraction/tour;fresh inventory giữ14 loader records,search public hotel/restaurant có data nhưngkhông đủ sightseeing cho Planner. **E02 completed Planner vàE03–E06 NOT RUN/BLOCKED_DATA_READINESS**;không tạo giả itinerary,không thay input sang city test để đạt PASS.

Đề xuất **T-AI-04-PLANNER-TEST-DATA-READINESS**: review current catalog eligibility/proof vàthiết kế data cần thiết cho original Planner scenarios;chủ dự án phải duyệt riêng trước mọi fixture/write,exact test DB scope,ID/FK ledger/cleanup/fingerprint vàmanifest review nếu cần thay data/input. Task hiện tại không thực hiện bước này,không tự mở V2 LIVE hoặc cap khác. **Dừng sau báo cáo.**
