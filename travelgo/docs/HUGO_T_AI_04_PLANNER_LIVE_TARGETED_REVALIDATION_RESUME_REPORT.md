# T-AI-04 — Planner LIVE Targeted Revalidation Resume

Ngày 11/11/2026, Asia/Saigon. **STOP_PRELIVE_UNRECOGNIZED_DB_CONNECTION**.

Phase A **64/64 PASS**, fresh quota **20 remaining / reserve7**. Đã tạo đúng hai approved fixtures và đo ba direct Planner variants, nhưng closing maintenance guard sau direct verification gặp kết nối chưa xác minh ownership: **PostgreSQL PID9686, application_name rỗng, state idle/ClientRead**. Đã STOP, không bỏ qua/whitelist/terminate PID, không retry. **R01/R02/R03 LIVE NOT RUN; Ollama GET/POST0, native0/4**.

Guarded cleanup đã xóa đúng hai task-owned fixtures và đo **DB_RESTORED_25_25**. Sau regression, phép đo READ ONLY mới tiếp tục khớp **25/25 bảng, Place22/22, Trip27/27, residual fixture0**. Regression/build hoàn tất, giữ baseline failures. **P1/P2 OPEN**, không full NLU/LIVE hoặc production-ready PASS.

[Reviewed result](evidence/t-ai-04-planner-live-targeted-revalidation-resume/results-reviewed.json), [original stop](evidence/t-ai-04-planner-live-targeted-revalidation-resume/master-stop.json), [master result](evidence/t-ai-04-planner-live-targeted-revalidation-resume/master-result.json), [artifact checksums](evidence/t-ai-04-planner-live-targeted-revalidation-resume/artifact-checksums.json).

## 1. Approval và scope mới

[Owner task](evidence/t-ai-04-planner-live-targeted-revalidation-resume/owner-task.txt) cấp ngân sách mới: exact PROFILE2 trên travelgo_ai_m0_test, tối đa1 conditional load-only +3 genuine inference, total hard cap4, concurrency1, no retry/hidden warm-up, cleanup cùng scope. Không kế thừa cap dư của lượt bị chặn.

Đã đọc năm baseline reports được giao cùng corrected implementation/contract/acceptance, fixture proposal/design, direct cost oracle, previous manifest và native audit. [Review hashes](evidence/t-ai-04-planner-live-targeted-revalidation-resume/baseline-review.json). Historical reports/raw/expected/verdict giữ nguyên. Không production/prompt/schema/gate/algorithm edits, Trip/Booking/User/Business changes, global G2 enable, commit/push/deploy hoặc V2 LIVE.

## 2. Phase A — final real adapter integration gate

[Gate](evidence/t-ai-04-planner-live-targeted-revalidation-resume/phase-a-final-gate.json): **PASS**, original21 + lifecycle33 + shared cap10 = **64 checks mới**. Separate child processes/sensors và production proof serialization dùng network-deny preload; 65 completed process audit files ghi0 PG/network attempts. Candidate runtime chưa được instantiate ở Phase A.

Corrected orchestrator dùng typed cleanup lifecycle, original error/stop latch/AbortSignal, later NOT RUN, mandatory guards và process nonzero. Operator/inference dùng cùng cap4/3/1; quota Agent20/hour kiểm riêng. Missing adapters, R01 fidelity/UI failure, pre/post-commit cleanup và disposal cases đã kiểm offline.

Bản harness task mới bổ sung source closure check cho18 runtime/dependency files, gồm cleanup-lifecycle; raw decision metadata được capture trước assertion, UI có cost screenshot bằng ordinary scrolling. Không thay expected hoặc safety assertions. [Source closure implementation](evidence/t-ai-04-planner-live-targeted-revalidation-resume/source-lock.cjs). Cuối task hashes vẫn khớp Phase A.

## 3. Fresh quota và TTL

[Fresh snapshot](evidence/t-ai-04-planner-live-targeted-revalidation-resume/quota-phase-b.json) lúc **05:49:11Z**: known historical attempts103, recent0, remaining20, future entries0, required7. Master kiểm lại trước DB và được PASS.

Cùng approved principal `9997f6db-bfa1-4377-96f3-5b5ea19dbf34`, SHA-256 `6b982d095bc6bc30c87955cd38c78afa9ef31d3447ef30f62e8684bbe8bce600`. Scanner đọc cả at/createdAt, dùng timestamp muộn hơn, scan toàn historical attempts và conservative operator accounting; không reset ledger/limiter hoặc đổi principal.

Reserve gồm desktop start1, R01 confirm1, R02 budget1, desktop revoke1, mobile start1, mobile revoke1 và operator1 = **7 entries**. Default20/hour giữ nguyên. Sau stop vẫn20 vì chưa có Agent HTTP/load entry. LIVE session/absolute TTL15 phút **chưa chạy**, không tạo metadata/expiry LIVE giả.

## 4. Fresh DB safety và enforced isolation

[Initial DB/isolation gate](evidence/t-ai-04-planner-live-targeted-revalidation-resume/phase-a-db-isolation.json), [DB preflight](evidence/t-ai-04-planner-live-targeted-revalidation-resume/db-preflight.json) đo đúng127.0.0.1:5432/travelgo_ai_m0_test, sentinel hugotravel-isolated-test-database-v1, **12/12 migration checksums**, schema SHA-256 `7805ddb1eb77028bfef96923c8adb8f0224bd54296dac39910546035154c544f`. Baseline25 bảng, Place22, Trip27; UUID/slug collision0, incoming FK/Trip JSON refs0.

Role postgres superuser, không least privilege. Runtime database connection guard luôn READ ONLY/SELECT-SHOW; maintenance connections riêng chỉ cho exact approved INSERT/DELETE và lock controls.

Enforcement đo thật: ShareRowExclusiveLock toàn25 bảng trước write; kết nối probe khác yêu cầu RowExclusive NOWAIT bị chặn **55P03**, không thử entity write. SHARE guard được queue trước COMMIT và handoff không có khoảng hở; giữ all25 locks qua direct reads. Đây là enforcement, không chỉ snapshot “không có writer”.

**Closing guard FAIL** lúc05:50:13.786Z: foreignConnections thấy PID9686 chưa nằm trong ownership allowlist, application_name rỗng, client backend, idle/ClientRead. Không kết luận đây là writer hoặc là connection của task; ownership chưa được chứng minh. Không có mutation ngoài scope được đo thấy. Guard vẫn yêu cầu STOP dù connection đang idle.

## 5. Fixture creation ledger

[Write intent](evidence/t-ai-04-planner-live-targeted-revalidation-resume/fixture-write-intent.json) ghi trước INSERT; [committed ownership ledger](evidence/t-ai-04-planner-live-targeted-revalidation-resume/fixture-committed-ledger.json) có exact affected2, full raw rows/slugs/timestamps/SHA256/MD5, commit acknowledged/read back. Một INSERT statement tạo đúng hai records, không UPSERT/UPDATE hoặc tạo entity khác.

| Fixture | Exact ID | priceFrom | Full committed row SHA-256 |
| --- | --- | ---: | --- |
| A01 | f7433d4a-5f49-4991-8add-b55435b02eb0 | 100000 | `923d64fcc8434e27249f4d8a6bd940cd944ddc8012062cce43ae31ec330906dd` |
| A02 | 5a1e8835-770c-41a2-8699-74deba239a86 | 150000 | `80a44c4f9818fcc19204436ccc34dda901fd73cb20ec0d37aee401ac729efcc3` |

Created timestamps cùng `2026-11-11T05:50:12.883058+00:00`. Row MD5 A01 `fb54ad3681b7aa1d8f355cfdf0a73a17`, A02 `56f9e296eb400c1af18d296ed11ca08b`. Full attributes giữ attraction/Đà Nẵng/APPROVED/business_id NULL và TEST FIXTURE theo approved proposal.

Trong thời gian fixture: Place24 = baseline22 +2; original22 row hashes và24 bảng khác/Trip27 không đổi tại các guard đã PASS. Không gọi fingerprint25/25 unchanged khi fixtures còn tồn tại. Production loader thật trả16 eligible records, gồm14 baseline+2 synthetic attractions.

## 6. Direct Planner oracle — business PASS, closing guard FAIL

[Direct outputs gốc](evidence/t-ai-04-planner-live-targeted-revalidation-resume/direct-oracles.json), [independent review](evidence/t-ai-04-planner-live-targeted-revalidation-resume/direct-planner-reviewed.json). Actual production catalogPlannerTools/Planner/Catalog/PostgreSQL được gọi, không Ollama.

| Variant | Transportation | Budget | Total | Remaining |
| --- | --- | ---: | ---: | ---: |
| R01 oracle | motorbike | 6.400.000 | 3.500.000 | 2.900.000 |
| R02 oracle | motorbike | 9.000.000 | 3.500.000 | 5.500.000 |
| R03 oracle | car | 6.400.000 | 3.500.000 | 2.900.000 |

Huế→Đà Nẵng,2036-04-22/23, adults2: hai ngày/một đêm, A02 ngày1/A01 ngày2 mỗi fixture đúng một lần. Independent item/day/lodging sums đúng **2.600.000/900.000**, sightseeing300000/200000, lunch700000/300000, dinner400000 mỗi ngày, lodging1200000 đúng một đêm. Selected IDs đúng A02/Seafood/A01; hotel suggestion giữ đúng public projection. Haversine/ETA kiểm độc lập theo motorbike35/car30, costs không bị cắt theo budget.

Sáu direct controls PASS: low-budget100000 vẫn total3500000/over3400000, invalid budget/date/adults/mode và no-sightseeing destination trả đúng controlled errors.

File direct-oracles đã ghi trước khi closing `maintenance.assertFixtures('after-direct')` FAIL. Vì vậy chỉ nhận **BUSINESS_ORACLES_PASS_FINAL_SAFETY_GUARD_FAIL**, **không nhận toàn Phase E PASS**. Không có phase-c-direct PASS marker, chưa khóa/freeze manifest để inference. Giữ nguyên artifact gốc; review không che safety failure.

## 7. Locked manifest/native body hashes

**NOT LOCKED / NOT EXECUTABLE**. Execution dừng trước lock-manifest child, nên không có final manifest, manifest-lock hoặc body-R01/R02/R03 files. Candidate capture code và Phase A source closure đã có hashes nhưng không phải LIVE dispatch authorization hoặc body lock ready.

Exact planned messages/manual confirmation/budget/car-mobile scenarios giữ nguyên approval; không đổi expected sau measured output. Không tự dựng manifest ready để vượt closing guard.

## 8. R01/R02/R03 LIVE results

| Case | Actual |
| --- | --- |
| R01 desktop manual Xe máy confirmation→plan_trip | NOT RUN_BLOCKED_PRELIVE_GUARD |
| R02 same desktop session budget9000000 | NOT RUN_BLOCKED_PRELIVE_GUARD |
| R03 fresh mobile complete car request | NOT RUN_BLOCKED_PRELIVE_GUARD |

Desktop start/revokes/mobile start cũng chưa dispatch. Không dùng slot dư để probe, không retry task hoặc historical L04.

## 9. Raw NLU

**NOT EVALUATED**: native returned/schema/semantic-evaluated0. Direct service outputs không phải raw model decisions. Không chấm pre-LIVE guard blocker thành raw FAIL hoặc PASS. Historical Planner raw3 PASS/1 FAIL và natural transportation correction L04 FAIL giữ nguyên.

## 10. G2 history

**NOT RUN LIVE**. Runtime factory/corrected case loop chưa được instantiate/entered; không có actual server conversation ID/revision/owned memory session hoặc opt-in LIVE mới. Không API revoke cần chạy sau stop; no Agent activity được tạo. Phase A memory stores được dispose trong offline capture finally, không thay thế G2 LIVE evidence.

## 11. Execution safety và stop contract

Pre-case master bắt original maintenance assertion, không chạy các phase tiếp theo, process exit1. Vì case loop chưa vào, dùng outer cleanup qua **cùng cleanup-lifecycle** đã nghiệm thu; không fake một case failure/model response. Agent-triggered tool executions0; direct read-only adapter calls được ghi riêng ở Phase E.

Không đổi principal, allowlist/adopt/terminate PID9686, reset quota, sửa source/expected hoặc đợi rồi thử write/inference lại. Source snapshots và exact-row checks không thấy mutation ngoài hai fixtures. Master READ ONLY ORM audit ghi **387 queries/0 forbidden SQL/7 cumulative connection events**; maintenance entity DML là hai statements riêng, INSERT2 và DELETE2 đã duyệt. Những counters này không đủ để quy ownership của PID9686.

## 12. Planner public JSON fidelity

**NOT RUN LIVE** vì không có model-triggered Planner/API/browser response. Direct variants kiểm public adapter output với approved independent cost/ETA/ID expectations; H02 comparator chỉ normalize itinerary.id/createdAt vẫn nguyên guard, nhưng không được dùng direct output làm completed LIVE fidelity PASS.

Không sửa historical original fidelity assertions hoặc raw verdict bằng reviewed JSON.

## 13. Desktop/mobile UI

**NOT RUN LIVE**: không mở browser/Vite/Express của candidate, không actual desktop1440×900/mobile390×844 Planner screenshots mới. Mocked browser regression74 PASS sau cleanup là **MOCK_ONLY**, không lấp coverage R01/R03. Không route mock trong LIVE vì LIVE chưa khởi động.

## 14. Runtime/GPU và native boundary

[Final native audit](evidence/t-ai-04-planner-live-targeted-revalidation-resume/native-final-audit.json): **load-only0/inference0/total0/4**, attempts=[], retry0, hiddenWarmup0; metadata GET0, sau stop GET/POST0. Local Ollama log window có0 POST, guarded master sockets chỉ đến PostgreSQL5432, không11434.

Current model/version/digest/residency/context/GPU/RAM/latency/tokens/deadline **NOT MEASURED**; không gọi metadata/preload/unload. Approved qwen3 tag/digest, loopback11434, JSON/streamfalse/temp0/ctx16384/predict2048/application15s/concurrency1 giữ là requirements, không current runtime verification PASS. **P2 OPEN**.

## 15. Exact cleanup

[Cleanup write intent](evidence/t-ai-04-planner-live-targeted-revalidation-resume/cleanup-write-intent.json), [result](evidence/t-ai-04-planner-live-targeted-revalidation-resume/cleanup-result.json), [maintenance final audit](evidence/t-ai-04-planner-live-targeted-revalidation-resume/maintenance-final-audit.json).

Outer lifecycle xác định committed task fixtures, kiểm ledger hash/IDs/slugs/full row SHA/MD5, đầy đủ incoming FK/Trip JSON refs0, foreign-connection/isolation guards và25-table locks. Preconditions được đánh giá lại ngay trước callback; existing maintenance tiếp tục recheck trước exact DELETE. Cleanup guards lúc đó PASS; không suy rằng PID9686 đã được xác định ownership hoặc tự thay đổi policy.

DELETE đúng hai owned IDs với slug+committed row MD5, **affected2**, không CASCADE/SET NULL vào dữ liệu khác. Queued lock handoff bảo vệ commit; residual IDs0, Place22, Trip27, changed tables0. Không force delete, restore dump hoặc sửa baseline để ép equality. Status **DB_RESTORED_25_25**, fixtureStillOwnedfalse, ambiguousfalse; task-owned clients/pool được đóng.

## 16. Actual final fingerprint

[Before](evidence/t-ai-04-planner-live-targeted-revalidation-resume/fingerprint-before.json), [after cleanup](evidence/t-ai-04-planner-live-targeted-revalidation-resume/fingerprint-after-cleanup.json), [final post-regression comparison](evidence/t-ai-04-planner-live-targeted-revalidation-resume/fingerprint-final-compare.json).

Lúc **05:56:49.734Z**, SELECT/SHOW recheck mới xác nhận **DB_RESTORED_25_25_RECHECKED_AFTER_REGRESSION**: 25 bảng count và sorted-row-hash fingerprint bằng baseline, Place22→22, Trip27→27 full content hashes bằng nhau, hai fixture absent, residual[]. READ ONLY on;43 queries/forbidden0, HTTP attempts0. Đây là phép đo mới, không chỉ historical baseline. Không claim maintenance window tiếp tục sau khi clients đã đóng.

## 17. Regression/build sau cleanup

[Summary](evidence/t-ai-04-planner-live-targeted-revalidation-resume/regression-summary.json), [raw execution](evidence/t-ai-04-planner-live-targeted-revalidation-resume/final-verified/execution.json), [mock browser](evidence/t-ai-04-planner-live-targeted-revalidation-resume/browser-01/results.json).

| Newly executed suite | Actual |
| --- | --- |
| Frontend G1/G2 unit | **10+39=49 PASS** |
| Mocked browser desktop/mobile | **74 PASS**,37 mỗi viewport,0 fail/skip/flaky/retry |
| Backend G2/Natural Proof/Compatibility | **68/79/61 PASS** |
| Correction/Completeness | **42/52 PASS** |
| Original legacy181 | **145 PASS/36 FAIL**, từng tên/status khớp baseline |
| Isolated downstream controls181 | **176 PASS/5 FAIL**, không production-policy PASS |
| Readiness | Actual32/1,control33/0 |
| Diagnostics | Actual8/5,control13/0 |
| Foundation single-intent control |22/0; original Foundation17/5 giữ riêng |
| Backend/frontend build | **PASS/PASS** |

16 legacy result files khớp từng case; historical F exit1 và readiness/diagnostics counts/exit cũng khớp. Không đổi original assertions để chữa historical conflicts. [Offline boundary audit](evidence/t-ai-04-planner-live-targeted-revalidation-resume/offline-boundary-audit.json):65 Phase A process audits và49 regression audits,0 PG connect/forbidden network attempts trong các phase offline. Authorized actual DB work và final READ ONLY audit được tách riêng. Không native inference hoặc DB mutation trong regression.

## 18. Source/benchmark integrity

[Integrity after](evidence/t-ai-04-planner-live-targeted-revalidation-resume/integrity-after.json): **8.889 protected files unchanged**, changed=[], 84 compiled modules khớp,307 sealed artifacts và report adapter-binding fix trước nguyên vẹn. Current18-file adapter source closure vẫn khớp Phase A; không sửa adapter sau stop để retry.

Chỉ thêm report/evidence/harness task mới và build-generated outputs. Production/SYSTEM/proof/history/schema/gate/Planner/Catalog/auth/limits/approved benchmark và historical results không đổi. Không commit/push/deploy, không V2 LIVE.

## 19. P1/P2 status

**P1 NLU OPEN, P2 runtime OPEN**. Không có genuine inference sample mới để đóng lỗi. Historical natural transportation correction L04 raw FAIL, original H04 FAIL, run2 raw3/1 và original fidelity/UI failures không bị nâng verdict. Offline64/direct arithmetic/regression không đủ cho full NLU, Planner LIVE demo readiness hoặc production-ready.

## 20. Remaining limitations

Chưa xác minh ownership/source của PID9686; idle/ClientRead không chứng minh writer, readonly hoặc task-owned. Closing safety gate FAIL vẫn là blocker dù initial enforced locks và cleanup/fingerprint đều đạt. Không có final LIVE manifest, real adapter instantiation hoặc R01–R03 coverage.

Next diagnosis phải phân biệt unowned external client với lifecycle/registration race của task-owned pool/metadata connections bằng proof, không blind-whitelist PID/application_name. Task hiện tại không điều tra bằng cách reconnect/terminate/retry execution. Post-regression SELECT chỉ xác minh final data, không giải quyết connection attribution.

## 21. NEXT TASK PLAN — chỉ đề xuất

Đề xuất **T-AI-04-PLANNER-MAINTENANCE-CONNECTION-OWNERSHIP-DIAGNOSIS**: offline source/sensor review và controlled READ ONLY connection provenance trace, ghi startup application_name/PID/ownership trước mọi guard, kiểm transient/bootstrap/pooled connection lifecycle; unknown client vẫn phải FAIL CLOSED. Không sửa production hoặc nới isolation/ownership guard.

Sau khi attribution/guard integration đủ proof, mới đề xuất targeted LIVE resume với fresh owner scope confirmation, quota/DB/isolation/fixture guards, oracle, manifest/body/dependency hashes và ngân sách riêng. Không tự dùng4 POST chưa tiêu của lượt này, không retry historical L04, không V2 LIVE hoặc deploy.

**Dừng sau kết quả, safe cleanup, regression và báo cáo này.**
