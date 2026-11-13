// Final read-only evidence review and document sealing; no service/network/DB calls.
const c=require('./common.cjs');
const analysis=c.json(c.prefix+'readiness-analysis.json'),inventory=c.json(c.prefix+'catalog-inventory.json'),safety=c.json(c.prefix+'database-safety.json'),fixture=c.json(c.prefix+'fixture-proposal.json'),design=c.json(c.prefix+'design-validation.json'),sources=c.json(c.prefix+'source-evidence.json'),before=c.json(c.prefix+'fingerprint-before.json'),after=c.json(c.prefix+'fingerprint-after.json');
c.assert.equal(analysis.status,'READONLY_ANALYSIS_PASS_FIXTURE_REQUIRED');c.assert.equal(design.failed,0);c.assert.deepEqual(before,after);c.assert.equal(before.tables.trip_sessions.rows,'27');c.assert.deepEqual(before,c.json(c.previous+'fingerprint-final.json'));
c.assert.equal(analysis.databaseWrites,0);c.assert.equal(analysis.ollamaRequests,0);c.assert.equal(analysis.plannerExecutions,0);c.assert.equal(analysis.dbAudit.forbidden,0);c.assert.equal(analysis.networkAudit.fetchAttempts,0);c.assert.equal(analysis.networkAudit.forbiddenSocketAttempts,0);
c.assert.equal(safety.session.transaction_read_only,'on');c.assert.equal(safety.migrations,12);c.assert.equal(safety.role.rolsuper,true);
const protectedHashes=c.snapshot();c.assert.deepEqual(protectedHashes,c.json(c.prefix+'integrity-before.json').hashes);const integrity=c.integrity();
c.write('integrity-after.json',{at:new Date().toISOString(),status:'PASS',hashes:protectedHashes,protectedFiles:Object.keys(protectedHashes).length,changed:[],historical:integrity,productionChanges:0,benchmarkChanges:0,originalExpectationsChanged:0});
c.write('coverage-status.json',{at:new Date().toISOString(),decision:'FIXTURE_REQUIRED_OWNER_APPROVAL',executed:{currentReadOnlyDBGate:'PASS',freshCatalogInventory:'PASS',fingerprint:'25/25 unchanged,Trip27/27',pureDesignChecks:{passed:design.passed,failed:0,notRuntimeAcceptance:true}},notRun:['Fixture creation','Fixture cleanup','Direct production Planner success/error execution','Agent/LLM inference','Ollama GET/preload/unload','Browser desktop/mobile','Acceptance A-L runtime checks','T11/T11-B scenario regressions','Frontend/backend broad unit/mocked-browser/legacy suites','Frontend/backend build','V2 LIVE'],historicalOnly:{searchLive:'desktop/mobile PASS',rawSearch:'2/2 PASS',H01:'FIXED',frontend:'49 unit/74 mocked browser PASS',backend:'68/79/61/42/52 PASS',legacy:'145 PASS/36 FAIL',P1:'OPEN',P2:'OPEN'},newDatabaseWrites:0,newOllamaRequests:0,newPlannerExecutions:0,cleanup:'N/A:0 rows created'});
const e='evidence/t-ai-04-planner-test-data-readiness/';
const primary=fixture.minimumProfile.records[0].values,optional=fixture.optionalProfile.records[1].values;
const sourceLink=(file,anchor)=>{const x=sources.sources.find(x=>x.file===file),a=x.anchors.find(a=>a.text.includes(anchor));return`[${file.split('/').at(-1)}:${a.line}](../${file}#L${a.line})`;};
const report=`# T-AI-04-PLANNER-TEST-DATA-READINESS

Ngày **11/11/2026**, Asia/Saigon. Kết luận **FIXTURE_REQUIRED_OWNER_APPROVAL**.

Catalog hiện tại không có attraction/tour Place hợp lệ cho **Đà Nẵng**. Source yêu cầu tối thiểu **1** điểm tham quan hợp lệ trong toàn chuyến; không yêu cầu 4 điểm cho 2 ngày. Đã hoàn tất phân tích READ ONLY và thiết kế fixture cụ thể, **chưa tạo fixture, chưa chạy Planner hoặc Ollama**. Fingerprint mới **25/25 bảng unchanged**, **27/27 Trip preserved**. Mọi dữ liệu đề xuất mang nhãn **PROPOSED_NOT_EXECUTED**. P1 NLU/P2 runtime vẫn **OPEN**.

## 1. Baseline và phạm vi

Đã đọc báo cáo [Harness Fix/Resume](HUGO_T_AI_04_G2_E2E_HARNESS_FIX_RESUME_REPORT.md), [Browser/Real Tool E2E](HUGO_T_AI_04_G2_BROWSER_REAL_TOOL_E2E_REPORT.md), [Frontend/Logout](HUGO_T_AI_04_G2_FRONTEND_INTEGRATION_LOGOUT_REPORT.md), [T03-A](HUGO_T03_A_PLANNER_REPORT.md), [T03-B](HUGO_T03_B_PLANNER_REPORT.md), [T11](HUGO_T11_RECOMMENDATION_PLANNER_EVALUATION_REPORT.md), [T11-B](HUGO_T11_B_PLANNER_FEASIBILITY_REPORT.md); kiểm Planner, GeoService, RecommendationService/Repository, PlaceRepository/serializer, adapter, validator, proof/gate, schema/migrations và test DB config. [Owner task](${e}owner-task.txt), [source anchors/hashes](${e}source-evidence.json).

Baseline lịch sử giữ nguyên: desktop/mobile search LIVE PASS; real Catalog fidelity PASS; raw search NLU **2/2 PASS**; H01 FIXED; trước đó DB25/25 unchanged,27 Trip; Planner E02–E06 **BLOCKED_DATA_READINESS**; P1/P2 OPEN. Những số này **không phải rerun trong task hiện tại**. Không sửa production, SYSTEM, schema/tool gate, Planner algorithm, benchmark V2 hoặc expected cũ.

## 2. Database safety gate

[Safety](${e}database-safety.json), [schema/migration gate before](${e}db-gate-before.json), [after](${e}db-gate-after.json), [read-only harness](${e}readonly-db.cjs), [network boundary](${e}network-boundary.cjs).

| Gate | Kết quả quan sát mới |
|---|---|
| Configured endpoint | **127.0.0.1:5432 / travelgo_ai_m0_test** |
| Sentinel | **hugotravel-isolated-test-database-v1** |
| Migration checksums | **12/12**, DB = SQL file = approved baseline |
| Schema SHA-256 | **${safety.schemaSha256}**, khớp baseline |
| Default/session transaction | **default_transaction_read_only=on**, **transaction_read_only=on** |
| Role | **postgres**, superuser=true, bypassRLS=true; **không least-privilege** |
| SQL/query boundary | Chỉ SELECT/SHOW tại ORM call boundary; startup/per-connection cố định READ ONLY và statement timeout15s |
| Actual audit | **${analysis.dbAudit.queries} queries, ${analysis.dbAudit.connections} connections, 0 forbidden SQL** |
| Network | Chỉ loopback PostgreSQL5432; **0 HTTP/Ollama GET/POST**, 0 blocked-network attempts |

READ ONLY có hiệu lực từ startup options trước catalog queries; afterConnect xác minh identity/READ ONLY mỗi connection, gate kiểm sentinel trước data access. Fixed session-setup SET chỉ thiết lập READ ONLY/timeout, không sửa entity/schema. Không thử ghi thất bại để chứng minh readonly. Role superuser không tự được coi là an toàn. Không kết nối DB khác, không INSERT/UPDATE/DELETE/TRUNCATE/DDL/migrate/seed/reset.

## 3. Current Catalog inventory

[All-status inventory mới](${e}catalog-inventory.json), [unchanged production loader projection](${e}production-loader-projection.json), [separate tours inventory](${e}separate-tours-inventory.json).

| City/group | Attraction | Tour category | Hotel | Restaurant | Trạng thái / eligibility |
|---|---:|---:|---:|---:|---|
| Đà Nẵng | **0** | **0** |5|1|6 Place APPROVED;4 hotel có Business SUSPENDED; còn **2 eligible** |
| Hội An / Quảng Nam |8|0|0|0|8 Place **SUSPENDED**, Business ACTIVE;0 eligible |
| 8 city dạng Phase35 City + số |8|0|0|0|Mỗi city1 APPROVED attraction/Business ACTIVE;8 eligible ngoài Đà Nẵng |
| **Tổng** |**16**|**0**|**5**|**1**|**22 rows**,14 APPROVED loader rows,10 eligible sau Business filter |

Hai record eligible tại Đà Nẵng: HuGo Seafood **350000 VND**, ID **b2f9a5cb-5258-421e-8050-1b3d55997fa7**, và HuGo Riverside Hotel **1200000 VND**, ID **39a5483f-e3d0-4cf8-a9b9-65e6b0a33593**. Không sửa chúng. Các record inventory đều có coordinates trong range, summary/address/hero_image không rỗng và giá catalog hiện tại hợp lệ; thiếu các field này không phải nguyên nhân blocker đang quan sát.

Bảng **tours** riêng có tour APPROVED tại Hội An và các city Phase35, nhưng Planner đọc **places.category IN(attraction,tour)**, không đọc tours/tour_places/tickets để lấp sightseeing. Không chuyển một Tours row thành Place bằng giả định hoặc dùng capacity/date của bảng tours để giải thích điều kiện của Planner này.

## 4. Eligibility,matching và constraints theo source

Pipeline: PlaceRepository publicOnly lọc status APPROVED → RecommendationRepository paginate đủ catalog/serialize price availability → Planner loại Business không ACTIVE (nếu business_id có giá trị) → match destination exact → tách attraction/tour → guard422 → ranking → clustering → costing.

${sourceLink('backend/src/services/tourPlannerService.ts','function isPubliclyEligible')}, ${sourceLink('backend/src/services/tourPlannerService.ts','function matchesDestination')}, ${sourceLink('backend/src/services/tourPlannerService.ts','if (!attractionCandidates.length)')}, ${sourceLink('backend/src/services/geoService.ts','const itemsPerDay')}, ${sourceLink('backend/src/agent/tools.ts','const itinerary = await TourPlannerService')}.

- Matching Planner là **NFC + trim + lower-case vi-VN**, equality trên city **hoặc province**, không rỗng. Không bỏ dấu, không geographic reverse-match; coordinates gần Đà Nẵng không đổi city Phase35 thành Đà Nẵng. Recommendation có substring matching riêng, nhưng không thể mở rộng tập đã bị Planner lọc exact trước đó.
- Place phải APPROVED. Nếu **business_id=NULL**, public platform-owned Place được phép; nếu có Business thì bắt buộc ACTIVE. Không có yêu cầu tạo Business/User cho mọi Place. Không nới rule để nhận hotel suspended.
- Ít nhất1 attraction/tour **trong toàn chuyến**. Ranking không áp hard price/score cutoff; budget chỉ ảnh hưởng điểm. Lấy tối đa2×days sightseeing, cluster theo tọa độ; không duplicate một Place để lấp slot.
- Không kiểm opening_hours/booking availability/capacity/operating date của Place. Không dùng geometry location trong Planner hiện tại; nullable geometry đang rỗng không chặn flow. Duration tham quan source cố định180 phút morning,150 afternoon; lunch90,dinner120; không solver/hard daily-duration hay max-distance feasibility gate.
- Mandatory IDs: UUID, tối đa10, eligible/matching, dedupe/exactly-once; capacity2×days sightseeing,days restaurants,1 hotel. Original scenario không gửi mandatoryPlaceIds. Không tự thêm IDs fixture vào proof/model arguments.
- Ngày calendar hợp lệ, inclusive1–10 ngày; counts safe integers,adults≥1,children≥0; ngân sách finite>0; modes mới chỉ balanced và car/motorbike. Defaults children0,pacing balanced,preferences[]; không default thay field sai đã gửi. Không có điều kiện phải ở tương lai hoặc check capacity phòng theo số người.

## 5. Root cause chính xác

**Không có dữ liệu thuộc loại cần thiết tại destination đã khóa.** Có hotel/restaurant đúng city nhưng0 attraction/tour, nên source ném **422 / NO_SIGHTSEEING_FOR_DESTINATION** trước Recommendation/clustering/costing. Đây là kết luận từ inventory mới + source branch, không giả là một lần gọi Planner mới; **Planner executions=0** trong task này.

Phân biệt:4 hotel bị filter do Business SUSPENDED;8 Hội An attractions bị filter do Place SUSPENDED và khác điểm đến;8 Phase35 attractions eligible nhưng **khác city/province**, còn city numeric cũng không phải đường G2 city proof hợp lệ theo evidence đã có. Không phải bug NFC, lỗi giá, thiếu tọa độ, yêu cầu phải có4 điểm, hoặc bằng chứng Planner algorithm hỏng. Không thể dùng dữ liệu sẵn có để chạy nguyên Huế→Đà Nẵng mà không sửa data/input/eligibility. Huế là departure, không bắt buộc có catalog khởi hành; không tính intercity fare/route.

## 6. Exact minimal requirements cho original scenario

Giữ **Huế → Đà Nẵng,2036-04-22 →2036-04-23,2 adults,6400000 VND,car**: **2 ngày /1 đêm**,adult-equivalent=2,dailyBudgetPerPerson=1600000 VND. Hotel không bắt buộc để qua guard; hotel hiện có dùng cho1 đêm. Nhà hàng không bắt buộc; hiện chỉ1 nên source dùng Seafood cho day1, day2 lunch fallback.

| Số sightseeing Place hợp lệ mới | Phân bố2 ngày | Ý nghĩa |
|---:|---|---|
|0|Không tạo lịch|Guard422 hiện tại |
|**1**|**[1,0]**|**Tối thiểu theo source**,day2 chỉ có meals; không claim mỗi ngày có tham quan |
|2|[1,1]|Phương án **optional** nếu chủ dự án yêu cầu có tham quan mỗi ngày |
|3|[2,1]|Không cần cho baseline thành công |
|4|[2,2]|Lấp đủ slot tối đa, **không phải minimum** |

Pure GeoService checks xác nhận [1,0]/[1,1]; không chạy Planner hoặc inject loader fixture. Nếu original expected/owner yêu cầu daily sightseeing, phải chọn profile2 rows rõ ràng trong approval, không đổi expected sau khi đo để nhận PASS.

## 7. Proposed fixture records

[Fixture JSON đầy đủ](${e}fixture-proposal.json), [reserved UUIDs](${e}reserved-fixture-ids.json), [collision check mới](${e}fixture-collision-check.json). **Chưa insert/reserve gì trong DB**; cả2 UUID/slug hiện chưa tồn tại, không có reference trong27 Trip; phải kiểm lại khi task sau được duyệt.

| Record | Exact UUID | Category/city | Synthetic price | Coordinates | Vai trò |
|---|---|---|---:|---|---|
| A01 minimum | **${primary.id}** |attraction / Đà Nẵng|**100000 VND**|16.25,108.25|1 row bắt buộc của minimum profile |
| A02 optional | **${optional.id}** |attraction / Đà Nẵng|**150000 VND**|16.20,108.27|Chỉ thêm nếu approval chọn profile2 rows |

Tên **[TEST FIXTURE] Planner DN A01/A02 - synthetic sightseeing**;slug chứa exact UUID;summary/description/address đều ghi TEST FIXTURE,không là địa điểm/giá du lịch thật. **status=APPROVED**, **business_id=NULL** (**Business status N/A**, platform-owned), rating0/review_count0/bayesian_rating4.2; province Đà Nẵng; latitude/longitude hữu hạn; hero_image là SVG data URI chữ TEST FIXTURE; geometry nullable=NULL; JSON arrays/objects rỗng hợp kiểu; created_at/updated_at lấy DB defaults và capture vào creation ledger. Không thêm currency column: VND là contract Planner. Không Business/User/membership/Tour/Ticket/Booking/Trip/Review/AuditLog row mới; không reuse/sửa record nền.

## 8. Chi phí,ngân sách và ETA — thiết kế tĩnh

[Independent arithmetic proposal](${e}cost-oracle-proposal.json), [pure design checks](${e}design-validation.json). Đây là **STATIC_COST_DESIGN_NOT_EXECUTED**,không itinerary hoặc giá thị trường đã đo. Với minimum1 row và catalog hiện tại không drift:

| Khoản | Day1 | Day2 |
|---|---:|---:|
| Sightseeing A01 100000×2 |200000|0|
| Lunch |Seafood350000×2=700000|fallback150000×2=300000|
| Dinner fallback200000×2 |400000|400000|
| Lodging1 assumed group room/night |1200000|0|
| **Day total** |**2500000**|**700000**|

Trip **3200000 VND**,difference6400000−3200000=**3200000**,within_budget. Profile2 rows thêm A02×2=300000 → **3500000 VND**;Geo cluster sort latitude đưa A02 day1/A01 day2,day totals2600000/900000. Không nhân tổng thêm2 lần. Hotel suggestion có ID nhưng không tự nằm selectedPlaceIds nếu không có mandatory hotel activity;minimum selected IDs chỉ A01 + Seafood.

Low-budget control100000 dự kiến cùng chi phí3200000,overBudget**3100000**,BUDGET_EXCEEDED; **không cắt price theo budget**. Giá0 giữ0;thiếu giá dùng source assumptions300000 sightseeing,150000 lunch,200000 dinner mỗi adult-equivalent;lodging400000/group/night nếu thiếu hotel/giá. Đây là giới hạn T11-B,không báo giá/availability/capacity thật.

ETA: Haversine6371km,round0.01km;max(5,ceil(distance×1.35/speed×60)),car30/motorbike35km/h. Pure-coordinate witness A01→Seafood **16.57km /45min car /39min motorbike**;không road route/traffic measurement. Không vận chuyển/liên tỉnh trong tổng giá;không đổi chi phí theo mode.

## 9. SQL/FK dependencies và creation ledger

[Current constraints](${e}schema-dependencies.json), [creation/cleanup design](${e}creation-cleanup-design.json), [SELECT-only query templates](${e}verification-queries.PROPOSED.sql). Không cung cấp/chạy DML script trong task này;write actions chỉ là mô tả JSON **PROPOSED_NOT_EXECUTED**.

Outgoing FK duy nhất của Place là nullable business_id→businesses;NULL nên **không có parent cần tạo**. Incoming refs hiện có: **tour_places** (RESTRICT), **bookings/tickets/blog_posts** (SET NULL), **user_favorites** (CASCADE). Không được dựa vào CASCADE/SET NULL để cleanup vì sẽ sửa dữ liệu liên quan. **trip_sessions.selected_place_ids/itinerary là JSON,không FK**,phải kiểm riêng toàn bộ27 Trip. Không places/trip_sessions user trigger được thấy trong current schema.

Future order: owner phê duyệt profile+exact IDs/attributes vàcả creation/cleanup → maintenance window không writer khác → fresh identity/sentinel/checksums/schema/fingerprint/collision → write intent ledger → riêng maintenance connection insert chỉ exact row(s) bằng bound parameters → capture committed row/timestamps/hash/count → tắt write allowance → verify production public loader vàpre-existing row fingerprints → khóa live manifest. **Agent runtime luôn READ ONLY**,không bật write để chạy tool.

Ledger giữ approval reference,runId,proposal SHA,target/guards,baseline25 fingerprints/Trip27 hash,exact IDs/slugs/full attributes,intent/commit status,affected count,inserted row hashes,API/native attempts,cleanup preconditions/row hashes/counts vàpost-cleanup compare. Existing ID/slug → dừng,không upsert/update/adopt record cũ. Rerun chỉ cleanup được record chứng minh thuộc original committed ledger;không tự sinh ID khác để né collision.

## 10. Cleanup và bảo vệ fingerprint

**Hiện tại cleanup N/A:0 rows created.** Thiết kế task sau: sau stop/success vẫn chỉ cleanup nếu được owner phê duyệt từ đầu;dừng tương tác/LLM,đóng session memory → xác minh exclusive window,target,ledger ownership/row hash → kiểm lại mọi FK vàTrip JSON → remove bằng **exact created ID +slug +committed row hash**,expected affected count đúng1 hoặc2 đã tạo → tắt write allowance → read back absence vàso baseline25/25.

Nếu có ref mới,kể cảref có hành viCASCADE/SET NULL,row bị sửa,commit không rõ,external writer hoặc fingerprint drift: **dừng cleanup tự động**,giữ ledger/residual IDs vàđề nghị owner review recovery riêng. Không sửa/xóa Trip/Booking/User/favorites để giải phóng FK;không DELETE theo prefix/city/category,seed/truncate/restore dump hay force equality. Không tự thao tác27 Trip.

Trong thời gian fixture:places **22+N** rows,pre-existing22 row hashes không đổi khi loại đúng fixture IDs;**24 bảng khác giữ nguyên**. Sau cleanup:25/25 bằng trước fixture,places22,Trip27 exact hash. [Before task mới](${e}fingerprint-before.json), [after read-only analysis](${e}fingerprint-after.json), [compare](${e}fingerprint-compare.json) đã xác minh **25/25 unchanged,27→27** vàbefore hiện tại cũng bằng fingerprint-final resume cũ. Đây là phép đo mới,không lấy số lịch sử làm PASS mới.

## 11. Independent acceptance A–L

[Kế hoạch chi tiết](${e}independent-acceptance-plan.json): **tất cả runtime cases PLANNED_NOT_RUN**,không đổi original expected.

| ID | Lớp / oracle cần nghiệm thu sau approval |
|---|---|
|A|Loader/eligibility đúng exact rows;loại suspended như cũ |
|B|Original dates2 ngày1 đêm;phân bố sightseeing theo profile đã duyệt |
|C|Group arithmetic/từng khoản/giá/assumptions đúng independent cost oracle |
|D|Car/motorbike ETA đúng từng leg,mode costs invariant |
|E|Thiếu sightseeing trả controlled422;không sửa/xóa catalog để tạo negative |
|F|Budget thấp vẫn giữ giá,overBudget/warnings đúng |
|G|Empty catalog trả422,không fake itinerary;negative mock lane ghi MOCK_ONLY |
|H|Original schema/gate,≤1 read tool/turn,0 mutation |
|I|Direct Planner + adapter public output khớp model-triggered tool result |
|J|Desktop/mobile actual UI render itinerary/cost/warnings/fixture labels |
|K|Exact-ID cleanup restore25/25 vàbảo toàn27 Trip |
|L|Owned G2 proof chỉ từ current user/server verified slots,catalog fixture không được cấp proof;corrections/replay/expiry/quota đúng |

Fidelity oracle cho lần sau:freeze fresh direct-service result sau fixture vàtrước inference,đối chiếu public adapter projection;chỉ itinerary.id/createdAt làvolatile được normalize theo manifest. Không bỏ costs/IDs/dates/ETA/warnings hoặc lấy model output làm oracle. Không so raw private hotel object với public API projection. Data provenance vẫn là **approved synthetic test records qua real code/DB**,không claim địa điểm/giá thực ngoài đời.

## 12. LIVE E2E manifest proposal — chưa thực thi

[Draft manifest](${e}live-e2e-manifest-proposal.json),status**PROPOSED_NOT_EXECUTED**,approved=false. Task đề xuất **T-AI-04-PLANNER-REAL-TOOL-LIVE-E2E**. Giữ base scenario nguyên vẹn;G2 start incomplete →fill complete(car) →budget correction9000000 →date correction2036-04-23/24 →natural motorbike correction →conditional explicit labeled confirmation nếu raw hỏi lại an toàn →owned revoke;mobile fresh complete base scenario→revoke. Date correction đáp ứng nhánh “destination hoặc date”;không claim destination-positive coverage vì Huế/city khác chưa có data contract được duyệt.

Các exact draft messages/proof states đã được pure parser kiểm;chưa có native body lock/inference/model evidence. Redundant clarify ghi raw semantic FAIL,không đổi expected/completed;conditional “Phương tiện: motorbike” lànew explicit user-click turn nếu approved,không rewrite/retry raw cũ. Branch cóslot/quota riêng,FAIL cũ giữ FAIL.

**Ngân sách đề xuất cần approval riêng:** tối đa **6 genuine inference +1 conditional operator load-only =7 POST**,0 retry/hidden warm-up,concurrency1;không dùng quyền dư task cũ. Conditional confirm không cần thì không dùngslot đó. Tối đa9 normal Agent main turns gồm2 revoke +1 conservative operator entry=**10 rolling entries**;recompute at/createdAt/history/main/dry/operator ở thời điểm thực thi,default20/h,không dùng remaining quota cũ/đổi principal/reset limiter. TTL15 phút absolute/chain phải đủ trước POST.

Model/digest/endpoint/options/app15s giữ nguyên baseline. Future runtime GET/readiness chỉ sau approval task mới;nonresident chỉ1 approved load-body/deadline60s. Same approved principal,test-signed JWT nếu cần thì ghi authenticated test session,không real-login;explicit G2 opt-in/privacy acknowledgement,fresh UUID/server ID/latest revision. Actual React/Vite/Express/production provider/schema/gate/Planner/Catalog/read-only DB;desktop1440×900/mobile390×844,không route mocking. Score **Raw NLU / G2 History / Safety / Planner fidelity / Browser UX / Runtime** riêng. Không fake itinerary/inject prices để lấy FULL E2E PASS;DB TEST FIXTURE phải được công bố.

## 13. Kiểm tra thực chạy và integrity

[Readiness analysis](${e}readiness-analysis.json), [design validation](${e}design-validation.json), [coverage status](${e}coverage-status.json), [before hashes](${e}integrity-before.json), [after hashes](${e}integrity-after.json), [artifact seal](${e}artifact-checksums.json).

| Mục | Current task |
|---|---|
| Current DB identity/READ ONLY/checksums/schema/inventory/collision/fingerprint | **PASS**,92 SELECT/SHOW queries,3 connections,0 forbidden SQL |
| Pure design checks | **14 PASS/0 FAIL**: original validator,Geo clustering/ETA,proof reader,draft messages,JSON/schema/cost arithmetic,SELECT-only template check;không Planner/Agent runtime |
| Fixture create/cleanup | **NOT RUN / N/A**,0 writes |
| Direct Planner execution / Browser / Agent inference | **NOT RUN**,Planner0 |
| Ollama GET/POST/preload/unload | **NOT RUN**,0 requests |
| Acceptance A–L runtime,T11/T11-B,broad frontend/backend/legacy/build | **NOT RUN**,source không thay nên không rerun ngoài nhu cầu analysis |

**${Object.keys(protectedHashes).length} protected files unchanged**,changed=[],previous442 artifacts +report và84 compiled modules hash-match. Chỉ thêm report/evidence/design harness của task này;không sửa production/benchmark/original expected. Pure checks chặn mọi network/PG connection;DB analysis chặn HTTP/Ollama vàchỉ cho exact127.0.0.1:5432. Working tree có thay đổi từ trước,không revert/claim clean. Không commit/push/deploy.

## 14. P1/P2 và giới hạn

**P1 raw NLU OPEN**,**P2 runtime OPEN**;không model run để đóng lỗi. H01 FIXED vàsearch LIVE PASS lịch sử giữ nguyên. Không thay SYSTEM/candidateB/tool schema/gate/ranking/Planner algorithm. T11-B vẫn chỉ ước tính nhóm với giá-unit/capacity chưa xác minh,không cheapest/affordable solver,không road-routing/intercity fare. Single-row minimum không bảo đảm tham quan mọi ngày;2-row coverage làlựa chọn riêng cần duyệt. Fixture data không trở thành proof của user hoặc kết quả du lịch thật.

## 15. NEXT TASK PLAN và điểm dừng

**FIXTURE_REQUIRED_OWNER_APPROVAL**. Không đủ điều kiện **READY_WITH_EXISTING_DATA** cho original Đà Nẵng scenario;không thấy blocker source-contract bắt buộc sửa code. Thiết kế sẵn **minimum1 row**,optional2 rows,tất cảexact IDs/FKs/attributes/cost oracle/ledger/cleanup/stop conditions đã có để review.

Task tiếp theo đề xuất **T-AI-04-PLANNER-REAL-TOOL-LIVE-E2E** chỉ sau owner chọnprofile,duyệt fixture creation **vàcleanup exact IDs**,duyệt separately nativePOST cap/conditional confirmation,manifest/scoring,maintenance isolation vàauth scope. Trước write/inference phải refresh DB/source/quota/readiness vàfreeze expected;drift cần review,không âm thầm chỉnhinput/giá/expected.

**Đã dừng sau báo cáo. Không tạo fixture,không chạy Planner LIVE hoặc thực hiện task tiếp theo.**
`;
// Normalize prose spacing only in this new report; source/evidence untouched.
const clean=report.replace(/,(?=\S)/g,', ').replace(/và(?=[A-Za-z0-9])/g,'và ').replace(/nhưng(?=[A-Za-z0-9])/g,'nhưng ').replace(/làlựa/g,'là lựa').replace(/chọnprofile/g,'chọn profile').replace(/chỉnhinput/g,'chỉnh input');
c.fs.writeFileSync(c.path.join(c.root,c.report),clean,{flag:'wx'});
const links=[...clean.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]);
for(const link of links)if(!link.endsWith('/artifact-checksums.json'))c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link.split('#')[0])),link);
c.write('report-validation.json',{at:new Date().toISOString(),status:'PASS',sections:15,links:links.length,decision:'FIXTURE_REQUIRED_OWNER_APPROVAL',allDesignArtifactsMarkedProposed:true,fixtureExecuted:false,plannerExecuted:false,ollamaRequests:0,dbWrites:0});
const hashes={};for(const f of c.fs.readdirSync(c.evidence,{recursive:true})){const full=c.path.join(c.evidence,f);if(c.fs.statSync(full).isFile()&&f!=='artifact-checksums.json')hashes[f.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(full));}
c.write('artifact-checksums.json',{at:new Date().toISOString(),status:'FINAL_READONLY_ANALYSIS_DESIGN_COMPLETE',decision:'FIXTURE_REQUIRED_OWNER_APPROVAL',report:c.report,reportSha256:c.sha(c.read(c.report)),hashes});
for(const link of links)c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link.split('#')[0])),link);
console.log(JSON.stringify({report:c.report,decision:'FIXTURE_REQUIRED_OWNER_APPROVAL',minimalRows:1,optionalDailyCoverageRows:2,dbFingerprint:'25/25 unchanged',trips:'27/27',databaseWrites:0,plannerExecutions:0,ollamaRequests:0,protectedFiles:Object.keys(protectedHashes).length,artifacts:Object.keys(hashes).length}));
