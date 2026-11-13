/** T11-B v2 frozen synthetic scenarios. Evaluates production services; never connects to a DB. */
import { createHash } from 'node:crypto';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { RecommendationService, DEFAULT_RECOMMENDATION_WEIGHTS } from '../services/recommendationService.js';
import { RatingService } from '../services/ratingService.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { TourPlannerService } from '../services/tourPlannerService.js';

type Row = Record<string, any>;
type Result = { id: string; domain: string; status: 'PASS' | 'FAIL' | 'NOT RUN'; expected: Row; actual: Row; checks: Row; failures: string[] };

const hashFile = async (path: string) => createHash('sha256').update(await readFile(path)).digest('hex');
const idOf = (item: any) => String(item.place?.id ?? item.id);
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const round6 = (value: number) => Number(value.toFixed(6));

function syntheticCatalog(spec: Row): any[] {
  return spec.catalog.map((place: Row) => ({
    slug: String(place.name).toLowerCase().replaceAll(' ', '-'), description: place.summary,
    address: 'SYNTHETIC_SCENARIO_ONLY', heroImage: '', highlights: [], amenities: [],
    galleryImages: [], openingHours: {}, contactInfo: {}, bayesianRating: 0,
    isFeatured: false, ...place,
  }));
}

function check(row: Result, name: string, condition: boolean, detail?: unknown): void {
  row.checks[name] = { pass: condition, ...(detail === undefined ? {} : { detail }) };
  if (!condition) row.failures.push(name);
}

function recommendation(spec: Row, catalog: any[], results: Map<string, Result>): Result[] {
  const output: Result[] = [];
  for (const scenario of spec.recommendationScenarios as Row[]) {
    const input = { ...spec.recommendationBase, ...scenario.overrides, filters: scenario.overrides.filters ?? spec.recommendationBase.filters };
    const row: Result = { id: scenario.id, domain: 'recommendation', status: 'FAIL', expected: scenario.expected, actual: {}, checks: {}, failures: [] };
    const batch = RecommendationService.recommendForRequest(catalog, input as any);
    const full = batch.items;
    // Same eligible and filtered candidate set as the heuristic; use the actual source formula.
    const bayesian = full.map((item) => ({ id: idOf(item), score: RatingService.calculateBayesianAverage(item.place.reviewCount, item.place.rating) }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id, 'en'));
    const ids = full.map(idOf);
    const top = full.slice(0, spec.topK).map((item) => ({ id: idOf(item), score: item.score }));
    const baselineTop = bayesian.slice(0, spec.topK);
    const violations: string[] = [];
    for (const item of full) {
      const source = catalog.find((place) => place.id === idOf(item));
      if (!source || (source.status && source.status !== 'APPROVED') || (source.businessId && source.business?.status !== 'ACTIVE')) violations.push(`INELIGIBLE:${idOf(item)}`);
      const parts = item.breakdown;
      const reconstructed = round6(parts.qualityScore * DEFAULT_RECOMMENDATION_WEIGHTS.quality + parts.preferenceScore * DEFAULT_RECOMMENDATION_WEIGHTS.preference + parts.budgetScore * DEFAULT_RECOMMENDATION_WEIGHTS.budget + parts.distanceScore * DEFAULT_RECOMMENDATION_WEIGHTS.distance);
      if (Math.abs(reconstructed - item.score) > 0.000001) violations.push(`SCORE_BREAKDOWN:${idOf(item)}`);
      const hasPreferenceReason = item.explanation.includes('Phù hợp sở thích');
      if (hasPreferenceReason !== (item.matchedPreferences.length > 0)) violations.push(`PREFERENCE_EXPLANATION:${idOf(item)}`);
      const hasBudgetReason = item.explanation.includes('Chi phí ước tính theo giá từ');
      if (hasBudgetReason !== (input.dailyBudgetPerPerson > 0 && parts.budgetScore >= 0.85)) violations.push(`BUDGET_EXPLANATION:${idOf(item)}`);
      const bayes = RatingService.calculateBayesianAverage(item.place.reviewCount, item.place.rating);
      const hasRatingReason = item.explanation.includes('Đánh giá Bayesian') || item.explanation.includes('cộng đồng đánh giá tốt');
      if (hasRatingReason !== (item.place.reviewCount > 0 && bayes >= 4.4)) violations.push(`RATING_EXPLANATION:${idOf(item)}`);
    }
    row.actual = {
      input, candidateCount: batch.rankingContext.candidateCount, candidateIds: ids,
      distanceBasis: batch.rankingContext.distanceBasis, fallback: batch.fallback,
      heuristicTopK: top, bayesianOnlyTopK: baselineTop,
      topKChangedVsBayesian: !same(top.map((x) => x.id), baselineTop.map((x) => x.id)),
      scoresById: Object.fromEntries(full.map((item) => [idOf(item), { score: item.score, breakdown: item.breakdown, matchedPreferences: item.matchedPreferences, explanation: item.explanation, bayesian: RatingService.calculateBayesianAverage(item.place.reviewCount, item.place.rating) }])),
      constraintViolations: violations,
      precisionAtK: 'NOT EVALUATED', ndcgAtK: 'NOT EVALUATED', relevanceReason: 'No independent real relevance labels',
    };
    check(row, 'candidateCount', batch.rankingContext.candidateCount === scenario.expected.candidateCount);
    check(row, 'fallback', batch.fallback.applied === scenario.expected.fallback);
    if (scenario.expected.fallbackCode) check(row, 'fallbackCode', batch.fallback.code === scenario.expected.fallbackCode);
    if (scenario.expected.candidateIds) check(row, 'candidateIds', same([...ids].sort(), [...scenario.expected.candidateIds].sort()));
    if (scenario.expected.excludedIds) check(row, 'excludedIds', scenario.expected.excludedIds.every((id: string) => !ids.includes(id)));
    if (scenario.expected.distanceBasis) check(row, 'distanceBasis', batch.rankingContext.distanceBasis === scenario.expected.distanceBasis);
    if (scenario.expected.topKEmpty) check(row, 'topKEmpty', top.length === 0);
    if (scenario.expected.coldBayesianPrior !== undefined) check(row, 'coldBayesianPrior', full.length === 1 && bayesian[0].score === scenario.expected.coldBayesianPrior);
    check(row, 'noConstraintViolations', violations.length === 0, violations);
    if (scenario.compareTo) {
      const previous = results.get(scenario.compareTo);
      if (!previous || previous.status === 'NOT RUN') check(row, 'compareToAvailable', false);
      else if (scenario.expected.sameRankingAndScores) check(row, 'sameRankingAndScores', same(row.actual.heuristicTopK, previous.actual.heuristicTopK) && same(row.actual.scoresById, previous.actual.scoresById));
      else if (scenario.expected.scoreComponentChange) {
        const expected = scenario.expected.scoreComponentChange;
        const a = row.actual.scoresById[expected.placeId]?.breakdown?.[expected.component];
        const b = previous.actual.scoresById[expected.placeId]?.breakdown?.[expected.component];
        check(row, 'scoreComponentChange', typeof a === 'number' && typeof b === 'number' && (expected.direction === 'increase' ? a > b : a < b), { before: b, after: a });
      }
    }
    row.status = row.failures.length ? 'FAIL' : 'PASS';
    results.set(row.id, row);
    output.push(row);
  }
  return output;
}

function independentDistanceKm(a: any, b: any): number {
  const rad = (degrees: number) => degrees * Math.PI / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return Number((6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))).toFixed(2));
}

function plannerActual(plan: any, input: Row): Row {
  const days = plan.days.map((day: any) => ({
    date: day.date, lodgingNights: day.lodgingNights, lodgingEstimatedCostVND: day.lodgingEstimatedCostVND,
    dayEstimatedCostVND: day.dayEstimatedCostVND,
    activities: day.activities.map((a: any) => ({ id: a.id, placeId: a.placeId ?? null, category: a.category, timeSlot: a.timeSlot, cost: a.estimatedCostVND, aerialDistanceToNextKm: a.aerialDistanceToNextKm ?? null, estimatedTransitMinutes: a.estimatedTransitMinutes ?? null })),
  }));
  const violations: string[] = [];
  if (plan.totalEstimatedCostVND > plan.totalBudgetUserVND) violations.push('BUDGET_EXCEEDED');
  if (days.every((day: any) => day.activities.every((a: any) => a.category !== 'sightseeing'))) violations.push('NO_SIGHTSEEING_FOR_DESTINATION');
  if (days.some((day: any) => day.activities.filter((a: any) => a.category === 'sightseeing').length > 2)) violations.push('SIGHTSEEING_CAPACITY_EXCEEDED');
  return {
    daysCount: plan.daysCount, nightsCount: plan.nightsCount, costBasis: plan.costBasis,
    transportation: plan.transportation, pacing: plan.pacing, adults: plan.adults, children: plan.children,
    totalBudgetUserVND: plan.totalBudgetUserVND, totalEstimatedCostVND: plan.totalEstimatedCostVND,
    costDifferenceVND: plan.costDifferenceVND, budgetStatus: plan.budgetStatus,
    lodgingTotal: days.reduce((sum: number, day: any) => sum + day.lodgingEstimatedCostVND, 0),
    selectedPlaceIds: plan.selectedPlaceIds, days, constraintViolations: plan.constraintViolations, evaluatorConstraintViolations: violations,
    overBudgetVND: plan.overBudgetVND, rawServiceResponse: plan,
    etaModel: 'Haversine aerial km rounded to 0.01; ceil(distance*1.35/speed*60), minimum 5 minutes; speed car=30, motorbike=35 km/h',
  };
}

async function planner(spec: Row, catalog: any[], results: Map<string, Result>, dbEvidence?: Row): Promise<Result[]> {
  const output: Result[] = [];
  for (const scenario of spec.plannerScenarios as Row[]) {
    const row: Result = { id: scenario.id, domain: 'planner', status: 'FAIL', expected: scenario.expected, actual: {}, checks: {}, failures: [] };
    if (scenario.kind === 'postgres_regression') {
      if (!dbEvidence) {
        row.status = 'NOT RUN';
        row.actual = { reason: 'Requires exact travelgo_ai_m0_test guard/sentinel/schema preflight and owned-fixture PostgreSQL regression; in-memory harness does not claim persistence' };
      } else {
        row.actual = { database: dbEvidence.database, preflight: dbEvidence.preflight,
          regression: dbEvidence.regression, fingerprint: dbEvidence.fingerprintVerification };
        check(row, 'exactGuardedTestDatabase', dbEvidence.database === 'travelgo_ai_m0_test' && dbEvidence.preflight?.guardAndSentinelVerified === true && dbEvidence.preflight?.exitCode === 0 && dbEvidence.preflight?.result === 'PASS');
        check(row, 'editSaveReopenRegression', dbEvidence.regression?.exitCode === 0 && dbEvidence.regression?.result === 'PASS' && dbEvidence.regression?.checks === 11);
        check(row, 'existingDataFingerprintUnchanged', dbEvidence.fingerprintVerification?.same === true && dbEvidence.fingerprintVerification?.tables === 25 && dbEvidence.fingerprintCompareExitCode === 0);
        row.status = row.failures.length ? 'FAIL' : 'PASS';
      }
      results.set(row.id, row); output.push(row); continue;
    }
    const input = { ...spec.plannerBase, ...scenario.overrides };
    let candidates = scenario.catalogVariant === 'empty' ? [] : catalog.filter((place) => scenario.catalogVariant === 'noHotel' ? place.category !== 'hotel' : scenario.catalogVariant === 'noRestaurant' ? place.category !== 'restaurant' : true);
    if (scenario.catalogVariant === 'zero') candidates = candidates.map((p) => ({ ...p, priceFrom: 0 }));
    if (scenario.catalogVariant === 'missing') candidates = candidates.map((p) => ({ ...p, priceFrom: null }));
    if (scenario.catalogVariant === 'otherProvince') candidates = candidates.filter((p) => p.city === 'H? N?i');
    if (scenario.catalogVariant === 'blankLocation') candidates = candidates.map((p) => ({ ...p, city: '', province: '' }));
    RecommendationRepository.useLoaderForTests(async () => {
      if (scenario.catalogVariant === 'failure') throw Object.assign(new Error('Synthetic repository failure'), { code: 'SYNTHETIC_DB_FAILURE' });
      return candidates;
    });
    try {
      let plan: any;
      let errorCode: string | null = null;
      let statusCode: number | null = null;
      try { plan = await TourPlannerService.generateSmartItinerary(input as any); }
      catch (error: any) { errorCode = error?.code ?? error?.message ?? 'UNKNOWN_ERROR'; statusCode = error?.statusCode ?? 500; }
      if (scenario.expected.errorCode) {
        row.actual = { input, errorCode, statusCode };
        check(row, 'expectedErrorCode', errorCode === scenario.expected.errorCode);
        if (scenario.expected.statusCode) check(row, 'httpStatus', statusCode === scenario.expected.statusCode);
      } else if (!plan) {
        row.actual = { input, errorCode, statusCode };
        check(row, 'unexpectedError', false, errorCode);
      } else {
        row.actual = { input, ...plannerActual(plan, input) };
        const a = row.actual;
        const e = scenario.expected;
        check(row, 'daysNights', a.daysCount === e.days && a.nightsCount === e.nights && a.days.length === e.days);
        check(row, 'apiConstraintViolations', Array.isArray(a.constraintViolations) && same(a.constraintViolations, a.evaluatorConstraintViolations));
        check(row, 'apiOverBudget', a.overBudgetVND === Math.max(0, a.totalEstimatedCostVND - a.totalBudgetUserVND));
        if (e.total !== undefined) check(row, 'expectedTotal', a.totalEstimatedCostVND === e.total);
        if (e.overBudgetVND !== undefined) check(row, 'expectedExcess', a.overBudgetVND === e.overBudgetVND);
        if (e.sourceText) check(row, 'labeledActivitySources', plan.days.flatMap((d: any) => d.activities).filter((v: any) => v.placeId && v.category !== 'hotel').every((v: any) => v.costSource?.includes(e.sourceText)));
        check(row, 'costBasisAndModes', a.costBasis === 'GROUP_VND_V1' && a.transportation === input.transportation && a.pacing === 'balanced');
        check(row, 'groupCostConservation', a.days.every((day: any) => day.dayEstimatedCostVND === day.activities.reduce((sum: number, item: any) => sum + item.cost, 0) + day.lodgingEstimatedCostVND)
          && a.totalEstimatedCostVND === a.days.reduce((sum: number, day: any) => sum + day.dayEstimatedCostVND, 0)
          && a.costDifferenceVND === a.totalBudgetUserVND - a.totalEstimatedCostVND);
        check(row, 'nightDistribution', a.days.every((day: any, index: number) => day.lodgingNights === (index < a.nightsCount ? 1 : 0)));
        check(row, 'selectedIds', same([...new Set(a.days.flatMap((day: any) => day.activities.map((item: any) => item.placeId).filter(Boolean)))], a.selectedPlaceIds));
        check(row, 'maxTwoSightseeing', a.days.every((day: any) => day.activities.filter((item: any) => item.category === 'sightseeing').length <= 2));
        const etaChecks: boolean[] = [];
        for (const day of a.days) for (let i = 0; i < day.activities.length - 1; i++) {
          const left = plan.days[a.days.indexOf(day)].activities[i];
          const right = plan.days[a.days.indexOf(day)].activities[i + 1];
          const distance = independentDistanceKm(left, right);
          const speed = input.transportation === 'motorbike' ? 35 : 30;
          const minutes = Math.max(5, Math.ceil(distance * 1.35 / speed * 60));
          etaChecks.push(Math.abs(left.aerialDistanceToNextKm - distance) <= 0.01 && left.estimatedTransitMinutes === minutes);
        }
        check(row, 'etaDistanceFormula', etaChecks.every(Boolean), { legs: etaChecks.length, failed: etaChecks.filter((x) => !x).length });
        if (e.budgetStatus) check(row, 'budgetStatus', a.budgetStatus === e.budgetStatus);
        if (e.lodgingTotal !== undefined) check(row, 'lodgingTotal', a.lodgingTotal === e.lodgingTotal);
        if (e.sightseeingTotal !== undefined) check(row, 'sightseeingTotal', a.days.reduce((sum: number, day: any) => sum + day.activities.filter((item: any) => item.category === 'sightseeing').length, 0) === e.sightseeingTotal);
        if (e.maxSightseeingPerDay !== undefined) check(row, 'expectedMaxSightseeing', a.days.every((day: any) => day.activities.filter((item: any) => item.category === 'sightseeing').length <= e.maxSightseeingPerDay));
        if (e.lunchEachDay !== undefined) check(row, 'lunchGroupCost', a.days.every((day: any) => day.activities.find((item: any) => item.timeSlot === 'lunch')?.cost === e.lunchEachDay));
        if (e.dinnerEachDay !== undefined) check(row, 'dinnerGroupCost', a.days.every((day: any) => day.activities.find((item: any) => item.timeSlot === 'dinner')?.cost === e.dinnerEachDay));
        if (e.hotelActivityCost !== undefined) check(row, 'hotelActivityCost', a.days.flatMap((day: any) => day.activities).filter((item: any) => item.category === 'hotel').every((item: any) => item.cost === e.hotelActivityCost));
        if (e.lunchWithoutPlace) check(row, 'lunchWithoutPlace', a.days.every((day: any) => day.activities.find((item: any) => item.timeSlot === 'lunch')?.placeId === null));
        if (e.mandatoryExactlyOnce) for (const id of e.mandatoryExactlyOnce) check(row, `mandatory:${id}`, a.days.flatMap((day: any) => day.activities).filter((item: any) => item.placeId === id).length === 1);
        if (e.constraintViolation) check(row, 'expectedConstraintViolation', a.constraintViolations?.includes(e.constraintViolation));
        else check(row, 'noUnexpectedConstraintViolation', a.constraintViolations?.length === 0, a.constraintViolations);
        if (scenario.compareTo) {
          const prior = results.get(scenario.compareTo);
          if (!prior || prior.status === 'NOT RUN') check(row, 'compareToAvailable', false);
          else {
            if (e.sameCostsAndActivities) check(row, 'sameCostsAndActivities', a.totalEstimatedCostVND === prior.actual.totalEstimatedCostVND && same(a.days.map((day: any) => day.activities.map((item: any) => [item.placeId, item.cost])), prior.actual.days.map((day: any) => day.activities.map((item: any) => [item.placeId, item.cost]))));
            if (e.someEtaLower) {
              const current = a.days.flatMap((day: any) => day.activities.map((item: any) => item.estimatedTransitMinutes).filter((value: any) => value !== null));
              const before = prior.actual.days.flatMap((day: any) => day.activities.map((item: any) => item.estimatedTransitMinutes).filter((value: any) => value !== null));
              check(row, 'someEtaLower', current.length === before.length && current.some((value: number, i: number) => value < before[i]) && current.every((value: number, i: number) => value <= before[i]), { car: before, motorbike: current });
            }
          }
        }
      }
    } finally { RecommendationRepository.resetLoader(); }
    row.status = row.failures.length ? 'FAIL' : 'PASS';
    results.set(row.id, row); output.push(row);
  }
  return output;
}

async function main(): Promise<void> {
  const specPath = resolve(process.argv[2] ?? 'src/evaluation/t11b_scenarios_v2.json');
  const outputDir = resolve(process.argv[3] ?? '../docs/evidence/t11b/after-v2');
  const dbEvidencePath = process.argv[4] ? resolve(process.argv[4]) : undefined;
  const spec = JSON.parse(await readFile(specPath, 'utf8')) as Row;
  if (spec.dataTier !== 'SYNTHETIC_SCENARIO_ONLY' || !String(spec.version).includes('FROZEN_BEFORE_RUN')) throw new Error('Scenario governance/version mismatch');
  let dbEvidence: Row | undefined;
  if (dbEvidencePath) {
    dbEvidence = JSON.parse(await readFile(dbEvidencePath, 'utf8'));
    const before = JSON.parse(await readFile(resolve(dirname(dbEvidencePath), dbEvidence!.fingerprintBefore), 'utf8'));
    const after = JSON.parse(await readFile(resolve(dirname(dbEvidencePath), dbEvidence!.fingerprintAfter), 'utf8'));
    const names = [...new Set([...Object.keys(before.tables), ...Object.keys(after.tables)])];
    dbEvidence!.fingerprintVerification = {
      same: before.database === 'travelgo_ai_m0_test' && after.database === before.database && names.every((name) => same(before.tables[name], after.tables[name])),
      tables: names.length,
    };
  }
  const catalog = syntheticCatalog(spec);
  const index = new Map<string, Result>();
  const rows = [...recommendation(spec, catalog, index), ...await planner(spec, catalog, index, dbEvidence)];
  const sourceFiles = [
    'src/services/recommendationService.ts', 'src/services/ratingService.ts',
    'src/repositories/recommendationRepository.ts', 'src/services/tourPlannerService.ts',
    'src/services/geoService.ts', 'src/utils/plannerValidation.ts',
    'src/services/tripSessionService.ts', 'src/utils/tripSnapshot.ts',
  ];
  const sourceSha256 = Object.fromEntries(await Promise.all(sourceFiles.map(async (path) => [path, await hashFile(path)])));
  const payload = {
    evaluation: 'T11B_PLANNER_FEASIBILITY', dataTier: spec.dataTier,
    scenarioVersion: spec.version, scenarioSha256: await hashFile(specPath),
    sourceSha256, environment: { runtime: process.version, database: 'NOT_USED_BY_IN_MEMORY_HARNESS' },
    criteria: { correctness: 'Frozen scenario assertions', sensitivity: 'Component/determinism comparisons only', userQuality: 'NOT EVALUATED; no independent relevance labels or user study', latency: 'NOT MEASURED' },
    summary: { total: rows.length, pass: rows.filter((x) => x.status === 'PASS').length, fail: rows.filter((x) => x.status === 'FAIL').length, notRun: rows.filter((x) => x.status === 'NOT RUN').length },
    results: rows,
  };
  await mkdir(outputDir, { recursive: true });
  const csvValue = (value: unknown) => `"${String(typeof value === 'string' ? value : JSON.stringify(value)).replaceAll('"', '""')}"`;
  const csv = ['id,domain,status,expected,actual,failures', ...rows.map((row) => [row.id, row.domain, row.status, row.expected, row.actual, row.failures].map(csvValue).join(','))].join('\n') + '\n';
  await writeFile(resolve(outputDir, 'scenario_results_v2.json'), JSON.stringify(payload, null, 2) + '\n', { flag: 'wx' });
  await writeFile(resolve(outputDir, 'scenario_results_v2.csv'), csv, { flag: 'wx' });
  console.log(JSON.stringify({ ...payload.summary, scenarioVersion: spec.version, scenarioSha256: payload.scenarioSha256, outputDir }));
  if (payload.summary.fail) process.exitCode = 1;
}

main().catch((error) => { console.error('T11 evaluation failed:', error); process.exitCode = 1; });
