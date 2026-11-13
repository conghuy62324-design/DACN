# T-AI-04 — Planner LIVE Targeted Revalidation

Ngày 11/11/2026, Asia/Saigon. **STOP_PHASE_A_ADAPTER_ACCEPTANCE_FAIL**.

Offline adapter-binding acceptance đạt **20 PASS / 1 FAIL**. Đã dừng ở Phase A theo stop condition, trước fresh quota/DB preflight, INSERT, direct Planner và mọi request Ollama. **R01/R02/R03 LIVE đều NOT RUN**. Native POST **0/4**, fixture created0, DB access0; regression/build sau cleanup chưa chạy.

Lỗi nằm trong acceptance test mới tôi tạo: injection manifest dừng trước stage nên chưa có active case; cleanup precondition của test yêu cầu active case và chặn cleanup action, nhưng parent assertion lại yêu cầu action chạy một lần. Global stop vẫn hoạt động, original manifest error được giữ, later cases NOT RUN và dispose gọi một lần. Không sửa test/expected rồi tiếp tục LIVE sau gate FAIL.

[Stop record](evidence/t-ai-04-planner-live-targeted-revalidation/stop.json), [Phase A acceptance](evidence/t-ai-04-planner-live-targeted-revalidation/phase-a-adapter-acceptance.json), [owner task](evidence/t-ai-04-planner-live-targeted-revalidation/owner-task.txt), [checksums](evidence/t-ai-04-planner-live-targeted-revalidation/artifact-checksums.json).

## 1. Approval và scope

Owner cấp approval có điều kiện cho exact PROFILE 2 trên travelgo_ai_m0_test, tối đa **1 conditional load-only +3 inference =4 native POST**, không retry/hidden warm-up. Chỉ chạy các phase sau khi adapter-binding acceptance PASS. Không dùng cap dư run2 hoặc đổi principal/expected/production.

Đã đọc bốn báo cáo baseline được giao, corrected orchestrator/fence/comparator/UTF-8 helpers, adapter contract, acceptance drivers và independent cost oracle. [Baseline review](evidence/t-ai-04-planner-live-targeted-revalidation/baseline-review.json). Giữ nguyên historical H02/H03/H04 offline PASS, 68 checks, mock browser4, frontend49, browser74, backend302; các số này không phải regression mới của task hiện tại.

## 2. Real adapter review

[Candidate adapter review](evidence/t-ai-04-planner-live-targeted-revalidation/adapter-review.json), [runtime-adapters.cjs](evidence/t-ai-04-planner-live-targeted-revalidation/runtime-adapters.cjs), [real-guards.cjs](evidence/t-ai-04-planner-live-targeted-revalidation/real-guards.cjs).

Đã tạo candidate runtime bằng cách tách phần real browser/Vite/Express/production auth/G2/provider/tool của run2 thành import-only factory, bind các guard thật vào corrected orchestration. Candidate dùng production AgentLimits20, server-owned history/revision, signed test JWT qua production auth, exact request binding/body hashes, actual gate/Planner/Catalog/read-only Sequelize và maintenance guards. Không có `async () => true` trong candidate LIVE ports.

Native policy được siết trong **bản sao thuộc task mới** thành total4/inference3/operator1; thêm operator channel vào shared fence để cùng tính cap. Agent/native/tool dùng ctx.agent/ctx.native/ctx.tool; load-only dùng ctx.operator. Incoming request/page error và maintenance isolation loss đóng stop latch. H02 public comparator và H03 UTF-8 helper giữ nguyên byte từ bản đã nghiệm thu.

Đây là candidate source review, **chưa phải REAL_ADAPTERS_ACCEPTED**. Factory không được instantiate, chưa start real browser/server/provider hoặc kết nối DB vì Phase A gate không đạt. Historical harness và offline acceptance đã niêm phong không bị sửa.

## 3. Offline fail-fast integration — gate FAIL

[Independent binding suite](evidence/t-ai-04-planner-live-targeted-revalidation/adapter-binding.test.cjs) chạy bằng separate child processes với sensor doubles được ghi rõ OFFLINE; dùng cùng RealGuards binding và corrected orchestrator candidate. Node preload chặn PostgreSQL/Ollama/external fetch/socket. Sáu source parse checks, missing-binding registration, các injection khác, success path, source boundary checks và production proof/provider serialization đều được kiểm.

Kết quả **20 PASS / 1 FAIL**. Failure là assertion của parent trong scenario manifest; không phải native model output hoặc production manifest drift.

| Quan sát manifest injection | Actual |
| --- | --- |
| Original first failure | INJECT_manifest, phase manifest, synthetic R01 |
| Global stop | true |
| Synthetic R01 | FAIL |
| Synthetic R02/R03 | NOT RUN |
| Agent/native/tool callbacks | 0 / 0 / 0 |
| Cleanup finally invoked | true |
| Cleanup precondition | FAIL: active case chưa được stage |
| Cleanup action | BLOCKED, callback count0 |
| Resource dispose | PASS, callback count1 |
| Child process exit | 1 |
| Parent assertion sai | Yêu cầu cleanup action count1 trong scenario này |

[Raw manifest injection evidence](evidence/t-ai-04-planner-live-targeted-revalidation/binding-manifest.json). Lỗi cleanup thứ cấp không thay original manifest error. H04 không tiếp tục R02/R03; tuy nhiên acceptance suite chưa toàn bộ PASS nên **không bỏ qua gate**. Các synthetic IDs/counters trong Phase A không phải LIVE cases/native POST hoặc Agent HTTP quota turns.

## 4. Fresh quota

**NOT RUN — Phase B chưa đến.** Không báo số remaining hiện tại bằng historical snapshot; không gọi rate scanner như một execution gate sau Phase A FAIL, không hydrate/reset actual LIVE limiter hoặc đổi principal.

Candidate manifest được thiết kế có **6 normal Agent turns +1 conservative operator reserve =7 entries**: desktop start thiếu transportation, R01 manual confirm, R02 budget correction, desktop revoke, R03 fresh mobile start, mobile revoke. Operator load-only dự phòng1. Default20/hour và policy scan toàn historical attempts, cả at/createdAt, giữ nguyên để task sau kiểm mới tại thời điểm chạy. Đây là kế hoạch reservation, chưa phải fresh quota PASS.

## 5. Database identity và isolation

**NOT RUN.** Không truy cập travelgo_ai_m0_test hoặc DB khác, không đo lại identity/sentinel/12 migration checksums/schema/25-table baseline/27 Trip/FK/collision. Không mở maintenance connection hoặc acquire locks.

Candidate maintenance được dẫn xuất từ implementation run2: runtime luôn READ ONLY, all25-table lock/probe và queued handoff, exact ownership/hash/reference guards. Chưa thực thi nên không gọi enforced isolation PASS. Role postgres là superuser theo baseline, không least privilege; current role/connection chưa được kiểm mới.

## 6. Fixture ledger

[Ledger](evidence/t-ai-04-planner-live-targeted-revalidation/fixture-ledger.json): **NOT RUN_BEFORE_DB_ACCESS_OR_WRITE_INTENT**. Approved IDs giữ nguyên:

- A01: f7433d4a-5f49-4991-8add-b55435b02eb0, price100000.
- A02: 5a1e8835-770c-41a2-8699-74deba239a86, price150000.

Full proposal giữ attraction/Đà Nẵng/APPROVED/business_id NULL/TEST FIXTURE. insertedIds=[], committedHashes=[], affectedRows0; không tạo timestamps/ownership giả. Không INSERT/UPSERT/UPDATE/DELETE/seed hoặc tạo Business/Trip/Booking/User. Current presence/collision của hai UUID không được đo trong task này.

## 7. Direct Planner oracle

**NOT RUN.** Candidate direct harness đã chuẩn bị R01 motorbike/base budget, R02 motorbike/budget9000000, R03 car/base budget; chưa gọi service hoặc PostgreSQL.

Approved independent arithmetic vẫn là thiết kế: hai ngày một đêm, A02/A01 mỗi ngày một sightseeing, day totals2600000/900000, tổng3500000, base remaining2900000, budget9000000 remaining5500000; correct lodging/meals/selected IDs và Haversine ETA car/motorbike. Không gọi đây là actual oracle PASS mới. Historical direct Planner PASS và cost outputs không bị thay.

## 8. LIVE manifest và body lock

**NOT LOCKED / NOT EXECUTABLE.** Có [capture-templates.cjs](evidence/t-ai-04-planner-live-targeted-revalidation/capture-templates.cjs) để kiểm production completeness/current-turn proof/provider serialization offline. Trong Phase A, server completeness nhận đủ sáu fields và thiếu transportation không gọi fake provider; ba complete inputs sau manual/budget/fresh mobile được serialize bằng production provider với fake in-memory fetcher.

Không HTTP/DB/model trong bước capture; không dùng fake clarify như raw model result. Vì gate FAIL, không ghi final LIVE manifest, committed fixture binding hoặc approved native body files, không tạo manifest-lock giả ready. Candidate source hashes nằm trong adapter review, không phải quyền dispatch.

## 9. Native POST ledger

[Ledger](evidence/t-ai-04-planner-live-targeted-revalidation/native-post-ledger.json): load-only0, inference0, **total0/4**, attempts=[], retry0, hiddenWarmup0, Ollama metadata GET0. Không instantiate LIVE provider, preload/unload/model switch hoặc gửi probe. Offline provider serialization/counters không cộng vào native ledger.

## 10. R01–R03 raw results

| LIVE case | Actual |
| --- | --- |
| R01 desktop missing transportation → explicit Xe máy → plan_trip | NOT RUN_BLOCKED_PHASE_A |
| R02 same-session budget9000000 correction | NOT RUN_BLOCKED_PHASE_A |
| R03 fresh mobile car complete plan | NOT RUN_BLOCKED_PHASE_A |

RAW_NLU **NOT EVALUATED**, returned/evaluated0. Không chấm gate blocker thành raw FAIL hoặc PASS. Không chạy historical L04 để thay verdict; historical raw3 PASS/1 FAIL giữ nguyên.

## 11. G2 history và safety

G2 LIVE session/history/revision/ownership/auth/cap/quota/TTL **NOT RUN**. Offline capture tạo memory stores riêng và dispose trong finally; không có LIVE session cần revoke, không tạo HTTP Agent attempt.

Measured safety của task: dừng trước DB/inference khi offline gate FAIL, không retry LIVE. Shared orchestration injection chứng minh original error/stop/later NOT RUN/dispose; acceptance tổng vẫn FAIL, không nâng thành toàn real runtime safety PASS.

## 12. Public JSON fidelity

**NOT RUN LIVE.** Comparator H02 public JSON chỉ normalize itinerary.id/createdAt được copy nguyên byte. Candidate thiếu independent oracle sẽ FAIL CLOSED. Fidelity failure injection trong Phase A dừng các synthetic later cases; đây là offline orchestration proof, không real Planner/API fidelity result.

Historical L01–L03 original fidelity assertions FAIL và independent saved JSON3 PASS đều giữ nguyên; không rewrite chúng bằng reviewed output.

## 13. Desktop/mobile browser

**NOT RUN LIVE** trên cả1440×900 và390×844. Không launch browser/Vite/Express thật trong task này; không có screenshot LIVE mới. Corrected UI helper/Unicode strings và actual adapter code đã được chuẩn bị, chưa thực thi.

Historical mocked browser4/4 và regression74/74 là baseline; không tính chúng thành newly executed browser PASS. Không tạo route mocking trong candidate LIVE factory.

## 14. Runtime và P2

Current model/version/digest/residency/GPU/RAM/no-proxy/readiness, latency/tokens/deadline/abort **NOT MEASURED**. Không Ollama GET/POST. Approved tag/digest/loopback/options/15s application timeout vẫn là yêu cầu cho future execution, không phải runtime verification mới. **P2 OPEN**.

## 15. Cleanup và fingerprint

Actual cleanup **N/A_NO_INSERT**, không owned fixture mới và không DELETE. Không có real cleanup precondition failure hoặc residual fixture task cần owner recovery; BLOCKED trong manifest injection là simulated action trong offline test, không phải CLEANUP_BLOCKED_OWNER_REVIEW trên DB.

Fingerprint25/25, places22/22 và Trip27/27 **không đo mới**. Historical run2 DB restored25/25, Trip27/27 vẫn nguyên evidence; không tuyên bố DB hiện tại đã kiểm lại hoặc restored mới.

## 16. Regression/build

**NOT RUN sau Phase A STOP**: frontend49, mocked browser74, backend68/79/61/42/52, original legacy181, readiness/diagnostics, hai build. Chỉ có Phase A syntax/binding/injection/proof capture checks thực thi mới.

Historical frontend49/browser74/backend302 và legacy145 PASS/36 FAIL vẫn là baseline, không newly executed PASS; không đổi legacy assertions. Không broad regression sau guard stop để lấy thêm kết quả.

## 17. Source/benchmark integrity và offline boundary

[Final integrity](evidence/t-ai-04-planner-live-targeted-revalidation/integrity-after.json), [offline boundary audit](evidence/t-ai-04-planner-live-targeted-revalidation/offline-boundary-audit.json). Source/docs/benchmark/history snapshot khớp before, changed=[]; previous reliability report và **1020 sealed artifacts**, cùng84 compiled modules giữ hash. Không đổi production source, SYSTEM/proof/history/schema/gate/Planner/Catalog/auth/limits, V2 benchmark hoặc historical expected.

Phase A Node/children dùng sealed offline preload chặn pg.connect và restricted fetch/socket; capture fetcher trả Response trong bộ nhớ. Candidate runtime/DB/maintenance/direct files chỉ parse/source review, không invoke. DB connection/query0, Ollama request0, Agent HTTP0, browser launch0 theo executed code paths và offline guards; không OS-wide packet capture hoặc fresh DB state audit. Chỉ thêm report/evidence/candidate harness task mới, không commit/push/deploy.

## 18. P1/P2 và acceptance

**P1 NLU OPEN, P2 runtime OPEN**. Historical redundant clarification L04 raw FAIL và historical global-stop H04 FAIL không đổi. Corrected harness offline PASS của task trước không đồng nghĩa candidate real adapter binding đã đạt.

Kết luận task: **STOP_PHASE_A_ADAPTER_ACCEPTANCE_FAIL**, không LIVE result, không full NLU PASS, không demo readiness PASS.

## 19. Remaining limitations

Candidate real adapters chưa đạt entry gate; native shared cap4/3/operator1 và full real binding cần independent acceptance tiếp. Test manifest failure hiện tại nhầm cleanup action với finally/resource dispose khi failure xảy ra trước stage; cần tách no-resource/no-insert cleanup với fixture-owned guarded deletion. Không được nới cleanup safety để ép callback count1.

Mọi DB/model/browser/runtime result còn thiếu đều ghi NOT RUN; không dùng prior evidence hoặc mocks lấp coverage này. Approval hiện có không cho bỏ qua Phase A.

## 20. NEXT TASK PLAN — chỉ đề xuất

Đề xuất task offline **T-AI-04-PLANNER-ADAPTER-BINDING-ACCEPTANCE-FIX**: giữ failure evidence; sửa contract/assertions cho manifest error trước stage, kiểm finally/dispose một lần và cleanup action chỉ khi đủ preconditions; bổ sung combined operator/native cap4/3, missing adapter và real binding isolation coverage. Không sửa production hoặc chạy DB/Ollama trong task sửa gate đó.

Chỉ sau offline gate PASS mới đề xuất tiếp targeted LIVE với fresh quota/DB/isolation/fixture approval/oracle/manifest/native budget tại thời điểm chạy. Không tự dùng bốn POST chưa tiêu như quyền mới, không retry historical L04, không V2 LIVE hoặc deploy.

**Đã dừng sau guard failure và báo cáo này.**
