# T13-B-PREP — Phạm vi và ma trận CORE còn lại

Ngày rà soát: **06/11/2026**, Asia/Saigon. Trạng thái: **PREP — chờ chủ dự án duyệt ma trận; chưa thực hiện T13-B**.

Chỉ đọc tài liệu/source và tạo báo cáo này. Không khởi động server/browser, kết nối PostgreSQL, chạy test/build, tạo fixture hoặc ghi dữ liệu. Không sửa ứng dụng, migration, seed, reset, truncate, xóa volume, thay AI/sentiment/ranking, push hoặc deploy. Các nhận xét dưới đây là **SOURCE FINDING**, không phải lỗi đã tái hiện trong phiên này. Mọi test case đề xuất đều **NOT RUN**.

## 1. Căn cứ, phiên bản và acceptance

HEAD khi đọc: **`052531dfc77c4f289757794c0ee08b4d46e6af2e`**. Working tree đã có nhiều modified/untracked của các task trước, bao gồm source, scripts, migration 11/12, báo cáo và evidence; HEAD một mình không mô tả source đang rà soát. Bản nháp báo cáo này đã có sẵn khi bắt đầu lượt rà soát; phiên này đối chiếu và cập nhật chính báo cáo, không nhận nội dung có sẵn thành kết quả kiểm thử mới. Đã chụp SHA-256 trong bộ nhớ cho **1.089 file có sẵn**, gồm báo cáo này, từ `git ls-files --cached --others --exclude-standard`, không bao gồm thư mục ignored như `node_modules`/`dist`. Có **1.088 file ngoài báo cáo** được bảo vệ bằng so hash trước/sau. Phụ lục cuối ghi hash các đầu vào trọng yếu. Không dùng ngày commit làm ngày kiểm thử.

| Căn cứ đã đọc | Acceptance được kế thừa / giới hạn |
|---|---|
| [HUGO_6_WEEK_SCOPE](HUGO_6_WEEK_SCOPE.md), mục 2–4 | CUSTOMER/PARTNER/SUPER_ADMIN isolation; catalog công khai đúng trạng thái; giữ Favorite server và Review provenance/consent/moderation; Booking server-owned/transaction/state transitions; Customer xuyên suốt và Partner/Admin smoke hợp lệ. Không xây lại M1 hoặc thêm chức năng. Đây là scope kỹ thuật, rubric trường/ngày nộp còn TODO trong tài liệu. |
| [T13-A](HUGO_T13_A_CORE_E2E_REPORT.md), [T13-A-FIX](HUGO_T13_A_FIX_REPORT.md) | Phần Customer đã kiểm; giới hạn cuối báo cáo nói rõ chưa thay thế nghiệm thu role/admin/business/review/favorite/consent. Giữ nguyên cả FAIL cũ. |
| [Auth contract](HUGO_AUTH_CONTRACT.md), [T07](HUGO_T07_PROFILE_AUTH_REPORT.md) | Role guard đọc token; `/auth/me` đọc DB; cấp role mới cần login lại. Logout local, không có revoke/refresh/profile update API. SUPER_ADMIN không mặc nhiên vào `/partner`. |
| [Multi-role 1–2](MULTI_ROLE_PHASE_1_2.md), [Phase 3](MULTI_ROLE_PHASE_3.md), [Phase 3.5](MULTI_ROLE_PHASE_3_5.md) | Onboarding → approval transaction → Business/membership/PARTNER/audit; CRUD tài nguyên, moderation, ownership và Booking state machine đã tồn tại. Phase 3 nêu rõ Partner Booking cần `MANAGE_BOOKINGS`. Kết quả test/migrate/seed trong các báo cáo là lịch sử, không phải lệnh được phép chạy lại ở đây. |
| [M1 Favorite](HUGO_AI_M1_TASK4_REPORT.md), [M1 Review](HUGO_AI_M1_TASK5_REPORT.md) | Favorite là Place server-side, unique theo user/Place; functional CRUD không phụ thuộc analytics. Review có verified Booking provenance, không giả định tiêu chí thiếu = 5 sao; moderation/consent tách biệt. |
| [Intelligence master plan](HUGO_INTELLIGENCE_MASTER_PLAN.md), [handoff](HUGO_AI_CURRENT_STATUS_AND_CHATGPT_HANDOFF.md), README/API docs | Cung cấp bối cảnh; một số inventory/endpoint dự kiến và mô tả cũ đã khác source. Không lấy đề xuất trong master plan làm tính năng hiện hành hay thêm acceptance mới. |
| [T06](HUGO_T06_BOOKING_REPORT.md), [T04-A](HUGO_T04_A_TRIP_REPORT.md), [T04-B](HUGO_T04_B_TRIP_REPORT.md), [T11-B](HUGO_T11_B_PLANNER_FEASIBILITY_REPORT.md) | Giữ contract Booking, Trip snapshot/lifecycle/cost và feasibility hiện tại; T13-B không mở lại bài toán pricing/planner. |

**Quy tắc lựa chọn scope:** CORE dưới đây là ma trận đề xuất để nghiệm thu phần đã có theo các acceptance trên, cần duyệt trước khi chạy. Không biến một API tồn tại thành lời hứa có UI tương ứng. Các GAP về policy chưa thống nhất phải được ghi riêng; không tự sửa expected theo kết quả chạy để đạt PASS.

### 1.1. Truy vết acceptance tới ma trận

| Acceptance đã có / căn cứ cụ thể | Case sử dụng | Phần chưa được coi là acceptance mới |
|---|---|---|
| T02 mục 2 Auth/RBAC; Auth contract mục Access token và Frontend; Phase 3 mục 7 Authorization | R01–R06; B06; các deny probe A06/V07 | Không thêm cấp/sửa/revoke role qua UI, refresh token hoặc SUPER_ADMIN mặc nhiên có PARTNER. |
| T02 mục 2 Partner/Admin smoke; Phase 1–2 onboarding; Phase 3 mục 7 ownership/audit | A01–A06; B01–B05 | Chỉ smoke các module có đường thực thi; placeholder không có acceptance CRUD ngầm. NEEDS_MORE_INFO và permission chưa đồng nhất giữ GAP. |
| T02 mục 2 Booking demo; Phase 3 mục 7 MANAGE_BOOKINGS; T06 contract transaction/state | B07–B08; R03/B06 | Bổ sung actor Partner/SA và vòng đời, không chạy lại pricing/idempotency T13-A như coverage mới. |
| T02 mục 2 Favorite/Review; M1 Task 5 mục 6–7 functional Review/provenance/consent và bảng kiểm lịch sử | V01–V08 | Giữ VERIFIED/UNVERIFIED, criteria nullable, moderation và owner; API update/moderation không được tính là UI editor. |
| T02 mục 2 Favorite/Review; M1 Task 4 mục phân tách functional Favorite và telemetry | F01–F07 | Favorite vẫn dùng khi opt-out; chỉ Place, không mở rộng favorite cho Tour/Ticket/Blog riêng. |
| T02 mục 2 Catalog/Explore consent/opt-out; M1 Task 4/5 consent; telemetry/exposure contract trong source và test hiện có | C01–C08; F07; V02 | Chỉ kiểm consent/retention metadata/attribution hiện có, không kiểm model, ranking, export hay quyền nghiên cứu/Kaggle. |
| T02 Profile/UI error/loading/empty trung thực; yêu cầu task này về reload/lặp/bảo toàn dữ liệu | R06; A02; B02–B08; V05/V08; F02–F05; C04/C07/C08 | Tình huống lỗi/race là cách kiểm acceptance hiện có. Với policy chưa có căn cứ, giữ characterization hoặc NOT RUN/GAP trước khi chạy. |

Test cũ của Phase/M1 có thể cung cấp oracle, nhưng không thay bằng chứng runtime mới. OPTIONAL O01–O08 cần được chọn riêng; sự tồn tại của chúng không bổ sung yêu cầu sản phẩm vào CORE.

## 2. Inventory chức năng và mức hoàn thiện

“Có” nghĩa là đã thấy đường thực thi source; tính đúng runtime và schema thực tế của T13-B vẫn NOT RUN.

| Nhóm / chức năng | UI hiện có | Backend / dữ liệu | Trạng thái và phân loại đề xuất |
|---|---|---|---|
| Đăng ký/login/me, route/menu theo role | Login/Register, Profile, ProtectedRoute, layout Customer/Admin/Partner | AuthService/token/middleware; `users`, `user_roles` | Có; CORE chỉ bổ sung RBAC/role escalation. Không lặp toàn bộ Auth T13-A. |
| Cấp PARTNER qua hồ sơ | `/become-partner`, trạng thái/phản hồi; Admin duyệt hồ sơ | ApplicationService transaction tạo Business/member/role/audit | Có; CORE. Token cũ chưa có role mới. |
| Hồ sơ NEEDS_MORE_INFO | UI xem lý do; Admin có thể quyết định lại | Submit mới bị chặn khi PENDING/NEEDS_MORE_INFO; không có API sửa/bổ sung hồ sơ | **Chưa hoàn thiện vòng bổ sung**; GAP-02, không giả lập nút bổ sung. |
| Admin dashboard / hàng chờ hồ sơ | `/admin`, `/admin/partner-applications` | Tổng hợp DB, list/decision | Có; CORE smoke và atomic approval. |
| Admin moderation Place/Tour/Blog | List/detail/filter, approve/reject/suspend | Status + AuditLog trong transaction | Có; CORE. API có DRAFT, UI chỉ có nút approve/reject/suspend. |
| Admin Businesses / Bookings toàn hệ thống | `/admin/businesses`, `/admin/bookings` là placeholder | Có GET list DB; status Booking bằng API riêng | **API có, UI chưa nối**. CORE API read/authorization; UI CRUD NOT RUN theo GAP-01. |
| Admin Users/role assignment/reports/settings/audit viewer | `AdminSectionPage` là placeholder | Không thấy endpoint quản trị users/role assignment, đổi Business status hoặc audit-list chuyên dụng trong admin router | Chưa triển khai; OUT_OF_SCOPE xây mới. Có thể đọc audit bằng DB làm oracle. |
| Partner dashboard / chọn Business | `/partner`, business selector và metrics | Membership-scoped, trả `source: DATABASE`; không có business thì metrics null | Có; CORE, không gọi đây là Business CRUD. |
| Partner Place (hotel/restaurant/attraction/Place category tour) | `/partner/places`, new/detail/edit; search/status/page; submit/archive | Membership + permissions, DRAFT/REJECTED edit, soft archive | Có; CORE smoke. Giá/tọa độ fixture ghi rõ synthetic. |
| Partner Tour riêng | `/partner/tours` và form | `tours`, không phải Place category tour; capacity | Có; CORE smoke, không thay inventory/pricing. |
| Partner Ticket | `/partner/tickets` và form | ACTIVE/INACTIVE, availableSeats; không có submit moderation | Có; CORE smoke. UI form dùng copy “nháp” chung nhưng service mặc định ACTIVE — kiểm đúng dữ liệu, ghi sai nhãn nếu có. |
| Partner Blog | `/partner/blogs` và form | Business-owned DRAFT/REJECTED/edit/submit/archive | Có; CORE smoke. Permission update/submit cần GAP-03. |
| Partner Booking operations | `/partner/bookings`, detail modal/direct URL; confirm/reject/complete | Membership + `MANAGE_BOOKINGS`, history/audit/transaction; cancel chỉ có API | Có; CORE phần còn thiếu của T13-A. Không payment/email bên ngoài. |
| Workspace inventory/calendar/reviews/reports/settings/business management | `/partner/workspace/:section` là placeholder; `/partner/businesses` không phải màn CRUD hợp lệ | Có GET Business; không có endpoint lịch/phòng/bàn chuyên sâu trong partner router | Chưa hoàn thiện; OUT_OF_SCOPE xây module. Không gọi placeholder là E2E nghiệp vụ PASS. |
| Review tạo/xóa/xem | Tab Review trong cùng `PlaceDetailPage` tại `/places/:id`, `/hotels/:id`, `/restaurants/:id`; Booking selector, verified badge, own delete | Published list; own list/create/update/delete; unique Booking; aggregate Place | Có; CORE. API update có helper, chưa thấy control edit Review ở UI. |
| Review moderation | Không có màn hình chuyên dụng Admin/Partner Review | SUPER_ADMIN PATCH moderation; owner API xem trạng thái riêng | **API có, UI thiếu**; CORE API + Customer public UI sau moderation. Không bịa admin moderation UI. |
| Favorite | Heart ở các surface Place, `/favorites`; loading/error/pending; logout clear | Server CRUD `user_favorites`; idempotent add/remove; telemetry outcome server | Có; CORE. Separate Tour/Ticket/Blog không được coi là favorite chỉ vì UI có chữ “Tour”. |
| Consent | Banner trên CustomerLayout và nút “Quyền riêng tư AI”: both/analytics-only/decline-delete | GET/PUT consent, event/exposure checks, data deletion theo user | Có; CORE. Không phải consent nghiên cứu/Kaggle. Error UX/account-switch race cần kiểm, GAP-06. |
| Retention/account deletion | Không có UI/API xóa account; text retention 90 ngày | purge job; DB trigger privacy Review khi xóa User | Có ở hạ tầng; OPTIONAL kiểm fixture có giới hạn; global purge OUT_OF_SCOPE trên DB đang có dữ liệu. |
| Profile CRUD, payment/refund thật, role editor mới, reply Review, media upload, notification | Không phải luồng được cam kết trong scope này | Không bổ sung backend/UI | OUT_OF_SCOPE T13-B. Profile CORE read-only đã có T13-A. |

## 3. Bản đồ source, endpoint và bảng

### 3.1. Endpoint thực tế

Tất cả đường dưới có prefix **`/api`**. `SA` = SUPER_ADMIN; `P` = PARTNER trong token; `C/P/SA` = có ít nhất một role được liệt kê. Không coi filter `userId`/`businessId` client là căn cứ cấp quyền.

| Endpoint / phương thức | Quyền và contract đang tồn tại | Source chính |
|---|---|---|
| `POST /auth/register`, `/auth/login`; `GET /auth/me`, `/auth/profile` | Public register/login; GET Bearer. Register luôn tạo CUSTOMER, bỏ role gửi thêm | `routes/authRoutes.ts`, `controllers/authController.ts`, `services/authService.ts`, `tokenService.ts` |
| `POST /partner-applications`, `GET /partner-applications/me` | C hoặc P; owner token. SA-only bị403 dù frontend cho vào become-partner | `routes/partnerApplicationRoutes.ts`, `controllers/partnerApplicationController.ts`, `validators/validators.ts`, `services/partnerApplicationService.ts` |
| `GET /admin/dashboard` | SA, tổng DB và recent audit; số role có thể chồng nhau | `routes/adminRoutes.ts`, `controllers/adminController.ts`, `services/adminService.ts` |
| `GET /admin/partner-applications`, `GET /admin/partners/pending` | SA, list status/page/limit; pending là alias filter | Như trên + `PartnerApplicationService.list` |
| `PATCH /admin/partners/:id/approval` | SA; APPROVED/REJECTED/NEEDS_MORE_INFO; non-approval cần reason; khóa row và transaction | `PartnerApplicationService.decide` |
| `GET /admin/businesses`, `GET /admin/bookings` | SA, list phân trang; chưa có CRUD UI | `AdminService.getBusinesses/getBookings` |
| `GET /admin/{places,tours,blogs}`, `GET /admin/{resource}/:id`, `PATCH /admin/{resource}/:id/status` | SA; APPROVED/REJECTED/SUSPENDED/DRAFT; reject/draft cần reason; audit | `controllers/adminResourceController.ts`, Place/Tour/BlogService.moderate |
| `GET /partner/dashboard`, `GET /partner/businesses`, `GET /partner/businesses/:id` | P + membership; dashboard nhận businessId; foreign Business403 BUSINESS_ACCESS_DENIED | `routes/partnerRoutes.ts`, `controllers/partnerController.ts`, `services/partnerService.ts` |
| `GET /partner/businesses/:businessId/bookings` | P + membership; **alias cũ chưa kiểm MANAGE_BOOKINGS như endpoint mới** | `PartnerController.bookings` → `PartnerService.getBookings`; GAP-03 |
| `GET, POST /partner/{places,tours,blogs,tickets}`; `GET, PATCH, DELETE /partner/{resource}/:id` | P; list scope membership; create/archive MANAGE_BUSINESS; update Place/Tour/Ticket MANAGE_BUSINESS, Blog update membership; DELETE soft archive | `controllers/partnerResourceController.ts`, `services/{place,tour,ticket,blog}Service.ts`, `businessAccessService.ts` |
| `POST /partner/{places,tours,blogs}/:id/submit` | P + membership, từ DRAFT/REJECTED → PENDING; không có submit Ticket; không kiểm MANAGE_BUSINESS trong service submit hiện tại | Các resource service; GAP-03 |
| `GET /partner/bookings?businessId=...`, `GET /partner/bookings/:id`, `PATCH /partner/bookings/:id/status` | P + MANAGE_BOOKINGS. List thiếu businessId400 BUSINESS_ID_REQUIRED; PATCH còn đối chiếu body businessId với Booking | `PartnerResourceController`, `BookingService.listForPartner/getForPartner/changeStatus` |
| `GET /bookings`, `PATCH /bookings/:id/status` | SA, legacy global list và state transition/audit/history; T13-A chỉ kiểm CUSTOMER status bị403 | `routes/bookingRoutes.ts`, `controllers/bookingController.ts`, `services/bookingService.ts` |
| `GET /places`, `/places/:id`; tương tự tours/blogs; `GET /tickets`, `/tickets/:id` | Public chỉ APPROVED; Ticket ACTIVE và còn chỗ. Public controller không forward status tùy ý; phải kiểm qua endpoint thật, không suy trực tiếp từ repository | `routes/{place,tour,blog,ticket}Routes.ts`, controllers, repositories tương ứng |
| `POST /places`, `DELETE /places/:id`; `POST /tours`, `PUT, DELETE /tours/:id` | SA legacy resource mutations; đưa vào deny-role probes, không mở thêm admin create UI | `routes/placeRoutes.ts`, `routes/tourRoutes.ts` |
| `GET /places/:id/reviews` | Public, chỉ PUBLISHED, serialize không lộ userId/Booking ID/moderation reason | `ReviewService.listPublished/serialize` |
| `POST /places/:id/reviews` | C/P/SA, Place APPROVED; owner lấy token; optional Booking verified | `PlaceController.addReview` → `ReviewService.create` |
| `GET /reviews/me`; `PATCH, DELETE /reviews/:id` | C/P/SA; owner-only mutation404 REVIEW_NOT_FOUND; update rating/comment đầy đủ, không thay provenance | `routes/reviewRoutes.ts`, `controllers/reviewController.ts`, `services/reviewService.ts` |
| `PATCH /reviews/:id/moderation` | SA; PUBLISHED/HIDDEN/REJECTED, non-public reason3–500; audit và aggregate cùng transaction | `ReviewService.moderate` |
| `GET /favorites`, `POST, DELETE /favorites/:placeId` | Authenticate; token user là owner. Body attribution whitelist; không có endpoint favorite theo userId/record ID | `routes/favoriteRoutes.ts`, `controllers/favoriteController.ts`, `services/favoriteService.ts` |
| `GET, PUT /intelligence/consent` | Authenticate; current user; boolean/combination validation, transaction delete data khi opt-out + deleteExistingEvents | `routes/intelligenceRoutes.ts`, `controllers/intelligenceController.ts`, `services/telemetryService.ts` |
| `POST /intelligence/events` | Authenticate; client whitelist, server identity/environment, opt-out, dedupe; response202 | `TelemetryService.collectClientEvent/validateClientTelemetry` |
| `POST /intelligence/recommendations`, `POST /intelligence/recommendations/visible` | Authenticate; real recommendation request201, visible ack202; owner/session/surface/environment/candidate checks | `services/recommendationExposureService.ts`, `recommendationRepository.ts`; không thay ranking |

Source backend trong bảng được tính tương đối từ `backend/src/`. Không có endpoint quản trị role/account delete mới được giả định. Endpoint Trip/Booking Customer dùng làm cầu nối đã có trong T13-A, không chép thành toàn bộ test mới.

### 3.2. Frontend thực thi

| Nguồn từ `frontend/src/` | Vai trò trong T13-B |
|---|---|
| `router/AppRouter.tsx`, `router/ProtectedRoute.tsx`, `context/AuthContext.tsx`, `services/api.ts`, `layouts/{Admin,Partner,Customer}Layout.tsx` | Route role, session, menu mobile, 401/403; consent chỉ được mount trong CustomerLayout |
| `pages/BecomePartnerPage.tsx`, `pages/admin/PartnerApplicationsPage.tsx`, `services/platformService.ts` | Hồ sơ và approval UI; prompt/confirm thật, dữ liệu/phản hồi reload |
| `pages/admin/{AdminDashboardPage,AdminModerationPage,AdminSectionPage}.tsx` | Dashboard/moderation thật so với placeholder |
| `pages/partner/{PartnerDashboardPage,PartnerResourceListPage,PartnerResourceFormPage,PartnerBookingsPage,PartnerSectionPage}.tsx`, `services/managementService.ts` | CRUD/submit/archive, danh sách/page/filter, booking status, placeholder |
| `pages/PlaceDetailPage.tsx`, `services/placeService.ts`, `components/common/RatingBadge.tsx` | Review create/delete/public list/Booking selector; helper update API có, control edit không có |
| `context/FavoritesContext.tsx`, `services/favoriteService.ts`, `pages/FavoritesPage.tsx`, heart callers ở Explore/Home/Hotels/Restaurants/Place | Server state, pending/loading, xóa legacy localStorage, account isolation |
| `components/common/TelemetryConsent.tsx`, `context/TelemetryContext.tsx`, `services/telemetryService.ts`, hooks telemetry/exposure | Quyết định consent và request/event thật; chặn client track khi opt-out |

### 3.3. Dữ liệu và side effects cần đối chiếu

| Bảng thật (models/migrations tương ứng) | Dữ liệu / ràng buộc cần kiểm |
|---|---|
| `users`, `user_roles` (User/UserRole) | Legacy role + grant role; unique user/role; granted_by FK. Không đếm số role như số người riêng biệt. |
| `partner_applications`, `businesses`, `business_members` | Application status/decision/reviewed_by; **unique partial `idx_partner_applications_one_active(user_id)` khi PENDING/NEEDS_MORE_INFO** (migration 02 dòng 51–53); Business ACTIVE sau approve; membership unique và permission JSON. Business identity không đồng nhất với Place. |
| `places`, `tours`, `tour_places`, `tickets`, `blog_posts` | Owner Business, status, prices/capacity, liên kết FK. Review aggregate cập nhật rating/review_count/bayesian_rating của **Place fixture**. |
| `bookings`, `booking_status_history` | Snapshot server, inventory, payment_status vẫn unpaid; actor/status history và idempotency không bị phá khi partner xử lý. |
| `reviews` | target_type=`place` trong service hiện hành; target_id Place, owner; booking_id unique partial và FK Booking **ON DELETE RESTRICT**; verification/source/environment/criteria/consent/moderation. Model enum có tour không có nghĩa đã có verified review API cho Tour riêng. |
| `user_favorites` | unique(user_id,place_id); user/Place FK CASCADE; không dùng catalog thực làm fixture để tránh side effects. |
| `user_telemetry_consents`, `user_events` | PK user consent; event origin/source/user/environment/expiry/dedupe, không có token/email/GPS thô trong payload được chấp nhận. |
| `recommendation_requests`, `recommendation_candidates`, `recommendation_visible_impressions` | Request/candidate không đồng nghĩa visible impression; request children CASCADE; Booking recommendation_request_id SET NULL khi xóa request. |
| `audit_logs` | Decision/moderation/Booking transitions/Review delete; actor fixture, entity IDs, previous/new state. Không có audit viewer API nên DB là oracle. |
| `trip_sessions`, `recommendation_impressions`, `ai_model_registry`, `schema_migrations`, `spatial_ref_sys` | Bảo toàn fingerprint toàn DB; Trip không thuộc test mới; legacy impressions có thể liên quan cleanup. Không sửa model registry/schema. |

Đọc migrations 01–12 và models là kiểm **contract source**. Chưa xác minh các migration/checksum/trigger/FK này trên DB trong PREP. Khi chạy thật phải preflight, không apply để bù thiếu schema.

## 4. Quy tắc đã có và điểm không được tự suy diễn

| Chủ thể / hành vi | Expected đã có căn cứ |
|---|---|
| Anonymous vào API protected | 401; UI protected về login sau bootstrap; token hợp lệ sai role403 FORBIDDEN, không tự logout vì403. |
| CUSTOMER vào Admin/Partner; PARTNER vào Admin | UI `/403`, backend403 dù đổi URL/ID/header/body. Không chỉ kiểm ẩn menu. |
| SA-only vào Partner | `/partner` và partner API403; chỉ token có PARTNER mới qua route, vẫn cần membership/permission. Không sử dụng nhánh bypass của helper khác để suy toàn hệ thống. |
| Partner A đụng resource/Booking Business B | Foreign resource có tồn tại thường403 BUSINESS_ACCESS_DENIED; Booking body businessId sai403 BOOKING_ACCESS_DENIED; không áp Customer404 của T13-A cho Partner. |
| Permission | Create/archive tài nguyên MANAGE_BUSINESS; update Place/Tour/Ticket MANAGE_BUSINESS; Booking API mới MANAGE_BOOKINGS. GET resource và submit chỉ membership; Blog update chỉ membership. Alias Booking cũ khác contract documented MANAGE_BOOKINGS: GAP-03. |
| Application | Một hồ sơ PENDING/NEEDS_MORE_INFO chặn submit tiếp409 ACTIVE_APPLICATION_EXISTS. Terminal approve/reject quyết định lại409 APPLICATION_ALREADY_DECIDED. **DB contract đã có unique partial, nên cùng user không được có hai hồ sơ active kể cả race**. Service submit kiểm rồi create, chưa catch UniqueConstraintError: không hứa request thua race trả cùng409 như sequential; xem O02. Không có idempotency key submit hồ sơ. |
| Resource status | Place/Tour/Blog: DRAFT/REJECTED mới sửa/gửi duyệt; PENDING/APPROVED sửa409; archive → SUSPENDED, không hard delete. Ticket khác: ACTIVE/INACTIVE, có thể update không qua moderation. |
| Repeated operations | Favorite add duplicate200 changed=false ALREADY_FAVORITE; remove absent200 changed=false NOT_FAVORITE. Review duplicate Booking409; repeat delete404. Booking repeat same status409 INVALID_BOOKING_TRANSITION. Resource archive/moderation có thể200 lại; moderation có thêm audit. Không áp idempotence Booking sang mọi API. |
| Review | Rating integer1–5; comment trim10–2000; criteria optional từng tiêu chí integer1–5, không mặc định5. VERIFIED chỉ owned COMPLETED Booking đúng Place hotel/restaurant; không Booking → UNVERIFIED và vẫn PUBLISHED. Moderation không sửa provenance. |
| Consent functional vs telemetry | Opt-out vẫn Favorite/Review/Booking được. Event/impression **mới** không được ghi khi opt-out. Recommendation request/candidate vẫn được lưu với consent flags false; preferences/budget không persist chi tiết khi personalization=false. Không assert “opt-out = mọi bảng intelligence luôn0”. |
| Consent delete | Khi analytics=false và deleteExistingEvents=true, xóa UserEvent + RecommendationRequest của owner (children cascade), Review ai_usage_allowed=false/consent_policy_version=null. Favorite/Review/Booking/Trip functional không bị xóa. Reload có thể tạo request mới: đối chiếu ID cũ và thời điểm transaction, không assert count0 vĩnh viễn. |
| Consent không delete | analytics=false mà không yêu cầu delete không hứa xóa lịch sử. analytics-only: event mới personalizationAllowed=false; không tự suy grant AI cho Review lịch sử. |
| Dashboard tiền | Admin hiện sum totalAmount của Booking khác CANCELLED (kể cả PENDING/REJECTED); Partner sum COMPLETED. Kiểm DB theo công thức thực và ghi GAP-05 về nghĩa nghiệp vụ; không tự đặt expected “đã thu tiền”. |

## 5. Tránh kiểm trùng T13-A

Baseline lịch sử cuối: [run `20261106043724-bddc1d`](evidence/t13a-fix/20261106043724-bddc1d/playwright.json) **14/14 PASS = 7 test × 2 viewport**; focused D/F cuối [run `20261106043555-7092e9`](evidence/t13a-fix/20261106043555-7092e9/playwright.json) **4/4 PASS**. Không cộng focused vào full. Các FAIL T13-A trước sửa vẫn giữ nguyên.

| Đã kiểm T13-A/FIX | Cách dùng trong T13-B |
|---|---|
| A_AUTH register/login/sai password/Profile/reload/logout/A→B/invalid+expired token | Chỉ dùng login làm setup; bổ sung role route/claim và state Favorite/Review/Consent giữa account, không tuyên bố Auth full mới PASS. |
| B_PLANNER + C_EMPTY: mandatory attraction/hotel, days/nights/groupcost, budget invariant/overrun,422/recovery | Không lặp toàn planner. Chỉ đọc catalog visibility sau moderation; không thay ranking hay 422. |
| D_SAVED_EDITOR: PUT đúng ID, remove/reorder/cancel/error422, reload, active reconciliation, preferences, legacy | Không mở lại editor/cost/lifecycle. Consent delete nếu có Trip fixture chỉ kiểm row không đổi. |
| E_LIFECYCLE: start/GPS deny/manual checkin/retry/partial complete | Không thêm vào mẫu số T13-B. |
| F_BOOKING: UI commit-lost-response/retry/snapshot unit123457 total246914/one row, inactive Tour Business409 | T13-B thêm **Partner/SA lifecycle**, permission và Review eligibility. Không lặp witness giá/response loss đã PASS nếu source liên quan không đổi. |
| G_OWNERSHIP: Customer A/B Trip endpoints + Booking getID/code/cancel404, Customer admin status403, list owner | T13-B thêm admin/partner resource/Business/permission, Favorite/Review/Consent; không gọi endpoint customer cũ là coverage mới. |
| Consent decline phục vụ setup; startup GET Favorite | Không đủ nghiệm thu Favorite hoặc Consent; các case dưới là test mới, chưa chạy. |

Chỉ đề nghị rerun regression T13-A bị ảnh hưởng nếu triển khai harness/config hoặc sửa ứng dụng ở task khác sau này; mỗi lượt có evidence/mẫu số riêng. Không mặc định cần chạy toàn T13-A lần nữa để thay coverage còn thiếu.

## 6. Ma trận đề xuất — 43 CORE, 8 OPTIONAL, tất cả NOT RUN

`U2`: cùng chuỗi nghiệp vụ qua browser thật ở **desktop 1440×900** và **mobile giả lập 390×844**, dự kiến Edge/Chromium giống baseline, ghi version thực lúc chạy; mobile có touch/isMobile, **không phải thiết bị thật**. `A1`: request từ browser session hoặc HTTP client dùng token fixture, API/PostgreSQL thật, chạy một lần vì permission không phụ thuộc viewport. `U2+A1`: UI hai viewport, attack/validation probes không cần nhân đôi; ghi rõ từng probe. Không mock/replay response nghiệp vụ.

Mỗi dòng là một case logic có các checkpoint; data-driven `resource/status/role` phải ghi expansion rõ trong manifest trước chạy. Không gọi số checkpoint là số case. Tất cả dòng CORE dự kiến bắt buộc sau duyệt; GAP chặn một nhánh phải giữ NOT RUN/blocked kèm lý do, không lặng bỏ khỏi mẫu số. Không coi UI không tồn tại là PASS bằng API.

| Nhóm | CORE case logic | OPTIONAL liên quan | Trạng thái PREP |
|---|---:|---|---|
| Role | 6 | O03 | NOT RUN |
| Admin / onboarding | 6 | O01–O02 | NOT RUN |
| Business / Partner | 8 | O01/O03 | NOT RUN |
| Review | 8 | O04/O07 | NOT RUN |
| Favorite | 7 | O04/O07 | NOT RUN |
| Consent | 8 | O05/O07 | NOT RUN |
| Tổng CORE | **43** | **8 OPTIONAL IDs riêng**, có thể dùng chung nhóm; O06 browser, O08 Blog | **0 PASS / 0 FAIL / 43 NOT RUN** |

Evidence chung `E`: screenshot viewport + full page của trạng thái quan trọng (U2), request/response thực đã che token/secret, DB snapshot theo ID fixture trước/sau, assertions và exit code. Các dòng ghi thêm bằng chứng riêng cần có. Response error không có stable code trong source chỉ assert status/message/schema; không tự đặt mã mới.

### 6.1. Role / phân quyền — 6 CORE

| ID / mức / kênh | Thao tác và fixture | Expected / bằng chứng riêng |
|---|---|---|
| R01 CORE U2 | C, P_A, SA-only login; mở dashboard đúng role, public Customer area, reload và menu mobile | C dùng Customer; P vào Partner; SA vào Admin; role/identity khớp `/auth/me` và DB grants. Sidebar mở/đóng, route giữ sau reload; không gộp SA-only thành PARTNER. E + grants/menu. |
| R02 CORE U2+A1 | Anonymous/C vào admin và partner; P vào admin; SA-only vào partner; sửa localStorage user.roles rồi gọi API thật | Anonymous API401, UI login; token sai role403 FORBIDDEN/UI403; cache sửa không cấp quyền API và reload `/auth/me` khôi phục. Target rows không đổi; không logout token hợp lệ chỉ vì403. Mở rộng deny probes admin moderation/approval, legacy Place/Tour mutations, review moderation. Anonymous probe thêm GET `/reviews/me`, POST `/places/:id/reviews`, PATCH/DELETE `/reviews/:id`, Favorite GET/POST/DELETE và consent GET/PUT; tất cả401, dùng payload hợp lệ để không nhầm lỗi DTO với lỗi quyền. |
| R03 CORE A1 | P_A/P_B đổi Business/resource IDs ở GET/PATCH/DELETE/submit, POST với foreign businessId, dashboard/list query; đủ Place/Tour/Ticket/Blog và Booking list/get/status | Membership scope không leak; foreign valid ID403 theo service, status body mismatch403 BOOKING_ACCESS_DENIED; không chuyển owner qua PATCH businessId, trường bị whitelist bỏ. DB owner/status/payload/timestamp target không đổi sau request bị từ chối; list không trả tài nguyên Business kia. Endpoint cụ thể ghi đủ trong results. |
| R04 CORE A1 | Đăng ký fixture C với role/roles/businessId/userId giả mạo; submit application thêm status/reviewedBy/userId | Register201 nhưng chỉ CUSTOMER và legacy user; application201 PENDING của token, không duyệt tự động/không grant SA/PARTNER. DB grant/membership/audit không xuất hiện ngoài flow approval. Valid payload dùng whitelist hiện có, không đòi unknown-field luôn400. |
| R05 CORE U2+A1 | C mới được A03 approve; giữ token trước grant, reload `/auth/me`, rồi logout/login lại | DB và `/me` có PARTNER sau approve; token cũ partner API403, login mới cấp token có PARTNER rồi truy cập own Business200. UI có thể đọc role mới từ `/me` trước token đổi: ghi limitation, không coi cần refresh-token là acceptance. |
| R06 CORE U2+A1 | P_A (hoặc SA) → logout → C_B cùng tab, direct URL trang trước; trì hoãn response thật của phiên cũ rồi chuyển account | Không render dữ liệu private account trước trong phiên mới; API vẫn đúng principal; request cũ không cấp role mới. Favorite/Review/Consent state kiểm chi tiết F05/C07; ghi UI/network/DB riêng, không suy từ AuthContext đã PASS. |

### 6.2. Admin / onboarding / moderation — 6 CORE

| ID / mức / kênh | Thao tác và fixture | Expected / bằng chứng riêng |
|---|---|---|
| A01 CORE U2+A1 | SA mở dashboard trước/sau fixture application/resource/Booking; reload, điều hướng hàng chờ | `source=DATABASE`, counts/status khớp SQL tại cùng checkpoint (role counts có overlap). So delta fixture hoặc toàn số liệu cùng snapshot, không giả DB trống. Tiền theo công thức thực mục4, nhãn chưa chốt ghi GAP-05. E + aggregate SQL đã che dữ liệu nền. |
| A02 CORE U2+A1 | C submit hồ sơ hợp lệ; thiếu trường/email/type/tọa độ ngoài range; reload trạng thái; POST lại khi pending | UI validation/lỗi đúng, không success giả; valid201 PENDING, own GET200; invalid400 errors; sequential duplicate409 ACTIVE_APPLICATION_EXISTS, một pending row. C_B GET /me không thấy hồ sơ C_A. Giữ dữ liệu form khi submit lỗi; cancel confirm/prompt Admin không mutation. |
| A03 CORE U2+A1 | SA duyệt application C→APPROVED, reload; gửi approve lặp và hai PATCH đồng thời trên application riêng |200 và **một** Business ACTIVE, membership MANAGE_BUSINESS/MANAGE_BOOKINGS, PARTNER grant, decision actor/time và audit đúng. Sau terminal PATCH409 APPLICATION_ALREADY_DECIDED; race đúng một quyết định thành công, không tạo Business trùng. E + các ID liên kết/transaction outcomes; không đòi fault-injection rollback mới nếu chưa có harness. |
| A04 CORE U2+A1 | Hai application riêng: reject và needs-info, thiếu reason/decision sai; reload Customer; Admin quyết định tiếp needs-info | Non-approval thiếu reason400 REASON_REQUIRED, status lạ400 INVALID_DECISION; reject có lý do200 không tạo Business/grant; needs-info200 hiện phản hồi, vẫn không tạo Business. Needs-info→APPROVED được, terminal reject quyết định lại409. Không kiểm “Customer bổ sung hồ sơ” bằng control không tồn tại (GAP-02). |
| A05 CORE U2+A1 | Tài nguyên fixture Place/Tour/Blog DRAFT→submit→PENDING→reject→edit/resubmit→approve→suspend; list/detail public trước/sau, thử `?status=DRAFT` | Moderator200, reject cần reason400 khi thiếu; statusinvalid400; audit actor/entity/previous/new đúng. Public list không lộ DRAFT/PENDING/REJECTED/SUSPENDED kể cả status query, detail404; APPROVED list/detail200, reload giữ trạng thái. Partner edit APPROVED/PENDING409; suspend giữ row/FK/Booking/Review. API DRAFT recovery kiểm riêng trong A1, không tạo nút UI giả. |
| A06 CORE A1 | SA GET businesses/bookings phân trang và pending applications alias; C/P gọi cùng endpoints | SA200, fixture IDs/total/page/limit khớp DB, pending alias chỉ pending; C/P403, anonymous401. Không báo `/admin/businesses`/bookings placeholder đã có E2E list UI; phần browser nghiệp vụ này NOT RUN/GAP-01. |

### 6.3. Business / Partner — 8 CORE

| ID / mức / kênh | Thao tác và fixture | Expected / bằng chứng riêng |
|---|---|---|
| B01 CORE U2+A1 | P_A có hai Business fixture; P_EMPTY không membership; chọn Business/reload | Dashboard/list chỉ Business membership; metrics và Booking liên quan đúng Business, nguồn DATABASE. P_EMPTY businesses=[], selectedBusiness=null, metrics=null, UI empty trung thực; foreign dashboard403. Không giả định selector preference được persist nếu source không lưu. |
| B02 CORE U2 | Tạo Place hotel/restaurant/attraction fixture qua form; edit DRAFT, reload; list/search/status/submit/archive; mở lại và save Place có priceFrom=0 | POST201 own Business DRAFT, PATCH200 cùng ID; giá/tọa độ/nội dung đúng input và DB. Submit PENDING; archive SUSPENDED, row còn; form/save/list sau reload khớp server. Giá0 giữ0, form không diễn giải0 thành dữ liệu chưa có; không gọi priceFrom là quote xác nhận Booking. Deep pagination theo O01. |
| B03 CORE U2 | Tour fixture create/edit/save/reload/submit/archive qua Partner; approval dùng A05; variant durationDays=1/durationNights=0 mở lại rồi save | DRAFT201; cùng Tour ID khi sửa; durationDays/Nights/price/capacity giữ đúng; nights0 hợp lệ vẫn hiện0 và lưu được, không bị required chặn do rỗng sau reload. Submit200→PENDING; archive200→SUSPENDED. Không biến Tour thành Place; Booking snapshot cũ không reprice khi catalog đổi. Không thêm công thức hoặc weight mới. |
| B04 CORE U2+A1 | Ticket fixture create ACTIVE, edit/reload, archive; mở form rồi save không sửa thời gian; thử gọi submit Ticket chỉ như route diagnostic | Server ACTIVE201, price/capacity/seats đúng, edit200; DELETE200→INACTIVE và row giữ, public biến mất404. Save không sửa không được làm trôi instant của departureTime/arrivalTime đã lưu; chụp API ISO, giá trị input và DB trước/sau, ghi browser/server timezone. Policy giờ nhập mới cần GAP-09; không tự đổi UTC/local expected. Không đòi PENDING/APPROVED hay endpoint submit cho Ticket; UI nhãn “nháp” nếu trái server phải ghi finding. Không tạo payment. |
| B05 CORE U2 | Business Blog create/edit draft/save/reload/submit/archive; Admin/public cùng A05 | POST201 DRAFT, author/business server đúng; PATCH cùng ID200; submit PENDING, archive SUSPENDED; không mất nội dung sau reload. Không mở Customer Blog like/trip conversion thành scope mới. |
| B06 CORE A1 | Member chỉ MANAGE_BUSINESS, chỉ MANAGE_BOOKINGS, permissions=[]; valid/invalid DTO resource, edit locked status; alias Bookings so endpoint mới | Create/archive và update Place/Tour/Ticket thiếu MANAGE_BUSINESS403; Booking list/get/status thiếu MANAGE_BOOKINGS403 theo contract Phase3, **bao gồm alias cũ** (nghi ngờ source không đạt). Giá/capacity âm, tọa độ ngoài range, ngày Ticket sai400 VALIDATION_ERROR; không mutation. Submit/Blog update đang membership-only: characterization theo source, chưa kết luận phải403 trước quyết định GAP-03. Không nới expected Booking để hợp thức alias. |
| B07 CORE U2+A1 | Customer fixture tạo Booking hotel/restaurant; P_A mở đúng Business/Booking, confirm→complete; Customer reload history; SA xử lý một Booking riêng qua status API; mở trực tiếp/reload Booking của Business thứ hai mà P_A cũng có quyền |200 đúng PENDING→CONFIRMED→COMPLETED; server snapshot unit/total không đổi, history/audit từng transition đúng actor/old/new. Payment vẫn unpaid, không có external call. Repeat transition hoặc terminal→confirmed409 INVALID_BOOKING_TRANSITION, không thêm history/event/trừ kho; dùng làm Booking đủ điều kiện V01. Direct URL phải chọn/cho chọn đúng Business trước mutation, không success giả hay đổi Booking khác; API vẫn từ chối mismatched businessId403. Nhánh UI này có source risk GAP-09, chưa tái hiện. Cần duyệt fixture completed tại GAP-07. |
| B08 CORE U2+A1 | Booking Tour/Ticket fixture riêng: Partner UI reject PENDING, API cancel CONFIRMED; retry, Customer reload | Reject/cancel200 đúng state; inventory hoàn **một lần**, repeat409 không hoàn lại/không tạo history/event thêm. Booking của foreign Business403, target không đổi. Không mở refund/payment, không dùng các Booking nền. |

### 6.4. Review — 8 CORE

| ID / mức / kênh | Thao tác và fixture | Expected / bằng chứng riêng |
|---|---|---|
| V01 CORE U2+A1 | A có completed hotel/restaurant Booking B07; tab Review chọn Booking, submit, reload; B/public xem | POST201 VERIFIED, source CUSTOMER_SUBMISSION/environment=test, bookingId/owner/verifiedAt server; UI badge xác thực, persisted sau reload. Public serializer không lộ bookingId/userId/moderationReason; DB linkage chính xác. Aggregate Place từ published fixtures; không lấy giá/tiêu chí UI để giả provenance. |
| V02 CORE U2+A1 | User opt-out không Booking review Place fixture, thiếu criteria; reload; thêm case chỉ một criterion qua API |201 UNVERIFIED PUBLISHED, vẫn hoạt động khi opt-out, aiUsageAllowed=false; criteria thiếu null/flagfalse, chỉ criterion gửi có số/flagtrue; không tự cho5. UI nói chưa xác thực, không fake badge; server author từ user. |
| V03 CORE A1 | Rating0/6/1.5, comment ngắn/quá dài, criteria sai/unknown; spoof userId,verificationStatus,aiUsageAllowed,source; invalid Booking UUID |400: rating hoặc giá trị criterion ngoài1–5 → INVALID_REVIEW_RATING; comment → INVALID_REVIEW_COMMENT; criterion key lạ → INVALID_REVIEW_CRITERIA; criteria không phải object → INVALID_REVIEW; spoof → SPOOFED_REVIEW_FIELD; UUID Booking → INVALID_REVIEW_BOOKING. Row/aggregate không đổi; không đặt rule moderation PENDING mới vì create hiện auto-PUBLISHED. |
| V04 CORE A1 | Booking foreign/missing valid UUID, PENDING/CONFIRMED, completed sai Place hoặc Tour; B PATCH/DELETE review A với payload update hợp lệ | Foreign/missing404 REVIEW_BOOKING_NOT_FOUND; chưa complete409 REVIEW_BOOKING_NOT_COMPLETED; sai target/type409 REVIEW_BOOKING_TARGET_MISMATCH. Owner mutation foreign404 REVIEW_NOT_FOUND; review/Booking/aggregate giữ nguyên. |
| V05 CORE A1 | Hai POST cùng completed Booking fixture, sequential retry và parallel race | Chỉ một201/one Review; các lần còn lại409 REVIEW_ALREADY_EXISTS, count/aggregate tăng một lần. Không áp idempotency response201 Booking sang Review; UI disabled pending cũng được quan sát trong V01. |
| V06 CORE A1 | Owner PATCH rating/comment đầy đủ + criteria, rồi reload public UI; thử đổi bookingId/provenance |200 cùng Review ID, provenance/moderation không đổi, aggregate đúng; sửa bookingId400 SPOOFED_REVIEW_FIELD. Hidden review edit vẫn hidden, không tự publish. UI editor Review **NOT RUN vì không có**, chỉ API update + UI quan sát. |
| V07 CORE A1 + U2 quan sát | SA PATCH HIDDEN/REJECTED/PUBLISHED fixture Review; Customer/public reload; C/P thử moderation và invalidreason/status | SA200 audit/actor/time/reason đúng; hidden/rejected vắng public và không tính aggregate, own GET vẫn có; republish hiện lại, rating/count khớp. C/P403; invalid moderation400 INVALID_REVIEW_MODERATION. Không có Admin Review UI; chỉ API quyết định, Customer UI quan sát ở hai viewport. |
| V08 CORE U2+A1 | Owner cancel rồi confirm delete Review; reload; retry DELETE | Hủy dialog không DELETE/DB change; confirm200 deleted=true, row xóa/audit REVIEW_DELETED, aggregate cập nhật; repeat404 REVIEW_NOT_FOUND. Booking giữ nguyên; favorite không mất. Khả năng review lại Booking sau hard-delete là hiện trạng, không đặt quota mới. |

### 6.5. Favorite — 7 CORE

| ID / mức / kênh | Thao tác và fixture | Expected / bằng chứng riêng |
|---|---|---|
| F01 CORE U2 | Fixture Place APPROVED trong Explore/detail/hotel/restaurant; nhấn heart, mở `/favorites` | POST201 changed=true, row unique đúng token user/Place; UI heart/list khớp API/DB, nguồn server; các link đi Place ID đúng. Không dùng Tour riêng/Ticket/Blog ID làm happy path. |
| F02 CORE U2 | Reload, logout/login cùng account, mở trực tiếp `/favorites`; legacy `travelgo_favorites` chứa mục giả | GET server khôi phục đúng rows, không nhập danh sách giả từ localStorage; loading/empty/error theo trạng thái thật. Không coi dữ liệu client là Favorite đã lưu. |
| F03 CORE U2 | Remove từ list/detail, cancel nếu surface có confirm (không ép UI phải có), reload | DELETE200 changed=true, row mất/heart và list đồng bộ; empty state khi xóa mục cuối; place/catalog giữ nguyên. Không báo xóa khi API chưa thành công. |
| F04 CORE A1 | Repeated/concurrent POST rồi DELETE cùng user+Place; consent both để đếm outcome | Add đầu201 hoặc một winner201, duplicate200 changed=false ALREADY_FAVORITE; one row/one FAVORITE outcome. Remove winner200 changed=true, còn lại200 changed=false NOT_FAVORITE; zero row/one UNFAVORITE outcome. DB unique/row lock không phát event trùng. |
| F05 CORE U2+A1 | A favorite một Place, B favorite một Place khác; đổi account kể cả GET/mutation A trả trễ; B gửi DELETE Place A, GET thêm userId=A | GET luôn owner B; B DELETE Place A chỉ ảnh hưởng favorite của B (nếu không có changed=false), A giữ nguyên. UI không hiển thị Favorite A sau chuyển B; private response cũ không ghi đè state B. Anonymous mutation401; heart anonymous dẫn login. |
| F06 CORE A1 | Place UUID sai/missing/SUSPENDED; body thêm userId/role/environment hoặc invalidversion/session | Invalid ID400 INVALID_PLACE_ID; missing/unpublished add404 PLACE_NOT_VISIBLE; whitelist400 SPOOFED_FAVORITE_FIELD và validation codes hiện có. Không mutation/event. Với favorite đã có rồi Place bị suspend: ghi đúng hiện trạng list vẫn giữ liên kết; policy hiển thị archived cần GAP-04, không tự yêu cầu xóa dữ liệu. |
| F07 CORE U2+A1 | Opt-out favorite/remove; consent on tạo request+visible thật rồi favorite attribution, request/session/user giả | Opt-out functional201/200 nhưng recorded=false ANALYTICS_OPT_OUT, không outcome mới. Consent on chỉ mutation thay đổi state có SERVER outcome đúng request/session/user/test environment; foreign/mismatched request400 INVALID_RECOMMENDATION_ATTRIBUTION, không mutation. Không gửi FAVORITE trực tiếp bằng client events để thay server outcome. |

### 6.6. Consent / telemetry — 8 CORE

| ID / mức / kênh | Thao tác và fixture | Expected / bằng chứng riêng |
|---|---|---|
| C01 CORE U2+A1 | Anonymous browse Home/Explore rồi user mới chưa quyết định; mở Customer page, decline rồi reload | Anonymous dùng public fallback/catalog, không bắt login để browse/không có consent banner của user. User GET hasDecision=false, false/false, policy1.0 retention90; banner hiện. Sau decline PUT200 hasDecision=true false/false, row đúng owner và settings mở lại được. Fresh valid events/ack không ghi do opt-out; **không yêu cầu recommendation_requests/candidates0**, xem mục4. |
| C02 CORE U2+A1 | Bật both qua UI, ở fixture card đủ visibility rule; click/view rồi reload | Consent200 true/true; event/ack thật có environment=test/owner/source/personalizationAllowed=true/expiry90ngày theo server. Request+candidate có flags true; không tính returned candidate như visible. Screenshot + network/DB timestamps, không train/export dữ liệu. |
| C03 CORE U2+A1 | Chọn analytics-only; Explore request có explicit preferences/budget; Favorite/Review mới | Consent200 true/false; event mới personalizationAllowed=false. Request hiện tại vẫn dùng criteria explicit nhưng persisted preferences=[] và không lưu budget chi tiết; UI limitation trung thực. Review mới aiUsageAllowed=false, functional Favorite/Review/Booking vẫn dùng được. Không đổi recommendation score weights. |
| C04 CORE U2+A1 | Từ both → nút decline/delete; đã có event/request/impression/Review/Favorite/Booking/Trip fixture; reload | PUT200 false/false + deleteExistingEvents=true; đúng **IDs cũ của owner** event/request/children mất; Review còn nhưng aiUsageAllowed=false/policy=null; functional rows và account B không đổi. Lưu snapshot ngay sau transaction; request mới sau reload phải có flagsfalse, không kết luận delete fail vì request mới. Booking attribution SET NULL nếu liên kết request bị xóa là side effect FK hiện có, không coi functional row phải byte-identical ở field đó. |
| C05 CORE A1 | PUT booleans sai, true personalization/false analytics, deleteExistingEvents sai; GET/PUT anonymous; thêm userId=B vào body/query | Invalid400 INVALID_CONSENT/anonymous401; không sửa bất kỳ consent/event/review. Field userId không chọn owner: valid flags vẫn chỉ cập nhật token A, B giữ nguyên (controller/service chỉ dùng flags, không bắt buộc unknown-field400). |
| C06 CORE A1 | Consent on: exact replay clientEventId và ackId; changed payload reuse ID; spoof serverfields/FAVORITE/Booking outcome/GPS context; visibility/dwell không đủ | Exact replay202 recorded=false duplicate=true và một row; ID reused payload khác409 CLIENT_EVENT_ID_CONFLICT/CLIENT_ACK_ID_CONFLICT. Spoof400 SPOOFED_SERVER_FIELD, FAVORITE400 USE_FAVORITES_API; unsupported outcome400 INVALID_EVENT_TYPE; raw GPS/unknown context400 INVALID_CONTEXT; VIEW với context.dwellMs<2000 có code VIEW_DWELL_TOO_SHORT. ACK rule `viewport-50pct-2000ms-v1`: ratio0.5–1, dwell2000–3600000ms integer; sai400 INVALID_VISIBILITY, version sai400 INVALID_VISIBILITY_RULE, thời gian ngoài cửa sổ -15phút/+60giây400 VISIBILITY_REPLAY_REJECTED. |
| C07 CORE U2+A1 | A opt-in, B opt-out; chuyển cùng tab khi GET/PUT consent A còn chờ; dùng request A để ack/event với B | UI/state/network không dùng consent A cho B sau switch; GET/PUT chỉ token user, fresh events B không ghi. Attribution foreign request400 INVALID_RECOMMENDATION_ATTRIBUTION khi đi đến validation (B opt-in fixture riêng cho negative attribution); không đòi400 khi service opt-out short-circuit. Raw IDs và rows A/B đối chiếu riêng. |
| C08 CORE U2 | Abort một request PUT consent **trước transport**, hoặc lỗi API thật nếu có fixture hợp lệ; retry rồi reload. Tương tự Favorite mutation fail và application/resource save fail | Không thông báo thành công giả, không biến DB state cũ thành đã lưu; control hết pending, không mất input nghiệp vụ, retry gửi thật và chỉ đổi state sau success. Phải lưu UI lỗi/console và DB trước/sau; thiếu error feedback ghi FAIL/GAP theo phạm vi assertion đã duyệt, không mock200 hoặc sửa expected để né. Không chủ động ngắt DB chung. |

### 6.7. OPTIONAL và OUT_OF_SCOPE

Các case dưới không thuộc mẫu số CORE; chỉ chạy nếu được duyệt thêm, dùng ledger riêng. Tất cả **NOT RUN**.

| ID / mức / kênh | Nội dung | Expected / điều kiện |
|---|---|---|
| O01 OPTIONAL U2+A1 | Deep pagination/search nhiều trang tất cả admin/partner modules, giới hạn100; ≥21 resource fixture nếu cần | Các trang không leak owner, total/page đúng, không yêu cầu pagination UI ở trang chưa có. Không tạo thêm fixture khối lượng lớn chỉ để gọi smoke. |
| O02 OPTIONAL A1 | Hai POST application cùng user/thời điểm; malformed UUID/NaN page và payload biên chưa có code contract thống nhất | **Unique partial migration 02 bảo đảm tối đa một active application** nếu schema đúng; một request thắng201, DB không có pending trùng. Service chưa map unique race thành HttpError nên request thua có nguy cơ500 từ errorHandler: ghi source finding và actual, không mặc định409 hoặc coi500 là đạt UX. Chốt expected HTTP robustness trước chạy; không bỏ DB invariant vì race, không tự sửa service/index. |
| O03 OPTIONAL U2+A1 | Mixed-role SA+PARTNER, nhiều membership permissions; resource của Business SUSPENDED | Theo role trong token + membership thực. Business ACTIVE hiện là gate **Booking mới**, không tự áp thành mọi CRUD. Cần GAP-03/04 trước khi đánh giá policy. |
| O04 OPTIONAL A1 | Xóa User fixture trực tiếp để kiểm trigger privacy/cascade (không có UI/API account delete) | Review retained/anonymized/AIfalse, favorite cascade; chỉ fixture ID, reviews còn lại vẫn ledger và xóa trước Booking. Cần duyệt explicit; không diễn giải là account delete E2E. |
| O05 OPTIONAL A1 | Retention expiry/rate limit120 events/phút | Verify TTL/rate-limit source và fixture-only behavior; **không gọi global purgeExpired/job** trên DB có nền. Chỉ chạy cleanup expiry trong môi trường/adapter đã chứng minh ID scope, không sửa app policy. |
| O06 OPTIONAL U2 | Firefox/Safari, thiết bị thật, viewport khác, accessibility audit chuyên sâu | Ghi browser/thiết bị thực; không suy từ mobile giả lập thành PASS thiết bị thật. |
| O07 OPTIONAL A1 | Legacy Review row PENDING/LEGACY, thiếu user/criteria; Favorite Place suspended; đổi consent không delete rồi cấp lại | Giữ provenance/không bịa verified/criteria; expected visibility/AI metadata phải theo GAP-04/06 đã chốt. Không sửa legacy nền. |
| O08 OPTIONAL U2+A1 | Customer Blog create→moderation, like và Trip→blog draft liên quan | Chỉ acceptance/source hiện có; không trộn vào Review hoặc Partner smoke. Không yêu cầu like idempotent nếu source không có. |

OUT_OF_SCOPE: xây Admin user/role/Business CRUD, nối placeholder, UI edit/moderate Review mới, bổ sung vòng hồ sơ, lịch phòng/bàn, partner reply; profile update; multi-mandatory mở rộng; chatbot/AI agent/train/sentiment/ranking; payment/refund/notification thật; load/stress/pentest tổng thể; migration/seed/reset/cleanup toàn cục; push/deploy. Đọc consent/provenance metadata không phải chạy export/train hay xác nhận quyền nghiên cứu/Kaggle.

## 7. GAP cần chốt trước test

Không có GAP nào dưới đây được gọi là lỗi đã tái hiện. “Đề xuất” là cách đóng phạm vi kiểm, không phải xin phép sửa ứng dụng.

| GAP | Bằng chứng source và hệ quả | Quyết định cần duyệt / xử lý khi chạy |
|---|---|---|
| GAP-01 — Phạm vi UI chưa có | Admin users/businesses/bookings/reports/settings và Partner workspace placeholder; Review edit/moderation chỉ API | Đề xuất nghiệm thu UI **đã nối thật** + API-only ghi riêng; phần UI chưa có NOT RUN/known limitation, không mở task triển khai trong T13-B. Nếu rubric bắt buộc các UI đó, coi scope chưa đủ và tách task trước, không đổi placeholder thành PASS. |
| GAP-02 — Onboarding chưa khép vòng | NEEDS_MORE_INFO chặn submit, không sửa/bổ sung; UI chặn cả APPROVED nhưng backend chỉ chặn PENDING/NEEDS_MORE_INFO. SA-only UI become-partner được route nhưng API403 | Đề xuất CORE kiểm submit/decision/reload/re-login; “bổ sung sau needs-info”, thêm Business sau approved, SA submit chỉ ghi gap, chưa acceptance xây mới. Chốt có yêu cầu chúng trước nghiệm thu toàn onboarding không. |
| GAP-03 — Permission chưa đồng nhất | `PartnerService.getBookings` alias chỉ membership, trái Phase3 MANAGE_BOOKINGS; Blog update/submit Place/Tour/Blog membership-only, create/archive MANAGE_BUSINESS | Booking alias giữ expected403 theo contract có sẵn, dự kiến cần ghi bug nếu tái hiện200. Với submit/Blog update cần chủ dự án chốt permission policy; mặc định chỉ characterization current behavior, không tự ép MANAGE_BUSINESS thành tiêu chí mới. Không sửa guard hoặc nới assertion trong task test. |
| GAP-04 — Trạng thái Business vs public content / archived Favorite | Public catalog repositories/Review/Favorite chủ yếu check resource status, không gate Business ACTIVE; **recommendation eligibility và visible ACK có gate ACTIVE riêng**. Favorite list không filter Place approval, add có filter | Business ACTIVE đã chốt cho **Booking mới** và recommendation policy hiện có; không đồng nhất với public catalog/CRUD. Cần duyệt ý nghĩa public content của Business suspended và favorite archived; không tự yêu cầu ẩn/xóa toàn bộ, không suy Business suspend = mọi API403. CORE kiểm moderation resource và từ chối add unpublished; nhánh policy chưa chốt ghi NOT RUN/GAP, O03/O07 chỉ khi duyệt. |
| GAP-05 — Dashboard “doanh thu” | Admin sum non-CANCELLED, Partner sum COMPLETED, chưa check paid | Kiểm kỹ thuật counts/formula có thể chạy; nghiệm thu nghĩa “doanh thu đã thu” chưa có căn cứ. Đề xuất gọi là metrics theo implementation và ghi hạn chế; chủ dự án chốt có chấp nhận nhãn hiện tại hay cần task riêng. Không sửa công thức/expected để né lỗi. |
| GAP-06 — Consent/state/error promises | Consent component không catch/render lỗi save; context GET không có session-version guard. Favorite mutation error có thể bị refresh xóa; load version bảo vệ GET nhưng chưa đủ chứng minh mutation đang chờ không lẫn account. Consent AI metadata cũ không tự cập nhật mọi nhánh đổi flags | R06/F05/C07/C08 phải có delay/abort request **thật**, không suy các lỗi này đã được T07 bảo vệ toàn bộ. Chốt đánh giá error feedback/role mismatch UX; giữ tiêu chí không success giả/không leak. Không coi aiUsageAllowed snapshot cũ là bằng chứng được train khi live consent đã đổi; export/train NOT RUN. |
| GAP-07 — Fixture mở rộng và điều kiện môi trường | Runner T13-A chưa cleanup đủ Review RESTRICT, member/application/grant và resource mới; T13-A chỉ tạo PENDING/unpaid, T13-B cần COMPLETED cho verified Review | Trước chạy phải duyệt fixture completed **unpaid, synthetic**, transitions bằng API/UI thật; không payment/notification. Cho phép fixture SA/membership tối thiểu qua guarded transaction vì không có role-grant API. Không dùng seed account hoặc password rotation. Nếu chưa duyệt, các nhánh B07/V01… NOT RUN, không tạo verified Booking bằng fake response. |
| GAP-08 — Acceptance/runner freeze | Scope kỹ thuật T02 chưa thay rubric; chưa có runner T13-B; schema/ports/DB availability chưa kiểm phiên này | Duyệt 43 CORE và 8 OPTIONAL, nhánh API-only, các policy trên; khóa expected+expansion manifest trước lần ghi đầu. Sau đó mới tạo harness riêng/test preflight. Nếu thiếu migration/sentinel, dừng NOT RUN và báo cấu hình, không migrate/seed để đạt PASS. |
| GAP-09 — Reload/form của Partner cần witness | `PartnerBookingsPage.tsx:13–14` lấy Business mặc định của dashboard khi mở URL Booking bất kỳ rồi gửi businessId đó khi đổi status; có thể khác Business của Booking dù actor có membership cả hai. `PartnerResourceFormPage.tsx:19` cắt ISO bằng slice để đưa vào datetime-local, và input số dùng `value \|\| ''`, có thể làm rỗng giá0/số đêm0 sau reload | Giữ B02/B03/B04/B07 kiểm persistence/không làm trôi dữ liệu: giá0, nights0 hợp lệ và save thời gian không sửa phải được bảo toàn. Chốt timezone cho nhập Ticket mới trước chạy (dùng browser Asia/Ho_Chi_Minh, ghi timezone process backend thực). Với direct Booking URL, kiểm selector/request đúng target, không bypass API bằng sửa DB để PASS. Đây là SOURCE FINDING cần witness, không phải yêu cầu xây chức năng mới hay lỗi đã tái hiện. |

GAP-01/02/04/05 không buộc tự xây tính năng; có thể chấp nhận giới hạn với nhãn rõ. GAP-03 không được dùng làm lý do bỏ kiểm phân quyền có acceptance. GAP-07/08 là **gate an toàn trước mọi write**. Chủ dự án cần duyệt ma trận này trước khi bắt đầu T13-B.

## 8. Fixture và bảo vệ dữ liệu cho lần chạy T13-B tương lai

### 8.1. Preflight fail-closed

1. Chụp HEAD, `git status --short`, source/harness/config hashes trước chạy; phân biệt dirty source với HEAD. Evidence mới dưới `docs/evidence/t13b/<UTC-runId>-<suffix>/`, không ghi vào `t13a`, `t13a-fix` hoặc baseline cũ. Runner T13-B **chưa được tạo/chạy** ở PREP.
2. Exact `NODE_ENV=test`, `DB_HOST=127.0.0.1`, `DB_NAME=TEST_DATABASE_NAME=travelgo_ai_m0_test`, `DB_SSL=false`, `ALLOW_TEST_DB_WRITES=true`; đọc credential local không in secret. Gọi `assertTestDatabaseWriteOptIn` và `assertDatabaseSentinel`, kèm assert exact name/env/host. Guard chung cho phép test/dev, **chưa đủ** thay exact gate của task. Sentinel phải có sẵn `hugotravel-isolated-test-database-v1`; không tự tạo/sửa marker.
3. READ ONLY xác minh actual `current_database()`/host/port/user, schema_migrations checksum của các file SQL 01–12 hiện có, FK/unique/trigger cần dùng; không apply migration. Thiếu hoặc mismatch → NOT RUN phần phụ thuộc, ghi nguyên nhân cấu hình. Không dùng `sequelize.sync`, seed, test wrapper có seed ngầm hoặc global purge.
4. Chọn cổng loopback riêng còn trống, strictPort, `reuseExistingServer=false`; `APP_ORIGINS` chỉ origin test, Vite proxy target đúng backend test và `/api`. Xác minh qua proxy bằng identity route **chỉ wrapper test** tương tự T13-A, rồi đối chiếu row fixture. Không sửa/dừng demo local hoặc tái sử dụng demo server. Ghi PID để chỉ dừng process của run.
5. Chụp fingerprint **trước fixture đầu tiên** bằng helper T11 đã đọc. Cùng thời điểm không có suite khác ghi test DB; không yêu cầu dừng demo DB. Không tái sử dụng fingerprint lịch sử làm “before” mới.

### 8.2. Ledger fixture

| Fixture dự kiến | Cách tạo / giới hạn |
|---|---|
| C_A, C_B, C_APPLICANT, các application reject/needs-info; P_A/P_B/P_EMPTY/permission variants; SA-only | Email duy nhất `t13b.<run>.<viewport>.<label>.<random>@example.test`, synthetic identity, password tạm không log. Customer đi register UI/API thật. SA-only/permission edge fixtures bằng guarded users/user_roles/business_members transaction đúng ID; không biến fixture grant thành role-management đã nghiệm thu. P_A tối thiểu đi onboarding approval thật; các biến thể còn lại là setup có nhãn. |
| Business A/A2/B và Business từ approval | Preallocate UUID cho fixture trực tiếp; tên/address/city ghi `T13B SYNTHETIC TEST ONLY`. Business sinh bởi approval phải ledger ngay từ response hoặc discover bằng **application ID + user ID fixture + audit newData businessId**, không tìm theo prefix toàn DB. Không sửa status Business nền. |
| Place hotel/restaurant/attractions/locked variants, Tour, Ticket, Blog | Thuộc Business fixture, city riêng để filter public/recommendation không chọn nền; giá/tọa độ/nội dung synthetic, ảnh embedded/local để giảm phụ thuộc. Happy CRUD tạo bằng UI; prerequisite variants có thể setup guarded DB nhưng không tính là UI CRUD PASS. Không sửa giá/aggregate Place nền. |
| Booking PENDING/CONFIRMED/COMPLETED/REJECTED/CANCELLED | Tạo qua API/UI thật của fixture; key unique, unpaid; transition thật để Review eligibility. Dùng riêng Booking negative target/type; không biến Booking cũ thành complete. Tour/Ticket capacity đủ và ledger snapshot inventory trước/sau. Không gọi thanh toán/email/SMS/webhook. |
| Review/Favorite/Consent/events/request/candidate/visible/audit/history | Tạo bằng luồng đang kiểm, environment=test; ledger IDs từ response và discover FK theo owner/resource đã biết. Event server của Customer do Partner transition vẫn thuộc **Customer fixture**, không chỉ tìm actor Partner. Review target_id là string, phải ledger explicit, không trông chờ Place FK cascade. |
| Trip (nếu C04 dùng) | Tạo một functional Trip fixture bằng contract API hiện có hoặc dùng fixture tạo trong cùng run; không lấy Trip nền hoặc rerun toàn planner làm test mới. Snapshot trước privacy delete. |

Mỗi viewport có account/Business/IDs riêng để reload, consent, aggregate và races không ảnh hưởng nhau. Ledger write-ahead ghi planned ID/email trước request, sau đó response IDs và discovered dependent IDs. Khi mất response sau commit phải discover đúng owner/application/resource, không quét/xóa theo tên chung. Không dựa solely vào “created=true” vì process có thể chết giữa mutation và ledger update.

Phân tách fixture theo dependency trước chạy:

| Case phụ thuộc | Prerequisite / tách biệt cần khóa trong manifest |
|---|---|
| R05 | A03 tạo grant thật; giữ cả token trước grant và token sau login, không mint token PARTNER giả để gọi đó là PASS onboarding. |
| A05 | Dùng nhóm Place/Tour/Blog riêng cho vòng reject/resubmit/approve/suspend. B02–B05 không archive chính các resource còn cần cho Booking/Review/Favorite. |
| B07 → V01/V04/V05 | Hotel và restaurant APPROVED thuộc Business ACTIVE; Booking tạo thật rồi transition. V05 dùng Booking chưa có Review, V04 có riêng Booking pending/confirmed/foreign/wrong target; không đổi status terminal để tái sử dụng. |
| V06/V07/V08 | Review IDs riêng cho update/hidden/delete; chụp aggregate tại mỗi checkpoint. Không để V08 xóa prerequisite V07 hoặc suy Review khác của cùng user đã biến mất. |
| F04/F07 và C02/C06 | Consent analytics bật; request + candidate đúng fixture Place và visible ACK thật, attribution session/surface đúng. Opt-out user riêng cho F07/C01; F04 bật consent để đếm outcome thực. |
| C04 | User riêng có event/request/visible và functional Favorite/Review/Booking/Trip; account B làm đối chứng. Chạy sau witness tương ứng, snapshot ID ngay trước privacy delete và ngay sau commit. |
| R06/F05/C07/C08 | Context cùng tab riêng, response thật được delay/abort có điểm cắt ghi rõ; không chia sẻ localStorage/session giữa desktop/mobile hoặc với demo đang mở. |

Nếu dependency upstream FAIL, case downstream giữ NOT RUN với ID nguyên nhân; vẫn có thể chạy nhánh độc lập bằng fixture riêng đã duyệt, không ghi nhận DB setup trực tiếp là PASS luồng UI bị chặn.

### 8.3. Cleanup kể cả test FAIL

Cleanup là guarded fixture maintenance sau khi đã chụp bằng chứng cuối; không phải hành vi xóa sản phẩm. `afterAll` và outer `finally`/recovery cùng đọc ledger; trước mỗi cleanup xác minh exact target/sentinel và ownership của IDs. Không DELETE theo toàn bảng, `environment=test`, status, prefix `t13b%` hoặc toàn bộ seed user.

Thứ tự đề xuất phải đối chiếu FK thực tế ở preflight:

1. Discover và khóa danh sách IDs đã tạo: reviews theo fixture user/target/booking; favorites; events; requests/children; audit theo entity/actor fixture; histories; roles/members/applications. Chứng minh không có dependent row nền trỏ fixture; nếu có, dừng và báo, không cascade vào dữ liệu nền.
2. Xóa **Review fixture trước Booking** vì booking_id RESTRICT; Favorite fixture; UserEvent/legacy impression fixture; AuditLog fixture và BookingStatusHistory fixture theo ID đã ghi. Không gọi ReviewService.delete để cleanup rồi bỏ sót audit mới; có thể DELETE DB fixture trong transaction guard sau khi đã kiểm hành vi UI, ledger counts rõ.
3. Xóa Booking fixture trước RecommendationRequest để cleanup không SET NULL vô tình trên Booking nền. Xóa Trip/Blog fixture và Ticket fixture trước Tour/Place khi có FK. Xóa `tour_places` fixture, Tour rồi Place. Không bỏ sót Blog author/place, Ticket place/tour.
4. Xóa request/candidate/visible fixture (capture child IDs trước CASCADE), consent. Nếu privacy-delete đã xóa, đối chiếu ledger và coi missing đúng ID là cleanup idempotent; không mở rộng predicate để tìm “đủ số”.
5. Xóa BusinessMember, application, UserRole fixture (gồm granted_by/reviewed_by liên quan), Business fixture, rồi User fixture; SA fixture xóa cuối để không SET NULL dữ liệu chưa xử lý. User delete có trigger Review anonymize: tất cả Review fixture còn lại phải được xử lý/ledger trước, kể cả O04 giữ review sau account delete.
6. Xác minh mọi planned/discovered ID/email/child fixture còn0, không residual audit/history/event. Chụp fingerprint-after bằng **cùng phương pháp/bảng**; compare trước/sau phải bằng nhau. Snapshot riêng schema/checksums không đổi. Cleanup log lưu ID/count/error/exit, không token/password.

Fingerprint helper `backend/src/evaluation/t11_db_fingerprint.ts`: transaction `REPEATABLE READ READ ONLY`, enumerate mọi bảng public, count rows và SHA-256 của chuỗi **MD5(to_jsonb(row)::text) đã sort**. Có cả giá trị/timestamp/JSON, không chỉ counts. Lịch sử T13-A có25 bảng; T13-B phải ghi số bảng **thực tế**, không hardcode25 để bỏ bảng mới. Phương pháp này không đo sequence state/file bên ngoài; không gọi là chứng minh mọi trạng thái PostgreSQL bất biến.

Nếu fingerprint lệch: ghi FAIL bảo toàn dữ liệu, chỉ điều tra và cleanup **ID còn sót đã chứng minh là fixture**. Không restore/update nền hay thay file before để làm PASS. Nếu runner crash, giữ ledger và chạy recovery đúng ID sau guard; không reset DB. DB down khiến cleanup chưa làm được phải ghi NOT RUN/cleanup incomplete và residual IDs, không tuyên bố sạch.

### 8.4. Vì sao không chạy thẳng suite cũ

| Nguồn đã đọc tĩnh | Có thể tham khảo | Không được chạy nguyên trạng trong T13-B |
|---|---|---|
| `frontend/e2e/roles.spec.ts` | Selector và chuỗi Customer/Partner/Admin thật | Login seed admin/customer/partner, xóa favorites đã có của seed Customer, thay trạng thái Booking seed, tạo resource không có ledger cleanup đầy đủ. Không phù hợp bảo toàn fingerprint. |
| `backend/src/tests/{integration,favorite,review,intelligence}.postgres.test.ts` | Assertion status/ownership/race/consent/provenance | Dùng seed catalog/account ở nhiều suite, Review cập nhật aggregate Place nền; `finally` chủ yếu đóng server/connection, không cleanup đầy đủ fixture ledger. Có guard vẫn chưa đủ an toàn dữ liệu. |
| `backend/src/tests/{rbac,telemetry,recommendationExposure}.test.ts` | Unit contract, không thay E2E thật | Các stub/unit PASS không chứng minh browser→API→DB; chỉ xem xét chạy sau duyệt khi file/harness thay đổi phù hợp. |
| `backend/scripts/t13a-{run,support,server}.cjs`, `frontend/playwright.core-e2e.config.ts`, `frontend/e2e/t13a-core.spec.ts` | Exact gate, identity route, port isolation, fingerprint, evidence và ledger recovery | Support cũ thiếu Review RESTRICT/member/application/Ticket/Blog cleanup cho scope này. Tạo harness T13-B riêng sau duyệt, giữ nguyên test và evidence T13-A. Không đổi testMatch rồi chạy vào old evidence root. |
| `telemetry:purge`, seed/migrate scripts | Chỉ đọc hiểu side effects | Purge xóa mọi expired row, không ID scope; seed/reset/migration không được phép. Không chạy `npm run test:e2e` toàn repo vì có suites ngoài scope/unsafe fixtures. |

## 9. Bằng chứng, kết quả và nghiệm thu

### 9.1. Artifact dự kiến

Trong evidence root mới: `environment.json` (DB identity không secret, sentinel/schema checksum, ports/PIDs/proxy/browser), `source-hashes-before/after.json`, `case-manifest.json` (IDs, resource/role/status expansions và expected freeze), từng viewport `case-results.json`, screenshots, network/console logs, DB snapshots theo fixture IDs, Playwright trace khi fail, `ledger.json`, cleanup log, fingerprint-before/after/compare và command logs/exit codes. HAR/trace phải tránh lưu Bearer/password hoặc hạn chế rồi redaction trước bàn giao; không dump user nền.

Ảnh tối thiểu: role denied403/menu mobile; hồ sơ pending/approve/reject; Admin moderation/detail; Partner form/list + Booking modal/status; Review verified/unverified/hidden quan sát công khai; Favorite saved/empty; Consent banner/settings/withdraw/error. API-only không tạo ảnh Admin Review editor giả. Ghi kích thước viewport và browser version trong mỗi run.

Mỗi U2 kiểm document không tràn ngang (`scrollWidth <= innerWidth + 1`), form/error không bị che, submit/save/confirm/menu chạm được, dialog/prompt thao tác được; table Admin/Partner có `min-width` và **scroll trong container** là thiết kế hiện có, được phép nếu tới được cột/nút. Không coi full-page screenshot một mình chứng minh button trong viewport thao tác được. Tiles/ảnh ngoài hệ thống lỗi được phân loại external; không suy thành DB/API nội bộ FAIL. API nội bộ không được replay/mock; delay/abort transport fault phải ghi rõ điểm cắt và request có đến server chưa.

### 9.2. Quy tắc PASS / FAIL / NOT RUN

| Trạng thái | Điều kiện |
|---|---|
| PASS | Đã thực thi case theo manifest được duyệt, đủ UI/API/DB theo kênh, expected và dữ liệu persistence/side effects đúng; có evidence mới. API-only PASS không nâng thành UI PASS. |
| FAIL | Đã chạy và có expected được duyệt không đạt; lưu input, endpoint/principal, expected/actual, DB delta, ảnh/log, severity và loại lỗi (application/fixture/config/external). Không thay assertion/expected sau khi thấy kết quả để đổi nhãn. |
| NOT RUN | Chưa chạy, thiếu UI/fixture/schema/DB/approval, hoặc bị chặn bởi lỗi upstream. Nêu dependency và phần đã chạy; thất bại tìm control của UI **đã triển khai** là FAIL gate, phần sau NOT RUN. UI chưa triển khai inventory đã nêu không giả thành PASS. |

Chưa đặt mẫu số runtime bằng43×2: A1 và U2 khác nhau, parameter expansion cũng khác. Manifest sau duyệt phải công bố **43 CORE case logic**, số tổ hợp viewport/data thực chạy và số checkpoints riêng; tổng PASS+FAIL+NOT RUN bằng đúng mẫu số đã khóa. OPTIONAL tách bảng, không dùng để bù CORE FAIL. Các assertion role/resource variants đều liệt kê endpoint thật trong results, không chỉ một dòng “RBAC PASS”.

Điều kiện nghiệm thu T13-B đề xuất: scope/GAP đã duyệt; tất cả CORE được chấp nhận có evidence PASS theo kênh hoặc chủ dự án chấp nhận giới hạn/NOT RUN được ghi rõ, không báo “toàn CORE PASS” khi còn thiếu; không còn lỗi mở về leak quyền, thay owner, duplicate/inventory hoặc provenance/consent trái contract đã chốt; cleanup đủ ID và fingerprint bằng nhau; source/hash/version khớp lần chạy, giữ toàn baseline. Nếu thấy business logic lỗi: tái hiện, đánh severity (leak/mutation trái phép ưu tiên cao), tiếp tục test độc lập, đề xuất task sửa riêng; không tự sửa trong T13-B-PREP hay âm thầm sửa app trong task nghiệm thu.

### 9.3. Thứ tự chạy đề xuất sau khi duyệt

1. Khóa GAP/manifest, audit harness và fixture cleanup; preflight/identity/schema/fingerprint. R02/R04 deny/escalation trước khi tạo nhiều dữ liệu.
2. A02–A04 onboarding + R05 re-login; R01/R03/B01 và permission B06. Nếu isolation không đạt, giữ evidence và cô lập case; không tiếp tục thao tác trên target có thể là dữ liệu nền.
3. B02–B05 với A05 moderation/public visibility; A01/A06 metrics/read APIs. Tham chiếu ID fixture để tránh phụ thuộc sort/top kết quả nền.
4. B07/B08 Booking transitions → V01–V08 Review. Review duplicate/delete dùng Booking riêng để không làm mất prerequisite của case khác.
5. F01–F07, C01–C08 với user consent riêng; C04 privacy delete chạy sau khi chụp bằng chứng event/provenance. R06/F05/C07 delay/account-switch ở cả viewport.
6. OPTIONAL đã duyệt nếu còn thời gian; cleanup/fingerprint/source-integrity và báo cáo cuối. Không auto triển khai/fix/retrain/deploy.

Rủi ro cao nhất: alias permission khác nhau; fixture review aggregate làm đổi Place nền; approve sinh Business/role ngoài ledger khi mất response; Review RESTRICT chặn cleanup; privacy delete làm mất request và SET NULL attribution; account switch trả trễ; dùng seed suites phá nền. Rủi ro trung bình: UI placeholder/copy nháp Ticket, Business mặc định sai khi mở direct Booking URL, thời gian Ticket/giá0/số đêm0 qua form reload, unique application race trả lỗi chưa chuẩn hóa, global revenue semantics, pagination chỉ trang đầu ở một số UI, mobile table/dialog. Các rủi ro source không được đếm là FAIL mới trước khi chạy.

## 10. Lệnh và kiểm tra thực hiện trong PREP

Các lệnh đã dùng là read-only (từ project root):

```powershell
git rev-parse HEAD
git status --short
git ls-files --cached --others --exclude-standard
rg --files -g AGENTS.md
rg --files docs backend/src frontend/src frontend/e2e
Get-Content docs/HUGO_T13_A_FIX_REPORT.md -Encoding utf8
Get-Content docs/HUGO_T13_A_CORE_E2E_REPORT.md -Encoding utf8
Get-Content docs/HUGO_6_WEEK_SCOPE.md -Encoding utf8
Get-Content backend/src/utils/testDatabaseGuard.ts -Encoding utf8
```

Đọc thêm các file trong inventory bằng `rg`/`Get-Content`; tính SHA-256 file local bằng Python `hashlib` qua danh sách Git. Một số tìm kiếm đầu dùng glob kiểu shell Unix hoặc tên file suy đoán không tồn tại trên Windows trả lỗi đường dẫn; đã chuyển sang `rg` thư mục/đường dẫn thật. Không dùng kết quả tìm không thấy đó làm bằng chứng tính năng thiếu; router/service thực tế là căn cứ. Không có test command/DB write nào được chạy; do chỉ tạo Markdown nên không cần build backend/frontend trong PREP.

Lệnh **tham khảo cho task đã được duyệt sau này, chưa chạy ở PREP**: `npm.cmd run build` tại backend/frontend; fingerprint snapshot/compare bằng `node dist/evaluation/t11_db_fingerprint.js ...` sau exact guard/sentinel. **Chưa có lệnh runner T13-B dùng được**: phải tạo runner/spec/config có scope, ledger và manifest như trên sau khi duyệt. Không đề xuất chạy ngay scripts seed-based `test:favorite`, `test:review`, `test:integration`, `test:intelligence` hoặc `test:e2e` toàn repo.

## 11. Kiểm toàn vẹn PREP và điểm dừng

Kết quả mới của phiên này là inventory + ma trận, **không có PASS E2E mới**. 43 CORE/8 OPTIONAL đều NOT RUN. Chưa kiểm DB availability/sentinel/schema thực, chưa tạo fixture, nên fingerprint DB before/after của T13-B cũng **NOT RUN**, không mượn file T13-A để điền.

Chỉ cập nhật báo cáo này từ bản nháp có sẵn. Kiểm hash toàn bộ **1.088 file ngoài báo cáo** trước/sau để xác minh giữ nguyên source/báo cáo/evidence; kết quả ghi tại phụ lục sau bước kiểm tĩnh. T13-B-PREP dừng ở đây, chờ duyệt ma trận và GAP trước bất kỳ triển khai harness hoặc kiểm thử ghi dữ liệu nào. T13-A-FIX14/14 và mọi bằng chứng FAIL lịch sử vẫn giữ nguyên giá trị/phạm vi, chưa chứng minh T13-B đã được nghiệm thu.

## Phụ lục — Hash đầu vào và kiểm bảo toàn

**Kiểm bảo toàn tĩnh PASS:** toàn bộ **1.088/1.088 file ngoài báo cáo giữ nguyên SHA-256**, không mất file; file thay đổi duy nhất là `docs/HUGO_T13_B_SCOPE_AND_MATRIX.md`, đã tồn tại ở đầu phiên. Tổng snapshot đầu phiên **1.089 file**. Đây là PASS kiểm file, **không phải PASS test ứng dụng/DB**. Trước và sau lượt rà soát này có46 tracked modified và75 untracked entries theo `git status --short` (directory entries có thể chứa nhiều file); không dùng Git status đơn thuần để kết luận file untracked không đổi.

Đối chiếu read-only với `source-hashes-after.json` của full T13-A-FIX cuối: **287/287 entries khớp**, không có hash khác ở các đường dẫn baseline đó. Điều này xác nhận snapshot file, không nâng coverage14/14 cũ thành kết quả T13-B.

SHA-256 của manifest1.088 file ngoài báo cáo trước/sau (sort đường dẫn bằng Python, mỗi dòng `relativePath` + TAB + `fileSHA256` + LF, UTF-8; loại chính báo cáo đang cập nhật):

`8a3c63e16abd183d7d457a906575e476fecd27bdb3798c06f6f3f77e56ba00de`

Hash từng đầu vào chọn lọc (các file khác được bảo vệ bởi lần so toàn bộ ở trên):

| File tương đối từ `travelgo/` | SHA-256 |
|---|---|
| `docs/HUGO_6_WEEK_SCOPE.md` | `c89e1f9ae5c2b686b4719444eebe7c185424472b62040ea9178062c37a413298` |
| `docs/HUGO_AUTH_CONTRACT.md` | `4e27f54dffc879a91e4736e8aabeb3bbd62785dc27368abadf8c1a93a7c51687` |
| `docs/HUGO_T13_A_CORE_E2E_REPORT.md` | `507475ddeb29fa011052ec29585e20faf1e9097c9bc7e1f1cd80e21daa68765d` |
| `docs/HUGO_T13_A_FIX_REPORT.md` | `39f60d24182a1455ff11e1da71024723c715937747c3dc8c41b01dd9ca98d0d8` |
| `docs/HUGO_AI_M1_TASK4_REPORT.md` | `5440e78530f0f16d5465e3e3382852b945df0bdd940270d2acf5acddf6f8e863` |
| `docs/HUGO_AI_M1_TASK5_REPORT.md` | `7a21a301c4de8549bb8e85d370af103cbe72dc8d0426b7fcfddbee734e28841d` |
| `backend/src/routes/adminRoutes.ts` | `16c044aeec44709506ad8cae234687017cc4b614feabd4283dcab8f5641a4c7f` |
| `backend/src/routes/partnerRoutes.ts` | `cf69f70f48c33b67d96a3f9a7c7d9412dcbf11373c15e35fc426a822f0ce3673` |
| `database/migrations/20261011_02_rbac_partner_foundation.sql` | `df7fd60cccf17d3f8a73f711825bb1e82a4606a17c42fce4c7fa214548c2cecd` |
| `backend/src/routes/reviewRoutes.ts` | `6a8928e6db8c959cfe4a70c54069172b0a4adefe701dfb231b8925fb149cc40c` |
| `backend/src/routes/favoriteRoutes.ts` | `b81d4934911b1d75cdb15919f7bf7ef565c04cbe05421e8fe91ebc6c3f1ce205` |
| `backend/src/routes/intelligenceRoutes.ts` | `1dfad1cc287e1e99c70752036e5f77c60a0dc79f8b751b6c4e52a42a3231452d` |
| `backend/src/services/partnerApplicationService.ts` | `6b718c2d3e0e2abcdd87ef8319923c49a13aaaae1aded7631f949a85ee119a33` |
| `backend/src/services/businessAccessService.ts` | `47696d91a9abe44d882a0cc2ee80a43efbe9999cea774cf3c744ca213def6e35` |
| `backend/src/services/partnerService.ts` | `80c8117f375e94b04492249eee0b7a4980e6fee0b9377fd3d0410b5a63a05340` |
| `backend/src/services/bookingService.ts` | `d9061745296f851c0534c543d1b3813dc3dbdd433d88cb72d675eda3c48bd46b` |
| `backend/src/services/reviewService.ts` | `02f5a89f04b2a9b33da72ef5494935e4df55db0410216eaf04704768f826f702` |
| `backend/src/services/favoriteService.ts` | `5025e697060023957330ef5ee8c80cd6e2cfe62ab20020b653cb7dbd9fe6c2c1` |
| `backend/src/services/telemetryService.ts` | `5fe1b5feee5b9de3c91483c1293ebdb1ce47208ba64ee484ac0024d704f08254` |
| `backend/src/services/recommendationExposureService.ts` | `7875531bd62f85fadd39708b2c81d90268b6287b0e7597bde8ec4485b79f76fc` |
| `frontend/src/router/AppRouter.tsx` | `05a3949b34fbda592ffd2aabbdd88e2fa2afd7fe3613610dc610a52b46ce0c99` |
| `frontend/src/pages/BecomePartnerPage.tsx` | `4092e9189033d71110afd96dcd92565c9a64af8cb158f24f505e5f5f103bc8d6` |
| `frontend/src/pages/partner/PartnerResourceFormPage.tsx` | `bdca32d0393a4ee32992ad3df431be7e607326c120a29e5ab0b5bcc6c038300b` |
| `frontend/src/pages/partner/PartnerBookingsPage.tsx` | `73fd96aad9f509104cf2debacc083c0b06a511c36d3112b426b62bf98d03784d` |
| `frontend/src/pages/PlaceDetailPage.tsx` | `6929c5bb838ace682d4e5a06949f8d813cec3f15b67fa4f81992661c464b57a9` |
| `frontend/src/context/FavoritesContext.tsx` | `b4063a5fe69b493de481bcffe55d13a6a014338873e2d1afd967cdaf189193b0` |
| `frontend/src/context/TelemetryContext.tsx` | `8402d46f035b9aa8bc807aace8ab70ea5423c11b3cc1d814b15cb4fc3a2dc7c1` |
| `frontend/src/components/common/TelemetryConsent.tsx` | `e13ca10cd4116f5b2a0f731668b4d55384a31c61c0b72975f749682ebc075ba1` |
| `backend/src/utils/testDatabaseGuard.ts` | `43340e359a8a5ed587c4cb5ea6025ac75098bfcd87a0e3a4de2421d233c411e8` |
| `backend/src/evaluation/t11_db_fingerprint.ts` | `4cf6d84e36323f9420f28f68e892263e3ba237929d9c6c4857a27ee249289aaf` |
| `backend/scripts/t13a-support.cjs` | `8372881ab9e107fd96478682116df322f0be0fc4e73ce42df3ae0659b766d9e7` |
| `frontend/e2e/roles.spec.ts` | `4dd092a425596a258135436b26fd37d098e209c61b04370a953dba84b6dc2996` |

Kiểm Markdown tĩnh: **43 CORE IDs duy nhất,8 OPTIONAL IDs duy nhất, các liên kết tài liệu/evidence local đều tồn tại**, số cột các bảng nhất quán; **32 hash đầu vào chọn lọc khớp file thực**. Không render browser báo cáo, không chạy build/test hoặc SQL để xác minh nội dung ứng dụng trong PREP.
