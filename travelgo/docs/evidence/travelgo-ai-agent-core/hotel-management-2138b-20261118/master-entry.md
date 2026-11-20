## 21.38-B — HOTEL NATIVE FOUNDATION, PARTNER MANAGEMENT & ADMIN PUBLICATION

Thực hiện **18–19/11/2026 ICT**, tiếp tục cùng task khi người dùng gửi lại toàn bộ yêu cầu có cùng SHA256. Phiên19/11 có fresh scope/source lock và thời hạn2giờ; không tiếp tục dùng cửa sổ18/11 đã hết hạn. Chỉ nghiệm thu **môi trường Hotel cô lập**; không migrate hoặc bật tính năng trên catalog staging15452.

**Verdict: HOTEL_NATIVE_PARTNER_ADMIN_ACCEPTANCE_PASS_ISOLATED_ONLY.** Native migration/constraints, HTTP và browser Partner/Admin PASS trong phạm vi SYNTHETIC đã kiểm. Backend/frontend build PASS; current-contract RBAC PASS. **Persistent staging migration NOT RUN; HotelStay Booking NOT IMPLEMENTED; new draft thiếu tọa độ BLOCKED422 theo contract Place hiện có; Qwen/worker OFF; production LIVE READY:NO.** Không kết luận toàn bộ Hotel platform hoàn thành.

### 21.38-B.1. Authorization, isolation và baseline

Đọc Master21.37/21.38-A, Hotel foundation và packetA; DDL/rollback ban đầu khớp hash. Người dùng đã cấp quyền mới cho tối đa1môi trường PostgreSQL/PostGIS test riêng, migrations/fixtures/native/backend/browser và cleanup. Không dùng quyền đó cho staging hiện có hoặc database gốc.

[Execution lock](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/execution-lock.json) và [fresh resume lock19/11](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/renewed-source-lock-20261119.json) ghi exact target/sentinel/roles, cached image SHA, resource limits, UUID pool, ports và caps. Target `hugotravel_hotel_test_20261118`, container `hugotravel_hotel_foundation_test_20261118`; sentinel `hugotravel-isolated-test-database-v1`. Cached image `sha256:d96be3a9c16d44e22d34d5c7b6e85be8875addf672672c6cd38171ea6055a94a`, không pull image mới. CPU1/RAM container1024MiB/shm128MiB là giới hạn cấu hình, không đo hoặc đổi RAM/GPU/VRAM hệ thống.

Migration role `hotel_test_admin` tách runtime `hotel_runtime`; runtime được xác minh **không superuser/createdb/createrole**, không quyền tạo Booking và không quyền trực tiếp sửa allocated quantity. Chỉ loopback15453/5058/5178. Dedicated network do task tạo, không ICC/masquerade; không chạm network/container/volume có trước task. PostgreSQL test dùng tmpfs, không dùng volume staging hoặc copy Owner/customer/knowledge/credentials thật.

Docker internal network ban đầu không publish được loopback; đã ghi nhận lỗi và sửa đúng network task-owned. Khi Docker Desktop bị tắt giữa các lượt, dừng native; người dùng mở lại Docker. Phiên19/11 chỉ khởi động lại đúng container test đã tạo, kiểm trạng thái và dựng lại baseline SYNTHETIC trong target riêng khi tmpfs đã mất; không reset/reseed DB hiện có. Baseline thực đạt **40bảng/17migration** trước khi apply18; không sửa counter hoặc migrations1–17 để lấy PASS.

### 21.38-B.2. Migration18 native verdict

**NATIVE PASS** cho source18 cuối: **52bảng/18migration**, đủ12bảng Hotel đúng tên, actual columns/constraints/FK/indexes/tracker. `schema_migrations` được kiểm checksum với source; 17migration cũ không thay đổi.

Migration18 chỉ áp dụng trên target test. Trong quá trình triển khai B bổ sung `hotel_media.alt_text` để quản lý mô tả ảnh và `hotel_profiles.published_snapshot` để so nội dung đã duyệt; snapshot approval được loại khỏi content-change comparison để approval không tự tạo revision mới. Đây là cập nhật artifact chưa từng apply vào persistent staging/production. BảnDDL v1/v2 và receipts native cũ được giữ; source cuối được khóa lại trước nghiệm thu.

Các native invariant kiểm FK khác hotel/room/rate/media, ngày không tồn tại/rate period đảo, giá âm, allocated vượt sellable, duplicate allocation, đủ mọi đêm, rollback cùng revision, nonempty rollback refusal,2connection cạnh tranh có đúng1winner và cancellation trả mọi đêm đúng1lần. **14case PASS** sau một scoped recheck; original native FAIL không bị ghi đè. Ba case attribution bổ sung kiểm actual completed stay, sai author và sai Place; review fixtures luôn PENDING/AI-disabled và ROLLBACK, cuối cùng **reviews0** trong target. Không tạo corpus review thật/giả public.

[Native acceptance](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/native-acceptance.json), [review attribution](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/native-review-attribution.json), [final schema/role proof](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/native-before-cleanup.json).

Lỗi assertion “Missing final night” đầu tiên do deferred guard cấp Booking chặn trước với `HOTEL_BOOKING_ALLOCATION_INCOMPLETE`; vẫn không commit được partial stay. Recheck ép riêng `hotel_item_all_nights` immediate và nhận đúng expected ban đầu `HOTEL_ALLOCATION_ALL_NIGHTS_REQUIRED`. Không đổi expected hoặc nới SQL để che lỗi. Cleanup cuối đã kiểm rollback source18 cuối khi extension rỗng, trở về **40/17** với17checksum nguyên vẹn.

### 21.38-B.3. RBAC current-contract closure

Sửa đúng `rbac.test.ts`: PlaceRepository hiện dùng `where[Op.and]`; assertion không còn đọc `where.status` sai cấu trúc. Kiểm cả APPROVED, business ACTIVE clause, DEMO name/slug exclusion. **Current-contract suite PASS**, không thay production visibility để làm test xanh; FAIL lịch sử21.38-A vẫn giữ nguyên.

Actual HTTP/PG xác nhận public APPROVED positive control, DRAFT/PENDING/REJECTED bị loại, business SUSPENDED bị loại trong khi business khác vẫn hiện, và nguồn DEMO không lọt dù tên/slug không có marker DEMO. Một assertion data-array trong dynamic probe đầu còn yếu; đã giữ receipt đó và chạy **ACTUAL_LEGACY_VISIBILITY** riêng với strict array shape/positive controls đúng response thật của PlaceController.

Actual managed APIs từ chối PartnerB truy cập hotel/media PartnerA, CUSTOMER vào quản lý, roomID khác hotel, businessId giả quyền, approved revision và allocated quantity do client gửi. Admin test là tài khoản SUPER_ADMIN **SYNTHETIC trong DB test**, không phải Owner staging; không đọc Owner credentials/DPAPI hoặc đóng vai Owner duyệt facts thật.

### 21.38-B.4. PostgreSQL adapter, API và guards

**IMPLEMENTED:** `hotels/postgresStore.ts`, `hotels/management.ts`, `routes/hotelRoutes.ts`, tích hợp cùng `routes/api.ts`, `partnerRoutes.ts`, `adminRoutes.ts` và existing auth/BusinessAccessService. Không backend/auth system thứ hai, không `.sync(force/alter)`.

Aggregate read dùng **REPEATABLE READ + READ ONLY**, DB time, explicit DATE/numeric mapping và scope. Managed media/audit/approved snapshot/owner data được đọc trong cùng transaction với aggregate. `HotelReadService` xuất current eligible data, content/commercial revision, sourceVersion/asOf/validUntil, provenance, price basis, promotion conditions và SYNTHETIC/DEMO status; no-store, booking/execution authority=false.

Public: `GET /api/hotels`, `GET /api/hotels/:placeId`, `POST /api/hotels/:placeId/quotes`; quotes chỉ đọc/tính, không giữ phòng hoặc tạo Booking. Managed APIs nằm trong existing Partner/Admin routers. Hotel after-connect guard chỉ chấp nhận test target/sentinel/roleNOSUPERUSER đúng52/18 và exact migration18 digest. Existing environment và frontend flag mặc định OFF; protected launcher40/17 không nới.

Lỗi production code thực tế do browser phát hiện: `SELECT *,stay_date::text ... ORDER BY stay_date` có tên output trùng gây ambiguous column. Đã qualify physical table columns trong ORDER BY; transaction tạo hotel lỗi trước đó ROLLBACK toàn bộ, không có row tạo dở. Raw500/API log và screenshot/FAIL receipt được giữ trước lượt PASS.

### 21.38-B.5. Structured address và compatibility

Lưu house/street/ward/admin/province/tourism/full/normalized address, nguồn/thời điểm và coordinate status. Reuse duy nhất registry34 và `locationsWithCatalog`, kể cả dynamic area IDs như Vũng Tàu trong tỉnh/thành tương ứng; không thêm registry thứ hai. Dấu/không dấu, Đ./Đường, P./Phường và X./Xã được xử lý theo field; full street query bỏ road-prefix lexical, không dùng AI để đoán vị trí.

Actual hai hotel eligible cùng Bùi Thị Xuân ở Đà Lạt/Đà Nẵng chỉ xuất hiện trong đúng destination, không lẫn nhau. Khi publish, canonical address/location được project vào Place **cùng transaction**. Partner content changes chuyển draft, giữ Admin suspension; old Place edit/submit/moderation contract bị chặn cho Hotel-managed records, kể cả khi feature OFF nhưng extension tồn tại.

Audit đầy đủ các nhóm consumer được ghi trong [coordinate compatibility proposal](HUGO_HOTEL_COORDINATE_COMPATIBILITY_PROPOSAL.md): serializer, map, Planner, Recommendation, partner create/edit và catalog projection. Không sửa Planner/Recommendation/geography34 trong B.

**Giới hạn được kiểm thực tế:** new Place/Hotel chưa có tọa độ không thể tạo draft theo schema NOT NULL hiện có; trả **422 trước INSERT**, không tự dùng0,0 hoặc mượn tọa độ Business. Existing Hotel có thể lưu address null pair nhưng phải unpublished; Admin approve409, Hotel public409 và legacy Place404. Đã test khôi phục supplied pair rồi submit/approve đúng revision. Nullable-coordinate migration chỉ PROPOSED, không apply.

### 21.38-B.6. Profile, rooms, rates, inventory, promotions

Partner quản lý profile qua Place identity và Hotel extension: subtype, tên/mô tả/amenities/services, check-in/out, child/pets/smoking/general policies. Room editing có area/bedrooms/bathrooms/beds, capacities, supplied view/UNKNOWN, nullable booleans và room-specific amenities; archive không xóa reference đã đặt.

Rate VND/PER_ROOM_NIGHT, periods, occupancy/child bands/extra guest, meals/cancellation/tax/fees và version. Calendar override/closed days, inventory batch≤90ngày, readonly allocated và server version checks. Partner không giảm sellable dưới allocation hoặc tự sửa allocated. Promotion một lựa chọn, explicit scope/date/min nights/value/version; không stacking, giá gạch ảo hoặc countdown giả.

Mutable APIs strict fields/types, server IDs, If-Match, scoped row locks và transaction/audit. Scoped UUID injection chỉ từ locked test launcher, không nhận ID tùy ý của client. Quote không suy Place.priceFrom thành giá phòng; thiếu thuế/phí/tồn không thành giá0 hoặc available mặc định.

Oracle độc lập actualHTTP:2phòng/2đêm, đêm1=1.000.000/đêm2=1.200.000, giảm10% ⇒ **3.960.000VND**. Đổi base thành1.100.000 ⇒ **4.140.000**; đổi calendar đêm2 thành1.300.000 ⇒ **4.320.000**; hết/không chọn promotion ⇒ **4.800.000**. Đây chỉ là dữ liệu SYNTHETIC test, không phải giá khách sạn thật.

### 21.38-B.7. Shared media và storage

`services/imageStorageService.ts` là shared raster/storage core, `hotels/media.ts` xử lý ownership/metadata Hotel. Kiểm bytes/signature/decode, JPEG/PNG/WebP,10MiB,16–8000px/25MP, không animation, re-encode WebP và strip EXIF. Không tin filename/MIME client hoặc mở external URL fetch. Keys server-generated, namespace UUID, mode0600 trên OS hỗ trợ, root persistent/configurable Linux nằm ngoài build output.

Hotel/room upload, authenticated preview, caption, cover/move-to-front, vị trí metadata và archive kết nối API thật; rights declaration và Admin moderation trước public serving. Gallery ordering V1 dùng cover/move-to-front; chưa làm drag-and-drop editor. Scoped ownership/path traversal và rights/publication checks không bị bypass. Không sao chép ảnh từ website tham khảo; test dùng generated SYNTHETIC pixels.

Rollback upload dọn file mới khi DB thất bại; có explicit bounded orphan cleanup giữ referenced/young files và không follow symlink, **không schedule worker**. Actual API restart giữ file và DB revision; decode WEBP/EXIF strip đã kiểm. Ba object test cuối đã xóa đúng key/hash.

### 21.38-B.8. Partner/Admin UI và browser

Frontend `/partner/hotels` có10tab thật: overview/profile/address/images/rooms/rates/inventory/promotions/policies/review status. Các form gọi authenticated backend trên DB riêng; loading/error/empty/conflict, Save/cancel/dirty state và control labels tiếng Việt. `/admin/hotels` reuse Admin layout/auth để xem owner Business/representatives, details, media review, revision/approved snapshot comparison, reasoned approve/reject/suspend và audit history.

Browser thật **Microsoft Edge**: desktop1440×1000 và mobile viewport390×844 emulation, không phải thiết bị vật lý. Login đi qua existing scrypt/AuthService, không mocked success. Customer/Partner/Admin authorization kiểm riêng bằng HTTP với4account SYNTHETIC; secrets chỉ trong RAM phiên test, không ghi source/log/Master/chat. Không lấy personal Edge profile hoặc DPAPI.

Đã sửa hai vấn đề UI/harness rõ ràng: select cần accessible label tường minh; harness date locator được scope đúng rate form khi có2date control trùng nhãn. Lỗi React thực tế sau Save mobile giữ captured initial cũ đã sửa bằng latest authoritative props/ref và synchronization; **FINAL_MOBILE_SAVE_STATE** kiểm input=DB và dirty marker đã xóa, sau đó Admin review đúng revision mới. Ảnh final được scroll về đầu trang trước capture để sticky header không nằm giữa full-page screenshot.

Ảnh nghiệm thu:

- [Profile editor](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-profile-editor.png), [room list](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-room-management.png), [room editor](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-room-editor.png).
- [Gallery manager](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-image-gallery.png), [rate calendar Save](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-rate-calendar-save.png), [inventory](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-inventory-calendar.png), [promotion](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-promotion-management.png).
- [Admin publication final](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-admin-publication-final.png), [mobile final](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-mobile-management-final.png).

### 21.38-B.9. Dynamic common data acceptance

**ACTUAL HTTP/BROWSER PASS** cho B01–B14 và các check liên quan, tổng **25record PASS** (có setup/readiness và affected rechecks; không trình bày là25journey độc lập). Rate/calendar Save được phản ánh bởi common PostgreSQL read/quote; inventory5→3, đêm cuối closed thì quote409, mở lại đọc3; expiry theo server clock thật loại promotion và clip validUntil, future-start không được dùng. Room amenity update không public trước review, sau approval hiện đúng KITCHEN/boolean; suspend/archive làm dữ liệu không eligible. Batch conflict rollback cả first-row update và revision.

V1 fresh reads/no-store, không thêm broker/cache riêng cho AI. Task chỉ nghiệm thu common data source/read contract; **AI nhận giá mới, Browser→Qwen→Tools và21.40 NOT RUN**. Không retrain hoặc sửa AgentCoreService/Qwen.

### 21.38-B.10. Booking/review compatibility

Existing BookingService chặn Hotel có extension đi qua legacy Place.priceFrom path, kể cả feature OFF khi extension có trong DB. Actual POST legacy hotel Booking409 và không tăng Booking/allocation. Existing tour/ticket/restaurant paths, idempotency/fingerprint/history/lifecycle giữ nguyên; affected Booking unit **11/11 PASS**.

Không implement HotelStay confirm/payment engine trong B. Native allocation chỉ trong SQL test riêng. Review/ReviewInsight engine không đổi; booked-room attribution guard được kiểm cả positive completed-stay control và negative author/target; không gán property review chung cho room hoặc tạo public review corpus. Handoff D/E còn nguyên.

### 21.38-B.11. Targeted tests/build và evidence

| Lớp bằng chứng | Kết quả |
|---|---|
| Hotel foundation unit/read-port | **37/37 OFFLINE PASS** sau source cuối. |
| Shared image decode/privacy/storage/orphan tests | **8/8 OFFLINE PASS**; generated buffers/temp directory riêng. |
| Booking compatibility | **11/11 OFFLINE PASS**; không PostgreSQL persistence claim. |
| Current-contract RBAC | **OFFLINE PASS**, actual visibility/ownership kiểm riêng qua live HTTP/PG. |
| Migration/constraints/concurrency/cancel | **NATIVE PASS**,14invariants +3review attribution cases; rollback empty/refusal thực tế. |
| Backend TypeScript | **PASS** với model-off preload. |
| Frontend TypeScript + default OFF build | **PASS**; Hotel management tree-shaken về disabled wrapper. |
| Separate feature-enabled frontend build | **PASS**, Hotel chunk≈33.49kB; output test riêng đã cleanup, không đổi default flag. |
| HTTP + real browser | **PASS**25records,0page errors; desktop/mobile viewport, no successful-response mocks. |
| Qwen/Ollama/worker/production deploy | **NOT RUN / OFF**. |

Không chạy lại toàn bộ Agent benchmarks. TypeScript printer chỉ format new/Hotel files; canonical compiled backend AST9files khớp trước/sau. Preserve failed native/harness/browser/SQL logs và screenshot trước fix; các source/input/expected locks theo phiên bản không ghi đè. Không sửa oracle sau khi xem giá output.

[Verification results](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/verification-results.json), [final HTTP/browser source lock](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/browser-http-manifest-final.json), [journey records](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/journey-state.json), [feature build proof](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/feature-enabled-build-proof.json).

### 21.38-B.12. Cleanup và protected data

**121/160 mutation attempts** theo conservative application budget, bao gồm setup/login/negative probes và failed attempts; không phải Agent turns. Account/candidate quota/model quota không bị đổi hoặc dùng để vượt policy; **Agent chat0, model metadata0, native model POST0, warm-load/inference0, worker cycles0**. External optional frontend CSS/font requests bị abort trong browser test; không thu thập business data hoặc dùng paid API/Maps/GPS.

Cleanup exact task IDs và audits của SYNTHETIC actors, không unrelated rows. Source18 cuối rollback được khi12bảng rỗng, test trở về40/17 và17checksum không đổi. File cleanup ban đầu EBUSY do test harness `sharp(file).metadata()` giữ libvips cache trên Windows; DB rollback đã hoàn tất trước đó. Đã giải phóng **cache của chính phiên harness**, xóa đúng3file theo key/hash và các thư mục rỗng, không đổi tài nguyên/process khác. Sau đó dừng đúng API/frontend task-owned, xóa đúng container/network đã tạo và xác minh các port15453/5058/5178 không còn listener. Test build directory riêng cũng đã xóa sau hash receipt.

[Native cleanup/rollback](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/native-cleanup-rollback.json), [owned resources cleanup](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/cleanup.json).

Fresh READ ONLY sau cleanup: **40/40 fingerprint staging không đổi,130Place/20Business,17migration**, đúng Owner `bae330d6-c3cb-462e-839e-cf07d73a64d2`/SUPER_ADMIN role `fe016c5b-63a1-4e9a-9938-465aaae58f69`, retained knowledge `467bd60b-27ab-42ad-a450-b3076a4215c3` version2. [Staging after proof](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/staging-after.json). **Staging DML0/migration0; original DB connections0**, không truy cập27Trip ở DB gốc. Không seed/reset/touch real credentials/DPAPI.

**25protected hashes** của freeze26 giữ nguyên (AppRouter là thay đổi Hotel route đã được yêu cầu); Agent Core backend/source/compiled và guards không đổi. Evidence21.37 **67/67**, phaseA **15/15** hash giữ nguyên; historical Master prefix không đổi. Không commit/push/deploy hoặc thay .env/Windows ExecutionPolicy/đóng ứng dụng khác.

### 21.38-B.13. Persistent migration packet và remaining gates

[Persistent staging migration review packet](evidence/travelgo-ai-agent-core/hotel-management-2138b-20261118/persistent-staging-migration-review-packet.json) là **PROPOSED_NOT_APPROVED_NOT_EXECUTED**: frozen target identity/baseline, final DDL/checksum,12empty tables,40→52/17→18,39non-tracker fingerprint không đổi và exact tracker delta, protected Owner/knowledge/catalog, role/maintenance/runtime compatibility và empty-only rollback/recovery.

**Encrypted backup NOT CREATED; verified restore NOT RUN** trong task. Packet yêu cầu secure key custody, backup ngoàiGit và restore rehearsal trên target riêng được phê duyệt trước persistent migration. Không copy sensitive staging data vào SYNTHETIC target để giả nghiệm thu restore. Runtime Hotel hiện test-only; persistent staging cần profile/role/sentinel/dependency/media/feature-OFF handoff được review riêng, không nới existing40/17 launcher.

Remaining: new draft không có tọa độ cần proposal/migration compatibility riêng; advanced drag-and-drop gallery ordering chưa có (V1 cover/move-to-front); HotelStay booking/policy cancellation và customer room-review integration thuộcD/E; public commercial search filters/detail UX/real partner onboarding chưa phải nghiệm thu đầy đủ platform. Không tuyên bố production/LIVE READY từ một cohort test.

### 21.38-B.14. Handoff21.38-C và điểm dừng

Đã có foundation/persistence/auth/publication/media và common read contracts để phaseC xây homepage/hotel search theo HuGo navy/trắng/cam, reuse geography/backend và licensed assets. C cần URL-preserved criteria, đúng supported server filters, current-price basis/availability uncertainty/DEMO labels, responsive/accessibility; không dùng Place.priceFrom thành giá phòng xác nhận hoặc dựng số lượng/ưu đãi giả. Khóa source/runtime/data scope mới trước actual acceptance; không reuse container/credentials đã cleanup.

**Dừng sau21.38-B. Chưa bắt đầu21.38-C,21.40 hoặc21.41; không bật Qwen/worker, không persistent migration, không VPS/paid API/commit/push/deploy.**
