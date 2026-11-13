# T-AI-04-G2-LIVE-MULTI-TURN-VALIDATION

Ngày **10/11/2026**, Asia/Ho_Chi_Minh. **Kết luận: LIVE_PROBE_FAIL_RAW_L03_SAFETY_AND_VERIFIED_HISTORY_PASS**. Đã hoàn tất đúng **5 native POST: 1 operator load-only + 4 genuine inference**, không retry. Raw LIVE **3 PASS / 1 FAIL / 0 NOT RUN**. L03 trả clarify dù transportation đã SET hợp lệ; không thay expected để nhận PASS.

Verified History **7/7 lượt chính PASS**, deterministic **3/3 PASS** với raw NOT EVALUATED, safety **4/4 LIVE PASS**, auth/consent/lifecycle **13/13 PASS**. Có **3 fake read-only executor invocations**, không Planner/Catalog/PostgreSQL thật. Source/benchmark/evidence lịch sử nguyên vẹn. **P1 NLU và P2 runtime vẫn OPEN; chưa đủ điều kiện chuyển sang frontend integration.**

## 1. Approval, baseline và manifest

[Owner approval nguyên văn](evidence/t-ai-04-g2-live-multi-turn-validation/owner-approval.txt), [approval record](evidence/t-ai-04-g2-live-multi-turn-validation/approval.json). Task cho phép tối đa05 POST local, gồm01 conditional load-only và04 inference qua Agent, không source fix, không DB/Browser/frontend. Đã đối chiếu G2 Verified History, G1 Natural Proof, Server Completeness LIVE, Compatibility/V2 Readiness và source hiện hành.

[Manifest thực thi](evidence/t-ai-04-g2-live-multi-turn-validation/manifest-execution.json) / [lock](evidence/t-ai-04-g2-live-multi-turn-validation/manifest-execution-lock.json) được khóa trước mọi POST. Exact messages, UUID requestId, actions, revisions, values/states/missingFields, origin, gate/tool counts, request bytes, scoring/budget/stop conditions và84 compiled-module hashes đã được chốt. Conversation ID được ràng buộc với ID **server tạo tại A01**, không đặt trước bởi client.

| Artifact | SHA-256 |
|---|---|
| Final execution manifest | `ece39130dfa59acfa7694fac5197c7d3a3e125dd790db622ffb279f594e67c80` |
| Initial manifest, giữ nguyên | `a45828136152dcf15059a1dfcd74e2da415ee7cf95aaf6809779ad51472d524d` |
| G2 wire SYSTEM + original tools/schema | `76e1aa153284ef953685d1f2289dc788ac2e962b763c0a3404495268459632a0` |
| G1 wire cohort, không đổi | `5902945e22dfe3b9b3432c669125daf4d7929fbfd5a330ffce0581fc62c4fe1f` |

[Input uniqueness](evidence/t-ai-04-g2-live-multi-turn-validation/input-uniqueness.json): so sánh exact NFC messages với **662.666 strings /2.116 historical JSON**, **0 duplicate**. Không dùng history VI09–VI13 để seed session, không tuning theo V2 hay replay probe cũ. Đây là exact-text uniqueness, không khẳng định mọi ý định hoàn toàn mới.

**Pre-POST authoring, không che lỗi:** [grammar review](evidence/t-ai-04-g2-live-multi-turn-validation/pre-lock-grammar-review.json) phát hiện câu natural budget correction `Đổi ngân sách cả nhóm thành 8,2 triệu, giữ các thông tin còn lại.` không được proof hiện tại chấp nhận; labeled numeric budget có dấu chấm cuối cũng UNPROVEN. Chưa có inference. Chọn final input nhãn không dấu chấm, vẫn expected **8200000**, phù hợp yêu cầu dùng grammar đã hỗ trợ. Không sửa production. [Pure-store reproduction sau run](evidence/t-ai-04-g2-live-multi-turn-validation/grammar-limitations-offline.json) xác nhận cả hai false negatives, giá trị cũ bị bỏ an toàn,0 model/tool.

Initial manifest có N-HISTORY chỉ một user message, nên readConversation sẽ chặn malformed history trước khi tới G2 history rejection. Trước bất kỳ POST, tạo **revision riêng** bổ sung assistant để thành một cặp hợp lệ, giữ expected400/AGENT_G2_CLIENT_HISTORY_REJECTED. [Authoring review](evidence/t-ai-04-g2-live-multi-turn-validation/pre-post-authoring-review.json) và initial manifest/lock/source/body được giữ. **Không đổi main LIVE inputs/expected sau khi khóa execution manifest hoặc thấy model output.** Các lỗi dựng fixture/harness offline không tính là model inference hoặc acceptance PASS.

## 2. Contract và preflight

[Initial preflight](evidence/t-ai-04-g2-live-multi-turn-validation/preflight-initial.json), [run preflight](evidence/t-ai-04-g2-live-multi-turn-validation/preflight-run.json), preparation và preflight L01–L04 đều **PASS**. Không phát hiện source/contract drift so với G2 report.

| Kiểm tra | Kết quả thực tế |
|---|---|
| G2 enable | `AGENT_G2_MODE=local-demo` chỉ trong authorized harness child process; không sửa `.env`, không bật website/global LIVE |
| Storage/retention | Production LocalVerifiedHistoryStore, absolute TTL900000ms, same instance xuyên suốt, không restart giữa các lượt |
| Consent | Version `LOCAL_DEMO_SLOTS_V1` giữ nguyên; normal consent read trước state; personalization false MOCK_ONLY |
| Model | `qwen3:4b-instruct-2507-q4_K_M`,4.0B/Q4_K_M |
| Digest installed/resident | `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0` |
| Ollama | **0.40.16**, native process/listener xác minh tại **127.0.0.1:11434** |
| Local-only | Explicit loopback, redirects error, không proxy env/Node proxy hook, không remote model metadata, không Gemini/cloud |
| GPU | NVIDIA GeForce RTX4060, driver560.94,8188MiB |
| Initial resources | GET-only initial preflight: RAM free4401/16202MiB, VRAM free6411MiB; model nonresident |
| Inference settings | JSON mode, stream false, temperature0, num_ctx16384, num_predict2048, production/application timeout15000ms, concurrency1 |
| Readiness | Version→tags→ps thật trước từng inference; exact digest/context16384 và unexpired residency |

Local-only được kiểm URL/env/process/model metadata, không phải OS-wide packet capture. RAM/VRAM là sample quan sát, không thêm production threshold. Resource pressure/eviction/deadline hoặc integrity failure sẽ dừng; không reload lần hai/tăng timeout/đổi model.

## 3. Principal, rolling ledger và quota

Inference và mọi main G2 turn dùng cùng approved principal từ [historical E04-B attempt](evidence/t-ai-04-e-final/run-20261109T041645807Z-ae626a88/attempt-E04-B.json). Evidence mới dùng source reference/hash, không lưu token:

`principal SHA-256 = 6b982d095bc6bc30c87955cd38c78afa9ef31d3447ef30f62e8684bbe8bce600`.

Scan **54 historical attempt records**, đọc **cả `at` và `createdAt`**, lấy timestamp mới nhất nếu có cả hai để accounting bảo thủ; không unreadable/future-dated record. Lúc bắt đầu có **0 recent**, còn20. Tính trước toàn bộ chuỗi: **15 normal main turns +1 conditional operator entry bảo thủ**, đủ16 slots; principal phụ chỉ01 negative ownership turn.

Một AgentLimits mặc định dùng xuyên suốt, không reset/đổi principal/session để tránh quota. Source AgentLimits thực tế là counter theo cửa sổ một giờ từ first consume, không sliding-window ledger. Harness áp thêm scan rolling-hour bảo thủ và hydrate recent entries nếu có; run này recent0, không giả rằng quota là0 chỉ vì tạo process mới.

Đã consume **15 normal main +1 negative secondary**. Operator load-only **ngoài AgentLimits**, ghi ledger riêng và tính bảo thủ thêm một entry của main. Sau run: **16 main recent conservative entries, còn4/20**. Các malformed history/ID bị reject trước quota, privacy GET và anonymous401 không consume. `attempt-*` ghi quota/operator intent, `ollama-attempt-*` ghi native dispatch riêng, không đếm hai lần một inference. Không làm thêm request để ép429.

## 4. Harness và REAL / MOCK_ONLY

[Single-use harness](evidence/t-ai-04-g2-live-multi-turn-validation/run-live.cjs) chạy:

`production HTTP router/auth → AgentOrchestrator/normal limits → owned G2 store/shared proof/completeness → production provider/readiness → native Ollama → original schema/Ajv/parseDecision/validateTool → owned merged-proof gate → marker executor`.

Auth sử dụng tokenService và middleware thật; JWT test được ký trong memory cho **đúng approved UUID**, claims email/name synthetic, không ghi token/header hoặc bypass authenticate. Principal phụ chỉ được phép tại N-OWNER, không tạo session/inference. Đây không phải DB login/account E2E; owner của session luôn lấy từ authenticated request, không nhận từ client body.

| REAL | MOCK_ONLY / không đánh giá |
|---|---|
| HTTP/auth, state/TTL/revision/ownership, Orchestrator/proof/completeness | Consent store trả personalization false hoặc lỗi theo negative fixture |
| Original schema/Ajv/parser/tool validator, gate, limits | Read-only executor ghi raw exact args, trả `MOCK_ONLY/READ_ONLY_TEST_EXECUTOR` |
| Native Ollama provider, readiness, inference, latency/tokens | Không Planner/Catalog/itinerary/cost fidelity hoặc PostgreSQL |

Observability wrapper chỉ ghi provider input/boundary, state và kết quả original `turn.check()`, không đổi return value/slot/decision. Exact native request bytes được so với locked body trước dispatch. Old-value hypothetical checks dùng **cùng live lease/proof** nhưng không phải output model, không gọi tool. Source không sửa. DB query/connection bị chặn; **0 attempts**. Native dispatch có exclusive attempt files/cap/single-use marker, không retry.

## 5. Phase A và D05 — deterministic, không inference

| Case / exact input | Revision | Exact missingFields | Origin | HTTP / provider / GET / POST / tool | Kết quả |
|---|---:|---|---|---|---|
| [A01](evidence/t-ai-04-g2-live-multi-turn-validation/case-A01.json) `Lập lịch trình; Điểm đến: Lạng Sơn` |1|departureCity,startDate,endDate,adults,totalBudget,transportation|SERVER_COMPLETENESS|200 /0 /0 /0 /0|PASS|
| [A02](evidence/t-ai-04-g2-live-multi-turn-validation/case-A02.json) `Nơi xuất phát: Thái Bình; Ngày bắt đầu: 2053-09-18; Ngày kết thúc: 2053-09-20; Số người lớn: 3; Ngân sách cả nhóm: 7600000 VND` |2|transportation|VERIFIED_HISTORY_COMPLETENESS|200 /0 /0 /0 /0|PASS|
| [D05](evidence/t-ai-04-g2-live-multi-turn-validation/case-D05.json) `Tôi hủy phương tiện, giữ các thông tin còn lại.` |5|transportation|VERIFIED_HISTORY_COMPLETENESS|200 /0 /0 /0 /0|PASS|

A01 server tạo một ID ngẫu nhiên; A02 và các lượt sau dùng exact ID/latest revision/fresh locked UUID, không history. D05 transportation chuyển **SET car→UNPROVEN**, bỏ value cũ, giữ các SET khác. HTTP wall A01/A02/D05: **9,75 /4,91 /12,67ms**. Mỗi lượt consume01 quota +01 consent read. Preflight GET ngoài turn được lưu riêng; **0 readiness GET trong chính ba Agent turns**. Raw cả ba **NOT EVALUATED**, không cộng thành điểm NLU.

## 6. L01–L04 — raw LIVE và expected

Common verified args ban đầu: **Thái Bình→Lạng Sơn; 2053-09-18→2053-09-20; 3 adults; 7600000 VND; car**. L02 đổi budget8200000; L03 đổi motorbike; L04 đổi destinationHà Giang. Các slot không đổi phải giữ nguyên.

| Case / exact current input | Expected | Raw thực tế / gate / tools | Raw / history / safety / case |
|---|---|---|---|
| [L01](evidence/t-ai-04-g2-live-multi-turn-validation/case-L01.json) `Chọn ô tô, giữ các thông tin còn lại.` |plan_trip, common args|Đúng toàn bộ; ALLOW;1 marker tool|PASS /PASS /PASS /PASS|
| [L02](evidence/t-ai-04-g2-live-multi-turn-validation/case-L02.json) `Ngân sách cả nhóm: 8200000 VND` |plan_trip, budget8200000, giữ others|Đúng toàn bộ; ALLOW;1 marker tool|PASS /PASS /PASS /PASS|
| [L03](evidence/t-ai-04-g2-live-multi-turn-validation/case-L03.json) `Đổi sang xe máy, giữ các thông tin còn lại.` |plan_trip, motorbike, budget8200000, giữ others|`{"kind":"clarify","fields":["transportation"]}`; gate NOT_APPLICABLE model clarify;0 tool|**FAIL** /PASS /PASS /**FAIL**|
| [L04](evidence/t-ai-04-g2-live-multi-turn-validation/case-L04.json) `Đổi điểm đến thành Hà Giang, giữ các thông tin còn lại.` |plan_trip, Hà Giang/motorbike/budget8200000, giữ others|Đúng toàn bộ; ALLOW;1 marker tool|PASS /PASS /PASS /PASS|

**4/4 HTTP200, JSON parse/original DECISION_SCHEMA/Ajv/runtime valid, origin MODEL và provider boundary RETURNED.** Mỗi lượt01 provider call/03 readiness GET/01 inference POST. Không typed recovery/fallback hoặc sửa output. Three valid tool decisions không thêm optional arguments; raw kind/name/required args đúng exact values. Scoring giữ city NFC/case/whitespace và harmless optional defaults theo existing contract, không nới allowlist.

**L03 là lỗi NLU semantic, không phải lỗi store/provider/schema/DB.** Trước provider, server values đã có `transportation:"motorbike"`, state SET ở revision6, budget8200000 và other fields đúng. Exact request body cũng chứa dữ liệu này cùng current positive correction. Model vẫn hỏi lại transportation; API200/needs_input là biểu hiện raw clarify hợp lệ schema nhưng sai expected nghiệp vụ. Không thể khẳng định nguyên nhân prompt/attention/provider construction từ một sample; cần investigation riêng. L04 tiếp tục cùng session, raw plan_trip dùng đúng motorbike, xác nhận model clarify L03 không xóa/ghi đè verified state.

## 7. Session transitions và execution safety

| Revision | Server-owned thay đổi |
|---:|---|
|1|SET destination Lạng Sơn, các required khác OMITTED|
|2|SET departure/dates/adults/budget7600000, transport OMITTED|
|3|SET car, complete;1 valid marker tool|
|4|Budget SET8200000 override7600000; other slots giữ source revisions|
|5|Transportation UNPROVEN, không giữ value car; hỏi lại, không model/tool|
|6|Transportation SETmotorbike; model clarify không được cập nhật state|
|7|Destination SETHà Giang; motorbike/budget/dates/adults giữ đúng|
|8 reset|Clear intent/slots/optional; TTL không kéo dài; subsequent revision7 conflict|
|revoke|Session erased; continue404, remainingSessions0|

Expiry cố định **22:08:46.554 +07**, tạo lúc **21:53:46.554**. Main sequence và lifecycle kết thúc khoảng21:54:43, không restart/expire giữa lượt. Có một session duy nhất. Raw prior chats/assistant history/account profile không trở thành proof; provider nhận structured SET data user-role riêng + current message, không có ID/token/identity trong model body.

Hypothetical old-value comparisons trên current production lease: L02 budget7600000→**NEEDS_INPUT totalBudget**; L03 car→**NEEDS_INPUT transportation**; L04 Lạng Sơn→**NEEDS_INPUT destinationCity**. Đây là independent gate probes, **không nhận là model đã sinh raw sai rồi bị gate chặn trong LIVE**. Model thực tế sinh03 đúng tool +01 clarify. Mỗi valid tool chỉ một marker invocation; không mutation/second tool. Không unauthorized/stale-value ALLOW, safety blocker hoặc stale success được quan sát.

Reset/revoke xảy ra sau provider settlement; **LIVE concurrent reset/revoke/late GPU abort NOT RUN**. Offline68 kiểm các race, pending-consent fences, expiry và provider không cooperative. Không suy offline race PASS thành đã đo cancel GPU thật.

## 8. Auth, consent và lifecycle isolation

[Check files](evidence/t-ai-04-g2-live-multi-turn-validation/results.json) lưu actual HTTP/error/no-store/quota/state. Toàn bộ13 checks **PASS**,0 provider/GET/POST/tool:

| Check | Actual HTTP / contract |
|---|---|
| N-AUTH / N-PRIVACY |401 anonymous;200 authenticated privacy, enabledtrue, correct version/TTL900|
| N-ACK |428 AGENT_G2_CONSENT_REQUIRED, normal quota1, không tạo travel session|
| N-CONSENT |503 AGENT_CONSENT_UNAVAILABLE, normal quota1, không tạo travel session|
| N-HISTORY |400 AGENT_G2_CLIENT_HISTORY_REJECTED với một cặp history hợp lệ nhưng untrusted; revision7 không đổi|
| N-INVALID-ID |400 AGENT_G2_INVALID_INPUT trước quota|
| N-OWNER |404 AGENT_G2_SESSION_UNAVAILABLE cho authenticated principal phụ; không session metadata/slot leak; main revision7 không đổi|
| N-STALE |409 AGENT_G2_REVISION_CONFLICT, revision6 không overwrite7|
| N-REPLAY |409 AGENT_G2_REPLAY khi reuse L02 requestId; state không đổi|
| N-RESET |200, revision8, clear intent/slots|
| N-RESET-STALE |409 cho old revision7,0 late tool|
| N-REVOKE / N-REVOKED |200 revokedtrue, sessions0; subsequent continue404 không metadata|

**Live wall-clock expiry: NOT RUN**, không thay clock/TTL hoặc chờ15 phút để tạo thêm HTTP sequence ngoài manifest. Invalid ID/stale/revoked fail closed đã kiểm LIVE HTTP; natural expiry/fake-clock tests nằm trong offline68. Website logout/frontend chưa tích hợp, JWT không bị revoke bởi G2 delete; không claim global logout hoặc production durability.

## 9. Native POST ledger và preparation

Model nonresident nên dùng đúng một empty-prompt load-only `/api/generate`, body giữ JSON/context16384/keep_alive5m, deadline60000ms **chỉ preparation**, không đổi Agent deadline15s. Response200,done true,done_reason load,response rỗng, wall **11144,75ms**; Ollama không báo token counts cho load, không suy diễn là0 NLU tokens.

| POST | Intent time (+07) | Endpoint | Exact body SHA-256 |
|---|---|---|---|
| OP-LOAD |21:53:54.163|/api/generate|`4e86b724bb5567dfb08b8f53807c4423e2de86a7fd48e56ddd125431d8e76c01`|
| L01 |21:54:13.420|/api/chat|`09d9317ce6e5b816c29ee0305bc4d262e7b9d0ca10b1d36ec3d5181eee6dd8ed`|
| L02 |21:54:24.051|/api/chat|`bb364bda966e210013944b305aa28d69f7ac1866f3814bd395886a3e1dd4ea6c`|
| L03 |21:54:33.576|/api/chat|`fb89433dd525fb78b9cc9ab00cea903d8e22743ed8986585aeb5bd7a40d4d986`|
| L04 |21:54:41.770|/api/chat|`8cd40987e9affaaf5e004839a96333f09e953ffcb4d3641b83c83c866e6bc92f`|

`ollama-attempt-*` được ghi trước dispatch, `ollama-response-*` giữ raw envelope. Tất cả HTTP200, không POST lặp. [Native GIN audit sau regression](evidence/t-ai-04-g2-live-multi-turn-validation/native-post-count-after-regression.json) xác nhận đúng **5 rows =1 generate +4 chat**, không thêm native POST từ unit tests. Không warm-up, model switch hoặc load lần hai; readiness không thấy eviction.

## 10. Runtime, tokens và hardware

[Native measurement details](evidence/t-ai-04-g2-live-multi-turn-validation/measurement-details.json), [filtered runtime log](evidence/t-ai-04-g2-live-multi-turn-validation/native-log-window.json).

| LIVE | HTTP Agent ms | Provider ms | Native body ms | Ollama total ms | Prompt / cached / output tokens |
|---|---:|---:|---:|---:|---|
|L01|6337,44|6320,92|2326,81|2318,35|2342 /0 /74|
|L02|5632,72|5614,43|1575,00|1567,08|2346 /2272 /74|
|L03|4243,99|4228,05|409,91|401,58|2344 /2283 /12|
|L04|5194,83|5175,60|1476,31|1468,53|2348 /2234 /76|

Tổng **9380 prompt /236 output**; **6789 cached** là phần prompt, không cộng thêm vào9380. Cache metric lấy đúng native `prompt_eval_cached_count`; `analysis.json` extractor ban đầu dùng tên khác nên để null, supplement ghi chính xác trường có trong raw envelope, không sửa response/score. Prompt caching không phải client history hay quyền server proof.

Provider/HTTP wall bao gồm readiness và synchronous hash/resource observation của harness trong **deadline15s thật**, không nhận chênh lệch với native là model inference time. **0 timeout,0 abort,0 pending provider**, all returned before15s; không kết luận về live GPU cancellation effectiveness từ lượt không timeout.

Live-only samples: RAM free **2925–3333MiB**, VRAM used **6589–6805MiB**. Đây là before/after snapshots, không continuous peak. RTX4060 được nhận; native log **37/37 layers offloaded**, CUDA model2375,91MiB, KV2304MiB, CUDA compute186,03MiB, kèm host buffers. `/api/ps` sau run: size=size_vram5102307901 bytes, context16384, expiry21:59:43.455+07. Không suy diễn100% compute chạyGPU từ layer/size ratio; CPU/GPU time split không đo trực tiếp.

Native log lúc **21:53:57.400** vẫn có `llama-server GPU discovery watchdog timed out` và `unable to refresh free memory, using old values`. Preparation/inference vẫn hoàn tất; **runtime P2 OPEN**, không thay GPU flags/context/timeout để che warnings.

## 11. Regression offline sau LIVE

[Execution](evidence/t-ai-04-g2-live-multi-turn-validation/final-verified/execution.json), [additional results](evidence/t-ai-04-g2-live-multi-turn-validation/additional-offline-results.json), [case-level audit](evidence/t-ai-04-g2-live-multi-turn-validation/analysis.json). Offline children cấm native Ollama/network và DB, LIVE disabled; không inference phát sinh. Harness/control copy byte-identical từ G2 baseline, original assertions không sửa.

| Suite | Actual PASS /FAIL /NOT RUN | Isolated downstream control PASS /FAIL |
|---|---|---|
| G2 Verified History |**68 /0 /0**|—|
| Natural Proof |**79 /0 /0**|—|
| Compatibility Acceptance |**61 /0 /0**|—|
| Execution Correction |**42 /0 /0**|—|
| Server Completeness |**52 /0 /0**|—|
| Readiness/Abort |32 /1 /0|33 /0|
| Diagnostics |8 /5 /0|13 /0|
| MissingSlotRecovery |13 /20 /0|33 /0|
| SlotFillingPrompt |11 /10 /0|21 /0|
| G1SafeContract |26 /0 /0|26 /0|
| DecisionRouting |10 /0 /0|10 /0|
| DecisionFormatSafety |17 /0 /0|17 /0|
| Foundation original mixed-intent |17 /5 /0|17 /5|
| Transport |18 /1 /0|19 /0|
| F applicable |23 /0 /0|23 /0|
| Frontend conversation unit |10 /0 /0|10 /0|
| **Original181 total** |**145 /36 /0**|**176 /5**|
| Foundation single-intent control, riêng |**22 /0 /0**|Không assessor/gate stub|
| Backend build |**PASS**, trước manifest và sau LIVE|—|

So sánh original suite names/status, readiness và diagnostics với G2 baseline: **0 đổi trạng thái**. Legacy36 không được đổi thành PASS:31 policy conflicts server-first +5 mixed-intent fixture, như compatibility mapping đã có. Downstream controls stub exported assessor chỉ trong child test; không tính176 như full production-policy acceptance. Foundation22 control tách single intent, giữ original assertion/values và real gate/synthetic catalog; không DB fidelity.

Historical F nguyên bản vẫn dừng tại unsafe historical expected completed vs actual needs_input; giữ log/expected, không cộng vào181 applicable. Offline G2 timeout tests dùng unit clock mapping, không gọi đó là native Ollama latency. Frontend build/Browser/fullV2/DB E2E **NOT RUN**, ngoài scope.

## 12. Source, benchmark và evidence integrity

[Before](evidence/t-ai-04-g2-live-multi-turn-validation/integrity-before.json) / [after](evidence/t-ai-04-g2-live-multi-turn-validation/integrity-after.json): **5124 protected files trùng**,0 source/historical evidence changes. Đồng thời kiểm G2 baseline5026 files,96 sealed G2 artifacts+report và84 compiled modules; tất cả khớp. Existing dirty working tree được giữ, không claim repository sạch. Chỉ thêm report/harness/evidence task này và generated build/audit outputs; không application source edit.

| Baseline source, không đổi | SHA-256 |
|---|---|
| currentCompleteness.ts |`d4ebfccc0e5a05f08e0c2cf2046d77d9b7aeafd3f407c0a6193052a4adb0970e`|
| currentTurnProof.ts |`81b354fbb59ce4c06e51870e439b9642691a55077db5e14637ba0bade8fa67ca`|
| toolProvenance.ts |`f195523913adea6daac7ca9149b113b0cc5d4f721c4b9733b28a7b11c9e803a6`|
| agentRoutes.ts |`6e3fa8ca7e439aa69c079e7895e71af381f50ec34d1210572e55065d5cab84af`|
| agentService.ts |`67d67b5ef92b66c81692586bb713bade5cbfa2fffa102e233aa4c4482731cb07`|
| verifiedHistory.ts |`a835b9781684fd5b759be461e56d6d0fc4034797b96eb0c3018754230ff8bd78`|
| agentVerifiedHistory.test.ts |`d8c4fa63475882df9c79c904e98b059794ad22260eb1d74e6a19191f23a36134`|

V2 APPROVED hash **`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`**, lock **`f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706`** nguyên vẹn. Không sửa V1/V2/history/expected. Không dùng G2 cohort ghi đè điểm V2 G1 cũ. [Artifact checksums](evidence/t-ai-04-g2-live-multi-turn-validation/artifact-checksums.json) seal toàn bộ evidence task và report cuối.

**PostgreSQL0 attempts**, không fixture/write/cleanup DB, fingerprint **N/A — không truy cập DB**, không giả định đã fingerprint. In-memory session đã revoke, remaining0 trước dispose. Không migration/reset/seed/truncate, không Planner/Catalog/Trip/Booking/pricing/Map/sentiment/T13-B change, không commit/push/deploy.

## 13. Lỗi còn OPEN và điều kiện nghiệm thu

| Issue / acceptance | Trạng thái |
|---|---|
| **TAI03B-B1-01 P1 raw NLU** |**OPEN**; L03 false clarify với complete verified motorbike. Run này không còn all-unsupported nhưng chưa đủ raw4/4 để đóng|
| Runtime P2 |**OPEN**, watchdog/free-memory warnings còn thực tế|
| Budget grammar false negatives |**OPEN observation P2**, natural decimal correction và labeled trailing period fail closed; chưa FIX, không bypass|
| Map P2 / VI14 |**OPEN / untouched**, không điều tra task này|
| G2 owned state/correction/safety |**PASS trong probe đã chạy**; model L03 sai không làm mất state hoặc execute sai|
| Overall LIVE probe |**FAIL:3/4 raw**, không công bố APPROVED_SCOPE_PROBE_PASS|
| Production durability/frontend readiness/fullV2/fidelity |**NOT ACCEPTED / NOT RUN** theo phạm vi tương ứng|

Không có bằng chứng unauthorized execution, private-data leak hoặc source regression trong run. Kết luận này chỉ giới hạn các inputs/guards đã kiểm, không bảo đảm tổng quát mọi hội thoại, profile hay production concurrency. Không có quyền tự sửa production hoặc phát sinh request mới để đổi L03 FAIL.

## 14. NEXT TASK PLAN — cần duyệt, chưa thực hiện

Do probe chưa PASS, **chưa chuyển thẳng sang frontend**. Đề xuất dependency:

1. **`T-AI-04-G2-RAW-CLARIFY-INVESTIGATION` — offline, read-only.** Đọc exact L03 body/raw/trace và G2 original SYSTEM+supplement/slot role/correction grammar/schema. Đối chiếu L01/L02/L04, xác định bằng chứng CONFIRMED/LIKELY/HYPOTHESIS; không suy nguyên nhân từ một sample, không inference/tuning benchmark. Bao gồm review hai budget grammar limitations như observation riêng, không tự FIX ngoài scope.
2. **FIX riêng nếu owner duyệt proposal.** Chốt minimal source scope và independent offline expectations, giữ schema/strict validators/ownership/consent/limits/read-only contract; không hợp thức hóa L03 bằng đổi expected, lược slot hoặc giả tool. Chạy68/79/61/42/52,181 actual/control,readiness/diagnostics/Foundation/build và integrity như task này.
3. **LIVE revalidation cần ngân sách mới.** Năm POST của task hiện tại đã dùng hết. Khóa fresh exact multi-turn manifest/body trước POST; cùng approved principal, scan cả timestamp fields/rate/TTL/keepalive/resources. Dự kiến cần owner duyệt tối đa01 conditional load +04 inference, không tự nhận còn allowance/retry từ task này. Chấm raw/history/safety/runtime riêng, guard failures dừng.
4. Chỉ sau probe/revalidation đạt acceptance, đề xuất **`T-AI-04-G2-FRONTEND-INTEGRATION-AND-LOGOUT`**. Dependency: owner chấp thuận local/demo opt-in/retention và limitations; UI quản lý server ID/revision/fresh requestId, expiry/reset/revoke/logout đúng contract, không client history seed/proof, không claim durable/global JWT revocation. Browser desktop/mobile và real tool/DB fidelity nếu cần phải có scope/guard/approval riêng.

**Dừng sau báo cáo. Không FIX, không thêm inference, không triển khai frontend/NEXT TASK.**
