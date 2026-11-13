/**
 * Seed sightseeing attractions for the Tour Planner.
 *
 * Usage:
 *   npx tsx src/scripts/seedAttractions.ts
 *
 * Requires ALLOW_TEST_DB_WRITES=true and TEST_DATABASE_NAME matching DB_NAME
 * (same guards as the main seed script).
 */
import { sequelize, Place } from '../models/index.js';
import {
  assertDatabaseSentinel,
  assertTestDatabaseWriteOptIn,
} from '../utils/testDatabaseGuard.js';
import { RatingService } from '../services/ratingService.js';

interface AttractionFixture {
  slug: string;
  name: string;
  category: 'attraction' | 'tour';
  summary: string;
  description: string;
  city: string;
  province: string;
  address: string;
  latitude: number;
  longitude: number;
  priceFrom: number;
  rating: number;
  reviewCount: number;
  heroImage: string;
  highlights: string[];
  amenities: string[];
}

const attractions: AttractionFixture[] = [
  // ─── Đà Nẵng ───
  {
    slug: 'cau-rong-da-nang-seed',
    name: 'Cầu Rồng',
    category: 'attraction',
    summary: 'Biểu tượng kiến trúc hiện đại của Đà Nẵng, phun lửa và nước vào cuối tuần.',
    description: 'Cầu Rồng bắc qua sông Hàn, dài 666m, là điểm check-in nổi tiếng nhất Đà Nẵng với show phun lửa đặc sắc vào tối thứ 7 và Chủ nhật.',
    city: 'Đà Nẵng', province: 'Đà Nẵng', address: 'Sông Hàn, Hải Châu, Đà Nẵng',
    latitude: 16.0611, longitude: 108.2275,
    priceFrom: 0, rating: 4.7, reviewCount: 245,
    heroImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
    highlights: ['Phun lửa cuối tuần', 'View sông Hàn', 'Check-in đêm'],
    amenities: ['Đi bộ tự do'],
  },
  {
    slug: 'ba-na-hills-seed',
    name: 'Bà Nà Hills',
    category: 'attraction',
    summary: 'Khu du lịch trên đỉnh núi với Cầu Vàng nổi tiếng thế giới và cáp treo kỷ lục.',
    description: 'Bà Nà Hills nằm ở độ cao 1487m, sở hữu hệ thống cáp treo đạt nhiều kỷ lục thế giới và Cầu Vàng – biểu tượng du lịch Việt Nam.',
    city: 'Đà Nẵng', province: 'Đà Nẵng', address: 'Thôn An Sơn, Hòa Ninh, Hòa Vang, Đà Nẵng',
    latitude: 15.9977, longitude: 107.9875,
    priceFrom: 900000, rating: 4.8, reviewCount: 520,
    heroImage: 'https://images.unsplash.com/photo-1563811771046-ba984ff30900?auto=format&fit=crop&w=600&q=80',
    highlights: ['Cầu Vàng', 'Cáp treo kỷ lục', 'Làng Pháp'],
    amenities: ['Nhà hàng', 'Khu vui chơi', 'Wi-Fi'],
  },
  {
    slug: 'ngu-hanh-son-seed',
    name: 'Ngũ Hành Sơn',
    category: 'attraction',
    summary: 'Quần thể 5 ngọn núi đá vôi với hệ thống hang động và chùa cổ linh thiêng.',
    description: 'Ngũ Hành Sơn gồm 5 ngọn núi Kim, Mộc, Thủy, Hỏa, Thổ, nổi tiếng với các hang động tự nhiên, chùa chiền cổ kính và làng nghề đá Non Nước.',
    city: 'Đà Nẵng', province: 'Đà Nẵng', address: 'Hòa Hải, Ngũ Hành Sơn, Đà Nẵng',
    latitude: 16.0036, longitude: 108.2630,
    priceFrom: 40000, rating: 4.5, reviewCount: 180,
    heroImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=600&q=80',
    highlights: ['Hang Huyền Không', 'Chùa Linh Ứng', 'Panorama biển'],
    amenities: ['Thang máy', 'Bãi đỗ xe'],
  },
  {
    slug: 'bien-my-khe-seed',
    name: 'Bãi biển Mỹ Khê',
    category: 'attraction',
    summary: 'Một trong những bãi biển đẹp nhất hành tinh theo Forbes bình chọn.',
    description: 'Bãi biển Mỹ Khê trải dài khoảng 900m, cát trắng mịn, nước trong xanh, được tạp chí Forbes bình chọn là một trong 6 bãi biển quyến rũ nhất hành tinh.',
    city: 'Đà Nẵng', province: 'Đà Nẵng', address: 'Phước Mỹ, Sơn Trà, Đà Nẵng',
    latitude: 16.0598, longitude: 108.2468,
    priceFrom: 0, rating: 4.6, reviewCount: 310,
    heroImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    highlights: ['Bơi lội', 'Lướt sóng', 'Ngắm bình minh'],
    amenities: ['Ghế bãi biển', 'Quầy nước'],
  },
  {
    slug: 'son-tra-peninsula-seed',
    name: 'Bán đảo Sơn Trà',
    category: 'attraction',
    summary: 'Khu bảo tồn thiên nhiên với đa dạng sinh học và tượng Phật bà lớn nhất Đông Nam Á.',
    description: 'Bán đảo Sơn Trà là lá phổi xanh của Đà Nẵng, nơi cư trú của loài Voọc chà vá chân nâu quý hiếm và sở hữu tượng Phật Quan Thế Âm cao 67m.',
    city: 'Đà Nẵng', province: 'Đà Nẵng', address: 'Thọ Quang, Sơn Trà, Đà Nẵng',
    latitude: 16.1175, longitude: 108.2783,
    priceFrom: 0, rating: 4.7, reviewCount: 195,
    heroImage: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=600&q=80',
    highlights: ['Voọc chà vá chân nâu', 'Chùa Linh Ứng', 'Đỉnh Bàn Cờ'],
    amenities: ['Đường ô tô', 'Điểm ngắm cảnh'],
  },
  {
    slug: 'cau-tinh-yeu-da-nang-seed',
    name: 'Cầu Tình Yêu',
    category: 'attraction',
    summary: 'Cầu đi bộ lãng mạn bên bờ sông Hàn, điểm hẹn hò yêu thích của giới trẻ.',
    description: 'Cầu Tình Yêu nằm bên bờ Đông sông Hàn, trang trí bởi hàng nghìn ổ khóa tình yêu và hệ thống đèn LED rực rỡ về đêm.',
    city: 'Đà Nẵng', province: 'Đà Nẵng', address: 'Trần Hưng Đạo, Sơn Trà, Đà Nẵng',
    latitude: 16.0630, longitude: 108.2270,
    priceFrom: 0, rating: 4.3, reviewCount: 120,
    heroImage: 'https://images.unsplash.com/photo-1529686342540-1b43aec0df75?auto=format&fit=crop&w=600&q=80',
    highlights: ['Ổ khóa tình yêu', 'Đèn LED đêm', 'View Cầu Rồng'],
    amenities: ['Đi bộ tự do', 'Chụp ảnh đẹp'],
  },

  // ─── Đà Lạt ───
  {
    slug: 'ho-xuan-huong-seed',
    name: 'Hồ Xuân Hương',
    category: 'attraction',
    summary: 'Hồ nước ngọt giữa trung tâm thành phố Đà Lạt, biểu tượng của xứ ngàn hoa.',
    description: 'Hồ Xuân Hương nằm ở trung tâm Đà Lạt, bao quanh bởi rừng thông và vườn hoa, là nơi lý tưởng cho dạo bộ, đạp xe đạp và chèo thuyền thiên nga.',
    city: 'Đà Lạt', province: 'Lâm Đồng', address: 'Trần Quốc Toản, Phường 1, Đà Lạt',
    latitude: 11.9414, longitude: 108.4400,
    priceFrom: 0, rating: 4.5, reviewCount: 280,
    heroImage: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=600&q=80',
    highlights: ['Thiên nga', 'Đạp xe quanh hồ', 'Ngắm hoàng hôn'],
    amenities: ['Cho thuê xe đạp', 'Quán café'],
  },
  {
    slug: 'dinh-bao-dai-seed',
    name: 'Dinh Bảo Đại',
    category: 'attraction',
    summary: 'Dinh thự mùa hè của vua Bảo Đại, kiến trúc Art Deco giữa đồi thông.',
    description: 'Dinh III Bảo Đại xây dựng năm 1933, là nơi nghỉ mát của hoàng đế cuối cùng triều Nguyễn. Kiến trúc sang trọng kết hợp phong cách Pháp và Việt.',
    city: 'Đà Lạt', province: 'Lâm Đồng', address: 'Triệu Việt Vương, Phường 4, Đà Lạt',
    latitude: 11.9320, longitude: 108.4340,
    priceFrom: 50000, rating: 4.4, reviewCount: 165,
    heroImage: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=600&q=80',
    highlights: ['Kiến trúc Art Deco', 'Vườn thông', 'Lịch sử hoàng gia'],
    amenities: ['Hướng dẫn viên', 'Bãi đỗ xe'],
  },
  {
    slug: 'thung-lung-tinh-yeu-seed',
    name: 'Thung Lũng Tình Yêu',
    category: 'attraction',
    summary: 'Thung lũng thơ mộng với hồ Đa Thiện và vườn hoa đầy sắc màu.',
    description: 'Thung Lũng Tình Yêu nằm cách trung tâm Đà Lạt 5km, bao quanh hồ Đa Thiện, nổi tiếng với cảnh sắc thiên nhiên lãng mạn và các tiểu cảnh đặc sắc.',
    city: 'Đà Lạt', province: 'Lâm Đồng', address: 'Phú Hội, Đà Lạt',
    latitude: 11.9600, longitude: 108.4500,
    priceFrom: 100000, rating: 4.3, reviewCount: 190,
    heroImage: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=600&q=80',
    highlights: ['Hồ Đa Thiện', 'Vườn hoa', 'Chụp ảnh cưới'],
    amenities: ['Quán café', 'Bãi đỗ xe', 'Xe điện'],
  },
  {
    slug: 'lang-biang-seed',
    name: 'Đỉnh Langbiang',
    category: 'attraction',
    summary: 'Đỉnh núi cao nhất Đà Lạt với view panorama toàn thành phố và huyền thoại tình yêu.',
    description: 'Langbiang cao 2167m, nơi gắn liền với truyền thuyết tình yêu K\'Lang và H\'Biang. Từ đỉnh núi có thể ngắm toàn cảnh Đà Lạt và núi rừng Tây Nguyên.',
    city: 'Đà Lạt', province: 'Lâm Đồng', address: 'Lạc Dương, Lâm Đồng',
    latitude: 12.0500, longitude: 108.4300,
    priceFrom: 80000, rating: 4.6, reviewCount: 220,
    heroImage: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=600&q=80',
    highlights: ['Trekking', 'View 360°', 'Săn mây'],
    amenities: ['Xe jeep', 'Hướng dẫn viên'],
  },

  // ─── Phú Quốc ───
  {
    slug: 'vinwonders-phu-quoc-seed',
    name: 'VinWonders Phú Quốc',
    category: 'attraction',
    summary: 'Công viên giải trí lớn nhất Đông Nam Á với cáp treo vượt biển và thủy cung.',
    description: 'VinWonders Phú Quốc rộng hơn 50ha, bao gồm 6 khu giải trí chủ đề, cáp treo Hòn Thơm dài nhất thế giới và thủy cung quy mô quốc tế.',
    city: 'Phú Quốc', province: 'Kiên Giang', address: 'Bãi Dài, Gành Dầu, Phú Quốc',
    latitude: 10.3225, longitude: 103.8525,
    priceFrom: 750000, rating: 4.7, reviewCount: 430,
    heroImage: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=600&q=80',
    highlights: ['Cáp treo vượt biển', 'Thủy cung', 'Roller coaster'],
    amenities: ['Nhà hàng', 'Cửa hàng lưu niệm', 'Wi-Fi'],
  },
  {
    slug: 'bai-sao-phu-quoc-seed',
    name: 'Bãi Sao',
    category: 'attraction',
    summary: 'Bãi biển đẹp nhất Phú Quốc với cát trắng mịn và nước biển trong vắt.',
    description: 'Bãi Sao nằm ở phía nam đảo Phú Quốc, nổi tiếng với bãi cát trắng mịn như bột, nước biển xanh ngọc bích và không khí yên bình.',
    city: 'Phú Quốc', province: 'Kiên Giang', address: 'An Thới, Phú Quốc',
    latitude: 10.0350, longitude: 104.0230,
    priceFrom: 0, rating: 4.6, reviewCount: 350,
    heroImage: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&w=600&q=80',
    highlights: ['Bơi lội', 'Kayak', 'Ngắm hoàng hôn'],
    amenities: ['Ghế bãi biển', 'Quầy đồ uống'],
  },
  {
    slug: 'nha-tu-phu-quoc-seed',
    name: 'Nhà tù Phú Quốc',
    category: 'attraction',
    summary: 'Di tích lịch sử quốc gia, chứng tích về sự kiên cường của chiến sĩ cách mạng.',
    description: 'Nhà tù Phú Quốc là di tích cấp quốc gia đặc biệt, nơi giam giữ hơn 40.000 tù binh trong thời kỳ kháng chiến chống Mỹ.',
    city: 'Phú Quốc', province: 'Kiên Giang', address: 'An Thới, Phú Quốc',
    latitude: 10.0500, longitude: 104.0110,
    priceFrom: 0, rating: 4.5, reviewCount: 180,
    heroImage: 'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?auto=format&fit=crop&w=600&q=80',
    highlights: ['Di tích lịch sử', 'Bảo tàng', 'Giáo dục'],
    amenities: ['Hướng dẫn viên', 'Bãi đỗ xe'],
  },
  {
    slug: 'cho-dem-phu-quoc-seed',
    name: 'Chợ đêm Phú Quốc',
    category: 'attraction',
    summary: 'Chợ đêm sầm uất với hải sản tươi sống và đặc sản địa phương.',
    description: 'Chợ đêm Phú Quốc (Dinh Cậu Night Market) là thiên đường ẩm thực đường phố với hàng trăm quầy hàng hải sản tươi sống nướng tại chỗ.',
    city: 'Phú Quốc', province: 'Kiên Giang', address: 'Bạch Đằng, Dương Đông, Phú Quốc',
    latitude: 10.2155, longitude: 103.9600,
    priceFrom: 0, rating: 4.4, reviewCount: 290,
    heroImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80',
    highlights: ['Hải sản tươi sống', 'Mua sắm', 'Ẩm thực đường phố'],
    amenities: ['Bàn ghế ngoài trời', 'ATM gần'],
  },

  // ─── Sapa ───
  {
    slug: 'fansipan-seed',
    name: 'Đỉnh Fansipan',
    category: 'attraction',
    summary: 'Nóc nhà Đông Dương cao 3143m với cáp treo 3 dây hiện đại.',
    description: 'Fansipan là đỉnh núi cao nhất bán đảo Đông Dương, du khách có thể chinh phục bằng cáp treo hiện đại hoặc trekking 2 ngày 1 đêm.',
    city: 'Sapa', province: 'Lào Cai', address: 'Thị trấn Sa Pa, Lào Cai',
    latitude: 22.3033, longitude: 103.7750,
    priceFrom: 800000, rating: 4.8, reviewCount: 560,
    heroImage: 'https://images.unsplash.com/photo-1486870591958-9b9d0d1dda99?auto=format&fit=crop&w=600&q=80',
    highlights: ['Nóc nhà Đông Dương', 'Cáp treo', 'Trekking'],
    amenities: ['Nhà hàng trên đỉnh', 'Cáp treo'],
  },
  {
    slug: 'ban-cat-cat-seed',
    name: 'Bản Cát Cát',
    category: 'attraction',
    summary: 'Bản làng người H\'Mông cổ nhất Sapa với thác nước và ruộng bậc thang.',
    description: 'Bản Cát Cát nằm cách trung tâm Sa Pa 2km, là ngôi làng lâu đời của người H\'Mông với nghề dệt thổ cẩm truyền thống và thác Cát Cát hùng vĩ.',
    city: 'Sapa', province: 'Lào Cai', address: 'San Sả Hồ, Sa Pa, Lào Cai',
    latitude: 22.3220, longitude: 103.8280,
    priceFrom: 100000, rating: 4.5, reviewCount: 320,
    heroImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80',
    highlights: ['Ruộng bậc thang', 'Thác Cát Cát', 'Văn hóa H\'Mông'],
    amenities: ['Hướng dẫn viên', 'Quán nước'],
  },
  {
    slug: 'thung-lung-muong-hoa-seed',
    name: 'Thung lũng Mường Hoa',
    category: 'attraction',
    summary: 'Thung lũng ruộng bậc thang tuyệt đẹp và bãi đá cổ ngàn năm.',
    description: 'Thung lũng Mường Hoa nổi tiếng với ruộng bậc thang uốn lượn quanh các bản làng người Dao, H\'Mông và bãi đá cổ khắc hình bí ẩn tuổi đời hàng nghìn năm.',
    city: 'Sapa', province: 'Lào Cai', address: 'Hầu Thào, Sa Pa, Lào Cai',
    latitude: 22.2900, longitude: 103.8700,
    priceFrom: 0, rating: 4.7, reviewCount: 210,
    heroImage: 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=600&q=80',
    highlights: ['Ruộng bậc thang', 'Bãi đá cổ', 'Trekking'],
    amenities: ['Homestay', 'Hướng dẫn viên bản địa'],
  },
  {
    slug: 'ham-rong-sapa-seed',
    name: 'Núi Hàm Rồng',
    category: 'attraction',
    summary: 'Vườn hoa và đỉnh mây ngay trung tâm thị trấn Sa Pa.',
    description: 'Núi Hàm Rồng nằm ngay trung tâm Sa Pa với vườn hoa phong lan, vườn đào, sân mây và view toàn cảnh thung lũng Mường Hoa.',
    city: 'Sapa', province: 'Lào Cai', address: 'Thị trấn Sa Pa, Lào Cai',
    latitude: 22.3380, longitude: 103.8440,
    priceFrom: 70000, rating: 4.4, reviewCount: 180,
    heroImage: 'https://images.unsplash.com/photo-1465056836900-8f1e940b3fc8?auto=format&fit=crop&w=600&q=80',
    highlights: ['Vườn phong lan', 'Sân mây', 'View thung lũng'],
    amenities: ['Quán café', 'Bãi đỗ xe'],
  },

  // ─── Hà Nội ───
  {
    slug: 'ho-hoan-kiem-seed',
    name: 'Hồ Hoàn Kiếm & Đền Ngọc Sơn',
    category: 'attraction',
    summary: 'Trái tim của Hà Nội ngàn năm văn hiến với huyền thoại Rùa Vàng.',
    description: 'Hồ Hoàn Kiếm (Hồ Gươm) nằm ở trung tâm Hà Nội, nơi lưu giữ huyền thoại vua Lê Lợi trả gươm thần. Đền Ngọc Sơn trên đảo nhỏ giữa hồ là điểm tham quan hàng đầu.',
    city: 'Hà Nội', province: 'Hà Nội', address: 'Hoàn Kiếm, Hà Nội',
    latitude: 21.0288, longitude: 105.8525,
    priceFrom: 30000, rating: 4.8, reviewCount: 680,
    heroImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=600&q=80',
    highlights: ['Tháp Rùa', 'Đền Ngọc Sơn', 'Cầu Thê Húc'],
    amenities: ['Đi bộ quanh hồ', 'Phố đi bộ cuối tuần'],
  },
  {
    slug: 'van-mieu-quoc-tu-giam-seed',
    name: 'Văn Miếu – Quốc Tử Giám',
    category: 'attraction',
    summary: 'Trường đại học đầu tiên của Việt Nam, biểu tượng giáo dục và hiền tài.',
    description: 'Văn Miếu xây dựng năm 1070, thờ Khổng Tử và là trường đại học đầu tiên của Việt Nam. 82 bia Tiến sĩ được UNESCO công nhận là Di sản tư liệu thế giới.',
    city: 'Hà Nội', province: 'Hà Nội', address: 'Quốc Tử Giám, Đống Đa, Hà Nội',
    latitude: 21.0275, longitude: 105.8362,
    priceFrom: 30000, rating: 4.7, reviewCount: 420,
    heroImage: 'https://images.unsplash.com/photo-1557750255-c76072572da4?auto=format&fit=crop&w=600&q=80',
    highlights: ['82 bia Tiến sĩ', 'Kiến trúc cổ', 'UNESCO'],
    amenities: ['Hướng dẫn viên', 'Cửa hàng lưu niệm'],
  },
  {
    slug: 'lang-chu-tich-ho-chi-minh-seed',
    name: 'Lăng Chủ tịch Hồ Chí Minh',
    category: 'attraction',
    summary: 'Công trình tưởng niệm Chủ tịch Hồ Chí Minh, biểu tượng của đất nước.',
    description: 'Lăng Chủ tịch Hồ Chí Minh nằm giữa Quảng trường Ba Đình lịch sử, nơi an nghỉ của Bác Hồ. Khu di tích bao gồm Nhà sàn Bác Hồ và Bảo tàng Hồ Chí Minh.',
    city: 'Hà Nội', province: 'Hà Nội', address: 'Hùng Vương, Ba Đình, Hà Nội',
    latitude: 21.0367, longitude: 105.8350,
    priceFrom: 0, rating: 4.8, reviewCount: 530,
    heroImage: 'https://images.unsplash.com/photo-1583417319070-4a69db38a482?auto=format&fit=crop&w=600&q=80',
    highlights: ['Quảng trường Ba Đình', 'Nhà sàn Bác Hồ', 'Bảo tàng'],
    amenities: ['Miễn phí vào cửa', 'Trang phục lịch sự'],
  },
  {
    slug: 'pho-co-ha-noi-seed',
    name: 'Phố cổ Hà Nội',
    category: 'attraction',
    summary: 'Khu phố 36 phố phường cổ kính, tinh hoa ẩm thực và văn hóa Thủ đô.',
    description: 'Phố cổ Hà Nội (Khu 36 phố phường) là khu phố thương mại truyền thống hơn 1000 năm tuổi, nổi tiếng với kiến trúc nhà ống, ẩm thực đường phố và chợ đêm.',
    city: 'Hà Nội', province: 'Hà Nội', address: 'Hoàn Kiếm, Hà Nội',
    latitude: 21.0340, longitude: 105.8530,
    priceFrom: 0, rating: 4.6, reviewCount: 480,
    heroImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
    highlights: ['36 phố phường', 'Ẩm thực đường phố', 'Chợ đêm'],
    amenities: ['Đi bộ', 'Xích lô'],
  },

  // ─── Hội An ───
  {
    slug: 'pho-co-hoi-an-seed',
    name: 'Phố cổ Hội An',
    category: 'attraction',
    summary: 'Di sản thế giới UNESCO với kiến trúc cổ kính và đèn lồng đầy mê hoặc.',
    description: 'Phố cổ Hội An là Di sản Văn hóa Thế giới UNESCO, nổi tiếng với kiến trúc nhà cổ hàng trăm năm tuổi, đèn lồng rực rỡ và dòng sông Thu Bồn thơ mộng.',
    city: 'Hội An', province: 'Quảng Nam', address: 'Phường Minh An, Hội An, Quảng Nam',
    latitude: 15.8801, longitude: 108.3380,
    priceFrom: 120000, rating: 4.9, reviewCount: 720,
    heroImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
    highlights: ['UNESCO', 'Đèn lồng', 'Chùa Cầu'],
    amenities: ['Đi bộ', 'Thuyền sông Thu Bồn'],
  },
  {
    slug: 'chua-cau-hoi-an-seed',
    name: 'Chùa Cầu',
    category: 'attraction',
    summary: 'Biểu tượng của Hội An, cây cầu cổ mang kiến trúc Nhật Bản độc đáo.',
    description: 'Chùa Cầu (cầu Nhật Bản) được xây dựng vào thế kỷ 17, là biểu tượng nổi tiếng nhất của Hội An với kiến trúc mái ngói cong và tượng thờ bên trong.',
    city: 'Hội An', province: 'Quảng Nam', address: 'Nguyễn Thị Minh Khai, Phường Minh An, Hội An',
    latitude: 15.8776, longitude: 108.3370,
    priceFrom: 0, rating: 4.7, reviewCount: 380,
    heroImage: 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?auto=format&fit=crop&w=600&q=80',
    highlights: ['Kiến trúc Nhật Bản', 'Thế kỷ 17', 'Check-in hàng đầu'],
    amenities: ['Đi bộ'],
  },
  {
    slug: 'lang-rau-tra-que-seed',
    name: 'Làng rau Trà Quế',
    category: 'attraction',
    summary: 'Làng rau truyền thống 400 năm tuổi, trải nghiệm nông nghiệp sinh thái.',
    description: 'Làng rau Trà Quế nằm cách phố cổ Hội An 3km, nổi tiếng với các loại rau thơm truyền thống. Du khách có thể trải nghiệm trồng rau, cuốn bánh tráng.',
    city: 'Hội An', province: 'Quảng Nam', address: 'Cẩm Hà, Hội An, Quảng Nam',
    latitude: 15.8930, longitude: 108.3430,
    priceFrom: 50000, rating: 4.5, reviewCount: 160,
    heroImage: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?auto=format&fit=crop&w=600&q=80',
    highlights: ['Trải nghiệm nông nghiệp', 'Nấu ăn', 'Đạp xe'],
    amenities: ['Hướng dẫn viên', 'Xe đạp'],
  },
  {
    slug: 'an-bang-beach-seed',
    name: 'Bãi biển An Bàng',
    category: 'attraction',
    summary: 'Bãi biển yên bình cách phố cổ Hội An 4km, lý tưởng cho nghỉ dưỡng.',
    description: 'Bãi biển An Bàng nằm cách phố cổ Hội An khoảng 4km, được bình chọn là một trong 50 bãi biển đẹp nhất châu Á bởi CNN Travel.',
    city: 'Hội An', province: 'Quảng Nam', address: 'Cẩm An, Hội An, Quảng Nam',
    latitude: 15.9050, longitude: 108.3600,
    priceFrom: 0, rating: 4.6, reviewCount: 240,
    heroImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80',
    highlights: ['CNN Top 50', 'Yên bình', 'Hoàng hôn'],
    amenities: ['Ghế bãi biển', 'Nhà hàng ven biển'],
  },
];

async function seedAttractions() {
  assertTestDatabaseWriteOptIn('Attraction seed');
  await sequelize.authenticate();
  await assertDatabaseSentinel(sequelize, 'Attraction seed');

  let created = 0;
  let existed = 0;

  await sequelize.transaction(async (transaction) => {
    for (const attraction of attractions) {
      const bayesianRating = RatingService.calculateBayesianAverage(
        attraction.rating,
        attraction.reviewCount,
      );

      const [, wasCreated] = await Place.findOrCreate({
        where: { slug: attraction.slug },
        defaults: {
          name: attraction.name,
          slug: attraction.slug,
          category: attraction.category,
          summary: attraction.summary,
          description: attraction.description,
          city: attraction.city,
          province: attraction.province,
          address: attraction.address,
          latitude: attraction.latitude,
          longitude: attraction.longitude,
          priceFrom: attraction.priceFrom,
          rating: attraction.rating,
          reviewCount: attraction.reviewCount,
          bayesianRating,
          heroImage: attraction.heroImage,
          galleryImages: [],
          highlights: attraction.highlights,
          amenities: attraction.amenities,
          isFeatured: false,
          openingHours: {},
          contactInfo: {},
          status: 'APPROVED',
        } as any,
        transaction,
      });

      if (wasCreated) {
        created++;
        console.log(`  ✅ Created: ${attraction.name} (${attraction.city})`);
      } else {
        existed++;
        console.log(`  ⏭️  Exists:  ${attraction.name} (${attraction.city})`);
      }
    }
  });

  console.log(`\n🎉 Attraction seed complete: ${created} created, ${existed} already existed.`);
  await sequelize.close();
}

seedAttractions().catch(async (error) => {
  console.error('❌ Attraction seed failed:', error);
  await sequelize.close();
  process.exit(1);
});

