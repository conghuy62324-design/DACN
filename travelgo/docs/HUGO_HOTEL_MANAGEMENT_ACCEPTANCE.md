# HuGo Hotel management — 21.38-B

This phase extends the existing Express application, existing auth/memberships and React Partner/Admin routers. It does not create another catalog, Booking engine, review engine or AI Agent.

## Runtime boundary

`HOTEL_DOMAIN_ENABLED` remains OFF by default. `VITE_HOTEL_DOMAIN_ENABLED` separately hides the management entry in the existing frontend environment. During acceptance only, the owned test runtime used API5058/frontend5178 and PostgreSQL15453, all bound to loopback. The protected catalog staging15452 keeps 40 tables/17 migrations and READ ONLY; its launcher is unchanged.

The new runtime after-connect guard requires a test database, the durable isolated sentinel, a non-superuser/non-createdb/non-createrole `hotel_runtime`, exactly52/18 and the current migration18 source checksum. The migration role is separate. The task preload forces model/search/worker flags OFF and denies backend network connections outside the exact test database endpoint. Test fixture IDs are injected by the task-only launcher from the locked pool and logged without credentials; normal server identity generation remains cryptographic UUID generation.

This guard deliberately does **not** authorize enabling the Hotel runtime against existing staging or production. Those targets need a separate reviewed runtime profile and migration/backup/restore scope.

## Implemented API / persistence

- `hotels/postgresStore.ts`: repeatable-read READ ONLY aggregate, DB time, explicit DATE text mapping and numeric conversion, eligibility/revision/provenance source. Calendar ORDER BY columns are qualified after an actual native error exposed duplicate output labels.
- `hotels/management.ts`: ownership through existing BusinessAccessService; strict typed DTOs; profile/address/room/rate/calendar/inventory/promotion persistence; server identity; optimistic If-Match; row locks; transactional audit; content changes make Partner-edited data draft while preserving Admin suspension. Ordinary commercial updates remain separate from content approval.
- `routes/hotelRoutes.ts`: guarded public GET hotels/details and read-only POST quotes; existing Partner/Admin authenticated routes and scoped media reads. Missing inventory/fees and stale revisions fail closed.
- `HotelReadService`: current published data, room/property distinction, typed per-room/night quotes, active promotion windows, no-store/sourceVersion/asOf/validUntil and binding/execution authority false. It is the common future website/AI data source; Agent integration is not run here.
- Admin publication atomically updates the canonical address/location projection into Place, exact approved content revision, the approved content snapshot and audit. Existing Place edit/submit/moderation paths reject Hotel-managed records, including with the Hotel feature flag OFF when the extension exists.
- Existing BookingService rejects legacy Place.priceFrom booking for room-enabled Hotels; other service paths and existing idempotency/lifecycle remain in place. No HotelStay confirmation or payment API was added.

Public endpoints are `/api/hotels`, `/api/hotels/:placeId`, `/api/hotels/:placeId/quotes` and eligible `/api/hotel-media/:mediaId`. Managed endpoints live under existing `/api/partner/hotels` and `/api/admin/hotels`, not another backend.

## Media

`services/imageStorageService.ts` is the shared raster/filesystem core; Hotel ownership and metadata remain in `hotels/media.ts`. Supported ingestion formats are JPEG/PNG/WebP, regardless of a client filename or declared MIME. The decoder checks signature, actual decode, file/decoded pixel bounds and animation count, then re-encodes WebP without EXIF. The API accepts at most10MiB and30 active images per property. AVIF ingestion is not advertised or accepted in B.

Storage is a configured persistent directory outside build output, with server-generated namespace/UUID keys, exclusive writes and file mode0600 where supported. No arbitrary external fetch endpoint exists. Private previews require the correct membership or Admin role. Public serving checks current publication, rights and moderation. Room media cannot move across Hotel ownership scopes.

Database failure after upload removes the new file. The shared service also exposes an explicit bounded orphan-cleanup function, preserving referenced and young files and avoiding symlinks. It is not scheduled automatically; no worker was started. Archive hides the metadata/public asset; retention/deletion policy and encrypted filesystem backup remain deployment responsibilities. Acceptance used generated SYNTHETIC pixels and verified retention across an API restart.

## Partner/Admin UI

Actual `/partner/hotels` provides overview, profile, structured address, images, rooms, rate plans/calendar prices, inventory, promotions, policies and review status. It includes scoped upload/preview/cover/order/caption/archive, bed/capacity/view/amenity editing, VND per-room/night terms, date batches with readonly allocations, explicit unknown values and revision/conflict handling.

Actual `/admin/hotels` shows owned Business/representative information, the aggregate, image moderation, current/approved revisions, approved snapshot comparison, reject/suspend/approve actions with reasons and existing audit history. Publishing does not silently accept a newer reviewed revision.

The mobile Save bug found during screenshot review was fixed: an Editor synchronizes authoritative new props and resets to the latest server state after Save, instead of restoring a stale captured initial value. The final mobile check asserts both PostgreSQL value and visible input/clean dirty state. Browser tests use actual Edge with desktop1440×1000 and mobile viewport390×844 emulation, not a physical phone. No successful API response is mocked.

## Acceptance scope and known limits

Native evidence includes baseline40/17, migration52/18, FK/date/price/inventory guards, all-night coverage, rollback/refusal, competing allocation, exactly-once cancellation release and booked-room review attribution. Synthetic review probes are PENDING/AI-disabled and rolled back; no real review corpus was created.

HTTP/browser evidence covers B01–B14 plus dynamic price/calendar/stock/window/status/amenity changes, two positive same-street/different-destination properties, existing PlaceRepository visibility and server-owned field/ownership failures. Failed setup/harness/native/browser evidence is retained; a later scoped guard recheck does not overwrite an earlier FAIL.

The final verdict, counts, source lock, screenshots, cleanup and staging integrity are in `docs/evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/` and Master21.38-B.

Remaining gates are explicit:

- New Hotel drafts without coordinates are still blocked by the old Place NOT NULL contract (422); existing drafts with a removed pair remain unpublished. The separate coordinate compatibility proposal was not applied.
- HotelStay Booking confirmation/cancellation integration and real customer room reviews are phases D/E. The legacy bypass is blocked; this phase does not make room bookings available.
- Existing staging/production migration, encrypted backup plus verified restore, a persistent runtime profile and production security/Linux/GPU acceptance are not executed.
- Homepage/search/detail redesign (21.38-C), full business AI integration (21.40), Maps/GPS (21.41), Qwen and scheduled worker are not run.

Do not deploy the SYNTHETIC fixtures, test accounts or test credentials as business data. No commit, push or deployment is part of B.
