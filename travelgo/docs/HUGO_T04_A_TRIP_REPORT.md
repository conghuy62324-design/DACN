# T04-A — Bảo toàn itinerary, metadata và chi phí Trip

Ngày thực hiện: **28/10/2026**, giờ Việt Nam. HEAD nền `052531dfc77c4f289757794c0ee08b4d46e6af2e`; kết quả dưới đây chạy trên working tree chưa commit, giữ các thay đổi T03-A/T03-B và Python/report có sẵn.

**T04-A hoàn thành.** Sau khi chuyển Docker sang thư mục mới, đã xác minh lại guard/sentinel và chạy mới HTTP/PostgreSQL **11 nhóm PASS**, Edge E2E **1/1 PASS** trên **`travelgo_ai_m0_test`**, backend build exit 0. Metadata `GROUP_VND_V1`, lodging, modes, totals và selected IDs được đối chiếu response → GET → row DB. Toàn bộ 27 Trip có sẵn giữ nguyên fingerprint sau cleanup. Chi tiết lần tiếp tục ở **mục 10**.

**Nguồn kết quả:** mục 1–9 ghi nhận phiên triển khai T04-A trước khi chuyển thư mục; các kết quả unit 35/35, planner regression, frontend build và integration 9 nhóm ở đó là **kết quả phiên trước được tái sử dụng**, không phải các lệnh vừa chạy lại. Mục 10 ghi riêng thay đổi test, lệnh và bằng chứng mới tại `C:\Users\Danh\Downloads\HCH\DACN\travelgo`. Không dùng unit double thay bằng chứng persistence.

## 1. Audit trước khi sửa

Đã đọc scope T02, báo cáo T03-A/T03-B, Planner/save handler, TripService frontend, Trip controller/service/repository/model và TripDetail.

Bảng dưới đây là **source audit trước sửa**, chưa phải bằng chứng PostgreSQL persistence:

| Field | Generate/client POST | Service/model/DB path trước sửa | GET trước sửa | TripDetail trước sửa |
|---|---|---|---|---|
| costBasis | GROUP_VND_V1, gửi trong itinerary | Bỏ qua, chưa có cột metadata | Mất | Không có nhãn đơn vị |
| nightsCount | Có, gồm 0 đêm | Bỏ qua | Mất | Tự tính Math.max(1, daysCount−1), sai chuyến 1 ngày |
| costAssumptions | Có, gửi nguyên snapshot | Bỏ qua | Mất | Không hiển thị |
| transportation | car/motorbike sau T03-B | Bỏ qua | Mất | Không hiển thị |
| pacing | Có | Lưu cột pacing | Có | Không hiển thị rõ mode |
| adults/children | Có | Bỏ qua | Mất | Không hiển thị |
| lodgingNights/lodgingEstimatedCostVND | Có trong days | Truyền vào itinerary JSONB | Trả JSON days | Không hiển thị breakdown |
| activity/day totals | VND cả nhóm trong response mới | JSONB không runtime validate/recompute | Trả JSON days | Không hiển thị chi phí |
| trip total/budget | Có | Tin top-level client vào DECIMAL | Trả Number | Không hiển thị chi phí |
| selectedPlaceIds | Có thể stale sau client edit | Create derive unique; update không derive lại | Trả cột riêng | Activity dựa vào days, chưa có chứng minh IDs consistent |

Đường dữ liệu hiện có: Generate → React itinerary → TripService POST `{itinerary}` → TripSessionService → TripSession Sequelize/`trip_sessions` → GET serializer → TripDetail. Ownership lấy từ token và repository findOwned.

## 2. Kiểm tra DB chủ động đầu phiên

- Docker ps trong sandbox: lỗi đọc config và không có pipe Docker engine.
- Docker ps ngoài sandbox: exit 1, không có pipe `dockerDesktopLinuxEngine`.
- TCP 127.0.0.1:5432 trong và ngoài sandbox: ECONNREFUSED (ngoài sandbox exit 1).
- Config mặc định chỉ kiểm field không chứa secret: localhost:5432, DB travelgo_dev; chưa có exact-test-name/opt-in trong process. Không dùng target này để test/write.
- Chưa thể đăng nhập DB test hay xác minh identity/sentinel/schema. Không chạy write, seed, reset hoặc apply migration. Đã hỏi chủ dự án về target test/khởi động Docker trong lúc tiếp tục unit độc lập.

Sau khi chủ dự án báo đã bật Docker, đã kiểm tra lại và giải quyết blocker: container `travelgo_postgres`, image `postgis/postgis:15-3.4-alpine`, healthy, publish 5432; kết nối read-only tới đúng `travelgo_ai_m0_test`, host `127.0.0.1`, PostGIS 3.4.3. `assertTestDatabaseWriteOptIn` và `assertDatabaseSentinel` xác nhận target/opt-in/sentinel hợp lệ. Ban đầu có 10 migrations và **27 Trip**.

Mọi process write sau đó đều đặt rõ `NODE_ENV=test`, `DB_HOST=127.0.0.1`, `DB_NAME=travelgo_ai_m0_test`, `TEST_DATABASE_NAME=travelgo_ai_m0_test`, `ALLOW_TEST_DB_WRITES=true`, `DB_SSL=false`; không sửa `.env` gốc đang trỏ `travelgo_dev`. Sentinel: `hugotravel-isolated-test-database-v1`.

## 3. Field mapping sau sửa

| Field | Nơi lưu / cách xử lý | GET và UI |
|---|---|---|
| costBasis | `planner_metadata.costBasis`, chỉ xác nhận khi snapshot gửi rõ GROUP_VND_V1 | Trả flattened field; UI chỉ ghi VND cả nhóm khi đúng version này |
| nightsCount | `planner_metadata.nightsCount`, derive N−1 cho snapshot GROUP_VND_V1 | Trả và hiển thị đúng 0/1/2…; legacy thiếu thì “Chưa lưu số đêm”, không tự suy diễn |
| costAssumptions | Array lưu nguyên nội dung trong metadata | Trả/hiển thị phần giả định đã lưu |
| transportation | Metadata; giữ giá trị có thật nếu được gửi, không tự bịa mode khi thiếu | Trả mode, kể cả known legacy flight/train; UI hiển thị thông tin đã lưu |
| pacing | Cột pacing hiện có, không áp generate-only validator khi đọc/lưu snapshot | Giữ cả relaxed/balanced/packed; UI chỉ mô tả mode đã lưu |
| adults/children | Metadata numeric, runtime validate | Trả counts đã lưu; không dùng counts để nhân lại tiền |
| lodgingNights/lodgingEstimatedCostVND | Trong từng ngày của JSONB itinerary; kiểm N−1 và 0 đêm/0 phí | Trả/hiển thị breakdown lưu trú, đã nằm trong day subtotal |
| activity totals | Validate nonnegative/finite/precision và lưu trong activity JSON | Trả số đã chấp nhận, không truy vấn lại giá catalog/booking |
| day total | Derive activity sum + lodging, thay advisory subtotal client | Lưu JSONB và trả subtotal canonical, VND cả nhóm với version mới |
| trip total | Sum day totals → `estimated_cost_vnd` DECIMAL(15,2) | Trả amount canonical; không nhân số người lần nữa |
| budget | `total_budget_vnd`, validate không âm/precision/range | Giữ budget; GET version mới trả difference/status từ budget và total |
| selectedPlaceIds | Unique canonical UUID từ Place activities → cột `selected_place_ids` | Create và update cùng derive, GET đồng bộ với JSON |

Client và Planner save handler đã gửi nguyên snapshot; frontend TripService không strip metadata nên **không cần sửa hai đường đó**. Những field từng bị bỏ qua nay có nơi lưu thật, không được nhét vào activity/ngày giả.

## 4. Contract Create/Update và giới hạn

### 4.1. Body, ownership và trường server quản lý

- Create envelope chỉ nhận `{ itinerary: <snapshot> }`; body null/array/thiếu snapshot hoặc owner ở root bị lỗi kiểm soát.
- Snapshot mới phải ghi rõ `GROUP_VND_V1`. New create không version nhận **422 `UNVERSIONED_TRIP_SNAPSHOT`**, yêu cầu tạo lịch mới; không đoán đơn vị từ breakdown/summary.
- Owner luôn do controller lấy từ auth. Snapshot/root không nhận `userId`; update không cho client ghi owner, id, status, progressPercent, checkins, selectedPlaceIds hoặc plannerMetadata thô. Field ngoài allowlist → **400 `SPOOFED_TRIP_FIELD`**.
- Generated `id`, createdAt, selectedPlaceIds, budget advice/status, hotelSuggestion được nhận trong snapshot theo shape có giới hạn để tương thích output Planner; không dùng chúng để chọn Trip ID/owner/timestamp, tổng tiền hoặc giá server bảo đảm. ID/timestamp Trip do DB/server tạo; selected IDs và totals được derive lại.
- Read/update Trip ID phải là UUID hợp lệ; cross-user lookup dùng `id + userId`, không tìm toàn cục rồi kiểm sau. Cross-user read/update trả 404.

### 4.2. Validation runtime

| Hạng mục | Giới hạn đã chọn |
|---|---|
| Khoảng ngày | Dùng calendar validator T03-A: date-only hợp lệ, gồm hai đầu, end≥start, 1–10 ngày; daysCount/array/dayNumber/date phải khớp |
| Days/activities | Đúng số ngày liên tục; mỗi ngày 0–20 activities, tối đa 200 toàn chuyến. Empty activities được phép để giữ lodging tách riêng |
| Counts | Adults safe integer ≥1, children safe integer ≥0; tổng safe integer. Không dùng generate supported-only modes validator cho snapshot/read |
| Coordinates | Number hữu hạn, latitude −90…90, longitude −180…180, kể cả centroid |
| Tiền | Number hữu hạn không âm, tối đa 2 chữ số thập phân và nằm trong DECIMAL(15,2); không tự round input dưới 0,01đ. Tổng dùng cents để tránh lỗi cộng float |
| Duration/ETA | durationMinutes integer 0–1440; optional ETA finite 0–525.600 phút, aerial distance finite 0–50.000 km; đây là bounds payload, không xác nhận ETA thật |
| IDs | Activity id 1–120 ký tự chữ/số/_/-, duy nhất toàn itinerary; placeId nếu có phải UUID theo format repo. Derived Place IDs được lowercase/dedupe |
| Text | Title/theme/activity title 1–255; city 1–120; description 0–4000; reason 0–1000; image URL string 0–2048; notes 0–5000 |
| Assumptions/metadata | 1–20 dòng, 1–1000 ký tự/dòng; metadata JSON UTF-8 tối đa 32 KiB, kiểm trước write khớp CHECK của DB |

Place activity có `placeId` UUID. Activity tự tạo hiện có dùng id riêng, text/category/timeSlot/coords/cost hợp lệ và **không có placeId**; không bắt hoạt động ăn/nghỉ tự tạo phải giả thành Place. UUID chỉ xác nhận định dạng tham chiếu snapshot, không chứng nhận Place hiện còn bán/approved, sức chứa hoặc giá thực tế. Không đổi dữ liệu Trip cá nhân thành booking inventory/price guarantee.

Pacing snapshot cho phép ba enum đã lưu, transport snapshot cho phép bốn enum đã biết khi được cung cấp. Thiếu transportation được giữ là chưa lưu; không tự gán car. Generate mới vẫn chỉ balanced/car/motorbike theo T03-B.

### 4.3. Update và atomic consistency

Update hỗ trợ patch title/name, notes, preferences, actualSpentVND, isPublic và snapshot fields được allowlist; đổi cấu trúc dùng **một trong `days` hoặc `itinerary` dạng array**, không gửi cả hai. Nếu đổi ngày/counts phải gửi snapshot fields còn lại nhất quán; không tự kéo giãn lịch hoặc đổi giá.

- Preferences/title-only chỉ update đúng field đó, giữ nguyên itinerary/metadata/amounts.
- Khi snapshot đổi: lock row theo ownership trong transaction, validate toàn bộ dữ liệu merged, rồi một update ghi itinerary, metadata, selected IDs, totals và scalar liên quan. Lỗi validation không ghi title/notes trước rồi mới thất bại.
- Day/trip totals client gửi chỉ là advisory: nếu numeric hợp lệ nhưng mâu thuẫn, derive lại từ breakdown; nonfinite/âm/sai kiểu vẫn reject. Activity costs là ước tính người dùng cung cấp, không được “xác thực giá” chỉ vì server cộng lại.
- Hotel activity cost phải 0đ trong GROUP_VND_V1; phí lưu trú nằm ở lodging, không tính trùng. Lưu trú theo pattern N−1, ngày 0 đêm không có room fee.
- Update không scale giá khi đổi counts/mode; các amount vẫn là ước tính cả nhóm đã nhập. Không thêm price service/optimizer.

### 4.4. Legacy

Read không validate lại bằng contract generate, không relabel legacy thành GROUP_VND_V1, không nhân/chia/reprice hoặc backfill số đêm/counts/assumptions bị mất trước đây.

Legacy vẫn sửa tên/preferences/notes và các scalar an toàn theo allowlist, giữ nguyên snapshot. Edit itinerary/ngày/cost metadata hoặc cố đổi costBasis cho legacy bị **422 `LEGACY_TRIP_ITINERARY_READ_ONLY`**. UI nói rõ giới hạn và đơn vị chưa xác nhận. Mở xem legacy packed/train vẫn hoạt động khi các thông tin đó có thật trong dữ liệu; không khôi phục mode chưa từng được lưu bằng suy đoán.

## 5. Migration và thực thi trên DB test

File mới: `database/migrations/20261028_11_trip_planner_metadata.sql`.

- Thêm **một cột nullable JSONB** `trip_sessions.planner_metadata`.
- CHECK cho phép NULL hoặc object JSONB không vượt 32 KiB UTF-8.
- Không backfill, không chuyển đơn vị, không thay itinerary/amounts, không thêm ngày/activity giả. Legacy rows giữ NULL.
- Model field `plannerMetadata` map rõ tới `planner_metadata`; verifier kiểm migration, CHECK và column JSONB nullable.

Đã dry-run với exact test target, rồi sau khi preflight identity/sentinel thành công mới apply. Runner xác minh checksum và **SKIP 01–10, APPLIED riêng 11**. Không reset, DROP/TRUNCATE hoặc seed đè. Schema verifier sau apply: **11 migrations, 23 app tables, 39 FKs, PostGIS 3.4.3 — PASS**.

SHA-256 migration file và checksum đã tracked đều là:

`90c42676606d4d5e7458edde139b9c5b945dd3ca0d574490a581ad6bcd98a034`

Migration mới chỉ apply ở **travelgo_ai_m0_test**. Database khác chưa bị đụng; cần apply bằng quy trình phù hợp trước khi dùng model/schema mới trên target khác, không tự chạy theo `.env` mặc định. Không có rollback tự động xóa metadata; nếu cần quay code/schema phải giữ dữ liệu và có task riêng.

## 6. Regression: phân biệt bằng chứng thật

### 6.1. Unit FAIL trước sửa → PASS sau sửa

Lần đầu `npm.cmd run test:trip:unit`: **2 PASS /23 FAIL**, exit **1** (25 nhóm). Những lỗi thực sự thấy ở service/mapping unit:

- Create/read mất costBasis/metadata.
- Client top-level total 1 được tin và lưu trong unit adapter, expected từ breakdown **375**.
- Update bỏ Place A nhưng selected IDs vẫn còn A; expected derive lại chỉ B.
- Non-array activities gây **TypeError**, thay vì lỗi validation 400.
- Ngày/count/coords/amount/text sai và owner field chưa bị chặn trước write adapter.
- Invalid patch hoặc edit legacy không được từ chối theo contract mới.

Đây là unit doubles, **không chứng minh DB trước sửa đã lưu/rollback như vậy hoặc chứng minh public API từng bị chiếm owner**. Controller cũ vốn lọc bớt trường; unit direct-service cho thấy lớp service thiếu bảo vệ.

Sau sửa 25 nhóm cũ PASS; thêm các case envelope/route UUID, immutable snapshot, empty activities, legacy conversion refusal, precision/overflow, actual Generator output, cent arithmetic và UTF-8 byte cap. **Lần cuối 35/35 PASS, exit 0**, stdout ghi `persistenceEvidence=false`, `database=NOT USED`. Những case thêm sau sửa không được nhận là đã FAIL ở baseline cũ.

### 6.2. HTTP/PostgreSQL thật — 9 nhóm PASS

`test:trip:postgres` có preflight guard/sentinel và yêu cầu đúng test DB; kiểm checksum migration 11/cột metadata trước tạo fixtures. Test không seed đè, chỉ register hai tài khoản fixture mới và tạo Trip thuộc chúng.

Đã kiểm thật:

1. POST Trip → đọc row Sequelize: metadata/costBasis/mode/counts đúng, top-level/day total mâu thuẫn được derive lại.
2. GET → metadata/nights/assumptions/IDs/totals đầy đủ.
3. Title/preferences-only → giữ nguyên JSON/metadata/amounts.
4. Thêm/reorder activity → selected ID order/dedupe và tổng đúng.
5. Xóa activities → IDs rỗng, lodging còn, total đúng cả response và row.
6. Decimal amounts → DB DECIMAL và response total/difference đúng 0,3, không float drift hoặc nhân số khách.
7. Invalid update title+coords → HTTP400, row JSON/timestamp không đổi; metadata UTF-8 quá giới hạn cũng HTTP400, không tạo Trip thứ hai.
8. Cross-user GET/PUT →404; root userId spoof →400.
9. Chỉ row fixture mới được đánh dấu legacy → GET giữ packed/777, edit itinerary →422, DB amount vẫn777.

Kết quả cuối **exit 0, checks=9, result=PASS**. HTTP400/404/422 và error logs trong negative paths là expected assertions, không phải suite failure. Không suy từ suite này thành race/concurrency stress test đã PASS.

### 6.3. Browser Edge + API + DB thật

File mới `frontend/e2e/t04a-trip.spec.ts`, dùng config Edge headless/1 worker hiện có, backend/frontend local riêng. `beforeAll` xác minh guard/sentinel; fixture là tài khoản mới, không dùng/sửa mật khẩu tài khoản seed.

Luồng thực đã PASS:

`Generate motorbike → Save → Trip UI → refresh → đọc API và row DB → sửa preferences bằng UI → My Trips → reopen → so sánh days/metadata/totals`.

Sau đó chỉ Trip của fixture được gắn metadata legacy train/packed và amount777: browser reload hiển thị đúng đơn vị chưa xác nhận, mode đã lưu và 777đ; DB không bị reprice khi mở xem.

**Lần cuối 1/1 PASS, exit 0**, test 3,9 giây, cả run 7,4 giây. Trước đó cũng có lượt PASS; đã chạy lại sau thay đổi kiểm byte cap metadata cuối cùng. Không tính hai lượt thành hai case độc lập.

Các test có cleanup chỉ nhắm user ID/Trip mới của chính test, có guard/sentinel. Read-only audit sau các lượt chạy ghi **27 Trip**, bằng số trước test; metadata ở các Trip cũ vẫn NULL. Không tuyên bố đã fingerprint toàn bộ nội dung 27 rows trước/sau; SQL migration không backfill và code test không target các row cũ.

## 7. File thay đổi trong T04-A

| File | Mục đích |
|---|---|
| `backend/src/utils/tripSnapshot.ts` — mới | Envelope/shape/text/ID/date/count/money validation, derived totals/IDs, metadata và legacy update policy |
| `backend/src/controllers/tripController.ts` | Validate envelope, chuyển update body đầy đủ cho allowlist thay vì lọc/falsy alias âm thầm |
| `backend/src/services/tripSessionService.ts` | Canonical create, serialize metadata, transaction update/row lock, GET/update UUID guard |
| `backend/src/repositories/tripRepository.ts` | Optional transaction + row lock, luôn where id/userId |
| `backend/src/models/TripSession.ts` | Nullable plannerMetadata field |
| `database/migrations/20261028_11_trip_planner_metadata.sql` — mới | Cột/check additive, không data backfill |
| `backend/src/scripts/verifyDatabase.ts` | Xác minh migration11/check/column |
| `backend/src/tests/tripSnapshot.test.ts` — mới | 35 unit groups, không giả làm DB evidence |
| `backend/src/tests/tripSnapshot.postgres.test.ts` — mới | HTTP/PostgreSQL create/update/reopen/isolation/legacy có guard, cleanup own fixtures |
| `backend/package.json` | Scripts test:trip:unit và test:trip:postgres |
| `frontend/src/types/index.ts` | Các field metadata optional cho read Trip/legacy |
| `frontend/src/utils/tripCosts.ts` — mới | View model dùng amounts/modes đã lưu, không infer/reprice legacy |
| `frontend/src/pages/TripDetailPage.tsx` | Hiển thị metadata, nights/group/legacy units và breakdown; không sửa popup/check-in logic |
| `frontend/tests/tripCosts.test.ts` — mới | 3 nhóm projection group/legacy/unknown version, không gọi là browser |
| `frontend/e2e/t04a-trip.spec.ts` — mới | Browser với real API/DB, no seeded-account dependency |
| `frontend/package.json` | Script test:trip-costs |
| `docs/HUGO_T04_A_TRIP_REPORT.md` — mới | Audit trước/sau, contract, evidence và giới hạn |

Planner save handler, frontend TripService, source/tests T03-A/T03-B, Booking/auth/AI/manifest giữ nguyên trong phiên. Phần hàm check-in/progress và popup HTML trong file Trip đã thay UI được giữ nguyên, không gọi đây là đã sửa T04-B/T05.

## 8. Command/exit code và môi trường

Windows x64/PowerShell; Node **v24.20.0**, npm **11.19.0**, TypeScript **5.9.3**, Vite **6.4.4**, Playwright **1.64.0**, browser project **edge-desktop**, PostGIS **3.4.3**.

| Cwd / command | Kết quả thực trong T04-A |
|---|---|
| workspace — `docker ps --format ...` đầu phiên (sandbox và host) | exit1, engine pipe chưa có; không coi là DB readiness PASS |
| backend — Node TCP probe host 127.0.0.1:5432 đầu phiên | ECONNREFUSED, exit1 ngoài sandbox |
| workspace — `docker ps --format ...` sau user bật Docker | exit0, container healthy |
| backend — Node/pg `BEGIN READ ONLY` preflight + repo guards | exit0; exact test DB, sentinel, PostGIS/migrations/count đã xác minh |
| backend — `npm.cmd run db:migrate` với target test, không --apply | exit0, DRY RUN, liệt kê 11 files; không phải kiểm syntax/apply SQL |
| backend — `npm.cmd run db:migrate:apply` | exit0, chỉ migration11 APPLIED; 01–10 SKIP |
| backend — `npm.cmd run db:verify` | exit0, 11 migrations/23 tables/39 FKs/PostGIS3.4.3 PASS |
| backend — `npm.cmd run test:trip:unit` trước sửa | exit1, 2/25 PASS |
| backend — `npm.cmd run test:trip:unit` cuối | exit0, **35/35 PASS** |
| backend — `npm.cmd run test:trip:postgres` cuối | exit0, **9 nhóm PASS**, real DB/HTTP |
| backend — `npm.cmd run test:planner:validation` | exit0, **50/50 PASS**, T03-A expectations không đổi |
| backend — `npm.cmd run test:planner:modes` | exit0, **17/17 PASS**, mode/cost invariant không đổi |
| backend — `npm.cmd run test:planner:mandatory` | exit0, **9/9 PASS** |
| backend — `tsc` qua build của các scripts | exit0, backend build PASS trước mỗi test; PostgreSQL test mới cũng compile |
| frontend — `npm.cmd run test:trip-costs` | exit0, **3 nhóm PASS** |
| frontend — `npm.cmd run test:planner-costs` | exit0, **6/6 PASS** |
| frontend — `npm.cmd run build` | exit0, tsc + Vite **1.731 modules**, quyền thực thi phù hợp theo lỗi sandbox đã biết |
| frontend — `npm.cmd run test:e2e -- e2e/t04a-trip.spec.ts` | exit0, **1/1 Edge PASS**, real API/DB, lượt cuối 7,4 giây |
| backend — final read-only DB audit | exit0, sentinel PASS, 27 Trips, migration checksum khớp |
| workspace — `git diff --check -- backend frontend database` | exit0, cảnh báo LF/CRLF dự kiến; không whitespace error |

Các lệnh DB/browser dùng environment test đã liệt kê ở mục2; không copy password/token vào command log hoặc báo cáo. Không cộng các suites chồng lấn/lượt lặp thành số test độc lập. Các suite không liên quan Booking/auth/full roles không chạy lại chỉ vì đổi Trip; không ghi kết quả lịch sử của chúng là vừa chạy.

## 9. Giới hạn và việc dành cho T04-B

- **Không còn blocker DB của T04-A** sau khi user bật Docker. Migration11 chỉ được xác nhận apply trên test DB được phép; `.env` và database demo/thật không đổi.
- Chưa stress-test nhiều request concurrent, chưa chạy browser mobile/cross-browser hoặc toàn bộ role E2E. Transaction/row-lock có trong implementation; không suy từ unit hay một luồng E2E thành chứng minh mọi race đã được kiểm.
- Chưa sửa check-in/progress/GPS hoặc tái tính ETA khi reorder/delete. Việc itinerary đổi có thể làm check-in cũ/progress cần reconcile; dành T04-B.
- Xung đột source có sẵn: nút “Bắt đầu chuyến đi” gửi `{status:'active'}` qua generic update; controller cũ bỏ qua status. T04-A reject server-managed fields rõ ràng thay vì âm thầm nhận; không triển khai status transition trong task này. Cần T04-B chốt endpoint/transition hợp lệ, không mở whitelist cho client tùy ý ghi status/progress.
- Legacy metadata đã mất trước đây không thể phục hồi bằng migration; chỉ read-only snapshot và safe scalar edits. Tạo mới phải có version; người dùng có thể tạo lịch mới từ Planner thay vì chuyển tiền legacy âm thầm.
- Metadata/mode và costs chỉ là snapshot ước tính; không có chữ ký chứng nhận input từ Planner, không kiểm booking inventory/giá nhà cung cấp. Place UUID được validate định dạng, không phải chứng nhận availability.
- Popup vẫn có HTML interpolation đã được ghi trong scope T05; không sửa/sanitise nó trong T04-A. Bounds text/coords không được trình bày như giải pháp XSS.
- Money precision theo DECIMAL(15,2); submit giá trị dưới 0,01 hoặc vượt range bị 400 thay vì ghi tròn âm thầm. Generated T03 amounts integer được giữ nguyên; giả định phòng/nhóm và priceFrom thiếu đơn vị vẫn như T03-A.

**Dừng tại T04-A. T04-B/check-in và T05–T07 chưa được thực hiện.**

## 10. Tiếp tục T04-A sau khi chuyển Docker — kết quả mới

Thời điểm: **28/10/2026, khoảng 11:34–11:35 +07:00**. Workspace mới `C:\Users\Danh\Downloads\HCH\DACN\travelgo`; HEAD vẫn `052531dfc77c4f289757794c0ee08b4d46e6af2e`, chạy trên working tree chưa commit. Docker/project/volume đã được xử lý ở [báo cáo chuyển thư mục](HUGO_DOCKER_PATH_MIGRATION_REPORT.md); không recreate hoặc sửa Compose thêm trong lần tiếp tục T04-A này.

### 10.1. Giữ phần đã hoàn thành và xác minh đúng DB test

Đã đọc lại scope T02, báo cáo T03-A/T03-B, báo cáo T04-A và đường dữ liệu Planner → TripService → controller/service/repository/model → GET → TripDetail. Không thay implementation validation, persistence, migration hoặc UI đã hoàn thành. Kiểm Git status và hash **439 file** đầu phiên để bảo toàn thay đổi có sẵn.

Preflight Node/Sequelize chạy **read-only trước fixture write**, dùng chính `assertTestDatabaseWriteOptIn` và `assertDatabaseSentinel` của repo, đồng thời bắt buộc exact target `travelgo_ai_m0_test`. Kết quả exit 0:

| Kiểm tra | Kết quả mới |
|---|---|
| NODE_ENV / host / port | `test` / `127.0.0.1` / `5432` |
| DB_NAME / TEST_DATABASE_NAME | Cùng là `travelgo_ai_m0_test` |
| ALLOW_TEST_DB_WRITES / DB_SSL | `true` / `false` |
| Identity + sentinel | PASS; `hugotravel-isolated-test-database-v1` |
| Migration 11 checksum trong DB/file | Khớp `90c42676606d4d5e7458edde139b9c5b945dd3ca0d574490a581ad6bcd98a034` |
| Cột planner_metadata | JSONB, nullable YES |
| Dữ liệu trước test | 27 Trip, 98 users; metadata của 27 Trip cũ vẫn NULL |

Không dùng `travelgo_dev` để integration/E2E, không sửa `.env`; environment chỉ áp dụng cho process kiểm tra và backend con. Không apply lại migration, seed hoặc reset. Suite integration/browser cũng tự xác minh guard/sentinel trước khi tạo fixture và trước cleanup.

### 10.2. Hai file test được bổ sung

- `backend/src/tests/tripSnapshot.postgres.test.ts`: đọc lại GET và row DB sau create/title-preferences update/add-reorder/delete/decimal update; so sánh itinerary, metadata, modes, IDs, amounts. Thêm Place trùng tham chiếu để kiểm dedupe, và hai case persistence 1 ngày/3 ngày.
- `frontend/e2e/t04a-trip.spec.ts`: bổ sung assertion selected IDs, lodging breakdown, pacing/counts, metadata và totals sau refresh, lưu preferences bằng UI và reopen từ My Trips; so sánh cả row DB sau update.

Đây là bổ sung bằng chứng regression; **không có bug nghiệp vụ mới được tái hiện** trong lần tiếp tục. Không gọi các assertion mới là đã FAIL trên baseline cũ. Trước khi cập nhật báo cáo, hash 439 file chỉ khác đúng hai test trên; code ứng dụng, Python/report có sẵn, cấu hình Docker và manifest giữ nguyên. File thứ ba thay đổi trong lần này là chính báo cáo T04-A.

### 10.3. HTTP/PostgreSQL — 11 nhóm PASS mới

Chạy thật qua HTTP vào Express và PostgreSQL, không dùng mock persistence:

1. Create snapshot có top-level/day total mâu thuẫn → canonical total 300 từ activity 100 + lodging 200; metadata/motorbike/counts lưu đúng row DB.
2. GET/reopen → mọi field metadata, nights, pacing, IDs, days, budget/difference và total khớp dữ liệu được chấp nhận.
3. Title/preferences-only → không mất itinerary, metadata, counts/modes, IDs hoặc amounts; GET và row DB cùng xác nhận.
4. Thêm/reverse activities, có hai activity tham chiếu cùng Place → unique IDs đúng thứ tự lần xuất hiện đầu, total 350, lodging vẫn 200; GET/row nhất quán.
5. Xóa toàn bộ activity → IDs rỗng, không mất 1 đêm lodging 200, trip total 200; GET/row nhất quán.
6. Custom activity không placeId, activity 0,1 + lodging 0,2 → total 0,3, difference 0,3 theo budget 0,6; không nhân số khách; GET/DECIMAL đúng.
7. Invalid patch title + latitude 100 → HTTP400, toàn bộ row kể cả timestamp không đổi; create metadata vượt byte cap → HTTP400, không tạo thêm Trip.
8. Cross-user GET/PUT →404; root userId spoof →400.
9. Chuyến 1 ngày → 0 đêm, lodging 0, total 100; GET/row giữ nguyên, không phát sinh phí hotel.
10. Chuyến 3 ngày → 2 đêm `[1,1,0]`, lodging 200 +125; hotel marker 0đ, activity 100 → total **425**; không tính trùng lodging, không nhân 3 khách; GET/row giữ nguyên.
11. Chỉ Trip fixture được đánh dấu legacy → GET giữ packed/777, itinerary update →422, row vẫn 777; không reprice.

Các amount nhỏ là fixture kiểm tra phần mềm trong DB test, không phải giá catalog hoặc booking. Trong helper đọc lại, day total được đối chiếu với activity sum + lodging bằng đơn vị cents; trip total đối chiếu day sum. Từng case vẫn có expected amount/ID cụ thể, không chỉ so response với chính nó.

Kết quả stdout cuối: `suite=trip-snapshot-postgres`, **checks=11, result=PASS**, exit **0**. Các HTTP400/404/422 và log error tương ứng là negative assertions được mong đợi.

### 10.4. Edge E2E — 1/1 PASS mới

Backend riêng port **5114**, frontend riêng **3114**, `reuseExistingServer=false`, 1 worker. Backend được build bởi suite PostgreSQL trước E2E, kế thừa exact test environment phía trên.

Luồng browser thật: **Generate motorbike → Save → TripDetail → refresh → kiểm API/row DB → sửa sở thích bằng UI → My Trips → reopen**. So sánh days bao gồm activity/day totals và lodging, `GROUP_VND_V1`, nights, assumptions, modes/counts, selected IDs, budget/trip total/difference/status. Row DB sau preferences update phải giữ nguyên itinerary, metadata, IDs và amount; preferences là `['am-thuc']`.

Sau đó chỉ fixture được đổi thành legacy train/packed/777 để kiểm mở xem: UI giữ nhãn đơn vị chưa xác nhận, mode cũ và số tiền 777; DB không bị định giá lại.

Kết quả **1/1 PASS**, exit **0**, test **5,5 giây**, toàn run **12,6 giây**. Đây vẫn là một case browser, không cộng các bước/assertion thành nhiều test độc lập. Thao tác thêm/xóa/reorder Trip được kiểm qua HTTP/PostgreSQL ở trên; không tuyên bố đã thao tác một trình chỉnh sửa itinerary bằng UI chưa có trong case E2E.

### 10.5. Lệnh thực chạy và kết quả mới

Trong mỗi process DB/E2E, đặt bằng PowerShell (không ghi vào `.env`):

```powershell
$env:NODE_ENV='test'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5432'
$env:DB_NAME='travelgo_ai_m0_test'
$env:TEST_DATABASE_NAME='travelgo_ai_m0_test'
$env:ALLOW_TEST_DB_WRITES='true'
$env:DB_SSL='false'
```

| Cwd / lệnh | Kết quả mới |
|---|---|
| workspace — `git status --short`, `git rev-parse HEAD`, hash inventory 439 file | Exit 0; baseline được giữ |
| backend — Node/Sequelize `BEGIN READ ONLY`, repo guard/sentinel, migration checksum/column và Trip fingerprint | Exit 0, trước và sau test |
| backend — `npm.cmd run test:trip:postgres` | Exit 0, build TypeScript + **11 nhóm PASS** |
| frontend — `$env:PLAYWRIGHT_BACKEND_PORT='5114'; $env:PLAYWRIGHT_FRONTEND_PORT='3114'; npm.cmd run test:e2e -- e2e/t04a-trip.spec.ts` | Exit 0, **1/1 Edge PASS**, backend/frontend do Playwright quản lý |
| workspace — `git diff --check -- backend/src/tests/tripSnapshot.postgres.test.ts frontend/e2e/t04a-trip.spec.ts docs/HUGO_T04_A_TRIP_REPORT.md` | Exit 0 |

Node **v24.20.0**, npm **11.19.0**, Windows/PowerShell; dependencies/browser và app source giữ nguyên. **Không chạy lại** unit 35/35, planner validation 50/50, modes 17/17, mandatory 9/9, frontend trip-costs 3 nhóm, planner-costs 6/6 hoặc frontend production build: tái sử dụng kết quả phiên triển khai ở mục 8 vì lần này chỉ sửa tests/báo cáo. Backend build là kết quả mới do script PostgreSQL chạy `tsc`. Không mở rộng sang suite Booking/auth/full E2E hoặc train.

### 10.6. Cleanup, giới hạn và điểm dừng

Read-only audit sau cả hai suites: guard/sentinel PASS, checksum/cột metadata không đổi, **27 Trip, 98 users**, metadata trên Trip cũ vẫn NULL. Fingerprint MD5 của toàn bộ JSON mỗi Trip, sắp xếp theo ID (gồm amounts, metadata, itinerary và timestamps):

```text
Trước: cccebc57a6ccee93c3b3b80850ff26a1
Sau:   cccebc57a6ccee93c3b3b80850ff26a1
```

Khác với audit chỉ đếm dòng ở phiên trước, lần này có fingerprint toàn bộ 27 Trip trước/sau. Không tuyên bố đã fingerprint toàn bộ bảng khác hoặc kiểm stress concurrency. Fixture cleanup chỉ nhắm đúng user/Trip vừa tạo của test, không đụng Trip cũ.

**Không còn blocker T04-A.** Phần chưa kiểm vẫn gồm concurrency stress, browser mobile/cross-browser và toàn bộ role E2E. Chưa apply migration trên `travelgo_dev` hoặc database khác; nếu dùng schema/code mới ở các target đó cần task migration riêng. Các giới hạn legacy, status/check-in/progress, ETA sau reorder và popup ở mục 9 còn nguyên; không được coi là đã sửa hoặc PASS trong lần này.

**Dừng sau T04-A; chưa thực hiện T04-B hoặc T05–T07, không push/deploy.**
