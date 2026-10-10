# TÀI LIỆU RESTFUL API HUGO TRAVEL (API DOCUMENTATION)

**Base URL:** `http://localhost:5000/api`
**Format:** `application/json; charset=utf-8`

---

## 1. HỆ THỐNG GỢI Ý TOUR & LẬP LỊCH TRÌNH (TOURS & PLANNER)

### 1.1. Lấy danh sách Tour du lịch
- **Endpoint:** `GET /tours`
- **Query Params:**
  - `city` (string, e.g. `Đà Nẵng`)
  - `category` (`beach | culture | nature | resort | adventure`)
  - `maxPrice` (number)
  - `durationDays` (number, e.g. `3`)
  - `sortBy` (`bayesian | priceAsc | priceDesc | duration`)
  - `search` (string)
- **Response:**
  ```json
  {
    "success": true,
    "count": 4,
    "data": [
      {
        "id": "tour-danang-3n2d",
        "title": "Đà Nẵng – Hội An – Bà Nà Hills: Hành Trình Di Sản Miền Trung",
        "destinationCity": "Đà Nẵng",
        "durationDays": 3,
        "durationNights": 2,
        "priceVND": 4250000,
        "rating": 4.9,
        "reviewCount": 178,
        "bayesianScore": 4.86,
        "itineraryDays": [...]
      }
    ]
  }
  ```

### 1.2. Lấy chi tiết một Tour
- **Endpoint:** `GET /tours/:id`
- **Response:**
  ```json
  {
    "success": true,
    "data": { ...tourDetails }
  }
  ```

### 1.3. Thuật toán tạo lịch trình thông minh (Planner Engine)
- **Endpoint:** `POST /tours/plan`
- **Request Body:**
  ```json
  {
    "destinationCity": "Đà Nẵng",
    "departureCity": "Hà Nội",
    "startDate": "2026-10-20",
    "endDate": "2026-10-22",
    "adults": 2,
    "children": 0,
    "totalBudget": 6000000,
    "transportation": "car",
    "preferences": ["am-thuc", "thien-nhien"],
    "pacing": "balanced"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Tạo lịch trình du lịch thông minh thành công",
    "data": {
      "id": "itinerary-1791621418033",
      "title": "Hành trình 3N2Đ khám phá Đà Nẵng",
      "daysCount": 3,
      "totalBudgetUserVND": 6000000,
      "totalEstimatedCostVND": 43800000,
      "costDifferenceVND": -37800000,
      "budgetStatus": "over_budget",
      "budgetAdvice": "Chi phí dự kiến vượt ngân sách khoảng 37.800.000đ...",
      "days": [
        {
          "dayNumber": 1,
          "date": "2026-10-20",
          "themeTitle": "Ngày 1: Khám phá văn hóa & danh thắng Đà Nẵng",
          "centroid": { "latitude": 16.009, "longitude": 108.234 },
          "activities": [
            {
              "id": "act-1-1",
              "placeId": "p2",
              "timeSlot": "morning",
              "title": "Bán đảo Sơn Trà & Chùa Linh Ứng",
              "category": "sightseeing",
              "durationMinutes": 120,
              "estimatedCostVND": 0,
              "latitude": 16.1022,
              "longitude": 108.2755,
              "aerialDistanceToNextKm": 6.8,
              "estimatedTransitMinutes": 18
            }
          ]
        }
      ],
      "hotelSuggestion": { ...hotelData }
    }
  }
  ```

---

## 2. QUẢN LÝ & THEO DÕI HÀNH TRÌNH (TRIP SESSIONS)

### 2.1. Lấy danh sách chuyến đi của người dùng
- **Endpoint:** `GET /trips?userId=...`

### 2.2. Lưu hành trình mới từ Tour Planner
- **Endpoint:** `POST /trips`
- **Request Body:** `{ "itinerary": { ... }, "userId": "...", "userName": "..." }`

### 2.3. Check-in địa điểm đã ghé thăm
- **Endpoint:** `POST /trips/:id/checkin`
- **Request Body:**
  ```json
  {
    "placeId": "p2",
    "placeName": "Bán đảo Sơn Trà & Chùa Linh Ứng",
    "geo": { "latitude": 16.1022, "longitude": 108.2755 },
    "notes": "Cảnh biển từ đỉnh Sơn Trà cực đẹp!"
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "message": "Check-in thành công tại Bán đảo Sơn Trà & Chùa Linh Ứng!",
    "trip": { ...updatedTrip, "progressPercent": 17 }
  }
  ```

### 2.4. Hoàn thành chuyến đi
- **Endpoint:** `POST /trips/:id/complete`

### 2.5. Chuyển chuyến đi thành bản nháp Blog
- **Endpoint:** `POST /trips/:id/convert-to-blog`
- **Response:**
  ```json
  {
    "success": true,
    "blogDraft": {
      "title": "Ký sự hành trình Đà Nẵng 3 ngày 2 đêm: Trải nghiệm thực tế...",
      "destination": "Đà Nẵng",
      "summary": "Chia sẻ kinh nghiệm thực tế chuyến đi Đà Nẵng...",
      "content": "## Ký sự trải nghiệm hành trình thực tế tại Đà Nẵng\n\n...",
      "visitedPlaces": ["Bán đảo Sơn Trà & Chùa Linh Ứng"],
      "totalCostVND": 2150000,
      "durationText": "3 ngày 2 đêm",
      "suggestedTags": ["Đà Nẵng", "Lịch trình chi tiết", "HuGo Travel"]
    }
  }
  ```

---

## 3. CÁC ENDPOINT KHÁC (PLACES, BOOKINGS, BLOGS, AUTH)
- `GET /places`: Danh sách địa điểm có xếp hạng Bayesian Average.
- `GET /places/:id`: Chi tiết địa điểm.
- `POST /bookings`: Đặt phòng, vé, tour.
- `GET /bookings`: Lịch sử booking của người dùng.
- `GET /blogs`: Danh sách bài viết cộng đồng.
- `POST /blogs`: Đăng bài blog mới.
- `POST /auth/login`: Đăng nhập hệ thống (admin@hugotravel.vn / password123).
- `POST /auth/register`: Đăng ký tài khoản người dùng.
