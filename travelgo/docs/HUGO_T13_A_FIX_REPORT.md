# T13-A-FIX — Editor Trip đã lưu và giá xác nhận Booking

Hoàn tất **06/11/2026**, Asia/Saigon. Chỉ xử lý **T13A-01/T13A-02**. Focused cuối **4/4 PASS**, full T13-A trên cùng source ứng dụng cuối **14/14 PASS**, exit0. Regression Trip/Booking và build backend/frontend PASS; cleanup và fingerprint **25/25 bảng trùng**. Không push/deploy.

[Tổng hợp máy đọc được](evidence/t13a-fix/verification_summary.json), [matrix JSON](evidence/t13a-fix/acceptance_matrix.json), [CSV](evidence/t13a-fix/acceptance_matrix.csv).

## Baseline và bảo toàn working tree

Đã đọc [báo cáo T13-A](HUGO_T13_A_CORE_E2E_REPORT.md), source hiện tại, D_SAVED_EDITOR/F_BOOKING, Trip snapshot/lifecycle và `testDatabaseGuard` trước khi sửa. HEAD **`052531dfc77c4f289757794c0ee08b4d46e6af2e`**, working tree T03–T13-A chưa commit được giữ.

- [Baseline status](evidence/t13a-fix/baseline/git-status.txt), [HEAD](evidence/t13a-fix/baseline/head.txt), [hashes 856 file](evidence/t13a-fix/baseline/working-tree-sha256.json). Các source liên quan trước sửa được chép riêng trong `baseline/source/`.
- Toàn bộ **264 file evidence T13-A** có trong baseline giữ nguyên hash, gồm các FAIL, trace, ảnh, JSON/CSV và `LATEST.txt`. Không ghi đè báo cáo T13-A hoặc đổi kết quả cũ thành PASS. [Integrity audit](evidence/t13a-fix/baseline-integrity.json).
- Bằng chứng FAIL lịch sử: [D_SAVED_EDITOR desktop](evidence/t13a/20261031014715-0e4c3d/desktop/D_SAVED_EDITOR-results.json), [mobile](evidence/t13a/20261031014715-0e4c3d/mobile/D_SAVED_EDITOR-results.json); [F_BOOKING desktop](evidence/t13a/20261031015000-473abb/desktop/F_BOOKING-results.json), [mobile](evidence/t13a/20261031015000-473abb/mobile/F_BOOKING-results.json).
- Chỉ sáu file có sẵn được task sửa, đúng danh sách bên dưới. Audit toàn workspace còn thấy `ai/research/t09_kaggle_cpu_demo.ipynb` khác hash baseline chụp ngày31/10; mtime quan sát01/11. Task này không ghi vào notebook đó, không hoàn nguyên nội dung hiện tại; ghi riêng thay đổi ngoài phạm vi trong integrity audit.
- Không reset/stash, sửa `.env`/Docker config, thay pricing/Booking persistence/ranking, thêm solver/AI agent, train sentiment, apply migration, seed/reset/truncate hay mở rộng multi-mandatory UI.

## T13A-01 — Editor Trip đã lưu

**Nguyên nhân:** `TripDetailPage` trước đây chỉ có editor preferences; remove/reorder nằm trên draft Planner và nút save Planner luôn POST Trip mới. Backend PUT Trip đã có ownership, validation, canonical totals/IDs và reconciliation check-in, nhưng chưa được nối với itinerary editor trên trang Trip.

**Thay đổi:** thêm `TripItineraryEditor`, mở bằng “Chỉnh sửa lịch trình”. Component clone Trip hiện tại thành draft; mỗi hoạt động có nút **Lên / Xuống / Xóa**, cùng **Lưu lịch trình / Hủy chỉnh sửa**. Các nút dùng được trong viewport điện thoại, không phụ thuộc kéo thả.

Contract cuối:

- Chỉ mở editor khi `costBasis === GROUP_VND_V1`; Trip đã tải vẫn do API ownership hiện có quyết định. Không mở editor cho legacy không rõ đơn vị, không tự suy đơn vị hoặc đổi giá catalog.
- Save gọi **`PUT /api/trips/{trip.id}`**, body chỉ `{days: draft.days}`. Không POST, không gửi kết luận giá/cảnh báo do client như dữ liệu chuẩn và không đổi Trip ID. Backend giữ metadata hiện có, tính lại IDs/totals và reconciliation theo contract cũ. Sau thành công dùng **response server** cập nhật Trip UI.
- Dùng lại `removePlannerActivity`/`movePlannerActivity` của Planner; không có công thức chi phí riêng trong editor. Helper dùng cộng cent cho snapshot tự nhập có hai chữ số thập phân theo T04, tránh `0,1+0,2` thành số không được server chấp nhận. Reorder cập nhật thứ tự selected IDs nhưng không đổi activity/Place IDs, giá hoặc nội dung activity.
- `isMandatoryPlannerActivity` nhận ba marker `recommendationReason` **đã tồn tại và được lưu** cho attraction/restaurant/hotel mandatory. Cùng helper chặn remove trong Planner và editor Trip, cả UI disabled và handler. Không thêm field/schema/whitelist backend để bật editor. Không đoán một activity là mandatory chỉ vì category hotel hoặc giá0.
- Remove chỉ trừ khoản của activity tùy chọn; giữ riêng `lodgingEstimatedCostVND`, `lodgingCostSource` và số đêm. Giữ source labels, assumptions, dates, N−1 nights, modes, các IDs còn lại và metadata.
- Draft có tổng/cảnh báo ngân sách riêng được cập nhật ngay. Phần Trip đã lưu vẫn ghi số tiền đã lưu cho tới khi server chấp nhận draft. Không tăng budget, gọi lại catalog hoặc reprice activity.
- Hủy unmount draft, không gửi cập nhật hoặc sửa canonical Trip. Save có ref chống gửi lặp; khi in-flight khóa điều khiển draft/Hủy. Lỗi transport hoặc lỗi API giữ draft và hiển thị lỗi; không báo thành công. Chỉ hiện “Đã lưu lịch trình” sau PUT thành công.
- Khi editor đang mở, tạm khóa các mutation preferences/start/complete/check-in để tránh thao tác song song trên cùng màn hình; sau đóng editor các điều khiển hoạt động lại. Preferences vẫn dùng editor hiện có và PUT preferences riêng.
- Không đổi backend lifecycle policy: API hiện cho cập nhật snapshot versioned, kể cả active. UI dùng nguyên endpoint; reconciliation/check-in history/progress vẫn do server xử lý. Không sửa whitelist, status transitions hoặc dùng client để ép progress.

Marker mandatory nằm trong dữ liệu snapshot hiện có, không phải chữ ký xác minh bắt buộc từ server. Các snapshot cũ không còn marker không thể khôi phục mandatory bằng suy đoán. Đây là bảo vệ UI nhất quán với Planner; ownership và validation vẫn ở API hiện có.

## T13A-02 — Snapshot giá xác nhận Booking

**Nguyên nhân:** header `BookingModal` luôn dùng `modalData.unitPrice`, kể cả khi đã có `confirmedBooking`; total body dùng snapshot server. Khi catalog fixture đổi100.001→123.457 sau render, header cũ và total mới mâu thuẫn.

**Thay đổi:** khi có `confirmedBooking`, header dùng **`confirmedBooking.unitPrice`**, total dùng **`confirmedBooking.totalAmount`**, discount/quantity dùng đúng các field server thực có. Không lấy lại quote của modal/intent/catalog và không chia total theo số khách để suy đơn giá.

- Trước submit ghi **“Đơn giá ước tính”**. Sau submit ghi **“Đơn giá”** của snapshot xác nhận, với đơn vị trung tính “đơn vị tính giá” để không giả rằng mọi quantity đều là số khách.
- Giá0 hợp lệ được giữ0. `bookingSnapshotMoney` chỉ nhận số hữu hạn không âm; unit/total legacy thiếu hoặc không hợp lệ hiển thị **“Chưa có trong dữ liệu xác nhận”**. Không dùng giá cũ hoặc0 làm fallback giá đã xác minh. Discount thiếu thì không bịa breakdown.
- Không đổi pricing, discount formula, pending intent, idempotency key, retry hoặc Booking DB. Không reprice đơn cũ. Header tên dịch vụ cũng lấy snapshot xác nhận khi có.

Witness thật ở cả desktop/mobile giữ nguyên: mở fixture100.001 → đổi **chỉ tour fixture** thành123.457 sau render → POST tới API thật → xác minh DB commit → cắt response → reload/retry. Header xác nhận **123.457**, API unitPrice **123457**, tổng UI/API/DB **246914**, cùng ID/code/key sau retry; chỉ một Booking/history, PENDING/unpaid.

## Kết quả focused và full, không cộng dồn

| Lượt | Phạm vi | Exit / kết quả |
|---|---|---|
| `20261106043103-4e85df` | Khởi động đầu tiên ngày06/11 | Build PASS; **NOT RUN browser/DB fixture**: PostgreSQL chưa chạy, ECONNREFUSED127.0.0.1:5432 trước fixture write |
| `20261106043400-48a2fc` | Focused D/F đầu | **exit0, 4/4 PASS**; giữ làm evidence trước khi bổ sung cent precision/PUT422 case |
| **`20261106043555-7092e9`** | **Focused D/F cuối, desktop + mobile** | **exit0, 4/4 PASS**,33,0s; [Playwright](evidence/t13a-fix/20261106043555-7092e9/playwright.json), [command/log](evidence/t13a-fix/20261106043555-7092e9/browser.json) |
| **`20261106043724-bddc1d`** | **Full T13-A, source cuối** | **exit0, 14/14 PASS**, khoảng1,8phút; [Playwright](evidence/t13a-fix/20261106043724-bddc1d/playwright.json), [command/log](evidence/t13a-fix/20261106043724-bddc1d/browser.json) |

Full vẫn **7 test × 2 viewport =14**, không thêm test case độc lập; D được mở rộng thành chuỗi thao tác thực thay vì chỉ tìm control. Full có **108 checkpoint PASS**, gồm các nhóm assert/diagnostic/layout lặp theo viewport; không gọi là108 luồng độc lập. Không cộng focused4 + full14 thành18 case. Không dùng các PASS lịch sử để thay lượt chạy mới.

Hash application source của focused cuối và full khớp nhau; source không đổi trong từng run. Builds backend/frontend trong runner cuối đều exit0. [Hashes trước full](evidence/t13a-fix/20261106043724-bddc1d/source-hashes-before.json), [sau full](evidence/t13a-fix/20261106043724-bddc1d/source-hashes-after.json), [integrity](evidence/t13a-fix/20261106043724-bddc1d/source-integrity.json).

### D_SAVED_EDITOR đã thực hiện đủ

[Desktop results](evidence/t13a-fix/20261106043724-bddc1d/desktop/D_SAVED_EDITOR-results.json), [mobile results](evidence/t13a-fix/20261106043724-bddc1d/mobile/D_SAVED_EDITOR-results.json):

1. UI đăng ký/Generate/Save → reload Trip, xác minh GET và row DB. Gate tìm editor cũ giữ assertion `count > 0` và nay PASS.
2. Mở editor, hotel mandatory không xóa được, reorder bằng nút, remove attraction810.000 → draft **3.030.000**, vượt **2.930.000**. Hủy: không PUT/POST, toàn row DB kể cả timestamp không đổi.
3. Edit lại; abort PUT trước transport tới backend: lỗi hiện, draft còn3.030.000, DB vẫn3.840.000, không message thành công.
4. Kiểm **PUT422 thật**: chỉ fixture Trip tạm chuyển metadata legacy trong DB sau khi editor mở. Server từ chối `LEGACY_TRIP_ITINERARY_READ_ONLY`; draft giữ, không update itinerary. Restore đúng metadata fixture trong `finally` có guard; không nới API để né lỗi.
5. Retry save đi PUT thật cùng ID, body chỉ days; giữ đúng order/fields của activity còn lại, ngày2 và metadata. **Số Trip không tăng**, không POST. Tổng3.030.000, lodging600.000 còn nguyên; UI lấy response server, reload/My Trips/reopen đối chiếu GET/DB/totals/selected IDs/cảnh báo.
6. Start Trip → check-in activity0 → mở editor active → reorder, xóa activity2 chưa check-in → save. Check-in history/IDs còn nguyên; total **2.895.000**, progress được server reconcile thành **14%**, không ép100%. Reload UI/DB nhất quán.
7. Save preferences vẫn hoạt động. Chỉ row fixture được chuyển legacy null metadata: UI không có editor itinerary, PUT days trả422, itinerary DB giữ nguyên.

### F_BOOKING giữ witness và assertion

[Desktop results](evidence/t13a-fix/20261106043724-bddc1d/desktop/F_BOOKING-results.json), [mobile results](evidence/t13a-fix/20261106043724-bddc1d/mobile/F_BOOKING-results.json):

- `route.fetch()` gửi request thật, nhận201 thật và đọc Booking row trước khi abort response lần đầu. Retry forward response thật; không mock success hoặc replay JSON fixture cho API nội bộ.
- Cùng payload/key/ID/code, một Booking và một history; inventory chỉ giảm một lần. Confirmation header123.457 và total246.914; giữ nguyên assertion `BOOKING_CONFIRMED_UNIT_PRICE` từng FAIL ở baseline.
- History/reload vẫn đọc đơn; new request khi Business fixture SUSPENDED trả409 `BUSINESS_NOT_ACTIVE`. Tất cả Booking fixture PENDING/unpaid, không payment/email/notification ngoài hệ thống.

Full còn chạy lại Auth/Profile/account switch/invalid-expired token, Planner validation/money/mandatory/422 recovery, lifecycle GPS-denied/manual/retry/partial completion và A/B ownership endpoint tests. Tất cả PASS mới, gồm request đổi ID/body/query và DB row target không đổi.

## Regression liên quan và build

[Unit summary](evidence/t13a-fix/regression-unit-final/summary.json), [PostgreSQL summary](evidence/t13a-fix/regression-postgres/summary.json):

| Suite mới chạy trong task | Kết quả |
|---|---|
| Backend Trip snapshot unit |35/35 PASS|
| Backend Trip lifecycle unit |9/9 PASS|
| Backend planner validation/costs |50/50 PASS|
| Backend planner modes |17/17 PASS|
| Backend mandatory |9 checks PASS|
| Backend Booking unit |11/11 PASS|
| Frontend planner costs |6/6 PASS|
| Frontend Trip cost display |3 checks PASS|
| Frontend saved editor/Booking snapshot helper |**9/9 PASS**|
| HTTP/PostgreSQL Trip snapshot |**16 nhóm PASS**|
| HTTP/PostgreSQL Trip lifecycle |**12 nhóm PASS**|
| HTTP/PostgreSQL Booking |**15 nhóm PASS**|
| Backend build cuối |exit0, tsc|
| Frontend build cuối |exit0, tsc + Vite|

Unit mới kiểm ba loại marker mandatory, immutable canonical Trip/IDs/metadata/source/history, lodging không bị xóa, reorder/selected-ID order, free optional activity, giá xác nhận0/thiếu/invalid, và manual GROUP Trip0,1 activity+0,2 lodging sau xóa free stop vẫn đúng0,3/within_budget/serializable. Đây là unit, không nhận làm DB/browser evidence.

Regression PostgreSQL tái sử dụng các suite đã đọc, guard và cleanup ID fixture của chính suite; wrapper chụp fingerprint **toàn bộ25 bảng** trước/sau cả nhóm. Booking suite còn có compare9 bảng riêng của T06. Không reset/seed/migration hoặc cleanup dữ liệu nền để làm PASS.

## DB, môi trường và bảo toàn dữ liệu

Chỉ dùng **travelgo_ai_m0_test**, loopback127.0.0.1, `NODE_ENV=test`, `DB_SSL=false`, exact `TEST_DATABASE_NAME`, write opt-in. Runner kiểm guard/sentinel và checksum12 migration trước fixture write. Browser đi frontend3313 → backend5313 riêng; route chẩn đoán query DB thật và assert đúng run ID/port/target từng test. Không reuse demo server.

Ngày06/11 Docker chưa chạy; sau lỗi kết nối trước fixture, đã dùng `docker desktop start`. Container PostgreSQL/pgAdmin **có sẵn** khởi động theo cấu hình restart hiện tại; postgres healthy. Không recreate container/volume, sửa demo config hoặc apply migration. [Environment recovery evidence](evidence/t13a-fix/environment-recovery.json). Có khởi động dịch vụ có sẵn; không nhận lượt lỗi môi trường đó là regression FAIL ứng dụng.

Fixture ledger của runner T13-A được giữ; chỉ thêm lựa chọn `T13A_EVIDENCE_ROOT` để mọi output mới nằm trong `t13a-fix`, không ghi đè `t13a/LATEST.txt`. Mỗi project có UUID/email/city riêng. Tạm đổi giá/status/metadata trong tests chỉ nhắm đúng ID fixture, có guard; restore hoặc cleanup trong `finally`.

- [Full preflight](evidence/t13a-fix/20261106043724-bddc1d/preflight.json).
- [Full desktop ledger](evidence/t13a-fix/20261106043724-bddc1d/desktop/ledger.json), [mobile ledger](evidence/t13a-fix/20261106043724-bddc1d/mobile/ledger.json), [cleanup](evidence/t13a-fix/20261106043724-bddc1d/cleanup-final.json).
- Cleanup theo IDs/FK: dependent event/audit/consent/history → Booking/Trip → Tour/Place/Business → roles/User; outer runner có ledger recovery nếu worker lỗi. Không xóa theo prefix chung.
- [Full before](evidence/t13a-fix/20261106043724-bddc1d/fingerprint-before.json), [after](evidence/t13a-fix/20261106043724-bddc1d/fingerprint-after.json), [compare](evidence/t13a-fix/20261106043724-bddc1d/fingerprint-compare.json): **25 bảng, changed=[]**.
- [Focused compare](evidence/t13a-fix/20261106043555-7092e9/fingerprint-compare.json) và [regression compare](evidence/t13a-fix/regression-postgres/fingerprint-compare.json) cũng PASS. So xuyên từ trước focused cuối tới sau full: **25/25 trùng** trong verification summary.

Biểu thức fingerprint giữ nguyên T11: transaction repeatable-read/read-only, count + SHA-256 chuỗi row-MD5(JSON toàn row) đã sắp. Đây là so row tại hai snapshot, không chứng minh tác động ngoài DB hoặc mọi concurrency nền.

## Ảnh desktop/mobile

Các ảnh sau lấy từ **full cuối**. Đã xem ảnh thực để kiểm nội dung; full-page editor dài nên cần mở ảnh gốc/zoom để xem từng activity. Viewport confirmation được kiểm riêng, header và total đều đọc được, nút finish thao tác được.

| Màn hình | Desktop | Mobile giả lập |
|---|---|---|
| Draft editor sau remove/reorder và lỗi lưu |[ảnh](evidence/t13a-fix/20261106043724-bddc1d/desktop/D_SAVED_EDITOR-saved-editor-draft.png)|[ảnh](evidence/t13a-fix/20261106043724-bddc1d/mobile/D_SAVED_EDITOR-saved-editor-draft.png)|
| Saved/reopened và cảnh báo hiện tại |[ảnh](evidence/t13a-fix/20261106043724-bddc1d/desktop/D_SAVED_EDITOR-saved-editor-reopened.png)|[ảnh](evidence/t13a-fix/20261106043724-bddc1d/mobile/D_SAVED_EDITOR-saved-editor-reopened.png)|
| Booking confirmation123.457 /246.914 |[viewport](evidence/t13a-fix/20261106043724-bddc1d/desktop/F_BOOKING-booking-confirmation-viewport.png)|[viewport](evidence/t13a-fix/20261106043724-bddc1d/mobile/F_BOOKING-booking-confirmation-viewport.png)|

Desktop1440×900; mobile390×844, Edge headless có mobile/touch emulation, không phải thiết bị thật. Kiểm tràn ngang bằng scrollWidth/innerWidth ở các trạng thái có ảnh; toàn bộ layout checkpoints PASS. Remove/reorder/save/cancel/booking/navigation dùng điều khiển UI thực, không force click. Test không chứng minh pixel-perfect hoặc mọi kích thước màn hình.

Tile map/ảnh ngoài có thể không tải hoặc request bị aborted khi điều hướng; giữ log external riêng. Không suy lỗi tile thành lỗi API/PostgreSQL nội bộ, không dùng ảnh để chứng minh tuyến đường thực.

## File thay đổi, hashes và chạy lại

| File | Thay đổi |
|---|---|
| `frontend/src/components/common/TripItineraryEditor.tsx` — mới | Draft editor, PUT same ID, Save/Cancel/error/server canonical response |
| `frontend/src/pages/TripDetailPage.tsx` | Nút mở editor, tích hợp canonical response, phối hợp mutation controls; preferences giữ nguyên endpoint |
| `frontend/src/utils/plannerCosts.ts` | Generic cho Planner/Trip, mandatory protection, cents và selected-ID order dùng chung |
| `frontend/src/pages/TourPlannerPage.tsx` | Dùng cùng mandatory guard cho nút remove |
| `frontend/src/components/common/BookingModal.tsx` | Tách quote trước submit và server snapshot xác nhận, legacy unknown labels/breakdown |
| `frontend/src/utils/bookingSnapshotMoney.ts` — mới | Phân biệt amount0 hợp lệ với missing/invalid, không tính/reprice |
| `frontend/tests/savedTripEditor.test.ts` — mới |9 regression checks có ý nghĩa theo contract|
| `frontend/e2e/t13a-core.spec.ts` | Mở rộng D thành workflow thật; giữ F witness/assertions cũ |
| `backend/scripts/t13a-run.cjs` | Output root tùy chọn, giữ default runner/backward compatibility |
| `backend/scripts/t13a-fix-regressions.cjs` — mới | Capture unit/DB regression, guard/schema/fingerprint và exit codes |
| `docs/evidence/t13a-fix/**`, báo cáo này | Baseline lưu riêng, logs/hashes/ảnh/fingerprints/matrix mới |

Không sửa backend service/model/controller/validator/whitelist/migration hoặc pricing/intent/idempotency source. [Final source manifest](evidence/t13a-fix/source-manifest-final.json) ghi SHA-256 mọi source/harness sửa trong task; baseline/source và baseline hash cho bản trước sửa, source-hashes full cho code thực đã kiểm.

Từ `travelgo/backend`:

```powershell
$env:T13A_EVIDENCE_ROOT='docs/evidence/t13a-fix'
node scripts/t13a-run.cjs --grep 'D_SAVED_EDITOR|F_BOOKING'
node scripts/t13a-run.cjs
node scripts/t13a-fix-regressions.cjs unit ../docs/evidence/t13a-fix/<new-unit-output>
node scripts/t13a-fix-regressions.cjs postgres ../docs/evidence/t13a-fix/<new-postgres-output>
```

Runner tự đặt exact test env và build trước browser; cần Docker/DB test/sentinel/schema hiện có. Thiếu migration thì dừng, không apply. Mỗi browser run tạo UUID/run directory mới; regression capture dùng `wx`, chọn output mới khi chạy lại. Các lệnh focused/full/regression cuối đều exit0. Không chạy song song các suite ghi cùng DB khi so fingerprint.

## Giới hạn / NOT RUN

- **NOT RUN:** thiết bị điện thoại thật, Safari/Firefox, mọi viewport, load/stress hoặc nhiều client cùng sửa Trip. Chưa thêm optimistic-version/concurrency policy vào API hiện có.
- **NOT RUN:** UI editor với Trip completed/cancelled trong browser; đã kiểm upcoming và active. Không đổi quy tắc trạng thái của PUT/lifecycle hiện có.
- **NOT RUN qua API thật:** response Booking legacy thiếu unitPrice vì schema hiện tại không tạo tình huống đó tự nhiên; helper có unit coverage0/missing/invalid và nhánh UI hiển thị unknown đã triển khai, không bóp response core E2E thành legacy giả.
- Không tự khôi phục mandatory marker đã mất trong dữ liệu cũ; không mở rộng multi-mandatory UI. Reorder không tự đổi timeSlot, giá, tuyến đường/ETA hoặc lodging, theo behavior helper hiện có.
- Full T13-A này **chưa thay thế kiểm thử toàn bộ role/admin/business/review/favorite/consent**. Ownership CUSTOMER endpoints và opt-out phục vụ fixture không đồng nghĩa nghiệm thu các module đó.
- Không chạy payment hoặc gửi thông báo ngoài; không đánh giá giá thị trường, sức chứa phòng thật hoặc bảo đảm đủ ngân sách.

**Dừng sau T13-A-FIX.**
