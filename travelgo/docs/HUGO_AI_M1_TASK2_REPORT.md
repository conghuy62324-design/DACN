# HuGo Intelligence 2.0 — M1 Task 2 Execution Report

Ngày thực hiện: 2026-10-12  
Phạm vi: User Behavior Events & Telemetry Foundation  
Kết luận: **COMPLETE**

## 1. Phạm vi và nguyên tắc an toàn

- Chỉ sử dụng PostgreSQL/PostGIS local `travelgo_ai_m0_test` tại `127.0.0.1:5432`.
- Database có sentinel `hugotravel-isolated-test-database-v1`; mọi test có ghi dữ liệu yêu cầu đồng thời `ALLOW_TEST_DB_WRITES=true` và `TEST_DATABASE_NAME=travelgo_ai_m0_test`.
- Không kết nối, migration, seed hoặc sửa `travelgo_dev` và `travelgo_phase35_test`.
- Không DROP, TRUNCATE, reset database hay xóa volume.
- Không push, deploy, publish hoặc upload dữ liệu lên Kaggle.
- Mật khẩu fixture được tạo ngẫu nhiên trong tiến trình test, không hard-code, không in ra console và không ghi vào báo cáo.

## 2. Database và migration

Migration mới: `20261012_05_user_behavior_telemetry.sql`.

Quy trình đã thực hiện:

1. Xác minh container `travelgo_postgres` dùng image `postgis/postgis:15-3.4-alpine`, trạng thái healthy và publish cổng local 5432.
2. Xác minh current database và sentinel.
3. Xác minh 4 migration 01–04 đã được tracking bằng checksum.
4. Chạy migration runner ở chế độ DRY RUN; target hiển thị đúng `travelgo_ai_m0_test`.
5. Apply với explicit opt-in; 01–04 được `SKIP`, chỉ 05 được `APPLIED`.
6. Chạy schema verifier sau apply.

Kết quả schema:

- PostgreSQL/PostGIS: **PASS**, PostGIS `3.4.3`.
- Migration tracking: **PASS**, 5 migration.
- Application tables: **PASS**, 19 bảng.
- Foreign keys: **PASS**, 29 khóa ngoại.
- Index/check constraints telemetry: **PASS**.
- 8 event có trước migration được giữ nguyên, gắn `origin=LEGACY`; không mất dữ liệu.

Migration 05 bổ sung:

- Bảng `user_telemetry_consents` lưu consent phía server theo `user_id`.
- Các cột event: `contract_version`, `client_event_id`, `environment`, `ui_surface`, `origin`, `personalization_allowed`, `expires_at`.
- Unique partial index cho `client_event_id`.
- Index retention và training eligibility.
- Check constraints cho version, environment, origin, kích thước context, client identity và retention.
- Mở rộng `item_type` tương thích ngược để hỗ trợ `booking` và `trip`; không thay đổi dữ liệu cũ.

## 3. Event contract 1.0

`POST /api/intelligence/events` yêu cầu authentication và contract:

| Trường | Quy tắc |
|---|---|
| `contractVersion` | Bắt buộc, chỉ nhận `1.0` |
| `clientEventId` | UUID bắt buộc, idempotency key |
| `sessionId` | 8–120 ký tự, ký tự an toàn |
| `requestId` | UUID tùy chọn; chỉ nhận nếu khớp impression thật đã lưu |
| `itemId` | UUID canonical của resource |
| `itemType` | `place`, `hotel`, `restaurant`, `tour`, `ticket`, `blog`, `trip` cho client |
| `eventType` | Client allowlist: `VIEW`, `CLICK`, `FAVORITE`, `UNFAVORITE`, `ADD_TO_TRIP`, `REMOVE_FROM_TRIP`, `MAP_OPENED`, `ROUTE_VIEWED` |
| `occurredAt` | ISO timestamp; chống replay: không quá 15 phút trước và 1 phút sau server |
| `uiSurface` | Allowlist surface của HuGo UI |
| `context` | Allowlist, tối đa 2 KB; không nhận field tùy ý |

Các trường `userId`, `role(s)`, `businessId`, `environment`, `source`, `origin`, `personalizationAllowed`, `expiresAt` bị từ chối nếu client gửi. `user_id` lấy từ access token; environment/source/origin/retention do server quyết định.

Server kiểm tra resource tồn tại và visibility:

- Place/hotel/restaurant phải `APPROVED`; subtype hotel/restaurant phải khớp category.
- Tour phải `APPROVED`.
- Ticket phải `ACTIVE`.
- Blog phải `APPROVED`.
- Trip phải thuộc user đang đăng nhập.
- Client không được tạo booking event.

## 4. Producers đã kết nối

### Frontend

- `VIEW`: Place Detail và Tour Detail; target phải hiển thị ít nhất 50% liên tục 2 giây, tab phải visible, và chỉ ghi một lần mỗi session/item/surface.
- `CLICK`: Home Featured, Explore result, Tour list và CTA mở booking từ trang chi tiết.
- `FAVORITE`/`UNFAVORITE`: phát từ thao tác localStorage hiện có, luôn gắn `context.localFavoriteOnly=true`. Đây chỉ là telemetry, không được coi là nguồn sự thật lâu dài.
- Session ID sinh bằng `crypto.randomUUID()` và chỉ nằm trong `sessionStorage`.
- Frontend không tự tạo `requestId`; Task 2 không khẳng định attribution khi chưa có impression thật.

### Backend

- `BOOKING_CREATED` được tạo trong cùng transaction đã tạo Booking và BookingStatusHistory.
- `BOOKING_CONFIRMED`, `BOOKING_COMPLETED`, `BOOKING_CANCELLED` được tạo trong transaction chuyển trạng thái đã xác minh.
- Retry booking bằng idempotency key không tạo lại booking event.
- Booking telemetry chỉ được ghi khi chủ booking đã bật analytics.

## 5. Consent, opt-out và retention

- Default là opt-out: chưa có consent row thì event trả `202` với `recorded=false`, không ghi DB.
- `GET /api/intelligence/consent`: đọc trạng thái do server lưu.
- `PUT /api/intelligence/consent`: bật/tắt analytics và personalization; personalization không thể bật khi analytics tắt.
- UI cho ba lựa chọn: cá nhân hóa, chỉ analytics, hoặc từ chối/xóa event của chính user.
- Khi opt-out kèm `deleteExistingEvents=true`, chỉ event của user token hiện tại bị xóa; consent row vẫn còn để tắt ghi tương lai.
- Retention: 90 ngày; event mới có `expires_at` do server đặt.
- Có lệnh `telemetry:purge`, nhưng yêu cầu sentinel, exact DB opt-in và thêm `ALLOW_TELEMETRY_PURGE=true`. Lệnh purge **không được chạy trong Task 2**.
- AI export yêu cầu migration 05 và chỉ xuất event `personalization_allowed=true`, đúng environment, chưa hết hạn. Event `LEGACY`, opt-out hoặc khác environment bị loại khỏi tập train.
- Context không nhận raw GPS, email, JWT, phone hoặc payload tự do. AI export tiếp tục pseudonymize user/session bằng HMAC và redact PII dạng text.

## 6. Idempotency và anti-abuse

- Unique index chống trùng `client_event_id` ở PostgreSQL.
- Retry cùng ID và cùng payload trả duplicate, không tạo row thứ hai.
- Tái sử dụng ID cho payload/user khác trả `409 CLIENT_EVENT_ID_CONFLICT`.
- Fixed-window rate limit: 120 event/user/phút.
- Cửa sổ timestamp chống replay.
- Context allowlist và giới hạn 2 KB ở application; database có constraint 2 KB.
- VIEW có visibility/dwell guard và session dedup, không phát từ React render.
- Request attribution bị từ chối nếu `requestId`, item, session và user không khớp impression đã lưu.

## 7. Kết quả kiểm thử

| Nhóm | Kết quả | Bằng chứng |
|---|---|---|
| Backend TypeScript build | **PASS** | `npm run build` |
| Frontend production build | **PASS** | `npm run build`, Vite 1724 modules |
| Telemetry unit | **PASS** | 8 checks: contract, spoofing, VIEW dwell, raw GPS/context, booking client event, rate limit |
| RBAC/unit | **PASS** | Auth, RBAC, booking ownership, business isolation, server price/capacity/transitions |
| Algorithm/M1 Task 1 | **PASS** | 14/14, gồm preference allowlist và Save Trip compatibility |
| HTTP/PostgreSQL telemetry | **PASS** | 30 checks: auth, consent, duplicate/conflict, spoofing, invalid item, fake attribution, opt-out/delete, booking transaction event |
| Full PostgreSQL integration | **PASS** | 14 groups: RBAC, partner moderation, booking idempotency/concurrency/rollback, business isolation, planner, Trip preferences |
| Schema verification | **PASS** | 5 migrations, 19 app tables, 29 FKs, PostGIS 3.4.3 |
| Playwright E2E | **PASS** | 3/3: CUSTOMER, PARTNER, SUPER_ADMIN; Customer includes consent, real VIEW/FAVORITE API, booking và Save Trip refresh |
| PostgreSQL E2E evidence | **PASS** | Có CLIENT `VIEW`/`FAVORITE`, SERVER `BOOKING_CREATED`/`BOOKING_CONFIRMED`, environment `test`, personalization flag đúng |
| `git diff --check` | **PASS** | Không có whitespace error; chỉ có cảnh báo line-ending của Git trên Windows |

Lỗi phát hiện và đã sửa:

- Endpoint cũ tin `source`, cho item giả và không có consent/idempotency: thay bằng contract 1.0 và server validation.
- VIEW hook chạy khi loading screen còn tồn tại nên không thấy DOM target: chỉ kích hoạt hook sau khi nội dung thật render.
- IntersectionObserver restart timer khi layout thay đổi: timer chỉ reset khi item không còn đủ visibility.
- Favorite telemetry từng nằm trong React state updater: chuyển side effect ra ngoài updater để tránh Strict Mode gọi lặp.
- Integration test Phase 3.5 còn dùng contract event cũ: cập nhật sang auth + consent + UUID canonical.

## 8. File chính thay đổi trong Task 2

Backend/database:

- `database/migrations/20261012_05_user_behavior_telemetry.sql`
- `backend/src/models/TelemetryConsent.ts`
- `backend/src/models/UserEvent.ts`
- `backend/src/services/telemetryService.ts`
- `backend/src/controllers/intelligenceController.ts`
- `backend/src/routes/intelligenceRoutes.ts`
- `backend/src/services/bookingService.ts`
- `backend/src/scripts/verifyDatabase.ts`
- `backend/src/scripts/exportAiDataset.ts`
- `backend/src/scripts/purgeExpiredTelemetry.ts`
- `backend/src/tests/telemetry.test.ts`
- `backend/src/tests/intelligence.postgres.test.ts`
- `backend/src/tests/integration.postgres.test.ts`

Frontend/E2E:

- `frontend/src/services/telemetryService.ts`
- `frontend/src/context/TelemetryContext.tsx`
- `frontend/src/components/common/TelemetryConsent.tsx`
- `frontend/src/hooks/useTelemetryView.ts`
- `frontend/src/context/FavoritesContext.tsx`
- Place/Tour/Explore/Home tracking integration files
- `frontend/e2e/roles.spec.ts`

## 9. Rủi ro còn lại

- Rate limiter hiện nằm trong memory của một backend process. Khi chạy nhiều instance cần Redis/API gateway rate limit tập trung.
- Retention purge đã có guard và command nhưng chưa có scheduler; production cần cron/job có monitoring và audit.
- Anonymous visitor không được track. Đây là lựa chọn privacy-by-default của Task 2; không nên thêm anonymous identity trước khi có thiết kế consent server-verifiable.
- Favorite vẫn là localStorage và không phải nguồn sự thật; server-side Favorites là task riêng.
- Event LEGACY được giữ để không phá dữ liệu nhưng bị loại khỏi training export vì thiếu consent provenance.

## 10. Phần còn lại cho M1 Task 3 — Recommendation Impressions

- Tạo request ID ở recommendation service phía server cho từng response thực.
- Ghi toàn bộ ranked list, rank, score breakdown, model/version và eligible candidate set trong cùng request.
- Chỉ đánh dấu impression khi item thật sự được render/visible theo quy tắc thống nhất; không coi response API là impression UI.
- Liên kết click/conversion với impression thật và attribution window; không backfill requestId giả.
- Thiết kế fallback/control cohort, propensity/exploration metadata và metric offline/online.
- Thêm retention/consent cho impression, integration/E2E tests và export contract tương ứng.

Không triển khai Learning-to-Rank, PhoBERT, AI Chat hoặc training model trong Task 2.
