# T11 — Đánh giá recommendation và planner hiện có

Ngày **31/10/2026** (Asia/Saigon). Workspace `C:\Users\Danh\Downloads\HCH\DACN\travelgo`; HEAD lúc bắt đầu `052531dfc77c4f289757794c0ee08b4d46e6af2e`. Working tree đã có nhiều thay đổi chưa commit của T03–T09 (backend Planner/Trip/Booking, frontend, docs, AI và artifacts); **không reset/stash/ghi đè**. T11 chỉ thêm harness/scenario/kết quả/báo cáo và sửa **đúng vị trí** `selection.json` trong báo cáo T09: notebook và HTML đặt nó ở `t09_demo/selection.json`, ngang hàng `snapshot/`, không nằm trong `snapshot/`. Không sửa model/manifest/dữ liệu sentiment, trọng số, ranking hay business logic.

## Bộ kiểm khóa trước khi chạy

- [Scenario v1.2](../backend/src/evaluation/t11_scenarios_v1.json) có SHA-256 `aa0bbd19eb54e52ccacbc274235c73cb7d51500cdb73a8fa433252c1a97b2e6a`, **10 recommendation + 16 planner**. Fixture `SYNTHETIC_SCENARIO_ONLY`, 10 Place do tác giả viết để kiểm thuật toán; không phải review người thật, nhãn relevance hoặc corpus sentiment. Mỗi scenario có ID, input (base + overrides), source catalog, expected và tiêu chí; không đổi sau lượt chạy đầu.
- Trước lượt chạy đầu, bản nháp v1 (`b609c517…`) được bổ sung case DB và thành v1.1 (`ee65c90a…`); v1.2 tăng ngân sách của hai case 3 ngày/nhóm để tách kiểm chi phí khỏi case ngân sách thấp. Cả hai chỉnh sửa **xảy ra trước lượt đánh giá đầu**; chỉ v1.2 được chạy. Không chọn lại expected theo kết quả.
- Harness [t11_evaluate.ts](../backend/src/evaluation/t11_evaluate.ts) gọi trực tiếp `RecommendationService`, `RatingService.calculateBayesianAverage`, `TourPlannerService.generateSmartItinerary` và loader test của `RecommendationRepository`. [t11_db_fingerprint.ts](../backend/src/evaluation/t11_db_fingerprint.ts) chỉ đọc DB test. Output: [JSON cuối](evidence/t11/final/scenario_results_v1.json) và [CSV cuối](evidence/t11/final/scenario_results_v1.csv), mỗi scenario có expected/actual/checks/PASS–FAIL–NOT RUN. Lượt harness đầu không có DB được giữ ở `docs/evidence/t11/scenario_results_v1.{json,csv}`: **25 PASS, 0 FAIL, 1 NOT RUN**. Sau regression DB và gắn bằng chứng: **26 PASS, 0 FAIL, 0 NOT RUN**. Kết quả cuối JSON/CSV lần lượt SHA-256 `18fecba8a418654e3ad34f65751ab219d5de9d7dcc5824bff604f76468b8f711` / `4033d431f89fd222be7ebb3c9512b020a74511f536d902e554ef433da08e49f0`.

### Source đã đánh giá (SHA-256 trên working tree hiện có)

| Backend source | SHA-256 |
|---|---|
| `services/recommendationService.ts` | `a153ac6cc44e870ed9e7a4bd206c7613957ba91497333e6256f63fb8a98fd6d3` |
| `services/ratingService.ts` | `10854d728741ea32894d3622bc89d2b3cf97beb675b4258847d34b6b82849708` |
| `repositories/recommendationRepository.ts` | `539ece10eab230fb9bc35de59c291712a7c807ec79b1332a1775ba5454ea08e1` |
| `services/tourPlannerService.ts` | `03151bb6e281abe72c64496adaed9f551b34f3cdb67557141bba689c094584ba` |
| `services/geoService.ts` | `2a9c8765e4728ab8af4fa03558ec93810427868486c0488e9725b733b1744314` |
| `utils/plannerValidation.ts` | `c6f0eee319d92feee0b8afb248fcecc900bd2719f63d8a3fa7b914511741e57e` |
| `services/tripSessionService.ts` | `940eedb08657142a6d0927c831164c049593ffd49315243887795984e03a4300` |
| `utils/tripSnapshot.ts` | `012aa78e25a881af30abfbd16b2e8e8670cb0f19718efbe1d6dc3c56b4566909` |

## Recommendation: correctness và sensitivity

**Baseline:** dùng nguyên `RatingService.calculateBayesianAverage(v,R)` với `m=10` review và prior `C=4,20` từ `ENV`: `v/(v+m)×R + m/(v+m)×C`, clamp rating và làm tròn **2 chữ số** như source. Baseline chỉ sắp theo điểm Bayesian trên **cùng eligible/filtered candidates** mà heuristic vừa nhận; evaluator dùng ID tăng dần để phá hòa cho lặp lại được (đây là quy ước evaluator, không giả làm tie-break riêng của `rankPlacesByBayesian`). Heuristic source dùng trọng số quality/preference/budget/distance **0,35/0,25/0,25/0,15**, làm tròn score 6 chữ số; tie-break final score → Bayesian → ID. Quality là Bayesian/5; preference có mặc định 0,6 khi không chọn, còn khi chọn dựa tỷ lệ match từ text/keywords; budget theo bậc `priceFrom`/ngân sách; distance `clamp(1−aerial_km/40,0,05..1)`. Source lọc public status, Business ACTIVE nếu có business ID, city/category/search/minRating. Không có destination match nhưng còn candidate sau filter khác thì fallback `NO_DESTINATION_MATCH`; rỗng hoàn toàn thì trả rỗng. Vị trí không truyền thì dùng centroid của **candidate đã lọc**.

| Scenario | Eligible | Heuristic top-3 | Bayesian-only top-3 | Quan sát |
|---|---:|---|---|---|
| R01 base (`bien`, 300k, center gần biển) | 6 | Biển Sáng, Nhà hàng Bữa Trưa, Cold Beach | Núi Xa, Khách sạn Bay, Biển Sáng | Khác thứ hạng; **không suy tốt hơn**. |
| R02 giữ nguyên input | 6 | Như R01 | Như R01 | Score/thứ hạng deterministic. |
| R03 đổi sở thích sang thiên nhiên | 6 | Biển Sáng, Bảo tàng Cổ, Nhà hàng Bữa Trưa | Như R01 | PreferenceScore Núi Xa `0,2→1`; top-3 thay đổi. |
| R04 tăng ngân sách lên 1 triệu/người/ngày | 6 | Như R01 | Như R01 | BudgetScore Núi Xa `0,15→0,85`; top-3 **không đổi**. |
| R05 chuyển center tới Núi Xa | 6 | Như R01 | Như R01 | DistanceScore Núi Xa `0,385→1`; top-3 **không đổi**. |
| R06 filter attraction/search/rating | 2 | Biển Sáng, Cold Beach | Giống heuristic | Status/business/category/search/rating đúng tập ứng viên. |
| R07 Huế không có match | 7 | Biển Sáng, Nhà hàng Bữa Trưa, Cold Beach | Núi Xa, Khách sạn Bay, Hồ Hà Nội | Fallback có code rõ. |
| R08 filter rỗng | 0 | Rỗng | Rỗng | Không bịa fallback candidate. |
| R09 Cold Beach 0 review | 1 | Cold Beach | Cold Beach | Bayesian trở về prior `4,20`. |

R10 không truyền center: 6 candidate, distance basis từ centroid và PASS. Mọi kết quả đã kiểm score breakdown tái tạo final score tới `1e−6`, explanation không nhận vơ match/ngân sách/rating, và không lọt Place suspended/pending/thiếu Business. **Precision@k, NDCG: NOT EVALUATED** vì không có nhãn relevance độc lập thật; 10 fixture synthetic không chứng minh chất lượng người dùng hay online uplift. Không đo latency, nên không có số thời gian được diễn giải như benchmark.

## Planner: contract, giới hạn và persistence

1/2/3 ngày trả **0/1/2 đêm**; tổng VND của cả nhóm bằng tổng activity + lodging từng ngày, chỉ tính lodging ở `N−1` ngày. Tương ứng trong fixture: **750.000 / 2.280.000 / 3.230.000 VND** (case 2 ngày có Place/Hotel bắt buộc, case 3 ngày ngân sách 10 triệu). Case 2 adults + 1 child xác nhận quy đổi **2,7 người lớn**: trưa **405.000**, tối **540.000** mỗi ngày; lodging vẫn **600.000/đêm cho một phòng giả định**, không nhân theo khách. Hotel bắt buộc 1 ngày được tham khảo với activity giá 0, lodging 0; thiếu hotel ở chuyến 2 ngày dùng fallback **400.000** một đêm. Tối đa 2 activity `sightseeing`/ngày, bữa ăn không tính slot. Mandatory Place/Hotel xuất hiện đúng một lần; thiếu Place hoặc 3 attraction bắt buộc trong 1 ngày trả `MANDATORY_PLACE_UNAVAILABLE` / `MANDATORY_PLACE_CAPACITY_EXCEEDED`. `flight` và `relaxed` bị từ chối; `car`/`motorbike` + `balanced` được nhận.

Khoảng cách từng leg khớp Haversine bán kính **6.371 km**, làm tròn **0,01 km**; ETA `max(5, ceil(distance×1,35/speed×60))`, speed **30/35 km/h** cho car/motorbike. Cùng activities/cost, long-leg witness trong case P12/P13 **66→57 phút** khi đổi ô tô sang xe máy; leg ngắn đều sàn 5 phút. Đây là **ước lượng đường chim bay + hệ số**, không xác minh tuyến đường, giao thông hay giá vận chuyển thực.

**Hai giới hạn quan trọng dù scenario PASS:** P05 ngân sách **100.000** vẫn trả itinerary **420.000**, ghi `over_budget` và `BUDGET_EXCEEDED`; đây không phải lịch thỏa ngân sách. P06 catalog rỗng vẫn trả lịch ăn uống **350.000**, **0 sightseeing**, ghi `NO_SIGHTSEEING_FOR_DESTINATION`; đây không phải chuyến tham quan đủ nội dung. Đề xuất task sản phẩm riêng nếu muốn chặn hoặc đổi UX cho hai tình huống; T11 không sửa thuật toán.

P16 edit → save → reopen dùng **regression HTTP/PostgreSQL T04-A chạy mới**, không lấy unit double làm persistence: 11 nhóm PASS, gồm row DB, GET, đổi title/preferences, reorder/add/remove activity, metadata `GROUP_VND_V1`, mode, số đêm, selected IDs và totals; test cleanup fixture users/Trip theo ID. Unit T04 cũng chạy mới **35/35 PASS**, ghi riêng là không dùng DB. Bằng chứng lịch sử T04-A/B chỉ là nền contract, không cộng vào số kết quả T11.

## Môi trường DB và lệnh thực chạy

DB duy nhất dùng: **`travelgo_ai_m0_test`** trên `127.0.0.1`, container `travelgo_postgres` healthy; **không kết nối `travelgo_dev`** trong regression. `node dist/scripts/verifyDatabase.js` với process env exact target đạt guard/sentinel, PostGIS **3.4.3**, **12 migrations**, 23 app tables, 39 FKs. Trước test mới bật `ALLOW_TEST_DB_WRITES=true` và `TEST_DATABASE_NAME=travelgo_ai_m0_test`; regression tự kiểm lại guard/sentinel/migration11 trước write. Không reset, seed, truncate, apply migration hay xóa volume. [Fingerprint trước](evidence/t11/db_fingerprint_before.json) và [sau](evidence/t11/db_fingerprint_after.json) dùng **cùng biểu thức**: count + SHA-256 của chuỗi MD5(JSON từng row) sắp theo hash, cho **25 bảng public** trong transaction read-only. So sánh **25/25 trùng**, gồm 27 Trip, 98 users, 57 bookings, 22 places, 12 migration records; không suy DB không đổi trong thời gian có tiến trình khác ghi. [DB evidence](evidence/t11/db_regression_evidence.json) chép lại lệnh/exit/checks và ID Trip fixture từ lượt chạy quan sát; harness đọc file này và **tự so lại** hai fingerprint, nhưng không tự chạy HTTP regression.

| Lệnh từ `backend/` | Exit | Kết quả mới |
|---|---:|---|
| `npm.cmd run build` | 0 | TypeScript build PASS (chạy sau khi thêm harness; chạy lại sau khi thêm fingerprint/DB evidence). |
| `node dist/evaluation/t11_evaluate.js src/evaluation/t11_scenarios_v1.json ../docs/evidence/t11` | 0 | Lượt đầu 25 PASS / 1 NOT RUN (DB chưa chạy), spec v1.2 hash đúng. |
| `node dist/tests/{recommendationCorrectness,plannerValidationCosts,plannerModes,tourPlannerMandatory,tripSnapshot}.test.js` (5 lệnh riêng) | 0 từng lệnh | 8, 50, 17, 9, 35 checks PASS; `tripSnapshot` là unit only. |
| `node dist/scripts/verifyDatabase.js` | 0 | Guard/sentinel/schema preflight PASS trên exact test target. |
| `node dist/evaluation/t11_db_fingerprint.js snapshot ../docs/evidence/t11/db_fingerprint_before.json` | 0 | 25 bảng, trước write. |
| `node dist/tests/tripSnapshot.postgres.test.js` | 0 | 11 nhóm HTTP/PostgreSQL PASS, fixture cleanup. |
| `node dist/evaluation/t11_db_fingerprint.js snapshot ../docs/evidence/t11/db_fingerprint_after.json` | 0 | 25 bảng, sau cleanup. |
| `node dist/evaluation/t11_db_fingerprint.js compare ../docs/evidence/t11/db_fingerprint_before.json ../docs/evidence/t11/db_fingerprint_after.json` | 0 | `changed=[]`. |
| `node dist/evaluation/t11_evaluate.js src/evaluation/t11_scenarios_v1.json ../docs/evidence/t11/final ../docs/evidence/t11/db_regression_evidence.json` | 0 | **26 PASS / 0 FAIL / 0 NOT RUN**, JSON + CSV cuối. |

Chạy lại phần **không DB**: `cd backend; npm.cmd run build; node dist/evaluation/t11_evaluate.js src/evaluation/t11_scenarios_v1.json <thư-mục-output-mới>`. Output dùng `wx`, không ghi đè; hash spec phải giữ nguyên. DB cần lặp lại verifier → fingerprint trước → test T04 có exact write opt-in → fingerprint sau/compare; chỉ tạo evidence DB mới từ exit code thực, không tái dùng evidence lịch sử làm lần chạy mới. Không đo latency. Correctness trên fixture và sensitivity component là bằng chứng kỹ thuật; **chất lượng người dùng, Precision@k/NDCG và online uplift chưa được đánh giá**.
