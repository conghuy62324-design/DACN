
### 21.24 — V6.0-B QWEN INTELLIGENCE BRIDGE & SAFE MODEL INTEGRATION

**V60B_OFFLINE_INTEGRATION_READY_FOR_BOUNDED_MODEL_TEST.** Đã sửa privacy projection và typed cost-fact bridge trên Agent hiện có,30/30targeted OFFLINE; bounded staging theo approval mới đạt6/6, gồm J6 current-contract thật. **Không phải Qwen semantic PASS hoặc LIVE READY.** Ollama metadata/native GET/POST0, warm-load/inference0, model-resource/model-quota checks0. Không Internet collection/paid API/Google Maps/GPS/VPS/commit/push/deploy. Evidence tại [bridge-v60b-20261115](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/).

#### 21.24.1. Actual integration map và audit

Một AgentCoreService/một `/assistant`/một Planner/KB; không tạo model worker, chatbot, embedding store hay Agent thứ hai. Đã đối chiếu actual files: `agentCoreService.ts`, `coreProvider.ts`, `naturalContract.ts`, `structuredOutput.ts`, `vietnameseNormalizer.ts`, `vietnameseConversation.ts`, `adaptiveLanguage.ts`, `conversationSemantics.ts`, `naturalGrounding.ts`, `advisoryReasoning.ts`, `decisionIntelligence.ts`, `personalizedGrounding.ts`, `travelKnowledge.ts`, `costIntelligence.ts`, `travelWebRetrieval.ts`, `tourPlannerService.ts`.

`Raw current message → shared privacy projection + RAM evidence mapping → controlled verified context → NLU proposal hoặc server-selected tool → eligible catalog/approved knowledge/cost/review + allowed memory → bounded facts/context → một model proposal/fact selection → strict schema/semantic/freshness checks → server renderer/explicit confirmation.`

| Nhánh/module | Dữ liệu thực sự đến model khi được bật sau này | Authority/giới hạn |
|---|---|---|
| Natural unknown NLU | Safe currentRequest, verifiedSession, pending/awaiting, duration, last catalog operation, relevant geography/language, controlled dialogue/allowed preferences/intent evidence | Chỉ typed proposal + quoted evidence; chờ xác nhận |
| Verified search/details/compare/Planner | Existing tool result → controlled fact pool, decision hard/soft trade-offs, compact review evidence, relevant approved knowledge, controlled planning summary | Không cho model chọn lại/veto operation đã xác minh |
| Cost advisory | Advice-selected typed historical/derived/scenario/Planner/unknown facts; current cost criteria và missing fields | Model chỉ chọn/order IDs; không tính toán/đổi scope |
| Adaptive Language/Memory | Relevant SESSION/consented PERSONAL/APPROVED SHARED evidence; current meaning/soft preference precedence | Không entire lexicon, raw history, owner IDs hoặc tự save |
| Review/Web/Knowledge | Compact opinions/sample/provenance; approved selected facts, source versions/expiry | Không raw reviewer comments/HTML/article body hoặc DRAFT source costs |
| Catalog/Recommendation/Planner | Eligible public tool output/reasons và server estimates | Không thêm direct model calls/ranking weights vào RecommendationService/Planner |
| Consent/auth/confirmation, social/direct knowledge reads, mutation guards | Các nhánh đủ điều kiện vẫn deterministic; không ép mọi turn gọi model | RBAC/owner/TTL/replay/revoke/server arithmetic giữ authority |

Các gap cũ đã xử lý: raw NLU text; cost branch thiếu model fact IDs; mất pending/duration/last catalog context khi gom payload; nguồn giá có thể thay trong lúc model xử lý. Một lỗi routing có bằng chứng cũng được sửa: `gia mem` trong yêu cầu tìm quán ăn từng bị broad knowledge/cost intent bắt trước catalog parser; nay operation đã được existing reader xác minh thắng nhánh tư vấn rộng. Không hard-code nguyên câu ví dụ.

#### 21.24.2. Shared privacy projection

Thêm [modelPrivacy.ts](../backend/src/agent/modelPrivacy.ts), dùng chung với `safeCurrentRequest`/`assembleModelContext` và các Core provider request paths. Bảo vệ labeled password/token/API keys, JWT/Bearer/credential patterns, email/phone, identity/payment/account IDs, home-address/private-profile/sensitive clauses, URL/raw tags và forged redaction markers. Giữ budget có business evidence, dates/date ranges, party/duration/geography; không blanket-remove số8digits. NLU không còn gửi trực tiếp `body.message`; legacy Core clarification cũng dùng projection/whitelisted context. Không đưa profile/raw memory/transcript vào request.

Projection và mapping chỉ ở RAM của turn; raw message/sensitive spans không được thêm vào DB/log. Source quote chỉ được nhận khi nằm hoàn toàn trong vùng không redact và đối chiếu lại raw UTF-16 span. Có kiểm Vietnamese NFD, emoji/surrogate pairs, numeric/date preservation và contextual medical/privacy compatibility. Đây là deterministic protection cho các lớp đã kiểm, không phải tuyên bố DLP hiểu mọi cách diễn đạt hoặc model đã được chứng minh không suy đoán.

#### 21.24.3. Quote-evidence safety và semantic authority

`assertProjectedProposal` kiểm quote/value trước `naturalProposal`; semantic validator đối chiếu tin nhắn **đã sanitize**, giữ server money/date/transport/geography rules. Quote đi qua vùng redact, placeholder hoặc reconstructed sensitive value bị từ chối. Verified context không tự trở thành evidence cho cập nhật mới. Schema enum operations, typed values, optional omission, additionalProperties=false/no coercion không bị nới.

Bỏ model reclassification/veto trên explicit verified v1 operation theo yêu cầu task. Unknown NLU chỉ proposal, không tool/mutation trước confirmation. Một `askModel` gate cho mọi Core provider call; semaphore/deadline/abort/revoke vẫn giữ. Current-path tests Q27/Q28 xác nhận provider double bỏ qua abort vẫn giữ slot bận đến khi settle, late result không thực thi và deadline15s có hiệu lực.

#### 21.24.4. Typed cost-fact bridge

Mở rộng `costIntelligence.ts`/`naturalGrounding.ts` và nối vào **toolReply hiện có**. Chỉ advice-selected eligible observations vào pool; approved/public/fresh/provenance/selection/source gates và post-model revalidation tiếp tục áp dụng. Mỗi fact có server-owned ID, category/destination, amount/range/bound, currency/unit, REPORTED/DERIVED/ESTIMATED/UNKNOWN, source type/opaque source reference/version, period, included/excluded/unknowns, comparability, freshness và caveats. Không gửi mọi observation.

Phân biệt EXTERNAL_HISTORICAL, TRAVELGO_CATALOG (unitUNKNOWN), PLANNER_ESTIMATE và UNKNOWN_EXPENSE; **không có confirmed Booking price được cấp trong task**. Derived group/person và room scenario dùng existing server functions/formula/inputs. Không đổi GROUP_VND_V1/partner price/ranking hoặc tự tạo market average. Source references/citation URLs trong typed public cost facts do server xây dựng được giữ; private customer data đi qua projection riêng.

`renderCostFact` giữ đầy đủ amount/range, “không quá/từ”, unit/scope, source/version/period, inclusions/missing items và warnings. Model chọn một ID không được tách số khỏi điều kiện. Model output thêm amount/prose hoặc ID ngoài offered pool bị strict validation/fallback chặn; không xem fallback là model semantic PASS. Fresh source/consent/catalog/review rechecks chặn publish khi có revoke/change.

#### 21.24.5. Unified controlled context

`assembleModelContext` trong `personalizedGrounding.ts` dùng cùng cấu trúc cho NLU và grounding: safe current request, canonical verified fields, pending/goal/duration/last category, relevant geography/mappings, allowed preferences, hard/soft decision context, optional planning/cost summaries và permitted operations/uncertainty. Chỉ current relevant evidence; không full34-province table/all-KB/transcript. Relevant language spans được map sang safe text offsets, mapping về raw vẫn RAM-only.

Context≤3000bytes, facts≤7500bytes; prune soft/optional additions có cờ truncated, không nới giới hạn. Current verified request thắng saved preference; fresh approved source thắng stale; server-calculated cost thắng model output; authorization luôn do server. `CoreOllamaProvider` giữ readiness/digest/options/response guards; chỉ tách pure **production serializer** để kiểm serialized body và chặn oversize trước metadata/native request. Compact controlled NLU instructions phù hợp schema/context mới; actual native JSON cũng≤12288bytes. Tối đa1call/turn, chọn≤3fact IDs.

#### 21.24.6. Adaptive language và learning

Base vocabulary/shared geography vẫn do existing readers; relevant resolved mappings mang typed concept/domain/evidence status, không gửi toàn bộ personal/shared lexicon hoặc private owner scope. SESSION confirmation tách riêng personal consent/save; approved shared mappings vẫn cần admin review, model không tạo meaning hoặc ghi DB. Source module learning/memory implementation không bị viết lại.

Bổ sung version [J6_CURRENT_PUBLIC_CONTRACT_V1](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/J6-current-contract-v1.json): save receipt + different conversation IDs + current expression span + canonical concept + correct retrieval + account isolation + actual rendering. **Không đòi hoặc thêm public `evidence.scope==='PERSONAL'`.** Historical J6FAIL và21.23score9/10 giữ nguyên.

#### 21.24.7. Natural grounded response

Model chỉ lựa chọn/sắp xếp facts theo schema; server renderer cung cấp complete bundles (identity/price/unit/reason/source/review caveats) và numeric conditions. Review thiếu thì nói thiếu; ý kiến/negative evidence và sample limits không thành guarantee. Giá lịch sử/catalog/Planner không thành current tariff hoặc Booking confirmation. Pure deterministic response không được gọi là Qwen-generated natural prose. Fact selection PASS không chứng minh khả năng viết hội thoại tự nhiên tổng quát; task này chưa có raw Qwen output.

#### 21.24.8. J6 current-contract — actual PASS mới

[Current J6 proof](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/J6-current-acceptance.json) và [save receipt](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/language-current-save-receipt.json): Edge thật gửi “Tìm vanuvi ở Đà Lạt” → hỏi nghĩa → “Ý mình là homestay” → explicit browser save với consent riêng → trang/phiên mới dùng đúng homestay. Conversation IDs khác nhau; currentSpan đúng `vanuvi`, concept`accommodation_type.homestay`, executionAuthority=false, response không thêm scope.

Existing approved customer GET thấy mapping; temporary foreign CUSTOMER GET language/memory đều rỗng/disabled, **foreign normal chat0**. Cùng response thực hiển thị reply và hotel result trên1440desktop/390mobile, không overflow/API mock. Account isolation không dựa vào việc lộ scope. Đây là **PASS cho acceptance mới trong bounded staging QwenOFF/SYNTHETIC fixtures**, không chấm lại21.23 thành10/10. [Offline historical-wire parser replay](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/frontend-contract-current-v1.json)12checks trước approval được giữ nhãn riêng, không dùng thay actual PASS này.

#### 21.24.9. Targeted, compatibility và build

[Final targeted30/30](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/targeted-final-v8.json), nhãn OFFLINE provider doubles/production serializer, actual model/PG0. Kiểm redaction/numeric/date/Unicode spans, raw negative schema/semantic cases, stale/unselected/revoked/duplicate sources, bounds/unit/group/person/scenario, quote forgery, invalid IDs/prose, no mutation, current preference/memory, controlled language, context limits, current NLU concurrency/deadline và explicit catalog authority. Các lần chạy development trước được giữ, không sửa historical expected.

Relevant compatibility: [Qwen V5 fix49/49 trên final privacy](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/compat-privacy-final.json); [cost25/25 và consolidated integration6/6](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/compatibility-final-source.json); advisory19/19. **Compatibility PARTIAL:** Core39/42 (3legacy tests vẫn đòi model veto/call trên explicit v1 intent; current-path revoke/deadline đã kiểm thay bằng Q27/Q28); Natural V441/42 (fixture đòi old verifiedSlots/full geography payload); Core Intent V221/22 (old verifiedSlots payload shape). [Initial results](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/compatibility.json), [follow-up](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/compatibility-v4.json) giữ raw FAIL; không sửa assertions cũ để gọi toàn bộ PASS. Một lần NaturalV4 chạy sai cwd không tìm fixture đã được chạy lại đúng backend cwd, không sửa fixture.

Backend TypeScript build PASS trên bản cuối; [frontend build](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/frontend-build.log) PASS. Frontend source/public wire không sửa; current frontend parser12checks và actual Edge checks ở trên PASS. Không chạy toàn bộ regression hoặc tạo benchmark lớn mới.

#### 21.24.10. Actual serialized request bodies

Tests gọi đúng `serializeCoreRequest` mà CoreOllamaProvider dùng để gửi HTTP body, parse JSON string rồi kiểm sensitive canaries, schema format, model/options, context/fact/native byte caps. Không chỉ kiểm object trước serialize. [Captured OFFLINE bodies](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/targeted-final-v8-payloads.json) đều nhãn **OFFLINE_PROVIDER_DOUBLES_ACTUAL_PRODUCTION_SERIALIZER_NO_OLLAMA_OR_POSTGRES**, không phải native responses.

[Proposed final-v3 payload templates](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/proposed-serialized-payloads-v3.json): B1/B2/B3/B4 native bodies10.563/10.502/5.635/6.749bytes; contexts1.232/1.187/1.413/1.599bytes; B3/B4 facts2.732/3.617bytes. Không raw review comments, private identity/full history/HTML; B3 có riêng PER_TICKET/PER_PERSON/UNKNOWN facts, B4 compact review/knowledge/allowed soft preferences và catalog price-unit caveats. Chỉ serialized templates, **chưa gửi**.

#### 21.24.11. Actual PostgreSQL/HTTP/browser và source versions

[Fresh baseline](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/staging-approved-before.json) đúng15452/db`travelgo_staging_catalog_20261112`, rolecatalog_runtime không super/createdb/createrole, sentinel`travelgo-public-staging:catalog-20261112`,40tables/17migration checksums/130Place/20Business. Original DB connections0.

User phê duyệt mới [packet21.24](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/staging-authorization-review-packet.json) qua [receipt](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/staging-authorization.json); không reuse cleaned21.23manifest. Đúng2temporary users (SYNTHETIC admin và foreign customer chỉ kiểm đọc),1source/candidate/job/knowledge SYNTHETIC, personal fixtures chỉ sau baseline rỗng. [Admin browser](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/synthetic-admin-browser-review.json) dùng authenticated test admin/per-observation review thật; không giả quyền owner duyệt real facts.

[Source/input lock](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/chat-manifest-approved.json) trước normal POST. [Actual Edge result](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/customer-browser-approved.json): **6/6PASS,6POST,0retry/extra/model calls,API mocks=false,chat DML0**. A1–A3J6; A4source-backed historical room scenario2phòng×2đêm=3.200.000VND; A5actual personal revoke; A6actual source revoke loại cost source/scenario. Không Trip/Booking/payment writes.

**Giới hạn source rõ ràng:** actual staging6case chạy trên [v2 lock](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/source-freeze-final-v2.json). Audit sau đó bổ sung privacy edge hardening cho UTF-16emoji và ISO date ranges; [final v3 lock](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/source-freeze-final-v3.json) được build/targeted30/30 +privacy compatibility49/49 và restore/read-only checks, **không chạy lại6chat** vì cap đã dùng hết. Không gọi đó là full final-v3 Browser E2E hoặc nâng phạm vi semantic.

#### 21.24.12. Quota, cleanup và integrity

Fresh Agent gate **09:23:35VN** ban đầu10/20remaining,reserve10,spendable0 → dừng phần chat/fixture. Sau **explicit new staging approval**, fresh gate **09:46:39VN**20/20remaining, đủ required16; không quota wait-poll/reset/đổi principal. Scan historical attempts cảat/createdAt, dùng cùng approved principal hash`856f41c9ad2ffc1e3f467eeb45f0069a943196101062d0e3ab3927bec64b95c5`. [Final after6chat](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/agent-quota-after-approved-chats.json):14/20remaining,reserve10; không dùng4spendable còn lại để thử thêm. Không scan model quota.

[Committed cleanup](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/cleanup-approved-committed.json):1source/1candidate/1job/**all1knowledge snapshot**/2audits/2users+2roles/1quiet preference+1memory settings. Language mapping/settings đã xóa bằng actual revoke; không shared lexicon/review/catalog/schema data writes. Private task auth đã xóa; existing accounts không đổi; real retained IDs=[].

[Final v3 fingerprints](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/staging-final-v3.json):**40/40unchanged,130Place/20Business,17migrations/checksums unchanged**. Original27Trip không đọc/fresh-count, originalDB0. [Restoration](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/readonly-restored-approved-final.json):API PID27448 protected READ ONLY/actual modelConfigured=false, worker/search/Qwen OFF; frontend5177 giữ nguyên. Chỉ handoff/stop các API process do launcher sở hữu, xác minh PID/owner/command; không stop model/Docker/process khác. Không `.env`/schema/reseed/Recommendation weights/Planner/GROUP_VND_V1/geography/Trip/Booking authority changes.

#### 21.24.13. Real knowledge owner handoff

**REAL KNOWLEDGE APPROVAL PENDING;0real approved/retained rows.** [Owner handoff](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/OWNER_HANDOFF.md) giữ URLs/locators/quotes/license/attribution/period/unit/scope/UNKNOWN từ [K1/K2/K3 packet lịch sử](evidence/travelgo-ai-agent-core/integration-v60a-20261115/OWNER_REVIEW.md): shuttle150.000/person; cable-car150.000khứ hồi hoặc120.000một chiều; bus40.000/vé. Chưa phải giá hiện tại. EN/VI Wikivoyage cùng publisher family.

Cần fresh authorized import/bind/source integrity và SUPER_ADMIN thật; owner chọn từng fact, reason/expiry, quyết định retention exact rows. Revoke phải làm source/fact ineligible ngay. Task21.24 không có Internet authorization mới, không collection hoặc approve/retain real facts, không dùng actor SYNTHETIC thay owner. Quy trình approve/retain/revoke cụ thể ở handoff, không yêu cầu đọc JSON/SQL để hiểu candidate.

#### 21.24.14. Proposed bounded real Qwen acceptance

[Manifest final-v3](evidence/travelgo-ai-agent-core/bridge-v60b-20261115/qwen-live-proposed-manifest-v3.json) trạng thái **PROPOSED_NOT_APPROVED_NOT_RUN**, bind source v3 và production serialized-body templates; manifest/approval V6A hoặc staging21.24 không cấp quyền LIVE. B1typo/new phrase; B2vague budget/transport với verified context; B3typed unit/cost fact selection; B4grounded knowledge/review/memory selection. Semantic expected/safety/scoring khóa trước native; fixtureSYNTHETIC được ghi nhãn, phải fresh-bind trước LIVE, không claim real review integration.

Model vẫn `qwen3:4b-instruct-2507-q4_K_M`, digest`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, context16384/temperature0/num_predict2048/deadline15s/concurrency1/no retry. **Chỉ đề xuất** tối đa1conditional warm-load+4inference cho task riêng, tùy approval mới và fresh resource/ownership/runtime/model+Agent quota/reserve guards. Chấm raw output/schema/semantic/grounding/renderer riêng; không parser fallback thành Qwen PASS; nếu semanticFAIL giữ raw và dừng trước khi đổi prompt/model. Task này không chạy bất kỳ model readiness/acceptance nào.

#### 21.24.15. Verdicts và giới hạn còn lại

| Hạng mục | Kết luận |
|---|---|
| NLU PRIVACY PROJECTION | PASS OFFLINE trong lớp dữ liệu/paths đã kiểm; final Unicode/date hardening v3 |
| QUOTE-EVIDENCE SAFETY | PASS OFFLINE —raw/safe spans RAM, placeholder/forgery/unsupported update fail closed |
| TYPED COST-FACT BRIDGE | PASS OFFLINE —reported/derived/estimated/unknown, bounds/unit/source/caveats, fresh revoke |
| UNIFIED MODEL CONTEXT | PASS OFFLINE —bounded assembled fields, server authority,1call/turn |
| ADAPTIVE LANGUAGE MODEL CONTEXT | PASS OFFLINE relevant controlled meanings; real reuse/current rendering chứng minh ở bounded staging v2 |
| GROUNDED RESPONSE CONTRACT | PASS OFFLINE —≤3offered IDs,complete server bundles; không unrestricted prose |
| J6 CURRENT-CONTRACT ACCEPTANCE | PASS ACTUAL NEW v2 staging, desktop/mobile/receipt/isolation; historicalFAIL/9of10 unchanged |
| REAL KNOWLEDGE ACTIVATION | BLOCKED —OWNER APPROVAL/RETENTION PENDING,0real retained |
| STAGING INTEGRATION | PASS6/6 trên locked v2; final v3 privacy-only hardening không rerun chat;40/40/read-only restored |
| QWEN OFFLINE INTEGRATION | V60B_OFFLINE_INTEGRATION_READY_FOR_BOUNDED_MODEL_TEST; compatibilityPARTIAL được công khai |
| QWEN REAL INFERENCE | NOT RUN |
| FULL BROWSER QWEN E2E | NOT RUN |

Còn lại trước inference: approval LIVE mới; fresh model/resource/ownership/quota/context guards; fresh fact binding và exact native lock; đánh giá Qwen raw semantics trên4case thay vì suy từ doubles. Chưa chứng minh general natural conversation, real-world knowledge/review/price quality hoặc full Browser→Qwen→Tools. Legacy payload/old-v1-call expectations chưa được migrate; final-v3 privacy hardening chưa có browser chat run mới trong cap của task. Đã dừng sau code/offline/bounded staging/report; không tự chạy LIVE, worker, commit/push hoặc deploy.
