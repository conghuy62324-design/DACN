# T-AI-04 — Planner Maintenance Connection Ownership Diagnosis

Ngày 11/11/2026, Asia/Saigon. Kết luận **OWNERSHIP_UNRESOLVED_FAIL_CLOSED**. Chưa đủ bằng chứng quy ownership cho historical PostgreSQL PID9686.

Đã hoàn tất static investigation, **19/19 ownership sensor checks** và **4/4 installed-source lifecycle checks** offline. Controlled READ ONLY trace **STOP** tại ownership identity guard: PostgreSQL `client_port=35994` khác local socket port `65381`. Đã đóng **1/1** task-created client, không nới guard hoặc reconnect sau lỗi. Không fixture/DML, Direct Planner, Ollama GET/POST hay Browser LIVE. **P1/P2 OPEN**.

[Owner scope](evidence/t-ai-04-planner-connection-ownership-diagnosis/owner-task.txt), [reviewed conclusion](evidence/t-ai-04-planner-connection-ownership-diagnosis/conclusion.json), [raw trace stop](evidence/t-ai-04-planner-connection-ownership-diagnosis/trace-result.json), [artifact seal](evidence/t-ai-04-planner-connection-ownership-diagnosis/artifact-checksums.json).

## 1. Baseline

Đã đọc bốn báo cáo được giao: [targeted resume](HUGO_T_AI_04_PLANNER_LIVE_TARGETED_REVALIDATION_RESUME_REPORT.md), [adapter acceptance](HUGO_T_AI_04_PLANNER_ADAPTER_BINDING_ACCEPTANCE_FIX_REPORT.md), [harness reliability](HUGO_T_AI_04_PLANNER_LIVE_HARNESS_RELIABILITY_FIX_REPORT.md), [run2](HUGO_T_AI_04_PLANNER_REAL_TOOL_LIVE_E2E_RESUME_RUN2_REPORT.md), cùng maintenance/readonly initialization/runtime adapters/RealGuards/direct harness, stop/result, committed ledger/cleanup/final fingerprint, source closure và sealed hashes. [Read/hash index](evidence/t-ai-04-planner-connection-ownership-diagnosis/baseline-review.json).

Baseline lịch sử giữ nguyên: Phase A64/64 PASS; quota20/reserve7; direct R01/R02/R03 business results PASS nhưng closing maintenance guard FAIL; LIVE R01–R03 NOT RUN; Ollama POST0; restored25/25, Trip27/27. Task này không scan quota hay đọc business fingerprint mới vì không dispatch Agent/Planner hoặc tạo fixture. Không nhận số liệu lịch sử thành phép đo mới.

## 2. Static connection-factory inventory

[Inventory đầy đủ](evidence/t-ai-04-planner-connection-ownership-diagnosis/static-investigation.json) ghi nơi khởi tạo, thời điểm mở, application_name, PID, registration/identity, release/dispose và khả năng tồn tại sau direct cho từng factory.

| Factory/path | Registration và lifecycle |
| --- | --- |
| Production Sequelize constructor/config | Lazy pool max10/min0/idle10s; constructor chưa mở socket. Historical harness dùng cùng singleton, không có startup application_name riêng. |
| Initial Sequelize version/bootstrap client | `_connect` ngoài pool khi databaseVersion chưa biết; dialect setup rồi afterConnect, version bootstrap rồi disconnect trước pool acquisition. Không đồng nhất với pooled client. |
| Sequelize pool growth | pg.Client handshake → dialect SET/type-OID metadata → async readonly hook → maintenance hook thêm PID. Release giữ session; destroy/close mới disconnect. |
| Direct Planner/Catalog/repositories | Không tạo PG factory riêng; RecommendationRepository → PlaceRepository → `findAndCountAll` dùng count/find song song trên singleton pool. Không gọi direct trong task này. |
| Maintenance A/B/probe | Explicit pg.Client; startup tag `tai04-planner-run2-<label>`, startup RO; push vào clients sau connect. Probe đóng trong prepare; A/B giữ locks đến guarded cleanup/close. |
| Fingerprint/preflight/cleanup reads | Dùng chung ORM pool; không phải mỗi query một factory độc lập. Exact DML chỉ thuộc maintenance lịch sử. |
| Runtime adapters/RealGuards | Factory nằm sau closing direct guard; chưa instantiate trong lần STOP lịch sử. Guard delegate vào maintenance; không factory PG mới. |
| Final read-only audit sau regression | Process khác, mở bootstrap/pool mới rồi finally close; diễn ra sau closing failure. |
| Independent client | Có thể tồn tại; đúng DB, empty tag hoặc idle không chứng minh thuộc harness. Không adopt/terminate. |

## 3. Pool lifecycle analysis

Source thực tế trong installed Sequelize xác nhận `_connect` await dialect.connect **trước** await afterConnect. Backend vì thế có thể visible trước ownership registration. Historical readonly hook await SET RO, timeout và identity; hook kế tiếp mới `readerPids.add(client.processID)`. Hook registration không ghi backend_start, client endpoint, creation token hoặc disconnect event; Set không xóa PID đã đóng.

`foreignConnections` tạo mảng allow từ Set và maintenance clients, bind vào query rồi mới await `pg_stat_activity`. Registration muộn không thay đổi mảng đã bind. Release về pool không đóng session, nên idle session vẫn có thể là owned; ngược lại idle cũng không chứng minh ownership. Các khoảng trước INSERT, trong locks, sau COMMIT, direct, closing guard và cleanup đều dùng cơ chế đó. All25 locks kiểm soát conflicting writes, không thay thế provenance guard.

## 4. PID9686 historical evidence

[Original stop](evidence/t-ai-04-planner-live-targeted-revalidation-resume/master-stop.json) lúc **12:50:13.786 Asia/Saigon** ghi PID9686, empty application_name, client backend, idle, ClientRead/Client. Stack: `foreignConnections → prove → assertFixtures(after-direct) → runDirect`. Không có backend_start/usename/datname/client_addr/client_port hoặc physical-client creation/registration/disposal correlation của PID này.

Master lịch sử có10 PostgreSQL sockets và7 readonly connection events cộng maintenance clients, nhưng aggregate counters không tạo được phép ghép PID. Cleanup guards sau đó PASS và restored25/25 cũng không hồi tố ownership. Không thể xác nhận pool, maintenance, bootstrap/race, lifecycle leak hay independent client là nguồn của PID9686.

Task hiện tại **chưa quan sát được tình trạng PID9686** vì trace STOP trước activity snapshot. Trạng thái đúng là **HISTORICAL_PID_NOT_CHECKED_IDENTITY_GATE_FAILED**; không báo HISTORICAL_PID_NOT_OBSERVABLE khi chưa kiểm. Không giả định PID cũ vẫn tồn tại hoặc một PID trùng hiện tại là cùng backend.

## 5. Offline sensor tests

[Independent suite](evidence/t-ai-04-planner-connection-ownership-diagnosis/sensors.test.cjs), [results](evidence/t-ai-04-planner-connection-ownership-diagnosis/offline-results.json): **19 PASS/0 FAIL** trước PostgreSQL. Bao phủ đủ A–L: registered owned, bootstrap/pending, incomplete registration, release-to-pool, maintenance, external, empty tag, PID reuse/backend_start, invalid metadata, appearance after snapshot, close giữa observations, registration/cleanup errors. Có thêm missing factory capability, socket-port mismatch, copied tag, sticky STOP, cleanup precondition và original-error/dispose/source-integrity checks.

[Installed-source tests](evidence/t-ai-04-planner-connection-ownership-diagnosis/lifecycle-source.test.cjs), [results](evidence/t-ai-04-planner-connection-ownership-diagnosis/lifecycle-source-results.json): **4 PASS/0 FAIL**. Gọi `_connect` của installed Sequelize với sensor doubles, chứng minh physical-connect trước registration; afterConnect throw không tự gọi disconnect; late options assignment không vào manager; constructor startup options có vào manager. Đây là source-level/doubles, không PostgreSQL reproduction của historical race.

Tests giữ nguyên expected UNKNOWN_CONNECTION_FAIL_CLOSED khi thiếu proof. Các simulated dispatch counters không phải Agent/Ollama HTTP. Không tính historical64/33 checks vào23 mới.

## 6. Controlled READ ONLY provenance observations

Lượt preparation đầu lỗi do common helper chưa export crypto, **trước pg.Client construction**, socket0. Đã giữ [script lỗi](evidence/t-ai-04-planner-connection-ownership-diagnosis/trace-preparation-01.cjs), [audit0](evidence/t-ai-04-planner-connection-ownership-diagnosis/trace-network-audit.json), [preparation record](evidence/t-ai-04-planner-connection-ownership-diagnosis/preparation-01.json); sửa export và dùng marker mới. Không phải retry guard/DB failure hoặc LIVE.

Trace kế tiếp chỉ nhắm **127.0.0.1:5432/travelgo_ai_m0_test**, startup `default_transaction_read_only=on`, explicit test-only tag. [Events](evidence/t-ai-04-planner-connection-ownership-diagnosis/provenance-events.json), [network audit](evidence/t-ai-04-planner-connection-ownership-diagnosis/trace-network-audit-02.json), [script](evidence/t-ai-04-planner-connection-ownership-diagnosis/trace-readonly.cjs).

| Actual observation | Value |
| --- | --- |
| Client factory / client ID | observer / own-bea7c147-c1 |
| Startup application_name | own-bea7c147-observer |
| Physical connect | 15:22:54.397 Asia/Saigon, PID16402, localPort65381 |
| Executed SQL | Một self-identity SELECT trên pg_stat_activity/current settings/sentinel; không business table |
| Identity guard | **FAIL PHYSICAL_SOCKET_PORT_MISMATCH:35994 !==65381** lúc15:22:54.411 |
| Disposal | End event15:22:54.415, clientsCreated1/clientsEnded1 |
| Further execution | Schema preflight/activity windows/Sequelize/maintenance control/injected PostgreSQL race **NOT RUN** |

Code đã kiểm database/user/default RO/transaction RO/sentinel/server port trước khi sensor reject port. Tuy nhiên raw self row chưa được persist trước assertion; backend_start/usename/datname/client_addr/backend_type và settings không có raw record riêng để nghiệm thu đầy đủ. **Không nhận preflight PASS**, không dựng file read-only-preflight hoặc metadata bổ sung sau lỗi. Không chỉnh sensor để cho qua mismatch, không truy cập DB lần nữa. Network: đúng1 socket5432, HTTP/fetch0, blocked0; tự đóng client mình tạo, không terminate backend.

Compose có host5432→container5432; proxy/NAT là một khả năng giải thích port khác nhau, **chưa được kiểm chứng**. Không suy ownership từ khả năng này.

## 7. Ownership attribution

**PID9686: UNKNOWN; overall OWNERSHIP_UNRESOLVED_FAIL_CLOSED.** Không đủ physical identity/lifecycle evidence để nhận TASK_OWNED hoặc VERIFIED_EXTERNAL_OR_UNOWNED_CONNECTION. PID16402 có local creation/connect/end events của observer mới, nhưng full ownership registration FAIL; không dùng nó thay cho PID9686.

Đã xác minh riêng một defect cấu hình harness qua source/offline: gán lại `sequelize.options.dialectOptions` sau constructor không cập nhật sequelize.config và ConnectionManager clone. Startup RO trong historical readonly harness không được đảm bảo bởi assignment đó; afterConnect SET/verification và SELECT-only wrapper là các lớp bảo vệ riêng vẫn giữ. Đây không phải bằng chứng rằng PID9686 là harness client hoặc đã write.

## 8. Race-condition findings

Physical-visibility/registration window, bound PID-snapshot window, stale PID Set và afterConnect-failure disposal gap được source/doubles chứng minh. **Chưa tái hiện các cơ chế này bằng PostgreSQL**, chưa quy chúng thành root cause của historical STOP. Trace planned pause/pool-release/disposal observations không chạy sau identity failure; không chấm PASS cho code chưa được thực thi.

## 9. Proposed fix

[Proposal riêng](evidence/t-ai-04-planner-connection-ownership-diagnosis/PROPOSED_FIX.md), [proposed sensor](evidence/t-ai-04-planner-connection-ownership-diagnosis/ownership-sensor.proposed.cjs) chỉ ở evidence task mới, **NOT_READY_FOR_LIVE / NOT_INTEGRATED**. Đề xuất startup options trước constructor, correlated backend_start/factory lifecycle, retirement/error disposal, immutable snapshots và sanitized raw identity capture trước assertion.

Sensor hiện đòi local port bằng server-reported port và đã fail tại môi trường thực tế; không nghiệm thu nó làm replacement guard. Cần thiết kế/kiểm chứng provenance qua forwarding path ở task riêng, không đơn giản xóa endpoint check để lấy PASS. Không sửa production config/Agent/Planner/Auth hoặc historical maintenance/readonly/RealGuards.

## 10. Negative acceptance

| Requirement | Evidence/result |
| --- | --- |
| 1 Owned hợp lệ | Sensor A/E PASS với đầy đủ factory/physical/self identity |
| 2 Unknown external | F/copy-tag bị từ chối |
| 3 PID đúng/backend_start sai | H bị từ chối |
| 4 Empty tag | G bị từ chối, không whitelist |
| 5 Missing registration | B/C/I/missing-factory bị từ chối |
| 6 Late registration | Immutable snapshot và sticky STOP; không hồi tố PASS |
| 7 Unknown → global STOP | Actual corrected orchestration với sensor-double ownership failure |
| 8 STOP trước inference | Dispatch counters native0; trace không có HTTP path đã gọi |
| 9 No subsequent Agent/tool | R02/R03 NOT RUN; Agent/native/tool/operator0, late callbacks reject |
| 10 Cleanup exact preconditions | Mới kiểm no-fixture N/A và missing ownership BLOCKED/action0; exact hash/ID/slug/FK/Trip/isolation contract giữ byte. Full33 là historical, không rerun sau trace STOP |
| 11 Original error | Ownership error giữ primary; cleanup secondary, dispose1 |
| 12 Integrity | Source/benchmark/historical hashes nguyên vẹn |

Đây là offline acceptance giới hạn trên sensor/doubles và preserved cleanup contract, **không phải actual PG ownership/cleanup integration PASS**. Trace failure là kết quả an toàn được giữ nguyên, không đổi expected.

## 11. Source/benchmark integrity và execution boundary

[Final integrity](evidence/t-ai-04-planner-connection-ownership-diagnosis/integrity-after.json):9420 protected files unchanged, changed=[];529 sealed artifacts và report resume giữ hash;84 compiled production modules khớp baseline. Chỉ tạo evidence/harness/proposal/report mới. Không đổi approved fixtures/expected/quota20/native caps/security guards/benchmark hoặc historical reports/raw verdicts.

Offline network audits ghi0 sockets/fetch; controlled trace đúng1 PG socket và1 metadata SELECT; entity queries/writes0, fixtures0, Direct Planner0, Ollama GET/POST0, browser0. Đây là process-boundary audit, không OS-wide packet capture. Không grants/role changes, backend termination, production connection edits, build/regression rộng, commit/push/deploy/V2. Sau identity failure chỉ hoàn thiện báo cáo/integrity/seal; không query DB hay chạy thêm acceptance suite.

## 12. P1/P2 status

**P1 NLU OPEN; P2 runtime OPEN.** Không có model sample mới, Planner LIVE PASS hoặc readiness claim; historical failures không đổi.

## 13. Remaining blocker

Historical PID9686 thiếu dữ liệu provenance không thể hồi phục từ các artifacts hiện có. Trace hiện tại bị chặn trước approved-schema/full metadata preflight bởi port identity mismatch; cần ownership design thích hợp với physical network path và fail-closed integration. Không có cơ sở whitelist empty application_name/PID hoặc nới isolation/cleanup.

## 14. NEXT TASK PLAN — chỉ đề xuất

Đề xuất **T-AI-04-PLANNER-CONNECTION-OWNERSHIP-GUARD-FIX** với review riêng cho test-only startup configuration, lifecycle registration/disposal, provenance qua endpoint forwarding và failure-before-evidence capture. Bắt đầu offline; controlled metadata trace tiếp theo phải được cấp scope mới, giữ unknown FAIL CLOSED. Không sửa production connection management nếu chưa có task riêng.

Chưa đủ bằng chứng nghiệm thu guard để chuyển targeted LIVE. Sau khi guard đạt acceptance riêng mới đề xuất LIVE resume với fresh quota, fixture approval/isolation, independent oracle, locked manifest và native budget riêng. Không dùng unused cap lịch sử.

**Dừng sau báo cáo. Không triển khai NEXT TASK.**
