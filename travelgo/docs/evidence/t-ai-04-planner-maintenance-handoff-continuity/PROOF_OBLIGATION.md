# Protection contract and current-protocol refutation

This is an offline design review. Transaction labels A/B/W are model identifiers, not PostgreSQL PIDs. Fixture DML events are symbolic lock/visibility operations, not SQL or created Places.

Let T be the exact 25 schema-qualified relations locked by the historical SQL, validated against the sealed fingerprint. A writer is an authenticated non-task actor with ordinary DML privileges. UNKNOWN means the harness has no ownership proof; it does not mean PostgreSQL has denied that actor database privileges.

Define I = [protection_begin, protection_end). Begin requires A registered and holding granted SHARE ROW EXCLUSIVE on every t in T, before fixture DML. Protection must remain required across A COMMIT, B acquisition, reader use, subsequent cleanup transition and cleanup commit. A successful handoff is not the end of I.

End is permitted only at a safe terminal boundary: (a) uncommitted fixture work is atomically rolled back, or (b) exact task-owned cleanup has committed and required baseline/absence verification is complete. Controller STOP, timeout, lost COMMIT acknowledgement, client disposal, or an observation of no current writer does not by itself establish end. Committed fixtures prevent treating rollback of some other transaction as restoration.

Safety obligation:

`For every t in T and every grant event g inside I: not (g.actor is outside task scope and g grants ROW EXCLUSIVE on t).`

This event property captures the required absence of an instant at which an outside DML writer can acquire the table write lock before the successor protection. The lock manager evaluates granted holders and conflicting earlier waiters per relation. WAITING is not HELD, and waiting on t1 has no queue effect on t25. REGISTERED is an identity/lifecycle property, not a PostgreSQL writer-admission barrier.

The model checks the published 8-mode conflict matrix, transaction self-lock exemption and normal conflicting-waiter order. The source basis is [PostgreSQL15 table locks](https://www.postgresql.org/docs/15/explicit-locking.html), [LOCK list semantics](https://www.postgresql.org/docs/15/sql-lock.html), [soft blockers](https://www.postgresql.org/docs/15/functions-info.html), [LockTableCommand](https://raw.githubusercontent.com/postgres/postgres/REL_15_STABLE/src/backend/commands/lockcmds.c) and [ProcSleep/ProcLockWakeup](https://raw.githubusercontent.com/postgres/postgres/REL_15_STABLE/src/backend/storage/lmgr/proc.c).

## Valid partial-order counterexample

1. A holds SRE on all25; its fixture INSERT also holds RX on places. B requests SHARE in the original order and waits on t1. All other B relation requests have not been issued.
2. The final ownership sample reports only A/B as expected.
3. W arrives after that sample, has no existing locks on t25, and requests RX on t25. A blocks W. B is not yet in t25's queue.
4. A commits; fixture changes become visible and A's locks are released.
5. When t25 is released, W is the prior eligible waiter there. B's backend need not resume acquisition of later relations before this release/grant. W obtains RX while I remains active and before B's request for t25.
6. W can commit/disconnect, B can later acquire all25, and a later ownership sample can again report no unknown client. Neither successful post snapshot nor identical before/after fixture bookkeeping erases the grant event.

The refutation depends on `last_guard < W_request(t25) < A_commit < W_grant(t25) < B_request(t25)`. It does **not** depend on whether B's t1 grant occurs before or after W's t25 grant. The deterministic model logs one cross-relation wakeup order for reproducibility; it does not claim PostgreSQL physically releases all locks atomically or in lexical order. Deferring B's process while A releases its locks yields the unsafe partial order regardless of the internal cross-relation release order. No lock upgrades, lock groups or deadlock-driven queue rearrangement are needed for this witness.

This is an existential disproof of the current protocol. A bounded model is not an implementation-equivalence proof or a universal proof for any alternative. The model omits PostgreSQL tuple locks, WAL/replication/crash recovery, parallel lock groups, queue-priority upgrade optimizations and a full deadlock detector. Failure injections cover selected timeout/deadlock-victim/ack-loss paths only.

## Failure boundaries

- Writer waiting before B on a sampled relation: the controller must STOP; a safe precommit abort rolls back A before ending I. The C scenario checks this behavior rather than silently continuing despite an observed unknown actor.
- A COMMIT fails before the commit point: A still holds protection until safe rollback; no fictitious committed state.
- COMMIT acknowledgement is lost after actual commit: fixture state is committed, controller knowledge ambiguous, cleanup is blocked without the existing proofs.
- B disconnects after committed fixtures: its table locks disappear; STOP cannot stop an independent writer from being granted a now-available lock. No safe-end marker is synthesized.
- Cleanup after failure keeps exact-ID/row-hash/slug/FK/Trip/isolation eligibility. No force delete, baseline repair or global restore is authorized.

## Scope and cap

The historical cap10 covers task-owned physical connection attempts, not an enforceable limit on outside actors. This task opens zero database connections. The current protocol is REFUTED. No replacement is accepted as proven under the unchanged cap, shared writer-capable environment and approval scope. That is not a theorem that every conceivable revised protocol with ten sessions is impossible.
