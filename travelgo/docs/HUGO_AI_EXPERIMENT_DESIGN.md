# HuGo AI — Experiment Design

## 1. Quy tắc nghiên cứu

1. Viết hypothesis, primary metric, split và gate trước khi xem test result.
2. Tách train/validation/test; test set khóa không dùng tuning.
3. Lưu dataset/code/model version, seed, environment và checksum.
4. Báo point estimate cùng confidence interval khi có đủ mẫu.
5. So sánh paired trên cùng queries/users/folds khi có thể.
6. Báo cả kết quả âm; không đổi metric/gate sau khi model thua.
7. Synthetic/demo data chỉ kiểm code/constraint, không chứng minh hiệu quả thực tế.
8. Không báo PASS cho thí nghiệm chưa chạy.

## 2. Trạng thái kết quả hiện có

| Bằng chứng | Status | Kết quả |
|---|---|---|
| English TF-IDF sentiment baseline | PASS research pipeline | Macro-F1 0,7572586 trên test 1.941; neutral yếu |
| Vietnamese TF-IDF vs PhoBERT (E1) | NOT RUN |
| Average vs Bayesian (E2) | Unit/algorithm có; experiment chưa chạy | Không có outcome-independent dataset để kết luận tốt hơn |
| E3–E10 | NOT RUN/BLOCKED tùy dữ liệu | Không có số liệu hiệu quả |

Không dùng kết quả English baseline làm kết quả E1 vì E1 yêu cầu tiếng Việt và so sánh hai model trên cùng split.

## 3. Protocol chung

### 3.1 Dataset registry

Mỗi run tham chiếu `dataset_version` bất biến gồm source/revision/license, filter, row IDs pseudonymous, split hash và data cutoff. Mọi row seed/test HuGo bị gắn cờ và loại khỏi claim người dùng thật.

### 3.2 Repeated runs

- Linear deterministic model: ít nhất 3 seeds nếu sampling/tuning thay đổi.
- Neural model: ít nhất 5 seeds nếu quota cho phép; nếu chỉ 3, báo giới hạn.
- Ranking: bootstrap theo query/request, không theo item row độc lập.
- Time series: rolling-origin folds.

### 3.3 Statistical reporting

- Classification: stratified/bootstrap 95% CI cho Macro-F1; McNemar cho paired error nếu assumptions phù hợp.
- Ranking: paired bootstrap/permutation trên per-query NDCG.
- Route/budget: paired Wilcoxon hoặc bootstrap difference vì distribution thường lệch.
- User study: effect size + CI; ordinal Likert dùng phân tích phù hợp, không chỉ average.
- Multiple comparisons: Holm correction trong cùng family.

Không biến `p < 0.05` thành bằng chứng giá trị sản phẩm; effect size, constraint và lỗi nghiêm trọng vẫn là gate.

## 4. E1 — TF-IDF vs PhoBERT cho Vietnamese sentiment

**H1:** PhoBERT tăng Macro-F1 trên travel-domain test so với TF-IDF mà latency vẫn trong ngân sách được đo.

- Data: cùng train/val/test Vietnamese; group by normalized duplicate/entity/source.
- Models: TF-IDF Logistic Regression đã tuning trên val; PhoBERT fine-tune cùng label map.
- Primary: Macro-F1 travel-domain test.
- Secondary: per-class recall/F1, calibration/ECE, latency p50/p95, throughput, peak RAM/VRAM, model size.
- Slices: hotel/restaurant/attraction, text length, dấu/không dấu, negation, code-switch.
- Gate: PhoBERT chỉ được chọn nếu improvement có CI phù hợp và không vi phạm license/latency; nếu gain nhỏ, TF-IDF là lựa chọn P0 hợp lý.
- Status: **BLOCKED** cho đến khi dataset/license và Vietnamese domain test sẵn sàng.

## 5. E2 — Average Rating vs Bayesian Average

**H2:** Bayesian giảm biến động/xếp hạng quá cao của item ít review mà vẫn giữ utility trên item đủ mẫu.

- Unit: item-time snapshot; không lấy cùng future reviews làm feature và outcome.
- Baselines: raw mean; Bayesian hiện tại `m=10, C=4.20`; sensitivity grid cho m/prior chỉ trên validation.
- Outcomes: future mean after minimum new reviews, completed-booking satisfaction hoặc expert pairwise judgments; không dùng chính current stars làm cả feature và ground truth duy nhất.
- Primary: rank correlation/NDCG với future/independent outcome.
- Stability: rank movement khi thêm 1–5 reviews; bootstrap interval coverage.
- Gate: giảm small-n top-rank errors, không giảm metric chính có ý nghĩa; explanation minh bạch.
- Status: **BLOCKED** vì 0 internal reviews và không có future outcome.

## 6. E3 — Bayesian vs Hybrid Recommendation

**H3:** Hybrid tăng relevance theo query/preference so với quality-only và giữ hard constraints.

- Queries: bộ scenario khóa gồm budget, city, category, interests, travelers; judgments do ≥2 annotators nếu có.
- A: Bayesian descending.
- B: weighted hybrid quality/preference/budget/route.
- Primary: NDCG@10.
- Secondary: P@5, Recall@10, catalog coverage, diversity, new-item coverage.
- Guardrails: eligibility/budget/availability satisfaction = 100%; no hidden test data.
- Status: **PARTIAL/BLOCKED** — algorithm có nhưng catalog 6 approved places quá nhỏ cho kết luận tổng quát.

## 7. E4 — Hybrid vs LightGBM Ranker

**H4:** LambdaMART tăng NDCG trên chronological holdout mà không giảm coverage/constraints/cold-start.

- Chỉ chạy sau data gate ≥10k valid impressions, ≥500 consented sessions/users, ≥4 tuần và sufficient positive labels.
- Group: request ID; label hierarchy pre-registered.
- Debias: exposed candidates only; position diagnostics/propensity; feature availability point-in-time.
- Split: train past, validation middle, test future; new-user/new-item holdouts.
- Primary: NDCG@10 paired bootstrap.
- Guardrails: constraints 100%, coverage not materially worse, protected/sensitive feature không sử dụng trái mục đích.
- Deployment: shadow first; online A/B separate experiment.
- Status: **BLOCKED** — 0 impressions.

## 8. E5 — Có và không có GIS constraints

**H5:** Road-time/opening-hour constraints giảm itinerary infeasible và travel burden so với geo heuristic.

- A: current Haversine clustering/straight-line schedule.
- B: same candidates/ranker + real route matrix, opening hours, dwell/buffer constraints.
- Test: golden trips 1–5 ngày, city density/travel modes/budgets khác nhau.
- Primary: feasible itinerary rate.
- Secondary: road travel minutes, schedule violations, number/utility stops, compute latency.
- Human review: local/domain reviewer kiểm route realism trên sample khóa.
- Gate: zero hard violation; B tăng feasibility; provider route failures được báo.
- Status: **BLOCKED** — routing engine chưa có, opening hours 100% thiếu.

## 9. E6 — Có và không có review aspects

**H6:** Aspect features tăng relevance cho query cụ thể (“yên tĩnh”, “sạch”, “phục vụ tốt”) hơn overall sentiment/quality.

- A: quality + overall sentiment.
- B: A + aspect presence/sentiment/support/confidence.
- Queries: aspect-targeted test; judgment không thấy model output.
- Primary: NDCG@5 trên aspect queries.
- Secondary: explanation factual precision, unsupported-aspect hallucination rate.
- Guard: không hiển thị aspect nếu support/confidence dưới threshold.
- Status: **BLOCKED** — chưa có aspect model/dataset HuGo.

## 10. E7 — Ranking có/không explainability

**H7:** Evidence-based explanation tăng decision confidence/trust calibration mà không làm người dùng hiểu sai score.

- UI A: danh sách + score components tối thiểu.
- UI B: A + why/limitations/sample size/updated time/comparison.
- Không thay ranking giữa A/B.
- Participants: ghi tiêu chí tuyển, consent, experience; randomize/counterbalance.
- Tasks: chọn restaurant/hotel/itinerary trong scenario.
- Primary: decision quality theo predefined answer/constraint hoặc calibrated confidence.
- Secondary: completion time, comprehension quiz, trust Likert, perceived usefulness.
- Safety: hỏi riêng khả năng nhận ra “ít review/unknown price”.
- Gate: explanation factual error = 0; comprehension không giảm; effect/CI được báo.
- Status: **NOT RUN**.

## 11. E8 — Route optimization vs baseline

**H8:** Optimizer giảm road duration/distance so với nearest-neighbor/current order trong khi giữ cùng required stops/time windows.

- A: current order hoặc nearest-neighbor baseline.
- B: OR-Tools constrained solution với cùng route matrix.
- Instances: small/medium stop counts, realistic/unreachable/time-window cases.
- Primary: total route duration for feasible paired instances.
- Secondary: distance, solver time, optimality/status, feasible rate.
- Không bỏ stop để “thắng” trừ khi objective và penalty quy định giống nhau.
- Gate: 100% hard constraint; median improvement báo cùng CI; time-limit fallback hợp lệ.
- Status: **BLOCKED** — route matrix/optimizer chưa triển khai.

## 12. E9 — Budget optimizer vs baseline

**H9:** Multi-option optimizer tăng preference utility dưới budget so với phân bổ/giá mặc định hiện tại.

- A: current heuristic costs/defaults.
- B: actual/estimated/unknown-aware solver; ba modes.
- Primary: feasible budget rate trên scenarios có price truth.
- Secondary: utility, unpriced-item rate, reserve preserved, compute time.
- Critical: không tính unknown = 0; report min/expected/max hoặc infeasible uncertainty.
- Gate: zero budget violation trên actual-price set; mọi estimate có source/status.
- Status: **BLOCKED** — price unit/source chưa đủ.

## 13. E10 — Vietnamese intent understanding

**H10:** schema-guided NLU trích intent/slots đủ chính xác cho planner và biết hỏi lại khi thiếu/mơ hồ.

- Dataset: câu Việt tự nhiên do nhiều người viết, paraphrase, typo, không dấu, code-switch; synthetic gắn cờ và không chiếm toàn bộ test.
- Split theo template/author để tránh leakage.
- Models: rule baseline; local classifier/NER; optional LLM provider behind same schema.
- Primary: intent Macro-F1 và slot micro/macro F1/exact-value accuracy.
- Dialogue: joint goal accuracy, clarification accuracy, invalid tool-call rate.
- Safety: booking/payment action without confirmation = 0; invented entity/value = 0.
- Latency/cost: p50/p95 và cost/request cho provider.
- Gate P0 đề xuất: intent Macro-F1 ≥0,90, critical slot F1 ≥0,90, exact full-frame ≥0,80 trên locked test; mọi required-missing case hỏi lại. Gate có thể điều chỉnh **trước** test sau pilot.
- Status: **NOT RUN**.

## 14. Thiết kế online experiment tương lai

Chỉ sau offline/shadow/security gates:

- randomization unit: user hoặc stable anonymous session, tránh cross-arm contamination;
- primary product metric: qualified save/booking conversion tùy maturity, không dùng click đơn độc;
- guardrails: cancellation/error/latency, diversity/coverage, complaint, budget violation;
- sample size/power tính trước từ baseline thật; không peeking hàng ngày để dừng tùy tiện;
- exclude team/bot/test traffic;
- exposure logging bắt buộc; assignment immutable và audit được;
- có kill switch và rollback model version.

Với đồ án chưa có traffic, không được mô phỏng A/B rồi trình bày như online result. Thay bằng offline + blinded human evaluation và ghi đúng giới hạn.

## 15. Error analysis chuẩn

Mỗi thí nghiệm tạo tối thiểu:

- top false positives/negatives theo confidence;
- confusion/slice table và support;
- leakage/duplicate audit;
- examples model disagreement;
- model/data/annotation error taxonomy;
- impact severity và action; không sửa test labels chỉ vì model sai trừ khi audit có quy trình độc lập.

## 16. Báo cáo kết quả

Mẫu bắt buộc:

```text
Experiment ID / date:
Hypothesis & preregistered gate:
Dataset version / license / split hash:
Code + model checksum:
Environment / seed(s):
Primary metric + 95% CI:
Secondary metrics / slices / latency:
Statistical test and assumptions:
Failure/error analysis:
PASS / FAIL / BLOCKED:
Decision and limitations:
```

## 17. Ma trận phụ thuộc

| Experiment | Phụ thuộc | Có thể làm sớm? |
|---|---|---|
| E1 | Vietnamese licensed dataset + domain test | Có, sau data audit |
| E2 | Internal reviews + future/independent outcomes | Chưa |
| E3 | Expanded approved catalog + judgments | Có bản nhỏ, giới hạn claim |
| E4 | Impression/outcome telemetry | Chưa |
| E5 | Routing + opening hours/durations | Sau GIS milestone |
| E6 | Aspect model/support | Sau E1/E3 notebook |
| E7 | Stable UI + evidence explanations | Sau recommendation slice |
| E8 | Route matrix + solver | Sau GIS adapter |
| E9 | Price truth/unit/source | Sau data contract |
| E10 | Intent schema + locked Vietnamese set | Có thể song song sau P0 data contracts |

Ưu tiên bảo vệ đồ án: E1, E3 (với giới hạn), E5, E8, E9, E10 trước; E4 và forecasting chỉ làm khi dữ liệu thật đạt gate.

