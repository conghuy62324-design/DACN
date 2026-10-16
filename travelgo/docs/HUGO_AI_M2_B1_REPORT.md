# HuGo Intelligence 2.0 — M2-B1 Vietnamese Sentiment TF-IDF MVP Pipeline

Ngày thực hiện: 2026-10-13
Trạng thái M2-B1: **COMPLETE — TECHNICAL PIPELINE ONLY**
Trạng thái model quality: **BLOCKED / NOT EVALUATED**

## 1. Kết luận

Pipeline Vietnamese sentiment TF-IDF MVP đã chạy thật trên CPU local và tạo đủ artifact kỹ thuật. Reload-parity và SHA-256 verification đều PASS.

Toàn bộ lần chạy dùng 45 câu do người thực hiện tự viết để kiểm thử kỹ thuật. Đây không phải review người dùng, không phải development corpus hợp lệ và không phải independent test. Vì vậy mọi output đều khóa:

- `data_mode=DEMO_ONLY`;
- `quality_claim_allowed=false`;
- `production_eligible=false`;
- `lifecycle_status=DEMO_ONLY_NOT_ACTIVE`;
- `Minh họa pipeline — không phải đánh giá chất lượng mô hình`.

Không dataset BLOCKED/REJECTED nào được tải hoặc sử dụng. Registry và split manifest đang BLOCKED không bị sửa. Không truy cập PostgreSQL, không sửa migration, không upload Kaggle, không push/deploy/publish và không train PhoBERT/Learning-to-Rank.

## 2. File tạo mới

| File | Vai trò |
|---|---|
| `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py` | pipeline Python/Kaggle CPU, validation, bốn baseline, artifact export và reload parity |
| `ai/fixtures/vietnamese_sentiment_demo.jsonl` | 45 câu minh họa tự viết, cân bằng nhãn/domain, chỉ dùng kiểm thử kỹ thuật |
| `docs/HUGO_AI_M2_B1_REPORT.md` | báo cáo thực thi M2-B1 |

Artifact local được sinh tại `ai/artifacts/m2_b1_demo/`. Thư mục này đã nằm trong `.gitignore`; artifact được giữ local để kiểm chứng, không publish:

- `metrics_demo_only.json`;
- `confusion_matrix_demo_only.json`;
- `confusion_matrix_demo_only.png`;
- `combined_pipeline_demo_only.joblib`;
- `combined_vectorizer_demo_only.joblib`;
- `combined_classifier_demo_only.joblib`;
- `model_metadata.json`;
- `reload_parity.json`;
- `artifact_checksums.json`.

Không sửa `vietnamese_sentiment_dataset_registry.json`, `vietnamese_sentiment_split_manifest.json` hoặc `vietnamese_sentiment_label_map.json`.

## 3. Demo fixture

Fixture có 45 rows, không có duplicate ID/text và toàn bộ text ở Unicode NFC:

| Phân bố | NEGATIVE | NEUTRAL | POSITIVE | Tổng |
|---|---:|---:|---:|---:|
| Nhãn | 15 | 15 | 15 | 45 |

| Domain | hotel | restaurant | attraction | Tổng |
|---|---:|---:|---:|---:|
| Rows | 15 | 15 | 15 | 45 |

Mỗi row có các trường `id`, `text`, `label`, `domain`, `data_tier`, `quality_claim_allowed`, `production_eligible` và `provenance`. Các giá trị governance được khóa ở `DEMO_ONLY`, `false`, `false` và `AUTHOR_WRITTEN_TECHNICAL_FIXTURE`.

Fixture không lấy từ Google Maps, Booking.com, TripAdvisor, mạng xã hội, database HuGo hoặc dataset bên ngoài. Nó không được chuyển sang DEVELOPMENT/INDEPENDENT_TEST trong task này.

SHA-256 fixture:

`bb98f78160286f33be2d14257677f8ca669bf150f1af00896634834936a5174f`

## 4. Data validation và chống leakage

Pipeline thực hiện:

1. đọc `.jsonl` hoặc `.csv` với UTF-8;
2. chuẩn hóa Unicode NFC, loại BOM/zero-width marker và gộp whitespace;
3. giữ dấu tiếng Việt và từ phủ định;
4. loại row có text rỗng và ghi số lượng; từ chối khi không còn row hợp lệ;
5. từ chối schema thiếu, ID trùng, text exact-duplicate và label ngoài `NEGATIVE/NEUTRAL/POSITIVE`;
6. từ chối row demo nếu `quality_claim_allowed` hoặc `production_eligible` là true;
7. chia fixture bằng stratified split với seed `20261013`;
8. tạo mới từng vectorizer/pipeline và chỉ gọi `fit` trên `X_train`; evaluation text chỉ đi qua `predict/transform`.

Lần chạy local tạo 30 train rows và 15 `DEMO_HOLDOUT` rows, mỗi lớp lần lượt 10 và 5. `DEMO_HOLDOUT` không được gọi là independent test.

Để chuẩn bị cho dữ liệu thật mà không viết lại pipeline, CLI đã có:

- `--development-data`;
- `--independent-test-data`;
- `--approved-manifest`;
- `--output-dir`.

Non-demo mode chỉ mở khi manifest có `status=PASS`, split hash, đúng label-map ID, explicit quality/production flags và SHA-256 khớp cả development lẫn independent-test file. Các row cũng phải mang đúng tier. Manifest BLOCKED hiện tại bị từ chối đúng thiết kế.

## 5. Bốn cấu hình đã chạy

| Tên cấu hình | Feature/classifier |
|---|---|
| `majority_class` | `DummyClassifier(strategy=most_frequent)` |
| `word_tfidf_logistic_regression` | word TF-IDF 1–2 + Logistic Regression |
| `char_tfidf_logistic_regression` | `char_wb` TF-IDF 3–5 + Logistic Regression |
| `combined_word_char_tfidf_logistic_regression` | FeatureUnion word + char TF-IDF + Logistic Regression |

Logistic Regression dùng `class_weight=balanced`, solver `lbfgs`, `max_iter=2000` và seed cố định.

Các con số dưới đây chỉ chứng minh code tính metric được; **không phải kết quả chất lượng mô hình**:

| Cấu hình | Accuracy demo | Macro-F1 demo |
|---|---:|---:|
| Majority | 0,3333 | 0,1667 |
| Word | 0,4000 | 0,3485 |
| Character | 0,4667 | 0,4470 |
| Combined | 0,4000 | 0,3892 |

Mỗi class chỉ có 5 câu trong demo holdout. Không được dùng bảng này trong abstract/kết luận/slide như bằng chứng model tốt hoặc so sánh khoa học.

## 6. Artifact và SHA-256

Primary artifact:

- file: `combined_pipeline_demo_only.joblib`;
- SHA-256: `a73991ab7c9823714f8255c5d1a92ee73f3eadac98def8e70251b0432ade5956`;
- trạng thái: `DEMO_ONLY_NOT_ACTIVE`;
- production eligible: `false`.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `combined_pipeline_demo_only.joblib` | 20.378 | `a73991ab7c9823714f8255c5d1a92ee73f3eadac98def8e70251b0432ade5956` |
| `combined_vectorizer_demo_only.joblib` | 11.982 | `1174df2f919a894baac78a887b42fe6ddde980968b3e13a659ae0e788cea29a8` |
| `combined_classifier_demo_only.joblib` | 8.120 | `9362cf4077b697e968b18a84114324a126fe8bb4e30986c8c1062e6317f71208` |
| `confusion_matrix_demo_only.png` | 43.238 | `0e9e5853a1f86036f2493f06b15c4b7d6b99c62dda52594fc2b75106dcfb90da` |
| `confusion_matrix_demo_only.json` | 593 | `a37e9f061c554af2325e52d9be6fe65055826e961a605fba164d363dfed231b1` |
| `reload_parity.json` | 445 | `7dd1dcbec0266c47a64033e35ae00eb5ef2573bded42a5048013e946e81820c1` |
| `model_metadata.json` | 1.241 | `02e5b7a09fc86acbabd760d30215adb508ab0da9bb4f4d1c31de06083b524827` |

`metrics_demo_only.json` chứa thời gian chạy nên hash có thể đổi giữa các lần chạy. `artifact_checksums.json` luôn ghi hash của exact run hiện tại và đã được đối chiếu lại bằng `Get-FileHash`.

Joblib/pickle có thể thực thi code khi load. Chỉ load artifact allowlisted do pipeline HuGo tạo sau khi checksum khớp.

## 7. Môi trường chạy thật

| Thành phần | Version |
|---|---|
| OS | Windows 10 `10.0.19045` |
| Python | 3.12.10 |
| NumPy | 2.5.4 |
| scikit-learn | 1.9.1 |
| joblib | 1.6.0 |
| matplotlib | 3.11.2 |

Máy ban đầu chỉ có Windows Store Python alias và không có runtime thực thi. Python 3.12.10 được cài ở user scope; dependency ML được cài vào virtual environment tạm `C:\Users\Danh\AppData\Local\Temp\hugo_m2b1_venv`, không vendoring vào repository.

Hai lỗi đã được phát hiện bằng chạy thật và sửa trước lần PASS cuối:

1. scikit-learn 1.9 đã bỏ tham số `multi_class` của `LogisticRegression`; pipeline đổi sang API tương thích với solver `lbfgs`;
2. Windows console dùng CP1252 làm lỗi khi in disclaimer tiếng Việt; script cấu hình stdout/stderr UTF-8.

## 8. Kết quả kiểm thử

| Nhóm | Kết quả | Bằng chứng |
|---|---|---|
| Đọc tài liệu M2/label contract/AI scripts | **PASS** | MVP plan, data gate, recovery report, label map và scripts 00/01 đã đối chiếu |
| Fixture JSON/schema | **PASS** | 45/45 rows parse; đủ trường; ID/text unique |
| Fixture balance | **PASS** | 15 rows mỗi label; 15 rows mỗi domain |
| Fixture governance | **PASS** | mọi row `DEMO_ONLY`, quality false, production false |
| Python syntax | **PASS** | `python -m py_compile` exit 0 |
| Unicode NFC | **PASS** | fixture NFC + internal decomposed-character probe |
| Empty text handling | **PASS** | self-test đưa một whitespace-only row và xác nhận drop count = 1 |
| Invalid label | **PASS** | self-test xác nhận `UNKNOWN` bị từ chối |
| Preserve negation | **PASS** | self-test xác nhận `không` không bị xóa |
| Train-only vectorizer | **PASS** | evaluation-only token không xuất hiện trong fitted vocabulary probe; code chỉ fit trên `X_train` |
| Four model configs | **PASS** | cả bốn fit/predict trên CPU local không crash |
| Pipeline end-to-end | **PASS** | final exit code 0; 9 artifacts được tạo |
| Confusion-matrix watermark | **PASS** | kiểm tra trực quan PNG có `DEMO_ONLY` và disclaimer tiếng Việt |
| Reload parity | **PASS** | 15/15 labels giống; probabilities `allclose` với tolerance `1e-12` |
| Joblib governance payload | **PASS** | pipeline/vectorizer/classifier đều chứa ba cờ demo bắt buộc |
| Artifact SHA-256 | **PASS** | mọi file trong checksum manifest khớp `Get-FileHash` |
| BLOCKED manifest guard | **PASS** | manifest hiện tại bị từ chối với `Approved manifest must have status=PASS`, exit 1 |
| Model quality | **BLOCKED / NOT EVALUATED** | không có DEVELOPMENT + INDEPENDENT_TEST hợp lệ |
| Kaggle execution | **NOT RUN** đúng phạm vi | script thiết kế tương thích; task này cấm upload |
| PostgreSQL/migration | **NOT RUN** đúng phạm vi | không có DB command hoặc code path |
| Push/deploy/publish | **NOT RUN** đúng phạm vi | không thực hiện |

Lệnh chạy final:

```powershell
& 'C:\Users\Danh\AppData\Local\Temp\hugo_m2b1_venv\Scripts\python.exe' `
  ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py
```

Kết quả: exit `0`, `reload_parity=PASS`, `CHECKSUMS_MATCH=True`.

## 9. Hướng dẫn chạy trên Kaggle sau này

Task này không upload gì. Khi người dùng chủ động thực hiện ở bước sau:

1. tạo Kaggle Notebook mới, Accelerator = `None`/CPU và giữ dataset/notebook private;
2. attach snapshot chứa riêng source cần thiết: script, fixture hoặc dataset đã PASS, label map và approved manifest; không attach database dump/TravelGo test export;
3. pin exact snapshot/version, không phụ thuộc một nguồn mutable;
4. chạy demo từ repository snapshot:

```bash
python /kaggle/input/<private-source>/ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py \
  --development-data /kaggle/input/<private-source>/ai/fixtures/vietnamese_sentiment_demo.jsonl \
  --output-dir /kaggle/working/hugo_vi_sentiment_m2_b1
```

5. xác nhận console và JSON vẫn ghi `DEMO_ONLY`, quality false, production false; tải artifact về local chỉ sau khi đối chiếu SHA-256;
6. với dữ liệu thật ở task sau, truyền thêm `--independent-test-data` và `--approved-manifest`. Pipeline sẽ từ chối manifest không PASS hoặc hash không khớp.

Kaggle Internet không cần bật cho lần demo nếu dependency chuẩn đã có trong image. Nếu version scikit-learn khác local, lưu version vào metadata và chạy reload-parity trong cùng committed run.

## 10. Giới hạn và điểm dừng

- 45 câu được chủ động viết để test code nên từ vựng đơn giản, cân bằng nhân tạo và không đại diện review tự nhiên.
- Demo holdout có 5 câu/lớp; metric biến động cao và không có ý nghĩa để claim chất lượng.
- Chưa có independent test, consented development corpus, annotator agreement hoặc domain-quality evidence.
- Artifact không được activate, tích hợp production hoặc dùng để sinh Place insight.
- M2-A/A2 data gate vẫn BLOCKED; M2-B1 không thay đổi kết luận đó.

M2-B1 dừng tại đây. Không bắt đầu M2-B2 hoặc task khác.
