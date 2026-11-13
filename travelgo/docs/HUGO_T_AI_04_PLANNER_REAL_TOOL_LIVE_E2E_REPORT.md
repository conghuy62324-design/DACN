# T-AI-04-PLANNER-REAL-TOOL-LIVE-E2E

Ngày **11/11/2026**, Asia/Saigon. Kết luận **BLOCKED_QUOTA_PREWRITE**.

Chủ dự án đã duyệt **PROFILE 2 PLACES**, nhưng quota tại thời điểm thực thi còn **8 lượt**, trong khi toàn chuỗi cần reserve **10 lượt**. Đã dừng trước write-intent, INSERT và native POST theo stop condition. **0 fixture INSERT, 0 cleanup DELETE, 0 direct Planner execution, 0 Ollama POST**.

DB được đo mới: **25/25 bảng unchanged, places 22/22, Trip 27/27**, hai fixture UUID chưa tồn tại. Regression offline và hai build hoàn tất; kết quả này không thay cho Planner LIVE. **P1/P2 OPEN**.

## 1. Owner approval và profile 2

[Task được giao](evidence/t-ai-04-planner-real-tool-live-e2e/owner-task.txt) cho phép có điều kiện tạo và cleanup đúng hai Place trên **travelgo_ai_m0_test**, tối đa **1 conditional load-only +6 genuine inference**, tổng cap7; không retry/hidden warm-up. Không sửa bản ghi nền, bảng khác, production source, SYSTEM, schema/gate/Planner, benchmark hoặc deploy.

Approval đã có; đây không phải blocker cần xin lại quyền. Đã đọc bốn báo cáo baseline và toàn bộ thiết kế fixture; [review index](evidence/t-ai-04-planner-real-tool-live-e2e/baseline-review.json) ghi hashes, bytes và source paths. Các báo cáo/evidence cũ giữ nguyên.

## 2. Quota gate trước write

[Preflight hiện tại](evidence/t-ai-04-planner-real-tool-live-e2e/quota-preflight.json), [recheck cuối](evidence/t-ai-04-planner-real-tool-live-e2e/quota-final.json), [stop record](evidence/t-ai-04-planner-real-tool-live-e2e/stop.json).

| Mục | Actual |
|---|---:|
| Default quota |20/principal/hour|
| Historical records đã scan |97|
| Entries trong rolling hour |12|
| Remaining conservative slots |**8**|
| Maximum normal Agent turns của chuỗi |9|
| Conservative operator entry |1|
| Reservation cần thiết |**10**|
| Shortfall |**2**|

Cùng principal SHA **6b982d095bc6bc30c87955cd38c78afa9ef31d3447ef30f62e8684bbe8bce600**. Scanner đọc cả **at/createdAt**, lấy timestamp mới nhất; 0 future entries. Recent12 gồm **4 dry main +7 LIVE main +1 operator** của lượt search resume. Giữ conservative accounting đã khóa; không bỏ entries, đổi principal, reset limiter hoặc rút case để vừa quota. Task này không tạo attempt mới.

Chín Agent turns tối đa gồm desktop incomplete1, bốn inference L01–L04, conditional L05 thêm1, desktop revoke1, mobile L06 thêm1 và mobile revoke1. Operator load-only dự phòng tính riêng1. Không giả định trước model sẽ không clarify hoặc đã resident để bỏ reservation.

Theo snapshot ledger, thời điểm sớm nhất có thể kiểm lại đủ10 slots là **11/11/2026 10:17:32.409 Asia/Saigon** (03:17:32.409Z), nếu không có attempts mới. Đây không phải lịch chạy hay auto-resume. Quota cuối vẫn8; đã dừng theo yêu cầu.

## 3. PHASE A — các kiểm tra DB chỉ đọc

[DB preflight](evidence/t-ai-04-planner-real-tool-live-e2e/db-preflight.json), [result](evidence/t-ai-04-planner-real-tool-live-e2e/preflight-readonly-result.json).

Exact target **127.0.0.1:5432 / travelgo_ai_m0_test**, sentinel **hugotravel-isolated-test-database-v1**. **12/12 migration checksum** khớp DB/source/approved baseline. Schema SHA **7805ddb1eb77028bfef96923c8adb8f0224bd54296dac39910546035154c544f** khớp baseline. Server internal IP172.18.0.3/32.

Startup/per-connection **default_transaction_read_only=on**, actual **transaction_read_only=on**, SELECT/SHOW query guard. Initial audit **96 queries/3 connections/0 forbidden SQL**. Role **postgres superuser=true, bypassRLS=true**, không least-privilege. Không thử ghi, sửa grants hoặc kết nối DB khác.

Các kiểm tra chỉ đọc PASS; **không nhận toàn PHASE A/write gate PASS**, vì maintenance isolation chưa establish và quota đã chặn execution.

## 4. Maintenance isolation

[Activity observation](evidence/t-ai-04-planner-real-tool-live-e2e/maintenance-isolation-observation.json) không thấy connection khác trong current DB ngoài query đang kiểm. Snapshot này không chứng minh connection khác không thể ghi về sau.

**NOT ESTABLISHED / NOT RUN**: chưa mở maintenance DML connection, acquire write-exclusion locks, sửa grants hoặc terminate process khác. Không coi snapshot trống/superuser là isolation PASS. Khi resume, enforced maintenance isolation vẫn là gate bắt buộc trước INSERT.

## 5. Exact fixture và collision/FK

[Fixture preflight](evidence/t-ai-04-planner-real-tool-live-e2e/fixture-preflight.json), [baseline22 Place row hashes](evidence/t-ai-04-planner-real-tool-live-e2e/baseline-place-row-hashes.json).

| Record | Exact UUID | Price VND | Coordinates |
|---|---|---:|---|
|A01|f7433d4a-5f49-4991-8add-b55435b02eb0|100000|16.25,108.25|
|A02|5a1e8835-770c-41a2-8699-74deba239a86|150000|16.20,108.27|

Full attributes giữ đúng approved fixture-proposal.json: tên [TEST FIXTURE], attraction, city/province Đà Nẵng, APPROVED, business_id NULL; không đổi slug/price/coordinates.

Fresh ID/slug collisions0; FK refs0 trên blog_posts, bookings, tickets, tour_places, user_favorites; Trip selected_place_ids/itinerary JSON refs0. Actual constraints khớp design. Đây là kiểm tra trước write, không phải fixture creation PASS.

## 6. PHASE B — creation ledger

[Ledger](evidence/t-ai-04-planner-real-tool-live-e2e/fixture-ledger.json): **NOT RUN_BLOCKED_BEFORE_WRITE_INTENT**. Approved IDs được ghi rõ, nhưng **insertedIds=[], committedRowHashes=[], affectedRows=0**, transaction NOT STARTED. Không bịa createdAt/updatedAt hoặc committed row hashes.

Không UPSERT/UPDATE/DELETE baseline, disable FK/trigger, CASCADE hoặc SET NULL. Places không từng có24 rows trong run này; luôn22.

## 7. Catalog eligibility

[Current production-loader snapshot](evidence/t-ai-04-planner-real-tool-live-e2e/catalog-preflight.json):14 APPROVED loader rows, chưa có hai fixture. Business filter vẫn loại4 suspended-business hotels. Hai eligible Đà Nẵng hiện có là HuGo Seafood350000 VND và HuGo Riverside Hotel1200000 VND; không có eligible attraction/tour đúng destination.

Không sửa eligibility hoặc trình bày fixture test là dữ liệu du lịch thật. Historical search fidelity PASS giữ riêng, không phải Planner fidelity mới.

## 8. PHASE C — Direct Planner

**NOT RUN** vì PHASE A/B chưa hoàn tất. Scenario giữ **Huế→Đà Nẵng,2036-04-22→23,2 adults,6400000 VND,car**. Chưa có actual itinerary để chấm dates/day/night, một sightseeing mỗi ngày, IDs exactly-once, hotel/meals, costs, selectedPlaceIds hoặc ETA.

Direct-service low-budget/invalid-field controls của PHASE C cũng NOT RUN. Các regression dùng mocks được ghi riêng; không thay cho direct Planner trên fixture DB đã duyệt.

## 9. Independent cost oracle

Profile2 design dự kiến **2 ngày/1 đêm**, A02 day1/A01 day2, day totals **2600000/900000 VND**, grand total **3500000 VND**, budget remaining **2900000 VND**. Đây vẫn là thiết kế tĩnh, chưa measured/PASS.

Low-budget100000 với profile2 dự kiến overBudget3400000; không áp nhầm minimum1-row oracle3200000/3100000. Không sửa historical oracle/expected. Chưa khóa actual direct-service fidelity oracle.

## 10. PHASE D — manifest và POST ledger

[Blocked plan snapshot](evidence/t-ai-04-planner-real-tool-live-e2e/manifest-blocked.json) có status **NOT_EXECUTABLE_BLOCKED_QUOTA_PREWRITE**, giữ draft cases/messages, approval/profile hashes. Direct-service oracle và native bodies chưa capture/lock; không giả manifest ready.

[Native ledger](evidence/t-ai-04-planner-real-tool-live-e2e/native-post-ledger.json): **0 load-only,0 inference,0/7 POST,0 retry,0 hidden warm-up**, attempts=[]. Không instantiate live provider hoặc start backend LIVE/G2. Không dùng cap đã duyệt để bỏ qua quota gate. TTL/readiness/auth execution chưa được chứng minh.

## 11. Raw decisions L01–L06

| Case | Actual |
|---|---|
|L01 incomplete→complete car|NOT RUN|
|L02 budget correction9000000|NOT RUN|
|L03 approved date correction|NOT RUN|
|L04 natural motorbike correction|NOT RUN|
|L05 conditional explicit user click|NOT RUN|
|L06 fresh mobile complete|NOT RUN|

Raw-returned0, schema-evaluated0, semantic-compared0: **RAW_NLU NOT EVALUATED**. Quota blocker không được chấm thành raw FAIL/PASS. Không auto-resend, repair output, synthesize tool hoặc đổi expected. Nếu resume có redundant clarify, raw FAIL phải giữ độc lập; L05 chỉ là new explicit user input trong approved branch.

## 12. G2 History

**NOT RUN LIVE**. Không tạo conversation/server ID/revision hoặc verified Planner state trong run này. Revoke/dispose LIVE N/A vì0 sessions. Backend68 và frontend49/mocked74 có evidence offline riêng.

Source local-demo/default-OFF, absolute TTL15min, server-created ID/ownership/proof/auth vẫn nguyên vẹn; không claim lifecycle LIVE PASS.

## 13. Execution safety

Prewrite stop tuân thủ guard:0 entity writes,0 inference/tool invocation,0 scope bypass. DB chỉ đọc,0 forbidden SQL. **Model→gate→plan_trip LIVE safety NOT RUN**; không suy whole-chain PASS từ việc không execute.

Không shared .env/global G2, reset limits hoặc account substitution. Offline fake providers/executors không phải LIVE proof.

## 14. Real Planner fidelity

**NOT RUN**: chưa có direct itinerary, actual tool output, public projection hoặc UI comparison về dates/IDs/costs/ETA/warnings trên fixture DB. Không dùng static oracle, historical search results hoặc mocked output làm Planner fidelity PASS.

Synthetic Place/price phải giữ [TEST FIXTURE] nếu được tạo về sau; không market quote, real tourism completeness hoặc Booking result.

## 15. Desktop/mobile Browser LIVE

**NOT RUN** trên cả1440×900 và390×844. Browser74 là **MOCK_ONLY** regression; không có actual React→Express→Qwen→Planner→PostgreSQL chain hoặc LIVE screenshot mới.

Không có test-signed JWT LIVE hoặc real-login claim mới.

## 16. Runtime/GPU

Model/tag/digest/options chỉ là approved baseline reference. Current GET version/tags/ps, residency, GPU/RAM readiness, latency/tokens/deadline/abort **NOT RUN/NOT EVALUATED**, vì đã stop trước model preparation. Không preload/unload/model switch/timeout increase.

[Native final audit](evidence/t-ai-04-planner-real-tool-live-e2e/native-final-audit.json) đọc local Ollama server.log window qua offline regression: **0 POST thêm**; task không có native dispatch. Scope là task ledger/local log, không OS-wide packet capture. Không có runtime sample mới để đóng P2.

## 17. PHASE F — cleanup và final fingerprint

**DB_CLEANUP N/A_NO_INSERT**:0 fixture created,0 cleanup DELETE,0 residual owned IDs. Không forced erasure hoặc claim cleanup blocked khi không có committed inserts.

[Before](evidence/t-ai-04-planner-real-tool-live-e2e/fingerprint-before.json), [after read](evidence/t-ai-04-planner-real-tool-live-e2e/fingerprint-after.json), [final after regression](evidence/t-ai-04-planner-real-tool-live-e2e/fingerprint-final.json), [comparison](evidence/t-ai-04-planner-real-tool-live-e2e/final-db-comparison.json): **25/25 unchanged,changed=[],places22→22,Trip27→27**; hai UUID vẫn absent. Before cũng khớp Data Readiness baseline.

Kết luận **DB_UNCHANGED_25_25_NO_INSERT**; không dùng **DB_RESTORED_25_25** vì không có INSERT/cleanup để đo restoration. Khi resume có fixture, exact ownership/row hashes/FK/Trip JSON/isolation vẫn bắt buộc trước DELETE; không sửa dữ liệu khác để ép fingerprint.

## 18. Regression/build mới

[Summary](evidence/t-ai-04-planner-real-tool-live-e2e/regression-summary.json), [execution](evidence/t-ai-04-planner-real-tool-live-e2e/final-verified/execution.json), [boundary audit](evidence/t-ai-04-planner-real-tool-live-e2e/offline-boundary-audit.json).

| Suite | Current result |
|---|---|
|Frontend G1/G2 unit|**10/10 +39/39 PASS**|
|Mocked browser|**74/74 PASS**,desktop37/mobile37,0 skip/flaky/retry|
|Backend G2/Natural/Compatibility|**68/68,79/79,61/61 PASS**|
|Correction/Completeness|**42/42,52/52 PASS**|
|Original legacy181|**145 PASS/36 FAIL**,case-by-case baseline match|
|Isolated downstream controls181|**176 PASS/5 FAIL**,không production-policy acceptance|
|Readiness/diagnostics|Actual**32/1,8/5**;controls**33/0,13/0**,historical conflicts unchanged|
|Foundation single-intent control|**22/22 PASS**,original17/5 giữ nguyên|
|Historical F unmodified|Exit1 fail-fast như baseline; không suy full PASS|
|Frontend/backend build|**PASS/PASS**|

Legacy181 gồm171 backend+10 original frontend G1 cases. Assertions/registrations/names/status giữ nguyên; derived observation runners và isolated controls không tính thành production PASS. 49 audit files ghi0 forbidden network/PG connect; Node guard kế thừa và browser API mock/dead proxy. Final DB/native log kiểm độc lập không write/POST thêm.

## 19. Integrity và acceptance theo lớp

[Before hashes](evidence/t-ai-04-planner-real-tool-live-e2e/integrity-before.json), [after hashes](evidence/t-ai-04-planner-real-tool-live-e2e/integrity-after.json), [artifact seal](evidence/t-ai-04-planner-real-tool-live-e2e/artifact-checksums.json): **6747 protected files unchanged**, changed=[]. Data Readiness33 artifacts/report, old resume/search evidence, benchmarks/V2 locks và84 compiled modules hash-match. Chỉ thêm report/evidence/harness task này; không production/source/expected edits,commit/push/deploy. Working tree có changes từ trước, không revert hoặc claim clean.

| Lớp | Actual |
|---|---|
|FIXTURE_CREATION|NOT RUN/BLOCKED_QUOTA_PREWRITE|
|DIRECT_PLANNER|NOT RUN|
|RAW_NLU|NOT RUN/NOT EVALUATED|
|G2_HISTORY|NOT RUN LIVE; offline68 PASS tách riêng|
|SAFETY|PASS read-only/prewrite stop; model→tool LIVE NOT RUN|
|REAL_TOOL_FIDELITY|NOT RUN|
|BROWSER_LIVE|NOT RUN|
|DB_CLEANUP|N/A,0 inserts/DELETE; IDs absent|
|DEMO_READINESS|BLOCKED_QUOTA; maintenance isolation chưa establish|

**P1 raw NLU OPEN, P2 runtime OPEN**. H01 FIXED và search raw2/2 PASS lịch sử giữ riêng; không nhận toàn Planner PASS từ regression/guard.

## 20. NEXT TASK PLAN và điểm dừng

Lượt hiện tại dừng **BLOCKED_QUOTA_PREWRITE**. Khi được yêu cầu resume trong phạm vi đã duyệt: fresh quota đủ toàn chuỗi → enforced maintenance isolation và DB/collision/hash gates → exact profile2 INSERT/ledger → direct Planner/oracle verification → native body/manifest lock → runtime readiness → capped LIVE → safe cleanup → actual final fingerprint. Không tự đổi profile/IDs/expected, bỏ conditional reservation hoặc auto-run khi mốc lý thuyết đến.

NEXT TASK theo yêu cầu: **T-AI-04-V2-LIVE-EVALUATION-READINESS**, chỉ đề xuất; còn phụ thuộc Planner LIVE chưa được nghiệm thu. Không chạy V2/benchmark/inference bổ sung hoặc deploy.

**DỪNG SAU BÁO CÁO.**
