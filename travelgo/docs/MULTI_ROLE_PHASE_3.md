# HuGo Travel — Báo cáo Giai đoạn 3

Ngày kiểm chứng: 2026-10-11
Phạm vi: local workspace, không push, không publish/deploy.

## 1. Kết quả

Giai đoạn 3 đã chuyển các production data path của Places, Tours, Tickets, Blogs, Booking, Trip Session, Recommendation và Tour Planner sang repository/Sequelize/PostgreSQL. Customer UI hiện hữu tiếp tục dùng các API cũ; Partner có workspace quản trị tài nguyên và booking; Super Admin có hàng chờ moderation.

PostgreSQL không khả dụng trong workspace (`localhost:5432` không mở và không có `psql`). Vì vậy migration, seed và integration test database **chưa được chạy**. Không có kết quả migration/database giả lập.

## 2. Database và migration

Migration mới: `database/migrations/20261011_03_persistent_travel_resources.sql`.

Migration này:

- mở rộng `places` với `business_id`, district, opening/contact JSONB và moderation status;
- tạo `tours` và bảng nối `tour_places`;
- mở rộng `tickets` với ownership, quan hệ Place/Tour, capacity, validity và active status;
- mở rộng `blog_posts` với ownership và moderation status;
- mở rộng `bookings` với FK tới Place/Tour/Ticket, quantity, discount, idempotency key và state machine viết hoa;
- tạo `booking_status_history`;
- tạo `trip_sessions`;
- giữ dữ liệu customer hiện có bằng default `APPROVED`, không hard delete, không reset database;
- dùng FK và CHECK constraints cho trạng thái, capacity, ngày và tiến độ;
- bao toàn migration trong transaction và dùng `IF NOT EXISTS`/kiểm tra constraint ở mức hợp lý.

Thứ tự cần chạy khi có PostgreSQL:

1. `20261010_01_init_travelgo_schema.sql`
2. `20261011_02_rbac_partner_foundation.sql`
3. `20261011_03_persistent_travel_resources.sql`
4. chạy seed và integration tests sau khi backup/verify schema.

### Index

- Place: `(business_id, status)`, `(status, created_at)`; giữ GIST location/category/city/Bayesian cũ.
- Tour: `(business_id, status)`, `(status, created_at)`, destination và tour-place.
- Ticket: `(business_id, status)`, `place_id`, `tour_id`.
- Blog: `(business_id, status)`, `(status, created_at)`.
- Booking: `(business_id, created_at)`, `(user_id, created_at)`, `(booking_status, created_at)`, Place/Tour/Ticket FK và unique partial idempotency key.
- Trip: `(user_id, created_at)`, `(user_id, status)`.
- Booking history và audit log có index theo entity/thời gian.

## 3. Models

Models mới:

- `Tour`
- `TripSession`
- `BookingStatusHistory`

Models mở rộng:

- `Place`
- `Ticket`
- `BlogPost`
- `Booking`

Associations đã nối Business–Place/Tour/Ticket/Blog, Tour–Place, User–Trip, Booking–status history và các quan hệ ownership hiện hữu.

## 4. Repositories

- `PlaceRepository`
- `TourRepository`
- `TicketRepository`
- `BlogRepository`
- `TripRepository`
- `RecommendationRepository`
- helper pagination/search/UUID-or-slug trong `repositories/query.ts`

Mọi list lớn phân trang server-side, giới hạn tối đa 100 bản ghi, hỗ trợ search/status/sort phù hợp. Public repositories tự áp bộ lọc `APPROVED` hoặc `ACTIVE`; slug không còn bị ép kiểu vào UUID.

## 5. Services và controllers

Các service Places/Tours/Tickets/Blogs/Booking/Trip/Stats đã bỏ in-memory store trong production path. RecommendationService giữ thuật toán thuần, RecommendationRepository chịu trách nhiệm lấy Place APPROVED từ database. Tour Planner lấy input qua repository này và giữ nguyên Bayesian/GIS/planning logic.

Controllers mới:

- `PartnerResourceController`: whitelist DTO cho Place/Tour/Ticket/Blog/Booking.
- `AdminResourceController`: list/detail/moderation.

Controllers customer hiện hữu được giữ endpoint và chuyển sang service database. Tọa độ được kiểm tra range; price/capacity/date và booking DTO được kiểm tra trước khi vào service.

## 6. API

### Public/Customer

- `GET /api/places`, `GET /api/places/:id`
- `GET /api/tours`, `GET /api/tours/:id`, `POST /api/tours/plan`
- `GET /api/tickets`, `GET /api/tickets/:id`
- `GET /api/blogs`, `GET /api/blogs/:id`
- `POST /api/bookings`, `GET /api/bookings/my`, `GET /api/bookings/:code`, `POST /api/bookings/:id/cancel`
- authenticated Trip CRUD/check-in/complete/blog draft dưới `/api/trips`

Public endpoints chỉ trả Place/Tour/Blog APPROVED và Ticket ACTIVE còn chỗ.

### Partner

- `/api/partner/places`: list/create/detail/update/submit
- `/api/partner/tours`: list/create/detail/update/submit
- `/api/partner/tickets`: list/create/detail/update
- `/api/partner/blogs`: list/create/detail/update/submit
- `/api/partner/bookings`: list/detail/status
- `/api/partner/dashboard`, `/api/partner/businesses`

### Super Admin

- `/api/admin/places`: list/detail/status
- `/api/admin/tours`: list/detail/status
- `/api/admin/blogs`: list/detail/status
- dashboard, partner applications, businesses và bookings hiện hữu.

## 7. Authorization và security

- Customer, Partner và Super Admin đều được kiểm tra role ở backend.
- Partner resource được resolve/check qua `BusinessMember`; `businessId` không nằm trong update whitelist và không thể đổi ownership.
- Partner booking bắt buộc thuộc Business có permission `MANAGE_BOOKINGS`.
- Customer booking/trip lấy owner từ token; bỏ qua user id, email, business id, service name, unit price và total do client gửi.
- Giá, discount, số lượng và tổng tiền được backend tính từ resource trong database.
- DTO mutation được whitelist tại controller; không spread request body trực tiếp vào resource nhạy cảm.
- Admin moderation và booking status quan trọng tạo Audit Log.
- Không hard delete Place/Tour; thao tác xóa tương thích được chuyển thành `SUSPENDED`.
- Idempotency key hạn chế duplicate submit booking.
- Backend fail-fast nếu PostgreSQL không kết nối; health check trả HTTP 503 thay vì báo database giả thành công.
- API ownership chống IDOR; frontend route guard chỉ đóng vai trò UX.

## 8. Booking state machine và transaction

Transition hợp lệ:

- `PENDING → CONFIRMED | REJECTED | CANCELLED`
- `CONFIRMED → COMPLETED | CANCELLED`
- `CANCELLED`, `COMPLETED`, `REJECTED` là terminal.

Booking creation chạy trong transaction, khóa row Ticket/Tour trước khi kiểm tra và trừ capacity. Status update cũng khóa booking, ghi history + audit trong cùng transaction và hoàn inventory khi cancel/reject. Điều này ngăn hai booking cùng tiêu thụ chỗ cuối.

## 9. UI và routes

Partner (teal):

- `/partner/places`, `/partner/places/new`, `/partner/places/:id`, `/partner/places/:id/edit`
- routes tương ứng cho Tours, Tickets và Blogs
- `/partner/bookings`, `/partner/bookings/:id`
- search, status filter, pagination, image URL/gallery management, coordinate preview qua OpenStreetMap, submit moderation và lỗi API thật.

Admin (navy):

- `/admin/places`, `/admin/places/:id`
- `/admin/tours`, `/admin/tours/:id`
- `/admin/blogs`, `/admin/blogs/:id`
- xem Business sở hữu, approve/reject/suspend và nhập lý do.

Customer UI không redesign. Booking client chỉ gửi product id, date, phone và quantity/passenger count. AppRouter dùng `React.lazy`/dynamic imports cho layouts và page modules; build tạo chunk riêng cho Map, Tour Planner, Admin và Partner.

## 10. Dashboard

Admin dashboard query database cho Customer, Partner, Partner pending, Business, Place, Place pending, Tour/Tour pending, Booking theo trạng thái, revenue và Blog pending.

Partner dashboard query đúng Business đang chọn: Place, Tour, Ticket, Blog, Booking total/pending/confirmed/completed và completed revenue.

## 11. Seed

Giữ nguyên 7 tài khoản kiểm thử. Seed bổ sung dữ liệu Place thuộc hai Business khác nhau, Tour, Ticket, Blog pending và Booking để kiểm tra isolation. Password seed lấy từ `SEED_PASSWORD` hoặc giá trị test hiện hữu; seed không được gọi trong production startup.

Seed **chưa chạy** vì database không khả dụng.

## 12. Tests và build

Kết quả local:

- Backend `npm run build`: PASS.
- Frontend `npm run build`: PASS, TypeScript + Vite production build.
- RBAC/booking test: PASS — authentication, role guard, customer booking ownership, partner business isolation, public visibility filters, server price, capacity và invalid transition.
- Algorithm test: 11/11 PASS — Bayesian, GIS, Recommendation và Tour Planner.
- `git diff --check`: PASS (chỉ có cảnh báo line-ending LF/CRLF, không có whitespace error).
- `npm audit --omit=dev --audit-level=high`: không có high/critical ở backend hoặc frontend.

Chưa thể chạy: migration execution, seed runtime, schema introspection và PostgreSQL integration/concurrency test thực tế.

## 13. Mock đã loại bỏ và mock còn lại

Không còn mock/in-memory trong production path của Places, Tours, Tickets, Blogs, Booking hoặc Trip. Recommendation/Tour Planner production loader dùng PostgreSQL repository.

`backend/src/utils/mockData.ts` còn tồn tại **chỉ làm fixture cho algorithm unit tests** qua test-only injected loader. Favorites frontend vẫn dùng localStorage vì không thuộc các module persistence bắt buộc của Giai đoạn 3. Token/session frontend tiếp tục dùng localStorage theo kiến trúc authentication hiện tại.

## 14. Technical debt

- Cần chạy migration + seed + integration tests trên PostgreSQL/PostGIS thật trước khi gọi runtime database rollout hoàn tất.
- Image management hiện dùng danh sách URL theo kiến trúc có sẵn; chưa có object storage/binary upload pipeline.
- Nên bổ sung test HTTP integration bằng database test cô lập và test concurrency hai connection thật.
- Error envelope cũ vẫn là `{ success, message, code }` để tránh breaking change; chưa chuyển toàn bộ sang nested `error`.
- `npm audit` còn 2 moderate backend (`sequelize → uuid`) và 2 moderate frontend (`react-router`). Fix tự động đề xuất breaking version change, cần nâng cấp có kế hoạch và regression test.
- Một số menu nền tảng cũ chưa có backend vẫn dẫn tới trang “Chưa triển khai”; không phát success giả.

## 15. Đề xuất Giai đoạn 4

1. Dựng PostgreSQL/PostGIS test, backup, chạy lần lượt 3 migrations và verify constraint/index.
2. Chạy seed, API integration/E2E và concurrency test booking bằng hai transaction độc lập.
3. Nâng Sequelize/React Router có kiểm soát để xử lý advisory moderate.
4. Thêm object storage + signed upload cho media, image moderation và cleanup.
5. Hoàn thiện audit viewer, notification/email workflow và observability.
6. Chỉ sau khi các bước trên ổn định mới cân nhắc payment gateway; không triển khai payment trong Phase 3.
