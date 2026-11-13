/** Derived from current amounts, never stored as a decision about future edits. */
export function assessPlannerBudget(budget: number, estimate: number) {
  const costDifferenceVND = Math.round((budget - estimate) * 100) / 100;
  const overBudgetVND = Math.max(0, -costDifferenceVND);
  return {
    costDifferenceVND,
    overBudgetVND,
    budgetStatus: overBudgetVND > 0 ? 'over_budget' as const : 'within_budget' as const,
    constraintViolations: overBudgetVND > 0 ? ['BUDGET_EXCEEDED'] : [],
  };
}
