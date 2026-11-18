

### 21.26 — V6.1-A REAL TRAVEL KNOWLEDGE ACTIVATION, CONTINUOUS LEARNING & OPERATIONAL READINESS

**FUNCTIONAL STAGING PASS; REAL COLLECTION LIMITED; REAL KNOWLEDGE APPROVAL PENDING.** Đã triển khai phần thiếu trong review center/operating scope hiện có, thu thập bài thật và nghiệm thu6/6 customer chats bằng Edge/PostgreSQL thật. Functional cost/persistence/update/revoke dùng SYNTHETIC, không phải real-world advisory PASS. Giữ đúng2 real source/candidate rows theo approval mới, **chưa có real APPROVED knowledge**. API cuối `protected` READ ONLY, Qwen/search/worker OFF. Không LIVE READY.

Qwen21.25 tiếp tục **DEFERRED — BLOCKED_RESOURCES**, B1–B4 NOT RUN. Task21.26: resource/model-quota checks0, Ollama GET/POST0, warm-load0, inference0, model training NOT PERFORMED; không Google Maps/GPS/VPS/paid API/commit/push/deploy.

#### 21.26.1. Fresh operational audit và phạm vi tái sử dụng

[Fresh audit](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/fresh-audit.json) đúng15452, db`travelgo_staging_catalog_20261112`, role`catalog_runtime` không super/createdb/createrole, sentinel`travelgo-public-staging:catalog-20261112`; **40tables/17migration checksums/130Place/20Business**. Lúc audit source/candidate/job/verified knowledge đều0; memory/language settings/mappings/preferences0; reviews0,5insights/5insight jobs hiện có giữ nguyên. Không dùng báo cáo cũ thay fresh verification.

[Actual operational state](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/readonly-operational-state.json): approved principal hash`856f41c9ad2ffc1e3f467eeb45f0069a943196101062d0e3ab3927bec64b95c5`, CUSTOMER; **SUPER_ADMIN thật0**. Customer đọc privacy/memory HTTP200, admin HTTP403; protected language503 đúng flagOFF. Không tự tạo/thăng quyền/impersonate owner. Tài khoản SYNTHETIC sau đó chỉ phục vụ cohort acceptance và đã cleanup.

| Thành phần hiện có | Đối chiếu source/actual | Trạng thái và giới hạn |
|---|---|---|
| AgentCoreService, một `/assistant` | Giữ nguyên Core, single-primary operation/confirmation;6actual chats modelOFF | Functional selected journeys PASS; không full natural conversation hoặc Qwen reasoning claim |
| Verified Knowledge/Web Registry | Existing source/candidate/version/approval/expiry/revoke fences; không shared fact cache | Có thể retrieve dữ liệu hợp lệ không cần Qwen; cuối task chỉ1UNREVIEWED source/1DRAFT candidate,0knowledge |
| Cost Intelligence | Existing typed units/comparability/server arithmetic/source citations | Actual SYNTHETIC800k→900k room scenario/update/revoke PASS; real historical candidates chưa duyệt |
| Travel Web Worker | Existing scheduler/jobs/global leases/rate/duplicates/ETag/backoff/shutdown |2actual bounded PG cycles, transportSYNTHETIC; không Internet daemon/24x7 |
| Admin Travel Web | Existing import/moderation/correction/history, thêm evidence/queue/stored snapshots | Actual Edge desktop/mobile correction/review/revoke PASS trên SYNTHETIC; real-owner mode chưa chạy |
| Adaptive Language/Memory | Existing consent/SESSION/PERSONAL/SHARED/revocation/account isolation | Source không đổi; tích hợp đã có21.24 J6current PASS, historical21.23FAIL giữ nguyên. Không rerun J6/personal fixtures trong scope này |
| Review Intelligence | Existing opinion/sample/revision fences | Fresh reviews0; không bịa positive reviews, không real review integration PASS mới |
| Decision Intelligence/TourPlannerService/Recommendation | Existing hard/soft context, what-if/cost functions/catalog authority | Không sửa weights/GROUP_VND_V1/geography/Planner. Không tạo Agent/KB/launcher thứ hai |

#### 21.26.2. Fresh Internet authorization, permissions và collection

User phê duyệt riêng Internet21.26 theo [authorization packet](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/authorization-review-packet.json), [receipt](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/internet-authorization.json). Ceiling50attempts/5domains/15articles/concurrency2/search0; production transport vẫn giữ cap chặt hơn30requests/10articles mỗi client, bounded combined ledger; không tăng security limits. Không reuse21.23/21.24 approval.

[Permission probes](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/permission-probes.json), [applicability assessment](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/permission-assessment.json), [complete attempt ledger](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/internet-receipts-final.json): **12external HTTPS attempts**, gồm robots/license/article/404/timeout/connection failure;5domains,1article thành công/2article attempts, search queries0. Giữ existing public-IP/pinnedDNS/peer/redirect/body524288/timeout/robots guards, không alternate transport hoặc blocked-domain retry. Không lưu nguyên bài; chỉ extraction bounded, excerpts/locators/hashes/attribution.

| Nguồn | Permission/access đã kiểm | Kết quả thực tế |
|---|---|---|
| en.wikivoyage.org | robots +Copyleft +CC BY-SA4.0 đọc thành công; text reuse cần attribution/article history/license/changes/ShareAlike; manual article GET, tối thiểu5s giữa requests | [Da Lat](https://en.wikivoyage.org/wiki/Da_Lat) HTTP200,303814bytes xử lý trong RAM; **12cost observations/7fact candidates**, chưa fact approval. Hội An WEB_CONNECTION_FAILED, dừng domain, Huế NOT RUN |
| vi.wikivoyage.org | robots200; permission page404 | Dừng domain, không fetch bài hoặc fresh K3; cùng Wikivoyage publisher family với EN |
| creativecommons.org | robots vàBY-SA4.0 HTTP200 | License evidence; không phải publisher du lịch độc lập |
| whc.unesco.org | robots/disclaimer200; terms phân biệt UNESCO/third-party rights | Không chứng minh license áp dụng cho từng proposed article, không fetch bài; không tính independent-source corroboration |
| www.unesco.org | robots200; open-access page timeout | Dừng domain, không retry, không dùng blanket permission |

[Real extraction](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/real-extraction-Da_Lat.json) ghi retrievedAt thực, body/content hashes, actual URL và CC BY-SA attribution. Có5typed-unit/7UNKNOWN_UNIT observations; lượng extraction **không phải accuracy score**. K1shuttle150.000VND/person và K2cable-car150.000khứ hồi/120.000một chiều được fresh-fetch/bind lại, quote ghiFeb2026; không dùng cleaned DB IDs hoặc approval cũ. Hash observation có thể trùng vì deterministic evidence không đổi. K3bus40.000VND/vé lịch sử chưa có fresh article đợt này. Publication date/current fare/availability/whole-trip scope còn UNKNOWN khi nguồn không xác minh.

Một publisher family được thu thập, chưa có independent comparable multi-source cohort. Không gọi các mức giá này là tariff hiện tại, giá thị trường, giá catalog hoặc Booking confirmed price.

#### 21.26.3. Review center và exact real-owner scope

Các file sửa: `webTravelExtraction.ts` thêm bounded quote/headings/locator cho non-price facts mới; `travelWebService.ts` thêm evidence-based fact correction/history/stored snapshot metadata và scoped reviewer guard; `travelKnowledgeService.ts` giữ same reviewer/real-vs-SYNTHETIC fence; existing `agent-staging-profile.cjs` mở rộng chế độ owner-review. Files mới: `knowledge-review-scope.cjs`, `knowledgeOperationsV61A.test.ts`, `TravelKnowledgeReview.tsx`; existing `TravelWebPage.tsx` thêm queue filter, selection counts, correction/evidence/license/attribution và stored snapshots/expiry. Không migration/KB mới hoặc redesign website.

Owner mở `/admin/travel-web`, lọc dữ liệu thật/SYNTHETIC, đọc bài gốc/permission, từng fact/cost/quote/locator/included/excluded/unknown/date, sửa theo evidence, chọn mục, reason/expiry, duyệt/từ chối/thu hồi và xem snapshot history. Không cần sửa JSON/SQL. Legacy fact thiếu locator được báo rõ và không cho free-text correction; fresh-import cần thiết để bổ sung evidence. Fact correction chỉ sửa existing non-price evidence-backed summary; không tạo fact/price ngoài contract, giữ evidence hash/original quote/content hash và audit revision.

**`scoped-owner-review`** thuộc cùng launcher: cần explicit real-owner/retention manifest, existing REAL SUPER_ADMIN exactID, source/candidate/contentHash/version/selectedIDs, bounded snapshot count/expiry; từ chối SYNTHETIC reviewer, foreign admin, stale hash/version hoặc extra selection. Không personal writes, jobs/Internet/model/worker hoặc global DB writes; SQL fence kiểm authorization expiry trước mọi DML. Chế độ này chỉ được kiểm contract/OFFLINE/describe, **chưa startup bằng real owner** vì staging không có tài khoản đó và chưa có fact-level authorization.

Actual admin browser kiểm được trên1440desktop/390mobile, không API mocks: real DRAFT approval disabled; SYNTHETIC fact correction/audit, selection/review và source revoke hoạt động. Lần orchestration đầu dừng sau PATCH200 trước reviewPOST do chưa chờ React busy/confirmation reset; giữ [observation](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/admin-review-initial-observation.json), không lặp correction hoặc normal chat. Khi900k revision mangCONFLICTING, actual review bị409; giữ [blocked result](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/admin-review-2-blocked.json), xử lý qua existing typed correction/evidence review rồi duyệt candidate version mới. Không hạ guard hoặc sửa expected để lấy PASS.

#### 21.26.4. Tách authorization và persistent real DRAFT

Owner duyệt mới [bounded staging packet](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/staging-review-plan.json), [staging receipt](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/staging-authorization.json); duyệt riêng [real retention receipt](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/real-retention-authorization.json). Internet, fixtures, retention, fact approval và worker-long-term được tách biệt. Không tái dùng approval cũ hoặc tài khoản SYNTHETIC để ký real facts.

**Exact real rows được giữ:**

- Source`3c427f07-c1e2-42eb-b380-42e46c28a2ca`: en.wikivoyage.org, permissionUNKNOWN/reviewUNREVIEWED/enabledfalse.
- Candidate`92760bb5-b51a-440e-ab7d-c4c053a5d36b`: REAL DRAFT, actual fresh extraction/content hash, knowledge_idNULL/reviewed_byNULL.
- Retention maximum theo packet: **2026-12-15T00:00:00Z =07:00 ngày15/12/2026 ICT**. Không tự kéo dài quyền giữ hoặc bật cleanup daemon. Owner/operator cần duyệt hoặc cleanup đúng IDs trước deadline; một approval/retention scope mới cần thiết nếu muốn kéo dài/activate.

**Real approved/retained knowledge IDs=[]; REAL KNOWLEDGE APPROVAL PENDING.** Hai pending rows tồn tại qua các task-owned API restarts/new authenticated browser sessions và được fresh-check lại sau cleanup/protected restore; không được đưa vào customer cost facts. [Owner review dễ đọc](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/OWNER_REVIEW.md) trình bày từng khoản/link/quote/unit/UNKNOWN; không phải phiếu approval tự động. Sau khi có real SUPER_ADMIN và scope cụ thể, owner kiểm source/fact/expiry/retention trên UI. Pending retention không đồng nghĩa source approval hoặc approval cho giá.

#### 21.26.5. Continuous update, persistent snapshots và stale/revoke behavior

Existing worker chạy đúng **2bounded cycles** qua PostgreSQL thật với HTML **SYNTHETIC injected transport**, external attempts0/model0; không crawler/scheduler khác và không rerun crash/lease recovery suite21.23. [Cycle1](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/worker1-committed.json) tạo800k/phòng/đêm; [cycle2](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/worker2-committed.json) tạo proposed revision900k. Worker không approve; candidate mới chờ reviewer, old superseded candidate ineligible, approved snapshot cũ không bị overwrite. Conflict cần human correction/re-review.

[Persistence trước](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/persistence-before-restart.json)/[sau restart](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/persistence-after-restart.json) giữ exact snapshot/version/provenance/content/reviewedAt/expiry. Browser conversation reset/new authenticated session vẫn retrieve approved SYNTHETIC state. Sau source revoke, fresh chat không còn source/scenario; không cache bypass. Đây là **functional persistent/update/revoke PASS**, không real approved knowledge PASS.

Audit existing worker vẫn có global claim/advisory lock≤2leases, bounded batch, rate/source, attempt cap12, exponential backoff≤24h, hash/near duplicate, ETag/Last-Modified, graceful shutdown/resume/lease mechanism. Không thay các algorithms đã PASS. **Real Internet worker trong launcher vẫn BLOCKED** bởi local network scope và real source moderation chưa có; không bỏ boundary để fetch. Collector Internet riêng không chứng minh automatic Internet updates. Worker cuốiOFF,0jobs; không long-term approval hoặc24/7claim.

#### 21.26.6. Actual final-source customer acceptance và response examples

[Customer acceptance](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/customer-acceptance.json): **6/6PASS,6normal POST,0retry normal chat,0model,0chatDML,API mocks=false**; actual Edge1440/390 với overflow checks. Source/inputs/expected khóa trước normal POST; source giữ nguyên suốt6case. Scope personal/review fixture writes0, không J6 rerun chỉ tăng PASS.

| Case | Actual behavior |
|---|---|
| A1 | Approved SYNTHETIC800.000/phòng/đêm,2phòng×2đêm=3.200.000VND, source card/historical/unknown availability và missing travel costs rõ |
| A2 | Cùng kết quả3.200.000 sau exact API restart và browser session mới; snapshot persisted |
| A3 |900k revision chưa duyệt/CONFLICTING:0approved source/scenario, không dùng old superseded snapshot hoặc DRAFT price |
| A4 | Sau explicit SYNTHETIC correction/review:900.000/phòng/đêm→3.600.000VND; dùng dữ liệu mới không sửa source |
| A5 | Source SYNTHETIC revoked:0eligible observations/scenario; không tự search Internet khi providerOFF |
| A6 | Registered hotel search vẫn hoạt động, DEMO rõ; không bịa review/quiet/availability hoặc biến budget chuyến thành room price |

Actual A1/A4 nói “2phòng×2đêm=3.200.000/3.600.000VND”, kèm “ước tính theo giả định, không phải giá phòng hiện tại, dự toán Planner hay xác nhận Booking” và nhãn SYNTHETIC. Actual A3/A5 nói chưa có nguồn chi phí đã duyệt đủ điều kiện; A5 còn nói search provider chưa cấu hình. A6 nêu catalog DEMO và đơn vị/availability chưa xác minh. Đây là server-grounded replies khi modelOFF, không Qwen-generated prose.

Browser measured submit→HTTP-response latency **953–1276ms** trên6case; không throughput/stress/SLA claim. Approved real knowledge advisory, multi-destination comparison, positive real review+memory journey và whole four-message planning/what-if journey **chưa nghiệm thu trong task này**. Không dùng6case để claim toàn bộ unified advisory hoặc mọi tiếng Việt đều PASS.

#### 21.26.7. Adaptive learning, memory, review và destination advisory

Source lifecycle language/memory/review/Decision/Planner không đổi. Actual integrated-review GETlanguage/memory HTTP200, items0/enabledfalse; không consent persistent mới, không tự học raw chat hoặc ghi enduring preference. SESSION/PERSONAL/SHARED, current override/revoke/isolation giữ kết quả/evidence lịch sử, bao gồm J6current-contract21.24; không regrade historical FAIL. Personal mappings không được đưa vào article extraction.

Không có real reviews mới để kiểm positive quiet/clean claims. Không bịa review hoặc suy yên tĩnh từ tên khách sạn. Existing destination/cost advisory chỉ được sử dụng≤3eligible destinations theo evidence; hiện real approved facts/comparable costs0 nên không claim Đà Lạt rẻ hơn/mát hơn/ít đông hơn hoặc tư vấn multi-destination có căn cứ thật. Không tạo listing/partner/Booking khi knowledge chưa có catalog. Recommendation weights, Planner numeric functions, single-primary-operation/query bounds giữ nguyên.

#### 21.26.8. Tests/build, profiles và commands

[Targeted](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/knowledgeOperationsV61A-initial.log) **10/10**, same-source [integration compatibility](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/integrationReadinessV60A-initial.log) **13/13**; [web compatibility](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/webTravelV58-initial.log) **29/30**, giữ W06FAIL: legacy đòi `bua sang` trong khi existing CostIntelligence trả `bữa sáng`. CostIntelligence hash không đổi, không sửa expected hoặc algorithm để che FAIL. **Compatibility PARTIAL**, không all-green claim. Scoped expiry checks active/expired/invalidPASS; OFFLINE PG/model/external0 theo boundary audits. Backend TypeScript buildPASS, frontend TypeScript/Vite buildPASS. Initial new test compile lỗi tên`require` đã sửa thành`taskRequire`; frontend sandbox esbuild parent access lỗi, cùng build đã PASS ngoài sandbox, không code workaround.

Actual đã kiểm `status`, `describe integrated-review`, `describe scoped-owner-review`, `worker-status`; real profile **chưa start**. Integrated-review API8696 READ ONLY với advisory flagsON, modelConfiguredfalse, memory/languageGET200, customeradmin403, DML0. Scoped APIs29140/3628/20960 chỉ exact SYNTHETIC cohort. Stop/restart luôn kiểm PID/owner/command; không tự stop frontend/Docker/Ollama/process khác. Final API11584 protected READ ONLY/source lockv2, worker/search/QwenOFF; frontend5177 giữ nguyên.

[Operator handoff](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/OPERATOR_HANDOFF.md) có commands thực tế từ`travelgo`:

```powershell
node backend/scripts/agent-staging-profile.cjs status
node backend/scripts/agent-staging-profile.cjs describe integrated-review
node backend/scripts/agent-staging-profile.cjs describe scoped-owner-review
node backend/scripts/agent-staging-profile.cjs worker-status
```

Protected→integrated-review/restore dùng existing `stop` rồi`start <mode>` chỉ khi PID thuộc launcher; scoped modes cần manifest riêng còn hạn. Real owner đọc packet/UI, không sửa JSON/SQL; operator chuẩn bị authorization theo exact current IDs/selections. Không bật global writes, default `.env` hoặc worker lâu dài. Handoff ghi rõ Internet-worker limitation, due/lease/errors/last-success và cách dừng foreground cycle.

#### 21.26.9. Quota, cleanup và integrity

[Fresh Agent gate sau approval](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/agent-quota-before.json) **20/20**, cùng principal, scan historical attempts cả`at`/`createdAt`, dùng timestamp muộn hơn, future0; planned6required16/reserve10. Mỗi chat reserve ledger trước network POST, kiểm source lock/cap/reserve, không đổi account/reset/restart limiter/quota polling. [Sau A6](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/agent-quota-after-A6.json) **14/20remaining,reserve10**,4spendable không dùng. Model quota **không scan**.

[Cleanup committed](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/cleanup-committed.json): xóa exact1SYNTHETICsource/2candidates/2knowledge snapshots/1job/1admin+1role/6audits; không memory/language/review/catalog writes. Private task auth removed; existing account credentials không đổi. **Chỉ giữ2 real UNREVIEWED/DRAFT rows được cấp quyền**, không real approvals.

[Fresh final fingerprints](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/staging-final.json): **38/40tables unchanged**, intentional deltas đúng`travel_web_sources`/`travel_web_candidates`, mỗi bảng+1row. Không gọi40/40unchanged.17migration checksums,130Place/20Business và tất cả bảng ngoài scope khớp baseline. DB gốc connections0/27Trip không đọc hoặc fresh-count. [Protected restore](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/readonly-restored-final.json) kiểm lại retained IDs/status,0knowledge/0SUPER_ADMIN, READONLY/DML0/modelConfiguredfalse. Initial read-only audit dùng sai`reviews.status` và initial health probe`/health`404 được giữ observations; sửa read-query/route theo source thành count và`/api/health`, không resource/quota retry hoặc mutation.

[Source/manifest impact](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/source-impact.json):5existing source files drift so với21.25 finalv3 (extraction,2knowledge/web services,launcher,admin page) +3new source files; protected AgentCoreService/ModelPrivacy/provider/prompt/schema/validators/CostIntelligence/Planner/Recommendation/geography không đổi. **Lần Qwen sau phải có manifest/source+compiled+fact lock mới**, không reuse stale21.25 source freeze. Historical21.25BLOCKED/B1–B4NOTRUN và toàn bộ historical raw/expected/FAIL giữ nguyên. [Final integrity](evidence/travelgo-ai-agent-core/knowledge-v61a-20261115/integrity-final.json) kiểm baseline, historical prefix, source lock và evidence.

#### 21.26.10. Verdicts và remaining blockers

| Verdict | Kết quả |
|---|---|
| REAL SOURCE COLLECTION | LIMITED PASS —1licensed real article;12bounded attempts;1publisher family; không accuracy claim |
| REAL KNOWLEDGE APPROVAL | **PENDING** —real owner SUPER_ADMIN/fact selection/source moderation chưa có |
| PERSISTENT REAL KNOWLEDGE | **PENDING approved knowledge**; exact real DRAFT retention/persistence PASS, không active knowledge |
| CONTINUOUS KNOWLEDGE UPDATE | PARTIAL —2actual PG/SYNTHETIC cycles PASS; real Internet worker/long-term operation chưa cấp quyền hoặc nghiệm thu |
| COST INTELLIGENCE | FUNCTIONAL PASS SYNTHETIC selected observations/scenario/update/revoke; real-world costs chưa duyệt |
| DESTINATION ADVISORY | Existing implementation preserved; REAL multi-destination acceptance NOT RUN |
| ADAPTIVE LANGUAGE LEARNING | Preserved historical current-contract PASS; không rerun J6/source không đổi |
| CUSTOMER MEMORY | Existing lifecycle preserved; fresh settings/items rỗng/disabled; positive integration mới NOT RUN |
| REVIEW INTELLIGENCE | Existing logic preserved; real reviews0, positive real integration NOT RUN |
| UNIFIED CUSTOMER ADVISORY | PARTIAL —6selected actual QwenOFF journeys PASS, chưa whole planning/memory/real knowledge journey |
| ADMIN REVIEW CENTER | PASS actual SYNTHETIC desktop/mobile/409guard/correction/review/revoke; real-owner execution PENDING |
| INTEGRATED STAGING PROFILE | PASS actual protected/integrated/scopedSYNTHETIC; real-owner contract checked, startup NOT RUN |
| FINAL-SOURCE CUSTOMER ACCEPTANCE | **PASS6/6** trong exact SYNTHETIC-cost/catalog scope; không real-world advisory PASS |
| DATA INTEGRITY | **PASS** —38unchanged/2intentional authorized deltas, cleanup/READONLY restored |
| QWEN REAL MODEL | DEFERRED —BLOCKED_RESOURCES; no new gate/call |
| MODEL WEIGHT TRAINING | NOT PERFORMED |
| FULL QWEN E2E | NOT RUN |
| LIVE READY | **NO** |

Còn cần owner thật với SUPER_ADMIN và fresh per-fact/source/retention authorization trước activate; nguồn độc lập có explicit reuse permission; thêm dữ liệu thật đã reviewer xác minh và các journey chưa chạy; scoped Internet-worker approval/runtime trước automatic collection lâu dài. Không tự provision owner account, approve source/facts, gia hạn retention, bật daemon/search/Qwen hoặc mở task mới. Đã dừng sau code, bounded collection/staging, cleanup và báo cáo.
