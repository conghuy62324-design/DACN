import { PlaceService } from './placeService.js';
import { RatingService } from './ratingService.js';

export interface TourPackage {
  id: string;
  title: string;
  slug: string;
  destinationCity: string;
  departureCity: string;
  durationDays: number;
  durationNights: number;
  category: 'beach' | 'culture' | 'nature' | 'resort' | 'adventure';
  summary: string;
  description: string;
  heroImage: string;
  galleryImages: string[];
  priceVND: number;
  rating: number;
  reviewCount: number;
  bayesianScore: number;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  itineraryDays: {
    day: number;
    title: string;
    description: string;
    places: string[];
    image?: string;
  }[];
  isTemplate: boolean;
  createdAt: string;
}

// Dữ liệu mẫu Tour du lịch phong phú tại các địa bàn trọng điểm Việt Nam
const MOCK_TOURS: TourPackage[] = [
  {
    id: 'tour-danang-3n2d',
    title: 'Đà Nẵng – Hội An – Bà Nà Hills: Hành Trình Di Sản Miền Trung',
    slug: 'da-nang-hoi-an-ba-na-hills-3n2d',
    destinationCity: 'Đà Nẵng',
    departureCity: 'Hà Nội / TP.HCM',
    durationDays: 3,
    durationNights: 2,
    category: 'culture',
    summary: 'Chiêm ngưỡng Cầu Vàng huyền thoại, ngắm hoàng hôn sông Hoài phố cổ Hội An và tắm biển Mỹ Khê trong xanh.',
    description: 'Chuyến hành trình 3 ngày 2 đêm được thiết kế hoàn hảo đưa bạn đi qua những địa danh biểu tượng của dải đất miền Trung: Núi Chúa Bà Nà Hills, Cầu Rồng phun lửa, phố cổ Hội An trăm năm rêu phong và bán đảo Sơn Trà hoang sơ.',
    heroImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    ],
    priceVND: 4250000,
    rating: 4.9,
    reviewCount: 178,
    bayesianScore: 4.86,
    inclusions: ['Khách sạn 4 sao gần biển', 'Vé cáp treo Bà Nà Hills + Buffet', 'Xe đưa đón đời mới', 'Bảo hiểm du lịch 100tr'],
    exclusions: ['Vé máy bay khứ hồi', 'Chi phí tiêu dùng cá nhân', 'Thuế VAT'],
    highlights: ['Cầu Vàng Bà Nà Hills', 'Thả hoa đăng sông Hoài', 'Biển Mỹ Khê', 'Mì Quảng & Cao lầu'],
    itineraryDays: [
      {
        day: 1,
        title: 'Ngày 1: Đà Nẵng - Bán đảo Sơn Trà - Biển Mỹ Khê',
        description: 'Đón tại sân bay Đà Nẵng, viếng Chùa Linh Ứng Bãi Bụt ngắm tượng Phật Bà 67m, tự do tắm biển Mỹ Khê.',
        places: ['Bán đảo Sơn Trà', 'Biển Mỹ Khê', 'Cầu Rồng'],
        image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
      },
      {
        day: 2,
        title: 'Ngày 2: Sun World Bà Nà Hills - Cầu Vàng - Fantasy Park',
        description: 'Đi tuyến cáp treo đạt kỷ lục thế giới lên đỉnh Bà Nà, check-in Cầu Vàng trong sương, tham quan Làng Pháp.',
        places: ['Cầu Vàng', 'Làng Pháp Bà Nà', 'Fantasy Park'],
        image: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
      },
      {
        day: 3,
        title: 'Ngày 3: Phố Cổ Hội An - Thả hoa đăng - Tiễn khách',
        description: 'Dạo bước phố cổ Hội An: Chùa Cầu, nhà cổ Phùng Hưng, đi thuyền trên sông Hoài trước khi ra sân bay.',
        places: ['Chùa Cầu Hội An', 'Sông Hoài', 'Chợ Hội An'],
        image: 'https://images.unsplash.com/photo-1578637387939-43c525550085?auto=format&fit=crop&w=600&q=80',
      },
    ],
    isTemplate: true,
    createdAt: '2026-10-01T08:00:00Z',
  },
  {
    id: 'tour-phuquoc-4n3d',
    title: 'Phú Quốc – Đảo Ngọc Thiên Đường: Cano 4 Đảo & Sunset Sanato',
    slug: 'phu-quoc-dao-ngoc-thien-duong-4n3d',
    destinationCity: 'Phú Quốc',
    departureCity: 'TP.HCM / Hà Nội',
    durationDays: 4,
    durationNights: 3,
    category: 'beach',
    summary: 'Lặn ngắm rạn san hô tự nhiên, check-in hoàng hôn Sunset Town và kỳ nghỉ sang trọng tại resort ven biển.',
    description: 'Thả mình vào làn nước xanh ngọc bích của quần đảo An Thới, thưởng thức bữa tiệc hải sản tươi sống trên đảo hoang sơ và khám phá thành phố không ngủ Grand World Phú Quốc.',
    heroImage: 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=800&q=80',
    ],
    priceVND: 6700000,
    rating: 4.8,
    reviewCount: 142,
    bayesianScore: 4.76,
    inclusions: ['Resort 4 sao view biển', 'Tour cano 4 đảo + Flycam', 'Cáp treo Hòn Thơm', 'Bữa ăn hải sản trọn gói'],
    exclusions: ['Vé máy bay khứ hồi', 'Chi phí cá nhân ngoài chương trình'],
    highlights: ['Cano tốc độ cao 4 đảo', 'Cáp treo vượt biển Hòn Thơm', 'Bãi Sao cát trắng', 'Sunset Town Địa Trung Hải'],
    itineraryDays: [
      { day: 1, title: 'Ngày 1: Đón sân bay - Sunset Town', description: 'Đón tại sân bay Phú Quốc, nhận phòng resort, ngắm hoàng hôn Sunset Town.', places: ['Thị trấn Hoàng Hôn'] },
      { day: 2, title: 'Ngày 2: Tour Cano 4 Đảo - Lặn ngắm san hô', description: 'Cano đưa quý khách khám phá hòn Móng Tay, Gầm Ghì và Mây Rút Trong.', places: ['Hòn Móng Tay', 'Hòn Gầm Ghì'] },
      { day: 3, title: 'Ngày 3: Grand World & Vinpearl Safari', description: 'Khám phá vườn thú bán hoang dã và show thực cảnh Tinh Hoa Việt Nam.', places: ['Safari', 'Grand World'] },
      { day: 4, title: 'Ngày 4: Bãi Sao - Mua đặc sản tiêu & ngọc trai - Tiễn bay', description: 'Tắm biển Bãi Sao trước khi ra sân bay về lại.', places: ['Bãi Sao'] },
    ],
    isTemplate: true,
    createdAt: '2026-10-02T09:00:00Z',
  },
  {
    id: 'tour-sapa-3n2d',
    title: 'Sapa – Chinh Phục Đỉnh Fansipan 3.143m & Bản Cát Cát Thơ Mộng',
    slug: 'sapa-chinh-phuc-dinh-fansipan-3n2d',
    destinationCity: 'Sapa',
    departureCity: 'Hà Nội',
    durationDays: 3,
    durationNights: 2,
    category: 'nature',
    summary: 'Săn mây nóc nhà Đông Dương, dạo bước ruộng bậc thang thung lũng Mường Hoa và thưởng thức thắng cố nóng hổi.',
    description: 'Hòa mình vào không gian hùng vĩ của dãy Hoàng Liên Sơn, khám phá nét văn hóa đậm đà bản sắc của đồng bào vùng cao Tây Bắc và trải nghiệm cáp treo Fansipan Legend 3 dây hiện đại nhất thế giới.',
    heroImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80',
    ],
    priceVND: 3200000,
    rating: 4.75,
    reviewCount: 96,
    bayesianScore: 4.69,
    inclusions: ['Xe Cabin Limousine khứ hồi HN-Sapa', 'Khách sạn view núi 4 sao', 'Vé cáp treo Fansipan', 'Các bữa ăn đặc sản Tây Bắc'],
    exclusions: ['Đồ uống cá nhân', 'Vé tàu hỏa leo núi Mường Hoa (tùy chọn)'],
    highlights: ['Đỉnh Fansipan 3.143m', 'Bản Cát Cát thác Tiên Sa', 'Đèo Ô Quy Hồ', 'Thưởng thức lẩu cá hồi'],
    itineraryDays: [
      { day: 1, title: 'Ngày 1: Hà Nội - Sapa - Bản Cát Cát', description: 'Xe đưa đến trung tâm Sapa. Chiều khám phá bản Cát Cát xinh đẹp.', places: ['Bản Cát Cát'] },
      { day: 2, title: 'Ngày 2: Chinh phục Nóc nhà Đông Dương Fansipan', description: 'Đi cáp treo lên đỉnh Fansipan 3.143m, chiều ngắm đèo Ô Quy Hồ.', places: ['Đỉnh Fansipan', 'Đèo Ô Quy Hồ'] },
      { day: 3, title: 'Ngày 3: Nhà thờ đá Sapa - Chợ Sapa - Về Hà Nội', description: 'Dạo nhà thờ đá cổ, mua sắm đặc sản mận, lê và lên xe về lại Hà Nội.', places: ['Nhà thờ đá Sapa'] },
    ],
    isTemplate: true,
    createdAt: '2026-10-04T10:00:00Z',
  },
  {
    id: 'tour-dalat-3n2d',
    title: 'Đà Lạt – Thành Phố Ngàn Hoa: Săn Mây Cầu Đất & Vườn Dâu Tây',
    slug: 'da-lat-thanh-pho-ngan-hoa-3n2d',
    destinationCity: 'Đà Lạt',
    departureCity: 'TP.HCM / Đà Nẵng',
    durationDays: 3,
    durationNights: 2,
    category: 'resort',
    summary: 'Tận hưởng khí hậu se lạnh trong lành, săn biển mây đồi chè Cầu Đất và check-in các quán cà phê ngắm hoàng hôn cực chill.',
    description: 'Hành trình lãng mạn tại cao nguyên Lâm Viên: Dạo quanh Hồ Xuân Hương, check-in dinh Bảo Đại, ngắm thung lũng đèn đêm Trại Mát và tự tay hái dâu tây chín mọng tại vườn.',
    heroImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80',
    ],
    priceVND: 2850000,
    rating: 4.88,
    reviewCount: 110,
    bayesianScore: 4.81,
    inclusions: ['Khách sạn phong cách vintage trung tâm', 'Xe đưa đón tham quan', 'Vé các điểm check-in', 'Bữa sáng buffet'],
    exclusions: ['Vé máy bay', 'Chi phí tiêu xài riêng'],
    highlights: ['Săn mây đồi chè Cầu Đất', 'Hồ Tuyền Lâm & Thiền Viện Trúc Lâm', 'Chợ đêm Đà Lạt', 'Vườn dâu công nghệ cao'],
    itineraryDays: [
      { day: 1, title: 'Ngày 1: Check-in Đà Lạt - Hồ Xuân Hương - Chợ đêm', description: 'Đến Đà Lạt nhận phòng, dạo quanh hồ Xuân Hương và khám phá chợ đêm.', places: ['Hồ Xuân Hương', 'Chợ đêm'] },
      { day: 2, title: 'Ngày 2: Săn mây Cầu Đất - Ga Đà Lạt - Dinh Bảo Đại', description: 'Đón bình minh săn mây Cầu Đất, tham quan kiến trúc Pháp cổ ga Đà Lạt.', places: ['Đồi chè Cầu Đất', 'Ga Đà Lạt'] },
      { day: 3, title: 'Ngày 3: Hồ Tuyền Lâm - Vườn dâu tây - Tiễn khách', description: 'Thăm Thiền viện Trúc Lâm, hái dâu tây trước khi kết thúc chuyến đi.', places: ['Hồ Tuyền Lâm', 'Vườn dâu'] },
    ],
    isTemplate: true,
    createdAt: '2026-10-06T11:00:00Z',
  },
];

let toursDb: TourPackage[] = [...MOCK_TOURS];

export class TourService {
  public static async getAllTours(params?: {
    city?: string;
    category?: string;
    maxPrice?: number;
    days?: number;
    search?: string;
    sortBy?: 'bayesian' | 'priceAsc' | 'priceDesc' | 'duration';
  }): Promise<TourPackage[]> {
    let result = [...toursDb];

    if (params?.city && params.city !== 'all') {
      const q = params.city.toLowerCase();
      result = result.filter(
        (t) => t.destinationCity.toLowerCase().includes(q) || t.departureCity.toLowerCase().includes(q)
      );
    }

    if (params?.category && params.category !== 'all') {
      result = result.filter((t) => t.category === params.category);
    }

    if (params?.maxPrice) {
      result = result.filter((t) => t.priceVND <= params.maxPrice!);
    }

    if (params?.days) {
      result = result.filter((t) => t.durationDays === params.days);
    }

    if (params?.search) {
      const q = params.search.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.summary.toLowerCase().includes(q) ||
          t.destinationCity.toLowerCase().includes(q)
      );
    }

    // Luôn tính toán lại Bayesian score
    result = result.map((t) => ({
      ...t,
      bayesianScore: RatingService.calculateBayesianAverage(t.reviewCount, t.rating),
    }));

    switch (params?.sortBy) {
      case 'bayesian':
        result.sort((a, b) => b.bayesianScore - a.bayesianScore);
        break;
      case 'priceAsc':
        result.sort((a, b) => a.priceVND - b.priceVND);
        break;
      case 'priceDesc':
        result.sort((a, b) => b.priceVND - a.priceVND);
        break;
      case 'duration':
        result.sort((a, b) => b.durationDays - a.durationDays);
        break;
      default:
        result.sort((a, b) => b.bayesianScore - a.bayesianScore);
    }

    return result;
  }

  public static async getTourByIdOrSlug(idOrSlug: string): Promise<TourPackage | null> {
    const found = toursDb.find((t) => t.id === idOrSlug || t.slug === idOrSlug);
    if (!found) return null;
    return {
      ...found,
      bayesianScore: RatingService.calculateBayesianAverage(found.reviewCount, found.rating),
    };
  }

  public static async createTour(data: Partial<TourPackage>): Promise<TourPackage> {
    const newTour: TourPackage = {
      id: `tour-${Date.now()}`,
      title: data.title || 'Tour du lịch mới',
      slug: (data.title || 'tour-moi').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '-'),
      destinationCity: data.destinationCity || 'Đà Nẵng',
      departureCity: data.departureCity || 'Hà Nội / TP.HCM',
      durationDays: data.durationDays || 3,
      durationNights: (data.durationDays || 3) > 1 ? (data.durationDays || 3) - 1 : 1,
      category: data.category || 'culture',
      summary: data.summary || '',
      description: data.description || '',
      heroImage: data.heroImage || 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=1200&q=80',
      galleryImages: data.galleryImages || [],
      priceVND: data.priceVND || 3500000,
      rating: 5.0,
      reviewCount: 1,
      bayesianScore: RatingService.calculateBayesianAverage(1, 5.0),
      inclusions: data.inclusions || ['Khách sạn tiêu chuẩn', 'Xe đưa đón', 'Bảo hiểm'],
      exclusions: data.exclusions || ['Chi phí cá nhân'],
      highlights: data.highlights || [],
      itineraryDays: data.itineraryDays || [],
      isTemplate: data.isTemplate ?? false,
      createdAt: new Date().toISOString(),
    };

    toursDb.unshift(newTour);
    return newTour;
  }

  public static async updateTour(id: string, data: Partial<TourPackage>): Promise<TourPackage | null> {
    const idx = toursDb.findIndex((t) => t.id === id);
    if (idx === -1) return null;
    toursDb[idx] = {
      ...toursDb[idx],
      ...data,
    };
    return toursDb[idx];
  }

  public static async deleteTour(id: string): Promise<boolean> {
    const idx = toursDb.findIndex((t) => t.id === id);
    if (idx !== -1) {
      toursDb.splice(idx, 1);
      return true;
    }
    return false;
  }
}

