# HuGo Intelligence 2.0 — M2-A2: Dataset Recovery & Training Readiness

Ngày thực hiện: 2026-10-13

Trạng thái audit: **COMPLETE**

Dataset gate: **BLOCKED**

Quyết định Kaggle TF-IDF: **NO-GO**

## 1. Kết luận

Ba ứng viên mới đã được audit bằng nguồn publisher/repository chính thức. Không nguồn nào đạt đồng thời quyền sử dụng corpus gốc, provenance, raw-row/hash inspection, task fit ba lớp và travel-domain gate.

| Dataset | Quyết định M2-B | Kết luận ngắn |
|---|---|---|
| UIT-VSFC v1.0 | **BLOCKED** | đúng document-level ba lớp và raw audit tốt, nhưng license chính thức là `Unknown`, quyền commercial/Kaggle/model artifact chưa rõ, domain giáo dục không thay thế travel test |
| HAMOS DOI `10.17632/x46f4y4fpr.3` | **REJECTED** cho M2-B; source access **BLOCKED-REMOVED** | version 3 bị tác giả yêu cầu gỡ; current v4 là ABSA/quadruple từ Booking.com, không được đổi thành overall sentiment và upstream rights chưa đủ |
| `vanhai123/vietnamese-social-comments` | **BLOCKED** | gated/HTTP 401; CC BY-NC metadata không chứng minh quyền text TikTok/Facebook/YouTube; bốn nhãn có `toxic`, không được map tùy tiện |

Không thay đổi trạng thái của bất kỳ nguồn M2-A nào. `vietnamese_sentiment_split_manifest.json` tiếp tục là `SPECIFICATION_ONLY / BLOCKED`, 0 assigned rows và không có split hash giả.

## 2. Gate giữ nguyên từ M2-A

Để được **PASS** cho M2-B, corpus phải có đồng thời:

- publisher/owner, nguồn chính thức và upstream lineage rõ;
- quyền research/commercial/redistribution/private Kaggle/model artifact rõ bằng văn bản;
- revision bất biến và SHA-256 raw files;
- rows/labels thực tế đã kiểm tra; chỉ dùng explicit `NEGATIVE`, `NEUTRAL`, `POSITIVE` mapping;
- PII scan/manual review, exact và near-duplicate audit;
- ít nhất 3.000 Vietnamese travel/service rows sau dedupe theo gate hiện hành;
- travel-domain locked test độc lập tối thiểu 600 rows, mỗi lớp ít nhất 200;
- zero exact/near duplicate và reviewer/entity/source leakage giữa các split khi metadata cho phép.

License metadata do uploader chọn không tự chứng minh uploader sở hữu corpus nguồn. Không hạ gate vì thời gian đồ án còn ít.

## 3. UIT-VSFC

### 3.1 Publisher, source và revision

Nguồn ưu tiên đã dùng:

- [UIT NLP Group — Datasets/Corpora](https://nlp.uit.edu.vn/datasets/), mục `UIT-VSFC (version 1.0)` và Google Drive do UIT liên kết;
- [repository của tác giả Kiet Van Nguyen](https://github.com/kietnv/uit-vsfc/tree/62ab3370b77634e5fa438b911b5f156ca41eba25), commit `62ab3370b77634e5fa438b911b5f156ca41eba25`;
- [UIT NLP Group trên Hugging Face](https://huggingface.co/datasets/uitnlp/vietnamese_students_feedback/tree/7b56c6cb1c9c8523249f407044c838660df3811a), commit `7b56c6cb1c9c8523249f407044c838660df3811a`;
- bài báo KSE 2018, DOI `10.1109/KSE.2018.8573337`.

Publisher/creator được ghi là UIT NLP Group và nhóm tác giả Kiet Van Nguyen, Vu Duc Nguyen, Phu Xuan-Vinh Nguyen, Tham Thi-Hong Truong, Ngan Luu-Thuy Nguyen.

Repository tác giả chỉ chứa `README.md`, không có `LICENSE`. Dataset card UIT/Hugging Face ghi rõ license `Unknown`; source/annotation/PII sections còn thiếu. Apache-2.0 header trong loading script chỉ cấp quyền cho code loader, không cấp quyền cho corpus.

### 3.2 Raw rows, labels và hashes

Chín file do UIT/Hugging Face loader trỏ tới official Google Drive được đọc trong bộ nhớ ngày 2026-10-13; không lưu corpus vào repo.

| Split/file | Rows | SHA-256 |
|---|---:|---|
| train/sentences | 11.426 | `5481dc1fa51f2fe72f22afd89b8aeb7f8945a126af7e66ac622e2ab0291130cb` |
| train/sentiments | 11.426 | `480480c3b9a6bc8bdf53339c721e93f8cc30472ac8f0bd21d4440ce1171aefac` |
| train/topics | 11.426 | `09cbb8147f419f225b171cadf82410c442d6c24997ab97f48dfa779f4e68a1b9` |
| validation/sentences | 1.583 | `fb7c3cc3173e1383edc03779883d91bb4d6110c8dd881612572a256878aa23b4` |
| validation/sentiments | 1.583 | `a9584a22c926a54c6042236380c9a65ab8c41467477f7a5d794fb2505c96a9c3` |
| validation/topics | 1.583 | `7483805b24f5362aa5a2f708509876e0b69bf35753e90199059c2409caad7d96` |
| test/sentences | 3.166 | `75100e0559ecc0d7052870e2e7991391bfa7442bbaee91a6e271157c6fea343b` |
| test/sentiments | 3.166 | `0f04ebe3ada9655aff0a4c6eec27e5e7b8f552e26d3a6f06a35831e07e102f18` |
| test/topics | 3.166 | `ba04f1bd4014be3c1f1940236a8ceae71a455aa0837295bdbe2cdbcc44bd0745` |

Canonical nine-file manifest SHA-256: `fe57851be26cfd8e0f8049137049a36e9ed01445824e1b40ebe8b68b32923ac9`.

Label mapping do publisher định nghĩa trực tiếp:

- `0 → NEGATIVE`;
- `1 → NEUTRAL`;
- `2 → POSITIVE`.

| Split | Negative | Neutral | Positive | Tổng |
|---|---:|---:|---:|---:|
| Train | 5.325 | 458 | 5.643 | 11.426 |
| Validation | 705 | 73 | 805 | 1.583 |
| Test | 1.409 | 167 | 1.590 | 3.166 |
| **Total** | **7.439** | **698** | **8.038** | **16.175** |

Neutral chỉ chiếm khoảng 4,3%; test hiện tại có 167 neutral, thấp hơn gate 200/class của dự án.

### 3.3 Duplicate, PII và suitability

Basic Unicode-NFC/lowercase/whitespace exact audit:

- train: 1 duplicate row;
- validation: 0;
- test: 0;
- train ↔ validation: 0 normalized exact overlap;
- train ↔ test: 0;
- validation ↔ test: 0.

Basic no-log regex scan trên toàn bộ sentences tìm thấy 0 email, 0 phone, 0 URL và 0 chuỗi số dài từ 8 chữ số. Đây không phải PII clearance: dataset card không mô tả consent, source producers, anonymization hoặc sensitive-information review; manual review và near-duplicate scan vẫn chưa được phép coi là hoàn tất khi license chưa rõ.

Task fit: **tốt cho Vietnamese three-class document/sentence sentiment**, nhưng domain là phản hồi giáo dục, không phải hotel/restaurant/attraction. UIT-VSFC có thể là auxiliary corpus sau khi quyền được xác nhận, nhưng không thay thế travel-domain locked test hoặc gate 3.000 travel/service rows.

### 3.4 License decision

Official UIT page cho phép tải corpus nhưng không công bố license grant cụ thể cho:

- training/fine-tuning;
- private Kaggle upload;
- redistribution;
- commercial use;
- phát hành model/artifact dẫn xuất.

Vì license là `Unknown`, public download không được suy diễn thành quyền sử dụng không giới hạn.

**Decision: BLOCKED-AWAITING-UIT-WRITTEN-PERMISSION.**

## 4. HAMOS — DOI `10.17632/x46f4y4fpr.3`

### 4.1 Revision status

[Trang Mendeley chính thức của version 3](https://data.mendeley.com/datasets/x46f4y4fpr/3) trả rõ:

- “Version 3 of the dataset has been removed”;
- lý do: theo yêu cầu tác giả.

Do đó không có file inventory, raw rows hoặc SHA-256 chính thức để audit. Không dùng mirror của version đã bị gỡ.

Mendeley hiện hiển thị [version 4](https://data.mendeley.com/datasets/x46f4y4fpr/4), DOI `.4`, published 2026-10-05, contributor Tram Doan, institution Ho Chi Minh City University of Science, license metadata CC BY 4.0. Đây là revision khác và không tự thay thế `.3`.

### 4.2 Task và upstream rights

Metadata v4 mô tả:

- 8.796 reviews, 12.601 text segments, 23.995 sentiment quadruples;
- hotel-disjoint train/validation/test;
- `(aspect term, aspect category, opinion term, sentiment polarity)` với ba polarity;
- raw content thu thập từ Booking.com.

Đây là aspect-based sentiment. Một review có thể có nhiều aspect/polarity; M2-A2 **không chuyển chúng thành overall sentiment labels**.

Mendeley giải thích repository không sở hữu dữ liệu do contributor upload và license field mặc định có thể là CC BY 4.0; contributor phải có quyền/consent cần thiết. Vì vậy badge CC BY 4.0 không tự chứng minh quyền với Booking.com reviews/images. Booking.com terms hiện hành hạn chế automated copying/scraping/reproduction nếu không có written permission; M2-A2 không có permission hoặc lineage evidence đó.

**Decision: REJECTED-M2B-ASPECT-TASK; revision 3 additionally BLOCKED-REMOVED.** HAMOS không phải đường mở khóa TF-IDF overall three-class.

## 5. `vanhai123/vietnamese-social-comments`

### 5.1 Publisher, revision và access

- publisher trên card: Ha Van Hai;
- exact Hugging Face commit: `824cf0f3a70efa6bf27f13a4b2a197de3b7b587e`;
- file inventory: `vne_dataset.csv`, metadata size 297.785 bytes;
- dataset gated: phải đăng nhập, chia sẻ contact information và được phê duyệt;
- raw request tại exact commit không có token trả HTTP 401; M2-A2 không bypass gate.

Không có raw SHA-256, independent row count, PII hoặc duplicate audit. Git object ID `aec2a2c…` là SHA-1 object identifier, không được ghi giả thành SHA-256 corpus.

### 5.2 Card claims và task fit

Card công bố 4.896 social comments từ TikTok, Facebook, YouTube và các nền tảng khác:

| Label | Card count |
|---|---:|
| positive | 1.432 |
| negative | 1.187 |
| neutral | 1.003 |
| toxic | 1.274 |

Ba explicit sentiment labels có 3.622 rows theo card. `toxic` là toxicity, không phải overall sentiment: không được map sang `NEGATIVE`. Nếu source sau này qua gate, chỉ có thể loại toxic trước split và báo rõ transformation; không được relabel.

Domain là social media, không phải travel. Card không nêu original post IDs, collection method, platform permission, author consent, annotation protocol/annotators, PII removal hoặc upstream license. CC BY-NC 4.0 metadata giới hạn non-commercial use và không chứng minh publisher có quyền cấp phép text lấy từ các platform.

**Decision: BLOCKED-AWAITING-ACCESS-AND-UPSTREAM-RIGHTS.**

## 6. Trạng thái locked split

Không ứng viên nào đạt PASS nên không tạo manifest PASS:

- không đổi registry M2-A hoặc label map;
- không đổi `vietnamese_sentiment_split_manifest.json`;
- không trộn UIT education, HAMOS aspect labels hoặc social toxic vào ba lớp;
- không dùng published split như bằng chứng leakage-safe khi near-duplicate/entity/reviewer metadata chưa đủ;
- không tạo travel-domain test từ synthetic/AI-generated text.

Nếu một corpus được mở quyền, pipeline vẫn phải chạy lại trên raw snapshot: NFC/PII cleaning → exact/near dedupe → source/reviewer/entity grouping → deterministic 70/15/15 split → zero-overlap assertions → manifest/hash. Travel-domain locked test là tập thứ tư, độc lập và không dùng tuning.

## 7. Phương án first-party travel feedback

Vì chưa có source PASS, phương án đáng tin cậy là thu thập trực tiếp, không scrape nền tảng và không tạo AI review.

### 7.1 Hai pool tách biệt

1. **Development pool:** tối thiểu 3.000 Vietnamese travel/service feedback rows sau PII cleaning và dedupe; dùng để tạo train/validation/test 70/15/15.
2. **Locked travel test:** tối thiểu 600 rows riêng, mỗi lớp ≥200; contributor, entity và duplicate cluster không xuất hiện trong development pool.

Domain phải bao phủ hotel, restaurant và attraction. Feedback phải do người thật viết từ trải nghiệm/thái độ thật hoặc scenario đánh giá được thiết kế bởi con người; người tham gia cam kết không copy từ Google Maps, Booking.com, TripAdvisor hoặc nguồn bên thứ ba.

### 7.2 Consent/quyền sử dụng tối thiểu

Trước khi nhập text, form phải ghi rõ:

- mục đích: nghiên cứu đồ án, train/evaluate Vietnamese sentiment và báo aggregate metrics;
- người viết xác nhận sở hữu hoặc có quyền cung cấp text, không copy platform;
- grant không độc quyền cho HuGo để clean, annotate, train và evaluate;
- có/không cho private Kaggle upload phải là checkbox riêng;
- model/artifact dẫn xuất có thể được lưu và trình bày trong đồ án;
- không nhập tên, email, phone, booking/order/account ID hoặc dữ liệu người khác;
- retention, người truy cập, deadline rút consent trước khi snapshot khóa;
- commercial use mặc định **không được phép** nếu chưa có consent/legal wording riêng.

Lưu consent receipt/version tách khỏi text; dataset chỉ mang pseudonymous contributor/group ID.

### 7.3 Human annotation

- guideline khóa ba nhãn `NEGATIVE / NEUTRAL / POSITIVE`, có examples biên nhưng không lấy từ locked test;
- ít nhất hai annotator tiếng Việt độc lập/row;
- annotator không thấy label của tác giả, rating hoặc model prediction;
- disagreement do adjudicator thứ ba xử lý;
- báo raw agreement và Krippendorff alpha/Cohen kappa phù hợp;
- pilot dùng để sửa guideline phải nằm ngoài locked test;
- không dùng LLM để viết review hoặc làm annotator quyết định cuối.

### 7.4 Quality/privacy

- strict UTF-8, NFC, giữ dấu/negation/emoji;
- scan/mask email, phone, URL, order/account IDs; high-risk rows bị loại/manual review;
- exact hash và char-5-gram near-duplicate Jaccard ≥0,90;
- group-safe split theo contributor/entity/source;
- locked test freeze trước training và chỉ mở một lần sau khi pipeline/hyperparameters đã khóa.

## 8. Kế hoạch xử lý blocker tối đa 48 giờ

Đây là timebox ra quyết định, không phải cam kết có thể thu thập hợp lệ 3.600 rows trong 48 giờ.

### H0–H4: quyền và access

Người dùng cần thực hiện:

1. Gửi email từ tài khoản trường tới `kietnv@uit.edu.vn`, kèm DOI/bài báo và hỏi bằng văn bản:
   - quyền academic/non-commercial training;
   - có được upload snapshot lên **private Kaggle** không;
   - có được lưu/chia sẻ model artifact, metrics và thesis excerpts không;
   - redistribution/commercial restrictions;
   - consent/anonymization của student feedback;
   - xác nhận version 1.0 và hashes hoặc chấp nhận nine-file hashes ở mục 3.
2. Trên Hugging Face, đăng nhập và gửi access request cho `vanhai123/vietnamese-social-comments`; lưu nguyên văn điều kiện được hiển thị, thời điểm accept và approval email.
3. Email `vanhai11203@gmail.com` hỏi source-by-source rights, platform collection permission, author consent, annotation protocol, PII removal, private Kaggle/model-artifact permissions và commercial restriction.
4. Không tải HAMOS mirror. Với M2-B, dừng HAMOS; chỉ liên hệ contributor nếu muốn nghiên cứu M7 aspect sau này.

### H4–H12: chuẩn bị first-party pilot

- khóa consent form/data notice và annotation guideline;
- tuyển tối thiểu 2 annotators + 1 adjudicator không phải cùng một người;
- tuyển contributors độc lập, phân development/test ngay từ đầu bằng contributor ID;
- chuẩn bị form cấm copy platform và cấm PII;
- pilot 60–120 rows chỉ để đo hiểu guideline, không đưa vào locked test.

### H12–H24: checkpoint pháp lý

- nếu UIT trả lời đầy đủ và cho private Kaggle/training/artifact: chuyển UIT sang **CONDITIONAL**, chưa PASS; chạy manual PII + near-duplicate audit;
- nếu social-comments được approve nhưng không có upstream rights: vẫn **BLOCKED**;
- nếu không có văn bản trả lời: không suy diễn từ im lặng/public download, giữ BLOCKED.

### H24–H48: checkpoint dữ liệu và hard stop

- hoàn tất pilot, agreement/error review và sửa guideline một lần;
- chỉ nếu development pool thực sự đạt ≥3.000 và locked test đạt ≥600 human rows mới chạy cleaning/dedupe/group split/hash;
- chỉ phát hành manifest PASS nếu zero-overlap, PII, consent, rights và support assertions đều PASS;
- nếu thiếu bất kỳ điều kiện nào ở H48: chốt **NO-GO**, kết thúc M2-A2 và tiếp tục collection như một dependency hữu hạn; không train tạm bằng data chưa rõ quyền.

## 9. GO/NO-GO decision tree

| Điều kiện tại H48 | Quyết định |
|---|---|
| Chỉ có UIT permission, chưa có travel pool/test | **NO-GO**; UIT chỉ là auxiliary candidate |
| Social-comments access nhưng upstream rights/PII chưa rõ | **NO-GO** |
| HAMOS v4 tải được nhưng vẫn aspect-level | **NO-GO cho M2-B** |
| Development travel <3.000 hoặc locked test <600/<200 mỗi lớp | **NO-GO** |
| Rights + consent + ≥3.000 development + ≥600 locked test + PII/dedupe/leakage/hash PASS | **GO cho M2-B TF-IDF CPU**, vẫn chưa GO cho PhoBERT |

Quyết định tại thời điểm báo cáo: **NO-GO**.

## 10. Bằng chứng thực thi

| Nhóm | Kết quả | Bằng chứng |
|---|---|---|
| Đọc 5 artifact/tài liệu bắt buộc | **PASS** | M2-A report, registry, label map, split spec, training plan |
| UIT publisher/source audit | **PASS** | UIT official page, official-linked Drive, author GitHub và UIT HF revision |
| UIT raw row/hash audit | **PASS** | 9 files; 16.175 rows; counts/hashes và row alignment đã xác minh |
| UIT exact duplicate/PII regex | **PASS cho basic audit** | 1 within-train duplicate; 0 cross-split exact; 0 email/phone/URL/long-ID candidates |
| UIT rights gate | **BLOCKED** | official license `Unknown`; missing source/consent/PII details |
| HAMOS v3 access | **BLOCKED-REMOVED** | official Mendeley page: removed at author's request |
| HAMOS M2-B task fit | **REJECTED** | aspect quadruples không phải overall sentiment |
| Social-comments revision/access | **PASS cho metadata; BLOCKED cho raw** | commit `824cf0f…`; exact raw URL HTTP 401 |
| Social-comments rows/hash/PII/duplicates | **BLOCKED** | chưa được cấp access; không có raw SHA-256 |
| Locked split manifest | **BLOCKED, unchanged** | không có eligible corpus; không tạo fabricated PASS/hash |
| Training/Kaggle/PostgreSQL | **NOT RUN** đúng phạm vi | không train, upload hoặc truy cập DB |
| Push/deploy/publish | **NOT RUN** đúng phạm vi | không thực hiện |

## 11. File thay đổi

- `docs/HUGO_AI_M2_DATA_RECOVERY_REPORT.md`.

Không thay registry, label map hoặc split manifest vì chưa có bằng chứng mới đủ mạnh để nâng trạng thái.
