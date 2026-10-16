# HuGo Intelligence 2.0 — M3-B Recommendation Correctness & Golden Scenarios

**Ngày thực hiện:** 2026-10-15  
**Phạm vi:** backend recommendation hiện có; không frontend, không migration, không model training  
**Kết luận:** **M3-B COMPLETE — đủ điều kiện chuyển sang M3-C, nhưng M3-C chưa được bắt đầu**

## Tóm tắt điều hành

M3-B sửa tối thiểu đường recommendation hiện có, giữ weighted heuristic và Bayesian rating. Golden test được viết và chạy trước khi sửa: **7/8 FAIL, 1/8 PASS**. Sau sửa, **8/8 PASS**. Recommendation API/PostgreSQL, telemetry, Favorite, booking attribution, consent, full integration và backend production build đều đã chạy thực tế và PASS trên database cô lập `travelgo_ai_m0_test`.

Không có migration mới, không sửa migration 01–10, không dùng sentiment DEMO_ONLY, không train model, không đụng frontend, không push/deploy/publish.

## A. Lỗi đã xác nhận từ source và test

| Lỗi | Bằng chứng trước sửa | Ảnh hưởng |
|---|---|---|
| `category/search/minRating` chạy sau scoring | Golden scenario trả cả `wrong-category`, `wrong-search`, `low-rating` | Score/distance được tính trên candidate sai |
| Distance anchor là Place đầu global list | Hai Place đối xứng có distance score `1` và `0.05` | Rank phụ thuộc thứ tự retrieval |
| City no-match fallback âm thầm | Chưa có typed fallback; helper không tồn tại | Client có thể hiểu nhầm kết quả ngoài thành phố là exact match |
| Business `SUSPENDED` vẫn lọt candidate | Golden scenario trả cả Place của business suspended | Vi phạm public eligibility |
| Sentinel giả thành preference evidence | `matchedPreferences = ['Điểm đến tiêu biểu']` | Explanation nói phù hợp sở thích dù không match |
| Tie không deterministic | Input `[b,a]` giữ rank `[b,a]` | Cùng candidate set nhưng thứ tự input khác tạo rank khác |
| Opt-out bỏ one-shot explicit input | Không có tách scoring input và persisted input | Tắt personalization làm hỏng chức năng gợi ý chủ động |
| Repository cắt ở 100 Place | Chỉ gọi `page=1, limit=100` | Có thể mất candidate hợp lệ và không được claim xét hết catalog |

Golden run trước sửa:

- FAIL 7 scenario: filter, distance anchor, typed fallback, suspended business, explanation evidence, deterministic tie, opt-out one-shot;
- PASS 1 scenario: fixture hiện tại tình cờ tái dựng được score trong tolerance;
- command thực tế: build bằng `tsc`, chạy `node dist/tests/recommendationCorrectness.test.js`;
- chạy trực tiếp bằng `tsx` ban đầu bị môi trường Node 24 chặn trước test với `uv_os_get_passwd ENOMEM`, vì vậy bằng chứng chính dùng đúng output production `dist`.

## B. File thay đổi và lý do

| File | Thay đổi |
|---|---|
| `backend/src/services/recommendationService.ts` | Filter/eligibility trước score; centroid; typed fallback batch; precision 6 số; deterministic tie-break; explanation dựa trên evidence |
| `backend/src/services/recommendationExposureService.ts` | Dùng batch mới; tách one-shot scoring khỏi persistence theo consent; reason code trung thực; business eligibility khi attribution; response fallback/ranking context |
| `backend/src/repositories/recommendationRepository.ts` | Đọc phân trang cho đến hết thay vì giới hạn 100 record |
| `backend/src/repositories/placeRepository.ts` | Include `Business.status` để recommendation đánh giá eligibility |
| `backend/src/tests/recommendationCorrectness.test.ts` | 8 golden scenarios mới, có bằng chứng FAIL trước sửa → PASS sau sửa |
| `backend/src/tests/recommendationRepositoryPagination.test.ts` | Chứng minh retrieval 101 record qua hai trang `[1,2]` |
| `backend/src/tests/recommendation.postgres.test.ts` | HTTP filter, typed fallback, suspended business, opt-out one-shot/no-retention; tăng lên 50 checks |
| `backend/package.json` | Thêm `test:recommendation:unit`, ghép golden và pagination vào recommendation suite |
| `docs/HUGO_AI_M3_B_CORRECTNESS_REPORT.md` | Báo cáo này |

Không có thay đổi schema hay migration.

## C. Candidate filtering, center, fallback và công thức xếp hạng sau sửa

### C1. Eligibility và retrieval

1. Repository lấy toàn bộ các trang `Place` public theo batch 100; không còn dừng ở trang đầu.
2. Place phải có `status=APPROVED`. Bộ lọc service vẫn kiểm tra phòng thủ kể cả khi repository đã scope public.
3. Place legacy không có `businessId` vẫn hợp lệ.
4. Nếu có `businessId`, association phải tồn tại và `Business.status=ACTIVE`; `SUSPENDED` hoặc không xác minh được association đều bị loại.
5. Separate `TourPackage` và `Ticket` không được thêm vào candidate. M3-B không mở rộng domain.

### C2. Filter-before-score

Thứ tự:

`public eligibility → category/search/minRating → destination city → center → score → sort → limit`

`category`, `search`, `minRating` không bị nới lỏng trong fallback. Search tiếp tục dùng name + summary + city theo contract hiện tại.

### C3. Center và distance

- Nếu backend có `centerCoords` đáng tin cậy: dùng center đó và trả `PROVIDED_CENTER_AERIAL`.
- Contract client hiện tại không nhận tọa độ, nên API thông thường dùng centroid của **candidate đã lọc**, trả `FILTERED_CANDIDATE_CENTROID_AERIAL`.
- Nếu không có tọa độ hợp lệ/candidate: distance component bằng `0`, trả `DISABLED`.
- Haversine chỉ là khoảng cách đường chim bay. Response limitation nói rõ không phải đường đi hay thời gian di chuyển thực.

Distance score khi có center:

`D = clamp(0.05, 1 - haversineKm / 40, 1)`

### C4. Fallback

- Nếu destination city có exact candidate: `fallback.applied=false`.
- Nếu city không match nhưng các filter khác còn candidate: trả candidate ngoài city với:
  - `fallback.applied=true`;
  - `fallback.code='NO_DESTINATION_MATCH'`;
  - `fallback.requestedDestination`;
  - limitation giải thích rõ đây là fallback ngoài thành phố.
- Nếu category/search/minRating không còn candidate thì trả danh sách rỗng; không âm thầm bỏ các filter đó.

### C5. Scoring và sort

- `Q = clamp(Bayesian(reviewCount, rating) / 5, 0, 1)`
- `P = 0.6` nếu không có preference; nếu có thì `clamp(0.2 + 0.8 × matched/count, 0.15, 1)`
- `B` giữ rule budget mềm hiện có theo `priceFrom`; không phải cam kết giá thực tế.
- `D` theo C3.
- `finalScore = round6(round6(Q)×0.35 + round6(P)×0.25 + round6(B)×0.25 + round6(D)×0.15)`
- sort: `finalScore DESC → Bayesian rating DESC → Place ID ASC`.

Breakdown lưu/trả với 6 chữ số thập phân; golden test khóa tolerance reconstruction `≤ 0.000001`.

### C6. Explanation và reason codes

- Chỉ sinh `PREFERENCE_MATCH` và câu “Phù hợp sở thích” khi có keyword match thật.
- Không còn sentinel `Được đề xuất chung`/`Điểm đến tiêu biểu` trong `matchedPreferences`.
- Quality reason cần có review thật và đạt threshold.
- Budget reason chỉ có khi user nhập budget, dùng wording **“Chi phí ước tính theo giá từ...”**.
- Distance reason code phân biệt provided center với filtered-candidate centroid và có hậu tố `AERIAL`.

## D. Consent và opt-out

Explicit preference/budget người dùng vừa nhập là **functional one-shot input**:

- luôn được dùng để score request hiện tại, kể cả personalization opt-out;
- khi personalization consent bật: lưu explicit preferences và budget trong `recommendation_requests.filters` để provenance;
- khi personalization consent tắt: lưu `explicitPreferences=[]`, không lưu `dailyBudgetPerPerson`; các filter chức năng không nhạy cảm vẫn giữ để request/attribution hoạt động;
- score/candidate metadata cần cho functional attribution vẫn tuân theo retention hiện có, nhưng không chứa raw preference/budget opt-out;
- analytics visible/event chỉ ghi khi analytics consent bật; opt-out regression tạo **0 visible impression/event**;
- requestId, session, user ownership, environment, candidate membership và server-verified visible impression không bị nới lỏng;
- AI export/retention gate M1 không đổi; M3-B không tạo export hay training data.

API request contract vẫn là `1.0`. Response bổ sung tương thích ngược:

- `fallback`;
- `rankingContext.candidateCount`;
- `rankingContext.distanceBasis`;
- limitation về centroid/Haversine/fallback/one-shot opt-out.

Version server được nâng để provenance không lẫn với hành vi cũ:

- algorithm: `weighted-hybrid-v2`;
- policy: `approved-active-business-eligibility-v2`;
- config: `weights-q35-p25-b25-d15-precision6-v2`;
- model vẫn `heuristic-content-bayesian-v1` vì không có model mới.

## E. Golden scenarios — FAIL trước sửa → PASS sau sửa

| Scenario | Trước sửa | Sau sửa |
|---|---:|---:|
| City/category/search/minRating filter-before-score | FAIL | PASS |
| Distance dùng centroid candidate đã lọc | FAIL | PASS |
| No-match typed fallback | FAIL | PASS |
| Business SUSPENDED bị loại, null-business legacy được giữ | FAIL | PASS |
| Không claim preference nếu không match | FAIL | PASS |
| Deterministic finalScore/Bayesian/ID rank | FAIL | PASS |
| Breakdown reconstruction tolerance | PASS | PASS |
| Opt-out vẫn dùng one-shot input nhưng không retain chi tiết | FAIL | PASS |

Kết quả cuối: **8/8 PASS**.

## F. Kết quả kiểm thử thực tế

### F1. Safety preflight PostgreSQL

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Exact database name | PASS | `travelgo_ai_m0_test` |
| Host | PASS | `localhost` |
| Sentinel | PASS | `assertDatabaseSentinel` qua `db:verify` |
| Schema | PASS | 10 migrations, 23 application tables, 39 foreign keys, PostGIS 3.4.3 |
| Write guards | PASS | `NODE_ENV=test`, `ALLOW_TEST_DB_WRITES=true`, `TEST_DATABASE_NAME=travelgo_ai_m0_test` chỉ trong process test |

`.env` gốc vẫn trỏ `travelgo_dev` và không được sửa. Không có lệnh DROP, TRUNCATE hoặc reset. Seed prerequisite dùng `findOrCreate`/update trên test fixture sau guard + sentinel; không in credential.

### F2. Test matrix

| Nhóm | Command | Kết quả thực tế |
|---|---|---|
| Recommendation contract unit | `npm run test:recommendation:unit` | PASS — 6 checks |
| Golden correctness | cùng suite | PASS — 8/8 |
| Repository pagination | cùng suite | PASS — 2 checks; 101 record, pages `[1,2]` |
| Algorithm/GIS/planner regression | `npm run test:algorithm` | PASS — 14/14 |
| Recommendation HTTP/PostgreSQL | `npm run test:recommendation` | PASS — 50 checks |
| Telemetry contract | `npm run test:telemetry` | PASS — 9 checks |
| Favorite/concurrency/consent/attribution | `npm run test:favorite` | PASS — 59 checks |
| Intelligence/telemetry/booking | `npm run test:intelligence` | PASS — 30 checks |
| Full backend PostgreSQL integration | `npm run test:integration` | PASS — 14/14 groups sau safe idempotent seed prerequisite |
| Backend production TypeScript build | `npm run build` | PASS — exit code 0 |

Full integration lần đầu dừng sau health PASS vì seed account password không khớp (`INVALID_CREDENTIALS`). Không đổi database khác. Chạy lại seed idempotent có đầy đủ guard/sentinel trên đúng test DB, rồi full integration PASS 14/14. Các log HTTP 400/401/403/404/409 trong negative-path suites là expected assertions, không phải suite failure.

Frontend build/E2E không chạy vì M3-B bị khóa backend và yêu cầu không sửa Explore UI. Không có thay đổi frontend.

## G. Hạn chế còn lại

1. Centroid là proxy ổn định cho MVP, không phải vị trí người dùng, road distance hay travel time.
2. Budget vẫn chỉ ước tính từ `priceFrom`; chưa có price unit/source đủ mạnh để hard-filter affordability.
3. Repository đọc hết catalog theo nhiều trang nhưng không phải database snapshot; catalog có thể đổi giữa các page trong traffic concurrent.
4. Candidate table chỉ lưu top-N đã trả, không lưu toàn bộ eligible set; không dùng bảng này để claim catalog coverage/diversity.
5. Không có quality claim offline/online, NDCG hoặc uplift; đây vẫn là deterministic heuristic, không phải Learning-to-Rank.
6. Explore controls/explanation UI và Place → Planner không thuộc M3-B, chưa được sửa.
7. TourPackage/Ticket và sentiment DEMO_ONLY không tham gia ranking.

## H. Quyết định chuyển M3-C

**GO cho M3-C theo kế hoạch đã duyệt**, vì các P0 correctness, consent, attribution, PostgreSQL regression và production build của M3-B đều PASS thực tế.

Điều này chỉ là readiness decision. M3-C **chưa được bắt đầu** trong task này. Task tiếp theo nên giữ đúng phạm vi nhỏ đã định trong M3-A: Explore controls + explanation UX, không mở model/migration mới.
