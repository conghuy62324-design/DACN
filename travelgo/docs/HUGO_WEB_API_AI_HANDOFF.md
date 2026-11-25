# HUGO TRAVEL — HỢP ĐỒNG DỮ LIỆU/API BÀN GIAO CHO AI (21.40)

- **Ngày lập:** 23/11/2026 · **Branch:** `feature/web-ui-admin-partner` @ `62815c1`
- **Nguồn sự thật (source authority):** `backend/src/hotels/contracts.ts` (`HOTEL_CONTRACT = 'HOTEL_ROOM_NIGHT_V1'`, `HOTEL_SCHEMA_VERSION = 18`), `HotelReadService` + `backend/src/hotels/postgresStore.ts`, migration 18.
- **Phạm vi:** đợt WEB này **không đổi backend, schema hay response cũ**. Tài liệu ghi lại hợp đồng hiện có mà giao diện đang dùng, cộng các API **đề xuất** (chưa có) để AI owner biết trước. Ví dụ JSON đều SYNTHETIC.

---

## 1. Nguyên tắc chung (giữ nguyên)

- Website, Admin, Partner và AI dùng chung backend nghiệp vụ + PostgreSQL. Không có bảng giá riêng cho AI; không đưa giá vào prompt/weights.
- Luồng dữ liệu: Partner cập nhật → RBAC/validation → moderation (nếu cần) → DB commit → **fresh read** (`no-store`) → website và AI cùng thấy.
- Envelope: thành công `{ success: true, data }`; lỗi `{ success: false, message, code }`. Danh sách phân trang `data = { items, total, page, limit[, pages] }`.
- Thời gian ISO-8601 UTC; ngày lưu trú là `CivilDate` `YYYY-MM-DD`; múi hiển thị `Asia/Ho_Chi_Minh`.
- Tiền: số nguyên VND, `currency: 'VND'`.

## 2. Quan hệ thực thể

```
Business (ACTIVE) ──< Place (category=hotel, APPROVED) ── HotelProfile / HotelAddress (1–1)
                                   │
                                   ├──< RoomType ──< RatePlan ──< RateNight (theo ngày)
                                   │        └──< InventoryDay (theo ngày: sellable / allocated)
                                   ├──< Promotion (scope: hotel | roomType | ratePlan)
                                   ├──< HotelMedia (hotel-level hoặc gắn roomTypeId)
                                   └──< Review ── hotel_review_stays ── BookingItem (định danh roomType)
Booking ──< hotel_booking_items ──< hotel_room_allocations (trigger là writer duy nhất)
```

- **Eligibility công khai:** `Place.status = APPROVED` **và** `Business.status = ACTIVE` **và** revision đã duyệt (`approvedContentVersion`). Bản ghi `isDemo = true` bị loại khỏi production (`HOTEL_DEMO_NOT_PUBLIC`).
- Ảnh phòng không trộn sang phòng khác; review gắn đúng room type qua Booking item, không suy từ tên phòng.

## 3. Từ điển dữ liệu (rút gọn từ `contracts.ts`)

| Kiểu | Trường chính | Ghi chú cho AI |
|---|---|---|
| `HotelAddress` | `houseNumber, streetName, wardOrCommune, provinceCode, provinceOrCity, tourismDestinationId, fullAddress, normalizedAddress, streetKey, latitude, longitude, coordinateStatus` | `coordinateStatus ∈ UNKNOWN \| PARTNER_PROVIDED \| VERIFIED`. Chỉ dùng tọa độ `VERIFIED` cho suy luận khoảng cách. Tìm theo đường: `streetKey` + `tourismDestinationId`, phân biệt "trên đường" và "gần đường" |
| `RoomType` | `id, placeId, name, areaM2, bedrooms, bathrooms, beds[], maxOccupancy, maxAdults, maxChildren, view, balcony, hasWindow, kitchen, privateBathroom, amenities[], status, version` | `view ∈ SEA, MOUNTAIN, CITY, GARDEN, LAKE, POOL, NONE, UNKNOWN`. `null` = chưa cung cấp, **không** coi là `false` |
| `RatePlan` | `id, roomTypeId, priceBasis='PER_ROOM_NIGHT', baseAmountVnd, validFrom, validUntil, minNights, maxNights, includedAdults, extraAdultVndPerNight, childPolicy, childBands[], mealPlan, cancellation{kind, cutoffHours, terms}, tax{mode, basisPoints}, fees[], mandatoryFeesKnown, status, version` | `mealPlan ∈ ROOM_ONLY \| BREAKFAST_INCLUDED`. `tax.mode = UNKNOWN` → không được nói "đã gồm thuế" |
| `RateNight` | `ratePlanId, stayDate, amountVnd, closed, version` | Giá theo đêm thật; không dùng `Place.priceFrom` thay giá xác nhận |
| `InventoryDay` | `roomTypeId, stayDate, sellableQuantity, allocatedQuantity, closed, version` | Còn phòng = `sellable − allocated` cho **mọi đêm** (check-in inclusive, check-out exclusive) |
| `Promotion` | `id, placeId, roomTypeId?, ratePlanId?, kind (PERCENT_BPS \| FIXED_STAY), value, maxDiscountVnd, bookingStartsAt, bookingEndsAt, stayFrom, stayUntil, minNights, status, version` | Hết hạn theo giờ server; không stack theo policy |
| `HotelAuthority` | `placeId, businessId, placeStatus, businessStatus, contentVersion, approvedContentVersion, commercialVersion, isDemo` | Dùng để kiểm eligibility và độ mới |
| `HotelQuote` | `contract, priceBasis, binding=false, nights, roomCount, nightly[], baseVnd, extraGuestsVnd, childrenVnd, discountVnd, taxVnd, feesVnd, totalVnd, promotionId, minimumAvailableRooms, asOf, expiresAt, sourceVersion, cancellation, caveats[], isDemo` | **Không ràng buộc** (`binding: false`), hết hạn ≤ 60 giây. AI không được nói "đã giữ phòng" |

## 4. API hiện có mà giao diện dùng (không đổi)

| API | Mục đích |
|---|---|
| `GET /api/hotels` | Tìm kiếm (strict DTO, `rooms` = phân bổ người lớn/tuổi trẻ). Có ngày → giá `STAY_TOTAL`; không ngày → giá tham khảo, **không** phải availability |
| `GET /api/hotels/:placeId` | Chi tiết: profile, address, rooms, rates, promotions, media, `asOf`, `validUntil`, `sourceVersion` |
| `POST /api/hotels/:placeId/quotes` | Báo giá đọc/không ràng buộc |
| `POST /api/bookings/hotel/:placeId/prepare` → `POST /api/bookings/hotel/confirm` → `POST /api/bookings/hotel/intent-status` | Đặt phòng: HMAC intent, idempotency, kiểm lại quote, không thanh toán |
| `GET /api/bookings/my`, `GET /api/bookings/:idOrCode`, `POST /api/bookings/:id/cancel` | Đơn của khách, hủy theo policy |
| `GET /api/partner/bookings`, `PATCH /api/bookings/:id/status` | Partner/Admin đổi trạng thái theo lifecycle |
| `/api/hotels/manage/:id/*` (profile, address, rooms, rates calendar, inventory, media, submit, moderate) | Partner quản lý, Admin kiểm duyệt revision |
| `GET /api/reviews/moderation-queue`, `PATCH /api/reviews/:id/moderation`, `GET /api/reviews/me` | Review Phase E |
| `GET /api/admin/dashboard`, `/admin/partner-applications`, `PATCH /admin/partners/:id/approval`, `/admin/businesses`, `/admin/bookings` | Admin |

### Ví dụ (SYNTHETIC, rút gọn) — `GET /api/hotels/:placeId`
```json
{
  "success": true,
  "data": {
    "authority": { "placeId": "5f0e…000b", "businessId": "b1…01", "placeStatus": "APPROVED", "businessStatus": "ACTIVE",
                   "contentVersion": 3, "approvedContentVersion": 3, "commercialVersion": 2, "isDemo": false },
    "identity": { "id": "5f0e…000b", "name": "Sao Biển Resort Phú Quốc", "accommodationType": "resort" },
    "address": { "houseNumber": "118", "streetName": "Trần Hưng Đạo", "wardOrCommune": "Dương Tơ",
                 "provinceCode": "91", "tourismDestinationId": "destination:phu-quoc",
                 "coordinateStatus": "PARTNER_PROVIDED", "latitude": 10.1702, "longitude": 103.9915 },
    "rooms": [{ "id": "r1", "name": "Deluxe hướng biển", "areaM2": 32, "view": "SEA", "balcony": true,
                "beds": [{ "type": "KING", "quantity": 1 }], "maxAdults": 2, "maxChildren": 1, "amenities": ["WIFI", "AIR_CONDITIONING"] }],
    "rates": [{ "id": "rp1", "roomTypeId": "r1", "priceBasis": "PER_ROOM_NIGHT", "baseAmountVnd": 2600000,
                "mealPlan": "BREAKFAST_INCLUDED", "cancellation": { "kind": "FREE_UNTIL_CUTOFF", "cutoffHours": 48, "terms": "Hủy miễn phí đến 48 giờ trước giờ nhận phòng." },
                "tax": { "mode": "INCLUDED", "basisPoints": null } }],
    "promotions": [{ "id": "pr1", "kind": "PERCENT_BPS", "value": 1000, "maxDiscountVnd": 800000, "minNights": 2 }],
    "asOf": "2026-11-23T03:00:00.000Z", "validUntil": "2026-11-23T03:01:00.000Z", "sourceVersion": "3f9a…(sha256 hex)", "cacheControl": "no-store"
  }
}
```
Tên trường lấy theo mock (mô phỏng đúng `contracts.ts`); khi có DB thật cần đối chiếu lại response thật.

## 5. Mã lỗi quan trọng
- Nhóm `HOTEL_*` trong `backend/src/hotels/*`: `HOTEL_DOMAIN_NOT_ENABLED`, `HOTEL_DEMO_NOT_PUBLIC`, `HOTEL_DATE_INVALID`, `HOTEL_CHILD_AGES`, `HOTEL_INVENTORY_UNAVAILABLE`, `HOTEL_INVENTORY_COMMITTED` (giảm sellable dưới allocated), `HOTEL_CONFIRMATION_EXPIRED` / `_CHANGED` / `_INVALID`, `HOTEL_IDEMPOTENCY_REQUIRED`, `HOTEL_EXPLICIT_CONFIRMATION_REQUIRED`, `HOTEL_CANCELLATION_CUTOFF`, `HOTEL_COORDINATES_INVALID`, `HOTEL_COORDINATE_AUTHORITY`… (danh sách đủ: `grep -rho "'HOTEL_[A-Z_]*'" backend/src/hotels`).
- Chung: `401 AUTH_REQUIRED`, `403 FORBIDDEN`, `400 VALIDATION_ERROR`, `404 *_NOT_FOUND`, `409 *_VERSION_CONFLICT`.

## 6. Độ mới, revision, consent
- Mọi đọc hotel là `no-store`; `asOf`/`validUntil` (≤ 60 s) và `sourceVersion` để AI biết dữ liệu có cũ không. AI phải đọc lại khi hết `validUntil`.
- Partner sửa → `contentVersion` tăng; công khai chỉ thấy `approvedContentVersion`. Thay đổi giá/tồn/ưu đãi → `commercialVersion` tăng.
- Review: moderation công khai và consent dùng cho AI là **hai cờ tách biệt**. Không gửi raw review hay danh tính riêng tư sang Qwen. `ReviewInsightService` / `summarizeReviewEvidence` giữ nguyên trạng.
- Consent AI/telemetry/memory ở `/profile` và Assistant: opt-in, giao diện WEB không đổi hành vi.

## 7. API đề xuất (CHƯA có — chờ duyệt)
Chi tiết DTO, quyền, lỗi: `docs/web-team/PROPOSED_API_CONTRACTS.md`.

| PAC | Nhóm | Ảnh hưởng tới AI |
|---|---|---|
| §1 | Admin users & roles | Không |
| §2 | CMS banner/sections/featured + `GET /api/cms/home` (cần migration 19) | AI có thể đọc nội dung trang chủ đã publish; không đọc draft |
| §3 | Settings website + `GET /api/settings/public` | Không |
| §4 | Partner promotions CRUD, Admin xem/đình chỉ | Thay đổi `Promotion` → tăng `commercialVersion`; AI đọc lại |
| §5 | Partner xem review + phản hồi | Phản hồi đối tác là trường riêng, không trộn vào nội dung review cho NLP |
| §6 | Sửa hồ sơ, đổi mật khẩu | Không |
| §7 | Thông báo in-app | Không |
| §8 | Route admin còn thiếu (`/admin/businesses/:id`, `/admin/bookings/:id`…) | Không |

Tất cả additive, không đổi response cũ, không rename ID.

## 8. Việc thuộc AI owner (21.40) — WEB không làm thay
1. Tích hợp Agent Core với dữ liệu hotel thật qua `HotelReadService` (không đi đường riêng).
2. Mở rộng NLP review: khía cạnh view, đồ ăn, gần biển, tiếng ồn… trên dữ liệu review đã có consent.
3. Tìm theo đường/địa danh trong hội thoại, dùng `streetKey`/`tourismDestinationId`; chỉ suy khoảng cách với tọa độ `VERIFIED`.
4. Review e2e `t-ai-02` (`assistantNav`) đang tham chiếu nút header đã bỏ.
5. Duyệt diff vùng Vàng: `AppRouter.tsx`, global CSS, Navbar/Footer.
6. Bản đồ/GIS routing (21.41).

## 9. Giới hạn
- Chưa xác minh trên PostgreSQL thật; ví dụ JSON lấy theo mock mô phỏng hợp đồng.
- V1 chỉ nhiều phòng cùng room type/rate; không mixed-room.
- Không có thanh toán, không trạng thái paid/refunded thật.
