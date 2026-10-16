# HuGo Intelligence 2.0 — M0 Execution Report

> Milestone: M0 — Reproducible Test Baseline & Data Governance  
> Ngày thực hiện: 2026-10-12 (Asia/Ho_Chi_Minh)  
> Kết luận: **M0 PASS**  
> Trạng thái AI production/training: **CHƯA SẴN SÀNG — chuyển các khoảng trống dữ liệu sang M1**

## 1. Phạm vi và nguyên tắc an toàn

M0 đã hoàn thành baseline có thể tái lập trên PostgreSQL/PostGIS local cô lập. Không push GitHub, deploy, publish, upload Kaggle hoặc kết nối production.

Các database được bảo vệ:

- `travelgo_phase35_test`: chỉ truy vấn read-only để đối chiếu fingerprint;
- `travelgo_dev`: chỉ truy vấn read-only để đối chiếu fingerprint;
- không chạy migration, seed, test ghi dữ liệu, `DROP`, `TRUNCATE`, `RESET` hoặc sửa credential trên hai database này.

Database được phép ghi duy nhất:

- `travelgo_ai_m0_test`;
- được xác nhận chưa tồn tại trước khi tạo;
- được tạo trong container PostgreSQL local `travelgo_postgres`;
- được giữ lại sau kiểm thử theo yêu cầu, không xóa database.

## 2. Database target và safety verification

### 2.1 Môi trường local

| Thành phần | Bằng chứng | Kết quả |
|---|---|---|
| PostgreSQL/PostGIS | container `travelgo_postgres`, image `postgis/postgis:15-3.4-alpine` | PASS — healthy |
| Cổng PostgreSQL | Docker publish `127.0.0.1/localhost:5432 -> 5432` | PASS — local |
| PostgreSQL | 15.8, `pg_is_in_recovery() = false` | PASS |
| PostGIS | 3.4.3 | PASS |
| pgAdmin | container `travelgo_pgadmin`, port local 5050 | PASS |
| Data volume | Docker named volume hiện hữu | PASS — không xóa/ghi đè volume |

`.env` mặc định vẫn trỏ `travelgo_dev` và không được sửa. Mọi lệnh M0 có ghi đều override biến môi trường ở cấp process với `DB_NAME=travelgo_ai_m0_test`.

### 2.2 Sentinel và explicit opt-in

Đã bổ sung fail-closed guard cho migration apply, seed, PostgreSQL integration tests và server dùng cho E2E:

1. `NODE_ENV` không được là production;
2. host phải là loopback;
3. tên database phải có segment `test` hoặc `dev`;
4. `DB_SSL` không được bật;
5. phải có `ALLOW_TEST_DB_WRITES=true`;
6. `TEST_DATABASE_NAME` phải khớp tuyệt đối với `DB_NAME`;
7. database đang kết nối phải có comment sentinel chính xác `hugotravel-isolated-test-database-v1`.

Sentinel thực tế:

```text
database_name: travelgo_ai_m0_test
sentinel: hugotravel-isolated-test-database-v1
```

Negative tests:

| Trường hợp | Kết quả |
|---|---|
| Migration apply thiếu `ALLOW_TEST_DB_WRITES=true` | PASS — bị từ chối trước khi kết nối ghi |
| `TEST_DATABASE_NAME` không khớp `DB_NAME` | PASS — bị từ chối trước khi kết nối ghi |
| Server E2E bật test-write mode | PASS — xác minh target và sentinel trước khi listen |

### 2.3 Fingerprint hai database cũ sau kiểm thử

Các truy vấn sau chạy trong `BEGIN TRANSACTION READ ONLY`:

| Database | Migrations | Users | Places | Trips | Trạng thái |
|---|---:|---:|---:|---:|---|
| `travelgo_phase35_test` | 4 | 21 | 9 | 8 | Không chạy lệnh ghi |
| `travelgo_dev` | 3 | 0 | 0 | 0 | Không chạy lệnh ghi |

## 3. Migration và schema verification

Dry run xác nhận target và đúng thứ tự 01–04 trước khi apply. Migration runner sau đó kết nối đúng `travelgo_ai_m0_test`, kiểm tra sentinel và apply từng migration trong transaction.

| Migration | SHA-256 | Apply | File ↔ DB |
|---|---|---|---|
| `20261010_01_init_travelgo_schema.sql` | `fe7defe5c3c47c9230fe7c43fc301255a6bc0e998da71aba0fe2f747f9e52d50` | PASS | MATCH |
| `20261011_02_rbac_partner_foundation.sql` | `df7fd60cccf17d3f8a73f711825bb1e82a4606a17c42fce4c7fa214548c2cecd` | PASS | MATCH |
| `20261011_03_persistent_travel_resources.sql` | `1c4464625e57e27cadc560077fad83837b56c5385d8021e0592fdcb9039fabf7` | PASS | MATCH |
| `20261011_04_hugo_intelligence_foundation.sql` | `4f2519e0541bed02a5fd7811c1ef5f84be49e37dd0dc81d16c033c22a805b69d` | PASS | MATCH |

Schema verifier được chạy sau migration và chạy lại sau toàn bộ integration/E2E:

```json
{
  "database": "travelgo_ai_m0_test",
  "user": "postgres",
  "postgis": "3.4.3",
  "migrations": 4,
  "applicationTables": 18,
  "foreignKeys": 28,
  "result": "PASS"
}
```

Kết luận migration/schema: **PASS**.

## 4. Seed

Seed chạy trên database mới sau khi guard xác minh target và sentinel.

- Secret seed riêng được sinh bằng CSPRNG tại runtime và chỉ giữ trong memory của process.
- Secret không được hard-code, không ghi file, không in log và không ghi vào báo cáo.
- Seed không tạo thêm quyền Super Admin ngoài fixture dự kiến.
- Seed được sửa để có thể xoay password hash cho đúng các fixture account đã biết khi chạy lại trên database test có sentinel; không đụng user ngoài danh sách fixture.
- Số assignment `SUPER_ADMIN` sau seed + integration + E2E: **1**.

Kết luận seed: **PASS**.

## 5. Kết quả kiểm thử thực tế

| Nhóm | Kết quả | Bằng chứng chính |
|---|---|---|
| Docker/PostgreSQL health | PASS | container healthy, PostgreSQL 15.8/PostGIS 3.4.3 |
| Migration dry run | PASS | đúng target và thứ tự 01–04, không ghi |
| Migration apply | PASS | 4/4 applied trên DB mới |
| Migration checksums | PASS | 4/4 MATCH |
| Schema verification | PASS | 18 bảng ứng dụng, 28 FK, PostGIS 3.4.3 |
| Backend TypeScript build | PASS | `tsc` thành công |
| Unit/RBAC | PASS | auth, RBAC, ownership, isolation, server price, capacity, transitions |
| Algorithm/GIS | PASS 11/11 | Bayesian, Haversine, recommendation và planner |
| Frontend production build | PASS | Vite build, 1.719 modules transformed |
| HTTP/PostgreSQL integration | PASS 13 checks | luồng nghiệp vụ, security, concurrency, transaction |
| Intelligence integration | PASS 7 checks | event validation, anonymous/auth identity, anti-spoofing |
| Playwright Customer | PASS | login/error/loading/empty/responsive, booking, save/reopen trip |
| Playwright Partner | PASS | dashboard, CRUD, submit moderation, xử lý booking |
| Playwright Super Admin | PASS | duyệt partner/place/tour/blog, public visibility |
| Playwright tổng | PASS 3/3 | Edge headless, API thật, không mock success |
| `git diff --check` | PASS | không có whitespace error |

### 5.1 HTTP integration và security

Các kiểm tra đã PASS:

- health check dùng PostgreSQL thật;
- đăng ký/login và ranh giới HTTP 401/403;
- customer không truy cập partner/admin dashboard;
- event anonymous không nhận `userId` giả mạo;
- event authenticated lấy identity từ token;
- partner application chống mass assignment `status`, `userId`, `reviewedBy`;
- Super Admin approval tạo business/role trong transaction;
- Partner A không update/archive Place của Partner B;
- Place/Tour chỉ public sau moderation;
- giá và `businessId` booking do server quyết định;
- idempotency booking;
- rollback sau unique race;
- hai customer tranh chỗ cuối: một request `201`, một request `409`, không oversell;
- customer không đọc booking của người khác;
- partner xác nhận booking và customer đọc lại trạng thái;
- recommendation và tour planner đọc Place/Tour từ PostgreSQL thật;
- trip save/reopen và ownership isolation;
- audit log và số quyền admin đúng dự kiến.

### 5.2 Intelligence integration

- đăng ký test user: `201`;
- anonymous event: `202`, persisted `user_id = NULL`;
- authenticated event: `202`, persisted identity từ token;
- event type không hợp lệ: `400`;
- context JSON persisted đúng;
- tổng cộng 7 assertions PASS.

### 5.3 Playwright E2E

Lần chạy đầu trong sandbox bị chặn bởi Windows file permission của Vite/esbuild, không được báo PASS. Chạy ngoài sandbox local sau đó phát hiện lỗi CORS thật: E2E dùng `http://127.0.0.1:3000` nhưng backend không allow origin này.

Đã sửa `frontend/playwright.config.ts` để backend E2E chỉ thêm đúng test origin. Kết quả chạy lại cuối cùng:

```text
3 passed (23.6s)
```

Không mock API thành công. Backend E2E kế thừa exact DB target, write opt-in và sentinel.

## 6. Database test sau toàn bộ kiểm thử

Database được giữ lại, không cleanup/reset theo yêu cầu.

| Table/metric | Rows |
|---|---:|
| users | 12 |
| user_roles | 19 |
| businesses | 6 |
| places | 4 |
| tours | 3 |
| tickets | 4 |
| bookings | 4 |
| partner_applications | 3 |
| trip_sessions | 2 |
| user_events | 4 |
| recommendation_impressions | 0 |
| audit_logs | 9 |
| SUPER_ADMIN assignments | 1 |

Đây là dữ liệu synthetic/test, không phải dữ liệu huấn luyện production.

## 7. Data quality và data contracts

### 7.1 Readiness tổng quát

Baseline database và pipeline test đã PASS, nhưng dữ liệu hiện tại chỉ đủ kiểm tra cấu trúc/rule-based flow. Dữ liệu chưa đủ để chứng minh personalization, sentiment production, Learning-to-Rank hoặc demand forecasting.

| Contract | Trạng thái | Khoảng trống chính |
|---|---|---|
| Reviews | PARTIAL | thiếu booking FK/verified truth, moderation, idempotency; aspect nullable/range chưa đúng |
| Events | PARTIAL | thiếu client event ID, environment/is_test, consent/retention, context version |
| Impressions | SCHEMA READY / DATA BLOCKED | service chưa ghi impression, hiện có 0 row |
| Favorites | FAIL | chỉ ở browser localStorage, chưa có server source of truth/event linkage |
| Price | FAIL cho AI budget | thiếu currency, unit, source, validity, tax/fee semantics |
| Opening hours | FAIL | JSONB chưa có contract/timezone/exceptions/provenance |
| Provenance/license | PARTIAL | thiếu row/subset source, license, reviewer sign-off và cutoff |

### 7.2 Save Trip preferences

Kết luận: **FAIL — preferences vẫn bị mất khi Save Trip**.

Bằng chứng source và database:

1. planner nhận `preferences` và dùng khi tạo recommendation;
2. generated itinerary/save DTO không giữ trường này;
3. frontend chỉ gửi `{ itinerary }`;
4. `TripSessionService.createTripFromPlanner()` ghi `preferences: []`;
5. E2E xác nhận trip được save/reopen, nhưng chưa xác nhận bảo toàn preferences vì contract hiện không có dữ liệu đó.

Đây là thay đổi M1; không triển khai trong M0 theo yêu cầu.

## 8. AI export safety

AI export hiện tại đã được audit read-only trước khi tạo database M0 mới:

- source audit: `travelgo_phase35_test`;
- transaction: `BEGIN READ ONLY`;
- output local Git-ignored: `ai/data/exports/m0-audit-2026-10-12T03-15-39-536Z/`;
- không upload Kaggle;
- database fingerprint trước/sau export không đổi;
- không thấy direct email/seed phone/password/JWT/API key trong snapshot bằng các scanner hiện có;
- user/session được HMAC-SHA256 với salt runtime không export.

Trạng thái export:

| Gate | Kết quả |
|---|---|
| Database read-only | PASS |
| Structural CSV + manifest | PASS |
| Direct identifier scan hiện có | PASS với giới hạn regex |
| Built-in `checksums.sha256` | FAIL — chưa có |
| Provenance/license/test-data gate | FAIL — chưa đủ |
| Kaggle/training readiness | BLOCKED — không upload |

Các hash của snapshot đã được tính độc lập trong audit trước, nhưng export script chưa tự sinh checksum manifest. Đây là backlog M1.

## 9. Dependency audit

`npm audit --audit-level=high` chạy lại với npm registry ngày 2026-10-12:

| Workspace | High | Critical | Moderate | Kết quả gate high/critical |
|---|---:|---:|---:|---|
| backend | 0 | 0 | 2 | PASS với warning |
| frontend | 0 | 0 | 2 | PASS với warning |

Chi tiết:

- backend: Sequelize phụ thuộc `uuid < 11.1.1`, 2 moderate;
- frontend: React Router advisories, 2 moderate;
- npm chỉ đề xuất `--force` với breaking major/downgrade không tương thích;
- không chạy `npm audit fix --force` và không nâng major bừa bãi.

## 10. Lỗi phát hiện và thay đổi đã thực hiện

1. **Guard trước đây quá yếu**: chỉ dựa vào loopback + tên `test/dev`.  
   Đã thêm explicit opt-in, exact target và durable database sentinel cho mọi test có ghi.

2. **E2E server có thể khởi động nhầm DB**.  
   Khi bật test-write mode, server giờ fail trước khi listen nếu target/sentinel sai.

3. **Seed password cũ không thể tái lập trên fixture đã tồn tại**.  
   Seed giờ xoay hash của đúng fixture accounts bằng secret runtime mới, sau đầy đủ guard/sentinel.

4. **Playwright CORS origin sai**.  
   Đã thêm test-only origin `http://127.0.0.1:3000` vào backend webServer của Playwright.

5. **Lần sinh secret đầu dùng API PowerShell không tương thích**.  
   Lần đó không được dùng làm bằng chứng hoàn tất. Seed được chạy lại bằng `RandomNumberGenerator.Create().GetBytes()`, rồi E2E PASS với secret mới trong memory.

## 11. Rủi ro còn lại và backlog M1

Không triển khai M1 trong đợt này. Thứ tự ưu tiên đề xuất:

1. Persist preferences end-to-end và test save/reopen giữ nguyên preferences.
2. Thêm event idempotency, `environment/is_test`, context schema version và consent/retention.
3. Ghi recommendation impressions server-side, dùng request ID xuyên suốt impression → click/save/booking.
4. Tạo Favorites server source of truth với ownership và timestamp.
5. Liên kết review với booking COMPLETED; verified do server quyết định; thêm moderation/idempotency.
6. Sửa aspect rating nullable + range constraints.
7. Chuẩn hóa price contract và opening-hours contract.
8. Manifest v2: environment, source/license, query/code version, cutoff, filter và reviewer.
9. Tạo `checksums.sha256` và verify checksum/row parity/FK/PII/test-data gate trong notebook 01.
10. Chọn phương án dependency tương thích, không force major; bổ sung regression tests trước khi upgrade.
11. Xác định retention/cleanup policy cho `travelgo_ai_m0_test`; hiện tại giữ nguyên theo yêu cầu.

## 12. Kết luận M0

### PASS

- PostgreSQL/PostGIS local và isolated DB target;
- migration 01–04, checksum, schema, FK và PostGIS;
- seed bằng runtime secret không lưu;
- backend build, unit/RBAC và algorithm/GIS 11/11;
- HTTP integration 13 checks;
- Intelligence integration 7 checks;
- booking concurrency, idempotency, rollback, RBAC và business isolation;
- Playwright E2E 3/3 vai trò;
- frontend production build;
- database sentinel/explicit opt-in fail-closed;
- AI export read-only/structural audit;
- `git diff --check`.

### FAIL/PARTIAL cần xử lý ở M1

- Save Trip chưa giữ preferences;
- review/event/impression/favorite/price/opening-hours contracts chưa đủ cho ML production;
- export chưa có built-in checksum/provenance/license/test-data gate;
- 2 moderate dependency findings ở mỗi workspace.

### BLOCKED ngoài M0

- upload/chạy Kaggle notebook trên export production: chưa được phép và dữ liệu chưa qua governance gate;
- training/evaluation model production: thiếu review, impression và behavioral data đủ chất lượng;
- Learning-to-Rank/personalization production: thiếu exposure/label/consent pipeline.

**M0 = PASS** vì baseline local cô lập, migration/seed/test/E2E và audit governance đã được thực thi có bằng chứng. Điều này không có nghĩa HuGo Intelligence đã là production AI; M1 chỉ nên bắt đầu sau khi chốt data contracts và governance gates nêu trên.
