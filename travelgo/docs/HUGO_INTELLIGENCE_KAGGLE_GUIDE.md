# HuGo Intelligence — hướng dẫn làm AI trên Kaggle từ số 0

## 1. Cần hiểu đúng trước khi bắt đầu

HuGo Intelligence không nên là một mô hình duy nhất. Hệ thống đúng gồm bốn khối:

1. **Review Intelligence**: đọc review, phát hiện cảm xúc và các khía cạnh như dịch vụ, giá, vị trí, vệ sinh.
2. **Quality Scorer**: tính điểm chất lượng có xét số lượng review, độ mới và booking đã xác minh; không xếp một địa điểm có một review 5 sao lên đầu.
3. **Personalized Recommender**: học sở thích từ VIEW, CLICK, FAVORITE, ADD_TO_TRIP, BOOKING và hiển thị lý do gợi ý.
4. **Itinerary Planner**: chọn địa điểm rồi sắp lịch theo giờ mở cửa, ngân sách, thời gian di chuyển và tọa độ. Google Routes phục vụ tính đường ở runtime.

Kaggle dùng để **khám phá dữ liệu, huấn luyện, đánh giá và xuất model**. Kaggle Notebook không phải server production chạy 24/7. Khi model đạt chuẩn, backend HuGo Travel sẽ nạp artifact hoặc gọi một AI service riêng.

## 2. Mở những ứng dụng nào

Mở đúng sáu ứng dụng/tab sau:

| Ứng dụng | Dùng để làm gì | Có bắt buộc không |
|---|---|---|
| **Docker Desktop** | Chạy PostgreSQL/PostGIS local | Có khi xuất dữ liệu TravelGo |
| **Visual Studio Code** | Mở code dự án và copy notebook mẫu | Có |
| **PowerShell** | Chạy migration, kiểm tra schema, xuất dataset | Có |
| **Chrome/Edge — Kaggle** | Huấn luyện và đánh giá model | Có |
| **pgAdmin tại `http://localhost:5050`** | Xem bảng theo kiểu giao diện; chỉ đọc khi chưa chắc | Không bắt buộc |
| **Google Cloud Console** | Tạo Maps/Places/Routes API key ở giai đoạn tích hợp bản đồ | Làm sau |

Không cần mở Google Colab. Không cần GPU cho notebook review v1. Không nhập mật khẩu database hoặc Google API key vào Kaggle.

## 3. Làm ngay với dataset “10,000 Restaurant Reviews” đang gắn trên Kaggle

Dataset trong ảnh có các cột `Restaurant`, `Reviewer`, `Review`, `Rating`, `Metadata`, `Time`, `Pictures` và một cột lạ `7514`. Dataset này chỉ phù hợp để thử nghiệm review nhà hàng tiếng Anh. Nó **không có** tọa độ, khách sạn, tour, lịch sử người dùng HuGo hoặc thời gian di chuyển, vì vậy chưa thể tạo AI cá nhân hóa hoàn chỉnh.

### Bước 3.1 — kiểm tra quyền sử dụng

1. Trong panel phải của Kaggle, bấm tên dataset **10000 Restaurant Reviews**.
2. Mở trang dataset và đọc mục **License**.
3. Nếu license không cho phép dùng lại/huấn luyện hoặc không rõ nguồn, chỉ dùng để học trong notebook private; không đưa model đó vào sản phẩm.
4. Không giả định review này là dữ liệu Google Maps.

### Bước 3.2 — cài đặt notebook

1. Mở notebook đang có trên Kaggle.
2. Bên phải mở **Session options**.
3. Chọn **Accelerator: None**. Mô hình TF-IDF + Logistic Regression dùng CPU.
4. Để **Internet: Off**. Notebook mẫu không cần tải package/model bên ngoài.
5. Xóa hoặc giữ cell kiểm tra hiện tại đều được; không dùng `files[0]` vì sau này gắn nhiều dataset sẽ dễ chọn nhầm file.

### Bước 3.3 — đưa code đúng vào Kaggle

1. Trong VS Code, mở file [`ai/kaggle/00_quickstart_restaurant_reviews.py`](../ai/kaggle/00_quickstart_restaurant_reviews.py).
2. Nhấn `Ctrl+A`, rồi `Ctrl+C`.
3. Quay lại Kaggle, bấm **+ Code**.
4. Dán toàn bộ code vào cell mới bằng `Ctrl+V`.
5. Bấm nút tam giác **Run** của cell. Có thể dán mỗi đoạn bắt đầu bằng `# %%` vào một cell riêng nếu muốn chạy từng bước.
6. Chờ đến dòng cuối: `PASS: prototype Kaggle đã chạy hết`.

Script sẽ làm đúng thứ tự:

- tìm CSV bằng bộ cột bắt buộc thay vì lấy file đầu tiên;
- báo thiếu dữ liệu, trùng lặp và giá trị rating bất thường;
- chuyển rating sang số, chỉ giữ 1–5, không tự bịa giá trị bị thiếu;
- gắn nhãn 1–2 = negative, 3 = neutral, 4–5 = positive;
- chia train/test có `stratify` trước khi fit để tránh rò rỉ dữ liệu;
- huấn luyện TF-IDF từ + ký tự và Logistic Regression;
- xuất Macro-F1, classification report và confusion matrix;
- tính Bayesian rating để giảm thiên lệch do địa điểm có quá ít review;
- tạo một demo gợi ý theo nội dung và chất lượng.

### Bước 3.4 — kiểm tra output

Trong panel phải, mở `/kaggle/working/hugo_intelligence_v1`. Phải có:

- `restaurant_reviews_clean.csv`;
- `data_quality_report.json`;
- `review_sentiment_en_v1.joblib`;
- `review_sentiment_metrics.json`;
- `confusion_matrix.png`;
- `restaurant_quality_scores.csv`;
- `recommendation_demo.csv`.

Đọc `review_sentiment_metrics.json`. Không chỉ nhìn accuracy; cần đọc Macro-F1 và confusion matrix vì lớp neutral thường ít hơn. Nhãn được suy ra từ sao nên kết quả này đo mức khớp giữa câu chữ và số sao, chưa thay thế tập nhãn do người thật kiểm tra.

### Bước 3.5 — lưu đúng cách

1. Bấm **Save Version** ở góc trên phải.
2. Chọn **Quick Save**, để notebook **Private**.
3. Điền ghi chú: `HuGo Review Intelligence v1 - English restaurant baseline`.
4. Không bật publish.
5. Tải các artifact cần thiết từ Output về máy. Không tải lên Git file dataset chứa dữ liệu người dùng.

## 4. Dữ liệu thật cần thu cho HuGo Travel

Mỗi item (địa điểm/khách sạn/nhà hàng/tour) cần một ID ổn định. Không ghép item chỉ bằng tên vì tên có thể trùng hoặc đổi.

### 4.1 Bảng item

Tối thiểu: `id`, `item_type`, `title`, `city`, `province`, `latitude`, `longitude`, `price`, `rating`, `review_count`, `summary`, `description`, `amenities`, `opening_hours`, `status`.

Chỉ xuất item `APPROVED`/`ACTIVE` để model không gợi ý dữ liệu nháp hoặc bị khóa.

### 4.2 Review

Tối thiểu: `review_id`, `item_id`, `user_hash`, `rating`, các điểm thành phần, `comment`, `verified_booking`, `created_at`.

- Không xuất email, số điện thoại, tên thật, avatar hoặc ID người dùng gốc.
- Review từ blogger chỉ dùng khi blogger đăng trực tiếp lên HuGo hoặc HuGo có quyền sử dụng rõ ràng.
- Giữ `verified_booking` để review sau chuyến đi có thể được tin cậy hơn.

### 4.3 Hành vi người dùng và impression

Muốn cá nhân hóa thật, phải ghi cả hành động và những item đã được hiển thị:

- `VIEW`, `CLICK`, `FAVORITE`, `ADD_TO_TRIP`, `BOOKING_CREATED`, `BOOKING_COMPLETED`, `REVIEW_CREATED`;
- `UNFAVORITE`, `REMOVE_FROM_TRIP`, `BOOKING_CANCELLED` là tín hiệu âm;
- impression gồm `request_id`, item nào được hiển thị, vị trí bao nhiêu, score và model version.

Nếu chỉ lưu click mà không lưu impression, model không biết item nào đã được thấy nhưng bị bỏ qua. Không dùng dữ liệu seed để khẳng định độ chính xác; seed chỉ kiểm tra pipeline.

Backend đã có endpoint:

```http
POST /api/intelligence/events
Content-Type: application/json
Authorization: Bearer <access-token-nếu-đã-đăng-nhập>

{
  "sessionId": "web-0f830f41-c711-4a02",
  "itemId": "<UUID địa điểm>",
  "itemType": "restaurant",
  "eventType": "VIEW",
  "source": "home_recommendation",
  "context": { "screen": "place_detail", "position": 2 }
}
```

Server lấy `user_id` từ token, không nhận `user_id` do trình duyệt tự gửi. Không ghi email, search text nhạy cảm hoặc access token vào `context`.

## 5. Xuất dữ liệu TravelGo an toàn để đưa lên Kaggle

Phần này chỉ dùng database local/test. Migration mới là additive; không xóa, truncate hoặc sửa record cũ.

### Bước 5.1 — xác nhận đúng database

1. Mở Docker Desktop và kiểm tra `travelgo_postgres` có chữ **Running/Healthy**.
2. Mở PowerShell tại thư mục `C:\Users\Danh\Downloads\DACN\travelgo\backend`.
3. Đặt biến môi trường. Thay mật khẩu nếu `.env` local của bạn khác:

```powershell
$env:NODE_ENV='test'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5432'
$env:DB_USER='postgres'
$env:DB_PASSWORD='travelgo2026'
$env:DB_NAME='travelgo_phase35_test'
$env:DB_SSL='false'
```

Tên database bắt buộc phải có `test` hoặc `dev`, host bắt buộc là loopback và không được là production. Không chụp màn hình/lưu notebook có mật khẩu này.

### Bước 5.2 — dry-run, apply và verify

Chạy từng lệnh, đọc dòng `Target` trước khi chạy lệnh tiếp:

```powershell
npm.cmd run db:migrate
npm.cmd run db:migrate:apply
npm.cmd run db:verify
```

Dry-run phải chỉ ra đúng `travelgo_phase35_test`. Verify hiện tại cần báo 4 migrations, 18 application tables, PostGIS và `result: PASS`.

### Bước 5.3 — tạo salt và export

Đặt một chuỗi bí mật riêng tối thiểu 16 ký tự; cùng một chuỗi giúp cùng user có cùng hash giữa các lần export. Không upload chuỗi này lên Kaggle/Git:

```powershell
$env:AI_EXPORT_SALT='thay-bang-chuoi-bi-mat-dai-va-ngau-nhien'
npm.cmd run ai:export
```

Output nằm trong `travelgo\ai\data\exports\<timestamp>`. Script chạy transaction **READ ONLY**, ẩn danh user bằng HMAC-SHA256, che email/số điện thoại trong text, chỉ lấy nội dung TravelGo đã duyệt và tạo `manifest.json`. Thư mục export đã được Git ignore.

### Bước 5.4 — upload lên Kaggle dạng private

1. Vào Kaggle, chọn **Datasets** → **New Dataset**.
2. Đặt tên `hugo-travelgo-private-export-v1`.
3. Upload sáu file của đúng một thư mục timestamp: `manifest.json`, `items.csv`, `reviews.csv`, `events.csv`, `impressions.csv`, `blog_mentions.csv`.
4. Chọn **Private**; không publish.
5. Tạo notebook mới → **Add Input** → **Your Datasets** → chọn dataset vừa tạo.
6. Trong VS Code mở [`ai/kaggle/01_travelgo_data_quality.py`](../ai/kaggle/01_travelgo_data_quality.py), copy toàn bộ vào một Kaggle Code cell và Run.
7. Chỉ tiếp tục huấn luyện khi có dòng `PASS: TravelGo export hợp lệ`.

Nếu `reviews=0`, `events=0` hoặc `impressions=0`, đó không phải lỗi export. Nó cho biết chưa có đủ dữ liệu thật để huấn luyện cá nhân hóa. Tiếp tục chạy website và thu dữ liệu có sự đồng ý; không tạo hàng nghìn interaction giả rồi gọi đó là kết quả thật.

## 6. Nên lấy dữ liệu bổ sung ở đâu

| Nguồn | Dùng cho | Cách dùng đúng |
|---|---|---|
| Dataset Restaurant Reviews đang có | Baseline sentiment tiếng Anh | Kiểm tra license; chỉ prototype |
| [MIT Vietnamese SA dataset](https://huggingface.co/datasets/h-i-e-u/vietnamese-SA-dataset) | Học sentiment tiếng Việt tổng quát | Kiểm tra license/card trước khi download; cần fine-tune tiếp trên review du lịch HuGo |
| [CausaSent ATE v2](https://huggingface.co/datasets/Tamir39/causasent-ate-v2) | Thử nghiệm aspect extraction, có một phần hotel/restaurant | Tuân thủ CC BY-SA 4.0 và ghi attribution; kiểm tra domain trước khi trộn |
| Review và booking HuGo | Nguồn chính cho production | Có consent, ẩn danh, chia theo thời gian |
| Bài blogger đăng/được cấp phép trên HuGo | Trích đặc trưng địa điểm và giải thích | Lưu quyền sử dụng, nguồn và ngày cập nhật |
| OpenStreetMap | Dữ liệu GIS mở bổ sung | Tuân thủ ODbL và attribution |

Không scrape review Google Maps. Điều khoản Google Maps Platform không cho dùng Google Maps Content để train, test, validate hoặc fine-tune AI. Có thể lưu `place_id` để liên kết và gọi Places API ở runtime, đồng thời hiển thị attribution đúng chính sách. Xem [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms?sign=1) và [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies).

## 7. Tích hợp Google Maps đúng vai trò

Làm sau khi recommender dữ liệu HuGo đã chạy:

1. Vào Google Cloud Console → tạo project riêng `hugo-travel-local`.
2. Bật billing và chỉ bật **Maps JavaScript API**, **Places API (New)**, **Routes API**.
3. Tạo một browser key, giới hạn bằng HTTP referrer của frontend và giới hạn đúng ba API cần dùng.
4. Nếu backend gọi Routes API, tạo server key riêng và giới hạn IP/API. Không đưa server key vào frontend/Kaggle.
5. AI chọn **ứng viên** từ dữ liệu HuGo. Routes API tính thời gian/quãng đường và có thể tối ưu thứ tự waypoint; planner dùng kết quả đó để loại lịch trình không khả thi. Xem [Optimize waypoint order](https://developers.google.com/maps/documentation/routes/opt-way).
6. Nội dung Google trả về chỉ phục vụ hiển thị/runtime theo điều khoản; không chép vào `reviews.csv` để train.

## 8. Lộ trình model sau notebook đầu tiên

### Giai đoạn A — review intelligence

- Gắn nhãn thủ công một tập review tiếng Việt theo positive/neutral/negative và các khía cạnh service/price/location/cleanliness/food.
- Hai người gắn nhãn độc lập một phần dữ liệu và xử lý bất đồng.
- Chia train/validation/test theo thời gian hoặc theo item; không để cùng câu review lọt hai tập.
- Baseline TF-IDF trước, sau đó mới thử PhoBERT/multilingual model nếu baseline chưa đủ.

### Giai đoạn B — quality score

Điểm gợi ý không được bằng trung bình sao đơn giản. Bắt đầu với:

```text
quality = 0.45 * bayesian_rating
        + 0.20 * verified_review_ratio
        + 0.15 * review_recency
        + 0.10 * sentiment_aspect_score
        + 0.10 * data_completeness
```

Chuẩn hóa mọi thành phần về 0–1, lưu `score_breakdown` và không cho blogger/partner tự quyết trọng số của item họ sở hữu.

### Giai đoạn C — personalized recommender

1. Cold-start: filter theo thành phố, ngân sách, loại hình, giờ mở cửa; xếp bằng quality + content similarity + diversity.
2. Khi có đủ hành vi: implicit-feedback model hoặc learning-to-rank từ impressions/events.
3. Chia dữ liệu theo thời gian: train ở quá khứ, test ở tương lai.
4. Luôn có fallback rule-based nếu model/service lỗi.

### Giai đoạn D — itinerary planner

Planner phải coi các điều kiện sau là constraint cứng: thời gian chuyến đi, giờ mở cửa, ngân sách, thời lượng tham quan, thời gian di chuyển, tọa độ hợp lệ. Preference score là mục tiêu mềm. Nếu lịch không khả thi, trả lời rõ lý do thay vì bịa lịch.

## 9. Khi nào được nói “AI chạy đúng”

Chỉ đánh dấu một model đủ điều kiện thử nghiệm khi:

- data gate PASS, không có PII và nguồn/license được ghi lại;
- kết quả tốt hơn baseline trên test set chưa từng thấy;
- sentiment báo Macro-F1, per-class precision/recall và confusion matrix;
- recommender báo Recall@10, NDCG@10, coverage, diversity và cold-start result;
- test theo lát cắt city, item type, mức giá và user mới để phát hiện thiên lệch;
- itinerary có 0 vi phạm constraint cứng trên bộ test;
- artifact có dataset version, seed, code version, metrics và SHA-256;
- chạy shadow trước A/B test; có fallback và giám sát drift;
- không dùng dữ liệu seed hoặc chính rating tạo label để tuyên bố chất lượng production.

## 10. Kiến trúc triển khai đề xuất

```text
PostgreSQL/PostGIS (TravelGo)
        │ export đã ẩn danh
        ▼
Kaggle private notebook ──> model artifact + metrics + manifest
        │ tải artifact đã duyệt về local
        ▼
HuGo AI service (Python/FastAPI, làm ở bước tiếp theo)
        │ recommendation/score/plan API
        ▼
TravelGo backend (auth, RBAC, logging, fallback)
        │
        ▼
Frontend + Google Maps/Routes runtime
```

Không để frontend gọi thẳng model, không đặt database credential trong notebook và không biến Kaggle Notebook thành production API.

## 11. Checklist công việc ngay bây giờ

- [ ] Chạy `00_quickstart_restaurant_reviews.py` trên notebook hiện tại và chụp lại metrics/output.
- [ ] Xác nhận license của dataset 10,000 reviews.
- [ ] Thu tối thiểu dữ liệu HuGo review/event/impression thật; giữ notebook và dataset private.
- [ ] Export bằng `npm.cmd run ai:export` từ database test/dev local đã xác nhận.
- [ ] Chạy `01_travelgo_data_quality.py` trên Kaggle.
- [ ] Chỉ khi `reviews/events/impressions` đủ dữ liệu mới huấn luyện recommender cá nhân hóa.
- [ ] Sau đó xây AI service local, tích hợp backend và test shadow trước khi cho người dùng thật.
