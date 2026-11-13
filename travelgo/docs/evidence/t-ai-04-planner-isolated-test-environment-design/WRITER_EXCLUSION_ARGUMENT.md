# Conditional writer-exclusion argument — not deployed proof

T = exact25 table IDs in design-inputs.json, hash-linked to original approved fingerprint/table list. New instance must have one corresponding public relation for each ID; approve new OIDs/identity separately. No change to old25, fixture fields, expected or historical verdict.

I = `[ISOLATION_READY, safe_end)`, through fixture INSERT, actual COMMIT, independent Planner reads, exact cleanup commit and final required all25 fingerprint/absence verification. No fixture pending/commit ambiguity or integrity mismatch may synthesize safe_end. Safe precommit rollback can end I only with evidence. Crash/STOP/disposal is not sufficient after commit.

Preserve the strict prior property **G**: no outside-task actor receives a GRANTED ROW EXCLUSIVE table lock on any t in T during I. Also require **D**: no outside-task DML/DDL/privileged side effect changes T. D is not silently substituted for G.

## Important distinction: ACL-only is insufficient for G

PostgreSQL15 parser setTargetTable opens the modification target with RowExclusiveLock and records permissions for later checking; executor InitPlan calls ExecCheckRTPerms. **Inference from source:** an authenticated outside SELECT-only client can, for a normal accessible relation, obtain a transient RX while an unauthorized modifying statement is analyzed, before executor ACL/read-only rejection. This is not a current DB experiment or claim every rejected statement always takes RX. [Official parse_clause.c](https://raw.githubusercontent.com/postgres/postgres/REL_15_STABLE/src/backend/parser/parse_clause.c), [official execMain.c](https://raw.githubusercontent.com/postgres/postgres/REL_15_STABLE/src/backend/executor/execMain.c).

Therefore “outside clients may authenticate but have no write grants” proves neither G nor the chosen admission architecture. Explicit LOCK RX has its own documented privilege check; that does not establish the timing of automatically acquired DML locks. No relaxed reinterpretation of the old property is used.

## Preconditions P1–P8 for the proposed architecture

1. **P1 resource identity:** dedicated instance/volume/DB UUID/sentinel, exact25/schema/migration/security manifest/new baseline approved; no shared original PGDATA or fallback endpoint.
2. **P2 clean entry:** provisioning sessions closed by clean restart before I; no outside authenticated sessions, prepared transactions, subscriptions, scheduler or user background writers. Current task-owned pending registrations block READY.
3. **P3 authentication:** TLS-only cert auth, exact role/DB/source, default reject all paths including Unix sockets; only dedicated task certificates can authenticate. No shared admin/dev credential accepted.
4. **P4 key authority:** client private keys held exclusively by trusted task OS/process boundary; CA private key offline, no broker SQL API or arbitrary-SQL runtime path. Host/Docker/admin active compromise and task key theft are outside accepted threat model, explicitly subject to owner choice.
5. **P5 stable policy:** auth, role/ownership/membership, executable privileged paths, network/container/volume and signing authorities immutable throughout I. Restart loads the same deny policy; no auto provisioner/seed.
6. **P6 constrained task authority:** runtime/observer SELECT only and actual startup RO, writer direct INSERT/DELETE places only; trusted broker authorizes exact task writes. No callable privilege escalation, owner/set-role or indirect DML outside the scoped broker.
7. **P7 failure persistence:** STOP/disconnect/COMMIT does not change P3–P6. Unknown authenticated client or drift is a breach, not accepted new identity. Committed fixtures remain quarantined if cleanup cannot be proven safe.
8. **P8 safe end:** acknowledge exact cleanup, full isolated baseline and residual verification before success/end; no original-data restore or approval spoofing.

## Argument

Base case at READY: P1/P2 exclude already-authenticated outside processes and pending external writes. Existing-session or prepared-transaction uncertainty means READY must not occur.

Induction on an arbitrary next session/transaction/lifecycle event in I: an outside client without a task private key cannot authenticate under P3/P4, independent of knowledge of shared postgres password, port reachability or application_name. Its SQL cannot reach relation parsing/locking, so it cannot produce an RX grant or DML. All admitted clients are task-capability holders by P4; P6 restricts their legitimate task actions and protects against an accidental runtime write. Direct privileged function/background/DDL paths are excluded by P2/P5/P6.

Fixture COMMIT changes visibility, not persistent authentication/authority. A/B queues are absent from the proof. Controller crash/transaction rollback/connection disposal leave P3–P6 unchanged. A server crash temporarily removes all sessions; persistent deny policy admits no outsider on restart, conditional on P5. No reconnect or new LIVE follows without a new acceptance epoch. Cleanup COMMIT has the same admission property as fixture COMMIT; final verification is inside I.

Thus **P1–P8 imply G and D** for every transaction interleaving in this abstraction, rather than a sampled no-writer observation. This is a conditional architectural argument, not proof that the current machine satisfies P1–P8 or a formal mechanized PostgreSQL implementation proof. Offline cases test decision/recovery logic and assumption violations, not cryptography/OS ACL/HBA correctness.

## Explicit counterconditions

An outside actor steals the complete runtime private capability: authentication can succeed; ACL can block mutation but not necessarily transient RX. An outside actor steals writer capability: exact places writes may be possible. Neither case is magically rejected by taskOwned labels. Both sensors produce **BOUNDARY_BREACH**, preserve active I and require quarantine/security review. Snapshot STOP cannot erase a prior violation.

An active trusted host/Docker administrator can replace HBA, keys, executable, PGDATA or CA. An admitted superuser can bypass database ACL. These are not prevented by local container security. If owner includes either as untrusted while retaining their override authority, Option A is not sufficient and gate must remain B/C; remote administrator separation is required.

## Alternative options

**B same instance:** separate DB/roles can deny ordinary nonprivileged writers, but the current shared postgres superuser path is not separated. Existing privileged clients/cross-database connections, owner/SET ROLE/definer paths and old sessions are not invalidated by database naming or CONNECT revoke. **NOT ACCEPTABLE under current shared-admin threat model.** It could only become conditional after authority/session changes with separate approval, which removes its low-impact benefit; no such changes occurred.

**C revised locks:** **NOT PROVEN**. Need proof for per-relation acquisition/old waiters/priority, fixture visibility, commit ambiguity/timeouts/deadlocks/disconnect, cleanup and cap10. Current A/B protocol remains REFUTED; advisory participation and heartbeat snapshots do not deny uncooperative writers. No theorem claims all conceivable bounded protocols impossible. No new lock protocol is proposed as executable or accepted here.
