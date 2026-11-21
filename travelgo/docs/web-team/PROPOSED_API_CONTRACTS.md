# PROPOSED API CONTRACTS — HuGo Travel WEB

> **ĐỀ XUẤT — chưa có backend thật, cần chủ dự án duyệt; CMS cần migration 19.**
>
> - Tài liệu này chỉ mô tả contract *đề xuất*, additive (không đổi ý nghĩa route hiện có). Chưa có route/bảng trong `backend/src`.
> - Mọi JSON ví dụ là dữ liệu **SYNTHETIC** (tên, email `@mock.local`, id giả). Không phải dữ liệu thật.
> - Đã được mô phỏng trong mock server cục bộ `D:\ĐỒ ÁN A\mock-api` (ngoài repo) để làm giao diện; mock **không** dùng để nghiệm thu.
> - Bảng mới đề xuất (migration 19, chờ duyệt): `cms_banners`, `cms_banner_revisions`, `cms_sections`, `cms_featured_hotels`, `site_settings`. Phần khác cần schema (có thể gộp 19 hoặc tách 20): `users.status` + `users.status_reason`, `notifications`, `review_replies`, `users.token_version` (thu hồi phiên khi đổi mật khẩu).
> - Nguồn đối chiếu: `WEB0_GAP_MATRIX.md`, `backend/src/routes/*.ts`, `middlewares/authMiddleware.ts`, `middlewares/errorHandler.ts`.

## 0. Quy ước chung (giữ như backend hiện có)

- Tiền tố `/api`. Auth `Authorization: Bearer <JWT>` (`authenticate`), quyền `requireRoles(...)`.
- Thành công: `{ "success": true, "data": ... }` (có thể kèm `message`). Danh sách phân trang: `data = { items, total, page, limit, pages }` (giống `PartnerApplicationService.list`).
- Lỗi: `{ "success": false, "message": "...", "code": "..." }` (giống `errorHandler`).
  - `401 AUTH_REQUIRED` — thiếu/sai token. `403 FORBIDDEN` — sai vai trò.
  - `400 VALIDATION_ERROR` — input sai; `404 *_NOT_FOUND`; `409 *_VERSION_CONFLICT` — `version` không khớp (tải lại rồi lưu).
- Mọi thao tác ghi quản trị cần `reason` (3–500 ký tự) khi đổi trạng thái/quyền, và ghi `audit_logs` (`action`, `entityType`, `entityId`, `previousData`, `newData`, `reason`).
- Khóa lạc quan: body có `version` (số nguyên hiện tại). Sai → `409`.
- Thời gian ISO-8601 UTC; lịch hiển thị tính theo giờ server, múi `Asia/Ho_Chi_Minh`.
- Không trả password/hash/token trong bất kỳ response nào.

---

## 1. Admin — Người dùng & vai trò (`SUPER_ADMIN`)

### 1.1 `GET /api/admin/users`
Quyền: `SUPER_ADMIN`. Query: `search` (tên/email, ≤120), `role` (`CUSTOMER|PARTNER|SUPER_ADMIN`), `status` (`ACTIVE|SUSPENDED`), `page` (≥1), `limit` (1–100, mặc định 20).

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "8a1f0c2e-0000-4000-8000-000000000001",
        "fullName": "Khách Mock A",
        "email": "customer@mock.local",
        "phone": "0900000001",
        "avatarUrl": null,
        "roles": ["CUSTOMER"],
        "status": "ACTIVE",
        "statusReason": null,
        "businessCount": 0,
        "bookingCount": 3,
        "createdAt": "2026-10-01T02:00:00.000Z",
        "updatedAt": "2026-11-01T02:00:00.000Z",
        "version": 1
      }
    ],
    "total": 1, "page": 1, "limit": 20, "pages": 1
  }
}
```
Lỗi: `400 VALIDATION_ERROR` (role/status/limit sai), `401`, `403`.

### 1.2 `GET /api/admin/users/:id`
Như item trên, thêm `audit: [{ action, reason, actorName, createdAt }]` (≤30 bản ghi gần nhất). Lỗi: `404 USER_NOT_FOUND`.

### 1.3 `PATCH /api/admin/users/:id/status`
Body: `{ "status": "SUSPENDED", "reason": "Vi phạm điều khoản (mock)", "version": 1 }`
Response: user đã cập nhật (`status`, `statusReason`, `version+1`). Tài khoản `SUSPENDED` đăng nhập → `403 ACCOUNT_SUSPENDED`; token cũ bị từ chối ở `authenticate`.
Lỗi: `400 VALIDATION_ERROR` (status/reason), `403 SELF_ACTION_FORBIDDEN` (tự khóa mình), `403 OWNER_PROTECTED` (khóa SUPER_ADMIN khác), `404 USER_NOT_FOUND`, `409 USER_VERSION_CONFLICT`, `409 USER_STATUS_UNCHANGED`.

### 1.4 `PATCH /api/admin/users/:id/roles`
Body: `{ "roles": ["CUSTOMER", "PARTNER"], "reason": "Đã duyệt hồ sơ đối tác (mock)", "version": 2 }`
- Chỉ cho phép `CUSTOMER`, `PARTNER`. Không cấp/thu `SUPER_ADMIN` qua API (`403 ROLE_GRANT_FORBIDDEN`).
- Không đổi quyền của chính mình (`403 SELF_ACTION_FORBIDDEN`). `roles` không rỗng.
- Thu `PARTNER` không xóa Business; membership giữ nguyên nhưng route `/partner/*` trả 403.
Response: user đã cập nhật. Lỗi: `400 VALIDATION_ERROR`, `403`, `404`, `409 USER_VERSION_CONFLICT`.

---

## 2. Admin — CMS trang chủ (`SUPER_ADMIN`; cần migration 19)

### 2.1 Banner/hero

Đối tượng `Banner`:
```json
{
  "id": "b0000000-0000-4000-8000-000000000001",
  "title": "Biển xanh Phú Quốc",
  "subtitle": "Tìm nơi lưu trú phù hợp cho kỳ nghỉ của bạn",
  "ctaLabel": "Xem khách sạn",
  "ctaHref": "/hotels/search?locationId=destination%3Aphu-quoc",
  "imageDesktop": "/images/travel/phu-quoc-1920.webp",
  "imageMobile": "/images/travel/phu-quoc-960.webp",
  "altText": "Phong cảnh Phú Quốc",
  "imageCredit": "Trantuonglam / Wikimedia Commons / CC BY-SA 4.0",
  "status": "PUBLISHED",
  "position": 1,
  "startsAt": null,
  "endsAt": null,
  "publishedAt": "2026-11-20T02:00:00.000Z",
  "updatedAt": "2026-11-20T02:00:00.000Z",
  "updatedBy": "Admin Mock",
  "version": 3
}
```
- `status`: `DRAFT | SCHEDULED | PUBLISHED | ARCHIVED`. `SCHEDULED` = đã publish nhưng `startsAt` ở tương lai; public chỉ thấy khi `startsAt ≤ now < endsAt`.
- `ctaHref` chỉ nhận đường dẫn nội bộ bắt đầu bằng `/` (không `//`, không `javascript:`), ≤300 ký tự. Không HTML/script trong mọi trường text (text thuần, ≤160/300).
- Ảnh: đường dẫn static local `/images/...` hoặc managed media `/api/hotel-media/:uuid` / `/media/cms/...`.

| Method | Path | Body | Response `data` |
|---|---|---|---|
| GET | `/api/admin/cms/banners?status=` | — | `{ items: Banner[], total }` (sắp theo `position`) |
| POST | `/api/admin/cms/banners` | các trường nội dung (không có `status`) | `Banner` (`DRAFT`, `version:1`) — `201` |
| GET | `/api/admin/cms/banners/:id` | — | `Banner` + `revisions: [{ revision, status, title, updatedAt, updatedBy }]` |
| PUT | `/api/admin/cms/banners/:id` | trường nội dung + `version` | `Banner` (sửa bản PUBLISHED → tạo revision mới, vẫn hiển thị bản đã publish cho đến khi publish lại) |
| POST | `/api/admin/cms/banners/:id/publish` | `{ version, startsAt?, endsAt? }` | `Banner` (`PUBLISHED` hoặc `SCHEDULED`) |
| POST | `/api/admin/cms/banners/:id/unpublish` | `{ version, reason? }` | `Banner` (`DRAFT`) |
| POST | `/api/admin/cms/banners/:id/restore` | `{ revision, version }` | `Banner` (nội dung revision cũ, trạng thái `DRAFT`) |
| PUT | `/api/admin/cms/banners/order` | `{ ids: string[] }` (đủ mọi banner không ARCHIVED) | `{ items: Banner[] }` |
| DELETE | `/api/admin/cms/banners/:id` | — | `Banner` (`ARCHIVED`, xóa mềm) |

Lỗi: `400 CMS_VALIDATION` (thiếu tiêu đề/ảnh/alt, `ctaHref` không an toàn, `endsAt ≤ startsAt`), `404 CMS_BANNER_NOT_FOUND`, `409 CMS_VERSION_CONFLICT`, `409 CMS_STATE` (publish bản ARCHIVED…), `400 CMS_ORDER_INVALID`.

### 2.2 Sections trang chủ
Đối tượng `Section`:
```json
{ "key": "featured_hotels", "title": "Khách sạn nổi bật", "enabled": true, "position": 5, "config": { "limit": 6 }, "version": 1, "updatedAt": "2026-11-20T02:00:00.000Z" }
```
`key` cố định: `hero, search, destinations, offers, featured_hotels, stay_types, tours, blogs, ai_banner, newsletter`.

| Method | Path | Body | Response `data` |
|---|---|---|---|
| GET | `/api/admin/cms/sections` | — | `{ items: Section[] }` |
| PATCH | `/api/admin/cms/sections/:key` | `{ enabled?, title?, config?, version }` | `Section` |
| PUT | `/api/admin/cms/sections/order` | `{ keys: string[] }` (đủ mọi key) | `{ items: Section[] }` |

Lỗi: `400 CMS_VALIDATION`, `404 CMS_SECTION_NOT_FOUND`, `409 CMS_VERSION_CONFLICT`. `hero` và `search` không tắt được (`400 CMS_SECTION_REQUIRED`).

### 2.3 Khách sạn nổi bật (chỉ tham chiếu id có sẵn)
| Method | Path | Body | Response `data` |
|---|---|---|---|
| GET | `/api/admin/cms/featured-hotels` | — | `{ items: [{ placeId, position, name, status, eligible }], version }` |
| PUT | `/api/admin/cms/featured-hotels` | `{ placeIds: string[] (≤12, không trùng), version }` | như GET |

`eligible` = hotel `APPROVED`, business `ACTIVE`, đã duyệt revision hiện tại. Lỗi: `422 CMS_FEATURED_NOT_ELIGIBLE` (kèm `ids`), `409 CMS_VERSION_CONFLICT`. Không sao chép dữ liệu catalog; giá vẫn lấy từ `/api/hotels`.

### 2.4 Đọc công khai: `GET /api/cms/home`
Quyền: công khai, `Cache-Control: no-store`. Chỉ trả bản đã publish và đang trong khung thời gian.
```json
{
  "success": true,
  "data": {
    "banners": [ { "id": "b000…0001", "title": "Biển xanh Phú Quốc", "subtitle": "…", "ctaLabel": "Xem khách sạn", "ctaHref": "/hotels/search?…", "imageDesktop": "/images/travel/phu-quoc-1920.webp", "imageMobile": "/images/travel/phu-quoc-960.webp", "altText": "Phong cảnh Phú Quốc", "imageCredit": "…", "position": 1 } ],
    "sections": [ { "key": "hero", "title": "…", "position": 1, "config": {} } ],
    "featuredHotelIds": ["5f0e0000-0000-4000-8000-000000000101"],
    "asOf": "2026-11-21T03:00:00.000Z",
    "isDemo": true
  }
}
```

---

## 3. Admin — Cài đặt website không nhạy cảm (`SUPER_ADMIN`)

### 3.1 `GET /api/admin/settings` / `PATCH /api/admin/settings`
```json
{
  "success": true,
  "data": {
    "siteName": "HuGo Travel",
    "tagline": "Khám phá Việt Nam theo cách của bạn",
    "supportEmail": "support@mock.local",
    "supportPhone": null,
    "supportHours": "08:00–21:00 (mock)",
    "address": null,
    "footerLinks": [ { "group": "Hỗ trợ", "label": "Chính sách bảo mật", "href": "/privacy" } ],
    "social": [],
    "seo": { "defaultTitle": "HuGo Travel", "defaultDescription": "…" },
    "notice": { "enabled": false, "message": "" },
    "version": 1,
    "updatedAt": "2026-11-20T02:00:00.000Z"
  }
}
```
PATCH body: bất kỳ trường trên (trừ `updatedAt`) + `version`. Không lưu secret/API key/SMTP ở đây. `href` chỉ nội bộ `/...` hoặc `https://` cho mạng xã hội; `supportPhone` để `null` khi chưa có số thật (không bịa hotline).
Lỗi: `400 SETTINGS_VALIDATION`, `409 SETTINGS_VERSION_CONFLICT`.

### 3.2 `GET /api/settings/public`
Công khai: `siteName, tagline, supportEmail, supportPhone, supportHours, address, footerLinks, social, seo, notice`.

---

## 4. Partner — Ưu đãi khách sạn (`PARTNER`, membership `MANAGE_BUSINESS`)

Backend **đã có** `POST /api/partner/hotels/:id/promotions` và `PUT /api/partner/hotels/:id/promotions/:entityId` (vòng lặp `rooms|rates|promotions` trong `hotelRoutes.ts`, cần header `If-Match: <revision>`). Bảng `hotel_promotions` có sẵn. Chỉ đề xuất thêm phần đọc:

### 4.1 `GET /api/partner/hotels/:id/promotions` (mới)
Query: `status` (`DRAFT|ACTIVE|ARCHIVED`), `effective` (`UPCOMING|RUNNING|EXPIRED`).
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "7c000000-0000-4000-8000-000000000101",
        "placeId": "5f0e0000-0000-4000-8000-000000000101",
        "roomTypeId": null, "ratePlanId": null,
        "name": "Ưu đãi đặt sớm (mock)", "currency": "VND",
        "kind": "PERCENT_BPS", "value": 1000, "maxDiscountVnd": 500000,
        "bookingStartsAt": "2026-11-01T00:00:00.000Z", "bookingEndsAt": "2027-01-31T17:00:00.000Z",
        "stayFrom": "2026-11-21", "stayUntil": "2027-03-31", "minNights": 2,
        "status": "ACTIVE", "version": 1,
        "effective": "RUNNING"
      }
    ],
    "total": 1, "revision": 4
  }
}
```
- Ẩn/kết thúc ưu đãi = `PUT …/promotions/:entityId` với `status: "ARCHIVED"` (route có sẵn). Không cho sửa giá/ưu đãi của khách sạn khác (`403 BUSINESS_ACCESS_DENIED`, `404 HOTEL_SCOPE_NOT_FOUND`).
- Lỗi: `401`, `403`, `404 HOTEL_NOT_FOUND`.

### 4.2 Admin xem/ẩn ưu đãi (mới, chỉ đọc + đình chỉ)
- `GET /api/admin/promotions?placeId=&status=&effective=&page=&limit=` → `{ items: (Promotion & { hotelName, effective })[], total, page, limit, pages }`.
- `POST /api/admin/promotions/:id/suspend` body `{ reason }` → Promotion với `status: "ARCHIVED"`, ghi audit. Admin **không** sửa giá trị ưu đãi/rate của Partner. Lỗi: `400 VALIDATION_ERROR`, `404 PROMOTION_NOT_FOUND`, `409 PROMOTION_STATE`.

---

## 5. Partner — Đánh giá của cơ sở (`PARTNER`)

### 5.1 `GET /api/partner/reviews`
Query: `businessId` (bắt buộc), `placeId?`, `replied` (`true|false`), `minRating?`, `page`, `limit` (≤50). Chỉ review `PUBLISHED` thuộc place của business mà user là member.
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "r0000000-0000-4000-8000-000000000001",
        "targetType": "place",
        "targetId": "5f0e0000-0000-4000-8000-000000000101",
        "placeName": "Mock Sao Beach Resort",
        "userName": "Khách Mock A",
        "rating": 5,
        "comment": "Phòng sạch, nhân viên thân thiện (nội dung mock).",
        "verificationStatus": "VERIFIED",
        "createdAt": "2026-11-10T03:00:00.000Z",
        "reply": { "text": "Cảm ơn bạn đã lưu trú (mock).", "repliedAt": "2026-11-11T03:00:00.000Z", "repliedBy": "Đối tác Mock" }
      }
    ],
    "total": 1, "page": 1, "limit": 20, "pages": 1,
    "summary": { "count": 1, "average": 5, "unreplied": 0 }
  }
}
```
Không trả email/điện thoại khách. Lỗi: `400 BUSINESS_ID_REQUIRED`, `403 BUSINESS_ACCESS_DENIED`.

### 5.2 `PUT /api/partner/reviews/:id/reply` / `DELETE /api/partner/reviews/:id/reply`
PUT body `{ "text": "…" }` (1–2000 ký tự, text thuần) → review với `reply`. DELETE → review với `reply: null`.
Lỗi: `400 REPLY_INVALID`, `403 REVIEW_ACCESS_DENIED`, `404 REVIEW_NOT_FOUND`, `409 REVIEW_NOT_PUBLISHED`.
Additive cho public: `GET /api/places/:id/reviews` thêm trường `reply` (null nếu chưa có).

---

## 6. Khách hàng — Hồ sơ & mật khẩu

### 6.1 `PATCH /api/auth/profile`
Quyền: đã đăng nhập (mọi vai trò). Body (một phần): `{ "fullName": "Khách Mock A", "phone": "0900000001", "avatarUrl": null }`. Không đổi `email`/`roles` qua route này.
Response `data`: `PublicUser` giống `GET /auth/me` (`id, fullName, email, phone, avatarUrl, roles`).
Lỗi: `400 PROFILE_INVALID` (fullName 2–120, phone `^[-+0-9 ()]{9,20}$`, avatarUrl chỉ đường dẫn nội bộ/managed media), `401`.

### 6.2 `POST /api/auth/change-password`
Body: `{ "currentPassword": "…", "newPassword": "…" }` → `{ "success": true, "message": "Đã đổi mật khẩu", "data": { "changed": true, "reauthenticate": true } }`.
- Sai mật khẩu hiện tại trả **`400 CURRENT_PASSWORD_INCORRECT`** (không dùng 401 để interceptor không tự đăng xuất).
- `400 WEAK_PASSWORD` (≥8 ký tự, khác mật khẩu cũ). Rate-limit `429 TOO_MANY_ATTEMPTS`.
- Đề xuất `users.token_version` để vô hiệu token cũ; client đăng nhập lại.

---

## 7. Thông báo in-app (mọi vai trò đã đăng nhập)

Đối tượng `Notification`:
```json
{
  "id": "n0000000-0000-4000-8000-000000000001",
  "type": "BOOKING_CONFIRMED",
  "title": "Đơn đặt phòng đã được xác nhận",
  "body": "Đơn HG-MOCK0001 tại Mock Sao Beach Resort đã được đối tác xác nhận.",
  "link": "/bookings",
  "readAt": null,
  "createdAt": "2026-11-20T05:00:00.000Z"
}
```
`type`: `BOOKING_CREATED | BOOKING_CONFIRMED | BOOKING_CANCELLED | BOOKING_REJECTED | PARTNER_APPLICATION_DECIDED | CONTENT_MODERATED | REVIEW_REPLIED | SYSTEM`. `link` chỉ đường dẫn nội bộ.

| Method | Path | Body | Response `data` |
|---|---|---|---|
| GET | `/api/notifications?unread=true&page=&limit=` | — | `{ items, total, page, limit, pages, unreadCount }` |
| GET | `/api/notifications/unread-count` | — | `{ count }` |
| PATCH | `/api/notifications/:id/read` | — | `Notification` (đặt `readAt`) |
| POST | `/api/notifications/read-all` | — | `{ updated }` |

Chỉ thấy thông báo của chính mình (`404 NOTIFICATION_NOT_FOUND` nếu không thuộc). Sinh thông báo trong cùng transaction với sự kiện nghiệp vụ (đổi trạng thái booking, duyệt hồ sơ…).

---

## 8. Route đã có nhưng chưa nằm trong `adminRoutes.ts` (ghi chú)

`WEB0_GAP_MATRIX.md` liệt kê `GET /admin/businesses/:id`, `GET /admin/businesses/:businessId/bookings`, `GET /admin/bookings/:id`, `PATCH /admin/bookings/:id/status` nhưng `adminRoutes.ts` hiện chỉ có `GET /admin/businesses` và `GET /admin/bookings`; đổi trạng thái booking toàn hệ thống đang ở `PATCH /api/bookings/:id/status` (SUPER_ADMIN), xem chi tiết ở `GET /api/bookings/:code`. Đề xuất bổ sung 4 route admin trên (cùng shape `Business`/`Booking` hiện có, `data` là object hoặc `{ items, total, page, limit }`), hoặc UI dùng route sẵn có. Mock hỗ trợ cả hai.
