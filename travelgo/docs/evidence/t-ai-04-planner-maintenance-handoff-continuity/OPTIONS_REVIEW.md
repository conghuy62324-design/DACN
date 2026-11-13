# Options A/B/C — proposal only

No option below has been installed. No database, role, grant or Docker configuration has been changed.

| Direction | Assessment | Current-scope decision |
| --- | --- | --- |
| A: existing all25 SRE A → sequential SHARE B | Concrete valid writer-grant counterexamples, including later-table queues after the last ownership sample. | REJECT; current gate remains BLOCKED. |
| B1: retain a single A transaction | A can retain protection while alive, but independent reader sessions cannot see its uncommitted fixture rows. Committing for visibility reintroduces the transfer obligation. | Does not satisfy existing real-catalog/readonly-fixture design. |
| B2: revise modes, split write table from other24, bounded pre-acquisition and queue-priority validation | Conditional candidate: compatible SHARE guards on non-write tables may overlap; the fixture relation's RX still conflicts with any successor mode that blocks RX writers. Existing waiters, priority changes, failures and ambiguous commit need a complete proof. Current SRE-on-all25 policy cannot simply overlap B SHARE. | NOT PROVABLE from current evidence; requires separately approved protocol review, no weakening of unknown/cleanup rules. |
| B3: one successor session per relation | A plus25 successors already needs at least26 sessions; with the historical bootstrap/two readers/observer/probe/final pattern the budget would be32. Even queueing every relation does not cure an earlier writer ahead of a successor or protection loss on disconnect. | Exceeds10; increasing cap alone is not a correctness proof. |
| B4: application/session advisory gate only | Ordinary DML writers need not cooperate with it. A heartbeat or no-writer snapshot also does not prevent a later writer. | Insufficient for the defined threat model. |
| C: separate test environment with enforced writer admission | Potentially sufficient **if** outside DML authority is denied continuously, including across task transaction/connection failures. An isolated name or an observed-empty inventory is insufficient. | Preferred architecture to assess next; owner decision/new scope required. Not an implemented/proven current protocol. |

Independent visibility facts come from [PostgreSQL15 transaction isolation](https://www.postgresql.org/docs/15/transaction-iso.html). Advisory locks require application cooperation, per [PostgreSQL15 advisory locks](https://www.postgresql.org/docs/15/explicit-locking.html#ADVISORY-LOCKS). Permissions and connection admission differ, per [PostgreSQL15 privileges](https://www.postgresql.org/docs/15/ddl-priv.html).

## What C would have to establish

The desired stronger invariant is `outside actor cannot obtain DML authority on any approved relation throughout I`, enforced independently of A/B lock lifetimes. With that invariant, outside RX grants are excluded by authorization; transaction commits and fixture visibility no longer create an admission gap. This is a **conditional argument**, not a verified fact about the current environment.

Possible future architecture: owner-approved disposable copy/instance of the approved baseline, dedicated task writer identity, separate readonly runtime identity, controlled network/auth admission, and denial of every outside writer capability. Shared postgres/superuser credentials, owning-role privileges, memberships, callable privileged functions and write paths through views/triggers must be reviewed; revoking only CONNECT does not establish that existing authenticated sessions have no write authority. Provisioning must establish a clean boundary before I and preserve the original baseline outside the disposable environment.

The threat model must explicitly trust infrastructure administrators capable of overriding database controls. The current counterexample requires only ordinary valid DML rights, not privileged administrative sabotage. Changing the threat model on paper without enforcing writer exclusion is not an acceptable fix.

## Owner decision needed for a later task

Choose whether to authorize a dedicated isolated test environment and its exact baseline/roles/network admission, or commission a revised table-lock protocol proof under explicit queue/failure assumptions. Both require new scope. This task does not request or perform creation of a database/container, role/grant changes, reset, fixture insertion or connection-cap expansion.

There is no approved replacement protocol here, so no executable real-DB experiment/READY manifest is prepared. After an offline correctness argument is accepted for the chosen architecture, a separate owner-approved validation plan must specify exact sessions/cap/tables/modes/timeouts, expected conflicts, rollback/disposal and final fingerprints. Finite lock-only experiments can validate implementation assumptions and find counterexamples; they cannot establish no-gap for every possible interleaving by sampling alone.
