# T13-B-01 — RBAC và Onboarding

Ngày thực hiện: **07/11/2026**, Asia/Saigon (UTC+7). Trạng thái: **Hoàn tất kiểm thử T13-B-01; chưa đạt toàn nhóm do A04 FAIL. Đã dừng.**

Kết quả CORE của nhóm được giao: **6 PASS, 1 FAIL (A04)**. A04 không hiển thị hồ sơ bị từ chối và lý do cho Customer sau khi mở lại/reload, dù API và PostgreSQL lưu quyết định đúng. Không sửa code ứng dụng để thay đổi kết quả.

Toàn bộ 43 CORE: **6 PASS / 1 FAIL / 36 NOT RUN**. **8 OPTIONAL đều NOT RUN**. Các số trên là case logic, không cộng các lượt chạy thử hoặc checkpoint thành case mới.

## 1. Baseline và manifest đã khóa

- Dùng nguyên bản [T13-B-PREP đã duyệt](HUGO_T13_B_SCOPE_AND_MATRIX.md): **43 CORE, 8 OPTIONAL, 9 GAP**. SHA-256 **`2f26c201d218ffd956bedb20f7f71c81bd8396e0a9829eb6217f5043f7b91f23`**. [Bản sao baseline](evidence/t13b-01/baseline/approved-scope.md) giữ nguyên bytes; không cập nhật trạng thái trong báo cáo PREP lịch sử.
- HEAD: **`052531dfc77c4f289757794c0ee08b4d46e6af2e`**; source chạy là working tree đã có các thay đổi T01–T13-A-FIX. [HEAD](evidence/t13b-01/baseline/head.txt), [Git status đầu phiên](evidence/t13b-01/baseline/git-status.txt), [SHA-256 1.089 file có sẵn](evidence/t13b-01/baseline/working-tree-sha256.json).
- Chỉ chọn **R01, R02, R04, R05, A02, A03, A04**. R01 có kênh U2; R04 là A1 một lần; các case còn lại U2+A1. U2 = browser thật desktop **1440×900** và mobile giả lập **390×844**, touch/isMobile; A1 dùng browser fetch qua Vite proxy tới API thật, token fixture và PostgreSQL thật.
- [Manifest lượt chốt](evidence/t13b-01/20261107022450-71003f/case-manifest.json), [manifest-lock](evidence/t13b-01/20261107022450-71003f/manifest-lock.json) được tạo **trước build, preflight và mọi fixture write**. Manifest giữ nguyên dòng acceptance từ PREP, liệt kê role/endpoint/validation/race và 36 CORE không chọn. Hash: **`d80e645c3eea858f48237f5236c502554da4c9ba8b3d117ae1af4aef720041a1`**.
- Expected nghiệp vụ không đổi sau khi thấy FAIL. Không triển khai GAP-09, Business CRUD/moderation, Review/Favorite/Consent functional tests, AI, sentiment hoặc ranking. Các request deny vào endpoint Review/Favorite/Consent là probe R02 đã được duyệt, không phải nghiệm thu các nhóm đó.

## 2. Môi trường, preflight và kênh thực thi

[Environment](evidence/t13b-01/20261107022450-71003f/environment.json), [preflight](evidence/t13b-01/20261107022450-71003f/preflight.json), [fingerprint trước](evidence/t13b-01/20261107022450-71003f/fingerprint-before.json).

| Gate | Kết quả / giới hạn |
|---|---|
| Đích DB | Exact `NODE_ENV=test`, `DB_HOST=127.0.0.1`, `DB_NAME=TEST_DATABASE_NAME=travelgo_ai_m0_test`, `DB_SSL=false`, `ALLOW_TEST_DB_WRITES=true`; đối chiếu `current_database()`/`current_user` thực. Không dùng DB ứng dụng `travelgo_dev`. |
| Guard/sentinel | `assertTestDatabaseWriteOptIn` + exact gate riêng + `assertDatabaseSentinel`; marker có sẵn `hugotravel-isolated-test-database-v1`. Kiểm lại khi discover/cleanup. Không tạo hoặc sửa marker. |
| Schema | **12/12 migration checksum khớp** SQL local; đọc unique/FK thực của users roles, applications, memberships. Có unique partial một active application; không apply migration/sync/seed. |
| Browser → API → DB | Cổng loopback riêng **3314/5314**, strictPort, không reuse server. Browser kiểm `/api/__t13b01/identity` của wrapper riêng: runId, DB, sentinel, port và NODE_ENV phải đúng trước fixture request. Handler ứng dụng được mount nguyên trạng. |
| Fingerprint | Chụp trước fixture đầu bằng helper T11, mọi bảng public, transaction `REPEATABLE READ READ ONLY`; count + SHA-256 của chuỗi MD5 JSON toàn row đã sort. Không chỉ kiểm counts. |
| Build | Backend/frontend build PASS ở lượt chốt. [Backend log](evidence/t13b-01/20261107022450-71003f/backend-build.json), [frontend log](evidence/t13b-01/20261107022450-71003f/frontend-build.json). Không chạy suite seed-based hoặc full T13-A lại. |
| Browser/mobile | Edge Chromium headless; version thực ghi trong từng results JSON. Mobile là giả lập viewport/touch, không phải thiết bị thật hoặc Safari. Browser/server dùng Asia/Ho_Chi_Minh; timestamp evidence/runId dùng UTC. |

Đầu phiên PostgreSQL trả ECONNREFUSED; đã khởi động **Docker Desktop/container có sẵn**, thấy `travelgo_postgres` healthy. Không recreate container/volume, reset hoặc thay cấu hình demo. Vite/esbuild ban đầu bị sandbox chặn đọc ancestor directory; chạy harness ngoài sandbox theo tool approval. [Environment recovery và controlled-abort](evidence/t13b-01/environment-recovery.json) phân biệt lỗi môi trường/harness với lỗi ứng dụng.

## 3. PASS / FAIL / NOT RUN theo case

Lượt chốt: **`20261107022450-71003f`**. [Playwright](evidence/t13b-01/20261107022450-71003f/playwright.json), [command/output/exit](evidence/t13b-01/20261107022450-71003f/browser.json), [matrix JSON](evidence/t13b-01/20261107022450-71003f/acceptance_matrix.json), [CSV](evidence/t13b-01/20261107022450-71003f/acceptance_matrix.csv), [verification summary](evidence/t13b-01/20261107022450-71003f/verification_summary.json).

| Case | Desktop | Mobile giả lập | Witness và expected đã đối chiếu |
|---|---|---|---|
| R01 | [PASS](evidence/t13b-01/20261107022450-71003f/desktop/R01-results.json) | [PASS](evidence/t13b-01/20261107022450-71003f/mobile/R01-results.json) | UI login CUSTOMER/PARTNER/SA-only; Profile/dashboard, reload, public Explore và điều khiển menu. `/auth/me` trùng DB roles; SA-only không được gộp thành PARTNER. Không nghiệm thu công thức dashboard A01. |
| R02 | [PASS](evidence/t13b-01/20261107022450-71003f/desktop/R02-results.json) | [PASS](evidence/t13b-01/20261107022450-71003f/mobile/R02-results.json) | Anonymous UI về login; sai role UI403, API403, token hợp lệ không bị logout. Giả cached roles không nâng quyền, reload `/me` khôi phục. A1 deny probes desktop đầy đủ bên dưới; fixture snapshots trước/sau reject trùng. |
| R04 | [PASS A1](evidence/t13b-01/20261107022450-71003f/desktop/R04-results.json) | Không nhân đôi A1 | Register spoof role/roles/userId/businessId vẫn CUSTOMER/legacy user. Application spoof status/userId/reviewedBy vẫn PENDING của principal; không tự sinh Business/member/elevated grant/audit. |
| R05 | [PASS](evidence/t13b-01/20261107022450-71003f/desktop/R05-results.json) | [PASS](evidence/t13b-01/20261107022450-71003f/mobile/R05-results.json) | Approval thật tạo grant. Token trước grant gọi `/me` thấy PARTNER từ DB nhưng partner API403; reload giữ token cũ. Logout bằng UI rồi login lại cấp token role mới; own Business200, đúng membership DB. Đây là limitation đã chấp nhận, không thêm refresh token. |
| A02 | [PASS](evidence/t13b-01/20261107022450-71003f/desktop/A02-results.json) | [PASS](evidence/t13b-01/20261107022450-71003f/mobile/A02-results.json) | Required field ngăn submit; email sai400 có lỗi, giữ form và không tạo application; sửa lại submit201 PENDING, own GET/reload/DB đúng. API businessName rỗng/email/type/latitude91/longitude181 sai400; sequential duplicate409 ACTIVE_APPLICATION_EXISTS; user khác không thấy hồ sơ. Cancel prompt/confirm không PATCH hoặc đổi DB. |
| A03 | [PASS](evidence/t13b-01/20261107022450-71003f/desktop/A03-results.json) | [PASS](evidence/t13b-01/20261107022450-71003f/mobile/A03-results.json) | UI approve/reload; một ACTIVE Business + membership cả hai permissions + PARTNER grant + decision actor/time/audit. Terminal approve lặp409. A1 desktop hai PATCH đồng thời: **một200/một409**, một Business/grant/audit. Không nhận là đã kiểm fault-injection rollback mọi điểm. |
| A04 | [FAIL](evidence/t13b-01/20261107022450-71003f/desktop/A04-results.json) | [FAIL](evidence/t13b-01/20261107022450-71003f/mobile/A04-results.json) | Rejection API/DB đúng nhưng Customer mất phần kết quả/lý do khi mở lại/reload. Các nhánh độc lập vẫn kiểm tiếp: thiếu reason400, status sai400, needs-info feedback/reload, needs-info→approve, terminal reject quyết định lại409 đều đúng. Giữ toàn case FAIL. |

Runtime có **13 instance thực thi = 6 U2×2 + 1 A1**, **11 PASS / 2 FAIL**. Playwright liệt kê 14 entries với **1 skipped là R04 mobile** do kênh A1 chạy một lần; đây không phải case CORE chưa thực hiện. Không cộng checkpoint/layout/diagnostics hoặc các lượt trước vào mẫu số này. Exit browser/runner **1** là kết quả mong đợi khi A04 còn FAIL; fingerprint compare exit0 độc lập.

### 3.1. Endpoint phủ trong R02, không nhận vơ coverage nhóm khác

Tất cả prefix `/api`; actual principal, method, endpoint, status và code có trong desktop R02 results. Dùng UUID hợp lệ; target application là fixture đã ledger. Không thử mutation trên catalog/Review/Booking nền.

| Probe | Expected/actual |
|---|---|
| CUSTOMER/PARTNER: GET `/admin/dashboard`; PATCH `/admin/partners/:fixtureApplicationId/approval`; PATCH `/admin/{places,tours,blogs}/:id/status` |403 FORBIDDEN|
| CUSTOMER/PARTNER: POST `/places`, DELETE `/places/:id`; POST `/tours`, PUT/DELETE `/tours/:id`; PATCH `/reviews/:id/moderation` |403 FORBIDDEN|
| CUSTOMER/SA-only: GET `/partner/dashboard` |403 FORBIDDEN|
| Anonymous các endpoint trên và GET `/partner/dashboard` |401|
| Anonymous GET `/reviews/me`, POST `/places/:id/reviews`, PATCH/DELETE `/reviews/:id` |401|
| Anonymous GET `/favorites`, POST/DELETE `/favorites/:placeId`, GET/PUT `/intelligence/consent` |401|

[Snapshot fixture trước/sau denied mutations](evidence/t13b-01/20261107022450-71003f/desktop/R02-rejected-mutation-before-after.json) gồm user identity/roles, applications, Business/member và audit; không đổi. Các UUID catalog/review không tồn tại chỉ chứng minh role gate chạy trước resource lookup, không chứng minh ownership/validation/CRUD của R03/B/V/F/C.

## 4. Lỗi ứng dụng T13B01-01 — Customer không thấy quyết định REJECTED

**REPRODUCED, P1, trạng thái OPEN.** Ảnh hưởng acceptance A04 ở desktop/mobile. Đây là lỗi hiển thị kết quả luồng CORE; chưa quan sát mất quyết định DB, cấp role trái phép hoặc tạo Business ngoài flow approval. Không đánh đồng với toàn bộ onboarding hay RBAC bị lỗi.

Repro bằng UI/API/PostgreSQL thật, toàn bộ identity là fixture:

1. Customer gửi application PENDING. SA vào `/admin/partner-applications`, chọn từ chối, nhập `SYNTHETIC TEST ONLY rejected` và xác nhận.
2. PATCH trả200; PostgreSQL application `REJECTED`, reason, reviewed_by/reviewed_at và audit đúng; không có Business/member/PARTNER grant cho applicant bị từ chối.
3. Customer login, mở `/become-partner`; GET `/partner-applications/me` trả hồ sơ REJECTED với đúng reason; reload trang.
4. **Expected:** hiển thị kết quả từ chối và phản hồi đã lưu theo A04 được duyệt. **Actual:** hiện form nộp mới trống; không có thẻ hồ sơ REJECTED hoặc phản hồi. Assertion hiển thị hồ sơ thất bại; screenshot xác nhận không chỉ là sai selector.

| Bằng chứng | Desktop | Mobile |
|---|---|---|
| Customer sau reload, không thấy kết quả từ chối | [viewport](evidence/t13b-01/20261107022450-71003f/desktop/A04-reject_ui-failure.png) | [viewport](evidence/t13b-01/20261107022450-71003f/mobile/A04-reject_ui-failure.png) |
| Quyết định Admin | [ảnh](evidence/t13b-01/20261107022450-71003f/desktop/A04-admin-rejected.png) | [ảnh](evidence/t13b-01/20261107022450-71003f/mobile/A04-admin-rejected.png) |
| API/expected/actual/checkpoint | [results](evidence/t13b-01/20261107022450-71003f/desktop/A04-results.json) | [results](evidence/t13b-01/20261107022450-71003f/mobile/A04-results.json) |
| Application, grant, member, audit DB | [snapshot](evidence/t13b-01/20261107022450-71003f/desktop/A04-db-final.json) | [snapshot](evidence/t13b-01/20261107022450-71003f/mobile/A04-db-final.json) |
| Trace action đã che credential | [trace](evidence/t13b-01/20261107022450-71003f/desktop/A04-trace-redacted.zip) | [trace](evidence/t13b-01/20261107022450-71003f/mobile/A04-trace-redacted.zip) |

**Nguyên nhân source:** [BecomePartnerPage.tsx](../frontend/src/pages/BecomePartnerPage.tsx), `active` tại dòng18 chỉ chọn PENDING/NEEDS_MORE_INFO/APPROVED; JSX hiển thị phản hồi chỉ bên nhánh `active`. REJECTED rơi xuống form mới dù danh sách đã được API trả. Đây là giải thích phù hợp witness, không phải kết luận chỉ dựa đọc source.

**Đề xuất task sửa riêng:** bảo toàn hành vi nộp lại hiện có, hiển thị quyết định/lý do của hồ sơ bị từ chối theo acceptance A04; kiểm lại UI reload desktop/mobile và các decision/provenance liên quan. Không tự triển khai ở T13-B-01, không đổi expected sang “form mới là PASS”, không thêm API bổ sung hồ sơ hoặc role management mới.

Phần REJECT_UI FAIL được giữ bằng soft assertion để kiểm tiếp các nhánh độc lập NEEDS_MORE_INFO và quyết định sau đó; không bỏ failure khỏi kết quả tổng. NEEDS_MORE_INFO chưa có vòng Customer bổ sung hồ sơ vẫn là GAP-02 đã biết, không thử control không tồn tại.

### 4.1. Quan sát phụ T13B01-OBS-01 — Map console error khi mở Explore mobile

[R01 mobile results](evidence/t13b-01/20261107022450-71003f/mobile/R01-results.json) ghi **3 pageerror `Invalid LatLng object: (NaN, NaN)`** khi luồng role mở khu vực public Explore; desktop không ghi pageerror. [Ảnh cuối R01 mobile](evidence/t13b-01/20261107022450-71003f/mobile/R01-final.png) cho thấy shell/filter Explore vẫn hiển thị. Đây là **runtime observation nội bộ**, không gộp vào lỗi tiles/ảnh bên ngoài.

Tạm phân loại **P2 để triage, OPEN; chưa chốt nguyên nhân và ảnh hưởng thao tác Map**. R01 vẫn PASS các expected role/identity/route/menu đã khóa; không có assertion hoặc kết luận Map/Explore functional PASS mới. Không tái hiện thêm, thay catalog, mở nhóm Map/ranking hoặc sửa source để điều tra trong task này. Cần task riêng nếu chủ dự án muốn xác định tác động. [Bug/observation JSON](evidence/t13b-01/20261107022450-71003f/findings.json).

## 5. Fixture, cleanup, fingerprint và toàn vẹn

| Thành phần | Phương án thực tế |
|---|---|
| User | Email canonical duy nhất theo run/project/label/random, ghi ledger **trước register**. API register thật; UI login thật. Không đăng nhập seed/demo account, không rotate password có sẵn. Credential tạm chỉ ở bộ nhớ test. |
| SA-only | Register fixture CUSTOMER rồi guarded transaction thay role của **chính UUID fixture** thành SUPER_ADMIN. Đây là setup tối thiểu đã duyệt ở GAP-07; không coi là đã có UI/API quản trị role. |
| PARTNER/Business | Sinh bằng submit+approval API/UI thật. Ledger discover từ exact applicant user/application và approval audit/membership; không tìm/xóa theo prefix tên. Không dựng sẵn kết quả approval để làm A03/R05 PASS. |
| Dữ liệu ngoài nhóm | Không tạo Place/Tour/Ticket/Blog/Booking/Review/Favorite/Trip. Public browse có thể tạo recommendation request/candidate cho user fixture ngay cả opt-out; consent decline chỉ là setup, không ghi nhận C01–C08 PASS. |
| Cleanup | Worker afterAll và outer runner recovery độc lập, kể cả worker chết hoặc FAIL. Kiểm sentinel/exact DB trước khi xóa; nếu có functional/catalog row bất ngờ hoặc membership/grant nền phụ thuộc fixture thì fail-closed, không cascade tùy tiện. |
| Thứ tự FK | Visible/candidate → event/legacy impression → request/consent → audit → membership → application/role → Business → User. Ghi union các ID cleanup; parent recovery chạy lại idempotent. |

[Desktop ledger](evidence/t13b-01/20261107022450-71003f/desktop/ledger.json), [mobile ledger](evidence/t13b-01/20261107022450-71003f/mobile/ledger.json), [cleanup-final](evidence/t13b-01/20261107022450-71003f/cleanup-final.json). Không reset/seed/truncate, global purge, migration, xóa volume hoặc cleanup theo `environment=test`/prefix toàn DB.

Lượt chốt tạo **desktop: 18 User / 9 application / 6 Business; mobile: 16 User / 7 application / 5 Business**. Số này gồm setup và case fixtures, không phải số luồng độc lập. Cleanup worker và parent đều PASS. Audit read-only sau run kiểm lại **từng ID trong cleanupIds của 12 bảng**, cùng các email đã preallocate: residual đều **0**, bao gồm request/candidate/visible, roles/memberships/audit và consent.

**Fingerprint: 25/25 bảng trùng, `changed: []`, compare exit0.** Cả **8 snapshot trước/sau của 4 lượt có ghi fixture** (kể cả lượt bị dừng để sửa harness) đều trùng nhau. Postflight identity, sentinel, toàn bộ12 checksums, unique/FK metadata khớp preflight. Không thay baseline sau cleanup để che fixture sót.

**Toàn vẹn: 1.089/1.089 file có sẵn trước task giữ nguyên SHA-256**, bao gồm PREP đã duyệt, **264 file evidence T13-A và 227 file evidence T13-A-FIX**. Snapshot full T13-A-FIX cuối **287/287 entries khớp** source hiện tại. Hash manifest và năm file harness thực thi giữ nguyên trong lượt chốt. Audit hậu kiểm là file harness mới riêng, không thay handler ứng dụng.

Các checkpoint layout đã thực hiện: **27 desktop / 26 mobile, không có document overflow**, với **54/52 ảnh** viewport và full-page. Table Admin có scroll trong container; các nút quyết định được click thật, không force. Đây là bằng chứng phạm vi đã thao tác, không phải pixel-perfect/toàn bộ accessibility. Quan sát Map console ở mục4.1 vẫn được giữ, không biến việc layout PASS thành Map PASS.

[Fingerprint sau](evidence/t13b-01/20261107022450-71003f/fingerprint-after.json), [compare](evidence/t13b-01/20261107022450-71003f/fingerprint-compare.json), [source integrity trong run](evidence/t13b-01/20261107022450-71003f/source-integrity.json), [postflight schema](evidence/t13b-01/20261107022450-71003f/postflight-schema.json), [audit độc lập](evidence/t13b-01/20261107022450-71003f/verification_summary.json).

Fingerprint toàn public row không đo sequence state, pg_stat, cache, dịch vụ ngoài hoặc mọi trạng thái filesystem. So source gồm danh sách Git cached/untracked đầu phiên, không bao gồm ignored `node_modules`, `dist` và build cache. Không dùng fingerprint hay PASS lịch sử để tuyên bố 36 CORE còn lại đã đạt.

## 6. Lượt chạy và lỗi harness được giữ lịch sử

| Run | Kết quả và cách sử dụng |
|---|---|
| `20261107021341-8727e4` | Backend build PASS; frontend Vite/esbuild bị sandbox chặn đọc ancestor. Browser/preflight/fixture NOT RUN, không có write. Giữ [run-summary](evidence/t13b-01/20261107021341-8727e4/run-summary.json). |
| `20261107021405-551fb0` | R01/R02/R04/A03 desktop có witness; A02/R05 setup bị locator select quá chặt chặn trước submit. Dừng đúng cây Playwright của run để parent cleanup/recovery. Không dùng làm kết quả nghiệm thu đủ nhóm. [Summary](evidence/t13b-01/20261107021405-551fb0/run-summary.json), [harness v1](evidence/t13b-01/harness-v1/frontend/e2e/t13b01-rbac-onboarding.spec.ts). |
| `20261107021838-1b3bd5` | Full nhóm: A04 FAIL cả hai; R01 mobile false failure do `.first()` chọn tên trong Navbar desktop đang ẩn, Profile thực vẫn hiển thị đúng. Sửa selector theo vùng UI hiện có; không sửa ứng dụng hoặc expected. [Summary](evidence/t13b-01/20261107021838-1b3bd5/run-summary.json). |
| `20261107022055-84970f` | Cùng 7 case sau sửa selector: 6 CORE PASS/A04 FAIL; 11 runtime PASS/2 FAIL, một mobile A1 excluded. Thêm API own GET và reload trước assertion A04 để phân biệt DB/API đúng với UI sai. [Summary](evidence/t13b-01/20261107022055-84970f/run-summary.json). |
| **`20261107022450-71003f`** | Lượt chốt cùng phạm vi/acceptance; giữ trace Playwright đã redaction cho A04. Chỉ dùng lượt này làm mẫu số kết quả cuối. [Summary](evidence/t13b-01/20261107022450-71003f/run-summary.json). |

Các false failure của harness không được ghi thành lỗi ứng dụng; expected “identity hiển thị”, “invalid submit400 giữ input và có phản hồi lỗi” không đổi. Harness dùng control select thật và thông báo lỗi generic đang có, không ép UI phải hiển thị nguyên câu errors[] của server. Hash/source từng revision được giữ trong evidence; không sửa kết quả lượt cũ hoặc đổi A04 thành PASS.

Không lưu HAR/trace thô chứa Bearer/password trong evidence. Trace FAIL giữ action/stacks, tắt DOM/source/screenshot snapshots; **`trace.network` trống**, network request/response thực được lưu riêng đã redaction trong results JSON. Trace không phải replay DOM đầy đủ. Raw ZIP tạm được xóa sau khi thay credential đã dùng trong test và kiểm không còn literal đó ở từng ZIP entry: **32 redactions desktop / 28 mobile**, ZIP và từng JSON line hợp lệ, không còn access-token theo pattern được kiểm. [Desktop redaction audit](evidence/t13b-01/20261107022450-71003f/desktop/A04-trace-redaction.json), [mobile](evidence/t13b-01/20261107022450-71003f/mobile/A04-trace-redaction.json). Ảnh UI độc lập vẫn có viewport/full-page; mask các application rows không phải fixture để tránh đưa dữ liệu nền vào ảnh. Console/network 400/401/403/409 cố ý được lưu, không tự gọi là lỗi ứng dụng; pageerror Map được ghi riêng tại mục4.1.

## 7. Phần chưa chạy, GAP và đánh giá tiếp tục

**36 CORE NOT RUN:** R03, R06; A01, A05, A06; B01–B08; V01–V08; F01–F07; C01–C08. **OPTIONAL O01–O08 NOT RUN.** Không dùng deny probes R02 hoặc browse/setup để nâng các nhóm này thành PASS.

| GAP PREP | Ảnh hưởng T13-B-01 / trạng thái |
|---|---|
| GAP-01 | Không dựng hay nghiệm thu placeholder thành UI nghiệp vụ. |
| GAP-02 | Kiểm submit/decision/reload/re-login theo phần hiện có; không bổ sung hồ sơ NEEDS_MORE_INFO. Lỗi REJECTED nêu riêng T13B01-01, không đổi numbering thành GAP thứ10. |
| GAP-03/04/05 | Permission alias/Business visibility/revenue semantics để các nhóm sau, NOT RUN trong nhóm này. R01 dashboard chỉ smoke route/identity. |
| GAP-06 | Race Favorite/Consent/account-switch chưa chạy, không suy từ R02/R05 thành đã được bảo vệ toàn bộ. |
| GAP-07 | Fixture SA-only tối thiểu và onboarding thực được dùng đúng UUID; không tạo Booking completed/unpaid trong nhóm này. |
| GAP-08 | Đã khóa manifest và preflight trước write; expected và scope hash giữ nguyên. |
| GAP-09 | **Không áp dụng lượt này**; không chạy B02/B03/B04/B07 hoặc test thời gian/giá0/form Partner. |

**Đánh giá:** có thể chuẩn bị/kiểm các nhóm T13-B độc lập sau quyết định tiếp theo của chủ dự án, vì guard/cleanup/fingerprint và các role gates được chọn đã đạt; chưa quan sát vượt quyền hoặc hỏng dữ liệu trong các probe đã chạy. **Chưa nghiệm thu trọn nhóm RBAC/Onboarding/T13-B**, vì A04 còn FAIL và phần còn lại chưa chạy. Nên tách task sửa T13B01-01 rồi regression A04 và các decision/reload liên quan trước khi đóng onboarding. Đây là đề xuất, không phải tự bắt đầu sửa hoặc chạy nhóm tiếp.

## 8. File mới, lệnh và điểm dừng

Chỉ thêm harness/evidence và báo cáo này; không sửa application/package/migration/SQL/config demo hoặc báo cáo/evidence cũ:

| File | Vai trò |
|---|---|
| `backend/scripts/t13b01-run.cjs` | Scope/hash gate, khóa manifest, build, ports, preflight/fingerprint, Playwright, cleanup/recovery và integrity. |
| `backend/scripts/t13b01-support.cjs` | Exact guard/schema, ledger, SA-only fixture setup, snapshot và cleanup theo ID. |
| `backend/scripts/t13b01-server.cjs` | Wrapper loopback identity; mount application handler nguyên trạng. |
| `backend/scripts/t13b01-audit.cjs` | Audit read-only sau run: postflight/checksum, residual IDs, source, fingerprint xuyên run, matrix43+8 và summary. |
| `frontend/playwright.t13b01.config.ts` | Config riêng desktop/mobile, cổng riêng, không reuse server, không chạy suite khác. |
| `frontend/e2e/t13b01-rbac-onboarding.spec.ts` | Bảy case, UI/API/DB assertions, ảnh/trace redacted, giữ FAIL và kiểm tiếp nhánh độc lập. |
| `docs/evidence/t13b-01/**` | Baseline bất biến, manifest mỗi run, hashes/source, logs, snapshots/ledger/cleanup/fingerprint, kết quả và ảnh/trace. |

Lệnh chính từ `travelgo/backend`, đã thực hiện:

```powershell
node scripts/t13b01-run.cjs
node scripts/t13b01-audit.cjs 20261107022450-71003f
```

Mỗi runner tạo thư mục mới; không truyền grep để mở/thu scope tùy ý. Audit ghi file mới trong đúng run, không ghi đè. Build con dùng `npm.cmd run build`; runner gọi riêng config `playwright.t13b01.config.ts` và fingerprint helper T11. Không chạy seed/migrate/reset hoặc các script test tích hợp cũ. Kiểm syntax `.cjs` và kiểm Markdown/link/evidence là kiểm harness/tài liệu, không được đếm thành PASS ứng dụng.

**Dừng sau T13-B-01. Không sửa lỗi, không chạy 36 CORE/8 OPTIONAL còn lại, không push/deploy.**
