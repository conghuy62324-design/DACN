# HuGo Travel — Customer hotel search (21.38-C)

Implemented homepage, hotel landing and commercial results on the existing React router, Node API, PostgreSQL adapter and HotelReadService/pricing/inventory contracts. This is acceptance of the isolated SYNTHETIC preview, not production activation or HotelStay Booking.

## Open the preview

- Home: http://127.0.0.1:5179/
- Hotel landing: http://127.0.0.1:5179/hotels
- Example: http://127.0.0.1:5179/hotels/search?locationId=destination%3Ada-lat&checkIn=2028-02-28&checkOut=2028-03-01&view=LAKE&maxPrice=2300000

The example uses two adults in one room. Inventory fixtures cover 28 February–2 March 2028. All six visible properties, classifications, coordinates and prices are SYNTHETIC. Images are original illustrations, not photographs or representations of actual businesses. No login is required; no login accounts, reviews, bookings or allocations remain in this preview.

Launchers:

- [START_PREVIEW.cmd](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/START_PREVIEW.cmd)
- [STOP_PREVIEW.cmd](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/STOP_PREVIEW.cmd)

Portable command, from the repository root:

```text
node docs/evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/preview.cjs start
node docs/evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/preview.cjs stop
```

Docker Desktop/the Docker daemon must be running. The launcher checks the exact existing task-owned container/image/volume, sentinel, 52/18 schema, migration/source hashes and zero remaining users. It never creates another environment, resets data, runs migrations or copies staging data. If these checks fail it reports BLOCKED. Start regenerates only the isolated runtime DB password in memory; no user credentials are provisioned or stored. Stop affects only owned children/container, retains the synthetic volume/media and leaves staging alone. The stop command requests shutdown; completion is shown in `.local/hotel-2138c-preview/runtime.json` as `STOPPED`.

Runtime: loopback-only frontend5179/API5059/PostgreSQL15454, one CPU/1024MiB DB cap. The runtime role has SELECT permission, default transaction READ ONLY and no table DML. Qwen, Ollama, Agent LLM and workers remain OFF. Existing staging15452 and its launcher remain 40/17; default website Hotel flags are not changed.

## Contracts

`GET /api/hotels` accepts strict typed criteria: canonical location, name/address, street/ward, accommodation type, dates and exact room guest allocations, STAY_TOTAL min/max VND, verified stars, published-review minimum rating, property/room amenities, view, bedrooms/bathrooms, breakfast, cancellation, promotion, stable sorting and pagination. HTTP JSON fields (`rooms`, amenity arrays) are JSON strings; booleans accept only `true`/`false`. Unknown fields, invalid dates/types or incomplete child ages fail validation. Old `sort=name`, `wardOrCommune`, `/hotels?city=…&search=…` and canonical Place deep links remain compatible.

Room conditions match one room type/rate capable of serving every requested room. Cross-type combinations are explicitly unsupported. A minimum price selects qualifying offers; it does not discard a property solely because that property also has a cheaper, nonqualifying room. Price sorting uses the cheapest offer satisfying all current filters, on the same dates/occupancy and STAY_TOTAL basis.

One repeatable-read READ ONLY transaction loads the candidate IDs and batched table snapshots, published review counts and DB time. No per-property database N+1 and no independent AI catalog. V1 evaluates at most60 address/identity candidates,600 active rates overall,80 active rates per property,8 eligible promotions per rate and6000 rows per batch table. A broader/complex scope returns422 and asks for narrower criteria; it never returns a truncated filtered total. SQL statement timeout is5seconds. Filtering, exact totals, stable sort and page slicing occur on the API server before response.

Date-aware offers reuse the exact all-night stock and BigInt tax/fee/child/promotion calculation. Missing inventory, closed nights, unknown charges or overcapacity never become available/zero. No-date rates are labeled references with availability UNKNOWN. Only one eligible promotion applies, without stacking.

Results contain selected room/rate/quote, structured address, destination from the shared registry, approved media, content/commercial revision, provenance, asOf/validUntil/sourceVersion and DEMO status. Reviews use actual PUBLISHED Place review rows, never cached Bayesian priors. Verified stars require the existing DB evidence contract; synthetic stars are labeled as preview data. No favorite action is added without a new ownership contract.

List and detail discard expired prices, refresh on explicit action and revalidate expired snapshots on focus/navigation. There is no interval polling. Unsubmitted landing drafts use explicit React Router history state so Back/reload preserves dates and per-room child ages; submitted search remains URL-based. Pending requests are cancelled when criteria change. Quote/detail GETs are nonbinding and have no Booking/payment authority. Selected promotion and stay criteria pass to `/places/:id`; legacy Hotel extension links use the native read screen when enabled. Existing BookingService bypass protection is retained unchanged.

## Acceptance and limits

See Master21.38-C and its evidence:12 commercial offline tests,37 affected Hotel foundation tests,13 frontend state assertions, actual React/HTTP/PostgreSQL C01–C17 coverage, typed filter matrix, real-clock promotion/detail expiry, Edge1440px/390px screenshots and readonly persistence/start/stop proof. Mobile was emulated in real Edge, not a physical phone. Historical FAIL receipts remain, including the additional lower-bound-price test's incorrect initial oracle and its documented correction.

Persistent staging migration, encrypted backup/restore, real partner onboarding, production load acceptance, cross-type room mixes, room-review integration, HotelStay Booking/payment and maps are not implemented/accepted here. Images are clearly labeled original artwork; licensed real destination/partner photography can replace them with rights review. Existing 130Place/20Business, Owner, knowledge, reviews, memory/language and original27Trip are not modified.

PhaseD must define the HotelStay confirmation/idempotency/price recheck/locking/allocation/cancellation strategy inside the existing BookingService, with fresh authorization and an isolated target. No D work or AI integration was started in C.
