# T-AI-04 — Maintenance Handoff Continuity Acceptance

Ngày 11/11/2026, Asia/Saigon. **Gate B — HANDOFF_COUNTEREXAMPLE_CONFIRMED**. Current all25 A/B handoff **bị bác bỏ** dưới threat model có outside writer với quyền DML hợp lệ; maintenance/LIVE gate tiếp tục **BLOCKED**.

**31 independent offline checks PASS**, gồm64 conflict-matrix cells, các case A–O, sweep đủ25 targets, bounded scheduler và original ownership/cleanup guard injections. Có **9 writer-grant witnesses trong8 named scenarios**; sweep arrival sau guard cuối tìm counterexample ở24/25 targets. Các số này có lịch trùng nhau, không cộng thành số lỗi độc lập. **PostgreSQL thật0, actual DML0, Ollama/Planner/browser0**.

Không có replacement protocol được nghiệm thu dưới quyền/cap/policy hiện tại; không chuẩn bị READY real-DB experiment hoặc tự thay hạ tầng. [Reviewed design](evidence/t-ai-04-planner-maintenance-handoff-continuity/independent-design-review.json), [canonical witness](evidence/t-ai-04-planner-maintenance-handoff-continuity/canonical-counterexample.json), [independent results](evidence/t-ai-04-planner-maintenance-handoff-continuity/independent-acceptance.json), [real DB gate](evidence/t-ai-04-planner-maintenance-handoff-continuity/real-db-gate.json), [artifact seal](evidence/t-ai-04-planner-maintenance-handoff-continuity/artifact-checksums.json).

## 1. Historical baseline

Đã đọc toàn bộ [Multi-connection](HUGO_T_AI_04_PLANNER_MULTI_CONNECTION_MAINTENANCE_ACCEPTANCE_REPORT.md), [Address Normalization](HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_ADDRESS_NORMALIZATION_REPORT.md), [Guard Fix](HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_GUARD_FIX_REPORT.md), [Diagnosis](HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_DIAGNOSIS_REPORT.md), [Targeted Resume](HUGO_T_AI_04_PLANNER_LIVE_TARGETED_REVALIDATION_RESUME_REPORT.md), original handoff/lock/result/attempt ledger, Base/bridge/registry/cleanup sources và approved table list. [Read/hash index](evidence/t-ai-04-planner-maintenance-handoff-continuity/baseline-review.json).

Giữ nguyên historical149/149 offline PASS, actual8/10 attempts, disposal8/8, DML0, DB_UNCHANGED_25_25, Place22/22, Trip27/27 và reviewed gate B. Không sửa old raw runner A hoặc reviewed B. Task này không đo lại database; các số DB trên là historical. PID9686 UNKNOWN, Planner LIVE NOT RUN, P1/P2 OPEN.

## 2. PostgreSQL15 locking semantics

LOCK nhiều quan hệ acquire từng quan hệ theo thứ tự; lock đã acquire được giữ đến kết thúc transaction. Source LockTableCommand gọi relation acquisition trong vòng lặp. Vì vậy B bị block tại quan hệ đầu chưa phát hành request cho các quan hệ sau. [LOCK15](https://www.postgresql.org/docs/15/sql-lock.html), [official lockcmds.c](https://raw.githubusercontent.com/postgres/postgres/REL_15_STABLE/src/backend/commands/lockcmds.c).

A giữ SHARE ROW EXCLUSIVE trên25; B yêu cầu SHARE; fixture INSERT/DELETE cần ROW EXCLUSIVE. RX tương thích với RX của transaction khác nhưng bị SHARE/SRE chặn. A có thể giữ các mode xung đột với nhau trong chính transaction A. [Conflict matrix/DML/self-lock rules](https://www.postgresql.org/docs/15/explicit-locking.html).

Queue không phải FIFO tuyệt đối cho mọi PostgreSQL feature. Model dùng normal requests không có prior target locks, upgrades hoặc lock groups; source có priority exceptions. Trong subset của witnesses, earlier conflicting waiters có thể chặn request sau; wakeup còn kiểm granted holders. [Soft blockers](https://www.postgresql.org/docs/15/functions-info.html), [ProcSleep/ProcLockWakeup](https://raw.githubusercontent.com/postgres/postgres/REL_15_STABLE/src/backend/storage/lmgr/proc.c).

## 3. Formal safety property

[Contract chi tiết](evidence/t-ai-04-planner-maintenance-handoff-continuity/PROOF_OBLIGATION.md). T là exact25 schema-qualified relations từ historical LOCK SQL, hash-checked với approved fingerprint. Outside writer W đã authenticated và có quyền DML bình thường nhưng không thuộc ownership registry của task. UNKNOWN không có nghĩa PostgreSQL đã thu hồi quyền ghi của W.

Khoảng I bắt đầu sau khi A REGISTERED và thực sự HELD SRE trên toàn T, trước fixture DML. I tiếp tục qua A COMMIT, B acquisition, reader use và cleanup. Chỉ kết thúc khi uncommitted fixture work được safe rollback, hoặc exact committed cleanup/baseline verification hoàn tất. STOP/dispose/timeout/lost ACK không tự kết thúc I khi fixture đã commit.

```text
For every t in approved25 and every grant g inside I:
  NOT (g.actor outside task scope AND g.mode == ROW_EXCLUSIVE on t).
```

Phân biệt rõ HELD, WAITING, writer WAITING/GRANTED, RELEASED, COMMITTED, connection OPEN/CLOSED và ownership REGISTERED/UNKNOWN. WAITING không được tính là HELD/all25 protection. Một earlier request có thể soft-block writer trên cùng relation; nó không tạo protection trên một relation chưa được B yêu cầu.

## 4. Current A/B timeline

[Exact event log](evidence/t-ai-04-planner-maintenance-handoff-continuity/canonical-counterexample.json), [compact timeline](evidence/t-ai-04-planner-maintenance-handoff-continuity/counterexample-timeline.json). Model sequence là deterministic event index, không wall clock/real DB trace.

| Event | Hành động | Kết quả |
| --- | --- | --- |
|53 |A HELD all25, protection begin |Fixture chưa committed |
|57–58 |B request SHARE public.ai_model_registry |B WAITING,0 granted locks |
|59 |Last ownership sample PASS |Chưa có W |
|60–62 |W đến, request RX public.users |W WAITING trên A; B chưa request users |
|63 |A COMMITTED |Fixture visible, A releases locks |
|90 |B nhận SHARE bảng đầu |B mới giữ1/25 trong logging order này |
|**91** |**W được GRANTED RX public.users** |**Vi phạm I; writer UNKNOWN, A COMMITTED** |
|92–94 |W commit/disconnect |Không còn unknown session cho post sample |
|142–143 |B cuối cùng HELD25, post sample PASS |Không xóa được violation tại91 |

Witness không bypass một UNKNOWN đã được guard quan sát: W xuất hiện **sau** last sample. Case C/K riêng bắt UNKNOWN nếu đã quan sát và STOP trước A commit. Đây là lý do ownership guards vẫn cần thiết nhưng không tự là writer-admission barrier.

## 5. Per-table lock analysis

[Approved25/hash/source SQL](evidence/t-ai-04-planner-maintenance-handoff-continuity/approved-tables.json), [all25 sweep](evidence/t-ai-04-planner-maintenance-handoff-continuity/cases/all25_writer_targets.json). Mỗi target có full trace trong target-traces/01…25.json.

Trong schedule chuẩn, t1=public.ai_model_registry có B queued trước writer mới nên writer t1 vẫn WAITING. Với từng t2…t25, B chưa có request trên target lúc đang chờ t1; W queue target trước B. A commit có thể cấp RX cho W trong khi I vẫn active. **24 counterexample targets**, không bỏ relation nào; first-target zero trong riêng schedule này không chứng minh nó an toàn với prior waiters/disconnects.

Refutation dùng partial order `last sample < W.request(t25) < A.commit < W.grant(t25) < B.request(t25)`. Cross-relation release/wakeup order trong engine chỉ là logging abstraction. Lập luận không yêu cầu PostgreSQL nhả theo lexical order hoặc acquire/release25 atomically: không schedule B tiếp tục trong lúc A release các locks là một lịch hợp lệ, bất kể relation nào release trước. Writer t25 đã ở trước B trên chính queue đó.

## 6. Adversarial scheduler

[Lock manager](evidence/t-ai-04-planner-maintenance-handoff-continuity/lock-model.cjs), [protocol driver](evidence/t-ai-04-planner-maintenance-handoff-continuity/current-protocol.cjs), [separate property checker](evidence/t-ai-04-planner-maintenance-handoff-continuity/proof-checker.cjs), [case schedules](evidence/t-ai-04-planner-maintenance-handoff-continuity/scenarios.cjs).

Engine dùng per-relation granted holders + conflicting-waiter queues, transaction self-exemption và một outstanding request/backend. B chỉ tiến relation tiếp theo sau request hiện tại được grant; không giả định atomic25. Session connection state tách transaction commit state. Fixture operations chỉ là symbolic RX/visibility state, actualSqlIssued=false.

[Bounded enumeration](evidence/t-ai-04-planner-maintenance-handoff-continuity/cases/bounded_enumeration.json) dùng projection {ai_model_registry,places,users}, tối đa6 scheduled actions: **33 visited prefixes**,5 violating prefixes. Branches bị prune khi tìm witness; có prefixes lặp giữa target runs. Đây không phải exhaustive PostgreSQL model checker hoặc universal proof. Full25 witnesses độc lập ở named scenarios/target sweep mới trực tiếp bác bỏ current25 protocol.

## 7. Counterexamples và failure outcomes

[9 named grant witnesses](evidence/t-ai-04-planner-maintenance-handoff-continuity/counterexamples.json) thuộc8 scenarios; không xóa hoặc đánh dấu flaky. Mỗi witness có exact event order, table ID, mode, transaction/session/ownership state, grant point và fixture visibility.

| Cases | Expected đã xác minh |
| --- | --- |
|A |A25 HELD, B WAITING trên1 relation, B HELD0 |
|B/F/J |Writer bảng cuối chen trước B; J có24 relations new writer có thể acquire sau A commit |
|C/D |Prior writer queue phải bị sampled UNKNOWN→STOP; writer đến sau B trên t1 bị queue-block trong finite prefix |
|E |B acquire tuần tự đủ25; ngay sau A commit chưa HELD25 |
|G |Hai writers trên middle/last đều có grant witnesses |
|H |Timeout/deadlock-victim injection STOP; precommit safe rollback kết thúc I trước writer grant |
|I |Failure trước commit giữ A25; lost ACK sau actual commit là ambiguous và không được giả rollback/cleanup |
|K/L |Unknown fail closed; unexpected mode/order/missing relation bị reject |
|M |INSERT/DELETE symbolic đều cần RX; own SRE+RX hợp lệ, không thay thế isolation với writer khác |
|N |STOP sau committed fixture không tự kết thúc I; cleanup phải revalidate |
|O |A precommit disconnect rollback an toàn; B disconnect sau committed fixture có thể nhả protection cho W |

Các failure branches không cần thiết cho canonical disproof; normal writer không prior target locks đã đủ. Không tuyên bố writer thực tế chen vào historical8-connection trace hoặc dữ liệu thật bị sửa.

## 8. Evaluation options A/B/C

[Options review đầy đủ](evidence/t-ai-04-planner-maintenance-handoff-continuity/OPTIONS_REVIEW.md).

| Option | Kết luận |
| --- | --- |
|A — current handoff |**REFUTED**; không dùng pre/post locks hoặc one NOWAIT rejection để nâng verdict |
|B — revised table-lock protocol |Các biến thể hiện chưa có proof dưới unchanged cap/policy/permissions; không tự áp dụng |
|C — stronger isolated test environment |Hướng nên được owner đánh giá, với writer admission được enforce thật; chưa triển khai/nghiệm thu |

B1 giữ A uncommitted tránh transfer nhưng independent reader không thấy fixture; A commit cho visibility lại đặt ra handoff obligation. [PostgreSQL15 visibility](https://www.postgresql.org/docs/15/transaction-iso.html).

B2 đổi modes/split write relation với other24/pre-acquire/queue validation cần proof cho earlier writers, queue priority, failures và ambiguous commit. Mọi B mode chặn RX writer cũng xung đột với RX fixture DML của A. Không được giả định overlap writer-blocking locks trên write relation. Chưa kết luận mọi protocol10-session đều bất khả thi; **chưa có replacement được chứng minh trong current scope**.

B3 mỗi relation một successor cần tối thiểu26 sessions chỉ A+25 guardians, hoặc32 theo cấu hình có bootstrap/two readers/observer/probe/final trước đó; vượt10 và chưa xử lý prior waiters. B4 advisory/application gate không chặn DML không hợp tác. [Advisory semantics](https://www.postgresql.org/docs/15/explicit-locking.html#ADVISORY-LOCKS).

C phải khác việc chỉ thấy inventory trống: cần persistent denial of outside write authority trênall25 qua A/B commits/disconnects. Private DB name/network riêng chưa đủ nếu vẫn có shared postgres/superuser/write-capable paths. CONNECT privilege được kiểm khi kết nối; write privileges là lớp riêng. [Privileges](https://www.postgresql.org/docs/15/ddl-priv.html).

## 9. Independent acceptance

[Parent](evidence/t-ai-04-planner-maintenance-handoff-continuity/acceptance-parent.cjs), [child](evidence/t-ai-04-planner-maintenance-handoff-continuity/acceptance-child.cjs), [31 results](evidence/t-ai-04-planner-maintenance-handoff-continuity/independent-acceptance.json). Parent golden outcomes được khóa trước execution; expected không lấy từ engine/property-checker.64 conflict cells kiểm với fixed bit rows, expected witness targets/counts độc lập, deterministic replay cùng hash. Counterexample là expected **protocol safety failure**, không test flakiness;31 test PASS không nghĩa protocol PASS.

Original ownership/cleanup/fence modules giữ byte. Unknown/backend_start drift được actual registry với sensor client reject; dispose1 và Agent/native/tool/operator callbacks0 sau stop. Guarded cleanup unsafe isolation BLOCKED/action0; valid exact ledger/hash/ID/slug/FK/Trip/isolation case action1 chỉ trên arrays. Primary HANDOFF_COUNTEREXAMPLE error không bị cleanup error che; mock R01 FAIL→R02/R03 NOT RUN. Không fake database restoration từ những model rows này.

Independence đến từ separate parent/child, golden expectations, source-based lock rules và property checker tách transition engine; không tuyên bố có human/sub-agent peer review. Historical149 checks không rerun hoặc cộng vào31 mới.

## 10. Proposed safe protocol / controlled real DB gate

**Không có protocol replacement được nghiệm thu trong task này.** Current A là DISPROVED; revised B NOT PROVABLE từ evidence hiện có; C chỉ có conditional safety argument nếu outside DML authority thực sự bị deny xuyên suốt I. Thay threat model trên giấy mà không enforce là không đủ.

Owner cần quyết định scope kiến trúc mới: disposable isolated baseline copy/instance, riêng task writer và runtime readonly identity, controlled auth/network, không shared outside writer credentials, inventory toàn bộ privileged write paths và explicit trusted-admin boundary. Không tạo DB/container, đổi role/grants/reset/Docker hoặc sửa production trong task này.

[Real DB gate](evidence/t-ai-04-planner-maintenance-handoff-continuity/real-db-gate.json): **NOT AUTHORIZED / NOT PREPARED**, planned physical connections0. Chỉ sau accepted offline proof cho kiến trúc được chọn mới lập separate approval experiment với exact cap/tables/modes/timeouts, failure/rollback/dispose/final fingerprint. Finite experiment có thể kiểm implementation assumptions/tìm counterexample, không tự chứng minh mọi interleaving.

## 11. Threat model và limitations

Counterexamples dùng ordinary authenticated writer có DML privileges, không cần admin sabotage, lock groups, upgrades hoặc deadlock queue rearrangement. W UNKNOWN với harness vẫn có thể được PostgreSQL cấp table lock. Unknown được sampled vẫn STOP; canonical race nằm giữa samples.

Model abstractions: không mô phỏng tuple/WAL/replication/crash recovery, full deadlock detector, parallel lock groups hay mọi queue-priority optimization. H_deadlock là failure injection; bounded enumeration không là toàn bộ state space. Những giới hạn đó không loại bỏ simple valid partial-order counterexample. Positive prefixes không được nâng thành universal proof.

Task offline hoàn toàn với runtime network-deny: **33 process audits, PG connect attempts0, network attempts0**. Primary official docs/source được đọc bằng web tool riêng; không PostgreSQL/Docker runtime access, actual SQL/DML/fixtures/Planner/Ollama/browser0, không PID termination, commit/push/deploy. Historical fingerprints/Trip count không được đo mới.

## 12. Source/benchmark integrity

[Final integrity](evidence/t-ai-04-planner-maintenance-handoff-continuity/integrity-after.json): **11069 protected files unchanged**,844 sealed multi-connection artifacts/report giữ hash,84 compiled production modules match.25 source/input closure entries khớp trước/sau tests;12 copied ownership/normalization/cleanup/fence/helpers nguyên byte.

Chỉ thêm task-local analysis/model/tests/evidence/report. Production Planner/Agent/Catalog/Auth/SYSTEM/schema/tool gates, DB roles/grants/schema, Docker config, original fixture proposal, approved benchmarks và historical reports/results/expected không thay. Counterexamples và original expectations giữ nguyên sau discovery.

## 13. PID9686

**UNKNOWN**. A/B/W trong artifacts là model transaction IDs, không PIDs thật và không có attribution mới. Historical reviewed gate B không bị đổi hoặc nâng thành PASS.

## 14. P1/P2

**P1 NLU OPEN; P2 runtime OPEN**. Không Planner LIVE, R01–R03 actual NOT RUN, không genuine model sample/V2/deploy. Current maintenance/LIVE gate tiếp tục BLOCKED do confirmed handoff counterexample.

## 15. NEXT TASK PLAN — chỉ đề xuất

Đề xuất **T-AI-04-PLANNER-ISOLATED-TEST-ENVIRONMENT-DESIGN-REVIEW** để owner chọn/chốt enforced writer-admission architecture và exact permissions/baseline boundaries, hoặc phê duyệt một revised protocol proof riêng. Cần quyết định rõ có cho phép môi trường test độc lập, DB identity/roles/network nào, administrator trust boundary và failure guarantees; hiện chưa có approval để thực thi các thay đổi đó.

Sau khi thiết kế mới có offline correctness proof và independent adversarial acceptance mới xem xét controlled lock-only validation với owner approval mới. Không đề xuất chạy ngay targeted Planner LIVE hoặc dùng allowance còn lại của task trước. Không tự tiếp tục để lấy PASS.

**Dừng sau báo cáo.**
