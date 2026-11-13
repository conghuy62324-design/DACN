# T09 — Pipeline sentiment nghiên cứu và notebook CPU

Ngày 30/10/2026. **Kết quả: công cụ và smoke fixture DEMO_ONLY hoàn tất; corpus thật/chất lượng mô hình chưa được chứng nhận.** Theo [T08](HUGO_T08_DATA_READINESS_REPORT.md), eligible thật vẫn bằng 0. Đã đọc [T01](HUGO_MVP_DATA_COLLECTION_KIT.md), [scope](HUGO_6_WEEK_SCOPE.md), script/notebook B1/B2 và [báo cáo B1](HUGO_AI_M2_B1_REPORT.md)/[B2](HUGO_AI_M2_B2_REPORT.md). Git status ban đầu có nhiều thay đổi T03–T08, gồm sửa sẵn `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py`; chúng được giữ nguyên.

## File và contract

| File mới | Vai trò |
|---|---|
| [`ai/research/data.py`](../ai/research/data.py) | Schema `hugo-mvp-visent-research-v1`, normalize, PII detection, rights/annotation validation, exact/near dedupe, connected leakage groups, pilot exclusion, floor và group split. |
| [`ai/research/pipeline.py`](../ai/research/pipeline.py) | CLI `prepare`, `select`, `evaluate`; manifest/hash, validation grid, refit, metrics/CI, artifact và reload parity. |
| [`ai/research/t09_kaggle_cpu_demo.ipynb`](../ai/research/t09_kaggle_cpu_demo.ipynb) | Notebook mới gọi đúng ba CLI stages với fixture, CPU/Internet Off; không ghi đè notebook B2. |
| [`ai/research/test_pipeline.py`](../ai/research/test_pipeline.py), [`requirements.txt`](../ai/research/requirements.txt), [`README.md`](../ai/research/README.md), `__init__.py`, `.gitignore` | Synthetic gate regressions, runtime dependencies, hướng dẫn/handoff và bỏ qua Python cache. |

Label map hiện có giữ **0 NEGATIVE, 1 NEUTRAL, 2 POSITIVE**; không suy nhãn từ rating. `prepare --mode demo` dùng 45 dòng fixture cũ; chia 27 train, 9 validation, 9 **DEMO_HOLDOUT**, không hạ floor nghiên cứu. `prepare --mode research` đọc T01 content JSONL, restricted evidence JSONL và frozen protocol JSON. Đòi row ID duy nhất, date/label/domain, provenance, nhóm contributor/entity/scenario, phiên bản, quyền nghiên cứu, trạng thái rút consent, PII/provenance review, annotation độc lập/adjudication. Scanner email/phone hoặc ID dài/URL chỉ phát hiện và từ chối/quarantine; `--quarantine-report` tùy chọn chỉ ghi ID và loại pattern vào file hạn chế quyền, không ghi text. Người phụ trách vẫn phải xác nhận PII/nguồn gốc. Chuẩn hóa NFC, bỏ zero-width/gộp whitespace, giữ dấu và phủ định.

Exact duplicate dùng casefold sau normalize; near duplicate dùng character 5-gram/Jaccard ≥0,90 (câu ngắn kiểm exact). Cùng contributor/entity/scenario/duplicate tạo connected group; pilot và nhóm liên quan ra ngoài final, duplicate trong pool bị loại, duplicate/group chéo pool bị chặn. Split train/validation theo nhóm, không cắt nhóm để ép tỷ lệ. Research gate tính lại sau lọc quyền của **chính môi trường local/Kaggle**: development ≥360, mỗi lớp ≥120; independent test ≥90, mỗi lớp ≥30; ba domain có mặt, double annotation development ≥20%, test 100%, và ngưỡng group/domain×label đã chốt trước trong protocol. Dữ liệu thiếu bằng chứng bị từ chối. CLI chỉ xác minh cấu trúc/assertion; không thể tự chứng thực receipt, người gán nhãn hay PII clearance.

Manifest mới chứa input/output SHA-256, code/requirements/label-map hashes, inventory, versions, counts, exclusions và split checks. Với research, trạng thái chỉ là `AUTOMATED_GATES_PASS_HUMAN_SIGNOFF_REQUIRED`; cần approval của người giữ dữ liệu khớp manifest hash. Test research được ghi vào **thư mục custodian riêng**, không nằm trong thư mục selection. `select` chỉ có train/validation, thử majority + word/char/combined TF-IDF/LR, grid `C={0.5,1,2}`, seed 42; chọn Macro-F1 validation, tie break cố định majority → word → char → combined rồi C nhỏ. `selection.json` lưu cấu hình/hash và ablation configs đã chốt. `evaluate` kiểm manifest/selection/lock hash, refit trên toàn development, mở test riêng một lượt, không chọn lại theo test. Model được dump/reload và so dự đoán. Quyền file và việc chỉ mở test một lần vẫn cần custodian thực thi. Mọi output demo chứa `DEMO_ONLY`, `quality_claim_allowed=false`, `production_eligible=false`; không activate model.

## Lệnh và kết quả thực chạy trên local

Chạy từ `C:\Users\Danh\Downloads\HCH\DACN\travelgo`. Python 3.12 không có sẵn scikit-learn; lần cài pip đầu bị chặn socket (exit **1**), lần cài được duyệt vào thư mục tạm `C:\Users\Danh\Downloads\HCH\.t09-python-deps` đạt exit **0**. Khi chạy model, process đặt `PYTHONPATH` đến thư mục tạm đó; không sửa môi trường ứng dụng. Không truy cập DB.

| Lệnh/kiểm | Exit | Kết quả |
|---|---:|---|
| `python -m unittest ai.research.test_pipeline -q` (với `PYTHONPATH` dependency tạm) | 0 | **9/9 PASS**: duplicate ID/cross-file, group/pilot, label/metadata/date/PII/hash, quarantine report không lộ text, withdrawal/rights Kaggle, annotation/support, selection không nhận test path và vẫn chạy khi holdout file vắng. Toàn bộ row/evidence trong test là `SYNTHETIC_TEST_ONLY`, tạo trong temp; không phải receipt người thật. |
| `python -m ai.research.pipeline prepare --mode demo --output-dir ai/artifacts/t09_demo_snapshot_v7` | 0 | 45 fixture → train 27 / validation 9 / DEMO_HOLDOUT 9; mỗi split 3 lớp, manifest `DEMO_ONLY`. |
| `python -m ai.research.pipeline select --manifest ai/artifacts/t09_demo_snapshot_v7/manifest.json --output ai/artifacts/t09_demo_snapshot_v7/selection.json` | 0 | Chọn **char TF-IDF + LR**, `C=0.5`, validation Macro-F1 **0.5476**. Không đọc text/label holdout. |
| `python -m ai.research.pipeline evaluate --manifest ai/artifacts/t09_demo_snapshot_v7/manifest.json --selection ai/artifacts/t09_demo_snapshot_v7/selection.json --output-dir ai/artifacts/t09_demo_eval_v7` | 0 | DEMO_HOLDOUT Macro-F1 **0.4333**; group-bootstrap CI 95% **[0.0833, 0.7341]** (chỉ minh họa); `reload_parity=true`. Model SHA-256 `04e4d24d2a49b14f3d92989e9f3e3dcaac1b9d6fab79a673499b1354aa19fedc`. |
| `python -m ai.research.pipeline select --manifest ai/evaluation/vietnamese_sentiment_split_manifest.json --output ai/artifacts/t09_should_not_exist_selection.json` | 2 | Chặn manifest lịch sử không đúng schema/protocol; không tạo output. |
| `python -m json.tool ai/research/t09_kaggle_cpu_demo.ipynb` | 0 | Notebook JSON hợp lệ. Chạy tuần tự **3 code cells của notebook ở local** với `T09_SOURCE_ROOT`/`T09_OUTPUT_ROOT` và fixture: exit 0, reload parity true; không phải lượt chạy Kaggle. |

Artifact local: `ai/artifacts/t09_demo_snapshot_v7/{manifest.json,train.jsonl,validation.jsonl,demo_holdout.jsonl,selection.json}` và `ai/artifacts/t09_demo_eval_v7/{evaluation.json,confusion_matrix.png,model_card.md,selected_model_DEMO_ONLY.joblib}`. Code cell notebook local tạo thêm `ai/artifacts/t09_notebook_local_v7/`. Các artifact trong `ai/artifacts` là output kỹ thuật local, không được tính corpus; không chép receipt/token vào đó. Các lượt thử trung gian T09 đã được dọn theo đúng thư mục do T09 tạo, giữ v7 làm bằng chứng.

## Kaggle — bổ sung bằng chứng người dùng cung cấp ngày 30/10/2026

Gói **demo** để attach private Kaggle giữ layout `ai/`: `ai/research/{__init__.py,data.py,pipeline.py,requirements.txt,t09_kaggle_cpu_demo.ipynb}`, `ai/configs/vietnamese_sentiment_label_map.json`, `ai/fixtures/vietnamese_sentiment_demo.jsonl`. Không đưa restricted evidence, consent receipt, withdrawal token/hash, credential, DB export/backup hay corpus thật vào gói này. Phần **local** phía trên là kết quả chạy trước đây và giữ nguyên; phần dưới là kiểm file tải về, không phải lần chạy lại.

**KAGGLE DEMO — PASS theo bằng chứng người dùng cung cấp; chưa xác minh trực tiếp qua tài khoản Kaggle.** Bản HTML `notebook47f7916c6c.html` do người dùng tải về hiển thị trang notebook `Private`, `Version 2 of 2`, `Runtime 28s`, `Language Python` và input `hugo-t09-demo-source`. Cây output hiển thị `t09_demo/evaluation/{confusion_matrix.png,evaluation.json,model_card.md,selected_model_DEMO_ONLY.joblib}`, `t09_demo/snapshot/{demo_holdout.jsonl,manifest.json,train.jsonl,validation.jsonl}` và `t09_demo/selection.json` ở gốc output theo notebook/HTML. Đây là **danh sách hiển thị trong HTML**; chỉ bốn artifact đầu do người dùng gửi đã được kiểm file. HTML không tự xác thực cài đặt quyền riêng tư hiện tại của tài khoản, accelerator hoặc execution log. Ảnh confusion matrix người dùng cung cấp khớp ma trận `[[2,1,0],[1,1,1],[2,0,1]]` trong `evaluation.json`.

`evaluation.json` tải về ghi Python `3.13.15`, NumPy `2.1.3`, scikit-learn `1.6.1`, joblib `1.6.0`, matplotlib `3.10.0`; các phiên bản này lấy từ artifact, **không có trong HTML**. Artifact ghi `data_mode/status=DEMO_ONLY`, `quality_claim_allowed=false`, `production_eligible=false`, selected `char`, support 9, Macro-F1 `0.4333`, `reload_parity=true`. SHA-256 thực tế của joblib **khớp** `model_sha256` trong `evaluation.json`. Hash holdout và ma trận/metric trùng lượt demo local; hash model khác local nhưng **chưa kiểm chứng nguyên nhân**. File tải về tên `model_card.txt`, còn cây HTML ghi `model_card.md`; giữ nguyên tên file tải về, nội dung model card ghi DEMO_ONLY và không cho quality/production claim.

Đã **sao chép, không di chuyển/sửa bản gốc**, 5 file người dùng cung cấp vào `ai/artifacts/t09_kaggle_user_evidence_20261030/`. Hash nguồn/bản sao khớp; [`SHA256SUMS.txt`](../ai/artifacts/t09_kaggle_user_evidence_20261030/SHA256SUMS.txt) trong thư mục này ghi:

| File lưu | SHA-256 |
|---|---|
| `notebook47f7916c6c.html` | `2d6ec2bec3b6994fe97af512cdf5a63c07d5b08a9c8aef8ce66666a4a00a3a22` |
| `selected_model_DEMO_ONLY.joblib` | `5705fc813f44cad4e7134030fc1904e1c7304aa6a885b736cb19b35e8f976b43` |
| `model_card.txt` | `e6952e8d0adde934e3a2c37e0057bbf9f9a3f9ba1b158d35e1bffbbcf469d803` |
| `evaluation.json` | `a7db6a3e54d1e34de38906f1e6e52c0bba98df1f2ab01fa63cccd9f812372de5` |
| `confusion_matrix.png` | `0ba3ea0d85771a503161665102a6a20635f7999611c7b6bb50c658d6da54d42b` |

Không nạp joblib, không chạy lại pipeline/Kaggle và không kiểm account trực tiếp. Chưa kiểm corpus người thật, quyền/consent thật, nhóm/annotation thật, custodian test thật hoặc chất lượng mô hình thực tế. PII regex không tìm hết tên/địa chỉ; near-duplicate O(n²) phù hợp quy mô MVP nhưng cần tối ưu nếu corpus lớn. Approval/selection-lock là handoff có hash, không phải chữ ký mật mã hay bằng chứng consent tự xác thực. CI/metric từ 9 dòng demo không diễn giải thành chất lượng mô hình. Manifest lịch sử vẫn BLOCKED; không upload, train corpus thật, sửa nhãn con người, đổi website/ranking, push hoặc deploy trong cập nhật này.
