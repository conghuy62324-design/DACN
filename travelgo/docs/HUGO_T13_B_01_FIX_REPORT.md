# T13-B-01-FIX — Kết quả từ chối hồ sơ Partner

Hoàn tất **07/11/2026**, Asia/Saigon (UTC+7). Chỉ sửa **T13B01-01**. Focused A04 **2/2 PASS**; full regression **7/7 CORE PASS**, tương ứng **13/13 instance thực thi PASS** trên source ứng dụng cuối. **36 CORE và 8 OPTIONAL còn lại NOT RUN**. Không cộng focused và full thành case độc lập.

**Đủ điều kiện đề xuất đóng T13B01-01 và phạm vi 7 CORE T13-B-01, chờ chủ dự án duyệt kết quả.** Map P2 vẫn OPEN; chưa nghiệm thu toàn bộ T13-B. Đã dừng, không push/deploy hoặc chạy nhóm tiếp.

[Verification summary](evidence/t13b-01-fix/20261107030355-79d231/verification_summary.json), [matrix JSON](evidence/t13b-01-fix/20261107030355-79d231/acceptance_matrix.json), [CSV](evidence/t13b-01-fix/20261107030355-79d231/acceptance_matrix.csv).

## 1. Baseline và root cause

Đã đọc [báo cáo T13-B-01](HUGO_T13_B_01_RBAC_ONBOARDING_REPORT.md), [PREP được duyệt](HUGO_T13_B_SCOPE_AND_MATRIX.md), BecomePartnerPage, PlatformService, PartnerApplication controller/service/model, guard/ledger và test hiện tại. Giữ nguyên acceptance A04 đã khóa, 43 CORE/8 OPTIONAL/9 GAP; không sửa các báo cáo lịch sử hoặc expected để đổi FAIL thành PASS.

HEAD **`052531dfc77c4f289757794c0ee08b4d46e6af2e`**; dùng working tree hiện tại, không reset/stash. [Git status đầu phiên](evidence/t13b-01-fix/baseline/git-status.txt), [hash 1.662 file trước sửa](evidence/t13b-01-fix/baseline/working-tree-sha256.json), [source ứng dụng trước sửa](evidence/t13b-01-fix/baseline/source/frontend/src/pages/BecomePartnerPage.tsx).

Root cause tại `BecomePartnerPage.tsx`: `applications.find(...)` chỉ chọn PENDING/NEEDS_MORE_INFO/APPROVED. JSX dùng cùng biến đó để chọn **thẻ trạng thái hoặc form**. REJECTED bị bỏ qua dù API/DB trả đúng. Nếu lịch sử có APPROVED cũ và REJECTED mới, việc tìm bất kỳ hồ sơ có trạng thái active còn có thể chọn hồ sơ cũ, làm sai kết quả hiển thị và ẩn form nộp lại.

Không chỉ thêm REJECTED vào danh sách active: cách đó sẽ giấu form vốn phải tiếp tục dùng sau khi bị từ chối.

## 2. Thay đổi và hành vi trước/sau

**File ứng dụng duy nhất sửa:** [BecomePartnerPage.tsx](../frontend/src/pages/BecomePartnerPage.tsx).

- Chọn hồ sơ mới nhất theo **`createdAt`**, khớp contract GET `/api/partner-applications/me` hiện sắp DESC. Sort trên bản sao, không sửa mảng response; nếu thời điểm bằng nhau giữ thứ tự API, không bịa thêm trình tự hoặc dùng thời điểm review của hồ sơ cũ thay thời điểm nộp.
- Tách `displayed` để hiển thị kết quả và `active` để quyết định có ẩn form. REJECTED có thẻ riêng, badge **REJECTED**, lý do từ API và hướng dẫn dùng form bên dưới. Lý do là text React, giữ xuống dòng và wrap từ dài trong mobile.
- Form/submit handler dùng nguyên service và POST hiện có. Không POST khi mount/reload. Khi gửi lại thành công, hồ sơ PENDING mới trở thành thẻ hiện hành; feedback cũ không còn hiển thị như trạng thái hiện tại.
- PENDING, NEEDS_MORE_INFO và APPROVED mới nhất vẫn dùng thẻ trạng thái, phản hồi và cách chặn form hiện có. Không thêm bổ sung hồ sơ NEEDS_MORE_INFO, role editor, API hoặc thay policy approval/grant/Business/audit.

| Trạng thái / dữ liệu | Trước | Sau đã kiểm |
|---|---|---|
| Chỉ có REJECTED | Form mới, không thấy kết quả/lý do | Thẻ REJECTED + reason đã lưu, cùng form nộp mới. |
| REJECTED sau reload/direct URL/login lại | Không có thẻ quyết định | Cùng application ID/status/reason; không tự tạo application. |
| APPROVED cũ + REJECTED mới | Có thể chọn APPROVED cũ | Chỉ thẻ REJECTED mới nhất; form vẫn thao tác được. |
| Nộp lại sau REJECTED | Form đã có nhưng thiếu phản hồi hồ sơ trước | UI POST201 tạo một PENDING ID mới, giữ các row lịch sử; reload/login lại vẫn chọn ID mới. |
| PENDING / NEEDS_MORE_INFO / APPROVED | Thẻ trạng thái và phản hồi | Giữ hành vi, không mở control bổ sung chưa triển khai. |
| Account A → B | Backend đã scope owner | UI B/GET chỉ có hồ sơ B; tên, ID và feedback của A không xuất hiện. |

## 3. Harness và manifest

Evidence mới chỉ nằm trong **`docs/evidence/t13b-01-fix/`**. Không chạy runner cũ để ghi vào `t13b-01`, không đổi `LATEST.txt`, findings hoặc kết quả FAIL cũ.

| File harness | Thay đổi có mục tiêu |
|---|---|
| `frontend/e2e/t13b01-rbac-onboarding.spec.ts` | Giữ nguyên toàn bộ helpers, bảy test và các assertion nghiệp vụ gốc. Chỉ nối ba checkpoint FIX bên trong A04 khi `T13B01_FIX=true`: persistence/view-only, account isolation, history/reapply. Không tạo case CORE mới. |
| `backend/scripts/t13b01-fix-run.cjs` — mới | Tái sử dụng guard/server/config gốc; evidence root riêng, chỉ cho hai mode focused/full. Khóa manifest trước build/preflight/write, whitelist đúng hai file có sẵn được phép đổi, kiểm hash trong run. Full bị chặn nếu focused chưa PASS hoặc source ứng dụng khác. |
| `backend/scripts/t13b01-fix-audit.cjs` — mới | Hậu kiểm read-only: residual ID ở cả focused/full, postflight schema, bảo toàn file/evidence cũ, fingerprint, source parity và matrix43+8. |

`t13b01-support.cjs`, `t13b01-server.cjs`, `playwright.t13b01.config.ts`, runner/audit cũ giữ nguyên bytes. Không đổi assertion REJECTED từ FAIL cũ thành một expected dễ hơn; A04 gốc hiện PASS nhờ UI được sửa.

Manifest focused [run `20261107030247-1a0b0b`](evidence/t13b-01-fix/20261107030247-1a0b0b/case-manifest.json), [lock](evidence/t13b-01-fix/20261107030247-1a0b0b/manifest-lock.json); full [run `20261107030355-79d231`](evidence/t13b-01-fix/20261107030355-79d231/case-manifest.json), [lock](evidence/t13b-01-fix/20261107030355-79d231/manifest-lock.json). Giữ nguyên dòng acceptance PREP và ghi rõ phần FIX bổ sung theo yêu cầu task.

Fixture history dùng API thật để tạo APPROVED cũ → application mới → REJECTED mới. API hiện cho nộp tiếp sau APPROVED, đã được ghi tại GAP-02; đây là **setup lịch sử**, không tuyên bố hoặc triển khai UI nộp hồ sơ mới khi hồ sơ hiện hành APPROVED. UI nộp lại được kiểm sau REJECTED. Không chỉnh timestamps/status trực tiếp trong DB để làm test PASS.

## 4. Focused A04 desktop/mobile

Lượt đạt: **`20261107030247-1a0b0b`**, **2/2 PASS**, khoảng41 giây, browser/runner exit0. Desktop **1440×900**; mobile giả lập **390×844**, touch/isMobile, Edge Chromium headless. Browser version thực ghi trong results; không coi là thiết bị thật.

[Playwright focused](evidence/t13b-01-fix/20261107030247-1a0b0b/playwright.json), [command/log](evidence/t13b-01-fix/20261107030247-1a0b0b/browser.json), [desktop results](evidence/t13b-01-fix/20261107030247-1a0b0b/desktop/A04-results.json), [mobile results](evidence/t13b-01-fix/20261107030247-1a0b0b/mobile/A04-results.json).

| Expected / witness | Desktop | Mobile |
|---|---|---|
| REJECTED, đúng reason sau reload/direct URL và logout/login bằng UI | PASS | PASS |
| Form nộp lại thực sự đi POST201, một PENDING mới, old feedback không ghi đè | PASS | PASS |
| PENDING, NEEDS_MORE_INFO có phản hồi, APPROVED; negative reason/status/terminal decisions theo A04 gốc | PASS | PASS; API negative probes dùng kênh A1 desktop như manifest |
| A không xuất hiện ở B; API owner và card ID trùng DB | PASS | PASS |
| View/reload không đổi application/Business/role/audit; không tăng application POST count | PASS | PASS |
| History APPROVED cũ/REJECTED mới/PENDING nộp lại: chọn đúng record, row lịch sử và membership/role giữ nguyên | PASS | PASS |
| Lý do có chuỗi dài không dấu cách, các control thao tác thật, không document overflow | PASS | PASS |

Lượt đầu **`20261107030137-95dc7d`** build/preflight PASS nhưng bộ lọc `^A04` không khớp full test title của Playwright: **No tests found**, browser NOT RUN, không tạo fixture. Chỉ sửa bộ lọc runner thành `A04 rejection`; giữ nguyên source ứng dụng và expected. [Summary lượt chưa chạy](evidence/t13b-01-fix/20261107030137-95dc7d/run-summary.json). Không ghi lỗi harness này thành lỗi ứng dụng hoặc cộng nó vào số case đạt.

## 5. Full regression trên source cuối

Sau focused PASS mới chạy full **`20261107030355-79d231`**. **7/7 CORE PASS**; **13 instance thực thi PASS / 0 FAIL**, một R04 mobile excluded vì A1 chỉ chạy một lần. Playwright liệt kê14 entries, **13 passed +1 skipped**; không gọi thành14 browser case PASS. Không cộng focused2 vào full13.

[Playwright full](evidence/t13b-01-fix/20261107030355-79d231/playwright.json), [command/log](evidence/t13b-01-fix/20261107030355-79d231/browser.json), [run-summary](evidence/t13b-01-fix/20261107030355-79d231/run-summary.json), [focused prerequisite](evidence/t13b-01-fix/20261107030355-79d231/focused-prerequisite.json).

| CORE | Desktop | Mobile giả lập |
|---|---|---|
| R01 | [PASS](evidence/t13b-01-fix/20261107030355-79d231/desktop/R01-results.json) | [PASS](evidence/t13b-01-fix/20261107030355-79d231/mobile/R01-results.json) |
| R02 | [PASS](evidence/t13b-01-fix/20261107030355-79d231/desktop/R02-results.json) | [PASS](evidence/t13b-01-fix/20261107030355-79d231/mobile/R02-results.json) |
| R04 | [PASS A1](evidence/t13b-01-fix/20261107030355-79d231/desktop/R04-results.json) | Không nhân đôi A1 |
| R05 | [PASS](evidence/t13b-01-fix/20261107030355-79d231/desktop/R05-results.json) | [PASS](evidence/t13b-01-fix/20261107030355-79d231/mobile/R05-results.json) |
| A02 | [PASS](evidence/t13b-01-fix/20261107030355-79d231/desktop/A02-results.json) | [PASS](evidence/t13b-01-fix/20261107030355-79d231/mobile/A02-results.json) |
| A03 | [PASS](evidence/t13b-01-fix/20261107030355-79d231/desktop/A03-results.json) | [PASS](evidence/t13b-01-fix/20261107030355-79d231/mobile/A03-results.json) |
| A04, gồm FIX checkpoints | [PASS](evidence/t13b-01-fix/20261107030355-79d231/desktop/A04-results.json) | [PASS](evidence/t13b-01-fix/20261107030355-79d231/mobile/A04-results.json) |

R01/R02/R04/R05/A02/A03 giữ assertion cũ về role, deny/escalation, token cũ/mới, validation, approval atomicity, retry và concurrent PATCH. Không nhận các probe R02 trên Review/Favorite/Consent là đã chạy các nhóm nghiệp vụ đó.

## 6. Bằng chứng UI → API → PostgreSQL

Không mock/replay response nội bộ. Browser fetch/UI đi qua Vite proxy tới backend thật và DB test. Response status/body đã che credential, principal/endpoint, checkpoint expected/actual và console có trong từng results JSON. DB final snapshot chứa fixture applications, Business/membership, roles và audit; không dump user nền.

| Trạng thái quan trọng — lượt full | Desktop | Mobile |
|---|---|---|
| REJECTED sau logout/login, form vẫn có | [ảnh](evidence/t13b-01-fix/20261107030355-79d231/desktop/A04-fix-rejected-relogin.png) | [ảnh](evidence/t13b-01-fix/20261107030355-79d231/mobile/A04-fix-rejected-relogin.png) |
| REJECTED mới thắng APPROVED cũ; reason dài | [ảnh](evidence/t13b-01-fix/20261107030355-79d231/desktop/A04-fix-newest-rejected-history.png) | [ảnh](evidence/t13b-01-fix/20261107030355-79d231/mobile/A04-fix-newest-rejected-history.png) |
| PENDING mới sau UI nộp lại và reload/login | [ảnh](evidence/t13b-01-fix/20261107030355-79d231/desktop/A04-fix-reapplied-pending.png) | [ảnh](evidence/t13b-01-fix/20261107030355-79d231/mobile/A04-fix-reapplied-pending.png) |
| Account B, không hồ sơ/feedback A | [ảnh](evidence/t13b-01-fix/20261107030355-79d231/desktop/A04-fix-account-b.png) | [ảnh](evidence/t13b-01-fix/20261107030355-79d231/mobile/A04-fix-account-b.png) |
| DB trước/sau xem/reload, không mutation | [snapshot](evidence/t13b-01-fix/20261107030355-79d231/desktop/A04-view-only-before-after.json) | [snapshot](evidence/t13b-01-fix/20261107030355-79d231/mobile/A04-view-only-before-after.json) |
| DB cuối case và response/history ở results | [DB](evidence/t13b-01-fix/20261107030355-79d231/desktop/A04-db-final.json) | [DB](evidence/t13b-01-fix/20261107030355-79d231/mobile/A04-db-final.json) |

Witness full: desktop history APPROVED `8b926c6c-ad5a-46df-bc84-4bce1eb261f1` → REJECTED `bcc171f0-07d0-42c0-8389-9d7184dd8951` → UI PENDING `7150ac0f-0b33-4c25-a4d4-75962de05c4c`; mobile APPROVED `72ce8741-a9bb-4c88-9f8f-acdf3caf13dc` → REJECTED `82789d42-4bff-471b-b884-88bdaa14e296` → PENDING `8d866cf3-aea2-4e5d-9012-73857702e758`. GET thật trả3 history rows; card `data-application-id` đúng ID mới nhất. Hai row cũ giữ nguyên, không thêm Business/member/grant/audit khi chỉ nộp mới PENDING hoặc xem lại.

Đã xem ảnh mobile reason dài và ảnh trạng thái, không chỉ dựa tên file. Focused có13 checkpoint layout mỗi viewport; full có34 desktop/33 mobile, tất cả `scrollWidth <= innerWidth+1`. Click/fill/submit/logout là thao tác thật, không force. Có ảnh viewport và full-page cho các trạng thái quan trọng; số lần capture không được tính thành case hoặc ảnh độc lập khi helper dùng lại cùng label. Không tuyên bố pixel-perfect hoặc kiểm thiết bị thật.

## 7. Preflight, cleanup và bảo vệ dữ liệu

- Exact `NODE_ENV=test`, `DB_HOST=127.0.0.1`, `DB_NAME=TEST_DATABASE_NAME=travelgo_ai_m0_test`, `DB_SSL=false`, `ALLOW_TEST_DB_WRITES=true`; guard/sentinel có sẵn, kiểm `current_database()`/user/host thật. Chỉ khởi động server test loopback **3315/5315**, không reuse server demo; browser kiểm identity run trước fixture.
- **12/12 migration checksum khớp**, unique/FK metadata đọc thật trước write. Không migrate/sync/seed/reset/truncate, đổi sentinel/schema hoặc xóa volume. [Focused preflight](evidence/t13b-01-fix/20261107030247-1a0b0b/preflight.json), [full preflight](evidence/t13b-01-fix/20261107030355-79d231/preflight.json), [postflight](evidence/t13b-01-fix/20261107030355-79d231/postflight-schema.json).
- Fixture canonical email/UUID riêng theo run/project, ledger trước request; SA-only guarded setup trên chính UUID fixture như nguyên tắc đã duyệt. Onboarding/history/Business/roles/audit đi API/UI thật. Không dùng seed/demo account để sửa/xóa dữ liệu. Không tạo catalog/Booking/Review/Favorite/Trip fixture mới.
- Worker afterAll và parent recovery dùng exact IDs, guard kiểm lại trước cleanup; không xóa theo prefix/environment toàn bảng. Cleanup giữ thứ tự FK đã duyệt và fail-closed nếu có dependency ngoài fixture.

| Run / viewport | User | Application | Business | Cleanup |
|---|---:|---:|---:|---|
| Focused desktop |4|5|2|PASS|
| Focused mobile |4|5|2|PASS|
| Full desktop |19|12|7|PASS|
| Full mobile |17|10|6|PASS|

Số lượng gồm prerequisite/setup, không phải số test case. [Focused cleanup](evidence/t13b-01-fix/20261107030247-1a0b0b/cleanup-final.json), [full cleanup](evidence/t13b-01-fix/20261107030355-79d231/cleanup-final.json), [full desktop ledger](evidence/t13b-01-fix/20261107030355-79d231/desktop/ledger.json), [mobile ledger](evidence/t13b-01-fix/20261107030355-79d231/mobile/ledger.json).

Hậu kiểm read-only theo **từng cleanup ID của12 bảng** ở cả focused/full: residual đều **0**, gồm User/role/member/application/Business/audit và consent/event/recommendation children. Email preallocated full không còn user tương ứng. Xem [verification summary](evidence/t13b-01-fix/20261107030355-79d231/verification_summary.json).

**Fingerprint 25/25 bảng trùng, `changed: []`, compare exit0** ở focused và full. Cả6 snapshot trước/sau của ba lượt FIX (gồm lượt No tests found) cùng nội dung. [Focused compare](evidence/t13b-01-fix/20261107030247-1a0b0b/fingerprint-compare.json), [full before](evidence/t13b-01-fix/20261107030355-79d231/fingerprint-before.json), [full after](evidence/t13b-01-fix/20261107030355-79d231/fingerprint-after.json), [full compare](evidence/t13b-01-fix/20261107030355-79d231/fingerprint-compare.json).

Fingerprint dùng helper T11, transaction REPEATABLE READ READ ONLY, count và SHA-256 của chuỗi MD5 JSON toàn row đã sort, mọi bảng public. Không thay snapshot before sau cleanup. Không coi đây là đo sequence state, pg_stat/cache hoặc tác động ngoài DB.

## 8. Source hashes, build và bảo toàn evidence

**1.662 file baseline: chỉ hai file có sẵn thay đổi đúng phạm vi** — BecomePartnerPage và spec nối kiểm FIX; **1.660 file còn lại giữ nguyên SHA-256**, không mất file. Bao gồm **566 file evidence T13-B-01, 264 T13-A và227 T13-A-FIX**, mọi báo cáo/findings/FAIL/trace/ảnh và pointer cũ đều nguyên hash. [Integrity full](evidence/t13b-01-fix/20261107030355-79d231/source-integrity.json), [baseline hashes](evidence/t13b-01-fix/baseline/working-tree-sha256.json).

Snapshot T13-A-FIX cuối có287 entries: chỉ BecomePartnerPage đổi có chủ đích, 286 entries còn lại giữ nguyên. Trong238 file ứng dụng/package/migration được chụp ở FIX, **focused và full khớp toàn bộ**, trước/sau từng run cũng khớp. Năm file harness thực thi cũng khớp giữa focused/full. [Application hashes trước full](evidence/t13b-01-fix/20261107030355-79d231/application-hashes-before.json), [sau full](evidence/t13b-01-fix/20261107030355-79d231/application-hashes-after.json), [harness hashes](evidence/t13b-01-fix/20261107030355-79d231/harness-hashes-before.json).

| File | SHA-256 cuối |
|---|---|
| `frontend/src/pages/BecomePartnerPage.tsx` | `724791864679efa0fe27563cdc32ea8113c4800b6402dcfdf2e4bf8fa5b2389a` |
| `frontend/e2e/t13b01-rbac-onboarding.spec.ts` | `edf6949f2ffad0afc189d9e21ab44d35cd714193cfbb0aa9de1280e4d4081508` |
| `backend/scripts/t13b01-fix-run.cjs` | `f63a6a76470809d43b9979c894653bdc54003132f8c4d1500c942d8f2103a1d3` |
| `backend/scripts/t13b01-fix-audit.cjs` | `7f3d6dc51aa0c4d284ea106f71e66e5a4c54aa8a56762cf99859bd11d276385b` |

BecomePartnerPage trước sửa có hash `4092e9189033d71110afd96dcd92565c9a64af8cb158f24f505e5f5f103bc8d6`. Bản source gốc/spec gốc được chép trong baseline, giữ lịch sử FAIL cũ, không cập nhật chúng thành PASS. So bản spec trước/sau xác nhận toàn bộ phần test gốc vẫn giữ nguyên; chỉ thêm đoạn FIX trong A04.

Backend/frontend builds focused và full đều PASS: [backend full](evidence/t13b-01-fix/20261107030355-79d231/backend-build.json), [frontend full](evidence/t13b-01-fix/20261107030355-79d231/frontend-build.json). `.cjs` syntax checks và diff whitespace của app file đạt; cảnh báo LF/CRLF của Git không phải lỗi runtime. Không chạy lại T13-A hoặc suite seed-based ngoài yêu cầu. Manifest, source/harness snapshots và logs mới nằm trong từng run, không ghi đè lượt cũ.

## 9. Lỗi còn mở và điều kiện đóng nhóm

| Vấn đề | Trạng thái sau FIX |
|---|---|
| T13B01-01 — REJECTED không hiển thị | **Đã sửa và xác minh**, A04 PASS cả focused/full desktop/mobile; đề xuất đóng sau duyệt. |
| T13B01-OBS-01 — Map `Invalid LatLng object: (NaN, NaN)` | **P2 OPEN**. Full R01 mobile vẫn ghi3 pageerror này; source Map không đổi, không điều tra hoặc sửa trong task. [R01 mobile console/results](evidence/t13b-01-fix/20261107030355-79d231/mobile/R01-results.json). |
| NEEDS_MORE_INFO chưa có vòng bổ sung hồ sơ; các GAP khác của PREP | Giữ giới hạn đã duyệt; không thêm chức năng hoặc gọi là đã đóng các GAP. |

Theo acceptance phạm vi bảy case, **có thể đóng T13-B-01 sau khi chủ dự án duyệt**: toàn bộ7 CORE PASS, dữ liệu bảo toàn, không có regression FAIL trong nhóm. Map observation vẫn tồn tại và không bị che bằng PASS role/layout. Không coi đây là nghiệm thu Map, toàn bộ RBAC hoặc toàn bộ T13-B.

**NOT RUN giữ nguyên:** R03, R06; A01, A05, A06; B01–B08; V01–V08; F01–F07; C01–C08 (**36 CORE**); O01–O08 (**8 OPTIONAL**). Các kiểm account A/B bổ sung ở A04 chỉ cho acceptance FIX, không nâng R06 race/account-switch thành PASS.

Lệnh đã chạy từ `travelgo/backend`:

```powershell
node scripts/t13b01-fix-run.cjs focused
node scripts/t13b01-fix-run.cjs full
node scripts/t13b01-fix-audit.cjs 20261107030355-79d231
```

Runner tạo evidence mới mỗi lượt; full yêu cầu focused PASS trên cùng source. Audit ghi mới bằng wx, không ghi đè. Không commit/push/deploy, thay AI/sentiment/ranking/pricing, schema, migration, demo data hoặc Map. **Dừng tại đây, chờ duyệt kết quả trước khi tiếp tục.**
