# Proposed connection ownership guard work — not integrated

Status: **PROPOSAL_ONLY / NOT_READY_FOR_LIVE**. Historical PID9686 remains UNKNOWN. No historical guard or production connection manager has been changed.

The installed Sequelize code and offline source tests establish three harness concerns:

1. Replacing `sequelize.options.dialectOptions` after construction does not update `sequelize.config` or the ConnectionManager's cloned config. The old harness startup READ ONLY option is therefore not established by that assignment. Its later `afterConnect` SET/verification and SELECT-only query wrapper remain separate protections.
2. A backend exists before dialect setup and async `afterConnect` complete. Historical registration occurs in a later hook. The closing guard binds its PID array before awaiting the activity query. A client can become visible after that snapshot. Source/doubles establish this window; this task did not reproduce it against PostgreSQL.
3. Historical `readerPids` is never retired on disconnect, and a PID alone does not bind `backend_start`. Installed `_connect` does not itself disconnect a physical client when `afterConnect` throws. Neither observation establishes that such a failure happened historically.

The proposed `ownership-sensor.proposed.cjs` is a diagnostic contract, not an accepted replacement guard. It requires factory creation evidence, a physical client capability, self identity, PID, full backend_start, startup tag, role/database, client endpoint, registration state and lifecycle. Snapshot records are immutable; registration after a snapshot cannot retroactively authorize that observation. Unknown sessions still STOP. Release into a pool retains ownership; confirmed disconnect retires it. Error states reject ownership.

The controlled trace exposed a limitation of this proposal: it compares PostgreSQL `client_port` directly with the local socket's port. Those were 35994 and 65381. This equality is not established in the current connection path. The trace stopped rather than accepting a partial identity. Docker Compose publishes host5432 to container5432; a proxy/NAT path is a possible explanation, **not a verified attribution**. The mismatch must not be solved by ignoring endpoint evidence or adopting all test-DB clients.

For a separate **T-AI-04-PLANNER-CONNECTION-OWNERSHIP-GUARD-FIX**:

1. Review endpoint/proxy identity requirements offline; specify what physical-client/self-query/backend-start evidence is sufficient across a forwarded path, with independent negatives for forged/copied tags and PID reuse. Obtain any additional metadata trace scope separately. Do not retry this stopped trace automatically.
2. Persist sanitized self metadata and creation events *before* evaluating ownership, so a failed guard retains diagnostic evidence. Keep secrets and business rows excluded.
3. Configure startup READ ONLY and unique factory tags in a test-only constructor/factory before any physical connect. Verify the actual config passed to `pg.Client`; do not change production connection management in this task.
4. Track pending/open/registered/released/closing/closed/error client states and full PostgreSQL backend identity. Serialize ownership snapshots against harness factory creation, while still rejecting every observed external/unknown client. A pending owned creation is not an automatic PASS or a reason to retry a failed closing guard.
5. Ensure factory errors dispose only the physical client the factory demonstrably created, including failures before pool registration. Preserve the original error and audit disposal errors separately.
6. Integrate a separately reviewed registry into a new harness copy only after offline regression/failure injection. Preserve all maintenance locks, exact fixture ledger/hash/ID/slug/FK/Trip preconditions, cleanup eligibility, dispatch fences and native/quota policies unchanged.

No part of this proposal authorizes fixture creation, Planner execution, Ollama requests, LIVE, V2, deployment or use of historical unused caps. A targeted LIVE resume remains a separate task with fresh scope/quota/fixture/native approval.
