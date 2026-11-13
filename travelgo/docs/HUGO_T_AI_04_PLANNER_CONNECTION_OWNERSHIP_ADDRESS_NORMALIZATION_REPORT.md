# T-AI-04 — Planner Connection Ownership Address Normalization

Ngày 11/11/2026, Asia/Saigon. Exit **A — ADDRESS_NORMALIZATION_PASS_OFFLINE_AND_SELF_TRACE**.

**135/135 offline checks PASS**: original51 +84 mới. Controlled READ ONLY trace dùng đúng **1 connection**, registration/snapshot/closing ownership PASS, dispose **1/1**, reconnect/retry0. Chỉ xác minh self-provenance của kết nối mới; **không nhận multi-connection maintenance hoặc Planner LIVE PASS**. PID9686 vẫn UNKNOWN, R01–R03 LIVE NOT RUN, P1/P2 OPEN.

[Owner scope](evidence/t-ai-04-planner-connection-ownership-address-normalization/owner-task.txt), [Phase A gate](evidence/t-ai-04-planner-connection-ownership-address-normalization/phase-a-gate.json), [actual trace](evidence/t-ai-04-planner-connection-ownership-address-normalization/trace-result.json), [reviewed exit](evidence/t-ai-04-planner-connection-ownership-address-normalization/exit-gate.json), [artifact seal](evidence/t-ai-04-planner-connection-ownership-address-normalization/artifact-checksums.json).

## 1. Baseline

Đã đọc đầy đủ [Guard Fix](HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_GUARD_FIX_REPORT.md), [Diagnosis](HUGO_T_AI_04_PLANNER_CONNECTION_OWNERSHIP_DIAGNOSIS_REPORT.md), [Targeted Resume](HUGO_T_AI_04_PLANNER_LIVE_TARGETED_REVALIDATION_RESUME_REPORT.md), [Adapter Acceptance](HUGO_T_AI_04_PLANNER_ADAPTER_BINDING_ACCEPTANCE_FIX_REPORT.md), prior trace/result/route/raw observations, policy/registry/managed factory/maintenance candidate và independent suites. [Read/hash index](evidence/t-ai-04-planner-connection-ownership-address-normalization/baseline-review.json).

Historical verdict giữ nguyên: prior51/51 offline PASS, actual trace FAIL CLOSED, prior client closed1/1, PID9686 UNKNOWN, R01–R03 NOT RUN, P1/P2 OPEN. Historical restored25/25 và Trip27/27 không được coi là phép đo mới; task này không query business tables/fingerprint hoặc sửa evidence cũ.

## 2. Exact root cause

Prior candidate so nguyên chuỗi Docker `172.18.0.3` với self metadata `172.18.0.3/32`, và gateway `172.18.0.1` với `172.18.0.1/32`. Exact string comparison làm ownership FAIL dù phần host address có cùng bytes. Raw representation có mask không được xử lý bởi candidate cũ.

Không dùng normalization để bỏ qua sai địa chỉ, network prefix, port, family hoặc thiếu route proof. Historical failure vẫn là FAIL; acceptance mới nằm riêng trong thư mục task này.

## 3. Strict IP/CIDR canonicalization

[host-address.cjs](evidence/t-ai-04-planner-connection-ownership-address-normalization/host-address.cjs) dùng Node net.isIP kiểm host syntax, kiểm explicit host mask theo family rồi tạo validated bytes. IPv4 dùng4 bytes; IPv6 mở rộng thành8 words/16 bytes, canonical lowercase/full-word form. Comparison key gồm **family + bytes**, không DNS lookup hoặc substring stripping.

| Contract | Result |
| --- | --- |
| IPv4 bare và cùng host /32 | Cùng4-byte identity |
| IPv6 bare/expanded/compressed/case và cùng host /128 | Cùng16-byte identity |
| /24, /64, /0, wrong-family mask, malformed/signed/zero-padded prefix | REJECT cho host identity |
| IPv4 vs IPv6 | REJECT family mismatch |
| IPv4-mapped IPv6, dotted embedded IPv4, compatible hex IPv6 | REJECT theo contract bảo thủ |
| Zone ID, brackets, whitespace/newline, octal/short/integer/hex IPv4, hostname/Unicode, non-string | REJECT |

Native IPv6 loopback `::1` và `::1/128` được hỗ trợ; IPv4-compatible forms ngoài unspecified/loopback bị từ chối. Helper không cho network-prefix identity dù các host bytes có vẻ trùng. Raw evidence không bị normalize/ghi đè; canonicalization chỉ dùng tại comparison boundary.

## 4. Source diff

[Diff index](evidence/t-ai-04-planner-connection-ownership-address-normalization/source-diff.json), [route-policy diff](evidence/t-ai-04-planner-connection-ownership-address-normalization/route-policy.diff). Runtime semantic change chỉ gồm helper mới và thay các address equality checks trong candidate route policy. Exact physical target/port, direct port equality, forwarded route kind, server port, listener/signature/mapping/freshness checks giữ nguyên.

**23 copied core/test files byte-identical** so với Guard Fix, gồm registry, managed lifecycle, closing guard, maintenance bridge/Base, RealGuards, cleanup, fence và original51 suites. Không sửa production hoặc libraries. Control changes chỉ cập nhật task paths/seal, Phase A totals/source closure và entry prechecks exact historical container/approved role trước trace.

## 5. Independent positive/negative cases

[New parent](evidence/t-ai-04-planner-connection-ownership-address-normalization/normalization-parent.cjs), [child](evidence/t-ai-04-planner-connection-ownership-address-normalization/normalization-child.cjs), [84-case results](evidence/t-ai-04-planner-connection-ownership-address-normalization/normalization-acceptance.json): **84 PASS/0 FAIL**, một lượt, không retry acceptance.

Parent giữ golden bytes/outcomes độc lập; child chạy actual parser/route/registry/managed lifecycle/maintenance bridge. Có IPv4 /32 và IPv6 /128 equivalence, wrong prefixes/host/family/malformed/ambiguous input; wrong server/gateway/database/role/sentinel/port mapping/physical target, stale route/unexpected listener, protocol PID/backend_start/token mismatch, copied/empty tag, missing/pending/closed registration, PID reuse, external client, immutable snapshot mutation và evidence writer failure.

Invalid scenarios phải nonzero + global STOP, bốn late Agent/native/tool/operator callbacks đều bị reject trước callback; resource dispose exactly once cho mỗi sensor client đã tạo. Raw-before-verdict ordering được parent kiểm. Golden hex expectations không lấy từ helper đang test.

## 6. Saved raw replay

[Replay result](evidence/t-ai-04-planner-connection-ownership-address-normalization/normalization-cases/saved-raw-replay.json) ghi rõ **OFFLINE_REPLAY_OF_HISTORICAL_RAW_DATA**. Đọc trực tiếp prior CREATE/PHYSICAL_OPEN/RAW_SELF_IDENTITY, locked Docker route và trace result; từng file đối chiếu SHA256 với prior artifact seal, payload raw kiểm hash riêng.

Replay kiểm instance/token/startup tag, saved PID/backend_start links, DB/user/sentinel/RO và route metadata tại thời điểm historical observation; host `/32` so với locked Docker addresses PASS offline. Không thay raw field, không synthesize historical registration PASS, không giả có physical object/trace mới. Historical PID17864 trace vẫn FAIL CLOSED; replay chỉ chứng minh representation fix với saved inputs.

## 7. Original51 regression

[Original ownership results](evidence/t-ai-04-planner-connection-ownership-address-normalization/offline-acceptance-01.json): **39/39 PASS**. [Original integration results](evidence/t-ai-04-planner-connection-ownership-address-normalization/integration-acceptance-01.json): **12/12 PASS**. Original assertions/suites giữ byte; chạy bằng candidate route normalizer mới và task-local evidence.

Coverage cũ gồm installed Sequelize pool/afterConnect lifecycle với sensors, readonly/startup/SQL guards, external/copied/PID-reuse/pending/stale snapshot negatives, cleanup valid/ID/hash/FK/Trip/isolation cases, Base/RealGuards integration và independent route metadata negatives. Không thay expected để làm unknown thành PASS.

## 8. Offline maintenance/guard integration

New normalized-address integration chạy actual registry/managed factory, Base maintenance bridge, RealGuards và corrected orchestrator với sensor doubles. Owned `/32` cases hoàn tất ba sensor cases; unknown case giữ R01 FAIL, R02/R03 NOT RUN, dispatch arrays0, cleanup N/A/action0, dispose PASS1.

Original cleanup positives/negatives giữ exact approved IDs/hash/FK/Trip/isolation preconditions; unsafe callback0, valid callback1 chỉ trên arrays, không SQL. Base/all25 locks/handoff/exact DML/cleanup code giữ byte. Không nhận actual maintenance locks hoặc fixture cleanup PASS từ sensor tests.

Phase A **135 PASS**, source closure **31 files** khóa trước acceptance và vẫn khớp sau trace. **130 completed offline process audits** ghi0 sockets/HTTP. One-way Phase A runner dừng trước trace nếu bất kỳ suite/guard FAIL; task này không có acceptance failure.

## 9. Fresh Docker route proof

[Fresh observation](evidence/t-ai-04-planner-connection-ownership-address-normalization/route-before-trace.json), [verified descriptor](evidence/t-ai-04-planner-connection-ownership-address-normalization/route-verified.json) lúc **16:19:06.996 Asia/Saigon**. Docker inspect xác nhận exact historical container ID `2264485f39052a4c1d00f4cf1af9b7b7a3712f9bf4a47e36a114c40fb0fbfa1d`, running travelgo_postgres, published5432→5432, container172.18.0.3/gateway172.18.0.1.

OS target127.0.0.1:5432 do Microsoft-signed WSL relay listen; Docker listener signature Valid, docker-desktop WSL2 Running. Proof được collect độc lập, không PG connection; freshness≤120s được kiểm trước socket. Endpoint, exact container, approved role và31 source hashes được kiểm trước connect. Unknown proxy/listener/path vẫn FAIL CLOSED.

## 10. Controlled READ ONLY trace

Task mới cấp riêng tối đa1 connection. [Single-use marker](evidence/t-ai-04-planner-connection-ownership-address-normalization/trace-attempt.json), [trace result](evidence/t-ai-04-planner-connection-ownership-address-normalization/trace-result.json). Đúng **1 socket127.0.0.1:5432**, reconnect/retry0, không bootstrap/pool thứ hai. Chỉ self metadata SELECT rồi connection-activity metadata SELECT; không Trip/Booking/User hoặc entity queries.

| Observation | Actual |
| --- | --- |
| Factory / instance |controlled-trace /b5aed6e3-d34c-488c-96a9-e6cbe591f667 |
| Protocol/self PID |18887, bằng nhau |
| backend_start |2026-11-11T09:19:26.634464Z |
| Startup/self tag |og-controlled-trace-5eb740aa7cb34fd496e5675d1544234e |
| DB / role / sentinel |travelgo_ai_m0_test /postgres /hugotravel-isolated-test-database-v1 |
| Physical target/local port |127.0.0.1:5432 /49718 |
| PostgreSQL endpoints |server172.18.0.3/32:5432, client172.18.0.1/32:42134 |
| READ ONLY / timeout |default on, transaction on,15s |
| Verdict |PASS at16:19:26.654 Asia/Saigon |

Forwarded client port42134 khác local49718; verified forwarding policy không đòi equality đó. Direct TCP policy vẫn bắt equality. Server/client address bytes match đúng independent container/gateway; không chấp nhận IP lạ hoặc network prefix.

## 11. Registration/lifecycle verdict

Actual order: CREATE → PHYSICAL_OPEN/PENDING → RAW_SELF_IDENTITY → REGISTRATION_PASS → RAW_ACTIVITY → CLOSING_GUARD_PASS → DISPOSE_START → DISPOSE_PASS. Từng event write-once có timestamp/hash. [Raw self](evidence/t-ai-04-planner-connection-ownership-address-normalization/trace-events/003-RAW_SELF_IDENTITY.json) được persist trước registry assert; startup payload thực tế được capture trên physical pg connection, không chỉ sequelize.options.

Registered snapshot sequence4 đối chiếu [actual activity row](evidence/t-ai-04-planner-connection-ownership-address-normalization/trace-events/005-RAW_ACTIVITY_BEFORE_ASSERTION.json): một row managed client, cùng PID/backend_start/tag/DB/user/client endpoint. Current managed connection **TASK_OWNED_SELF_TRACE_VERIFIED**. Không có silent whitelist/refresh/retry snapshot. Trace identity.state REGISTERED trong result là snapshot trước disposal, không phải còn session sống sau task.

## 12. Resource disposal

[Dispose event](evidence/t-ai-04-planner-connection-ownership-address-normalization/trace-events/008-DISPOSE_PASS.json): **created1/disposed1**, owned client end hoàn tất; fence closed, pending dispatch0, retry0. Fixture cleanup N/A vì task không INSERT/commit fixture. Không terminate unknown PID hoặc mở connection khác để kiểm teardown. Actual multi-client disposal/maintenance lifecycle chưa được đo trong task này.

## 13. Security boundaries

Registry/managed startup/lifecycle/immutable snapshots và full closing identity checks giữ byte. Application_name/PID/cùng database đơn lẻ không đủ ownership. Unknown, pending, copied tag, backend_start mismatch hoặc evidence failure vẫn STOP; invalid prefix/family không bị cắt bỏ để hợp lệ hóa.

Default/transaction RO on và timeout15s có raw proof, SELECT/SHOW boundary giữ nguyên. Role postgres là superuser, không least privilege. Không sửa grants/role/schema, production Agent/Planner/Catalog/Recommendation/Auth/consent/limits, tool schema/SYSTEM, Sequelize/pg source. Không Ollama GET/POST/preload, fixtures, Direct Planner, Browser LIVE, limiter reset, V2, commit/push/deploy. Process boundary audit không phải OS-wide packet capture.

## 14. Source/benchmark integrity

[Final integrity](evidence/t-ai-04-planner-connection-ownership-address-normalization/integrity-after.json): **9776 protected files unchanged**, changed=[];321 sealed Guard Fix artifacts và report giữ hash,84 compiled production modules match. Historical raw/reports/benchmark/expected/fixture proposal và production source nguyên vẹn.31-file candidate closure khớp Phase A sau actual trace;23 core/test files vẫn byte-identical baseline.

Chỉ thêm candidate/report/evidence task mới. Không broad build/regression ngoài acceptance được yêu cầu; không đo lại historical business fingerprint hoặc Trip count để vượt scope.

## 15. Historical PID9686

**UNKNOWN**. Không whitelist/adopt/terminate hoặc quy ownership quá khứ từ PID18887 mới. Historical STOP và verdict cũ không thay đổi. Thành công của self trace không giải thích nguồn connection9686 trước đây.

## 16. P1/P2

**P1 NLU OPEN; P2 runtime OPEN.** R01–R03 Planner LIVE NOT RUN; không model/browser sample mới hoặc production/demo readiness claim. Sensor cases dùng cùng labels không phải LIVE runs.

## 17. Remaining blockers

Address normalization và một controlled forwarded self-provenance trace đã đạt. Chưa có actual multi-connection pool/bootstrap/maintenance-lock/handoff/cleanup integration, fixture ownership dưới concurrency, real browser/Agent/Ollama/Planner hay targeted LIVE acceptance. Historical unknown ownership vẫn chưa hồi phục được từ evidence cũ.

## 18. NEXT TASK PLAN — chỉ đề xuất

Đề xuất task riêng xác minh **multi-connection maintenance ownership integration**: startup RO cho từng factory, pending/bootstrap/concurrent snapshot/disposal, enforced all25 isolation và fail-closed unknown policy, với scope/connection cap mới. Không tự tái sử dụng cap1 đã tiêu hoặc tự tạo fixture.

Sau khi multi-connection integration đủ proof mới xem xét targeted Planner LIVE riêng với owner approval, fresh quota/principal, exact fixture isolation/committed ledger/cleanup guards, direct oracle, manifest/source/body hashes và native POST budget mới. Không tự chạy R01–R03, Ollama, V2 hoặc deploy trong task này.

**Dừng sau báo cáo. Không triển khai NEXT TASK.**
