# WEB-INTEGRATION-02 — Codex takeover và backend/database foundation

Ngày25/11/2026 (ICT). Kết luận: **WEB_INTEGRATION_02_PARTIAL_NATIVE_PASS**. Backend foundation đã triển khai và có nghiệm thu HTTP/PostgreSQL/browser thật trong phạm vi bên dưới. Không tuyên bố toàn bộ website/Hotel/AI LIVE READY.

## Source và bảo toàn worktrees

- Main tại `<workspace>/DACN`: HEAD `e76d187e8b824ee0c688001150a36cd279074c9d`; không reset/clean/stash/checkout đè. Hai review report untracked của Gemini giữ nguyên.
- WEB tại `<workspace>/DACN_WEB_REVIEW`: base `46839ea38453d42accb040e30e1973a171638b66`; đã tạo `integration/web-backend`. Branch bàn giao `feature/web-ui-admin-partner` giữ nguyên46839ea. Không commit/push/merge main.
- Đã kiểm Git/worktrees/log/remote/diff/untracked, xác minh remote heads lúc takeover; không clone/fetch lại source đã có.
- Manifest WEB khớp byte SHA256257/257. Owner/main có230 file khác LF/CRLF, nhưng nội dung tương đương257/257; lưu riêng owner raw baseline và kiểm lại byte owner sau mỗi batch. Không sửa manifest hoặc normalize protected source.
- Source lock cuối: [runtime-source-lock-v5.json](evidence/web-integration-02-20261125/runtime-source-lock-v5.json),931 source/build/helper files. Lock cũ và mọi FAIL giữ riêng. Không thay algorithm/prompt/AI UI/worker/quota/consent/Planner/Recommendation/scrypt/tokenService.

## Docker và database thật

Đã khởi động Docker Desktop local được phép; Engine29.8.2 hoạt động. Không reset Docker, không xóa container/volume có trước. Docker tự khởi động các container theo restart policy hiện hữu; assistant không truy cập DB gốc5432.

READ ONLY audit staging15452 xác nhận40bảng/17migration/130Place/20Business; trước/sau khớp fingerprint40/40. Hotel UI cũ được khởi động ngắn chỉ để READ ONLY audit52/18 rồi trả lại trạng thái dừng. Không migrate/grant/write/gia hạn sandbox cũ. Preview3000 giữ nguyên process và port.

Target mới duy nhất:

| Thuộc tính | Giá trị |
|---|---|
| Container/database | `hugotravel_web_integration_test_20261125` |
| Volume/network | Cùng tên + `_data` / `_net`, task label WEB-INTEGRATION-02 |
| Host/port | `127.0.0.1:15457` |
| Cached image | `postgis/postgis:15-3.4-alpine`, ID `sha256:d96be3a9c16d44e22d34d5c7b6e85be8875addf672672c6cd38171ea6055a94a`; pull0 |
| Sentinel | `hugotravel-isolated-test-database-v1` |
| Migration/runtime roles | `web02_migrator` / `hotel_runtime`; non-superuser/non-createdb/non-createrole |
| Resources | 1CPU,768MiB RAM/no additional swap,128MiB shm,96MiB shared_buffers,30connections |
| Native schema | Migrations1–18:52/18; final reviewed candidate19v3:59/19 |
| Caps | 1new environment;160non-read HTTP;150fixture statements;2000attempted runtime DML rows; write scope≤2hours, never extended |
| Isolation | Loopback publication, dedicated bridge/ICC off; Node network guard permits only15457/5064/5182 loopback; provider/worker forced OFF |

Initial Docker `internal` network suppressed Windows host publication, despite configured loopback binding. Corrected only the task network, preserving the same container ID/volume; evidence records the change. No public PostgreSQL/Ollama publication was added.

Credentials are cryptographic random, fixture password hashed by existing production scrypt; encrypted DPAPI CurrentUser blob outside repo with user-only ACL. No real Owner account/credentials/DPAPI was used. No plaintext credential/token in reports or source.

## Implementation và shared impact

Exact API inventory/gaps: [real API matrix](HUGO_WEB_REAL_API_MATRIX.md). SQL/ERD/constraints/rollback/impact: [migration review](HUGO_WEB_DATABASE_MIGRATION_REVIEW.md).

- Added `backend/src/web/{common,accountSecurity,cms,media,business}.ts` and `routes/webFoundationRoutes.ts`. Reused existing User/AuthService/scrypt, Business membership, HotelReadService/management/pricing, ImageStorageService and audit_logs.
- CMS: one immutable revision mechanism for banners/sections/settings; exact version/CAS, draft preview, pinned publication, restore/archive, ordering, schedules, typed canonical geographic references and relational featured Hotel references. Public API rechecks time/eligibility; editorial content cannot write commercial rates. Media signature/dimensions/rights/ownership validated by existing shared storage code.
- Users: pagination/search/role/status filters/safe detail/audit, current role/status/session checks, no self/Owner/other SUPER_ADMIN edits or SUPER_ADMIN grant. Own profile and managed avatar; current-password verified changes with DB session epochs and reauthentication.
- Notifications: persisted account events and own read/read-all contracts. No fake email send; Booking/onboarding event delivery/full notification UI remain04.
- Partner: real promotion read alias over existing authoritative snapshot; existing write paths/If-Match retained; Admin suspension archives the existing commercial promotion with audit. Review replies are separate records with tombstones/version; no edit to customer review/rating.
- Shared auth checks are opt-in via `WEB_FOUNDATION_ENABLED` + `WEB_ACCOUNT_SECURITY_ENABLED`. Default OFF retains old PublicUser/token shape, synchronous middleware and no side-table query; verified against actual PostgreSQL/scrypt. tokenService/passwordService unchanged.
- Hotel schema guard retains52/18 branch and adds ONLY59/19 when explicit WEB flag plus exact18/19 tracked source hashes pass, retaining test sentinel/exact runtime role. Unknown/unapproved schema is rejected.
- `AdminService.getBookings` accepts optional validated filters; old two-argument return contract remains. Existing service handles booking reads, not a parallel booking engine.
- Frontend changes are CAS/version/If-Match adapter corrections plus a preview-only SYNTHETIC notice and an account client for04. No redesign. All feature defaults stay OFF; scoped runtime names only actual-tested Admin users/business detail/booking filters.

No ALTER to existing users/reviews/Hotel/AI columns; migration19 adds seven side tables. Dependency review found initial reply FK would block existing ReviewService.remove. Candidate19v1 exact SQL/hash/evidence was preserved; reviewed19v2 uses delete cascade/anonymization on new FK edges and reply tombstones. Native down/up/restore was one transaction on the new target only, preserving task rows; no migration1–18 edits or blind checksum UPDATE. Original ReviewService and AI review inputs are unchanged.

## Actual acceptance

| ID | Kết quả đợt02 |
|---|---|
| W02-01 | NATIVE PASS: exact DB/sentinel/role/loopback/resource/isolation checks; original DB not accessed. |
| W02-02 | NATIVE PASS: actual migrations1–18 and52/18 count/checksum tracker. |
| W02-03 | NATIVE PASS: reviewed19, rollback probes, candidate19v2/v3 native down/up/row restore and59/19; immutable content/live author protected, FK anonymization tested with rollback. |
| W02-04 | OFFLINE PASS: final backend tsc; final frontend tsc+Vite. |
| W02-05 | ACTUAL HTTP/PG PASS: private draft, published exact revision, public retrieval/pinned content. |
| W02-06 | ACTUAL HTTP/PG PASS: banner edit/restore/version conflict/schedule/expiry/disable/unpublish/archive; typed boundary tests also PASS. |
| W02-07 | ACTUAL HTTP/PG PASS: Admin user RBAC/status/roles/session invalidation/safe DTO; browser desktop list/detail PASS. |
| W02-08 | ACTUAL HTTP/PG PASS: own profile/avatar update and cross-owner rejection; browser mobile login/profile read PASS. Final9–20 phone boundary verified OFFLINE; write scope was not reopened after cleanup. |
| W02-09 | ACTUAL HTTP PASS: cross-customer Booking/notification and cross-Business access rejection; Hotel-specific positive cohort NOT RUN. |
| W02-10 | BLOCKED: positive Hotel/room/rate/inventory native compatibility requires permitted coordinates; no-coordinate creation422 guard PASS. |
| W02-11 | IMPLEMENTED/build PASS; populated commercial promotion update/freshness native NOT RUN. |
| W02-12 | PARTIAL: actual empty Hotel search200, browser empty state PASS; populated search/detail NOT RUN. |
| W02-13 | Legacy Booking ACTUAL HTTP PASS: server price/idempotency/ownership/cancel/inventory restoration. HotelStay native NOT RUN. |
| W02-14 | NATIVE PASS: migration rollback/restore, stale-CAS writes rollback; onboarding failed transaction remained PENDING/no Business leak before exact TEMP fix. |
| W02-15 | PASS:257/257 WEB raw hashes and257/257 owner raw-baseline hashes; protected manifest unchanged. |
| W02-16 | ACTUAL PostgreSQL PASS: default-OFF auth/scrypt/middleware contract; strict59/19 recognition/rejection; no AI DML granted. Historical52/18 READ ONLY audit separate. |

Native foundation run:82HTTP requests/84 recorded checks. Business run preserved its FAIL at request24:23 prior requests passed; after fixing exact missing TEMP privilege, only the failed approval and unexecuted tail were run (7HTTP, PASS). Existing Booking tests were not rerun merely to inflate totals.

Actual Edge Chromium desktop1440×1000/mobile390×844: real UI login → backend → Admin list/detail/customer own profile; screenshots inspected, no overflow. First browser FAIL was an exact-text locator that ignored nested email in the member's cell. Evidence preserved; corrected selector retains exact API name/email and verifies actual row text. Rerun PASS uses no mock/response fulfillment. External CDN fonts/Leaflet CSS were aborted before dispatch; this is not Maps acceptance.

Final targeted OFFLINE test covers strict typed CAS/config, canonical IDs from existing geography, impossible dates/timezone, phone and malformed UUID. Final TypeScript source v3 read-only HTTP confirms current build, invalid UUID400, persistence after restart and writes403. Final schema lock v4 adds migration19 candidate3 with native FK/immutability probes and row restoration; final lock v5 also distinguishes an explicit WEB booking-read call from the untouched legacy two-argument contract, so unfiltered WEB reads use the existing safe HotelStay-attached DTO. Final backend build and targeted boundaries PASS. No full AI benchmark rerun or model double used for a LIVE claim.

## Cleanup, preview và persistence

Exact cleanup COMMIT recorded every task-created transient ID. Final target:5SYNTHETIC users,2SYNTHETIC membership-scoped Businesses,2published CMS documents/4revisions and security epochs. Places/Hotel/Booking/Trip/reviews/tickets/onboarding/notifications/media/audits are0. Temporary media files were removed by exact validated storage keys. Test tokens revoked; no real Owner row.

Runtime DML was revoked; `hotel_runtime` now defaults transactions READ ONLY in this exact database. Backend task wrapper additionally blocks mutations403 and disables HotelStay writes. Native SQL mutation rejected (`25006`/read-only); users/settings reads and synthetic login via actual frontend proxy PASS after restart. No expired write authorization was extended.

- Preview: **http://127.0.0.1:5182/**
- API: **http://127.0.0.1:5064/api/health**
- Synthetic Admin login: [OPEN_WEB_INTEGRATION_ADMIN.cmd](../tools/OPEN_WEB_INTEGRATION_ADMIN.cmd).
- Synthetic Customer login: [OPEN_WEB_INTEGRATION_CUSTOMER.cmd](../tools/OPEN_WEB_INTEGRATION_CUSTOMER.cmd).

Launchers use task-owned DPAPI in a separate Edge context; no plaintext password display/copy, no real Owner login. API/DB remain READ ONLY. No claim that empty Hotel data is a complete business preview. Existing3000 runtime was not replaced. Qwen/Ollama/Agent/worker/Maps/payment/paid API/VPS/deploy remain OFF/NOT RUN.

## Remaining blockers và03 handoff

1. Prior coordinate reuse approval was explicitly UI-target-only. A question for unchanged C/D coordinate reuse in the new WEB target was presented; no reply/approval was inferred. Therefore no Hotel fixture/coordinates were inserted, and W02-10/11/populated12/HotelStay13 remain BLOCKED/NOT RUN. Any later run must recheck scope/IDs/source/caps; this preview is already READ ONLY.
2. Full CMS Admin/public homepage consumer/media upload/publication UI is03. Current member homepage still uses existing editorial components; new public CMS API is implemented, not blanket-activated as a finished CMS website.
3. Full Customer/Partner forms, notification lifecycle delivery, populated review reply freshness and favorite/review eligibility browser journeys are04 or subsequent scoped acceptance. Preserve the three existing AI/Review profile panels; do not change AI to make web features pass.
4. Existing dashboard booking-total aggregates are not a verified paid-revenue ledger; financial KPI semantics are not accepted here. Preview counts/totals reflect its actual empty Booking tables.
5. Production needs a future migration/credentials/limits/backup/Linux/GPU/security/full E2E decision. DPAPI helpers are local operator tools, not backend production dependencies. Runtime media storage uses env-configured absolute paths and the existing Linux-capable shared storage interface. Migration raw-byte checksums differ between LF/CRLF checkouts; preserve exact deployment artifacts/reviewed tracker identities, do not normalize or relax old checksum guards silently.

03 has not started. No AI upgrade, main merge, commit, push, VPS rental or deploy.

Evidence directory: [web-integration-02-20261125](evidence/web-integration-02-20261125). Key receipts: execution-plan/source locks, protected-before/owner baseline, protected-staging-before/after, migration19-v2/v3-native, http-foundation/business/affected results, shared-contract-native, browser results/screenshots, cleanup-exact-ledger/committed and final read-only runtime proof. Setup and browser/native FAIL receipts are retained, not overwritten.
