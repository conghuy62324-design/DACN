# HuGo Intelligence 2.0 — M1 Task 3 Execution Report

Ngày thực hiện: 2026-10-12  
Phạm vi: Recommendation Requests, Ranked Candidates & Visible Impressions  
Kết luận: **COMPLETE**

## 1. Safety và database target

- Chỉ dùng PostgreSQL/PostGIS local `travelgo_ai_m0_test` tại `127.0.0.1:5432`.
- Container `travelgo_postgres`, image `postgis/postgis:15-3.4-alpine`, trạng thái `healthy`, cổng local 5432.
- Sentinel được xác minh trước mọi thao tác ghi: `hugotravel-isolated-test-database-v1`.
- Write test chỉ chạy khi đồng thời có `ALLOW_TEST_DB_WRITES=true` và `TEST_DATABASE_NAME=travelgo_ai_m0_test`.
- Không kết nối hoặc thay đổi `travelgo_dev`, `travelgo_phase35_test`; không DROP/TRUNCATE/reset; không push/deploy/publish.
- Mật khẩu seed test được sinh ngẫu nhiên trong process, không hard-code, không in log và không ghi vào báo cáo.

## 2. Audit và quyết định kiến trúc

Trước Task 3, `RecommendationService` đã có weighted heuristic cho Place nhưng chưa có HTTP recommendation contract. Bảng migration 04 tên `recommendation_impressions` chứa rank/score ngay khi server trả candidate, vì vậy không chứng minh item đã được người dùng nhìn thấy. Task 2 chỉ cho phép `requestId` khi khớp bảng này nhưng frontend chưa có nguồn `requestId` server-side.

Task 3 giữ nguyên bảng cũ làm **LEGACY, không dùng cho attribution/export mới** và tách ba khái niệm:

1. `recommendation_requests`: một lần server xếp hạng và trả response;
2. `recommendation_candidates`: ranked candidate set server đã trả;
3. `recommendation_visible_impressions`: item thực sự đạt visibility rule và được server xác minh.

Không có thao tác tự động biến candidate thành impression. Candidate không visible và catalog item không xuất hiện trong candidate set đều không phải negative label.

## 3. Recommendation request contract

Endpoint mới: `POST /api/intelligence/recommendations`, bắt buộc access token.

Client được gửi:

- `contractVersion = 1.0`;
- `sessionId` hợp lệ;
- `uiSurface`: `home_featured`, `explore_results` hoặc `tour_planner`;
- filter allowlist: `destinationCity`, `category`, `search`, `minRating`;
- explicit preferences theo allowlist Task 1;
- `dailyBudgetPerPerson` và `limit` có giới hạn.

Server tự tạo UUID `requestId` và quyết định:

- `algorithmVersion = weighted-hybrid-v1`;
- `policyVersion = approved-public-eligibility-v1`;
- `modelVersion = heuristic-content-bayesian-v1`;
- `configVersion = weights-q35-p25-b25-d15-v1`;
- environment, user, consent snapshot, retention và control cohort.

Client không được gửi `userId`, role, businessId, environment, rank, score, eligibility, model/policy/config version hoặc experiment variant. Request/candidates được ghi trong cùng transaction trước khi response trả về. Chỉ Place `APPROVED` đúng subtype public mới vào response hiện tại.

Explicit preferences chỉ được dùng và lưu khi consent personalization hiện tại đang bật; khi opt-out chúng được bỏ khỏi scoring/persistence. Không suy diễn preference từ summary/review.

Response gồm `requestId`, version metadata, `items[].rank`, score, score breakdown, reason codes, `why`, data update time và limitation. Đây vẫn là baseline heuristic, chưa phải Learning-to-Rank.

## 4. Candidate và visible impression

Mỗi candidate lưu:

- request/item ID và type;
- `eligible`, `eligibilityCode`, `returned`, rank;
- score, score breakdown, reason codes;
- policy/model version.

Endpoint acknowledgement: `POST /api/intelligence/recommendations/visible`.

Visibility policy cố định và versioned: `viewport-50pct-2000ms-v1` — card phải giao với viewport ít nhất 50%, tab visible và duy trì 2.000 ms. Frontend dùng `IntersectionObserver`, không phát từ React render. Server kiểm tra timestamp/replay window, ratio, dwell, request ownership, session, surface, environment, expiry, candidate membership và trạng thái public hiện tại.

Dedup gồm:

- `clientAckId` UUID unique;
- unique `(requestId, itemType, itemId, visibilityRuleVersion)`;
- retry cùng acknowledgement trả `duplicate=true`, không tạo row thứ hai;
- tái sử dụng ID cho payload/user khác trả conflict.

React Strict Mode từng tạo hai request giống nhau ở Explore. Đã sửa bằng dedup theo chữ ký user/filter để một logical load chỉ gọi server một lần.

## 5. Attribution flow

Luồng đã chứng minh:

```text
server recommendation request
  → persisted ranked candidates
  → frontend card visible >= 50% trong 2 giây
  → server-verified visible impression
  → CLICK / FAVORITE mang requestId + itemId
  → booking lưu recommendation_request_id và phát BOOKING_CREATED trong transaction
```

Task 2 event chỉ chấp nhận attribution khi có visible impression cùng request, user, session, item, type và environment. Event không mang `requestId` vẫn là unattributed; event cũ không được backfill requestId giả.

Favorite hiện vẫn là localStorage và event luôn có `localFavoriteOnly=true`; đây là attributed telemetry, chưa phải nguồn sự thật favorite lâu dài. Booking attribution được client đề nghị bằng request/session nhưng backend xác minh visible impression và service item trước khi cập nhật inventory/tạo booking. Attribution giả làm transaction fail; không tạo booking và không thay đổi capacity.

## 6. Consent, retention, delete và export

- Retention request/impression: 90 ngày, cùng policy Task 2.
- Analytics opt-out: acknowledgement trả `recorded=false`; không tạo visible impression.
- Personalization opt-out: explicit preferences không được dùng/lưu và impression không training-eligible.
- `deleteExistingEvents=true`: xóa event và request của đúng user; candidates/impressions cascade. Booking giữ nghiệp vụ, FK request chuyển NULL an toàn.
- Export chạy transaction read-only và yêu cầu migration 06.
- Export chỉ lấy row có consent snapshot hợp lệ **và consent hiện tại vẫn bật**, đúng environment, chưa hết retention, có candidate/request provenance.
- Bảng legacy migration 04 bị loại khỏi export.
- Manifest ghi `unseenCatalogItemsUsedAsNegative=false`; candidate chưa visible không phải negative.
- IDs user/session được HMAC pseudonymize; không export email, JWT, raw GPS hoặc secret.

Kiểm tra export thực tế:

- target `production`: 0 event, 0 recommendation request, 0 candidate, 0 visible impression từ database test;
- target `test` ở lần kiểm tra cuối: 7 request, 7 candidate, 5 visible impression đủ consent/provenance; chênh lệch 2 request chưa visible được giữ đúng là candidate-only, không phải exposure;
- output kiểm tra local nằm trong `ai/data/task3-export-verification/`; không upload Kaggle.

## 7. Migration

Migration additive, không sửa 01–05:

| Migration | SHA-256 tracked | Nội dung |
|---|---|---|
| `20261012_06_recommendation_exposure.sql` | `9f90d12a55a57799977115b4b8922b70cba3d02649f48e4e08d54b2913a536cb` | requests, candidates, visible impressions, booking attribution fields |
| `20261012_07_recommendation_booking_retention.sql` | `bf885a9161b6420e096c10a3cc37de6a45715ffc2b375e38a8ec8104998cc3de` | cho phép privacy deletion SET NULL request mà không phá booking |

Cả hai đều dry-run trước apply. Runner `SKIP` migration đã tracked và chỉ apply migration mới. Schema verifier sau cùng: 7 migration, 22 bảng ứng dụng, 35 foreign keys, PostGIS 3.4.3 — **PASS**.

## 8. PostgreSQL row evidence

Snapshot sau integration + E2E, chỉ là dữ liệu test:

- `production_visible = 0`;
- `test_training_eligible_visible = 5` (gồm các lần integration/E2E đã chạy);
- request E2E `776f7fe0-1492-4f32-9c53-f0685799e356`: 1 candidate, 1 visible impression, 1 attributed CLICK, 1 attributed FAVORITE;
- một recommendation response khác có candidates nhưng 0 visible impression, chứng minh response không tự động trở thành exposure;
- Task 3 HTTP test mỗi run chứng minh 1 candidate, đúng 1 visible impression sau retry, attributed click và booking; opt-out tạo 0 training impression.

Các ID trên là fixture local/test, không phải production identity.

## 9. Test results

| Nhóm | Kết quả | Bằng chứng thực thi |
|---|---|---|
| Backend TypeScript build | **PASS** | `npm run build` |
| Frontend production build | **PASS** | TypeScript + Vite, 1.726 modules |
| Telemetry unit | **PASS** | 8 checks |
| Recommendation contract unit | **PASS** | 6 checks: allowlist, spoofing, dwell/rank protection |
| Algorithm/Preferences | **PASS** | 14/14 |
| RBAC/unit | **PASS** | auth, role, ownership, price/capacity/transition |
| Task 2 HTTP/PostgreSQL | **PASS** | 30 checks |
| Task 3 HTTP/PostgreSQL | **PASS** | 39 checks: request/candidate/visible/dedup/conflict/forgery/cross-user/wrong-item/click/opt-out/booking |
| Full PostgreSQL integration | **PASS** | 14 groups: RBAC, Business isolation, booking concurrency/idempotency/rollback, planner, Trip |
| Production export isolation | **PASS** | production export có 0 test event/request/candidate/impression |
| Playwright CUSTOMER/PARTNER/SUPER_ADMIN | **PASS** | 3/3; CUSTOMER chứng minh recommendation → visible → click/favorite |
| Schema verification | **PASS** | 7 migrations, 22 tables, 35 FKs, PostGIS 3.4.3 |
| `git diff --check` | **PASS** | không có whitespace error (xem lần chạy cuối) |

Các response 400/401/403/404/409 trong log anti-spoofing/RBAC là expected assertions, không phải test failure.

## 10. File chính thay đổi trong Task 3

Backend/database:

- `database/migrations/20261012_06_recommendation_exposure.sql`
- `database/migrations/20261012_07_recommendation_booking_retention.sql`
- models `RecommendationRequest`, `RecommendationCandidate`, `RecommendationVisibleImpression`, `Booking`
- `recommendationExposureService.ts`, telemetry/booking service và controllers/routes
- schema verifier, AI exporter, Task 3 unit/PostgreSQL tests

Frontend/E2E:

- recommendation API service và visibility hook
- Explore + PlaceSidebar + Favorite/Booking attribution wiring
- configurable isolated Playwright ports/proxy
- E2E three-role scenario

## 11. Backlog Task 4

Theo M1 roadmap, Task 4 nên tập trung vào **server-side Favorite/SAVE source of truth**:

1. tạo favorite entity/API idempotent có ownership, consent và delete/export policy;
2. chuyển localStorage thành cache/UI state, không còn là nguồn sự thật;
3. nối SAVE/UNSAVE với requestId chỉ sau visible impression;
4. test cross-user access, duplicate, opt-out, migration/export và E2E;
5. sau đó triển khai review truth: booking COMPLETED verification, one-booking-one-review, rating/comment/criteria validation.

Chưa huấn luyện Learning-to-Rank, collaborative filtering, PhoBERT, demand forecasting hoặc chạy A/B exploration trong Task 3. LTR tiếp tục **BLOCKED** cho đến khi đạt data gate đã đăng ký (ít nhất 10.000 valid impressions, 500 consented sessions/users, 4 tuần và đủ positive outcome).

## 12. Kết luận

M1 Task 3 **COMPLETE**. Chuỗi `recommendation → render/visibility → visible impression → click/save` đã được chứng minh end-to-end trên PostgreSQL/PostGIS thật trong database cô lập. Candidate, exposure và attributed outcome đã được phân biệt; dữ liệu test không lọt production export; các regression trọng yếu vẫn PASS.
