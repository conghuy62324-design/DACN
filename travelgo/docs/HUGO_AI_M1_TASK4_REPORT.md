# HuGo Intelligence 2.0 — M1 Task 4 Execution Report

Ngày thực hiện: 2026-10-12  
Phạm vi: Server-side Favorites/SAVE Source of Truth  
Kết luận: **COMPLETE**

## 1. Safety và database target

- Chỉ dùng PostgreSQL/PostGIS local `travelgo_ai_m0_test` tại `127.0.0.1:5432`.
- Container `travelgo_postgres`, image `postgis/postgis:15-3.4-alpine`, trạng thái `healthy`.
- Preflight trước thao tác ghi xác minh đồng thời:
  - database name: `travelgo_ai_m0_test`;
  - sentinel: `hugotravel-isolated-test-database-v1`;
  - `ALLOW_TEST_DB_WRITES=true`;
  - `TEST_DATABASE_NAME=travelgo_ai_m0_test`.
- File `.env` mặc định vẫn trỏ `travelgo_dev`; mọi lệnh kiểm thử/migration Task 4 đều override rõ target test trong chính process. Không có lệnh nào kết nối/ghi `travelgo_dev`, `travelgo_phase35_test` hoặc database khác.
- Không DROP, TRUNCATE, reset database; seed chỉ `findOrCreate` và xoay mật khẩu fixture đã biết trong transaction sau sentinel guard.
- Không sửa migration 01–07. Migration runner xác minh checksum và báo `SKIP` cho 01–07 trước khi apply duy nhất migration 08.
- Không push GitHub, deploy, publish hoặc upload Kaggle.

## 2. Audit Favorite/SAVE trước Task 4

Nguồn sự thật cũ nằm hoàn toàn ở `frontend/src/context/FavoritesContext.tsx`:

1. initializer đọc `localStorage.getItem('travelgo_favorites')`;
2. `useEffect` ghi toàn bộ mảng Place bằng `localStorage.setItem(...)`;
3. `toggleFavorite` quyết định add/remove từ React state/local cache;
4. thao tác phát trực tiếp client event `FAVORITE`/`UNFAVORITE` với `context.localFavoriteOnly=true`.

Các consumer của state cũ gồm Navbar, FavoritesPage, PlaceSidebar, FeaturedTours, HotelsPage, RestaurantsPage và PlaceDetailPage. Backend chưa có Favorite model/table/route/API. `/api/intelligence/events` chấp nhận outcome Favorite từ client nếu có marker local-only; do đó event chỉ mô tả thao tác local và không chứng minh trạng thái tài khoản.

Sau Task 4, không còn điểm đọc/ghi `travelgo_favorites`. Context chỉ gọi `localStorage.removeItem('travelgo_favorites')` để loại cache legacy; key này không tham gia quyết định trạng thái. Token đăng nhập vẫn dùng localStorage như trước và không thuộc phạm vi Favorite.

## 3. Migration 08 và schema

Migration additive mới:

| File | SHA-256 | Nội dung |
|---|---|---|
| `database/migrations/20261012_08_server_side_favorites.sql` | `87980fcdf39c7fbf7e6641bb0219f64c727605ea8f8127f2ad6f62d4107d75f8` | bảng `user_favorites`, unique ownership và indexes |

Schema `user_favorites`:

- `id UUID` primary key do server/PostgreSQL tạo;
- `user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE`;
- `place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE`;
- `created_at`, `updated_at` timezone-aware;
- unique constraint `user_favorites_user_place_unique (user_id, place_id)`;
- index theo `(user_id, created_at DESC)` và `place_id`.

Phạm vi item khớp luồng Favorite hiện hữu: entity frontend là `Place`, bao gồm attraction/hotel/restaurant và Place có category tour. Các entity riêng `tours`, `tickets`, `blogs` chưa có nút Favorite trong luồng đã audit và không được giả định thêm vào Task 4.

Migration chạy theo thứ tự:

1. dry-run liệt kê 01–08, không thay đổi DB;
2. apply: 01–07 `SKIP`, 08 `APPLIED`;
3. verifier cuối: 8 migrations, 23 application tables, 37 foreign keys, PostGIS 3.4.3 — **PASS**.

## 4. API contract

Tất cả endpoint bắt buộc Bearer access token. User identity chỉ lấy từ JWT; client không có tham số chọn user.

### `GET /api/favorites`

Trả toàn bộ Favorite của user hiện tại, sắp xếp mới nhất trước:

```json
{
  "success": true,
  "data": {
    "items": [{ "id": "uuid", "createdAt": "...", "updatedAt": "...", "place": {} }],
    "total": 1
  }
}
```

Đây cũng là contract truy xuất/export Favorite cá nhân của tài khoản; không có userId query/body và không thể đọc danh sách user khác.

### `POST /api/favorites/:placeId`

Body allowlist:

```json
{
  "contractVersion": "1.0",
  "sessionId": "client-session-id",
  "uiSurface": "place_detail",
  "requestId": "optional-server-recommendation-request-uuid"
}
```

- `201` + `changed=true` khi tạo mới;
- `200` + `changed=false`, telemetry reason `ALREADY_FAVORITE` khi đã tồn tại;
- insert dùng PostgreSQL `ON CONFLICT (user_id, place_id) DO NOTHING`, an toàn khi concurrent;
- chỉ Place `APPROVED` mới được thêm.

### `DELETE /api/favorites/:placeId`

Body cùng contract trên:

- `200` + `changed=true` khi xóa row thuộc user hiện tại;
- `200` + `changed=false`, reason `NOT_FAVORITE` nếu user hiện tại không có row;
- delete lock row theo ownership, concurrent delete chỉ một request thay đổi trạng thái.

Payload có field ngoài allowlist bị từ chối `SPOOFED_FAVORITE_FIELD`. Test đã gửi `userId`, `businessId`, `environment`, `itemType` và xác nhận không tạo row. Item type, environment, source, origin, personalization flag và event identity đều do server suy ra/tạo.

## 5. Đồng bộ frontend

- `FavoritesProvider` chờ AuthContext xác minh session rồi gọi `GET /api/favorites`.
- Khi logout/401 hoặc đổi user, state Favorite bị xóa ngay; response cũ được chặn bằng load-version để không rò state giữa hai user.
- Add/remove chỉ cập nhật UI từ response server. Khi request lỗi, context tải lại danh sách server thay vì giữ optimistic state không được xác minh.
- Có per-item pending guard để chặn double-click trên UI; API/database vẫn idempotent khi nhiều request thực sự đến đồng thời.
- Route `/favorites` yêu cầu authenticated CUSTOMER/PARTNER/SUPER_ADMIN.
- Favorite response dùng cùng `serializePlace` với Place API để chuẩn hóa PostgreSQL DECIMAL thành number.
- E2E cuối chứng minh: recommendation → save server → refresh detail vẫn `aria-pressed=true` → trang Favorites có item → logout state UI bị xóa → login lại item được tải lại từ PostgreSQL.

Không import tự động dữ liệu legacy localStorage vào tài khoản vì cache đó không có ownership đáng tin cậy và có thể thuộc phiên/user khác.

## 6. Telemetry và recommendation attribution

Client không còn được gửi `FAVORITE`/`UNFAVORITE` trực tiếp qua `/api/intelligence/events`; backend trả `USE_FAVORITES_API`. Outcome chỉ được tạo trong cùng transaction với thay đổi `user_favorites`:

- insert thật → đúng một server event `FAVORITE`;
- delete thật → đúng một server event `UNFAVORITE`;
- add/delete idempotent không đổi state → không có event;
- `origin=SERVER`, `source=favorite_state`;
- environment, user, item type, consent snapshot và retention do server gán.

Khi body có `requestId`, server yêu cầu tồn tại đồng thời:

- recommendation request thuộc đúng JWT user;
- đúng session và server environment;
- request chưa hết hạn;
- visible impression đã được server ghi cho đúng request/user/session/item/itemType và chưa hết hạn.

Thiếu impression, random requestId, dùng request của user khác hoặc item khác đều trả `INVALID_RECOMMENDATION_ATTRIBUTION`; transaction không tạo Favorite/outcome. Client không thể tự tạo impression. Không có `requestId` vẫn add/remove bình thường và outcome là unattributed.

## 7. Consent, privacy, retention và export

Favorite được phân tách thành hai lớp:

1. `user_favorites` là dữ liệu chức năng tài khoản, không phụ thuộc analytics/personalization consent, không có expiry tự động và tồn tại đến khi user bỏ Favorite, item bị xóa hoặc tài khoản bị xóa;
2. `user_events` là dữ liệu phân tích/AI, chỉ tạo khi analytics consent đang bật, có expiry 90 ngày và chỉ training-eligible khi personalization consent đang bật.

Chính sách đã kiểm chứng:

- analytics opt-out vẫn add/list/remove Favorite bình thường, tạo 0 event;
- analytics on + personalization off tạo event vận hành với `personalization_allowed=false`, không đủ điều kiện AI export;
- `deleteExistingEvents=true` xóa telemetry/recommendation data nhưng giữ nguyên functional Favorite;
- account deletion cascade xóa `user_favorites`; test xóa một test user và xác nhận 0 Favorite/0 event còn lại;
- `GET /api/favorites` trả đầy đủ Favorite thuộc tài khoản như dữ liệu cá nhân có thể truy xuất;
- AI exporter yêu cầu migration 08, chạy transaction read-only, không export trực tiếp bảng `user_favorites`;
- manifest ghi `functionalFavoritesExcluded=true`; chỉ outcome event còn hạn, đúng environment, có consent snapshot và consent hiện tại hợp lệ mới được xuất;
- event có requestId vẫn phải có visible-impression provenance theo rule Task 3.

Export cuối:

- target `production`: 0 event, 0 request, 0 candidate, 0 visible impression từ DB test;
- target `test`: 47 events, 12 requests, 12 candidates, 10 visible impressions trong dữ liệu tích lũy local test;
- trong `events.csv` test cuối có 3 `favorite_state` outcomes đủ consent hiện tại, gồm 2 attributed outcomes; functional Favorite rows không xuất thẳng;
- output chỉ lưu local dưới `ai/data/task4-final-*-export/`, không upload.

## 8. Kết quả kiểm thử thực tế

| Nhóm | Kết quả | Bằng chứng thực thi |
|---|---|---|
| Safety preflight | **PASS** | DB name, loopback host, exact write opt-in và sentinel đều hợp lệ; PostGIS container healthy |
| Migration dry-run/apply | **PASS** | 01–07 `SKIP`, migration 08 `APPLIED` |
| Schema verification | **PASS** | 8 migrations, 23 tables, 37 FKs, PostGIS 3.4.3 |
| Backend TypeScript production build | **PASS** | `npm run build` |
| Frontend production build | **PASS** | `tsc && vite build`, 1.727 modules |
| Favorite API/PostgreSQL | **PASS** | 59 checks trên PostgreSQL thật |
| Duplicate/idempotency | **PASS** | repeated add/delete không tạo thêm row/outcome |
| Concurrent requests | **PASS** | 6 add đồng thời: 1 row/1 SAVE; 6 delete đồng thời: 0 row/1 UNSAVE |
| Cross-user/identity spoofing | **PASS** | 401 anonymous; user khác nhận 0 row; spoof fields bị 400 |
| Consent/opt-out/privacy delete | **PASS** | opt-out Favorite hoạt động với 0 event; delete telemetry giữ Favorite |
| Recommendation attribution | **PASS** | verified visible impression cho 1 SAVE + 1 UNSAVE; fake/cross-user/unseen request bị 400 |
| Account deletion | **PASS** | FK cascade xóa functional Favorite của test user |
| Telemetry unit (Task 2) | **PASS** | 9 checks, gồm cấm client tự phát Favorite outcome |
| Task 2 HTTP/PostgreSQL regression | **PASS** | 30 checks |
| Task 3 regression | **PASS** | 6 unit + 39 HTTP/PostgreSQL checks |
| Full PostgreSQL integration | **PASS** | 14 groups |
| Algorithm/preferences regression | **PASS** | 14/14 |
| RBAC/unit regression | **PASS** | authentication, ownership, business isolation, booking invariants |
| Customer/Partner/Admin E2E | **PASS** | Playwright 3/3; Customer gồm refresh + logout/login Favorite sync |
| AI export test | **PASS** | consent-filtered; 3 eligible Favorite outcomes, 2 attributed |
| AI export production isolation | **PASS** | 0 test interaction row trong production target |
| `git diff --check` | **PASS** | exit 0, không có whitespace error; chỉ có line-ending notices hiện hữu |

Các HTTP 400/401/403/404/409 xuất hiện trong log là expected negative assertions. Lần E2E đầu phát hiện `rating` DECIMAL dạng string trên FavoritesPage; đã sửa bằng canonical Place serializer và lần chạy cuối PASS 3/3.

## 9. File Task 4 thay đổi

Database/backend:

- `database/migrations/20261012_08_server_side_favorites.sql`
- `backend/src/models/Favorite.ts`
- `backend/src/models/index.ts`
- `backend/src/services/favoriteService.ts`
- `backend/src/controllers/favoriteController.ts`
- `backend/src/routes/favoriteRoutes.ts`
- `backend/src/routes/api.ts`
- `backend/src/services/telemetryService.ts`
- `backend/src/scripts/exportAiDataset.ts`
- `backend/src/scripts/verifyDatabase.ts`
- `backend/src/tests/favorite.postgres.test.ts`
- `backend/src/tests/telemetry.test.ts`
- `backend/src/tests/intelligence.postgres.test.ts`
- `backend/package.json`

Frontend/E2E:

- `frontend/src/services/favoriteService.ts`
- `frontend/src/context/FavoritesContext.tsx`
- `frontend/src/services/telemetryService.ts`
- `frontend/src/router/AppRouter.tsx`
- `frontend/src/pages/FavoritesPage.tsx`
- `frontend/src/pages/PlaceDetailPage.tsx`
- `frontend/src/components/explore/PlaceSidebar.tsx`
- `frontend/e2e/roles.spec.ts`

Documentation:

- `docs/HUGO_AI_M1_TASK4_REPORT.md`

## 10. Kết luận

M1 Task 4 **COMPLETE**. PostgreSQL `user_favorites` là nguồn sự thật chính thức, đồng bộ qua refresh và phiên đăng nhập. Ownership và identity do backend quyết định; mutation concurrent/idempotent không tạo duplicate outcome. Favorite chức năng hoạt động độc lập consent, trong khi việc dùng outcome cho analytics/AI tuân thủ consent hiện tại, retention, environment isolation và visible-impression attribution của Task 3.

Không chuyển sang Task 5 và không huấn luyện mô hình AI.
