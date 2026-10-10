/**
 * GeoService - Hệ thống thông tin địa lý (GIS) cho HuGo Travel
 * Hỗ trợ tính khoảng cách Haversine, ước tính thời gian di chuyển
 * và nhóm cụm địa lý (Geographic Clustering) phục vụ sắp xếp lịch trình.
 */

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export class GeoService {
  private static readonly EARTH_RADIUS_KM = 6371; // Bán kính Trái Đất (km)

  /**
   * Tính khoảng cách đường chim bay giữa 2 điểm tọa độ theo công thức Haversine
   * Lưu ý: Đây là khoảng cách đường chim bay (aerial distance), không phải khoảng cách đường bộ thực tế.
   */
  public static calculateHaversineDistance(
    point1: Coordinates,
    point2: Coordinates
  ): number {
    const toRad = (angle: number) => (angle * Math.PI) / 180;

    const lat1 = toRad(point1.latitude);
    const lon1 = toRad(point1.longitude);
    const lat2 = toRad(point2.latitude);
    const lon2 = toRad(point2.longitude);

    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = this.EARTH_RADIUS_KM * c;

    return Number(distanceKm.toFixed(2));
  }

  /**
   * Ước tính thời gian di chuyển theo loại phương tiện dựa trên khoảng cách
   * @param distanceKm Khoảng cách (km)
   * @param mode Phương tiện ('car' | 'motorbike' | 'walking')
   * @returns Thời gian ước tính tính bằng phút
   */
  public static estimateTravelTimeMinutes(
    distanceKm: number,
    mode: 'car' | 'motorbike' | 'walking' = 'car'
  ): number {
    // Vận tốc trung bình trong đô thị / vùng du lịch Việt Nam
    let avgSpeedKmH = 30; // Ô tô di chuyển nội đô
    if (mode === 'motorbike') avgSpeedKmH = 35;
    if (mode === 'walking') avgSpeedKmH = 4.5;

    // Hệ số khúc khuỷu đường bộ thực tế so với đường chim bay (detour factor thông thường ~ 1.3 - 1.4)
    const detourFactor = 1.35;
    const actualRoadKm = distanceKm * detourFactor;

    const hours = actualRoadKm / avgSpeedKmH;
    const minutes = Math.ceil(hours * 60);

    return Math.max(5, minutes);
  }

  /**
   * Tìm điểm trung tâm (Centroid) của một tập hợp các tọa độ
   */
  public static calculateCentroid(points: Coordinates[]): Coordinates {
    if (points.length === 0) return { latitude: 16.0544, longitude: 108.2022 }; // Đà Nẵng fallback

    const sumLat = points.reduce((sum, p) => sum + p.latitude, 0);
    const sumLon = points.reduce((sum, p) => sum + p.longitude, 0);

    return {
      latitude: Number((sumLat / points.length).toFixed(6)),
      longitude: Number((sumLon / points.length).toFixed(6)),
    };
  }

  /**
   * Thuật toán Nearest Neighbor Clustering để phân cụm địa điểm theo ngày
   * Giúp hạn chế tối đa việc di chuyển qua lại giữa các khu vực cách xa nhau.
   */
  public static clusterPlacesIntoDays<T extends { latitude: number; longitude: number }>(
    items: T[],
    daysCount: number
  ): T[][] {
    if (items.length === 0) return Array.from({ length: daysCount }, () => []);
    if (daysCount <= 1) return [items];

    const clusters: T[][] = Array.from({ length: daysCount }, () => []);
    const remaining = [...items];

    // Sắp xếp items theo kinh độ / vĩ độ để tạo phân bố ban đầu
    remaining.sort((a, b) => a.latitude - b.latitude || a.longitude - b.longitude);

    const itemsPerDay = Math.ceil(items.length / daysCount);

    for (let day = 0; day < daysCount; day++) {
      if (remaining.length === 0) break;

      // Chọn điểm đầu tiên làm mỏ neo của ngày đó
      const anchor = remaining.shift()!;
      clusters[day].push(anchor);

      // Tìm các điểm gần anchor nhất để cho vào cùng ngày
      const slotsLeft = itemsPerDay - 1;
      for (let s = 0; s < slotsLeft && remaining.length > 0; s++) {
        let bestIdx = 0;
        let minDistance = Infinity;

        for (let i = 0; i < remaining.length; i++) {
          const dist = this.calculateHaversineDistance(anchor, remaining[i]);
          if (dist < minDistance) {
            minDistance = dist;
            bestIdx = i;
          }
        }

        clusters[day].push(remaining.splice(bestIdx, 1)[0]);
      }
    }

    // Nếu còn sót điểm nào, gán vào cụm có khoảng cách gần nhất
    while (remaining.length > 0) {
      const item = remaining.shift()!;
      let bestDay = 0;
      let minDayDist = Infinity;

      for (let d = 0; d < daysCount; d++) {
        if (clusters[d].length > 0) {
          const dist = this.calculateHaversineDistance(item, clusters[d][0]);
          if (dist < minDayDist) {
            minDayDist = dist;
            bestDay = d;
          }
        }
      }

      clusters[bestDay].push(item);
    }

    return clusters;
  }
}
