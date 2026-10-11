# HuGo Travel – Nền Tảng Gợi Ý & Quản Lý Hành Trình Du Lịch Thông Minh

> Tài liệu nâng cấp RBAC, Admin/Partner workspace, migration và dữ liệu kiểm thử: [MULTI_ROLE_PHASE_1_2.md](./docs/MULTI_ROLE_PHASE_1_2.md)

**HuGo Travel** là nền tảng web du lịch thông minh toàn diện được xây dựng theo kiến trúc **MVC (Model – View – Controller) kết hợp Service Layer & RESTful API**. Dự án tích hợp các thuật toán nghiên cứu chuyên sâu về xếp hạng địa điểm (Bayesian Average Rating), gợi ý dựa trên nội dung (Content-Based Recommendation), hệ thống thông tin địa lý (GIS Haversine & Spatial Clustering) và công cụ quản lý hành trình thực địa theo thời gian thực kết nối cộng đồng Blog du lịch.

---

## 📚 TÀI LIỆU CHUYÊN SÂU DỰ ÁN
Hệ thống tài liệu kiến trúc và nghiên cứu được lưu trữ đầy đủ trong thư mục `docs/`:
1. [**SYSTEM_ARCHITECTURE.md**](./docs/SYSTEM_ARCHITECTURE.md) – Kiến trúc phân tầng MVC + Service Layer, phân quyền và luồng dữ liệu.
2. [**DATABASE_ERD.md**](./docs/DATABASE_ERD.md) – Sơ đồ thực thể quan hệ ERD, kiểu dữ liệu PostGIS Geometry và hệ thống chỉ mục.
3. [**RECOMMENDATION_ALGORITHM.md**](./docs/RECOMMENDATION_ALGORITHM.md) – Công thức toán học Bayesian Average, Haversine và thuật toán lập lịch trình Heuristic.
4. [**API_DOCUMENTATION.md**](./docs/API_DOCUMENTATION.md) – Đặc tả chi tiết toàn bộ các RESTful API endpoints.
5. [**TEST_REPORT.md**](./docs/TEST_REPORT.md) – Báo cáo kiểm thử tự động, unit tests và kịch bản nghiệm thu thực tế 20 bước.

---

## 🏛️ I. KIẾN TRÚC HỆ THỐNG (MVC + SERVICE LAYER)

```
       +-------------------------------------------------------------+
       |                        USER BROWSER                         |
       +-------------------------------------------------------------+
                                      │
                                      ▼
       +-------------------------------------------------------------+
       |                         VIEW LAYER                          |
       |  React 18 + TypeScript + Vite + Tailwind CSS + Lucide React |
       |  Leaflet Maps (OpenStreetMap) • Axios Client                |
       |  Pages: /tour-planner, /tours, /my-trips, /explore, /blog...|
       +-------------------------------------------------------------+
                                      │  (REST API calls: JSON)
                                      ▼
       +-------------------------------------------------------------+
       |                      CONTROLLER LAYER                       |
       |  Express.js Controllers: Tour, Trip, Place, Booking, Blog   |
       |  Tiếp nhận Request, Validate dữ liệu & phản hồi JSON chuẩn  |
       +-------------------------------------------------------------+
                                      │
                                      ▼
       +-------------------------------------------------------------+
       |                       SERVICE LAYER                         |
       |  - RatingService (Thuật toán Bayesian Average Rating)       |
       |  - GeoService (Haversine GIS, Aerial Distance & Clustering) |
       |  - RecommendationService (Content-Based Multi-criteria)     |
       |  - TourPlannerService (Heuristic Itinerary Scheduler)       |
       |  - TripSessionService (Real-time Tracking & Check-in)       |
       |  - TourService, PlaceService, BookingService, BlogService   |
       +-------------------------------------------------------------+
                                      │
                                      ▼
       +-------------------------------------------------------------+
       |                        MODEL LAYER                          |
       |  Sequelize ORM (Tour, TripSession, Place, Booking, Review)  |
       +-------------------------------------------------------------+
                                      │
                                      ▼
       +-------------------------------------------------------------+
       |                       DATABASE LAYER                        |
       |  PostgreSQL 15+ & PostGIS Extension (Geometry 4326 Index)   |
       +-------------------------------------------------------------+
```

---

## 🧠 II. HỆ THỐNG THUẬT TOÁN ĐỀ XUẤT THÔNG MINH

### 1. Bayesian Average Rating
Khắc phục hiện tượng thiên vị mẫu nhỏ (1 lượt đánh giá 5 sao đứng top 1) bằng cách kéo điểm về mức trung bình tiên nghiệm của hệ thống:
$$S = \left( \frac{v}{v + m} \right) \cdot R + \left( \frac{m}{v + m} \right) \cdot C$$
- $v$: Số lượt đánh giá thực tế.
- $R$: Điểm trung bình cộng thực tế của địa điểm ($1.0 \le R \le 5.0$).
- $m = 10$: Hệ số tự tin tối thiểu (Confidence threshold).
- $C = 4.20$: Điểm đánh giá trung bình cộng của toàn hệ thống (System prior mean).

### 2. GIS & Haversine Distance (Đường chim bay)
Tính toán khoảng cách không gian giữa các địa điểm du lịch:
$$a = \sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)$$
$$d = 2 \cdot R_{earth} \cdot \text{atan2}\left(\sqrt{a}, \sqrt{1 - a}\right)$$
*Minh bạch:* Hệ thống ghi rõ nhãn "khoảng cách đường chim bay theo Haversine" và áp dụng hệ số quanh co đường bộ ($1.35$) để ước tính thời gian di chuyển.

### 3. Content-Based Recommendation (Đa tiêu chí)
Điểm số tổng hợp được chuẩn hóa $[0, 1]$ từ 4 tiêu chí:
$$Score = 0.35 \times Quality + 0.25 \times Preference + 0.25 \times Budget + 0.15 \times Proximity$$
Mỗi gợi ý đều có lý do minh bạch (Explainability) hiển thị trực tiếp cho người dùng.

### 4. Thuật toán phân cụm & lập lịch trình Heuristic
- Phân cụm không gian Nearest Neighbor gom các địa điểm gần nhau vào cùng một ngày du lịch.
- Sắp xếp logic theo khung giờ: Sáng (Tham quan), Trưa (Ẩm thực đặc sản), Chiều (Biển/Nghỉ dưỡng/Văn hóa), Tối (Dạo phố/Ẩm thực đêm).
- Khuyến nghị khách sạn lưu trú phù hợp và cảnh báo chênh lệch ngân sách (`within_budget` vs `over_budget`).

---

## 🚀 III. CÁC TÍNH NĂNG ĐÃ HOÀN THIỆN & CHẠY THỰC TẾ

1. **HuGo Tour Planner (`/tour-planner`):**
   - Bộ lọc chuyên nghiệp: Điểm khởi hành, Điểm đến, Ngày đi - về, Số khách người lớn/trẻ em, Tổng ngân sách, Phương tiện, 8 nhóm sở thích cá nhân, Nhịp độ di chuyển.
   - Giao diện 2 cột: Cột trái quản lý timeline từng ngày (cho phép đổi thứ tự, xóa điểm tham quan); Cột phải tích hợp bản đồ Leaflet hiển thị marker phân biệt màu theo từng ngày và đường nối nét đứt.
   - Lưu hành trình trực tiếp vào tài khoản người dùng.
2. **Khám phá Tour du lịch (`/tours`, `/tours/:id`):**
   - Xem các tour du lịch mẫu tại Đà Nẵng, Phú Quốc, Sapa, Đà Lạt.
   - Hiển thị song song điểm gốc và điểm Bayesian Average.
   - Nút "Tùy biến lịch trình" sao chép toàn bộ dữ liệu tour mẫu sang Tour Planner để tự do chỉnh sửa.
3. **Quản lý & Theo dõi hành trình (`/my-trips`, `/my-trips/:id`):**
   - Danh sách chuyến đi theo trạng thái: Sắp tới, Đang diễn ra, Đã hoàn thành.
   - Thanh tiến độ phần trăm (%) hoàn thành chuyến đi.
   - Chức năng **Check-in thực địa**: Hỗ trợ ghi chú cá nhân và tích hợp Geolocation API định vị GPS (có thể từ chối quyền mà không ảnh hưởng chức năng).
   - Bản đồ chuyến đi với marker đổi màu xanh lá `✓` khi đã check-in.
4. **Cộng đồng Blog trải nghiệm (`/blog`, `/blog/:id`, `/blog/create`):**
   - **Chuyển chuyến đi thành Blog:** 1 click từ chuyến đi đã hoàn thành tự động tổng hợp các điểm check-in, chi phí thực tế và ghi chú thành bài viết bản nháp.
   - **Sao chép từ Blog:** Độc giả có thể sao chép lịch trình từ bài blog bất kỳ để tùy biến lại thành chuyến đi riêng.
5. **Hệ thống đặt dịch vụ Demo (Booking):**
   - Đặt vé, phòng, tour tức thì với tính toán chiết khấu trẻ em, xuất mã Booking ngẫu nhiên và lưu lịch sử tại `/bookings`.
6. **Xác thực & Quản trị Admin (`/login`, `/register`, `/admin`):**
   - Phân quyền `User` và `Admin`.
   - Dashboard thống kê dữ liệu.

---

## 🧪 IV. CHẠY KIỂM THỬ THUẬT TOÁN (UNIT TESTS)

Bộ kiểm thử thuật toán độc lập kiểm tra toàn bộ các trường hợp biên của Bayesian Rating, Haversine GIS và Tour Planner:

```bash
cd travelgo/backend
npx tsx src/tests/algorithm.test.ts
```

**Kết quả: 11/11 Test Cases PASSED (100%)**

---

## 🛠️ V. HƯỚNG DẪN KHỞI CHẠY DỰ ÁN

### 1. Khởi động Backend (Express API)
```bash
cd travelgo/backend
npm install
npm run dev
# Backend chạy tại: http://localhost:5000
# Kiểm tra Health: http://localhost:5000/api/health
```

### 2. Khởi động Frontend (React Vite)
```bash
cd travelgo/frontend
npm install
npm run dev
# Frontend chạy tại: http://localhost:3000
```

### 3. Tài khoản kiểm thử trên database local cô lập

Seed chỉ chạy khi `DB_HOST` là loopback, tên database có phân đoạn `test`/`dev`, và `SEED_PASSWORD` có ít nhất 12 ký tự. Seed không có mật khẩu mặc định và không in mật khẩu ra log.

```powershell
cd travelgo/backend
$env:NODE_ENV='test'
$env:DB_NAME='travelgo_test'
$env:SEED_PASSWORD='your-unique-test-password'
npm run build
node dist/scripts/migrate.js --apply
node dist/seed.js
```

Các email fixture gồm `admin@hugotravel.vn`, `customer.a@hugotravel.vn`, `customer.b@hugotravel.vn` và các tài khoản Partner được mô tả trong `docs/MULTI_ROLE_PHASE_3_5.md`. Tất cả dùng `SEED_PASSWORD` do người chạy cung cấp.
