# HuGo Intelligence — Implementation Roadmap

> Kế hoạch theo lát dọc có thể demo, không triển khai toàn bộ AI cùng lúc. Ước lượng theo tuần công việc của một đồ án cá nhân; điều chỉnh theo lịch học và quota Kaggle, không coi là cam kết thương mại.

## 1. Baseline kiểm chứng trước khi bắt đầu AI

| Nhóm | Kết quả gần nhất | Phạm vi bằng chứng |
|---|---|---|
| PostgreSQL/PostGIS schema verification | PASS | DB local/test; 4 migrations, 18 app tables, 28 FK |
| Default `.env` database `travelgo_dev` | FAIL verifier | thiếu migration 04; chưa tự apply vì phải kiểm kê/backup trước |
| Migration 01–04 | PASS | tracked trong `schema_migrations` |
| Backend TypeScript build | PASS | lần kiểm tra local trong audit Phase 3.5/2.0 |
| Frontend production build | PASS | lần kiểm tra local trong audit Phase 3.5/2.0 |
| Unit + RBAC tests | PASS | local |
| Recommendation/planner algorithm tests | PASS 11/11 | heuristic, không chứng minh ML quality |
| Intelligence PostgreSQL integration | PASS 7 checks | event validation, auth binding, export/schema behavior |
| Full Phase 3.5 HTTP integration | Historical PASS 12/12; current re-run BLOCKED | seed admin password local hiện không khớp hash cũ; safety policy không reset dữ liệu |
| Three-role Playwright E2E | Historical PASS trong Phase 3.5; chưa chạy lại cho AI | AI UI chưa tồn tại |
| Dependency audit 2026-10-12 | FAIL: backend 2 moderate, frontend 2 moderate; 0 high/critical | fix được npm đề xuất là major/không an toàn để tự áp dụng; cần compatibility milestone |
| English sentiment baseline | PASS research | Macro-F1 0,7572586; không production/Vietnamese |
| Production AI end-to-end | BLOCKED | data/modules chưa đủ |

Không dùng “historical PASS” như bằng chứng một bài vừa chạy. Blocker mật khẩu seed cần xử lý bằng test DB/account lifecycle an toàn ở milestone M0, không reset database đang có.

## 2. P0 — Bắt buộc cho đồ án

### M0 — Reproducible test baseline và data governance (Tuần 1)

**Mục tiêu:** khóa môi trường kiểm thử AI và ngăn train từ dữ liệu sai/PII.

Tasks:

- tạo test DB mới độc lập nếu cần để tránh password/hash state cũ; không xóa DB Phase 3.5;
- bổ sung dataset manifest/license/provenance template;
- chạy AI export read-only, audit PII và notebook 01;
- định nghĩa event/impression/review/price/opening-hours contracts;
- đánh dấu seed/test traffic rõ ràng;
- lưu preferences khi save trip; thiết kế migration mới cho gaps, không sửa migration cũ.

Acceptance:

- full integration chạy lại PASS trên isolated DB hoặc blocker được chứng minh/cô lập;
- export không có credential/direct identifiers và có checksum/manifest;
- notebook 01 committed Kaggle version kết luận PASS/FAIL/BLOCKED đúng dữ liệu;
- `npm audit`, builds, tests, `git diff --check` được ghi thực tế.

### M1 — Telemetry và review truth (Tuần 2)

**Mục tiêu:** tạo dữ liệu huấn luyện tương lai đúng ngay từ đầu.

**Trạng thái: COMPLETE (2026-10-12).** Đây là hoàn tất milestone M1 thuộc P0, không phải hoàn tất toàn bộ P0. Không tạo M1 Task 6; bước kế tiếp là M2-A data gate.

Tasks:

- recommendation response + impression write trong cùng logical request;
- frontend phát render/click/save events với requestId; server chống giả user/duplicate;
- server-side favorite hoặc SAVE/UNSAVE event có source truth;
- review liên kết booking COMPLETED, verified server-side, criteria nullable/provided flags;
- consent/opt-out/data retention và test traffic exclusion.

Acceptance:

- integration test chứng minh impression → click/save/booking attribution;
- unauthorized/forged user/request/business rejected;
- one-booking-one-review/rating 1–5/comment limits PASS;
- privacy test không log raw secret/PII.

Bằng chứng acceptance:

| Tiêu chí | Kết quả | Bằng chứng khóa |
|---|---|---|
| impression → click/save/booking attribution | **PASS** | Task 3: 39 HTTP/PostgreSQL checks; Task 4: visible-impression SAVE/UNSAVE; Task 5 regression PASS |
| unauthorized/forged identity/request/business | **PASS** | Task 2–5 negative-path, cross-user, spoofing và RBAC tests PASS |
| one-booking-one-review; rating 1–5; comment 10–2.000 | **PASS** | Task 5: 75 checks; 6 concurrent creates cho đúng 1 row và 5 HTTP 409 |
| privacy: không log/export raw secret/PII | **PASS** | consent/opt-out, PII rejection/redaction, account deletion và production/test export isolation PASS |

Nguồn bằng chứng chi tiết: `HUGO_AI_M1_TASK1_REPORT.md` đến `HUGO_AI_M1_TASK5_REPORT.md`. Những phần không phải acceptance gap của M1 được giữ đúng milestone: hybrid ranking/relevance evaluation ở M3; price/opening-hours/routing/constraint solver ở M5; aspect sentiment, LTR shadow, memory và moderation/anti-spam nâng cao ở P1.

### M2 — Vietnamese Review Intelligence (Tuần 3–4)

**Mục tiêu:** model ML đầu tiên thực sự của HuGo.

Tasks:

- chọn dataset có license; tạo Vietnamese travel-domain locked test;
- notebook 02 TF-IDF; notebook PhoBERT cho E1 nếu license/quota phù hợp;
- model card/checksum/reload validation;
- FastAPI inference tối thiểu + backend adapter/fallback;
- UI Place insight chỉ hiển thị khi sample/confidence đủ.

Acceptance:

- E1 report có metrics thực, split/hash/license;
- selected model đạt gate notebook 02 hoặc giữ baseline và báo lý do;
- inference parity, malformed input, timeout, artifact checksum tests PASS;
- không gọi English baseline là Vietnamese model;
- với 0 HuGo review, UI hiển thị “chưa đủ dữ liệu”, không tạo summary giả.

### M3 — Explainable Hybrid Recommendation (Tuần 5)

**Mục tiêu:** recommendation P0 đáng tin, không chờ LTR.

Tasks:

- candidate retrieval cho place/hotel/restaurant/tour/ticket theo eligibility;
- feature contract: Bayesian quality, explicit preference, budget, amenities và travel time;
- score config versioned, diversity re-rank;
- ghi impressions; why/limitations/data timestamp;
- notebook 04/05 và golden scenarios E2/E3 ở phạm vi có thể.

Acceptance:

- 100% APPROVED/ACTIVE, ownership/public visibility và budget hard constraints;
- score components tái tạo đúng final rank;
- NDCG/coverage/diversity được báo trên dataset/scenario đã mô tả, không claim online quality;
- cold-start không crash và explanation không dùng review/aspect không tồn tại.

### M4 — Vietnamese Intent + grounded orchestration (Tuần 6)

**Mục tiêu:** người dùng nhập câu Việt, hệ thống tạo request cấu trúc an toàn.

Tasks:

- intent/slot schema, normalization tiền/ngày/người/địa danh;
- rule baseline + local model hoặc provider adapter;
- clarification và conversation state có consent/TTL;
- tool allowlist: search/recommend/plan/replan/explain/route;
- E10 locked test.

Acceptance:

- đạt gate E10 hoặc UI dùng structured form fallback;
- missing/ambiguous critical slots luôn hỏi lại;
- invalid tool calls/arbitrary SQL/direct booking/payment = 0;
- mọi fact trong response trace được tới structured result.

### M5 — GIS routing + constrained itinerary/budget (Tuần 7–8)

**Mục tiêu:** route thật trên Leaflet và lịch trình khả thi.

Tasks:

- thu thập opening hours, duration, price unit/source cho demo catalog;
- routing adapter + ORS local/test key + cache/circuit breaker;
- route matrix + OR-Tools/constraint solver;
- actual/estimated/unknown costs; three budget modes;
- GeoJSON polyline từng ngày; reorder/remove/recalculate;
- E5/E8/E9.

Acceptance:

- route geometry hiển thị trực tiếp, key không lọt frontend;
- zero fabricated ETA/price và zero hard-constraint violation trên golden suite;
- provider outage/unknown price/infeasible schedule có typed result và UX đúng;
- attribution/terms/quota controls PASS.

### M6 — End-to-end defense demo (Tuần 9)

Scenario bắt buộc:

1. Customer nhập câu Việt về chuyến đi.
2. Hệ thống parse và yêu cầu xác nhận slot thiếu.
3. Candidate APPROVED được xếp hạng, giải thích quality/fit/limitations.
4. Planner tạo phương án tiết kiệm/cân bằng/thoải mái.
5. Leaflet vẽ route thật từng ngày.
6. Customer sửa stop, route/budget được tính lại.
7. Save Trip, refresh/reopen không mất state.
8. Events/impressions/model/route versions được lưu đúng.

Acceptance:

- backend/frontend build, unit, PostgreSQL integration, security, AI contract, GIS and Playwright E2E đều PASS;
- notebook/model/report có committed versions và checksum;
- demo hoạt động khi model/provider lỗi bằng fallback trung thực;
- slide/report chỉ chứa số đã đo.

## 3. P1 — Nâng cao sau P0

### M7 — Aspect sentiment và richer explanations

- Notebook 03, domain taxonomy, aspect support/confidence.
- E6; explanations chỉ dùng evidence có support.
- Place comparison cùng feature/time/source.

### M8 — Learning-to-Rank shadow

- Chỉ mở khi data gate đạt; notebook 06.
- LambdaMART, exposure/position bias analysis, chronological evaluation.
- SHAP cho model attribution, không gọi causal explanation.
- Shadow deployment và manual promotion/rollback.

Nếu data gate không đạt vào hạn đồ án, M8 giữ trạng thái BLOCKED và trình bày instrumentation/design; không sinh click giả.

### M9 — Conversation memory và route recalculation

- state có TTL/consent, preference profile xem/sửa/xóa;
- incremental replan, stale request cancellation;
- analytics dashboard cho data/model/route health.

## 4. P2 — Mở rộng thương mại

- demand forecasting khi có ≥12 tháng dữ liệu phù hợp;
- collaborative filtering/embeddings ở scale;
- continuous training với approval, drift/quality/privacy gates;
- real-time personalization có experimentation platform;
- multi-objective pricing **research only**, không tự thay giá/tồn kho;
- self-host routing/tiles khi TCO/SLA có lợi;
- advanced observability: data drift, feature freshness, model/route/cost dashboards.

## 5. Work breakdown theo thành phần

| Component | P0 deliverable | Không làm trong P0 |
|---|---|---|
| Database | new additive migrations, provenance/telemetry/review truth | rewrite schema toàn bộ |
| Backend Node | orchestrator, RBAC, adapters, impressions/events | cho Python/LLM truy cập DB tùy ý |
| Python | versioned inference + constraint optimizer | autonomous booking agent |
| Kaggle | 00–05, 08–09 theo data; 06/07 gated | train model chỉ vì GPU còn quota |
| Frontend | Customer AI planner/map/explain | redesign toàn Partner/Admin |
| GIS | hosted adapter P0, truthful fallback | production-scale tile/routing cluster |
| LLM/NLU | schema parse/grounded phrasing optional | pretrain LLM lớn |

## 6. API delivery order

1. Hoàn thiện existing `/api/intelligence/events` + client SDK.
2. `/api/intelligence/recommendations` với server impression logging.
3. `/api/places/:id/intelligence`.
4. `/api/intelligence/intents/parse`.
5. `/api/intelligence/routes` và internal matrix.
6. `/api/intelligence/itineraries` + `/:id/replan`.

Mỗi endpoint có OpenAPI/schema, auth/ownership, idempotency, rate limit, size limit, structured errors và contract tests trước UI.

## 7. Model lifecycle

```text
Kaggle committed run
  → manual artifact download
  → checksum/license/dependency review
  → local parity test
  → registry DRAFT
  → integration/security/load test
  → SHADOW
  → manual ACTIVE
  → monitor / rollback previous ACTIVE
```

Không để API tự tải model “latest”. Version phải explicit và immutable. Chỉ một ACTIVE version mỗi model type; activation nằm trong transaction/audit log ở implementation sau.

## 8. Rủi ro và phương án giảm thiểu

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Thiếu review/behavior thật | Rất cao | P0 rule baseline + licensed research data + instrumentation; giới hạn claim |
| Dataset/license không rõ | Cao | dataset registry, legal/license gate; bỏ nguồn không rõ |
| Neutral/aspect Vietnamese yếu | Cao | domain test, error analysis, abstention/support threshold |
| Position/exposure bias | Cao | log impressions; exposed negatives; shadow/randomized research có guardrail |
| Route provider quota/outage | Cao | adapter, cache, circuit breaker, truthful fallback, self-host benchmark |
| Price/opening hours thiếu | Cao | partner data workflow; unknown status; không impute như fact |
| LLM hallucination/tool abuse | Cao | schema, grounding, allowlist, confirmation, no SQL |
| PII lên Kaggle | Rất cao | read-only anonymized export, checklist, private dataset, re-identification review |
| Model artifact supply chain | Cao | checksum/allowlist/locked deps; không load untrusted pickle |
| Scope quá lớn | Cao | P0 vertical slice, giữ M8/P2 gated |

## 9. Các lệnh cho milestone đầu tiên

Chạy từ `C:\Users\Danh\Downloads\DACN\travelgo`; thay giá trị database bằng test DB mới đã xác nhận. Không trỏ production.

```powershell
# 1. Kiểm tra repo và Docker, không thay đổi dữ liệu
git status --short
docker ps

# 2. Backend baseline
cd backend
npm ci
npm run build
npm run test
npm run test:algorithm

# 3. Schema test DB đã xác nhận qua .env local
npm run db:verify
npm run test:intelligence

# 4. Export AI read-only; đọc manifest trước khi upload
npm run ai:export

# 5. Frontend baseline
cd ..\frontend
npm ci
npm run build
npm run test:e2e
npm audit

# 6. Repository hygiene
cd ..
git diff --check
```

Không chạy migration/seed trước khi xác nhận `DB_HOST`, `DB_PORT`, `DB_NAME`, schema tracking và backup policy. Không dùng `sequelize.sync({force:true})`.

## 10. Definition of Done cho HuGo Intelligence P0

P0 chỉ COMPLETE khi đồng thời:

- six design/audit documents được review và source truth còn đúng;
- data contracts/privacy/license gates PASS;
- Vietnamese ML model có measured domain test, version/checksum/model card;
- explainable hybrid baseline có offline/golden evaluation;
- Vietnamese intent parser có locked test;
- road routing + constrained itinerary + budget thật hoạt động trên Leaflet;
- impression/event/save/review truth được persist;
- end-to-end Customer demo và failure paths PASS trên PostgreSQL/PostGIS thật;
- security/RBAC/ownership/dependency audit/build/tests PASS;
- không có con số mô phỏng bị trình bày là thực nghiệm thật.

Trạng thái ngày 2026-10-12: **M0 COMPLETE và milestone M1 thuộc P0 COMPLETE; toàn bộ HuGo Intelligence P0 chưa COMPLETE vì M2–M6 chưa đạt acceptance. Bước đúng tiếp theo là M2-A data/license/provenance/PII gate; chỉ bắt đầu M2-B khi gate PASS.**
