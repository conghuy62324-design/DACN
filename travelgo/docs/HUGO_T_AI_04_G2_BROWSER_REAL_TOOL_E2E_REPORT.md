# T-AI-04-G2-BROWSER-AND-REAL-TOOL-E2E

Ngày **11/11/2026**, Asia/Ho_Chi_Minh. **BLOCKED_HARNESS_AND_DATA_READINESS — chưa hoàn tất LIVE E2E.** Đã chạy browser desktop thật qua backend Agent/Verified History/consent read/PostgreSQL thật: **6 kiểm tra PASS**. Kiểm tra reset thứ bảy bị **lỗi harness do tôi tạo**, chặn trước production reset endpoint; đã dừng theo stop condition. **0 native Ollama POST: 0 load-only, 0 inference; không retry hoặc tiếp tục LIVE sau lỗi.**

Các case inference E01/E07 **NOT RUN do harness blocker**; E02 hoàn tất Planner và E03–E06 **NOT RUN / BLOCKED_DATA_READINESS**. Không có raw NLU, Agent tool invocation hoặc mobile LIVE để nghiệm thu. PostgreSQL chỉ đọc, **fingerprint 25/25 bảng trùng, 27 Trip giữ nguyên**. Source/historical evidence nguyên vẹn. Sau khi dừng: frontend unit **49/49**, mocked browser **74/74**, backend **68/79/61/42/52** PASS, hai build PASS; legacy giữ **145 PASS /36 FAIL**, controls **176/5**. P1 NLU/P2 runtime **OPEN**.

## 1. Owner approval và phạm vi

[Owner task nguyên văn](evidence/t-ai-04-g2-browser-real-tool-e2e/owner-task.txt) cho phép tối đa **8 POST local**, gồm tối đa1 conditional load-only và7 inference, không retry; database **`travelgo_ai_m0_test` READ-ONLY**, không fixture/seed/mutation/source FIX. Chỉ bật G2 trong process local của harness, không sửa `.env` dùng chung/deploy. Không commit/push/migration/reset/truncate.

Đã đọc năm báo cáo baseline được yêu cầu: Frontend Integration/Logout, Verified History, LIVE Multi-turn, Natural Correction/Enum Investigation, Compatibility/V2 Readiness; đối chiếu frontend Agent/Auth/Consent, backend router/store/provider/tools, Catalog/Planner và DB guards. Giữ nguyên frontend49/49, mocked74/74, backend68/79/61/42/52, legacy145/36, candidate B chưa áp dụng và P1/P2 OPEN.

## 2. Preflight và manifest trước mọi native POST

[GET/read-only preflight](evidence/t-ai-04-g2-browser-real-tool-e2e/preflight-recheck.json), [builds trước run](evidence/t-ai-04-g2-browser-real-tool-e2e/preflight-builds.json), [data readiness](evidence/t-ai-04-g2-browser-real-tool-e2e/data-readiness.json), [manifest](evidence/t-ai-04-g2-browser-real-tool-e2e/manifest.json), [lock](evidence/t-ai-04-g2-browser-real-tool-e2e/manifest-lock.json).

Manifest SHA-256: **`d56a88264b19d12b0944b2445599e2891761745c7f19dd2852438a5c7419272c`**. Khóa exact input, viewport, principal, action/revision, raw expected, tool/service result, body template/hash, conditional load, quota và stop conditions trước POST. Chỉ phân bổ **2 inference**: E01 desktop search và E07 mobile search. **5 inference slots không phân bổ**, không chuyển sang probe khác để lấp số case. Chuỗi dự kiến15 main quota turns +1 conservative operator entry; secondary ownership-negative1 turn, không inference.

Conversation ID chỉ được bind từ response server; UUID mới từ frontend được kiểm unique tại dispatch. Body template/hash và quy tắc bind được khóa; mỗi request đến router harness phải khớp exact method/path/body và ghi hash trước dispatch. Exact native bodies được dựng **OFFLINE_CAPTURE_ONLY** qua production provider với injected capture fetch; không gọi Ollama, không phải kết quả NLU. Hai body files và hashes trong manifest được giữ nguyên.

**Lỗi authoring preflight đã sửa trước run, không che evidence:** [initial preflight](evidence/t-ai-04-g2-browser-real-tool-e2e/preflight-initial.json) dừng do SQL hook harness đọc `query.sql` tại `beforeQuery`, trong khi Sequelize chỉ gán field đó sau hook. Giữ [harness ban đầu](evidence/t-ai-04-g2-browser-real-tool-e2e/readonly-db.initial.cjs); đổi guard harness sang kiểm đối số SQL thật tại `sequelize.query`, giữ default READ ONLY và SELECT/SHOW allowlist. Recheck PASS; chưa có native POST, không đổi production/expected.

## 3. Auth, principal và quota

Dùng đúng approved principal từ [historical E04-B](evidence/t-ai-04-e-final/run-20261109T041645807Z-ae626a88/attempt-E04-B.json), principal SHA-256 **`6b982d095bc6bc30c87955cd38c78afa9ef31d3447ef30f62e8684bbe8bce600`**. DB không có account cho UUID này; không tạo account hoặc đọc mật khẩu/tài khoản thật.

Theo ngoại lệ task cho phép, dùng **test-signed JWT qua production `authenticate`/tokenService thật**. Harness `GET /api/auth/me` chiếu synthetic signed claims để bootstrap AuthContext, không gọi AuthService.getById/login DB. Đây **không phải real-login E2E**. Endpoint Agent production, consent read, proof/state/gates thật; không Playwright route mocking. Secondary là UUID ownership-negative đã có trong manifest G2 LIVE trước, chỉ dùng kiểm404, không thay principal để chạy model/quota.

Ledger đọc **cả `at` và `createdAt`**, lấy mốc mới nhất, không future entry/unreadable record. Ban đầu main recent0, còn20; default AgentLimits giữ nguyên, không reset/bypass. Thực tế consume **main4 / secondary1**, operator0. Main có4 conservative rolling entries của task, còn16 tại final review. D-RESET bị harness chặn **trước quota**, không nhận là reset đã consume. Mọi `attempt-*` và request/error giữ riêng; không double count native ledger. [Reviewed accounting](evidence/t-ai-04-g2-browser-real-tool-e2e/results-reviewed.json).

## 4. Ollama readiness và POST ledger

GET thật xác nhận Ollama local có phản hồi, listener process `ollama` tại **127.0.0.1:11434**. Installed model **`qwen3:4b-instruct-2507-q4_K_M`**, digest **`0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`**; không remote model metadata, proxy env hoặc Gemini/cloud. [Preflight](evidence/t-ai-04-g2-browser-real-tool-e2e/preflight-recheck.json). Đây là URL/env/process/metadata verification, không packet capture toàn hệ điều hành.

Model **nonresident** tại GET preflight. Conditional load đã được khóa nhưng **không tới bước thực hiện**, vì reset guard dừng trước đó. Không load để “thử thêm” sau stop. Cấu hình production JSON/stream false/temperature0/context16384/predict2048/deadline15000ms/concurrency1 không đổi; original schema/Ajv/runtime validation không đổi.

| POST class | Owner cap | Phân bổ | Thực tế |
|---|---:|---:|---:|
| Conditional operator load-only | 1 | ≤1 | **0** |
| Inference | 7 | 2 | **0** |
| Tổng native POST | 8 | ≤3 | **0** |

[Final native audit](evidence/t-ai-04-g2-browser-real-tool-e2e/native-final-audit.json): không `ollama-attempt-*`, provider calls0, native POST log rows0; log byte offset trước/sau đều216826. Không hidden warm-up, retry hoặc inference sau stop. API `/agent/chat` deterministic không đồng nghĩa native POST.

## 5. PostgreSQL guards, sentinel và fingerprint

[DB preflight](evidence/t-ai-04-g2-browser-real-tool-e2e/db-preflight.json), [run preflight](evidence/t-ai-04-g2-browser-real-tool-e2e/db-run-preflight.json), [final guard](evidence/t-ai-04-g2-browser-real-tool-e2e/db-final-guard.json).

| Guard | Thực tế |
|---|---|
| Configured endpoint | `127.0.0.1:5432`, DB `travelgo_ai_m0_test`, role `postgres` |
| Server identity | Exact DB/role; server address `172.18.0.2/32`, port5432 qua local endpoint |
| Sentinel | `hugotravel-isolated-test-database-v1` PASS |
| Migrations | **12/12** DB checksum = SQL file = approved baseline T-AI-03-A |
| Schema | Before/final information_schema column fingerprint trùng |
| Write guard | `ALLOW_TEST_DB_WRITES=false`; startup/default READ ONLY, afterConnect verify `read_only=on`; ORM chỉ SELECT/SHOW |
| Quyền role | `postgres` có superuser; không phải dedicated least-privilege readonly role. Session/SQL/route guards giới hạn run này; không thay grants/role/schema |
| Public catalog | Đọc qua production RecommendationRepository/PlaceRepository, không synthetic loader |

Không expose DB mutation API trong server test; Agent reset/revoke nếu chạy chỉ là memory, không DB write. Không thử INSERT thất bại để chứng minh readonly. [Role/enforcement](evidence/t-ai-04-g2-browser-real-tool-e2e/db-role-and-enforcement.json).

[Before](evidence/t-ai-04-g2-browser-real-tool-e2e/fingerprint-before.json), [after LIVE stop](evidence/t-ai-04-g2-browser-real-tool-e2e/fingerprint-after.json), [final sau regression](evidence/t-ai-04-g2-browser-real-tool-e2e/fingerprint-final.json), [final compare](evidence/t-ai-04-g2-browser-real-tool-e2e/fingerprint-final-compare.json): **25/25 bảng trùng**, changed=[], `trip_sessions` **27→27**. **0 DB fixture,0 mutation**, không cleanup SQL. Đây là snapshot thực, không lấy baseline cũ làm PASS mới.

## 6. Browser desktop/mobile và các case E01–E07

[Single-use LIVE harness](evidence/t-ai-04-g2-browser-real-tool-e2e/run-live.cjs) dùng Edge headless, actual React/Vite `127.0.0.1:3354` → actual HTTP proxy → Express `127.0.0.1:3355` → production Agent router/auth/service. `VITE_API_URL=/api`, proxy target test server và G2 chỉ đặt trong child/runtime riêng. **Không Playwright route mocking** ở run này. Test-signed identity bootstrap đã tách rõ ở mục3.

| Case | Kết quả thực tế |
|---|---|
| E01 desktop real search | **NOT RUN — HARNESS_BLOCKED** trước conditional load/inference |
| E02 incomplete→complete Planner | **Partial deterministic PASS D01/D02**; complete plan **NOT RUN / BLOCKED_DATA_READINESS**, không nhận toàn E02 PASS |
| E03 budget correction | **NOT RUN / BLOCKED_DATA_READINESS**, inferenceAllocated0 |
| E04 natural transport correction | **NOT RUN / BLOCKED_DATA_READINESS**, không có raw để chấm P1 |
| E05 manual confirmation LIVE | **NOT RUN / BLOCKED_DATA_READINESS**; chỉ thấy controls qua deterministic response, không click để tạo inference ngoài manifest |
| E06 destination/date correction | **NOT RUN / BLOCKED_DATA_READINESS** |
| E07 mobile real search | **NOT RUN — HARNESS_BLOCKED**, chưa mở mobile LIVE context |

Desktop1440×900 đã nhập/gửi hai turn thật, opt-in G2, thấy needs_input/confirmation controls, không horizontal overflow. [D01 screenshot](evidence/t-ai-04-g2-browser-real-tool-e2e/D01.png), [D02](evidence/t-ai-04-g2-browser-real-tool-e2e/D02.png), [reset khi bị harness chặn](evidence/t-ai-04-g2-browser-real-tool-e2e/D-RESET.png). Global telemetry consent chưa có DB decision nên panel hiện theo source thật; không bấm lưu consent vì đó là DB mutation ngoài scope, không giấu panel/CSS/mock hasDecision. Dùng scroll/click bình thường, không force click. G2 retention acknowledgement tách biệt với panel này.

Mobile390×844 **chỉ được regression MOCK_ONLY 37/37**, không nhận là mobile LIVE PASS.

## 7. G1/G2 conversation và request/response thật

[HTTP events](evidence/t-ai-04-g2-browser-real-tool-e2e/http-events.json), `dispatch-*.json` và `case-*.json` giữ method/path/body/hash, response, committed slots và source origin; không lưu Authorization/JWT.

| Check | Actual HTTP / metadata | Kết quả |
|---|---|---|
| [D01](evidence/t-ai-04-g2-browser-real-tool-e2e/case-D01.json) |200; server-created ID, revision1; SET destination Đà Nẵng, thiếu departure/dates/adults/budget/transport | **PASS** |
| [D02](evidence/t-ai-04-g2-browser-real-tool-e2e/case-D02.json) |200; cùng ID/revision2; SET Huế→Đà Nẵng,2036-04-22→23,2 adults,6400000; transport OMITTED; exact missingFields `transportation` | **PASS** |
| [N-STALE](evidence/t-ai-04-g2-browser-real-tool-e2e/case-N-STALE.json) |409 `AGENT_G2_REVISION_CONFLICT`, revision1 không ghi đè2 | **PASS** |
| [N-REPLAY](evidence/t-ai-04-g2-browser-real-tool-e2e/case-N-REPLAY.json) |409 `AGENT_G2_REPLAY`, reuse D02 UUID chỉ trong negative đã khóa | **PASS** |
| [N-HISTORY](evidence/t-ai-04-g2-browser-real-tool-e2e/case-N-HISTORY.json) |400 `AGENT_G2_CLIENT_HISTORY_REJECTED`, history giả không cấp proof; quota0 | **PASS** |
| [N-OWNER](evidence/t-ai-04-g2-browser-real-tool-e2e/case-N-OWNER.json) |404 `AGENT_G2_SESSION_UNAVAILABLE` cho negative principal, không metadata leak | **PASS** |
| [D-RESET](evidence/t-ai-04-g2-browser-real-tool-e2e/case-D-RESET.json) |500 do request guard harness trước production router; quota0 | **HARNESS_FAIL**, application reset **NOT EVALUATED** |

Hai main turn mới đều fresh UUID, G2 body chỉ message+conversation. Native/provider/tool calls đều0, origin lần lượt SERVER_COMPLETENESS và VERIFIED_HISTORY_COMPLETENESS. UI giữ needs_input, wording neutral về phương tiện; không tự gọi Planner/auto-resend. **Không cộng hai response deterministic thành raw NLU PASS.**

G1 stateless sau chuyển mode, reset thành công/revoke/logout/reload/expiry/in-flight race **chưa tới bước LIVE**. Chỉ được bảo đảm bởi các regression offline riêng, không chuyển chúng thành actual run PASS.

## 8. Raw NLU

**NOT RUN / NOT EVALUATED**: raw-returned0, schema-evaluated0, semantic-compared0. Không có timeout model hoặc raw malformed để chấm; không gán harness500 thành NLU FAIL. Không sửa prompt, schema, provider, model, benchmark hoặc expected. Các raw FAIL/P1 lịch sử giữ nguyên, không tái dùng làm output mới.

## 9. Execution gate và tool invocation

Provider calls **0**, original merged-proof gate calls cho model decisions **0**, Agent tool invocations **0**. Safety của sáu kiểm tra đã chạy PASS: incomplete không inference/tool, history/replay/stale/cross-owner fail closed, không mutation/unauthorized execution. Guard chặn reset trước ứng dụng là fail-closed của harness, **không chứng minh production reset hoặc full model→gate→tool safety đã PASS**. Backend68/79/61/42/52 offline kiểm gate thật với mock provider/executor ở bảng regression riêng.

## 10. Catalog/Planner thực và data readiness

[Public catalog inventory](evidence/t-ai-04-g2-browser-real-tool-e2e/catalog-inventory.json) có **14 records** loader đọc thật: tại Đà Nẵng có hotel/restaurant nhưng **0 attraction/tour**;8 attraction còn lại có city dạng `Phase35 City <digits>`. Pure current production store offline xác nhận cả8 city này UNPROVEN do city proof không nhận chữ số; không ép sửa grammar hoặc đổi data để chạy Planner.

Production executor/direct search đọc DB thật trước manifest, với budget462000 và638000, trả hai public records hợp lệ: **HuGo Seafood** và **HuGo Riverside Hotel**. Bốn hotel records có Business SUSPENDED trong loader bị RecommendationService loại. Exact public projection/results đã khóa cho E01/E07. Đây là **direct-service data readiness**, không phải Agent/browser tool fidelity PASS vì hai inference chưa chạy.

Direct Planner adapter trên request Huế→Đà Nẵng2036-04-22→23,2 adults,6400000,car trả thật **422 `NO_SIGHTSEEING_FOR_DESTINATION`**. Không itinerary được tạo, không fake output. E02-complete/E03–E06 bị data blocker từ trước inference, không thêm fixture hoặc lấy city test không hợp proof để tuyên bố Planner thành công.

## 11. Prices/dates/itinerary fidelity

Catalog source price thực: Seafood **350000 VND**, Riverside Hotel **1200000 VND**; đã lưu public projections trong data-readiness. Không gọi đó là booking quote hoặc tạo giá mới. Date/adults/budget trong state D02 đúng với message; chưa có Planner output để kiểm ngày/đêm/tổng/transport/cost warnings hay UI rendering prices. **REAL_TOOL_FIDELITY_NOT_RUN** ở Agent E2E; chỉ direct search/readiness đã đo thật và negative Planner readiness422.

## 12. Runtime, latency, tokens và GPU

GPU GET/OS preflight nhận NVIDIA RTX4060, driver560.94,8188MiB; initial free VRAM6177MiB, model nonresident. [Final sampler](evidence/t-ai-04-g2-browser-real-tool-e2e/native-final-audit.json): RAM free2997/16202MiB, VRAM free6141/8188MiB. Sample có workload máy khác, không suy thành GPU usage/CPU split của model vì không có inference/load.

D01/D02 harness turn wall khoảng81/478ms, gồm browser/HTTP/observation, **không phải LLM latency**. Tokens/cache/model timeout/deadline/abort/residency sau inference **NOT EVALUATED**. Native runtime log window không thêm POST/watchdog row. P2 runtime không được đóng bằng các số đo này.

## 13. Reset/logout/expiry, lỗi harness và cleanup

**H01 — P2 test harness, BLOCKER cho lượt đo:** [Diagnosis](evidence/t-ai-04-g2-browser-real-tool-e2e/harness-binding-diagnosis.json), [actual path observation](evidence/t-ai-04-g2-browser-real-tool-e2e/harness-path-observation.json). Frontend gửi đúng `/api/agent/verified-history/<D01 server ID>/reset`. Hàm thay placeholder của harness chỉ thay khi toàn bộ string bằng `$desktop.id`, không thay token nằm giữa URL. Guard so actual path với literal placeholder và trả500 trước Agent router. Đây là lỗi harness của tôi; không có bằng chứng production reset/auth/G2 sai.

Đã dừng LIVE và giữ nguyên run/manifest/response500; không retry hoặc tự resume. Chỉ tạo [proposed compatibility patch, NOT APPLIED/NOT RUN](evidence/t-ai-04-g2-browser-real-tool-e2e/harness-correction.patch) và4 pure offline checks PASS để chủ dự án review. Không đổi expected nhằm lấy PASS. Raw `case-D-RESET.json` có history FAIL và UI PASS là đánh giá stage/rendering của runner: **không dùng làm application reset FAIL/PASS**.

[Reviewed results](evidence/t-ai-04-g2-browser-real-tool-e2e/results-reviewed.json) là bảng phân loại cuối, giữ raw `results.json` nguyên vẹn. Các chuỗi boilerplate `real`/`expiry` trong raw runner mô tả chain dự kiến và nói quá revoked check; thực tế **N-REVOKED, native/model/executor, mobile, logout/revoke/expiry đều NOT RUN**, chỉ N-OWNER404 đã chạy. Reviewed file ghi errata này rõ ràng, không ghi đè evidence ban đầu.

Run dừng còn1 in-memory session tại snapshot trước dispose. `finally` gọi store.dispose, đóng browser/backend và dừng đúng Vite child của run; final netstat không listener3354/3355. Không claim đã revoke bằng API hoặc JWT/global revocation. Không fixture DB để cleanup; fingerprint thực tế trùng25 bảng/27 Trip. Logout/account switch/pending-response isolation chỉ có offline acceptance PASS, **LIVE NOT RUN**.

Backend privacy notice `LOCAL_DEMO_SLOTS_V1` vẫn mô tả logout cũ chỉ xóa token; frontend có giải thích best-effort revoke. Giữ nguyên contract. Proposed task privacy riêng có thể đổi wording/version sau owner review, không sửa trong run này.

## 14. Regression/build sau khi dừng LIVE

| Suite | Kết quả chạy mới |
|---|---|
| Frontend G1/G2 unit | **10/10 +39/39 PASS** |
| Existing mocked browser | **74/74 PASS**; desktop37/mobile37,40 G2 +34 G1, MOCK_ONLY |
| G2 backend / Natural Proof / Compatibility | **68/68,79/79,61/61 PASS** |
| Correction / Completeness | **42/42,52/52 PASS** |
| Original legacy181 | **145 PASS /36 FAIL**, từng tên/status baseline match |
| Isolated controls181 | **176 PASS /5 FAIL**, baseline match; không tính production-policy PASS |
| Readiness actual / isolated | **32/33 /33/33**, baseline không đổi |
| Diagnostics actual / isolated | **8/13 /13/13**, baseline không đổi |
| Foundation single-intent control | **22/22 PASS**; original Foundation17/5 giữ riêng |
| Historical F unmodified | Exit1 fail-fast như baseline, không nhận số case sau stop là PASS |
| Frontend/backend build | **PASS** cả preflight và sau run |

[Unit](evidence/t-ai-04-g2-browser-real-tool-e2e/frontend-unit-final.json), [mock browser summary](evidence/t-ai-04-g2-browser-real-tool-e2e/mocked-browser-summary.json), [browser raw](evidence/t-ai-04-g2-browser-real-tool-e2e/browser-01/results.json), [backend suites](evidence/t-ai-04-g2-browser-real-tool-e2e/additional-offline-results.json), [legacy comparison](evidence/t-ai-04-g2-browser-real-tool-e2e/regression-comparison.json), [broad execution](evidence/t-ai-04-g2-browser-real-tool-e2e/final-verified/execution.json), [frontend build](evidence/t-ai-04-g2-browser-real-tool-e2e/frontend-build-final.json).

Copied offline runners/assertions không đổi, [provenance](evidence/t-ai-04-g2-browser-real-tool-e2e/offline-runner-provenance.json). Extra preload chặn PostgreSQL connects/Ollama/non-loopback native network trong offline children. [49 process audits](evidence/t-ai-04-g2-browser-real-tool-e2e/offline-boundary-audit.json): **0 PostgreSQL connect attempts,0 forbidden network attempts**; không thêm native POST. DB preflight/LIVE/final SELECT nằm ở process guard READ ONLY riêng, không trộn với counter offline0.

## 15. Source/benchmark/historical integrity

[Before](evidence/t-ai-04-g2-browser-real-tool-e2e/integrity-before.json), [after](evidence/t-ai-04-g2-browser-real-tool-e2e/integrity-after.json): **5901/5901 protected files nguyên vẹn**, **0 production/original-test/historical-evidence changes**,84 compiled baseline modules hash-match sau build. Chỉ thêm harness/evidence/report của task; giữ working tree cũ. Derived offline runners trong dist/tests không phải sửa backend/src.

[Hashes](evidence/t-ai-04-g2-browser-real-tool-e2e/source-and-benchmark-hashes.json): V2 APPROVED **`0f1e0f1e87418bca591c6dfcd06645bd9a534326cac23989d58c7a7fd5e6fe6e`**, lock **`f4f3294623f763418393bcfa89cbb39dae9c7af080552c8ce377b3d890549706`** giữ nguyên. Prompt/provider/schema/tools/proof/limits/Auth/Planner/pricing/Map/Sentiment không sửa; candidate B NOT APPLIED. [Artifact seal](evidence/t-ai-04-g2-browser-real-tool-e2e/artifact-checksums.json) khóa report/evidence cuối. Không commit/push/deploy hoặc V2 benchmark.

## 16. Kết luận từng lớp và P1/P2

| Lớp | Kết luận |
|---|---|
| BROWSER_LIVE | **FAIL / BLOCKED_HARNESS** ở mức lượt đo, không kết luận lỗi ứng dụng; desktop deterministic2 turn PASS, mobile LIVE NOT RUN |
| RAW_NLU | **NOT RUN / NOT EVALUATED**, không thể gán raw PASS/FAIL khi không có inference |
| G2_HISTORY | **PASS phần đã đo**: start/continue/revision/slots/stale/replay/history/ownership; reset/full lifecycle NOT EVALUATED/NOT RUN |
| SAFETY | **PASS phần đã đo**,0 unauthorized execution/DB write; model→execution safety LIVE NOT EVALUATED |
| REAL_TOOL_FIDELITY | **NOT RUN ở Agent/browser chain**; direct-service DB readiness có evidence riêng |
| DEMO_READINESS | **BLOCKED** bởi harness và Planner data; chưa đủ nghiệm thu full E2E |
| TAI03B-B1-01 P1 NLU | **OPEN**, không có raw mới |
| Runtime P2 / budget grammar P2 / Map P2 / T13-B | **OPEN/untouched**, không tự sửa hoặc thay kết quả |

## 17. Remaining blockers

1. **H01 harness path binding:** cần sửa và kiểm offline endpoint path/body substitutions trước resume, giữ final exact equality/hash guards. Không phải thay production hoặc bỏ guard.
2. **Planner data readiness:** thiếu public eligible attraction/tour ở city có proof hợp lệ. Read-only task không được thêm fixture; cần operator/data-fixture approval riêng nếu muốn kiểm thành công E02–E06.
3. **Real login:** approved UUID không có account DB. Signed-session bootstrap đã dùng đúng ngoại lệ; real-login E2E vẫn NOT RUN, cần approved account/credentials hoặc fixture scope riêng.
4. **Native readiness chưa hoàn tất:** model installed nhưng nonresident; conditional load/inference chưa chạy. Không nhận cap chưa dùng là quyền tự tiếp tục sau report.
5. **LIVE coverage còn thiếu:** search desktop/mobile, model raw, gate/tool fidelity, successful reset/revoke/logout/G1 switch/expiry/races. Các offline PASS không thay thế chúng.

## 18. NEXT TASK PLAN — chờ duyệt

Đề xuất **`T-AI-04-G2-E2E-HARNESS-FIX-AND-RESUME`**, chưa thực hiện:

1. Owner review H01 diagnosis/proposed patch và hai data/auth limitations. Cho phép sửa riêng harness, giữ production và benchmark nguyên vẹn.
2. Viết offline tests cho placeholders ở full value/path, start/continue/reset/revoke, actual frontend body order/hash, server-created ID và UUID uniqueness; chạy dry integration không model/DB để chặn lỗi guard trước LIVE. Giữ evidence500 và expected cũ.
3. Khóa manifest resume mới, tham chiếu6 PASS đã đo thay vì replay không cần thiết. Process cũ đã đóng nên cần prerequisite session mới có server-created ID, ghi rõ setup không phải inference retry; reuse exact E01/E07 messages/native body hashes/expected đã khóa. Không mở Planner cases khi data vẫn thiếu.
4. Fresh run directory, cùng approved principal, scan **cả at/createdAt kể cả4 main/1 negative của run này**. Hydrate historical quota bình thường; đủ toàn chuỗi và TTL15 phút mới chạy, không reset/đổi principal. Nếu thiếu quota thì BLOCKED hoặc chờ operator/task mới, không bypass.
5. Xin duyệt rõ resume cap **tối đa1 conditional load-only +2 inference search**, tổng không vượt original8 POST (run này0). Readiness loopback/model/digest/resource/concurrency/deadline không đổi; không technical probe/retry/hidden warm-up. Không tự thực hiện cap còn dư.
6. Giữ PostgreSQL exact test DB READ ONLY, sentinel/12 checksums/schema/fingerprint before/after. Search dùng real Catalog và expected direct-service result đã xác minh; actual browser→Agent→Ollama→gate→read executor, desktop/mobile, giữ score raw/history/safety/fidelity/UI riêng.
7. Với E02–E06 hoặc real-login: task data/account riêng phải được duyệt trước mọi write; fixture ledger theo ID/FK, cleanup/fingerprint, không seed/reset hoặc dùng dữ liệu demo làm fixture phá dữ liệu. Nếu không được duyệt, giữ các case này BLOCKED, không giả itinerary.
8. Kết thúc bằng evidence thực, regression và report mới; lỗi semantic giữ expected, guard/runtime/security failure dừng. P1/P2 không đóng nếu không có phép đo đáp ứng acceptance. Không tự FIX production, V2 LIVE, commit/push/deploy.

**Đã dừng sau báo cáo; không resume LIVE trong task này.**
