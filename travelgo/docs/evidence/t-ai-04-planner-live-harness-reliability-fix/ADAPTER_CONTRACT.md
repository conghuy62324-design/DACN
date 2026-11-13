# Corrected Planner harness contract

`run-live.corrected.cjs` exports an import-only orchestration module. It does not
import the historical auto-running LIVE script, instantiate a provider, connect
to PostgreSQL, or grant a LIVE budget. The offline drivers and mocked browser
execute this same orchestration and the same fidelity/Unicode helpers.

Use `runPlannerHarnessProcess` at a process entry point: every failed guard sets
a nonzero process exit code after guarded cleanup. `runPlannerHarness` returns
structured results for a Playwright test, which must assert its PASS result.

Each case must pass every named PRE and POST guard. Guard adapters return the
literal boolean `true` only after their assertions succeed. Missing adapters,
false/undefined/FAIL results, exceptions and evidence write failures stop the run.
Completed results require an independent public JSON oracle. Only the two
approved itinerary volatile values normalize; no business fields are projected
away. The old run2 files and verdicts remain immutable.

All Agent, native-provider and tool dispatch adapters must go through the
provided `ctx.agent`, `ctx.native` and `ctx.tool` methods and pass `ctx.signal`
to abortable work. There is no retry API. One dispatch per channel per case,
at most six inference intents, and a hard native ceiling of seven remain fixed.
The future operator load-only path requires its own approved exact body and
shared cap accounting; no such LIVE path is enabled by this offline task.

The mocked drivers supply mock DB/quota/ownership/provider checks. They are not
LIVE implementations of those guards. A future targeted LIVE task must bind
the existing real identity/sentinel/schema/checksum/fingerprint/isolation,
quota/TTL, auth/ownership, raw schema/expected, request/native-body hashes and
tool safety guards to these ports, under a fresh sealed manifest. Do not copy
the mock `async () => true` guards into a LIVE adapter.

Finally closes every dispatch channel and aborts pending work before cleanup.
`cleanupPrecondition` must verify independent cleanup authority, ownership and
all applicable references/hashes/isolation before any destructive cleanup.
Failure blocks cleanup action, preserves the first error, and still invokes
resource-only `dispose`. Neither cleanup callback can use the Agent/native/tool
dispatch channels. In this task all cleanup actions are mock counters/browser
resource disposal; there is no entity mutation.

Future LIVE adapters and their integration need separate review and fresh
approval, quota, fixture and POST-budget checks. The two unused run2 POST slots
provide no new authorization. Do not execute the historical monolith to bypass
this entry contract.
