# T13-A — Nghiệm thu browser → API → PostgreSQL thật

Ngày **31/10/2026**, Asia/Saigon. **Đã hoàn thành kiểm thử; chưa đạt toàn bộ tiêu chí nghiệm thu.** Hai lỗi UI đã tái hiện và giữ FAIL: không có editor hoạt động cho Trip đã lưu; header xác nhận Booking giữ đơn giá cũ dù tổng tiền server đúng. Không sửa logic ứng dụng trong T13-A.

## Phạm vi, baseline và môi trường

Đã đọc báo cáo T11-B, auth contract/T07, Trip T04-A/T04-B, Booking T06, `testDatabaseGuard`, source đang chạy và các suite trước khi tái sử dụng ý tưởng. Không chạy `playwright.local-demo.config.ts`: config đó nhắm demo `travelgo_dev` và không cleanup. T13-A dùng runner/fixture/config riêng; không dùng seed accounts, không đổi `.env`/Docker/demo config, không dừng tiến trình demo. Không reset/seed/truncate/xóa volume/apply migration/push/deploy; không AI agent, sentiment hoặc ranking changes.

- HEAD: **`052531dfc77c4f289757794c0ee08b4d46e6af2e`**. Working tree đã có T03–T11-B chưa commit; giữ nguyên chúng.
- [Environment + working-tree status](evidence/t13a/20261031014715-0e4c3d/environment.json), [diff trước run](evidence/t13a/20261031014715-0e4c3d/working-tree-before.diff). Diff không thay thế manifest cho các source untracked có sẵn.
- [SHA-256 trước](evidence/t13a/20261031014715-0e4c3d/source-hashes-before.json), [sau](evidence/t13a/20261031014715-0e4c3d/source-hashes-after.json), [integrity](evidence/t13a/20261031014715-0e4c3d/source-integrity.json): **284 source/report files trước run, 0 thay đổi**. Lượt Booking bổ sung cũng không thay đổi application source. Manifest bao gồm source thực trên working tree, không giả là source ở HEAD sạch.
- Node **v24.20.0** theo environment evidence; browser **Microsoft Edge Chromium headless**. Desktop **1440×900**; mobile **390×844**, `isMobile`/touch emulation trên cùng engine. Đây là **viewport giả lập**, chưa kiểm điện thoại thật hoặc browser khác.
- Backend **`http://127.0.0.1:5313`**; frontend **`http://127.0.0.1:3313`**. Runner thử bind loopback trước, chọn cổng khác nếu bận. Vite `--strictPort`, `reuseExistingServer=false`; chỉ quản lý hai child server do test tạo.
- `NODE_ENV=test`, `DB_HOST=127.0.0.1`, `DB_NAME=TEST_DATABASE_NAME=travelgo_ai_m0_test`, `DB_SSL=false`, `ALLOW_TEST_DB_WRITES=true`. Secret ký token chỉ tồn tại trong process của mỗi run, không ghi vào `.env`/report.
- [Preflight](evidence/t13a/20261031014715-0e4c3d/preflight.json) kiểm exact target, guard/write opt-in và sentinel; checksum **cả 12 migration hiện có** khớp file SQL, gồm migration11 metadata và migration12 request fingerprint. Không tự apply khi thiếu.
- Wrapper test bind `127.0.0.1`; route chẩn đoán riêng `/api/__t13a/identity` query `current_database()` thật. **Mỗi test** gọi route này từ browser qua Vite proxy và assert run ID/PID/port/NODE_ENV/host/DB. Các endpoint nghiệp vụ dùng nguyên Express app/controllers/services/Sequelize thật. Không thay loader/catalog thành fixture trong bộ nhớ.

Build/cổng/guard/DB identity được ghi trong logs của chính lượt chạy mới. Sau kiểm, không còn listener 3313/5313. Không có thao tác kill/reconfigure demo 3000/5000; việc không thấy listener demo khi kiểm cuối không được diễn giải thành demo từng chạy rồi đã bị dừng.

M?t s? SHA-256 source ???c ki?m (danh s?ch ??y ?? trong manifest):

| Source | SHA-256 |
|---|---|
| `backend/src/utils/testDatabaseGuard.ts` | `43340e359a8a5ed587c4cb5ea6025ac75098bfcd87a0e3a4de2421d233c411e8` |
| `backend/src/services/authService.ts` | `d985b86518515e2278e874592865a96196a3a56be3e1d8cb3567e121179a09dd` |
| `backend/src/services/tourPlannerService.ts` | `1d70a25750818f9d8eedc1cfab777ee064c3f93954f0f3f28f68f6c34a09c01d` |
| `backend/src/services/tripSessionService.ts` | `3a0b59f39f7b0de0573f16956a20cfb3bc44c48e1eb0cb215a298606767f63b6` |
| `backend/src/services/bookingService.ts` | `d9061745296f851c0534c543d1b3813dc3dbdd433d88cb72d675eda3c48bd46b` |
| `frontend/src/context/AuthContext.tsx` | `c8951d4077edf55e5898591b85c21282c9c284114fefb5691e0546d7a4bc5f2c` |
| `frontend/src/pages/TourPlannerPage.tsx` | `b5592f9d4cdf2d59b9237b4c0ee6645c7644c2319d22a9857039c27f1fde2027` |
| `frontend/src/pages/TripDetailPage.tsx` | `c4a96c937e2c654af9ba77bd424cb18f71f102d3b3a9d7be52f243145ba1cf1e` |
| `frontend/src/components/common/BookingModal.tsx` | `96655b691bf0b622b8b2cc2125df38180f8d8ed525a8a7b92ab9640a0485fdda` |

## Bộ kiểm và cách tính kết quả

Bằng chứng chính: [acceptance_matrix.json](evidence/t13a/acceptance_matrix.json), [CSV](evidence/t13a/acceptance_matrix.csv). Matrix giữ expected/actual, project, checkpoint và đường dẫn evidence từng dòng.

| Lượt mới | Phạm vi | Kết quả thực | Ghi chú |
|---|---|---|---|
| `20261031014437-f462e3` | Lượt đầu 14 case | 14 FAIL do fixture | Email local-part do harness tạo dài hơn 64 ký tự; đăng ký bị model từ chối. Chưa đi tới các luồng sau. Cleanup/fingerprint trùng. |
| `20261031014551-eb01bc` | Sau rút ngắn email | 14 FAIL do harness | Assertion/discovery chưa tính email lowercase theo auth contract; đã đăng ký thật nhưng oracle so mixed case. Fingerprint phát hiện users/user_roles fixture còn lại. Recovery theo ledger chính xác, xem mục cleanup. |
| **`20261031014715-0e4c3d`** | **Đầy đủ 7 case × 2 viewport** | **12 PASS / 2 FAIL**, exit1 | Hai FAIL đều là saved Trip không có UI editor; các kiểm độc lập tiếp tục chạy. [Playwright](evidence/t13a/20261031014715-0e4c3d/playwright.json), [command/log](evidence/t13a/20261031014715-0e4c3d/browser.json). |
| **`20261031015000-473abb`** | **Bổ sung riêng F_BOOKING × 2 viewport** | **0 PASS / 2 FAIL**, exit1 | Thêm assertion sau khi xem ảnh phát hiện đơn giá header cũ; tổng server/retry/inactive vẫn PASS. Không bỏ assertion hay đổi expected để làm PASS. [Playwright](evidence/t13a/20261031015000-473abb/playwright.json). |

Không cộng lặp thành 16 case độc lập hoặc cộng kết quả T04/T06/T07/T11-B lịch sử vào lần này. **Lấy kết quả mới nhất từng case:** 14 tổ hợp case/viewport = **10 PASS / 4 FAIL**, tương ứng **2 lỗi ứng dụng**, mỗi lỗi xuất hiện ở hai viewport. Matrix có **88 checkpoint PASS / 4 FAIL**; đó là các nhóm assertion/diagnostic/layout, không phải 92 luồng độc lập. Hai chuỗi thao tác UI sau khi mở Trip được ghi **NOT RUN vì thiếu editor**, trong khi gate tìm editor là FAIL và API edit được kiểm riêng.

## Ma trận chức năng

| Luồng/tiêu chí | Desktop | Mobile | Expected/actual và evidence |
|---|---|---|---|
| UI register → PostgreSQL CUSTOMER account | PASS | PASS | User row/email thật; không inject auth session thành công vào localStorage. |
| Wrong-password → UI login → Profile → reload/logout | PASS | PASS | 401 thật cho sai password; identity/phone đọc DB; logout xóa session client. |
| A → B, reload không hiển thị A | PASS | PASS | FullName/email B đúng, email A không hiện. Không diễn giải logout local là revoke token server. |
| Invalid + token ký đúng nhưng đã expired | PASS | PASS | `/auth/me` 401 `INVALID_TOKEN` / `TOKEN_EXPIRED`; ProtectedRoute về login, token/user cache rỗng. |
| Form validation | PASS | PASS | Adults=0 bị native validity chặn, không phát POST Generate; sửa lại 2 rồi tiếp tục. |
| Generate hợp lệ, sightseeing + hotel mandatory | PASS | PASS | 2 ngày/1 đêm, hotel xuất hiện đúng một lần; 4 attraction đúng điểm đến fixture, có điểm giá 0. |
| Nhóm/người/đêm, nguồn và giả định | PASS | PASS | 2 adults +1 child =2,7; total3.840.000, hotel600.000 một đêm; source labels và assumptions hiện trên UI. |
| Save → reload → My Trips → reopen | PASS | PASS | GET, DB JSON/metadata/selected IDs và amounts khớp response được chấp nhận; không suy persistence chỉ từ UI. |
| Chỉ đổi budget10.000.000 →100.000 | PASS | PASS | Cùng dịch vụ giữ giá; total3.840.000, vượt3.740.000; không tự tăng ngân sách/cắt giá. |
| Draft UI reorder/remove → save/reopen | PASS | PASS | Reorder first→down, xóa attraction810.000; total3.030.000, vượt2.930.000; hotel mandatory không xóa được. |
| **Mở lại Trip → tìm UI editor hoạt động** | **FAIL** | **FAIL** | Không có edit/remove/reorder/save-existing controls; chỉ có editor preferences. Lỗi T13A-01. |
| Chuỗi UI edit/remove/reorder/save/reopen existing Trip | NOT RUN | NOT RUN | Bị chặn tại gate trên; không thay API diagnostics thành PASS cho UI. |
| Existing Trip API edit qua browser fetch → reload UI/DB | PASS | PASS | PUT days/remove/reverse; IDs/tổng/metadata/cảnh báo hiện tại đúng. API có chức năng, UI chưa nối vào. |
| PUT budget within → over rồi reopen | PASS | PASS | Cảnh báo biến mất/xuất hiện theo dữ liệu hiện tại, giữ giá từng khoản. |
| 422 thiếu sightseeing → giữ form → tạo lại | PASS | PASS | Tạm suspend **chỉ attraction fixture**, giữ hotel; không fallback tỉnh khác, không result cũ/meal-only; restore fixture rồi user sửa budget về3.840.000, Generate within. |
| Attraction + hotel cùng mandatory IDs | PASS API | PASS API | Browser fetch gửi cả hai IDs đến API thật; mỗi ID đúng một lần. UI hiện chỉ chọn một mandatory Place; không nhận vơ đã chọn nhiều mandatory qua UI. |
| Start → GPS denied → manual check-in | PASS | PASS | CDP đặt quyền geolocation denied thật ở context, không stub navigator; UI vẫn check-in thủ công, không gắn tọa độ. |
| Retry check-in → reload → complete | PASS | PASS | Một check-in, progress **13%**, retry không nhân đôi/ghi đè note đầu; completed vẫn13%, không ép100%. |
| UI Booking commit → mất response → reload/retry | PASS | PASS | POST được forward thật, xác minh DB commit rồi mới abort transport; cùng key/payload/ID/code, một đơn/history, inventory chỉ giảm một lần. |
| Confirmation total/DB dùng giá server | PASS | PASS | Fixture đổi100.001→123.457 sau render; 2 adults → **246.914**, PENDING/unpaid. |
| **Confirmation unit price header** | **FAIL** | **FAIL** | Server unitPrice123.457 nhưng UI vẫn “Đơn giá:100.001đ/khách”. Lỗi T13A-02; không phải lỗi tổng tiền DB. |
| New request Business SUSPENDED | PASS | PASS | **409 `BUSINESS_NOT_ACTIVE`**, không thêm booking. Kiểm mới cho tour; không gọi đây là đã kiểm mọi service type. |
| A/B foreign Trip/Booking endpoints, ID/body/query spoof | PASS | PASS | Bảng endpoint cụ thể bên dưới; rows target trước/sau không đổi. |

Evidence chức năng đầy đủ có trong `desktop/*-results.json` và `mobile/*-results.json` của lượt đầy đủ; F_BOOKING dùng kết quả lượt bổ sung. [Audit thứ tự IDs](evidence/t13a/persistence-order-audit.json) so **6/6** projection IDs đã lưu sau reorder/remove với thứ tự expected từ các thao tác, dùng đúng UUID ledger. Không cộng audit này thành browser run khác.

### Witness tiền và persistence

Fixture 4 attractions có giá100.000/300.000/50.000/0 mỗi người lớn quy đổi; cả nhóm là270.000/810.000/135.000/0. Lunch ngày1 gắn restaurant200.000→540.000; ngày2 thiếu restaurant dùng giả định150.000→405.000. Dinner540.000/ngày ×2; hotel600.000/nhóm cho một đêm. Tổng **3.840.000**. Không thay Booking formula thành hotel room/night.

Sau remove/reorder draft, IDs lưu bắt đầu restaurant → attraction0 → hotel, attraction1 đã bị xóa; total **3.030.000**. Existing Trip API edit độc lập remove attraction0 rồi reverse ngày1: IDs bắt đầu hotel → attraction1 → restaurant; total **3.570.000**. GET/reload/row DB xác nhận các trường `days`, `costBasis`, `costAssumptions`, `nightsCount`, adults/children, transportation, selected IDs, budget/estimate/status/excess/violations. UI source labels được xem trực quan; giá0 được giữ0.

Booking focused witnesses (đều đã cleanup):

| Viewport | Booking ID | Code | DB/server total | Status |
|---|---|---|---:|---|
| desktop | Xem `BOOKING_RETRY_CONFIRM` trong [desktop results](evidence/t13a/20261031015000-473abb/desktop/F_BOOKING-results.json) | Cùng code sau retry |246.914|PENDING/unpaid|
| mobile | Xem `BOOKING_RETRY_CONFIRM` trong [mobile results](evidence/t13a/20261031015000-473abb/mobile/F_BOOKING-results.json) | Cùng code sau retry |246.914|PENDING/unpaid|

Fault injection chỉ cho POST Booking: `route.fetch()` đi API thật → đọc201 thật → `Booking.findByPk` xác nhận commit → abort response lần đầu; retry forward response thật. Không fixture/replay/mock thành công cho endpoint nội bộ. Không gọi thanh toán/email/notification; tất cả đơn fixture giữ PENDING/unpaid, kể cả ownership setup. Foreign cancel/status requests đều bị từ chối, không đổi trạng thái.

## Ownership — endpoint thực đã kiểm

Tất cả prefix `/api`; chạy **A→B và B→A trên cả hai viewport**. Body/query có cố gửi userId khác không đổi owner. [Desktop evidence](evidence/t13a/20261031014715-0e4c3d/desktop/G_OWNERSHIP-results.json), [mobile evidence](evidence/t13a/20261031014715-0e4c3d/mobile/G_OWNERSHIP-results.json) lưu UUID endpoint, expected/actual và response status.

| Method + endpoint | Kết quả |
|---|---|
| GET `/trips/{foreignId}` |404|
| PUT `/trips/{foreignId}` với title và spoofed userId |404|
| DELETE `/trips/{foreignId}` |404|
| POST `/trips/{foreignId}/start` |404|
| POST `/trips/{foreignId}/complete` |404|
| POST `/trips/{foreignId}/checkin` với activityId của target |404|
| POST `/trips/{foreignId}/convert-to-blog` |404|
| GET `/bookings/{foreignId}` |404|
| GET `/bookings/{foreignCode}` |404|
| POST `/bookings/{foreignId}/cancel` với spoofed userId |404|
| PATCH `/bookings/{foreignId}/status` với CONFIRMED + spoofed userId |403, CUSTOMER không có quyền admin status|
| GET `/trips?userId={otherUser}` |200, chỉ danh sách của actor|
| GET `/bookings/my?userId={otherUser}` |200, chỉ đơn của actor|

Sau chuỗi reject, so toàn row Trip/Booking target với trước: không thay đổi. Browser B mở URL Trip A hiển thị “Không tìm thấy chuyến đi”. Đây là kiểm endpoint/DB thật, không chỉ kiểm nút bị ẩn. Không suy PATCH403 này thành đã nghiệm thu admin/partner transitions.

## Lỗi ứng dụng giữ nguyên để sửa ở task riêng

### T13A-01 — Chưa có UI chỉnh itinerary của Trip đã lưu

**Mức độ P1 theo tiêu chí nghiệm thu T13-A:** chặn thao tác lõi người dùng; chưa thấy hỏng dữ liệu hoặc vượt quyền. Repro: UI đăng ký → planner có mandatory hotel → Generate → Save → Trip → reload. Expected: người dùng mở editor hoạt động, remove/reorder rồi lưu **cùng Trip** và mở lại. Actual: controls matching edit itinerary/remove/reorder = **0** ở desktop/mobile; chỉ có chỉnh preferences/check-in/lifecycle. `TripDetailPage` chỉ gọi `updateTrip` cho preferences; `TourPlannerPage` có draft controls nhưng save luôn POST Trip mới.

API PUT itinerary hoạt động và đã PASS độc lập; không dùng API diagnostics để nhận là UI sequence PASS. Giữ assertion FAIL và trace. Đề xuất task riêng nối editor của Trip đã lưu vào PUT, bảo toàn metadata/IDs/check-in reconciliation/cảnh báo và kiểm lại hai viewport; không mở rộng whitelist hoặc xóa dữ liệu để né lỗi.

- [Ảnh desktop](evidence/t13a/20261031014715-0e4c3d/desktop/saved-trip-editor-reproduction.png), [mobile](evidence/t13a/20261031014715-0e4c3d/mobile/saved-trip-editor-reproduction.png).
- Trace/error-context trong `20261031014715-0e4c3d/artifacts/*D-SAVED-EDITOR*/`.

### T13A-02 — Đơn giá header xác nhận Booking không theo snapshot server

**Mức độ P2:** thông tin giá xác nhận mâu thuẫn; tổng tiền/DB/idempotency không sai. Repro: mở tour fixture giá100.001, đổi **chỉ tour fixture** thành123.457 sau render, submit thật → mất response sau commit → reload/retry. Expected: phần xác nhận dùng server `unitPrice=123457` hoặc giá cũ phải được ghi rõ là estimate trước đó. Actual trên cả viewport: **“Đơn giá:100.001đ/khách”**, server `unitPrice=123457`, `totalAmount=246914`; UI tổng xác nhận246.914 đúng.

Source `BookingModal` header vẫn dùng `unitPrice` của modal/intent; phần total dùng `confirmedBooking.totalAmount`. Thêm assertion cụ thể sau khi xem ảnh, chạy lại **riêng Booking**; FAIL được giữ, các kiểm inactive/history/cleanup vẫn tiếp tục bằng soft assertion. Đề xuất task riêng cho header xác nhận lấy snapshot đơn giá server; không đổi pricing/idempotency hoặc reprice đơn đã lưu.

- [Desktop results expected/actual](evidence/t13a/20261031015000-473abb/desktop/F_BOOKING-results.json), [mobile results](evidence/t13a/20261031015000-473abb/mobile/F_BOOKING-results.json).
- [Ảnh desktop viewport](evidence/t13a/20261031015000-473abb/desktop/F_BOOKING-booking-confirmation-viewport.png), [mobile viewport](evidence/t13a/20261031015000-473abb/mobile/F_BOOKING-booking-confirmation-viewport.png).
- Trace/error-context trong `20261031015000-473abb/artifacts/*F-BOOKING*/`.

## Desktop/mobile và ảnh

Lượt đầy đủ có **13 ảnh quan trọng mỗi viewport**. Kiểm document `scrollWidth ≤ innerWidth+1` tại **12 trạng thái/viewport**: profile A/B, validation, planner bình thường/vượt budget, Trip warning, 422/recovery, complete partial, booking form/confirmation, foreign Trip. Tất cả kiểm tràn ngang PASS; các click save/booking/reorder/remove/navigation đã thực hiện không `force`. Booking modal có viewport screenshots riêng trong lượt bổ sung; nút submit, close, finish thao tác được.

| Màn hình | Desktop | Mobile |
|---|---|---|
| Profile B sau chuyển account |[ảnh](evidence/t13a/20261031014715-0e4c3d/desktop/A_AUTH-profile-B.png)|[ảnh](evidence/t13a/20261031014715-0e4c3d/mobile/A_AUTH-profile-B.png)|
| Form validation |[ảnh](evidence/t13a/20261031014715-0e4c3d/desktop/B_PLANNER-planner-validation.png)|[ảnh](evidence/t13a/20261031014715-0e4c3d/mobile/B_PLANNER-planner-validation.png)|
| Dự toán vượt budget |[ảnh](evidence/t13a/20261031014715-0e4c3d/desktop/B_PLANNER-planner-over-budget.png)|[ảnh](evidence/t13a/20261031014715-0e4c3d/mobile/B_PLANNER-planner-over-budget.png)|
| Cảnh báo sau save/reopen |[ảnh](evidence/t13a/20261031014715-0e4c3d/desktop/B_PLANNER-trip-saved-warning.png)|[ảnh](evidence/t13a/20261031014715-0e4c3d/mobile/B_PLANNER-trip-saved-warning.png)|
| Catalog thiếu422 |[ảnh](evidence/t13a/20261031014715-0e4c3d/desktop/C_EMPTY-catalog-422.png)|[ảnh](evidence/t13a/20261031014715-0e4c3d/mobile/C_EMPTY-catalog-422.png)|
| Completed còn13% |[ảnh](evidence/t13a/20261031014715-0e4c3d/desktop/E_LIFECYCLE-trip-complete-partial.png)|[ảnh](evidence/t13a/20261031014715-0e4c3d/mobile/E_LIFECYCLE-trip-complete-partial.png)|
| Booking form viewport |[ảnh](evidence/t13a/20261031015000-473abb/desktop/F_BOOKING-booking-form-viewport.png)|[ảnh](evidence/t13a/20261031015000-473abb/mobile/F_BOOKING-booking-form-viewport.png)|

Đã xem ảnh thực: cảnh báo mobile đọc được, source/giả định xuống dòng; confirmation vừa viewport và nút finish thao tác được, đồng thời thấy lỗi đơn giá. Full-page screenshot khi trang đang cuộn có thể vẽ fixed header ở vị trí cuộn trong ảnh dài; không coi hiện tượng ghép ảnh đó là bằng chứng header đè nội dung ở viewport. Không tuyên bố pixel-perfect hoặc vét cạn mọi control/viewport chỉ từ kiểm document width.

External image `example.test` có `ERR_NAME_NOT_RESOLVED`; nhiều request tile `a.tile.openstreetmap.de` bị aborted khi điều hướng, screenshot có nền bản đồ xám. Ghi riêng là giới hạn tài nguyên ngoài; không suy thành lỗi API/PostgreSQL. Marker/chi phí/lifecycle nội bộ vẫn chạy thật. Không chứng minh tile service uptime, giao thông hay tuyến đường thực.

## Fixture, cleanup và fingerprint

Fixture manager cấp UUID riêng trước khi ghi, ghi ledger bền vững; mỗi project có city `T13A-{runId}-{project}`, một Business ACTIVE, một Tour APPROVED, 4 attractions, 1 hotel, 1 restaurant. Tên/nội dung/ảnh nhúng ghi **SYNTHETIC TEST ONLY**, giá và tọa độ nhân tạo (quanh16,05/108,20); không phải giá/chỗ bán thực. Không thêm/sửa Place tỉnh khác hoặc dữ liệu nền để tạo case422.

Account được đăng ký bằng UI; email được preallocate vào ledger trước submit, canonical lowercase; user UUID được ghi ngay khi nhận201. Các Trip/Booking được discover **chỉ qua UUID account fixture đã ghi** rồi chốt danh sách ID. Không tìm/xóa theo prefix tên chung. Lượt đầy đủ: **9 users, 6 Trip, 3 Booking mỗi viewport**; lượt focused:1 user/1 Booking mỗi viewport. Tất cả Booking PENDING/unpaid.

Cleanup trong `afterAll`, có recovery độc lập ở outer runner nếu worker lỗi. Trước cleanup xác minh lại exact DB/guard/sentinel. Thứ tự FK: event/audit/recommendation request children/consent → booking history → Booking → Trip → Tour → Place → Business → user roles → User. Các dependent IDs cũng được ghi trong `cleanupIds`; account/Trip/Booking count xác nhận0. Không truncate/reset. Ledger vẫn giữ ID kể cả sau xóa.

- Lượt đầy đủ: [desktop ledger](evidence/t13a/20261031014715-0e4c3d/desktop/ledger.json), [mobile ledger](evidence/t13a/20261031014715-0e4c3d/mobile/ledger.json), [cleanup](evidence/t13a/20261031014715-0e4c3d/cleanup-final.json).
- Focused: [desktop ledger](evidence/t13a/20261031015000-473abb/desktop/ledger.json), [mobile ledger](evidence/t13a/20261031015000-473abb/mobile/ledger.json), [cleanup](evidence/t13a/20261031015000-473abb/cleanup-final.json).

Fingerprint dùng lại **cùng phương pháp read-only T11**: transaction repeatable-read, count + SHA-256 của chuỗi MD5(JSON toàn row) sắp theo hash, **toàn bộ25 public tables**. Chụp trước tạo fixture và sau cleanup từng run. Trước/sau lượt đầy đủ và focused đều **25/25 trùng**, `changed: []`. Nền vẫn98 users,27 Trip,57 Booking,22 Place,24 Business. [Cross-run comparison](evidence/t13a/cross-run-fingerprint.json) còn so snapshot trước lượt đầu với snapshot cuối focused: **trùng toàn bộ25 bảng**.

Giữ cả bằng chứng sự cố harness: lượt mixed-case ledger ban đầu bỏ sót14 user fixture vì auth lưu lowercase. Fingerprint **đã phát hiện** users/user_roles khác, không sửa fingerprint để PASS. Sau khi sửa discovery theo canonical email, chạy [recovery theo ledger](evidence/t13a/20261031014551-eb01bc/recovery-cleanup.json), chỉ query đúng các email preallocated của run đó để lấy UUID, xóa theo ID/FK; [fingerprint-recovered](evidence/t13a/20261031014551-eb01bc/fingerprint-recovered.json) khớp snapshot **cùng run trước fixture**. [Recovery evidence](evidence/t13a/20261031014551-eb01bc/recovery-evidence.json) giữ lệnh/exit/mismatch ban đầu. Không dùng dữ liệu sau một cleanup lỗi làm nền mới để che fixture sót.

Fingerprint chỉ chứng minh các row được so tại hai snapshot trùng nhau, không chứng minh mọi tác động ngoài DB hoặc concurrency nền bất kỳ. Không cập nhật schema/catalog nền trong task.

## Lệnh chạy lại và file thay đổi

Từ `travelgo/backend`:

```powershell
node scripts/t13a-run.cjs
node scripts/t13a-run.cjs --grep F_BOOKING
node scripts/t13a-run.cjs --grep D_SAVED_EDITOR
```

Mỗi lệnh tạo runId/output mới tại `docs/evidence/t13a/{runId}`; runner đặt môi trường exact test, chọn cổng trống, build backend/frontend, preflight, fingerprint trước, chạy Playwright thật, cleanup/recovery, fingerprint sau và so source. **Hiện exit1 là đúng** vì các lỗi ứng dụng vẫn giữ FAIL. Không chạy thêm lệnh seed/migrate. Cần DB test/sentinel/schema hiện có; thiếu thì fail trước fixture write.

Các lệnh con được capture đầy đủ trong evidence:

```text
npm.cmd run build                         # backend, exit0
npm.cmd run build                         # frontend, exit0
node dist/evaluation/t11_db_fingerprint.js snapshot <new-before.json>
node node_modules/@playwright/test/cli.js test --config playwright.core-e2e.config.ts [--grep ...]
node dist/evaluation/t11_db_fingerprint.js snapshot <new-after.json>
node dist/evaluation/t11_db_fingerprint.js compare <before.json> <after.json>
```

Build backend/frontend đều PASS trong các lượt mới, gồm lượt focused cuối. [Backend build log](evidence/t13a/20261031015000-473abb/backend-build.json), [frontend build log](evidence/t13a/20261031015000-473abb/frontend-build.json). Harness `.cjs` được syntax-check và chạy thật; config/spec được Playwright thực thi. Không rerun unit suite toàn dự án khi không sửa application source; không nhận các kết quả lịch sử thành test mới. Vite/esbuild/Edge chạy ngoài sandbox theo approval tool do giới hạn đọc thư mục/khởi chạy browser đã biết từ T11-B.

File mới của T13-A:

| File | Vai trò |
|---|---|
| `backend/scripts/t13a-support.cjs` | Guard/schema, fixture ledger và cleanup ID/FK |
| `backend/scripts/t13a-server.cjs` | Loopback test server wrapper; identity query thật, core app nguyên vẹn |
| `backend/scripts/t13a-run.cjs` | Capture HEAD/status/hash/build; free ports; orchestration/fingerprint/fallback cleanup; hỗ trợ grep |
| `backend/scripts/t13a-recover.cjs` | Guarded recovery từ đúng thư mục ledger T13-A |
| `frontend/playwright.core-e2e.config.ts` | Cổng riêng, desktop/mobile, không reuse server, trace/screenshot/report |
| `frontend/e2e/t13a-core.spec.ts` | Các luồng thật, DB assertions, transport fault injection Booking, negative ownership, layout và hai regression FAIL |
| `docs/evidence/t13a/**`, báo cáo này | Matrix, logs, snapshots, source hashes, ledgers, ảnh/trace, lỗi harness giữ lịch sử |

[Harness hashes cuối](evidence/t13a/harness-source-final.json). Không sửa application/package/DB migration source để đạt PASS; các source T03–T11-B giữ nguyên.

## Chưa kiểm và việc cần làm tiếp

- **T13-A chưa thay thế kiểm thử toàn bộ role/admin/business/review/favorite/consent.** Không chạy admin/partner CRUD, review/moderation, favorite CRUD, toàn bộ consent/retention/attribution hoặc toàn bộ kiểu Booking. Consent opt-out trong luồng chính chỉ để không phát telemetry ngoài ý định fixture.
- Chưa kiểm physical mobile, Safari/Firefox, accessibility toàn diện, stress/load/concurrency mọi interleaving, real GPS/location accuracy, payment/email/notification bên ngoài. Không gọi các phần đó PASS.
- UI mới chỉ chọn một mandatory Place; combined attraction+hotel đã kiểm API thật, chưa có multi-selection UI để kiểm thao tác đó thuần UI.
- Saved Trip UI edit sequence còn bị chặn bởi T13A-01. API edit/persistence/lifecycle và server Booking total/idempotency đã PASS, nhưng không làm hai lỗi UI trở thành đạt nghiệm thu.
- Đề xuất task sửa riêng T13A-01 và T13A-02, rồi chạy lại phần bị ảnh hưởng và regression liên quan. Không triển khai các bản sửa trong T13-A.

**Dừng sau T13-A; không push/deploy.**
