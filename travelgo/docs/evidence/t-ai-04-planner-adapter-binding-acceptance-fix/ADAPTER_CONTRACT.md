# Offline adapter-binding acceptance fix contract

This folder contains new task copies. Historical target/reliability/run2 files
remain sealed and unchanged. No module in this task grants LIVE authorization.
The real runtime factory is import-only and was not instantiated by these tests.

Mandatory case guards remain boolean assertion adapters. Missing adapters,
undefined/false/FAIL results, exceptions and timeouts fail closed. Every Agent,
native inference, operator load-only and tool callback uses the shared stop fence.
The fence is unchanged from targeted revalidation: total native <=4, inference
<=3, operator <=1, no duplicate dispatch/retry. Agent quota is separate.

Cleanup is a different lifecycle contract, not a boolean mandatory case guard:

* `NOT_APPLICABLE` requires explicit evidence that commit=false, ambiguous=false,
  createdRows=0 and no ownership ledger. Fixture deletion is not called. The
  finally handler and resource dispose still run. Runtime stage presence is not
  a deletion precondition and does not establish ownership.
* `READY` can be produced by `cleanup-lifecycle.cjs` only after committed task
  ownership, exact approved IDs/slugs/full row SHA/MD5, FK/Trip references and
  enforced isolation pass. `perform` rechecks these conditions, consumes a
  single-use authorization ticket and calls exact cleanup once. It requires
  affected count2, restored25/25/Trip27, exact deleted IDs and no residual IDs.
* Errors or incomplete/ambiguous state block cleanup. They never permit adopting
  foreign rows or manufacturing a ledger. Missing/false results, silently skipped
  cleanup, fabricated restoration with residual rows, repeated action, and errors
  in cleanup/dispose make the run fail with nonzero process status.

The corrected orchestrator closes/aborts every dispatch channel before cleanup,
preserves the first failure and records cleanup/dispose failures separately.
Resource dispose is invoked exactly once even for NOT_APPLICABLE/BLOCKED actions.
The real runtime candidate and synthetic process drivers use the same shared
cleanup lifecycle. The existing real maintenance implementation still rechecks
its own identity/ledger/row/reference/lock/fingerprint guards before exact DELETE;
no maintenance SQL or production safety rule is relaxed.

The independent test parent defines expected stage/ledger/action/residual/exit
and dispatch counters without importing the cleanup implementation. SyntheticDb
is an array-backed sensor double, not PostgreSQL. Counts called native/operator
in tests are simulated callbacks; actual network/DB/native POST are zero.

A future LIVE resume requires fresh owner scope confirmation, quota and DB/
fixture guards, a separately reviewed manifest and native POST budget, and hashes
binding all harness dependencies including the new cleanup module. Four unused
POST slots from the blocked historical task provide no execution authority.
