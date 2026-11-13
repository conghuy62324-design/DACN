# T-AI-04 Planner LIVE Resume — Fresh Quota Gate, run 2

Ngày 11/11/2026, Asia/Saigon. **PARTIAL_LIVE_PLANNER_RESULT_RECORDED / HARNESS_BLOCKED**. Quota đạt nên đã thực hiện PROFILE 2, direct Planner và một phần LIVE. Đã dừng, cleanup đúng hai fixture, đo lại **DB_RESTORED_25_25**, giữ nguyên **27 Trip**. Không nghiệm thu toàn bộ LIVE PASS.

**Sai sót của harness do tôi tạo:** so sánh object JavaScript với JSON gây fidelity assertion FAIL; các literal UI mất Unicode qua PowerShell gây UI assertion FAIL và chặn L05. Runner còn tiếp tục L02–L04 sau assertion FAIL đầu tiên vì nhánh dừng chưa bao gồm các assertion này. Việc tiếp tục đó **vi phạm yêu cầu dừng khi guard thất bại**. Không sửa kết quả gốc, expected hoặc chạy lại model để lấy PASS. Các lời gọi vẫn nằm trong manifest đã khóa, quota và cap; DB đã được phục hồi. [Chẩn đoán H02/H03/H04](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/harness-diagnosis.json).

| Lớp nghiệm thu | Kết quả đo được |
| --- | --- |
| FIXTURE_CREATION | PASS, đúng hai Place được duyệt |
| DIRECT_PLANNER | PASS, independent cost/ETA oracle và sáu controls |
| RAW_NLU | 3 PASS / 1 FAIL; L05/L06 NOT RUN |
| G2_HISTORY | PASS trong năm Agent turns đã dispatch |
| SAFETY | Các guard identity/history/tool/DB/cap đo được PASS; global stop của harness FAIL |
| REAL_TOOL_FIDELITY | Assertion LIVE gốc FAIL ở L01–L03; review độc lập saved public JSON 3 PASS |
| BROWSER_LIVE | HARNESS_BLOCKED; completed-plan UI assertions 0 PASS / 3 FAIL; mobile NOT RUN |
| DB_CLEANUP | PASS, fingerprint thực tế 25/25, Trip 27/27, residual fixture 0 |
| DEMO_READINESS | Chưa đạt nghiệm thu Planner desktop/mobile đầy đủ; P1/P2 OPEN |

## 1. Owner approval, PROFILE 2 và quota mới

Tiếp tục từ [báo cáo LIVE trước](HUGO_T_AI_04_PLANNER_REAL_TOOL_LIVE_E2E_REPORT.md), [báo cáo resume trước](HUGO_T_AI_04_PLANNER_REAL_TOOL_LIVE_E2E_RESUME_REPORT.md) và [test data readiness](HUGO_T_AI_04_PLANNER_TEST_DATA_READINESS_REPORT.md). Các báo cáo và evidence cũ được giữ nguyên. [Owner approval PROFILE 2](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/owner-profile2-approval.txt), [resume approval](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/owner-resume-task.txt).

Fresh quota được kiểm trước DB/Ollama. [Quota preflight](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/quota-preflight.json) đạt **20 remaining**, đủ reserve **9 normal Agent turns + 1 conservative operator entry**, giới hạn vẫn **20 turns/hour**. Scanner duyệt toàn bộ historical attempt files, đọc cả `at` và `createdAt`, dùng timestamp muộn hơn khi có cả hai; operator entry tính bảo thủ riêng, không đổi principal.

Approved principal `9997f6db-bfa1-4377-96f3-5b5ea19dbf34`; SHA-256 `6b982d095bc6bc30c87955cd38c78afa9ef31d3447ef30f62e8684bbe8bce600`; nguồn `t-ai-04-e-final/run-20261109T041645807Z-ae626a88/attempt-E04-B.json`. Ngay trước LIVE lúc 03:39:57Z vẫn còn 20. Sau LIVE lúc 03:41:47Z, scanner ghi 103 historical entries, sáu entry trong giờ gần nhất: năm Agent turns và một operator load; **remaining 14**. Đây là snapshot theo thời điểm ghi, không phải quyền tự resume.

## 2. Fresh database preflight và enforced maintenance isolation

[Phase A](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/phase-a-db-isolation.json) xác minh đúng `travelgo_ai_m0_test`, sentinel `hugotravel-isolated-test-database-v1`, 12 migration checksums, schema SHA-256 `7805ddb1eb77028bfef96923c8adb8f0224bd54296dac39910546035154c544f`. Baseline có 25 public tables, 22 Place và 27 Trip. Identity/sentinel/schema/checksum/fingerprint được đo mới trước INSERT.

Role kết nối là postgres superuser, **không phải least privilege**. Runtime Planner/Agent dùng guarded Sequelize chỉ SELECT/SHOW, `default_transaction_read_only=on`, `ALLOW_TEST_DB_WRITES=false`. Maintenance dùng hai kết nối riêng, explicit read-write transaction và exact DML có ledger.

Enforcement thực tế: giữ ShareRowExclusiveLock toàn bộ 25 bảng trước INSERT; probe kết nối thứ ba yêu cầu ROW EXCLUSIVE NOWAIT bị từ chối với `55P03`. Trước mỗi COMMIT, kết nối kế tiếp đã queue SHARE lock và được xác minh bằng blocking PID để không có khoảng hở nhận writer. Trong direct/LIVE, SHARE locks toàn bộ 25 bảng cho phép đọc nhưng chặn DML. Cleanup chuyển lock theo cùng cơ chế. Không terminate connection, đổi grants hay sửa role. [Smoke không entity DML](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/isolation-smoke/smoke-result.json), [maintenance implementation](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/maintenance.cjs).

## 3. Collision, FK và committed fixture ledger

Trước INSERT đã kiểm tra ID/slug collision bằng 0, incoming FK và Trip JSON references bằng 0. [Write intent](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/fixture-write-intent.json) ghi exact SQL/parameter hashes và owner approval trước mutation. Chỉ một INSERT statement tạo đúng hai Place, affected count 2, có full returned rows và committed ownership ledger; không tạo User/Business/Trip/Booking/Tour.

[Committed ledger](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/fixture-committed-ledger.json) là căn cứ ownership cho cleanup. Không có ambiguous commit.

## 4. Exact IDs và row hashes

| Fixture | Exact ID | priceFrom | Tọa độ | Full row SHA-256 |
| --- | --- | ---: | --- | --- |
| A01 | `f7433d4a-5f49-4991-8add-b55435b02eb0` | 100000 | 16.25, 108.25 | `b280c30b7c316737ce7c282c4bf5daf3ccb339898453faf072f7e7bf8d9bd422` |
| A02 | `5a1e8835-770c-41a2-8699-74deba239a86` | 150000 | 16.20, 108.27 | `160c3bb38b7569373ea775980feeb6d39db8d1b62a2773ba878109f85520c823` |

Row MD5 tương ứng A01 `ca3927119ae3be6bab5a2284f119a2a9`, A02 `31c11324637dc199abf76660a0c16beb`. Full raw attributes giữ đúng proposal đã duyệt, category attraction, city/province Đà Nẵng, APPROVED, business_id NULL, tên và mô tả TEST FIXTURE synthetic. Hash bao gồm timestamps thực tế do DB trả về; không dùng riêng ID để chứng minh ownership.

## 5. Catalog eligibility

Catalog loader thật trả **16 eligible records**, gồm 14 baseline và đúng hai fixture. Hai attraction bổ sung giúp Planner Đà Nẵng đủ điểm tham quan; không đổi filter, schema, city mapping hoặc algorithm. [Catalog sau INSERT](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/catalog-with-approved-fixtures.json). Trong thời gian fixture tồn tại: Place 24 = 22 baseline + 2, 24 bảng khác và toàn bộ pre-existing rows không đổi; không gọi đây là fingerprint 25/25 unchanged khi fixture còn tồn tại.

Synthetic prices chỉ phục vụ kiểm thử, không phải báo giá du lịch thực tế hoặc chứng cứ production catalog đã đầy đủ.

## 6. Direct Planner validation

Gọi production `catalogPlannerTools` → Planner/Catalog → PostgreSQL thật, không Ollama. [Phase C](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/phase-c-direct.json) PASS. Base: Huế → Đà Nẵng, 2036-04-22/23, hai adults, budget nhóm 6.400.000 VND, car, hai ngày một đêm. Mỗi ngày đúng một sightseeing, A02 ngày 1 và A01 ngày 2, mỗi fixture đúng một lần.

Đã tạo sáu direct oracle variants cho L01–L06 trước inference và khóa cùng manifest. Sáu controls PASS: budget thấp vẫn giữ cost thật và báo over-budget; budget 0, ngày ngược, adults 0, phương tiện flight bị từ chối đúng mã; destination Huế không có sightseeing eligible trả lỗi controlled. [Full direct outputs và controls](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/direct-oracles.json).

## 7. Independent cost và ETA oracle

| Khoản cho cả nhóm | Ngày 1 | Ngày 2 |
| --- | ---: | ---: |
| Sightseeing A02 / A01 | 300.000 | 200.000 |
| Lunch Seafood / fallback | 700.000 | 300.000 |
| Dinner fallback | 400.000 | 400.000 |
| Lodging một đêm / không đêm | 1.200.000 | 0 |
| Tổng ngày | **2.600.000** | **900.000** |

Tổng **3.500.000 VND**, còn **2.900.000 VND** so với budget 6.400.000. Budget 9.000.000 còn 5.500.000; low-budget 100.000 vượt 3.400.000, không cắt giá. Seafood dùng một lần; lunch ngày 2 là fallback. Selected IDs đúng thứ tự A02, Seafood `b2f9a5cb-5258-421e-8050-1b3d55997fa7`, A01. Hotel `39a5483f-e3d0-4cf8-a9b9-65e6b0a33593` là hotelSuggestion/lodging, không ép vào mandatory selected IDs.

Oracle tính độc lập item/day/night/group totals và Haversine radius 6371, làm tròn khoảng cách 0,01 km, transit ceil(distance × 1,35 / speed × 60), speed car 30, motorbike 35 km/h, tối thiểu 5 phút. Đây là ETA ước lượng, không routing giao thông thực tế. Chỉ normalize `itinerary.id` và `itinerary.createdAt` khi đối chiếu kết quả.

## 8. Locked LIVE manifest và native POST ledger

[Manifest](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/manifest.json) được khóa trước native POST; SHA-256 `680bda1a4ab872ef339c4dbef1a4bdc6873ff3239dc7987be95f1cb6970bba20`. [Lock](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/manifest-lock.json) gắn harness SHA `78a8d725b236d0c8517ae62b919a00189665d0ecf2add37d1b4de7238ad37cb1` và binding SHA `990a4a86336ff7a0f97680e680f2345b286b2268b2b6c2adb1b87cd468c72a4f`. Final audit xác nhận chúng không đổi sau chạy.

Wire bodies L01–L06 được capture offline qua production orchestration với fake provider/consent và chặn socket/PG; bước này không tạo model result, DB access hoặc native inference. LIVE kiểm exact method/path/body template, fresh UUID, bound/native byte hashes và approved owner trước dispatch.

| Native entry | Route | HTTP | Phân loại |
| --- | --- | ---: | --- |
| OP-LOAD | /api/generate | 200 | Load-only, response rỗng |
| L01 | /api/chat | 200 | Inference |
| L02 | /api/chat | 200 | Inference |
| L03 | /api/chat | 200 | Inference |
| L04 | /api/chat | 200 | Inference |

**1 load-only + 4 inference = 5/7 POST**, không retry, hidden warm-up hoặc extra POST sau stop; unused 2 không dùng tiếp. Cap giữ nguyên load ≤1, inference ≤6, tổng ≤7. [Final native audit](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/native-final-audit.json) đối chiếu năm attempt files với local Ollama server log từ offset đã ghi trước run. Phạm vi chứng cứ là harness và local log, không OS-wide packet capture.

## 9. Raw model decisions

| Case | Nội dung đã khóa | Raw verdict | Tool thực thi |
| --- | --- | --- | ---: |
| D-START | Start thiếu sáu fields | NOT EVALUATED, server completeness | 0 |
| L01 | Hoàn tất base slots | PASS, exact plan_trip + bảy required arguments | 1 |
| L02 | Budget 9.000.000, giữ slots khác | PASS | 1 |
| L03 | Ngày 2036-04-23/24, giữ budget 9.000.000 | PASS | 1 |
| L04 | “À đổi sang xe máy, giữ thông tin còn lại.” | **FAIL**, redundant clarify transportation | 0 |
| L05 | Structured motorbike confirmation | NOT RUN, chặn trước click/HTTP | 0 |
| L06 | Fresh mobile complete request | NOT RUN | 0 |

L04 raw `{"kind":"clarify","fields":["transportation"]}` hợp schema nhưng sai ngữ nghĩa: verified state có đủ bảy fields SET, transportation motorbike. Giữ raw FAIL, không sửa arguments/fallback để tạo plan khớp. [Raw response L04](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/ollama-response-L04.json), [reviewed results](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/live-evidence-reviewed.json).

## 10. G2 history và vòng đời session

Desktop conversation `0e611787-ee38-4b5d-a7d8-ac3e61b07b93`, revisions 1→5, owner hash đúng principal. Absolute TTL bắt đầu 03:40:07Z, expiry `2026-11-11T03:55:07.740Z`; continue không kéo dài TTL. Trước inference kiểm TTL còn >90s, quota/readiness/pending. State giữ departure/destination/adults, update budget ở L02, dates ở L03, transportation motorbike ở L04; history assertions đã dispatch đều PASS.

D-END/M-END API revoke NOT RUN. `results.json` chụp **một session trước dispose**; finally của runner gọi store.dispose và đóng browser/backend/Vite. Không gọi đó là API revoke PASS. Natural TTL expiry, replay/cross-owner LIVE và auth race LIVE không chạy lại; offline controls báo riêng. [Kết quả gốc](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/results.json).

## 11. Execution safety và giới hạn nghiệm thu

Luồng thật Browser → Vite 3354 → Express 3355 → production auth/Agent/store/proof/schema/gate/provider/Ollama → real plan_trip → read-only PostgreSQL; không Playwright route mock trong LIVE. Identity dùng test-signed JWT qua production authenticate và GET /auth/me bootstrap; đây là authenticated test session, chưa phải real-login E2E. Consent thật chỉ đọc; không click acknowledgement tạo DB write. Session metadata là server-issued, response no-store; không cross-user leak quan sát được trong scope đã chạy.

Chỉ ba real read tool executions L01–L03, không save Trip/book/write tool. Runtime Sequelize audit cuối master ghi 913 queries, forbidden 0; maintenance DML được tách riêng. Tuy vậy, **global stop safety của harness FAIL H04**: fidelity/UI assertion bị catch rồi tiếp tục. Do đó không gộp các guard con PASS thành overall SAFETY/acceptance PASS. [Master result](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/master-result.json), [stop](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/stop.json).

## 12. Real Planner fidelity: verdict gốc và review độc lập

L01–L03 gọi Planner thật và có DB queries. Assertion gốc so object trong bộ nhớ chứa optional `placeId: undefined` với oracle JSON không có key đó nên FAIL. Không có lỗi giá/địa điểm được chứng minh từ assertion này.

Review offline chỉ đọc public HTTP JSON và saved oracle, normalize đúng hai volatile fields đã duyệt. Cả ba **exact JSON fidelity PASS**: dates, days/nights, IDs/names/category/allocations, item/day/group totals, budget/warnings, transport/ETA và source provenance đều khớp. Review này **không đổi verdict LIVE gốc**. Không drop null, đổi expected hoặc bỏ qua giá sai. [Review script](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/review-live-evidence.cjs), [review artifact](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/live-evidence-reviewed.json).

## 13. Desktop/mobile browser và lỗi Unicode

Desktop 1440×900: D-START PASS và L04 clarification UI PASS, có [D-START screenshot](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/D-START.png) và [L04 screenshot](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/L04.png). L01–L03 completed-plan UI assertions FAIL vì literal “₫” trong harness thành “?”. Playwright error chứa DOM text thật với đúng tên, dates, totals và warnings; đây là chứng cứ rendered text, chưa thay thế automated UI acceptance. Các completed-plan screenshots không được chụp; layout/overflow checks phía sau assertion chưa chạy.

L05 locator “Xe m?y” chờ 30 giây rồi STOP; production button đúng “Xe máy”. PowerShell `$OutputEncoding.WebName` thực tế là `us-ascii`. L05 chưa click, chưa HTTP/Agent quota/native POST. Đây là browser harness timeout, không phải model application deadline timeout. Mobile 390×844 L06 và mobile end **NOT RUN**; mocked mobile regression không thay thế Planner LIVE mobile.

## 14. Runtime, GPU và model config

Preflight xác minh loopback `127.0.0.1:11434`, process ollama, version 0.40.16, no-proxy và exact model `qwen3:4b-instruct-2507-q4_K_M`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`. JSON mode, stream false, temperature 0, num_ctx 16384, num_predict 2048, application deadline 15000ms, load deadline 60000ms, concurrency 1 giữ nguyên. Model ban đầu chưa resident nên dùng đúng một operator load.

| Entry | Native duration ms | Prompt tokens | Cached prompt | Output tokens |
| --- | ---: | ---: | ---: | ---: |
| OP-LOAD | 10840,7 | — | — | — |
| L01 | 2116,0 | 2396 | 0 | 73 |
| L02 | 1330,9 | 2353 | 2271 | 73 |
| L03 | 1428,2 | 2361 | 2248 | 73 |
| L04 | 495,0 | 2342 | 2282 | 12 |

Native duration tách khỏi provider wall có integrity/resource preflight. Cached tokens không phải hidden warm-up. GPU RTX 4060, driver 560.94, VRAM tổng 8188 MiB; trước load VRAM free 5872 MiB, RAM free 4592/16202 MiB; sau L04 free VRAM 1055 MiB, RAM 3417 MiB. Không model timeout/abort trong bốn inference, pending 0 khi stop. Log có INFO “waiting … llm server error” trong load rồi thành công, và context 16384 nhỏ hơn training 262144; không xóa warning. [Preflight](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/live-preflight.json), [native log audit](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/native-final-audit.json).

## 15. Guarded cleanup

Sau stop không gửi thêm inference. Runner dispose memory/đóng tác vụ; maintenance vẫn enforced. Đọc lại committed ledger, kiểm full row JSON SHA/MD5, exact IDs/slugs, incoming FK ở blog_posts/bookings/tickets/tour_places/user_favorites đều 0, Trip JSON references 0, không external writer/pre-existing mutation. Chỉ khi đủ các guard này mới DELETE đúng hai owned records bằng ID + slug + row MD5 predicates, affected count chính xác 2. Không CASCADE/SET NULL hoặc chỉnh dữ liệu khác để ép baseline.

[Cleanup write intent](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/cleanup-write-intent.json), [cleanup result](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/cleanup-result.json): **DB_RESTORED_25_25**, residual IDs rỗng, không ambiguous commit. [Maintenance final audit](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/maintenance-final-audit.json) xác nhận clients đóng sau cleanup; không giữ maintenance lock sau kết thúc.

## 16. Actual final DB fingerprint và 27 Trip

[Fingerprint sau cleanup](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/fingerprint-after-cleanup.json) deep-equal baseline toàn bộ 25 bảng theo row count và hash của sorted row MD5; Place trở lại 22, Trip 27, changed tables 0.

Sau regression, mở kiểm tra SELECT/SHOW riêng và đo lại lúc **03:54:08Z**: [final comparison](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/fingerprint-final-compare.json) ghi **DB_RESTORED_25_25_RECHECKED_AFTER_REGRESSION**, 25 bảng không đổi, Place 22/22, Trip 27/27, fixture còn lại 0, DB read-only on, forbidden query 0, HTTP attempts 0. Đây là phép đo mới, không chỉ dẫn baseline lịch sử.

## 17. Regression/build sau cleanup

[Regression summary](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/regression-summary.json) giữ original assertions/expected và baseline failures; không tuyên bố mọi suite xanh.

| Suite | Kết quả mới |
| --- | --- |
| Frontend G1/G2 unit | 10 + 39 = **49 PASS**, 0 FAIL |
| Mocked browser desktop/mobile | **74 PASS**, 0 fail/skip/flaky; desktop 37, mobile 37 |
| Backend G2 | **68 PASS** |
| Natural Proof | **79 PASS** |
| Compatibility | **61 PASS** |
| Correction | **42 PASS** |
| Completeness | **52 PASS** |
| Original legacy 181 | **145 PASS / 36 FAIL**, giữ baseline |
| Downstream isolated controls 181 | **176 PASS / 5 FAIL**, không phải production-policy PASS |
| Readiness | Actual **32/1**, isolated control **33/0** |
| Diagnostics | Actual **8/5**, isolated control **13/0** |
| Foundation single-intent compatibility control | **22/0**, không thay thế original Foundation 17/5 |
| Frontend/backend build | **PASS / PASS** |

Đối chiếu 16 case result files cho actual-policy và downstream-control: từng tên/status khớp baseline search-resume; historical F exit 1, readiness/diagnostics counts và exit codes cũng khớp. Không đổi assertion để chữa các historical conflicts. [Offline boundary audit](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/offline-boundary-audit.json): 50 process audit files, postgres connect attempts 0, forbidden network attempts 0. Mocked browser dùng dead API proxy và route interception; không coi 74 mocked tests là LIVE evidence.

## 18. Source, benchmark và evidence integrity

[Integrity after](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/integrity-after.json) đối chiếu **7.088 protected files**, changed 0; 84 compiled production files giữ hash, 12 sealed artifacts của lượt resume trước và report cũ nguyên vẹn. Manifest, binding, executed harness, fixture ledger và direct oracle hashes còn khớp lock. Sáu regression runners giữ SHA như search-resume.

Không đổi app source, SYSTEM, schema, gates, Planner algorithm, benchmark V2/manifest/lock hoặc old evidence. Chỉ thêm report/evidence run 2; build sinh lại generated outputs. Không commit/push/deploy, không V2 LIVE. [Artifact checksums](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/artifact-checksums.json) niêm phong evidence và report hiện tại.

## 19. P1/P2 và acceptance

**TAI03B-B1-01 P1 raw NLU OPEN**: L04 tái hiện redundant clarification dù transportation đã SET. L01–L03 exact raw PASS và saved JSON fidelity PASS không đủ đóng P1 hoặc demo readiness.

**P2 runtime OPEN**: bốn inference không timeout chỉ là kết quả scope này; không xóa lịch sử lỗi runtime. H02/H03/H04 là harness failures đã chẩn đoán, chưa có LIVE verification cho correction. DB cleanup đã đạt đầy đủ; acceptance Planner desktop/mobile còn thiếu. Kết luận cuối **PARTIAL / HARNESS_BLOCKED**, không full LIVE PASS.

## 20. NEXT TASK PLAN — chỉ đề xuất

Ưu tiên sửa và kiểm tra **offline** harness: bảo toàn UTF-8 cho UI literals; so public HTTP JSON cùng dạng JSON sau normalize đúng hai volatile keys; bắt mọi guard/assertion FAIL thành global stop trước case tiếp theo. [Proposed helper](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/harness-correction.PROPOSED.cjs) chỉ là artifact chưa áp dụng vào executed LIVE harness. [Offline correction checks](evidence/t-ai-04-planner-real-tool-live-e2e-resume-run2/offline-harness-correction-checks.json) 8 PASS, 0 inference/DB, chưa chứng minh global-stop integration hoặc mobile LIVE.

Một lượt LIVE mới cần review harness/stop integration, khóa manifest mới, kiểm quota/DB/isolation từ đầu và tái lập session hợp lệ; không dùng tiếp hai POST chưa dùng của run này, không sửa expected/raw kết quả hiện tại. Không tự retry L01–L04 để thay FAIL bằng PASS. Giữ đề xuất downstream **T-AI-04-V2-LIVE-EVALUATION-READINESS** sau khi các điều kiện Planner được xử lý; chưa chạy V2/benchmark hoặc deploy.

**Đã dừng sau kết quả, cleanup, regression và báo cáo này.**
