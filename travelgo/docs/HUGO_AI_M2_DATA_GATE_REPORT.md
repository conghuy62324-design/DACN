# HuGo Intelligence 2.0 — M2-A: Vietnamese Sentiment Dataset, License, Provenance & PII Gate

Ngày thực hiện: 2026-10-12

Trạng thái thực hiện M2-A: **COMPLETE**

Kết quả data gate: **BLOCKED**

Sẵn sàng bắt đầu M2-B TF-IDF trên Kaggle: **CHƯA**

## 1. Kết luận

M1 thuộc P0 đã được đánh dấu **COMPLETE** trong `HUGO_AI_IMPLEMENTATION_ROADMAP.md` sau khi đối chiếu toàn bộ acceptance criteria với báo cáo Task 1–5. Đây không phải tuyên bố toàn bộ P0 hoàn tất; M2–M6 vẫn còn.

M2-A đã hoàn tất công việc audit và khóa specification, nhưng chưa có corpus nào đạt đồng thời license, provenance, task-fit và leakage gate. Vì vậy không tạo split giả, không train TF-IDF/PhoBERT và không upload dữ liệu lên Kaggle.

Kết luận từng nguồn:

| Dataset | Kết luận | Lý do quyết định |
|---|---|---|
| VLSP 2018 VABSA | **BLOCKED** (`BLOCKED-AWAITING-ACCESS`) | cần User Agreement/quyền truy cập chính thức; không được dùng mirror; nhãn gốc là aspect-polarity, chưa phải document label |
| `h-i-e-u/vietnamese-SA-dataset` | **BLOCKED** | lineage/license nguồn không chứng minh được; row count/card/files mâu thuẫn; có exact leakage train/test |
| CausaSent ATE v2 | **REJECTED** cho M2-B | ABSA nhị phân, không có NEUTRAL, phần lớn silver/LLM-labeled; quyền upstream Tiki chưa được chứng minh |
| HuGo travel-domain locked test v1 | **BLOCKED** | chưa thu thập/gán nhãn; test/synthetic DB bị loại khỏi quality claim |
| Google Maps reviews/content | **REJECTED** | nguồn bị cấm cho train/test/validation/fine-tune trong dự án |
| Kaggle dataset không rõ license | **REJECTED** | thiếu owner/source/license/revision/lineage |

Không có dataset **PASS** hoặc **CONDITIONAL** được phép đưa vào M2-B ở snapshot này.

## 2. Xác nhận M1 P0 milestone

| Acceptance M1 trong roadmap | Kết quả | Bằng chứng đã khóa |
|---|---|---|
| impression → click/save/booking attribution | **PASS** | Task 3: 39 HTTP/PostgreSQL checks; Task 4: visible-impression SAVE/UNSAVE; Task 5 regression PASS |
| unauthorized/forged user/request/business bị từ chối | **PASS** | Task 2–5 spoofing, cross-user, RBAC và negative-path tests PASS |
| one-booking-one-review, rating 1–5, comment limit | **PASS** | Task 5: 75 checks; 6 concurrent create cho đúng 1 row và 5 HTTP 409 |
| privacy không log/export raw secret/PII | **PASS** | consent/opt-out, PII rejection/redaction, account deletion và production/test isolation PASS |

Roadmap nay ghi rõ: **M0 COMPLETE, M1 P0 milestone COMPLETE, không có M1 Task 6**.

Các phần dưới đây là out-of-scope đã định sẵn, không phải acceptance gap của M1:

- **M3:** candidate retrieval/hybrid scoring/diversity/explanation và offline relevance evaluation hoàn chỉnh;
- **M5:** price/opening-hours truth, route matrix, GIS routing và constrained itinerary/budget;
- **P1:** aspect sentiment/richer explanations, LTR shadow, conversation memory, moderation/anti-spam nâng cao.

## 3. Phạm vi audit và nguồn chính thức

Đã đọc:

- `HUGO_AI_M1_TASK5_REPORT.md`;
- `HUGO_AI_DATA_AUDIT.md`;
- `HUGO_AI_MODEL_TRAINING_PLAN.md`;
- `HUGO_AI_EXPERIMENT_DESIGN.md`;
- `HUGO_AI_IMPLEMENTATION_ROADMAP.md`.

Nguồn ngoài chỉ lấy từ trang chính thức:

- [VLSP 2018 VABSA](https://vlsp.org.vn/vlsp2018/eval/sa);
- [VLSP 2018 Corpus User Agreement](https://vlsp.org.vn/sites/default/files/2019-06/VLSP2018-UserAgreement_0.pdf);
- [Vietnamese-SA tại commit `0c680120…`](https://huggingface.co/datasets/h-i-e-u/vietnamese-SA-dataset/tree/0c680120248051a3338f059528b7942d71060243);
- [CausaSent ATE v2 tại commit `e80bac43…`](https://huggingface.co/datasets/Tamir39/causasent-ate-v2/tree/e80bac430ffb42537803d8ecf113d64b3a2cc26f);
- [Google Maps Platform Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms).

Không tải mirror, không commit corpus, không truy cập/ghi database và không tạo HuGo export.

## 4. Audit VLSP 2018

Trang chính thức mô tả VABSA trên hai domain hotel và restaurant, với polarity `positive`, `negative`, `neutral` gắn vào tuple aspect `(entity, attribute)`. Một review có thể chứa nhiều aspect với polarity khác nhau; M2-A không tự gộp chúng thành một document label.

User Agreement chính thức quy định:

- chỉ dùng cho research/development NLP, information retrieval hoặc document understanding;
- không dùng trong commercial system;
- không redistribute corpus hoặc bản đã chỉnh sửa;
- chỉ publish summary/analysis không thể tái tạo corpus và small excerpt trong ngữ cảnh khoa học/kỹ thuật;
- phải acknowledge VLSP;
- người dùng phải ký; sinh viên cần chữ ký supervisor.

Workspace chưa có quyền truy cập corpus chính thức. Vì vậy:

- corpus acquisition: **không thực hiện**;
- raw row count: **chưa xác minh**;
- corpus SHA-256: **chưa có**;
- file `vlsp_data.csv` trong nguồn Hugging Face bên thứ ba không được coi là VLSP hợp lệ;
- trạng thái: **BLOCKED-AWAITING-ACCESS**.

Ngay cả sau khi được cấp quyền, M2-B chỉ được dùng nếu corpus có explicit document-level label phù hợp hoặc có một transformation được quyền và được phê duyệt trước. Không suy diễn từ tập aspect polarity hỗn hợp.

## 5. Audit `h-i-e-u/vietnamese-SA-dataset`

### 5.1 Revision và file inventory

- exact Hugging Face commit: `0c680120248051a3338f059528b7942d71060243`;
- audit date: 2026-10-12;
- không phụ thuộc mutable `main`;
- raw bytes chỉ được đọc trong bộ nhớ để kiểm đếm/hash, không lưu trong repo.

| File | Rows | Label distribution | Exact duplicate rows | SHA-256 |
|---|---:|---|---:|---|
| `data_m.csv` | 24.351 | neg 9.045; neu 6.967; pos 8.339 | 111 | `6742578fcb0bd192ee39d96cf5e22a10fa9c1b4560af6cc602c5e9ddf893d033` |
| `train_phobert.csv` | 30.737 | NEG 13.252; NEU 3.625; POS 13.860 | 334 | `192fe8f8b1d76a8ae50a2dd38ef56833c7062f5dc66c211ea20659de318b1f9a` |
| `test_phobert.csv` | 4.080 | neg/neu/pos đều 1.360 | 32 | `f81bfa2da7d9449a487581d4667bbbbe7c33543e46d22440d46a3d3e8e51f814` |
| `vlsp_data.csv` | 5.100 | neg/neu/pos đều 1.700 | 48 | `c9fc10ed2776cc2add7b5792e2c4d28e36d1e75525daa8270c47c05059911fba` |

Canonical file-manifest SHA-256: `ee7df709ae28f62e13047f884717ba4de1c061df12240da862abc1ee5ad2c4e8`.

### 5.2 Row-count và lineage inconsistency

- card ghi tổng **24.351**, đúng bằng riêng `data_m.csv`;
- viewer ghi **34.817**, đúng bằng `train_phobert.csv + test_phobert.csv`;
- cộng ngây thơ bốn CSV là **64.268**, nhưng các file chồng lặp mạnh;
- card không nêu nguồn, cách thu thập, upstream license, annotation protocol hoặc lineage của từng subset;
- metadata `MIT` ở repository không chứng minh quyền với text nguồn;
- tên `vlsp_data.csv` gợi ý quan hệ với VLSP nhưng không có User Agreement/quyền redistribute kèm theo.

### 5.3 Leakage/duplicate audit

Số normalized exact text giao nhau:

| Hai file | Rows giao nhau |
|---|---:|
| `data_m` ↔ `train_phobert` | 689 |
| `data_m` ↔ `test_phobert` | 4 |
| `data_m` ↔ `vlsp_data` | 5 |
| `train_phobert` ↔ `test_phobert` | 103 |
| `train_phobert` ↔ `vlsp_data` | 1.107 |
| `test_phobert` ↔ `vlsp_data` | 4.048 |

`test_phobert.csv` có 4.048 unique normalized texts và toàn bộ chúng đều xuất hiện trong `vlsp_data.csv`. Ngoài ra có 103 exact texts trực tiếp giao giữa file train/test. Split công bố sẵn không được dùng để claim performance.

Basic no-log regex scan còn thấy phone/URL candidates (email 0); đây chỉ là candidate count, chưa phải PII clearance:

| File | Phone candidates | URL candidates |
|---|---:|---:|
| `data_m.csv` | 1 | 1 |
| `train_phobert.csv` | 3 | 5 |
| `test_phobert.csv` | 1 | 19 |
| `vlsp_data.csv` | 2 | 24 |

Kết luận: **BLOCKED-PROVENANCE-AND-LEAKAGE**. Không train từ revision này. Chỉ xem xét lại khi publisher cung cấp lineage/quyền từng subset, sau đó rebuild split từ raw source đã dedupe.

## 6. Audit CausaSent ATE v2

- exact commit: `e80bac430ffb42537803d8ecf113d64b3a2cc26f`;
- 7.066 reviews: train 5.647, validation 700, test 719;
- 10.307 aspect annotations: negative 6.113, positive 4.194, neutral 0;
- source theo card: gold 1.132, Tiki silver 5.934;
- file-manifest SHA-256: `0a2e5351027fae24d7a84c589c95b80bf968a14ae54bdd096351c12670d7a97e`.

Card ghi CC BY-SA 4.0 nhưng phần lớn raw text là public Tiki reviews; card không đưa bằng chứng upstream redistribution authorization. Silver labels và aspect spans có LLM/Claude-assisted processing. Quan trọng hơn, đây là aspect-level binary task và neutral bị loại.

Kết luận: **REJECTED-M2B-TASK-MISMATCH**. Không tự sinh NEUTRAL hoặc document label. Có thể audit lại riêng cho P1/M7, không thuộc M2-B.

## 7. Label contract

Canonical labels duy nhất:

| ID | Label |
|---:|---|
| 0 | `NEGATIVE` |
| 1 | `NEUTRAL` |
| 2 | `POSITIVE` |

Quy tắc:

- unknown/missing label → reject row;
- chỉ mapping explicit `neg/NEG`, `neu/NEU`, `pos/POS` khi dataset gate đã PASS;
- không map rating sang sentiment;
- không collapse nhiều aspect polarity thành một nhãn;
- không dịch máy/sinh synthetic locked test;
- annotator của travel test phải dùng trực tiếp ba canonical labels và không nhìn rating/model output.

Contract nằm tại `ai/configs/vietnamese_sentiment_label_map.json`.

## 8. Locked split specification

Vì chưa có eligible corpus, `vietnamese_sentiment_split_manifest.json` là **SPECIFICATION_ONLY / BLOCKED**, có 0 assigned rows và `split_hash_sha256=null`. Việc điền hash/split giả sẽ vi phạm nguyên tắc reproducibility.

Khi data gate PASS, split được tạo một lần với seed `20261012`:

- train 70%: chỉ fit vectorizer/classifier;
- validation 15%: chỉ chọn preprocessing/features/regularization/class weight;
- test 15%: khóa, chỉ mở sau khi pipeline/hyperparameters freeze; không tune/relabel/chọn model bằng test;
- travel-domain locked test là tập độc lập, không nằm trong ba split trên và không dùng tuning.

Chống leakage:

1. exact duplicate bằng normalized text hash;
2. near duplicate bằng candidate MinHash char 5-gram rồi xác minh Jaccard ≥0,90;
3. union group cho exact/near duplicate và cùng reviewer/entity nếu metadata có;
4. cùng upstream lineage/copy thuộc một `source_family`;
5. một connected component chỉ được ở một split;
6. assert zero cross-split overlap cho row, duplicate group, reviewer và entity biết được;
7. khi metadata không có, ghi rõ leakage đó là unmeasurable, không tuyên bố đã ngăn được.

Gate hiện hành vẫn yêu cầu ít nhất 3.000 Vietnamese travel/service rows sau dedupe và travel-domain test có ít nhất 200 rows mỗi class.

## 9. Vietnamese travel-domain locked test

Kế hoạch `hugo-travel-domain-test-v1`:

- tối thiểu 600 rows, mỗi class ≥200;
- bao phủ hotel, restaurant, attraction;
- chỉ original commissioned text hoặc nguồn có quyền rõ ràng;
- cấm Google Maps, `travelgo_ai_m0_test`, synthetic và machine translation;
- tối thiểu hai annotator tiếng Việt độc lập mỗi row;
- guideline khóa trước, hide rating/source label/model output, adjudicate disagreement;
- báo raw agreement và Krippendorff alpha hoặc statistic phù hợp, threshold được predeclare trước annotation;
- reviewer/entity/duplicate groups tách khỏi train/validation/general test khi metadata cho phép;
- PII/right gate fail hoặc support thiếu → domain quality tiếp tục **BLOCKED**.

Không có synthetic test nào được dùng để claim domain quality.

## 10. PII, cleaning và data quality gate

Thứ tự khóa:

1. strict UTF-8; Unicode NFC; bỏ BOM/zero-width controls; normalize line ending/whitespace;
2. reject null/empty/invalid schema/invalid label;
3. scan email, phone, URL, order ID, account ID bằng pattern versioned;
4. mask match hợp lệ bằng typed token; quarantine row có identity/high-risk ambiguity để manual review;
5. không log raw match, chỉ aggregate count/rejection reason;
6. giữ dấu tiếng Việt, negation, emoji, punctuation, intensity;
7. reject hoặc manual review text ngoài 3–2.000 ký tự; không silently truncate;
8. dedupe/leakage group trước split.

Regex chỉ là lớp đầu; manual sample/re-identification review vẫn bắt buộc. Pseudonymization không được gọi là anonymization.

## 11. M2-B notebook specification

M2-B chỉ được bắt đầu sau khi registry có dataset **PASS**, travel test PASS và split manifest thật đã có hash.

| Thành phần | Specification khóa |
|---|---|
| Runtime | Kaggle CPU |
| Features | TF-IDF word 1–2 + char 3–5, kết hợp hai nhánh |
| Classifier | Logistic Regression |
| Primary metric | Macro-F1 |
| Secondary | per-class precision/recall/F1, confusion matrix, latency, artifact size |
| Tuning | validation only |
| Reproducibility | dataset/split/label/config hash, model card, reload parity, artifact SHA-256 |

PhoBERT **không chạy** trước khi TF-IDF baseline hoàn tất trên exact committed locked split. Task M2-A không train model nào.

## 12. Artifact, version và checksum

| Artifact | Version/loại | SHA-256 |
|---|---|---|
| `ai/configs/vietnamese_sentiment_dataset_registry.json` | registry `hugo-vi-sentiment-m2a-2026-10-12-v1` | `42b308f46692745bd02d3cfcd6ea547087c65cefcd859c95037fc9e8c72b240a` |
| `ai/configs/vietnamese_sentiment_label_map.json` | label map `hugo-vi-sentiment-3class-v1` | `0056ec5df7b9f7774af09f2f053b0b440df7afa729eda073ea877a16db7a6159` |
| `ai/evaluation/vietnamese_sentiment_split_manifest.json` | specification-only | `ea1677137507c153c9184680319ed44356a4f4392f6d336c2b97cdd71da8032f` |

Dataset raw hashes và HF commit được lưu trong registry. VLSP corpus hash để `null` có lý do; không điền giá trị không có bằng chứng.

## 13. Kiểm tra thực thi

| Nhóm | Kết quả | Bằng chứng |
|---|---|---|
| Đọc 5 tài liệu bắt buộc | **PASS** | acceptance/data/model/experiment/roadmap đã đối chiếu |
| M1 acceptance review | **PASS** | bốn acceptance rows có evidence Task 2–5; roadmap đã cập nhật COMPLETE |
| VLSP official source/agreement audit | **PASS** cho audit | official page + official PDF; corpus access **BLOCKED** |
| Hugging Face immutable revision | **PASS** | `git ls-remote` và official API cùng trả hai exact commit |
| Vietnamese-SA row/hash/duplicate audit | **PASS** cho audit | bốn CSV đọc tại pinned commit; counts/hashes/intersections ở trên |
| CausaSent row/hash/task-fit audit | **PASS** cho audit | ba JSON tại pinned commit; 7.066 rows/10.307 annotations |
| JSON syntax validation | **PASS** | cả ba artifact parse thành công bằng PowerShell `ConvertFrom-Json` |
| Artifact SHA-256 | **PASS** | `Get-FileHash -Algorithm SHA256`; values ở mục 12 |
| Repository diff hygiene | **PASS** | `git diff --check` exit 0; chỉ có line-ending warnings hiện hữu |
| Eligible dataset gate | **BLOCKED** | không có candidate PASS |
| Locked row split | **BLOCKED** | specification-only, 0 rows; không tạo fabricated split hash |
| Travel-domain test | **BLOCKED** | chưa thu thập/gán nhãn |
| Model training | **NOT RUN** đúng phạm vi | TF-IDF/PhoBERT đều chưa chạy |
| Database/Kaggle/publish | **NOT RUN** đúng phạm vi | không DB export, không upload, không push/deploy/publish |

Không có backend/frontend/runtime code thay đổi, nên production build/regression không cần chạy lại cho một task chỉ tạo docs/config. M1 sử dụng evidence đã khóa trong Task 5; không gọi historical test là test mới.

## 14. File thay đổi

- `docs/HUGO_AI_IMPLEMENTATION_ROADMAP.md`;
- `docs/HUGO_AI_M2_DATA_GATE_REPORT.md`;
- `ai/configs/vietnamese_sentiment_dataset_registry.json`;
- `ai/configs/vietnamese_sentiment_label_map.json`;
- `ai/evaluation/vietnamese_sentiment_split_manifest.json`.

## 15. Quyết định cuối và unblock conditions

**Chưa đủ điều kiện bắt đầu M2-B TF-IDF trên Kaggle.** Ba điều kiện tối thiểu để mở gate:

1. ít nhất một corpus ba lớp đạt **PASS** về owner/source/upstream license, exact revision, SHA-256, provenance, PII và leakage;
2. travel-domain locked test thật đạt rights/annotation/PII/support gate; không dùng Google Maps, test DB hoặc synthetic;
3. tạo row inventory và locked train/validation/test thật, chạy zero-overlap assertions rồi ghi split hash bất biến.

Cho đến lúc đó, M2-B/PhoBERT giữ `NOT_STARTED`; không upload HuGo database/export và không mở thêm backend/database feature.
