import { PlaceData, serializePlace } from '../services/placeService.js';
import { PlaceRepository } from './placeRepository.js';

type ApprovedPlaceLoader = () => Promise<PlaceData[]>;

const databaseLoader: ApprovedPlaceLoader = async () => {
  const places: PlaceData[] = [];
  const limit = 100;
  let page = 1;
  let totalPages = 1;
  do {
    const result = await PlaceRepository.list({ page, limit }, { publicOnly: true });
    places.push(...result.items.map(serializePlace));
    totalPages = result.pages;
    page += 1;
  } while (page <= totalPages);
  return places;
};

export class RecommendationRepository {
  private static loader: ApprovedPlaceLoader = databaseLoader;
  static getApprovedPlaces() { return this.loader(); }
  static useLoaderForTests(loader: ApprovedPlaceLoader) { this.loader = loader; }
  static resetLoader() { this.loader = databaseLoader; }
}
