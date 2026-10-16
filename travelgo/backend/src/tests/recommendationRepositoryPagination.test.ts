import assert from 'node:assert/strict';
import { PlaceRepository } from '../repositories/placeRepository.js';
import { RecommendationRepository } from '../repositories/recommendationRepository.js';

async function main(): Promise<void> {
  const originalList = PlaceRepository.list;
  const visitedPages: number[] = [];
  try {
    (PlaceRepository.list as any) = async ({ page, limit }: { page: number; limit: number }) => {
      visitedPages.push(page);
      const count = page === 1 ? 100 : 1;
      return {
        items: Array.from({ length: count }, (_, index) => ({
          id: `page-${page}-item-${index}`,
          priceFrom: 0,
          rating: 0,
          bayesianRating: 0,
          latitude: 0,
          longitude: 0,
        })),
        total: 101,
        page,
        limit,
        pages: 2,
      };
    };
    RecommendationRepository.resetLoader();
    const places = await RecommendationRepository.getApprovedPlaces();
    assert.equal(places.length, 101);
    assert.deepEqual(visitedPages, [1, 2]);
    console.log(JSON.stringify({ result: 'PASS', checks: 2, retrieved: places.length, pages: visitedPages }, null, 2));
  } finally {
    (PlaceRepository.list as any) = originalList;
    RecommendationRepository.resetLoader();
  }
}

main().catch((error) => {
  console.error('Recommendation repository pagination test failed:', error);
  process.exitCode = 1;
});
