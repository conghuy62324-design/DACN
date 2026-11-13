# T04-B — Lifecycle, check-in và progress Trip

Ngày **28/10/2026**, giờ Việt Nam. Workspace `C:\Users\Danh\Downloads\HCH\DACN\travelgo`, HEAD nền `052531dfc77c4f289757794c0ee08b4d46e6af2e`, chạy trên working tree chưa commit có sẵn T03/T04-A. Căn cứ: [scope T02](HUGO_6_WEEK_SCOPE.md), [báo cáo T04-A](HUGO_T04_A_TRIP_REPORT.md), source hiện tại.

**T04-B hoàn thành:** Start riêng, check-in theo activity, progress derive và reconciliation có row lock. Regression mới **9/9 unit**, **12 nhóm HTTP/PostgreSQL**; chạy lại T04-A **35/35 unit**, **11 nhóm HTTP/PostgreSQL**. Edge chạy ghép T04-A/T04-B **2/2 PASS**. Backend/frontend build PASS. Database duy nhất dùng test/write: **travelgo_ai_m0_test**, guard/sentinel đã xác minh. Toàn bộ 27 Trip có sẵn giữ nguyên fingerprint sau cleanup.

## Contract chốt trước sửa

- Start qua action riêng, ownership từ auth: upcoming → active; active retry không write; completed/cancelled →409. Complete: active → completed; completed retry không write; upcoming/cancelled →409. Không có reopen/cancel action mới. Generic update vẫn cấm status/progress/checkins.
- Check-in mới định danh bằng activityId duy nhất trong itinerary, gồm cả activity tự tạo không placeId. Endpoint cũ nhận placeId chỉ khi khớp đúng một activity; mơ hồ →409, không thuộc lịch →400. placeName client không quyết định tên được lưu.
- Check-in mới chỉ khi active; retry activity đã check-in trên active/completed trả bản cũ, không đổi timestamp/notes/geo. Không triển khai sửa check-in. Không GPS vẫn check-in; geo hợp lệ chỉ là vị trí đính kèm, không chứng nhận thực địa.
- Progress = round(100 × số activity hợp lệ đã check-in / số activity có ID hợp lệ duy nhất), gồm mọi category. Empty itinerary =0. Frontend sử dụng projection ID/count từ backend, không đếm checkins.length hoặc match tên/place. Complete không ép 100.
- Reorder giữ identity. Xóa activity hoặc đổi Place tham chiếu của cùng ID: giữ bản ghi lịch sử nhưng loại khỏi progress, không tự hồi sinh khi ID được thêm lại. Đổi title/notes/cost không đổi identity. Giữ lịch sử legacy; chỉ resolve qua placeId hoặc custom ID cũ khi duy nhất, không match theo tên. ID thiếu/trùng hoặc legacy mơ hồ được báo giới hạn và không đoán mapping.
- Read chỉ derive projection, không rewrite legacy DB. Khi mutation cần reconcile, ghi liên kết an toàn hoặc lý do không thể ánh xạ trên chính JSON checkins, giữ nguyên dữ liệu lịch sử; không migration/backfill/đổi giá. Update itinerary và check-in/action cùng transaction + row lock theo owner.

## Audit trước sửa

| Nơi | Source finding trước sửa |
|---|---|
| TripDetail.handleStartTrip / TripService.updateTrip | PUT /api/trips/:id với status=active; validator T04-A cấm status |
| TripController.checkinPlace / TripSessionService.checkinPlace | Nhận placeId/placeName client, không membership, !!geo được gắn verifiedViaGeo |
| TripSessionService.checkinPlace | Tử số checkins.length, mẫu số tổng activities; upsert theo Place nên nhiều occurrence bị nhập chung; không row lock |
| TripDetail/MyTrips | Đếm checkins.length; Detail match placeId hoặc tên nên có thể đánh dấu nhiều activity |
| TripSessionService.updateTrip | T04-A đã lock row nhưng chưa reconcile checkins/progress khi sửa lịch |
| TripSessionService.completeTrip | Ghi completed và progress=100 dù chưa check-in hết, chưa kiểm transition/lock |

## API và dữ liệu sau sửa

| Action | Contract |
|---|---|
| `POST /api/trips/:id/start` | UUID route; lookup id + auth userId, transaction/row lock. upcoming → active; active trả bản hiện có, không UPDATE timestamp. completed/cancelled →409 `INVALID_TRIP_TRANSITION`. Không có Trip đúng owner →404 |
| `POST /api/trips/:id/complete` | active → completed; completed retry không write; upcoming/cancelled →409. Tính progress từ check-in hiện có, không gán 100 |
| `POST /api/trips/:id/checkin` | Body object chỉ nhận activityId **hoặc** placeId compatibility, optional placeName/notes/geo; trường ngoài allowlist →400 `INVALID_TRIP_CHECKIN`. placeName chỉ được kiểm kiểu/độ dài để tương thích, giá trị lưu lấy từ activity server |
| Generic `PUT /api/trips/:id` | Giữ allowlist T04-A; status/progress/progressPercent/checkins vẫn bị từ chối. Khi snapshot đổi: reconcile history và progress trong cùng transaction ghi itinerary/IDs/totals |

ID activity theo format T04-A: 1–120 ký tự chữ/số/_/-, duy nhất toàn itinerary. Với dữ liệu legacy, activity thiếu/trùng ID, title không phải string hoặc Place reference sai kiểu không được tự sửa thành một activity hợp lệ. Legacy `placeId` API hỗ trợ cả trường hợp client cũ dùng custom activity ID trong field này; chỉ nhận khi khớp một activity đủ điều kiện. Một Place xuất hiện nhiều lần →409 `AMBIGUOUS_TRIP_ACTIVITY`; không tìm thấy activity →400 `INVALID_TRIP_ACTIVITY`, hoặc 409 nếu itinerary cũ có identity không rõ. Không dùng tên để chọn activity.

Notes là chuỗi tối đa 5000 ký tự; placeName compatibility tối đa 255. Geo nếu gửi phải là object với latitude number hữu hạn [-90,90], longitude [-180,180]; accuracyMeters nếu có phải number hữu hạn ≥0, đơn vị mét. Không coercion string/null/NaN/Infinity. Thiếu geo hợp lệ cho check-in thủ công. Client không được gửi verifiedViaGeo, checkedInAt, progress hoặc trạng thái hoàn thành.

Check-in mới lưu `activityId`, Place ID nếu activity có Place, `placeName` từ title hiện tại, timestamp server, notes và tọa độ/accuracy nếu có. New record luôn `verifiedViaGeo=false`; projection trả `hasAttachedLocation` theo tọa độ hợp lệ. Dữ liệu legacy từng có verifiedViaGeo=true được giữ trong lịch sử nhưng UI không dùng nó để tuyên bố xác minh GPS.

Retry giữ nguyên bản ghi đầu tiên, kể cả timestamp/notes/geo; chưa có tính năng sửa note của check-in cũ. Retry check-in đã tồn tại trên active/completed trả thành công không ghi lại; check-in mới trên upcoming/completed/cancelled →409. Luồng cũ auto-start qua check-in được thay bằng Start rõ ràng; UI chặn check-in trước Start và hiển thị lỗi action có kiểm soát.

### Progress, identity và lịch sử

`tripProgress.ts` là nơi quyết định duy nhất. Response trả `progress.eligibleActivityIds`, `checkedActivityIds`, `unmatchedCheckinCount`, `ineligibleActivityCount`, cùng `resolvedActivityId` trên projection check-in. Frontend TripDetail/MyTrips và trạng thái marker dùng các field này; không tự đếm lịch sử hay match Place/tên.

- Mẫu số: mọi category sightseeing/food/hotel/leisure hoặc custom trong itinerary có identity hợp lệ duy nhất. Lodging subtotal không phải activity nên không tự thêm vào mẫu số.
- Tử số: số activity IDs trong mẫu số có check-in được resolve, unique; nhiều bản ghi lịch sử cho cùng activity chỉ đếm một lần. `round(100 × numerator/denominator)`, denominator=0 →0.
- Reorder, đổi title/cost/notes nhưng giữ identity: không mất check-in. Tên tại thời điểm check-in trong lịch sử không bị đổi theo title mới.
- Xóa activity: giữ record, đánh dấu `excludedFromProgress=activity_removed`. Đổi Place reference của cùng ID: `activity_reference_changed`. Thêm lại ID không tự hồi sinh record đã loại; có thể check-in mới khi active.
- Legacy mơ hồ được giữ và báo giới hạn. Khi có mutation cần reconcile, record chưa resolve được gắn `legacy_unresolved`, không để việc xóa một occurrence sau này vô tình gán lịch sử cũ sang occurrence còn lại.
- Legacy resolve duy nhất được gắn activityId khi mutation cần reconcile. Custom legacy từng dùng activity ID làm placeId giữ giá trị cũ ở `legacyPlaceId`, bỏ cách giả Place trên record đã liên kết; timestamp/name/notes/photo/coords vẫn giữ. Read-only không ghi đổi record.
- UI có lịch sử check-in và thông báo số bản ghi không tham gia tiến độ; không tự xóa lịch sử cũ. Trạng thái completed độc lập với progress. T04-A vẫn cho sửa snapshot hợp lệ của Trip versioned theo policy cũ; nếu sửa lịch sau khi completed thì progress phản ánh lịch hiện tại, status không tự mở lại.

GET/list luôn derive progress để không quảng bá phần trăm legacy từng bị ép 100. Không backfill DB khi đọc; cột progressPercent cũ có thể khác projection cho tới mutation thích hợp. Không thay amount, metadata chi phí hoặc costBasis để sửa progress.

Không cần migration mới: checkins vẫn là JSONB hiện có. `planner_metadata`, migration 11, `tripSnapshot.ts` và legacy financial read-only policy T04-A không đổi. Tất cả check-in/action/update itinerary sử dụng `TripRepository.findOwned(..., transaction)` với `SELECT … FOR UPDATE`, validate sau lock, ghi trong cùng transaction; kiểm ownership trước xem activity của Trip.

## Lỗi đã tái hiện và phân loại bằng chứng

Đã viết `tripLifecycle.test.ts` trước sửa implementation rồi chạy build + unit. **0 PASS /6 FAIL, exit1**:

| Trigger rõ | Actual trước sửa | Expected / sau sửa |
|---|---|---|
| Gọi Start action từ service | Không có hàm startTrip | Action tồn tại; active retry không thêm write |
| POST controller check-in Place UUID ngoài itinerary | Status200, ghi check-in | 400, không write |
| Check-in Place hợp lệ nhưng latitude=Infinity | Status200 | 400, không write |
| Complete Trip 2 activities, mới check-in 1 | progress100 | completed, progress50 |
| Gửi lại cùng activity với tên/note khác | Thay timestamp/name/notes, mất activityId của bản đầu | Giữ nguyên record, không write |
| Xóa activity duy nhất đã check-in khỏi lịch 2 activities | Progress cũ50 | Progress0, giữ record lịch sử |

Đây là **unit service/controller với repository/transaction doubles**, không phải bằng chứng PostgreSQL trước sửa. Source finding nút Start gửi PUT status bị validator T04-A chặn đã được audit; không tuyên bố đã chạy browser baseline trước sửa hoặc khai thác cross-user trên DB.

Sau sửa sáu case đều PASS. Thêm ba nhóm unit sau sửa: legacy thiếu/trùng ID không được chọn tùy ý; custom legacy và duplicate history bảo toàn facts/không double count; nonfinite coordinates/accuracy validation độc lập JSON encoding. **Lần cuối 9/9 PASS**, exit0, `database=NOT USED`, `persistenceEvidence=false`. Ba nhóm thêm sau không được tính là đã FAIL ở baseline.

## PostgreSQL/HTTP thật — 12 nhóm mới PASS

Preflight trước write: repo guard/opt-in, exact DB `travelgo_ai_m0_test`, loopback, sentinel `hugotravel-isolated-test-database-v1`, checksum migration11/cột JSONB đã tồn tại. Không apply migration/seed/reset. Suite tự tạo hai tài khoản fixture mới, tạo Trip của chúng qua API, sử dụng token auth thật; không sửa tài khoản seed.

1. Start chuyên biệt, transition sai, UUID sai, cross-user Start/Complete/check-in; retry Start so toàn bộ row và timestamp không đổi.
2. Generic update giả status/progress/checkins kèm title →400, row giữ nguyên.
3. Body/notes/geo/accuracy/membership sai →400, không ghi một phần.
4. Custom activity không Place, tên client giả bị bỏ qua; manual check-in và retry giữ bản đầu, progress50.
5. Tọa độ (0,0), accuracy0 được lưu; hasAttachedLocation=true nhưng verifiedViaGeo=false.
6. Place xuất hiện hai lần: placeId-only →409; activityId cụ thể chỉ đánh dấu một. Place xuất hiện một lần: compatibility API resolve đúng.
7. Reorder giữ check-in; xóa giữ lịch sử và bỏ progress; thêm lại ID không hồi sinh; đổi reference loại bản cũ; empty activities progress0, lodging vẫn 200.
8. Complete khi mới đạt50% giữ50%; retry Complete/check-in cũ không đổi row. Không Start lại completed, không check-in mới vào completed/cancelled; cancelled actions →409.
9. Legacy unversioned/packed/777: read unique resolve đúng, ambiguous không tự map, GET không thay row, edit itinerary vẫn422; action/check-in không reprice/đổi costBasis.
10. Hai activity khác nhau check-in đồng thời → hai record, progress100, không lost update.
11. Hai request cùng activity đồng thời → một record, cùng timestamp trả về, progress50.
12. Check-in đồng thời xóa activity → JSON/IDs/totals/progress nhất quán, lịch sử giữ nếu check-in đã được ghi trước deletion.

Ba case concurrency giữ row lock bằng transaction độc lập, phát hai HTTP request, đọc `pg_stat_activity` xác nhận **cả hai request `wait_event_type='Lock'`**, rồi mới thả lock. Cả ba lần in `blockedRequests:2`. Lượt check-in/delete thực tế: cả hai HTTP200, check-in được ghi trước rồi bị loại khỏi progress khi delete; final progress0, selectedPlaceIds rỗng, total225. Không suy diễn đây là stress test hay đã cưỡng bức mọi thứ tự xen kẽ.

Output cuối `suite=trip-lifecycle-postgres`, **checks=12, result=PASS**, exit0. Các log HTTP400/404/409/422 trong negative assertions là kết quả mong đợi.

## Edge thật — Start, GPS denied, manual check-in, reopen

File mới `frontend/e2e/t04b-trip.spec.ts`; backend riêng port5114, frontend3114, reuseExistingServer=false, 1 worker, Edge headless. Guard/sentinel trước fixture và cleanup; kết nối DB riêng của file test để không phụ thuộc pool module bị file T04-A đóng.

Luồng đã PASS: tạo fixture qua API → mở Trip → check-in disabled trước Start → **POST Start qua nút UI** → permission Geolocation của đúng browser context là **denied** → bấm lấy GPS và thấy thông báo vẫn check-in thủ công được → check-in custom activity có note → **1/3, 33%** → refresh → My Trips → reopen → status active/progress33 → Complete qua UI → refresh → status completed/progress vẫn33. Hai occurrence cùng Place còn lại không bị đánh dấu theo custom activity. Request check-in không chứa geo khi quyền bị từ chối.

So GET và row DB: metadata GROUP_VND_V1, motorbike, nights1, selectedPlaceIds, activity/day/lodging/trip amounts vẫn giữ, tổng425; Complete không sửa financial snapshot. Không mock permission callback: CDP đặt quyền denied vào đúng browserContextId và test kiểm `navigator.permissions` trả denied.

Chạy ghép cùng regression T04-A: **2/2 PASS, exit0**, toàn run9,6 giây; T04-A3,9 giây, T04-B1,9 giây. Không cộng số assertion thành số case browser độc lập.

Hai lượt ghép trước đó exit1 do setup test, không bỏ qua:

- Lượt1: T04-A PASS; T04-B beforeAll gặp pool Sequelize đã bị test A đóng. Sửa file B dùng pg.Client do file tự sở hữu; không sửa application DB config hoặc test A.
- Lượt2: T04-A PASS; T04-B thấy permission `prompt` thay vì `denied` vì CDP áp default context. Sửa dùng browserContextId thật; giữ assertion denied, không nới test thành mô phỏng callback.

Sau lần Edge PASS chỉ chỉnh hai câu giải thích progress/legacy trên UI cho dễ đọc, rồi frontend production build PASS lại; không đổi flow/action hay điều kiện assertions. Không chạy Edge lặp lại chỉ vì hai câu chữ này.

## File thay đổi trong T04-B

| File | Thay đổi |
|---|---|
| `backend/src/utils/tripProgress.ts` — mới | Membership, validation notes/geo, identity/projection/progress và history reconciliation |
| `backend/src/services/tripSessionService.ts` | Serialize progress; Start/Complete/check-in row lock; reconcile trong snapshot update |
| `backend/src/controllers/tripController.ts` | Start action và chuyển body check-in cho validator |
| `backend/src/routes/tripRoutes.ts` | POST /:id/start |
| `backend/src/tests/tripLifecycle.test.ts` — mới | 6 baseline regressions +3 nhóm legacy/nonfinite |
| `backend/src/tests/tripLifecycle.postgres.test.ts` — mới | 12 nhóm HTTP/DB, ownership, retry, lifecycle, concurrency |
| `backend/package.json` | Hai scripts test lifecycle unit/PostgreSQL |
| `frontend/src/services/tripService.ts` | startTrip và checkinActivity |
| `frontend/src/types/index.ts` | Activity association, history/location/progress projection types |
| `frontend/src/pages/TripDetailPage.tsx` | Start action, controls trạng thái, check-in theo activity, lịch sử/progress, wording vị trí |
| `frontend/src/pages/MyTripsPage.tsx` | Count theo projection activity hợp lệ |
| `frontend/e2e/t04b-trip.spec.ts` — mới | Edge real API/DB, GPS denied/manual check-in/reopen/Complete |
| `docs/HUGO_T04_B_TRIP_REPORT.md` — mới | Audit, policy, bằng chứng và giới hạn |

Đã đối chiếu hash **439 file có sẵn**: chỉ 8 file có sẵn trong bảng trên đổi; thêm 5 file mới, không mất file baseline. Các thay đổi Python/report cũ, docs T04-A, `tripSnapshot.ts`, model/repository, migration11, Planner costing/modes/ranking, Docker và manifest giữ nguyên. Logic xác định marker đã check-in đổi sang projection để khớp timeline; chuỗi `marker.bindPopup` được so trực tiếp và **không đổi**, không xử lý HTML/sanitization của T05.

## Lệnh, exit code và môi trường

Windows/PowerShell; Node v24.20.0, npm11.19.0, TypeScript5.9.3, Vite6.4.4, Playwright1.64.0, Edge desktop. Tất cả test DB/browser dùng biến process sau, không sửa `.env` hoặc in mật khẩu:

```powershell
$env:NODE_ENV='test'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5432'
$env:DB_NAME='travelgo_ai_m0_test'
$env:TEST_DATABASE_NAME='travelgo_ai_m0_test'
$env:ALLOW_TEST_DB_WRITES='true'
$env:DB_SSL='false'
```

| Cwd / lệnh | Kết quả mới trong T04-B |
|---|---|
| workspace — `git status --short`, hash inventory | Exit0; giữ baseline dirty tree |
| backend — Node/Sequelize read-only preflight + guard/sentinel/checksum/column/fingerprint | Exit0 trước và sau suites |
| backend — `npm.cmd run build --silent`, rồi `node dist/tests/tripLifecycle.test.js` trước sửa | Build0, test1; 0 PASS/6 FAIL |
| backend — build trung gian sau thêm helper | Exit2, lỗi TS type projection checkins; sửa type tại serializer, không phải lỗi DB |
| backend — `npm.cmd run test:trip:lifecycle:unit` cuối | Exit0; build +9/9 PASS |
| backend — `node dist/tests/tripSnapshot.test.js` sau build mới | Exit0; T04-A35/35 PASS |
| backend — `npm.cmd run test:trip:lifecycle:postgres` | Exit0; build +12 nhóm PASS, 3 row-lock witnesses |
| backend — `npm.cmd run test:trip:postgres` | Exit0; build +T04-A11 nhóm PASS |
| frontend — `npm.cmd run test:trip-costs` | Exit0; 3 nhóm PASS, unit không phải browser |
| frontend — `npm.cmd run build` | Exit0; tsc +Vite, 1731 modules; chạy lại sau hai câu wording cuối |
| frontend — `$env:PLAYWRIGHT_BACKEND_PORT='5114'; $env:PLAYWRIGHT_FRONTEND_PORT='3114'; npm.cmd run test:e2e -- e2e/t04a-trip.spec.ts e2e/t04b-trip.spec.ts` | Hai lượt setup lỗi exit1 như trên; lượt cuối **exit0, 2/2 PASS** |
| workspace — `git diff --check -- backend frontend docs/HUGO_T04_B_TRIP_REPORT.md` | Exit0; chỉ cảnh báo LF/CRLF |
| workspace — so chuỗi popup HTML và đối chiếu hash file cuối | Exit0; popup HTML không đổi, chỉ file đúng phạm vi đổi |

Baseline tái sử dụng: T03-A/T03-B planner validation50/50, modes17/17, mandatory9/9, algorithm14/14 và planner-costs6/6 được ghi trong báo cáo trước ngày28/10; **không gọi là vừa chạy trong T04-B**. Source Planner/Geo/cost helper không đổi nên không chạy lại chúng. T04-A unit/HTTP/Edge bị tác động đã chạy lại như bảng; không dùng kết quả cũ thay kiểm tra persistence lần này.

## Cleanup và phần chưa kiểm

Audit sau tất cả lượt test, kể cả hai lượt Edge setup lỗi: **27 Trip, 98 users**, metadata của 27 Trip cũ vẫn NULL. Fingerprint MD5 toàn bộ JSON từng Trip (sắp theo ID, gồm timestamp/itinerary/checkins/progress/amounts/metadata):

```text
Trước: cccebc57a6ccee93c3b3b80850ff26a1
Sau:   cccebc57a6ccee93c3b3b80850ff26a1
```

Guard/sentinel vẫn PASS; migration11 checksum vẫn `90c42676606d4d5e7458edde139b9c5b945dd3ca0d574490a581ad6bcd98a034`, planner_metadata JSONB nullable. Cleanup chỉ Trip/user IDs được chính suite đăng ký mới. Không fingerprint toàn bộ bảng khác; không tuyên bố users content đã so hash chỉ vì count98.

- Chưa load/stress-test hoặc cưỡng bức mọi interleaving Start/Complete/edit/check-in; đã có ba case cạnh tranh DB thật nêu trên. Không tuyên bố mọi race trong hệ thống đã được giải quyết.
- Browser chỉ Edge desktop headless; chưa mobile/cross-browser, chưa test cảm biến GPS thật hoặc chống giả GPS. Trường hợp geo đính kèm được kiểm API; GPS denied được kiểm bằng browser permission thật.
- Legacy thiếu identity hoặc mapping mơ hồ cần xử lý riêng nếu muốn khôi phục liên kết; UI giữ lịch sử và báo giới hạn. Không có chức năng merge/sửa/xóa lịch sử check-in, hủy/mở lại chuyến đi mới.
- Metadata/costBasis/costing/migration11 không đổi. Không apply schema vào travelgo_dev hay DB khác. Các target khác cần có schema T04-A phù hợp trước khi dùng code mới; lần này chỉ chứng minh trên DB test đã được cho phép.
- Không sửa popup/Booking/auth, thuật toán ETA/routing, giá, AI hoặc manifest. Không push/deploy; không làm T05–T07.

**Dừng sau T04-B. Không còn blocker đối với phạm vi đã yêu cầu.**
