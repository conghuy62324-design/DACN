# T13-B-02 — Business, Partner Permissions và Resource Moderation

Ngày thực hiện: **07/11/2026, Asia/Saigon**. Đã hoàn thành kiểm thử và dừng; **chưa đạt nghiệm thu nhóm**.

Kết quả đúng 8 CORE được giao: **4 PASS / 4 FAIL / 0 NOT RUN**. PASS: **R03, A05, B01, B05**. FAIL: **B02, B03, B04, B06**. Không sửa source ứng dụng. Cleanup sạch; fingerprint **25/25 bảng trùng**; **1.958/1.958 file baseline giữ nguyên hash**.

Tổng lũy kế 43 CORE: **11 PASS / 4 FAIL / 28 NOT RUN**, trong đó 7 PASS của T13-B-01-FIX là kết quả lịch sử, không chạy lại. **8 OPTIONAL đều NOT RUN**. Không cộng checkpoint, lần thử harness hoặc hai viewport thành case CORE mới.

[Ma trận JSON](evidence/t13b-02/20261107122016-34e7f2/acceptance_matrix.json), [CSV](evidence/t13b-02/20261107122016-34e7f2/acceptance_matrix.csv), [verification summary](evidence/t13b-02/20261107122016-34e7f2/verification_summary.json), [Playwright](evidence/t13b-02/20261107122016-34e7f2/playwright.json).

## 1. Baseline, manifest và phạm vi

Đã đọc [T13-B-PREP](HUGO_T13_B_SCOPE_AND_MATRIX.md), [T13-B-01](HUGO_T13_B_01_RBAC_ONBOARDING_REPORT.md), [T13-B-01-FIX](HUGO_T13_B_01_FIX_REPORT.md), các router/controller/service/model, Partner/Admin UI và harness hiện có. Giữ nguyên PREP lịch sử: **43 CORE, 8 OPTIONAL, 9 GAP**, SHA-256 `2f26c201d218ffd956bedb20f7f71c81bd8396e0a9829eb6217f5043f7b91f23`.

HEAD `052531dfc77c4f289757794c0ee08b4d46e6af2e`; thực thi trên working tree đã có các thay đổi trước đó. [Baseline hashes](evidence/t13b-02/baseline/working-tree-sha256.json), [Git status](evidence/t13b-02/baseline/git-status.txt), [bản sao PREP](evidence/t13b-02/baseline/approved-scope.md). Các file harness đã chuẩn bị trước lúc quay lại PREP được giữ và tiếp tục hoàn thiện trong task T13-B-02 này; không có run DB từ bước PREP.

Run chốt: **`20261107122016-34e7f2`**. [Manifest](evidence/t13b-02/20261107122016-34e7f2/case-manifest.json) khóa nguyên dòng expected PREP và expansion trước build/preflight/fixture; [lock SHA-256](evidence/t13b-02/20261107122016-34e7f2/manifest-lock.json): `6c700e543d21fd7b90584738cbda64d5c0d3fb73305911b8015427e154f51216`.

- **GAP-03:** Booking alias vẫn expected403 khi thiếu MANAGE_BOOKINGS. Submit Place/Tour/Blog và Blog update chỉ characterization membership-only; không tự thêm yêu cầu MANAGE_BUSINESS cho những nhánh đó.
- **GAP-04:** kiểm public theo trạng thái resource hiện có; không tự đặt Business SUSPENDED phải ẩn toàn bộ catalog. Nhánh policy này không chạy.
- **GAP-09:** kiểm giá0, nights0 và invariant timestamp khi save không sửa. Browser cấu hình Asia/Ho_Chi_Minh, runtime báo alias Asia/Saigon; backend TZ=Asia/Ho_Chi_Minh. Không triển khai nhánh direct Booking URL của B07.
- Business/membership/role setup có guard; Booking thật PENDING/unpaid và Review retention fixture chỉ là prerequisite. Không tính thành PASS B07/B08 hoặc Review; không tạo UI Admin/Partner còn thiếu.

## 2. Môi trường và an toàn trước write

[Environment](evidence/t13b-02/20261107122016-34e7f2/environment.json), [preflight](evidence/t13b-02/20261107122016-34e7f2/preflight.json), [postflight](evidence/t13b-02/20261107122016-34e7f2/postflight-schema.json).

| Gate / kênh | Kết quả |
|---|---|
| Exact DB | NODE_ENV=test; DB_HOST=127.0.0.1; DB_NAME=TEST_DATABASE_NAME=travelgo_ai_m0_test; DB_SSL=false; ALLOW_TEST_DB_WRITES=true. Đối chiếu current_database/user/server thật. |
| Sentinel/schema | Guard và sentinel có sẵn đạt; **12/12 migration checksum** khớp; kiểm unique/index/FK, gồm Review→Booking RESTRICT. Postflight giống preflight. Không migrate/sync/seed hoặc đổi marker. |
| Identity/proxy | Backend loopback5316, frontend3316; strictPort, reuseExistingServer=false. Browser xác minh wrapper `/api/__t13b02/identity` đúng run/DB/port trước fixture. App handler giữ nguyên. |
| Browser | Edge Chromium headless **157.0.4341.42**. Desktop1440×900; mobile giả lập390×844, isMobile/hasTouch. Không claim thiết bị thật hoặc Safari. |
| U2 | A05/B01/B02/B03/B04/B05 đi UI thật ở cả hai viewport, API và DB đối chiếu. Không mock/replay API nội bộ. |
| A1 | R03/B06 chạy một lần trong project desktop: browser fetch → Vite proxy → API thật → PostgreSQL thật. API bổ sung của U2+A1 cũng thực thi theo manifest. |
| Fingerprint | Chụp toàn bộ25 bảng trước fixture đầu tiên; dùng helper T11, transaction REPEATABLE READ READ ONLY, count + SHA-256 của MD5 JSON row đã sort. |

Lượt đầu `20261107121638-98276d`: hai build PASS nhưng DB ECONNREFUSED, preflight fail-closed, browser/fixture **NOT RUN**. Đã khởi động Docker Desktop hiện có, xác nhận `travelgo_postgres` healthy; không recreate container hoặc volume. [Summary lỗi môi trường](evidence/t13b-02/20261107121638-98276d/run-summary.json).

## 3. Kết quả 8 CORE

Run chốt có **14 instance thực thi: 7 PASS, 7 FAIL**. Playwright liệt kê16 entries, thêm2 mobile A1 excluded; không gọi hai skipped này là CORE chưa chạy. Browser/runner exit1 đúng vì có FAIL; fingerprint compare exit0.

| CORE | Desktop / A1 | Mobile U2 | Kết luận và checkpoint |
|---|---|---|---|
| R03 | [PASS](evidence/t13b-02/20261107122016-34e7f2/desktop/R03-results.json) | A1, không nhân đôi | A→B và B→A GET/PATCH/DELETE/submit/POST foreign Business của Place/Tour/Ticket/Blog bị403; list chỉ membership; PATCH businessId không chuyển owner. Business/dashboard/Booking list/get/status/legacy alias foreign403, status body mismatch403 BOOKING_ACCESS_DENIED; snapshot không mutation khi deny. |
| A05 | [PASS](evidence/t13b-02/20261107122016-34e7f2/desktop/A05-results.json) | [PASS](evidence/t13b-02/20261107122016-34e7f2/mobile/A05-results.json) | Cả Place/Tour/Blog DRAFT→PENDING→REJECTED→edit/resubmit→APPROVED→SUSPENDED bằng UI hiện có. Audit actor/old/new/reason đúng; public list/detail chỉ APPROVED kể cả status query. Invalid reason/status400 và DRAFT recovery qua API; locked update409. Suspend giữ Booking/Review fixture. |
| B01 | [PASS](evidence/t13b-02/20261107122016-34e7f2/desktop/B01-results.json) | [PASS](evidence/t13b-02/20261107122016-34e7f2/mobile/B01-results.json) | Hai Business A/A2, foreign B, selector/reload; metrics/resource lists đúng SQL và membership. Empty Partner có businesses=[], selectedBusiness=null, metrics=null, UI empty thật. Không đòi persist selector preference. |
| B02 | [FAIL](evidence/t13b-02/20261107122016-34e7f2/desktop/B02-results.json) | [FAIL](evidence/t13b-02/20261107122016-34e7f2/mobile/B02-results.json) | Hotel/restaurant/attraction CRUD cùng ID, content reload, search/filter, submit/archive/cancel đều đạt. **Giá0 hiển thị rỗng sau reload**, trái expected; no-op save vẫn giữ DB0. |
| B03 | [FAIL](evidence/t13b-02/20261107122016-34e7f2/desktop/B03-results.json) | [FAIL](evidence/t13b-02/20261107122016-34e7f2/mobile/B03-results.json) | Tour2ngày/1đêm create/edit/reload/submit/archive đạt; đổi catalog không đổi Booking snapshot. Variant1ngày/0đêm tạo được nhưng **reload rỗng, required field invalid**. Save trong checkpoint này không thực thi tiếp sau assertion FAIL; không điền lại0 để hợp thức PASS. List submit/archive độc lập vẫn đạt, DB nights0 còn nguyên. |
| B04 | [FAIL](evidence/t13b-02/20261107122016-34e7f2/desktop/B04-results.json) | [FAIL](evidence/t13b-02/20261107122016-34e7f2/mobile/B04-results.json) | ACTIVE201, price/capacity/seats đúng; UI PATCH200 không sửa thời gian nhưng **instant lệch−7giờ**. Soft archive INACTIVE/public404 đạt. POST submit Ticket404 chỉ diagnostic, không đòi moderation Ticket. |
| B05 | [PASS](evidence/t13b-02/20261107122016-34e7f2/desktop/B05-results.json) | [PASS](evidence/t13b-02/20261107122016-34e7f2/mobile/B05-results.json) | Blog DRAFT201, server author/business, edit cùng ID và multiline content reload; submit PENDING, archive SUSPENDED, giữ content/author/business. |
| B06 | [FAIL](evidence/t13b-02/20261107122016-34e7f2/desktop/B06-results.json) | A1, không nhân đôi | MANAGE_BUSINESS gates/new Booking MANAGE_BOOKINGS gates, invalid DTO400, locked update409 đạt; submit/Blog update ghi đúng characterization. **Legacy Booking alias trả200 thay403 cho member chỉ MANAGE_BUSINESS**, lộ Booking fixture. |

Negative DTO gồm giá/capacity âm, tọa độ ngoài range, Tour durationDays0, Ticket ngày sai và Blog thiếu title khi create; snapshot giữ nguyên sau400. Không tuyên bố đã fuzz toàn bộ DTO hoặc kiểm đủ mọi trường chưa có trong manifest.

## 4. Lỗi phát hiện và response thật

Severity đề xuất: **P1** cho vi phạm quyền/đổi dữ liệu thời gian, **P2** cho hiển thị/validation của giá trị0. Đây là mức ưu tiên xử lý, không thay expected hoặc kết quả case.

### T13B02-01 — Booking alias thiếu MANAGE_BOOKINGS — P1 OPEN

Member `1335ce22-164f-4e81-aa1a-d9c6376981b0` chỉ có `MANAGE_BUSINESS` tại Business `73006f0d-b7b9-40ea-ab9b-a0f2b18a7944`. Gọi `GET /api/partner/businesses/73006f0d-b7b9-40ea-ab9b-a0f2b18a7944/bookings`: expected403, **actual200**. Response có Booking `0e2751b7-f6bd-4ccd-b301-a06289193247`, code `HG-97BCB2BE11E7428AA11F3142`, cùng customerName/email/phone, ngày, trạng thái và tiền của fixture. Endpoint Booking mới từ chối cùng lớp member bằng403.

[Response/permission witness](evidence/t13b-02/20261107122016-34e7f2/desktop/B06-alias-permission.json), [DB cuối case](evidence/t13b-02/20261107122016-34e7f2/desktop/B06-db-final.json). `PartnerService.getBookings` gọi getBusiness để kiểm membership, không kiểm permission như BookingService endpoint mới. Đã ngừng probe alias sau response này; không dò dữ liệu nền hoặc mutation tiếp qua alias. Snapshot trước/sau không đổi. R03 vẫn PASS: đây là thiếu quyền trong **cùng Business**, không phải vượt membership sang Business khác. Không sửa guard ứng dụng.

### T13B02-02 — Place giá0 hiển thị trống — P2 OPEN

Tạo hotel giá0 bằng UI, sửa nội dung và reload: API/DB vẫn0, input priceFrom=`""`, expected=`"0"`. Desktop ID `4bc6374b-03c1-47a0-9c50-7881abf817a8`; mobile ID `b573fcd8-7df7-494b-a91e-aa667041e254`. Save tiếp không sửa giá vẫn PATCH200 và DB0: **lỗi hiển thị, chưa thấy mất giá DB trong witness này**.

[Desktop input/DB](evidence/t13b-02/20261107122016-34e7f2/desktop/B02-zero-input.json), [mobile input/DB](evidence/t13b-02/20261107122016-34e7f2/mobile/B02-zero-input.json), [ảnh desktop](evidence/t13b-02/20261107122016-34e7f2/desktop/B02-zero-price-full.png), [ảnh mobile](evidence/t13b-02/20261107122016-34e7f2/mobile/B02-zero-price-full.png). Source form dùng `value={form[field.key] || ''}`, nên số0 từ API bị render rỗng. Không sửa source.

### T13B02-03 — Tour0đêm trở thành required field rỗng sau reload — P2 OPEN

UI tạo1ngày/0đêm201; DB nights0. Khi mở lại/reload, input durationNights rỗng, `checkValidity()=false`; expected hiển thị0 và cho phép save không sửa. Desktop ID `8e397d91-bec0-4247-b483-fd222807cfdd`; mobile ID `ac292b9c-92de-4e35-8b00-ee0740283873`.

[Desktop witness](evidence/t13b-02/20261107122016-34e7f2/desktop/B03-zero-nights-input.json), [mobile witness](evidence/t13b-02/20261107122016-34e7f2/mobile/B03-zero-nights-input.json), [ảnh desktop](evidence/t13b-02/20261107122016-34e7f2/desktop/B03-zero-nights-full.png), [ảnh mobile](evidence/t13b-02/20261107122016-34e7f2/mobile/B03-zero-nights-full.png). Cùng biểu thức falsy của form, thêm required ở durationNights. Checkpoint dừng trước click Save do invariant input đã FAIL; không claim đã có PATCH bị server từ chối. Các nhánh submit/archive từ list chạy độc lập và không sửa nights.

### T13B02-04 — Ticket no-op save làm trôi timestamp−7giờ — P1 OPEN

Sau tạo Ticket ACTIVE, mở edit/reload và nhấn Lưu nội dung mà không sửa thời gian: PATCH200, departure và arrival trong API/DB đổi instant. Cả desktop và mobile cùng witness:

| Giá trị | Departure | Arrival |
|---|---|---|
| API/DB trước | `2030-06-15T03:30:00.000Z` | `2030-06-15T05:30:00.000Z` |
| Input datetime-local sau mở lại | `2030-06-15T03:30` | `2030-06-15T05:30` |
| API/DB sau save | `2030-06-14T20:30:00.000Z` | `2030-06-14T22:30:00.000Z` |
| Delta | **−25.200.000ms** | **−25.200.000ms** |

Desktop Ticket `c7eb3a1f-f257-4d47-93bd-8223530d699b`; mobile `8f91c15b-f22b-4d2d-823a-9011c6baa256`. [Desktop API/input/DB trước-sau](evidence/t13b-02/20261107122016-34e7f2/desktop/B04-timestamp-before-after.json), [mobile](evidence/t13b-02/20261107122016-34e7f2/mobile/B04-timestamp-before-after.json), [ảnh desktop](evidence/t13b-02/20261107122016-34e7f2/desktop/B04-ticket-noop-before-full.png), [ảnh mobile](evidence/t13b-02/20261107122016-34e7f2/mobile/B04-ticket-noop-before-full.png).

Source normalize cắt ISO bằng `.slice(0,16)` rồi đưa vào datetime-local; TicketService parse chuỗi không offset bằng `new Date(...)` với TZ backend. Invariant instant đã được PREP khóa, không phụ thuộc việc chọn policy nhập Ticket mới. Không đổi expected theo timezone và không sửa frontend/backend.

Observation thêm: form Ticket vẫn có câu “Nội dung mới được lưu ở trạng thái nháp” dù status ACTIVE; giữ **P2 OPEN về nhãn UI**, không yêu cầu thêm DRAFT/moderation Ticket. Ảnh B04 nêu trên thể hiện cả hai.

## 5. Bằng chứng UI/API/DB và giới hạn

Mỗi results JSON tại bảng mục3 có checkpoint expected/actual, status/body request/response thật đã che credential, network metadata, browser/viewport, console và danh sách ảnh. Mỗi case có `*-db-final.json` theo fixture IDs. Không dùng ảnh placeholder để chứng minh nghiệp vụ API-only.

- Moderation: [mobile Place SUSPENDED](evidence/t13b-02/20261107122016-34e7f2/mobile/A05-places-suspended-full.png), [desktop Tour APPROVED](evidence/t13b-02/20261107122016-34e7f2/desktop/A05-tours-approved-full.png), [mobile Blog REJECTED](evidence/t13b-02/20261107122016-34e7f2/mobile/A05-blogs-rejected-full.png).
- Retention: [Place desktop](evidence/t13b-02/20261107122016-34e7f2/desktop/A05-places-retention.json), [Place mobile](evidence/t13b-02/20261107122016-34e7f2/mobile/A05-places-retention.json), [Tour desktop](evidence/t13b-02/20261107122016-34e7f2/desktop/A05-tours-retention.json), [Tour mobile](evidence/t13b-02/20261107122016-34e7f2/mobile/A05-tours-retention.json): Booking/Review trước và sau suspend giữ nguyên.
- Tour đổi giá catalog123456→222222 không reprice Booking: [desktop](evidence/t13b-02/20261107122016-34e7f2/desktop/B03-booking-preservation.json), [mobile](evidence/t13b-02/20261107122016-34e7f2/mobile/B03-booking-preservation.json).
- Dashboard empty: [desktop](evidence/t13b-02/20261107122016-34e7f2/desktop/B01-empty-membership.png), [mobile](evidence/t13b-02/20261107122016-34e7f2/mobile/B01-empty-membership.png). Blog persisted/archived: [mobile](evidence/t13b-02/20261107122016-34e7f2/mobile/B05-blog-archived.png).

Đã xem ảnh thật của giá0, Tour0đêm, Ticket và mobile moderation. Run chốt có78 ảnh desktop/72 mobile (gồm viewport và full-page),39/36 layout checkpoints, **0 document overflow FAIL**. Click/fill/select/confirm dùng Playwright thật, không force; bảng có scroll nội bộ được phép. Không suy ảnh full-page một mình là bằng chứng button thao tác được. Tour0đêm có giới hạn save đã ghi rõ ở mục4.

Bảy instance FAIL có action/network trace đã redact; không ghi DOM snapshot/screenshots/source vào trace. Ví dụ [B06 trace](evidence/t13b-02/20261107122016-34e7f2/desktop/B06-trace-redacted.zip), [B04 mobile trace](evidence/t13b-02/20261107122016-34e7f2/mobile/B04-trace-redacted.zip); file `*-trace-redaction.json` ghi credential scan PASS. Ảnh độc lập che row/article ngoài fixture.

## 6. Harness, regression và lịch sử các lượt chạy

Chỉ thêm harness riêng: `backend/scripts/t13b02-{run,support,server,audit}.cjs`, `frontend/playwright.t13b02.config.ts`, `frontend/e2e/t13b02-business-moderation.spec.ts`. Tái sử dụng guard/schema của t13b01-support nguyên bytes. Runner chỉ nhận8 IDs đã khóa, không cho grep/scope tùy ý; evidence mỗi run riêng, không ghi vào t13a/t13a-fix/t13b-01/t13b-01-fix. Bản harness thực thi được chép và hash trong từng run.

| Run | Vai trò / kết quả |
|---|---|
| `20261107121638-98276d` | Build đạt, DB chưa chạy; preflight dừng, không fixture/browser/fingerprint. Không tính là application FAIL. |
| `20261107121815-e5bf91` | Lượt đầu có runtime. Selector heading trùng card/modal ở A05 và selector description trùng meta/textarea ở B02/B03; B04/B06 đã tái hiện lỗi thật. Raw evidence giữ nguyên. Cleanup/fingerprint đạt. [Summary](evidence/t13b-02/20261107121815-e5bf91/run-summary.json). |
| `20261107122016-34e7f2` | Chạy lại đủ8 trên cùng app source sau chỉnh harness tương thích. Final4PASS/4FAIL; cleanup/fingerprint đạt. [Summary](evidence/t13b-02/20261107122016-34e7f2/run-summary.json). |

Điều chỉnh harness: scope heading vào modal, description vào textarea; sửa mask để ảnh giữ row fixture có tên T13B02; chờ selector dashboard trả membership thực sau reload. Hai thay đổi sau về label guard/login comment chỉ mô tả đúng T13-B-02. Không nới business assertion, không đổi expected0/instant/403. Lượt chốt không còn lỗi selector; các FAIL cuối là application behavior đã ghi riêng.

Build backend/frontend của run chốt đều PASS: [backend](evidence/t13b-02/20261107122016-34e7f2/backend-build.json), [frontend](evidence/t13b-02/20261107122016-34e7f2/frontend-build.json). `.cjs` syntax checks đạt. Regression là đủ8 CORE của task này trên source ứng dụng không đổi; không chạy lại7 CORE B01-FIX, T13-A, suite seed-based hoặc nhóm ngoài scope.

[Source integrity](evidence/t13b-02/20261107122016-34e7f2/source-integrity.json): **1.958 baseline files nguyên vẹn**, gồm mọi báo cáo/evidence cũ. [238 application/package/migration hashes](evidence/t13b-02/20261107122016-34e7f2/application-hashes-verified.json) trùng toàn bộ snapshot sau B01-FIX. [Harness hashes](evidence/t13b-02/20261107122016-34e7f2/harness-hashes-before.json) không đổi trong run; manifest hash không đổi.

| Source hiện có, không sửa | SHA-256 |
|---|---|
| `frontend/src/pages/partner/PartnerResourceFormPage.tsx` | `bdca32d0393a4ee32992ad3df431be7e607326c120a29e5ab0b5bcc6c038300b` |
| `backend/src/services/partnerService.ts` | `80c8117f375e94b04492249eee0b7a4980e6fee0b9377fd3d0410b5a63a05340` |
| `frontend/src/pages/BecomePartnerPage.tsx` | `724791864679efa0fe27563cdc32ea8113c4800b6402dcfdf2e4bf8fa5b2389a` |

Lệnh từ backend: `node scripts/t13b02-run.cjs`; hậu kiểm read-only `node scripts/t13b02-audit.cjs 20261107122016-34e7f2`. Harness được chạy ngoài sandbox để Edge/Vite/esbuild hoạt động như các task trước; không thay guard DB.

## 7. Fixture, cleanup và fingerprint

Mỗi viewport có email canonical/UUID riêng. Ledger ghi email/planned UUID trước write, discover bằng exact fixture owner/Business IDs. Customer register API thật; PARTNER/SA và Business/member là guarded setup vì không có role editor. Không login seed/demo account, không sửa Place nền. Happy CRUD đi form; prerequisite resource/Booking đi API thật. Hai Review UNVERIFIED/LEGACY/environment=test/aiUsageAllowed=false là guarded retention setup, không claim Review creation/provenance acceptance.

Guard exact DB/sentinel kiểm trước fixture helpers/request checkpoint và cleanup; schema/checksum đã khóa preflight trước mọi fixture của run, hậu kiểm không đổi. Worker afterAll và parent finally cleanup theo ledger. Recovery có planned Business UUID để xử lý mất response. Nếu có dependent ngoài fixture, cleanup fail-closed; không mở rộng predicate theo prefix/environment/status toàn bảng.

Thứ tự cleanup thực: Review → Favorite/events/impressions/audit/history → Booking → recommendation children/request/consent → Trip/Blog/Ticket/tour_places/Tour/Place → application/member/role/Business/User. Child IDs được lưu trước xóa/cascade; không gọi global purge. Review được xóa trước Booking RESTRICT. Không reset, seed, truncate, migration hoặc xóa volume.

| Run chốt | User | Business | Place/Tour/Ticket/Blog | Booking | Review retention | Cleanup |
|---|---:|---:|---|---:|---:|---|
| Desktop |36|17|16 / 10 / 7 / 9|9|1|PASS|
| Mobile |25|13|8 / 5 / 3 / 4|6|1|PASS|

[Desktop ledger](evidence/t13b-02/20261107122016-34e7f2/desktop/ledger.json), [mobile ledger](evidence/t13b-02/20261107122016-34e7f2/mobile/ledger.json), [cleanup cuối](evidence/t13b-02/20261107122016-34e7f2/cleanup-final.json). Số fixture không phải số case.

Hậu kiểm SQL read-only exact cleanup IDs của **21 bảng có ledger**, cả hai viewport ở **cả hai lượt có ghi fixture**, residual đều0; email fixture không còn User. [Verification](evidence/t13b-02/20261107122016-34e7f2/verification_summary.json) lưu counts theo bảng/run/project.

**Fingerprint25/25 bằng nhau, changed=[]**, compare exit0: [before](evidence/t13b-02/20261107122016-34e7f2/fingerprint-before.json), [after](evidence/t13b-02/20261107122016-34e7f2/fingerprint-after.json), [compare](evidence/t13b-02/20261107122016-34e7f2/fingerprint-compare.json). Cả4 snapshot trước/sau hai lượt runtime cũng bằng nhau. Postflight schema/checksum không đổi. Không mượn fingerprint cũ làm before mới; phương pháp không đo sequence/cache hoặc trạng thái ngoài PostgreSQL.

## 8. Trạng thái còn mở và điểm dừng

**Chưa thể đóng T13-B-02 là đạt** vì B02/B03/B04/B06 FAIL. Đề xuất ưu tiên xử lý P1 Booking alias và timestamp Ticket, sau đó giá0/số đêm0 trong task sửa riêng được duyệt. Không tự sửa ứng dụng hoặc đổi expected để đạt PASS.

**Map P2 OPEN** theo T13B01-OBS-01 (`Invalid LatLng object: (NaN, NaN)`), không điều tra/sửa trong task này. Run chốt không ghi pageerror không có nghĩa Map đã được sửa hoặc nghiệm thu. Nhãn “nháp” của Ticket vẫn OPEN; GAP-03 submit/Blog update và GAP-04 Business/public policy giữ giới hạn, không tự đóng GAP.

28 CORE còn **NOT RUN**: R06; A01/A06; B07/B08; V01–V08; F01–F07; C01–C08. O01–O08 đều **NOT RUN**. Các prerequisite Booking/Review trong8 case không nâng các nhóm đó thành PASS. B01-FIX7/7 và T13-A-FIX14/14 giữ kết quả lịch sử, không được nhận là lượt regression mới.

Có thể tiếp tục các nhóm độc lập sau khi chủ dự án duyệt kết quả và cách xử lý lỗi; không nên công bố hoàn tất toàn bộ permissions/Partner persistence khi các FAIL này còn mở. **Dừng sau báo cáo này. Không tự chạy CORE tiếp theo, sửa Map/app, push hoặc deploy.**
