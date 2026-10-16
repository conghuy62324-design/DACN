import assert from 'node:assert/strict';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';
import { TourPlannerService, type PlannerInput } from '../services/tourPlannerService.js';

const ids = {
  attractionA: '11111111-1111-4111-8111-111111111111',
  attractionB: '22222222-2222-4222-8222-222222222222',
  attractionMandatory: '33333333-3333-4333-8333-333333333333',
  restaurant: '44444444-4444-4444-8444-444444444444',
  hotel: '55555555-5555-4555-8555-555555555555',
  suspended: '66666666-6666-4666-8666-666666666666',
  otherCity: '77777777-7777-4777-8777-777777777777',
  missing: '99999999-9999-4999-8999-999999999999',
};

const place = (id: string, name: string, category: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name,
  slug: name.toLowerCase().replaceAll(' ', '-'),
  category,
  summary: `${name} summary`,
  description: `${name} description`,
  city: 'Đà Nẵng',
  province: 'Đà Nẵng',
  address: 'Test address',
  latitude: 16.05,
  longitude: 108.2,
  priceFrom: 100_000,
  rating: 4.5,
  reviewCount: 20,
  bayesianRating: 4.4,
  heroImage: 'https://example.test/image.jpg',
  galleryImages: [],
  highlights: [],
  amenities: [],
  isFeatured: false,
  openingHours: {},
  contactInfo: {},
  status: 'APPROVED',
  ...overrides,
}) as any;

const catalog = [
  place(ids.attractionA, 'A attraction', 'attraction', { rating: 5, reviewCount: 500 }),
  place(ids.attractionB, 'B attraction', 'attraction', { rating: 4.9, reviewCount: 400 }),
  place(ids.attractionMandatory, 'Mandatory attraction', 'attraction', { rating: 1, reviewCount: 1 }),
  place(ids.restaurant, 'Mandatory restaurant', 'restaurant'),
  place(ids.hotel, 'Mandatory hotel', 'hotel'),
  place(ids.suspended, 'Suspended attraction', 'attraction', {
    businessId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    business: { status: 'SUSPENDED' },
  }),
  place(ids.otherCity, 'Other city attraction', 'attraction', { city: 'Hà Nội', province: 'Hà Nội' }),
];

const baseInput = (mandatoryPlaceIds?: string[]): PlannerInput => ({
  departureCity: 'Hà Nội',
  destinationCity: 'Đà Nẵng',
  startDate: '2027-03-01',
  endDate: '2027-03-01',
  adults: 1,
  children: 0,
  totalBudget: 3_000_000,
  transportation: 'car',
  preferences: [],
  pacing: 'balanced',
  mandatoryPlaceIds,
});

const scheduledIds = (plan: Awaited<ReturnType<typeof TourPlannerService.generateSmartItinerary>>) =>
  plan.days.flatMap((day) => day.activities.map((activity) => activity.placeId).filter(Boolean));

async function expectReject(input: PlannerInput, code: string): Promise<void> {
  await assert.rejects(
    () => TourPlannerService.generateSmartItinerary(input),
    (error: any) => error?.code === code,
  );
}

async function main() {
  RecommendationRepository.useLoaderForTests(async () => catalog);
  const passed: string[] = [];
  try {
    const valid = await TourPlannerService.generateSmartItinerary(baseInput([ids.attractionMandatory]));
    assert.equal(scheduledIds(valid).filter((id) => id === ids.attractionMandatory).length, 1);
    passed.push('valid mandatory attraction is scheduled exactly once');

    await expectReject(baseInput([ids.missing]), 'MANDATORY_PLACE_UNAVAILABLE');
    passed.push('nonexistent mandatory place is rejected');

    await expectReject(baseInput(['not-a-uuid']), 'INVALID_MANDATORY_PLACE_ID');
    passed.push('invalid mandatory Place ID format is rejected');

    await expectReject(baseInput(Array(11).fill(ids.attractionA)), 'MANDATORY_PLACE_LIMIT_EXCEEDED');
    passed.push('mandatory Place ID request count is bounded');

    await expectReject(baseInput([ids.suspended]), 'MANDATORY_PLACE_UNAVAILABLE');
    passed.push('ineligible mandatory place is rejected');

    const duplicate = await TourPlannerService.generateSmartItinerary(
      baseInput([ids.attractionMandatory, ids.attractionMandatory]),
    );
    assert.equal(scheduledIds(duplicate).filter((id) => id === ids.attractionMandatory).length, 1);
    passed.push('duplicate mandatory IDs are idempotently deduplicated');

    await expectReject(baseInput([ids.otherCity]), 'MANDATORY_PLACE_DESTINATION_MISMATCH');
    passed.push('wrong-city mandatory place is rejected');

    await expectReject(
      baseInput([ids.attractionA, ids.attractionB, ids.attractionMandatory]),
      'MANDATORY_PLACE_CAPACITY_EXCEEDED',
    );
    passed.push('mandatory places exceeding itinerary slots are rejected');

    const normal = await TourPlannerService.generateSmartItinerary(baseInput());
    assert.equal(normal.days.length, 1);
    assert.ok(normal.days[0].activities.length > 0);
    passed.push('planner without mandatoryPlaceIds remains functional');

    console.log(JSON.stringify({ result: 'PASS', checks: passed.length, passed }, null, 2));
  } finally {
    RecommendationRepository.resetLoader();
  }
}

main().catch((error) => {
  console.error('Tour planner mandatory-place tests failed:', error);
  process.exitCode = 1;
});
