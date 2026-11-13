# T-AI-04-G2-RAW-CLARIFY-INVESTIGATION

Ngày **10/11/2026**, Asia/Ho_Chi_Minh. **OFFLINE_INVESTIGATION_COMPLETE; causal root cause: NEEDS_MORE_EVIDENCE.** Tái dựng đúng L03 và request bytes đã khóa; không phát hiện mất slot, stale-state serialization, provider fallback, schema rejection hoặc timeout trong lượt này. Có **scope ambiguity đã xác nhận** giữa chỉ dẫn G1 current-only và supplement G2 verified slots; đây là candidate contributor cần đối chứng, **chưa phải nguyên nhân model đã chứng minh**.

**32/32 kiểm tra offline PASS**, regression **68/68 G2,79/79 Natural Proof,61/61 Compatibility,42/42 Correction,52/52 Completeness PASS**. MOCK_ONLY không chứng minh NLU thật. **0 native Ollama GET/POST,0 inference/preload/unload,0 PostgreSQL,0 production/original-test changes.** L03 raw FAIL và baseline LIVE **3 PASS/1 FAIL**, safety4/4, lifecycle13/13 giữ nguyên. P1/P2 vẫn OPEN.

## 1. Evidence manifest và phương pháp

Đã đọc bốn baseline reports được yêu cầu: [G2 LIVE](HUGO_T_AI_04_G2_LIVE_MULTI_TURN_VALIDATION_REPORT.md), [G2 Verified History](HUGO_T_AI_04_G2_VERIFIED_HISTORY_REPORT.md), [G1 Natural Proof](HUGO_T_AI_04_G1_NATURAL_LANGUAGE_PROOF_FIX_REPORT.md), [Compatibility/V2 Readiness](HUGO_T_AI_04_G1_COMPATIBILITY_V2_READINESS_REPORT.md); đối chiếu source hiện tại và artifacts thực tế theo manifest, không suy đoán tên raw file.

[Evidence manifest](evidence/t-ai-04-g2-raw-clarify-investigation/evidence-manifest.json) ghi đường dẫn/size/SHA-256 của reports,11 source files, manifest/lock, cases A01/A02/D05/L01–L04, four body/attempt/response/preflight sets, measurements, runtime log, harness và V2. [Owner task](evidence/t-ai-04-g2-raw-clarify-investigation/owner-task.txt) giữ nguyên phạm vi read-only. Harness mới chỉ thêm trong evidence folder.

Nguồn LIVE không đổi:

| Artifact | SHA-256 |
|---|---|
| Execution manifest | `ece39130dfa59acfa7694fac5197c7d3a3e125dd790db622ffb279f594e67c80` |
| L03 exact body | `fb89433dd525fb78b9cc9ab00cea903d8e22743ed8986585aeb5bd7a40d4d986` |
| L03 raw decision text | `dada3c67b3bf2209296f45ddad48e54119fd2fc72f82fe4a98e6a9fdbe5ef349` |
| L03 native envelope text | `96f7fa9611fe9da5bdb8afd05dd1ee4b7aba7bd9f5f0d576611ba943a3ed67d3` |

[Inspection harness](evidence/t-ai-04-g2-raw-clarify-investigation/inspect-evidence.cjs) so native envelope→raw→provider boundary→HTTP, exact wire/system/messages với locked body và source. [Source locations](evidence/t-ai-04-g2-raw-clarify-investigation/source-locations.json) ghi line/text/hash. Không gửi lại request; hardware/runtime observations dưới đây đều từ **historical evidence**, không phải đo máy/model hiện tại.

## 2. Exact L03 reconstruction

[Reconstruction đầy đủ](evidence/t-ai-04-g2-raw-clarify-investigation/l03-reconstruction.json) và [original body](evidence/t-ai-04-g2-live-multi-turn-validation/body-L03.json).

| Bước | Bằng chứng thực tế |
|---|---|
| Authenticated request | Message: **`Đổi sang xe máy, giữ các thông tin còn lại.`**; cùng approved principal/session của run, G2 acknowledgement `LOCAL_DEMO_SLOTS_V1`; không client history |
| Session ID | `c83bc6b9-7d49-4156-89f5-44c87f70f69a`, server-created tại A01; UUID này không nằm trong model body |
| Revision trước request | **5**, sau D05; transport UNPROVEN, value cũ car đã bỏ; other fields giữ SET |
| Current proof | `readPendingTurnProof` nhận positive correction và SET `transportation:"motorbike"`; không tự lấy tool name/args từ model |
| Merged state trước provider | Revision **6**, intent plan_trip, **7/7 required SET**, missing[]; budget8200000, other values đúng |
| Completeness | Nhánh incomplete của G2 không chạy; gọi model đúng contract. G1 current-only assessor riêng không phải authority của merged G2 state |
| Native request | JSON mode/stream false/temp0/ctx16384/predict2048; exact body SHA khớp manifest/attempt/response |
| Provider/raw | HTTP200, valid JSON/schema, provider RETURNED đúng native content, origin MODEL |
| Service/gate |200 needs_input transportation; **không gọi tool gate** vì raw là clarify;0 executor |

Structured user-role message thực tế:

```json
{"type":"SERVER_VERIFIED_SLOTS","intent":"plan_trip","values":{"departureCity":"Thái Bình","destinationCity":"Lạng Sơn","startDate":"2053-09-18","endDate":"2053-09-20","adults":3,"totalBudget":8200000,"transportation":"motorbike"},"states":{"departureCity":"SET","destinationCity":"SET","startDate":"SET","endDate":"SET","adults":"SET","totalBudget":"SET","transportation":"SET"}}
```

Thứ tự đúng ba messages:

1. **system**: unchanged G1 SYSTEM + static G2 supplement + original AGENT_TOOLS metadata + original DECISION_SCHEMA text.
2. **user**: JSON SERVER_VERIFIED_SLOTS ở trên, backend serialize từ owned lease.
3. **user**: exact current message L03, không nối lại full itinerary hoặc raw prior chat.

Không assistant message, owner/revision/expiry/requestId/source revisions/old UNPROVEN được gửi trong structured snapshot. D05 không gọi provider và **nguyên văn D05 không xuất hiện trong request L03**. Static SYSTEM vẫn chứa ví dụ G1 “chưa chọn phương tiện”, giống cả bốn lượt; không nhầm ví dụ này với textual D05 history.

Exact raw native response content:

```json
{"kind":"clarify","fields":["transportation"]}
```

`parseDecision()` nhận đúng object này; G2 branch trả needs_input trực tiếp trước `turn.check()`. Không MODEL_REJECTED_RECOVERY, không service tự đổi tool thành clarify. Old-car check ghi tại L03 là **hypothetical gate probe**, trả NEEDS_INPUT transportation, không phải một raw car decision của model. Không sửa raw hoặc baseline expected plan_trip.

## 3. L01–L04 comparison

[Comparison máy đọc](evidence/t-ai-04-g2-raw-clarify-investigation/l01-l04-comparison.json) giữ source-slot revisions, bodies, traces và measurements.

| Lượt | Current wording | Verified differences / revision | Actual raw | Marker tools |
|---|---|---|---|---:|
|L01|`Chọn ô tô, giữ các thông tin còn lại.`|car,budget7600000;2→3|plan_trip đúng|1|
|L02|`Ngân sách cả nhóm: 8200000 VND`|car,budget8200000;3→4|plan_trip đúng|1|
|L03|`Đổi sang xe máy, giữ các thông tin còn lại.`|motorbike,budget8200000;5→6 sau unset|clarify transportation, **semantic FAIL**|0|
|L04|`Đổi điểm đến thành Hà Giang, giữ các thông tin còn lại.`|motorbike,budget8200000,destinationHà Giang;6→7|plan_trip đúng|1|

**Constant axes:** model/tag/digest, same system/tools/schema bytes, system→user slots→user current,7 SET required fields, JSON/options/timeout. No per-case role/order mismatch. L04 giữ transportation từ **source revision6** và sinh motorbike đúng; raw clarify L03 không làm mất slot.

**Không phải causal A/B:** current wording/values/prefix cache/order/time khác nhau. L04 cũng có “Đổi” mà PASS, nên không thể kết luận mọi correction wording đều bị clarify. L02 không lặp đủ slots vẫn PASS, nên không thể kết luận model luôn bỏ qua server snapshot. L04 sinh enum motorbike đúng, loại trừ một cấm đoán cứng enum đó trong source/schema. Chưa đo độ lặp lại, wording interaction hoặc native cache correctness bằng inference mới.

## 4. Prompt/role/source precedence

[AgentService](../backend/src/services/agentService.ts), các vị trí chính **21,35,42,215,219**:

- Rule2 G1: đối chiếu required fields với tin nhắn user **HIỆN TẠI**.
- Dòng35: field không được nhắc tới cũng là thiếu, ví dụ phải clarify transportation khi bỏ phần phương tiện.
- Dòng42: client history không chứng minh required fields; thiếu trong tin nhắn hiện tại phải hỏi lại.
- Supplement G2 sau SYSTEM: `Riêng required fields, dùng các giá trị SET trong bản này cùng yêu cầu hiện tại`; backend đã áp dụng correction/invalidation.

**CONFIRMED:** current-only rules được giữ nguyên trong G2, không được scope trực tiếp thành “chỉ G1”; supplement cho phép verified-state source nhưng không nói rõ nó thay phạm vi ba rules trước hoặc rằng omission trong short correction khác với missing trong merged snapshot. Đây là **scope ambiguity/surface tension**, không tự khẳng định một logical contradiction bắt buộc hoặc quy tắc model chắc chắn ưu tiên đoạn trước/sau.

**LIKELY contributor để kiểm đầu tiên:** yêu cầu làm rõ khi missing có nhiều nhấn mạnh/ví dụ, còn source exception G2 nằm ở supplement. Nó có thể góp phần vào conservative clarification. Counterevidence rõ: **cùng prompt đã PASS3/4**. Chưa có controlled comparison để gán causal root hoặc đảm bảo prompt adjustment sẽ chữa L03.

**Role/order:** structured slots là user-role data trước current user text, intentional để tránh biến user values thành privileged system instructions. Thứ tự này có thể tương tác với wording/attention (**HYPOTHESIS**), nhưng không có evidence L03 bị serialized sai. Không nâng raw slot/city values lên system hoặc đổi trust boundary để thử một cách tùy tiện.

## 5. Schema, provider và runtime

Original plan_trip required: **departureCity,destinationCity,startDate,endDate,adults,totalBudget,transportation**; transport enum **car/motorbike**. Original DECISION_SCHEMA root anyOf có clarify/tool/unsupported; clarify cho phép field transportation. Ajv/parser kiểm cấu trúc và allowlist, **không so clarify field với G2 current state**. Vì vậy both correct plan_trip và unnecessary clarify đều valid schema. Đây là semantic necessity gap đã xác nhận, không phải validator đang chấp nhận unknown tool hoặc thiếu required args.

Ollama request dùng **`format:"json"`**, DECISION_SCHEMA chỉ được thêm vào system text; không phải native schema-format decoder đã collapse trong các task cũ. Clarify-first schema text, ví dụ clarify transportation hoặc shorter completion có thể ảnh hưởng selection (**HYPOTHESIS**), không có decoder/internal evidence để xác nhận. Không đổi branch order/schema/allowlist trong task này.

[liveProvider](../backend/src/agent/liveProvider.ts) giữ current message last, original schema/parser/runtime trước return. [provider](../backend/src/agent/provider.ts) giữ deadline. Các dữ liệu L03:

| Check | Actual historical L03 |
|---|---|
| Provider input byte-budget expression | **11293/12288**, còn995 bytes, gồm512 safety overhead; không phải model-token count |
| Prompt/output tokens | **2344 /12**, output cap2048, context16384 |
| Completion | done true, done_reason **stop**, assistant content valid/complete JSON |
| HTTP/provider |200/RETURNED; provider4228,05ms, native Ollama total401,58ms, application15s |
| Trace |readiness_verified→inference→provider_completed; không deadline_triggered/abort/request rejection |

**RULED_OUT trong observed path:** enforced application input/output budget, output truncation/limit, HTTP/provider error, timeout hoặc parser/recovery rewrite đã tạo clarify này. Không suy từ đó rằng mọi lỗi native implementation đều đã được loại trừ. Mọi body token/context settings vẫn giống L01/L02/L04.

Native GPU warnings xuất hiện lúc **21:53:57.400** trong shared load trước cả bốn requests; L03 không có L03-specific fault/deadline. Cached prompt tokens L01/L02/L03/L04: **0/2272/2283/2234**; successful L02/L04 cũng dùng cache. **Không có direct support** cho GPU/cache gây riêng semantic L03, cũng chưa có thử nghiệm đủ để loại trừ unobserved numerical/cache defects. Runtime P2 vẫn OPEN. Không đọc service/GPU hiện tại, không preload/unload hoặc GET readiness trong investigation.

## 6. Confirmed findings

[15 findings](evidence/t-ai-04-g2-raw-clarify-investigation/findings-and-hypotheses.json) phân loại riêng: **7 CONFIRMED,1 LIKELY,3 HYPOTHESIS,4 RULED_OUT**. Đây là số findings, không phải số model cases.

Các facts quyết định:

1. Raw L03 thật là unnecessary clarify; model boundary/service không thay nội dung.
2. Server đã SET đúng motorbike và gửi full required proof; D05 cũ không được truyền lại.
3. Scope ambiguity G1/G2 có thật trong same SYSTEM; causal effect chưa đo.
4. Schema/runtime chấp nhận clarify hợp lệ allowlist nhưng không biết nó có cần thiết từ merged state hay không; service xử lý fail-safe,0 tool.
5. Correct motorbike tool đi qua unchanged validators/gate được trong fake-provider checks; clarify không tự ghi lại slots hoặc kích hoạt tool.
6. GPU warnings chung và hai budget false negatives có evidence riêng; không lấy chúng làm causal explanation L03.

## 7. A–H hypotheses và giới hạn kết luận

| Giả thuyết yêu cầu | Phân loại | Kết luận evidence |
|---|---|---|
|A — supplement chưa rõ source|CONFIRMED textual ambiguity; causal HYPOTHESIS|Có permit SET nhưng chưa reconcile trực tiếp original current-only rules|
|B — G1/G2 instruction tension|CONFIRMED observation; LIKELY contributor, chưa proven root|Ưu tiên đối chứng source policy;3 successes ngăn kết luận sufficient cause|
|C — role/order khiến hiểu slot chưa xác nhận|HYPOTHESIS|Role/order identical4/4; per-case construction anomaly RULED_OUT|
|D — stale metadata sau unset|RULED_OUT cho transmitted old state|L03 values motorbike/SET; không UNPROVEN,prior revision hoặc D05 text trong model request|
|E — wording/construction khác|CONFIRMED wording difference; causal HYPOTHESIS|Đổi transport khác Chọn/label/destination; settings/serialization không drift; không controlled|
|F — schema/prompt encourage over-clarify|CONFIRMED structural permissiveness; causal HYPOTHESIS|Schema không enforce necessity; text bias chưa chứng minh, JSON mode vẫn valid tools3/4|
|G — JSON/truncation/deadline/parse|RULED_OUT observed failure mechanisms|Full response,under-budget/under-deadline,raw unchanged|
|H — GPU semantic effect|HYPOTHESIS, không direct evidence|Warnings chung trước4 lượt; giữ P2, không gán causal từ timing alone|

Không thể xác nhận offline: why model selected this branch, attention/salience/decoding internals, reproducibility at temperature0, cache numerical correctness, hoặc hiệu quả candidate prompt. **Causal root/fix selection = NEEDS_MORE_EVIDENCE.** Không lấy model expected giả trong unit làm câu trả lời cho những câu hỏi này.

## 8. Independent offline checks

[Harness](evidence/t-ai-04-g2-raw-clarify-investigation/offline-checks.cjs) / [32-case results](evidence/t-ai-04-g2-raw-clarify-investigation/offline-results.json): **32 PASS/0 FAIL/0 NOT RUN**, direct network attempts0,PostgreSQL attempts0. Native fetch/http/https/net bị chặn trong process này, DB query/connect bị chặn. Synthetic principals/state chỉ nằm trong memory unit, không dùng allowance/principal LIVE để tạo attempt.

| Cases | Đã xác minh |
|---|---|
|O01–O04|Original four native decisions valid original schema/runtime; không chấm lại semantic PASS cho L03|
|O05|Real Orchestrator/store/provider serialization với **fake fetch + archived envelopes**: byte-identical four native bodies, fake GET12/fake POST4; zero network. Seven state turns/origins đúng, L03 vẫn needs_input0 tool|
|O06–O10|G1 current-only không tự thành history proof; pending reader chỉ chứng minh new motorbike; fresh2056 owned session complete/correction/unset→SET và zero-provider unset|
|O11–O14|Old car/budget/destination không execute; fake clarify trên complete state không autocompleted,slot contents giữ nguyên trước/after provider, origin MODEL|
|O15–O19|Partial/unknown mutation tool/children clarify rejected; conflict hỏi lại không model; valid client history không cấp state/proof|
|O20–O24|Auth/ack/consent/default20 normal deterministic quota/ownership giữ nguyên|
|O25–O28|G1 SYSTEM byte-identical/stateless/server-first; provider context không identity/token/session ID; structural schema không chứng minh clarify necessity|
|O29–O32|Independent budget observations và valid integer control; schema/tools/source/historical evidence intact|

O05 là **archived-output offline replay**, không phải phát lại request tới model. [Replay details](evidence/t-ai-04-g2-raw-clarify-investigation/offline-recorded-output-replay.json) đánh dấu mọi virtual transport MOCK_ONLY. O08/O09/O14 dùng itinerary **Nam Định→Tuyên Quang,2056-04-11→13,2 adults,6700000**, khác L03/V2; correct scripted outputs chỉ test khả năng parser/state/gate. Native NLU trong task này **NOT RUN**, baseline raw3/1 không thay đổi.

## 9. Budget grammar observations — độc lập

[Budget review](evidence/t-ai-04-g2-raw-clarify-investigation/budget-review.json), original grammar-limitations evidence và O29–O31 xác nhận:

| Input | Source mechanism / actual |
|---|---|
|Natural decimal correction `Đổi ngân sách cả nhóm thành 8,2 triệu, giữ các thông tin còn lại.`|Current amount helper nhân Number8.2 với1000000, được **8199999.999999999**; Number.isSafeInteger false, result undefined→UNPROVEN. Không có nghĩa mọi decimal đều hỏng|
|Labeled `Ngân sách cả nhóm: 8200000 VND.`|supportedSegments trim punctuation để recognize một copy, nhưng labeled extraction vẫn giữ final period; amount chỉ strip VND ở end và dùng anchored number regex nên reject→UNPROVEN|
|Control `Ngân sách cả nhóm: 8200000 VND`|SET exact integer8200000|

Source: [currentTurnProof](../backend/src/agent/currentTurnProof.ts), dòng39–64,259–260,268. Không sửa amount/parser/pricing. Hai forms fail closed và bỏ stale budget, không provider/tool. **Không phải causal L03:** L02 final locked input là integer control, L03 body có valid SET8200000; field model hỏi là transportation. Cần task parser riêng nếu owner muốn sửa, không ghép vào raw-clarify FIX.

## 10. Minimal FIX proposal — chưa áp dụng/chưa chọn là causal fix

Đề xuất **một candidate**, rank1 **G2-only required-source policy clarification**; đủ cơ sở thiết kế từ textual ambiguity, **chưa đủ evidence để chọn nó như một FIX đã chứng minh chữa L03**.

[Exact proposed diff](evidence/t-ai-04-g2-raw-clarify-investigation/proposed-g2-only-system.diff), [candidate system text](evidence/t-ai-04-g2-raw-clarify-investigation/g2-system-candidate-A.txt), [proposal/risk](evidence/t-ai-04-g2-raw-clarify-investigation/minimal-fix-proposal.json). Diff là **derived G2 SYSTEM artifact**, không patch đã apply vào source. Scope tương lai chỉ AgentService G2 builder/template và independent tests; **shared G1 SYSTEM literal phải giữ byte-for-byte**.

| Original G2 inherited instruction | Candidate G2-only replacement |
|---|---|
|Rule2 current user HIỆN TẠI|Required source là intent/values/states của current SERVER_VERIFIED_SLOTS, chỉ SET; không client/assistant/example/profile/default guessing|
|Dòng35 omission trong current text=missing|Omission trong short current text không là missing khi verified snapshot đã SET; absent/non-SET vẫn cần hỏi|
|Dòng42 current-only/historical restriction|Backend đã áp correction/invalidation vào snapshot; không phục hồi old/client values; actual unresolved conflict vẫn clarify|
|Supplement|Thêm rõ complete valid required SET/no unresolved conflict→đúng read tool; không hỏi lại chỉ vì current patch ngắn; gate vẫn authority|

Không xóa security instructions, không đổi roles/order/schema/validator/AGENT_TOOLS, không nhúng user slot values vào system, không nới authorization/consent/rate/mutation. Future implementation phải test anchors/scope, không dùng brittle replacement nếu source drift. Model-generated args không thành proof; original L03 expected giữ nguyên.

| Candidate measurement, offline only | Kết quả |
|---|---|
| Old G2 provider-system hash | `0beed4a7afece45a586fe52f2094f1cca4e460b3cabe389f34c0e206faca0600` |
| Candidate provider-system hash, **NOT APPROVED** | `0f89b8b983601a9e84b6826b6de04d7fbeef01c094d9c1156b54f75cf2ea981d` |
| Candidate wire hash, **NOT PRODUCTION** | `01fd91dcbc221a48c40c2c3fed9cdb7337bf65265a00b851529308dfa03fc286` |
| L01–L04 byte-budget expressions with candidate |11552,11539,11564,11581/12288; thêm271 bytes mỗi request; minimum headroom707 bytes|

Đây là serialization/byte-budget feasibility, **không token/latency/model-quality PASS**. Mọi fresh future input vẫn phải kiểm exact budget, không tăng context/timeout. Candidate tạo G2 cohort mới nếu sau này được dùng, không sửa G1 benchmark V2/score lịch sử.

**Không đề xuất workaround** tự đổi clarify thành tool/completed từ slots, ép tool branch, bỏ strict validation, sửa output hoặc nâng raw values thành privileged instructions. Đảo message order đơn thuần cũng chưa có causal basis; liveProvider hiện lấy last user message để classify missing-slot rejection, nên đổi order có tác động cần review riêng.

## 11. Independent acceptance plan

[20 scenarios](evidence/t-ai-04-g2-raw-clarify-investigation/independent-acceptance-plan.json), status **PROPOSED_FOR_SEPARATE_FIX_AND_OWNER_REVIEW**. Không chỉ dùng L03: fresh2056 offline reference và2058 candidate itinerary, new owned sessions/values/dates/budget.

| Nhóm | Acceptance độc lập |
|---|---|
|I01–I05|Complete session new correction; previously unset→new SET; reverse car/motorbike; budget/destination updates, giữ verified others; genuine model expected đúng tool khi complete|
|I06–I08|Missing/negative/conflicting/unproven proof hỏi exact fields,0 provider/tool khi G2 incomplete,raw NOT EVALUATED|
|I09–I11|Raw old transport/budget/destination không ALLOW,không sửa args; nếu model sinh sai vẫn raw FAIL|
|I12–I13|Fake clarify không autoexecute; independent counterparts L01/L02/L04 không regression; historical L03 expected và evidence không đổi|
|I14–I16|G1 literal/cohort/stateless unchanged; rich client history không proof; strict schema/type/required/extra/allowlist giữ|
|I17–I20|Auth/ownership/TTL/reset/replay/concurrency,consent/privacy,normal quota/readiness/15s/16k và origin/raw scoring tách riêng|

Task FIX tương lai cần68/79/61/42/52,181 actual+isolated controls,readiness/abort/diagnostics,Foundation22,backend build và integrity trên source cuối. Fake tool marker chỉ xác minh routing/gate, không Planner/DB fidelity. Không dùng same L03 retry như independent proof duy nhất.

## 12. Regression và integrity task hiện tại

[Targeted regression](evidence/t-ai-04-g2-raw-clarify-investigation/regression-summary.json) đọc existing compiled tests đã hash-match baseline, chỉ ghi output trong evidence mới; không rebuild/generate runner vào dist, không sửa original test/assertion.

| Suite | Lượt hiện tại PASS/FAIL/NOT RUN | Baseline lịch sử, không gộp |
|---|---|---|
| Investigation checks |**32/0/0**,MOCK_ONLY|Mới|
| G2 |**68/0/0**|68/0|
| Natural Proof |**79/0/0**|79/0|
| Compatibility |**61/0/0**|61/0|
| Correction |**42/0/0**|42/0|
| Completeness |**52/0/0**|52/0|
| Original181 / isolated controls |**NOT RUN**|Actual145/36; isolated176/5|
| Readiness/abort; diagnostics |**NOT RUN**|32/1,control33/0; diagnostics8/5,control13/0|
| Foundation single-intent22; backend build |**NOT RUN**|22/0; build PASS ở sealed LIVE baseline|
| LIVE/model/Browser/PostgreSQL |**NOT RUN**|Không inference allowance còn lại từ task trước|

Không rerun broad legacy/build khi không đổi source/prompt/validator: targeted checks đã giải quyết câu hỏi investigation và84 compiled modules giữ exact hash của build baseline. Không báo inherited PASS như lần chạy mới, không bỏ36 historical FAIL hoặc gọi downstream stub là production E2E. Regression có ephemeral HTTP tests MOCK_ONLY theo suite gốc; **không native Ollama/external/DB**.

[Before](evidence/t-ai-04-g2-raw-clarify-investigation/integrity-before.json) / [after](evidence/t-ai-04-g2-raw-clarify-investigation/integrity-after.json) và [final seal](evidence/t-ai-04-g2-raw-clarify-investigation/artifact-checksums.json) kiểm source/frontend/docs/package locks, prior167 sealed artifacts+report, prior5124 protected files và84 compiled modules: **không thay đổi**. Bảng hashes đầy đủ ở evidence manifest; không claim working tree clean.

| Contract hash, không đổi | SHA-256 |
|---|---|
| G1 SYSTEM literal |`85929a1ddb7339c68251b34fd075fc3cf793b4dbdc8606cb674aa7cb8266dd8d`|
| G1 wire SYSTEM/tools/schema |`5902945e22dfe3b9b3432c669125daf4d7929fbfd5a330ffce0581fc62c4fe1f`|
| G2 production wire cohort |`76e1aa153284ef953685d1f2289dc788ac2e962b763c0a3404495268459632a0`|
| Original schema canonical JSON |`e0a6bb4504283028a07114a6960618e7b0ffbd4662a0d3a4f56d277f5bf46840`|
| Tool wire metadata |`a6a6ca6a5ff44f0454531c48b15859c9f67db5c3350b559727d7529003aa7c1c`|
| V2 APPROVED |`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`|
| V2 lock |`f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706`|

Model identity theo **historical** approved tag `qwen3:4b-instruct-2507-q4_K_M`, digest **`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`**; không khảo sát current installation/residency hoặc claim re-hash model binary trong task này. Không thay model/quant/context/timeout, env/global source/auth/consent/Planner/Catalog/Trip/Booking. DB fingerprint/fixtures/cleanup **N/A**, không truy cập PostgreSQL. Không commit/push/deploy.

## 13. P1/P2 và điều kiện đóng

- **TAI03B-B1-01 P1 OPEN:** historical L03 semantic FAIL vẫn giữ. 32 fake/pure checks không chữa raw model decision, baseline LIVE vẫn3/1.
- **Runtime P2 OPEN:** native watchdog/free-memory warnings có thật nhưng causal role L03 chưa chứng minh; không chạy runtime mới.
- **Budget observations P2 OPEN:** mechanisms đã xác nhận, độc lập; chưa parser FIX.
- **Map P2/VI14/production durability/frontend limitations:** giữ nguyên, ngoài investigation.

Investigation được hoàn tất với boundaries và uncertainty rõ ràng. **Chưa đủ causal evidence để tự chọn/triển khai production FIX như một cách chữa đã kiểm chứng.** Có cơ sở kỹ thuật để review G2-only instruction candidate và thiết kế phép đối chứng; không có cơ sở autocompleted/loosening gate hoặc đóng P1.

## 14. NEXT TASK PLAN — diagnostic trước, FIX có điều kiện

Đề xuất **`T-AI-04-G2-RAW-CLARIFY-CONTROLLED-DIAGNOSTIC`**, chưa được thực hiện. [Exact proposal](evidence/t-ai-04-g2-raw-clarify-investigation/controlled-diagnostic-proposal.json) và [review checksums](evidence/t-ai-04-g2-raw-clarify-investigation/proposal-review-checksums.json) **không phải owner approval hoặc LIVE manifest lock**.

1. **Owner dependency:** review finding levels, G2-only diff/risk/byte budget, independent expectations; duyệt exact future manifest/body hashes và **ngân sách mới tối đa5 native POST =4 genuine inference +1 conditional load-only**. Task trước đã dùng hết5; task investigation này dùng0, không kế thừa quota/permission cũ.
2. **Controlled variable:** variant A original G2 SYSTEM; B candidate scoped source policy. Model/options/roles/order/current message/verified snapshot/schema/timeout giống nhau trong từng pair. Hai pairs cân bằng **Q01 A→B, Q02 B→A**, không retry. Không production source edit trong diagnostic; trusted test-provider wrapper có variant server-side, không public bypass flag.
3. **Independent input:** Bắc Giang→Hòa Bình,2058-07-10→12,4 adults,9100000,motorbike. Mỗi pair tạo owned session incomplete transport, explicit unset, rồi SET correction. Q01 natural `À đổi sang xe máy, giữ thông tin còn lại.`; Q02 labeled `Phương tiện: motorbike`. Expected cả4 inference đúng plan_trip/full args. SET repeated cho variant thứ hai có fresh UUID/latest revision; provider snapshot không chứa revisions nên within-pair native body chỉ đổi SYSTEM. Các setup turns0 inference vẫn consume quota, dự kiến8 normal turns+operator entry bảo thủ; phải recompute ledger thời điểm chạy.
4. **Preflight/stop:** same approved principal, scan at+createdAt/normal AgentLimits/TTL; exact source/benchmark/model/digest/loopback/no proxy/resources/resident16k/keepalive/15s. Một load-only nếu được duyệt và nonresident, không hidden probe/reload. Capture native raw trước recovery, original schema/runtime/gate, no real tool/DB/mutation. Safety/readiness/hash/pending deadline failures dừng,không sửa expected.
5. **Interpretation:** nếu cảA/B đều PASS thì không được tuyên bố đã tìm nguyên nhân L03; tiny comparison không chứng minh general NLU quality. Nếu B cải thiện cả controlled pairs với safety giữ, đó chỉ là bằng chứng thêm để xem xét minimal FIX; mixed/no-improvement giữ NEEDS_MORE_EVIDENCE. Không sử dụng V2 để tune hoặc overwrite baseline.
6. **Conditional next `T-AI-04-G2-RAW-CLARIFY-FIX`:** chỉ sau owner duyệt evidence/proposal, giới hạn G2-only policy + independent tests, không state/gate/auth/schema change. Chạy đầy đủ acceptance/regression nêu trên, rồi LIVE revalidation có approval/budget riêng. Frontend/logout integration tiếp tục chờ acceptance phù hợp.

**Dừng sau báo cáo. Không apply prompt candidate, không thêm inference, không FIX hoặc frontend/Browser/V2 LIVE.**
