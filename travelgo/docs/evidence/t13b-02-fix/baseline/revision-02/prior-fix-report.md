# T13-B-02-FIX — Booking permission và dữ liệu Form Partner

Hoàn tất **07/11/2026, Asia/Saigon**. Đã sửa đúng **T13B02-01/02/03/04**. Focused cuối **4/4 CORE PASS, 7/7 instance PASS**; sau đó full **8/8 CORE PASS, 14/14 instance thực thi PASS** trên cùng source/harness. Backend/frontend build và regression liên quan PASS. Cleanup sạch, fingerprint **25/25 bảng trùng**. Đề xuất đóng T13-B-02 sau khi chủ dự án duyệt.

Tổng lũy kế: **15 CORE PASS / 0 FAIL / 28 NOT RUN**, gồm7 PASS lịch sử T13-B-01-FIX không chạy lại. **8 OPTIONAL vẫn NOT RUN**. Không cộng focused, lần thử harness, checkpoint hoặc viewport thành CORE mới. Kết quả FAIL gốc vẫn giữ nguyên trong [báo cáo T13-B-02](HUGO_T13_B_02_BUSINESS_MODERATION_REPORT.md).

[Ma trận JSON](evidence/t13b-02-fix/20261107131001-99f226/acceptance_matrix.json), [CSV](evidence/t13b-02-fix/20261107131001-99f226/acceptance_matrix.csv), [verification summary](evidence/t13b-02-fix/20261107131001-99f226/verification_summary.json).

## 1. Căn cứ và root cause

Đã đọc báo cáo T13-B-02, [PREP](HUGO_T13_B_SCOPE_AND_MATRIX.md), source local hiện hành và evidence gốc B02/B03/B04/B06. Source trước sửa vẫn đúng các hash đã ghi ở T13-B-02; không chỉ dựa mô tả lỗi. [Baseline 2.405 file](evidence/t13b-02-fix/baseline/working-tree-sha256.json), [Git status](evidence/t13b-02-fix/baseline/git-status.txt); giữ working tree dirty sẵn có. PREP giữ SHA-256 `2f26c201d218ffd956bedb20f7f71c81bd8396e0a9829eb6217f5043f7b91f23`,43 CORE/8 OPTIONAL/9 GAP.

| Lỗi | Root cause trong source trước sửa | Thay đổi đúng phạm vi |
|---|---|---|
| T13B02-01, P1 | Alias controller gọi `PartnerService.getBookings`; service chỉ gọi getBusiness để kiểm membership rồi query Booking, không kiểm MANAGE_BOOKINGS như BookingService endpoint mới. | Gọi `BusinessAccessService.assert(userId,businessId,'MANAGE_BOOKINGS')` **trước getBusiness và query Booking**. Giữ nguyên pagination/response, business lookup, endpoint và các permission khác. |
| T13B02-04, P1 | Form lấy ISO UTC rồi `.slice(0,16)` để điền datetime-local. Chuỗi không offset gửi backend bị parse như giờ local, trôi−7giờ. Việc dùng control độ phân giải phút còn có thể mất giây/millisecond nếu chỉ đổi format. | ISO→Date→các thành phần giờ địa phương để hiển thị. Lưu bản dữ liệu API gốc; field không đổi giữ nguyên ISO gốc. Khi chủ động sửa, parse giờ địa phương trong browser rồi gửi `toISOString()` có Z. Backend/DB timezone không đổi. |
| T13B02-02, P2 | Input dùng `value || ''`, coi số0 là thiếu. | Controlled field dùng nullish fallback `value ?? ''`: số0 giữ0, null/undefined thành chuỗi rỗng. Không thay giá, công thức hoặc serializer catalog. |
| T13B02-03, P2 | Cùng biểu thức falsy, nhưng durationNights có required nên0 sau reload trở thành field invalid. | Cùng sửa nullish fallback;0 hiển thị, required chấp nhận, no-op save giữ1ngày/0đêm. Không thay Planner. |

**Source ứng dụng thay đổi:**

- [backend/src/services/partnerService.ts](../backend/src/services/partnerService.ts): thêm import và permission gate cho alias.
- [frontend/src/pages/partner/PartnerResourceFormPage.tsx](../frontend/src/pages/partner/PartnerResourceFormPage.tsx): dùng helper giá trị, normalize datetime, giữ original data bằng ref và serialize datetime khi save.
- [frontend/src/utils/partnerFormValues.ts](../frontend/src/utils/partnerFormValues.ts): helper mới cho nullish value, local datetime và ISO payload; dùng chung trong form và unit regression.

[Diff so baseline và bản source cuối](evidence/t13b-02-fix/source-final/application-changes.diff). Không sửa router/controller/validator, BookingService/TicketService, schema, migration, pricing, recommendation, sentiment/ranking, Map hoặc nhãn “nháp” Ticket.

Null/undefined được kiểm riêng ở mức giá trị controlled field/unit, không mock API thành công để chứng minh UI. Luồng API Place hiện đã normalize giá theo contract cũ; task không thêm semantics giá null trong database hoặc sửa serializer/pricing. E2E chứng minh giá0 và các giá dương gốc giữ nguyên sau save/reload.

## 2. Manifest, harness và kênh kiểm

Evidence mới chỉ ở `docs/evidence/t13b-02-fix/`. Runner/spec/config FIX mới, tái sử dụng `t13b02-support.cjs`, `t13b02-server.cjs` và guard gốc nguyên bytes. Harness gốc và toàn bộ evidence T13-B-02 không sửa.

- `backend/scripts/t13b02-fix-run.cjs`: chỉ cho focused/full; khóa manifest trước build/preflight/write. Full yêu cầu focused PASS, application hashes và harness hashes giống nhau.
- `frontend/e2e/t13b02-fix-business-moderation.spec.ts`, `frontend/playwright.t13b02-fix.config.ts`: sao chép8 case gốc, giữ assertion nghiệp vụ; nối kiểm chủ động chỉnh giờ/precision/arrival optional trong B04, alias đủ quyền/permissions=[]/foreign trong B06.
- `backend/scripts/t13b02-fix-unit.cjs`, `frontend/tests/partnerFormValues.test.ts`: regression không ghi DB. `backend/scripts/t13b02-fix-audit.cjs`: hậu kiểm DB read-only, residual IDs, hashes, schema và tổng hợp ma trận.

Focused [manifest](evidence/t13b-02-fix/20261107130839-17f3ab/case-manifest.json), [lock](evidence/t13b-02-fix/20261107130839-17f3ab/manifest-lock.json); full [manifest](evidence/t13b-02-fix/20261107131001-99f226/case-manifest.json), [lock](evidence/t13b-02-fix/20261107131001-99f226/manifest-lock.json), [focused prerequisite](evidence/t13b-02-fix/20261107131001-99f226/focused-prerequisite.json). Full manifest SHA-256: `56e167522b4e50b3dd78980a39fa1fa7813d925e3c8ff5dd7d6974871e662ce4`.

Desktop **1440×900**, mobile giả lập **390×844**, touch/isMobile; Edge Chromium headless. U2 đi UI thật; A1 dùng browser fetch qua Vite proxy tới API thật/PostgreSQL thật. B06 API-only một lần, R03 cũng A1 một lần trong full. Không dùng mock response thành công, không coi API-only là UI chưa có đã PASS.

Giữ GAP-03 submit/Blog update characterization; alias expected403. GAP-04 không tự áp Business ACTIVE thành mọi public catalog gate. GAP-09 kiểm đúng zero/instant; không chạy B07 direct Booking URL trong task FIX.

## 3. Focused results

Lượt đạt **`20261107130839-17f3ab`**, browser/runner exit0: **7 PASS +1 mobile A1 excluded**, tương ứng4 CORE, không phải8 case PASS. [Playwright](evidence/t13b-02-fix/20261107130839-17f3ab/playwright.json), [summary](evidence/t13b-02-fix/20261107130839-17f3ab/run-summary.json).

| Case / lỗi | Desktop | Mobile | Witness |
|---|---|---|---|
| B02 / giá0 | [PASS](evidence/t13b-02-fix/20261107130839-17f3ab/desktop/B02-results.json) | [PASS](evidence/t13b-02-fix/20261107130839-17f3ab/mobile/B02-results.json) | Input0 sau reload, save200 cùng ID/DB0; các Place categories giữ regression. |
| B03 /0đêm | [PASS](evidence/t13b-02-fix/20261107130839-17f3ab/desktop/B03-results.json) | [PASS](evidence/t13b-02-fix/20261107130839-17f3ab/mobile/B03-results.json) | Input0, valid=true, click Save thật PATCH200; DB1ngày/0đêm. |
| B04 / timestamp | [PASS](evidence/t13b-02-fix/20261107130839-17f3ab/desktop/B04-results.json) | [PASS](evidence/t13b-02-fix/20261107130839-17f3ab/mobile/B04-results.json) | No-op delta0; giây/millisecond giữ nguyên; chỉnh giờ qua nửa đêm đúng UTC; reload/save lại không trôi; arrival optional xóa được. |
| B06 / Booking alias | [PASS A1](evidence/t13b-02-fix/20261107130839-17f3ab/desktop/B06-results.json) | Không nhân đôi A1 | MANAGE_BUSINESS-only và permissions=[]403; MANAGE_BOOKINGS-only own200; foreign403; no mutation. |

Lượt focused đầu **`20261107130704-5a9bb2`**:5 instance PASS,2 B03 FAIL do harness đọc input ngay sau reload trước khi GET/form hydrate xong. Ảnh sau phép đọc đã hiện0; source ứng dụng không đổi giữa các lượt. Chỉ thêm chờ title đúng fixture tải xong trước khi đọc durationNights. **Giữ nguyên** expected0, validity=true và save200; không điền lại0, retry assertion bằng dữ liệu giả hoặc sửa FAIL cũ. [Raw summary](evidence/t13b-02-fix/20261107130704-5a9bb2/run-summary.json), [ảnh desktop có0](evidence/t13b-02-fix/20261107130704-5a9bb2/desktop/B03-zero-nights-full.png). Lượt này cleanup/fingerprint đạt; chưa mở full cho đến focused sau PASS.

## 4. Full8 CORE regression trên source cuối

Run **`20261107131001-99f226`**, sau focused đạt. **14 instance PASS,0 FAIL**, cộng2 mobile A1 excluded thành16 Playwright entries. Browser/runner exit0; không cộng7 focused vào14 full. [Playwright full](evidence/t13b-02-fix/20261107131001-99f226/playwright.json), [log](evidence/t13b-02-fix/20261107131001-99f226/browser.json), [summary](evidence/t13b-02-fix/20261107131001-99f226/run-summary.json).

| CORE | Desktop | Mobile |
|---|---|---|
| R03 | [PASS A1](evidence/t13b-02-fix/20261107131001-99f226/desktop/R03-results.json) | Không nhân đôi A1 |
| A05 | [PASS](evidence/t13b-02-fix/20261107131001-99f226/desktop/A05-results.json) | [PASS](evidence/t13b-02-fix/20261107131001-99f226/mobile/A05-results.json) |
| B01 | [PASS](evidence/t13b-02-fix/20261107131001-99f226/desktop/B01-results.json) | [PASS](evidence/t13b-02-fix/20261107131001-99f226/mobile/B01-results.json) |
| B02 | [PASS](evidence/t13b-02-fix/20261107131001-99f226/desktop/B02-results.json) | [PASS](evidence/t13b-02-fix/20261107131001-99f226/mobile/B02-results.json) |
| B03 | [PASS](evidence/t13b-02-fix/20261107131001-99f226/desktop/B03-results.json) | [PASS](evidence/t13b-02-fix/20261107131001-99f226/mobile/B03-results.json) |
| B04 | [PASS](evidence/t13b-02-fix/20261107131001-99f226/desktop/B04-results.json) | [PASS](evidence/t13b-02-fix/20261107131001-99f226/mobile/B04-results.json) |
| B05 | [PASS](evidence/t13b-02-fix/20261107131001-99f226/desktop/B05-results.json) | [PASS](evidence/t13b-02-fix/20261107131001-99f226/mobile/B05-results.json) |
| B06 | [PASS A1](evidence/t13b-02-fix/20261107131001-99f226/desktop/B06-results.json) | Không nhân đôi A1 |

R03 giữ hai chiều ownership/resource/Booking, spoof owner bị bỏ và deny không mutation. A05 giữ đầy đủ moderation/resource public visibility/audit/retention. B01 metrics/membership/empty đúng SQL; B05 content/author/submit/archive không regression. B02/B03/B04 vẫn chạy CRUD và archive gốc, B06 vẫn kiểm validation/locked status/permission các endpoint mới. Không chỉ chạy bốn assertion lỗi rồi gọi full8 PASS.

## 5. UI/API/PostgreSQL witness sau FIX

### Booking alias

Member chỉ MANAGE_BUSINESS gọi alias nhận **403**, body thật `{success:false, code:"BUSINESS_ACCESS_DENIED"}`; không có data Booking. [Negative response](evidence/t13b-02-fix/20261107131001-99f226/desktop/B06-alias-permission.json). Member permissions=[] cũng403. Member chỉ MANAGE_BOOKINGS nhận200 đúng Business `46bf0d32-d1c1-4fdb-8c58-f4df6cc4b82c`, chứa fixture Booking `2c636257-2c4c-44a3-add4-8c25f04124a3`; cùng actor gọi Business foreign403. [Positive response/permission](evidence/t13b-02-fix/20261107131001-99f226/desktop/B06-fix-alias-positive.json), [DB cuối](evidence/t13b-02-fix/20261107131001-99f226/desktop/B06-db-final.json).

Snapshot trước/sau các GET/deny không đổi. Unit kiểm thêm thiếu quyền phải từ chối **trước khi Booking query được gọi**, không chỉ lọc response sau query.

### Giá0 và0đêm

Giá0: desktop Place `c69fb553-19f5-4b36-b5cb-0650d9437640`, mobile `e8e3feab-982d-4867-91f0-e02a519068a0`; input=`"0"`, DB0, no-op save200. [Desktop input/DB](evidence/t13b-02-fix/20261107131001-99f226/desktop/B02-zero-input.json), [mobile](evidence/t13b-02-fix/20261107131001-99f226/mobile/B02-zero-input.json), [ảnh desktop](evidence/t13b-02-fix/20261107131001-99f226/desktop/B02-zero-price-full.png), [ảnh mobile](evidence/t13b-02-fix/20261107131001-99f226/mobile/B02-zero-price-full.png).

0đêm: desktop Tour `65ff1cce-0d14-4026-9a21-7f5dd8ec7a09`, mobile `d553878f-e8c1-41fd-a74f-b24e17064a63`; input=`"0"`, native validity=true; click Save đi PATCH200, durationDays1/durationNights0 giữ nguyên. [Desktop witness](evidence/t13b-02-fix/20261107131001-99f226/desktop/B03-zero-nights-input.json), [mobile](evidence/t13b-02-fix/20261107131001-99f226/mobile/B03-zero-nights-input.json), [ảnh mobile](evidence/t13b-02-fix/20261107131001-99f226/mobile/B03-zero-nights-full.png). Các request/DB cuối có trong results và `B03-db-final.json`; không bypass required bằng force hoặc sửa DB.

### Ticket datetime

Browser cấu hình Asia/Ho_Chi_Minh, Intl trả alias **Asia/Saigon**; backend process **Asia/Ho_Chi_Minh**, giữ như T13-B-02. Không sửa config/TZ backend hoặc database. Desktop Ticket `c95e09d6-2cc3-499b-85e3-1f2a5ddde1d8`, mobile `8b423597-3cd0-4d77-95e3-f4041d553b26`.

| Witness ở cả hai viewport | Input local | API/DB instant đúng |
|---|---|---|
| Mở/reload departure | `2030-06-15T10:30` | Trước/sau no-op cùng `2030-06-15T03:30:00.000Z`, delta0 |
| Mở/reload arrival | `2030-06-15T12:30` | Trước/sau no-op cùng `2030-06-15T05:30:00.000Z` |
| Sub-minute prerequisite qua API fixture rồi UI no-op |10:30 /12:30| Giữ nguyên departure `03:30:47.123Z`, arrival `05:30:12.456Z` ngày15/06/2030 |
| Người dùng chỉnh departure qua UI | `2030-06-16T00:15` | `2030-06-15T17:15:00.000Z` |
| Người dùng chỉnh arrival qua UI | `2030-06-16T02:45` | `2030-06-15T19:45:00.000Z` |
| Reload/save lại; xóa arrival optional | Đúng local đã sửa; sau xóa rỗng | Instant đã sửa không trôi; arrival null, departure giữ nguyên |

[No-op desktop API/input/DB](evidence/t13b-02-fix/20261107131001-99f226/desktop/B04-timestamp-before-after.json), [mobile](evidence/t13b-02-fix/20261107131001-99f226/mobile/B04-timestamp-before-after.json); [precision/edit/clear desktop](evidence/t13b-02-fix/20261107131001-99f226/desktop/B04-fix-edit-precision.json), [mobile](evidence/t13b-02-fix/20261107131001-99f226/mobile/B04-fix-edit-precision.json); [ảnh chỉnh giờ mobile](evidence/t13b-02-fix/20261107131001-99f226/mobile/B04-fix-ticket-edited-local-full.png). UI PATCH request có ISO Z trong traffic results; backend parse instant rõ ràng. Mọi Ticket bị cập nhật là fixture của run.

Đã xem ảnh thật Tour0đêm/Ticket và đối chiếu dữ liệu. Full có72 ảnh desktop/68 mobile gồm viewport/full-page;36/34 layout checkpoints đều không tràn ngang. Click/fill/select/confirm thật, không force. Mobile là giả lập, không claim thiết bị thật/DST hoặc timezone khác. B04 unit có midnight boundary, không mở rộng sản phẩm sang policy timezone mới.

## 6. Build và unit/regression liên quan

Focused đạt và full đều chạy các check dưới trên cùng source, exit0. Các unit/stub kiểm invariant không thay bằng chứng browser→API→DB ở trên.

| Check | Kết quả / evidence full |
|---|---|
| Backend `npm.cmd run build` | [PASS TypeScript](evidence/t13b-02-fix/20261107131001-99f226/backend-build.json) |
| Frontend `npm.cmd run build` | [PASS TypeScript/Vite](evidence/t13b-02-fix/20261107131001-99f226/frontend-build.json) |
| Alias regression mới | [PASS](evidence/t13b-02-fix/20261107131001-99f226/alias-unit.json): missing permission/foreign deny trước query; authorized own query đúng Business. Stub model, không DB write. |
| RBAC unit hiện có | [PASS](evidence/t13b-02-fix/20261107131001-99f226/rbac-unit.json): auth/role/ownership/public filters/Booking state và các invariant cũ; không seed-based integration. |
| Form value/datetime unit mới | [PASS](evidence/t13b-02-fix/20261107131001-99f226/form-unit.json):0 khác null/undefined/empty; ISO↔local; no-op precision; deliberate edit; midnight; optional clear. |

`.cjs` syntax checks đạt. Không chạy suite seed-based cũ, T13-A hoặc7 CORE T13-B-01 lại, không chạy28 CORE/8 OPTIONAL. Full8 là regression nghiệp vụ của phạm vi được giao.

## 7. Source integrity và bảo toàn evidence

[Integrity full](evidence/t13b-02-fix/20261107131001-99f226/source-integrity.json): baseline2.405 file, **chỉ hai file có sẵn thay đổi** đúng allowlist (`partnerService.ts`, `PartnerResourceFormPage.tsx`); **2.403 file còn lại nguyên SHA-256**, không mất file. Helper/utils, tests và runner FIX là file mới.

Giữ nguyên436 file evidence T13-B-02,566 T13-B-01,293 T13-B-01-FIX,264 T13-A,227 T13-A-FIX trong baseline, mọi báo cáo, old FAIL/trace/ảnh và LATEST cũ. Không đổi old results thành PASS. Trạng thái mới nằm trong report/matrix FIX riêng.

**239 application/package/migration hashes** giống nhau giữa focused đạt và full, và không đổi trong từng run. [Trước full](evidence/t13b-02-fix/20261107131001-99f226/application-hashes-before.json), [sau full](evidence/t13b-02-fix/20261107131001-99f226/application-hashes-after.json), [harness lock](evidence/t13b-02-fix/20261107131001-99f226/harness-hashes-before.json). Scope/expected PREP không đổi; full chỉ được mở sau gate focused cùng hashes.

| File ứng dụng cuối | SHA-256 |
|---|---|
| `backend/src/services/partnerService.ts` | `67eacf643df0db54fa7e4dff66b9c5f358ed6ef9b350b6c99de80c02fd8094b8` |
| `frontend/src/pages/partner/PartnerResourceFormPage.tsx` | `f265833f50f79c532b6c86887246ccc36e458c669476e183124543e806faa7ab` |
| `frontend/src/utils/partnerFormValues.ts` | `a1b8ca3c543477b91edd6103804c43db4ad8197def3962b7e9441f298a3fd545` |

## 8. Preflight, cleanup và fingerprint

Mỗi run khóa manifest, build/unit rồi exact guard: NODE_ENV=test, DB_HOST=127.0.0.1, DB_NAME=TEST_DATABASE_NAME=**travelgo_ai_m0_test**, DB_SSL=false, ALLOW_TEST_DB_WRITES=true. Kiểm actual DB identity/sentinel có sẵn, **12 migration checksum** và FK/index thực trước fixture; fingerprint-before mới. Browser xác minh wrapper run identity qua proxy loopback. Không sửa marker/schema; không reset/seed/truncate/migrate/xóa volume.

[Focused preflight](evidence/t13b-02-fix/20261107130839-17f3ab/preflight.json), [full preflight](evidence/t13b-02-fix/20261107131001-99f226/preflight.json), [postflight không đổi](evidence/t13b-02-fix/20261107131001-99f226/postflight-schema.json).

Tái sử dụng guard, ledger write-ahead exact emails/UUIDs, owner/Business discovery và cleanup FK đã duyệt. Không dùng seed/demo account, không sửa tài nguyên nền. Bookings PENDING/unpaid và Review retention fixture chỉ là prerequisite R03/A05/B03/B06; không tính PASS B07/B08/Review. Cleanup worker và parent recovery theo IDs, guard lại; không DELETE theo prefix/environment toàn bảng. Review trước Booking RESTRICT, lịch sử/audit và recommendation children trước parent, resources trước Business/User.

| Run / viewport | User | Business | Place/Tour/Ticket/Blog | Booking | Review | Cleanup |
|---|---:|---:|---|---:|---:|---|
| Focused đạt desktop |19|8|7/5/3/3|2|0|PASS|
| Focused đạt mobile |12|6|3/2/1/0|1|0|PASS|
| Full desktop |36|17|16/10/7/9|9|1|PASS|
| Full mobile |25|13|8/5/3/4|6|1|PASS|

[Focused cleanup](evidence/t13b-02-fix/20261107130839-17f3ab/cleanup-final.json), [full cleanup](evidence/t13b-02-fix/20261107131001-99f226/cleanup-final.json), [desktop ledger](evidence/t13b-02-fix/20261107131001-99f226/desktop/ledger.json), [mobile ledger](evidence/t13b-02-fix/20261107131001-99f226/mobile/ledger.json). Hậu kiểm read-only exact cleanup IDs trên21 bảng ledger ở **cả3 lượt**, cả desktop/mobile: residual đều0, emails không còn User. Không coi số fixture là số test.

**Fingerprint25/25 bảng trùng, changed=[]**, compare exit0 ở focused/full và cả lượt harness timing FAIL. [Focused compare](evidence/t13b-02-fix/20261107130839-17f3ab/fingerprint-compare.json), [full before](evidence/t13b-02-fix/20261107131001-99f226/fingerprint-before.json), [after](evidence/t13b-02-fix/20261107131001-99f226/fingerprint-after.json), [compare](evidence/t13b-02-fix/20261107131001-99f226/fingerprint-compare.json). Cả6 snapshots bằng nhau. Helper T11 dùng REPEATABLE READ READ ONLY, count và SHA-256 của MD5 JSON row đã sort; không chỉ so count, không chứng minh sequence/cache/trạng thái ngoài DB.

Lệnh đã chạy từ backend: `node scripts/t13b02-fix-run.cjs focused`, sau PASS mới `node scripts/t13b02-fix-run.cjs full`, rồi `node scripts/t13b02-fix-audit.cjs 20261107131001-99f226`. Không push/deploy.

## 9. Lỗi còn mở và đánh giá đóng nhóm

T13B02-01/02/03/04 **đã sửa và xác minh focused/full**. Có thể đóng T13-B-02 theo8 CORE đã giao sau khi chủ dự án duyệt; không có regression FAIL trong full. Không tuyên bố toàn bộ T13-B đã hoàn tất.

- **Map P2 OPEN** (`Invalid LatLng object: (NaN, NaN)`): không điều tra/sửa. Full không ghi pageerror không có nghĩa Map đã được nghiệm thu.
- **Nhãn “nháp” Ticket P2 OPEN**: giữ nguyên câu UI dù Ticket ACTIVE, đúng giới hạn task.
- Các GAP/policy PREP chưa đóng vẫn giữ; không thêm NEEDS_MORE_INFO editor, role editor, UI placeholder hoặc đổi policy submit/Blog update.
- **28 CORE NOT RUN:** R06; A01/A06; B07/B08; V01–V08; F01–F07; C01–C08. **O01–O08 NOT RUN**. Không tự triển khai task tiếp theo.

## 10. NEXT TASK PLAN — đề xuất, chờ duyệt

Mỗi task sau cần khóa manifest/expected PREP, preflight riêng, fixture ledger và fingerprint mới; không tái dùng IDs đã cleanup. Nếu upstream FAIL thì lưu evidence, chỉ tiếp tục nhánh độc lập được duyệt, không tự sửa ứng dụng.

| Thứ tự / task đề xuất | Phạm vi CORE | Dependency trước khi thực hiện | Đầu ra / điểm dừng |
|---|---|---|---|
| **T13-B-03 — Booking lifecycle và Admin API/metrics** | **B07, B08, A01, A06** | Duyệt FIX hiện tại; chốt GAP-07 fixture COMPLETED/unpaid synthetic và GAP-05 nghĩa metrics. Dùng Business/resource riêng; giữ GAP-09 direct Booking URL nhiều Business. Admin list chưa có UI tiếp tục API-only theo GAP-01. | Báo cáo4 CORE, history/audit/inventory, denial/repeat và cleanup. Không tự sửa nếu direct URL hoặc lifecycle FAIL. |
| T13-B-04 — Review | V01–V08 | B07/B08 xác minh các prerequisites lifecycle cần dùng; fixture COMPLETED đúng owner/Place được tạo mới trong run. Review moderation/update API-only theo PREP, Customer UI quan sát. | Báo cáo8 CORE, verified/unverified/aggregate/privacy, FK-safe cleanup. |
| T13-B-05 — Favorite | F01–F07 | Resource APPROVED/ownership đã đạt; fixture consent/event attribution riêng, khóa cách delay/account-switch theo GAP-06. Không bắt buộc chờ Review nếu được duyệt chạy độc lập. | Báo cáo7 CORE, server persistence/race/account isolation và cleanup. |
| T13-B-06 — Consent và session isolation | C01–C08, R06 | Có contract/fixture functional Booking/Review/Favorite để kiểm bảo toàn khi privacy delete; quyết định GAP-06 và lỗi upstream liên quan. Không lấy live fixture từ run trước. | Báo cáo9 CORE, consent/error/account-switch/retention metadata; không export/train/purge toàn cục. |

4+8+7+9=**28 CORE còn lại**. Map và nhãn Ticket nếu muốn xử lý cần task riêng được duyệt, không ghép vào các nhóm trên; OPTIONAL vẫn ngoài kế hoạch thực thi mặc định.

**Đề xuất bước kế tiếp: duyệt kết quả FIX, rồi duyệt T13-B-03 với các dependency nêu trên. Dừng tại đây và chờ duyệt trước khi thực hiện.**
