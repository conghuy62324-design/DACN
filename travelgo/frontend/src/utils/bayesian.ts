/**
 * Bayesian Average Rating Formula:
 * S = (v / (v + m)) * R + (m / (v + m)) * C
 *
 * S: Adjusted ranking score
 * R: Average rating of item (1..5)
 * v: Total number of reviews (votes)
 * m: Minimum review count threshold (prior weight, default = 10)
 * C: System-wide overall mean rating (prior belief, default = 4.20)
 */
export function calculateBayesianScore(
  v: number,
  R: number,
  m: number = 10,
  C: number = 4.2
): number {
  if (v <= 0) return C;
  const score = (v / (v + m)) * R + (m / (v + m)) * C;
  return Number(Math.min(5, Math.max(1, score)).toFixed(2));
}

export function getBayesianTrustLevel(v: number): {
  level: 'Cao' | 'Tin cậy' | 'Mới xuất hiện';
  color: string;
} {
  if (v >= 50) return { level: 'Cao', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
  if (v >= 10) return { level: 'Tin cậy', color: 'text-blue-600 bg-blue-50 border-blue-200' };
  return { level: 'Mới xuất hiện', color: 'text-amber-600 bg-amber-50 border-amber-200' };
}
