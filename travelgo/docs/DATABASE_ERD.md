# THIẾT KẾ CƠ SỞ DỮ LIỆU & SƠ ĐỒ THỰC THỂ QUAN HỆ (DATABASE ERD)

**Dự án:** HuGo Travel System
**Hệ quản trị CSDL mục tiêu:** PostgreSQL 15+ kết hợp tiện ích mở rộng PostGIS

---

## 1. SƠ ĐỒ THỰC THỂ QUAN HỆ (MERMAID ERD)

```mermaid
erDiagram
    USERS ||--o{ BOOKINGS : places
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ BLOG_POSTS : authors
    USERS ||--o{ FAVORITES : saves
    USERS ||--o{ TRIP_SESSIONS : manages
    
    TRIP_SESSIONS ||--o{ TRIP_CHECKINS : tracks
    TRIP_SESSIONS ||--o| BLOG_POSTS : converts_to
    
    TOUR_PACKAGES ||--o{ TOUR_DAYS : contains
    TOUR_DAYS ||--o{ ITINERARY_ITEMS : specifies
    
    PLACES ||--o{ REVIEWS : receives
    PLACES ||--o{ BOOKINGS : booked_in
    PLACES ||--o{ FAVORITES : favorited_in
    PLACES ||--o{ ITINERARY_ITEMS : references
    PLACES ||--o{ TRIP_CHECKINS : checked_at

    USERS {
        uuid id PK
        string email UK
        string password_hash
        string full_name
        string phone
        string avatar_url
        string role "user | admin"
        timestamp created_at
        timestamp updated_at
    }

    PLACES {
        uuid id PK
        string name
        string slug UK
        string category "tour | attraction | hotel | restaurant"
        string city
        string province
        string address
        decimal latitude
        decimal longitude
        geometry geom_point "Point 4326 PostGIS"
        decimal price_from
        decimal raw_rating
        integer review_count
        decimal bayesian_rating
        text hero_image
        jsonb highlights
        jsonb amenities
        boolean is_featured
    }

    TOUR_PACKAGES {
        uuid id PK
        string title
        string slug UK
        string destination_city
        string departure_city
        integer duration_days
        integer duration_nights
        string category "beach | culture | nature | resort | adventure"
        decimal price_vnd
        decimal bayesian_score
        text summary
        text description
        text hero_image
        jsonb inclusions
        jsonb exclusions
        jsonb highlights
        boolean is_template
        timestamp created_at
    }

    TOUR_DAYS {
        uuid id PK
        uuid tour_id FK
        integer day_number
        string title
        text description
    }

    ITINERARY_ITEMS {
        uuid id PK
        uuid tour_day_id FK
        uuid place_id FK
        string time_slot "morning | lunch | afternoon | dinner | evening"
        string activity_title
        text description
        integer duration_minutes
        decimal estimated_cost_vnd
    }

    TRIP_SESSIONS {
        uuid id PK
        uuid user_id FK
        string title
        string destination_city
        string departure_city
        date start_date
        date end_date
        integer days_count
        decimal total_budget_user_vnd
        decimal total_estimated_cost_vnd
        decimal actual_spent_vnd
        string pacing "relaxed | balanced | packed"
        string status "upcoming | active | completed | cancelled"
        integer progress_percent
        jsonb itinerary_snapshot
        timestamp created_at
        timestamp updated_at
    }

    TRIP_CHECKINS {
        uuid id PK
        uuid trip_session_id FK
        uuid place_id FK
        string place_name
        timestamp checked_in_at
        decimal latitude
        decimal longitude
        boolean verified_via_geo
        text user_notes
        text photo_url
    }

    BLOG_POSTS {
        uuid id PK
        uuid author_id FK
        uuid source_trip_id FK
        string title
        string slug UK
        string destination_name
        text excerpt
        text content
        text cover_image
        string cost_estimate
        string trip_duration
        jsonb tags
        integer likes_count
        boolean is_featured
        timestamp created_at
    }

    BOOKINGS {
        uuid id PK
        string booking_code UK
        uuid user_id FK
        string service_type "tour | hotel | restaurant | ticket"
        uuid service_id
        string service_name
        string customer_name
        string customer_email
        string customer_phone
        date booking_date
        date return_date
        integer adults_count
        integer children_count
        decimal unit_price
        decimal total_amount
        string payment_status "unpaid | paid | refunded"
        string booking_status "pending | confirmed | cancelled | completed"
        timestamp created_at
    }

    REVIEWS {
        uuid id PK
        uuid user_id FK
        string target_type
        uuid target_id
        decimal rating "1.0 - 5.0"
        decimal rating_service
        decimal rating_price
        decimal rating_location
        decimal rating_experience
        text comment
        timestamp created_at
    }

    FAVORITES {
        uuid id PK
        uuid user_id FK
        uuid place_id FK
        timestamp created_at
    }
```

---

## 2. CHỈ MỤC & TỐI ƯU HÓA HIỆU NĂNG (INDEXES)
1. **Chỉ mục không gian PostGIS (Spatial Index - GiST):**
   ```sql
   CREATE INDEX idx_places_spatial_geom ON places USING GIST (geom_point);
   ```
   Giúp tìm kiếm các địa điểm, nhà hàng, khách sạn lân cận trong bán kính $R$ km với tốc độ microsecond bằng toán tử `ST_DWithin`.

2. **Chỉ mục tìm kiếm và lọc:**
   - `idx_places_city_category` trên `(city, category)`.
   - `idx_places_bayesian_rating` trên `(bayesian_rating DESC)`.
   - `idx_tours_destination_price` trên `(destination_city, price_vnd)`.
   - `idx_trips_user_status` trên `(user_id, status)`.
