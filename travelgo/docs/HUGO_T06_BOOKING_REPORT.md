# T06 — Booking: validation, Business ACTIVE và retry

Ngày thực hiện: **30/10/2026**, giờ Việt Nam. HEAD nền `052531dfc77c4f289757794c0ee08b4d46e6af2e`; làm trên working tree đang có thay đổi T03/T04/T05, Docker và AI. Đã đọc scope, báo cáo T04-A/T04-B/T05 và source hiện tại. Chỉ thực hiện T06.

**T06 hoàn thành:** backend/frontend build PASS; unit booking **11/11**, HTTP/PostgreSQL **15 nhóm**, Edge/API/PostgreSQL **2/2 PASS**. Regression RBAC, telemetry và exposure unit PASS. Migration12 chỉ apply vào `travelgo_ai_m0_test`. Dữ liệu có sẵn trong 9 bảng được so cùng biểu thức trước migration và sau cleanup mọi lượt: fingerprint giữ nguyên, gồm **57 booking và 27 Trip**.

## 1. Audit và lỗi thật sự tái hiện

Đường active: `POST /api/bookings` → auth/RBAC → `validateSecureBookingRequest` → BookingController → BookingService → Sequelize/PostgreSQL. Đã rà model Booking/index migration03, restoreInventory/status transitions, telemetry/visible attribution; frontend BookingService, BookingContext, BookingModal và callers Hotels/Restaurants/Tickets/PlaceDetail/TourDetail/Planner. Validator booking legacy không có caller hiện tại; nay chuyển tiếp sang cùng validator active, tránh giữ contract khác.

Viết `backend/src/tests/booking.test.ts` **trước khi sửa application source**, build thành công rồi chạy: **0 PASS / 7 FAIL, exit1**.

| Input/thao tác đã thực chạy trước sửa | Actual | Expected sau sửa |
|---|---|---|
| adults=0, children=1 qua validator | 200 | 400 |
| bookingDate=`2028-02-30` | 200 | 400 |
| returnDate trước bookingDate | 200 | 400 |
| adults=`Number.MAX_SAFE_INTEGER+1` | 200 | 400 |
| Tour có quantity=4 | 200 | 400 |
| Service create với Business double SUSPENDED | Resolve thành công, không reject | 409 trước effects |
| Cùng user/key, existing double có fingerprint khác | Trả booking cũ, không reject | 409 `IDEMPOTENCY_PAYLOAD_MISMATCH` |

Đây là **runtime unit với model/transaction doubles**, `database=NOT USED`, `persistenceEvidence=false`. Không gọi đó là lỗi đã tái hiện trên DB hoặc sự cố người dùng. Một số nhóm có vòng lặp: baseline dừng ở assertion đầu thất bại, nên không tuyên bố các input còn lại (ví dụ timestamp/string count) đều đã chạy trước sửa. Sau sửa, toàn bộ input trong vòng lặp đều chạy PASS. Bốn nhóm unit thêm sau kiểm direct service/nonfinite, defaults/quantity, canonical fingerprint, leap dates/tổng khách; không được tính vào baseline FAIL.

Source findings được sửa nhưng **không có baseline persistence/browser trước sửa**: controller dùng `Number(adultsCount || 1)`; tour trừ khách nhưng pricing nhận quantity; chỉ kiểm liên kết Business, chưa xác nhận ACTIVE; replay chưa so payload; frontend tạo UUID mỗi call; form cho sửa tên/email rồi bỏ qua; lời hứa email/bảo hiểm/hoàn hủy hardcoded; Planner đưa ID itinerary cùng tổng ước tính vào booking tour. Không suy diễn từ chúng rằng DB thật đã có duplicate hoặc đã bán vượt chỗ.

Trong browser khi triển khai, đã gặp hai lỗi UI thực: consent banner cùng z-index che submit; khi error làm form dài, nút đóng nằm ngoài viewport. Hai lượt tương ứng thất bại, trace ghi nhận pointer interception/outside viewport. Sửa riêng modal lên z60 và giới hạn chiều cao, cho cuộn bên trong. Test dùng consent opt-out rõ ràng qua API thật để cô lập luồng booking; không đổi chính sách telemetry/banner.

## 2. Contract cuối cùng

### Input và defaults

- Body phải là object. serviceType chỉ `tour|ticket|hotel|restaurant`, serviceId là UUID, chuẩn hóa lowercase.
- adultsCount **bắt buộc**, JSON number, safe integer **1–100**. childrenCount JSON number, safe integer **0–100**; chỉ **thiếu field** mới default 0. Tổng khách ≤100. Không coercion numeric string/boolean/null; không dùng `||` để sửa counts/quantity sai thành default.
- customerPhone string, trim hai đầu, regex `[0-9+ ()-]{9,20}`. notes optional string ≤5000 ký tự; trim, chuỗi trống tương đương thiếu. Không nhận null như thiếu.
- bookingDate bắt buộc đúng **YYYY-MM-DD**, năm 0001–9999 và tồn tại trên lịch. returnDate nếu gửi phải đúng cùng format và **≥bookingDate**. Không nhận timestamp/rollover date/chuỗi trống/null. Không thêm quy tắc cấm ngày quá khứ trong T06.
- Attribution gửi đủ cặp recommendationRequestId UUID + recommendationSessionId string không trống ≤120; UUID lowercase, session giữ nguyên. Request mới vẫn kiểm user/session/environment/expiry, returned eligible candidate và visible impression bằng service hiện có.
- Idempotency-Key optional ở HTTP, nếu gửi phải dài 1–120, thuộc `[A-Za-z0-9._:-]`; key rỗng/sai →400 `INVALID_BOOKING_INPUT`. Client MVP luôn gửi key. Không có key thì mỗi POST hợp lệ là thao tác tạo mới, không có bảo đảm replay.
- userId/businessId/serviceName/customerName/customerEmail/price/total/status không lấy từ client. Các field advisory ngoài contract không thay đổi kết quả server và không tham gia fingerprint. Họ tên/email được lấy từ tài khoản khi tạo, UI read-only và ghi rõ nguồn.

### Quantity, ngày kết thúc và giá MVP

| Loại | Quantity/inventory | Quy tắc returnDate |
|---|---|---|
| Tour | Không nhận quantity, kể cả bằng số khách. Giá và trừ/hoàn capacity đều dùng adults+children | Optional, ≥bookingDate; lưu yêu cầu của khách, không tự derive từ durationDays |
| Ticket | Nếu thiếu quantity: adults+children. Nếu có: integer 1–100, full fare theo số vé; quantity dùng chung cho tính tiền và trừ/hoàn availableSeats | Optional, ≥bookingDate; chỉ là thông tin yêu cầu, không tự tạo vé khứ hồi |
| Hotel | Không nhận quantity; giá theo khách, không tạo inventory phòng | Optional, ≥bookingDate; không nhân theo đêm, không yêu cầu tối thiểu 1 đêm |
| Restaurant | Không nhận quantity; giá theo khách, không tạo inventory bàn | Optional, ≥bookingDate; thông tin yêu cầu, không tạo khung giờ/bàn |

Ngày kết thúc bằng ngày bắt đầu được chấp nhận ở cả bốn loại. Đây là contract MVP theo modal hiện có; chưa kiểm lịch khởi hành/validFrom/validUntil của catalog theo ngày yêu cầu. Không quảng bá bảo đảm phòng/bàn hoặc vé khứ hồi từ field này.

Giá lấy từ Tour.priceVND / Ticket.price / Place.priceFrom trong transaction. Giữ công thức cũ: quantity thiếu → units=adults+children, discount=`round(unitPrice × children × 0.3)`, total=`unitPrice × units − discount`; quantity ticket explicit → units=quantity, discount=0. Có kiểm finite/range trước lưu amount. UI chỉ đưa dự kiến trước submit; confirmation dùng totalAmount trong response. Không reprice booking đã lưu, không đổi Planner GROUP_VND_V1 hoặc tính giá phòng theo đêm.

### Điều kiện tài nguyên và transaction

Tour phải APPROVED, ticket ACTIVE; Place hotel/restaurant phải APPROVED và category khớp. Business liên kết phải tồn tại và ACTIVE cho **cả bốn loại**; thiếu/SUSPENDED →409 `BUSINESS_NOT_ACTIVE`. Tài nguyên không tồn tại/ngừng bán →404, category sai →400, thiếu capacity →409 `INSUFFICIENT_CAPACITY`.

Tour/Ticket dùng row UPDATE lock; Place và Business dùng SHARE lock trong chính transaction tạo đơn. Business suspension không thể chen qua SHARE lock trước commit; request đang chờ Business đã chuyển SUSPENDED sẽ đọc trạng thái mới và reject. Inventory, booking, history PENDING và consent-gated telemetry cùng commit/rollback. Ownership/status transition/attribution và consent policy hiện có được giữ. Code booking mới dùng UUID rút gọn để giảm va chạm khi tạo đồng thời.

## 3. Backend idempotency và migration

1. Normalize/validate request ở boundary HTTP và service; tính SHA256 từ canonical request version1, field order cố định.
2. Bắt đầu transaction **READ COMMITTED được chỉ định rõ**. Nếu có key, lấy `pg_advisory_xact_lock(hashtextextended(identity,0))`, identity là JSON namespace + userId + key, **trước lookup booking và trước inventory**.
3. Tìm đúng userId+key. Fingerprint giống → trả booking hiện có, không kiểm lại live price/capacity/Business/expiry của attribution, không ghi history/event/inventory lần hai. Vì vậy retry sau hết chỗ, suspension hoặc attribution hết hạn vẫn trả đúng booking.
4. Fingerprint khác →409 **`IDEMPOTENCY_PAYLOAD_MISMATCH`**, không trả nhầm booking. Sau khi request đầu commit, request đồng thời đang chờ advisory lock đọc được row đã commit; không đi vào nhánh thiếu chỗ cuối.
5. Nếu chưa có booking, kiểm quyền attribution/tài nguyên/Business, tính giá rồi ghi mọi effects trong cùng transaction. Unique partial index `(user_id,idempotency_key)` migration03 tiếp tục tồn tại như lớp bảo vệ bổ sung. Không còn fallback UniqueConstraintError trả booking mà không so payload.

Fingerprint bao gồm serviceType/serviceId, bookingDate/returnDate, adultsCount/childrenCount, quantity **kể cả mode thiếu/explicit**, customerPhone, notes, recommendationRequestId **và recommendationSessionId**. Giá/catalog name và profile hiện tại do server quản lý không phải identity của request. Retry không lấy giá hiện tại để nhận diện hay tính lại booking cũ. Việc đổi nội dung attribution với cùng key cũng conflict trước khi có effects.

Migration mới **`20261030_12_booking_request_fingerprint.sql`** thêm `request_fingerprint VARCHAR(64) NULL` và CHECK hex64. Không sửa migration cũ, không UPDATE/backfill dữ liệu. Hash được lưu cho booking mới (kể cả không có key), không xuất field nội bộ này qua serializer.

**Legacy policy:** booking cũ thiếu hash không đủ dữ kiện để chứng minh original request (session attribution và quantity pricing mode đã không được lưu đầy đủ). Replay key đó trả409 **`LEGACY_IDEMPOTENCY_UNVERIFIABLE`**, hướng khách xem lịch sử; không tự dựng hash hay trả booking không thể xác minh. GET/history/status của booking cũ vẫn hoạt động theo cơ chế có sẵn; không sửa giá/quantity/lịch sử của chúng. Toàn bộ 57 booking có sẵn sau task vẫn hash=NULL.

Chỉ apply migration12 vào DB test; runner xác minh sentinel và checksum, SKIP11 migration cũ. Checksum mới: `09465ec9a3d3c3de1215ad6eaa1d1cf4e8d18aed43423ce6c7b4feea817e9bc5`. Migration11 giữ `90c42676606d4d5e7458edde139b9c5b945dd3ca0d574490a581ad6bcd98a034`. Chưa apply vào DB khác; target chạy code mới cần schema12 tương ứng.

## 4. Frontend lifecycle của key

- BookingService yêu cầu caller truyền key, không tự tạo UUID ở mỗi call.
- Modal có map canonical payload+account → key. Submit lần đầu tạo key; retry cùng payload giữ key. Phone/notes được trim, returnDate rỗng bỏ khỏi payload; giá hiển thị không thuộc identity.
- Lỗi, timeout hoặc mất response giữ form, map keys và pending intent. Dùng sessionStorage **theo userId, trong tab**, lưu modal data, payload đã gửi và map keys; reload khôi phục được lần đặt chưa xác nhận. Attribution session được chụp cho intent và giữ khi retry/reload.
- Đóng/mở pending modal không tạo intent mới. Kể cả click caller của dịch vụ khác, provider mở lại intent chưa rõ kết quả. Form bị disable trong khi gửi, có ref chặn thêm submit event đồng bộ; close khi đang gửi chỉ ẩn modal.
- Thay payload sau lỗi dùng key khác và UI cảnh báo kiểm tra lịch sử vì đơn trước có thể đã được tạo. Sửa trở lại payload từng thử trong intent đó dùng lại key cũ. Nút **Bắt đầu đơn mới** là thao tác bỏ pending intent rõ ràng, xóa map/session record và reset form; không hủy booking trên server.
- Thành công nhận booking server thì xóa pending session record. Caller mở lần đặt tiếp theo tạo version/keys mới và xóa confirmation cũ, kể cả confirmation trước bị đóng bằng X. Hoàn tất chuyển đến `/bookings` thật. Account đổi không được hiển thị response/confirmation của account cũ.
- Không còn editable name/email bị bỏ qua; bỏ email-sent, bảo hiểm và phí/miễn phí hoàn hủy hardcoded trong modal và hai detail callers. Không thêm email/payment. Planner CTA chuyển sang chọn tour catalog, không dùng itinerary ID/tổng ước tính làm sản phẩm bán; Place không phải hotel/restaurant chuyển sang catalog tour. Không đổi Planner costing, Trip lifecycle hoặc map popup.

Storage là session của tab, không phải đồng bộ intent giữa các thiết bị/tab. Nếu browser không cho dùng sessionStorage, key vẫn giữ trong mounted form nhưng nhánh reload recovery không được bảo đảm; đóng tab/xóa storage mất local recovery. Backend vẫn enforce user+key cho mọi key được giữ lại. Không triển khai cơ chế tìm lại intent xuyên thiết bị.

## 5. Acceptance thực chạy và loại bằng chứng

### Unit

`booking.test.ts`: **11/11 PASS**, không DB; 7 nhóm baseline +4 nhóm thêm sau sửa. Dùng doubles cho Business/model/transaction, kiểm malformed/nonfinite ngoài khả năng JSON truyền NaN/Infinity. Regression có sẵn: `rbac.test.js` PASS (auth/RBAC/ownership/business isolation/price/capacity/transitions), telemetry contract **9 nhóm PASS**, recommendation exposure **6 nhóm PASS**. Không cộng các assertion/suite chồng lấn thành tổng test duy nhất.

### HTTP và PostgreSQL thật — 15 nhóm PASS

1. Body/count/date/quantity/notes/attribution/key sai →400; so toàn row booking/history/event và Tour/Ticket inventory trước/sau mỗi reject.
2. ACTIVE nhận, SUSPENDED từ chối cho tour/ticket/hotel/restaurant. Business NULL từ chối cho Ticket và hai Place; Tour có NOT NULL FK nên không tạo fixture tour mồ côi bằng cách phá constraint.
3. Missing resource, category mismatch, suspended/unapproved resource → reject atomically.
4. Transaction ngoài giữ Business đang chuyển SUSPENDED; cả hai HTTP request bị quan sát chờ Business lock, rồi thả lock → đều409, không trừ inventory/ghi đơn.
5. Server price/owner/name thắng field giả client; tour guests, ticket explicit quantity, children default và hotel không nhân đêm. Fixture price100001, adults2/child1 → total270003 đúng discount cũ.
6. Canonical replay trim/UUID case trả cùng booking, toàn state không đổi; sau catalog đổi giá/status/capacity0 và Business SUSPENDED vẫn replay snapshot cũ.
7. Cùng key khác counts/phone/notes/dates/resource/attribution hoặc ticket quantity mode →409 với code mismatch, không effects.
8. Cùng key khác user tạo booking riêng; cross-user read ID/code, cancel →404; thiếu auth →401; danh sách my chỉ owner.
9. Cùng key tranh đúng1 chỗ, cả Tour và Ticket, analytics false/true: hai response201 cùng ID/code, đúng1 booking, 1 history PENDING, inventory0, event tương ứng0/1.
10. Hai key khác nhau tranh1 chỗ, Tour và Ticket: một201/một409, chỉ1 booking/event, không âm inventory.
11. Đồng thời cùng key nhưng notes A/B: một201/một409 mismatch, đúng1 creation history/event.
12. Attribution hợp lệ lưu booking/event đúng request/item, personalization false giữ nguyên; sai session/user reject. Replay sau expiry+suspension không thêm event. Có attribution nhưng analytics opt-out vẫn0 event.
13. Chỉ fixture bị đặt hashNULL để mô phỏng legacy: replay409 legacy, row không đổi.
14. **Fault injection có kiểm soát:** wrapper telemetry gọi insert thật rồi ném503, sau inventory/booking/history/event đã được insert trong transaction; PostgreSQL rollback toàn bộ. Đây là failure double ở điểm ném lỗi, không phải mock persistence/success.
15. Cancel/reject cạnh tranh → một thành công/một409, restore2 chỗ đúng1 lần, một history transition/audit; có kiểm event CANCELLED theo trạng thái thắng. Kiểm riêng successful PENDING→REJECTED và CONFIRMED→CANCELLED, repeat409 không restore thêm; CONFIRMED→COMPLETED rồi cancel409, giữ giá/quantity/attribution.

Các case creation concurrency giữ inventory bằng transaction độc lập, phát hai request và query `pg_stat_activity` xác nhận **blockedRequests=2** trước khi thả lock. Có **8 witnesses**: Business suspension1, same-key4, different-key2, different-payload1. Cancel/reject thêm dùng Promise.all và row locking ứng dụng, không tuyên bố có witness khóa ngoài cho case này. Không phải load/stress test hoặc vét cạn mọi interleaving.

### Edge desktop, API và PostgreSQL thật — 2/2 PASS

Backend5116/frontend3116, Edge headless, một worker, không reuse server. Fixtures riêng, auth/consent thật. Không intercept catalog thành mock data và **không dùng mock success** cho booking persistence.

Case1: mở tour → kiểm tên/email read-only → điền form → đổi giá fixture trong DB sau render → route.fetch gửi POST đến API thật, đợi response201 → đọc row booking/history thật xác nhận commit → giữ response để kiểm submit lặp và đóng/mở in-flight → abort response. UI hiện lỗi, giữ nội dung. Đóng/mở, reload, rồi bấm đặt từ **Ticket caller** vẫn khôi phục tour intent. Retry được route.fetch/fulfill từ **response API thật**, giữ payload/key/ID/code, DB chỉ1 booking/history, Tour20→18, opt-out0 event. Confirmation246914 lấy từ server thay vì estimate cũ200002. Hoàn tất/lịch sử/reload đọc lại booking. Đơn mới đổi ngày/notes có key/ID khác, inventory18→16; đóng confirmation bằng X rồi mở lại không hiện đơn cũ.

Witness lượt cuối:

```text
firstId = replayId = fa8c5924-3830-4fcf-b5eb-bbd550a2b5b8
firstCode = replayCode = HG-9771DE90365E43D08A6A1F45
sameRetryKey = true
newPayloadNewKey = true
```

Case2: POST notesA commit rồi mất response; sửa notesB → key khác/booking khác; sửa vềA → dùng keyA/bookingA, DB chỉ2 booking. Nút bắt đầu đơn mới reset nội dung/lỗi. Cả ba lần POST vẫn đi API/PostgreSQL thật rồi cắt response.

Lượt cuối **exit0, 2 passed, 8,5s** (case3,6s và1,1s). Hai lượt lỗi UI trước đó mỗi lượt1 FAIL/1 PASS, exit1; cleanup fingerprint đều giữ nguyên. Lượt PASS trước khi mở rộng assertions mất7,8s; không cộng hai lượt PASS thành4 case độc lập.

## 6. DB guard, cleanup và fingerprint

Mọi process DB set rõ các biến dưới đây; không sửa `.env` đang trỏ DB khác, không in secret:

```powershell
$env:NODE_ENV='test'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5432'
$env:DB_NAME='travelgo_ai_m0_test'
$env:TEST_DATABASE_NAME='travelgo_ai_m0_test'
$env:ALLOW_TEST_DB_WRITES='true'
$env:DB_SSL='false'
```

Trước fixture/migration và cleanup: repo guard/opt-in, exact name và sentinel **`hugotravel-isolated-test-database-v1` PASS**. Không reset, seed, truncate hay xóa volume. Fixtures tự cấp Business/Tour/Ticket/Place IDs, đăng ký user mới, chỉ tạo attribution của user fixture. Cleanup truy ra booking IDs của các user vừa tạo rồi xóa đúng IDs, history cascade; event/audit đúng user IDs, resource/request đúng fixture IDs và cuối cùng user IDs. Không dùng tài khoản seed cho mutation.

Biểu thức **giống nhau** trước migration12 và sau mọi lượt test, cho từng bảng trong allowlist:

```sql
SELECT count(*)::int AS count,
       md5(COALESCE(string_agg((to_jsonb(t)-'request_fingerprint')::text,
                              '' ORDER BY id),'')) AS fingerprint
FROM <table_allowlisted> t;
```

Chỉ bỏ cột hash mới khỏi phép serialize để việc thêm schema không giả thành thay row. Toàn bộ field cũ, timestamps, booking amounts/history và inventory đều nằm trong fingerprint. Kiểm bổ sung sau mọi cleanup: 57 booking, **0 hash khác NULL**, xác nhận migration không tự backfill. Không so hash với T04/T05 vì biểu thức serialize khác; đây là cặp đo mới cùng biểu thức.

| Bảng | Count trước / sau | MD5 trước = sau |
|---|---:|---|
| bookings | 57 /57 | `112ded6778062eee27d288a068d45497` |
| booking_status_history | 107 /107 | `39b28ee0370b89a85370bbe0c2e217e5` |
| businesses | 24 /24 | `008593bf93b7d16841530289628a43a7` |
| tours | 17 /17 | `2ee9c044aec5559be2883c08f6caac1e` |
| tickets | 25 /25 | `ad2e552404072f6427569c92753e9aab` |
| places | 22 /22 | `2a4427a001a0d3f7b5e299aa8a476629` |
| trip_sessions | 27 /27 | `ac8a616d27f65e93415205e3284154d1` |
| users | 98 /98 | `9368dcfd40b05caed5fbe16748e89b43` |
| user_events | 126 /126 | `2374e7a8958af561478aef77acfbbff0` |

Mỗi DB/browser suite tự so before/after; final audit so thêm snapshot **trước migration** với trạng thái sau mọi suite. Không tuyên bố fingerprint toàn DB ngoài9 bảng này. Audit_logs/consent/request fixture được cleanup theo ID; chúng không nằm trong bảng fingerprint trên.

## 7. File và lệnh đã chạy

Đối chiếu SHA256 **448 file baseline**: chỉ10 file có sẵn dưới đây đổi, không mất file baseline; thêm8 file gồm report. Các thay đổi có sẵn được bảo toàn. Package/lockfile, AI/Python/manifest, Docker, Trip code, costing helpers và mapPopup/MapView/TripDetail không đổi trong T06. TourPlanner chỉ đổi booking CTA/import useBooking, giữ phần Planner/T05 có sẵn.

| File | Thay đổi T06 |
|---|---|
| `backend/src/utils/bookingValidation.ts` — mới | Canonical contract/key/fingerprint |
| `backend/src/validators/validators.ts` | Một contract cho hai booking exports; auth/blog validator giữ nguyên |
| `backend/src/controllers/bookingController.ts` | Bỏ coercion/default bằng truthiness |
| `backend/src/services/bookingService.ts` | ACTIVE guard, request lock/hash/replay, unified quantity, server pricing |
| `backend/src/models/Booking.ts` | Nullable requestFingerprint |
| `database/migrations/20261030_12_booking_request_fingerprint.sql` — mới | Additive schema12, không backfill |
| `backend/src/tests/booking.test.ts` — mới | Unit baseline/regression |
| `backend/src/tests/booking.postgres.test.ts` — mới | HTTP/DB, locks, consent, ownership, rollback/status |
| `backend/src/tests/bookingFixtures.ts` — mới | Guarded fixtures/cleanup/fingerprint dùng chung DB/browser |
| `frontend/src/services/bookingService.ts` | Explicit caller-owned key |
| `frontend/src/context/BookingContext.tsx` | Pending intent/new intent/confirmation lifecycle |
| `frontend/src/utils/bookingIntentStorage.ts` — mới | Pending request theo account trong sessionStorage |
| `frontend/src/components/common/BookingModal.tsx` | Stable retry, form retention, readonly account, truthful copy, scrolling/layer |
| `frontend/src/pages/PlaceDetailPage.tsx` | Booking caller hợp lệ và bỏ lời hứa hardcoded |
| `frontend/src/pages/TourDetailPage.tsx` | Bỏ hardcoded bảo hiểm/hoàn hủy |
| `frontend/src/pages/TourPlannerPage.tsx` | Catalog CTA thay booking itinerary giả |
| `frontend/e2e/t06-booking.spec.ts` — mới | Hai browser regressions với persistence thật |
| `docs/HUGO_T06_BOOKING_REPORT.md` — mới | Contract, evidence, limits |

Node24.20.0, npm11.19.0, TypeScript backend, Vite6.4.4 frontend; Windows/PowerShell, npm.cmd để tránh execution-policy npm.ps1. Các command dưới chạy ở cwd chỉ định, DB commands kế thừa exact env ở mục6.

| Cwd / command hoặc kiểm tra | Exit / kết quả thật |
|---|---|
| Repo: `git status --short`, `git rev-parse HEAD`, SHA256 inventory | 0; ghi dirty baseline trước sửa. Lệnh git đầu ở thư mục HCH ngoài repo báo fatal; đã đọc lại tại DACN/travelgo trước mọi sửa |
| Backend: build + `node dist/tests/booking.test.js` trước sửa | Build0; unit1, 0/7 PASS |
| Backend: `npm.cmd run build --silent` khi thêm DB suite | Hai lượt1 do TS inferred UUID/default parameter và shape notes trong test; sửa type test, chưa chạy DB từ các lượt này |
| Backend: build + unit sau sửa | 0, ban đầu7/7 rồi cuối11/11 PASS |
| Backend: Node guard/sentinel + read-only fingerprint | Lượt đầu1 do dùng sai tên bảng `booking_status_histories`; không có write. Sửa về `booking_status_history`:0, lưu snapshot trước migration |
| Backend: `node dist/scripts/migrate.js --apply` | 0; guarded exact test DB, chỉ APPLIED12, SKIP1–11 |
| Backend: `node dist/tests/booking.postgres.test.js` lượt đầu | 1;12 nhóm đầu PASS, status case403 do admin fixture vẫn dùng token cấp trước khi thêm role; sửa fixture login lại. Cleanup fingerprint PASS |
| Backend: cùng command sau sửa fixture | 0,13 nhóm PASS; sau thêm fault/status assertions0,14 nhóm PASS |
| Backend: build + cùng command cuối, chỉ định READ COMMITTED và thêm Business contention | **0,15 nhóm PASS**,8 lock witnesses, cleanup PASS |
| Backend: `node dist/tests/rbac.test.js` | **0, PASS** |
| Backend: `node dist/tests/telemetry.test.js` | **0,9 nhóm PASS** |
| Backend: `node dist/tests/recommendationExposure.test.js` | **0,6 nhóm PASS** |
| Frontend: `npm.cmd run build` trong sandbox | 1; esbuild không đọc được ancestor/config path do Windows access restriction; tsc đã chạy, không gọi đó là production build PASS |
| Frontend: `npm.cmd run build` ngoài sandbox được phép | **0**, final tsc+Vite1732 modules, Vite6,48s |
| Frontend: `npm.cmd run test:e2e -- e2e/t06-booking.spec.ts` | Hai lượt1 như mục1, mỗi lượt1/2; lượt PASS7,8s, rồi mở rộng caller/confirmation assertions và chạy lại **0,2/2,8,5s** |
| Backend: Node final guard/sentinel/checksum/fingerprint audit | **0**,9 bảng bằng snapshot trước migration, 57 booking legacy hashNULL, migration11/12 checksum PASS |
| Repo: `git diff --check` các file T06; SHA256 inventory lại | 0; chỉ cảnh báo LF/CRLF của git, không mất file baseline |

Browser command set thêm `PLAYWRIGHT_BACKEND_PORT=5116`, `PLAYWRIGHT_FRONTEND_PORT=3116`; dùng `frontend/playwright.config.ts` sẵn có, không sửa config/dependency. Playwright quản lý start/stop server. Frontend build/browser phải chạy ngoài sandbox do hạn chế esbuild path trên Windows; không có automatic-approval rejection. Log chi tiết ở `%TEMP%/hugo-t06-*.log`, raw before DB/file hashes ở `%TEMP%/hugo-t06-db-before.json` và `%TEMP%/hugo-t06-baseline.json`; report giữ kết quả cần review, không phụ thuộc log tạm để hiểu contract.

Kết quả T04-A/T04-B/T05 là **historical baseline** đã đọc, không phải vừa chạy lại. Không chạy toàn bộ Trip/Planner/Favorite/Review/role E2E hoặc AI suites vì các implementation đó không đổi. Các unit RBAC/telemetry/exposure nêu trên là lượt chạy mới T06.

## 8. Giới hạn và điểm dừng

- Browser mới kiểm Edge desktop headless; không mobile/Firefox/Safari, không stress hoặc mọi tổ hợp lỗi network. Browser tạo Tour thật; Ticket được kiểm caller resume, các loại create khác/quantity explicit được kiểm HTTP/DB.
- Không có DB pre-fix duplication/oversell witness; baseline7 là unit doubles. Không lấy mock failure injection làm bằng chứng network response-loss; response-loss đã có case API/DB thật riêng.
- Chưa phá NOT NULL/FK để tạo Tour mồ côi, chưa test browser storage bị cấm/quota hoặc switch account trong request đang chạy. Không tự sửa booking legacy hay suy ra lịch sử inventory từ quantity cũ.
- ReturnDate là thông tin yêu cầu như mục2; không xây lịch phòng/bàn, phòng theo đêm, schedule matching, email, payment hay hoàn tiền thật.
- Không thay Planner costing, Trip lifecycle, popup T05, Python/AI hoặc manifest; không làm T07, train, push hoặc deploy.

**Dừng sau T06.**
