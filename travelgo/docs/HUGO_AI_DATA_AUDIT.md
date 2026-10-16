# HuGo AI — Data Audit

> Snapshot: 2026-10-12. Chỉ kiểm tra local/test bằng thao tác read-only. Các con số dưới đây không phải số liệu production.

## 1. Môi trường và phương pháp

- Container: `travelgo_postgres`, image `postgis/postgis:15-3.4-alpine`, trạng thái healthy, port local 5432.
- Database được xác nhận: `travelgo_phase35_test`.
- PostGIS: `3.4.3`.
- Migration tracked: `20261011_01` đến `20261011_04`.
- Schema verifier chạy lại với `DB_NAME=travelgo_phase35_test` PASS: 4 migrations, 18 application tables, 28 foreign keys.
- `.env` mặc định hiện trỏ `travelgo_dev`; verifier trên database này FAIL vì thiếu `20261011_04_hugo_intelligence_foundation.sql`. Audit không tự chạy migration do chưa kiểm kê/backup database đó. Mọi lệnh AI phải chỉ rõ đúng test database, không dựa vào tên mặc định.
- Không xóa/reset/truncate/seed lại hoặc thay đổi dữ liệu trong audit này.

## 2. Inventory database thực tế

| Bảng | Rows | Ý nghĩa ML | Nhận định |
|---|---:|---|---|
| users | 21 | user key sau pseudonymization | Seed/test; không suy luận dân số người dùng |
| user_roles | 31 | role filter | Không phải feature sở thích |
| businesses | 9 | nhà cung cấp | Seed/test |
| business_members | 9 | ownership/RBAC | Không đưa vào rank trừ eligibility |
| partner_applications | 10 | workflow | Không phải tín hiệu chất lượng |
| places | 9 | item catalog | Quá ít cho ML; đủ demo rule-based |
| tours | 8 | item catalog | Quá ít cho ML |
| tickets | 11 | inventory/pricing | Dùng constraint tại thời điểm request |
| bookings | 12 | conversion/availability | 6 PENDING, 6 CONFIRMED; đều thuộc luồng test |
| booking_status_history | 17 | funnel | Chưa có lịch sử đại diện |
| reviews | 0 | sentiment/quality | **BLOCKED** |
| trip_sessions | 8 | preference/itinerary | Tất cả `upcoming`, dữ liệu test |
| user_events | 2 | interaction | 1 VIEW, 1 CLICK; test endpoint |
| recommendation_impressions | 0 | exposure/ranking label | **BLOCKED** |
| ai_model_registry | 0 | model lifecycle | Schema sẵn, chưa sử dụng |
| blog_posts | 5 | travel content | Cần provenance/moderation trước NLP |
| audit_logs | 23 | security audit | Không phải training data mặc định |
| tour_places | 0 | tour-place relation | Chưa có graph liên kết |

## 3. Place/Hotel/Restaurant/Tour

Phân bố `places`:

- APPROVED: 4 attraction, 1 hotel, 1 restaurant;
- DRAFT: 1 attraction; PENDING: 1; SUSPENDED: 1;
- 9/9 có tọa độ và `price_from`;
- 9/9 có `opening_hours = {}` — tức thiếu dữ liệu giờ mở cửa có thể sử dụng;
- completeness (NULL hoặc object/list rỗng được tính là thiếu): district 9/9 (100%), duration 9/9 (100%), gallery 9/9 (100%), opening hours 9/9 (100%), amenities 7/9 (77,8%), contact info 7/9 (77,8%), highlights 4/9 (44,4%); summary/description/hero/coordinates/price không thiếu theo kiểm tra cấu trúc.

Phân bố `tours`: 8 rows, gồm 5 APPROVED, 1 DRAFT, 1 PENDING, 1 SUSPENDED; tất cả category `culture`. Completeness: meeting point, gallery, itinerary days và start/end dates đều thiếu 8/8 (100%); exclusions 8/8; inclusions/highlights thiếu 7/8 (87,5%); summary/description/hero/price có giá trị cấu trúc. Vì price có giá trị không đồng nghĩa giá còn hiệu lực, vẫn cần source/unit/validity.

Rủi ro:

- `price_from` không chứa unit (`per person`, `per night`, `per ticket`), currency/source/validity; không đủ để tính ngân sách chính xác;
- Place model gộp attraction/hotel/restaurant, còn Tour/Ticket có bảng riêng; candidate pipeline phải chuẩn hóa feature nhưng giữ logic eligibility khác nhau;
- trạng thái DRAFT/PENDING/SUSPENDED tuyệt đối không được đi vào public training label/ranking candidate nếu chưa có lý do nghiên cứu rõ ràng;
- tọa độ đủ vẽ pin/Haversine nhưng chưa chứng minh road access hoặc điểm vào thực tế.

Độ sẵn sàng: **rule-based demo = PARTIAL; supervised recommender = NOT READY**.

## 4. Review và rating

### Source hiện có

- API đọc/tạo review đã code tại `/api/places/:id/reviews`.
- Khi tạo review, service cập nhật average rating và Bayesian rating trong transaction.
- Schema có overall rating và bốn criteria: service, price, location, experience.
- Database snapshot có 0 review nên không có star distribution, recency, aspect distribution hay verified review.

### Khoảng trống chất lượng dữ liệu

- chưa có FK đa hình từ `reviews.target_id` tới resource;
- chưa gắn review với booking COMPLETED;
- chưa có verified flag do server xác nhận;
- chưa thấy uniqueness/rate guard “một booking — một review”;
- controller chuyển `rating` bằng `Number()` nhưng cần validation 1–5, độ dài comment, image provenance và abuse controls ở boundary;
- criteria mặc định bằng overall rating có thể tạo dữ liệu aspect giả nếu người dùng không nhập từng tiêu chí; cần cờ `criteriaProvided` hoặc NULL.

Độ sẵn sàng: **Vietnamese sentiment trên internal data = BLOCKED**. Bộ Kaggle tiếng Anh chỉ là benchmark nghiên cứu, không được map vào địa điểm Việt Nam thật.

## 5. Popularity và demand

| Khái niệm | Có schema/data? | Được phép kết luận |
|---|---|---|
| Page view | event type có; 1 bản ghi test | Chỉ test collector |
| Unique visitor | có `session_id`; chưa đủ dữ liệu | Không có DAU/MAU đáng tin |
| Click | 1 test event | Không suy luận popularity |
| Favorite | localStorage phía frontend | Không có server truth |
| Booking created | 12 test rows | Kiểm thử nghiệp vụ, không phải demand |
| Booking completed | 0 | Không có conversion hoàn tất |
| Verified visit | chưa có cơ chế đủ mạnh | GPS check-in hiện chưa xác minh khoảng cách |
| Cancellation | 0 trong snapshot | Không có cancellation rate |
| Seasonality | một ngày test | Không thể dự báo |

Không gộp VIEW/CLICK/BOOKING thành một “lượt khách”. Mỗi metric cần định nghĩa mẫu số, cửa sổ thời gian, bot/test filtering và uncertainty.

Độ sẵn sàng: **descriptive analytics = BLOCKED ngoài demo; forecasting = BLOCKED**.

## 6. Customer preference và Trip

`trip_sessions` có destination, date range, people/budget thông qua itinerary payload, pacing, preferences, selected IDs, itinerary/check-ins JSONB. Snapshot có 8 trip, tất cả upcoming.

Vấn đề:

- quá ít và là test data;
- `createTripFromPlanner` hiện lưu `preferences: []`, nên sở thích nhập ở planner bị mất khi save;
- không có consent/opt-out marker cho personalization;
- favorites chỉ nằm ở localStorage;
- check-in/free-text notes và GPS là dữ liệu nhạy cảm, không được upload Kaggle thô;
- JSONB thuận tiện P0 nhưng cần schema version để export ổn định.

Độ sẵn sàng: **personalization ML = NOT READY; explicit-preference rule = READY sau khi sửa lưu preferences**.

## 7. Recommendation exposure và bias

Schema `recommendation_impressions` đã có `request_id`, user/session, item, rank, score, breakdown, reason, model version, context; đây là nền tốt. Nhưng có 0 rows và recommendation service chưa ghi bảng này.

Muốn tạo label hợp lệ:

1. ghi toàn bộ candidate đã thực sự render, không chỉ item được click;
2. event CLICK/SAVE/BOOKING phải mang cùng `requestId` và item;
3. loại bot, test và duplicate; định nghĩa attribution window;
4. lưu rank/eligibility/model/policy để đo position/exposure bias;
5. dùng negative là item đã exposure nhưng không tương tác trong cửa sổ hợp lý, không coi mọi item khác là negative;
6. chia train/test theo thời gian và user/session, tránh leakage;
7. trước online exploration phải có guardrail và giới hạn traffic.

Độ sẵn sàng Learning-to-Rank: **BLOCKED**.

## 8. Phân loại nguồn dữ liệu

| Nhóm | Ví dụ | Được dùng thế nào |
|---|---|---|
| Production | review/event/booking thật có consent trong tương lai | Training/evaluation sau privacy, provenance, retention review |
| Internal test | database snapshot hiện tại | Integration/demo; loại khỏi kết quả ML |
| Training external | dataset Việt có license rõ | Pretraining/fine-tuning research; không gán entity HuGo |
| Validation/test | tập gán nhãn HuGo tách biệt, khóa trước training | Báo cáo domain performance |
| Benchmark | 10k English Restaurant Reviews | So sánh pipeline kỹ thuật, không claim tiếng Việt |
| Synthetic/demo | câu intent tự tạo, seeded catalog | Test schema/edge cases; phải dán nhãn synthetic |

## 9. Dataset bên ngoài đề xuất

| Dataset | Phù hợp | License / rủi ro | Quyết định |
|---|---|---|---|
| 10,000 Restaurant Reviews (Kaggle) | English sentiment baseline | Cần lưu snapshot trang/license cùng manifest; domain Ấn Độ, label sinh từ stars | Giữ làm benchmark, không production |
| [VLSP 2018 VABSA](https://vlsp.org.vn/node/82) | Vietnamese hotel/restaurant aspect sentiment | Nguồn nghiên cứu chính thức; phải đăng ký/đọc điều kiện phân phối trước dùng | Ưu tiên nếu quyền sử dụng phù hợp |
| [h-i-e-u/vietnamese-SA-dataset](https://huggingface.co/datasets/h-i-e-u/vietnamese-SA-dataset) | Baseline Vietnamese 3 lớp | Card ghi MIT nhưng số lượng mô tả và viewer không nhất quán; phải pin revision, audit source/duplicates | Dùng thử sau audit |
| [CausaSent ATE v2](https://huggingface.co/datasets/Tamir39/causasent-ate-v2) | Aspect term extraction | CC BY-SA 4.0; phần lớn e-commerce, hotel/restaurant gold nhỏ | Benchmark phụ, không đại diện travel Việt |
| Dataset Kaggle không ghi license rõ | Có thể giống restaurant review | Không đủ quyền sử dụng | Không dùng cho artifact tích hợp |
| Google Maps reviews/content | Có vẻ hấp dẫn | Google Maps Terms hạn chế dùng Maps Content cho AI training/evaluation | Không scrape/không train |

Mỗi dataset phải có: source URL, owner, license text/snapshot, revision/hash, acquisition date, allowed purpose, row counts trước/sau clean, split hash và transformations.

## 10. Privacy và re-identification

### Không export

- email, phone, password/hash, JWT/refresh token, API key;
- tên người dùng/reviewer/avatar nếu không có quyền;
- raw IP/user-agent, tọa độ GPS chính xác theo chuỗi thời gian;
- notes/free text chưa scan PII;
- business-private inventory, partner contact, audit content không cần thiết.

### Export an toàn hơn

- HMAC ID với salt chỉ giữ local; không dùng hash không salt của email/phone;
- coarse geo/city thay vì raw home/location history;
- bucket thời gian và budget khi mục tiêu không cần độ chính xác cao;
- suppress nhóm quá nhỏ và kiểm tra quasi-identifiers kết hợp;
- manifest ghi query, columns, retention, người phê duyệt;
- Kaggle dataset ở chế độ private; artifacts tải về rồi xóa khỏi notebook/input không cần thiết.

Pseudonymization không phải anonymization. Cần threat review tái nhận dạng trước mỗi export.

## 11. Data contract cần thu thập

### Event tối thiểu

`event_id`, `session_id`, optional pseudonymous `user_id`, `request_id`, `item_id/type`, `event_type`, `occurred_at`, `source`, `context_schema_version`, device class, locale; không nhận role/user ID tùy ý từ client.

### Impression tối thiểu

`request_id`, policy/model version, candidate item/rank, eligibility result, score components, UI surface, filters, timestamp. Nên ghi server-side khi response được tạo và bổ sung render acknowledgement nếu cần đo visibility.

### Review verification

`booking_id`, resource ID, user ID, completed-at, review-at, verified-by-server; unique constraint phù hợp. Không cho client đặt verified.

### Price

`item_id`, unit, amount, currency, source, observed_at, valid_from/to, tax/fee inclusion, confidence/status (`ACTUAL`, `ESTIMATED`, `UNKNOWN`).

## 12. Quality gates trước khi train

Đây là gate dự án, không phải định luật chung:

- Vietnamese sentiment: license PASS; ≥3.000 mẫu travel/service sau dedupe; mỗi lớp test ≥200; test set có dữ liệu HuGo hoặc gán nhãn cùng guideline; inter-annotator agreement được báo cáo.
- Aspect: mỗi aspect được đánh giá cần ≥100 positive instances trong test hoặc phải gộp/không báo metric.
- LTR: ≥10.000 valid impressions, ≥500 sessions/users có consent, đủ positive outcome và ít nhất 4 tuần; coverage theo rank/surface; propensity/position diagnostics PASS.
- Forecasting: tối thiểu 12 tháng dữ liệu đều theo grain tuần (tốt hơn 18–24 tháng), completed/cancelled tách riêng; seasonal-naive backtest trước model phức tạp.
- Route planner: tọa độ, duration và opening hours hợp lệ cho ≥90% candidate demo; mọi unknown phải hiển thị rõ.

Nếu không đạt gate, dùng deterministic baseline và báo **BLOCKED**, không tạo dữ liệu giả để claim hiệu quả.

## 13. Kết luận audit

| Use case | Status |
|---|---|
| English research sentiment baseline | PASS theo notebook đã chạy |
| Internal Vietnamese review intelligence | BLOCKED — 0 reviews |
| Explainable Bayesian ranking demo | PARTIAL — code có, catalog nhỏ/test data |
| Personalized ML recommendation | BLOCKED — thiếu impressions/feedback |
| Popularity analytics | BLOCKED — chỉ 2 test events |
| Demand forecasting | BLOCKED — không có time series |
| Constraint itinerary demo | PARTIAL — cần price/opening-hour/routing truth |
| Production AI training readiness | FAIL tại snapshot hiện tại |

Hành động dữ liệu đầu tiên không phải train thêm model lớn; đó là **hoàn thiện data contracts, nối impression/event/favorite/review verification, sửa persistence preferences và xây một tập Vietnamese travel test có quyền sử dụng rõ ràng**.
