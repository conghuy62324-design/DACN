
### 21.23 — V6.0-A REAL KNOWLEDGE ACTIVATION, CONTINUOUS LEARNING & INTEGRATION READINESS

Thực hiện ngày15/11/2026 trên source hiện hành; CODE/OFFLINE + bounded PostgreSQL/Edge thật. **PARTIAL integration readiness; REAL KNOWLEDGE APPROVAL PENDING; không LIVE READY.** Qwen OFF toàn task: Ollama GET/POST0, resource/model-quota checks0, warm-load/inference0. Không Google Maps/GPS/VPS/paid API/commit/push/deploy. Evidence tập trung tại [integration-v60a-20261115](evidence/travelgo-ai-agent-core/integration-v60a-20261115/).

#### 21.23.1. System integration map

`Current message → VietnameseNormalizer/shared geography → allowed adaptive mappings + verified session/context → consented soft memory → approved/selected knowledge + typed cost/public catalog/review eligibility → existing decision/advisory → một primary tool → fresh source/permission recheck → grounded server response.`

Không viết lại Agent, tạo KB/Planner/chatbot khác, embedding hoặc weight training. [Source audit](evidence/travelgo-ai-agent-core/integration-v60a-20261115/source-integrity-before-report.json) xác nhận AgentCoreService, Planner, RecommendationService, TripSessionService, geography34 và migration14 không đổi.

| Thành phần hiện có | Runtime bounded đã kiểm trong task | Trạng thái cuối task |
|---|---|---|
| AgentCoreService + VietnameseNormalizer/geography | Chat thực, shorthand/context/tool dispatch | Core hoạt động; không đổi code Core/geography |
| Adaptive Language V5.3 + Conversation V5.4 | Unknown → xác nhận → explicit save → phiên mới → revoke; xem J6 caveat | Flags OFF sau restore; mapping test cleanup |
| Decision V5.5 + Planner V5.6 + Integration V5.7 | Memory soft preference, review insufficiency, itinerary/what-if; consolidated offline6/6 | Flags OFF; không Trip/Booking write |
| Review Intelligence | FRESH_READ_ONLY kể cả khi web cohort được ghi; dữ liệu review hiện không đủ để kết luận chất lượng | ON/read-only; không thêm review/cache/job |
| Customer Memory | Consent/save/read/current-context precedence/revoke; owner scope | ON/read-only; settings/preferences test cleanup |
| Verified Knowledge + Web V5.8 | Per-fact review, selected retrieval, API restart persistence, source revoke | Knowledge ON/read-only; Web OFF; real facts0 |
| Cost V5.9/V5.9.1 | Typed object/category/unit, source-backed component/room scenario | OFF sau restore |
| Admin web workflow | `/admin/travel-web`, authenticated SYNTHETIC admin, Edge desktop/mobile, PostgreSQL thật | READ ONLY, actor test đã xóa |
| Existing Qwen provider | Chỉ audit source/schema/payload | DISABLED, không runtime/model readiness claim |

#### 21.23.2. Feature flags và profile thực tế

[Launcher](../backend/scripts/agent-staging-profile.cjs) tách `protected`, `integrated-review`, `scoped-knowledge-write`, `scoped-worker`; không sửa `.env`. Mọi mode khóa Qwen/search/default worker OFF. `integrated-review` bật các reader/advisory hiện có nhưng vẫn PG/SQL READ ONLY. Scoped write đòi manifest bounded còn hạn, exact actor/source/candidate/job/knowledge IDs; personal test writes có quyền riêng và owner hash. SQL fence không cho catalog/reviews/Trip/Booking/payment/schema writes.

Bổ sung `REVIEW_INSIGHTS_READ_ONLY=true` để scoped web acceptance không vô tình tạo review cache/jobs. Profile cuối: [READ ONLY restored](evidence/travelgo-ai-agent-core/integration-v60a-20261115/readonly-restored.json), API PID14476, owner/command đã kiểm;3connections xác minh identity/read-only, DML0. Cost/Web/adaptive/conversation/decision/planning/worker/search/Qwen OFF; review/memory/knowledge readers ON. Frontend PID14468,127.0.0.1:5177, proxy5057.

#### 21.23.3. Contextual extraction fixes và files

`costIntelligence.ts`: xác định priced object có kiểu (admission/cable-car ticket/transport fare/tour-package/food/merchandise/room/trip-total/unknown), bind từng amount trong clause; phân biệt access description với thứ được bán. Không thêm bản đồ địa danh hoặc hard-code hai câu cũ. Context không vượt paragraph, không suy đơn vị/inclusions từ nơi lân cận; trường hợp thiếu evidence giữ OTHER/UNKNOWN.

`webTravelExtraction.ts`: tokenizer tag hiểu dấu nháy, chặn HTML attribute có `>` lọt vào text/price/evidence; giữ structured headings/table/locator và PII/injection/size guards. Thêm bounded source-attributed facts hoạt động/ẩm thực/văn hóa, chưa coi chúng là đã duyệt. `travelKnowledge.ts`: mở rộng vocabulary hỏi kiến thức tự nhiên, deictic reference chỉ dùng verified location, ambiguity hỏi lại; short alias dùng shared geography trong read-only intent; relevance theo topic/fact kind, tối đa3 eligible sources.

`travelWebService.ts`, `travelKnowledgeService.ts`: explicit per-observation/non-cost-fact selection, snapshot/provenance/version/actor vẫn giữ; reader chỉ project phần được chọn. Rebuild cost summary bằng observation ID, không duyệt nhầm mọi giá cùng paragraph hash. Real legacy snapshot thiếu selection bị loại khỏi eligible retrieval cho đến khi human review; không xóa snapshot cũ, không migration. `TravelWebPage.tsx` có checkbox từng mục, ban đầu chưa chọn; reason/confirmation/expiry vẫn bắt buộc. `webSourceCards.ts` strict enum mới, không coercion. Worker claim có attempts<12 và charge attempt ngay khi claim để crash không tạo vòng retry vô hạn.

Tổng8 file tồn tại được sửa, thêm1launcher và1targeted test file; [exact inventory/source lock](evidence/travelgo-ai-agent-core/integration-v60a-20261115/source-integrity-before-report.json). Không sửa weights/GROUP_VND_V1, review insights algorithm hoặc customer memory implementation.

#### 21.23.4. Regression, holdout và build

[Final locked-source offline results](evidence/travelgo-ai-agent-core/integration-v60a-20261115/offline-tests-final.json): targeted V60A13/13; contextual V59125/25; consolidated integration V576/6; knowledge V5220/20. Web V58 vẫn29/30: historical W06 mong `bua sang`, thực tế giữ source `bữa sáng`; không sửa expected cũ. Đây là production helpers/Core/Planner với DB/repository doubles công khai, không PostgreSQL/model LIVE PASS.

Hai failure `796d10f4326a` và `545cde2491aa` nay PASS trong [KNOWN DEVELOPMENT lock](evidence/travelgo-ai-agent-core/integration-v60a-20261115/known-failures-development-lock.json); historical holdout10/12 và raw FAIL giữ nguyên. **New independent real-article holdout NOT RUN**: không lấy được article mới; không gọi development/cached/SYNTHETIC là unseen.

Backend TypeScript build PASS; frontend `npm.cmd run build` PASS (Vite1767modules). Lần frontend build đầu bị sandbox chặn đọc cấu hình; build được phép ngoài sandbox sau đó PASS. Hai legacy frontend test entrypoints trực tiếp không resolve extensionless import dưới Node24; không sửa chúng hoặc ghi evidence cũ. [Actual frontend parser check](evidence/travelgo-ai-agent-core/integration-v60a-20261115/frontend-contract.json) trên captured real HTTP responses và11negative mutations:14/14PASS. Browser thật cũng đi qua parser/UI hiện hành. Không chạy toàn bộ regression để tăng số test.

#### 21.23.5. Pending-owner review packet

[OWNER_REVIEW.md](evidence/travelgo-ai-agent-core/integration-v60a-20261115/OWNER_REVIEW.md) trình bày K1 shuttle150.000VND/person; K2 cable-car150.000khứ hồi và120.000một chiều (nguồn ghiFeb2026); K3 bus40.000VND/vé chưa rõ ngày. Có article URLs/title/publisher, license/attribution, quote/locator, category/unit, included/excluded UNKNOWN, dates/availability UNKNOWN, đề xuất approve-historical/reject/correct/pending. Cả EN/VI Wikivoyage cùng một publisher family, không độc lập.

Đây là snapshot lịch sử ngoài DB; candidate cũ đã cleanup. Parser mới có thể đổi locator/IDs; phải fresh import/bind trước review, không tự chuyển approval. Owner cần tự dùng SUPER_ADMIN thật, chọn từng mục đã đối chiếu bài gốc, reason và expiry, đồng thời quyết định retention rõ ràng. Tài khoản SYNTHETIC không được thay owner; đã bị cleanup. Không yêu cầu owner đọc JSON hoặc sửa SQL.

#### 21.23.6. Real knowledge approval và Internet

User đã phê duyệt mới [Internet](evidence/travelgo-ai-agent-core/integration-v60a-20261115/external-authorization.json) và [bounded staging](evidence/travelgo-ai-agent-core/integration-v60a-20261115/staging-authorization.json) theo [authorization packet](evidence/travelgo-ai-agent-core/integration-v60a-20261115/authorization-review-packet.json). Chúng không phải fact approval, quyền impersonate hoặc retention approval.

[Permission inventory](evidence/travelgo-ai-agent-core/integration-v60a-20261115/permission-inventory.json) và [attempt ledger](evidence/travelgo-ai-agent-core/integration-v60a-20261115/web-events.json):14/30 conservative attempts,5allowed domains,6unique article attempts trong cap8, concurrency1.8permission/robots/license attempts;6article attempts đều `WEB_CONNECTION_FAILED`, không article body nào được giữ/đánh giá, không retry. Không quy connection failure thành kết luận website từ chối quyền. `dulichvn.org.vn` robots upstream error nên không gọi homepage lại; `vietnamtourism.gov.vn` chưa tìm được reuse license trong response nên không đọc articles. CC BY-SA4.0 Wikivoyage permission có evidence, nhưng chưa có independent publisher đủ rights/facts. Không vượt access controls, proxy/search/paid API hoặc autoapprove knowledge.

**REAL KNOWLEDGE APPROVAL PENDING:0real approvals,0real pending/approved rows retained.** Không có fact-level owner/retention decision mới trong task.

#### 21.23.7. Persistent knowledge và retained IDs

[Admin Edge workflow](evidence/travelgo-ai-agent-core/integration-v60a-20261115/admin-browser.json) PASS trên PostgreSQL thật, không API mock: hai candidate SYNTHETIC, chọn từng khoản/fact, duyệt bởi authenticated temporary test admin, desktop/mobile screenshots. Snapshot đầy đủ lưu phần chưa chọn; reader/summary chỉ thấy phần được chọn.

[Before restart](evidence/travelgo-ai-agent-core/integration-v60a-20261115/persistence-before-restart.json) → restart đúng task-owned API → [after restart](evidence/travelgo-ai-agent-core/integration-v60a-20261115/persistence-after-restart.json) giữ nguyên2knowledge snapshots/versions. [Actual source revoke/selection proof](evidence/travelgo-ai-agent-core/integration-v60a-20261115/revocation-and-selection-proof.json) và J10 xác nhận accommodation source không còn eligible/scenario sau revoke. **PASS chức năng persistent SYNTHETIC; REAL persistent knowledge BLOCKED.** Exact generated/deleted IDs trong ledger; retained IDs cuối task=[]; không có authorized intentional DB delta.

#### 21.23.8. Knowledge/web/cost retrieval

J1 trả kiến thức hoạt động theo shorthand ĐL, selected fact + source; J2 hỏi vé vào dùng riêng ATTRACTION; J3 phòng/đêm tạo scenario lịch sử2phòng×2đêm=3.200.000VND, tách khỏi Booking/Planner. Một approved source đủ trình bày một fact có provenance; không ép mọi tư vấn phải3nguồn. Aggregation vẫn đòi independent/comparable evidence; không coi giá lẻ thành thị trường hoặc tổng chuyến đi.

DRAFT/revoked/expired/wrong location bị loại; source/version/consent recheck giữ fail-closed. Tối đa3sources/selected bounded facts, không all-KB prompt. Relevance có topic/lexical/fact-kind filtering; chưa chứng minh semantic retrieval toàn miền hoặc real-world prices khi chưa có approved real facts.

#### 21.23.9. Worker operation/restart/recovery

[Actual crash/lease recovery](evidence/travelgo-ai-agent-core/integration-v60a-20261115/worker-recovered.json):1task-owned child claim rồi bị stop theo PID+owner+command, đợi lease30s hết hiệu lực,1process restart, token mới, same-source duplicate không tạo candidate khác; stale-token finish không ghi. Tổng1claim-only +2bounded runOnce=3cycles, không chạy thêm. [Actual attempt-cap check](evidence/travelgo-ai-agent-core/integration-v60a-20261115/worker-attempt-cap.json): exhausted12 không được claim.

**Transport là SYNTHETIC double rõ ràng, external HTTP0 cho worker test**; actual PostgreSQL/child crash/restart là thật. Không gọi là real Internet worker/soak/RSS/API discovery/24×7PASS. Existing backoff/lease/concurrency/abort còn nguyên, không autoapprove hoặc ghi đè verified snapshot. `worker-status` đọc due/exhausted/lease/failures/last success thật; background worker OFF. Launcher worker-once chưa được nghiệm thu Internet vì local network fence; xem handoff, không dùng command đó để tự vượt mạng/quota hoặc chạy lâu dài.

#### 21.23.10. Adaptive Language Learning

J4 unknown `navomi` hỏi nghĩa; J5 xác nhận homestay trong phiên, sau đó browser bấm **Ghi nhớ cách diễn đạt này** qua explicit consent/ticket endpoint, không tự save từ chat. [Save receipt](evidence/travelgo-ai-agent-core/integration-v60a-20261115/language-personal-save.json) ghi PERSONAL/USER_CONFIRMED; J6 ở conversation mới resolve đúng concept và tìm homestay; J9 sau actual revoke không dùng PERSONAL evidence. Không raw-chat storage, community/global contribution hoặc địa danh/price authority mới. Foreign admin GET bị403; different-CUSTOMER isolation/conflict/revoke được kiểm offline trong consolidated suite, không tuyên bố đã chạy hai customer thật.

**J6 frozen scoring vẫn FAIL**: assertion đòi public `evidence.scope==='PERSONAL'`, nhưng controlled public projection không có `scope`; raw có USER_CONFIRMED/domain/concept/currentSpan/executionAuthority=false. [Failure analysis](evidence/travelgo-ai-agent-core/integration-v60a-20261115/J6-failure-analysis.json) giữ nguyên result/expected, chỉ đối chiếu save receipt và hai conversation IDs khác nhau. Không sửa Agent/public payload để thỏa assertion, không re-score/retry. J6 browser render assertion chưa chạy do scoring dừng trước; giới hạn này còn lại dù raw hỗ trợ backend reuse đúng.

#### 21.23.11. Customer Memory

Fresh baseline memory/language test tables rỗng trước khi tạo fixtures. Chỉ approved customer/principal, explicit test consent riêng và quiet preference; không dùng context15phút thay long-term consent. J6 phản hồi nói đang dùng sở thích được phép và **chưa đủ dữ liệu đối chiếu yên tĩnh**, không bảo đảm chất lượng. J9/J10 sau revoke không dùng saved preference. [Consent receipt](evidence/travelgo-ai-agent-core/integration-v60a-20261115/personal-consent-committed.json), current-message precedence/owner isolation/revoke được đối chiếu offline và PostgreSQL thực trong phạm vi nói trên; test rows cleanup đầy đủ.

#### 21.23.12. Review Intelligence

Không tạo review DEMO mới, không bịa rating/nhận xét. Runtime đọc review eligibility đúng nguồn/consent bằng fresh read-only path; khi dữ liệu không đủ, renderer nói thiếu evidence. Review tables/cache/jobs fingerprints không đổi. PASS đường xử lý insufficiency/read-only; real positive review recommendation và Qwen review reasoning NOT RUN.

#### 21.23.13. Unified customer journeys và response quality

[Locked10inputs/expected](evidence/travelgo-ai-agent-core/integration-v60a-20261115/chat-manifest.json) + [source lock](evidence/travelgo-ai-agent-core/integration-v60a-20261115/source-freeze-final.json) trước normal chat. [Edge desktop/mobile result](evidence/travelgo-ai-agent-core/integration-v60a-20261115/customer-browser.json): **10actual POST,9PASS/1FAIL(J6 instrumentation),0extra/retry/model calls**,0chat DML. Consent không tích thì Gửi disabled; tích consent + logged-in + input hợp lệ thì Gửi enabled, request đến backend, response hiện chat cho9scored PASS cases. Có desktop/mobile screenshots, không overflow trong các assertion đã chạy.

J1knowledge/shorthand;J2ticket cost/source;J3room scenario;J4–J6learning;J7verified Planner/GROUP_VND_V1;J8what-if giữ state/1primary operation;J9personal revoke;J10source revoke. Không Trip/Booking/payment persistence; Planner confirmation chỉ là preview, không được submit. Replies tiếng Việt do deterministic grounded renderer, có source/missing/demo/historical warnings; không gọi là Qwen-generated hoặc real-world recommendation. Full acceptance không được nâng thành10/10.

#### 21.23.14. Actual PostgreSQL/browser/quota

Ban đầu15452ECONNREFUSED/Docker daemon chưa khả dụng; không DB write trước guard. Sau khi user mở đúng container/volume cũ, [fresh baseline](evidence/travelgo-ai-agent-core/integration-v60a-20261115/staging-before.json) xác minh database `travelgo_staging_catalog_20261112`, rolecatalog_runtime không super/createdb/createrole, sentinel `travelgo-public-staging:catalog-20261112`,40tables/17checksums/130Place/20Business và40/40khớp cuối21.22.

[Fresh Agent scan](evidence/travelgo-ai-agent-core/integration-v60a-20261115/agent-quota-before.json) đọc tất cả historical attempts, cả at/createdAt, cùng approved principal:20/20remaining,reserve10,spendable10. [Final quota](evidence/travelgo-ai-agent-core/integration-v60a-20261115/agent-quota-final.json):10/20remaining,reserve10,spendable0. Không đổi principal/reset ledger/wait-poll hoặc tiêu reserve; không kiểm model quota.

#### 21.23.15. Integrated local demo

Một website/một `/assistant`, không demo chatbot khác. Integrated reader profile và scoped SYNTHETIC admin profile được start/status/stop thật; real knowledge chưa active. Cuối task protected mode được khôi phục, không để integrated feature flags hoặc writes mặc định. Mục đích profile là operator handoff có phạm vi; chưa phải approval giữ worker chạy lâu dài hoặc cấp quyền real admin write.

#### 21.23.16. Commands, URLs và owner handoff

[OPERATOR_HANDOFF.md](evidence/travelgo-ai-agent-core/integration-v60a-20261115/OPERATOR_HANDOFF.md) chứa commands đã kiểm và giới hạn worker. Từ thư mục `travelgo`:

```powershell
node backend/scripts/agent-staging-profile.cjs status
node backend/scripts/agent-staging-profile.cjs worker-status
node backend/scripts/agent-staging-profile.cjs describe integrated-review
```

Chuyển profile do owner điều khiển: `node backend/scripts/agent-staging-profile.cjs stop`, rồi `node backend/scripts/agent-staging-profile.cjs start integrated-review`; khôi phục bằng `stop` rồi `start protected`. Không tự chạy lại manifests đã cleanup. Customer URL `http://127.0.0.1:5177/assistant`; admin URL `http://127.0.0.1:5177/admin/travel-web`; API5057. Admin thực cần roleSUPER_ADMIN và bounded permission mới đúng dữ liệu, không mượn test actor. Không khởi động lại TASK21.23 hoặc V6B tự động.

#### 21.23.17. Cleanup, source/fingerprint integrity

[Committed cleanup](evidence/travelgo-ai-agent-core/integration-v60a-20261115/cleanup-committed.json):2sources/2candidates/2jobs/**tất cả2knowledge revisions**/4audits/1temporary admin+role/1quiet preference+1memory settings. Mapping/language settings đã bị xóa bởi actual revoke; global lexicon/feedback không tạo. Private auth của task đã xóa; existing accounts không đổi. Không giữ pending hoặc approved real rows vì chưa có retention approval.

[Final fingerprints](evidence/travelgo-ai-agent-core/integration-v60a-20261115/staging-final.json):**40/40unchanged,130Place/20Business,17migrations/checksums unchanged**. Original DB connections0; không đọc DB gốc/27Trip để tự nhận fresh count. [16.364preexisting file hash scan](evidence/travelgo-ai-agent-core/integration-v60a-20261115/source-integrity-before-report.json): đúng8existing code files đổi,0unexpected/missing; historical evidence và Master prefix trước append nguyên vẹn; final source lock drift0. Không reset working tree. Runtime scoped audit ghi đúng web/knowledge/audit/personal test tables; không catalog/review/Trip/Booking/schema DML. API cuối READ ONLY, worker OFF.

#### 21.23.18. Proposed Qwen V6.0-B

[Offline contract](evidence/travelgo-ai-agent-core/integration-v60a-20261115/qwen-v60b-offline-contract.json) và [new proposed manifest](evidence/travelgo-ai-agent-core/integration-v60a-20261115/qwen-v60b-proposed-manifest.json), trạng thái **PROPOSED_NOT_APPROVED_NOT_RUN**, bind final V6A source hashes; không dùng LIVE manifest/approval cũ. Gồm typo, ambiguous budget/transport, typed cost interpretation và grounded review/memory fact selection. Cần fresh explicit native budget/resource/ownership/quota/digest/context guards ở task tương lai; task này không kiểm hoặc gọi chúng.

Current NLU chỉ proposal có evidence và cần confirmation; grounding chọn≤3factIDs, additionalProperties=false, typed slots/no coercion, fresh authorization vẫn do server; tối đa1model call/turn. Context≤3000bytes/facts≤7500bytes, không private identity/raw HTML/raw reviewer text/toàn bộhistory/KB. **Gap được ghi rõ:** cost branch hiện deterministic, model-selectable typed cost-fact bridge chưa wired; B3 blocked đến khi bridge được implement/kiểm offline trong phạm vi mới. Không gọi contract preparation là Qwen integration/semantic PASS.

#### 21.23.19. Verdicts và remaining blockers

| Hạng mục | Kết luận đúng phạm vi |
|---|---|
| CONTEXTUAL COST EXTRACTION | PASS development/targeted; historical holdout10/12 immutable, new real holdout NOT RUN |
| REAL KNOWLEDGE ACTIVATION | BLOCKED — fact-level owner review/retention pending;0real approved rows |
| PERSISTENT KNOWLEDGE | PASS actual SYNTHETIC approve→retrieve→APIrestart→retrieve→source revoke; REAL BLOCKED |
| CONTINUOUS WORKER | PARTIAL — actual PG crash/lease/attempt-cap/duplicate PASS với SYNTHETIC transport; Internet mode/discovery/soak chưa nghiệm thu |
| ADAPTIVE LANGUAGE LEARNING | PARTIAL acceptance — actual confirmation/save/reuse/revoke evidence; J6 frozen assertion FAIL giữ nguyên |
| PERSONALIZED MEMORY | PASS chức năng scoped consent/current preference/revoke; không general real-world advice claim |
| REVIEW INTELLIGENCE | PASS read-only/insufficiency handling; real positive review integration NOT RUN |
| WEB/COST RETRIEVAL | PASS SYNTHETIC selected-source/component/room scenario/revoke; real-source expansion BLOCKED |
| UNIFIED TRAVEL ADVISORY | PARTIAL — actual browser9/10, J6 instrumentation FAIL; không retry |
| INTEGRATED LOCAL DEMO | PARTIAL — reader/admin SYNTHETIC profiles hoạt động; real knowledge/Internet worker pending; protected restored |
| DATA INTEGRITY | PASS —40/40,130/20,17checksums,originalDB0,cleanup/read-only |
| QWEN V6.0-B PREPARATION | PREPARED OFFLINE WITH GAPS —new proposed manifest; cost-fact bridge chưa wired, không approval/native call |
| QWEN REAL INFERENCE | NOT RUN |
| FULL BROWSER QWEN E2E | NOT RUN |

Các blocker còn lại: chưa có owner fact/retention approval hoặc authenticated real review; chưa có fresh new article/independent reusable publisher; chưa có new real unseen holdout; worker Internet profile/network/discovery/soak chưa verified; J6 assertion cần sửa contract trong đợt nghiệm thu mới chứ không đổi kết quả đã khóa; cost fact bridge vào Qwen còn thiếu. Bounded task kết thúc tại đây, không tự chạy thêm chat/model/worker hoặc mở V6.0-B.
