# HuGo Intelligence 2.0 — Kế hoạch M2-MVP cho đồ án cá nhân

Ngày lập kế hoạch: 2026-10-13  
Thời gian còn lại: 8 tuần  
Phạm vi đã khóa: Vietnamese sentiment, recommendation và itinerary

## 1. Quyết định điều chỉnh

HuGo chuyển từ kế hoạch nghiên cứu lớn sang một **MVP có thể hoàn thành và bảo vệ được bởi một sinh viên**. M0 và M1 được giữ nguyên là COMPLETE. Các kết luận `BLOCKED`/`REJECTED` của M2-A và M2-A2 cũng được giữ nguyên; kế hoạch này không đổi chúng thành PASS và không sửa manifest đang bị khóa.

M2-MVP gồm ba lát dọc:

1. phân loại sentiment tiếng Việt ba lớp bằng word/character TF-IDF + Logistic Regression;
2. recommendation dựa trên heuristic có giải thích và Bayesian rating hiện có;
3. itinerary dựa trên planner xác định hiện có, với giả định và giới hạn được hiển thị trung thực.

Không làm trong MVP: PhoBERT, aspect sentiment, Learning-to-Rank, chatbot/LLM, demand forecasting, chống spam bằng AI, OR-Tools, tự động retrain hoặc routing production-grade. Không mở lại M1.

Hai tuần cuối chỉ dành cho báo cáo, slide, video/demo dự phòng và luyện bảo vệ. Vì vậy toàn bộ thay đổi chức năng phải đóng băng cuối tuần 6.

## 2. Điều chỉnh data gate cho quy mô đồ án

Mốc `3.000 development + 600 travel test` vẫn là mục tiêu tốt của kế hoạch nghiên cứu lớn, nhưng không còn là điều kiện bắt buộc của M2-MVP. M2-MVP dùng hai mức sau:

| Mức | Development pool | Independent travel test | Ý nghĩa |
|---|---:|---:|---|
| Mục tiêu | 600 rows, khoảng 200/lớp | 150 rows, 50/lớp | đủ cho thí nghiệm đồ án nhỏ, vẫn phải báo khoảng tin cậy và bias |
| Sàn thực nghiệm | 360 rows, ít nhất 120/lớp | 90 rows, ít nhất 30/lớp | được báo metric nhưng phải ghi rõ sample nhỏ và độ bất định cao |
| Dưới sàn | bất kỳ | bất kỳ | chỉ là `DEMO_ONLY`; không claim chất lượng thực tế |

Đây không phải hạ chuẩn license, provenance, PII hay leakage. Chỉ giảm yêu cầu về số lượng. Một corpus chỉ được dùng cho metric khi quyền sử dụng, consent, hash, cleaning và split đều đạt gate của M2-MVP.

Phạm vi claim phải đúng với dữ liệu: kết quả trên feedback được gợi ý/thu thập cho đồ án chỉ chứng minh khả năng trên **bộ dữ liệu HuGo-MVP đã mô tả**, không chứng minh hiệu năng với toàn bộ review du lịch Việt Nam hoặc production traffic.

## 3. Ba loại dữ liệu không được trộn lẫn

| Loại | Mục đích | Được tune/train? | Được claim chất lượng? |
|---|---|---|---|
| `DEMO_ONLY` | chạy notebook, kiểm tra schema, UI và artifact lifecycle | có thể fit để smoke-test | **không**; metric chỉ kiểm tra code chạy |
| `DEVELOPMENT` | fit vectorizer/classifier và chọn cấu hình | có; chia train/validation theo group | có, nhưng chỉ là development/CV result |
| `INDEPENDENT_TEST` | đánh giá cuối cùng một lần | **không** | có, kèm support, giới hạn và khoảng tin cậy |

Quy tắc bắt buộc:

- demo fixture nên có 30–60 câu minh họa do người thực hiện tự viết, cân bằng ba lớp, gắn `data_tier=DEMO_ONLY` và `quality_claim_allowed=false`;
- demo rows không được chuyển âm thầm sang development/test;
- independent test phải là text do người thật cung cấp/gán nhãn, không dùng câu do AI sinh, machine translation, Google Maps content hoặc dữ liệu test/synthetic trong `travelgo_ai_m0_test`;
- contributor, entity/scenario family và exact/near-duplicate cluster không được giao cắt giữa development và independent test;
- test chỉ mở sau khi preprocessing, feature config và hyperparameter đã khóa. Nếu tune sau khi xem test, tập đó mất tư cách independent test và phải tạo test mới.

## 4. Đường dữ liệu đề xuất

### 4.1 Đường chính: `HuGo-MVP-ViSent-v1` first-party

Đây là lựa chọn khả thi nhất vì không phụ thuộc email xin phép publisher bên ngoài. Nó chưa được gọi là PASS cho tới khi có rows và bằng chứng thực tế.

Thu thập feedback ngắn bằng tiếng Việt cho ba domain hotel, restaurant và attraction. Người tham gia có thể mô tả trải nghiệm của chính họ hoặc phản hồi một scenario do con người thiết kế; hai loại phải có trường provenance riêng. Không được copy từ Google Maps, Booking.com, TripAdvisor, mạng xã hội hoặc nguồn bên thứ ba.

Form consent/release tối thiểu phải nêu rõ:

- mục đích nghiên cứu đồ án và huấn luyện/đánh giá sentiment;
- quyền xử lý, làm sạch, gán nhãn, train/evaluate, lưu artifact và trình bày aggregate metrics;
- một lựa chọn riêng cho phép upload **private Kaggle** ở bước sau;
- người viết xác nhận có quyền cung cấp text và không copy nội dung bên thứ ba;
- cấm tên, email, số điện thoại, URL, booking/order/account ID và dữ liệu của người khác;
- retention, quyền truy cập và thời hạn rút consent trước khi snapshot bị khóa;
- không có quyền thương mại nếu chưa có điều khoản riêng.

Consent receipt được lưu tách khỏi text. Dataset chỉ giữ pseudonymous contributor ID, provenance type, domain, entity/scenario group, label và text đã làm sạch.

Kế hoạch annotation khả thi:

- khóa guideline `NEGATIVE / NEUTRAL / POSITIVE` trước khi gán nhãn;
- 100% independent test được hai người Việt gán nhãn độc lập và adjudicate khi bất đồng;
- development được một annotator gán toàn bộ, tối thiểu 20% được annotator thứ hai kiểm tra; báo agreement trên phần overlap;
- rating, intended prompt label và model prediction không được hiển thị cho annotator;
- giữ nguyên phủ định, dấu tiếng Việt, emoji và mức độ cảm xúc; không suy nhãn từ số sao.

### 4.2 Ứng viên công khai không cần access request

`undertheseanlp/UTS2017_Bank` là ứng viên **CONDITIONAL**, không phải PASS. [Dataset card của publisher](https://huggingface.co/datasets/undertheseanlp/UTS2017_Bank) công bố Apache-2.0, 2.471 mẫu và cấu hình overall sentiment ba lớp; [tài liệu Underthesea](https://underthesea.readthedocs.io/en/stable/) cũng liệt kê UTS2017-BANK là tài nguyên mở. Nguồn có thể tải mà không gửi email xin access.

Tuy nhiên card chỉ mô tả chung text đến từ “public sources and banking communications”, neutral khoảng 1,2%, domain là ngân hàng và chưa đủ bằng chứng trong repo hiện tại để coi quyền upstream/PII là đã sạch. Vì vậy:

- chỉ audit trong timebox tối đa 1 ngày: pin exact commit, tải từ publisher, hash file, kiểm rows/labels/duplicates/PII và license files;
- không dùng làm independent travel test;
- chỉ dùng như auxiliary development data nếu audit provenance/upstream-rights đạt; nếu không đạt thì bỏ ngay, không gửi email để kéo dài tiến độ;
- không trộn với first-party data mà không lưu `source_family` và báo metric theo từng source/domain.

### 4.3 Trạng thái các nguồn đã audit

Các quyết định cũ giữ nguyên:

| Nguồn | Trạng thái giữ nguyên | Hành động MVP |
|---|---|---|
| VLSP 2018 | BLOCKED-AWAITING-ACCESS | không dùng |
| `h-i-e-u/vietnamese-SA-dataset` | BLOCKED provenance/leakage | không dùng |
| UIT-VSFC | BLOCKED license/quyền | không gửi email; không dùng |
| HAMOS | REJECTED cho overall sentiment; revision 3 removed | không dùng/không chuyển aspect label |
| `vanhai123/vietnamese-social-comments` | BLOCKED access/upstream rights | không xin access; không dùng |
| Google Maps reviews/content | REJECTED | cấm train/test/validate |

Registry và `vietnamese_sentiment_split_manifest.json` hiện tại tiếp tục giữ `BLOCKED`. Khi first-party data đạt gate, tạo một registry/manifest **MVP v1 mới** thay vì sửa lịch sử hoặc giả vờ gate cũ đã PASS.

## 5. Locked split và kiểm soát chất lượng

Với target 600 development rows:

- train: 480 rows;
- validation: 120 rows;
- independent travel test: 150 rows riêng.

Với sàn 360 development rows:

- train: 288 rows;
- validation: 72 rows;
- independent travel test: 90 rows riêng.

Split dùng deterministic grouped stratification theo label, contributor, entity/scenario group, source family và duplicate cluster. Seed, ordered pseudonymous row IDs, file SHA-256, cleaning-config hash, label-map hash và split hash phải nằm trong manifest.

Pipeline trước split:

1. strict UTF-8 và Unicode NFC;
2. loại empty/invalid/ngoài giới hạn độ dài;
3. scan email, phone, URL, order/account identifier; quarantine để review thủ công, log chỉ aggregate count;
4. exact dedupe trên normalized text;
5. near-duplicate bằng character 5-gram/Jaccard với threshold khóa trước;
6. tạo group và split; assert zero known cross-split leakage;
7. review ngẫu nhiên theo từng class/domain và khóa snapshot/hash.

Independent test nên cân bằng ba lớp và ba domain để Macro-F1 dễ diễn giải. Đây là elicited/commissioned test nếu được thu qua form, không được gọi là “review production tự nhiên”.

## 6. Thí nghiệm sentiment M2-MVP

Notebook chạy CPU trên Kaggle ở bước triển khai sau, dùng đúng label map hiện có:

- word TF-IDF n-gram 1–2;
- character `char_wb` TF-IDF n-gram 3–5;
- Logistic Regression, seed cố định, `class_weight` được chọn bằng validation;
- không chạy PhoBERT trong MVP.

Thí nghiệm nhỏ nhưng đủ giá trị học thuật:

1. majority-class baseline;
2. word-only TF-IDF + Logistic Regression;
3. char-only TF-IDF + Logistic Regression;
4. word + char TF-IDF + Logistic Regression (candidate chính).

Chỉ tune trên train/validation. Test chạy một lần sau khi chọn cấu hình. Primary metric là Macro-F1; secondary gồm per-class precision/recall/F1, confusion matrix, accuracy tham khảo, latency một câu/batch và artifact size. Báo thêm bootstrap 95% CI trên independent test và support từng lớp; với 30–50 mẫu/lớp, CI rộng là kết quả cần trình bày chứ không phải lỗi cần che.

Không đặt một ngưỡng Macro-F1 tùy ý để biến thí nghiệm thành PASS. Definition of Done là pipeline reproducible, dữ liệu hợp lệ, baseline/ablation chạy đúng và kết quả được báo trung thực. Nếu kết quả thấp, model vẫn là kết quả nghiên cứu nhưng UI phải gắn `Experimental` hoặc không dùng để tạo nhận định production.

Artifact tối thiểu: model/vectorizer, config, metrics JSON, confusion matrix, model card, dependency versions, dataset/split hashes, artifact SHA-256 và reload-parity test. Không log raw text nhạy cảm.

### Fallback khi chưa có dataset hợp lệ

Notebook vẫn phải chạy end-to-end bằng `DEMO_ONLY`, nhưng output bắt buộc có:

- `data_mode=DEMO_ONLY`;
- `quality_claim_allowed=false`;
- watermark trong chart/report: “Minh họa pipeline — không phải đánh giá chất lượng mô hình”;
- không export model với trạng thái production/active;
- không đưa metric demo vào abstract, kết luận hoặc slide so sánh chất lượng.

## 7. Phạm vi ba chức năng ưu tiên

### 7.1 Vietnamese sentiment

MVP nhận một đoạn review tiếng Việt và trả một trong ba nhãn cùng model version. Nếu tích hợp UI, phải hiển thị trạng thái experimental và không tổng hợp “địa điểm được yêu thích” khi sample thật chưa đủ. Không sinh summary/aspect không có dữ liệu.

### 7.2 Recommendation

Giữ hệ thống heuristic/Bayesian hiện có làm source of truth:

- eligibility/status và hard constraints trước;
- Bayesian rating để tránh địa điểm ít review đứng đầu do average thô;
- explicit preference, category/amenity và budget fit;
- score components và lý do có thể giải thích;
- cold-start fallback xác định.

Không train Learning-to-Rank. Khi chưa có relevance labels thật, đánh giá bằng golden scenarios có mô tả rõ: hard-constraint pass rate, determinism, coverage/diversity và kiểm tra explanation; không claim NDCG online hoặc causal uplift từ dữ liệu giả.

### 7.3 Itinerary

Tận dụng planner hiện có, tập trung vào demo end-to-end:

- nhận số ngày, sở thích, ngân sách và candidate hợp lệ;
- tạo lịch theo ngày, không lặp stop, cho phép save/reopen và chỉnh sửa tối thiểu;
- mọi giá/giờ mở cửa/ETA thiếu phải là `unknown` hoặc `estimated`;
- Haversine/straight-line chỉ được ghi là ước lượng, không gọi là road route;
- provider routing, OR-Tools và tối ưu phức tạp được DEFER.

Acceptance của itinerary là tính nhất quán, không vi phạm hard constraints đã biết và UX trung thực, không phải chứng minh lịch trình tối ưu toàn cục.

## 8. Kế hoạch 8 tuần

| Tuần | Trọng tâm | Deliverable/điểm dừng |
|---|---|---|
| 1 | khóa protocol dữ liệu; tạo consent/guideline; notebook DEMO; audit UTS tối đa 1 ngày | demo pipeline chạy local; quyết định dùng/bỏ UTS; pilot 30–60 first-party rows |
| 2 | thu thập, annotation, PII/dedupe; khóa split | đạt target 600+150 hoặc floor 360+90; nếu không đạt, chốt DEMO_ONLY và không kéo dài |
| 3 | chạy Kaggle CPU TF-IDF/LR; error analysis; model card; adapter/integration tối thiểu | committed run, hashes, metrics/CI hoặc báo demo-only trung thực |
| 4 | harden recommendation heuristic/Bayesian; golden scenarios | constraint/determinism/explanation tests và demo recommendation |
| 5 | harden itinerary, save/reopen, chỉnh stop; nối recommendation → itinerary | Customer E2E cho luồng chính và fallback trung thực |
| 6 | regression M0/M1, build, E2E, security/privacy, quay demo dự phòng; feature freeze | release candidate nội bộ, danh sách known limitations, không thêm feature |
| 7 | viết báo cáo, bảng thí nghiệm, sơ đồ kiến trúc, slide | draft hoàn chỉnh và số liệu trace được tới artifact |
| 8 | sửa lỗi nghiêm trọng, luyện bảo vệ, Q&A, video/demo offline | bản nộp cuối; không đổi model/data trừ lỗi tái lập nghiêm trọng |

Điểm cắt phạm vi:

- cuối tuần 1: UTS chưa qua audit thì bỏ;
- cuối tuần 2: data dưới floor thì khóa `DEMO_ONLY`, không hy sinh recommendation/itinerary để tiếp tục săn dataset;
- cuối tuần 3: không mở PhoBERT dù TF-IDF thấp;
- cuối tuần 6: không thêm chức năng; chỉ sửa lỗi làm hỏng demo, sai số liệu, privacy hoặc reproducibility.

## 9. Definition of Done cho đồ án MVP

MVP được coi là đủ để bảo vệ khi:

- sentiment có notebook reproducible; nếu có metric claim thì dataset/split/license/consent/hash và independent test đều hợp lệ, nếu không thì được ghi rõ demo-only;
- recommendation heuristic/Bayesian chạy ổn định, giải thích được và qua golden constraints;
- itinerary tạo/lưu/mở lại được một lịch trình demo, mọi dữ liệu ước lượng/không biết được ghi đúng;
- một Customer E2E nối ba chức năng hoặc fallback tương ứng;
- backend/frontend production build và regression trọng yếu PASS trước feature freeze;
- báo cáo phân biệt rõ bằng chứng thực nghiệm, demo kỹ thuật và hạn chế;
- không có LTR, dữ liệu giả, test DB hoặc metric demo bị trình bày như hiệu năng thực tế.

## 10. Bước triển khai nhỏ nhất tiếp theo

Trong một phiên 2–4 giờ, tạo `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py` (Kaggle-notebook-compatible) và một fixture 30–60 câu do người thực hiện tự viết, gắn cứng `DEMO_ONLY`. Notebook chỉ cần:

1. validate schema/ba nhãn và từ chối input không có `data_tier`;
2. chạy four baselines ở mục 6 với seed cố định;
3. xuất metrics, confusion matrix và artifact vào thư mục tạm;
4. ghi `quality_claim_allowed=false` và watermark demo;
5. có một test reload-parity.

Bước này không cần database, không cần Kaggle upload và không thay đổi registry/manifest đang BLOCKED. Nó loại rủi ro kỹ thuật của pipeline ngay, trong khi consent form và first-party pilot được chuẩn bị song song ở tuần 1.
