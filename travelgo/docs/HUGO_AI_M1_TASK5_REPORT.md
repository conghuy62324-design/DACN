# HuGo Intelligence 2.0 — M1 Task 5: Verified Reviews & Review Data Quality

Ngày thực hiện: 2026-10-12  
Trạng thái: **COMPLETE**

## 1. Kết luận

M1 Task 5 đã hoàn thành trên database PostgreSQL/PostGIS cô lập `travelgo_ai_m0_test`.

Review hiện có provenance trực tiếp tới booking; trạng thái `VERIFIED` chỉ do server cấp sau khi khóa và kiểm tra booking `COMPLETED`, đúng user và đúng Place/service. Review không có booking vẫn hoạt động và được ghi rõ `UNVERIFIED`. PostgreSQL bảo đảm one-booking-one-review bằng unique partial index, kể cả khi có request đồng thời.

Review là dữ liệu chức năng của tài khoản. Consent không chặn việc tạo/đọc/sửa/xóa review; consent chỉ quyết định review có được dùng trong AI export hay không. Legacy review không được tự nâng thành verified và không đủ điều kiện AI mặc định.

Không train model, không upload Kaggle, không push/deploy/publish và không bắt đầu Task 6 hay M2.

## 2. Audit trước thay đổi

### 2.1 Schema và backend cũ

- `reviews` đã tồn tại từ migration 01; Task 5 không xây lại bảng/chức năng.
- Schema có `target_type`, `target_id`, `user_id`, tên/avatar snapshot, rating tổng, bốn rating tiêu chí, comment, images và `created_at`.
- Không có `booking_id`, verification provenance, moderation status, environment/test marker, consent/AI-use marker hoặc `updated_at`.
- Bốn rating tiêu chí có default `5.0`; service cũ còn tự điền rating tổng vào tiêu chí bị thiếu. Điều này làm mất phân biệt “người dùng không nhập tiêu chí” với “người dùng chấm 5”.
- API cũ chỉ có public list và create theo Place. Không có API list của chính user, update, delete hoặc moderation.
- Controller lấy identity từ JWT cho `userId`/`userName`, nhưng vẫn nhận `userAvatar` từ client. Frontend còn yêu cầu nhập `userName` dù backend không dùng giá trị này.
- Không có validation ứng dụng chặt cho rating/comment/criteria; phần lớn chỉ dựa vào DB check của rating tổng.
- Bayesian aggregate cũ tính trên mọi review, không xét moderation.

### 2.2 Verification/export cũ

- Không có review row nào gắn trực tiếp với booking.
- Exporter tự suy luận `verified_booking` bằng truy vấn `EXISTS` trên bất kỳ booking `COMPLETED` cùng user/target. Cách này không chứng minh booking cụ thể nào sinh ra review và có thể gắn nhầm provenance.
- Export cũ lấy toàn bộ review, chưa lọc consent hiện tại, moderation, source legacy, environment/test hoặc cutoff.

### 2.3 Frontend và storage

- Review đã gọi PostgreSQL qua API; không có luồng Review đọc/ghi `localStorage`.
- Review mới chỉ được giữ trong React state sau khi POST rồi tải lại từ server khi refresh.
- `MOCK_REVIEWS` vẫn còn là fixture không được import; không tham gia runtime.
- Frontend chưa chọn booking, chưa hiển thị VERIFIED/UNVERIFIED và chưa có thao tác xóa review của chính user.

### 2.4 Booking/Rating liên quan

- Booking có ownership server-side, `place_id`, `service_id`, `service_type` và lifecycle `PENDING → CONFIRMED → COMPLETED`.
- `COMPLETED` là terminal state, phù hợp để làm bằng chứng verified review.
- Review runtime hiện chỉ được tạo cho Place. Vì vậy Task 5 xác minh trực tiếp các booking Place service hiện hữu (`hotel`, `restaurant`); không tự mở rộng sang một hệ Review Tour/Ticket mới.

## 3. Migration additive

Không sửa migration 01–08. Migration runner xác minh checksum và báo `SKIP` cho 01–08.

| Migration | SHA-256 | Nội dung |
|---|---|---|
| `20261012_09_verified_reviews.sql` | `8842947ab9cd52890cc371bf75877e191f801fd12bedb19c5c06d46080c1670e` | booking provenance, verification/moderation/source/environment/consent fields, nullable criteria + provided flags, constraints và indexes |
| `20261012_10_review_account_deletion_privacy.sql` | `4219afac618257e7970f878b83b30c72eb2fe0fe106af04e81c5083e8bc48c52` | trigger ẩn danh tên/avatar và thu hồi quyền AI trước khi xóa tài khoản |

Các ràng buộc chính:

- `booking_id` FK tới `bookings(id)` với `ON DELETE RESTRICT` để không mất provenance của verified review;
- `moderated_by` FK tới `users(id)` với `ON DELETE SET NULL`;
- unique partial index `uq_reviews_booking` trên mọi `booking_id IS NOT NULL`;
- `VERIFIED` bắt buộc có `booking_id` và `verified_at`; `UNVERIFIED` không được có `verified_at`;
- `verification_status`: `VERIFIED | UNVERIFIED`;
- `moderation_status`: `PENDING | PUBLISHED | HIDDEN | REJECTED`;
- `source`: `LEGACY | CUSTOMER_SUBMISSION`;
- `environment`: `production | development | test`;
- overall/criteria rating thuộc `[1,5]`; criteria có thể `NULL`;
- `criteria_provided` chỉ chứa bốn boolean `service/price/location/experience`;
- comment mới/được cập nhật phải có 10–2000 ký tự hợp lệ. Constraint dùng `NOT VALID` để không làm migration thất bại vì legacy row ngắn, nhưng vẫn áp dụng cho row mới/update;
- indexes phục vụ target/public list, owner list và AI export.

Legacy rows nhận `source=LEGACY`, `verification_status=UNVERIFIED`, `ai_usage_allowed=false`; không có backfill suy đoán.

## 4. Quy tắc nghiệp vụ và bảo mật

### 4.1 Tạo review

Client chỉ được gửi:

```json
{
  "bookingId": "uuid-optional",
  "rating": 1,
  "criteria": {
    "service": 1,
    "price": 1,
    "location": 1,
    "experience": 1
  },
  "comment": "10–2000 ký tự"
}
```

`rating` và từng criteria phải là số nguyên 1–5. `criteria`/từng key là optional; thiếu nghĩa là `NULL` và flag `criteria_provided=false`, không tự điền 5.

Các field như `userId`, `userName`, `userAvatar`, `businessId`, `verified`, `verificationStatus`, `moderationStatus`, `environment`, `source`, `aiUsageAllowed` bị từ chối với `SPOOFED_REVIEW_FIELD`. Identity/name/avatar lấy từ user đã xác thực trên server.

Nếu có `bookingId`, server thực hiện trong transaction:

1. khóa Place;
2. tìm/khóa booking;
3. xác minh `booking.user_id === JWT user`;
4. xác minh `booking_status === COMPLETED`;
5. xác minh `booking.place_id === targetId`, `service_id === targetId` và service type phù hợp;
6. xác minh chưa có review cho booking;
7. tạo review `VERIFIED` với `verified_at` do server đặt;
8. cập nhật aggregate chỉ từ review `PUBLISHED`.

Nếu không có `bookingId`, review được tạo bình thường nhưng luôn là `UNVERIFIED`.

### 4.2 Duplicate/concurrency

- Một booking chỉ có tối đa một review toàn hệ thống.
- Service trả `409 REVIEW_ALREADY_EXISTS` khi lặp.
- Row lock serialize mutation theo Place.
- Unique partial index là hàng rào cuối ở PostgreSQL; test 6 request đồng thời cho kết quả đúng 1 HTTP 201, 5 HTTP 409 và 1 row.
- Booking provenance và verification status là immutable trong API update.

### 4.3 Ownership và moderation

- User chỉ list private, sửa hoặc xóa review có `user_id` của chính JWT; cross-user trả 404 để không xác nhận sự tồn tại.
- Chủ review vẫn xóa/sửa được nếu Place sau đó bị suspended.
- Public list chỉ trả `PUBLISHED`; không trả `userId`, `bookingId`, environment hoặc AI-use flag.
- `SUPER_ADMIN` có endpoint moderation `PUBLISHED/HIDDEN/REJECTED`; HIDDEN/REJECTED bắt buộc reason, hành động ghi `audit_logs`.
- Rating/Bayesian aggregate chỉ dùng review `PUBLISHED`; moderation/delete/update đều tính lại trong transaction.

## 5. API contract

| Method | Endpoint | Auth | Hành vi |
|---|---|---|---|
| `GET` | `/api/places/:placeId/reviews` | public | chỉ review `PUBLISHED`, không lộ user/booking ID |
| `POST` | `/api/places/:placeId/reviews` | CUSTOMER/PARTNER/SUPER_ADMIN | tạo VERIFIED nếu booking hợp lệ, nếu không có booking thì UNVERIFIED |
| `GET` | `/api/reviews/me` | authenticated | danh sách review của tài khoản, gồm provenance/status/quyền AI phục vụ truy xuất dữ liệu cá nhân |
| `PATCH` | `/api/reviews/:id` | owner | chỉ sửa rating/criteria/comment; không đổi identity/booking/verification |
| `DELETE` | `/api/reviews/:id` | owner | xóa review và cập nhật aggregate |
| `PATCH` | `/api/reviews/:id/moderation` | SUPER_ADMIN | body `{status, reason?}`, audit và cập nhật public aggregate |

## 6. Frontend

- Bỏ ô nhập tên; frontend không còn gửi identity/avatar/verified metadata.
- Tải booking của user và chỉ cho chọn booking đúng Place, trạng thái `COMPLETED`, chưa được dùng để review.
- Luôn cho phép chọn “không gắn booking”; server lưu `UNVERIFIED`.
- Hiển thị badge “Đã xác thực booking” từ server response.
- Refresh tải lại review và verification từ PostgreSQL; React state chỉ là trạng thái UI tạm thời.
- Hiển thị lỗi API, giới hạn comment 10–2000, disable submit khi chưa đăng nhập.
- User có nút xóa review của chính mình; server vẫn là lớp ownership quyết định.

## 7. Consent, privacy, retention và AI export

### 7.1 Dữ liệu chức năng và quyền AI

- Review được tạo/sửa/đọc/xóa bình thường khi analytics/personalization opt-out.
- Tại submission/update, `ai_usage_allowed=true` chỉ khi consent hiện tại có cả analytics và personalization.
- Opt-out với `deleteExistingEvents=true` thu hồi `ai_usage_allowed` trên review nhưng không xóa review chức năng.
- Export còn join consent hiện tại; snapshot true không đủ nếu user đã opt-out sau đó.
- Xóa tài khoản giữ review đã publish để bảo toàn rating/content, nhưng trigger đổi tên thành `Người dùng đã xóa`, xóa avatar, xóa `user_id` qua FK và thu hồi quyền AI.
- `GET /api/reviews/me` là contract truy xuất review cá nhân khi tài khoản còn tồn tại.

### 7.2 Export contract

AI exporter chạy `BEGIN READ ONLY` và yêu cầu migration 10. Review chỉ được xuất khi đồng thời:

- `source=CUSTOMER_SUBMISSION`;
- `ai_usage_allowed=true`;
- consent hiện tại analytics + personalization đều bật;
- `moderation_status=PUBLISHED`;
- environment đúng `AI_EXPORT_EVENT_ENVIRONMENT`;
- `created_at <= AI_EXPORT_REVIEW_CUTOFF` (mặc định thời điểm invocation nếu không cấu hình).

Export chứa rating tổng/criteria nullable, `criteria_provided`, verification/moderation/source/environment/test flag, consent policy version, timestamps và comment đã redact email/phone. `user_id` không xuất; `booking_id` được thay bằng HMAC `booking_hash`. VERIFIED và UNVERIFIED đều có thể xuất nếu đủ consent, nhưng status luôn rõ để M2 chọn/filter theo experiment.

Review không có TTL tự động vì là UGC chức năng; cutoff kiểm soát snapshot AI. Event telemetry vẫn dùng retention 90 ngày riêng. Không có dữ liệu nào được upload.

## 8. Kết quả kiểm thử thực tế

Mọi write test đều đặt rõ:

- `DB_NAME=travelgo_ai_m0_test`;
- `NODE_ENV=test`;
- `ALLOW_TEST_DB_WRITES=true`;
- `TEST_DATABASE_NAME=travelgo_ai_m0_test`;
- preflight xác minh current database, sentinel `hugotravel-isolated-test-database-v1` và write guard trước seed/migration/test.

Không chạy write trên `travelgo_dev`, `travelgo_phase35_test` hoặc database khác; không reset, DROP hay TRUNCATE.

| Nhóm | Trạng thái | Bằng chứng |
|---|---|---|
| Safety preflight | **PASS** | nhiều lượt đều trả `database=travelgo_ai_m0_test`, `sentinel=PASS`, `writeGuard=PASS` |
| Migration apply | **PASS** | 01–08 `SKIP`; 09 và 10 lần lượt `APPLIED` |
| Schema PostgreSQL | **PASS** | 10 migrations, 23 application tables, 39 FK, PostGIS 3.4.3 |
| Review API/PostgreSQL | **PASS** | `test:review`: 75 checks |
| Booking lifecycle | **PASS** | PENDING bị 409; CONFIRMED chưa đủ; COMPLETED đúng owner/place tạo VERIFIED |
| Duplicate/concurrency | **PASS** | 6 concurrent create: 1 success, 5 duplicate 409, đúng 1 DB row |
| RBAC/identity spoofing | **PASS** | unauthenticated 401; field giả mạo 400; cross-user booking/update/delete bị chặn; admin-only moderation 403 với customer |
| Validation/data quality | **PASS** | overall/criteria 1–5 integer; comment 10–2000; missing criteria giữ NULL + flags |
| Moderation/aggregate | **PASS** | HIDDEN biến mất khỏi public list, owner vẫn thấy private, publish lại hoạt động |
| Compatibility | **PASS** | review không booking hoạt động và lưu UNVERIFIED; legacy không auto-verified |
| Consent/opt-out | **PASS** | opt-out vẫn tạo VERIFIED review nhưng `ai_usage_allowed=false` |
| Privacy/account deletion | **PASS** | privacy delete giữ review chức năng + thu hồi AI; account deletion ẩn danh tên/avatar và null user |
| AI export test | **PASS** | final test export: 3 review consented; 2 VERIFIED có booking hash 64 ký tự; không raw user/booking columns |
| Cutoff | **PASS** | cutoff `2000-01-01` xuất 0 review |
| Production/test isolation | **PASS** | production target xuất 0 review/event/request/candidate/impression từ test data |
| Customer E2E final | **PASS** | 1/1: chọn booking COMPLETED, POST 201, VERIFIED badge, refresh vẫn còn |
| Full role E2E | **PASS** | 3/3 Customer/Partner/SUPER_ADMIN |
| Task 1–4 regression | **PASS** | RBAC PASS; algorithm 14/14; integration 14 nhóm; intelligence 30; telemetry 9; recommendation unit 6 + PostgreSQL 39; Favorite 59 |
| Backend production build | **PASS** | `npm.cmd run build` |
| Frontend production build | **PASS** | TypeScript + Vite; 1,727 modules transformed |
| Static diff check | **PASS** | `git diff --check` exit 0; chỉ có cảnh báo line-ending hiện hữu |

Các dòng `Server Error` trong output integration là log của negative-path assertions mong đợi (401/400/403/404/409); process kết thúc exit 0 và summary PASS.

## 9. File thay đổi của Task 5

### Database/backend

- `database/migrations/20261012_09_verified_reviews.sql`
- `database/migrations/20261012_10_review_account_deletion_privacy.sql`
- `backend/package.json`
- `backend/src/models/Review.ts`
- `backend/src/models/index.ts`
- `backend/src/services/reviewService.ts`
- `backend/src/services/placeService.ts`
- `backend/src/services/telemetryService.ts`
- `backend/src/controllers/placeController.ts`
- `backend/src/controllers/reviewController.ts`
- `backend/src/routes/api.ts`
- `backend/src/routes/reviewRoutes.ts`
- `backend/src/scripts/verifyDatabase.ts`
- `backend/src/scripts/exportAiDataset.ts`
- `backend/src/tests/review.postgres.test.ts`

### Frontend/E2E

- `frontend/src/types/index.ts`
- `frontend/src/services/placeService.ts`
- `frontend/src/pages/PlaceDetailPage.tsx`
- `frontend/e2e/roles.spec.ts`

### Documentation

- `docs/HUGO_AI_M1_TASK5_REPORT.md`

Workspace đã có thay đổi chưa commit từ M0/M1 Task 1–4; Task 5 giữ nguyên các thay đổi đó và không reset/ghi đè ngoài phạm vi.

## 10. Readiness M1 → M2/Kaggle

**Đánh giá: M1 đã đủ điều kiện kỹ thuật tối thiểu để chuyển sang M2.**

Chuỗi dữ liệu nền tảng hiện có source of truth cho consent, telemetry, recommendation exposure/attribution, server-side Favorite và verified Review. Review export có provenance, moderation, consent, environment, cutoff và pseudonymization đủ để bắt đầu pipeline đánh giá/chất lượng dữ liệu M2.

Điều này không có nghĩa dữ liệu HuGo hiện đã đủ để train model production. Row count trong báo cáo là test traffic tích lũy, không đại diện người dùng thật và không được dùng để claim chất lượng model.

### MUST-FIX trước khi dùng dữ liệu HuGo thật cho training/Kaggle

1. Chạy data/license/PII gate trên snapshot production thật và xác nhận privacy notice/legal basis cho việc dùng nội dung review vào AI; consent personalization hiện là technical gate, không thay thế legal review.
2. Không trộn test/development với production; giữ `AI_EXPORT_EVENT_ENVIRONMENT=production`, cutoff cố định, manifest/checksum và review thủ công trước upload private dataset.
3. Nếu số review HuGo thật chưa đủ hoặc phân bố sentiment/rating lệch, dùng dataset tiếng Việt có license rõ cho M2 và công bố HuGo review chỉ là evaluation/integration data; không tạo review giả rồi gọi là dữ liệu thật.

Không có MUST-FIX code blocker của Task 5 trước khi bắt đầu M2 research.

### DEFER đúng phạm vi

- moderation queue/UI đầy đủ, appeal và bulk tools; hiện có status, admin API và audit log;
- distributed rate limiting, anti-spam/abuse nâng cao và AI spam detection;
- review riêng cho Tour/Ticket và mapping tour-place phức tạp; runtime hiện chỉ có Place review;
- UI chỉnh sửa review phong phú/lịch sử version; owner update API đã có, UI hiện ưu tiên create/delete;
- reconciliation/dashboard cho cached Place rating trên legacy dataset lớn;
- sentiment/aspect model, summary và quality scoring — thuộc M2, chưa bắt đầu trong Task 5.

## 11. Xác nhận phạm vi an toàn

- Chỉ ghi vào `travelgo_ai_m0_test` sau database/sentinel/write-guard preflight.
- Không chỉnh sửa migration 01–08; checksum migration 08 vẫn `87980fcdf39c7fbf7e6641bb0219f64c727605ea8f8127f2ad6f62d4107d75f8` như Task 4.
- Không reset, DROP hoặc TRUNCATE database/bảng.
- Không ghi vào `travelgo_dev`, `travelgo_phase35_test` hoặc database khác.
- Không push GitHub, deploy, publish, upload Kaggle hoặc train model.
- Không tự bắt đầu Task 6/M2.
