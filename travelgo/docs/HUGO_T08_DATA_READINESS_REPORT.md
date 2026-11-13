# T08 — Kiểm kê dữ liệu sentiment và mức sẵn sàng

Ngày kiểm: **30/10/2026**. Phạm vi: repository `C:\Users\Danh\Downloads\HCH\DACN\travelgo`, cụ thể `ai/data`, `ai/fixtures`, `ai/artifacts`, `ai/configs`, `ai/evaluation`, `ai/kaggle`, danh sách file trong dự án và các tài liệu dưới đây. Không có đường dẫn corpus bên ngoài dự án được cung cấp trong yêu cầu hoặc tài liệu đã đọc. Không truy cập DB, backup, file mật khẩu demo hay nơi lưu riêng chưa được chỉ định; không kiểm tra dữ liệu trên toàn máy. “Chưa tìm thấy” chỉ áp dụng cho phạm vi này.

## Nguồn và bằng chứng đã kiểm

| Nguồn | Kết quả kiểm trực tiếp |
|---|---|
| [T01 data collection kit](HUGO_MVP_DATA_COLLECTION_KIT.md), [scope 6 tuần](HUGO_6_WEEK_SCOPE.md), [bàn giao AI](HUGO_AI_CURRENT_STATUS_AND_CHATGPT_HANDOFF.md) | T01 vẫn là **DRAFT**: nơi lưu, người giữ test, annotator A/B/C, notice/retention và giờ chốt còn `TODO`; không phải receipt hay dữ liệu đã thu. Floor MVP: development ≥360 (mỗi lớp ≥120), independent test ≥90 (mỗi lớp ≥30), sau lọc; pilot riêng. Quyết định A/B ngày 06/11, khóa dự kiến 10/11. |
| [Registry](../ai/configs/vietnamese_sentiment_dataset_registry.json), [split manifest](../ai/evaluation/vietnamese_sentiment_split_manifest.json) | Registry cũ: 6 mục (3 `BLOCKED`, 3 `REJECTED`), **0 PASS**. Manifest `BLOCKED`, `assigned_rows=0`, `split_hash_sha256=null`. Đây là specification/audit nguồn ngoài, không phải corpus MVP đã duyệt. Gate 3.000/600 của M2 cũ không thay floor MVP trong T01. |
| `ai/data/**` | 16 manifest/snapshot export: 2 từ `travelgo_phase35_test`, 14 từ `travelgo_ai_m0_test`; 108 CSV. Không có export từ DB ứng dụng trong thư mục này. `reviews.csv`: chỉ 2 snapshot có dữ liệu, lần lượt 1 và 3 bản ghi; cả 4 bản ghi theo snapshot đều gắn `environment=test`, `is_test=true` (không suy là 4 người/row duy nhất). `blog_mentions.csv`: 1 bản ghi trong mỗi snapshot của 2 export DB test cũ. Tên thư mục `production`/`final`, `approvedFirstPartyContentOnly` và `ai_usage_allowed` trong export không chứng minh consent nghiên cứu, nhãn độc lập hoặc quyền Kaggle; các export này **không vào corpus**. |
| [Fixture sentiment](../ai/fixtures/vietnamese_sentiment_demo.jsonl), `ai/artifacts/m2_*` | 45 dòng fixture tự viết: `data_tier=DEMO_ONLY`, `provenance=AUTHOR_WRITTEN_TECHNICAL_FIXTURE`, `quality_claim_allowed=false`, `production_eligible=false`. Mỗi lớp `NEGATIVE/NEUTRAL/POSITIVE` có 15; mỗi domain `hotel/restaurant/attraction` có 15. Artifact là kết quả chạy demo, không phải dữ liệu người tham gia. |
| [M2 data gate](HUGO_AI_M2_DATA_GATE_REPORT.md), [recovery](HUGO_AI_M2_DATA_RECOVERY_REPORT.md), [B1](HUGO_AI_M2_B1_REPORT.md), [B2](HUGO_AI_M2_B2_REPORT.md), [Kaggle report](HUGO_AI_M2_KAGGLE_EXECUTION_REPORT.md), [data audit](HUGO_AI_DATA_AUDIT.md), [experiment design](HUGO_AI_EXPERIMENT_DESIGN.md) | Báo cáo lịch sử ghi audit nguồn ngoài và pipeline/Kaggle **demo kỹ thuật**; chưa có nguồn đủ rights/provenance và independent travel test để đánh giá chất lượng thật. Các số audit nguồn ngoài, metric demo và kết quả Kaggle lịch sử không được cộng vào corpus T08; không chạy lại trong task này. |

Không thấy file pilot, submission first party, receipt liên kết theo ID, bảng nhãn độc lập/adjudication hoặc split test đã niêm phong trong các thư mục đã kiểm. Không đọc raw text hay nhãn test vào báo cáo. Không dùng account/Trip/Booking demo hoặc DB test làm phản hồi nghiên cứu.

## Số lượng theo trạng thái (trong phạm vi đã kiểm)

| Trạng thái | Số dòng xác minh được | Cách hiểu |
|---|---:|---|
| Raw submission nghiên cứu của người thật | 0 tìm thấy | Không suy rằng không tồn tại ở nơi khác. |
| Pilot người thật | 0 tìm thấy | Không cộng fixture 45 dòng vào pilot. |
| Development/test candidate first party | 0 tìm thấy | Chưa có row để audit theo ID. |
| Excluded khỏi corpus thật | 45 fixture; 4 review và 2 blog mention **theo snapshot DB test** | Các snapshot có thể lặp bản ghi; không cộng thành số row unique. Registry nguồn ngoài còn 6 mục chưa PASS, không phải local row. |
| Unresolved row trong corpus ứng viên đã tìm thấy | 0 | Không có corpus ứng viên để phân loại; tình trạng dữ liệu bên ngoài phạm vi là **NOT VERIFIED**, không phải đã được giải quyết. |
| Eligible đã xác minh cho development / independent test / Kaggle | **0 / 0 / 0** | Không có receipt, quyền và nhãn để chứng nhận. |

Phân bố lớp/domain của **eligible**: chưa có dữ liệu (0 ở mọi lớp và domain); số nhóm contributor/entity/scenario độc lập được xác minh: **0**. Phân bố 15/lớp và 15/domain phía trên chỉ của fixture demo. Khoảng thiếu so với sàn nội bộ: development **360** (mỗi lớp 120), independent test **90** (mỗi lớp 30), tính trên số eligible đã xác minh. Đây là gate của kế hoạch đồ án, không phải chuẩn phổ quát.

## Gate bằng chứng

| Gate | Trạng thái | Bằng chứng / khoảng trống |
|---|---|---|
| Phân loại fixture và export DB test | **VERIFIED** | Kiểm manifest, số row CSV, cờ môi trường, metadata fixture; không dùng chúng làm corpus. |
| Corpus first party và provenance/receipt theo ID | **MISSING** | Không tìm thấy row/receipt trong phạm vi; tên `final`/`approved` không thay bằng chứng. |
| Quyền nghiên cứu local và trạng thái rút consent | **MISSING** | T01 là bản mẫu chưa triển khai; chưa có receipt/version và withdrawal log gắn row. |
| Quyền riêng cho Kaggle sau lọc | **MISSING** | Không có opt-in Kaggle theo row; eligible Kaggle bằng 0 đã xác minh. |
| Guideline, annotator A/B độc lập, adjudicator C và nhãn đã chốt | **MISSING** | Có guideline **dự thảo** trong T01; danh tính/vai trò và annotation thực tế còn TODO. |
| Metadata contributor/entity/scenario và test custodian/niêm phong | **MISSING** | Chưa có group inventory hoặc bằng chứng người giữ test; manifest cũ gán 0 row. Không mở test để chọn model. |
| PII, exact/near duplicate, unresolved/quarantine và zero overlap | **NOT VERIFIED** | Chưa có corpus thật để chạy phép kiểm; audit lịch sử trên nguồn ngoài không chứng nhận corpus MVP. |
| Sàn số lượng sau lọc cho development/test | **MISSING** | 0/360 và 0/90 eligible đã xác minh; support từng lớp 0/120 và 0/30. |

**Kết luận:** hiện chỉ xác minh được fixture/demo và export DB test; chưa tìm thấy corpus thật trong phạm vi đã kiểm. Chưa đủ điều kiện chuẩn bị/chạy thí nghiệm sentiment thật hay đưa dữ liệu thật lên Kaggle. Tại thời điểm này **chưa có cơ sở chứng minh tính khả thi nhánh A trước 06/11**, kể cả A có điều kiện vì chưa có pilot, tốc độ thu/gán nhãn, số group và nguồn lực A/B/C. Việc trường chấp nhận nhánh B **chưa được xác nhận**; cần rubric hoặc xác nhận của người phụ trách.

## Việc tiếp theo, theo thứ tự ưu tiên

1. Chủ dự án chỉ rõ **đường dẫn/kho dữ liệu thật nếu đã thu ngoài dự án** và người giữ quyền truy cập; cung cấp inventory ID + trạng thái, không gửi raw text/PII/receipt bí mật trong báo cáo.
2. Hoàn tất các TODO bắt buộc của T01: người chịu trách nhiệm, notice/version, nơi lưu và retention, quyền nghiên cứu local/Kaggle tách riêng, kênh rút consent, người giữ final test và annotator A/B/C. Thu pilot thật và giữ riêng.
3. Với row thật: liên kết receipt/withdrawal theo ID; gán nhãn độc lập/adjudicate; kiểm PII, exact/near duplicate, nhóm contributor/entity/scenario và leakage; loại/quarantine rồi mới tính lại lớp/domain/group và quyền Kaggle.
4. Trước 06/11, ghi số valid thực, tốc độ pilot/main, nguồn lực và khả năng đạt floor trước 10/11; xin rubric/xác nhận về phương án B. Chỉ sau gate thật mới có thể lập registry/manifest MVP riêng theo task được giao.

**T09 có thể chuẩn bị ngay bằng `DEMO_ONLY`:** loader/schema validation, kiểm flags/rights/withdrawal, kiểm PII và dedupe/group leakage, assert split và báo cáo aggregate, cùng test bằng fixture. Chạy thí nghiệm chất lượng thật, khóa independent test, lập manifest PASS hoặc upload corpus lên Kaggle phải chờ dữ liệu, consent, nhãn và audit thật. Không tạo thêm phản hồi, nhãn, receipt hoặc hash minh họa trong T08.

**Câu hỏi còn thiếu:** Corpus/pilot thật (nếu đã có) nằm ở kho/đường dẫn nào và ai giữ? Ai là A/B/C và người giữ test, có bao nhiêu giờ thực tế trước 06/11–10/11? Notice/retention/withdrawal và quyền Kaggle đã được chốt hay chưa? Rubric hoặc người xác nhận phương án B của trường là gì?

T08 chỉ đọc/kiểm kê và tạo báo cáo này; không sửa dữ liệu, registry/manifest BLOCKED, website hay DB; không train, upload, push hoặc deploy.
