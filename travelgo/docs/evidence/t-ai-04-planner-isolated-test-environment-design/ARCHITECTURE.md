# Đề xuất A — dedicated instance, capability admission

DESIGN ONLY. Không có service, port, role, CA, key hoặc dữ liệu mới được tạo. Tên/port dưới đây là đề xuất cho owner; không là identity đã xác minh.

## Topology cụ thể

Docker project riêng `travelgo_planner_e2e`, service `planner_pg`, image thuộc PostGIS15/3.4 nhưng phải chốt immutable digest và review patch/CVE khi provisioning. Volume mới `planner_pg_data_<baseline-id>` không external-bind tới volume dev. Một network `planner_private_<identity>` internal, không join `travelgo_net`, không service dev/pgAdmin/replication/cron. Không mount Docker socket; config/HBA/certificate mounts read-only, PGDATA chỉ DB service có quyền ghi. DB service không privileged, không host network; không mount original database files/backups.

Host port đề xuất **127.0.0.1:15432 → container5432**, chỉ cần vì E2E runtime chạy trên host và Ollama phải giữ nguyên `127.0.0.1:11434`. Không bind `0.0.0.0`/`::`; original5432 không đổi. Chưa kiểm port15432 trống. Host vẫn có thể reach bridge; network isolation chỉ giảm reachability, không là proof độc lập. [Docker bridge semantics](https://docs.docker.com/engine/network/drivers/bridge/).

Host E2E launcher chạy dưới dedicated OS/service identity; tạo hai process boundary: maintenance broker chỉ có writer key, runtime chỉ có RO key; observer dùng key thứ ba. Ordinary dev tools không đọc được key files/process memory. Mỗi private key mount/file có ACL riêng; không dùng environment/password fallback, không ghi key vào repo/evidence/command line. CA signing key giữ offline ngoài runtime/DB. Service secrets phải cấp riêng, không mount cả secret directory cho mọi service. Local Compose secret file là mount, không tự tạo hardware vault hoặc chống host admin. [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/).

Host/Docker administrator có thể inspect/mount/exec hoặc đọc memory là **trusted administrator**, kể cả developer đang giữ Docker daemon authority. Kiến trúc này không chống người đó can thiệp chủ động. Nếu owner muốn chống chính tài khoản host hiện tại, cần VM/host khác với administrator boundary khác; local container không đáp ứng yêu cầu ấy.

## Authentication và writer admission

Trong I, HBA chỉ cho `hostssl` exact DB mới + exact role runtime/observer/writer + observed/pinned forwarding-source host address. Dùng **cert**, CN bằng exact login role, không wildcard role map. Client kiểm CA, server SAN/name và pin/identity manifest; không `rejectUnauthorized=false`. Cuối HBA reject mọi TCP IPv4/IPv6, mọi DB/role khác; local Unix sockets reject trong window. Không `trust`, password, md5, peer-admin hoặc replication fallback. HBA xét rule đầu tiên phù hợp, nên phải kiểm full ordered rules và includes, không chỉ tìm một reject line. [HBA15](https://www.postgresql.org/docs/15/auth-pg-hba-conf.html), [certificate15](https://www.postgresql.org/docs/15/auth-cert.html), [server verification](https://www.postgresql.org/docs/15/libpq-ssl.html).

Private key + task-issued certificate là credential có hiệu lực, không phải tên role hoặc application_name. Dev `postgres` password không có giá trị tại instance mới; runtime certificate không thể xin role writer. Ordinary client tới được loopback/bridge nhưng không có task key không thể establish authenticated SQL session. Không có DB credential trong browser/Vite/model prompt. Không HTTP endpoint nào của broker nhận SQL hoặc fixture parameters từ browser.

Provisioner/admin login tắt và secret/entrypoint provisioning không còn trong runtime window. Bootstrap `postgres` không cấp certificate, không password usable, NOLOGIN; DB/schema/application tables thuộc `planner_owner` NOLOGIN, không login nào là member owner. PostGIS extension-owned objects/privileged owner cũng phải audit riêng. Không sidecar privileged writer, logical subscription, FDW/dblink credential, replication apply worker hoặc scheduled seed.

## Privilege matrix

| Identity | LOGIN trong I | Data privilege | Bị cấm |
| --- | --- | --- | --- |
| planner_owner | Không | Own application schema/objects; administrative capability outside I | Không membership từ runtime/writer/observer |
| planner_provisioner / bootstrap postgres | Không | Provisioning ngoài I, owner-approved recovery ngoài active test | Không runtime credential/HBA entry/certificate |
| planner_runtime_ro | Có, riêng cert | SELECT places, businesses, users, user_roles; catalog metadata cần ORM | Không DML/DDL/owner/role escalation |
| planner_observer_ro | Có, riêng cert | SELECT approved25 + metadata đủ provenance/fingerprint | Không DML/DDL; chỉ pg_read_all_stats nếu review cần, không blanket pg_monitor |
| planner_fixture_writer | Có, riêng cert | SELECT, INSERT, DELETE trên places duy nhất | Không UPDATE/TRUNCATE, không write other24, không CREATE/REFERENCES/TRIGGER/sequence-write |
| PUBLIC/dev/shared credentials | Không | Không app data DML/callable privileged write path | Không authentication trong I |

Mọi login: NOSUPERUSER, NOCREATEROLE, NOCREATEDB, NOREPLICATION, NOBYPASSRLS, không sở hữu objects, không role membership/escalation qua predefined file/program/write roles, không grant option. NOINHERIT một mình không đủ vì SET ROLE qua membership vẫn có thể nâng quyền. [Role attributes](https://www.postgresql.org/docs/15/role-attributes.html), [membership15](https://www.postgresql.org/docs/15/role-membership.html).

DB revoke PUBLIC CONNECT/TEMP; schema không PUBLIC CREATE; grants explicit. Snapshot grant catalog phải bao gồm column ACL, sequence, schema/database, membership closure/default ACL, views/rules, functions/procedures/operators/casts/triggers và extension entry points. Hạn chế EXECUTE của application/extension routines về reviewed read-only allowlist; không chỉ tin nhãn STABLE/IMMUTABLE. Không khẳng định revoke CONNECT cắt existing sessions: đó là startup permission. [Privileges15](https://www.postgresql.org/docs/15/ddl-priv.html), [security-definer considerations](https://www.postgresql.org/docs/15/sql-createfunction.html).

RO startup option, transaction verification và SELECT/SHOW harness boundary giữ làm defense in depth; authorization vẫn enforce khi role tự đổi default READ ONLY. [Transaction characteristics](https://www.postgresql.org/docs/15/sql-set-transaction.html). SELECT text filtering không chứng minh mọi SELECT function không có side effect.

**Không cấp UPDATE/DELETE trên other24 chỉ để old A/B LOCK chạy được.** PostgreSQL LOCK privileges có yêu cầu riêng; current all25 SRE/SHARE contract không tương thích minimal writer. [LOCK15](https://www.postgresql.org/docs/15/sql-lock.html). Cần versioned test-only isolation/cleanup proof adapter mới, không gán giả old lock PASS.

Direct SQL table INSERT/DELETE privileges không giới hạn hai rows. Maintenance broker/harness là trusted task component, hash-locked, single-use ticket chỉ exact approved values/IDs/slugs/full-row hashes và refs0. Đó là explicit trust assumption, không claim table ACL là row policy. Nếu owner muốn chống broker bị compromise, cần thiết kế thêm DB row-level capability/RLS hoặc narrow function riêng, với security-overlay/schema approval mới; phương án đó chưa được chấp thuận ở đây. RLS cũng không thay admission no-RX proof và không bao phủ TRUNCATE. [RLS15](https://www.postgresql.org/docs/15/ddl-rowsecurity.html).

## Admission epoch và lifecycle

Provisioning diễn ra trước I bằng admin identity riêng. New isolated instance đi qua clean restart với deny policy đã persist; mọi provisioning/control sessions đóng, prepared transactions0, user background writers0. Không nhận instance đã có unknown sessions. Không dùng REVOKE/reload để giả existing sessions hết quyền. Nếu có session lạ: không bắt đầu I; quarantine/reprovision riêng sau approval, không terminate PID unknown của DB cũ.

Trước `ISOLATION_READY`, verifier phải bind image/container/volume/network/route/TLS/server/DB UUID/sentinel, effective auth/privilege closure, startup epoch, known connection lifecycle và approved new baseline. Snapshot là evidence bổ sung cho cấu hình deny/auth persistent, không thay enforcement. Tất cả authenticated clients đang tồn tại phải có owned capability/provenance; bootstrap cũng tính connection cap.

Trong I không grant/revoke/role/HBA/network/image/volume/job mutation, không provisioning admin. Một maintenance writer process tuần tự INSERT/COMMIT rồi DELETE/COMMIT; không A/B transfer. Readers bắt đầu fresh RC transaction sau fixture commit; không reuse stale RR snapshot. Same writer connection có thể sống qua Planner; admission không phụ thuộc nó sống hay chết.

Live connection budget minh họa: observer1 + natural Sequelize bootstrap1 + pool tối đa2 + maintenance1 + final verifier1 =6 physical attempts; mọi failed connect/probe bổ sung cũng tính vào hard cap10, no retry/reconnect. Đây không là grant6 hay reserve4 cho task sau. Security experiments có approval/cap riêng, không âm thầm reset cap hoặc chia nhỏ cùng một run để né giới hạn. Healthcheck dùng pg_isready/protocol readiness không authenticated data client; mọi authenticated healthcheck nếu có phải counted/registered, không che bootstrap session.

## Stop, crash và recovery

STOP đóng bốn dispatch channels, giữ original error, later R02/R03 NOT RUN, resource disposal có evidence. Không tháo auth/network policy hoặc mở admin để cứu cleanup tự động. Unknown authenticated/privileged client hoặc seal drift = **BOUNDARY_BREACH**: có thể safety đã mất trước snapshot, quarantine và withdraw PASS. Không “phát hiện rồi STOP” để chứng minh không writer lọt.

Pre-INSERT hoặc **server rollback được chứng minh** trước COMMIT: safe abort và verify baseline. Nếu mất kết nối mà commit knowledge không chắc, xử lý ambiguous. Sau COMMIT/crash/Planner error/cleanup fail: giữ volume và admission deny; I vẫn còn nghĩa vụ cho tới safe end, không tuyên bố rollback nhờ dispose. Không automatic writer watchdog/reconnect. Recovery cần approval mới, cùng DB identity/baseline + ledger + full rows/IDs/slugs + FK/Trip refs/isolation revalidation; thiếu proof không DELETE/restore giả.

DB restart: sessions/locks mất nhưng disk auth policy vẫn deny outsider nếu loaded configuration giống sealed configuration. LIVE STOP, không tự reconnect; fresh incarnation/provenance/security acceptance trước recovery riêng. Restart policy drift không được claim invariant còn đúng. Availability không được bảo đảm khi host/DB crash; confidentiality/write exclusion dựa trên persistent admitted-capability policy, không heartbeat.

Baseline backup chỉ từ approved isolated synthetic dataset, encrypted/access-limited/hash-verified, không raw dev backup. Exact cleanup success + all25 isolated fingerprint equality + absence verification kết thúc I. Final mismatch quarantine dù DELETE2 succeeded. Recreate chỉ new disposable resources với owner approval; không xóa volume chứa unresolved ledger trước khi lưu evidence, không restore original DB. Retention/destruction có resource IDs chính xác và review riêng; không lệnh down -v cho project dev.
