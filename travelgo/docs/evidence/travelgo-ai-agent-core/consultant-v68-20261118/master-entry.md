
## 21.36 — V6.8 ADVANCED TRAVEL CONSULTANT, DECISION INTELLIGENCE & PRODUCT FUNCTIONAL CLOSURE

Thực hiện **18/11/2026, ICT**. **OFFLINE FUNCTIONAL PASS / ACTUAL BLOCKED_QUOTA / LIVE READY: NO.** Không chạy Qwen. Hoàn tất đợt sửa chức năng có giới hạn, không khởi động21.37 hoặc redesign website. Evidence: [consultant-v68-20261118](evidence/travelgo-ai-agent-core/consultant-v68-20261118/), [final verdict](evidence/travelgo-ai-agent-core/consultant-v68-20261118/final-verdict.json).

### 21.36.1. Baseline và existing architecture

Đã đối chiếu Master21.26–21.35,21.35.17, Production VPS Requirements21.34C và source của17module: AgentCoreService, VietnameseConversation, ConversationSemantics, TravelConsultant, DecisionIntelligence, AdvisoryReasoning, CostIntelligence, NaturalGrounding, PersonalizedGrounding, AdaptiveLanguage, TravelKnowledgeService, ReviewInsightService, CustomerMemoryService, RegisteredCatalogService, RecommendationService, TourPlannerService và planningIntelligence. Geographic evidence được audit/sửa tại tầng ngôn ngữ; không thay registry geographic34.

Tiếp tục một Core, các store và services hiện có. TASK21.34 vẫn **DEFERRED**, corrected worker NOT RUN; không tái sử dụng authorization hết hạn. Historical21.35 H03/H04 và B5 tiếp tục FAIL. Các kết quả cũ không được đổi tên thành V6.8 actual PASS.

### 21.36.2. Confirmed gaps

Baseline mới10/30 xác nhận: thiếu câu hỏi xác nhận destination candidate từ catalog; phương tiện ngoài contract có thể không được chặn trước Planner dùng mode cũ; câu so sánh điểm đến có thể cập nhật ngân sách và gọi lại Planner; câu hỏi giảm chi phí bị hiểu thành yêu cầu nhập ngân sách mới; câu catalog có nghỉ ngơi/phủ định một phần bị chuyển sang thu thập Trip slots; no-results thiếu bước tiếp theo có căn cứ; câu so sánh dùng số đếm bằng chữ bị hiểu thành một ordinal.

Targeted âm còn xác nhận proposal candidate sống qua câu hỏi giả định/hết hạn riêng, và hypothetical xe khách có thể chạy bằng car từ context. Đã sửa binding/guard. Rehearsal phát hiện ngày lịch25/11/2026 bị hiểu thành ngày thứ25 khi kèm pace; đã tách calendar date khỏi local day edit, giữ hành vi sửa ngày2 hiện có. Một probe mixed-mode trước sửa không dispatch hoặc đoán mode; gap thực tế là connector “hoặc” của phương tiện gây geographic ambiguity và mất các slots mới. Đã giới hạn connector theo span địa danh, đồng thời không cấp new car proof khi còn unsupported alternative.

### 21.36.3. Production source changes

Chín file: `services/agentCoreService.ts`; `agent/vietnameseConversation.ts`, `conversationSemantics.ts`, `travelConsultant.ts`, `advisoryReasoning.ts`, `costIntelligence.ts`, `geographicEvidence.ts`, `planningIntelligence.ts`; `utils/itineraryComparison.ts` dưới `backend/src`.

Comparator mới chỉ là acceptance utility có version, không phải Planner/store/recommendation engine. Không thay TourPlannerService, RecommendationService/weights, GROUP_VND_V1/cost formulas, persistence services/schema/migrations, authentication, frontend source hoặc default .env. [Final offline source hashes/portability](evidence/travelgo-ai-agent-core/consultant-v68-20261118/source-final-offline-lock.json). Các manifest actual đã chuẩn bị bị chặn bởi quota; sau corrective offline cuối, không tái sử dụng chúng như quyền dispatch trên source mới.

### 21.36.4. Goal-aware clarification

Search area không tự thành VERIFIED destination. Ví dụ sau tìm homestay Đà Lạt, yêu cầu lập lịch cho2người/6triệu sẽ hỏi: “Bạn muốn lập chuyến đi Đà Lạt với ngân sách6.000.000VND cho cả nhóm,2người lớn đúng không?” Những giá trị số này được parse từ lời khách, không suy từ catalog.

Chỉ khi khách xác nhận proposal hợp lệ mới merge destination qua existing typed proof. Candidate chỉ có hiệu lực đúng revision kế tiếp, tối đa5phút trong session TTL, bị hủy khi có turn xen giữa/selection/expiry. Dùng lại affirmative contract hiện có. Nhiều retained search areas hỏi rõ, không chọn thay; hypothetical/negated/comparison location không nâng authority. Destination đã VERIFIED không hỏi lại.

### 21.36.5. Decision support

Reuse AdvisoryReasoning/DecisionIntelligence, nhận số đếm bằng chữ trong yêu cầu so sánh và giữ referent clarification khi chưa biết dịch vụ nào. Nếu hỏi bảo đảm sạch/yên tĩnh mà referent chưa rõ, nói chưa thể bảo đảm rồi yêu cầu chỉ đúng listing để đối chiếu review. Không tự chọn một trong nhiều listing, tạo review/confidence/ranking số hoặc gọi giá thấp nhất là tốt nhất. Unknown price units không cho phép kết luận tổng chi phí dịch vụ nào thấp hơn.

### 21.36.6. Budget intelligence

Câu hỏi “ngân sách có ổn không” là advisory-only: trả phần chưa biết, nguồn phù hợp và một câu hỏi tiếp theo; không tạo Planner/Trip hay nâng hypothetical budget thành proof. Budget breakdown dùng totals thực của existing Planner: tổng cả nhóm, dư/thiếu và khoản lớn nhất. Không bắt khách nhập ngân sách mới khi chỉ hỏi nên giảm ở đâu.

Historical range dùng `reportedCostLabel` hiện có, giữ lower/upper bounds và unit, không tự lấy midpoint. No-results có thể nêu mức giá tham khảo thấp nhất của candidate cùng type/amenities còn lại nếu có dữ liệu, recheck source proof trước publication. Không coi chênh lệch reference prices là tiền tiết kiệm Booking, không cộng historical shuttle vào Planner total hoặc double-count lodging/transport.

### 21.36.7. Destination comparison

Hai địa danh đã nêu không bị `đi đâu` xóa thành unknown destination. Comparison mode đi qua CostIntelligence, giữ party/days/nights/mode từ verified context và scope tiền hiện có; thiếu scope thì hỏi. Không cập nhật destination/ngân sách chính hoặc gọi hai Planner để trả một câu so sánh định tính.

Nếu chỉ một nơi có approved historical observation, nơi kia thiếu dữ liệu thì giữ phần thiếu và không tuyên bố nơi nào rẻ/đủ ngân sách. Không thêm weather/crowd/safety/current-price facts. Geographic registry và dedup/source authority hiện có giữ nguyên.

### 21.36.8. Itinerary intelligence

Planner algorithm và relaxed/balanced/packed contract không đổi. Calendar dates không còn bị xem là local day number khi khách yêu cầu pace. Existing local replan vẫn giữ các ngày không liên quan, hotel/restaurant/mandatory constraints và báo delta/caveats; compatibility planningV56 cuối23/23 PASS.

“Ngày2 bỏ bớt một chỗ nhưng giữ chỗ ăn” chưa xác định activity thì hỏi đúng phạm vi, không tự bỏ một điểm hoặc sửa ngày khác. Resume giữ existing preview, revalidate source/consent và không auto-save. Unsupported executable edits được giải thích bằng khả năng hiện có, không mở thuật toán/mode mới.

### 21.36.9. Unsupported transport

Nhận diện xe khách, xe buýt, máy bay, tàu hỏa, phương tiện công cộng tại tầng language; chúng không được thêm vào execution enum car/motorbike. Trả giới hạn tính chi phí/thời gian và khả năng tư vấn lưu trú/ăn uống/tham quan. Pending unsupported mode ngăn Planner dùng nhầm car cũ; giữ các slots hợp lệ khác. Mixed/undecided mode không sinh new car proof.

Khách chọn rõ car/motorbike ở turn sau mới lập preview hợp contract. Unsupported hypothetical bị chặn trước Planner và không ghi main state. Valid car và motorbike, unsupported/negated/mixed mode, slot retention và resume được kiểm offline. H03/H0421.35 vẫn FAIL; không đổi inputs/expected lịch sử. New transport engine/ETA/ticketing là P2 riêng, không bắt buộc trước UI nếu công bố đúng giới hạn.

### 21.36.10. What-if reasoning

Reuse existing scenario proof/Planner, không tạo scenario store. Budget+1triệu và3→4ngày giữ main proof/preview, kiểm source và trả hypothetical result với authority không thực thi. Unknown unit hoặc unsupported mode không tự tạo khoản tiết kiệm/ETA. Không tự sửa saved Trip, Booking, payment hoặc memory. Việc áp dụng thay đổi vẫn đi qua workflow/revision/confirmation hiện có.

### 21.36.11. Response quality và integration

Multi-constraint search giữ homestay/type, hard Wi-Fi và price cap; nghỉ ngơi là preference, không phải bằng chứng cơ sở yên tĩnh. Current request/optout thắng stale memory; offer không spam ở mỗi turn, không tự persist. No-results giữ yêu cầu và hỏi khách có muốn nới một điều kiện; không tự tăng cap/chuyển type/destination.

Short budget advice giữ source link/unit/period nếu có, không trả form tất cả slots. Review opinion không thành guarantee. Giữ selective retrieval, source expiry/revocation, memory ownership/consent và Booking authority; không nạp mọi service cho mọi turn. Không hiện UUID/internal enum/database terminology trong replies đã chấm; không giả vờ Qwen đang hoạt động.

### 21.36.12. Current-contract comparator

`compareItineraryBusinessFields`, version **ITINERARY_BUSINESS_V1**, chỉ tách `hotelSuggestion.reviewInsights.computedAt` khi cả hai là timestamp ISO hợp lệ. Missing/invalid timestamp không bị bỏ qua. Giữ nguyên toàn bộ các field khác, gồm dates/duration/destination, service IDs, activity/day order, prices/totals/breakdown, constraints, review evidence/revision và source metadata. Hàm không mutate inputs.

Comparator PASS cho cặp raw B3/B5 cũ chỉ khác timestamp; đây là kiểm utility hiện hành, **không rescore21.35 mobile thành PASS**. Negative checks phát hiện đổi price, activity, selected listing, review/source revision, review evidence, cost total, timestamp bị xóa hoặc timestamp ngoài path đã chứng minh. Future actual dùng comparator version mới, không bỏ cả reviewInsights/metadata.

### 21.36.13. Benchmark/holdout

Khóa30case trước production edits,20development +10holdout: [lock](evidence/travelgo-ai-agent-core/consultant-v68-20261118/benchmark-lock.json), SHA256 `aba320f32af2e5e7ae8af61af0653e56a0af9e28e9f084aebe22ba7465ad77af`. Structured assertions kiểm proof/candidate, filters, typed scenarios, source authority, no mutation và ý nghĩa response. Không đổi inputs/expected sau output.

| Phép đo | Development | Holdout | Tổng |
|---|---:|---:|---:|
| Baseline |6/20|4/10|10/30|
| Sau sửa development, source khóa trước mở diagnostics holdout |20/20|**8/10 lần độc lập đầu**|28/30|
| Regression cuối sau corrective fixes |20/20|10/10 đã quan sát|**30/30**|

Giữ first holdout8/10 và hai FAIL H04/H07. Lần10/10 sau sửa là corrective regression, không phải independent holdout mới. Không cộng reruns thành coverage/độ chính xác AI tổng quát. Không dùng bộ mới xóa H03/H04/B5 lịch sử.

### 21.36.14. Targeted regression/build

Targeted **11/11 OFFLINE PASS**: candidate next-turn/expiry, unsupported hypothetical, stale alternative price rejection, comparator scope/input immutability, injection/no-mutation, motorbike preview, competing catalog areas, historical range, calendar-date/pace và mixed-mode scope. Repo/catalog/history/Planner harness cũ được reuse; fixtures/doubles SYNTHETIC chỉ trong process, PostgreSQL0/model0.

Compatibility cuối **115/115**, sáu suite liên quan: conversationV54 10, conversationV62 20, agentAdvisoryV51 19, costContextV591 25, planningV56 23, performanceV63 18. Giữ các logs FAIL trước sửa: composed search thiếu local search-area fallback và bản sửa date/day đầu làm mất local edit; đã sửa đúng scope và kiểm lại. Backend build **PASS**. Frontend source không đổi, frontend build **NOT RUN**. Không chạy lại toàn bộ benchmark V4–V6.7, không cộng các lần rerun.

### 21.36.15. Actual browser acceptance

Chuẩn bị/reuse existing Edge + strict recorder + UI consent/Gửi flow. Mobile ưu tiên5chat: catalog→candidate confirmation→valid car preview→side-goal→resume/comparator/UI/screenshot. Desktop tùy capacity4chat: relaxed preview→budget breakdown→what-if→resume. Inputs/expected không đổi giữa các source-lock revisions trước dispatch. Offline rehearsal dùng explicit SYNTHETIC public DEMO-label double, **không phải actual browser PASS**; không ghi giả vào real corpus.

Fresh Agent scan **một lần**, đúng approved principal A/hash hiện có, toàn bộ historical attempts theo cả at/createdAt và timestamp muộn hơn: remaining **10/20**, reserve **10**. Mobile cần1login +5chat =6entries, tức remaining≥16: **thiếu6**. Hai journeys cần10entries, remaining≥20. Vì vậy **BLOCKED_QUOTA**, login0/chat0/browser0; không kích hoạt API integrated-review/frontend, không polling/reset/switch principal hoặc chờ để scan lại. [Gate](evidence/travelgo-ai-agent-core/consultant-v68-20261118/fresh-agent-quota.json).

Theo ledger tại thời điểm scan, sớm nhất đủ mobile là **20:37:05.812 ICT18/11/2026** nếu không có entry mới. Đây là dự báo có điều kiện, không phải quyền chạy/khẳng định quota ở thời điểm tương lai. Không tự chạy lại trong task. Sau gate chỉ hoàn tất offline corrective guards/report; final offline lock supersedes prepared actual manifests cho lần nghiệm thu tương lai, cần manifest/source lock và fresh gate mới ở21.37.

### 21.36.16. Data integrity/quota/runtime

Fresh staging15452 đúng `travelgo_staging_catalog_20261112`, catalog_runtime non-super/non-createdb/non-createrole, sentinel hợp lệ;40tables/17migration checksums,130Place/20Business, Owner/SUPER_ADMIN và retained approved knowledge v2 được xác minh. **40/40 fingerprints trước/sau khớp**. DML0, fixtures0, không cần DELETE cleanup. Không đọc/đổi Owner credentials/DPAPI/hash/role; không sửa catalog/reviews/memory/language/knowledge/Trip/Booking/schema. DB gốc27Trip không truy cập.

Runtime cũ **protected READ ONLY PID2124** còn đúng ownership, model/search/worker/webwrites OFF; không restart hoặc đưa source V6.8 vào browser runtime khi quota bị chặn. Frontend không được task này khởi động. Source/build V6.8 trên disk không được trình bày như actual runtime đã nghiệm thu. Quota còn10 tại fresh scan, dùng0; không có scan mới. Ollama metadata/native/model quota/resource checks đều0; không Internet/Maps/GPS/paid API/VPS/commit/push/deploy. [Integrity](evidence/travelgo-ai-agent-core/consultant-v68-20261118/post-task-integrity.json).

### 21.36.17. Capability readiness matrix A–T

[Matrix đầy đủ](evidence/travelgo-ai-agent-core/consultant-v68-20261118/capability-readiness-matrix.json) ghi riêng **code, offline, real HTTP/PG, browser, model và exact blocker** cho từng capability. Tóm tắt:

| ID | Capability | Code/offline | Real HTTP/PG và browser | Model/blocker |
|---|---|---|---|---|
|A|Natural language|Rule core cải thiện; corrective30/30|V6.8 NOT RUN/quota;21.35 A là lịch sử|Qwen NOT RUN;P1|
|B|Context continuity|Candidate/TTL/revision/resume PASS|Mobile M chưa chạy; B5 cũ FAIL|OFF;P1 current browser|
|C|Adaptive language|Existing SESSION/PERSONAL/SHARED giữ nguyên|Historical workflow; không PG write mới|OFF;P1 consent/reuse smoke|
|D|Customer memory|Fresh consent/current override giữ nguyên|Không real-memory integration mới|OFF;P1 authorized data|
|E|Review intelligence|Uncertainty/revision fences PASS|Không review corpus thật mới|OFF;P1 eligible review integration|
|F|Approved knowledge|Expiry/authority PASS|Retained v2;21.35 B1 historical actual|OFF;P1 fresh permitted production sources|
|G|Cost intelligence|Comparison/range/breakdown PASS|Current actual BLOCKED|OFF;P1 browser budget/what-if|
|H|Recommendation|Engine/weights không đổi; fixture integration|130Place/20Business vẫn DEMO|OFF;P1 real partner data|
|I|Decision support|Grounded qualitative tradeoffs PASS|Current browser BLOCKED|OFF;P1 real-data usefulness|
|J|Planner|Existing engine; car/motorbike/local edits PASS|21.35 preview lịch sử; current NOT RUN|OFF;P1 preview/resume, modes mớiP2|
|K|Trip integration|Existing save/update guards; no mutation mới|21.27-B actual persistence PASS lịch sử|OFF;P1 final smoke nếu cần, fresh write scope|
|L|Booking navigation|Existing preview; không auto-book/payment|Current smoke NOT RUN; data unchanged|OFF;P1 navigation/auth/authority|
|M|Self-correction|Typed slots/mode/candidate scope PASS|21.35 A lịch sử; current BLOCKED|OFF;P1 current browser|
|N|What-if|Budget/duration isolation PASS|Current desktop D chưa chạy|OFF;P1 actual scenario|
|O|Source authority|Exact business/review/source fields retained|40table/source versions unchanged|OFF;P0 before production correctness|
|P|Worker|Code cũ;21.34 DEFERRED|Corrected worker NOT RUN|OFF;P1 before enabling periodic worker|
|Q|Model reasoning|Bridge/contracts cũ, offline validation|Ollama GET/POST0|NOT RUN;P1 fresh real reasoning acceptance|
|R|Desktop/mobile|UI/strict recorder reused; rehearsal offline|V6.8 BLOCKED_QUOTA|OFF;P1 mobile first|
|S|Privacy/security|Auth/RBAC/TTL/fences giữ; targeted11/11|DML0,40/40; production NOT RUN|OFF;P0 multi-user/privacy/security acceptance|
|T|Linux/GPU portability|Static9changed files/build PASS|Linux/Docker/GPU actual NOT RUN|OFF;P0 deployment acceptance|

### 21.36.18. Remaining P0/P1/P2 blockers

- **P0 trước production:** security/multi-user/session/privacy/quota acceptance; đúng quyền và freshness giá/data; Linux/Docker/GPU/private network, không public Ollama/PostgreSQL, HTTPS/domain, volumes/backup-restore/recovery và DEMO segregation. Đây là các điều kiện chưa nghiệm thu, không phải quyền thuê VPS/deploy trong task này.
- **P1 trước public AI release:** current-source mobile/desktop acceptance bị quota chặn; Qwen real reasoning cần fresh approval/guards; authorized real review/memory/partner/source integration trong đúng feature sẽ công bố. Worker phải có fresh bounded actual acceptance trước khi bật định kỳ;21.34 không được tự resume. Có thể giữ worker/model OFF nhưng không tuyên bố chúng READY.
- **P2 có thể sau demo/UI:** transport modes mới, routing/ticketing và những loại tư vấn vượt dữ liệu/contract hiện hành. Công bố giới hạn và hỏi làm rõ; không mở thêm phiên bản AI để nghiên cứu vô hạn.

### 21.36.19. V7.0 final acceptance scope và freeze

**Agent Core functional freeze candidate: YES trong supported model-OFF contracts; actual closure còn PENDING. Qwen LIVE readiness: NOT VERIFIED. Production readiness/LIVE READY: NO.** Đã hoàn tất sửa code của task; không tự mở capability mới hoặc21.37.

21.37 chỉ khóa source cuối và manifest mới, fresh data identity/fingerprints, một fresh Agent gate cap20/reserve10 rồi ưu tiên mobile M trước; desktop nếu đủ capacity. Dùng ITINERARY_BUSINESS_V1 và kiểm UI/screenshot/overflow/không auto-save; không tái dùng manifest lệch source hoặc verdict21.35. Trip/persistent-learning writes chỉ khi có fresh exact authorization. Worker/model acceptance là scope có approval/guards riêng; không tự chạy Qwen bằng quyền task cũ. Bảo toàn dữ liệu và restore protected READ ONLY.

Giữ Production VPS Requirements21.34C; static portability không thay actual Ubuntu/GPU/security/persistence acceptance. Sau21.37 chuyển ưu tiên sang hoàn thiện toàn bộ UI, rồi đóng gói Linux/Docker và deployment khi được cấp quyền hạ tầng/chi phí. **Dừng sau21.36.**
