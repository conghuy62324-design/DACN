# T13-B-02-FIX ? B?n ch?t theo y?u c?u ba file

Ho?n t?t **07/11/2026, Asia/Saigon**. L??t b? sung theo t?p y?u c?u m?i ?? s?a ??ng **3 file ?ng d?ng**. Focused **B06+B04: 3/3 instance PASS**; sau ?? full **8/8 CORE PASS, 14/14 instance th?c thi PASS**. Build/regression li?n quan PASS; cleanup s?ch, fingerprint **25/25 b?ng tr?ng**, compare exit0.

L?y k? T13-B: **15 PASS / 0 FAIL / 28 CORE NOT RUN**, g?m7 PASS l?ch s? T13-B-01-FIX kh?ng ch?y l?i. **8 OPTIONAL NOT RUN**. Kh?ng c?ng focused/full ho?c c?c l?n FIX tr??c th?nh case m?i. ?? xu?t ??ng T13-B-02 sau duy?t, ch?a b?t ??u AI Agent hay task ti?p theo.

[Ma tr?n JSON](evidence/t13b-02-fix/20261107132504-39eb34/acceptance_matrix.json), [CSV](evidence/t13b-02-fix/20261107132504-39eb34/acceptance_matrix.csv), [verification summary](evidence/t13b-02-fix/20261107132504-39eb34/verification_summary.json).

## 1. Baseline th?c t? v? ph?m vi s?a

?? ??c [b?o c?o FAIL T13-B-02](HUGO_T13_B_02_BUSINESS_MODERATION_REPORT.md), [PREP](HUGO_T13_B_SCOPE_AND_MATRIX.md), evidence g?c run `20261107122016-34e7f2`, source hi?n h?nh, controller/router, TicketService v? harness g?c. PREP gi? nguy?n SHA-256 `2f26c201d218ffd956bedb20f7f71c81bd8396e0a9829eb6217f5043f7b91f23`,43 CORE/8 OPTIONAL/9 GAP.

Source ??u l??t **?? c? b?n FIX tr??c**: permission guard d?ng BUSINESS_ACCESS_DENIED; form ?? d?ng helper nullish/datetime v? g?i ISO. V? v?y kh?ng nh?n m? t? ?hi?n ch?a c? guard/ch?a s?a form? trong y?u c?u m?i l? tr?ng th?i source th?c. L??t n?y b? sung m? l?i ri?ng, ??a x? l? form v?o ??ng file ???c ch? ??nh, v? th?m parser backend theo contract m?i. [B?n b?o c?o FIX tr??c, nguy?n bytes](evidence/t13b-02-fix/baseline/revision-02/prior-fix-report.md) ???c l?u tr??c khi c?p nh?t b?o c?o n?y; c?c links trong b?n l?u t?nh t? th? m?c docs nh? b?n g?c.

Baseline hi?n t?i c? **2.918 file**: [hashes](evidence/t13b-02-fix/baseline/revision-02/working-tree-sha256.json), [Git status](evidence/t13b-02-fix/baseline/revision-02/git-status.txt), [HEAD](evidence/t13b-02-fix/baseline/revision-02/head.txt). HEAD `052531dfc77c4f289757794c0ee08b4d46e6af2e`, nh?ng working tree dirty m?i l? source ch?y. Kh?ng reset/stash/discard.

?? ch?p ??ng ba file **tr??c khi s?a** v?o [source-before.json](evidence/t13b-02-fix/baseline/source-before.json), v? sau s?a v?o [source-after.json](evidence/t13b-02-fix/baseline/source-after.json). Baseline/git-status c? v?n gi? nguy?n; snapshot m?i t?ch v?o revision-02 ?? kh?ng ghi ??.

## 2. Root cause, thay ??i v? h?nh vi tr??c/sau

| L?i | Root cause T13-B-02 | H?nh vi cu?i ?? ki?m |
|---|---|---|
| T13B02-01 / B06 / P1 | Alias ch? ki?m membership, kh?ng MANAGE_BOOKINGS; tr?200 v?i d? li?u Booking. | Thi?u permission tr?403 **MISSING_MANAGE_BOOKINGS**, kh?ng data Booking; ?? quy?n own200, foreign403; kh?ng mutation. |
| T13B02-04 / B04 / P1 | ISO UTC b? c?t th?nh datetime-local, g?i chu?i kh?ng offset r?i backend parse theo local, tr?i?7gi?. | UTC?local ??ng; no-op gi? nguy?n instant/precision; edit g?i ISO Z; backend parser c? quy t?c UTC cho chu?i ph?t kh?ng offset, ?p d?ng c?4 timestamp fields. |
| T13B02-02 / B02 / P2 | Falsy fallback bi?n gi?0 th?nh input r?ng. |0 hi?n th?0, valid, save/reload gi?0. Missing/null x? l? nullish ri?ng, kh?ng ??i pricing/catalog. |
| T13B02-03 / B03 / P2 | Falsy fallback bi?n0??m th?nh required field r?ng. |1ng?y/0??m hi?n th? ??ng; required h?p l?; UI save200 v? DB kh?ng ??i duration. |

**??ng ba file ?ng d?ng thay ??i trong l??t n?y:**

1. [partnerService.ts](../backend/src/services/partnerService.ts): `getBookings` l?y k?t qu? `getBusiness`, ki?m `.permissions.includes('MANAGE_BOOKINGS')`, thi?u quy?n throw403 v?i message `Y?u c?u quy?n MANAGE_BOOKINGS`, code `MISSING_MANAGE_BOOKINGS`. Gate tr??c query Booking. Kh?ng s?a getBusiness/getDashboard/getBusinesses ho?c policy endpoint m?i.
2. [PartnerResourceFormPage.tsx](../frontend/src/pages/partner/PartnerResourceFormPage.tsx): input/select d?ng tr?c ti?p `form[field.key] ?? ''`; businessId select v? textarea array gi? fallback c?. Inline UTC?local b?ng timezone offset r?i `.toISOString().slice(0,16)` nh? y?u c?u. Gi? original API data v? serialization ISO t? b?n FIX tr??c ?? no-op b?o to?n gi?y/millisecond v? edit local g?i instant r? r?ng.
3. [ticketService.ts](../backend/src/services/ticketService.ts): th?m `parseLocalDatetime`. Date instance gi? nguy?n; chu?i ??ng m?u `YYYY-MM-DDTHH:mm` th?m `:00.000Z`; d?ng kh?c parse b?ng Date nh? tr??c. D?ng cho departureTime, arrivalTime, validFrom, validUntil trong c? create/update. Kh?ng ??i timezone backend/database ho?c s?a d? li?u Ticket n?n.

[Diff ??ng ba file so baseline m?i](evidence/t13b-02-fix/source-final-v2/application-changes.diff). Helper `frontend/src/utils/partnerFormValues.ts` c?a l??t FIX tr??c **kh?ng s?a/x?a**, gi? working tree; app form hi?n kh?ng import n?. Kh?ng t?o th?m helper ?ng d?ng trong l??t n?y.

**?i?m ph?i h?p timezone:** ch? ??i backend coi chu?i kh?ng offset l? UTC trong khi g?i th?ng gi? local s? g?y l?ch gi?. Form hi?n g?i ISO c? Z khi user ch?nh gi?, v? g?i ISO g?c khi kh?ng ??i. Parser backend m?i ph?c v? request API d?ng ph?t kh?ng offset theo y?u c?u n?y; kh?ng di?n gi?i m?i chu?i kh?ng offset kh?c th?nh UTC. Kh?ng s?a validator ho?c auth/pricing contract kh?c.

## 3. Harness v? manifest kh?a tr??c write

C?c t?n `t13b02-fix-run.cjs`/spec/config/audit ?? t?n t?i c?ng evidence PASS c?a l??t tr??c. ?? gi? nguy?n ch?ng, t?o phi?n b?n **`t13b02-fix-v2-*`** ri?ng. Kh?ng ch?nh `t13b02-run.cjs`, `t13b02-support.cjs`, `t13b02-server.cjs`, spec g?c `t13b02-business-moderation.spec.ts` ho?c harness T13-B-01.

- Runner `backend/scripts/t13b02-fix-v2-run.cjs`: focused ch? B06 r?i B04; full8; kh?a manifest tr??c build/preflight/fixture. Build/unit fail kh?ng t?i DB fixture. Full b? ch?n n?u focused ch?a PASS ho?c app/harness hashes kh?c.
- Spec/config v2: gi?8 CORE v? expected PREP, kh?ng th?m case logic; th?a k? wait ??ng record sau reload c?a FIX tr??c. B06 b? sung exact error code theo y?u c?u m?i; B04 b? sung API create/update c?4 timestamp fields. C?c ki?m precision/edit/clear tr??c ??y gi? nguy?n.
- Guard/schema/identity/ledger/cleanup d?ng nguy?n support/server g?c. Kh?ng mock successful API response.
- Audit `backend/scripts/t13b02-fix-v2-audit.cjs` ch? ??c DB/file, xu?t artifact m?i. Unit service/form ri?ng kh?ng ghi DB.

Focused [manifest](evidence/t13b-02-fix/20261107132355-4a2ce7/case-manifest.json), [lock](evidence/t13b-02-fix/20261107132355-4a2ce7/manifest-lock.json); full [manifest](evidence/t13b-02-fix/20261107132504-39eb34/case-manifest.json), [lock](evidence/t13b-02-fix/20261107132504-39eb34/manifest-lock.json). Full hash `0aceaea703a6f55eadc52e6d296182a6963478c8b6f25537e08c33f9d1f86156`. [Gate c?ng source/harness](evidence/t13b-02-fix/20261107132504-39eb34/focused-prerequisite.json).

Gi? GAP-03 submit/Blog update characterization; kh?ng t? ?p th?m permission m?i. GAP-04 kh?ng m? policy Business suspended/public catalog. GAP-09 ch? zero/time c?a B02/B03/B04; kh?ng ch?y B07.

## 4. Focused B06+B04

Run **`20261107132355-4a2ce7`**: **3/3 instance PASS**,1 mobile B06 excluded v? A1. B06 ch?y tr??c B04. Browser/runner exit0; kh?ng c? focused FAIL trong phi?n y?u c?u m?i n?n m?i m? full. [Playwright](evidence/t13b-02-fix/20261107132355-4a2ce7/playwright.json), [summary](evidence/t13b-02-fix/20261107132355-4a2ce7/run-summary.json).

| Case | Desktop | Mobile |
|---|---|---|
| B06 | [PASS A1](evidence/t13b-02-fix/20261107132355-4a2ce7/desktop/B06-results.json):403 MISSING_MANAGE_BOOKINGS, allowed200, foreign403, no mutation | Kh?ng nh?n ??i A1 |
| B04 | [PASS](evidence/t13b-02-fix/20261107132355-4a2ce7/desktop/B04-results.json): instant delta0; ??ng local; precision/edit/clear;4 fields API | [PASS U2](evidence/t13b-02-fix/20261107132355-4a2ce7/mobile/B04-results.json): instant delta0 v? c?c thao t?c UI |

Kh?ng t?nh c?c run FIX tr??c v?o focused m?i; kh?ng ch?y B02/B03 trong focused m?i. Ch?ng ???c ch?y ? full theo y?u c?u.

## 5. Full regression8 CORE

Run **`20261107132504-39eb34`**: **8/8 CORE PASS**,14 runtime instances PASS,2 mobile A1 excluded. Kh?ng c?ng focused3 v?o full14. Desktop1440?900, mobile gi? l?p390?844, touch/isMobile, Edge Chromium headless. Browser?Vite proxy?API?PostgreSQL th?t, kh?ng d?ng seed/demo accounts.

[Playwright](evidence/t13b-02-fix/20261107132504-39eb34/playwright.json), [log/exit](evidence/t13b-02-fix/20261107132504-39eb34/browser.json), [summary](evidence/t13b-02-fix/20261107132504-39eb34/run-summary.json).

| CORE | Desktop | Mobile |
|---|---|---|
| R03 | [PASS A1](evidence/t13b-02-fix/20261107132504-39eb34/desktop/R03-results.json) | Kh?ng nh?n ??i A1 |
| A05 | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/desktop/A05-results.json) | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/mobile/A05-results.json) |
| B01 | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B01-results.json) | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B01-results.json) |
| B02 | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B02-results.json) | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B02-results.json) |
| B03 | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B03-results.json) | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B03-results.json) |
| B04 | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B04-results.json) | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B04-results.json) |
| B05 | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B05-results.json) | [PASS](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B05-results.json) |
| B06 | [PASS A1](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B06-results.json) | Kh?ng nh?n ??i A1 |

R03 gi? ownership hai chi?u/deny/no mutation; A05 gi? moderation/public visibility/audit/retention; B01 metrics/membership/empty ??ng SQL; B05 content/author/submit/archive v?n ??t. B02/B03/B04 ch?y CRUD/submit/archive theo contract g?c, kh?ng ch? b?n assertion l?i. B06 gi? validation/locked-state/new endpoint permissions. Kh?ng c? regression FAIL m?i.

## 6. B?ng ch?ng UI/API/DB

**B06:** request th?t `GET /api/partner/businesses/f57ed8d5-9d3d-4437-95fe-3eb3ec257658/bookings` c?a member ch? MANAGE_BUSINESS tr?403, body `success:false`, message `Y?u c?u quy?n MANAGE_BOOKINGS`, code `MISSING_MANAGE_BOOKINGS`, kh?ng c? Booking data. [Response/permission](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B06-alias-permission.json), [allowed MANAGE_BOOKINGS own200](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B06-fix-alias-positive.json), [DB cu?i case](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B06-db-final.json). permissions=[] c?ng403; foreign Business403; snapshots deny/read kh?ng mutation.

[?nh request/response403](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B06-recorded-api403.png) l? browser m? **b?n ghi JSON th?t ?? redact**, ch?p sau cleanup; [record](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B06-request-response-record.json) tr?ch t? traffic results, kh?ng t?o UI s?n ph?m gi? hay mock API. GET kh?ng c? request body. Kh?ng l?u token/password.

**B04:** browser timezone c?u h?nh Asia/Ho_Chi_Minh, Intl tr? alias Asia/Saigon; backend TZ v?n Asia/Ho_Chi_Minh. Kh?ng thay timezone ?? l?m test PASS.

| Check ? hai viewport | Input local / API input | API/DB expected = actual |
|---|---|---|
| No-op departure | Local15/06/2030 10:30 | Tr??c/sau `2030-06-15T03:30:00.000Z`, delta0ms |
| No-op arrival | Local15/06/2030 12:30 | Tr??c/sau `2030-06-15T05:30:00.000Z`, delta0ms |
| No-op sub-minute fixture | Local10:30 /12:30 | Gi? departure `03:30:47.123Z`, arrival `05:30:12.456Z` ng?y15/06/2030 |
| Ch? ??ng ch?nh gi? b?ng UI |16/06/2030 00:15 /02:45 | `2030-06-15T17:15:00.000Z` / `2030-06-15T19:45:00.000Z`; reload/save l?i kh?ng tr?i |
| X?a arrival optional | R?ng | DB null, departure gi? nguy?n |
| API minute kh?ng offset, desktop A1 |10:30/11:30/12:30/13:30 ng?y15/06/2030 | departure/arrival/validFrom/validUntil t??ng ?ng10:30/11:30/12:30/13:30 **UTC**, theo parser m?i |
| API update c? +07:00, desktop A1 | C?c chu?i gi? c? explicit offset v? `.345` | C?4 fields gi? ??ng instant UTC t??ng ?ng, kh?ng m?t precision |

[No-op desktop tr??c/sau](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B04-timestamp-before-after.json), [mobile](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B04-timestamp-before-after.json); [edit/precision desktop](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B04-fix-edit-precision.json), [mobile](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B04-fix-edit-precision.json); [4 fields API create/update](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B04-fix-api-timestamps.json). [?nh form tr??c desktop](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B04-ticket-noop-before-full.png), [mobile](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B04-ticket-noop-before-full.png), [?nh local edit mobile](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B04-fix-ticket-edited-local-full.png). To?n b? PATCH ?i API th?t; ch? Ticket fixture b? thay ??i.

**B02/B03:** input0, validity h?p l? v? save200 gi? DB0. Nullish fallback gi?0 kh?c gi? tr? thi?u; kh?ng thay backend normalize/pricing ?? t?o semantics gi? null m?i. [Gi?0 desktop](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B02-zero-input.json), [mobile](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B02-zero-input.json); [0??m desktop](evidence/t13b-02-fix/20261107132504-39eb34/desktop/B03-zero-nights-input.json), [mobile](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B03-zero-nights-input.json); [?nh gi?0](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B02-zero-price-full.png), [?nh0??m](evidence/t13b-02-fix/20261107132504-39eb34/mobile/B03-zero-nights-full.png).

Full c?140 screenshot UI theo manifest, th?m1 ?nh b?n ghi B06.36 desktop/34 mobile layout checkpoints ??u kh?ng tr?n ngang; thao t?c click/fill/select/confirm th?t, kh?ng force. Kh?ng coi full-page screenshot m?t m?nh ch?ng minh interaction; request/DB ch?ng minh save. Mobile l? gi? l?p, kh?ng claim thi?t b? th?t ho?c timezone/DST kh?c.

## 7. Build v? regression li?n quan

Focused v? full ??u build backend/frontend **PASS**, exit0 tr??c DB write: [backend full](evidence/t13b-02-fix/20261107132504-39eb34/backend-build.json), [frontend full](evidence/t13b-02-fix/20261107132504-39eb34/frontend-build.json).

- [Service unit PASS](evidence/t13b-02-fix/20261107132504-39eb34/alias-unit.json): thi?u quy?n ??ng code v? ch?a query Booking; foreign deny; authorized own query. Ki?m real TicketService create/update c?4 timestamp fields v?i chu?i ph?t, Z, offset v? Date instance, model I/O stub, kh?ng DB write.
- [Form unit PASS](evidence/t13b-02-fix/20261107132504-39eb34/form-unit.json): compile v? g?i ch?nh hai helper inline trong TSX hi?n h?nh; ??ng local, explicit ISO edit, midnight, no-op precision, null/absent. Kh?ng d?ng helper c? kh?ng c?n ???c app import ?? suy PASS.
- [RBAC unit hi?n c? PASS](evidence/t13b-02-fix/20261107132504-39eb34/rbac-unit.json); syntax checks c?c `.cjs` m?i ??t. Unit kh?ng thay b?ng ch?ng E2E th?t.

Kh?ng ch?y seed-based test:integration/test:favorite/test:review, kh?ng rerun T13-A/T13-B-01,28 CORE ho?c8 OPTIONAL.

## 8. DB guard, cleanup v? fingerprint

Exact `NODE_ENV=test`, `DB_HOST=127.0.0.1`, `DB_NAME=TEST_DATABASE_NAME=travelgo_ai_m0_test`, `DB_SSL=false`, `ALLOW_TEST_DB_WRITES=true`; ki?m current_database/user/server th?t, sentinel `hugotravel-isolated-test-database-v1`, **12/12 migration checksums** v? FK/index tr??c fixture. Browser identity route ??ng run/port/DB. Kh?ng migrate/sync/seed/reset/truncate/??i marker/x?a volume.

[Focused preflight](evidence/t13b-02-fix/20261107132355-4a2ce7/preflight.json), [full preflight](evidence/t13b-02-fix/20261107132504-39eb34/preflight.json), [postflight kh?ng ??i](evidence/t13b-02-fix/20261107132504-39eb34/postflight-schema.json). Fingerprint-before ch?p m?i tr??c fixture ??u, kh?ng m??n file l?ch s?.

Ledger write-ahead exact UUID/email; accounts/Business/resources synthetic ri?ng, kh?ng seed/demo. Cleanup FK theo support ?? duy?t: Review tr??c Booking RESTRICT, audit/history/events v? recommendation children theo IDs, resources/tour_places tr??c Business/User; guard tr??c cleanup, fail-closed n?u g?p dependent ngo?i fixture. Booking/Review prerequisite kh?ng t?nh PASS B07/B08/Review.

| Run / viewport | User | Business | Place/Tour/Ticket/Blog | Booking | Review | Cleanup |
|---|---:|---:|---|---:|---:|---|
| Focused desktop |11|4|4/3/4/3|1|0|PASS|
| Focused mobile |4|2|0/0/1/0|0|0|PASS|
| Full desktop |36|17|16/10/8/9|9|1|PASS|
| Full mobile |25|13|8/5/3/4|6|1|PASS|

[Focused cleanup](evidence/t13b-02-fix/20261107132355-4a2ce7/cleanup-final.json), [full cleanup](evidence/t13b-02-fix/20261107132504-39eb34/cleanup-final.json), [desktop ledger](evidence/t13b-02-fix/20261107132504-39eb34/desktop/ledger.json), [mobile ledger](evidence/t13b-02-fix/20261107132504-39eb34/mobile/ledger.json). H?u ki?m exact cleanup IDs c?a21 b?ng ledger ? c? focused/full, c? hai viewport: residual ??u0; email fixture kh?ng c?n User.

**Fingerprint25/25, changed=[], compare exit0** ? c? focused/full;4 snapshot c?ng n?i dung. [Focused compare](evidence/t13b-02-fix/20261107132355-4a2ce7/fingerprint-compare.json), [full before](evidence/t13b-02-fix/20261107132504-39eb34/fingerprint-before.json), [after](evidence/t13b-02-fix/20261107132504-39eb34/fingerprint-after.json), [compare](evidence/t13b-02-fix/20261107132504-39eb34/fingerprint-compare.json). Helper T11 d?ng REPEATABLE READ READ ONLY, count/SHA-256 c?a MD5 JSON row ?? sort; kh?ng ch? so counts, kh?ng ?o sequence/cache ngo?i ph?m vi fingerprint.

## 9. Source integrity

[??i chi?u baseline1.958 file](evidence/t13b-02-fix/20261107132504-39eb34/legacy-baseline-integrity.json): **1.955 file nguy?n hash + ??ng3 file ?ng d?ng thay ??i ???c ph?p**, kh?ng ph?i tuy?n b?1.958 file ??u nguy?n bytes sau s?a. Kh?ng c? thay ??i ngo?i allowlist.

[Integrity t?i run](evidence/t13b-02-fix/20261107132504-39eb34/source-integrity.json) c?n ??i chi?u baseline hi?n t?i2.918 file, ??ng3 source kh?c; m?i harness/evidence c?, helper c? v? report tr??c nguy?n hash trong th?i gian ch?y. Sau audit ch? c?p nh?t ch?nh report ???c y?u c?u; b?n report tr??c ?? l?u nguy?n bytes. C?c artifact m?i d?ng t?n/run ri?ng, LATEST-v2/FOCUSED_PASS-v2 ri?ng; kh?ng s?a pointers FIX tr??c.

239 application/package/migration hashes tr??c/sau v? focused/full b?ng nhau: [before](evidence/t13b-02-fix/20261107132504-39eb34/application-hashes-before.json), [after](evidence/t13b-02-fix/20261107132504-39eb34/application-hashes-after.json). [Ba source hashes verified](evidence/t13b-02-fix/20261107132504-39eb34/application-hashes-verified.json) kh?p source-after.json; [harness hashes](evidence/t13b-02-fix/20261107132504-39eb34/harness-hashes-before.json) kh?ng ??i trong run.

| Source cu?i | SHA-256 |
|---|---|
| partnerService.ts | `5f3b8be177cfc68e45667f4f1bd57fff14c8279024654751f988fb2aaf542e94` |
| PartnerResourceFormPage.tsx | `22908f5e6f61ec20f5b69fe256a6ef42a5da450127bb0ee806960226a7ea7fbe` |
| ticketService.ts | `96619b15b8756701a9d88907e92d6e076486ffb11b69f945eb6ebc68c3c9b614` |

L?nh t? backend: `node scripts/t13b02-fix-v2-run.cjs focused`, sau PASS m?i `node scripts/t13b02-fix-v2-run.cjs full`, r?i `node scripts/t13b02-fix-v2-audit.cjs 20261107132504-39eb34`. Kh?ng commit/push/deploy.

## 10. ??ng nh?m v? NEXT TASK PLAN

T13B02-01/02/03/04 **?? s?a v? ki?m ??t** theo y?u c?u m?i. C? th? ??ng T13-B-02 sau duy?t. Prerequisite FIX tr??c AI Agent ?? c? k?t qu? ??t; ??y **kh?ng ph?i l?nh b?t ??u AI Agent development**.

**C?n m?:** Map P2, nh?n ?nh?p? Ticket P2 v? c?c GAP ch?a quy?t ??nh; kh?ng s?a ch?ng trong task.28 CORE **NOT RUN**: R06; A01/A06; B07/B08; V01?V08; F01?F07; C01?C08. O01?O08 **NOT RUN**. Kh?ng n?ng setup Booking/Review th?nh coverage m?i.

**NEXT TASK PLAN ? ch? ?? xu?t, ch?a ch?y:**

| Task | Scope ?? xu?t | Dependency |
|---|---|---|
| T13-B-03 | B07/B08, A01/A06 | Duy?t FIX n?y; ch?t GAP-07 fixture COMPLETED/unpaid synthetic, GAP-05 metrics; gi? GAP-09 direct Booking URL v? API-only Admin placeholder. |
| T13-B-04 | V01?V08 | Contract lifecycle v? prerequisite Booking t? nh?m tr??c ?? ??t; t?o fixture m?i, kh?ng d?ng l?i ID ?? cleanup. |
| T13-B-05 | F01?F07 | Resource/ownership ?? ??t; fixture consent/attribution ri?ng v? GAP-06 account-switch. C? th? t?ch ??c l?p n?u ???c duy?t. |
| T13-B-06 | C01?C08, R06 | Functional Booking/Review/Favorite fixtures v? quy?t ??nh GAP-06 ?? ki?m privacy-delete/account isolation. |

M?i nh?m kh?a manifest v? c? guard/cleanup/fingerprint ri?ng; kh?ng t? s?a n?u FAIL. **D?ng t?i b?o c?o n?y, ch? duy?t tr??c m?i task ti?p theo.**
