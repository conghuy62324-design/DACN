# Owner login diagnosis and repair —18/11/2026

**PASS — actual API200 + actual Edge200, unchanged Owner/password/roles/database.**

- Frontend5177 was stopped after TASK21.33 cleanup. Current5057 backend was owned protected runtime25164, correct catalog staging15452; no wrong-database target found.
- Fresh SQL identity: travelgo_staging_catalog_20261112/catalog_runtime, non-superuser/no-createdb/no-createrole, expected sentinel.40tables/17migrations/130Place/20Business preserved.
- Existing Owner bae330d6-c3cb-462e-839e-cf07d73a64d2 and SUPER_ADMIN role fe016c5b-63a1-4e9a-9938-465aaae58f69 match TASK21.30. Users/user_roles fingerprints and password hasher source remain unchanged since the verified21.30 update.
- Stored email matches the requested account; scrypt format valid, existing production verifyPassword accepts the DPAPI password. No disabled/locked/status column exists in current User schema. Legacy role=user is overridden by authoritative user_roles SUPER_ADMIN in resolveRoles, not a missing admin permission.
- DPAPI decrypt succeeds on DESKTOP-KU5UHNI\Danh; CurrentUser SID matches creation receipt, protected ACL contains only that user. Neither blob nor password hash was modified or printed.
- Historical401 means submitted credentials did not match AuthService lookup/verification; old request body was deliberately not retained, so cannot identify whether its email or password differed. It is not evidence of hash corruption: current DPAPI pair passes production verifier and actual5057 API200. Frontend being stopped is a separate current availability issue, not the cause of an earlier401 response.

## Concrete repair

Added backend/scripts/open-staging-owner-login.cjs. OPEN_OWNER_LOGIN.cmd now calls it using an absolute resolved repo path; original CMD preserved in OPEN_OWNER_LOGIN.before.cmd. Reuses existing DPAPI fill helper/password service, no new credential form or storage.

The helper verifies owned backend PID/port, staging identity and existing SUPER_ADMIN; starts frontend5177 only with explicit VITE_PROXY_TARGET=http://127.0.0.1:5057 and empty VITE_API_URL (relative /api), without production.env edits. It checks listener ownership before filling credentials; unknown existing frontend configuration fails closed. Background frontend is hidden; Edge is visible as requested. Default CMD fills masked credentials and leaves the ordinary login button to the user. Today's verification mode clicked login once, authenticated real Owner and opened the admin page; no source/fact decisions.

Actual live Vite module verifies empty VITE_API_URL and target5057. Actual Edge login via this runtime returns200/SUPER_ADMIN; owner-signed-in.png is taken after login, never from a credential form. Backend25164 remains protectedREADONLY/SQLDML0. Frontend2012 and signed-in Edge intentionally remain open for the user's requested website access.

## Validation and preservation

Node syntax PASS. Direct API login200 and real Edge login200; no model double or auth bypass. Full40/40 SQL fingerprints unchanged after both logins. No password reset/account create/role edit/migration/seed/schema change. No reason to request password-reset approval. AuthService/scrypt/.env unchanged; no Qwen/Ollama or original DB access. Two pre-reserved conservative auth entries under existing approved budget, initial17, derived15/reserve10; no Agent chat/inference or source worker restart. TASK21.33 historical401/workerBLOCKED remains unchanged; this is an explicitly authorized login-repair follow-up, not a replay of that closed journey or TASK21.34.

Evidence: diagnosis.json, api-login-proof.json, browser-login-proof.json, runtime-ready.json, port-ownership-proof.json, post-check.json. No password/hash/token captured in these artifacts.
