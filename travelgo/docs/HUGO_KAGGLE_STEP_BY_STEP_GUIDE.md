# HuGo Intelligence 2.0 — Hướng dẫn Kaggle M2-B2 từng bước

Ngày kiểm tra: 2026-10-13  
Phạm vi: Vietnamese Sentiment TF-IDF MVP, dữ liệu `DEMO_ONLY`  
Đối tượng: người mới hoàn toàn với Kaggle  
Trạng thái local: **PASS — TECHNICAL PIPELINE ONLY**  
Trạng thái Kaggle: **KAGGLE NOT RUN**  
Trạng thái chất lượng mô hình: **BLOCKED / NOT EVALUATED**

## 1. Kết luận trước khi thao tác

Notebook hiện tại đủ điều kiện để **người dùng tự chạy thử trên Kaggle CPU**. Code đã được kiểm tra lại trên CPU local, nhưng chưa được chạy trong một Kaggle session thật nên tài liệu này không tuyên bố `KAGGLE PASS`.

Ba file cần dùng là:

| Vai trò | Tên file | Đường dẫn trên Windows |
|---|---|---|
| Notebook cần import vào Kaggle Code | `02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb` | `C:\Users\Danh\Downloads\DACN\travelgo\ai\kaggle\02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb` |
| Pipeline đưa vào Kaggle Private Dataset | `02_vietnamese_sentiment_tfidf_mvp.py` | `C:\Users\Danh\Downloads\DACN\travelgo\ai\kaggle\02_vietnamese_sentiment_tfidf_mvp.py` |
| Fixture đưa vào Kaggle Private Dataset | `vietnamese_sentiment_demo.jsonl` | `C:\Users\Danh\Downloads\DACN\travelgo\ai\fixtures\vietnamese_sentiment_demo.jsonl` |

Notebook `.ipynb` được import riêng vào **Kaggle Code**. Chỉ hai file `.py` và `.jsonl` được upload vào **một Kaggle Private Dataset**.

SHA-256 của ba source file đã audit:

| File | SHA-256 |
|---|---|
| `02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb` | `5bc4caaaa8da5f25ba29b68108067f657f473dcccdaafa476c883171364e471b` |
| `02_vietnamese_sentiment_tfidf_mvp.py` | `1e472c6c97069f9afa558895e86a9ab3bea2efd4ba44d6f3b5c612e9443c6605` |
| `vietnamese_sentiment_demo.jsonl` | `bb98f78160286f33be2d14257677f8ca669bf150f1af00896634834936a5174f` |

Không upload các thư mục `ai/data`, `ai/artifacts`, database dump, PostgreSQL export, `.env`, credential, token, dataset registry/manifest đang BLOCKED hoặc bất kỳ dataset ngoài nào.

Mọi lần chạy phải giữ nguyên:

```text
data_mode=DEMO_ONLY
quality_claim_allowed=false
production_eligible=false
Minh họa pipeline — không phải đánh giá chất lượng mô hình
```

## 2. Kết quả audit kỹ thuật

### 2.1 Cấu trúc 17 cell

Notebook hợp lệ theo `nbformat 4.5`, có 17 cell gồm 8 Markdown và 9 code cell. Source notebook sạch: mọi `execution_count=null` và không nhúng output local.

| Cell | Loại | Nội dung/kết quả cần quan sát |
|---:|---|---|
| 1 | Markdown | Giới thiệu ba lớp sentiment và cảnh báo `DEMO_ONLY` |
| 2 | Markdown | Yêu cầu CPU, Internet Off và hai input file private |
| 3 | Code | Import dependency, tìm hai input file, xác định output directory và in governance |
| 4 | Markdown | Giới thiệu kiểm tra 45 câu |
| 5 | Code | Import pipeline, đọc/validate fixture, in audit và ba dòng mẫu |
| 6 | Code | Kiểm tra 15 câu mỗi nhãn, 15 câu mỗi domain và vẽ biểu đồ phân bố |
| 7 | Markdown | Giới thiệu bốn baseline |
| 8 | Code | Chạy toàn bộ pipeline, tạo artifact và kiểm tra governance/reload parity |
| 9 | Code | In bảng metric của bốn cấu hình; chỉ là metric kỹ thuật demo |
| 10 | Markdown | Cảnh báo về confusion matrix demo |
| 11 | Code | Hiển thị confusion matrix có watermark |
| 12 | Markdown | Cảnh báo an toàn khi load joblib/pickle |
| 13 | Code | Tính lại SHA-256 cho artifact và kiểm reload-parity |
| 14 | Markdown | Hướng dẫn inference với câu tự nhập |
| 15 | Code | Danh sách `USER_SENTENCES`, prediction và demo scores |
| 16 | Code | Final gate với tám điều kiện boolean |
| 17 | Markdown | Kết luận phạm vi demo và vị trí artifact |

### 2.2 Cách notebook tìm input

Hàm `find_required_file()` xử lý theo thứ tự:

1. tìm đúng relative path từ thư mục làm việc hiện tại và các thư mục cha;
2. nếu không thấy, quét `/kaggle/input` theo **tên file**;
3. chỉ chấp nhận khi tìm thấy đúng một file cho mỗi tên;
4. nếu tìm thấy 0 hoặc nhiều hơn 1, dừng bằng `FileNotFoundError`.

Vì vậy Private Dataset có thể chứa hai file ở thư mục gốc; không cần tái tạo cây `ai/kaggle` và `ai/fixtures`. Không được attach thêm dataset/notebook output có file trùng tên.

Khi chạy trên Kaggle, input được đọc từ `/kaggle/input/...` và artifact được ghi vào:

```text
/kaggle/working/hugo_vi_sentiment_m2_b2_demo
```

Notebook không phụ thuộc `C:\Users\...`; các đường dẫn Windows chỉ dùng để người dùng chọn file khi upload. Notebook không có code kết nối database, không yêu cầu token/secret và không tải dữ liệu qua mạng.

### 2.3 Dependency và mức tương thích

Dependency runtime:

- Python 3.10 trở lên;
- NumPy;
- scikit-learn;
- joblib;
- matplotlib;
- IPython/Jupyter có sẵn trong Kaggle Notebook.

Local run đã dùng:

| Thành phần | Version đã chạy thật local |
|---|---:|
| Python | 3.12.10 |
| NumPy | 2.5.4 |
| scikit-learn | 1.9.1 |
| joblib | 1.6.0 |
| matplotlib | 3.11.2 |
| nbformat | 5.11.1 |
| nbclient | 0.11.0 |

Kaggle dùng image thay đổi theo thời gian. Repository image CPU chính thức hiện có `scikit-learn` và `matplotlib`, nhưng điều đó không khóa exact version cho session tương lai. Vì Internet phải Off, không thêm cell `pip install` trong lần demo này. Cell 3 là dependency gate đầu tiên; exact versions của lần chạy được pipeline ghi vào `model_metadata.json`.

Nguồn tham chiếu chính thức:

- [Kaggle Notebooks documentation](https://www.kaggle.com/docs/notebooks)
- [Kaggle Datasets documentation](https://www.kaggle.com/docs/datasets)
- [Kaggle CPU/GPU Python image](https://github.com/Kaggle/docker-python)
- [Danh sách package của Kaggle image](https://github.com/Kaggle/docker-python/blob/main/kaggle_requirements.txt)

### 2.4 Kết quả chạy thật local ngày 2026-10-13

| Kiểm tra | Kết quả |
|---|---|
| Python compile | **PASS** |
| Pipeline CPU end-to-end | **PASS**, exit code 0 |
| Artifact được tạo | **PASS**, 9 file |
| Reload parity | **PASS** |
| Notebook JSON/17 cells | **PASS** |
| Notebook execution | **PASS**, 9/9 code cell chạy, 0 error output |
| Final gate | **PASS in LOCAL_CPU** |
| Confusion matrix watermark | **PASS**, kiểm tra trực quan |
| Kaggle execution | **NOT RUN** |
| Model quality | **BLOCKED / NOT EVALUATED** |

Không phát hiện lỗi thực tế cần sửa trong pipeline, fixture hoặc notebook. Không có thay đổi thuật toán/source code trong lần audit này.

## 3. Nguyên tắc làm việc với ChatGPT từng bước

Người dùng chỉ thực hiện **một bước** rồi dừng. Sau mỗi checkpoint, gửi ảnh màn hình cho ChatGPT và chờ ChatGPT xác nhận trước khi sang bước kế tiếp.

Không gửi cho ChatGPT hoặc bất kỳ ai:

- mật khẩu Kaggle;
- mã OTP;
- token/API key;
- cookie/session ID;
- ảnh có email hoặc thông tin cá nhân chưa che;
- `.env`, database dump hoặc dữ liệu người dùng.

Nếu tên hoặc vị trí nút khác tài liệu, không bấm thử nút có ý nghĩa `Publish`, `Make Public` hoặc `Share publicly`. Chụp ảnh màn hình đã che thông tin cá nhân và hỏi ChatGPT. Giao diện Kaggle có thể thay đổi; **tên chức năng quan trọng hơn vị trí nút**.

## 4. Hướng dẫn thao tác Kaggle

### Bước 1 — Mở Kaggle và đăng nhập

**Mục tiêu:** vào đúng tài khoản Kaggle của bạn mà không chia sẻ thông tin xác thực.

**Thao tác:**

1. Mở trình duyệt do bạn kiểm soát.
2. Nhập trực tiếp `https://www.kaggle.com/`.
3. Nếu góc trên trang có nút **Sign In**, nhấn **Sign In**.
4. Tự hoàn tất đăng nhập trong trình duyệt. Không gửi mật khẩu, OTP, token hoặc cookie cho ChatGPT.
5. Sau đăng nhập, kiểm tra có ảnh đại diện/avatar hoặc menu tài khoản ở góc trên trang.

**Kết quả mong đợi:** trang Kaggle hiển thị tài khoản đã đăng nhập và bạn có thể mở các mục **Datasets** và **Code**.

**Lỗi thường gặp:**

- Trang vẫn hiện **Sign In**: tải lại trang hoặc đăng nhập lại trong chính trình duyệt.
- Kaggle yêu cầu xác minh email/điện thoại: tự hoàn tất theo giao diện Kaggle; không gửi mã xác minh.
- Không thấy menu do cửa sổ hẹp: tìm menu ba gạch hoặc mở rộng cửa sổ; nếu vẫn không thấy, gửi ảnh.

**Checkpoint ảnh:** chụp phần đầu trang có logo Kaggle và avatar. Che username/email nếu muốn. Không chụp trang nhập mật khẩu. Gửi ChatGPT và hỏi: “Tôi đã đăng nhập Kaggle chưa? Chỉ xác nhận Bước 1.”

### Bước 2 — Tạo Kaggle Private Dataset chứa đúng hai file

**Mục tiêu:** tạo input riêng tư tên đề xuất `hugo-m2-b2-demo-input`.

**Thao tác:**

1. Từ thanh điều hướng Kaggle, chọn **Datasets**.
2. Nhấn **New Dataset**. Nếu giao diện dùng menu **Create**, chọn **Create → New Dataset** hoặc chức năng có đúng tên **New Dataset**.
3. Ở trường **Title**, nhập:

   ```text
   HuGo M2-B2 Demo Input
   ```

   Kaggle thường tự tạo URL slug gần với `hugo-m2-b2-demo-input`; slug khác một chút không ảnh hưởng vì notebook tìm theo filename.
4. Chọn upload từ máy tính, thường là **Upload**, **Select Files to Upload**, **Browse** hoặc vùng kéo-thả.
5. Chọn đúng hai file:

   ```text
   C:\Users\Danh\Downloads\DACN\travelgo\ai\kaggle\02_vietnamese_sentiment_tfidf_mvp.py
   C:\Users\Danh\Downloads\DACN\travelgo\ai\fixtures\vietnamese_sentiment_demo.jsonl
   ```

6. Không chọn notebook `.ipynb` ở bước này. Không upload nguyên thư mục `travelgo`.
7. Mở mục **Sharing**, **Visibility**, **Privacy** hoặc **Settings** trong form tạo dataset.
8. Xác nhận giá trị là **Private**. Kaggle thường mặc định Private, nhưng vẫn phải đọc lại trước khi tạo.
9. Nhấn **Create Dataset**. Không nhấn chức năng có nghĩa **Publish Publicly**.
10. Chờ Kaggle xử lý xong và mở trang dataset.

**Kết quả mong đợi:**

- dataset hiển thị trạng thái **Private**;
- danh sách file có đúng hai tên:
  - `02_vietnamese_sentiment_tfidf_mvp.py`;
  - `vietnamese_sentiment_demo.jsonl`;
- không có file thứ ba.

**Lỗi thường gặp:**

- Chọn nhầm `.ipynb`: bỏ file đó trước khi tạo, hoặc tạo version dataset mới chỉ có hai input file.
- Dataset thành Public: không tiếp tục; vào **Settings → Sharing** và đổi về **Private** nếu Kaggle cho phép, sau đó gửi ảnh kiểm tra.
- Upload cả folder: hủy và chọn riêng hai file; notebook vẫn tìm được file trong subfolder nhưng input tối giản giúp tránh lộ file không liên quan.
- File bị đổi tên, ví dụ thêm `(1)`: xóa bản sai và upload lại exact filename.
- Không thấy **New Dataset**: gửi ảnh toàn màn hình; nút có thể nằm trong menu **Create** ở phiên bản giao diện khác.

**Checkpoint ảnh:** chụp trang dataset sau khi tạo, trong cùng ảnh thấy badge/trạng thái **Private** và danh sách đúng hai filename. Gửi ChatGPT; chưa chuyển sang Notebook nếu ảnh chưa được xác nhận.

### Bước 3 — Tạo hoặc import Notebook `.ipynb`

**Mục tiêu:** mở notebook M2-B2 gốc trong Kaggle Code mà không chép tay 17 cell.

**Thao tác:**

1. Mở mục **Code** hoặc menu **Create**.
2. Chọn **New Notebook**.
3. Trong Notebook Editor, mở menu **File**.
4. Chọn chức năng **Import Notebook**, **Upload Notebook** hoặc tên tương đương có ý nghĩa nhập file `.ipynb`.
5. Chọn file:

   ```text
   C:\Users\Danh\Downloads\DACN\travelgo\ai\kaggle\02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb
   ```

6. Chờ notebook tải xong. Không dán code thủ công vào notebook trắng.
7. Kiểm tra tiêu đề cell đầu là:

   ```text
   HuGo Intelligence 2.0 — Vietnamese Sentiment TF-IDF MVP
   ```

8. Cuộn nhanh từ đầu đến cuối và xác nhận notebook có **17 cell**, kết thúc bằng phần “Hoàn tất demo kỹ thuật”. Nếu giao diện không hiển thị số cell, chỉ cần xác nhận các heading từ phần 1 đến phần 6 và kết luận cuối đều tồn tại.

**Kết quả mong đợi:** notebook được mở ở chế độ edit, có Markdown tiếng Việt đúng dấu, không có output cũ và không có đường dẫn Windows trong cell chạy.

**Lỗi thường gặp:**

- Không thấy **Import Notebook** trong **File**: không đoán nút; chụp toàn bộ menu **File** và gửi ChatGPT.
- Notebook mở ở chế độ viewer/read-only: tìm **Copy & Edit** hoặc tạo notebook mới rồi import; gửi ảnh trước khi bấm nếu không chắc.
- Tiếng Việt bị lỗi ký tự: dừng, không sửa tay; kiểm tra đã chọn đúng `.ipynb` có SHA-256 nêu ở mục 1.
- Notebook chỉ có một cell JSON dài: bạn đã upload notebook như text/data thay vì import `.ipynb`; quay lại Notebook Editor và dùng chức năng import.

**Checkpoint ảnh:** chụp đầu notebook có title, cảnh báo `DEMO_ONLY` và thanh công cụ editor. Gửi ChatGPT để xác nhận đúng notebook.

### Bước 4 — Add Input để gắn Private Dataset

**Mục tiêu:** cho notebook đọc hai file private qua `/kaggle/input`.

**Thao tác:**

1. Trong Notebook Editor, mở panel **Input** hoặc **Settings → Input** ở cạnh màn hình.
2. Nhấn **Add Input**.
3. Trong ô tìm kiếm, nhập `HuGo M2-B2 Demo Input` hoặc slug `hugo-m2-b2-demo-input`.
4. Chọn đúng dataset do tài khoản của bạn sở hữu và có nhãn **Private**.
5. Nhấn **Add**, dấu `+`, hoặc nút có ý nghĩa gắn input.
6. Chờ dataset xuất hiện trong danh sách input của notebook.
7. Đảm bảo không attach dataset nào khác có hai filename giống source HuGo.

**Kết quả mong đợi:** panel Input hiển thị một dataset `HuGo M2-B2 Demo Input`; khi mở cây file sẽ thấy đúng hai file.

**Lỗi thường gặp:**

- Không tìm thấy private dataset: kiểm tra notebook và dataset thuộc cùng tài khoản; tải lại trang rồi tìm lại.
- Dataset hiện nhưng không có file: chờ trạng thái xử lý dataset hoàn tất hoặc kiểm tra version vừa tạo.
- Có hai input cùng chứa file trùng tên: dùng **Remove Input** hoặc dấu `×` để detach bản thừa; giữ đúng một input.
- Kaggle hỏi chấp nhận license của dataset khác: bạn đã chọn nhầm dataset; hủy và tìm dataset của chính bạn.

**Checkpoint ảnh:** chụp panel **Input** đang mở và cây file có đúng hai filename. Không cần mở nội dung fixture. Gửi ChatGPT trước Bước 5.

### Bước 5 — Cấu hình CPU, Internet Off và Private

**Mục tiêu:** khóa môi trường đúng phạm vi M2-B2.

**Thao tác:**

1. Mở panel **Settings** hoặc **Session options**.
2. Ở **Accelerator**, chọn **None**. Không chọn GPU/TPU.
3. Ở **Internet**, chọn **Off** hoặc tắt công tắc.
4. Không thêm **Secrets**; notebook không cần secret, token hay database URL.
5. Mở **Share**, **Options → Sharing**, hoặc phần visibility của notebook.
6. Xác nhận notebook là **Private** và không bật public sharing. Notebook và Dataset có cài đặt riêng; phải kiểm tra cả hai.
7. Nếu việc đổi Accelerator làm Kaggle restart session, chờ session sẵn sàng rồi tiếp tục.

**Kết quả mong đợi:**

```text
Accelerator: None
Internet: Off
Notebook visibility: Private
Dataset visibility: Private
```

**Lỗi thường gặp:**

- Không có lựa chọn `None`: gửi ảnh menu Accelerator; không chọn GPU thay thế.
- Internet tự bật lại sau refresh: tắt lại và chụp ảnh xác nhận trước khi chạy.
- Chỉ thấy nút **Share**: mở nó nhưng không gửi invitation; tìm trạng thái private/visibility. Nếu giao diện không rõ, gửi ảnh.
- Notebook có collaborator ngoài ý muốn: không tiếp tục cho tới khi quyền truy cập được kiểm tra.

**Checkpoint ảnh:** chụp panel có **Accelerator = None** và **Internet = Off**. Chụp thêm trạng thái **Private** nếu không nằm cùng màn hình. Gửi ChatGPT và chờ xác nhận.

### Bước 6 — Kiểm tra đường dẫn và file đã gắn

**Mục tiêu:** chạy riêng Cell 3 như preflight trước khi chạy toàn bộ notebook.

**Thao tác:**

1. Tìm code cell ngay dưới heading **“1. Chuẩn bị Kaggle — CPU, Internet Off”**. Đây là Cell 3.
2. Nhấn nút tam giác **Run** bên trái cell, hoặc đặt con trỏ trong cell rồi nhấn `Shift+Enter`.
3. Không sửa `find_required_file()`, `PIPELINE_PATH`, `FIXTURE_PATH` hoặc `OUTPUT_DIR`.
4. Đọc output bên dưới cell.

**Kết quả mong đợi:** output tương tự:

```text
Execution environment: KAGGLE_CPU
Pipeline: /kaggle/input/<dataset-slug>/02_vietnamese_sentiment_tfidf_mvp.py
Fixture: /kaggle/input/<dataset-slug>/vietnamese_sentiment_demo.jsonl
Output: /kaggle/working/hugo_vi_sentiment_m2_b2_demo
{"data_mode": "DEMO_ONLY", "quality_claim_allowed": false, "production_eligible": false}
Minh họa pipeline — không phải đánh giá chất lượng mô hình
```

`<dataset-slug>` có thể khác tên đề xuất. Điều quan trọng là cả Pipeline và Fixture đều bắt đầu bằng `/kaggle/input/`, output bắt đầu bằng `/kaggle/working/`, và không có `C:\Users\...`.

**Lỗi thường gặp:**

- `Cần đúng 1 file ... tìm thấy 0`: dataset chưa được Add Input, filename sai hoặc version chưa xử lý xong.
- `... tìm thấy 2`: đang attach nhiều nguồn có filename trùng; detach nguồn thừa.
- `ModuleNotFoundError` cho `sklearn`, `joblib`, `matplotlib` hoặc `numpy`: chụp toàn bộ traceback và ghi **KAGGLE BLOCKED — DEPENDENCY**; không bật Internet hoặc tự cài package trong lần demo.
- Output là `LOCAL_CPU`: không chạy đúng Kaggle session; dừng và gửi ảnh.
- Output directory không phải `/kaggle/working/...`: không tiếp tục trước khi xác định nguyên nhân.

**Checkpoint ảnh:** chụp trọn Cell 3 và toàn bộ output có bốn đường/cờ quan trọng. Đây là checkpoint bắt buộc trước **Run All**.

### Bước 7 — Restart Session and Run All

**Mục tiêu:** chạy notebook từ trạng thái sạch, đúng thứ tự.

**Thao tác:**

1. Sau khi ChatGPT xác nhận preflight, mở menu **Run** hoặc **Session**.
2. Chọn **Restart Session and Run All** nếu có đúng chức năng này.
3. Nếu giao diện tách hai thao tác, chọn **Restart Session**, xác nhận restart, rồi chọn **Run All**.
4. Nếu có hộp xác nhận xóa biến/output session cũ, chấp nhận restart.
5. Chờ toàn bộ cell chạy xong. Không sửa cell khi session đang chạy.
6. Quan sát tiến trình: 9 code cell phải lần lượt có execution count và không có traceback màu đỏ.

**Kết quả mong đợi:** notebook chạy từ Cell 3 đến Cell 16 không dừng. Với fixture 45 câu, thời gian thường ngắn trên CPU, nhưng không lấy thời gian local làm cam kết cho Kaggle.

**Lỗi thường gặp:**

- Notebook dừng ở một cell: không bấm chạy các cell sau để bỏ qua; chụp cell lỗi và traceback.
- Session disconnect/timeout: reconnect, kiểm tra lại settings rồi thực hiện **Restart Session and Run All** từ đầu.
- Bấm nhầm **Run All** mà chưa restart: sau khi lần chạy kết thúc, vẫn phải chạy lại bằng clean restart để lấy bằng chứng tái lập.
- Kaggle yêu cầu bật Internet: không bật; code không cần Internet. Gửi ảnh lỗi.

**Checkpoint ảnh:** nếu có lỗi, chụp ngay cell đầu tiên lỗi cùng traceback. Nếu không lỗi, chụp phần cuối Cell 16 nhưng chưa cần Save Version; sau đó tiếp tục kiểm tra chi tiết Bước 8–9.

### Bước 8 — Đọc kết quả fixture, bốn thuật toán và confusion matrix

**Mục tiêu:** xác nhận notebook thực sự chạy cả bốn cấu hình và hiển thị đúng cảnh báo demo.

#### 8.1 Cell 5 — Fixture gate

Kết quả phải có:

- `rows_raw: 45`;
- `rows_clean: 45`;
- `rows_dropped_empty: 0`;
- `NEGATIVE: 15`, `NEUTRAL: 15`, `POSITIVE: 15`;
- `unicode_normalization: NFC`;
- ba dòng mẫu tiếng Việt hiển thị đúng dấu.

#### 8.2 Cell 6 — Phân bố nhãn/domain

Biểu đồ có ba cột bằng nhau, mỗi cột bằng 15. Output text phải có:

```text
Label distribution: {'NEGATIVE': 15, 'NEUTRAL': 15, 'POSITIVE': 15}
Domain distribution: {'hotel': 15, 'restaurant': 15, 'attraction': 15}
```

Biểu đồ phải có title `Phân bố nhãn — DEMO_ONLY` và disclaimer màu đỏ.

#### 8.3 Cell 8 — Chạy bốn baseline

Cell này gọi `pipeline.run_pipeline()` và phải kết thúc bằng:

```text
TECHNICAL PIPELINE RUN: PASS
Minh họa pipeline — không phải đánh giá chất lượng mô hình
```

Nó chạy đúng bốn cấu hình:

1. `majority_class`;
2. `word_tfidf_logistic_regression` — word TF-IDF (1,2);
3. `char_tfidf_logistic_regression` — `char_wb` TF-IDF (3,5);
4. `combined_word_char_tfidf_logistic_regression`.

#### 8.4 Cell 9 — Metric kỹ thuật

Phải có bốn dòng model với cột `Accuracy` và `Macro-F1`, cùng tiêu đề:

```text
Metric kỹ thuật — không phải kết quả chất lượng AI
```

Local run tham chiếu từng cho kết quả Majority `0.3333/0.1667`, Word `0.4000/0.3485`, Character `0.4667/0.4470`, Combined `0.4000/0.3892`. Các số này **không phải điều kiện PASS**, không phải benchmark và có thể khác nếu dependency/image thay đổi. Điều kiện kỹ thuật là đủ bốn dòng, không có lỗi, `evaluation_tier=DEMO_HOLDOUT`, và governance vẫn là demo.

#### 8.5 Cell 11 — Confusion matrix

Ảnh phải có:

- title `DEMO_ONLY — Combined TF-IDF + Logistic Regression`;
- ba nhãn `NEGATIVE`, `NEUTRAL`, `POSITIVE` ở cả hai trục;
- tổng mỗi hàng là 5 câu demo holdout;
- watermark đỏ `Minh họa pipeline — không phải đánh giá chất lượng mô hình`.

**Lỗi thường gặp:**

- 44/46 rows hoặc phân bố khác 15/15/15: fixture không đúng version; kiểm tra lại file/hash.
- Thiếu một model: Cell 8 chưa chạy hết hoặc đã lỗi; không tự xóa model khỏi bảng.
- Metric thấp hoặc prediction sai: không phải lỗi pipeline; không chỉnh fixture/label để làm đẹp số.
- Hình không hiện nhưng file PNG tồn tại: gửi ảnh output Cell 11 và panel Files; không tuyên bố confusion-matrix PASS cho tới khi quan sát được watermark.

**Checkpoint ảnh:** gửi ba ảnh hoặc một ảnh dài gồm Cell 6, bảng bốn model ở Cell 9 và confusion matrix ở Cell 11. Yêu cầu ChatGPT chỉ kiểm tra cấu trúc/cảnh báo demo, không đánh giá chất lượng từ metric.

### Bước 9 — Kiểm tra SHA-256, reload-parity và final PASS

**Mục tiêu:** xác nhận artifact của chính run hiện tại còn nguyên vẹn và model sau reload dự đoán giống trước khi lưu.

#### 9.1 Cell 13

Cell 13 đọc `artifact_checksums.json`, tính lại SHA-256 cho từng artifact và phải in `PASS` ở mọi dòng, sau đó:

```text
CHECKSUM VERIFICATION: PASS
RELOAD PARITY: PASS
Minh họa pipeline — không phải đánh giá chất lượng mô hình
```

`reload_parity.json` phải có:

```text
status=PASS
predicted_labels_equal=true
predicted_probabilities_equal=true
```

#### 9.2 Cell 16 — Final gate

Tám giá trị dưới đây phải đều là `true`:

```text
fixture_has_45_rows
three_balanced_labels
all_artifacts_exist
all_checksums_match
reload_parity_pass
demo_only
quality_claim_disabled
production_disabled
```

Ngay sau đó phải có:

```text
M2-B2 TECHNICAL DEMO: PASS in KAGGLE_CPU
KAGGLE EXECUTION: RUN BY USER
Minh họa pipeline — không phải đánh giá chất lượng mô hình
```

Nếu dòng là `PASS in LOCAL_CPU` hoặc `KAGGLE NOT RUN`, đó không phải bằng chứng Kaggle.

#### 9.3 Artifact và dependency metadata

Mở panel **Output** hoặc **Files** và tìm:

```text
/kaggle/working/hugo_vi_sentiment_m2_b2_demo
```

Thư mục phải có 9 file:

1. `artifact_checksums.json`;
2. `combined_classifier_demo_only.joblib`;
3. `combined_pipeline_demo_only.joblib`;
4. `combined_vectorizer_demo_only.joblib`;
5. `confusion_matrix_demo_only.json`;
6. `confusion_matrix_demo_only.png`;
7. `metrics_demo_only.json`;
8. `model_metadata.json`;
9. `reload_parity.json`.

Mở/preview `model_metadata.json` nếu giao diện cho phép và ghi lại object `dependencies`. Đây là exact version của run Kaggle, không lấy version local thay thế.

**Lỗi thường gặp:**

- Một dòng checksum `FAIL`: không load hoặc dùng artifact; restart session và Run All từ đầu. Nếu vẫn FAIL, gửi output Cell 13.
- Reload parity `FAIL`: dừng; artifact không đủ điều kiện demo inference.
- Thiếu file: không tạo tay; xem Cell 8 có chạy thành công hay không.
- Chỉ bảy trong tám final checks true: gửi nguyên JSON của Cell 16; không tuyên bố PASS.
- Final cell ghi `KAGGLE_CPU` nhưng Cell 13 chưa PASS: vẫn là FAIL.

**Checkpoint ảnh:** chụp Cell 13, Cell 16 và danh sách 9 output file. Nếu có thể, chụp thêm phần `dependencies` trong `model_metadata.json`. Đây là bộ bằng chứng kỹ thuật chính trước inference cá nhân.

### Bước 10 — Nhập ba câu tiếng Việt của bạn để thử inference

**Mục tiêu:** thử giao diện dự đoán bằng ba câu do chính bạn viết, không dùng dữ liệu cá nhân hoặc review sao chép.

**Thao tác:**

1. Tìm heading **“6. Inference thử với câu do bạn tự nhập”** và Cell 15 ngay bên dưới.
2. Chỉ sửa nội dung ba chuỗi trong `USER_SENTENCES`. Giữ nguyên dấu ngoặc vuông, dấu phẩy và dấu ngoặc kép.
3. Ví dụ cấu trúc:

   ```python
   USER_SENTENCES = [
       "Câu tiếng Việt thứ nhất do tôi tự viết.",
       "Câu tiếng Việt thứ hai do tôi tự viết.",
       "Câu tiếng Việt thứ ba do tôi tự viết.",
   ]
   ```

4. Không nhập tên người, email, số điện thoại, URL, mã booking/order/account hoặc nội dung của người khác.
5. Chạy lại **chỉ Cell 15** bằng nút **Run** của cell hoặc `Shift+Enter`. Không cần train lại Cell 8 nếu session chưa restart và artifact vẫn tồn tại.

**Kết quả mong đợi:** mỗi câu tạo một dictionary có:

```text
text
demo_prediction
demo_scores
```

`demo_prediction` là một trong `NEGATIVE`, `NEUTRAL`, `POSITIVE`. `demo_scores` chỉ là output kỹ thuật của model demo, không được gọi là confidence đã hiệu chuẩn. Prediction sai là bình thường vì model chỉ fit trên 30 câu demo trong train split.

**Lỗi thường gặp:**

- `SyntaxError`: kiểm tra dấu ngoặc kép, dấu phẩy và ngoặc vuông.
- `Hãy nhập ít nhất một câu không rỗng`: cả ba chuỗi đang rỗng/whitespace.
- `FileNotFoundError` cho joblib: session đã restart sau Run All; chạy lại toàn bộ notebook trước inference.
- Kết quả không hợp lý: không sửa label hoặc câu fixture; ghi nhận đây là giới hạn `DEMO_ONLY`.

**Checkpoint ảnh:** chụp Cell 15 gồm ba câu và ba output. Che nội dung nếu vô tình có PII. Gửi ChatGPT để xác nhận cell chạy kỹ thuật, không yêu cầu ChatGPT đánh giá model tốt/xấu từ ba câu.

### Bước 11 — Save Version, tải artifact và giữ Private

**Mục tiêu:** lưu một Kaggle version tái lập từ clean state, tải artifact để lưu trữ riêng và không publish.

**Thao tác Save Version:**

1. Kiểm tra lại notebook vẫn **Private**, Dataset vẫn **Private**, Accelerator `None`, Internet `Off`.
2. Nhấn **Save Version**.
3. Nếu có hai lựa chọn **Quick Save** và **Save & Run All**, chọn **Save & Run All** cho version bằng chứng. Quick Save không thay thế clean top-to-bottom execution.
4. Nhập version note, ví dụ:

   ```text
   HuGo M2-B2 DEMO_ONLY CPU reproducibility run
   ```

5. Không chọn tùy chọn `Publish`, `Make Public` hoặc thay đổi visibility.
6. Xác nhận save và chờ run hoàn tất. `Save & Run All` dùng một session sạch nên cần kiểm tra lại log/final output của saved version.
7. Mở saved version và xác nhận Cell 16 vẫn in `PASS in KAGGLE_CPU` cùng tám giá trị `true`.

**Thao tác tải artifact:**

1. Mở tab/panel **Output** của saved version.
2. Tìm folder `hugo_vi_sentiment_m2_b2_demo`.
3. Dùng **Download**, menu ba chấm của folder/file, hoặc **Download All** nếu giao diện cung cấp.
4. Lưu vào một thư mục local riêng có tên gợi ý `hugo_m2_b2_kaggle_demo_artifacts`.
5. Mở `artifact_checksums.json` từ cùng run và đối chiếu SHA-256 của các artifact đã tải. Không so sánh joblib Kaggle với hash joblib local cũ vì dependency/platform có thể làm binary khác.
6. Chỉ load `.joblib` do chính run này tạo sau khi hash khớp. Joblib/pickle có thể thực thi code nếu đến từ nguồn không tin cậy.
7. Không tạo Public Dataset từ output và không activate model cho website.

Ví dụ kiểm hash trên PowerShell sau khi giải nén file tải về:

```powershell
Get-FileHash -Algorithm SHA256 '.\combined_pipeline_demo_only.joblib'
Get-FileHash -Algorithm SHA256 '.\model_metadata.json'
Get-FileHash -Algorithm SHA256 '.\reload_parity.json'
```

So sánh từng giá trị với field tương ứng trong `artifact_checksums.json` của **chính Kaggle run đó**.

**Lỗi thường gặp:**

- Saved version thất bại dù interactive run PASS: mở log của saved version; đây mới là clean-run evidence, không bỏ qua lỗi.
- Output không xuất hiện: kiểm tra run đã hoàn tất và file được ghi dưới `/kaggle/working`, không phải `/kaggle/input`.
- Chỉ thấy **Quick Save**: chụp menu Save Version và gửi ChatGPT; không đoán chức năng khác.
- Giao diện hỏi có publish không: chọn hủy/giữ private; gửi ảnh trước khi xác nhận nếu không rõ.
- Hash local sau tải không khớp: tải lại đúng file từ cùng saved version; không sử dụng artifact cho tới khi khớp.

**Checkpoint ảnh:** chụp trạng thái saved version hoàn tất, badge **Private**, final Cell 16 PASS và danh sách output. Đây là checkpoint cuối; không cần gửi file model cho ChatGPT.

## 5. Điều kiện đánh dấu PASS và điều không được kết luận

### 5.1 `KAGGLE TECHNICAL DEMO PASS` chỉ khi

- chính người dùng quan sát run trong Kaggle;
- notebook và dataset đều Private;
- Accelerator `None`, Internet `Off`;
- Cell 3 in `Execution environment: KAGGLE_CPU`;
- đúng 45 rows, 15 rows/lớp và 15 rows/domain;
- đủ bốn model config chạy không lỗi;
- confusion matrix hiển thị `DEMO_ONLY` và disclaimer;
- mọi SHA-256 trong manifest khớp;
- reload parity PASS cho label và probability;
- 9 artifact tồn tại;
- tám final checks đều `true`;
- final output ghi `PASS in KAGGLE_CPU` và `KAGGLE EXECUTION: RUN BY USER`;
- saved version **Save & Run All** hoàn tất nếu cần bằng chứng tái lập lâu dài.

### 5.2 PASS này không có nghĩa

- model có chất lượng thực tế;
- metric demo có thể đưa vào abstract/kết luận như benchmark;
- M2 data gate đã được mở;
- fixture là review người dùng;
- model được phép production/ACTIVE;
- được phép upload dữ liệu HuGo/database lên Kaggle;
- được phép publish Notebook, Dataset hoặc artifact.

## 6. Bảng xử lý sự cố nhanh

| Dấu hiệu | Trạng thái | Hành động |
|---|---|---|
| Không thấy đúng hai file trong Input | BLOCKED | quay lại Bước 2/4, không Run All |
| Cell 3 tìm thấy 0 file | BLOCKED | attach dataset/kiểm filename |
| Cell 3 tìm thấy hơn 1 file | BLOCKED | detach input trùng |
| Thiếu Python dependency | BLOCKED | gửi traceback; không bật Internet/pip tùy tiện |
| `Execution environment: LOCAL_CPU` | FAIL cho Kaggle | kiểm tra đang chạy trên Kaggle thật |
| Fixture khác 45 hoặc không cân bằng | FAIL | attach lại exact fixture |
| Một model lỗi | FAIL | gửi Cell 8 traceback |
| Checksum FAIL | FAIL | restart + Run All; không load artifact |
| Reload parity FAIL | FAIL | không inference/không dùng artifact |
| Watermark không hiển thị | FAIL phần visualization | gửi ảnh Cell 11 |
| Metric thấp | Không phải lỗi kỹ thuật | giữ nguyên, không làm đẹp dữ liệu |
| Final gate đủ tám `true` ở LOCAL_CPU | chỉ local PASS | vẫn là `KAGGLE NOT RUN` |
| Final gate đủ tám `true` ở KAGGLE_CPU | technical PASS candidate | còn kiểm private và saved version |
| Dataset/Notebook Public | Vi phạm phạm vi | chuyển về Private trước khi tiếp tục |

## 7. Checklist bàn giao cho ChatGPT

### Ba file

- [ ] `02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb`
- [ ] `02_vietnamese_sentiment_tfidf_mvp.py`
- [ ] `vietnamese_sentiment_demo.jsonl`

### Đường dẫn Windows

- [ ] `C:\Users\Danh\Downloads\DACN\travelgo\ai\kaggle\02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb`
- [ ] `C:\Users\Danh\Downloads\DACN\travelgo\ai\kaggle\02_vietnamese_sentiment_tfidf_mvp.py`
- [ ] `C:\Users\Danh\Downloads\DACN\travelgo\ai\fixtures\vietnamese_sentiment_demo.jsonl`

### Quyền riêng tư/cấu hình

- [ ] Kaggle Dataset: **Private**, đúng hai input file
- [ ] Kaggle Notebook: **Private**
- [ ] Accelerator: **None**
- [ ] Internet: **Off**
- [ ] Không secret/token/database

### PASS dự kiến

- [ ] Cell 3: `KAGGLE_CPU`, hai path `/kaggle/input`, output `/kaggle/working`
- [ ] 45 rows; 15/lớp; 15/domain
- [ ] Four baselines chạy
- [ ] Confusion matrix có watermark
- [ ] 9 artifact tồn tại
- [ ] `CHECKSUM VERIFICATION: PASS`
- [ ] `RELOAD PARITY: PASS`
- [ ] Tám final checks đều `true`
- [ ] `M2-B2 TECHNICAL DEMO: PASS in KAGGLE_CPU`
- [ ] `KAGGLE EXECUTION: RUN BY USER`
- [ ] Saved version vẫn Private và Save & Run All thành công

### Còn NOT RUN/BLOCKED trước khi người dùng thao tác

- [ ] Kaggle execution: **NOT RUN**
- [ ] Kaggle exact dependency versions: **chưa ghi nhận**, phải đọc từ `model_metadata.json` của run thật
- [ ] Kaggle Save & Run All version: **NOT RUN**
- [ ] Kaggle artifact download/hash verification trên Windows: **NOT RUN**
- [ ] Model quality: **BLOCKED / NOT EVALUATED**
- [ ] DEVELOPMENT dataset: **BLOCKED**
- [ ] INDEPENDENT_TEST dataset: **BLOCKED**
- [ ] Production activation: **không được phép**

### Bước đầu tiên ChatGPT phải hướng dẫn

ChatGPT chỉ hướng dẫn **Bước 1 — mở Kaggle và xác nhận đăng nhập**, rồi dừng chờ ảnh. Không hướng dẫn tạo Dataset trong cùng lượt đầu tiên.

## THÔNG TIN GỬI CHATGPT

Bạn đang hướng dẫn một người mới chạy HuGo M2-B2 trên Kaggle. Hãy làm **mỗi lần đúng một bước**, yêu cầu ảnh checkpoint và chỉ chuyển bước sau khi đã kiểm tra ảnh. Không yêu cầu hoặc thu thập mật khẩu, OTP, token, cookie hay secret.

Thông tin kỹ thuật đã xác minh:

- Notebook có 17 cell: 8 Markdown, 9 code.
- Local CPU đã chạy đủ 9/9 code cell, 0 error, final gate PASS.
- Kaggle chưa chạy: luôn giữ trạng thái `KAGGLE NOT RUN` cho tới khi người dùng gửi bằng chứng run thật.
- Notebook import trực tiếp pipeline M2-B1 và tìm đúng một file mỗi tên trong `/kaggle/input`.
- Dataset private chỉ chứa `.py` và `.jsonl`; notebook `.ipynb` import riêng vào Kaggle Code.
- Output Kaggle phải ở `/kaggle/working/hugo_vi_sentiment_m2_b2_demo`.
- Không có database, Internet download, token hoặc secret.
- Mọi output phải giữ `DEMO_ONLY`, `quality_claim_allowed=false`, `production_eligible=false`.
- Metric demo không phải chất lượng mô hình.
- Không publish Notebook/Dataset/model, không activate production.

Ba file và đường dẫn:

```text
Notebook:
C:\Users\Danh\Downloads\DACN\travelgo\ai\kaggle\02_vietnamese_sentiment_tfidf_mvp_kaggle.ipynb

Private Dataset input 1:
C:\Users\Danh\Downloads\DACN\travelgo\ai\kaggle\02_vietnamese_sentiment_tfidf_mvp.py

Private Dataset input 2:
C:\Users\Danh\Downloads\DACN\travelgo\ai\fixtures\vietnamese_sentiment_demo.jsonl
```

Thứ tự bắt buộc: đăng nhập → tạo Private Dataset → import Notebook → Add Input → cấu hình None/Off/Private → chạy Cell 3 preflight → Restart Session and Run All → kiểm fixture/models/chart → checksum/parity/final gate → inference ba câu → Save & Run All/Download artifact.

Nếu giao diện Kaggle khác mô tả, yêu cầu người dùng gửi ảnh màn hình; không đoán vị trí nút và không hướng họ bấm `Publish`, `Make Public` hoặc bật Internet.

Tin nhắn đầu tiên ChatGPT cần gửi chính xác theo ý nghĩa sau:

> **Bước 1:** Hãy mở `https://www.kaggle.com/` trong trình duyệt của bạn và tự đăng nhập. Không gửi cho tôi mật khẩu, OTP, token hoặc cookie. Khi đã thấy avatar/menu tài khoản và các mục Datasets/Code, hãy gửi ảnh phần đầu trang đã che email nếu cần. Tôi sẽ chỉ xác nhận Bước 1 rồi mới hướng dẫn Bước 2.
