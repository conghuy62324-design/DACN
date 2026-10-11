# HuGo Travel — Phase 3.5: Database Integration & End-to-End Verification

**Ngày kiểm tra:** 2026-10-11
**Phạm vi:** local/test trong workspace; không production, không deploy/publish, không push GitHub.
**Kết luận:** **PHASE 3.5 COMPLETE** — các luồng nghiệp vụ trọng yếu Phase 1–3 đã chạy thành công trên PostgreSQL/PostGIS thật, gồm migration, seed, HTTP integration, concurrency/security và E2E ba vai trò không mock API.

Không database, schema, table, volume hoặc record hiện hữu nào bị xóa/reset/truncate. Các thao tác “delete” của Partner được triển khai dưới dạng soft-delete (`SUSPENDED` hoặc `INACTIVE`) để giữ dữ liệu kiểm toán.

## 1. Môi trường database

| Hạng mục | Trạng thái | Kết quả thực tế |
|---|---|---|
| Docker Desktop | PASS | Docker Desktop 4.94.0, Engine 29.8.2, Compose v5.5.1. |
| PostgreSQL/PostGIS | PASS | `travelgo_postgres`, image `postgis/postgis:15-3.4-alpine`, PostgreSQL 15.8, container healthy, port local 5432. |
| pgAdmin | PASS | `travelgo_pgadmin`, port local 5050. |
| Database hiện hữu | PASS — read-only | `travelgo_dev`; 3 migration được tracking với checksum hợp lệ; 15 bảng ứng dụng hiện hữu; tổng dữ liệu nghiệp vụ được kiểm tra ban đầu là 0. Không thay đổi database này. |
| Database test độc lập | PASS | Tạo mới `travelgo_phase35_test` từ `template_postgis`; chỉ database này được migrate, seed và dùng cho test. |
| Production isolation | PASS | `NODE_ENV=test`, host loopback, tên DB có marker test, `DB_SSL=false`; không dùng credential/host production. |

Không backup `travelgo_dev` vì kiểm tra read-only xác nhận không có record nghiệp vụ và không có thao tác ghi nào được thực hiện trên database này. Migration runner vẫn fail-closed với schema không rỗng nhưng chưa tracking.

## 2. Migration đã thực thi

Thứ tự chạy trên `travelgo_phase35_test`:

1. `20261010_01_init_travelgo_schema.sql`
2. `20261011_02_rbac_partner_foundation.sql`
3. `20261011_03_persistent_travel_resources.sql`

| Migration | SHA-256 trong `schema_migrations` | Kết quả |
|---|---|---|
| `20261010_01_init_travelgo_schema.sql` | `fe7defe5c3c47c9230fe7c43fc301255a6bc0e998da71aba0fe2f747f9e52d50` | PASS |
| `20261011_02_rbac_partner_foundation.sql` | `df7fd60cccf17d3f8a73f711825bb1e82a4606a17c42fce4c7fa214548c2cecd` | PASS |
| `20261011_03_persistent_travel_resources.sql` | `1c4464625e57e27cadc560077fad83837b56c5385d8021e0592fdcb9039fabf7` | PASS |

Runner được chạy dry-run trước, sau đó apply. Mỗi migration chạy trong transaction, có advisory lock, checksum ledger và rollback khi lỗi. Nhánh `--force` từng có khả năng drop schema đã bị loại bỏ; alias `db:migrate:force` cũng bị xóa. Runner hiện chỉ hướng dẫn audit/backup hoặc tạo database test mới khi gặp untracked non-empty schema.

## 3. Schema verification

`npm run db:verify` trên database test trả:

```json
{
  "database": "travelgo_phase35_test",
  "user": "postgres",
  "postgis": "3.4.3",
  "migrations": 3,
  "applicationTables": 15,
  "foreignKeys": 26,
  "result": "PASS"
}
```

Các kiểm tra đã PASS:

- PostGIS extension và `places.location` kiểu `geometry`;
- đủ 15 bảng ứng dụng và 3 migration có checksum;
- 26 foreign keys;
- các check constraint trọng yếu cho resource status, ticket capacity, booking quantity/amount/status;
- index GiST vị trí, booking idempotency, business/status và trip/user;
- `bookings.booking_date` và `return_date` dùng PostgreSQL `DATE`;
- Sequelize model khớp tên cột `price_vnd`, `total_budget_vnd`, `estimated_cost_vnd`, `actual_spent_vnd`;
- transaction rollback thật được xác nhận qua lần seed lỗi và booking idempotency race.

## 4. Seed results

Seed có guard bắt buộc: loopback, database test/dev, không production, không SSL target, `SEED_PASSWORD` explicit dài tối thiểu 12 ký tự và không log secret.

Hai lỗi runtime ban đầu đều rollback sạch:

1. TypeScript public class fields che Sequelize accessors, làm `user.id` thành `undefined` — sửa bằng `useDefineForClassFields: false`; sau rollback xác nhận `users=0`, `user_roles=0`.
2. Sequelize suy diễn `priceVND` thành `price_v_n_d` — thêm mapping `field` tường minh cho các cột VND.

Lần seed cuối PASS. Snapshot ngay sau seed:

| Bảng / role | Số lượng |
|---|---:|
| users | 7 |
| user_roles | 12 |
| businesses | 4 |
| business_members | 4 |
| places | 2 |
| tours | 1 |
| tickets | 1 |
| blog_posts | 1 |
| bookings | 1 |
| CUSTOMER roles | 7 |
| PARTNER roles | 4 |
| SUPER_ADMIN roles | 1 |

Tài khoản seed được xác minh bằng login thật trong HTTP/E2E. Sau các test, query cuối vẫn xác nhận đúng **1** `SUPER_ADMIN`; migration, đăng ký Customer và duyệt Partner không tạo thêm quyền admin.

## 5. HTTP integration results

`npm run test:integration`: **PASS — 12/12 nhóm kiểm tra**, Express chạy trên loopback random port và kết nối PostgreSQL thật. Mỗi bước kiểm tra HTTP status và record/ownership trực tiếp bằng Sequelize/PostgreSQL.

1. health check xác nhận database connected;
2. Customer register/login; anonymous 401, sai role 403;
3. Customer gửi Partner application; field `status`, `userId`, `reviewedBy` giả mạo bị bỏ;
4. Super Admin approve; Business, BusinessMember, PARTNER role và AuditLog được tạo atomically;
5. Partner tạo Place, Partner khác PATCH/DELETE đều 403, submit, Admin approve, public đọc được;
6. Partner tạo Tour, submit, Admin approve, public search được;
7. Partner tạo Ticket;
8. Booking idempotency và rollback unique race;
9. hai Customer tranh ghế cuối, không oversell;
10. Partner confirm Booking, Customer đọc trạng thái;
11. Recommendation và Tour Planner dùng Place/Tour thật từ database;
12. Trip lưu/mở lại, ownership isolation và số lượng admin/audit được xác minh.

Các log 401/403/404/409 có stack trace trong test output là response âm được chủ động mong đợi, không phải test failure.

## 6. Concurrency results

| Kịch bản | Kết quả |
|---|---|
| Hai request đồng thời cùng idempotency key | PASS — cùng booking ID, đúng 1 record, inventory giảm đúng một lần. |
| Unique race sau khi khóa inventory | PASS — transaction thua race rollback trước khi đọc/trả booking đã commit. |
| Hai Customer tranh ghế cuối | PASS — đúng một HTTP 201, một HTTP 409, inventory về 0, không âm, đúng một booking. |
| Server-owned price/business/email | PASS — giá, `business_id` và email lấy từ Ticket/token/DB; client không giả mạo được. |
| Transaction lỗi | PASS — không để lại mutation dở dang trong seed hoặc booking race. |

## 7. Security findings

| Finding | Kết quả |
|---|---|
| Untracked non-empty schema | FIXED — fail-closed; không còn nhánh drop schema/`--force`. |
| Partner A sửa/xóa mềm tài nguyên Partner B | PASS — PATCH và DELETE trả 403 bằng business ownership guard. |
| Customer đọc Booking/Trip người khác | PASS — trả 404 để không lộ sự tồn tại record. |
| Giả mạo booking price, email, `business_id` | PASS — field server-owned. |
| Unauthorized / forbidden | PASS — 401/403 đúng ngữ nghĩa. |
| Partner application mass-assignment | FIXED + PASS. |
| Seed tạo quyền admin ngoài ý muốn | PASS — đúng một `SUPER_ADMIN`. |
| Physical delete trong Partner CRUD | PREVENTED — DELETE chỉ chuyển `SUSPENDED`/`INACTIVE`, record được giữ lại. |
| CORS E2E | PASS — chỉ whitelist origin test `http://127.0.0.1:3000`, không mở wildcard. |

## 8. Frontend E2E

Playwright 1.64 chạy Edge headless đã cài sẵn, backend/frontend thật và database `travelgo_phase35_test`; không mock API success. Kết quả cuối: **PASS — 3/3 tests, 25.8 giây**.

### CUSTOMER — PASS

- đăng ký, login đúng/sai mật khẩu;
- error state 401, loading skeleton và empty state;
- xem Place/Tour/Ticket đã duyệt;
- booking thật và xem lại Booking;
- Tour Planner tạo itinerary từ DB, lưu Trip, reload URL và session;
- viewport mobile 390×844, không horizontal overflow.

### PARTNER — PASS

- login và Dashboard;
- Create/Read/Update Place, Tour, Ticket, Blog;
- submit Place/Tour/Blog;
- xử lý Booking PENDING → CONFIRMED;
- Delete qua UI cho cả bốn resource dưới dạng soft-delete, xác nhận `SUSPENDED`/`INACTIVE`.

### SUPER_ADMIN — PASS

- login và Dashboard;
- duyệt Partner application;
- duyệt Place/Tour/Blog;
- public UI nhìn thấy nội dung sau duyệt.

Audit Log UI chưa được Phase 1–3 triển khai nên browser assertion cho màn hình này là **N/A**; AuditLog record/count đã được xác minh ở HTTP integration. Thiết kế auth hiện tại không có refresh-token endpoint; frontend lưu access token, gọi `/auth/me` khi reload và xóa session khi 401. Session reload thực tế đã PASS trong Customer E2E.

## 9. Dependency security

### Frontend

Trước sửa: 5 high và 4 moderate, chuỗi high đi qua Tailwind 3 → `fast-glob`/`micromatch`/`braces`.

Đã migrate có kiểm soát sang Tailwind 4.3.3 và `@tailwindcss/vite` 4.3.3, chuyển CSS sang `@import "tailwindcss"`, giữ config bằng `@config`, gỡ PostCSS/autoprefixer cũ. Production build và toàn bộ E2E PASS sau migration.

Kết quả cuối `npm audit --audit-level=high`: **PASS, exit 0; 0 high**. Còn 2 moderate thuộc React Router 6; auto-fix yêu cầu React Router 7 major nên không dùng `--force` trong Phase 3.5.

### Backend

`npm audit --audit-level=high`: **PASS, exit 0; 0 high**. Còn 2 moderate qua `sequelize -> uuid`; đề xuất tự động là breaking downgrade Sequelize nên không áp dụng.

## 10. Lỗi phát hiện và cách khắc phục

1. Migration runner có nhánh destructive `--force` → loại bỏ hoàn toàn và xóa npm alias.
2. Sequelize accessor bị public class fields che → `useDefineForClassFields: false`.
3. Tên cột VND bị suy diễn sai → mapping `field` tường minh.
4. Booking `DATE` lệch model → dùng `DATEONLY`.
5. Concurrent idempotency có thể trả 500 → xử lý `UniqueConstraintError` sau rollback và đọc record đã commit.
6. Partner application nhận field ngoài whitelist → whitelist và identity từ token.
7. Frontend có 5 high dependencies → Tailwind 4/Vite plugin migration, 0 high sau audit.
8. Playwright origin `127.0.0.1` bị CORS từ chối → cấu hình whitelist origin local test, không nới chính sách production.
9. Partner CRUD thiếu Delete → bổ sung soft-delete có ownership guard cho Place/Tour/Ticket/Blog.
10. Ticket edit bị browser chặn vì ISO timestamp không hợp lệ với `datetime-local` → chuẩn hóa thành `YYYY-MM-DDTHH:mm` khi nạp form.
11. Form thiếu selector/accessibility ổn định → thêm `name`, `data-testid`, `aria-label` cần thiết; không thay đổi contract nghiệp vụ.

## 11. Ma trận kiểm tra cuối

| Nhóm | Trạng thái | Bằng chứng |
|---|---|---|
| Docker/PostGIS connectivity | PASS | Container healthy; PostgreSQL 15.8/PostGIS 3.4.3. |
| Migration dry-run/apply | PASS | 3/3 migration, checksum khớp. |
| Schema verification | PASS | 15 bảng, 26 FK, PostGIS/types/indexes/constraints. |
| Seed | PASS | 7 users, 4 businesses, đúng role snapshot; rollback lỗi sạch. |
| Backend build | PASS | `tsc`, exit 0. |
| Frontend production build | PASS | `tsc && vite build`, 1,719 modules, exit 0. |
| RBAC/booking unit | PASS | exit 0. |
| Algorithm/GIS unit | PASS | 11/11. |
| HTTP integration | PASS | 12/12 trên PostgreSQL thật. |
| Database concurrency | PASS | idempotency, rollback, last-seat race. |
| Security/business isolation | PASS | 401/403/404, anti-spoofing, cross-business PATCH/DELETE. |
| Playwright E2E | PASS | 3/3; Customer, Partner full CRUD, Super Admin. |
| Backend audit high | PASS | 0 high; 2 moderate còn lại. |
| Frontend audit high | PASS | 0 high; 2 moderate còn lại. |
| `git diff --check` | PASS | Không có whitespace error; cảnh báo line-ending Windows nếu có không phải lỗi diff. |

## 12. Trạng thái dữ liệu và bước còn lại

- `travelgo_dev` không bị thay đổi và vẫn có 0 record nghiệp vụ tại lần kiểm tra cuối.
- `travelgo_phase35_test` giữ nguyên toàn bộ seed/test records để truy vết; không cleanup bằng delete/truncate/reset theo yêu cầu.
- Playwright report/trace được ignore khỏi Git; không publish.
- Không push GitHub, không deploy, không publish website.

Không còn kiểm thử trọng yếu Phase 3.5 bị BLOCKED. Các việc không chặn Phase 4: thiết kế/migrate React Router 7 để xử lý 2 moderate frontend, theo dõi bản vá dependency `uuid` phía Sequelize, và xây Audit Log UI nếu Phase 4 yêu cầu.

## 13. Điều kiện chuyển Phase 4

Các điều kiện trọng yếu đều đạt:

- migration/schema/seed PASS trên PostgreSQL/PostGIS cô lập;
- business flows, recommendation, planner và Trip persistence PASS trên database thật;
- concurrency/idempotency/rollback/no-oversell PASS;
- ownership/RBAC/anti-spoofing/admin-count PASS;
- E2E Customer/Partner/Super Admin PASS không mock API;
- 0 high vulnerability ở cả backend và frontend;
- build/unit/integration/E2E/repository checks PASS.

**HuGo Travel sẵn sàng chuyển sang Phase 4 trong môi trường local/test.**

## 14. Phụ lục HuGo Intelligence (2026-10-11)

Sau khi Phase 3.5 hoàn tất, database test cô lập được bổ sung migration additive `20261011_04_hugo_intelligence_foundation.sql`. Migration này chỉ tạo ba bảng `user_events`, `recommendation_impressions`, `ai_model_registry` cùng constraint/index; không xóa, reset, truncate hoặc sửa record cũ. Dry-run xác nhận đúng `travelgo_phase35_test`, apply chỉ chạy migration 04 và bỏ qua ba migration đã tracking.

Schema verification sau thay đổi: **PASS** — 4 migrations, 18 application tables, 28 foreign keys, PostGIS 3.4.3. Script export AI chạy trong transaction read-only, có test-database guard, bắt buộc salt, ẩn danh user và không xuất Google Maps Content. Hướng dẫn và trạng thái AI tiếp theo được quản lý riêng tại `docs/HUGO_INTELLIGENCE_KAGGLE_GUIDE.md`; phụ lục này không thay đổi kết luận kiểm thử Phase 3.5 trước đó.
