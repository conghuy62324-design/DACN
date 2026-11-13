# HUGO PROJECT HANDOFF — Trạng thái bàn giao

**Ngày:** 07/11/2026, Asia/Saigon.  
**Phiên:** READ-ONLY AUDIT sau T13-B-02.  
**HEAD:** `052531dfc77c4f289757794c0ee08b4d46e6af2e`

---

## 1. T13-B — Trạng thái lũy kế chính xác

| Lần chạy | Scope | Kết quả |
|---|---|---|
| T13-A-FIX (`20261106043724-bddc1d`) | 14 instance (7 case × 2 viewport) | **14/14 PASS** ✅ |
| T13-B-01-FIX (`20261107030355-79d231`) | 7 CORE | **7/7 PASS** ✅ |
| T13-B-02 (`20261107122016-34e7f2`) | 8 CORE | **4 PASS / 4 FAIL** ❌ |
| **Tổng T13-B lũy kế** | 43 CORE | **11 PASS / 4 FAIL / 28 NOT RUN** |

---

## 2. 4 FAIL cần xử lý trong T13-B-02-FIX

### T13B02-01 — P1 — Booking alias thiếu MANAGE_BOOKINGS

**Case:** B06  
**Endpoint:** `GET /api/partner/businesses/:id/bookings`  
**Triệu chứng:** Member chỉ có `MANAGE_BUSINESS` nhận 200 với Booking data, expected 403.  
**Root cause:** `PartnerService.getBookings` gọi `getBusiness()` (chỉ kiểm membership, không kiểm permission).  
**File cần sửa:** `backend/src/services/partnerService.ts`, hàm `getBookings` — thêm kiểm tra `MANAGE_BOOKINGS` trong `membership.permissions`.

### T13B02-02 — P2 — Giá 0 hiển thị rỗng

**Case:** B02  
**Triệu chứng:** `priceFrom=0` → reload form → input rỗng, `checkValidity=false`.  
**Root cause:** `value={form[field.key] || ''}` → 0 falsy → empty string.  
**File cần sửa:** `frontend/src/pages/partner/PartnerResourceFormPage.tsx` — thay `|| ''` bằng `?? ''` cho input type=number; hoặc `value={form[field.key] !== undefined && form[field.key] !== null ? String(form[field.key]) : ''}`.

### T13B02-03 — P2 — Tour 0 đêm thành required rỗng

**Case:** B03  
**Triệu chứng:** `durationNights=0` → reload → input rỗng + required → không submit được.  
**Root cause:** Cùng biểu thức falsy như trên; `durationNights` có `required:true`.  
**File cần sửa:** Cùng file `PartnerResourceFormPage.tsx`, cùng pattern — sửa đồng thời với T13B02-02.

### T13B02-04 — P1 — Ticket timestamp trôi −7 giờ

**Case:** B04  
**Triệu chứng:** Save Ticket không sửa gì → departure/arrival đổi instant, lệch −25,200,000ms (−7h).  
**Root cause:**
1. `normalizeForForm` cắt ISO: `String(val).slice(0,16)` → loại bỏ timezone offset.
2. Browser Asia/Saigon (UTC+7) → input `datetime-local` nhận `2030-06-15T03:30` (không có offset).
3. Backend TZ=Asia/Ho_Chi_Minh → `new Date("2030-06-15T03:30")` parse thành local time → thực ra là UTC-7h.
**File cần sửa:**
- **Backend** `backend/src/services/ticketService.ts`: parse string không offset phải thêm `Z` hoặc dùng `Date.parse` với suffix timezone.
- **Frontend** `frontend/src/pages/partner/PartnerResourceFormPage.tsx`, hàm `normalizeForForm`: khi mở form edit, convert UTC ISO → local datetime string đúng cách, không dùng `.slice(0,16)` ngây thơ.

---

## 3. Observation còn mở

| OBS | File liên quan | Mô tả |
|---|---|---|
| **Map P2** (T13B01-OBS-01) | `frontend/src/components/explore/MapView.tsx` | `Invalid LatLng object: (NaN, NaN)` trên mobile khi coordinate null/undefined |
| **Ticket UI label P2** (T13B02) | `frontend/src/pages/partner/PartnerResourceFormPage.tsx` | "Nội dung mới được lưu ở trạng thái nháp" nhưng Ticket status=ACTIVE |

---

## 4. 28 CORE còn NOT RUN (cần chạy sau FIX)

```
R06 (account switch với response trễ)
A01 (Admin dashboard metrics)
A06 (Admin businesses/bookings API)
B07 (Partner Booking confirm→complete; Customer reload; SA API)
B08 (Partner reject/cancel; inventory; foreign)
V01–V08 (Review: verified/unverified/validation/provenance/duplicate/update/moderation/delete)
F01–F07 (Favorite: CRUD/reload/remove/concurrent/isolation/validation/attribution)
C01–C08 (Consent: banner/opt-in/analytics-only/delete/validation/event/race/abort)
```

---

## 5. Prerequisite trước khi chạy B07/V01

- Duyệt fixture COMPLETED Booking (unpaid, synthetic) — **GAP-07**.
- Tạo runner T13-B-03 riêng, không dùng lại t13b02-*.
- Khóa manifest trước khi build/fixture.

---

## 6. File harness hiện có (READ-ONLY, không xóa/sửa)

| Harness | Task | Trạng thái |
|---|---|---|
| `backend/scripts/t13a-*.cjs` + `frontend/e2e/t13a-core.spec.ts` | T13-A/FIX | Frozen |
| `backend/scripts/t13b01-*.cjs` + `frontend/e2e/t13b01-*.spec.ts` | T13-B-01/FIX | Frozen |
| `backend/scripts/t13b02-*.cjs` + `frontend/e2e/t13b02-*.spec.ts` | T13-B-02 | Frozen (không re-run để ghi vào cũ) |

---

## 7. AI/Research

| Item | Trạng thái |
|---|---|
| Sentiment Kaggle pipeline (artifact v7) | Demo artifact. Không tuyên bố production accuracy. |
| Phương án A/B | **Quyết định cần trước 10/11/2026** |
| Consent/Telemetry backend | Triển khai đầy đủ; chưa có E2E (C01–C08 NOT RUN) |
| Recommendation/Planner | T11-B PASS; không cần chạy lại |

---

## 8. Demo readiness (hiện tại)

| Hạng mục | Sẵn sàng |
|---|---|
| Docker Compose + PostgreSQL | ✅ |
| Backend build | ✅ (đã xác nhận trong T13-B-02) |
| Frontend build | ✅ (đã xác nhận trong T13-B-02) |
| Seed data demo | ⚠️ Chưa tách khỏi test fixture |
| Runbook startup | ⚠️ Chưa có file riêng |
| Slide + kịch bản bảo vệ | ❌ Chưa có |

