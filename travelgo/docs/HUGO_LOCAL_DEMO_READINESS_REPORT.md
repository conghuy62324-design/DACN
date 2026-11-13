# HuGo Travel — bản demo local sau T03–T07

Ngày kiểm: **30/10/2026**, giờ Việt Nam. Đây là bước chuẩn bị môi trường trong T13/T14; **chưa phải nghiệm thu toàn bộ**. Đã đọc [báo cáo Docker](HUGO_DOCKER_PATH_MIGRATION_REPORT.md), [T04-A](HUGO_T04_A_TRIP_REPORT.md), [T06](HUGO_T06_BOOKING_REPORT.md), [T07](HUGO_T07_PROFILE_AUTH_REPORT.md), SQL migration11/12 và runner hiện tại.

**Trạng thái cuối:** code hiện tại build được, backend/frontend đang phục vụ tại `http://localhost:5000` và `http://localhost:3000`; smoke browser trên **DB ứng dụng `travelgo_dev`** PASS. Migration11/12 đã apply, dữ liệu nghiệp vụ cũ không đổi qua migration. Sau smoke có **1 user, 1 Trip và 1 Booking demo mới**, giữ lại để mở demo. Booking còn **PENDING/unpaid**, không có email/payment mới.

## 1. Workspace, Docker và đích dữ liệu thực tế

`Get-Location` xác nhận `C:\Users\Danh\Downloads\HCH\DACN\travelgo`. `git status --short` đầu lượt có **45 tracked modified + 45 untracked** từ các task trước. Trước sửa đã lưu status và SHA-256 của **463 file** vào `%TEMP%/hugo-local-demo-status-before.txt` và `hugo-local-demo-baseline.json`. Sau xử lý, 463/463 file cũ còn đúng hash; không reset/stash hay sửa source/manifest cũ. File mới liệt kê ở mục 8.

Đã kiểm bằng Docker inspect, không suy database từ tên container:

| Thành phần | Kết quả thực tế |
|---|---|
| Compose project | `travelgo`, config/working directory ở workspace trên; `docker compose ls` = running(2) |
| PostgreSQL | `travelgo_postgres`, image `postgis/postgis:15-3.4-alpine`, running/healthy; TCP host port 5432 |
| pgAdmin | `travelgo_pgadmin`, image `dpage/pgadmin4:latest`, running; TCP host port 5050 |
| Volume DB | `travelgo_postgres_data` → `/var/lib/postgresql/data`; mountpoint `/var/lib/docker/volumes/travelgo_postgres_data/_data` |
| Volume pgAdmin | `travelgo_pgadmin_data` → `/var/lib/pgadmin`; mountpoint `/var/lib/docker/volumes/travelgo_pgadmin_data/_data` |
| pgAdmin bind | `docker/pgadmin/servers.json` trong workspace → `/pgadmin4/servers.json`, read-only |

Backend `.env` được đọc **chỉ các field không bí mật**: development, `DB_HOST=localhost`, `DB_PORT=5432`, `DB_NAME=travelgo_dev`, `DB_SSL=false`, `PORT=5000`, CORS cho `http://localhost:3000`/`5173`. Đầu lượt, các biến DB/test cùng tên trong process kiểm tra **không được set**. Kết nối `pg.Client` dùng thông số từ `.env` rồi SQL `SELECT current_database(), current_user` xác nhận **`travelgo_dev`/`postgres`**; server SQL ở cluster Docker local. Không in password hoặc token. Trong `pg_database`, DB ứng dụng **đã có sẵn** comment `hugotravel-isolated-test-database-v1` trước task này. Đây là dấu vết cấu hình cũ, không được tạo/sửa/xóa trong lượt này; **không dùng comment đó hoặc runner test để apply migration vào DB ứng dụng**. Guard test vẫn buộc đúng tên DB test và opt-in riêng.

## 2. Kiểm kê schema trước migration

Đọc `backend/src/scripts/migrate.ts`: runner cũ chỉ dành DB test, có `assertIsolatedTestDatabase`, opt-in và sentinel. Giữ nguyên. Đọc **nguyên văn** hai SQL:

- Migration11 thêm `trip_sessions.planner_metadata JSONB NULL` và CHECK object/≤32768 byte; không backfill.
- Migration12 thêm `bookings.request_fingerprint VARCHAR(64) NULL` và CHECK lowercase hex64; không backfill.

SQL trên chính `travelgo_dev` cho thấy `schema_migrations` có **đủ 01–10**, từng checksum khớp file trong repo. Không giả định điều này từ container. Trước apply, migration11/12 **chưa có record**; hai cột và hai CHECK tương ứng cũng chưa có. Các bảng `trip_sessions`, `bookings` đã tồn tại, schema có 24 bảng gồm `schema_migrations` và 23 bảng nghiệp vụ. Trước thay đổi: **0 Trip, 1 Booking**, 7 users; booking cũ `6c9f4bd3-af04-46b0-a1e0-9b7f06dcd275` / `HG-SEED-0001`. Tour hiện có capacity 20, available 18; hotel/restaurant công khai đều APPROVED và Business ACTIVE.

Không có client khác trong `pg_stat_activity` của `travelgo_dev` khi audit, và chưa có backend ứng dụng đang nghe port 5000. Vì vậy không phải dừng process đang ghi; quy trình apply kiểm lại trạng thái client trước transaction DDL. Không chạy test suite trên DB này.

## 3. Backup và migration ứng dụng

Backup **trước DDL** bằng `docker exec travelgo_postgres pg_dump -U postgres -d travelgo_dev -Fc -f <container tmp path>`, sau đó `docker cp` tới:

`C:\Users\Danh\Downloads\HCH\DACN\travelgo\.local-demo-backups\travelgo_dev_before_m11_m12_20261030-114326.dump`

Custom archive **115887 byte**, magic `PGDMP`, `pg_restore --list` exit0/TOC **215 entries**. SHA-256: **`b7ce524e45bbf35d79e439850d5a7a6639b4ba59ba29c7c8b041f31324295cf3`**. `.local-demo-backups/` được Git ignore, `git check-ignore` PASS. **Chưa thử restore**; chỉ xác nhận archive đọc được và checksum. File backup nằm local trong workspace nhưng không vào Git; nên chép thêm ra nơi lưu an toàn trước khi dọn máy.

Lần kiểm TOC đầu dùng `pg_restore --list | Select-Object -First 4`: pipe đóng sớm làm exit1, nên **không coi là backup đã xác minh**. Lượt sau đọc toàn bộ TOC ra file tạm, exit0, rồi mới copy và xác nhận archive/sha ở trên. Không có thao tác DB write giữa hai lần.

Quy trình riêng ở `backend/scripts/localDemoMigration.cjs` khóa target **đúng `travelgo_dev` qua `.env` + SQL**, chỉ chấp nhận host loopback/port5432, reject process env DB test, bắt buộc backup custom archive khi `--apply`; kiểm đủ checksum01–10, trạng thái cột/constraint11/12, unknown/partial migration và client khác. Nó dùng **một transaction** và advisory lock, apply đúng file SQL11/12 còn thiếu, insert record cùng transaction, kiểm lại schema trước commit. Chạy lại đọc status SKIP; không tạo record giả. Runner test và migration cũ không sửa.

| Lượt | Exit | Kết quả |
|---|---:|---|
| `node scripts/localDemoMigration.cjs` trước apply | 0 | DRY_RUN: 11 PENDING, 12 PENDING |
| `node scripts/localDemoMigration.cjs --apply --backup <đường dẫn archive trên>` | 0 | APPLIED11 + APPLIED12, post-verify SKIP cả hai trong transaction, commit |
| `node scripts/localDemoMigration.cjs` sau apply | 0 | DRY_RUN: SKIP11 + SKIP12 |
| Cùng lệnh `--apply --backup` chạy lại sau khi ứng dụng đã khởi động | 0 | SKIP11 + SKIP12; không chạy lại DDL hoặc thêm record |

Checksum11 **`90c42676606d4d5e7458edde139b9c5b945dd3ca0d574490a581ad6bcd98a034`**; checksum12 **`09465ec9a3d3c3de1215ad6eaa1d1cf4e8d18aed43423ce6c7b4feea817e9bc5`**. Sau migration, `schema_migrations` có **12 record**; SQL xác nhận `planner_metadata JSONB NULL`, `request_fingerprint VARCHAR(64) NULL`, CHECK tương ứng đúng nội dung. Booking cũ vẫn có fingerprint NULL; không backfill/reprice Trip/Booking lịch sử. Không đổi migration01–12 hoặc nới guard/sentinel.

### Bảo toàn dữ liệu qua migration

Trước/sau dùng cùng biểu thức trên **23 bảng nghiệp vụ của `travelgo_dev`**, bỏ đúng hai cột mới để so tương đương:

```sql
SELECT count(*)::int AS rows,
  md5(COALESCE(string_agg((to_jsonb(t)-'planner_metadata'-'request_fingerprint')::text,
    '' ORDER BY (to_jsonb(t)-'planner_metadata'-'request_fingerprint')::text),'')) AS fingerprint
FROM <tên_bảng_public_đã_kiểm> t;
```

`backend/scripts/localDemoFingerprint.cjs` đọc-only và in inventory count/fingerprint, không in row. SHA-256 của JSON inventory trước và sau DDL **cùng `497684b41e06c0d8433aa0b0a96da31ba88c5bde924c1a5cdaff4b21cd531e32`**; 23/23 bảng, count/fingerprint từng bảng bằng nhau. Ví dụ Booking 1, MD5 `b10660292efd512cccf450f4e17d7afd`; Trip 0, MD5 rỗng `d41d8cd98f00b204e9800998ecf8427e`; Tour 1, MD5 `5c8140758df277c1266b50ddbf7345ce`; users 7. **Schema đổi, row nghiệp vụ cũ không đổi trong bước migration.** Đây là dữ liệu DB ứng dụng, không phải 57 Booking/27 Trip của DB test.

## 4. Build, process env, URL và CORS

| Kiểm | Exit | Kết quả |
|---|---:|---|
| `backend/ npm.cmd run build` | 0 | TypeScript PASS |
| `frontend/ npm.cmd run build` | 0 | `tsc && vite build` PASS, Vite 6.4.4, 1733 modules, 6.72s |
| Start backend bằng `npm.cmd start` | 0 | `dist/server.js` kết nối PostgreSQL thành công, port 5000 |
| Start frontend bằng Vite dev | 0 | port 3000, `http://localhost:3000/` |
| `Invoke-WebRequest` health/frontend/CORS | 0 | GET `/api/health` **200** (`database: connected`); frontend `/` **200**; `Access-Control-Allow-Origin: http://localhost:3000` |

Backend/frontend đang chạy trong process local cửa sổ ẩn, log `%TEMP%/hugo-local-demo-backend.out.log` và `hugo-local-demo-frontend.out.log`; URL mở ngay: **http://localhost:3000/**, backend health **http://localhost:5000/api/health**. Trước khi launch, process shell xóa các biến DB/test/port/proxy kế thừa để backend dùng `.env` ứng dụng và frontend proxy tới localhost5000. Không có cấu hình DB test từ lượt T06/T07 trong process demo. Một lượt health kiểm kèm `Get-NetTCPConnection` có exit1 vì câu lệnh liệt kê TCP không trả trạng thái trong shell; lệnh kiểm HTTP/CORS chạy riêng sau đó exit0 như bảng.

Nếu cần khởi động lại, dùng **hai terminal PowerShell riêng**, từ bất kỳ cwd nào. Hai dòng dưới đây đặt cwd đúng và xóa các override DB test; password được đọc nội bộ từ `backend/.env`, không đặt trong lệnh:

```powershell
Set-Location 'C:\Users\Danh\Downloads\HCH\DACN\travelgo\backend'; @('NODE_ENV','DB_HOST','DB_PORT','DB_USER','DB_PASSWORD','DB_NAME','DB_SSL','TEST_DATABASE_NAME','ALLOW_TEST_DB_WRITES','APP_ORIGINS','PORT') | ForEach-Object { Remove-Item -LiteralPath "Env:$_" -ErrorAction SilentlyContinue }; npm.cmd start
```

```powershell
Set-Location 'C:\Users\Danh\Downloads\HCH\DACN\travelgo\frontend'; @('VITE_API_URL','VITE_PROXY_TARGET') | ForEach-Object { Remove-Item -LiteralPath "Env:$_" -ErrorAction SilentlyContinue }; npm.cmd run dev -- --host localhost --port 3000 --strictPort
```

Nếu port đã được process demo hiện tại dùng, mở URL thay vì chạy thêm instance. Lệnh ở trên là để chạy sau khi process cũ đã dừng.

## 5. Browser smoke trên ứng dụng thật

Chạy **Edge headless**, Vite/browser/Express/API/PostgreSQL thật, `npm.cmd run test:e2e -- --config playwright.local-demo.config.ts`, **exit0, 1/1 suite PASS trong 10.1s**. Test không mock response thành công, không có cleanup hook; dữ liệu demo được giữ lại. Tài khoản CUSTOMER mới được tạo qua API thật, đăng nhập bằng form UI. Consent analytics/personalization đặt false; không phát sinh user event. Tên/email đúng từ `/auth/me` sau reload. Credential sinh ngẫu nhiên được lưu **chỉ** trong file Git ignored `.local-demo-backups/latest-demo-account.json`; báo cáo này không ghi password/token.

| Case | Kết quả | Bằng chứng ngắn |
|---|---|---|
| Login → Profile → reload | **PASS** | Form login, tên/email/phone đúng user mới, reload `/api/auth/me` 200 |
| Explore → chọn Place → Planner → Generate | **PASS** | Card HuGo Seafood → Place Detail → mandatory Place; generate API 200, 3 ngày (05–07/11/2026), 2 đêm, motorbike/balanced, tổng ước tính **4.500.000đ** |
| Save Trip → refresh → mở lại | **PASS** | POST `/api/trips` 201, UI/API/row DB giữ days/metadata/amount/modes, `GROUP_VND_V1` |
| Start → check-in thủ công → Complete | **PASS** | Trip `upcoming→active→completed`, 1/6 hoạt động, tiến độ **17%** sau reload/Complete, check-in không có tọa độ GPS; cost/metadata không đổi |
| Booking demo → confirmation/history | **PASS** | Hotel HuGo Riverside, POST 201, code/ID trùng confirmation/history; DB có 1 history PENDING, fingerprint hex64, **payment unpaid** |
| Mobile home 390×844 | **PASS** | Menu/Profile link thấy được, `scrollWidth<=innerWidth`; ảnh chụp Playwright được kiểm trực quan |

ID mới được giữ trong `travelgo_dev`:

| Loại | ID / thay đổi |
|---|---|
| User CUSTOMER | `769f3861-102b-4cb6-b713-d98ace01897f`; thêm 1 user, 1 user_role, 1 consent opt-out |
| Trip | `a8616dc9-ae82-494e-a2cf-d6191d776445`; thêm 1 row, status completed, checkins 1, progress 17%, 2 đêm, tổng 4.500.000đ |
| Booking | `47dd4b07-94ec-42b5-90b0-9c92c22f3c8f`, code `HG-48A2DB2B5F464B4693412674`; thêm 1 booking hotel + 1 history `c952b1fe-015c-45de-a09a-ea3b00539392`, 2 khách, tổng **2.400.000đ**, PENDING/unpaid |
| Explore recommendation | Request `d9873ea9-bdf8-4c25-9881-78b1af351c17`; 2 candidates `8c4c2de4-af81-44ec-ab90-8742fdab0808`, `c8eeda85-6d6d-41c2-a601-7d736ccc3d0f` |
| Inventory | Booking **hotel** không trừ tồn kho phòng/bàn theo contract MVP; Tour vẫn capacity 20/available 18, Ticket/Place/Business không đổi |

Sau smoke, fingerprint toàn DB **có thay đổi đúng kỳ vọng**: 23 bảng, SHA-256 inventory `ae503794d9ca2506758a860139bba0d4833d8eb056076619d5823e192b835a41`. Delta: users 7→8; user_roles 12→13; consents 1→2; Trip 0→1; Booking 1→2; history 0→1; recommendation_requests 19→20; candidates 34→36. **15 bảng còn lại giữ nguyên**; riêng Tours/Tickets/Places/Businesses không đổi. So lại cùng biểu thức sau khi loại **đúng ID demo mới và hàng gắn với user demo**, dữ liệu có sẵn ở **23/23 bảng** khớp baseline trước smoke (exit0). Booking cũ `HG-SEED-0001` còn nguyên JSON row. Không gọi fingerprint toàn DB sau smoke là unchanged.

Lưu ý: file kết quả `.local-demo-backups/latest-demo-smoke.json` lưu case PASS và IDs. Trong lúc ghi record, field `status:'completed'` của Trip từng đè nhãn PASS của case; test browser vẫn PASS, record được sửa thành `status:'PASS', tripStatus:'completed'` mà **không chạy lại smoke để tránh tạo thêm đơn**. Source test đã sửa cùng cách ghi cho lần sau. Một lệnh đối chiếu row cũ đầu tiên lỗi parse UTF-8 BOM của file PowerShell (exit1), sau khi bỏ BOM chạy lại **exit0, 23/23 PASS**; không có DB write từ hai lệnh đối chiếu.

## 6. Phân biệt DB ứng dụng, DB test và giới hạn

T03–T07 integration/E2E trong các báo cáo cũ chạy trên **`travelgo_ai_m0_test`** có guard/sentinel, fixture cleanup; **không chạy lại trên `travelgo_dev`**. Lượt này dùng DB ứng dụng để migration và smoke tạo dữ liệu thật mới theo mục 5. Không reset/seed/drop/truncate, không xóa volume, không sửa/xóa Trip hoặc Booking cũ.

Catalog dev hiện chỉ có **2 Place** (hotel, restaurant) và 1 Tour; smoke chứng minh luồng hẹp với Place/nhà hàng có sẵn, không chứng minh trải nghiệm đủ điểm tham quan hoặc mọi thành phố. Planner total là **ước tính cho nhóm**, Booking hotel theo khách trong MVP, không tính số đêm phòng và không cam kết phòng. Manual check-in không chứng minh GPS. Chưa chạy full acceptance T13/T14, mọi role, payment/email, load/concurrency trên DB ứng dụng, hoặc thử restore. Một suite smoke sẽ tạo thêm dữ liệu nếu chạy lại; không dùng nó như regression tự cleanup trên dev.

## 7. Khôi phục nếu cần

Giữ archive và checksum ở mục 3. Nếu cần kiểm khả năng restore, **dừng backend**, tạo một **database phục hồi riêng** rồi `pg_restore` vào database trống đó; đối chiếu schema/count trước khi cân nhắc thay target ứng dụng. Bước này **chưa thực hiện**. Archive là snapshot **trước migration và trước smoke**: restore đè `travelgo_dev` sẽ làm mất account/Trip/Booking demo mới cùng mọi dữ liệu mới khác sau thời điểm backup. Không tự restore đè DB hiện tại. Khi chẩn đoán lỗi chỉ đọc, dùng `node scripts/localDemoFingerprint.cjs` từ cwd `backend/`; runner `db:migrate` có guard test và **không dùng cho dev**.

## 8. File mới và lệnh bổ trợ

Chỉ thêm: `.gitignore` (ignore archive local), `backend/scripts/localDemoMigration.cjs`, `backend/scripts/localDemoFingerprint.cjs`, `frontend/playwright.local-demo.config.ts`, `frontend/e2e/local-demo.smoke.spec.ts`, báo cáo này. Không sửa migration cũ, source T03–T07, Python/AI hoặc manifest. Backup và credential nằm trong `.local-demo-backups/` ignored. Log build/browser ở `%TEMP%/hugo-local-demo-*.log`; fingerprint trước/sau ở `%TEMP%/hugo-local-demo-fingerprint-*.json`.

Đầu lượt Docker CLI trong sandbox exit1 vì không đọc được Docker pipe/config; inspect lại ngoài sandbox exit0. Hai lệnh đọc/sửa không thành công khác đã ghi ở mục 3/5 và được chẩn đoán rõ. Không push/deploy/train. **Dừng ở bản demo local; chưa tuyên bố T13/T14 hoàn tất.**
