# T11-B v3 - evaluator corrections recorded before first v3 run

V2 files/results remain historical and are not overwritten. No production change is justified by these oracle repairs.

- P21 sourceText: repair PowerShell pipe encoding corruption (use proper Unicode), same intended label.
- otherProvince variant: repair corrupted Ha Noi Unicode filter. V3 must actually supply the other-province candidate, rather than accidentally test an empty array.
- P22 zero-price group/two-day total: 1,485,000, not 1,080,000. There is one restaurant, scheduled on day 1 only. Day 2 has a missing-restaurant lunch assumption: 150,000 x 2.7 = 405,000. Dinner: 200,000 x 2.7 x 2 = 1,080,000. Attractions and hotel remain zero.
- P23 missing-price group/two-day: unchanged total 5,530,000 exceeds unchanged 3,000,000 budget. Explicitly expect over_budget/BUDGET_EXCEEDED. No input or observed total changed to force a pass.
- All remaining expectations and recommendation assertions unchanged from v2.
- Replay v3 against an archived pre-fix source snapshot before running final production code. Both result sets use the same frozen v3 spec/hash.
