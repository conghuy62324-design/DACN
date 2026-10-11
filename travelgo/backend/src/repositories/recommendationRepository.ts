import { PlaceData, serializePlace } from '../services/placeService.js';
import { PlaceRepository } from './placeRepository.js';

type ApprovedPlaceLoader = () => Promise<PlaceData[]>;

const databaseLoader: ApprovedPlaceLoader = async () => {
  const result = await PlaceRepository.list({ page: 1, limit: 100 }, { publicOnly: true });
  return result.items.map(serializePlace);
};

export class RecommendationRepository {
  private static loader: ApprovedPlaceLoader = databaseLoader;
  static getApprovedPlaces() { return this.loader(); }
  static useLoaderForTests(loader: ApprovedPlaceLoader) { this.loader = loader; }
  static resetLoader() { this.loader = databaseLoader; }
}
