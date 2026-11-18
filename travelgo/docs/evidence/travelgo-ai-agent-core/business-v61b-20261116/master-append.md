

## 21.27 — V6.1-B REAL BUSINESS INTEGRATION, CONVERSATIONAL TRIP MANAGEMENT & PERSISTENCE

Thực hiện **16/11/2026** trên working tree hiện hành. **CODE/OFFLINE IMPROVED; ACTUAL BUSINESS ACCEPTANCE PARTIAL, ACTUAL TRIP SAVE FAIL, chưa LIVE READY.** Owner tạm đóng21.26-B; không tiếp tục provisioning, đổi owner credentials hoặc knowledge workflow. SUPER_ADMIN/DPAPI/hai real retained rows giữ nguyên; real knowledge vẫn PENDING. Không thêm Agent, Planner, Trip/Booking service hoặc migration. [Acceptance summary](evidence/travelgo-ai-agent-core/business-v61b-20261116/acceptance-summary.json).

### 21.27.1. Existing business capability audit

Đã đọc các mục9/15/18/21.17–21.19/21.23–21.26-B và các báo cáo T03-A/B, T04-A/B, T06, T11/T11-B, T13-A/T13-A-FIX; đối chiếu current source, không mặc định FAIL cũ còn tồn tại. Các tên thực tế: services/agentCoreService.ts, agent/vietnameseConversation.ts, adaptiveLanguage.ts + services/languageMemoryService.ts, conversationSemantics.ts, decisionIntelligence.ts, services/tourPlannerService.ts, tripSessionService.ts, repositories/tripRepository.ts, services/bookingService.ts, recommendationService.ts, registeredCatalogService.ts; frontend AgentCorePanel/AgentResultCard/AssistantPage/MyTripsPage/TripDetailPage/BookingContext.

| Luồng đã có trước task | Evidence/giới hạn đúng tầng |
|---|---|
| Hội thoại, catalog, chọn/comparison dịch vụ, V5.6 Planner/cost | Có source và các nghiệm thu staging trước; không phải Qwen understanding PASS |
| Agent save/update preview, one-use confirmation, catalog freshness, owner/version lock | Có contract và Trip doubles; Master9/15 chưa chứng minh Agent→committed Trip |
| Trip CRUD/lifecycle/reconciliation qua services hiện có | T04/T11/T13 có historical PostgreSQL thật, không được tính thành actual Agent persistence mới |
| Saved Trip editor và Booking confirmation header | T13-A-FIX đã sửa và14/14 historical E2E; current editor và server unitPrice binding còn tồn tại, không sửa lại hoặc chạy full T13 |
| Agent reopen→tiếp tục sửa | Trước task chỉ nạp slots, xóa lastPlan/lựa chọn; UI cần nhập mã Trip và thường gửi tripId trên mọi turn |
| Knowledge thật | Hai retained source/candidate vẫn UNREVIEWED/DRAFT; không phải prerequisite cho task này |

### 21.27.2. Những lỗi và phần thiếu đã sửa

1. Geographic role adapter trước đây bỏ qua địa danh viết liền với thời lượng như ĐL3n2đ và không nhận vai trò xuất phát trong “tui ở SG”. Tách biên chữ/số và nhận vai trò có ngữ cảnh, vẫn dùng shared geography, không thêm city map. Giữ hỏi lại khi thiếu date/transport/party hoặc có ambiguity.
2. Duration edit bằng từ “một/hai/ba” và câu đầy đủ chưa đi hết pipeline. ConversationSemantics nay dùng số ngày từ verified dates khi chưa có duration memory, qua calculatePlannerDays hiện có. Không suy số ngày từ dữ liệu chưa xác nhận.
3. Câu “Thêm một ngày thì tốn bao nhiêu?” nay là what-if dù không có “nếu”; dùng existing scenario/Planner, giữ verified state, draft, lựa chọn và pending ticket. Lệnh “Thêm một ngày vào lịch trình giúp tôi.” chỉ cập nhật draft; save riêng vẫn cần preview/confirmation.
4. Reopen theo consent riêng dựng lại snapshot đã lưu và lastPlanningInput từ DTO server, requery lodging/catalog, phục hồi mandatory selections và pace. Thêm **lodgingPlaceId trong planner_metadata JSON hiện có**, không thêm column/migration và không lưu client price làm authority. Snapshot cũ thiếu lodging ID vẫn xem được; không đoán khách sạn để replan. Không đưa notes/profile vào state model.
5. Bind server-owned Trip ID/version từ lúc mở hoặc saved receipt. Preview sau đó tự là UPDATE đúng ID, không CREATE nhầm; Trip đã đổi trước preview hoặc sau preview bị chặn. Giữ optimistic hash/transaction owner-row lock của TripSessionService/TripRepository. Preview ảnh hưởng activity đã check-in hỏi lại, không âm thầm sửa progress.
6. Thêm cancel preview theo owner/revision/ticket; không ghi Trip. UI kiểm response xác nhận hủy, không tự retry mutation khi kết quả chưa chắc chắn. MyTrips/TripDetail có link “Tiếp tục với trợ lý”; `/assistant` dùng danh sách owned Trips, consent riêng, trạng thái chuyến đang chỉnh và nút hủy preview, không yêu cầu khách nhập UUID.
7. Selection cho Planner requery catalog và phải thuộc danh sách/snapshot server đã offer trong natural session. Thêm chọn điểm tham quan bắt buộc bằng existing mandatoryPlaceIds, giữ qua what-if/reopen; không đổi Recommendation weights. Selected service chưa phải Booking. DEMO không được mở Booking thật.
8. **Lỗi phát hiện bằng browser thật J1:** canonical message có typed preferences nhưng strict required-slot proof không hiểu segment “Sở thích”, khiến adapter mất tất cả slots và Cost Intelligence chiếm routing trước Planner. Sửa coreInput adapter: tách/validate đúng preference IDs bằng validator hiện có rồi merge required proof; G1 grammar không nới. Prose/duplicate/extra segments không được dùng để tạo authority. Giữ raw FAIL và thêm targeted với đúng input đó, Cost Intelligence ON.
9. Frontend contract check còn phát hiện bản dựng lại Trip thiếu budgetAdvice; dùng plannerBudgetAdvice từ số tiền server, không nới frontend parser. Local replan trả budget explanation được tính lại.

Existing source đổi15file: agent/conversationSemantics, coreInput, decisionIntelligence, geographicEvidence, planningIntelligence, vietnameseConversation; routes/agentCoreRoutes; services/agentCoreService, tripSessionService; utils/tripSnapshot; scripts/agent-staging-profile; frontend AgentCorePanel, MyTripsPage, TripDetailPage, agentCoreClient. Thêm targeted backend/frontend tests và scripts/trip-write-scope.cjs cho **existing launcher**, không thêm service/Agent. [Integrity/source changes](evidence/travelgo-ai-agent-core/business-v61b-20261116/historical-integrity.json), [final current source](evidence/travelgo-ai-agent-core/business-v61b-20261116/final-current-source.json). TourPlannerService, RecommendationService/weights, BookingService, shared geography34, review/memory/knowledge implementations, provider/prompt/schema và database migrations không đổi.

### 21.27.3. Offline, compatibility và UI

| Tầng kiểm | Kết quả |
|---|---|
| New targeted Core/Planner/Trip/security | **30/30 PASS**; real Core/Planner, SYNTHETIC catalog, in-memory Trip double; **không phải persistence proof**. [Results](evidence/travelgo-ai-agent-core/business-v61b-20261116/final-targeted-30.json), [deny-network audit](evidence/travelgo-ai-agent-core/business-v61b-20261116/final-targeted-guard.json) |
| Related planning compatibility | **23/23 PASS** trên source liên quan; một labeled provider double, không real model. [Log](evidence/travelgo-ai-agent-core/business-v61b-20261116/planning-compatibility-final.log), [guard](evidence/travelgo-ai-agent-core/business-v61b-20261116/planning-compatibility-final-guard.json) |
| Frontend production parser | **2 groups PASS**,51 payloads từ offline Core;3 negative editingTrip contracts. [Result](evidence/travelgo-ai-agent-core/business-v61b-20261116/frontend-contract-routing-fix.json) |
| Exact scoped SQL policy | **16 assertions PASS**, no DB/network. [Result](evidence/travelgo-ai-agent-core/business-v61b-20261116/scope-contract-results.json) |
| Desktop1440/mobile390 Edge | **PASS — OFFLINE API REPLAY ONLY**: consent/send, preview confirmation, cancel, owned Trip labels, separate Trip consent, editing status, normal edits không resend arbitrary tripId, no overflow. **Không tính thành actual PG/browser persistence.** [Result](evidence/travelgo-ai-agent-core/business-v61b-20261116/ui-offline-replay-results-07.json) |
| Backend/frontend build | PASS: [backend](evidence/travelgo-ai-agent-core/business-v61b-20261116/backend-final-build.log), [frontend](evidence/travelgo-ai-agent-core/business-v61b-20261116/frontend-build-final-02.log) |

First targeted run **14PASS/10FAIL** được giữ ở [offline-before](evidence/travelgo-ai-agent-core/business-v61b-20261116/offline-before.json). Hai FAIL trong đó là lỗi fixture mới của task: đổi catalog row không chắc được chọn và đặt DEMO visible trong profile DEMO OFF; có [correction record](evidence/travelgo-ai-agent-core/business-v61b-20261116/test-fixture-corrections.json), không gọi cả10 là application defects và không sửa expected lịch sử. UI replay failures do frontend chưa chạy/fixture thiếu choices/locator trong details đóng được giữ riêng, không coi là actual customer regressions.

Consultant V5 legacy compatibility trên current configuration có **19/21 PASS,2 FAIL giữ nguyên**, không ép thành PASS: test đòi `/places/` trong raw reply trong khi structured cards có href đúng, và test đòi exception khi listing bị gỡ trong khi current code trả needs_input, không thay lựa chọn. [Guarded results](evidence/travelgo-ai-agent-core/business-v61b-20261116/compatibility-consultant-guarded.json), [hai raw probes](evidence/travelgo-ai-agent-core/business-v61b-20261116/legacy-contract-probes.json). Không thêm UUID vào reply hoặc đổi clarification để lấy điểm.

### 21.27.4. Sự cố ngoài phạm vi Qwen OFF

**Không được ghi toàn task là “Ollama GET/POST0”.** Một lượt chạy compatibility V5 cũ không được ép process model flags OFF trước dotenv, nên default provider từ `.env` đã đi vào readiness Ollama ngoài ý muốn. Có lỗi AGENT_OLLAMA_NOT_READY trước POST trong nhánh quan sát được; grounded-response branches có thể catch cùng lỗi. Lượt đó **không instrument network nên số metadata GET chính xác UNKNOWN, tổng native POST0 cũng không được chứng minh cho toàn lượt**; không có bằng chứng inference thành công hoặc REAL MODEL acceptance. Không sửa `.env`, không chạy operator warm-load/resource/model-quota scans. Đã thông báo ngay cho owner, giữ [incident](evidence/travelgo-ai-agent-core/business-v61b-20261116/unexpected-readiness-incident.json) và [addendum giới hạn](evidence/travelgo-ai-agent-core/business-v61b-20261116/unexpected-readiness-incident-addendum.json).

Sau đó tất cả offline runners liên quan ép model flags OFF **trước** import/dotenv và deny fetch/socket trước network; các audit riêng ghi nativeRequests0/PG connections0. Actual API profiles luôn model/search/workerOFF; privacy báo modelConfiguredfalse và mọi raw actual chat ghi model.invokedfalse. Không dùng sự cố hoặc doubles làm Qwen PASS. Historical21.25 BLOCKED_RESOURCES không thay đổi.

### 21.27.5. New authorization và fresh staging baseline

Owner đã phê duyệt **riêng** [Trip packet](evidence/travelgo-ai-agent-core/business-v61b-20261116/staging-authorization-review-packet.json), [receipt](evidence/travelgo-ai-agent-core/business-v61b-20261116/staging-authorization.json):1 CUSTOMER B SYNTHETIC + CUSTOMER role, tối đa2 exact Trip IDs (dự kiến1), chỉ users/user_roles/trip_sessions, không owner/knowledge/catalog/Booking writes;8normal chats +2valid confirmation attempts, cap20/hour/reserve10. Không tái dùng approval21.26. Docker/15452 ban đầu unavailable; sau owner mở lại **đúng container/volume hiện có**, fresh preflight mới PASS.

[Fresh baseline](evidence/travelgo-ai-agent-core/business-v61b-20261116/fresh-db-baseline.json): PostgreSQL127.0.0.1:15452, travelgo_staging_catalog_20261112, catalog_runtime không super/createDB/createRole, exact sentinel travelgo-public-staging:catalog-20261112,40tables/17migration checksums,130Place/20Business DEMO, Trip0. Baseline đã gồm real owner+credential rotation và2retained source/candidate đúng IDs/hash/lifecycle. Collision/FK prerequisites PASS. Không kết nối DB gốc/27Trip.

Fresh Agent scan **cả at/createdAt**, latest timestamp bảo thủ, cùng principal hash856f41…95c5: **20/20**, đủ reserve10 cho8chat+2confirmation. Tạo/commit đúng SYNTHETIC CUSTOMER B4dd05bce-b3a4-4456-b4f5-1b1bd43d4de7 và CUSTOMER role0f90a296-bd0c-48c2-948f-6098db85f514; password crypto-random/scrypt, task-only DPAPI, không tài khoản admin. [Setup receipt](evidence/travelgo-ai-agent-core/business-v61b-20261116/setup-committed.json). Customer B chỉ auth/ownership negative, không dùng chat để né quota. Existing owner credentials không đọc/đổi.

Existing launcher thêm scoped-trip-write, giữ production publicStagingGuard, exact Trip SQL/ID/owner/cap/expiry fences; memory/language/review/web writes vẫn OFF. Khóa source/input/expected/principals/call budget trước normal POST. [First manifest](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-journey-manifest.json), [final-source continuation](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-journey-manifest-v2.json). Sau lỗi routing được chứng minh mới sửa offline/relock source; cùng input/expected, raw FAIL cũ giữ nguyên, lượt cũ vẫn tính cap. Không reset ledger/principal để tiếp tục.

### 21.27.6. Actual Browser → API → PostgreSQL/catalog acceptance

Edge1440 thực sự gọi localhost5177→5057→staging catalog/real Planner, không mock successful responses. Raw response/latency/input/expected/conversation đều lưu riêng; model.invokedfalse. Catalog oracle lấy130rows thật trong staging, vẫn **DEMO**, không cơ sở du lịch thật.

| Case | Kết quả thực tế |
|---|---|
| J1 source đầu | **FAIL**, HTTP200 nhưng tool search_places/cost advice, verifiedTravel rỗng, không itinerary. [Raw](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-J1-raw.json) |
| J1 final source | **PASS** cùng input/expected: SG→ĐL,3n2đ,2người,5củ, dates/xe máy/nature; real Planner và DEMO warnings. [Raw](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-J1-final-raw.json) |
| J2 sửa draft | **PASS** ngày2 relaxed, ngày1/ngày3 và lodging giữ nguyên; no saved mutation. [Raw](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-J2-final-raw.json) |
| J3 what-if | **PASS** tạm4ngày, verified state không đổi; J4 vẫn preview3ngày. [Raw](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-J3-final-raw.json) |
| J4 preview | **PASS** CREATE ticket đúng3ngày, chưa có Trip trước confirmation. Foreign ticket409, forged body400. [Raw](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-J4-final-raw.json), [security](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-pre-confirmation-security.json) |
| C1 explicit create confirmation | **FAIL**, HTTP500/AGENT_INTERNAL_ERROR; exact SQL fence blocked1/DML0 trước driver INSERT. **Không committed Trip.** [Receipt](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-create-receipt.json) |
| Actual expiry/J5 refresh | **NOT RUN**, bỏ case để giữ budget sau initial J1FAIL; không giảm TTL hoặc sửa clock |
| J6/J7/J8 reopened/saved edit/update/reload | **NOT RUN**, không Trip committed và không đủ remaining quota/task calls để hoàn tất cả journey |

Independent cost oracles **3/3 PASS** cho actual J1/J2/J3: tính riêng từ catalog+assumptions, adult1/child0,7, lodgingN−1, hotel activity0, food/sights/group total/delta; không gọi lại Planner arithmetic để tự chấm, không cắt giá theo budget. [J1](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-J1-oracle.json), [J2](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-J2-oracle.json), [J3](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-J3-oracle.json). Transport/intercity chưa định giá; historical knowledge/cost observations không thay catalog/Planner/Booking authority.

### 21.27.7. Nguyên nhân create failure và giới hạn sau sửa

C1 bị **operator fixture identity hook**, không phải bằng chứng lỗi transaction/TripService đã commit: model Sequelize đã sinh default UUID; gán instance.id theo setter thông thường bị bỏ qua, nên INSERT mang UUID ngoài manifest và SQL fence **chặn đúng**. Reproduce offline bằng real Sequelize model/SQL generator + fake connection dừng trước driver I/O: owner đúng nhưng ID không khớp; không thư giãn SQL fence.

Sửa existing launcher dùng installTripScopeHooks với **setDataValue chỉ cho new record**, exact owner/IDs/max2/expiry và WeakMap để validation lặp không cấp ID mới; existing record identity giữ nguyên. [ORM proof](evidence/travelgo-ai-agent-core/business-v61b-20261116/orm-identity-offline-results.json): before ID mismatch/fencefalse, after ID match/fencetrue, wrong owner vẫn rejected; no DB/native. Đây là **OFFLINE FIX PASS, chưa actual-save PASS trên hook đã sửa**. Không gửi lại C1, không lấy lại ticket đã consume hoặc auto retry transaction.

Đã dùng **5normal chat attempts** (gồm initial J1FAIL) + **1valid confirmation attempt thất bại** =6counted turns. Fresh final remaining **14/20**, reserve10, spendable4; task còn3normal và1confirmation nhưng từ trạng thái chưa có Trip cần ít nhất4normal+2confirmations để create/reopen/edit/update. Vì vậy dừng actual, không đổi principal, nới cap/reserve hoặc chạy thêm chỉ để lấy PASS. [Final quota](evidence/travelgo-ai-agent-core/business-v61b-20261116/actual-quota-final.json).

### 21.27.8. Exact cleanup, integrity và restoration

[Cleanup ledger](evidence/travelgo-ai-agent-core/business-v61b-20261116/cleanup-ledger-planned.json), [cleanup commit](evidence/travelgo-ai-agent-core/business-v61b-20261116/cleanup-committed.json): actual Trip rows0, không record Trip cần xóa; xóa đúng CUSTOMER B/role sau owner/dependency check, task-only DPAPI blobs đã xóa. Không đụng existing owner/CUSTOMER/real retained rows. [Fingerprint](evidence/travelgo-ai-agent-core/business-v61b-20261116/cleanup-integrity.json) **40/40 khớp fresh baseline**, không dùng baseline trước21.26 để cleanup.

Khôi phục task-owned API **PID28308 protected READ ONLY**, health200, actual process owner/command đúng; startup PG read-only identity hooks PASS, DML0/blocked0, PUBLIC_STAGING_WRITES_APPROVEDfalse, model/search/worker/web writesOFF. [Final runtime/integrity](evidence/travelgo-ai-agent-core/business-v61b-20261116/final-runtime-integrity.json). Frontend5177 vẫn phục vụ; không .env default changes, reset/reseed/recreate/volume delete, schema/Booking/payment/catalog/knowledge mutations, Google Maps/GPS/VPS/Internet collection/commit/push/deploy.

**16.334 historical evidence/report hashes khớp**, Master prefix cũ giữ nguyên. Original DB không kết nối; không tuyên bố fresh25/25 hoặc query lại27Trip. [Historical integrity](evidence/travelgo-ai-agent-core/business-v61b-20261116/historical-integrity.json). Source final có offline operator-hook fix sau actual failure, vì vậy không gọi đó là final-source actual persistence accepted. Qwen21.25 manifest đã lệch source hash; một đợt model/actual acceptance sau này cần manifest mới và quyền/gates tương ứng, không thực hiện trong task này.

### 21.27.9. Verdict và blockers còn lại

| Verdict | Kết quả đúng phạm vi |
|---|---|
| CONVERSATIONAL TRIP CREATION | PASS cho final actual J1; initial FAIL giữ nguyên |
| SERVICE SELECTION | OFFLINE PASS, actual expanded selection/compare chưa chạy;2legacy expectation FAIL giữ nguyên |
| ITINERARY EDITING | PASS actual draft ngày2; saved edit NOT RUN. Arbitrary reorder/time replacement chưa mở contract, không giả hỗ trợ |
| WHAT-IF ISOLATION | PASS actual J3 + offline ticket/state tests |
| COST INTEGRITY | PASS3actual independent oracles + related offline tests; không real supplier/Booking quote |
| ACTUAL TRIP SAVE | **FAIL** C1 SQL identity fence, no committed Trip; operator fix chỉ offline |
| ACTUAL TRIP REOPEN | NOT RUN / prerequisite và remaining call budget |
| ACTUAL TRIP UPDATE | NOT RUN |
| TRIP PERSISTENCE | NOT RUN; không lấy Trip doubles/T04/T13 historical PASS thay thế |
| OWNERSHIP & CONFIRMATION SECURITY | PARTIAL: actual foreign409/forged400/no preconfirmTrip; replay/expiry/concurrency/stale checks offline |
| BOOKING HANDOFF | Existing path + offline positive/DEMO denial contract; actual positive Booking/payment NOT RUN |
| DESKTOP/MOBILE CUSTOMER EXPERIENCE | Actual desktop conversation/preview PARTIAL; desktop+mobile replay PASS, actual mobile persistence NOT RUN |
| DATA INTEGRITY | PASS40/40 fresh baseline, protected READ ONLY restored |
| REAL KNOWLEDGE ACTIVATION | PENDING, giữ UNREVIEWED/DRAFT/retention |
| QWEN REAL MODEL | DEFERRED; unexpected readiness compatibility scope deviation đã ghi, không model PASS |
| LIVE READY | **NO** |

**Dừng sau21.27.** Không tiếp tục21.26-B, tự chạy model/Full Browser Qwen E2E hoặc thêm actual mutation sau khi hết khả năng hoàn tất bounded journey.
