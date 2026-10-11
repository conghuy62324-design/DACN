# Hướng dẫn từng bước xây dựng HuGo Intelligence trên Kaggle

Tài liệu này dành cho người mới. Hãy làm đúng thứ tự và không bỏ qua bước kiểm tra. Mục tiêu đầu tiên là chạy được mô hình phân tích review trên Kaggle; sau đó mới dùng dữ liệu thật của TravelGo để xây hệ thống gợi ý cá nhân hóa.

---

## 0. Kết quả cuối cùng chúng ta sẽ xây

HuGo Intelligence gồm bốn phần:

1. **Review Intelligence**: đọc review và phân loại tích cực, trung lập, tiêu cực.
2. **Quality Scorer**: đánh giá chất lượng địa điểm dựa trên điểm sao, số review, độ mới và booking đã xác minh.
3. **Personalized Recommender**: gợi ý địa điểm, nhà hàng, khách sạn và tour theo sở thích từng người.
4. **Itinerary Planner**: tạo lịch trình phù hợp ngân sách, thời gian, vị trí và giờ mở cửa.

Kaggle chỉ dùng để chuẩn bị dữ liệu, huấn luyện và đánh giá model. Kaggle không phải server chạy AI cho website 24/7. Sau khi model đạt chuẩn, model sẽ được đưa vào một AI API để TravelGo backend sử dụng.

---

# PHẦN A — CHẠY AI ĐẦU TIÊN VỚI 10,000 RESTAURANT REVIEWS

## A1. Mở đúng ứng dụng

Ở phần A, chỉ mở hai ứng dụng:

1. **Chrome hoặc Edge**: mở Kaggle Notebook.
2. **Visual Studio Code**: mở thư mục dự án.

Trong Visual Studio Code, chọn:

```text
File → Open Folder
```

Chọn thư mục:

```text
C:\Users\Danh\Downloads\DACN\travelgo
```

Chưa cần mở Docker Desktop, PowerShell hoặc pgAdmin ở phần A.

## A2. Kiểm tra dataset trên Kaggle

Trong Kaggle Notebook, nhìn panel bên phải:

```text
Input
└── 10000 Restaurant Reviews
```

Thực hiện:

1. Bấm mũi tên cạnh `10000 Restaurant Reviews`.
2. Kiểm tra có file `Restaurant reviews.csv`.
3. Bấm vào tên dataset và kiểm tra mục `License`.
4. Nếu license không rõ hoặc không cho dùng thương mại, chỉ dùng dataset này để học trong notebook Private.

Đường dẫn file trong notebook hiện tại thường là:

```text
/kaggle/input/datasets/joebeachcapital/restaurant-reviews/Restaurant reviews.csv
```

Dataset có các cột:

```text
Restaurant, Reviewer, Review, Rating, Metadata, Time, Pictures, 7514
```

Cột `7514` có thể là cột lỗi khi xuất CSV. Notebook sẽ không dùng cột này để huấn luyện.

## A3. Cấu hình Kaggle Notebook

Trong panel bên phải:

1. Bấm `Session options`.
2. Chọn `Accelerator: None`.
3. Chọn `Internet: Off`.
4. Nếu có mục persistence, chọn giữ file output.

Mô hình v1 chạy bằng CPU nên không cần GPU.

## A4. Lấy code đã chuẩn bị

Trong Visual Studio Code, mở file:

```text
ai\kaggle\00_quickstart_restaurant_reviews.py
```

Hoặc bấm trực tiếp: [00_quickstart_restaurant_reviews.py](../ai/kaggle/00_quickstart_restaurant_reviews.py)

Sau đó:

1. Nhấn `Ctrl+A` trong file.
2. Nhấn `Ctrl+C`.
3. Quay lại Kaggle Notebook.
4. Bấm `+ Code`.
5. Dán bằng `Ctrl+V`.
6. Bấm nút tam giác `Run` bên trái cell.

Có thể dán toàn bộ file vào một cell. Các dòng bắt đầu bằng `# %%` chỉ là dấu phân chia, không gây lỗi.

## A5. Kiểm tra từng kết quả

### Kiểm tra 1 — tìm đúng CSV

Output phải có dạng:

```text
Selected: /kaggle/input/.../Restaurant reviews.csv
Shape: (10000, 8)
```

Số dòng có thể khác một chút nếu phiên bản dataset thay đổi. Quan trọng nhất là đúng file và có ba cột `Restaurant`, `Review`, `Rating`.

### Kiểm tra 2 — dữ liệu sau làm sạch

Notebook phải in:

```text
rows_raw
rows_clean
rows_removed
class_distribution
```

Quy tắc nhãn:

```text
1–2 sao → negative
3 sao   → neutral
4–5 sao → positive
```

Nếu một lớp có ít hơn hai dòng, notebook sẽ dừng. Không được tự tạo review giả chỉ để vượt kiểm tra.

### Kiểm tra 3 — model review

Notebook phải hiện bảng:

```text
precision  recall  f1-score  support
```

Và dòng:

```text
Macro F1: ...
```

Đọc kết quả tạm thời như sau:

| Macro-F1 | Đánh giá |
|---:|---|
| dưới 0.60 | Chưa đạt baseline |
| 0.60–0.75 | Có thể dùng làm baseline thử nghiệm |
| 0.75–0.85 | Khá, cần kiểm tra dữ liệu |
| trên 0.85 | Kiểm tra kỹ nguy cơ trùng/rò rỉ dữ liệu |

Không dùng accuracy một mình để kết luận model tốt.

### Kiểm tra 4 — điểm chất lượng

Output phải có các cột:

```text
Restaurant
mean_rating
review_count
bayesian_rating
quality_score_0_1
```

`bayesian_rating` giúp địa điểm có một review 5 sao không tự động đứng trên địa điểm có hàng trăm review 4.8 sao.

### Kiểm tra 5 — gợi ý thử nghiệm

Trong code có dòng:

```python
USER_PREFERENCE = "good food friendly service affordable price nice ambience family"
```

Có thể thay bằng một trong các câu:

```python
USER_PREFERENCE = "romantic quiet restaurant good view"
```

```python
USER_PREFERENCE = "cheap local food fast service"
```

Sau khi đổi, chạy lại cell để xem thứ tự nhà hàng thay đổi.

### Kiểm tra 6 — dòng PASS cuối

Dòng cuối phải là:

```text
PASS: prototype Kaggle đã chạy hết. Chưa được gọi là production AI.
```

Nếu không có dòng này, notebook chưa hoàn thành.

## A6. Kiểm tra file output

Trong panel phải của Kaggle, mở:

```text
Output
└── /kaggle/working
    └── hugo_intelligence_v1
```

Phải có:

```text
restaurant_reviews_clean.csv
data_quality_report.json
review_sentiment_en_v1.joblib
review_sentiment_metrics.json
confusion_matrix.png
restaurant_quality_scores.csv
recommendation_demo.csv
```

Ý nghĩa:

| File | Mục đích |
|---|---|
| `review_sentiment_en_v1.joblib` | Model review đã huấn luyện |
| `review_sentiment_metrics.json` | Chỉ số đánh giá model |
| `confusion_matrix.png` | Xem model thường nhầm lớp nào |
| `restaurant_quality_scores.csv` | Điểm chất lượng nhà hàng |
| `recommendation_demo.csv` | Top gợi ý thử nghiệm |
| `data_quality_report.json` | Báo cáo chất lượng dữ liệu |

## A7. Lưu notebook

1. Bấm `Save Version` ở góc trên phải.
2. Chọn `Quick Save`.
3. Nhập ghi chú:

```text
HuGo Review Intelligence v1 - Restaurant baseline
```

4. Đặt notebook là `Private`.
5. Không bấm Publish.

## A8. Kết quả cần gửi lại để kiểm tra

Gửi lại ba nội dung:

1. Ảnh phần cuối notebook có dòng PASS.
2. Nội dung `review_sentiment_metrics.json`.
3. Mười dòng đầu của `recommendation_demo.csv`.

Không chuyển sang model tiếng Việt trước khi phần A chạy PASS.

---

# PHẦN B — DỮ LIỆU THẬT CẦN THU TỪ TRAVELGO

Dataset 10,000 Restaurant Reviews chỉ là baseline tiếng Anh. AI production phải học chủ yếu từ dữ liệu HuGo có quyền sử dụng.

## B1. Dữ liệu item

Mỗi địa điểm, khách sạn, nhà hàng hoặc tour cần một ID ổn định và các trường:

```text
id
item_type
title
city
province
address
latitude
longitude
price
rating
review_count
summary
description
amenities
opening_hours
status
```

Chỉ dùng item có trạng thái `APPROVED` hoặc `ACTIVE`.

## B2. Dữ liệu review

```text
review_id
item_id
item_type
user_hash
rating
rating_service
rating_price
rating_location
rating_experience
comment
verified_booking
created_at
```

Không upload lên Kaggle:

```text
mật khẩu
access token
email
số điện thoại
tên thật
địa chỉ nhà
user_id gốc
```

## B3. Dữ liệu hành vi

Hệ thống cần thu:

```text
VIEW
CLICK
FAVORITE
UNFAVORITE
ADD_TO_TRIP
REMOVE_FROM_TRIP
BOOKING_CREATED
BOOKING_COMPLETED
BOOKING_CANCELLED
REVIEW_CREATED
MAP_OPENED
ROUTE_VIEWED
```

Ngoài hành động, phải lưu danh sách item đã hiển thị trong `recommendation_impressions`. Nếu chỉ lưu click, model không biết người dùng đã thấy item nào nhưng không chọn.

Backend đã có endpoint:

```http
POST /api/intelligence/events
```

Ví dụ body:

```json
{
  "sessionId": "web-session-12345678",
  "itemId": "uuid-cua-dia-diem",
  "itemType": "restaurant",
  "eventType": "VIEW",
  "source": "home_recommendation",
  "context": {
    "screen": "home",
    "position": 2
  }
}
```

Không gửi `userId` từ frontend. Backend tự lấy user từ access token.

---

# PHẦN C — XUẤT DỮ LIỆU TRAVELGO ĐỂ ĐƯA LÊN KAGGLE

Chỉ thực hiện trên database local/test. Không thực hiện trên production.

## C1. Mở ứng dụng

Mở:

1. Docker Desktop.
2. PowerShell.
3. Visual Studio Code.
4. Chrome/Edge mở Kaggle.

Trong Docker Desktop, `travelgo_postgres` phải có trạng thái `Running` hoặc `Healthy`.

## C2. Mở PowerShell đúng thư mục

```powershell
cd C:\Users\Danh\Downloads\DACN\travelgo\backend
```

Đặt biến môi trường:

```powershell
$env:NODE_ENV='test'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5432'
$env:DB_USER='postgres'
$env:DB_PASSWORD='travelgo2026'
$env:DB_NAME='travelgo_phase35_test'
$env:DB_SSL='false'
```

Nếu mật khẩu Docker local đã được thay đổi, sử dụng mật khẩu local thật thay cho `travelgo2026`.

## C3. Kiểm tra migration trước khi ghi

Chạy:

```powershell
npm.cmd run db:migrate
```

Đọc dòng:

```text
Target: postgresql://postgres@127.0.0.1:5432/travelgo_phase35_test
Mode: DRY RUN
```

Nếu target không phải `travelgo_phase35_test`, dừng ngay và không chạy apply.

Nếu đúng target, chạy:

```powershell
npm.cmd run db:migrate:apply
npm.cmd run db:verify
```

Kết quả verify cần có:

```json
{
  "database": "travelgo_phase35_test",
  "migrations": 4,
  "applicationTables": 18,
  "foreignKeys": 28,
  "result": "PASS"
}
```

## C4. Export dữ liệu đã ẩn danh

Đặt salt riêng. Không đưa salt lên Kaggle hoặc Git:

```powershell
$env:AI_EXPORT_SALT='thay-bang-chuoi-bi-mat-dai-va-ngau-nhien'
npm.cmd run ai:export
```

Output nằm trong:

```text
C:\Users\Danh\Downloads\DACN\travelgo\ai\data\exports\<timestamp>
```

Phải có:

```text
manifest.json
items.csv
reviews.csv
events.csv
impressions.csv
blog_mentions.csv
```

Script export:

- chạy transaction read-only;
- ẩn danh user và session bằng HMAC-SHA256;
- che email và số điện thoại trong text;
- chỉ lấy nội dung đã duyệt;
- không xuất Google Maps Content;
- không xuất password hoặc access token.

## C5. Upload dataset lên Kaggle

1. Vào Kaggle.
2. Chọn `Datasets`.
3. Bấm `New Dataset`.
4. Đặt tên:

```text
hugo-travelgo-private-export-v1
```

5. Chọn `Private`.
6. Upload đúng sáu file trong cùng một thư mục timestamp.
7. Không upload `AI_EXPORT_SALT`.
8. Không Publish.

## C6. Kiểm tra dataset TravelGo trên Kaggle

1. Tạo notebook mới.
2. Bấm `Add Input`.
3. Chọn `Your Datasets`.
4. Chọn `hugo-travelgo-private-export-v1`.
5. Trong VS Code, mở:

```text
ai\kaggle\01_travelgo_data_quality.py
```

Hoặc bấm: [01_travelgo_data_quality.py](../ai/kaggle/01_travelgo_data_quality.py)

6. Copy toàn bộ file.
7. Dán vào Kaggle Code cell.
8. Bấm Run.

Dòng cuối phải là:

```text
PASS: TravelGo export hợp lệ. Đây là data gate, chưa huấn luyện recommender.
```

Nếu `reviews`, `events` hoặc `impressions` bằng 0, export vẫn có thể PASS, nhưng chưa có đủ dữ liệu để huấn luyện cá nhân hóa.

---

# PHẦN D — LẤY THÊM DỮ LIỆU Ở ĐÂU

## D1. Nguồn nên dùng

1. Review, booking và hành vi người dùng HuGo đã được ẩn danh.
2. Bài blogger đăng trực tiếp trên HuGo hoặc có giấy phép sử dụng.
3. Dataset sentiment tiếng Việt có license rõ ràng.
4. OpenStreetMap cho dữ liệu GIS nếu tuân thủ ODbL và attribution.

Dataset tham khảo:

- [MIT Vietnamese SA dataset](https://huggingface.co/datasets/h-i-e-u/vietnamese-SA-dataset)
- [CausaSent ATE v2](https://huggingface.co/datasets/Tamir39/causasent-ate-v2)

## D2. Nguồn không được tùy tiện dùng

- Không scrape review Google Maps.
- Không copy bài blogger khi chưa có quyền.
- Không mua dataset không rõ nguồn.
- Không upload dữ liệu người dùng có email, số điện thoại hoặc token lên Kaggle.

Google Maps Content không được dùng để train, test, validate hoặc fine-tune AI theo [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms?sign=1). `place_id`, Maps, Places và Routes API chỉ nên dùng để liên kết/hiển thị/tính đường ở runtime theo [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies).

---

# PHẦN E — THỨ TỰ XÂY AI PRODUCTION

Làm theo thứ tự:

```text
1. Chạy baseline 10,000 Restaurant Reviews
2. Kiểm tra Macro-F1 và confusion matrix
3. Thu review/hành vi TravelGo thật
4. Export và kiểm tra dữ liệu đã ẩn danh
5. Huấn luyện sentiment tiếng Việt
6. Tính quality score
7. Xây cold-start recommender
8. Khi đủ event/impression, huấn luyện personalized recommender
9. Xây itinerary planner có constraint
10. Đóng gói model thành Python/FastAPI AI service
11. TravelGo backend gọi AI service
12. Frontend hiển thị gợi ý và bản đồ
13. Chạy shadow test trước khi cho người dùng thật
```

Không làm personalized recommender trước khi có event/impression thật.

---

# PHẦN F — TIÊU CHÍ “AI CHẠY ĐÚNG”

Không chỉ cần notebook chạy không lỗi. Model chỉ đạt khi:

- dữ liệu không chứa thông tin định danh trực tiếp;
- nguồn và license được ghi rõ;
- train/test không bị trùng hoặc rò rỉ;
- model tốt hơn baseline trên test set chưa từng thấy;
- sentiment có Macro-F1 và per-class precision/recall;
- recommender có Recall@10, NDCG@10, coverage và diversity;
- test riêng cho user mới và item mới;
- itinerary không vi phạm giờ mở cửa, ngân sách và thời gian;
- mỗi model có dataset version, metrics, seed và checksum;
- có fallback rule-based khi AI service lỗi;
- model được chạy shadow trước A/B test.

Không dùng dữ liệu seed để tuyên bố độ chính xác production.

---

# PHẦN G — XỬ LÝ LỖI THƯỜNG GẶP

## Không tìm thấy CSV

Kiểm tra dataset đã được gắn trong `Input`. File phải có ba cột:

```text
Restaurant, Review, Rating
```

## Rating có chữ `Like` hoặc dữ liệu lạ

Đây là dữ liệu không phải số. Notebook dùng `pd.to_numeric(..., errors="coerce")` và loại bỏ thay vì tự bịa rating.

## Không có file Parquet

CSV vẫn được lưu. Gửi phần lỗi Parquet để kiểm tra package Kaggle.

## Macro-F1 thấp

Không tăng model phức tạp ngay. Kiểm tra:

- lớp neutral có quá ít dữ liệu không;
- review và rating có mâu thuẫn không;
- dữ liệu có trùng không;
- dataset có đủ ngôn ngữ/domain cần dùng không.

## PowerShell báo không chạy được `npm`

Sử dụng:

```powershell
npm.cmd run ...
```

thay vì:

```powershell
npm run ...
```

## `ECONNREFUSED 127.0.0.1:5432`

Docker Desktop/PostgreSQL chưa chạy:

1. Mở Docker Desktop.
2. Chờ Docker Engine chạy.
3. Kiểm tra `travelgo_postgres` là Healthy.
4. Chạy lại lệnh.

## Migration hiện target sai database

Dừng ngay. Không chạy `db:migrate:apply`. Đặt lại:

```powershell
$env:DB_NAME='travelgo_phase35_test'
```

và chạy dry-run lại.

---

# CHECKLIST NGẮN CHO BUỔI LÀM VIỆC ĐẦU TIÊN

- [ ] Mở VS Code và Kaggle.
- [ ] Kiểm tra dataset 10,000 Restaurant Reviews và license.
- [ ] Đặt Accelerator None, Internet Off.
- [ ] Copy `00_quickstart_restaurant_reviews.py` vào Kaggle.
- [ ] Run và thấy dòng PASS cuối.
- [ ] Mở `review_sentiment_metrics.json`.
- [ ] Mở `confusion_matrix.png`.
- [ ] Mở `recommendation_demo.csv`.
- [ ] Save Version ở chế độ Private.
- [ ] Gửi metrics và top 10 recommendation để đánh giá bước tiếp theo.

Không làm phần C cho đến khi phần A đã PASS.
