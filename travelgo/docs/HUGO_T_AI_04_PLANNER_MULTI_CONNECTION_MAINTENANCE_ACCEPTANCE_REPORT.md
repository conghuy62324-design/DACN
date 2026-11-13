# T-AI-04 — Multi-Connection Maintenance Ownership Acceptance

Ngày 11/11/2026, Asia/Saigon. **Exit gate B — MULTI_CONNECTION_ACCEPTANCE_PARTIAL**.

**149/149 offline checks PASS**; actual multi-connection provenance, all25 lock acquisition, registered probe conflict, A/B handoff completion, closing ownership và disposal đều đạt trong phạm vi quan sát. **8/10 physical attempts, closed8/8, DML0, DB_UNCHANGED_25_25, Place22/22, Trip27/27**.

**Chưa nghiệm thu yêu cầu all25 handoff không có khoảng hở cho writer.** Raw runner ghi A vì assertion quá rộng; review cuối giữ nguyên raw đó và kết luận **B**, không LIVE-ready. Không query/lock thêm hoặc sửa runtime để chạy lại. PID9686 UNKNOWN; P1/P2 OPEN.

[Owner scope](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/owner-task.txt), [offline gate](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/phase-a-gate.json), [raw runner](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/real-result.json), [reviewed exit](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/exit-gate.json), [handoff review](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/handoff-reviewed.json), [artifact seal](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/artifact-checksums.json).

## 1. Owner scope

Chỉ127.0.0.1:5432/travelgo_ai_m0_test; hard cap10 physical attempts gồm bootstrap/pool/maintenance/observer/probe/final verifier. Startup READ ONLY cho readers; maintenance/probe chỉ BEGIN READ WRITE để LOCK/transaction controls. Không DML/DDL/seed/reset/fixtures, production edits, Planner/Ollama/Browser/V2, unknown PID termination/adoption, limiter reset, commit/push/deploy.

Đã dùng8 attempts, không reconnect/retry failed connection; hai allowance còn lại không được tự dùng cho lượt khác. Expected NOWAIT lock rejection không phải failed connection hoặc retry.

## 2. Historical baseline

Đã đọc [Address Normalization](HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_ADDRESS_NORMALIZATION_REPORT.md), [Guard Fix](HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_GUARD_FIX_REPORT.md), [Diagnosis](HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_DIAGNOSIS_REPORT.md), [Targeted Resume](HUGO_T_AI_04_PLANNER_LIVE_TARGETED_REVALIDATION_RESUME_REPORT.md), [Adapter Acceptance](HUGO_T_AI_04_PLANNER_ADAPTER_BINDING_ACCEPTANCE_FIX_REPORT.md), candidate helpers/registry/managed factory/maintenance bridge/RealGuards/cleanup/orchestrator và source closure. [Hash index](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/baseline-review.json).

Giữ nguyên original51 +84 normalization checks và single self trace PASS; historical PID9686 UNKNOWN, Planner LIVE NOT RUN, P1/P2 OPEN. Old reports/raw/verdict/expected không sửa. Historical fixture restoration không được dùng thay phép đo integrity mới của task này.

## 3. Offline acceptance

Một lượt mới: [39 checks](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/offline-acceptance-01.json) + [12 integration checks](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/integration-acceptance-01.json) + [84 address checks](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/normalization-acceptance.json) + [14 multi-connection checks](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/multi-acceptance.json) = **149 PASS/0 FAIL**. Original assertions giữ byte. Parent/child processes và independent expected dispatch/disposal/cap/outcomes;145 completed offline network audits có0 sockets/HTTP.

14 mới gồm concurrent pool acquisitions, separate bootstrap, pending physical-open race, stale disconnect snapshot, PID reuse, released idle session, unknown giữa snapshots, handoff success/error, observer/probe thiếu proof, missing registry, partial disposal và cap exceeded. Negatives phải nonzero, global STOP và late Agent/native/tool/operator callbacks0. Partial cleanup giữ primary error và RESOURCE_CLEANUP_BLOCKED đúng expected.

Handoff-positive sensor mô hình hóa chuyển25 locks như một đơn vị; **không chứng minh semantics per-relation của PostgreSQL**. Vì vậy149 PASS không đủ nhận all25 no-gap acceptance. Không sửa expected hoặc chấm lại các artifacts cũ để lấy PASS.

Preparation từng bị copy trùng synthetic-db.cjs vì đã nằm trong source closure; [record](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/preparation-review.json) giữ lỗi trước acceptance/DB0. Các copies đã hoàn tất, source list được deduplicate; không rerun initializer write-once. Phase A kiểm mọi copied hash trước chạy và không có acceptance failure.

## 4. Fresh DB/route preflight

[Route proof](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/fresh-route-verified.json) từ OS/Docker lúc **16:56:08.521 Asia/Saigon**: exact container ID2264485f39052a4c1d00f4cf1af9b7b7a3712f9bf4a47e36a114c40fb0fbfa1d, target5432, container172.18.0.3/gateway172.18.0.1, signed WSL relay/Docker listener và WSL2 Running. Route/source closure/exact role kiểm trước first connect.

[DB preflight](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/phase-b-preflight.json): exact database, postgres role, sentinel hugotravel-isolated-test-database-v1, default/transaction RO on;12/12 migration file/DB checksums; schema SHA256 `7805ddb1eb77028bfef96923c8adb8f0224bd54296dac39910546035154c544f`. Before fingerprint25 bảng bằng approved readiness baseline, Place22, Trip27; hai approved fixture IDs absent. Initial actual inventory chỉ có owned observer; không phát hiện unknown trước locks.

## 5. Actual physical inventory

[Reviewed provenance](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/provenance-reviewed.json), [attempt/SQL ledger](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/attempt-sql-ledger.json) chứa full instance UUID/token/tag/endpoint/identity/evidence links.

| Purpose | PID | backend_start UTC | Final |
| --- | ---: | --- | --- |
| Observer |20510 |09:56:28.929833 |CLOSED |
| Sequelize bootstrap |20511 |09:56:29.268134 |CLOSED |
| Pool client1 |20512 |09:56:29.296795 |CLOSED |
| Pool client2 |20513 |09:56:29.298185 |CLOSED |
| Maintenance A |20514 |09:56:29.331995 |CLOSED |
| Maintenance B |20515 |09:56:29.348496 |CLOSED |
| Controlled probe |20516 |09:56:29.364559 |CLOSED |
| Final verifier |20517 |09:56:29.463125 |CLOSED |

Tám instance/token khác nhau, tám actual socket attempts; no reconnect/retry. Không mở external unowned client để ép negative guard.

## 6. Bootstrap and pool lifecycle

Actual installed Sequelize6.37.8/pg8.23.1; initial getConnection naturally tạo version/bootstrap client ngoài pool, không ép thêm metadata client. Bootstrap registered/disposed, khác hai pooled clients. Hai acquisitions chạy Promise.all với test-only constructor pool max2; AsyncLocalStorage liên kết concurrent physical creation với scope bootstrap/pool.

[Phase C](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/phase-c-provenance.json) chứng minh hai pool clients riêng, startup/self READ ONLY. Sau release, actual pg_stat_activity ghi cả hai idle và registry RELEASED; reacquire đúng hai objects cũ, không thêm attempt. Giữ chúng acquired qua lock smoke để tránh idle eviction tự phát; finally release rồi pool.close.

## 7. Connection provenance

Mỗi client có CREATE → PHYSICAL_OPEN/PENDING → RAW_SELF_IDENTITY → REGISTRATION_PASS → DISPOSE_START/PASS. Startup payload thực tế được capture; raw identity persist/hash trước assert. Protocol client.processID được unchanged registry.register đối chiếu self PID, backend_start, DB/user/sentinel, unique startup token và normalized route trước REGISTRATION_PASS.

All8 startup default/transaction RO on và statement timeout15s. Direct policy vẫn kiểm port equality; forwarded policy có independent mapping proof và host-only normalized addresses, không whitelist IP/PID/tag đơn lẻ. Full inventory dùng immutable snapshots; lifecycle sequence đổi/pending/unknown vẫn reject, không âm thầm refresh.

## 8. Maintenance A/B ownership

A/B/probe đều registered đầy đủ trước BEGIN READ WRITE. Raw settings ghi lock_timeout3s, statement_timeout15s, transaction RO on trước BEGIN. Read/write transaction chỉ được phép trên factory maintenance/probe, với exact approved LOCK/control strings; runtime/observer/final readers giữ readonly boundary.

Base được nạp bằng test-only DB dependency, không sửa library/production hoặc Base lock policy. Driver chỉ gọi sql/prove/locks/queueGuardWrapped; không gọi prepare/insert/fixture cleanup. Role postgres là superuser, không least privilege. Không grants/role/schema changes.

## 9. All25 lock acquisition

[Phase D raw events](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/phase-d-lock-smoke.json): A PID20514 giữ **25 distinct granted ShareRowExclusiveLock** lúc16:56:29.403. Target list bằng đúng25 approved public tables từ fingerprint; actual pg_locks/pg_class metadata được persist trước proof assertion.

Sau observed handoff, B PID20515 giữ **25 distinct granted ShareLock** lúc16:56:29.428. Khi B COMMIT, actual maintenance lock inventory rỗng; cuối task final verification không thấy task-owned public locks. Đây là các snapshots/proofs thực tế, không chỉ SQL intent.

## 10. Probe conflict and handoff — giới hạn quyết định gate

Registered probe PID20516 mở bounded RW transaction, thử ROW EXCLUSIVE NOWAIT trên public.places, nhận đúng **55P03**, rồi ROLLBACK. Không dùng DML để thử conflict. Một expected conflict, không unexpected SQL error.

Actual ordering: B lock statement pending, pg_blocking_pids(B) chứa A, event queue lúc16:56:29.415 → A COMMIT acknowledged → B acquired all25 → B COMMIT/release. Ownership và pre/post lock inventories đều PASS. Đây chứng minh **handoff đã hoàn tất trong lượt không có writer**, chưa chứng minh liên tục bảo vệ cả25 quan hệ khỏi mọi writer.

PostgreSQL15 xử lý danh sách LOCK theo từng quan hệ, theo thứ tự; source LockTableCommand cũng thực hiện acquisition trong vòng lặp. [PostgreSQL15 LOCK](https://www.postgresql.org/docs/15/sql-lock.html), [official source](https://github.com/postgres/postgres/blob/REL_15_STABLE/src/backend/commands/lockcmds.c).

**Suy luận review:** B bị chặn tại quan hệ đầu không đồng nghĩa cả25 yêu cầu lock đã được queue trước A COMMIT. Current trace không có per-relation continuity/adversarial registered probe chứng minh các quan hệ sau luôn được bảo vệ trong chuyển giao. Không khẳng định writer thực tế đã lọt vào hoặc dữ liệu bị đổi. [Handoff review](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/handoff-reviewed.json) đánh dấu **ALL25_NO_GAP_NOT_PROVEN**.

Raw runner A và phase-D PASS marker được giữ nguyên, nhưng auto assertion chỉ kiểm queue/order/post locks nên kết luận full gate quá rộng. Review sửa **scope kết luận**, không sửa raw/expected/source để ép PASS. Kết quả nghiệm thu cuối **B — PARTIAL**; không full maintenance/LIVE-ready.

## 11. Closing guard

[Phase E](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/phase-e-closing.json) actual inventory gồm6 active owned clients: observer, hai pool, A/B, probe; bootstrap đã retired. Full identity match, pending/unknown0 trong snapshot, maintenance public locks0.

Unknown/backend_start/PID-reuse/missing-proof behavior được negative injection offline. Không tạo unknown thật hoặc thêm blank application_name vào allowlist. Closing PASS không thay thế no-gap proof ở bước trước.

## 12. Disposal/resource cleanup

[Resource cleanup](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/resource-cleanup.json): **RESOURCE_CLEANUP_PASS**. Đóng dispatch fence; rollback mọi transaction còn tracked nếu có; release held pool clients và close pool; close A/B/probe; observer đo prior owned sessions/locks residual0/unknown0 rồi close.

Final verifier sau đó thấy chỉ chính nó, không prior task sessions, public task locks0; cuối cùng end client final. Attempt ledger ghi tất cả8 CLOSED/disposed, transactionsRemaining0. Không mở connection thứ9 để kiểm last-client close; final end completion là teardown proof cuối. Không terminate unknown PID.

[Warnings](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/execution-warnings.json) giữ3 DEP0174 từ installed Sequelize promisify với async managed end callback. Chưa sửa/suppress warning hoặc chạy lại --trace-deprecation; actual disposal được đo riêng. Raw process exit0 không thay reviewed gate B.

## 13. Final database fingerprints

[Fresh final comparison](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/final-db-comparison.json) lúc **16:56:29.674 Asia/Saigon**, sau initial7 clients/locks đã giải phóng, dùng attempt8 READ ONLY: **DB_UNCHANGED_25_25**. Before/after25 table count/sorted-row-MD5 hashes bằng nhau, Place22/22, Trip27/27, approved fixtures absent, public task locks[].

Trip content hash trước/sau cùng `b91b189ffd9b503c32cedd744319c730209fb78f67bb0770b400ca1e24b63389`. Không gọi DB_RESTORED vì không có fixture/entity write; đây là phép đo mới, không dùng historical restoration thay thế.

## 14. Network/SQL audit

[Audit review](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/sql-network-reviewed.json): **105 audited SQL dispatches**, DML issued0, forbidden0, expected probe conflict1, unexpected SQL errors0. Dispatch count có thể chứa combined dialect session SET commands; không đồng nhất với số SQL statements bên trong một string.

Readers startup RO; RW controls chỉ phục vụ LOCK/transaction.145 offline process audits network0; actual trace1 process, **8 loopback5432 sockets**, blocked0, HTTP0. Ollama GET/POST0, Planner0, browser0, fixture0. Primary-source documentation review sau trace chỉ đọc website, không DB/browser LIVE hoặc thêm physical attempt. Đây là process-boundary audit, không OS-wide capture.

## 15. Source/benchmark integrity

[Final integrity](evidence/t-ai-04-planner-multi-connection-maintenance-acceptance/integrity-after.json): **10223 protected files unchanged**,445 sealed normalization artifacts/report giữ hash,84 compiled production modules match.40-file Phase A source closure khớp sau real run; original candidate/normalizer/Base/orchestrator/tests copied hashes giữ nguyên.

Chỉ thêm task-local controller/budget/SQL allowlist/readonly fingerprint/tests/evidence/report. Production Agent/Planner/Catalog/Auth/consent/limits/SYSTEM/schema/tool gate, DB schema/roles/grants, fixture proposal, V2 benchmark và historical expected/verdict không đổi. Không commit/push/deploy hoặc broad build/regression ngoài149 checks. Không sửa lock policy sau phát hiện thiếu proof, không rerun real smoke.

## 16. Historical PID9686

**UNKNOWN**. Các PID20510–20517 mới có provenance riêng không hồi tố ownership của PID9686. Không whitelist/adopt/terminate hoặc sửa historical STOP/verdict.

## 17. P1/P2 status

**P1 NLU OPEN; P2 runtime OPEN**. Historical Planner R01–R03 LIVE NOT RUN. Không genuine model/provider/browser/Planner request mới; sensor labels không phải LIVE execution.

## 18. Remaining limitations

Ownership/bootstrap/concurrent pool/idle release/disposal và observed lock smoke có proof thật; DB không đổi. Nhưng required all25 handoff continuity chưa được chứng minh. Positive sensor model và runner exit assertion bỏ thiếu điều kiện này, nên reviewed B là kết quả cuối. Không đủ điều kiện đề xuất targeted LIVE ngay.

Unknown behavior chỉ được injection offline theo scope; không thử real unowned external session hoặc entity DML.3 lifecycle deprecation warnings còn giữ. Không có assurance vô hạn về clients/data sau các measured snapshots và resource close.

## 19. NEXT TASK PLAN — chỉ đề xuất

Đề xuất **T-AI-04-PLANNER-MAINTENANCE-HANDOFF-CONTINUITY-ACCEPTANCE**: review cơ chế per-relation acquisition trước, tạo independent adversarial schedule tests không giả định atomic25 lock transfer; nếu được cấp scope mới, dùng registered controlled lock-only probe để kiểm các quan hệ sau trong handoff, vẫn no DML và bounded finally cleanup. Không tự thay production locking policy hoặc dùng2 connection allowance còn lại của lượt này.

**Không đề xuất/chạy T-AI-04-PLANNER-LIVE-TARGETED-FINAL-REVALIDATION tại gate B.** Chỉ khi đầy đủ gate A ở task riêng mới xem xét LIVE với owner approval mới, fresh Agent quota/principal, exact fixture creation/cleanup/isolation/ledger, independent direct oracle, locked manifest/body hashes và native POST budget riêng.

**Dừng sau báo cáo. Không triển khai NEXT TASK.**
