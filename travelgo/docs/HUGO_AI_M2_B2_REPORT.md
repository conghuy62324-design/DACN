# HuGo Intelligence 2.0 — M2-B2 Kaggle CPU Reproducibility Demo

Ngày thực hiện: 2026-10-13

Trạng thái M2-B2: **COMPLETE — LOCAL REPRODUCIBILITY PASS**

Trạng thái Kaggle: **KAGGLE NOT RUN**

Trạng thái model quality: **BLOCKED / NOT EVALUATED**

## 1. Kết luận

Đã tạo notebook Kaggle CPU tái sử dụng trực tiếp pipeline M2-B1. Notebook được validate theo nbformat và chạy toàn bộ 9 code cells trên CPU local không có cell error. Fixture, bốn baseline, confusion matrix, artifact, checksum, reload parity và inference thử đều hoạt động.

Kết quả này chỉ chứng minh notebook/pipeline có thể chạy lặp lại trong môi trường local đã khai báo. Task không đăng nhập hoặc chạy trên Kaggle, do đó không ghi Kaggle PASS.

Mọi output tiếp tục khóa:

- `data_mode=DEMO_ONLY`;
- `quality_claim_allowed=false`;
- `production_eligible=false`;
- `Minh họa pipeline — không phải đánh giá chất lượng mô hình`.

Không tải dataset, không dùng HuGo test/production data, không truy cập PostgreSQL, không sửa registry/manifest/migration, không upload Kaggle và không activate model.

## 2. File thay đổi

Tạo mới:

- `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb`;
- `docs/HUGO_AI_M2_B2_REPORT.md`.

Tái sử dụng nhưng không sửa:

- `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py`;
- `ai/fixtures/vietnamese_sentiment_demo.jsonl`.

Artifact local được tạo tại `ai/artifacts/m2_b2_notebook_local/`. Thư mục `ai/artifacts/` được Git ignore và không phải file publish.

SHA-256 source:

| File | SHA-256 |
|---|---|
| Notebook M2-B2 | `5bc4caaaa8da5f25ba29b68108067f657f473dcccdaafa476c883171364e471b` |
| Pipeline M2-B1 | `1e472c6c97069f9afa558895e86a9ab3bea2efd4ba44d6f3b5c612e9443c6605` |
| Demo fixture | `bb98f78160286f33be2d14257677f8ca669bf150f1af00896634834936a5174f` |

## 3. Cấu trúc notebook

Notebook có 17 cells: 8 Markdown và 9 code cells.

| Phần | Nội dung |
|---|---|
| Governance | cảnh báo DEMO_ONLY ở đầu notebook và metadata |
| Kaggle setup | CPU/Accelerator None, Internet Off, Private input |
| File discovery | tìm đúng một script và fixture ở local hoặc `/kaggle/input` |
| Fixture gate | import hàm M2-B1, parse/validate 45 rows, NFC và ba cờ governance |
| Distribution | hiển thị 15 `NEGATIVE`, 15 `NEUTRAL`, 15 `POSITIVE`; watermark demo |
| Baselines | gọi `pipeline.run_pipeline()` để chạy lại cả bốn cấu hình M2-B1 |
| Metrics | chỉ hiển thị với tiêu đề “Metric kỹ thuật — không phải kết quả chất lượng AI” |
| Confusion matrix | đọc PNG do pipeline tạo, có `DEMO_ONLY` và disclaimer |
| Artifacts | đối chiếu từng SHA-256 và kiểm reload parity |
| Inference | danh sách `USER_SENTENCES` cho người dùng tự sửa, không dùng `input()` gây chặn Run All |
| Final gate | assert fixture/artifact/checksum/parity/governance và in execution environment |

Notebook không copy lại TF-IDF/Logistic Regression. Nó import script B1 bằng `importlib` và gọi các hàm `read_records`, `clean_and_validate_records`, `run_pipeline`, `sha256_file` và `normalize_text`.

## 4. Kết quả chạy local

Môi trường:

| Thành phần | Version/phạm vi |
|---|---|
| Python | 3.12.10 |
| NumPy | 2.5.4 |
| scikit-learn | 1.9.1 |
| joblib | 1.6.0 |
| matplotlib | 3.11.2 |
| nbformat | 5.11.1 |
| nbclient | 0.11.0 |
| ipykernel | 7.4.0 |
| Compute | local CPU |

Jupyter dependencies chỉ được cài vào virtual environment tạm `C:\Users\Danh\AppData\Local\Temp\hugo_m2b1_venv`; không vendoring vào repository.

Kết quả final cell khi execute local:

```text
fixture_has_45_rows=true
three_balanced_labels=true
all_artifacts_exist=true
all_checksums_match=true
reload_parity_pass=true
demo_only=true
quality_claim_disabled=true
production_disabled=true
M2-B2 TECHNICAL DEMO: PASS in LOCAL_CPU
KAGGLE NOT RUN
Minh họa pipeline — không phải đánh giá chất lượng mô hình
```

Notebook source được giữ sạch với `execution_count=null` và không có embedded output. Điều này tránh commit path máy local hoặc làm người dùng nhầm output local là Kaggle evidence.

## 5. Bằng chứng kiểm thử

| Kiểm thử | Kết quả | Bằng chứng |
|---|---|---|
| JSON parse bằng Node.js | **PASS** | nbformat 4.5; 17 cells |
| JSON parse bằng Python stdlib | **PASS** | tất cả cell ID có mặt, code outputs rỗng |
| `nbformat.validate` | **PASS** | schema notebook hợp lệ |
| Local notebook execution | **PASS** | 9/9 code cells có execution count; 0 error output |
| File discovery local | **PASS** | tìm đúng script và fixture từ notebook directory |
| Fixture gate | **PASS** | 45 rows, 15/lớp, 15/domain, toàn bộ flags demo đúng |
| Four baselines | **PASS** | `run_pipeline()` exit nội bộ thành công |
| Confusion matrix | **PASS** | PNG được hiển thị; kiểm tra trực quan có watermark |
| Artifact creation | **PASS** | 9 artifact được tạo ở local ignored directory |
| SHA-256 verification | **PASS** | tất cả artifact khớp checksum manifest |
| Reload parity | **PASS** | labels và probabilities giống trước/sau reload |
| Inference cell | **PASS kỹ thuật** | ba câu mặc định được normalize/predict; không claim accuracy |
| Final governance gate | **PASS** | demo-only=true, quality disabled=true, production disabled=true |
| Kaggle execution | **NOT RUN** | không đăng nhập/upload/thực thi Kaggle trong task |
| Model quality | **BLOCKED / NOT EVALUATED** | không có DEVELOPMENT + INDEPENDENT_TEST hợp lệ |
| Database/network dataset | **NOT RUN** | notebook không có download/DB code path |
| Push/deploy/publish | **NOT RUN** | không thực hiện |

Lần execute local đầu bị chặn trước cell 1 vì Jupyter cố tạo `C:\Users\Danh\.ipython` ngoài vùng ghi được. Harness được chạy lại với `IPYTHONDIR`, `JUPYTER_CONFIG_DIR`, `JUPYTER_DATA_DIR` và `JUPYTER_RUNTIME_DIR` trỏ vào thư mục tạm. Notebook sau đó PASS; không cần thay đổi thuật toán.

## 6. Hai file cần đưa lên Kaggle

Chỉ chuẩn bị hai input files sau:

1. `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py`;
2. `ai/fixtures/vietnamese_sentiment_demo.jsonl`.

Notebook `.ipynb` được import riêng vào Kaggle Code, không cần đặt trong input dataset. Không upload:

- `ai/data/`;
- `ai/artifacts/`;
- database dump hoặc PostgreSQL export;
- `.env`, credential, token;
- registry/manifest đang BLOCKED;
- dataset bên ngoài;
- model artifact local cũ.

Hai input file không có secret hoặc dữ liệu người dùng. Fixture chỉ có câu minh họa do người thực hiện tự viết.

## 7. Hướng dẫn Kaggle từng bước cho người mới

### 7.1 Tạo private input dataset

1. Đăng nhập Kaggle bằng trình duyệt.
2. Mở **Datasets** → **New Dataset**.
3. Đặt tên dễ nhận biết, ví dụ `hugo-m2-b2-demo-input`.
4. Upload đúng hai file ở mục 6. Có thể upload file rời; notebook tìm theo filename nên không bắt buộc giữ thư mục `ai/`.
5. Chọn visibility **Private** trước khi hoàn tất.
6. Kiểm tra trang dataset chỉ hiển thị hai file mong đợi.
7. Ghi lại dataset version được Kaggle tạo. Không đổi sang Public và không chia sẻ link công khai.

Đây là thao tác người dùng cần tự thực hiện. Task M2-B2 không tự upload.

### 7.2 Import notebook

1. Mở **Code** → **New Notebook**.
2. Trong menu **File**, chọn chức năng import/upload notebook.
3. Chọn `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb` từ máy.
4. Đặt notebook visibility là **Private**.
5. Ở panel **Input**, chọn **Add Input** và attach private dataset `hugo-m2-b2-demo-input` vừa tạo.
6. Không attach bất kỳ dataset nào khác để tránh notebook tìm thấy nhiều file trùng tên.

### 7.3 Cấu hình session

1. Mở **Notebook options** hoặc **Session options**.
2. Chọn **Accelerator = None**. Notebook chỉ dùng CPU.
3. Chọn **Internet = Off**.
4. Không nhập API key, database URL hoặc credential vào Secrets vì notebook không cần chúng.
5. Giữ session/private notebook; không bật chia sẻ công khai.

### 7.4 Chạy notebook

1. Chọn **Run** → **Restart Session and Run All** để tránh biến còn sót từ lần chạy trước.
2. Cell đầu tiên phải in:

```text
Execution environment: KAGGLE_CPU
data_mode=DEMO_ONLY
quality_claim_allowed=false
production_eligible=false
```

3. Cell fixture phải báo 45 rows, ba nhãn đều 15 và ba domain đều 15.
4. Cell distribution phải hiện biểu đồ có dòng cảnh báo màu đỏ.
5. Cell baseline phải tạo artifact dưới `/kaggle/working/hugo_vi_sentiment_m2_b2_demo`.
6. Cell confusion matrix phải hiện `DEMO_ONLY` trong tiêu đề và disclaimer ở đáy ảnh.
7. Cell checksum/reload phải in:

```text
CHECKSUM VERIFICATION: PASS
RELOAD PARITY: PASS
```

8. Final cell phải có tất cả giá trị `true`, sau đó in:

```text
M2-B2 TECHNICAL DEMO: PASS in KAGGLE_CPU
KAGGLE EXECUTION: RUN BY USER
Minh họa pipeline — không phải đánh giá chất lượng mô hình
```

Chỉ lần chạy mà chính người dùng quan sát trên Kaggle mới là bằng chứng Kaggle execution. Báo cáo hiện tại vẫn là `KAGGLE NOT RUN`.

### 7.5 Thử câu tiếng Việt của bạn

1. Tìm phần **Inference thử với câu do bạn tự nhập**.
2. Sửa danh sách:

```python
USER_SENTENCES = [
    "Câu thứ nhất của bạn.",
    "Câu thứ hai của bạn.",
]
```

3. Không nhập PII, booking/account ID hoặc nội dung của người khác.
4. Chạy lại riêng cell inference.
5. Đọc kết quả dưới tên `demo_prediction` và `demo_scores`; không gọi score đó là độ tin cậy đã hiệu chuẩn.
6. Prediction sai là bình thường vì model chỉ fit trên 30 câu demo.

### 7.6 Lấy artifact về máy

1. Mở phần Files/Output của notebook sau khi Run All.
2. Tìm thư mục `/kaggle/working/hugo_vi_sentiment_m2_b2_demo`.
3. Tải toàn bộ thư mục hoặc từng file cần kiểm chứng.
4. Mở `artifact_checksums.json` và đối chiếu SHA-256 sau khi tải.
5. Giữ artifact ở trạng thái demo local; không upload vào website, model registry production hoặc public dataset.
6. Nếu chọn **Save Version**, bảo đảm notebook/output tiếp tục Private. Không publish.

## 8. Xử lý lỗi thường gặp

| Lỗi | Cách xử lý an toàn |
|---|---|
| `Cần đúng 1 file ... tìm thấy 0` | kiểm tra private dataset đã được Add Input và đúng filename |
| `tìm thấy 2` hoặc nhiều hơn | detach input trùng; chỉ giữ một dataset chứa hai file |
| thiếu `sklearn`, `joblib` hoặc `matplotlib` | ghi BLOCKED và kiểm tra Kaggle base image; không bật Internet để tải tùy tiện trong demo |
| fixture không đủ 45 rows/cờ sai | xóa input đã chỉnh, attach lại exact fixture theo SHA-256 trong mục 2 |
| checksum FAIL | không load/use artifact; restart session, Run All và kiểm tra storage/path |
| reload parity FAIL | giữ artifact để chẩn đoán nhưng không dùng inference/không claim PASS |
| kernel cũ còn biến | Restart Session and Run All |
| prediction không hợp lý | đây là demo-only; không sửa label/test để làm đẹp metric |

## 9. Giới hạn và điểm dừng

- Notebook tương thích Kaggle theo cấu trúc/input contract nhưng chưa được chạy trên Kaggle thật.
- 45 câu và metric demo không phải bằng chứng model quality.
- Không có independent test hoặc approved data manifest.
- Không tạo model production, website adapter hoặc activation workflow.
- M2-A/A2 data gate tiếp tục BLOCKED.

M2-B2 dừng tại đây. Không tự bắt đầu task tiếp theo.
