# HuGo AI–WEB synchronization — V1, TASK21.40-A1/A2

26/11/2026 ICT. **Bounded native PostgreSQL/HTTP/browser acceptance PASS, model OFF.** Không phải production hoặc real Qwen acceptance. Historical WEB02/A0 locks không thay đổi.

## Authority và execution

Website `GET /api/hotels` và Agent `NativeHotelTools.search` dùng cùng `searchHotels` → `HotelReadService` → `quoteHotelStay`/inventory/publication. Agent detail/quote dùng `HotelReadService(new PostgresHotelStore())`, không có catalog giá hay pricing engine thứ hai.

| Registered read capability | Typed input | Output / authority |
|---|---|---|
| `native_hotel_search` | Allowlisted canonical location, street/name, dates, explicit room guest allocations, STAY_TOTAL price cap, room/property amenities, view, supported filters | `AGENT_NATIVE_HOTEL_READ_V1`, cùng room/rate/quote được chọn, sourceVersion/asOf/validUntil; no Booking authority |
| `native_hotel_detail` | Exact public placeId, optional validated stay | Hotel/room attributes, distinct property amenities, dated quote snapshot hoặc undated rate reference |
| `native_hotel_quote` | Exact placeId/roomTypeId/ratePlanId + complete stay | `AGENT_NATIVE_HOTEL_QUOTE_V1`; từ chối room/rate không khớp hoặc quote unavailable |

Input/output top-level JSON schemas đóng; domain validators kiểm typed values, dates, UUID/scope và extra fields. Output DTO sử dụng authoritative domain types; server kiểm freshness/provenance. Không nhận model-written SQL, totals hoặc inventory. `NativeHotelTools.registry` chỉ có read capabilities; natural conversation đã bind search/detail, dated search tự gọi shared quote engine. Typed quote method đã gọi trên PostgreSQL thật; chưa phải model tool-call acceptance.

Public chat giữ existing authentication/CUSTOMER, consent, quota20/hour, session ownership/TTL/revision/requestId. Native preview flags process-local, mặc định OFF; không sửa production `.env`. Legacy paths/wire `NATURAL_CHAT_V3`/`CORE_INTENT_V2` giữ nguyên. New tool names chưa được tuyên bố tương thích Qwen operation suggestions; model bridge cần nghiệm thu riêng trước khi bật Qwen.

## Money, room và context invariants

- Phân biệt `TRIP_TOTAL`, `STAY_TOTAL`, `NIGHTLY_PER_ROOM`, `UNDATED_REFERENCE_PRICE`, `UNKNOWN_MONEY_SCOPE`. H04 được giữ tổng tiền lưu trú, số khách/đêm; generic tổng số người không tự thành adults; không đổi verified Trip budget/destination.
- Không nhân/chia giá catalog legacy thành quote phòng. Native price cap theo `STAY_TOTAL`; nightly cap riêng chưa có phép ánh xạ all-in đã nghiệm thu, hiện hỏi lại an toàn thay vì lọc sai đơn vị.
- Không có ngày: authoritative undated rate reference, availability UNKNOWN. Có ngày nhưng thiếu tuổi trẻ hoặc phân bổ khách: hỏi lại, không mặc định hai khách để báo giá.
- Hard constraints phải cùng room type/rate, dates và exact allocations. Không ghép view từ phòng A, giá từ B, tiện nghi từ C. Property POOL khác room PRIVATE_POOL.
- Đổi destination bỏ street/focus/name reference cũ; ngân sách hợp lệ khác giữ nguyên. Đổi ngày/số khách re-fetch. Selected property phải đúng ID owned session, không lấy property khác chỉ vì cùng tên.
- Empty/unpublished/expired/unavailable trả không có kết quả hoặc lỗi an toàn, không tự tăng budget/bỏ điều kiện. Unknown attributes không suy từ tên/description/review.

## Freshness và provenance

Mỗi read là fresh database retrieval; không lưu quote làm current truth qua lượt sau. Shared domain dùng repeatable-read READ ONLY snapshots, bounded candidates/rates/rows và versions. Native tool deadline7s; process-local DB statement timeout5s. Publication yêu cầu Place APPROVED, Business ACTIVE, approved content version khớp và media/address eligibility.

Presentation kiểm asOf hợp lệ, không tương lai, tuổi snapshot≤60s, validUntil còn hạn, sourceVersion và quote scope/expiry. Quote nonbinding; giá/tồn phải kiểm trong transaction Booking riêng. Deadline/abort trong Core ngăn công bố kết quả khi turn đã hết hiệu lực. Native tools không có mutation port.

Provenance phân biệt `ISOLATED_SYNTHETIC_PREVIEW`/DEMO và authorized business snapshots. Chat ghi nhãn SYNTHETIC; tọa độ C chỉ là fixture, không dùng map/routing/distance. Raw description/review là untrusted data, không thành instructions hoặc verified room facts.

## WEB authorized delta

Historical freeze839 giữ nguyên manifest. Delta trực tiếp duy nhất ở business source: `backend/src/hotels/postgresStore.ts` chấp nhận đúng least-privilege `ai_hotel_a1a2_acceptance`, exact test database và task profile chưa hết2giờ, NOSUPERUSER/NOCREATEDB/NOCREATEROLE. Public `hotel_runtime` không được cấp DML. Role/fence đã DROP sau acceptance; đoạn scoped guard không tự tạo role/quyền. Documentation handoff chỉ append. Before/after hashes ở `authorized-web-delta-v1.json` và final integrity; frontend không sửa.

## Review attribution read contract — PREPARED, NOT ACTIVATED

Actual isolated audit: `reviews` có booking_id/verification_status/moderation_status/ai_usage_allowed/updated_at; `hotel_review_stays(review_id,booking_item_id,created_at)` liên kết review với exact item. Item có room_type_id/rate_plan_id/quote_snapshot/occupancy và Booking owner. Native trigger kiểm COMPLETED, đúng khách/Place và checkout đã qua. Actual review/attribution rows đều0; không tạo review giả.

Proposed read DTO:

```ts
type RoomReviewEvidenceV1 = {
  contract: 'ROOM_REVIEW_EVIDENCE_V1';
  reviewId: string;
  placeId: string;
  roomTypeId: string | null;
  scope: 'HOTEL' | 'ROOM_VERIFIED_STAY' | 'UNKNOWN';
  publication: 'PUBLISHED';
  aiUsageAllowed: true;
  verification: 'VERIFIED' | 'UNVERIFIED';
  sourceRevision: string;
  asOf: string;
  attribution: 'EXACT_BOOKING_ITEM' | 'NO_ROOM_ATTRIBUTION';
  aspects: Record<string, {sentiment: string; supportReviewIds: string[]}>;
};
```

Không xuất user/email/booking ID/room number/contact hoặc raw comment vào model DTO. Chỉ `ROOM_VERIFIED_STAY` khi existing link + completed owned stay + item/place/room snapshot khớp. Link thiếu/đa nghĩa trả HOTEL/UNKNOWN, không tự gán hotel review cho mọi room. Nội dung mô tả trải nghiệm tại thời điểm lưu trú, không bảo đảm room hiện tại có amenity/view ấy.

Existing ReviewService tạo review theo Place và COMPLETED Booking nhưng chưa ghi `hotel_review_stays`; ReviewInsightService hiện aggregate place-level. Vì vậy room attribution chưa LIVE. Phase21.40-B cần minimal allowlisted item attribution write trong cùng review transaction; chỉ auto-bind khi có căn cứ duy nhất và quyền hợp lệ, giữ immutable provenance. Existing link table đủ cho read contract V1; **chưa đề xuất/thực hiện migration mới**. Nếu cần nhiều item/review phải review minimal schema proposal riêng.

Edit/delete/hide/revoke consent phải tăng/recheck revision, bỏ evidence tương ứng và rebuild bounded insights; không dùng cache cũ làm current. Rating/opinion không thành property fact/distance. Worker/daily processing NOT RUN và OFF; phaseB chưa bắt đầu.

## Acceptance evidence

`docs/evidence/ai-live-hotel-a1a2-20261126/`: S01–S16 native service/HTTP16/16; Browser5/5,1login+5chat; thêm1 ephemeral UI session reset được tính conservative, final7entries/remaining13/reserve10. Total DML attempts240/600 (218writer gồm rollback +22audit cleanup); retain3Hotel/4room/4rate/16inventory/2promotion/3media và3profile/3address. Outside fixture delta59/59 không đổi; public runtime READ ONLY, write role/fences removed. Model0, worker OFF. Full production scale, review worker, real business catalog, Qwen reasoning và VPS chưa được nghiệm thu.


Final source lockv3: occupancy ambiguity safety + backend acceptance-batch seal. Generic guest composition must be confirmed; already accepted explicit-adult decisions replay identical5/5 offline. Actual native/browser evidence is v2; v3 not browser-retested beyond max5. Final HTTP/read-only persistence verified; no extra chat, ledger13 retained and batch CLOSED after API reload. This is not a new semantic or Browser LIVE PASS.


## 21.40-B review synchronization addendum — 27/11/2026 ICT

The isolated database committed additive migration20 with per-review revisions, a transactional event outbox, sanitized review views, persistent jobs/lease/retry/reconciliation state, and same-transaction insight invalidation. Agent native Hotel search/detail reads scoped persisted opinion only when current revision/source stamp matches; HotelReadService remains sole authority for price, stock and promotion. Exact room opinion requires verified completed Booking item attribution; hotel-level opinion is never promoted to room fact. Task-owned worker role cannot read raw reviews/users/bookings; public hotel_runtime stays READ ONLY. Four SYNTHETIC reviews and initial worker2 completions exist as evidence, but DB15457 is now unavailable and the write scope expired; full native/browser/persistence/fingerprint closure is BLOCKED. No production worker, Qwen or external refresh is active. See HUGO_AI_21_40_B_REVIEW_INTELLIGENCE_WORKER_REPORT.md.

B method revision: after V4 worker evidence, extraction advanced to BOUNDED_VI_ASPECT_RULES_V5 for compatibility. Retrieval rejects old V4 cache and daily reconciliation will queue V5 recomputation when authorized. This change was offline only; no V5 DB/native/browser PASS is claimed.

B read-only DB proof after exact restart: persisted V4 insights2, room40/review1 and room41/review2 separate; current V5 native reader returns pending/no old payload. Outside-B-cohort fingerprints59/59 PASS, public runtime read-only/no DML. V5 worker/write/browser acceptance remains blocked by expired scope; old roles still require removal.


## TASK21.40-B-RESUME — V5 review synchronization (27/11/2026)

Actual isolated PostgreSQL15457 V5 worker persisted hotel/room insights. HotelReadService remains sole authority for current price/stock; ReviewProcessingService checks source revision/stamp and suppresses stale review immediately after edit, hide, delete or consent withdrawal. Exact room attribution requires verified completed Booking item; hotel-only review never becomes room fact. Native R17–R24 PASS, including current quote/hard budget/cross-room guards. Browser B04 exposed a missing quote in detail prose while the validated DTO had a quote; the renderer now prints only validated STAY_QUOTE_SNAPSHOT with expiry, source and SYNTHETIC caveat. Offline8/8, native compatibility7/7 and backend build PASS; browser B04 remains historical FAIL and B05 NOT RUN. Public DB role READ ONLY, temporary B roles/fence removed. See [B report](HUGO_AI_21_40_B_REVIEW_INTELLIGENCE_WORKER_REPORT.md).


## TASK21.40-B-FINAL grounded quote contract

Native Hotel detail now carries the verified stay dates, per-room adults/child ages and quote promotion/discount fields from HotelReadService. Both detail and search prose bind total VND to dates, nights, rooms and guest allocation; expired quote or snapshot is withheld at render time. Undated reference price remains labeled as reference, while review evidence cannot supply present price or availability. The source is offline-tested15/15 and compatible7/7; current browser B04/B05 NOT RUN. No website pricing authority or Booking guarantee changed.


## TASK21.40-C — Phối hợp tư vấn đa dịch vụ

`NATURAL_CHAT_V3` dùng các cờ native Hotel hiện có để phối hợp đọc Hotel, nhà hàng, điểm tham quan và Planner. Ngày, phân bổ khách, hard constraints, giá, tồn và ưu đãi đi theo cùng phòng/gói giá. Trần cả chuyến có trường riêng và chỉ là điều kiện cần để loại lựa chọn lưu trú vượt toàn bộ ngân sách. Báo giá quá hạn bị loại khỏi phần tiền công bố.

Review V5 chỉ đi qua reader kiểm eligibility, revision và source stamp. So sánh nhiều phòng đọc một snapshot review và giữ attribution. Catalog nhà hàng/điểm tham quan cần đủ publication eligibility. Planner dùng chính catalog đã lọc, định danh khách sạn đã kiểm tra lại và transport được hỗ trợ. `TRAVEL_CONSULTATION_V1` ghi provenance, khoản dự trù và mục thiếu giá. Quyền ghi và Booking đều false. Final native chỉ đọc 10/10. B04/B05 browser và native dương với catalog đủ dữ liệu còn mở. [Báo cáo C](HUGO_AI_21_40_C_ADVANCED_TRAVEL_CONSULTANT_REPORT.md)


## TASK21.40-D — Qwen và quyền của nguồn dữ liệu

Provider hiện có nhận fact có phạm vi khách sạn/phòng/gói giá, kiểu nguồn, thời hạn, dữ liệu review V5 dạng đếm và dự toán. Model chỉ đề xuất làm rõ hoặc chọn ID đã cấp theo schema. Authoritative backends và renderer quyết định giá, ưu đãi, tồn, ngữ cảnh và tên dịch vụ. Server tái kiểm thời hạn báo giá và review stamp sau model, giữ fallback deterministic và quyền ghi/Booking false. Native PostgreSQL chỉ đọc với provider mô phỏng 7/7. Model thật BLOCKED_RESOURCE. [Báo cáo D](HUGO_AI_21_40_D_QWEN_LIVE_INTEGRATION_REPORT.md)
