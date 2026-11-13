# T11-B v2 ? frozen before first run

- P06: Generate must reject 422/NO_SIGHTSEEING_FOR_DESTINATION instead of a meals-only success
- Costs must not be capped by budget; same selected Place/group/units keeps the same price
- constraintViolations and overBudgetVND must be service/API fields; evaluator checks them independently
- Zero is a catalog price; missing/invalid price uses a budget-independent labeled planner assumption
- No silent cross-destination fallback in Generate; repository errors propagate

V1 scenarios, evaluator and historical results remain unchanged. V2 runs against the unmodified planner first (before-v2), then the corrected planner (after-v2). P16 stays NOT RUN in the in-memory evaluator; live DB persistence is reported separately. No user relevance or optimality claim.
