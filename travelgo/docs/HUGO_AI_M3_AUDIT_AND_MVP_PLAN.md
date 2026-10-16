# HuGo Intelligence 2.0 — M3-A Recommendation Audit & MVP Plan

Ngày audit: 2026-10-15 (Asia/Ho_Chi_Minh)  
Trạng thái: **AUDIT COMPLETE — M3 IMPLEMENTATION NOT STARTED**  
Phạm vi: recommendation heuristic/Bayesian, frontend demo flow và liên kết itinerary  
Không thuộc phạm vi: Learning-to-Rank, model mới, sentiment production, migration mới, ghi database hoặc deploy

## 1. Kết luận điều hành

HuGo đã có một nền móng recommendation đáng kể và có thể tái sử dụng cho đồ án:

- candidate Place lấy từ PostgreSQL và chỉ lấy `APPROVED`;
- Bayesian Average, preference match, budget fit và Haversine distance đã có;
- API recommendation có request ID, score breakdown, reason code, câu giải thích và version;
- candidate, visible impression, click, Favorite và booking attribution đã có source of truth;
- Favorite server-side và itinerary save/reopen đã chạy end-to-end trong các test M1.

Tuy nhiên, **luồng recommendation mà người dùng có thể nhìn thấy hiện chưa đạt M3-MVP end-to-end**. Explore luôn gửi `explicitPreferences: []`, không có input ngân sách và không hiển thị `why`/score breakdown. Ranking API còn tính điểm trước khi áp dụng filter điểm đến, làm distance anchor và fallback không đúng ngữ cảnh. Từ Place Detail chưa có thao tác thêm địa điểm vào lịch trình; `mandatoryPlaceIds` chỉ tồn tại trong type/controller nhưng bị `TourPlannerService` bỏ qua.

Kết luận khả thi: M3-MVP có thể hoàn thành trong khoảng **2–3 ngày làm việc**, không cần migration và không cần model ML. Phạm vi nên khóa ở `Place` catalog gồm attraction/hotel/restaurant, weighted heuristic có giải thích, anonymous/cold-start fallback, và một cầu nối tối thiểu sang planner.

## 2. Phạm vi và phương pháp audit

Đã đọc và đối chiếu trực tiếp:

- backend controller/route/service/repository/model cho Place, Tour, Recommendation, Review, Favorite, Telemetry, Booking và Trip;
- frontend Home, Search, Explore, Place Detail, Hotels, Restaurants, Tours, Favorites, Tour Planner và Trip Detail;
- migration 01–10, đặc biệt 03–10;
- test thuật toán, recommendation PostgreSQL, Favorite, Review và Playwright Customer flow;
- báo cáo M1 Task 1–5, kế hoạch M2-MVP, implementation roadmap và tài liệu thuật toán.

M3-A không kết nối PostgreSQL, không chạy write test, không chạy migration và không chạy lại production build. Kết quả test trong báo cáo này được phân biệt rõ là **historical execution evidence** từ M1; kết luận implementation dựa trên source hiện tại.

## A. Kiến trúc recommendation hiện tại

### A1. Luồng authenticated Explore

```text
ExplorePage
  -> POST /api/intelligence/recommendations (JWT bắt buộc)
  -> RecommendationExposureService
       -> kiểm payload/identity/consent
       -> RecommendationRepository -> PlaceRepository.list(publicOnly=true, limit=100)
       -> RecommendationService.recommendPlaces()
       -> lọc category/city/search/minRating và limit
       -> transaction: recommendation_requests + recommendation_candidates
  <- requestId + ranked Place + scoreBreakdown + reasonCodes + why
  -> PlaceSidebar render card
  -> 50% viewport trong 2 giây
  -> POST /recommendations/visible
  -> click/Favorite/booking chỉ attribution khi visible impression đã được server xác minh
```

Implementation chính:

- `backend/src/services/recommendationService.ts`
- `backend/src/services/recommendationExposureService.ts`
- `backend/src/repositories/recommendationRepository.ts`
- `backend/src/repositories/placeRepository.ts`
- `backend/src/controllers/intelligenceController.ts`
- `backend/src/routes/intelligenceRoutes.ts`
- `frontend/src/services/recommendationService.ts`
- `frontend/src/pages/ExplorePage.tsx`
- `frontend/src/components/explore/PlaceSidebar.tsx`
- `frontend/src/hooks/useRecommendationVisibility.ts`

### A2. Luồng anonymous/cold-start

`POST /api/intelligence/recommendations` bắt buộc JWT. Khi chưa đăng nhập, `ExplorePage` gọi public `GET /api/places` và nhận Place `APPROVED`, mặc định sắp xếp theo `bayesianRating DESC`. Đây là fallback chức năng hiện có, nhưng không có request ID, explanation hay impression tracking.

Người dùng đã đăng nhập nhưng chưa bật personalization vẫn gọi Recommendation API. Backend đặt preference hiệu lực thành `[]`; quality/budget/distance vẫn chạy và analytics opt-out không tạo visible impression/event.

### A3. Hai catalog khác nhau

Source hiện có hai khái niệm dễ nhầm:

1. `places`: có category `tour | attraction | hotel | restaurant`; RecommendationRepository chỉ đọc catalog này.
2. `tours`: bảng/package tour riêng, có capacity, itineraryDays, `priceVND` và API `/api/tours`; chưa đi qua RecommendationService.

Vì vậy filter `category=tour` trong Explore hiện là Place category, **không phải recommendation cho TourPackage**. Ticket cũng chưa thuộc candidate retrieval của API recommendation hiện tại.

### A4. Công thức xếp hạng

Backend dùng cấu hình version `weights-q35-p25-b25-d15-v1`:

```text
finalScore = 0.35 * qualityScore
           + 0.25 * preferenceScore
           + 0.25 * budgetScore
           + 0.15 * distanceScore
```

- `qualityScore`: Bayesian Average chia cho 5.
- `preferenceScore`: so keyword của preference với name, summary, description, highlights và amenities.
- `budgetScore`: soft score theo `priceFrom / dailyBudgetPerPerson`; không phải hard budget constraint.
- `distanceScore`: Haversine tới `centerCoords`; API hiện không nhận center nên dùng tọa độ candidate đầu tiên làm mỏ neo.
- explanation: preference, Bayesian quality và budget fit.

Bayesian backend dùng:

```text
S = (v / (v + m)) * R + (m / (v + m)) * C
m = 10, C = 4.20 theo cấu hình hiện tại
```

ReviewService cập nhật rating/reviewCount/bayesianRating từ review `PUBLISHED`. Place public list mặc định dùng cột `bayesian_rating`; RecommendationService tính lại Bayesian từ rating/reviewCount.

### A5. Persistence, consent và privacy

Migration hiện có đủ cho MVP:

| Dữ liệu | Bảng/cột | Vai trò |
|---|---|---|
| explicit Trip preferences | `trip_sessions.preferences` | dữ liệu chức năng của Trip |
| selected Place trong Trip | `trip_sessions.selected_place_ids`, `itinerary` | đủ để nối Place vào planner, chưa có UI/API chuyên biệt |
| functional Favorite | `user_favorites` | source of truth theo user/place |
| Review quality | `reviews` + `places.rating/review_count/bayesian_rating` | Bayesian source |
| Consent | `user_telemetry_consents` | analytics/personalization opt-in |
| Recommendation request | `recommendation_requests` | identity, filter, preference snapshot, versions, consent, TTL |
| Ranked returned items | `recommendation_candidates` | rank, score, breakdown, reason code |
| Visible exposure | `recommendation_visible_impressions` | server-verified 50%/2 giây |
| Outcomes | `user_events`, `user_favorites`, `bookings` | click/save/booking attribution và functional state |

Analytics opt-out không làm hỏng public Place, Favorite hoặc Trip. Visible impression/event không được ghi khi analytics tắt. Test/development traffic có environment marker và bị loại khỏi production AI export. M3-MVP không sử dụng traffic test để học trọng số hoặc claim relevance.

## B. Chức năng đã hoàn thành và bằng chứng source

| Chức năng | File code thực tế | Trạng thái | End-to-end? | Thiếu để demo M3 |
|---|---|---|---|---|
| Public Place/Hotel/Restaurant retrieval | `placeRepository.ts`, `placeService.ts`, `placeRoutes.ts` | **COMPLETE** cho Place catalog | Có | cần kiểm Business ACTIVE trong eligibility |
| TourPackage public list | `tourRepository.ts`, `tourService.ts`, `ToursPage.tsx` | **COMPLETE** như list riêng | Có | chưa tham gia Recommendation API |
| Ticket public list | `ticketRepository.ts`, `ticketService.ts`, `TicketsPage.tsx` | **COMPLETE** như list riêng | Có | chưa tham gia Recommendation API |
| Candidate eligibility `Place.status=APPROVED` | `placeRepository.ts`, `recommendationExposureService.ts` | **PARTIAL** | Có cho Place status | chưa loại Place thuộc Business SUSPENDED; chỉ lấy tối đa 100 row đầu |
| Bayesian quality | `ratingService.ts`, `reviewService.ts`, `Place.bayesianRating` | **COMPLETE** | Có | frontend vẫn tự tính lại bằng constant riêng; nên dùng server value khi hiển thị ranking |
| Weighted scoring | `recommendationService.ts` | **PARTIAL** | Backend có | filter/center order sai ngữ cảnh; breakdown bị làm tròn nên chưa tái tạo tuyệt đối final score |
| Preference matching | `recommendationService.ts`, `travelPreferences.ts` | **PARTIAL** | Planner có; Explore chưa có | Explore gửi `[]`; Trip preference không được tái sử dụng; dedicated amenity filter chưa có |
| Budget fit | `recommendationService.ts` | **PARTIAL** | Chỉ qua API/test | Explore không gửi budget; giá/đơn vị chỉ là `priceFrom`, score là soft estimate |
| Category filter | `recommendationExposureService.ts`, `FilterBar.tsx` | **PARTIAL** | Có cho Place catalog | UI gộp `tour`/destination, chưa rõ distinction attraction vs TourPackage |
| Location/distance feature | `geoService.ts`, `recommendationService.ts` | **PARTIAL** | Có tính toán | không có user/destination center đáng tin; API đang neo vào candidate đầu tiên |
| Amenity contribution | `recommendationService.ts` | **PARTIAL** | Không có UI riêng | amenities chỉ nằm trong text keyword match, không có allowlist/filter/score độc lập |
| Recommendation HTTP contract | `intelligenceController.ts`, `intelligenceRoutes.ts`, `recommendationExposureService.ts` | **COMPLETE** cho authenticated Place | Có | anonymous dùng API khác; budget input chưa được persist rõ trong request provenance |
| Explanation payload | `why`, `reasonCodes`, `scoreBreakdown` trong backend/frontend service | **PARTIAL** | API có, UI không | PlaceSidebar chỉ hiện rating/price, bỏ toàn bộ explanation |
| Request/candidate persistence | migration 06, `RecommendationRequest.ts`, `RecommendationCandidate.ts` | **PARTIAL** | Có | chỉ persist returned items; không lưu toàn bộ eligible set, budget provenance chưa rõ |
| Visible impression | hook + `/recommendations/visible` | **COMPLETE** | Có | chỉ authenticated và analytics consent |
| Click/Favorite/booking attribution | telemetry, FavoriteService, BookingService | **COMPLETE** | Có, đã có PostgreSQL/E2E evidence | không dùng làm training signal trong M3-MVP |
| Server-side Favorite | Favorite service/routes/context/page | **COMPLETE** | Có, refresh và relogin | anonymous được chuyển login; đúng phạm vi |
| Home “featured” | `HomePage.tsx`, `FeaturedTours.tsx` | **PARTIAL** | Có render | là 4 Place đầu từ generic list, không dùng `isFeatured` hoặc Recommendation API; badge theo index |
| Explore authenticated ranking | `ExplorePage.tsx` | **PARTIAL** | Có API → card → visible → detail | không có preference/budget, không hiện why; sort selector bị bỏ qua khi dùng recommendation |
| Explore anonymous fallback | `ExplorePage.tsx`, public Place API | **PARTIAL** | Có | chỉ Bayesian list, không có explanation/fallback label |
| Hotel/Restaurant pages | `HotelsPage.tsx`, `RestaurantsPage.tsx` | **COMPLETE** như catalog | Có | không phải personalized recommendation |
| Place Detail | `PlaceDetailPage.tsx` | **PARTIAL** | Detail/Favorite/booking có | “similarPlaces” chỉ là ba Place đầu khác ID; không có Add to itinerary |
| Search từ Home | `SearchWidget.tsx` → Explore | **PARTIAL** | search/category có | ngày và số khách không được chuyển; không có prefs/budget |
| Smart itinerary generation | `tourPlannerService.ts`, `TourPlannerPage.tsx` | **PARTIAL** | Generate/save/reopen có | mandatoryPlaceIds bị bỏ qua; pacing gần như chỉ dùng để mô tả; một số explanation không khớp selection thực tế |
| Recommendation → itinerary | type/controller có `mandatoryPlaceIds` | **MISSING** | Không | CTA, query state, backend inclusion rule và E2E |
| Historical/behavior personalization | không có ranker sử dụng history | **BLOCKED/DEFER** | Không | không có real traffic hợp lệ; không được dùng test traffic |
| Sentiment trong ranking | không có runtime integration | **BLOCKED — ĐÚNG CHỦ ĐÍCH** | Không | model M2 là DEMO_ONLY, tuyệt đối không dùng |
| Learning-to-Rank | không có | **BLOCKED/DEFER** | Không | ngoài MVP và không có relevance labels thật |

### B1. Bằng chứng test đã có

Historical evidence từ M1 source/report:

- `algorithm.test.ts`: Bayesian, GIS, preference, budget và planner scenarios;
- `recommendationExposure.test.ts`: 6 contract/spoof/visibility checks;
- `recommendation.postgres.test.ts`: 39 API/PostgreSQL checks gồm candidate, visible impression, attribution, opt-out và booking;
- `favorite.postgres.test.ts`: server Favorite, idempotency/concurrency/consent/attribution;
- `frontend/e2e/roles.spec.ts`: Customer recommendation request → visible → click → detail → Favorite → refresh/relogin; planner → save Trip → refresh.

Khoảng trống test: chưa có assertion UI cho preference/budget/explanation, chưa có golden test tái tạo exact score/rank, chưa có Business SUSPENDED eligibility, chưa có no-match fallback và chưa có Place → itinerary E2E.

## C. Lỗi và thiếu sót ảnh hưởng trực tiếp đến demo

### C1. MUST-FIX trước khi gọi là M3-MVP demo

1. **Preference và budget chưa đi từ UI tới recommendation.** `ExplorePage` hard-code `explicitPreferences: []` và không truyền `dailyBudgetPerPerson`; người dùng không thể chứng minh hai feature quan trọng nhất.
2. **Explanation bị bỏ ở UI.** API trả `why`, `reasonCodes`, `scoreBreakdown`, nhưng `PlaceSidebar` chỉ hiện Bayesian badge và giá.
3. **Scoring/filter order chưa đúng.** `createRequest` gọi rank với `destinationCity: 'all'`, sau đó mới lọc city/category/search. Distance được tính quanh Place đầu của global list và fallback trong `recommendPlaces` không bao giờ xử lý filter city của API.
4. **Không có Recommendation → itinerary.** Place Detail không có CTA; `mandatoryPlaceIds` không được TourPlannerService sử dụng.
5. **Explanation có thể sai nghĩa.** Sentinel `Điểm đến tiêu biểu`/`Được đề xuất chung` vẫn có thể được câu văn diễn giải như preference match. Planner còn nói nhà hàng “đánh giá cao gần khu vực” dù đang chọn theo index, không tính rank/khoảng cách.
6. **Consent đang làm mất chức năng explicit preference.** Khi personalization tắt, backend bỏ cả preference người dùng vừa chủ động chọn. Nên phân biệt one-shot functional input với học/lưu profile: vẫn được chấm điểm cho request hiện tại, nhưng không dùng history và không lưu/export preference khi opt-out.

### C2. Nên sửa trong cùng M3 nếu thời gian cho phép

- Place có Business SUSPENDED vẫn có thể lọt public/recommendation vì query chỉ kiểm `Place.status`.
- Authenticated Explore vẫn hiển thị sort selector nhưng không gửi `sortBy`; thao tác sort tạo lại cùng ranking. Option `rating` của public Place API cũng rơi về Bayesian mặc định.
- Request provenance không lưu rõ `dailyBudgetPerPerson`; có thể ghi giá trị consented hoặc budget band vào `filters JSONB` hiện có, không cần migration.
- Candidate table hiện chỉ ghi returned top-N, không phải toàn eligible set; không được claim coverage/diversity từ bảng này.
- Breakdown làm tròn 2 chữ số trong khi final score tính từ giá trị trước làm tròn; chưa thể tái tạo exact score chỉ từ response.
- Home “Featured”, Place “Similar” và badge “Bán chạy/Trending” không phải output recommender; không nên dùng chúng làm bằng chứng recommendation.

### C3. DEFER để giữ đúng MVP

- Recommendation cho TourPackage và Ticket;
- user-history/collaborative filtering;
- diversity re-ranking phức tạp và online NDCG/uplift;
- Learning-to-Rank, PhoBERT, sentiment/aspect trong score;
- raw GPS, routing provider, OR-Tools và road-distance production;
- normalized user preference profile/memory dài hạn;
- migration mới.

## D. Phương án M3-MVP tối giản

### D1. Scope khóa

Candidate M3-MVP chỉ gồm `places` category:

- `attraction`;
- `hotel`;
- `restaurant`.

Place category `tour`, TourPackage và Ticket tiếp tục hiển thị bằng catalog hiện có nhưng không được tuyên bố là personalized M3 recommendation. Phạm vi này phù hợp ba domain của đồ án và tránh hợp nhất hai schema Tour khác nhau.

### D2. Input

Explore bổ sung:

- preference chips dùng chính `PREFERENCE_OPTIONS` hiện có;
- daily budget per person với validate rõ;
- category attraction/hotel/restaurant;
- city, search, minimum rating giữ nguyên;
- không thu raw GPS.

Explicit preference/budget là **functional request input**. Personalization consent chỉ quyết định lưu dùng cho analytics/history; opt-out vẫn phải nhận kết quả chức năng nhưng không ghi visible/event và không dùng profile/history.

### D3. Candidate và scoring

Không viết lại thuật toán. Sửa đường đi dữ liệu:

1. lấy Place đủ điều kiện;
2. lọc `APPROVED` và Business `ACTIVE` nếu có business;
3. lọc category/city/search/minRating trước;
4. nếu không có exact city match, trả typed fallback chung thay vì âm thầm giả match;
5. tính center từ centroid của tập candidate đã lọc hoặc tắt distance component nếu không có center đáng tin;
6. chấm điểm với weight hiện có;
7. sort `score DESC`, sau đó deterministic tie-break `bayesianRating DESC`, `id ASC`;
8. explanation chỉ phát biểu feature có evidence thật.

Budget tiếp tục là soft fit trong MVP và phải ghi “phù hợp ước tính theo giá từ”. Không gọi đây là hard affordability vì `priceFrom` chưa có unit/source đủ mạnh.

### D4. Output và explainability UI

Mỗi recommendation card hiển thị tối thiểu:

- một dòng `why`;
- tối đa ba chip: `Phù hợp sở thích`, `Hợp ngân sách`, `Bayesian tốt`;
- nhãn `Gợi ý theo tiêu chí bạn chọn` hoặc `Phổ biến theo Bayesian` cho cold-start;
- không hiển thị score thô như xác suất;
- không dùng sentiment DEMO_ONLY.

Anonymous fallback dùng public Place API, Bayesian sort và lời giải thích generic trung thực. Không tạo request/impression giả.

### D5. Nối sang itinerary

Tối thiểu:

1. thêm CTA `Thêm vào lịch trình` tại Place Detail;
2. chuyển `placeId` sang Tour Planner qua URL state/query;
3. Planner hiển thị địa điểm bắt buộc đã chọn;
4. gửi `mandatoryPlaceIds`;
5. backend xác minh UUID, Place `APPROVED`, category phù hợp và city phù hợp;
6. bắt buộc chèn Place vào itinerary một lần;
7. Save Trip dùng schema hiện tại và refresh/reopen phải giữ Place.

Không cần migration vì `trip_sessions.itinerary` và `selected_place_ids` đã tồn tại.

### D6. Quyết định schema/API

- **Không tạo migration.** Schema 01–10 đủ cho M3-MVP.
- Giữ endpoint `/api/intelligence/recommendations` và `/visible`.
- Chỉ mở rộng payload/response tương thích ngược nếu cần typed fallback hoặc budget provenance.
- Có thể lưu budget/budget band trong `recommendation_requests.filters JSONB` hiện có; khi opt-out không lưu explicit preference/budget chi tiết.
- Không kích hoạt `ai_model_registry`; heuristic được version bằng constant hiện có.

## 3. Kịch bản demo mục tiêu

| Bước demo | Trạng thái hiện tại | Sau M3-MVP |
|---|---|---|
| 1. Truy cập Home/Explore | **COMPLETE** | giữ nguyên |
| 2. Chọn sở thích | **MISSING trong Explore**; có trong Planner | preference chips dùng allowlist |
| 3. Nhập ngân sách | **MISSING trong Explore**; có total budget trong Planner | gửi daily budget vào Recommendation API |
| 4. Chọn attraction/hotel/restaurant | **PARTIAL** | ba category rõ ràng |
| 5. Xem ranked list | **PARTIAL** | filter-before-score, deterministic fallback |
| 6. Xem lý do | **MISSING ở UI** | hiển thị why/chip evidence |
| 7. Mở Place Detail | **COMPLETE** | giữ request attribution khi visible |
| 8. Lưu Favorite | **COMPLETE** | giữ server source of truth và idempotency |
| 9. Thêm vào lịch trình | **MISSING** | CTA → planner → mandatory Place |
| 10. Save Trip và reopen | **COMPLETE cho planner hiện tại** | xác minh mandatory Place còn sau refresh |

Luồng anonymous: Home/Explore → public Bayesian fallback → Place Detail. Favorite/Add to itinerary yêu cầu đăng nhập theo behavior hiện tại; không tạo anonymous identity.

## E. Tối đa ba task triển khai tiếp theo

Các task sau chỉ là đề xuất, **chưa được bắt đầu trong M3-A**.

| Ưu tiên | Task | Nội dung | Ước lượng |
|---|---|---|---:|
| **P0** | Recommendation correctness & golden scenarios | filter-before-score, center/fallback, Business status, consent tách functional input khỏi analytics, deterministic tie-break, explanation evidence, exact score reconstruction tests | 4–6 giờ |
| **P0** | Explore controls & explanation UX | preference chips, budget input, ba category, display why/reason chips, anonymous/cold-start label, sửa sort behavior | 6–8 giờ |
| **P1** | Place → Planner bridge & Customer E2E | CTA, `mandatoryPlaceIds` validation/inclusion, save/reopen, opt-out path, production builds/regression | 8–12 giờ |

Tổng dự kiến: 18–26 giờ, tương đương khoảng 2–3 ngày làm việc tập trung. Sau đó feature freeze recommendation và chuyển sang ổn định itinerary/report, không mở LTR.

## F. Tiêu chí kiểm thử PASS cho M3

### F1. Unit/golden scenarios

- cùng input/catalog/seed cho cùng thứ tự và explanation;
- `finalScore` tái tạo được từ breakdown + config trong tolerance đã khóa;
- preference match thật làm tăng preferenceScore; không match không được nói “phù hợp sở thích”;
- budget thấp/cao tạo thứ tự hợp lý trên fixture có giá/đơn vị được mô tả;
- city/category filter được áp dụng trước distance/rank;
- no-match trả fallback typed và không crash;
- cold-start không dùng review/aspect/sentiment không tồn tại;
- sentiment DEMO_ONLY không được import hoặc tham chiếu trong recommendation runtime.

### F2. API/PostgreSQL trên database test cô lập

- chỉ Place eligible, `APPROVED`, đúng category và Business ACTIVE/null legacy được trả;
- client giả `userId`, score, rank, environment, model/config version bị từ chối;
- request/candidate/rank/version nhất quán;
- visible impression chỉ ghi sau 50%/2 giây và idempotent;
- requestId giả/cross-user/unseen bị từ chối cho click/Favorite/booking;
- opt-out vẫn nhận functional recommendation/Favorite nhưng 0 visible/event và không export training row;
- production/test isolation PASS;
- không dùng test traffic để tune weight hoặc claim online quality.

Mọi write test sau này chỉ được chạy với test DB guard/sentinel hiện có; M3-A không chạy database.

### F3. Frontend E2E Customer

- logged-in user chọn hai preference + budget + category;
- request payload đúng và card hiển thị explanation từ server;
- mở detail chỉ giữ requestId sau verified visible impression;
- Favorite persist qua refresh/logout/login;
- Add to itinerary đưa đúng Place vào Planner;
- Save Trip, refresh/reopen vẫn có Place và preferences;
- anonymous thấy Bayesian fallback, không gọi protected recommendation và không crash;
- personalization opt-out không làm hỏng chức năng one-shot;
- mobile/desktop UI không che controls/reasons.

### F4. Regression/build

- recommendation unit + PostgreSQL suite PASS;
- telemetry, Favorite, Review và booking attribution regression PASS;
- planner/preferences/Trip regression PASS;
- backend TypeScript production build PASS;
- frontend production build PASS;
- Playwright Customer main flow PASS;
- không có migration mới, DB reset, model training, Kaggle upload, push hoặc deploy.

### F5. Definition of Done trung thực

M3 chỉ được ghi `COMPLETE` khi source và test thực tế chứng minh luồng preference + budget + explanation + Favorite + itinerary. Không dùng tên hàm, tài liệu cũ hoặc test traffic làm bằng chứng chất lượng recommendation ngoài golden scenarios.

## G. Task nhỏ nhất cần làm ngay sau audit

**Recommendation correctness & golden scenarios (4–6 giờ), không migration.**

Thứ tự nhỏ nhất:

1. thêm test tái hiện lỗi destination filter/distance anchor và explanation sentinel;
2. lọc eligible candidate trước scoring;
3. tách `scoringPreferences` khỏi `persistedPreferences` để explicit one-shot vẫn hoạt động khi opt-out nhưng không bị dùng cho training/history;
4. thêm deterministic tie-break và breakdown đủ precision;
5. chạy unit + recommendation PostgreSQL regression trên test DB cô lập theo guard hiện có.

Task này là nền an toàn trước khi nối UI. **M3-A dừng tại kế hoạch; chưa sửa code và chưa tự bắt đầu task trên.**

## 4. Những tuyên bố bị cấm trong demo/báo cáo

- Không gọi heuristic là Learning-to-Rank hoặc model đã train.
- Không gọi Home Featured hay Place Similar là personalized recommendation hiện tại.
- Không gọi budget score là bảo đảm đủ tiền.
- Không gọi Haversine/centroid là road travel time thực.
- Không dùng metric sentiment DEMO_ONLY hoặc test DB để tăng score/claim quality.
- Không báo NDCG/uplift/online performance nếu không có dataset/traffic thật hợp lệ.
- Không gọi TourPackage/Ticket là candidate M3 cho tới khi code thực sự nối chúng vào eligibility/ranking.

