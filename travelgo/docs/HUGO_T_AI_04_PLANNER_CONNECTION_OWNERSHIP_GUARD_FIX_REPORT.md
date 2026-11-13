# T-AI-04 — Planner Connection Ownership Guard Fix

Ngày 11/11/2026, Asia/Saigon. Exit gate **B — OWNERSHIP_GUARD_FIX_PASS_OFFLINE_TRACE_BLOCKED**.

Candidate harness đạt **51/51 independent offline checks**. Đã dùng đúng **một** PostgreSQL connection mới, startup READ ONLY; raw identity được ghi/hash trước assertion. Trace **FAIL CLOSED** vì candidate so Docker IP `172.18.0.3` với PostgreSQL `inet::text` trả `172.18.0.3/32`. Client đã đóng **1/1**; không sửa guard, reconnect/retry hoặc query thêm sau FAIL. Không đạt gate A, không Planner LIVE PASS. **PID9686 UNKNOWN; P1/P2 OPEN**.

[Owner scope](evidence/t-ai-04-planner-connection-ownership-guard-fix/owner-task.txt), [Phase A gate](evidence/t-ai-04-planner-connection-ownership-guard-fix/phase-a-gate.json), [trace result](evidence/t-ai-04-planner-connection-ownership-guard-fix/trace-result.json), [reviewed exit](evidence/t-ai-04-planner-connection-ownership-guard-fix/exit-gate.json), [artifact seal](evidence/t-ai-04-planner-connection-ownership-guard-fix/artifact-checksums.json).

## 1. Historical baseline

Đã đọc [diagnosis](HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_DIAGNOSIS_REPORT.md), [targeted resume](HUGO_T_AI_04_PLANNER_LIVE_TARGETED_REVALIDATION_RESUME_REPORT.md), [adapter acceptance](HUGO_T_AI_04_PLANNER_ADAPTER_BINDING_ACCEPTANCE_FIX_REPORT.md), [reliability](HUGO_T_AI_04_PLANNER_LIVE_HARNESS_RELIABILITY_FIX_REPORT.md), toàn bộ diagnosis artifacts được giao và maintenance/readonly/runtime/RealGuards source. [Baseline hash index](evidence/t-ai-04-planner-connection-ownership-guard-fix/baseline-review.json).

Giữ nguyên historical23/23 offline PASS, trace trước port mismatch65381/35994/closed1/1, PID9686 UNKNOWN, R01–R03 NOT RUN và restored25/25/Trip27/27. Không dùng connection mới để hồi tố ownership quá khứ. Task này không đọc business tables hoặc đo lại fingerprint/Trip; số restoration vẫn là historical evidence.

## 2. Root causes đã xác minh

Installed **Sequelize6.37.8/pg8.23.1** được đọc trực tiếp. Physical socket/handshake xảy ra trong pg.Client.connect; processID nhận qua protocol trước dialect setup và afterConnect. Historical ownership hook chạy sau async readonly hook, nên backend có thể visible khi registration còn pending. PID array bind trước activity query có thể stale; Set cũ không retire PID khi disconnect, không có backend_start để chống PID reuse.

Pool release giữ PostgreSQL session đến idle eviction/destroy/close; idle không chứng minh external hoặc owned. Initial version bootstrap có thể là một connection ngoài pool. Installed `_connect` không tự disconnect client khi afterConnect throw. Gán lại options sau constructor không sửa manager config clone. Đây là các source/lifecycle findings, **không phải attribution của PID9686**.

## 3. Startup READ ONLY fix

[Managed factory](evidence/t-ai-04-planner-connection-ownership-guard-fix/managed-connections.cjs) đưa options vào constructor/dialectModule trước physical connect: default_transaction_read_only=on, statement_timeout=15000, idle_in_transaction_session_timeout=30000. Mỗi physical client nhận token/application_name riêng trước startup packet. Candidate không sửa production config hoặc pg/Sequelize library.

Per-instance wrapper ghi **payload thực tế gửi qua pg connection.startup**, không chỉ đọc lại sequelize.options. [Physical startup observation](evidence/t-ai-04-planner-connection-ownership-guard-fix/trace-events/002-PHYSICAL_OPEN.json) có đúng DB/user/tag/options; self SELECT đầu tiên ghi default RO=on, transaction RO=on, timeout15s. Không SET RO sau connect để thay thế startup proof.

Runtime factory giữ SELECT/SHOW-only boundary; dialect startup SET/OID reads được giới hạn riêng khi pending. SQL không hợp lệ hoặc write làm STOP. Đây là startup/readonly evidence của client mới; ownership acceptance tổng thể vẫn FAIL ở route comparison.

## 4. Physical connection lifecycle

State: CREATED → PENDING_REGISTRATION → REGISTERED → RELEASED/REGISTERED → CLOSING → CLOSED; exception chuyển ERROR và đóng dispatch fence. Pending không được nhận là owned. Release chỉ ghi lifecycle, không giả disconnect.

Candidate bọc `_connect` **trên instance test-only**, dùng AsyncLocalStorage ghép từng physical object với concurrent acquisition. Dialect/afterConnect/registration fail sẽ dispose đúng client do scope đó tạo; original error được giữ. Không thay prototype/library source. Actual installed Sequelize pool/afterConnect path được chạy với sensor clients trong child processes; actual PostgreSQL trace dùng raw managed client để tuân thủ cap1, không mở bootstrap+pool thứ hai.

## 5. Ownership registry

[Registry](evidence/t-ai-04-planner-connection-ownership-guard-fix/ownership-registry.cjs) giữ private physical-object records, factory ID, UUID instance, unique creation token, startup tag, expected endpoint, self DB/user/sentinel, protocol PID+self PID, backend_start6-digit, client endpoint, raw observation và lifecycle state.

Tag hoặc PID đơn lẻ không tạo ownership. Self-query phải chạy trên chính managed client, match token/protocol identity và route policy. Immutable snapshots được phát hành bởi registry, không chấp nhận snapshot tự dựng. Closing guard reject pending/error/closing records, unknown rows, backend_start mismatch hoặc bất kỳ lifecycle sequence change sau snapshot; không tự refresh/retry để lấy PASS. Closed sessions bị retire, released pool sessions vẫn cần full identity proof.

## 6. Forwarding/port identity

[Independent route observation](evidence/t-ai-04-planner-connection-ownership-guard-fix/route-before-trace.json) được refresh lúc15:55:48.955 Asia/Saigon, không PG connection: Docker inspect xác nhận running travelgo_postgres, published host5432→container5432, containerIP172.18.0.3/gateway172.18.0.1; OS xác nhận target127.0.0.1:5432 do WSL relay listen, Docker listener cùng port, Microsoft/Docker signatures Valid và docker-desktop WSL2 Running.

[Route policy](evidence/t-ai-04-planner-connection-ownership-guard-fix/route-policy.cjs) phân biệt verified direct với verified Docker/WSL forwarding. Direct yêu cầu port equality; forwarding yêu cầu independent listener/mapping proof, physical target, container/gateway addresses và self identity/token. Unknown listener/signature/container/stale route hoặc unexpected direct mismatch đều reject. Không xóa port checks để nhận mọi test-DB client.

Actual localPort **49419**, PostgreSQL client_port **47448**; candidate không dùng equality này cho forwarding. Tuy nhiên guard còn lỗi representation: PostgreSQL server/client inet text là **172.18.0.3/32 /172.18.0.1/32**, mapping là bare IPv4. Source dùng exact string comparison nên server check FAIL. Sensor data dùng bare addresses nên chưa bao phủ representation thực tế. Không normalize/strip mask rồi thử lại trong task này; forwarding ownership integration chưa được nghiệm thu.

## 7. Raw evidence trước assertion

Writer lưu từng event write-once, timestamp và SHA256 payload trước khi registry assert. Actual order: CREATE → PHYSICAL_OPEN → **RAW_SELF_IDENTITY** → REGISTRATION_FAIL → DISPOSE_START → DISPOSE_PASS. [Raw row](evidence/t-ai-04-planner-connection-ownership-guard-fix/trace-events/003-RAW_SELF_IDENTITY.json) có đầy đủ metadata đã thiếu ở diagnosis trước; không password/JWT/secret URI hoặc business rows.

Evidence-writer failure injection gây global STOP và không tạo REGISTRATION_PASS giả. Nếu writer không ghi được raw, client vẫn phải dispose; không retry SELECT. Actual trace đã ghi raw thành công trước route FAIL, giúp xác định blocker mà không reconnect.

## 8. Independent acceptance

[Ownership parent](evidence/t-ai-04-planner-connection-ownership-guard-fix/acceptance-parent.cjs), [child](evidence/t-ai-04-planner-connection-ownership-guard-fix/acceptance-child.cjs), [latest results](evidence/t-ai-04-planner-connection-ownership-guard-fix/offline-acceptance-02.json): **39 PASS/0 FAIL**. Parent tự khai báo expected positive/negative exit, STOP/dispatch/dispose/cleanup counts và evidence ordering; mỗi scenario chạy child process riêng.

[Integration parent](evidence/t-ai-04-planner-connection-ownership-guard-fix/integration-parent.cjs), [latest results](evidence/t-ai-04-planner-connection-ownership-guard-fix/integration-acceptance-03.json): **12 PASS/0 FAIL**. Chạy candidate maintenance với byte-identical Base và RealGuards/corrected orchestrator, owned A/B observations, unknown→global STOP, actual independent route metadata và route negatives; kiểm byte integrity của Base/cleanup/fence.

Tổng unique acceptance **51**, không cộng lại lượt lặp. Lượt preparation integration đầu **11/12** giữ nguyên trong integration-acceptance.json: negative mutation tác động listener đầu danh sách, không phải IPv4 target mà policy kiểm. Đã sửa mutation nhắm đúng127.0.0.1, giữ expected unknown target phải reject; latest12/12 mới dùng cho gate. First39/39 và intermediate12/12 được giữ riêng.

Phase A được khóa lúc15:55:37.691, **26 source/dependency hashes**; candidate/source không thay sau trace.92 process network audits offline ghi0 sockets/HTTP. Sensor calls không phải PostgreSQL/Agent/Ollama traffic.

## 9. Controlled READ ONLY trace

Task mới cấp tối đa1 connection; [single-use marker](evidence/t-ai-04-planner-connection-ownership-guard-fix/trace-attempt.json). Đã dùng đúng1 socket127.0.0.1:5432, đúng travelgo_ai_m0_test, không reconnect/retry. Raw managed client thực hiện một self metadata SELECT; không ORM bootstrap, schema/business scan hoặc fixture.

| Observation | Actual |
| --- | --- |
| Factory / instance | controlled-trace /2d969d45-db99-4809-b50b-b31d8d6fec38 |
| PID / backend_start |17864 /2026-11-11T08:56:06.990903Z |
| Startup/self tag |og-controlled-trace-d26dab93be1c4456ada36edc7b952bb9 |
| Database / role / sentinel |travelgo_ai_m0_test /postgres /hugotravel-isolated-test-database-v1 |
| RO / timeout |default on, transaction on,15s |
| Physical target |127.0.0.1:5432; local127.0.0.1:49419 |
| Server/client endpoint |172.18.0.3/32:5432 /172.18.0.1/32:47448 |
| Verdict |FAIL_CLOSED FORWARD_SERVER_IDENTITY_MISMATCH at15:56:07.010 |
| Registration/closing |REGISTRATION_PASS absent; full activity closing query NOT RUN |
| Resource disposal |created1/disposed1; DISPOSE_PASS15:56:07.010 |

Trace process exit1, first ownership error preserved, no query after FAIL. No pool/maintenance PostgreSQL integration PASS claim. Role postgres is superuser, not least privilege; startup RO plus test-only SQL boundary apply. Client mới có creation/handshake/self/disposal evidence nhưng full ownership verdict vẫn FAIL, không nhận TASK_OWNED acceptance.

## 10. Negative tests

39-case suite bao phủ registered physical client, registration-before-snapshot, pending bootstrap, actual installed afterConnect failure, pool release, destroy/disconnect, PID reuse/backend_start, late/stale registry, unknown external/empty tag/copied tag/spoofed self tag, unknown route/direct/proxy/unexpected mismatch/wrong forwarded server, DB/sentinel mismatch, startup/transaction RO off, timeout mismatch, missing open event, duplicate registration, disposal error, writer error, runtime write attempt và forged snapshot.

Guarded cleanup sensor cases gồm success exact2, wrong ID/hash, FK/Trip reference và isolation invalid. Parent kiểm callback0 với unsafe state, callback1 với valid state, không SQL. Chưa có test cho actual `/32` representation trước trace; vì thế giữ trace BLOCKED thay vì nâng offline PASS thành integration PASS.

## 11. Global fail-fast

Registry/SQL/route/evidence/lifecycle failure đều gọi shared stop latch/AbortSignal. Negative children nonzero, subsequent Agent/native/tool/operator callbacks bị reject trước callback. Base+RealGuards unknown injection giữ R01 FAIL, R02/R03 NOT RUN và mọi dispatch0; resource dispose1.

Actual trace fence stopped/closed, dispatch arrays rỗng, retry0. Catch layers ghi secondary phases của cùng original route assertion, không thay primary bằng disposal error hoặc tiếp tục scan. Native4/3/1 fence giữ byte, không dùng allowance cũ; quota20/hour/principal không thay/reset và không cần tiêu Agent turns trong task này.

## 12. Cleanup contract và maintenance integration

[Candidate bridge](evidence/t-ai-04-planner-connection-ownership-guard-fix/maintenance.candidate.cjs), [integration](evidence/t-ai-04-planner-connection-ownership-guard-fix/integration.cjs) chỉ thay test-only connection/foreign-connection adapters bằng registry/full activity checks. Base được nạp với DB dependency injected, không đổi historical cache/source. All25 locks, handoff, exact approved DML intent, ledger/hash/ID/slug/FK/Trip checks, cleanup eligibility và resource-close methods giữ nguyên byte.

Runtime-pool factory có constructor startup options và readonly boundary; Base/RealGuards/corrected orchestration được kiểm offline qua sensor doubles. Đây là independent candidate/DI integration, chưa thay entrypoint Planner runtime lịch sử; future runtime binding cần review với fresh manifest. Không nhận actual maintenance/fixture cleanup PASS từ mocks.

Task này không commit fixture/ledger nên fixture cleanup **NOT_APPLICABLE**, count0. Chỉ dispose đúng client task tạo; không terminate PID9686 hoặc session khác, không test INSERT/DELETE, không thay grants/role/schema.

## 13. Source/benchmark integrity

[Final integrity](evidence/t-ai-04-planner-connection-ownership-guard-fix/integrity-after.json): **9453 protected files unchanged**, changed=[];31 sealed diagnosis artifacts và report nguyên vẹn;84 compiled production modules hash-match. Snapshot còn bao phủ historical E2E/fixtures/benchmark/expected và production sources/configs.

Chỉ thêm harness/tests/evidence/report task mới.26-file Phase A closure vẫn khớp sau trace. Không sửa production Agent/Planner/Catalog/Auth/Sequelize/pg libraries, schemas/roles/grants, old raw/verdict hoặc expected. Không broad regression/build sau STOP, không commit/push/deploy, V2, limiter reset hoặc Ollama GET/POST/preload. Process network audit: offline0, actual PG1, HTTP0; không OS-wide packet capture.

## 14. Historical PID9686

**UNKNOWN**. Không whitelist, adopt, query riêng hoặc terminate PID9686. Trace mới FAIL trước full activity scan; không xác định PID cũ hiện tồn tại hay không. New PID17864 không giải thích historical connection và không đóng historical ownership blocker.

## 15. P1/P2

**P1 NLU OPEN; P2 runtime OPEN.** R01–R03 Planner LIVE NOT RUN. Không genuine model/provider/browser sample mới hoặc LIVE readiness claim.

## 16. Remaining limitations

Gate **B**, không A: offline sensor acceptance đạt nhưng actual route assertion bị chặn bởi inet address representation. Full forwarded identity/closing guard chưa PASS; actual pool/maintenance LIVE chưa chạy. Dữ liệu raw đã đủ cho một proposed offline normalization task, nhưng không được sửa guard trong lượt trace này để thử tiếp. Không nhận stale/unknown sessions bằng cách bỏ endpoint checks.

## 17. NEXT TASK PLAN — chỉ đề xuất

Đề xuất **T-AI-04-PLANNER-CONNECTION-OWNERSHIP-ADDRESS-NORMALIZATION**: dùng saved raw metadata làm regression input offline; định nghĩa parsing/canonicalization có kiểm prefix/address family, độc lập cho IPv4 bare vs host `/32`, IPv6 host representation, malformed/foreign address/network-prefix cases. Giữ original raw, full endpoint/token/PID/backend_start/lifecycle proof và unknown FAIL CLOSED. Không blind-strip suffix để mở rộng trust.

Sau offline acceptance của sửa đó, một trace mới cần scope riêng, tối đa connection/retry policy mới; không tự dùng lại cap1 đã tiêu. **Chưa đề xuất hoặc chạy T-AI-04-PLANNER-LIVE-TARGETED-FINAL-REVALIDATION**, vì gate A chưa đạt. Chỉ khi gate A được nghiệm thu ở task riêng mới xem xét LIVE với owner approval, fresh quota/fixture isolation/ledger/direct oracle/manifest/native budget mới.

**Dừng sau báo cáo. Không triển khai NEXT TASK.**
