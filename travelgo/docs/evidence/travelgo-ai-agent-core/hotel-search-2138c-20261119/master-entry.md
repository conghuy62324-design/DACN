## 21.38-C — HOTEL HOMEPAGE & ADVANCED HOTEL SEARCH REDESIGN

Thực hiện19/11/2026 ICT, sau21.38-B. **HOTEL_CUSTOMER_SEARCH_ACCEPTANCE_PASS_ISOLATED_ONLY**: IMPLEMENTED, OFFLINE PASS, ACTUAL HTTP PASS và ACTUAL BROWSER PASS trong phạm vi SYNTHETIC đã kiểm. Preview localhost được giữ READ ONLY để owner xem. **Persistent staging migration NOT RUN; HotelStay Booking/payment NOT IMPLEMENTED; production ready:NO; Qwen/Ollama/worker OFF.**

### 21.38-C.1. Audit, kiến trúc và giao diện

Đã đọc Master A/B, Hotel foundation/coordinate proposal và source/evidence B; audit HomePage, HotelsPage, Explore/Place detail/router/layout, Navbar/Footer, LocationCombobox, catalog filters, AuthContext/API client và responsive styles. Giữ một application/router/auth system; không sửa RecommendationService/Planner/geography34/Agent Core. Existing service routes vẫn giữ.

Tham khảo hierarchy/search/destination sections của [iVIVU](https://www.ivivu.com/), không sao chép marketing/business data/assets/code. [Booking.com](https://www.booking.com/index.vi.html) yêu cầu xác minh robot; không bypass hoặc thu thập assets. Homepage mới navy/trắng/cam, hero minh họa gốc có nguồn, thanh tìm kiếm nổi bật, liên kết dịch vụ thật, curated destinations theo canonical IDs, loại lưu trú đang support, danh sách đã duyệt/mới duyệt/có ưu đãi và section promotion có điều kiện. Không dựng popularity/countdown/giá gạch/Booking analytics. Footer bỏ địa chỉ/hotline/social-link giả; chỉ hiển thị contact nếu đã cấu hình và route điều khoản/privacy thực có.

Routes: `/` chung; `/hotels` landing; `/hotels/search` results; `/places/:id` giữ canonical detail và stay/promotion criteria. `/hotels/:id` vẫn hoạt động. Legacy `/hotels?city=…&search=…`/`locationId` được đưa vào search; existing Place Hotel link không có query cũng nhận native Hotel projection khi Hotel feature được bật, tránh hiển thị old Booking CTA. Header desktop/mobile có Khách sạn/Nhà hàng và các dịch vụ đang có, account menu vẫn dùng AuthContext hiện hành.

Source chính: `HotelLandingPage.tsx`, `HotelSearchPage.tsx`, `HotelPublicDetail.tsx`, `components/hotels/{SharedHotelSearchBar,HotelResultCard,useHotelSearch}`, `utils/hotelSearchState.ts`, scoped `styles/hotels.css`; sửa HomePage/HotelsPage/PlaceDetail wrapper, AppRouter, Navbar/Footer. Không tạo site song song.

### 21.38-C.2. Search bar, URL và ảnh

Shared search bar có geography picker hiện có (tỉnh/thành khác địa danh), tên/đường/khu vực + gợi ý từ eligible Hotel API, ngày nhận/trả native browser, số đêm, khách/phòng và tuổi từng trẻ. Guest panel desktop/mobile phân bổ **từng phòng**; thiếu tuổi hoặc ngày sai bị chặn, không tự bỏ trẻ hay suy tuổi. Location keyboard navigation/loading/empty/error reuse component hiện có; hotel suggestions có loading/empty/failure message. Native date inputs hỗ trợ lịch/tháng của browser; không dựng calendar giả.

Draft chưa submit trên landing dùng React Router history state để Back/reload giữ ngày và tuổi trẻ; không thêm private identity/auth. [Actual history draft](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/actual-landing-back.json). URL giữ criteria/filter/sort/page và JSON room allocations không có danh tính riêng tư/token. Destination click giữ ngày/khách/phòng và canonical ID từ existing geography API; không duplicate registry. Reload/back/forward/chia sẻ/reset/chip removal được kiểm thực tế. Đổi filter reset page1. AbortController và kiểm aborted signal ngăn response cũ ghi đè; actual recheck có1request hủy khi trì hoãn dispatch, không mock success response.

Ảnh:5SVG phong cảnh gốc của repository và raster SYNTHETIC tự tạo cho preview. Có [asset/source/rights manifest](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/asset-rights-manifest.json), alt text, stable aspect ratio, lazy loading và fallback; **không phải ảnh khách sạn/địa danh thực tế**, có nhãn minh họa. Không hotlink/scrape iVIVU/Booking hoặc dùng ảnh cơ sở khác. Final screenshots được scroll tải ảnh, kiểm decode rồi chụp và xem trực quan1440px/390px; screenshots đầu thiếu ảnh ngoài viewport do lazy-load được giữ, không dùng thay final evidence.

### 21.38-C.3. Commercial search API và common source

`hotels/commercialSearch.ts` mở rộng `GET /api/hotels` bằng strict DTO; giữ alias `sort=name` và ward query của B. `readModel.ts` tìm fulltext name/address/city/province đã chuẩn hóa bằng SQL parameterized, gồm tên đường + địa danh; không sửa historical address hoặc đoán tọa độ. `postgresStore.ts` đọc batch snapshots; existing HotelReadService và pricing/inventory vẫn là authority chung. Không có search DB/AI price table riêng.

Trong **một REPEATABLE READ + READ ONLY transaction**, API lấy DB time, scoped IDs, các bảng theo batch và aggregate PUBLISHED Place reviews. Không gọi DB riêng từng hotel. V1 cap60candidate hotels,600active rates toàn scope/80mỗi hotel,8promotion mỗi rate và6000row mỗi batch table, statement timeout5giây; vượt cap trả422 yêu cầu thu hẹp, không giả total từ phần bị cắt. Filter, exact total, stable sort và pagination thực hiện ở backend; client không tính giá cuối.

Filter đã implement và kiểm typed/actual theo phạm vi: tên/địa điểm/đường/phường, giá **tổng kỳ lưu trú VND** khi có ngày, accommodation subtype, verified stars, published-review rating, property/room amenities, view, capacities theo room allocation, bedrooms/bathrooms, promotion, breakfast, cancellation và toàn bộ các đêm tồn phòng. Mọi room/rate condition phải khớp **cùng hạng phòng/gói giá** phục vụ mọi phòng yêu cầu. Chưa phối hợp các hạng phòng khác nhau; có nhãn/contract giới hạn, không tự chia lại nhu cầu.

Sort: tên ổn định cho “phù hợp”, giá tăng/giảm cùng dates/occupancy/STAY_TOTAL, rating thật và `places.approved_at` cho mới duyệt. Không suy mới duyệt từ commercial revision hoặc ngày đổi giá, không popularity score giả. Price min/max lọc các offer phù hợp trước khi chọn offer tốt nhất của từng hotel. No-date không nhận price-sort/range thiếu basis, availability UNKNOWN; reference rate có nhãn, không thành confirmed total.

Public eligibility giữ Place APPROVED/Business ACTIVE/exact approved content revision/approved rights media; DEMO/testOnly không được coi là real production. Public media endpoint cũng chặn DEMO/testOnly ngoài test profile. Projection có selected room/rate/quote, canonical address/destination, provenance, content/commercial revision, sourceVersion/asOf/validUntil, promotion conditions và DEMO. Không dùng Place.priceFrom/Bayesian prior/view từ tên hoặc review opinion làm tiện nghi.

### 21.38-C.4. Cô lập và physical schema

User task cấp đúng1môi trường mới. [Execution lock](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/execution-lock.json) khóa target `hugotravel_hotel_search_test_20261119`, cached imageSHA, sentinel `hugotravel-isolated-test-database-v1`, migration/runtime role, fixture UUIDs, ports15454/5059/5179 và caps. DB container1CPU/1024MiB/shm128MiB, dedicated network và **volume riêng của C**; loopback-only. Không reuse container/credentials B đã cleanup, không copy Owner/customer/knowledge staging.

Physical baseline thật **40bảng/17migration**, sau apply unchanged reviewed1–18 **52/18**. Migration18 digest giữ nguyên B (`553d0b6f23955cce8633b25447b4bb47d3c073e0194ac5b33367ea9009f09d19`); không thay migration/nullable coordinate/schema contract. Không chạy lại14+3native B invariants vì SQL source không đổi; kết quả đó là historical B, không cộng thành test mới của C. [Native schema](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/native-schema.json).

Initial readiness helper dùng `ps -p` không có trên BusyBox; FAIL được giữ. Đã dùng `/proc/1/comm` và resume đúng owned container/volume, không tạo môi trường thứ hai. Resume guard ban đầu cũng bắt occupied DB port của chính container; đã sửa ownership-checked resume, không bỏ collision guard của target khác. Migrations/fixtures chỉ bắt đầu sau native lock/readiness đạt.

### 21.38-C.5. Actual acceptance và freshness

Actual React → HTTP → PostgreSQL qua Microsoft Edge desktop1440×1000/mobile viewport390×844 (emulation, không phải physical phone), successful API mocks0/page errors0. C01–C17 được phủ bởi17record nhóm trong [journey state](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/acceptance-state.json), [actual acceptance](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/actual-acceptance.json), [freshness](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/actual-freshness.json), [final visual/deep-link/cancellation](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/actual-final-browser.json). Không coi17record nhóm là17journey độc lập.

Oracle độc lập SYNTHETIC An Nhiên:2đêm/1phòng,1.000.000+1.200.000=2.200.000, giảm10%=220.000, thuế10% phần còn lại198.000 và fee50.000 ⇒ **2.228.000VND**. Partner đổi base1.100.000 ⇒ **2.327.000**; promotion20% ⇒ **2.074.000**; sau expiry theo **clock server thật** ⇒ **2.580.000** không giảm. Browser đọc đúng giá mới/source version đổi. Không sửa expected của các oracle này.

Missing/closed đêm cuối/unknown tax bị loại, stock không thành available/0. Hai hotel Bùi Thị Xuân tại Đà Lạt/Đà Nẵng tách scope đúng; đắt hướng hồ + rẻ hướng phố không thể ghép thành rẻ hướng hồ. Archive phòng/unapproved content và suspend Hotel/Business bị loại ngay retrieval kế tiếp. Actual totals/pagination kể cả trang rỗng đúng; family child age5 được tính phí đúng.

List và detail đều **ẩn giá khi hết validUntil**, explicit reload lấy giá mới và focus/navigation revalidate khi expired; không interval polling. [Detail expiry real-clock](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/actual-detail-expiry.json) chờ≈61giây thật, không giả clock: giá cũ biến mất rồi reload hiện fresh quote. Canonical detail giữ placeId/stay/selected promotion và không có Booking/payment action. Booking rows/allocation rows0.

Additional typed filter matrix **15/15 ACTUAL HTTP PASS v2**, gồm stars/review/property+room amenities/capacity/room dimensions/refund/breakfast/promo/min-max/sorts, response no-store. [Evidence v2](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/actual-final-http-filters-v2.json). **V1 có FAIL assertion**: expected chỉ B cho minPrice1,5m đã bỏ sót offer hướng hồ4m của A. Source contract lọc offer trước rồi chọn matching offer; cả A4m/B2,228m hợp lệ. [Oracle clarification](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/price-lower-bound-oracle-clarification.json) giữ nguyên V1/FAIL và khóa V2 trước GET; không sửa product để che lỗi. Các max-price+view/breakfast oracle ban đầu giữ nguyên.

Final browser lượt đầu cũng FAIL do driver điều hướng trước API vừa restart sẵn sàng; đã bổ sung actual HTTP200/scope readiness trước targeted recheck, giữ receipt FAIL. Detail-expiry helper đầu throw trên optional external CSS thay vì abort, dừng trước case; đã sửa network deny handling, giữ receipt rồi kiểm clock thật. Không xóa FAIL hoặc thay successful response bằng mock.

### 21.38-C.6. Offline/build và bảo toàn

| Lớp | Verdict |
|---|---|
| Commercial search typed/semantic/price cases | **12/12 OFFLINE PASS** |
| Affected Hotel foundation/read-port/address/pricing | **37/37 OFFLINE PASS** |
| Frontend URL/privacy/room-age/date/legacy criteria | **13assertions OFFLINE PASS** |
| Backend TypeScript | **PASS**, model-off preload |
| Frontend TypeScript/default Hotel OFF build | **PASS** |
| Separate Hotel-enabled frontend build | **PASS**, output riêng có hash proof |
| C01–C17 HTTP/browser | **ACTUAL PASS trong phạm vi SYNTHETIC**, final screenshot/cancellation/expiry receipts riêng |
| Additional HTTP matrix | V1 assertion FAIL preserved; **v2 15/15 PASS** |
| Media8/8, Booking11/11, legacy RBAC B | **Historical PASS preserved**, source liên quan không đổi nên không rerun để tăng số test |
| Qwen/Agent benchmarks/worker/paid API/Maps | **NOT RUN/OFF** |

Không chạy lại toàn bộ AI benchmark hoặc sửa AgentCoreService/RecommendationService/Planner/geography34. [Verification results](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/verification-results.json). Không .env/default feature switch, không Windows ExecutionPolicy/Owner/DPAPI changes, không commit/push/deploy.

Fresh READ ONLY trước/sau: staging **40/40 fingerprint không đổi**,40bảng/17migration,130Place/20Business; Owner/SUPER_ADMIN exact IDs và knowledgev2 giữ nguyên. [Staging after](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/staging-after.json). Original database/27Trip không truy cập. Migrations1–18 và protected Core25hashes giữ nguyên; evidence21.37/A/B giữ nguyên byte hashes; Master chỉ append, không ghi đè historical prefix.

### 21.38-C.7. Cleanup và preview owner

Fixture setup108DML giới hạn; controlled mutations qua API **7attempts** (1login SYNTHETIC+6Partner writes), zero Agent chat/quota/model/worker operations. Toàn bộ request/evidence trong cap đã khóa; public preview GET của owner sau handoff tách khỏi acceptance automation, không mở write capability.

Đã cleanup đúng user/role/membership/audits tạm,2hotel DRAFT/SUSPENDED controls và ảnh tương ứng, promotion expired negative fixture. Còn **6Place/6Hotel profile,1Business,6managed image** SYNTHETIC cho owner xem; private users/reviews/knowledge/Booking/allocation0. Restore synthetic base/promotion sau test có receipt riêng, không sửa expected/evidence đã ghi. Runtime role revoked mọi table DML và default transaction READ ONLY đã kiểm trên connection mới. [Final native preview](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/native-preview-final.json), [fixture cleanup](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/preview-fixture-final.json).

**Preview đang chạy tại thời điểm chốt HTTP verification**, cùng owned container/volume đã stop/start và giữ dữ liệu/media. Đã mở trang chủ trong browser. Không tự bật Hotel ở staging5177/5057.

- Home: http://127.0.0.1:5179/
- Hotel landing: http://127.0.0.1:5179/hotels
- Sample: http://127.0.0.1:5179/hotels/search?locationId=destination%3Ada-lat&checkIn=2028-02-28&checkOut=2028-03-01&view=LAKE&maxPrice=2300000
- [START_PREVIEW.cmd](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/START_PREVIEW.cmd), [STOP_PREVIEW.cmd](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/STOP_PREVIEW.cmd). Node launcher dùng relative repository paths, xác minh source/schema/image/volume/sentinel/owned processes, không seed/migrate/tạo môi trường khác; nếu thiếu target hoặc source lệch thì BLOCKED. Stop chỉ task C và giữ volume. Docker daemon phải đang chạy.

Live runtime status/log/model-off audits nằm `.local/hotel-2138c-preview/` để không làm thay đổi sealed evidence sau khi owner dùng preview. Credentials runtime crypto-random chỉ trong memory; không Owner credentials/DPAPI, không plaintext password/token trong report/log/Git.

### 21.38-C.8. Screenshots, remaining gates và handoff D

- [Homepage desktop](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/homepage-desktop-final.png), [homepage mobile](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/homepage-mobile-final.png), [hero/search](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/hero-search.png).
- [Destination grid](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/destination-grid-final.png), [promotion section](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/promotion-section-final.png).
- [Search desktop](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/search-desktop-final.png), [search mobile](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/search-mobile-final.png), [combined filters](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/combined-filters-final.png).
- [Guest selector](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/guest-selector.png), [mobile date/search](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/mobile-date-selector.png), [updated price/promotion](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/updated-price-promotion.png).
- [Empty](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/empty-state.png), [real failed transport/error](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/error-state.png), [canonical detail](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/canonical-detail-final.png), [expired detail](evidence/travelgo-ai-agent-core/hotel-search-2138c-20261119/detail-expired-real-clock.png).

Remaining: persistent staging migration/encrypted backup/verified restore chưa thực hiện; runtime Hotel vẫn test-only; chưa có real partner photography/business onboarding/production scale test; nullable-coordinate blocker422 của B giữ nguyên; multi-room khác hạng chưa support. Room-review integration, HotelStay confirmation/payment/idempotency/atomic allocation/cancellation thuộc D/E. Common data source sẵn để AI đọc sau21.40 nhưng **Browser→Qwen→Tools NOT RUN**, không sửa AI hoặc tự mở D.

Handoff D phải reuse BookingService, recheck exact quote/source/occupancy/promotion/stock under deterministic locks, enforce confirmation/idempotency and bảo toàn dịch vụ cũ; cần authorization/scope riêng. [Customer search contracts/preview guide](HUGO_HOTEL_CUSTOMER_SEARCH.md). **Dừng sau21.38-C. Không production activation, Qwen/worker, Maps/GPS, VPS, commit/push/deploy.**
