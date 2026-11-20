## 21.38-A — HOTEL DOMAIN FOUNDATION, STRUCTURED LOCATION & AI-READY BUSINESS DATA

Ngày thực hiện: **18/11/2026 ICT**. Đây là phase A theo roadmap mới: hoàn thiện nghiệp vụ website/dữ liệu trước, tích hợp AI đầy đủ sau. Giữ nhận diện **HuGo Travel**. Không thực hiện 21.38-B/C/D/E, 21.40 hoặc 21.41 trong task này.

**Kết quả: domain foundation IMPLEMENTED / OFFLINE PASS; physical extension PROPOSED, migration và Hotel native integration NOT RUN. Compatibility Booking PASS; bộ RBAC cũ FAIL tại assertion visibility đã lỗi thời. Không kết luận toàn bộ Hotel platform hoặc toàn bộ regression PASS.**

### 21.38-A.1. Baseline và kiến trúc thực tế

Workspace TravelGo hiện có, HEAD `9af594d58a328557fe53a30e46b31b01f51646be`; giữ toàn bộ working tree đã có. Mục21.37 được giữ nguyên: Core model-OFF functional acceptance PASS trong phạm vi đã nghiệm thu, Qwen NOT VERIFIED/OFF, worker DEFERRED/OFF, production LIVE READY:NO. Evidence21.37 được kiểm lại **67/67** hash; 26 hash Core/compiled Core/guards/frontend liên quan không đổi.

Audit READ ONLY PostgreSQL xác minh đúng staging `127.0.0.1:15452`, database `travelgo_staging_catalog_20261112`, role `catalog_runtime` không superuser/createdb/createrole và sentinel `travelgo-public-staging:catalog-20261112`. Physical baseline: **40 bảng public / 520 cột / 17 migration**, PostGIS3.4.3; không có bảng `hotel_*`. **130 Place/20 Business DEMO**. Không kết nối database gốc hoặc kiểm lại 27 Trip ở đó.

Source được đối chiếu theo tên thật: Place/Business/BusinessMember; PlaceService/PlaceRepository và BusinessAccessService; BookingService/bookingValidation; RecommendationService/TourPlannerService/RegisteredCatalogService; ReviewService/ReviewInsightService và reviewAspects; CustomerMemoryService/LanguageMemoryService; TravelKnowledgeService/TravelWebService/TravelWebRetrieval/TravelWebWorker; AgentCoreService/coreProvider; partnerRoutes/adminRoutes và geographic registry. React18/Vite giữ nguyên, reuse inventory21.37 gồm48route/3layout/34shared component; không coi generic Partner/Admin placeholder là chức năng quản lý phòng đã có.

[Audit, ERD, API và handoff chi tiết](HUGO_HOTEL_DOMAIN_FOUNDATION.md). [Physical baseline](evidence/travelgo-ai-agent-core/hotel-foundation-20261118/physical-schema-before.json) chứa actual columns/constraints/indexes/triggers/extensions, checksum migration và fingerprint.

### 21.38-A.2. Những thiếu hụt đã xác minh

- Place đã có public identity, mô tả, gallery, property amenities, moderation và subtype qua catalog metadata. Business là pháp nhân/quyền sở hữu; không tạo Hotel identity trùng Place hoặc thêm Business enum chỉ để biểu diễn Villa/Apartment.
- Chưa có room type, rate plan, calendar price, tồn phòng theo local stay date hoặc promotion scoped theo room/rate. Booking hotel hiện resolve từ Place.priceFrom; không có đủ căn cứ coi đây là giá mỗi phòng/đêm hoặc bảo đảm tồn phòng.
- Review/ReviewInsight có moderation/verification/consent/revision, nhưng chưa có booked-room attribution. Insight cache hiện có scope Place; không được dùng làm bằng chứng cho một room type cụ thể.
- Chưa tìm thấy managed multipart upload/storage pipeline; URL/gallery JSON hiện có không tương đương hệ thống upload, kiểm quyền ảnh và persistent media hoàn chỉnh.
- Place latitude/longitude hiện NOT NULL, serializer có đường chuyển null-like thành0. Đây là compatibility gate cần xử lý trước khi publish khách sạn mới chưa biết tọa độ; task A không sửa Planner/Place để vượt gate và không dùng tọa độ giả.

### 21.38-A.3. Artifacts đã triển khai

**IMPLEMENTED:**

- `backend/src/hotels/contracts.ts`: HotelStay V1, giá VND **PER_ROOM_NIGHT**, Address/Room/Rate/Inventory/Promotion/Quote contracts; flag `HOTEL_DOMAIN_ENABLED` mặc định OFF.
- `validation.ts`: strict fields/types, không ép chuỗi thành tiền/số khách; civil dates, occupancy và tuổi trẻ; dùng registry34 hiện có, phân biệt province và tourism destination; dấu/không dấu, Đ./Đường, P./Phường và X./Xã; coordinate pair/source/status và thời điểm cập nhật, không tự xác minh tọa độ.
- `inventory.ts`: kiểm **mọi đêm**, checkout exclusive, missing=UNKNOWN, closed/shortage=unavailable; cộng nhu cầu các dòng cùng room/date trước khi lên kế hoạch khóa; lock order xác định. Không giữ phòng hoặc ghi DB.
- `pricing.ts`: integer/BigInt, nightly overrides, từng phòng/từng tuổi, thuế/phí có đơn vị, một promotion hợp lệ, không stacking, expiry/version và quote không binding; không chuyển Place.priceFrom/review/web cost thành room price.
- `readModel.ts`: parameterized identity/address search, required location scope cho tên đường/phường, fixed sorting/pagination, loại DEMO khỏi public mặc định. Filter giá/view/availability chưa có adapter thì không được giả vờ áp dụng.
- `services/hotelReadService.ts`: shared read-service port cho website/AI sau này; kiểm eligibility/revision/scope, ẩn sao chưa xác minh, tách hotel/room amenities/media, giá không ngày chỉ tham khảo/availability null; fresh no-store/version/validUntil và lỗi giá/tồn thành NOT_A_QUOTE. **Chưa có PG adapter/controller/route thật, không có quyền tạo Booking/tool/mutation.**
- `tests/hotelFoundation.test.ts`: fixtures SYNTHETIC trong RAM, không review/catalog thật hoặc PostgreSQL writes.

Không đăng ký Sequelize model mới, `.sync`, automatic migration hoặc endpoint vào runtime hiện hành. Không đổi .env/default website config.

### 21.38-A.4. ERD và migration đề xuất

Artifact migration18 `20261118_18_hotel_domain_foundation.sql` và rollback riêng trong `database/rollback/`. **PROPOSED / NOT APPLIED / chưa có native SQL acceptance**.

12 bảng mới: `hotel_profiles`, `hotel_addresses`, `hotel_room_types`, `hotel_media`, `hotel_rate_plans`, `hotel_rate_calendar`, `hotel_room_inventory`, `hotel_promotions`, `hotel_booking_stays`, `hotel_booking_items`, `hotel_room_allocations`, `hotel_review_stays`.

Place/Business/Booking/Review hiện có giữ identity. Composite FK chống gắn room/rate/media khác khách sạn. Profile có content/approved-content/commercial revision; address có structured fields/source/update time, nullable coordinates, generated text search keys và PostGIS indexes. Booking extension dùng **Booking PK cũ**, immutable snapshots và allocation theo mọi đêm; proposed SQL có conditional inventory updates, release đúng trạng thái, deferred all-night/item-total checks và attribution vào room đã đặt. Đây chưa phải bằng chứng đã chạy concurrency/cancellation/PostgreSQL persistence.

Không ALTER cột cũ, backfill, seed hoặc chuyển dữ liệu DEMO. Chỉ đề xuất narrow metadata triggers trên Place identity và Booking có extension. Nếu được áp dụng vào baseline tương ứng: **40→52 bảng, 17→18 migration**; row fingerprints của40bảng cũ dự kiến không đổi, ngoại trừ schema_migrations có đúng dòng tracker mới khi thực sự apply. 17checksum cũ không đổi. Existing protected launcher vẫn giữ guard40/17, không nới để chấp nhận schema mới.

### 21.38-A.5. API, publication và AI freshness

Contracts cho Hotel/Address/Room/Rate/calendar/inventory/Promotion/media/review linkage và Booking extension đã mô tả cụ thể trong tài liệu. Routes ghi rõ **PROPOSED, chưa mounted**; reuse auth/RBAC/membership/permissions và moderation/audit hiện có. Server kiểm If-Match/version và kiểm soát identity, verification, approved revision, rating và allocated stock; Partner không được sửa review khách hàng.

Luồng thống nhất: authorized Partner update → validate/approval đúng revision khi cần → PostgreSQL commit → fresh read/no-store hoặc invalidation sau commit → website và future Agent cùng authorized HotelReadService. Không thêm Kafka/Redis/broker, bảng giá riêng cho AI hoặc retrain model theo giá. `asOf/sourceVersion/validUntil`, promotion boundaries/local midnight và DEMO labels đi cùng dữ liệu. Quote chưa giữ phòng; Booking confirmation phải khóa/revalidate lại trên transaction thật.

Trước publish cần canonical address projection vào Place legacy cùng transaction và chặn đường sửa cũ làm hai nguồn dữ liệu lệch nhau. Trước bookable cần **strategy trong BookingService hiện có** và chặn legacy hotel request dùng Place.priceFrom cho room-enabled properties. Multi-line promotion allocation, room-specific review projection, media storage và date-aware search filter adapter còn là gate tích hợp.

Review reuse method thật `BOUNDED_VI_ASPECT_RULES_V3`, scope public/AI-allowed/proven actual stay, review IDs/revision/computedAt/opinionOnly. Current keys chưa có các aspect chuyên biệt VIEW/BEACH_ACCESS/BED_COMFORT…; không tự tuyên bố hỗ trợ enum của roadmap hoặc tạo score. Chưa sửa review engine hoặc đưa raw/private/untrusted review vào model. Reviews về giá là ý kiến lịch sử, không current room rate.

### 21.38-A.6. Kiểm thử và giới hạn bằng chứng

| Kiểm tra | Kết quả | Phạm vi |
|---|---|---|
| Backend TypeScript build sau source cuối | **PASS** | Guard model-OFF preload; không native/network inference. |
| Hotel domain/read-port targeted tests | **37/37 OFFLINE PASS** | SYNTHETIC in-memory; typed values, dates/ages, scopes, all nights, duplicate/overlap demand, money oracle, promo expiry, no stale stock promise, media isolation, default OFF. |
| Independent cost oracle | **PASS** | 2phòng/3đêm: base6.400.000 + extra750.000 − discount640.000 + tax651.000 + fee230.000 = **7.391.000VND**, chỉ fixture. |
| Existing Booking compatibility unit | **11/11 PASS** | Request validation, ownership/suspension boundary, idempotency payload conflict/fingerprint; DB NOT USED. |
| Existing RBAC suite | **FAIL — assertion visibility cũ** | Test lấy `options.where.status`; PlaceRepository hiện dùng `{[Op.and]:parts}`, nên APPROVED nằm trong Op.and. Không chứng minh authorization production bị lỗi; cũng không được ghi suite PASS. Test/source production này không sửa trong task. |
| Staging identity + protection | **ACTUAL READ ONLY PASS** | **40/40 fingerprint không đổi**, 17migration, Owner exact ID/SUPER_ADMIN và retained knowledge v2 đúng; DML0. |
| Frontend build/browser | **NOT RUN trong A** | Frontend source/build giữ nguyên; reuse bằng chứng21.37, không chạy lại để tăng số PASS. |
| Migration18 / native hotel FK/transaction/concurrency/rollback | **NOT RUN** | Chưa có fresh authorization cho migration/test target mới; không apply vào existing staging hoặc DB gốc. |
| Browser→API→PG→Hotel AI / Qwen | **NOT RUN** | Không khẳng định Hotel integration hoặc model LIVE READY. |

Evidence [offline-tests-final-v2.json](evidence/travelgo-ai-agent-core/hotel-foundation-20261118/offline-tests-final-v2.json), [verification-results.json](evidence/travelgo-ai-agent-core/hotel-foundation-20261118/verification-results.json), [physical-schema-after.json](evidence/travelgo-ai-agent-core/hotel-foundation-20261118/physical-schema-after.json). Lượt offline đầu34/36 được giữ nguyên; hai lỗi là assertion dùng slug trần thay canonical registry ID `destination:...`. Fixture được sửa theo registry thật; không sửa historical LIVE expected hoặc FAIL evidence. Các lượt36/36 trước bổ sung strict optional-field test cũng giữ nguyên.

### 21.38-A.7. Data protection và migration review boundary

**PostgreSQL DML0; existing migration apply0; original DB access0; Owner/credentials/DPAPI changes0; chat/quota scan0; Ollama GET/POST0; warm-load/inference0; worker cycles0.** Không kiểm RAM/GPU/VRAM. Không thay catalog/reviews/memory/language/knowledge/Trip/Booking/schema hiện hành. API protected READ ONLY PID11916 giữ nguyên, không restart. Không Google Maps/GPS/VPS/paid API/commit/push/deploy.

[Migration review packet](evidence/travelgo-ai-agent-core/hotel-foundation-20261118/migration-review-packet.json) ghi target test mới cô lập, baseline/schema/DDL hashes/exact operations, expected tables/deltas, data impact, backup/restore/compatibility và rollback. Packet **PROPOSED_NOT_APPROVED_NOT_EXECUTED**, không mở quyền staging/production. Native executor/fixture lock cần chốt trước fresh approval/execution; không tái dùng approval task cũ. New isolated tests chưa tạo container/database.

Với persistent target sau này: cần fresh target/role/sentinel và toàn bộ baseline, encrypted backup + verified restore, feature OFF/maintenance và riêng scope migration; không được nới protected40/17 chỉ để chạy. Rollback artifact chỉ hoạt động khi12bảng Hotel rỗng; có dữ liệu thì BLOCK/export/review recovery, không cascade-delete hoặc restore làm mất Booking mới.

Chỉ xem hierarchy website tham khảo iVIVU; Booking.com bị challenge/JS, không bypass. Không scrape rates/reviews/images/counts; attachment task không có image riêng kèm theo. Điều này không chặn foundation, nhưng không tuyên bố đã audit đầy đủ mẫu hình ảnh.

### 21.38-A.8. Handoff và phase gate

Đã chuẩn bị inventory Partner profile/address/media/room/rate/inventory/promotion editors, Admin revision/moderation queue và shared search/results/detail/room/booking/review components. Dữ liệu chỉ từ backend chung, giữ HuGo navy/trắng/cam và existing phù hợp font; không hard-code số khách sạn, giá hoặc điều kiện ưu đãi.

**Remaining blockers:** native migration/concurrency/rollback acceptance; RBAC test assertion cần cập nhật riêng giữ nguyên visibility checks; nullable-coordinate/legacy projection compatibility; concrete authorized PG/read/write/moderation adapters; legacy Booking bypass gate và HotelStay V1 strategy; managed media storage/rights; room review evidence projection và các aspect chưa có; date-aware search filters; actual Partner/Admin/Customer browser acceptance. Các phần này chưa được đánh dấu ACTUAL PASS.

**Dừng sau21.38-A: deliver code/domain offline đã kiểm, schema/API/ERD và compatibility handoff; Hotel module chưa hoàn chỉnh, chưa mở phaseB hoặc redesign, AI integration/model/worker/deploy tiếp tục OFF/NOT RUN.**
