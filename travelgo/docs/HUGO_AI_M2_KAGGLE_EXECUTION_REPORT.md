# HuGo Intelligence 2.0 — M2-B2 Kaggle Execution Evidence

Ngày xác minh: 2026-10-15 (Asia/Ho_Chi_Minh)  
Phạm vi: Kaggle CPU reproducibility demo với dữ liệu `DEMO_ONLY`  
Không thuộc phạm vi: huấn luyện lại, đánh giá chất lượng mô hình, database, triển khai website hoặc kích hoạt model

## 1. Kết luận

- **KAGGLE EXECUTION:** `PASS` theo bằng chứng do người dùng trực tiếp cung cấp; Antigravity không đăng nhập, không chạy và không tự tạo bằng chứng Kaggle.
- **LOCAL ARTIFACT VERIFICATION:** `PASS` cho nội dung, số byte và SHA-256 của toàn bộ 8 payload được liệt kê trong manifest.
- **LOCAL FILENAME CONTRACT:** `FAIL — MANUAL RENAME REQUIRED`; đủ 9 file vật lý nhưng 5 JSON bị trình duyệt/Windows lưu thành `.txt`.
- **LOCAL JOBLIB RELOAD:** `BLOCKED — INCOMPATIBLE/MISSING LOCAL RUNTIME`; không nạp binary vì máy local không có dependency và không trùng môi trường tạo artifact.
- **MODEL QUALITY:** `BLOCKED / NOT EVALUATED`; metric từ 45 câu minh họa không phải kết quả chất lượng AI thực tế.
- **PRODUCTION:** `NOT ELIGIBLE`; model không được kích hoạt trong HuGo.

Không cần tải lại artifact: nội dung của 5 file `.txt` là JSON UTF-8 hợp lệ và hash khớp tuyệt đối. Người dùng chỉ cần đổi lại đuôi file thủ công mà không mở rồi lưu lại nội dung.

## 2. KAGGLE EXECUTION — bằng chứng do người dùng cung cấp

Người dùng báo cáo đã trực tiếp thực hiện:

- Notebook: `HuGo Intelligence 2.0 - Vietnamese Sentiment AI`;
- Kaggle Version #1: `Successful`;
- saved run khoảng 28 giây;
- CPU, Internet Off, Notebook Private và Dataset Private;
- final cell: `M2-B2 TECHNICAL DEMO: PASS in KAGGLE_CPU`;
- final cell: `KAGGLE EXECUTION: RUN BY USER`;
- 8/8 final conditions là `true`;
- Kaggle Output có 9 artifact.

Phân loại bằng chứng: **USER-PROVIDED EXECUTION EVIDENCE**. Antigravity chỉ kiểm tra các file đã tải về Windows, không tuyên bố đã quan sát hoặc chạy Kaggle session.

## 3. Kiểm kê file tải về

Thư mục được kiểm tra read-only:

```text
C:\Users\Danh\Downloads\DACN\travelgo\ai\artifacts\m2_b2_kaggle_demo
```

Có đúng 9 file vật lý, không có thư mục con. Tuy nhiên chỉ 4/9 tên file đúng contract; 5 JSON mang sai đuôi `.txt`.

| Tên contract | Tên tải về | Byte | Kết quả |
|---|---|---:|---|
| `artifact_checksums.json` | `artifact_checksums.txt` | 1,541 | nội dung JSON hợp lệ; sai đuôi |
| `combined_classifier_demo_only.joblib` | đúng tên | 10,752 | PASS |
| `combined_pipeline_demo_only.joblib` | đúng tên | 23,185 | PASS |
| `combined_vectorizer_demo_only.joblib` | đúng tên | 11,979 | PASS |
| `confusion_matrix_demo_only.json` | `confusion_matrix_demo_only.txt` | 593 | nội dung JSON hợp lệ; sai đuôi |
| `confusion_matrix_demo_only.png` | đúng tên | 48,599 | PASS; PNG signature hợp lệ |
| `metrics_demo_only.json` | `metrics_demo_only.txt` | 7,299 | nội dung JSON hợp lệ; sai đuôi |
| `model_metadata.json` | `model_metadata.txt` | 1,252 | nội dung JSON hợp lệ; sai đuôi |
| `reload_parity.json` | `reload_parity.txt` | 445 | nội dung JSON hợp lệ; sai đuôi |

Không phát hiện file `.json.html` hoặc nội dung HTML. Cả năm file `.txt` đều parse thành JSON object thành công bằng Python UTF-8.

## 4. LOCAL ARTIFACT VERIFICATION — SHA-256 và dung lượng

`artifact_checksums.txt` parse JSON thành công và khai báo `hash_algorithm=SHA-256`. Manifest liệt kê 8 payload; bản thân checksum manifest không tự hash chính nó.

Khi kiểm tra các JSON bị đổi đuôi, tên contract trong manifest được ánh xạ read-only sang file `.txt` tương ứng. Không file nào được đổi tên hoặc sửa trong quá trình xác minh.

| Artifact trong manifest | Byte manifest/thực tế | SHA-256 manifest và thực tế | Kết quả |
|---|---:|---|---|
| `combined_classifier_demo_only.joblib` | 10,752 / 10,752 | `9195160a626b2884ca765f87e159b04c62d79eb295d19104be798ef2b02849d1` | PASS |
| `combined_pipeline_demo_only.joblib` | 23,185 / 23,185 | `55ea8cfa525dd431517b26697d3c442fc6981b7d572d257db284fb638a2b1d62` | PASS |
| `combined_vectorizer_demo_only.joblib` | 11,979 / 11,979 | `fdc69291a33658c00340b86e7c594f5d9eb286fc03b10b6c22f8c4f7c8c97d35` | PASS |
| `confusion_matrix_demo_only.json` | 593 / 593 | `a37e9f061c554af2325e52d9be6fe65055826e961a605fba164d363dfed231b1` | PASS |
| `confusion_matrix_demo_only.png` | 48,599 / 48,599 | `268595607baf3aa503f54b9e172e15c8eee0e5ffd56ceaea2742787b3493f7fa` | PASS |
| `metrics_demo_only.json` | 7,299 / 7,299 | `36379a9f0458e17d33d0ca9e6015a149a88d200d17a77cd49ba8c3807025813e` | PASS |
| `model_metadata.json` | 1,252 / 1,252 | `5ae1ebc4e5072ba69dc324f660bbce3f0732f472d9ff82f60c59b86648e47e4c` | PASS |
| `reload_parity.json` | 445 / 445 | `7dd1dcbec0266c47a64033e35ae00eb5ef2573bded42a5048013e946e81820c1` | PASS |

Tổng kết: **8/8 size PASS; 8/8 SHA-256 PASS**.

## 5. Metadata và governance

`model_metadata.txt` là JSON hợp lệ và chứa:

| Trường | Giá trị | Kết quả |
|---|---|---|
| Python | `3.13.15` | ghi nhận từ Kaggle run |
| scikit-learn | `1.6.1` | ghi nhận từ Kaggle run |
| joblib | `1.6.0` | ghi nhận từ Kaggle run |
| NumPy | `2.1.3` | ghi nhận từ Kaggle run |
| matplotlib | `3.10.0` | ghi nhận từ Kaggle run |
| platform | `Linux-6.18.48+-x86_64-with-glibc2.39` | phù hợp Kaggle Linux |
| `data_mode` | `DEMO_ONLY` | PASS |
| `quality_claim_allowed` | `false` | PASS |
| `production_eligible` | `false` | PASS |
| lifecycle | `DEMO_ONLY_NOT_ACTIVE` | PASS |
| script version | `m2-b1-demo-v1` | PASS |
| primary artifact | `combined_pipeline_demo_only.joblib` | PASS |
| primary SHA-256 | `55ea8cfa525dd431517b26697d3c442fc6981b7d572d257db284fb638a2b1d62` | PASS; khớp manifest và file tải về |
| reload parity status | `PASS` | PASS |

`metrics_demo_only.txt` tiếp tục xác nhận:

- fixture `vietnamese_sentiment_demo.jsonl`;
- fixture SHA-256 `bb98f78160286f33be2d14257677f8ca669bf150f1af00896634834936a5174f`, khớp fixture hiện tại trong source;
- 45 rows, 15 rows cho mỗi lớp;
- 30 train rows và 15 `DEMO_HOLDOUT` rows;
- vectorizer fit scope `TRAIN_ONLY`;
- không có independent test và không có approved manifest.

Các metric demo không được diễn giải thành độ chính xác thực tế.

## 6. Reload parity

`reload_parity.txt` là JSON hợp lệ:

| Kiểm tra | Giá trị | Kết quả |
|---|---:|---|
| `status` | `PASS` | PASS |
| `predicted_labels_equal` | `true` | PASS |
| `predicted_probabilities_equal` | `true` | PASS |
| `rows_checked` | 15 | PASS |
| absolute tolerance | `1e-12` | PASS |

Đây là parity được pipeline thực hiện ngay trong môi trường tạo artifact. Nội dung này khớp logic source: pipeline lưu `combined_pipeline_demo_only.joblib`, nạp lại bằng `joblib.load`, so sánh label bằng exact equality và probability với `rtol=0`, `atol=1e-12`; Notebook Cell 13 bắt buộc cả hai giá trị là `true`.

## 7. Đối chiếu source M2-B1 và Notebook M2-B2

Source hiện tại có SHA-256:

| File | SHA-256 |
|---|---|
| `02_vietnamese_sentiment_tfidf_mvp.py` | `1e472c6c97069f9afa558895e86a9ab3bea2efd4ba44d6f3b5c612e9443c6605` |
| `02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb` | `5bc4caaaa8da5f25ba29b68108067f657f473dcccdaafa476c883171364e471b` |
| `vietnamese_sentiment_demo.jsonl` | `bb98f78160286f33be2d14257677f8ca669bf150f1af00896634834936a5174f` |

Đối chiếu contract:

- đúng `SCRIPT_VERSION=m2-b1-demo-v1`;
- đúng ba joblib: pipeline, vectorizer và classifier;
- đúng confusion matrix JSON/PNG, metrics, metadata, reload parity và checksum manifest;
- manifest source hash toàn bộ file trong output trừ chính `artifact_checksums.json`, đúng 8 payload;
- metadata primary hash được tính trực tiếp từ combined pipeline;
- Notebook Cell 13 xác minh toàn bộ checksum và reload parity;
- Notebook Cell 16 có đúng 8 final conditions và chỉ in `PASS in KAGGLE_CPU` khi chạy trong Kaggle.

Kết luận provenance kỹ thuật: **artifact structure và nội dung phù hợp pipeline/notebook hiện tại**. Không yêu cầu binary hash Kaggle trùng artifact local cũ vì dependency và platform khác nhau.

## 8. Quyết định không nạp joblib trên máy local

Sau khi checksum PASS, môi trường local được kiểm tra trước khi deserialization:

- Python local: `3.12.10`;
- `joblib`: không cài trong Python đang hoạt động;
- `numpy`: không cài;
- `scikit-learn`: không cài;
- artifact được tạo bởi Python `3.13.15`, joblib `1.6.0`, NumPy `2.1.3`, scikit-learn `1.6.1`.

Vì joblib/pickle có thể thực thi code và scikit-learn không bảo đảm khả năng load model qua môi trường khác version, Antigravity **không gọi `joblib.load`**. Kết quả này được ghi là `BLOCKED — LOCAL RUNTIME`, không phải checksum FAIL và không làm mất giá trị reload parity đã chạy trong chính Kaggle environment.

Không cài dependency, không tạo virtual environment và không thay đổi artifact trong task xác minh này.

## 9. Cách sửa đuôi file thủ công

Không cần tải lại. Trong Windows File Explorer:

1. Mở thư mục artifact.
2. Bật **View → Show → File name extensions**.
3. Đổi đúng năm tên sau, không mở và không Save nội dung:

```text
artifact_checksums.txt            -> artifact_checksums.json
confusion_matrix_demo_only.txt    -> confusion_matrix_demo_only.json
metrics_demo_only.txt             -> metrics_demo_only.json
model_metadata.txt                -> model_metadata.json
reload_parity.txt                 -> reload_parity.json
```

4. Chấp nhận cảnh báo đổi extension của Windows.
5. Xác nhận thư mục vẫn có đúng 9 file và không có tên dạng `.json.txt`.

Đổi tên không thay đổi byte nên SHA-256 phải giữ nguyên. Nếu Windows tạo bản sao hoặc nội dung bị Save lại, cần tính hash lại trước khi sử dụng.

## 10. PASS / FAIL / BLOCKED

| Nhóm | Trạng thái | Bằng chứng |
|---|---|---|
| User-provided Kaggle execution | **PASS** | Version #1 Successful; final Kaggle CPU PASS; 8/8 true; 9 output artifact — do người dùng cung cấp |
| 9-file physical inventory | **PASS** | đúng 9 file |
| Exact filename/extension contract | **FAIL — REPAIRABLE** | 5 JSON bị lưu thành `.txt`; cần manual rename |
| JSON content | **PASS** | 5/5 file text parse JSON UTF-8 thành công |
| Manifest format | **PASS** | SHA-256, 8 payload |
| Payload byte sizes | **PASS 8/8** | khớp manifest |
| Payload SHA-256 | **PASS 8/8** | khớp manifest |
| Primary artifact cross-check | **PASS** | file = manifest = metadata |
| Fixture/source cross-check | **PASS** | SHA-256 trong metrics khớp fixture source hiện tại |
| Reload parity evidence | **PASS** | labels=true, probabilities=true, 15 rows |
| Local independent joblib reload | **BLOCKED** | local dependency thiếu và Python/sklearn environment không tương thích |
| Model quality | **BLOCKED / NOT EVALUATED** | chỉ có DEMO_ONLY/DEMO_HOLDOUT, không có independent test |
| Website activation | **NOT ALLOWED** | `production_eligible=false` |

## 11. Trạng thái cuối

**M2-B2 KAGGLE TECHNICAL DEMO = PASS, dựa trên bằng chứng chạy do người dùng cung cấp và artifact download đã được Antigravity xác minh integrity.**

Giới hạn bắt buộc của kết luận:

- không phải Kaggle execution do Antigravity trực tiếp quan sát;
- local bundle cần đổi lại 5 đuôi `.txt` thành `.json` để đúng contract;
- không chứng minh model quality;
- không mở data gate, không biến dataset BLOCKED thành PASS;
- không cho phép deploy hoặc kích hoạt model trong website.

## 12. Bước nhỏ nhất tiếp theo

Người dùng đổi thủ công đúng 5 đuôi file theo mục 9, sau đó gửi ảnh File Explorer đã bật **File name extensions** và hiển thị đủ 9 tên file. Chỉ cần xác minh lại tên; không train, không upload, không tích hợp backend và không mở milestone khác trong bước này.

