# WEB-0 — Gap matrix (đọc source, 21/11/2026)

Nguồn: `frontend/src/router/AppRouter.tsx`, `pages/admin/*`, `pages/partner/*`, `backend/src/routes/*.ts`, `database/migrations/*`.
**Chỉ đọc code, chưa chạy API thật** (máy chưa có PostgreSQL). Cột "API" = có route backend; chưa xác minh hành vi.

Ký hiệu: ✅ có UI + có API · 🟡 có API nhưng UI là placeholder/thiếu · ❌ thiếu cả API (cần đề xuất contract/migration, chủ dự án duyệt)

## Admin (`/admin`, SUPER_ADMIN)
| Chức năng (bàn giao mục 5) | UI | API | Trạng thái |
|---|---|---|---|
| Dashboard số liệu | AdminDashboardPage | `GET /admin/dashboard`, `GET /stats/dashboard` | ✅ (kiểm số liệu từ DB) |
| Duyệt hồ sơ đối tác | PartnerApplicationsPage | `GET /admin/partner-applications`, `PATCH /admin/partners/:id/approval` | ✅ |
| Kiểm duyệt khách sạn (revision) | HotelManagementPage admin | `POST /hotels/manage/:id/moderate`, media review | ✅ |
| Kiểm duyệt Place/Tour/Blog | AdminModerationPage | `PATCH /admin/{places,tours,blogs}/:id/status` | ✅ |
| Cơ sở kinh doanh (Business) | AdminSectionPage `businesses` = placeholder | `GET /admin/businesses`, `/:id`, `/:businessId/bookings` | 🟡 |
| Booking toàn hệ thống | placeholder `bookings` | `GET /admin/bookings`, `/:id`, `PATCH /:id/status` | 🟡 |
| Review / báo cáo vi phạm | placeholder `content` | `GET /reviews/moderation-queue`, `PATCH /reviews/:id/moderation` | 🟡 |
| Người dùng & vai trò (active/suspend) | placeholder `users` | — | ❌ |
| Báo cáo / export | placeholder `reports` | chỉ dashboard | ❌ (một phần) |
| Cài đặt website | placeholder `settings` | — | ❌ |
| **CMS trang chủ** (banner, sections, featured, placement ưu đãi) | — | — , không có bảng | ❌ cần migration 19 + API |

## Partner (`/partner`, PARTNER)
| Chức năng (bàn giao mục 7) | UI | API | Trạng thái |
|---|---|---|---|
| Dashboard | PartnerDashboardPage | `GET /partner/dashboard` | ✅ |
| Hồ sơ KS, địa chỉ, gửi duyệt | HotelManagementPage | `PUT /hotels/manage/:id/profile`, `/address`, `POST /:id/submit` | ✅ (tọa độ NOT NULL → 422, giữ guard) |
| Hạng phòng, giá lịch, tồn phòng | HotelManagementPage | `PUT .../rooms/:id/inventory`, `.../rates/:id/calendar` | ✅ (kiểm UI calendar) |
| Ảnh khách sạn | HotelManagementPage | `POST/PUT .../media` | ✅ |
| Đơn đặt | PartnerBookingsPage | `GET /partner/bookings`, `PATCH /bookings/:id/status` | ✅ |
| Place/Tour/Ticket/Blog | PartnerResource*Page | `/partner/{places,tours,tickets,blogs}` | ✅ |
| Ưu đãi (promotions) | — | không thấy route quản lý promotion | ❌ (bảng `hotel_promotions` có sẵn) |
| Đánh giá của cơ sở | placeholder `workspace/reviews` | — | ❌ |
| Onboarding nhiều bước | BecomePartnerPage (1 form) | `POST /partner-applications`, `GET /me` | 🟡 |
| Lịch vận hành / thống kê / thiết lập | placeholder | — | ❌ |

## Khách hàng
| Chức năng (bàn giao mục 6) | UI | API | Trạng thái |
|---|---|---|---|
| Đăng nhập / đăng ký / phiên | Login, Register | `POST /auth/login`, `/register`, `GET /auth/me` | ✅ |
| Hồ sơ — xem | ProfilePage | `GET /auth/profile` | ✅ |
| Hồ sơ — sửa, avatar, đổi mật khẩu, quên mật khẩu | — | không có route | ❌ |
| Đơn của tôi + hủy | BookingsPage | `GET /bookings/my`, `POST /bookings/:id/cancel` | ✅ |
| Yêu thích | FavoritesPage | `GET/POST/DELETE /favorites` | ✅ |
| Chuyến đi | MyTripsPage | `tripRoutes` (vùng Planner — không sửa logic) | ✅ |
| Đánh giá của tôi (Phase E) | OwnReviewsPanel trong Profile | `GET /reviews/me`, `PATCH/DELETE /reviews/:id` | 🟡 (luồng tạo review theo booking completed cần xác minh) |
| Thông báo in-app | — | — | ❌ |

## Thứ tự đề xuất (khi có DB)
1. 🟡 trước — chỉ cần UI nối API sẵn có: Admin Business, Booking, Review queue (WEB-2).
2. ❌ không cần schema: Admin Users (cần API mới, additive), Partner promotions (bảng có sẵn, cần API).
3. ❌ cần schema mới → viết đề xuất migration 19 (CMS, notification, profile update) gửi chủ dự án duyệt trước khi áp dụng.
