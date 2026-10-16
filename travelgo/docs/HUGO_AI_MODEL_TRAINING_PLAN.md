# HuGo AI — Model Training Plan trên Kaggle

> Mục tiêu của kế hoạch này là tạo chuỗi thí nghiệm có thể tái lập, không phải tải một notebook có sẵn rồi gọi đó là AI của HuGo.

## 1. Trạng thái xuất phát

Notebook 00 đã chạy thành công với bộ Restaurant Reviews tiếng Anh:

| Thuộc tính | Kết quả đã đo |
|---|---:|
| Raw rows | 10.000 |
| Clean rows | 9.703 |
| Train / test | 7.762 / 1.941 |
| Model | word + character TF-IDF, Logistic Regression |
| Macro-F1 | 0,7572586 |
| Artifact | `review_sentiment_en_v1.joblib` |
| Inference smoke test | 2/3 câu phù hợp; câu neutral mơ hồ bị dự đoán negative |

Kết quả này là **PASS cho research baseline tiếng Anh** và **không phải** Vietnamese model, aspect model, recommender production hay bằng chứng hiệu quả với HuGo data.

## 2. Cấu trúc workspace chuẩn

Trong repo:

```text
ai/
  kaggle/                 # source notebook dạng .py có các cell # %%
  configs/                # label map/feature config, không chứa secret
  model_cards/            # model card sau mỗi model đủ điều kiện
  artifacts/              # chỉ artifact được tải về và kiểm checksum
  evaluation/             # test set manifest/kết quả, không chứa PII
```

Trong Kaggle mỗi notebook dùng:

```text
/kaggle/input/...         # read-only datasets
/kaggle/working/hugo_<notebook>_<version>/
  manifest.json
  metrics.json
  predictions.parquet
  model.*
  model_card.md
  checksums.sha256
```

Không hard-code input path duy nhất; luôn liệt kê file, kiểm schema, chọn đúng bằng required columns và fail nếu có nhiều file mơ hồ.

## 3. Bộ notebook 00–09

### 00 — English Restaurant Review Baseline — PASS

- Mục tiêu: kiểm tra end-to-end cleaning → split → train → evaluate → export/reload.
- Dataset: Kaggle 10,000 Restaurant Reviews; phải lưu URL, owner và bằng chứng license tại ngày tải.
- Cleaning: ép rating numeric, bỏ `Like`/null/duplicate, normalize whitespace; không xóa negation.
- Label: 1–2 negative, 3 neutral, 4–5 positive; ghi rõ label được suy ra từ stars.
- Split: stratified fixed seed; bản tiếp theo cần group/time split nếu cùng reviewer/entity gây leakage.
- Metrics: Macro-F1, per-class P/R/F1, confusion matrix; majority accuracy chỉ là phụ.
- Artifact: pipeline vectorizer + classifier trong một joblib, metrics, manifest.
- Gate: pipeline reload và inference PASS; Macro-F1 được báo đúng, không có claim production.

### 01 — HuGo Data Quality

- Mục tiêu: đánh giá export HuGo trước mọi training.
- Input: output từ `npm run ai:export` đã pseudonymize; tuyệt đối không upload `.env`, database dump hay credentials.
- Kiểm tra: schema/version, row count, null, duplicate, referential integrity, timestamp range, class distribution, text language, PII pattern, test/seed flags, outlier price/coordinate.
- Output: HTML/JSON data-quality report, dataset card, row-rejection reasons; không tạo model.
- PASS: provenance/license/privacy checklist PASS, split candidate không leakage, các field bắt buộc đạt threshold đã công bố.
- Hiện trạng: script tồn tại nhưng snapshot data không đủ ML; notebook phải kết luận BLOCKED thay vì tạo score giả.

### 02 — Vietnamese Sentiment Baseline

- Mục tiêu: baseline mạnh nhưng rẻ bằng word/character TF-IDF + Logistic Regression hoặc Linear SVM calibrated.
- Dataset ưu tiên: VLSP hotel/restaurant nếu điều kiện cho phép; có thể thử [Vietnamese-SA](https://huggingface.co/datasets/h-i-e-u/vietnamese-SA-dataset) sau khi audit revision/license/source.
- Không trộn train/test từ cùng review duplicate hoặc cùng nguồn gần trùng.
- Cleaning: Unicode NFC, whitespace, giữ emoji/negation/intensity, mask URL/phone/order ID; không dịch máy để tạo test set.
- Feature: word n-gram 1–2 + char n-gram 3–5; class weight được tuning chỉ trên validation.
- Split: train/validation/test theo source/domain; thêm `HuGo-travel-domain-test` do người gán nhãn độc lập.
- Metrics: Macro-F1 chính; per-class F1, confusion matrix, calibration/ECE nếu trả confidence.
- Artifact: `vi_sentiment_tfidf_v1.joblib`, label map, metrics, model card, checksum.
- PASS đề xuất: Macro-F1 ≥0,75 trên test cùng nguồn **và** ≥0,70 trên travel-domain test; mỗi class recall ≥0,60. Nếu không đạt, vẫn lưu kết quả thí nghiệm nhưng model không ACTIVE.

### 03 — Vietnamese Aspect-Based Sentiment

- Mục tiêu: trích aspect và sentiment theo domain hotel/restaurant/tourist place.
- Dataset: ưu tiên [VLSP 2018 VABSA](https://vlsp.org.vn/node/82); CausaSent chỉ làm benchmark phụ vì lệch domain.
- Taxonomy P0:
  - hotel: cleanliness, staff, location, amenities, comfort, value;
  - restaurant: food, price, service, hygiene, ambience, waiting_time;
  - attraction: scenery, accessibility, cost, safety, crowding, experience.
- Baseline: keyword/rule + one-vs-rest TF-IDF. Model sau: multi-label encoder/classifier hoặc PhoBERT khi đủ data.
- Split: theo entity/reviewer/source để tránh memorization; test từng domain.
- Metrics: micro/macro Aspect-F1; sentiment Macro-F1 trên aspect đúng; exact-match chỉ báo thêm.
- Output: aspect taxonomy/version, model(s), error analysis ≥100 mẫu lỗi.
- PASS: Macro Aspect-F1 ≥0,70 và không aspect báo riêng nếu test support <100; model card ghi domain không hỗ trợ.

### 04 — Bayesian & Quality Analysis

- Mục tiêu: tách chất lượng dịch vụ và độ tin cậy dữ liệu.
- Input: review hợp lệ, star distribution, timestamps, verified booking, completed booking; nếu không có thì chạy trên benchmark/synthetic chỉ để unit-test công thức và gắn nhãn rõ.
- Baselines: average rating, Bayesian average hiện tại `(vR + mC)/(v+m)`, Wilson/credible interval, recency variants.
- Không “train” Bayesian bằng label tự tạo; lựa chọn `m`, prior và half-life phải qua sensitivity analysis.
- Metrics: stability under small samples, rank correlation, calibration với outcome độc lập nếu có, bootstrap confidence interval.
- Artifact: versioned quality config JSON + analysis report, không nhất thiết có model binary.
- PASS: small-n không thống trị, missing components không được impute như fact, explanation khớp score breakdown.

### 05 — Hybrid Recommendation

- Mục tiêu: baseline explainable cho cold-start trước LTR.
- Candidate: APPROVED/ACTIVE + availability + city/category; feature quality, preference similarity, budget fit, route distance/time, amenities.
- Baseline ladder: average → Bayesian → content-based → weighted hybrid → diversity re-rank.
- Dataset: catalog + explicit scenario/test judgments; event test/seed bị loại khỏi offline claims.
- Evaluation: NDCG@5/10, Recall@10, Precision@5, coverage, intra-list diversity, cold-start, budget/eligibility satisfaction.
- Split: time/user split khi có hành vi; hiện tại dùng bộ scenario được khóa và human judgments, ghi rõ đây không phải online CTR.
- Artifact: feature schema, scaler/encoder nếu có, weight config, golden scenarios.
- PASS P0: APPROVED/budget/hard constraints = 100%; không NaN; explanation contribution cộng đúng score; outperform Bayesian trên NDCG theo protocol được khóa hoặc báo không vượt.

### 06 — Learning to Rank — BLOCKED đến khi đủ dữ liệu

- Model: LightGBM LambdaRank; group = recommendation request/session.
- Label preference: BOOKING_COMPLETED > BOOKING_CONFIRMED > SAVE > long/detail engagement > CLICK; weight phải pre-register, không tuning trên test.
- Negative: exposed-not-engaged trong attribution window; không lấy unseen item.
- Bias: feature rank không được vô tình leak policy; đánh giá position propensity/IPW hoặc randomized bucket nhỏ có guardrails.
- Split: chronological, group-safe; user cold-start holdout riêng.
- Metrics: NDCG@5/10, Recall@10, coverage/diversity, constraints; bootstrap CI theo request.
- Gate dữ liệu dự án: ≥10.000 valid impressions, ≥500 consented sessions/users, ≥4 tuần và đủ positive outcome.
- Promotion: chỉ SHADOW nếu vượt hybrid với CI và không giảm constraint/coverage; ACTIVE cần online experiment hợp lệ.

### 07 — Popularity & Demand Forecasting — BLOCKED

- Mục tiêu: dự báo completed demand theo item/city/time, không dự báo “lượt khách” từ clicks.
- Baseline: last-value và seasonal naive; model candidate LightGBM time features hoặc classical time-series.
- Input: completed/cancelled bookings, capacity, price, holiday/weather nếu có license và point-in-time correctness.
- Split: rolling-origin backtest; không random split.
- Metrics: MAE/WAPE/MASE, prediction interval coverage; tránh MAPE khi actual=0.
- Gate: ≥12 tháng weekly history, grain ổn định, data completeness và baseline reproducible.
- Artifact: forecast model, data cutoff, backtest folds, uncertainty config.

### 08 — Evaluation & Explainability

- Mục tiêu: tổng hợp model cards, slice/fairness, calibration, explanation faithfulness và latency.
- Test slices: domain, city, new item/user, price band, text length, Vietnamese dấu/không dấu, negation, code-switch.
- Weighted model: giải thích bằng contribution thực. LightGBM: SHAP là attribution của model, không phải quan hệ nhân quả.
- LLM summary: factuality test đối chiếu structured evidence; fail nếu bịa số/giá/aspect.
- Output: evaluation report và go/no-go table; không sửa model trên test set khóa.

### 09 — Model Export & Inference Validation

- Mục tiêu: chứng minh artifact tải từ Kaggle chạy giống notebook và tương thích backend/FastAPI.
- Kiểm: dependency lock, checksum, load trong clean environment, schema/error contract, batch/single parity, deterministic tolerance, malicious/empty/long input, latency/RAM.
- Model registry record: version, type, status DRAFT, checksum, dataset version, metrics, feature config.
- Không kích hoạt thẳng. Chạy local → integration → shadow → manual promote.
- PASS: checksum/dependency/security scan PASS; prediction parity; rollback test; no network/secret dependency ngoài khai báo.

## 4. PhoBERT: chọn model đúng và hiểu license

- [PhoBERT base](https://huggingface.co/vinai/phobert-base) hiện có model card ghi MIT.
- [PhoBERT base v2](https://huggingface.co/vinai/phobert-base-v2) hiện có model card ghi AGPL-3.0; phải được duyệt license trước khi tích hợp một sản phẩm đóng/kinh doanh.
- PhoBERT mong đợi câu đã word-segment; tài liệu VinAI nêu yêu cầu input được phân đoạn từ trước ([PhoBERT repository](https://github.com/VinAIResearch/PhoBERT)). Pipeline phải pin tokenizer/word segmenter và test nhất quán train/inference.
- Notebook Kaggle có sẵn chỉ dùng làm tài liệu tham khảo. Có thể fork notebook `vietnamese-sentiment-classification-phobert-v2`, nhưng phải thay data loader, split, label map, metrics, seed và license review; license notebook không thay thế license model/dataset.

Khuyến nghị: hoàn thành notebook 02 TF-IDF trước. Chỉ chạy PhoBERT sau khi test set và baseline đã khóa, để E1 có so sánh công bằng.

## 5. Hướng dẫn thao tác Kaggle cho người mới

### 5.1 Chuẩn bị trên máy

1. Mở File Explorer tại `C:\Users\Danh\Downloads\DACN\travelgo\ai\kaggle`.
2. Không upload cả repo, `.env`, database dump hoặc thư mục có token.
3. Nếu dùng HuGo export, mở file manifest và kiểm không có email/phone/name/raw GPS trước khi upload.
4. Nén riêng dataset an toàn nếu nhiều file; đặt tên kèm version, ví dụ `hugo-ai-export-2026-10-12-v1.zip`.

### 5.2 Tạo notebook mới

1. Mở `https://www.kaggle.com/code` và đăng nhập.
2. Chọn **New Notebook**.
3. Bên phải chọn **Add Input**.
4. Với dataset công khai: tìm đúng tên/owner, mở trang dataset, kiểm mô tả và license, rồi **Add**.
5. Với HuGo export: chọn **Upload → New Dataset**, đặt **Private**, upload chỉ file đã kiểm tra.
6. Trong **Settings → Accelerator**, notebook TF-IDF chọn **None/CPU**; PhoBERT mới chọn **GPU** nếu quota còn.
7. Internet để **Off** nếu dependency đã có. Nếu cần tải model/package, bật tạm, pin version và ghi vào manifest; không truyền secret trong cell.

### 5.3 Dán source đúng cách

File `.py` có marker `# %%` không nên dán cả file vào một cell nếu phần đầu có chữ mô tả không được comment. Có hai cách:

- dễ nhất: mở file trên máy, copy từng khối bắt đầu bằng `# %%` vào **một Code cell riêng**, theo thứ tự;
- hoặc **File → Import Notebook** nếu đã có `.ipynb`.

Mọi dòng mô tả phải bắt đầu bằng `#` hoặc đặt trong Markdown cell. Lỗi trước đây `NameError: name 'A' is not defined` xảy ra vì dòng mô tả `A ...` bị dán vào Code cell mà không có `#`.

### 5.4 Chạy và kiểm tra

1. Chọn **Run All**.
2. Đọc từ cell đầu; không chỉ nhìn cell cuối xanh.
3. Xác nhận input file/schema, rows removed, class distribution và split counts.
4. Xác nhận metrics JSON, confusion matrix, artifact tồn tại và reload inference PASS.
5. Nếu kernel restart, chạy lại **Run All** từ đầu. Không dựa vào biến còn sót từ session cũ.
6. Nếu output ghi BLOCKED do data/license thì dừng đúng chỗ; không sửa gate chỉ để có PASS.

### 5.5 Save Version và tải artifact

1. Nhấn **Save Version** góc phải.
2. Chọn **Save & Run All (Commit)** để Kaggle chạy sạch từ đầu.
3. Ghi version notes: dataset revision, code commit/hash, mục tiêu, metric chính.
4. Đợi trạng thái complete; mở tab **Output**.
5. Tải cả thư mục output hoặc từng file `model`, `metrics`, `manifest`, `model_card`, `checksums`.
6. Trên máy local, đặt vào thư mục versioned; kiểm SHA-256 trước integration.

Không dùng nút “Save” của draft như bằng chứng reproducibility; bằng chứng là một committed version chạy `Run All` thành công.

## 6. Reproducibility bắt buộc

Mỗi notebook ghi:

- Python/package versions, hardware, random seeds;
- source URL, dataset revision/hash/license snapshot;
- exact feature/label config và split IDs/hash;
- data cutoff và timezone;
- metric code/version;
- artifact checksum;
- limitations, unsupported domain/language;
- source commit hoặc hash file notebook.

Không pickle/joblib-load artifact không tin cậy vì có thể thực thi code. Chỉ load artifact do pipeline HuGo tạo, checksum khớp và nằm trong registry allowlist.

## 7. Tích hợp artifact vào HuGo

Quy trình promotion:

1. Kaggle tạo DRAFT artifact + manifest.
2. Tải thủ công về local; virus/dependency/license/checksum review.
3. Notebook 09 hoặc local harness kiểm prediction parity.
4. FastAPI image pin dependencies, endpoint `/health`, `/models`, `/v1/sentiment:predict`.
5. Backend gọi qua timeout/circuit breaker; log model version nhưng không log raw sensitive text.
6. Register trạng thái DRAFT, chạy integration/security/load test.
7. SHADOW: model không ảnh hưởng UI decision; so sánh với baseline.
8. Manual activate; giữ previous version để rollback.

## 8. Thứ tự thực hiện ngay

1. Không train notebook có sẵn khác ngay chỉ vì Kaggle gợi ý.
2. Hoàn thiện notebook 01 trên export an toàn; kết luận readiness.
3. Xin/kiểm license dataset Vietnamese; xây guideline và khóa travel-domain test.
4. Chạy notebook 02 TF-IDF CPU.
5. Fork/viết notebook PhoBERT trong cùng split để làm E1; GPU sau.
6. Chỉ khi 02/03 qua gate mới làm summary/quality và tích hợp inference.
7. Notebook 05 dùng heuristic + scenario trước; notebook 06/07 để BLOCKED cho đến khi telemetry đủ.

Đây là lộ trình tạo “AI của HuGo” đúng nghĩa: dữ liệu, protocol và artifact thuộc pipeline HuGo; notebook/model bên ngoài chỉ là thành phần được audit, không phải sản phẩm hoàn chỉnh.

