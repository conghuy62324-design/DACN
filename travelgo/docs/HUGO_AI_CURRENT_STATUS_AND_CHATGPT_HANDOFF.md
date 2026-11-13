# HuGo Travel — Tổng hợp hiện trạng AI và nội dung bàn giao cho ChatGPT

Ngày tổng hợp: **28/10/2026**, múi giờ Việt Nam.

**Đính chính auth 30/10/2026 (T07):** bản trước ghi có refresh token và gọi token là JWT là sai so với source. Các mô tả auth bên dưới đã cập nhật theo [contract hiện hành](HUGO_AUTH_CONTRACT.md): access token HMAC hai phần có hạn, chưa refresh/revocation, logout local. Các bằng chứng/test và ngày tổng hợp AI lịch sử giữ nguyên.

Tài liệu được đối chiếu với mã nguồn, cấu hình, notebook, artifact local và các báo cáo trong repository. Không chạy lại training, build, E2E hoặc truy cập database trong lần tổng hợp này. Những kết quả test lịch sử bên dưới là kết quả được ghi trong báo cáo thực thi, không phải kết quả vừa chạy lại hôm nay.

Bạn có thể gửi toàn bộ tài liệu này cho ChatGPT kèm yêu cầu ở phần cuối. Phần bàn giao được viết ở ngôi thứ nhất để dùng trực tiếp.

---

## 1. Bối cảnh và mục tiêu dự án của tôi

Tôi đang làm đồ án cá nhân **HuGo Travel / TravelGo**, một nền tảng web hỗ trợ khám phá địa điểm và quản lý hành trình du lịch thông minh.

Mục tiêu sản phẩm là để người dùng:

1. Tìm địa điểm tham quan, khách sạn và nhà hàng theo điểm đến, sở thích và ngân sách.
2. Nhận danh sách gợi ý có giải thích vì sao phù hợp.
3. Xem chi tiết, lưu yêu thích, chọn địa điểm đưa vào lịch trình.
4. Tạo lịch trình theo ngày, lưu chuyến đi và mở lại để sử dụng/chỉnh sửa.
5. Đặt dịch vụ theo luồng nghiệp vụ demo, đánh giá dịch vụ và chia sẻ trải nghiệm qua blog.

Hệ thống có ba vai trò `CUSTOMER`, `PARTNER`, `SUPER_ADMIN`, kèm quản lý doanh nghiệp, kiểm duyệt tài nguyên, phân quyền và kiểm tra chủ sở hữu dữ liệu.

Phần **HuGo Intelligence** có mục tiêu dài hạn gồm phân tích đánh giá tiếng Việt, gợi ý cá nhân hóa, lập hành trình có ràng buộc, GIS/routing và khả năng hiểu yêu cầu tiếng Việt. Tuy nhiên, phạm vi MVP đã được thu hẹp trong `docs/HUGO_AI_M2_MVP_PLAN.md` còn ba nội dung:

- Sentiment tiếng Việt ba lớp bằng TF-IDF + Logistic Regression.
- Recommendation bằng heuristic có giải thích + Bayesian rating.
- Itinerary bằng planner xác định hiện có, có lưu/mở lại và ghi rõ dữ liệu ước lượng.

**Trong MVP hiện tại không làm PhoBERT, aspect sentiment, Learning-to-Rank, chatbot/LLM, forecasting, OR-Tools, tự động retrain hoặc routing production.** Nếu muốn mở rộng, cần xem đó là thay đổi phạm vi và cân nhắc thời gian còn lại.

Kế hoạch MVP ngày 13/10/2026 từng đặt khung 8 tuần, đóng băng chức năng cuối tuần 6 và dành hai tuần cuối cho báo cáo/bảo vệ. Đây là lịch cũ; tài liệu hiện tại không xác nhận ngày nộp thực tế. Hãy hỏi lại deadline trước khi đặt lịch mới theo ngày.

## 2. Công nghệ và kiến trúc đang dùng

| Thành phần | Công nghệ / vai trò |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Axios |
| Bản đồ | Leaflet, OpenStreetMap |
| Backend | Node.js, Express, TypeScript; controller → service → repository |
| Database | PostgreSQL, PostGIS, Sequelize |
| Xác thực / phân quyền | Access token HMAC hai phần có hạn; chưa có refresh token/revocation; RBAC, ownership/business isolation |
| AI offline | Python, scikit-learn, NumPy, matplotlib, joblib, Kaggle CPU |
| Kiểm thử | Unit/golden scenarios, HTTP/PostgreSQL integration, Playwright E2E |

Theo lần xác minh schema được ghi trong báo cáo M3-D: 10 migration, 23 bảng ứng dụng, 39 khóa ngoại, PostGIS 3.4.3. Đây là snapshot lịch sử, chưa truy vấn lại database hôm nay.

Node API vẫn là cổng kiểm tra access token HMAC, phân quyền, tài nguyên hợp lệ và dữ liệu nghiệp vụ. Chưa thấy Python/FastAPI inference service được tích hợp vào luồng chạy của website.

## 3. Phân biệt ba phần thường bị gọi chung là “AI”

| Phần | Hiện trạng thật |
|---|---|
| Model sentiment | Đã fit/train TF-IDF + Logistic Regression; model tiếng Việt hiện chỉ là demo kỹ thuật |
| Recommendation trên website | Thuật toán chấm điểm có trọng số + Bayesian; chưa phải model được học từ hành vi |
| Tour Planner | Thuật toán heuristic, phân bổ slot/ngày và Haversine; chưa phải mô hình sinh lịch trình hay solver tối ưu đường bộ |

Vì vậy, phát biểu chính xác là: **tôi đã hoàn thành nền tảng dữ liệu/telemetry, pipeline train sentiment demo, và MVP gợi ý → lịch trình; tôi chưa có model sentiment tiếng Việt được đánh giá bằng dữ liệu thật hợp lệ hoặc đang chạy production.**

## 4. Những việc đã làm từ đầu đến hiện tại

### 4.1. Prototype sentiment tiếng Anh ban đầu

Theo `docs/HUGO_AI_MODEL_TRAINING_PLAN.md` và Master Plan, đã chạy baseline Restaurant Reviews tiếng Anh:

- 10.000 dòng ban đầu; 9.703 dòng sau làm sạch.
- Train/test: 7.762 / 1.941.
- Feature word + character TF-IDF; classifier Logistic Regression.
- Macro-F1 được báo cáo: **0,7572586**.
- Artifact lịch sử: `review_sentiment_en_v1.joblib`.
- Inference smoke test có 2/3 câu phù hợp; câu neutral mơ hồ bị dự đoán negative.

Đây là kết quả prototype tiếng Anh được ghi trong tài liệu, không phải kết quả model tiếng Việt hay chất lượng gợi ý HuGo. Không kiểm chứng lại run/artifact tiếng Anh trong lần tổng hợp này.

Source liên quan: `ai/kaggle/00_quickstart_restaurant_reviews.py`. File hiện bắt đầu bằng `A# ...`, cần sửa lỗi đầu dòng trước nếu muốn chạy lại nguyên file Python. Không cần mở lại prototype này để hoàn thành MVP tiếng Việt.

### 4.2. M0 — Baseline tái lập và nền tảng dữ liệu

Báo cáo ngày 12/10/2026 ghi **M0 PASS**:

- Chuẩn bị môi trường PostgreSQL/PostGIS test cô lập.
- Có database guard/sentinel trước migration, seed và test ghi dữ liệu.
- Chạy baseline backend/frontend, integration và E2E.
- Audit dữ liệu và các khoảng trống phục vụ AI.
- Chuẩn bị exporter dữ liệu và hướng xử lý provenance, consent, PII, phân biệt test/production.

M0 chứng minh nền tảng kỹ thuật có thể tái lập; không chứng minh dữ liệu đã đủ để train AI thực tế.

### 4.3. M1 — Hoàn thành năm task nền tảng

**Task 1 — Sở thích người dùng:**

- Sở thích đi xuyên suốt Planner → Generate → Save Trip → PostgreSQL → Reopen.
- Có allowlist tám giá trị: `bien`, `thien-nhien`, `van-hoa`, `am-thuc`, `nghi-duong`, `check-in`, `phieu-luu`, `mua-sam`.
- Có kiểm tra đầu vào, sửa/xóa và tương thích Trip cũ.

**Task 2 — Hành vi và consent:**

- Có event contract, session/client event ID, idempotency, validation và chống giả mạo trường server quản lý.
- Kết nối các producer VIEW/CLICK và booking lifecycle; Favorite sau đó được hoàn thiện bằng Task 4.
- Có consent analytics/personalization, opt-out, xóa dữ liệu theo tài khoản và retention 90 ngày.
- Có phân biệt environment và loại dữ liệu legacy/không đủ consent khỏi AI export.
- Có lệnh purge có guard; báo cáo cũ ghi chưa có scheduler production.

**Task 3 — Recommendation request và exposure:**

- Có `recommendation_requests`, `recommendation_candidates`, `recommendation_visible_impressions`.
- API response không tự động được tính là impression.
- Quy tắc visible: card đạt ít nhất 50% viewport liên tục 2 giây, tab đang hiển thị; server kiểm tra request/session/user/item.
- Có attribution CLICK/Favorite/booking theo exposure hợp lệ.
- Candidate chưa visible và item ngoài danh sách không bị coi là negative label.

**Task 4 — Favorite phía server:**

- PostgreSQL là nguồn sự thật thay cho danh sách yêu thích trong localStorage.
- Có list/add/remove, ownership, uniqueness, idempotency và xử lý concurrency.
- Favorite giữ được sau refresh/logout/login; opt-out analytics không làm mất chức năng Favorite.

**Task 5 — Verified reviews:**

- Review có provenance tới booking cụ thể.
- Server chỉ gắn `VERIFIED` nếu booking `COMPLETED`, đúng user và đúng Place/service.
- Một booking chỉ có một review, có ràng buộc database và kiểm thử concurrency.
- Review không gắn booking vẫn được tạo với nhãn `UNVERIFIED`.
- Có ownership, update/delete API, moderation status, admin moderation/audit log.
- Tiêu chí không nhập được lưu thiếu/NULL, không tự điền 5 sao.
- Public aggregate/Bayesian chỉ dùng review `PUBLISHED`.
- AI export lọc theo điều kiện consent, nguồn, environment và provenance.

**M1 đã COMPLETE.** Những row được tạo bởi integration/E2E là dữ liệu test, không phải tập hành vi hoặc review người dùng thật để chứng minh chất lượng model.

### 4.4. M2-A / M2-A2 — Audit dataset tiếng Việt

Đã tạo registry, label map và split specification; audit nguồn, quyền sử dụng, provenance, task fit, hash, PII và leakage.

Các quyết định trong tài liệu audit của dự án:

| Nguồn | Trạng thái đã ghi |
|---|---|
| VLSP 2018 | BLOCKED access/điều kiện sử dụng |
| `h-i-e-u/vietnamese-SA-dataset` | BLOCKED provenance/leakage |
| UIT-VSFC | BLOCKED license/quyền, domain giáo dục |
| HAMOS | REJECTED cho overall sentiment; dữ liệu aspect không được tự đổi thành nhãn toàn câu |
| `vanhai123/vietnamese-social-comments` | BLOCKED access/upstream rights; toxic không được tự map sang negative |
| Google Maps content/reviews | REJECTED cho train/test/validate theo chính sách dự án |
| UTS2017_Bank | CONDITIONAL trong kế hoạch MVP; chưa thấy bằng chứng audit PASS mới |

Đây là trạng thái lưu trong repo, không phải kết quả kiểm tra lại các nguồn bên ngoài ngày 28/10/2026.

Hiện `ai/configs/vietnamese_sentiment_dataset_registry.json` vẫn ghi overall gate `BLOCKED`. `ai/evaluation/vietnamese_sentiment_split_manifest.json` vẫn là `SPECIFICATION_ONLY`, `BLOCKED`, `assigned_rows=0`, `split_hash_sha256=null`.

Điều đó có nghĩa **chưa có locked split dữ liệu thật đã được duyệt trong manifest này**. Không được sửa cờ thành PASS nếu chưa có bằng chứng.

### 4.5. Điều chỉnh từ kế hoạch nghiên cứu lớn sang MVP cá nhân

Kế hoạch cũ yêu cầu 3.000 development + 600 travel test. Kế hoạch MVP ngày 13/10 đã thay yêu cầu số lượng cho MVP như sau:

| Mức | Development | Independent travel test |
|---|---:|---:|
| Mục tiêu | 600 dòng, khoảng 200/lớp | 150 dòng, 50/lớp |
| Sàn thực nghiệm | 360 dòng, ít nhất 120/lớp | 90 dòng, ít nhất 30/lớp |
| Không đạt sàn | Giữ DEMO_ONLY | Không công bố chất lượng thực tế |

Đây là ngưỡng do kế hoạch đồ án đặt, không phải chuẩn khoa học áp dụng chung. Quyền sử dụng, consent, PII, chống trùng và chống leakage vẫn bắt buộc.

Kế hoạch đề xuất first-party corpus `HuGo-MVP-ViSent-v1`, phản hồi tiếng Việt do người thật cung cấp, bao phủ hotel/restaurant/attraction. Có thể có phản hồi theo scenario do con người thiết kế nhưng phải ghi provenance riêng; không được gọi đó là traffic production tự nhiên.

Nếu corpus mới đạt gate, tạo **registry/manifest MVP v1 mới**, giữ nguyên lịch sử BLOCKED của bộ audit cũ.

### 4.6. M2-B1 — Pipeline train sentiment tiếng Việt chạy local

Đã tạo:

- `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py`.
- `ai/fixtures/vietnamese_sentiment_demo.jsonl`.

Fixture gồm **45 câu tự viết để thử kỹ thuật**, với:

- 15 NEGATIVE, 15 NEUTRAL, 15 POSITIVE.
- 15 câu hotel, 15 restaurant, 15 attraction.
- Split demo cố định: 30 train + 15 `DEMO_HOLDOUT`; mỗi lớp holdout có 5 câu.
- Seed `20261013`.

Pipeline đã có:

- Đọc CSV/JSONL UTF-8, chuẩn hóa Unicode NFC/whitespace, giữ dấu tiếng Việt và từ phủ định.
- Kiểm tra schema, tier, label, provenance, ID/text trùng và dữ liệu rỗng.
- Vectorizer chỉ fit trên train.
- Bốn cấu hình: majority, word TF-IDF 1–2 + LR, character `char_wb` 3–5 + LR, combined word+character + LR.
- LR có `class_weight=balanced`, `max_iter=2000`, solver `lbfgs`.
- Xuất metric, per-class report, confusion matrix, model/vectorizer/classifier, metadata, checksum và reload parity.
- CLI có đường mở rộng `--development-data`, `--independent-test-data`, `--approved-manifest`, `--output-dir`.
- Manifest không PASS hoặc file hash không khớp bị từ chối.

Trạng thái chính xác: **COMPLETE — TECHNICAL PIPELINE ONLY; model quality BLOCKED / NOT EVALUATED**.

### 4.7. M2-B2 — Notebook và Kaggle demo

Đã tạo notebook `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb`, tái sử dụng script B1 thay vì chép lại thuật toán.

- 17 cells: 8 Markdown, 9 code.
- Báo cáo local ghi nbformat validation PASS và execute 9/9 code cells không lỗi.
- Báo cáo mới hơn ngày 15/10 ghi người dùng đã chạy Kaggle Version #1 `Successful`, CPU, Internet Off, notebook/dataset Private, final gate 8/8 true và có 9 output artifacts.
- Bằng chứng Kaggle là **do người dùng cung cấp**, không phải phiên chạy mà người tổng hợp hôm nay quan sát trực tiếp.

**Cập nhật từ kiểm tra local ngày 28/10:** thư mục `ai/artifacts/m2_b2_kaggle_demo/` đã có đủ 9 tên file đúng, bao gồm 5 file JSON. Kiểm tra read-only xác nhận **8/8 payload đúng số byte và SHA-256 trong manifest**. Vì vậy, yêu cầu “đổi 5 đuôi .txt thành .json” trong báo cáo cũ đã không còn là việc cần làm đối với bản workspace này.

Danh sách artifact:

```text
artifact_checksums.json
combined_pipeline_demo_only.joblib
combined_vectorizer_demo_only.joblib
combined_classifier_demo_only.joblib
confusion_matrix_demo_only.json
confusion_matrix_demo_only.png
metrics_demo_only.json
model_metadata.json
reload_parity.json
```

Metadata Kaggle đang lưu Python 3.13.15, scikit-learn 1.6.1, NumPy 2.1.3, joblib 1.6.0, matplotlib 3.10.0. Đây là version từ artifact, không phải khẳng định môi trường local hiện tại.

Reload parity trong artifact ghi PASS trên 15 câu; không nạp joblib hoặc chạy lại inference hôm nay. Báo cáo xác minh cũ ghi local reload bị chặn do môi trường/dependency không khớp, nên việc tái lập inference local trong môi trường tương thích vẫn chưa được xác nhận lại.

Tất cả artifact vẫn khóa:

```text
data_mode = DEMO_ONLY
quality_claim_allowed = false
production_eligible = false
lifecycle_status = DEMO_ONLY_NOT_ACTIVE
```

Các Macro-F1 **chỉ để kiểm tra phép tính trên demo holdout**: majority 0,1667; word 0,3485; char 0,4470; combined 0,3892. Các con số này không phải kết quả đánh giá chất lượng tiếng Việt thực tế. Combined được chọn làm artifact kỹ thuật cố định, không phải bằng chứng nó là cấu hình tốt nhất.

### 4.8. M3 — Recommendation và nối sang itinerary đã hoàn thành

**M3-A:** audit và chốt kế hoạch MVP.

**M3-B — Correctness:**

- Eligibility/filter trước scoring; loại Place không hợp lệ và Business không ACTIVE.
- Đọc hết các trang catalog thay vì cắt ở 100 bản ghi.
- Dùng centroid từ candidate đã lọc cho distance proxy, không dùng Place đầu danh sách toàn cục.
- Có typed fallback khi không có city match; giữ các filter còn lại và giải thích rõ kết quả ngoài thành phố.
- Tie-break xác định theo score, Bayesian rồi ID; breakdown đủ precision để kiểm tra công thức.
- Explanation dựa trên evidence thật.
- Tách one-shot preference/budget khỏi việc lưu/học theo consent; opt-out vẫn dùng được tiêu chí vừa nhập.

Công thức mặc định đã đối chiếu trong source:

```text
Score = 0.35 × Quality
      + 0.25 × Preference
      + 0.25 × Budget
      + 0.15 × Distance
```

Quality dựa trên Bayesian rating; trọng số là cấu hình thủ công, không phải học từ dữ liệu. Version hiện có: `weighted-hybrid-v2`, model `heuristic-content-bayesian-v1`.

**M3-C — Explore UI:**

- Có tám preference chips, ngân sách VND/ngày/người và bộ lọc attraction/hotel/restaurant.
- Gửi input thật tới recommendation API.
- Hiển thị server `why`, reason chips và fallback.
- Không để sort control giả tác động; giữ thứ tự server rank.
- Có xử lý response cũ về muộn, loading/error/retry/empty.
- Anonymous dùng public Bayesian/price catalog; không tạo recommendation request/impression giả.
- Opt-out vẫn nhận kết quả theo tiêu chí vừa nhập nhưng không gửi visible acknowledgement khi analytics tắt.

**M3-D — Place → Planner → Trip:**

- Place Detail có CTA “Thêm vào lịch trình”.
- Chuyển UUID sang Planner; server tự đọc dữ liệu canonical.
- Backend xử lý `mandatoryPlaceIds`, kiểm UUID, số lượng, availability, Business, destination và capacity.
- Mandatory Place được chèn đúng một lần; có lỗi rõ khi không thể lập lịch.
- Save Trip và reopen giữ itinerary/selectedPlaceIds; ownership theo identity từ access token đã xác minh.
- Anonymous đi qua login return state đúng Place, không tự tạo Trip.
- Frontend hiện chọn một Place từ trang chi tiết; backend hỗ trợ tối đa 10 ID với giới hạn slot.

**Theo báo cáo M3-D: M3-MVP COMPLETE END-TO-END** trong phạm vi recommendation heuristic/Bayesian cho Place. Source hiện tại có các đường đi tương ứng. Không lên kế hoạch làm lại M3-B/C/D như tính năng chưa tồn tại.

## 5. Bằng chứng kiểm thử đã có

Các báo cáo ghi những lần chạy PASS, nổi bật ở M3-D:

| Nhóm | Kết quả lịch sử |
|---|---|
| Mandatory Place golden/unit | 9/9 |
| Algorithm/GIS regression | 14/14 |
| Recommendation exposure | 6/6 |
| Recommendation correctness | 8/8 |
| Repository pagination | 2/2 |
| Telemetry contract | 9/9 |
| Explore UI unit | 4/4 |
| Recommendation + Planner PostgreSQL | 52 checks |
| Core integration PostgreSQL | 14 checks |
| Favorite PostgreSQL | 59 checks |
| M3-D E2E | desktop, anonymous, mobile: 3/3 |
| M3-C E2E | 4/4 |
| Role E2E | Customer, Partner, Super Admin: 3/3 |
| Production build | Backend và frontend PASS |

Không cộng các suite chồng lấn thành tổng số test duy nhất. Chưa chạy lại các suite này ngày 28/10; cần regression ở thời điểm chốt bản nộp.

## 6. Phần chưa làm hoặc chưa đủ điều kiện

1. **Chưa có corpus tiếng Việt thật đạt gate MVP**, kèm independent travel test đã gán nhãn/khóa split.
2. **Chưa có đánh giá chất lượng model tiếng Việt thực tế**; không có Macro-F1 đáng dùng trong kết luận đồ án cho domain du lịch.
3. **Chưa có pipeline thí nghiệm đầy đủ với train/validation/independent test cho dữ liệu thật.** CLI hiện có nhánh approved experiment nhưng chưa đồng nghĩa protocol hoàn chỉnh.
4. **Chưa tích hợp inference sentiment vào website.** Chưa thấy FastAPI service/backend adapter hoặc sentiment endpoint trong intelligence routes hiện tại.
5. **Chưa có model promotion/shadow/active/rollback hoàn chỉnh**; model registry có schema/model, không có bằng chứng đang kích hoạt model demo.
6. **Chưa dùng sentiment/aspect để xếp hạng Place**, và model demo hiện không đủ điều kiện làm việc đó.
7. **Chưa có recommender học từ hành vi/collaborative filtering/LTR** hoặc dữ liệu traffic thật đủ để báo online quality/uplift.
8. **Chưa có routing đường bộ/traffic/time windows/solver tối ưu**; Haversine và transit minutes chỉ là ước lượng.
9. **Giá/ngân sách chưa bảo đảm khả năng chi trả thực tế**; `priceFrom` chưa đủ đơn vị/nguồn để diễn giải thành báo giá chắc chắn.
10. Chat/NLU, aspect sentiment, forecasting và các phần mở rộng trong Master Plan mới là định hướng ngoài MVP, không phải phần đã hoàn thành.

Các giới hạn khác được báo cáo: candidate table chỉ lưu top-N được trả, chưa đủ để đo coverage toàn catalog; rate limit trong memory; chưa xác nhận scheduler purge production; UI chưa có multi-select mandatory Place; kiểm chứng trình duyệt chủ yếu Edge headless, chưa audit accessibility sâu.

## 7. Những chỗ cần chỉnh trong pipeline trước khi train dữ liệu thật

Đối chiếu trực tiếp script B1 cho thấy các phần sau cần được thiết kế/hoàn thiện, không chỉ thay đường dẫn dataset rồi bấm Run:

- **Validation/model selection:** nhánh có independent test hiện fit trên toàn development và evaluate cả bốn cấu hình trên independent test; chưa có train/validation riêng để chọn hyperparameter. Cần khóa quy trình chọn cấu hình trên validation; chỉ đánh giá final test theo protocol định trước, không chọn/tune dựa trên kết quả test.
- **Leakage:** script kiểm exact duplicate trong từng input, nhưng chưa có kiểm tra đầy đủ cross-file/group/near-duplicate tự động trong nhánh này. Cần preprocessing/split pipeline và assertions có thể kiểm chứng trên inventory thật.
- **Manifest:** hàm load hiện kiểm status, label map, flag và file hashes; việc có chuỗi split hash chưa tự chứng minh các row assignment/group assertions đã được kiểm tra. Cần manifest MVP mô tả inventory/splits và kiểm chúng.
- **Báo cáo thí nghiệm:** chưa có bootstrap 95% CI, error analysis theo domain và model card hoàn chỉnh theo kế hoạch MVP.
- **Tên artifact/biểu đồ:** nhánh approved experiment vẫn xuất tên `_demo_only` và confusion matrix title/watermark DEMO_ONLY. Cần phân biệt rõ output demo và nghiên cứu hợp lệ mà vẫn giữ `production_eligible=false` cho artifact nghiên cứu chưa được promotion.
- **Tái lập môi trường:** cần dependency lock/version và reload/inference test trong môi trường khớp artifact; hash PASS không thay thế kiểm thử runtime.

Đây là công việc cần cho bước train thật; không phải lý do phải viết lại phần recommendation đang chạy.

## 8. Hướng ưu tiên tiếp theo

### Bước 1 — Chốt phạm vi và deadline thực tế

Giữ MVP ba phần đã chọn. Xác nhận ngày nộp, thời gian có thể dành cho thu thập dữ liệu và nguồn lực gán nhãn. Không mặc định vẫn còn nguyên 8 tuần của kế hoạch ngày 13/10.

### Bước 2 — Quyết định dữ liệu trong thời gian giới hạn

Ưu tiên first-party theo kế hoạch MVP:

- Chuẩn bị form consent, schema, annotation guideline và cách lưu receipt tách khỏi text.
- Thu pilot để sửa guideline; pilot dùng sửa hướng dẫn không được đưa vào independent test.
- Nhắm 600 development + 150 independent test; sàn 360 + 90 và support lớp như bảng trên.
- Test được hai người gán nhãn độc lập và adjudicate; development được một người gán toàn bộ và tối thiểu 20% kiểm tra chéo.
- Ẩn rating, intended label và model prediction với người gán nhãn.
- Làm sạch PII, exact/near dedupe, group-safe split; khóa hashes/inventory và tạo registry/manifest MVP mới khi thật sự đạt gate.

Nếu không đạt trong timebox phù hợp deadline, chốt **DEMO_ONLY** trung thực, tập trung hoàn thiện demo recommendation/itinerary và báo cáo; không tiếp tục săn dataset vô hạn.

### Bước 3 — Hoàn thiện protocol rồi train CPU

Khi dữ liệu qua gate:

1. Chia development thành train/validation theo group; target 600 → khoảng 480/120, floor 360 → khoảng 288/72, kèm phân bố thực tế.
2. Independent test 150 hoặc 90 dòng riêng, khóa trước khi chọn cấu hình.
3. Chạy majority/word/char/combined; chọn cấu hình bằng validation.
4. Đánh giá cuối đúng protocol: Macro-F1, per-class P/R/F1, confusion matrix, support, 95% CI, domain errors, latency và artifact size.
5. Ghi model card, dependency versions, data/split hashes, checksums, reload parity và giới hạn.

Không tự đặt một ngưỡng F1 để gọi PASS. Thí nghiệm có thể hoàn thành dù chất lượng thấp nếu protocol đúng và báo cáo trung thực; việc đủ điều kiện triển khai là quyết định riêng.

### Bước 4 — Chỉ tích hợp sentiment sau khi điều kiện rõ ràng

Nếu có model nghiên cứu hợp lệ và còn thời gian: làm inference tối thiểu sau Node API, kiểm tra input/output/version, timeout/error/fallback và hiển thị `Experimental` với phạm vi hỗ trợ rõ. Không tự đưa sentiment vào recommendation score.

Nếu giữ DEMO_ONLY: giữ mô hình ở notebook/demo kỹ thuật riêng, không activate artifact hiện tại vào website như chức năng AI thật.

### Bước 5 — Chốt chất lượng MVP và tài liệu bảo vệ

- Regression luồng Explore → Detail → Favorite → Planner → Save/Reopen.
- Kiểm tra consent/opt-out, anonymous, ownership và mobile.
- Build frontend/backend; test database chỉ trong môi trường cô lập có guard.
- Soạn sơ đồ, bảng thí nghiệm, demo video, kịch bản offline dự phòng và known limitations.
- Đồng bộ README/Master Plan/Roadmap với báo cáo mới; nhiều câu “chưa làm” trong tài liệu cũ đã được M1/M3 giải quyết.
- Đóng băng chức năng trước giai đoạn báo cáo/bảo vệ.

## 9. Những việc không cần làm lại hoặc không nên đưa vào kế hoạch gấp

- Không tạo thêm M1 Task 6 chỉ vì roadmap tổng còn nhiều tính năng.
- Không xây lại Favorite server, exposure tracking, verified review, Explore preferences hoặc Place → itinerary: các phần này đã hoàn thành.
- Không tiếp tục yêu cầu đổi đuôi 5 file Kaggle trong workspace hiện tại: tên và hashes đã PASS.
- Không bắt buộc 3.000+600 theo kế hoạch nghiên cứu cũ cho MVP đã điều chỉnh.
- Không tự mở PhoBERT/LTR/chatbot/OR-Tools khi mục tiêu hiện tại là hoàn thành đồ án cá nhân.
- Không dùng test traffic làm dữ liệu production hoặc synthetic làm independent test.
- Không gọi score heuristic là xác suất AI, budget fit là bảo đảm đủ tiền, Haversine là tuyến đường thực.
- Không tự động upload database/export/artifact, deploy hoặc publish từ bản bàn giao này.

## 10. File quan trọng cần đưa cho người lập kế hoạch

| Mục đích | File |
|---|---|
| Phạm vi MVP đã điều chỉnh | `docs/HUGO_AI_M2_MVP_PLAN.md` |
| Mục tiêu dài hạn, tham khảo lịch sử | `docs/HUGO_INTELLIGENCE_MASTER_PLAN.md` |
| M0 | `docs/HUGO_AI_M0_EXECUTION_REPORT.md` |
| M1 | `docs/HUGO_AI_M1_TASK1_REPORT.md` đến `HUGO_AI_M1_TASK5_REPORT.md` |
| Data gate/recovery | `docs/HUGO_AI_M2_DATA_GATE_REPORT.md`, `docs/HUGO_AI_M2_DATA_RECOVERY_REPORT.md` |
| Pipeline local / notebook | `docs/HUGO_AI_M2_B1_REPORT.md`, `docs/HUGO_AI_M2_B2_REPORT.md` |
| Kaggle evidence mới hơn | `docs/HUGO_AI_M2_KAGGLE_EXECUTION_REPORT.md` |
| M3 đã hoàn thành | `docs/HUGO_AI_M3_B_CORRECTNESS_REPORT.md`, `docs/HUGO_AI_M3_C_EXPLORE_UI_REPORT.md`, `docs/HUGO_AI_M3_D_PLACE_TO_ITINERARY_REPORT.md` |
| Source train | `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py` |
| Notebook | `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb` |
| Fixture | `ai/fixtures/vietnamese_sentiment_demo.jsonl` |
| Registry / label map | `ai/configs/vietnamese_sentiment_dataset_registry.json`, `ai/configs/vietnamese_sentiment_label_map.json` |
| Split spec đang BLOCKED | `ai/evaluation/vietnamese_sentiment_split_manifest.json` |
| Artifact Kaggle giữ local | `ai/artifacts/m2_b2_kaggle_demo/` |
| Recommendation / planner | `backend/src/services/recommendationService.ts`, `backend/src/services/recommendationExposureService.ts`, `backend/src/services/tourPlannerService.ts` |

Khi có mâu thuẫn, ưu tiên source/artifact hiện tại và báo cáo thực thi mới theo đúng phạm vi; không lấy Master Plan ngày 12/10 làm ảnh chụp trạng thái hiện tại. Artifact nằm trong thư mục Git ignore nên không mặc định có trong bản clone Git.

## 11. Yêu cầu gửi ChatGPT để lập kế hoạch tiếp

Hãy đóng vai người hướng dẫn đồ án và kỹ sư ML, đọc toàn bộ hiện trạng ở trên rồi lập kế hoạch tiếp theo cho một sinh viên thực hiện dự án này.

Tôi cần bạn:

1. Tóm tắt phần đã hoàn thành, phần demo kỹ thuật, phần còn thiếu dữ liệu và phần ngoài MVP; không làm lại các task M1/M3 đã hoàn thành.
2. Xác định đường găng để hoàn thành đồ án; ưu tiên dữ liệu/protocol/đánh giá sentiment, regression và tài liệu bảo vệ.
3. Đưa hai phương án: **A — có thể thu đủ dữ liệu hợp lệ để train/evaluate thật**, và **B — không đủ dữ liệu, giữ DEMO_ONLY và hoàn thiện MVP/báo cáo trung thực**.
4. Chia công việc thành các task nhỏ, ghi ưu tiên P0/P1, dependency, đầu vào, đầu ra, file dự kiến tác động, ước lượng, acceptance và điểm dừng.
5. Chỉ rõ cách hoàn thiện pipeline train/validation/independent test hiện tại trước khi dùng dữ liệu thật; không giả định có CLI là đã đủ protocol.
6. Đề xuất form/schema/guideline, kiểm tra consent/PII/dedupe/group leakage và manifest MVP; không bịa dữ liệu, license hoặc bằng chứng PASS.
7. Cho kế hoạch CPU TF-IDF/LR có baseline/ablation, model card, CI, reload parity và inference thử; không tự mở PhoBERT/LTR/chatbot.
8. Phân biệt hoàn thành thí nghiệm nghiên cứu với đủ điều kiện đưa model lên website; không đề xuất dùng model DEMO_ONLY hiện tại để xếp hạng hoặc tổng hợp insight thật.
9. Đưa checklist nghiệm thu cuối gồm luồng người dùng, build/regression, demo video, báo cáo, slide và các câu hỏi bảo vệ về giới hạn dữ liệu/thuật toán.
10. Chọn đúng **một task nhỏ nhất nên làm ngay**, nêu deliverable cụ thể và viết sẵn prompt giao task đó cho coding agent. Yêu cầu lập kế hoạch này chưa phải yêu cầu agent tự chạy toàn bộ kế hoạch.

Nếu chưa biết deadline, nguồn lực gán nhãn hoặc dữ liệu thật tôi đang có ngoài repository, chỉ hỏi những thông tin ảnh hưởng trực tiếp đến kế hoạch. Trong lúc chưa có câu trả lời, nêu rõ giả định và đề xuất thứ tự tương đối; không tự coi lịch 8 tuần cũ là deadline hiện tại.
