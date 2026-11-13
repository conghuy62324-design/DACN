# T-AI-04-G2-RAW-CLARIFY-CONTROLLED-DIAGNOSTIC

Lượt LIVE **10/11/2026,23:49–23:50 Asia/Ho_Chi_Minh**. **Kết luận: NEEDS_MORE_EVIDENCE_CANDIDATE_NOT_SUPPORTED_FOR_PRODUCTION_FIX.** Đã chạy đúng **5 native POST =1 load-only +4 genuine inference**,0 retry. **A:1 PASS/1 FAIL; B:1 PASS/1 FAIL**. Q01 natural correction: cả hai variant clarify transportation sai expected; Q02 labeled update: cả hai trả plan_trip đúng. **Không quan sát cải thiện của candidate B trong hai pair này.**

Actual request-body control **2/2 PASS**; G2 history **8/8 PASS**, LIVE safety **4/4 PASS**, schema/runtime **4/4 PASS**. Có **2 fake read-only marker executions**, không Planner/Catalog/PostgreSQL. Regression68/79/61/42/52 và backend build PASS; original legacy145/36 giữ nguyên. **P1/P2 OPEN**, historical L03 raw FAIL không đổi. Không apply candidate vào production hoặc đề xuất FIX từ kết quả này.

## 1. Approval và POST budget

[Owner approval nguyên văn](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/owner-approval.txt), [approval/baseline hashes](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/approval-and-baseline.json). Quyền chỉ cho diagnostic tối đa05 POST local:01 conditional operator load-only,04 inference,0 retry; không production edits/DB/frontend. Không kế thừa ngân sách còn dư của task trước.

Đã đọc/đối chiếu Investigation, G2 LIVE Multi-turn, G2 Verified History, G1 Natural Proof và exact proposed diff/candidate/proposal/review checksums. Source/contract/candidate lịch sử khớp seal. Candidate được owner cho phép **chỉ trong trusted test-only provider wrapper**, không phải production approval.

| Budget | Approved cap | Actual |
|---|---:|---:|
|Operator load-only|1 nếu nonresident|1|
|Genuine inference|4|4|
|Total native POST|5|5|
|Retry/hidden warm-up/heartbeat|0|0|

## 2. Exact A/B manifest

[Manifest](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/manifest.json) / [lock](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/manifest-lock.json) khóa lúc **23:46:09.637**, trước mọi POST. SHA-256:

`3407f487fdf2c4a417798c6f4a2e50bf63486ca1a9107db47ca170f3eaca854d`.

Manifest chốt exact messages/actions/fresh UUID requestIds, revisions, required values/states, expected raw/gate/tool counts, order, body hashes, SYSTEM hashes, options, principal/quota, cap và stop/scoring. Session IDs do server tạo thật lúc start; continue dùng ID/latest revision từ actual HTTP response. Không request/history/expected V2 hoặc historical L03 được phát lại.

Required args chung, expected raw cho **cả bốn** inference:

```json
{"kind":"tool","name":"plan_trip","arguments":{"departureCity":"Bắc Giang","destinationCity":"Hòa Bình","startDate":"2058-07-10","endDate":"2058-07-12","adults":4,"totalBudget":9100000,"transportation":"motorbike"}}
```

Setup **độc lập cho mỗi pair**, cùng approved principal:

1. START: `Lập lịch trình; Nơi xuất phát: Bắc Giang; Điểm đến: Hòa Bình; Ngày bắt đầu: 2058-07-10; Ngày kết thúc: 2058-07-12; Số người lớn: 4; Ngân sách cả nhóm: 9100000 VND` →revision1, transport OMITTED, missing transportation.
2. UNSET: `Tôi hủy phương tiện, giữ thông tin còn lại.` →revision2, transport UNPROVEN, missing transportation.
3. Positive SET/inference theo order đã duyệt; repeat cùng SET trong cùng session cho variant thứ hai, với fresh UUID/latest revision.

| Order native inference | Case | Exact current request | SYSTEM |
|---:|---|---|---|
|1|Q01-A|`À đổi sang xe máy, giữ thông tin còn lại.`|Original|
|2|Q01-B|`À đổi sang xe máy, giữ thông tin còn lại.`|Candidate|
|3|Q02-B|`Phương tiện: motorbike`|Candidate|
|4|Q02-A|`Phương tiện: motorbike`|Original|

Mọi expected giữ nguyên sau raw. Semantic scoring: exact kind/name/seven required values; city NFC/case/whitespace theo contract, chỉ harmless optional defaults hiện có được phép. Thực tế raw tool không thêm optional args. No raw/timeout sẽ là semantic NOT EVALUATED + reliability failure, không fake PASS; task này không có no-raw/timeout.

## 3. Verified request-body differences

[Pre-POST proof](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/pre-post-controlled-body-proof.json), [actual dispatch proof](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/actual-controlled-body-proof.json). Trước native dispatch, exact body bytes phải bằng locked file. `actual-body-Q01-A/B.json`, `actual-body-Q02-B/A.json` lưu **body thật mà provider dispatch**, không chỉ template.

Trong từng pair, thay `messages[0].content` bằng cùng sentinel rồi deep-equal toàn bộ body: **PASS2/2**. Tool/schema suffix của SYSTEM không đổi; chỉ policy khác. Model/options/roles/order/current text/structured server slots đều giống. Normalized-body hashes:

| Pair | Order | Actual normalized body SHA-256 |
|---|---|---|
|Q01|A→B|`3764d98209c1fb9b699620ddc7526c7803113ab265044501114291fa74363e6d`|
|Q02|B→A|`d3b2407ff8d09a712811ca267555bcd88a524a97bd7c4501e0dd3f009a0b3acd`|

| Variant hash | SHA-256 |
|---|---|
|A original G2 provider SYSTEM|`0beed4a7afece45a586fe52f2094f1cca4e460b3cabe389f34c0e206faca0600`|
|A wire SYSTEM + tools/schema|`76e1aa153284ef953685d1f2289dc788ac2e962b763c0a3404495268459632a0`|
|B exact approved candidate provider SYSTEM|`0f89b8b983601a9e84b6826b6de04d7fbeef01c094d9c1156b54f75cf2ea981d`|
|B wire SYSTEM + same tools/schema|`01fd91dcbc221a48c40c2c3fed9cdb7337bf65265a00b851529308dfa03fc286`|

Provider input từ production AgentService vẫn là original SYSTEM ở cảA/B. Wrapper server-side chỉ thay SYSTEM bằng exact candidate file cho case B; messages/tools giữ nguyên, không client variant flag, không source/provider patch. Native messages luôn **system → user SERVER_VERIFIED_SLOTS → user current**. Không nâng user slot values lên privileged system.

Q01 body-budget expressions A/B: **11290/11561 bytes**; Q02 A/B: **11264/11535**, đều≤12288 gồm512 safety overhead, không gọi đó là token count. B thêm271 bytes/59 reported prompt tokens. Không đổi input limit/context để chạy được candidate.

## 4. Preflight, principal và quota

[Initial](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/preflight-initial.json), [run](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/preflight-run.json), preparation và four per-case preflights đều **PASS**. Kiểm source/compiled/candidate/G1/G2/V2/body hashes trước dispatch; provider readiness GET version→tags→ps thật trước mỗi inference.

| Kiểm tra | Actual |
|---|---|
|Endpoint|`http://127.0.0.1:11434`, native ollama PID20468, loopback listener|
|Ollama/model|0.40.16, `qwen3:4b-instruct-2507-q4_K_M`,4.0B/Q4_K_M|
|Installed/resident digest|`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`|
|Local-only|No proxy env/Node hook/remote model metadata, redirects error, không Cloud/Gemini; không OS-wide packet capture|
|G2 enable|`AGENT_G2_MODE=local-demo` chỉ trong authorized test process; không `.env`/website/global enable|
|Settings|JSON,stream false,temp0,ctx16384,predict2048,application15000ms,concurrency1|
|Before run resources|RAM free2432/16202MiB; RTX4060/driver560.94,total8188MiB,VRAM free5695MiB; model nonresident|
|Pending/readiness|Provider pending0; resident exact digest/context/expiry trước mỗi LIVE; không eviction|

Same approved principal lấy từ historical E04-B source; hash **`6b982d095bc6bc30c87955cd38c78afa9ef31d3447ef30f62e8684bbe8bce600`**. Không đổi principal hoặc thêm account để inference. Locally issued JWT đi qua tokenService/auth middleware thật; synthetic name/email không vào model, không DB login/account E2E.

Ledger đọc **cả `at` và `createdAt`**, chọn timestamp mới nhất nếu có cả hai: **70 historical attempts,0 recent/future-dated,20 slots trước run**. Chốt trước **8 chat turns +2 revoke cleanup normal turns +1 conditional operator conservative entry =11**. Mọi deterministic turn consume quota bình thường. Một default AgentLimits instance xuyên suốt, không reset/bypass; source counter theo one-hour window, harness bổ sung conservative rolling ledger/hydration.

Actual normal consumption **10/20**, còn10 theo counter; operator **ngoài AgentLimits** và được tính thêm conservative entry riêng. Sau run **11 recent conservative entries, còn9/20**. Native `ollama-attempt-*` không bị đếm đôi với normal `attempt-*`. Không gọi thêm để kiểm429 hoặc giữ model nóng.

## 5. Model preparation và native POST ledger

Model nonresident nên dùng đúng một operator empty-prompt `/api/generate`, locked JSON/options/ctx16384/keep_alive **5m**, operator deadline **60000ms**, không thay application15s. HTTP200,done true,done_reason load,response rỗng; wall **10238,78ms**. Token count load-only không được báo, không gọi là NLU inference.

| POST intent (+07) | Case / endpoint | Exact body SHA-256 |
|---|---|---|
|23:49:49.463|OP-LOAD /api/generate|`4e86b724bb5567dfb08b8f53807c4423e2de86a7fd48e56ddd125431d8e76c01`|
|23:50:12.283|Q01-A /api/chat|`59c2266962d0e073cbedb5b546aaef6116cafc1f9516ba8c645fa6cf8e896916`|
|23:50:22.967|Q01-B /api/chat|`ef65b4846d822764b3c82735aac320c220d411f20ed0d63cfb6c4859cf1c59bb`|
|23:50:33.588|Q02-B /api/chat|`20af0bc069a68b40c361c63f77f071b3f092a189444799323cf819d85bd80086`|
|23:50:44.511|Q02-A /api/chat|`cf25e35417bfa03aa2b743c80f56818a21ae5ae9ab5d200ead5f1189827533c7`|

Native intents được ghi trước dispatch. [Native log audit sau regression](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/native-count-after-regression.json) xác nhận **5 GIN POST rows**,1 generate+4 chat, không thêm POST từ tests. No hidden warm-up, second load, heartbeat/retry/model change. Cap đã tiêu hết.

## 6. Four raw LIVE responses

[Results](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/results.json) và individual case/native-response files giữ unmodified response trước fallback. Cả4 **HTTP200**,done true/stop,valid JSON/original DECISION_SCHEMA/Ajv/parseDecision/runtime,provider boundary RETURNED,origin MODEL.

| Case | Exact native raw content | Raw semantic | Gate / marker count |
|---|---|---|---|
|[Q01-A](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/case-Q01-A.json)|`{"kind":"clarify","fields":["transportation"]}`|**FAIL**|NOT_APPLICABLE model clarify /0|
|[Q01-B](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/case-Q01-B.json)|`{"kind":"clarify","fields":["transportation"]}`|**FAIL**|NOT_APPLICABLE model clarify /0|
|[Q02-B](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/case-Q02-B.json)|Exact plan_trip JSON bên dưới|**PASS**|ALLOW /1|
|[Q02-A](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/case-Q02-A.json)|Exact plan_trip JSON bên dưới|**PASS**|ALLOW /1|

Q02-B và Q02-A đều có raw content nguyên văn giống nhau:

```json
{"kind":"tool","name":"plan_trip","arguments":{"departureCity":"Bắc Giang","destinationCity":"Hòa Bình","startDate":"2058-07-10","endDate":"2058-07-12","adults":4,"totalBudget":9100000,"transportation":"motorbike"}}
```

Q01 API200/needs_input là **unnecessary model clarification**, không provider failure hoặc backend completeness fallback. Q02 API200/completed chỉ là production Orchestrator với fake executor marker; không nhận đã tạo itinerary/cost/Catalog thật. Không modify output,argument repair hoặc autoconvert clarify thành completed.

## 7. Variant A vs B

| Pair | A raw | B raw | Quan sát |
|---|---|---|---|
|Q01 natural correction, A→B|FAIL|FAIL|Cả hai hỏi lại transportation dù snapshot complete SETmotorbike|
|Q02 labeled update, B→A|PASS|PASS|Cả hai đúng plan_trip/full required args|
|**Variant totals**|**1 PASS/1 FAIL**|**1 PASS/1 FAIL**|**Không observed improvement**|

Tổng raw **2 PASS/2 FAIL/0 NOT RUN/0 NOT EVALUATED**, không cộng4 deterministic PASS vào denominator NLU. Safety PASS không biến Q01 raw thành PASS. Kết quả thuộc phương án B có failure và không phân biệt A/B; **không duyệt candidate như production FIX**.

## 8. G2 state, revision và safety

[Actual state/lease evidence](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/actual-controlled-body-proof.json), individual case files. Hai server-owned sessions khác nhau, same authenticated owner, cùng itinerary nhưng setup riêng; không client history/proof seeding.

| Pair | Server ID | Absolute expiry (+07) |
|---|---|---|
|Q01|`f8185274-ddf5-4112-a931-f169775d0345`|**11/11/2026 00:04:40.461**|
|Q02|`bb648d21-6a79-4a8f-ab3a-663fe88cb2bd`|**11/11/2026 00:05:24.498**|

Mỗi pair revision **1 incomplete→2 explicit unset→3 SET first variant→4 repeat SET second variant**. TTL15 phút không đổi hoặc reset. Current request IDs đều fresh locked UUID, không replay bypass. Transport source revision tăng3→4 nhưng value/states identical, snapshot gửi model không có revision/UUID/TTL/owner. Vì vậy repeatSET không thay native required data; difference SYSTEM-only được kiểm bằng actual bytes.

START transport **OMITTED**, UNSET **UNPROVEN**, không có prior car SET trong hai sessions mới này; không diễn giải chúng thành đã hủy một car value thật. LIVE provider chỉ được gọi khi all seven required **SET**,transport motorbike. Q01 clarify không xóa/overwrite slots. Nonmatching hypothetical car decisions trên current owned leases đều **NEEDS_INPUT transportation**, không ALLOW; đây không phải wrong-car raw do model sinh.

Deterministic **4/4 PASS**, mỗi turn HTTP200/needs_input transportation,0 provider/readinessGET/nativePOST/tool, origin SERVER_COMPLETENESS ở START và VERIFIED_HISTORY_COMPLETENESS ở UNSET, raw NOT EVALUATED. LIVE history4/4 và safety4/4 PASS;2 marker executions đúng provider raw/original gate,0 unauthorized mutation/second tool/stale-value execution.

Auth anonymous401 và privacy200/no-store/versionLOCAL_DEMO_SLOTS_V1/TTL900 đều PASS; acknowledgment đi qua real validated body. Consent store false là MOCK_ONLY; không behavioral data. Provider bodies không JWT/name/email/principal/session ID. Sau bốn inference, **hai DELETE revoke qua HTTP auth PASS**,normal quota2,sessions0 trước dispose; không state cleanup DB. Không claim global JWT logout hoặc frontend integration.

## 9. Runtime, tokens và GPU

[Analysis](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/analysis.json), raw `ollama-response-*` và [filtered native log](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/native-log-window.json).

| Case | Agent HTTP ms | Provider ms | Native body ms | Ollama total ms | Prompt / cached / output tokens |
|---|---:|---:|---:|---:|---|
|Q01-A|5813,91|5790,21|1366,54|1355,18|2344 /0 /12|
|Q01-B|5814,10|5789,90|1162,10|1149,59|2403 /113 /12|
|Q02-B|6022,01|6002,43|1468,56|1456,84|2397 /2386 /76|
|Q02-A|6327,80|6307,46|1699,09|1687,27|2338 /2327 /76|

Totals **9482 prompt /176 output**,4826 cached là phần prompt, không cộng thêm. Cached metric từ actual `prompt_eval_cached_count`. Short clarify12 tokens là complete valid JSON, không output cap2048. Context16384 và provider byte budgets không bị vượt; không có evidence truncation.

Provider/HTTP latency gồm readiness và synchronous body/source/hash/resources observations của harness **trong actual15s deadline**, không nhận phần chênh lệch là thời gian model. **0 timeout/abort/pending provider**; tất cả dưới15s, không giả lập timing để PASS. Không có live timeout nên không claim đã kiểm GPU cancellation hiệu quả trong run này.

Live snapshots: RAM free **1319–1888MiB**,VRAM used **7239–7257MiB**,free **701–719MiB**,GPU utilization **30–95%**; không continuous peak profiling. Native log offload **37/37 layers**,model/KV GPU allocation, `/api/ps` sau run size=size_vram5102307901 bytes,ctx16384,expiry23:55:46.452+07. Không suy ra toàn bộ compute100%GPU từ ratio/layers.

**0 watchdog/free-memory warnings trong recorded run window hiện tại.** Đây là một run không warning; không đủ bằng chứng đóng historical runtime P2, không chứng minh hết lỗi intermittent. Không thay quant/GPU flags/context/timeout hoặc unload để che pressure. Không gán semantic Q01 failure cho GPU chỉ từ RAM/VRAM samples.

## 10. Failure analysis

**CONFIRMED:** Q01-A và Q01-B đều nhận same full valid SET snapshot/motorbike nhưng trả cùng unnecessary clarify. B exact candidate đã tới native provider; body/control/hash bằng chứng không cho thấy “B chưa được dùng” hoặc missing-slot serialization. Original validators/gate vẫn cho correct motorbike tool, như Q02 và offline baseline; service không tạo/repair decision.

**Candidate cụ thể này không đủ để đạt Q01 acceptance.** Kết quả không hỗ trợ triển khai nó như một FIX chữa raw clarify. Điều này không chứng minh mọi formulation source-policy đều vô ích hoặc textual ambiguity G1/G2 trước đó không tồn tại; chưa đủ dữ liệu chọn causal mechanism.

Q01 dùng Vietnamese natural `À đổi sang xe máy...`, Q02 label/enum literal `Phương tiện: motorbike`; outcome tương quan với hai wording probes. **HYPOTHESIS** cần điều tra: positive correction phrasing/alias-to-enum, interaction giữa current wording và structured snapshot, hoặc prompt example/source salience. Parser đã chứng minh field đúng và JSON đã gửi motorbike, nên không gọi đây là parser mất slot. Không tự đổi current input thành full plan, sửa args hoặc ép tool để che FAIL.

Không observed provider HTTP/parse/schema/deadline fault. Source-policy scope thay đổi không làm raw Q01 khác; không có intervention isolating từng từ,language form hoặc caching internals, nên không xác nhận nguyên nhân sâu.

## 11. Interpretation và causal limitations

**NEEDS_MORE_EVIDENCE.** A1/2=B1/2, không positive controlled treatment effect trong sample; B FAIL Q01, nên không đề xuất `T-AI-04-G2-RAW-CLARIFY-FIX` từ evidence này.

Trong mỗi pair native request chỉ đổi SYSTEM; order được cân bằng A→B/B→A. Revision/state-value confounding đã kiểm và không có trong model body. Tuy nhiên runtime order,model prefix caches và thời gian không thể giữ tuyệt đối bằng nhau. Across pairs wording khác chủ đích, không coi cross-pair difference là single-variable causal proof. Mỗi cell chỉ một inference, không retry/statistical repeat.

Không lấy Q02 thuận lợi để chọn B/cherry-pick hoặc cộng baseline historical L03 vào denominator. Historical L03 **RAW FAIL**, previous G2 LIVE3/1,32 investigation checks giữ nguyên. G1 V2 score/manifest/history/expected không bị viết đè. Không full Agent acceptance, tool fidelity, frontend-ready hay durable production-ready claim.

## 12. Offline regression sau diagnostic

[Execution](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/final-verified/execution.json), [additional results](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/additional-offline-results.json), case-level baseline comparison trong analysis. Native network guard/LIVE disabled trong child tests; không real11434/external/DB. Harness copied byte-identical từ approved baseline; original assertions/case bodies không đổi.

| Suite | Actual PASS/FAIL/NOT RUN | Isolated downstream PASS/FAIL |
|---|---|---|
|G2|**68/0/0**|—|
|Natural Proof|**79/0/0**|—|
|Compatibility|**61/0/0**|—|
|Correction|**42/0/0**|—|
|Completeness|**52/0/0**|—|
|Readiness/abort|32/1/0|33/0|
|Diagnostics|8/5/0|13/0|
|MissingSlotRecovery|13/20/0|33/0|
|SlotFillingPrompt|11/10/0|21/0|
|G1SafeContract|26/0/0|26/0|
|DecisionRouting|10/0/0|10/0|
|DecisionFormatSafety|17/0/0|17/0|
|Foundation original mixed-intent|17/5/0|17/5|
|Transport|18/1/0|19/0|
|F applicable|23/0/0|23/0|
|Frontend conversation unit|10/0/0|10/0|
|**Original181 total**|**145/36/0**|**176/5**|
|Foundation single-intent control, riêng|**22/0/0**|Không assessor/gate stub|
|Backend build|**PASS**,trước manifest và sau LIVE|—|

Original/readiness/diagnostic names/status khớp sealed baseline, **0 changed statuses**. Historical31 server-first assertion conflicts+5 mixed-intent fixtures không được đổi thành PASS; downstream stub chỉ kiểm isolated layer, không full production E2E. Foundation22 control dùng real gate/synthetic catalog, không DB fidelity. Historical F original vẫn dừng ở unsafe completed expected vs needs_input, log/expected giữ nguyên, ngoài23 applicable.

Offline regression kiểm source gốc không đổi và safety/contracts, **không chứng minh candidate NLU quality**. Candidate chỉ ở LIVE test wrapper, không áp vào production. Frontend build/Browser/fullV2/real Planner/Catalog/PostgreSQL E2E **NOT RUN**, ngoài scope.

## 13. Source/benchmark/evidence integrity

[Before](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/integrity-before.json) / [after](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/integrity-after.json): **5329 protected files khớp**,0 source/original-test/historical evidence changes. Đồng thời kiểm prior5293 baseline files,34 sealed investigation artifacts+report và84 compiled modules: PASS. [Final seal](evidence/t-ai-04-g2-raw-clarify-controlled-diagnostic/artifact-checksums.json) khóa report/evidence task này. Existing dirty working tree được giữ; generated dist/build/audit runners không là application source edits.

| Contract giữ nguyên | SHA-256 |
|---|---|
|G1 SYSTEM literal|`85929a1ddb7339c68251b34fd075fc3cf793b4dbdc8606cb674aa7cb8266dd8d`|
|G1 wire SYSTEM/tools/schema|`5902945e22dfe3b9b3432c669125daf4d7929fbfd5a330ffce0581fc62c4fe1f`|
|AgentService source|`67d67b5ef92b66c81692586bb713bade5cbfa2fffa102e233aa4c4482731cb07`|
|LiveProvider source|`52a4e971608a5d663e1d87a3a94356925497d525de36ccb6d215c15bf418dd35`|
|VerifiedHistory source|`a835b9781684fd5b759be461e56d6d0fc4034797b96eb0c3018754230ff8bd78`|
|Original schema canonical JSON|`e0a6bb4504283028a07114a6960618e7b0ffbd4662a0d3a4f56d277f5bf46840`|
|Tool wire metadata|`a6a6ca6a5ff44f0454531c48b15859c9f67db5c3350b559727d7529003aa7c1c`|
|V2 APPROVED|`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`|
|V2 lock|`f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706`|

All11 relevant source hashes và production/candidate cohort hashes nằm trong analysis/manifest. V1/V2/locks/candidate/diff/evidence cũ nguyên vẹn; không auth/consent/limits/schema/proof/Planner/Catalog/Trip/Booking/pricing/Map change. **PostgreSQL0 attempts**,không fixture,DB cleanup/fingerprint **N/A**,không migration/seed/reset/truncate. Không commit/push/deploy,không frontend/global G2 enable. Test process đã dừng, sessions đã xóa, không apply candidate.

## 14. P1/P2 status

| Issue | Status |
|---|---|
|TAI03B-B1-01 P1 raw NLU|**OPEN**; historical L03 FAIL giữ nguyên, new Q01-A/B false clarification|
|G2 source-scope ambiguity|**CONFIRMED textual observation**, candidate chưa cho improvement; không nhận đã FIX|
|Runtime P2|**OPEN**; current window0 warnings/4 under-deadline không đủ đóng historical intermittent issue|
|Budget grammar observations P2|**OPEN/untouched**,integer9100000 fixture không dùng hai rejected surfaces|
|Map P2/VI14/frontend/durable-state limits|**OPEN/unchanged**,không điều tra task này|

Source/history/safety/runtime contracts đạt trong phạm vi đã chạy; **raw diagnostic không đạt4/4 acceptance**. Không có quyền tăng cap hoặc thử candidate khác để lấy PASS.

## 15. NEXT TASK PLAN — chưa thực hiện

Do B FAIL Q01 và A/B không phân biệt improvement, **không đề xuất triển khai RAW-CLARIFY-FIX lúc này**. Đề xuất **`T-AI-04-G2-NATURAL-CORRECTION-AND-ENUM-INVESTIGATION`**, offline/read-only trước:

1. **Dependency:** owner review immutable four bodies/raw,actual only-SYSTEM proof,quota/native ledger và kết luận no observed improvement. Không xem candidate đã được production-approved từ quyền diagnostic.
2. **Offline investigation scope:** đối chiếu exact current natural correction vs labeled enum wording, snapshot/type/field representation, positive/negative transport examples và interaction instruction sources. Phân loại confirmed/likely/hypothesis, dùng existing evidence/pure checks; không sửa parser/prompt/gate hoặc giả model output như LIVE. Không suy wording là sole root chỉ từ hai pair.
3. **Independent acceptance:** giữ model raw tool requirement khi full verified proof; preserve missing/unproven/conflict hỏi lại,old values blocked,auth/consent/rate/privacy/one-tool,G1 unchanged,origin/raw scoring tách. Không autoconvert clarify hoặc synthesize tool để che failures. Giữ natural-language usability goal, không nhận “label-only works” là full Agent acceptance.
4. **Nếu cần phép đo tiếp:** đề xuất variable riêng như wording/alias/enum presentation với fresh independent inputs/expected và exact bodies; owner duyệt **ngân sách POST mới** trước chạy. Cả5 native POST của task này đã dùng hết, không retry/historical L03/V2 tuning hoặc carry-over. Readiness/resources/rate/TTL phải kiểm lại, không dùng timestamps như reservation.
5. **FIX/frontend gate:** chỉ đề xuất minimal production FIX khi có evidence ủng hộ phương án và owner tiếp tục chấp thuận; sau đó full offline regression + separately approved LIVE revalidation. Frontend/logout/V2/full product fidelity vẫn là scope riêng.

**Dừng sau báo cáo. Không additional inference,không production FIX,candidate rollout,frontend hoặc task tiếp theo.**
