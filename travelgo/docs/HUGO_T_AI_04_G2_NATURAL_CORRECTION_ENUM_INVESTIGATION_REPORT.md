# T-AI-04-G2-NATURAL-CORRECTION-AND-ENUM-INVESTIGATION

Ngày **11/11/2026**, Asia/Ho_Chi_Minh. **Decision Gate duy nhất: DEMO_SAFE_LIMITATION_ACCEPTED_FOR_REVIEW.** Đề xuất giữ fallback hỏi lại an toàn/P1 OPEN và chuyển sang task tích hợp UI local/demo **sau khi chủ dự án duyệt hạn chế và phạm vi**. Không tự coi owner đã chấp nhận, không production NLU acceptance, không triển khai UI trong investigation.

**28/28 kiểm tra mới PASS**, regression **68/79/61/42/52 PASS**. Server hiểu các forms “xe máy” được hỗ trợ, gửi canonical motorbike SET đúng; model decision kind vẫn có thể sai. Q01 **chưa từng SET car**. Bốn lịch sử server khác nhau có thể tạo cùng final model-visible snapshot/current text. Không có bằng chứng đủ để chọn một NLU FIX chắc chắn; không tiếp tục A/B chỉ đổi SYSTEM hoặc mở rộng điều tra tùy ý.

**0 inference/native Ollama GET/POST/preload/unload;0 PostgreSQL;0 production/original-test/evidence-history changes.** Candidate SYSTEM B không được apply. Historical L03 FAIL, original G2 LIVE3/1, controlled A1/2/B1/2 và P1/P2 OPEN giữ nguyên.

## 1. Baseline và evidence

Đã đọc/đối chiếu [Controlled Diagnostic](HUGO_T_AI_04_G2_RAW_CLARIFY_CONTROLLED_DIAGNOSTIC_REPORT.md), [Raw Clarify Investigation](HUGO_T_AI_04_G2_RAW_CLARIFY_INVESTIGATION_REPORT.md), [G2 LIVE](HUGO_T_AI_04_G2_LIVE_MULTI_TURN_VALIDATION_REPORT.md), [Verified History](HUGO_T_AI_04_G2_VERIFIED_HISTORY_REPORT.md), source backend/frontend liên quan và original artifacts theo manifest.

[Evidence manifest](evidence/t-ai-04-g2-natural-correction-enum-investigation/evidence-manifest.json) ghi exact paths/bytes/hashes; [owner task](evidence/t-ai-04-g2-natural-correction-enum-investigation/owner-task.txt) lưu scope offline. [Comparison](evidence/t-ai-04-g2-natural-correction-enum-investigation/q01-q02-comparison.json) tham chiếu native raw/body gốc, không phát lại request. [Source locations](evidence/t-ai-04-g2-natural-correction-enum-investigation/source-locations.json) ghi line/text/hash.

| Baseline | Giữ nguyên |
|---|---|
|Historical L03|Raw FAIL:clarify transportation dù SETmotorbike|
|Original G2 LIVE|3 PASS/1 FAIL;history/safety PASS trong phạm vi đã kiểm|
|Controlled A/B|Q01 A/B FAIL;Q02 A/B PASS;A1/2,B1/2|
|Prior offline investigation|32/32 PASS,không tính là NLU quality|
|Regression/legacy|68/79/61/42/52 PASS;original145/36,isolated176/5|
|Candidate B|Chỉ được diagnostic trước đó,**chưa production-approved**|

## 2. Exact Q01/Q02 comparison

Common actual canonical values: **Bắc Giang→Hòa Bình,2058-07-10→12,4 adults,9100000,motorbike**,7 required SET. Same original/candidate SYSTEM theo variant, same schema/tools/options/roles/order trong từng controlled pair.

| Thuộc tính | Q01 | Q02 |
|---|---|---|
|Current text|`À đổi sang xe máy, giữ thông tin còn lại.`|`Phương tiện: motorbike`|
|Surface meaning|Yêu cầu đổi/lựa chọn phương tiện mới; giữ others|Explicit field/value positive update|
|Pending proof|SET transportation=motorbike,others OMITTED trong **patch**|SET transportation=motorbike,others OMITTED trong **patch**|
|Merged owned snapshot|All7 SET;motorbike canonical|All7 SET;motorbike canonical|
|Order|A→B|B→A|
|Roles|system→user verified JSON→user current|Giống|
|Native raw A/B|Cả hai `{"kind":"clarify","fields":["transportation"]}`|Cả hai exact plan_trip/full required args|
|Origin / semantic|MODEL /**FAIL**|MODEL /**PASS**|
|Gate/executor|Clarify→gate NOT_APPLICABLE,0 tool|ALLOW,1 marker mỗi lượt|

Không nhầm OMITTED của **current patch** với thiếu trong **merged session**: fields không nhắc lại được giữ từ owned verified state. Native bodies đã được kiểm hash/difference; không có thiếu motorbike trong Q01. Source original AgentService không dùng client history để lấp required fields.

**Chưa chứng minh model phân biệt đúng “chọn” và “sửa”.** Outcome khác nhau theo hai frames, nhưng Q02 còn khác ngôn ngữ/label/canonical literal,current phrasing; cache/order/time cũng không bị giữ tuyệt đối. Không thể gán toàn bộ lỗi cho một từ “đổi” hoặc alias “xe máy”.

## 3. Previous state và correction semantics

[State matrix](evidence/t-ai-04-g2-natural-correction-enum-investigation/state-semantics-matrix.json), tests H01–H10. Pure-store itinerary2059 độc lập, không fake lịch sử vào model hoặc tạo application/DB data.

| Sequence cần phân biệt | Actual source behavior / final result |
|---|---|
|1. OMITTED→UNPROVEN→SETmotorbike|Đúng actual Q01/Q02: start thiếu transport,explicit unset,positive SET. Không prior car value|
|2. SETcar→invalidate→SETmotorbike|Nếu “invalidate” là known explicit unset, actual stored tag là **UNPROVEN** của riêng transportation;others SET giữ. Final complete có thể giống sequence1|
|3. SETcar→verified correction→SETmotorbike|Không unset trung gian; current SET override car,others giữ. Final complete giống sequence1|
|4. SETmotorbike→repeat same SET|Value không đổi; request/revision/source revision mới. Không được mô tả như đã đổi từ car|

**Literal `INVALIDATED` khác conceptual invalidation của một lựa chọn.** Theo [verifiedHistory.ts](../backend/src/agent/verifiedHistory.ts), known unset ghi UNPROVEN. Unknown/unparsed patch đi nhánh invalidate **toàn bộ pending slots** và clear optional evidence. H05:car complete→unknown→chỉ SETmotorbike còn thiếu **6 fields**; không execute. H06:reprove sáu fields rồi SETmotorbike mới complete. Không xóa distinction bằng cách sửa terminology/expected lịch sử.

Mỗi final complete projection của sequences1–4 có:

- Same canonical values/states,intent plan_trip.
- Same current text `Đổi sang xe máy.` trong pure comparison.
- Same `providerData` và hai user-role messages; projection SHA-256 **`9a6ef6a21e63568ebc45db618378204f963b2bb2141aeeff57eb9771d17870f6`**.
- Correct args ALLOW,nonmatching car không ALLOW; no model call.

Model **thấy current utterance có từ “đổi”**, cùng snapshot đã ở trạng thái **sau update**. Model **không thấy** previous car/old UNPROVEN/old action D05/source revisions/server request IDs/raw prior chats. `providerData()` chỉ có type,intent,values,states. Nếu final data/current text giống nhau thì server history trước đó không thể được phân biệt từ explicit input payload này; không khẳng định runtime cache/internal state đã được kiểm tuyệt đối.

**Q01 có từng SET car thật? Không.** Original START là OMITTED,UNSET là UNPROVEN và không value. Mọi representation tương lai gắn “from car” vào Q01 sẽ tạo fact sai. Trong historical L03 của original G2 LIVE thì trước D05 có car thật; đây là lịch sử khác, không được trộn hai run.

## 4. Vietnamese aliases và canonical enum

[Alias proof matrix](evidence/t-ai-04-g2-natural-correction-enum-investigation/alias-proof-matrix.json), A01–A06. Context là **đã có authenticated pending plan intent**, không tự suy ra một intent từ giá trị rời.

| Text user | Pending-turn server proof | Model quality kết luận được |
|---|---|---|
|`xe máy`|NATURAL,SETmotorbike|Không có new inference|
|`motorbike`|**Không recognized patch** trong narrow grammar hiện tại|Không đồng nghĩa model không hiểu enum|
|`chọn xe máy`|NATURAL,SETmotorbike|Không có new inference|
|`đổi sang xe máy`|NATURAL,SETmotorbike|Không có new inference|
|`phương tiện: xe máy`|LABELED,SETmotorbike|Không có new inference|
|`phương tiện: motorbike`|LABELED,SETmotorbike|Q02 archived labeled-current có2 successes,không guarantee mọi input|

Sáu texts trên đều không tạo standalone G1 intent. Bare canonical `motorbike` không được normalize như bare Vietnamese phrase trong current pending grammar; **không mở parser để thay đổi điều này**. Vì vậy một confirmation UI tương lai nên gửi supported labeled field khi người dùng bấm xác nhận, không chỉ gửi bare enum. Đây là input của người dùng mới, không phải rewrite raw model args/history proof.

Ba lớp tách biệt:

1. **Server parsing/normalization:** supported “xe máy”→canonical motorbike bằng source grammar.
2. **Model input:** merged proof serialize đúng motorbike SET; đã xác minh ở Q01 và Q02.
3. **Model decision selection:** Q01 vẫn clarify; correctness của lớp1/2 không bảo đảm lớp3. Tool schema output vẫn chỉ cho car/motorbike,không mở enum “xe máy” hoặc sửa invalid model output thành enum đúng.

**Counterevidence chống kết luận “Qwen3 chắc chắn không hiểu xe máy”:** original G2 L04 sinh motorbike đúng,nhưng canonical đã có trong snapshot nên không riêng nó chứng minh hiểu alias. Thêm archive G1 Server Completeness LIVE L01: full current input có `Tôi muốn đi bằng ô tô, à đổi sang xe máy`,native trả correct plan_trip/motorbike. Body hash **`f6e10c85f0db90314fcb8dc1ff6a86220b9286e1658fab9a1365963da1419110`** khớp original manifest. Đây là G1/full-current cohort khác,không được cộng vào điểm G2 short-patch; nó loại trừ failure hiểu phrase **phổ quát**.

## 5. Prompt/source observations

[Current proof](../backend/src/agent/currentTurnProof.ts) nhận alias/correction thành values/states,không xuất riêng semantic label SELECT/CHANGE/REPEAT cho model. [Verified store](../backend/src/agent/verifiedHistory.ts) apply patch trước generate,giữ value provenance và source revisions server-side; serialize final snapshot. [AgentService](../backend/src/services/agentService.ts) giữ current text last,returns valid model clarify trước tool gate. Không autoconvert.

G1 SYSTEM có full-current example car và missing-transport clarify; G2 supplement cho verified SET source,nhưng vẫn kế thừa current-only wording như investigation trước. Candidate B đã scope rõ hơn và thêm complete-SET→read-tool instruction nhưng **không cải thiện Q01**. Không đủ evidence để chọn thêm một rewrite SYSTEM-only như fix chắc chắn.

Semantic representation hiện tại có một điểm cần hiểu đúng: current utterance diễn tả request operation,trong khi snapshot đã là kết quả server apply operation. **Không có facts conflict**: target motorbike trong hai chỗ khớp nhau. Model có thể xử lý frame này chưa ổn là hypothesis,không phải source parser đã mất correction hoặc trước đó thực sự có car. Cần diễn giải thận trọng,không thêm false transition/history để làm prompt dễ hiểu.

Original AGENT_TOOLS/schema/gate không cấm motorbike. Strict schema xác minh shape/allowlist,không xác minh một clarify field có thực sự thiếu trong server state. Hai raw clarify valid schema nhưng FAIL semantic. Thay gate để tự tạo tool sẽ che raw failure và thay contract,không được chọn.

## 6. Confirmed / likely / hypothesis

[Options/findings](evidence/t-ai-04-g2-natural-correction-enum-investigation/options-and-findings.json) ghi mức chứng cứ:

| Level | Findings |
|---|---|
|**CONFIRMED**|Q01 no prior car; explicit unset UNPROVEN vs unknown whole-proof INVALIDATED;5 supported alias surfaces canonicalize đúng;bare motorbike patch unsupported;all actual model snapshots SETmotorbike;four state histories can serialize identically;G1 full-current Vietnamese correction từng PASS|
|**LIKELY risk description**|G2 short-current frame/representation interaction phù hợp evidence hơn universal Vietnamese-alias failure; chưa phải mechanism hoặc proven intervention|
|**HYPOTHESIS**|Model có thể diễn giải “đổi” như operation chưa apply,hoặc lexical/enum/source salience tương tác; không có model-internal evidence|
|**RULED_OUT as claims**|Q01 failure chứng minh prior car;model universally không hiểu xe máy;canonical server value/fake tool PASS chứng minh NLU quality|

Không chọn wording là nguyên nhân duy nhất. Causal NLU mechanism còn chưa xác nhận,nhưng **decision về bước làm việc đã đủ rõ** ở mục10; không cần một chuỗi điều tra mới vô thời hạn trước khi hoàn thiện demo UI có giới hạn được duyệt.

## 7. Offline verification

[Harness](evidence/t-ai-04-g2-natural-correction-enum-investigation/offline-checks.cjs) / [results](evidence/t-ai-04-g2-natural-correction-enum-investigation/offline-results.json): **28 PASS/0 FAIL/0 NOT RUN**,network attempts0,PostgreSQL attempts0,native Ollama GET/POST0. New checks chặn fetch/net/http/https và DB connect/query. Tất cả stores synthetic memory được dispose,không tạo fixture.

| Cases | Coverage |
|---|---|
|A01–A06|Six exact alias/enum surfaces,pending vs standalone proof|
|H01–H04|Four complete state histories,correct tool ALLOW/nonmatching car blocked|
|H05–H07|Literal INVALIDATED needs reproof;related conflict không ALLOW old/new values|
|H08–H10|Identical final model projection,hidden prior history/metadata,reverse motorbike→car gate|
|P01–P03|Missing/unproven/conflict exact needs_input,no **new** provider/tool on incomplete turn|
|P04–P05|Old-car raw blocked after SETmotorbike;fake clarify keeps new verified state,no autocompleted,origin MODEL|
|P06–P07|G1 stateless/current-only unchanged;G2 client history rejected before state creation|
|R-Q01-A/B,R-Q02-B/A|Archived raw original schema/runtime checks;raw FAIL/PASS scores preserved|
|I01|Source/benchmark/historical integrity|

H cases là **PURE_STORE**,không coi full-car setup là một real model request. P cases là **MOCK_ONLY provider/consent/executor**,itinerary2059 Cần Thơ→Buôn Ma Thuột,3 adults,8600000,different from locked probes. R cases chỉ parse archived outputs,không model inference hoặc đổi Q01 FAIL thành PASS. Một test parser/schema PASS không đồng nghĩa raw semantic PASS.

## 8. Ba hướng cải thiện và risks

### A — G2-only natural-correction instruction

Support:source ambiguity và current wording có liên hệ với failure pattern. Counterevidence:exact approved B đã làm rõ SET/source nhưng Q01 vẫn FAIL;G1 full-current correction từng PASS. Scope có thể là **AgentService derived G2 SYSTEM + independent tests**,không G1 literal/schema/gate. Risks:tiếp tục prompt tuning không isolating hypothesis,tăng byte budget hoặc ép tool trên uncertainty. Giữ no-history/no-guess/no-mutation/allowlist;**cần real inference riêng** để xác nhận behavioral benefit. **Không chọn triển khai ở đây.**

### B — Current verified change representation

Support:post-update snapshot không chứa explicit operation/applied marker;different histories hội tụ cùng payload. Counterevidence:snapshot đã SET canonical đúng;metadata bổ sung có thể dư thừa,chưa measured benefit. Future source có thể **VerifiedHistory typed trusted summary + AgentService G2 data serialization + tests**,không output schema/gate/G1.

Rủi ro trọng yếu:không được bịa `from car` cho Q01,không lưu/replay raw prior chat hoặc lấy model/client claims thành change proof. Nếu sau này thiết kế,summary chỉ được backend derive từ verified facts,có thể nói SET đã apply mà không invent old value;owner/retention/minimization/byte budget phải review. Tests cần bốn histories,repeat/no-op,unset/conflict/whole-invalidated và no-false-history assertions. **Real inference vẫn cần để chứng minh lợi ích**;task này không tạo summary production hoặc chọn đây là proven fix.

### C — Safe fallback + explicit-confirmation UX + demo integration

Support:history/gate/safety có evidence;model clarify giữ state và không execute;canonical labeled update có archived successes. Counterevidence:không giải quyết raw P1 và confirmation vẫn có thể bị model hỏi lại. **Đây là hướng chọn để owner review**,không production NLU acceptance.

Proposed wording: **“Agent đang yêu cầu bạn xác nhận lại phương tiện.”** Không khẳng định “bạn chưa chọn” khi server đã SET. Có thể cho explicit user choice **Xe máy/Ô tô**,sau click mới gửi supported text `Phương tiện: motorbike`/`Phương tiện: car`,hoặc edit/cancel/Planner/reset. Không auto-resend hoặc tool synthesis;đây là new user input qua normal quota/server proof,không “sửa output” của lượt FAIL trước. Labeled success không được quảng cáo guaranteed.

**Current frontend chưa G2-ready.** [Frontend review](evidence/t-ai-04-g2-natural-correction-enum-investigation/frontend-integration-review.json) xác nhận:

- `AgentChatRequest`/service projection không có conversation envelope và gửi client history.
- Response parser chỉ nhận `context.mode:"STATELESS"`;không thể chỉ bật G2 backend rồi coi UI đã tích hợp.
- Agent error interceptor đang bỏ safe owned conversation metadata,cần xử lý revision sau provider error trong scope Agent-specific.
- Controller reset/cancel và AuthContext logout hiện chỉ clear client state;không revoke backend G2.
- AssistantPage render reply,chưa có explicit missing-field confirmation controls;privacy flow hiện dành existing notice,phải phân biệt G2 retention acknowledgement và external-processing consent.

Source future cần review: **AssistantPage.tsx,services/agentService.ts,types/agent.ts,utils/agentConversation.ts,utils/agentContract.ts,services/api.ts Agent-only branch,AuthContext.tsx,PrivacyConsentModal.tsx**. Không backend NLU/SYSTEM/schema/gate change. Risks và tests:owner isolation,TTL/reload/restart,revision/fresh IDs,revoke-before-local-logout best effort,stale UI response fencing;không hứa JWT/global revocation hoặc guaranteed server deletion khi mạng lỗi. UI contracts có thể test MOCK_ONLY,nhưng genuine LLM/service E2E cần scope/budget riêng.

## 9. Independent acceptance plan

[18-case plan](evidence/t-ai-04-g2-natural-correction-enum-investigation/independent-acceptance-plan.json),status **PLANNED_NOT_IMPLEMENTED_OR_RUN**,không gọi đây là frontend PASS.

| IDs | Expected quan trọng |
|---|---|
|D01–D02|Explicit local/demo15min notice/ack;server IDs/revision/fresh UUID;G2 không gửi client history/proof/userId,G1 unchanged|
|D03–D06|Redundant clarification giữ needs_input;explicit user-confirmed labeled car/motorbike;no bare-enum/autoresend;escape repeated clarification bằng edit/cancel/Planner/reset|
|D07–D08|Old transport/budget/destination blocked;missing/unproven/conflict hỏi đúng,không fake itinerary/completed|
|D09–D10|Provider error safe metadata/revision đúng;explicit retry fresh ID;stale/replay/cross-owner fail closed,no resurrection from client history|
|D11–D13|Expiry/reload/restart/reset/revoke/logout/account switch clear/fence đúng;network failure không giữ UI của owner cũ hoặc hứa JWT revocation|
|D14–D15|Normal quota/readiness/limits;strict existing real-result provenance/validation,fake marker không thành data thật|
|D16–D18|Desktop1440×900/mobile390×844 usable;G1 regressions giữ;MOCK_ONLY vs real E2E/raw scoring tách,P1 OPEN không bị che|

Bất kỳ real model E2E cần approval/POST cap mới;real service/PostgreSQL fidelity cần scope riêng và exact test DB/guard/checksum/fingerprint/fixture cleanup nếu có write. Không biến demo UX acceptance thành whole-agent/model benchmark acceptance.

## 10. Decision Gate

**DEMO_SAFE_LIMITATION_ACCEPTED_FOR_REVIEW** — [decision record](evidence/t-ai-04-g2-natural-correction-enum-investigation/decision-gate.json).

Lý do chọn:không có proven minimal NLU fix sau SYSTEM-only candidate không cải thiện;known safe fallback/verified history đủ để đưa ra product decision có giới hạn. Đo thêm là có thể,nhưng chưa cần mở thêm vòng diagnostic trước việc tích hợp demo UI rõ contract. Hướng A/B được defer,không trá hình trở thành implementation.

**Owner limitation approval còn PENDING.** Gate này là đề xuất chấp nhận hạn chế để review,không tự duyệt P1 hoặc production rollout. Điều kiện:giữ natural-correction NLU limitation công khai trong report/demo acceptance,manual confirmation không guaranteed,local/demo only,state mất sau restart,frontend chưa implemented,raw FAIL vẫn FAIL. Không có manifest/POST cap mới được yêu cầu trong kế hoạch bước tiếp này.

## 11. Regression và integrity

[Regression summary](evidence/t-ai-04-g2-natural-correction-enum-investigation/regression-summary.json): existing compiled tests read-only,LIVE disabled/native network guard;không rebuild/source/test assertion edits.

| Suite | Current run | Historical baseline,không tính là rerun |
|---|---|---|
|New investigation checks|**28 PASS/0 FAIL**|—|
|G2|**68 PASS/0 FAIL**|68/0|
|Natural Proof|**79 PASS/0 FAIL**|79/0|
|Compatibility|**61 PASS/0 FAIL**|61/0|
|Correction|**42 PASS/0 FAIL**|42/0|
|Completeness|**52 PASS/0 FAIL**|52/0|
|Original181 / isolated controls|**NOT RUN**|145/36;176/5|
|Readiness/diagnostics|**NOT RUN**|32/1(control33/0);8/5(control13/0)|
|Foundation22/backend build|**NOT RUN**|22/0;build PASS sealed baseline|
|LIVE/Browser/frontend/DB E2E|**NOT RUN**|Không approval/current execution|

Không source changes nên không lặp broad legacy/build chỉ để tạo số;84 compiled modules vẫn hash-match last build. Không nhận baseline PASS như lần mới,không che36 original FAIL. Regression có mocked ephemeral HTTP API tests trong suites gốc,không native Ollama/external/DB. New28 process chặn mọi direct network.

[Before](evidence/t-ai-04-g2-natural-correction-enum-investigation/integrity-before.json) / [after](evidence/t-ai-04-g2-natural-correction-enum-investigation/integrity-after.json) / [final seal](evidence/t-ai-04-g2-natural-correction-enum-investigation/artifact-checksums.json): **5475 protected files unchanged**,prior144 controlled artifacts+report và5329 prior baseline files intact,84 compiled hashes khớp. Backend/frontend/SYSTEM/parser/store/gate/auth/consent/limits/Planner/Catalog/Trip/Booking/V1/V2/evidence cũ không đổi. Chỉ thêm report/evidence/harness task này;không claim clean Git tree.

| Contract giữ nguyên | SHA-256 |
|---|---|
|G1 SYSTEM literal|`85929a1ddb7339c68251b34fd075fc3cf793b4dbdc8606cb674aa7cb8266dd8d`|
|G1 wire|`5902945e22dfe3b9b3432c669125daf4d7929fbfd5a330ffce0581fc62c4fe1f`|
|Original G2 wire|`76e1aa153284ef953685d1f2289dc788ac2e962b763c0a3404495268459632a0`|
|Candidate B wire,not production|`01fd91dcbc221a48c40c2c3fed9cdb7337bf65265a00b851529308dfa03fc286`|
|V2 APPROVED|`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`|
|V2 lock|`f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706`|

Model tag/digest chỉ tham chiếu archive,không khảo sát readiness/hardware hiện tại. No inference/preload/unload/real Ollama GET,không model/quant/context/timeout change. **PostgreSQL0**,fixture/cleanup/fingerprint DB **N/A**. Synthetic stores đã dispose;không migration/seed/reset/truncate,commit/push/deploy hoặc implementation NEXT TASK.

## 12. P1/P2 status

| Issue | Status |
|---|---|
|TAI03B-B1-01 P1 raw NLU|**OPEN**;G2 short natural correction chưa đạt,candidate B không được rollout|
|Runtime P2|**OPEN**;không runtime/inference mới,không reclassify từ archive current clean window|
|Budget grammar P2/Map P2/VI14|**OPEN/untouched**,không sửa task này|
|G2 history/safety|PASS ở evidence đã kiểm,không bằng chứng đủ cho production durability/fullNLU|
|Demo limitation|**FOR OWNER REVIEW**,không tự nhận đã approved|

## 13. NEXT TASK PLAN — chờ duyệt

Đề xuất **`T-AI-04-G2-FRONTEND-INTEGRATION-AND-LOGOUT`**,không thêm một NLU diagnostic vòng mới mặc định.

1. **Dependency/decision:** owner review và chấp thuận gate demo-safe với P1/P2 OPEN,candidate B chưa production-approved,local/demo15min/restart-loss limits;duyệt18-case matrix và frontend scope cụ thể. Đây là approval cho UX integration nếu được đồng ý,không raw NLU acceptance.
2. **Integration scope:** typed G2 opt-in/request envelope/context/owned error metadata;no client-history proof,fresh IDs/latest revision;retain strict result parser. Existing G1 unchanged. Chỉ client integration với G2 APIs đang có,không SYSTEM/schema/gate/backend algorithm change.
3. **UX/lifecycle:** explicit confirmation wording/actions với no auto-resend;progress/error/repeated-question escape;reset/revoke/expiry/reload contract;logout/account switch cancel/fence and owner revoke best effort trước clear local token,không central JWT revocation hoặc fake deletion guarantees. Modal copy tách retention từ external consent.
4. **Validation:** offline/controller/service mocks phải ghi MOCK_ONLY;desktop/mobile UI controls và source integrity,G1/backend regressions phù hợp. Nếu owner muốn genuine model/browser/service/DB E2E,phải duyệt riêng cap/preflight/quota/fixture guards;không dùng4/5 POST của task cũ làm permission mới,không mock data để nhận fidelity PASS.
5. **Stop/acceptance:** demo UX có thể được duyệt trong phạm vi này khi lifecycle/safety đúng và hạn chế NLU được ghi nhận;không đóng P1 vì confirmation UX hoạt động. Stop sau implementation report của task được duyệt,không tự V2 LIVE/Planner mutation/production rollout.

**Task investigation hiện tại dừng ở report và decision gate. Không sửa source,không chạy inference hoặc tự thực hiện NEXT TASK.**
