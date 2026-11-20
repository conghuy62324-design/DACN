
## 21.35 — V6.7 ADVANCED ADAPTIVE INTELLIGENCE, SELF-CORRECTION & PERSONALIZED CONVERSATION

Ngày thực hiện: **18/11/2026, ICT**. Kết quả **PARTIAL**, Qwen OFF; **LIVE READY: NO**. Đã sửa các lỗi có baseline, chạy offline/compatibility/build và đúng hai hành trình Edge thật. Không mở TASK21.36. Evidence: [adaptive-v67-20261118](evidence/travelgo-ai-agent-core/adaptive-v67-20261118/), [final verdict](evidence/travelgo-ai-agent-core/adaptive-v67-20261118/final-verdict.json).

### 21.35.1. Existing architecture và trạng thái nhiệm vụ trước

TASK21.34 đã được **tạm hoãn rõ ràng** tại21.34D trước khi sửa V6.7. Run đầu dừng ở selector UI, chưa tạo source/chạy worker; corrected run chưa có approval bổ sung. Giữ nguyên historical STOP, quota, deadline và toàn bộ evidence;21.35 không mở rộng quyền worker/Internet hoặc tiếp tục run đó.

Đối chiếu Master21.9,21.15–21.19,21.26–21.34 và Production VPS Requirements21.34C. Tiếp tục một AgentCoreService, các store/consent/validator, RegisteredCatalogService, RecommendationService và TourPlannerService hiện có. Không thêm Agent, bản đồ địa danh, memory/knowledge store hoặc Planner thứ hai.

| Module thực tế | Phân loại trong phạm vi task |
|---|---|
| AgentCoreService | Sửa lỗi composition, lời mời memory và giữ/resume preview |
| vietnameseNormalizer | Đang hoạt động, lexical rules có giới hạn; giữ shared geography/cache theo request |
| vietnameseConversation | Sửa composition lời xã giao, khoảng ngày và directive optout |
| conversationSemantics | Sửa phạm vi ngân sách nhóm, Wi-Fi và thay loại lưu trú |
| adaptiveLanguage | Giữ typed SESSION/PERSONAL/SHARED; session reuse offline PASS, không nghiệm thu persistence mới |
| travelConsultant | Sửa Wi-Fi; giữ feedback/reference/server filters |
| advisoryReasoning | Compatibility PASS; review opinion không thành cam kết |
| decisionIntelligence | Giữ current/hard/soft constraints; reasoning vẫn có giới hạn |
| naturalGrounding | Giữ server facts/IDs/nguồn; freshness enrichment có computedAt thay đổi |
| personalizedGrounding | Current quality override PASS offline; không có real-memory integration mới |
| CustomerMemoryService | Giữ fresh consent/ownership; không sửa persistence |
| ReviewInsightService | Đây là module Review Intelligence thực tế; giữ batch/revocation fences; không có review thật mới |
| TravelKnowledgeService + travelKnowledge | Giữ approved/unexpired retrieval và source authority |
| costIntelligence | Sửa câu nối tiếp hỏi đơn vị khoản giá; không sửa công thức chi phí |
| geographicEvidence/correction hiện có | Sửa binding vai trò địa danh phủ định; giữ correction/confirmation guards |

Chi tiết source/hash/exports và giới hạn: [intelligence-gap-audit.json](evidence/travelgo-ai-agent-core/adaptive-v67-20261118/intelligence-gap-audit.json). Năng lực Qwen, toàn bộ dialect/slang mở, real review/memory integration và Linux/GPU chưa được nghiệm thu trong task này.

### 21.35.2. Confirmed intelligence gaps

Baseline xác nhận: optout sở thích cũ làm mất yêu cầu tìm dịch vụ đi kèm; câu có thói quen bị lời mời lưu memory chặn; Wi-Fi bị mất khi semantic tokenizer chèn khoảng trắng quanh dấu gạch; geographic role trong “không phải đi từ…” vẫn ghi nơi xuất phát; số tiền “cho cả hai người” chưa gắn group scope; câu nối tiếp hỏi đơn vị khoản giá rơi về fallback; social clauses kết hợp gọi memory không cần thiết. Catalog side-goal thay filters còn làm mất lastPlan dù travel proof không đổi.

Hai case Planner trong manifest có setup dùng **xe khách**, ngoài contract car/motorbike, nên không tạo preview. Giữ nguyên inputs/expected và strict FAIL của H03/H04; không đổi chúng thành PASS hoặc tự đổi xe của khách. Baseline còn phát hiện parser chỉ lấy ngày đầu của khoảng “25/11/2026 đến27/11/2026”; đã sửa riêng delimiter, không mở rộng transport enum.

### 21.35.3. Source changes

Chỉ sáu production files: `backend/src/services/agentCoreService.ts`, `backend/src/agent/conversationSemantics.ts`, `backend/src/agent/geographicEvidence.ts`, `backend/src/agent/travelConsultant.ts`, `backend/src/agent/vietnameseConversation.ts`, `backend/src/agent/costIntelligence.ts`.

Memory offer trở thành metadata đi kèm read request, chống mời lặp theo tập typed preferences trong session; optout không còn kết thúc composed task. Resume dùng đúng lastPlan hiện có, đọc lại catalog/source proof và memory/consent trước publication, không gọi lại Planner hoặc cấp quyền save. Catalog browsing không tự vô hiệu preview; thay verified proof/selection hoặc yêu cầu lập lại vẫn vô hiệu như cũ. Không sửa Planner, RecommendationService, geographic34, migration, Trip/Booking, authentication hoặc .env mặc định.

### 21.35.4. Conversational understanding

Development bao phủ slang/typo, nhiều dịch vụ, phủ định tiện ích, tiền nhóm, câu sửa lời và hypothetical. Semantic spans tiếp tục dựa trên lời khách, không hard-code cả câu benchmark. Fuzzy địa danh trong catalog có một ứng viên rõ phải hỏi xác nhận thay vì tìm toàn quốc. Khoảng ngày dùng “đến/tới” được đọc theo parser ngày hiện có; phương tiện chưa hỗ trợ vẫn cần làm rõ, không ép kiểu thành ô tô.

### 21.35.5. Goal switching

Giữ deferred service goals hiện có. Bản dự tính được giữ qua knowledge/catalog side-goals và quay lại bằng yêu cầu resume rõ ràng; kiểm nguồn/consent mới trước render. Targeted offline dùng real Planner trên catalog SYNTHETIC đã PASS cho resume không recompute, từ chối catalog đổi giá và từ chối memory đổi giữa các lượt đọc. Các case “xe khách” không được dùng làm bằng chứng preview PASS.

### 21.35.6. Self-correction

Giữ các verified slots không liên quan; sửa ngân sách cả nhóm5→6triệu cho hai người; mệnh đề phủ định về nơi xuất phát không thành update. Lời sửa chưa rõ hỏi đúng phạm vi và bỏ pending proposal. Khách nêu200k/người không cập nhật knowledge150k hoặc catalog; authority/source lịch sử được giữ, không tự xác nhận giá hiện hành.

### 21.35.7. Adaptive language

Reuse discovery→typed explanation→SESSION mapping→dùng trong cấu trúc câu khác đã PASS offline. Giữ existing explicit PERSONAL consent, sửa/xóa/revocation và SHARED moderation; không lưu raw transcript, không học hệ số tiền hoặc tự nâng scope. Task này không có persistent-language write authorization và không ghi mapping thật: persistence acceptance mới **NOT RUN**, không gọi là Qwen training.

### 21.35.8. Feedback adaptation

Giữ amenity/type/price cap khi tìm rẻ hơn; chỉ trả alternative đủ điều kiện từ catalog. Actual A2 trả **no_results** vì không có homestay rẻ hơn đáp ứng điều kiện, không tự bỏ constraint. A4 sau khi khách đổi rõ sang khách sạn trả lựa chọn350.000VND, vẫn dưới cap749.999VND và có Wi-Fi. Chưa biết yên tĩnh/vệ sinh thì nói thiếu dữ liệu; không suy chất lượng, khoảng cách trung tâm, sức chứa/trẻ em hoặc availability từ tên cơ sở. Không đổi recommendation weights/cost formulas.

### 21.35.9. Customer personalization

Current quality/type thắng preference cũ; optout chỉ ngưng sử dụng trong phiên, không xóa memory hoặc tự bật/tắt consent lâu dài. Habit + current search vẫn thực hiện search; offer lưu preferences không thay quyền ghi. Task không tạo personal memory/review fixture trong PostgreSQL. Vì baseline memory thật không cung cấp preference cho hành trình này, không tuyên bố actual long-term memory conflict integration PASS.

### 21.35.10. Natural response quality

Actual A1 nêu tên DEMO homestay, giá tham khảo750.000VND, Wi-Fi và “Chưa đủ dữ liệu để đối chiếu yên tĩnh/vệ sinh”; không gọi đây là giá phòng/đêm hoặc Booking. A4 trả khách sạn350.000VND với cùng caveats. B1 trả trực tiếp150.000VND mỗi người,02/2026, link Wikivoyage và cảnh báo chưa xác nhận hiện tại. Social-only response tránh gọi catalog/knowledge/memory/reviews.

Không thêm unrestricted model prose hoặc hiện UUID/internal enums trong reply CUSTOMER đã chấm. Một giới hạn UX vẫn thấy ở A3: catalog location và verified trip destination là hai scope; sau sửa group budget, Agent hỏi trip destination dù vừa biết khu vực search. Không bịa destination proof để che khác biệt này; đây là điểm cần xử lý goal-aware clarification có giới hạn trong21.36.

### 21.35.11. Integrated reasoning

Giữ selective retrieval V6.3, source freshness, fresh memory consent/ownership, review revocation và authority order. Booking chỉ có quyền xác nhận giao dịch từ dữ liệu Booking; historical source/catalog không được thay thế. Worker/private-data flow không thay đổi. Rule-based Agent OFF vẫn tư vấn/Planner bằng nguồn server; **không có bằng chứng model-level reasoning mới**.

### 21.35.12. Before/after benchmark

Khóa28case trước production edits: [manifest](evidence/travelgo-ai-agent-core/adaptive-v67-20261118/benchmark-lock.json), SHA256 `98b6d45d254f8308d665ea67a4c7b0c742f1a7ea9d00fd5b42934d0778fcb41c`. Inputs/expected không đổi sau kết quả. Dùng lại V6.5 production-Core/catalog/history harness và repository doubles SYNTHETIC, không PostgreSQL/model.

| Cohort | Baseline | Final |
|---|---:|---:|
| Development | 7/18 | 18/18 |
| Locked holdout | 4/10 | 8/10 |
| Tổng | 11/28 | 26/28 |

Kết luận benchmark **PARTIAL**, không phải28/28. H03/H04 giữ FAIL do chưa có preview với transport không hỗ trợ. Các lỗi adapter/checker được ghi riêng và giữ bản đầu: discriminator production là registered_options, HCM aliases so theo shared geography ID, lời yêu cầu làm rõ không nhất thiết kết thúc bằng “?”; fixture attraction phải dùng category thật thay vì sightseeing. Baseline và final được chạy cùng adapter/checker đã hiệu chỉnh, inputs/expected giữ nguyên. Mọi lần lỗi vẫn lưu. Xem [limitations](evidence/travelgo-ai-agent-core/adaptive-v67-20261118/benchmark-fixture-limitations.json).

### 21.35.13. Independent locked holdout

Mười input holdout khác development, expected khóa cùng manifest trước sửa. Baseline outputs đã được audit, vì vậy đây không phải đánh giá blind. Không đổi expected, không tuyên bố tỷ lệ hiểu tiếng Việt tổng quát từ26/28. Bổ sung targeted valid-transport Planner không thay hoặc cấp PASS hồi tố cho H03/H04.

### 21.35.14. Targeted regression/build

Targeted **6/6 OFFLINE PASS**: valid preview resume, stale catalog, fresh memory change, offer không chặn/lặp, injection không được mutation, negated service + Wi-Fi. Probe đầu có assertion sai vị trí đọc memory, đã giữ FAIL và sửa adapter sang lần fresh-read thật; không thay production consent guard để lấy PASS.

Compatibility cuối **115/115 PASS**: conversationV54 10; conversationV62 20; agentAdvisoryV51 19; costContextV591 25; planningV56 23; performanceV63 18. Lần đầu hai suite có lỗi do ép mọi từ “khách sạn” thành subtype hotel, loại cả legacy rows thiếu metadata; đã thu hẹp đổi subtype vào ngữ cảnh đang có loại lưu trú cũ, rồi chạy lại hai suite bị ảnh hưởng. Giữ logs FAIL/PASS. Không chạy lại tất cả benchmark V4–V6.6. Backend `npm.cmd run build --prefix backend --silent` **PASS**; frontend build **NOT RUN**, không có frontend source change.

### 21.35.15. Actual acceptance

Fresh Agent scan một lần, đúng principal hiện có, đọc mọi historical attempts theo cả at/createdAt với timestamp muộn hơn: **20/20**, cap20/hour, reserve10. Pre-reserve capacity10 trước dispatch:1dedicated CUSTOMER login RAM-only +9chat; không scan lại để hồi quota, không đổi principal. [Locked actual manifest](evidence/travelgo-ai-agent-core/adaptive-v67-20261118/actual-manifest.json). Reuse existing strict recorder/Edge/controller send flow; không mock API hoặc dùng HTTP thay các hành động chat UI.

| Hành trình | Actual result | Phạm vi |
|---|---|---|
| A desktop1440×1000 | **ACTUAL PASS** theo locked assertions |4chat: nhiều nhu cầu→rẻ hơn/no_results→sửa ngân sách→optout + khách sạn mới; consent/Gửi và response UI PASS |
| B mobile390×844 | **FAIL_STOP_NO_RETRY** |5chat đều HTTP200; B1–B4 qua assertions/UI, B5 dừng khi so deep equality itinerary |

B3/B5 chỉ khác `hotelSuggestion.reviewInsights.computedAt`: `2026-11-18T12:37:06.198Z` và `2026-11-18T12:37:06.530Z`. Đây là timestamp enrich review khi đọc mới; [independent diff](evidence/travelgo-ai-agent-core/adaptive-v67-20261118/B5-independent-diff-diagnosis.json) chứng minh không khác lịch/chi phí/lựa chọn. **Không sửa expected, không rescore thành PASS, không retry**. B5 có raw200 nhưng kiểm hiển thị cuối/screenshot hành trình B chưa hoàn tất sau khi scorer dừng. Giữ [actual failure](evidence/travelgo-ai-agent-core/adaptive-v67-20261118/actual-failure.json). Full two-journey acceptance **PARTIAL**; Browser→Qwen→Tools **NOT RUN**.

Actual tổng1login +9chat =10conservative entries, remaining suy ra10/reserve10. API READ ONLY audit:296queries,12identity checks, **DML0/blocked0/originalDB0/native-model0**. Không gọi thêm inference, quota hoặc chat sau STOP.

### 21.35.16. Privacy/data integrity

Ban đầu staging ECONNREFUSED và Docker daemon không chạy. Đã mở đúng Docker Desktop hiện có, container/volume `travelgo_catalog_staging_20261112_db` tự khởi động lại; không tạo/reset/seed/migrate DB. Fresh identity xác nhận localhost15452, `travelgo_staging_catalog_20261112`, catalog_runtime non-super/non-createdb/non-createrole, đúng sentinel;17migrations/checksums,40tables,130Place/20Business, đúng Owner SUPER_ADMIN và retained knowledge v2.

Actual API5057 dùng integrated-review READ ONLY tạm thời, frontend5177 task-owned proxy5057; default .env không đổi. **40/40 table fingerprints trước/sau khớp**, gồm users/user_roles, knowledge, memory/language và Trip/Booking. Owner ID/hash/role giữ nguyên, không đọc DPAPI/Owner credentials; original DB/27Trip không truy cập. Không có fixture row cần DELETE. Dừng API thử nghiệm và đúng frontend task-owned23364; khôi phục API **protected READ ONLY PID2124**, model/search/worker/webwrites OFF. [Post-actual proof](evidence/travelgo-ai-agent-core/adaptive-v67-20261118/post-actual-integrity.json).

### 21.35.17. Remaining production blockers và backlog hữu hạn

Portability audit sáu source thay đổi **PASS**: không Windows absolute path, DPAPI website runtime, machine credentials, staging DB hard-code, local browser hoặc Windows timezone dependency. Đây là static audit, chưa nghiệm thu Ubuntu/Docker/GPU. Giữ nguyên21.34C: private Ollama/PG, Qwen pin/contracts, Nginx/domain/HTTPS, volumes/backup/restore, health/log/resource/restart, multi-user privacy/quota, environment isolation và DEMO segregation; chưa deploy hoặc phát sinh chi phí.

- **21.36 — Advanced Travel Consultant:** chỉ xử lý goal-aware clarification nêu ở A3 và các advisory gaps có bằng chứng; giữ unsupported transport clarification, không tự mở enum/công thức. Nếu cần persistent personalization phải có fresh exact write authorization.
- **21.37 — V7.0 Final AI Agent Acceptance:** tạo manifest hợp contract trước dispatch, so stable itinerary business fields riêng với volatile review timestamp; không thay verdict21.35. Đóng actual worker blocker21.34 chỉ với fresh scope nếu còn cần, rồi bounded final browser/model acceptance khi có approval/guards thực. Không suy current tariffs/real businesses từ DEMO hoặc fact02/2026.
- Sau21.37 chuyển ưu tiên sang toàn bộ UI website. Linux/GPU/model-reasoning/security/persistence/full browser production acceptance còn **NOT RUN**. Không tự bắt đầu21.36/21.37, không thêm vòng nghiên cứu hoặc triển khai VPS.

**Task dừng tại21.35: code cải thiện và compatibility/build PASS; frozen benchmark26/28 PARTIAL; actual A PASS/B FAIL; Qwen OFF, model intelligence NOT VERIFIED, LIVE READY: NO.**
