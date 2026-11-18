## 21.32 — V6.6 AUTONOMOUS KNOWLEDGE MAINTENANCE, CONTINUOUS LEARNING & MULTI-SOURCE TRAVEL INTELLIGENCE

Ngày18/11/2026. Kết quả: **PARTIAL — OFFLINE PASS; ACTUAL SOURCE SETUP FAIL, KHÔNG RETRY**. Đã triển khai trên pipeline hiện có, khóa source/build rồi đánh giá holdout. Đã thực thi Internet và thử setup worker theo fresh approval; không chỉ chuẩn bị kế hoạch. Tuy nhiên source fixture bị PostgreSQL từ chối trước worker cycle đầu tiên. Không đổi constraint, giả danh reviewer, sửa expected hoặc chạy lại để lấy PASS. Evidence: [result.json](evidence/travelgo-ai-agent-core/maintenance-v66-20261118/result.json).

### 1. V6.5 final-source closure và quota

Phase0 thực hiện trước mọi product edit V6.6: xác minh768 source/build hashes khớp freeze V6.5, fresh staging identity/baseline, một fresh Agent scan cùng principal A57e6e64a-9dac-43af-bcf0-5f2c992a423a. Scan lúc **07:16:57 ICT18/11/2026**, toàn historical attempts/cả at và createdAt, cap20/hour: remaining **11/20**, reserve10, complete READ_ONLY_REAL_HYBRID_DESKTOP cần12 (1login+1chat), thiếu1. **BLOCKED_QUOTA**. Không dùng lịch07:43:50 như bằng chứng quota đủ; không chờ hồi quota, polling, scan lại, reset limiter hoặc đổi principal. Usage Agent của toàn task21.32 **0**, gồm cả Phase0/V6.6. Không activate/restart API hoặc chạy nửa journey. Prior B2/PERSONAL actual PASS giữ nguyên, không chuyển thành final-source actual PASS.

Evidence: phase0-plan.json, phase0-quota.json, source-before.json, staging-audit.json trong [evidence21.32](evidence/travelgo-ai-agent-core/maintenance-v66-20261118/).

### 2. Existing architecture và khoảng trống đã xác minh

Reuse TravelKnowledgeService, TravelWebService, TravelWebWorker, TravelWebHttp, source registry, typed extraction, existing cost aggregation và /admin/travel-web. Không thêm Agent/store/crawler/worker/schema/migration. Existing approval giữ exact selected observations/facts, RBAC, source/version/hash/expiry/retention; existing PG job giữ advisory lock, lease token/recovery, bounded attempts/backoff và conditional GET. Search adapter vẫn OFF vì không có approved search provider. Không giả search results.

Khoảng trống trước sửa: claim chưa có exact source scope; refresh ARTICLE dùng interval cố định; raw HTML hash drift có thể gây revision không cần thiết; thiếu coverage/authority inventory và public gap proposal; thiếu meal-specific unit; thiếu publisher-family request reservation; admin chưa thấy typed previous/proposed diff. Phân biệt code có sẵn và chưa actual-proven trong architecture-audit.json. Đây là application-level learning/maintenance, không phải model training.

### 3. Knowledge coverage và public discovery

Reuse approved repository query có freshness/authority fences để tạo bounded coverage: tối đa50sources/50candidates/100approved và10locations.12dimensions: destination, accommodation, food/dining, transportation, attraction, admission, tour/activity, specialty, season, practical tips, historical cost, official rules. Phân biệt nguồn official/provider/editorial/personal/opinion/historical/current/unknown; dữ liệu không được extractor hỗ trợ rõ vẫn missing, không tự biến tip thành rule hoặc publication year thành observation period.

Coverage dùng selected approved extraction, không biến toàn candidate chưa duyệt thành knowledge. Có missing dimensions, missing period, conflict/expiry, publisher-family coverage và job health; bounded proposals tối đa12/location. Source independence review tách khỏi số domain. Agent cost branch chỉ tạo metadata public-topic proposal tối đa8, dùng shared canonical geography/publicSearchQuery, không chứa raw chat, budget hoặc PERSONAL memory; không network/DB write tự động và không thêm retrieval vào greeting.

Discovery execution vẫn yêu cầu approved source/provider. Không cấu hình SearXNG công cộng, không search endpoint không documented, không query bằng customer data. New public proposal không phải quyền fetch hoặc quyền duyệt fact.

### 4. Controlled collection và fresh authorization

User phê duyệt combined authorization-review-packet.json, tách Internet, staging mutation, fact approval. Packet internet-review-packet.json giữ tighter production cap **30GET/3domains/4articles/concurrency1/search0/120phút**, dù task cho phép đề xuất upper40. Exact domains: en.wikivoyage.org, wikitravel.org, creativecommons.org; exact URLs/redirects/permission metadata trong packet. Không sử dụng approval21.30/21.31.

Permanent model-off collection capability chấp nhận riêng task21.32/status mới, vẫn giữ HTTPS exact URL, private-address/DNS/SSRF/TLS, redirect, byte/deadline/concurrency/request caps. Parent PG producer chỉ local staging; child HTTPS capability không có PostgreSQL/local-network capability. Không mở capability này cho website. Added publisher-family rate reservation áp dụng sibling hosts/redirects; attempts được ghi trước wait/DNS/I/O, lỗi vẫn tính cap; abortable wait. Existing background worker defaultOFF.

### 5. Actual Internet:6GET metadata,0article

Lần thực thi duy nhất bắt đầu08:15:46 ICT. **6/30 physical HTTPS GET**:5HTTP200,1HTTP403;0article attempt,0article extraction,0redirect thêm,0search. Receipts từng GET trước dispatch trong internet-receipts.json:

| URL | Kết quả |
|---|---|
| en.wikivoyage.org/robots.txt |200 |
| wikitravel.org/robots.txt |403 WEB_FORBIDDEN; dừng domain |
| creativecommons.org/robots.txt |200 |
| en.wikivoyage.org/wiki/Wikivoyage:Copyleft |200, explicit CC BY-SA4.0 metadata |
| creativecommons.org/licenses/by-sa/4.0/ |200 |
| creativecommons.org/licenses/by-sa/3.0/ |200 |

Wikitravel copyleft/terms và2articles không dispatch sau403; không đổi mirror/proxy/transport hoặc retry domain. Wikivoyage permission metadata đạt trong snapshot này nhưng chưa đọc2articles: toàn actual producer dừng vì setup fail trước bước extra collection. Không tận dụng cap còn lại để chạy thêm. Public access/robots không thay thế license; chưa có kết luận reuse permission cho Wikitravel. Giữ hashes/attributed permission excerpts, không lưu full raw article HTML. internet-result.json/internet-permission-proof.json ghi rõ approvedFacts0.

Model-off guard child có18 boundary-hook events cho6GET (các lớp HTTPS/TLS/socket), không cộng chúng thành18physicalGET hoặc backfill thêm attempts. Nguồn đếm request là6 production transport receipts.

### 6. Typed extraction và semantic diff

Giữ article-content isolation, canonical location, source URL/version/hash, evidence locator, publication/retrieval date và observation period. Bổ sung **PER_MEAL** và **PER_PERSON_MEAL** có evidence đơn vị rõ; backend/frontend strict readers nhận typed enum này. Không ép meal=person, không lấy số khách/ngày/năm làm giá, không suy currency/unit/period để tạo complete fact. Không thay integer VND hoặc GROUP_VND_V1.

New diffKnowledge so typed location/canonical URL, period/duration/party/rooms/origin/transport/accommodation/style, cost amount/range/currency/unit/category/object/inclusions/promotion/validity và supported noncost facts. Bỏ qua raw hash/retrieval/publication drift/caption không làm đổi knowledge projection; giới hạn80changes/16kB, có truncation warning. Kết quả NEW/UNCHANGED/CHANGED/REMOVED, previous/proposed, reason/date/evidence và approvalRequired. Không biến mọi HTML đổi thành factual revision; human corrections/version guards tiếp tục fail closed khi không tương thích.

### 7. Existing worker lifecycle, idempotence và versioning

runOnce nhận optional exact sourceIds (1–4UUID, reject extra/invalid/duplicate), áp dụng xuyên prune→enqueue→claim. Không claim/prune/enqueue retained source ngoài scope. Giữ global advisory claim lock/max2active leases, skip-locked recovery/attempt cap12; claim publisher-family last_attempt/rate dưới cùng lock. Lease bounded≤60giây, production job bounded HTTP deadline/caps; không cần thêm heartbeat cho phạm vi hiện tại. Stop/abort, conditional ETag/Last-Modified và bounded retry/backoff được reuse.

Successful refresh dùng source.intervalHours thay vì ARTICLE168h cố định, không giảm source rate/interval để ép actual refresh. Same raw hash hoặc unchanged semantic projection không tạo duplicate revision. Material price/unit/condition/removal tạo DRAFT revision + diff và đánh dấu prior candidate cần review theo existing guards; **không ghi đè approved knowledge, không kéo dài expiry**. Fetch failure chỉ cập nhật job/error/backoff, không xóa valid knowledge. Source revoke/version/permission/expiry loại dữ liệu khỏi retrieval theo existing repository checks. Actual source/price change **NOT OBSERVED**; same-real-URL refresh **NOT RUN**.

### 8. Multi-source costs và source independence

Reuse existing eligibleCostEvidence/compatibility/arithmetic: location/object/currency/unit/period/conditions/inclusions phải tương thích; dedup canonical URL/hash/publisher family; independent publisher review tách khỏi nhiều bài/translation. Không tạo range từ1observation, không gọi small-sample min/max/median là toàn thị trường hoặc current confirmed price. Incomparable observations giữ riêng/caveat. Không sửa Planner, RecommendationService, Booking authority hoặc geographic34.

Locked SYNTHETIC scenarios kiểm same-publisher translation/dedup, independent sources, conflicting conditions và incomparable units/period. Actual corpus sau task vẫn **1retained travel publisher family**, không có new travel article hoặc new approved observation. Independent real multi-source corpus **NOT PROVEN**, không lấy3metadata domains làm3travel sources.

### 9. Admin review và Agent integration

Existing /admin/travel-web bổ sung coverage/source authority/job due-leased-failed-recoverable health và public gaps; existing candidate facts hiển thị typed previous/proposed diff, dates và truncation warning. Giữ source permission/missing evidence/exact selected set/RBAC/consent; không auto-check approval, không thêm admin page hoặc đọc Owner credentials.

Production React components có real Edge desktop/mobile **offline markup DOM replay** và screenshots admin-offline-*.png: coverage/diff hiện, consent checkbox vẫn unchecked/disabled theo read-only props. HTTP0, fixtureSYNTHETIC; không gọi là actual Owner UI workflow/responsive acceptance. Initial UTF8 selector harness failure giữ trong evidence, chỉ sửa invocation offline; không product edit sau holdout.

Agent vẫn lấy approved knowledge fresh qua existing PG service, không cache authority qua restart/prompt. Contract test kiểm newly-approved repository content được dùng trong cùng service và stale/revoked exclusion; actual new approval→customer retrieval trên finalV6.6 **NOT RUN**. V6.5 successful-publication commit, hypothetical isolation và verified context giữ nguyên; chỉ thêm bounded metadata proposal ở cost branch. Customer language learning/PERSONAL data không chuyển thành public knowledge.

### 10. Source files thay đổi

- backend/src/agent/webTravelExtraction.ts, webTravelPolicy.ts, costIntelligence.ts.
- backend/src/services/travelWebService.ts, travelWebWorker.ts, travelWebHttp.ts, travelKnowledgeService.ts, agentCoreService.ts.
- frontend/src/pages/admin/TravelKnowledgeReview.tsx và frontend/src/utils/webSourceCards.ts.
- backend/scripts/model-off-isolation.cjs: thêm accepted task21.32 collection authorization, không mở localDB cho collection.
- backend/dist liên quan được build; final-source-lock.json ghi768hashes và exact changed list. Không đổi Planner/RecommendationService/Trip/Booking/schema/catalog/.env/default website config.

### 11. Locked benchmark, holdout, related regressions/build

Khóa28representative cases vàSYNTHETIC HTML fixtures trước product edits:18development,10holdout. Baseline/final cùng inputs/expected.8baseline JS modules được khôi phục và xác minh exact source-before hashes trong baseline-runtime-proof-final.json; giữ initial reconstruction proof lỗi và fix method, không sửa lịch sử. evaluation-lock.json khóa runner/expected/loader trước finalholdout. Source/build freeze trước finalholdout và **không sửa product sau khi xem holdout**.

| Kiểm tra | Baseline | Final |
|---|---:|---:|
| Development |7/18 |18/18 |
| Locked holdout |4/10 |10/10 |
| Targeted scope/unit/privacy/diff/production React renderer |— |5/5 |
| Offline SQL capability helper fence |— |6/6 |
| Backend build |— |PASS |
| Frontend build |— |PASS |

Các case gọi production functions/services, có explicit SQL/transport doubles; baseline gồm thiếu new contract API nên **không diễn giải delta thành Internet accuracy hoặc generalization**. Targeted không phải Qwen/live score. Không rerun V6.5/full unrelated benchmark.

Affected compatibility: WebV58 **29/30**, KnowledgeOperationsV61A10/10, KnowledgeV5220/20, CostContextV59125/25. Historical W06 expected 'bua sang' trong khi actual 'bữa sáng' còn FAIL như trước; không sửa expected hoặc tuyên bố toàn bộ regression PASS. git diff --check cho affected product files không có whitespace errors; LF→CRLF warning không phải test failure. Tool SQL fence6/6 chỉ là offline capability check, không kiểm schema setup contract; actual setup FAIL bên dưới không bị che bởi score này.

### 12. Fresh bounded staging packet và actual source setup FAIL

Fresh approval staging-review-packet.json chỉ cho3tables travel_web_sources/jobs/candidates, exact2sources/4jobs/3DRAFT candidates,≤40DMLincludingcleanup/2cycles/120phút. Không account/Owner/knowledge/audit/catalog/Trip/Booking writes hoặc retention newrows. Source SYNTHETIC4d528499-1966-416a-9aa5-62fef936ac56 và conditional Wikitravel d7848212-5852-4591-97fe-651523724c05; exact remaining IDs trong packet. Retained source bị loại khỏi mọi operation scope.

Before actual, tools syntax/6pure-fence checks +768sourcehashes +fresh40fingerprints đạt. Pre-execution review bổ sung explicit staging-only env cho Sequelize, cùng15452pg target fence; giữ pre-review tools lock, không đổi product/expected/scope. Parent dùng standalone existing producer; child dùng existing production HTTPS transport. Không thêm crawler/worker thứ hai. Dynamic returned candidates sẽ bị bound về exact IDs/nested cost IDs; producer cap chừa3DMLcleanup slots.

**Actual dừng08:16:11 ICT trong INSERT source SYNTHETIC đầu tiên**, PostgreSQL báo travel_web_sources_check. READONLY pg_get_constraintdef xác minh:

    CHECK ((NOT enabled) OR (permission='ALLOWED' AND review_status='APPROVED' AND reviewed_by IS NOT NULL))

Root cause: helper chuẩn bị enabled/ALLOWED/APPROVED temporary fetch-policy source với reviewed_by=NULL. Existing database reviewer contract yêu cầu reviewer hợp lệ; helper không đáp ứng contract này. Đây là **setup/integration failure của helper trước worker**, không phải đã chạy worker rồi PASS. Chat approval cho scope kỹ thuật không phải quyền giả danh Owner reviewer. Không điền OwnerID, sửa constraint/schema, tạo account hoặc bypass source review để tiếp tục. Toàn setup transaction **ROLLBACK**. Conditional Wikitravel source còn bị403robots độc lập, không được tạo.

**0actual worker cycle,0SYNTHETIC transport job,0real worker article,0new committed source/job/candidate/knowledge**. Không gọi extra Internet articles sau setup failure, không retry. Source setup/root-cause evidence giữ nguyên trong actual-failure.json, worker-sql-audit.json và post-actual-proof.json. Hai standalone read-only integrity helper lần đầu có MODULE_NOT_FOUND do relative module path, trước DB/networkI/O; đã sửa đường dẫn và giữ loader-failure evidence. Đây không phải retry worker/native request.

### 13. PostgreSQL persistence, cleanup và protected restoration

Fresh before/after PostgreSQL15452 đúng database travelgo_staging_catalog_20261112, role catalog_runtime non-super/no-createdb/no-createrole, sentinel travelgo-public-staging:catalog-20261112;40tables/17checksum migrations/130Place/20Business/stagingTrip0. API19752 đúng ownerDanh/DESKTOP-KU5UHNI/serve protected, health200; không restart/reset limiter. New source/build trên disk chưa activate vào website. Frontend5177 giữ trạng thái stopped trước task, không tự khởi động để thay đổi runtime sau quotaBLOCKED.

SQL audit **4DMLattempts**:1failedINSERT bịrollback +3exact cleanup DELETE đều0row. Producer không chạy tiếp sau lỗi; cleanup đọc/verify ownership/exact cohort trước DELETE. candidate-persistence.json xác nhận source/job/candidate sets đều rỗng. cleanup-integrity.json và fresh post-actual-proof.json xác nhận **40/40 fingerprints khớp baseline** (bao gồm existing Owner, retained approved knowledge và migrations); committed intentional row deltas0, new retained rows0. Không tuyên bố persistencePASS cho candidate chưa từng được tạo.

Retained knowledge467bd60b-27ab-42ad-a450-b3076a4215c3 vẫnAPPROVED/public v2; source3c427f07-c1e2-42eb-b380-42e46c28a2ca v2, candidate92760bb5-b51a-440e-ab7d-c4c053a5d36b approvedv3/source_version2/hash giữ nguyên. Historical shuttle150000VND/PER_PERSON/02-2026, expiry2026-12-15T00:00Z không đổi; không approve lại/current-price claim. Counts sau task:1source/1candidate/1approved knowledge retained,0newknowledge.

Protected API SQLDML0; model/search/worker/webwritesOFF, ADVISORY_STAGING_READ_ONLY=true. Actual producer đã exit và childcollection đã exit. Actual parent/child model-off audits nativeAttempts0/nativeDispatched0, không model GET/warm-load/inference. Không RAM/GPU/VRAM/model quota, Owner credentials/DPAPI, originalDB/27Trip, Maps/GPS/VPS/commit/push/deploy.

### 14. Verdict riêng và giới hạn còn lại

| Verdict | Kết quả trong task21.32 |
|---|---|
| V6.5 FINAL-SOURCE HYBRID ACCEPTANCE |BLOCKED_QUOTA; single scan11/20,0login/chat |
| SOURCE DISCOVERY |Canonical public proposal/approved-URL contracts offlinePASS; searchOFF; actual discoveryNOT RUN |
| KNOWLEDGE COVERAGE |Bounded selected-approved inventory/gaps/authority offlinePASS; corpus chưa mở rộng |
| SAFE INTERNET COLLECTION |PARTIAL:6metadataGET, guards/blocked-domain stop đạt; article0 |
| EXTRACTION QUALITY |Locked SYNTHETIC PASS; real newarticle extractionNOT RUN |
| AUTOMATIC MAINTENANCE |OfflinePASS; actual source setupFAIL trước cycle |
| CHANGE DETECTION |Typed normalized diff offlinePASS; actual realchangeNOT OBSERVED |
| SOURCE INDEPENDENCE |Offline contractPASS; real independent multi-sourceNOT PROVEN |
| MULTI-SOURCE COST INTELLIGENCE |Compatible typed cost/dedup contractPASS; real aggregationNOT PROVEN |
| KNOWLEDGE FRESHNESS |Repository version/expiry/revoke contractPASS; retained baseline fresh-checked; actual refreshNOT RUN |
| ADMIN REVIEW |Production-component offline Edge DOM replayPASS; actual newOwner workflowNOT RUN |
| AGENT LIVE KNOWLEDGE RETRIEVAL |Prior actual baseline giữ nguyên; finalV6.6 newapproval/customer journeyNOT RUN |
| REAL INTERNET WORKER |NOT RUN: source setupFAIL, Wikitravel403 |
| REAL POSTGRESQL CANDIDATE PERSISTENCE |NOT RUN;0committed candidate |
| REAL MULTI-SOURCE CORPUS |NOT PROVEN;1retained family,0newtravel articles |
| CONTINUOUS PRODUCTION WORKER |NOT RUN/OFF |
| PRIVACY & AUTHORITY |Offline guardsPASS; actual DB reviewer guard chặn invalid setup; không bypass |
| DATA INTEGRITY |PASS40/40,0rowdelta; protected runtime giữ nguyên |
| QWEN REAL MODEL |DEFERRED |
| MODEL WEIGHT TRAINING |NOT PERFORMED |
| LIVE READY |NO |

Các phần chưa khép: final-source hybrid cần đợt fresh quota/authorization riêng; actual worker cần source fixture/reviewer workflow hợp lệ với existing DB contract và nguồn thực sự cho phép fetch. Không dùng OWNER reviewer giả, không yêu cầu duyệt lại retained knowledge, không tái chạy run đã FAIL hoặc dùng cap còn lại. Một review packet tương lai cần giải quyết source-review identity và permission trước actual, không phải nới guard. **Dừng sau TASK21.32; không khởi động21.33.**
