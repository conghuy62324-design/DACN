export const MIN_DAILY_BUDGET_VND = 50_000;
export const MAX_DAILY_BUDGET_VND = 100_000_000;

export interface BudgetValidation {
  valid: boolean;
  value: number;
  error?: string;
}

export function validateDailyBudget(raw: string): BudgetValidation {
  const normalized = raw.trim();
  if (!normalized) return { valid: true, value: 0 };
  if (!/^\d+$/.test(normalized)) {
    return { valid: false, value: 0, error: 'Ngân sách chỉ gồm chữ số, không nhập dấu chấm hoặc ký tự.' };
  }
  const value = Number(normalized);
  if (!Number.isSafeInteger(value)) {
    return { valid: false, value: 0, error: 'Ngân sách không hợp lệ.' };
  }
  if (value > 0 && value < MIN_DAILY_BUDGET_VND) {
    return { valid: false, value, error: 'Ngân sách tối thiểu là 50.000 ₫/ngày/người.' };
  }
  if (value > MAX_DAILY_BUDGET_VND) {
    return { valid: false, value, error: 'Ngân sách tối đa là 100.000.000 ₫/ngày/người.' };
  }
  return { valid: true, value };
}

export interface RecommendationFilterInput {
  category: string;
  city: string;
  search: string;
  minRating: number;
}

export function buildExploreRecommendationInput(input: RecommendationFilterInput & {
  preferences: string[];
  dailyBudgetPerPerson: number;
}) {
  return {
    uiSurface: 'explore_results' as const,
    filters: {
      category: input.category !== 'all' ? input.category : undefined,
      destinationCity: input.city !== 'all' ? input.city : undefined,
      search: input.search.trim() || undefined,
      minRating: input.minRating > 0 ? input.minRating : undefined,
    },
    explicitPreferences: [...input.preferences],
    dailyBudgetPerPerson: input.dailyBudgetPerPerson,
    limit: 20,
  };
}

const REASON_LABELS: Record<string, string> = {
  PREFERENCE_MATCH: 'Hợp sở thích',
  ESTIMATED_PRICE_FROM_BUDGET_FIT: 'Hợp ngân sách ước tính',
  HIGH_BAYESIAN_QUALITY: 'Bayesian uy tín',
};

export function recommendationReasonLabels(reasonCodes: string[]): string[] {
  return ['PREFERENCE_MATCH', 'ESTIMATED_PRICE_FROM_BUDGET_FIT', 'HIGH_BAYESIAN_QUALITY']
    .filter((code) => reasonCodes.includes(code))
    .map((code) => REASON_LABELS[code])
    .slice(0, 3);
}

export function recommendationFallbackMessage(fallback?: {
  applied: boolean;
  code: string | null;
  requestedDestination?: string;
}): string | undefined {
  if (!fallback?.applied || fallback.code !== 'NO_DESTINATION_MATCH') return undefined;
  const destination = fallback.requestedDestination ? ` tại ${fallback.requestedDestination}` : '';
  return `Chưa có địa điểm khớp chính xác${destination}. HuGo đang hiển thị lựa chọn phù hợp với các tiêu chí còn lại ở khu vực khác.`;
}
