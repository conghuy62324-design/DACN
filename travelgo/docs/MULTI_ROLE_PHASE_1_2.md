# HuGo Travel — Báo cáo nâng cấp Multi-role (Giai đoạn 1 và nền tảng Giai đoạn 2)

## Phạm vi đã triển khai

- RBAC đa vai trò `CUSTOMER`, `PARTNER`, `SUPER_ADMIN`; vẫn đọc role cũ để tương thích dữ liệu hiện hữu.
- Token truy cập ký HMAC-SHA256, có thời hạn; mật khẩu mới dùng `scrypt` với salt ngẫu nhiên.
- Backend guard cho đăng nhập, role và quyền thành viên cơ sở (`BusinessMember`).
- Ba layout độc lập: Customer, Partner và Super Admin; route guard hiển thị trang 403 khi sai quyền.
- Đăng ký tài khoản và đăng nhập qua API/database, không còn tự tạo token hoặc admin mặc định ở frontend.
- Khách hàng nộp hồ sơ đối tác; admin duyệt, từ chối hoặc yêu cầu bổ sung.
- Khi duyệt hồ sơ, một transaction tạo Business, BusinessMember, cấp role PARTNER và ghi AuditLog.
- Dashboard Admin và Partner lấy số liệu từ database; không thay bằng số demo khi API lỗi.
- Các mutation quản trị cũ (địa điểm, tour, dashboard stats, trạng thái booking) đã được bảo vệ ở backend.
- Booking và Trip không còn tin `userId`/email gửi từ frontend để xác định chủ sở hữu.

## Migration

Chạy theo thứ tự sau trên PostgreSQL đã sao lưu:

1. `database/migrations/20261010_01_init_travelgo_schema.sql` (chỉ với database mới).
2. `database/migrations/20261011_02_rbac_partner_foundation.sql`.

Migration `02` chỉ thêm bảng/cột/index, backfill role và dùng `IF NOT EXISTS`; không xóa dữ liệu hiện hữu. Migration không được chạy tự động trong quá trình phát triển này.

## Dữ liệu kiểm thử

Sau khi chạy migration và cấu hình biến môi trường database:

```powershell
cd backend
$env:SEED_PASSWORD='mật-khẩu-kiểm-thử-riêng'
npm run seed
```

Seed dùng `findOrCreate`, không xóa dữ liệu. Nó tạo 1 Super Admin, 2 partner lưu trú, 1 partner nhà hàng, 1 partner tour và 2 customer. Không dùng tài khoản seed trong production.

## Endpoint mới/chỉnh sửa

- `POST /api/auth/login`, `POST /api/auth/register`, `GET /api/auth/me`
- `POST /api/partner-applications`, `GET /api/partner-applications/me`
- `GET /api/admin/dashboard`
- `GET /api/admin/partner-applications`
- `PATCH /api/admin/partners/:id/approval`
- `GET /api/admin/businesses`, `GET /api/admin/bookings`
- `GET /api/partner/dashboard`
- `GET /api/partner/businesses`, `GET /api/partner/businesses/:id`
- `GET /api/partner/businesses/:businessId/bookings`
- `GET /api/bookings/my`, `POST /api/bookings/:id/cancel`

## Kiểm thử đã chạy

- Backend TypeScript build.
- Frontend TypeScript + Vite production build.
- Test hashing mật khẩu, chữ ký token, role guard và booking state transition.
- 11/11 test cũ cho Bayesian Average, GIS, Recommendation và Tour Planner.

## Dữ liệu mock còn lại

Các module sau của source cũ vẫn dùng in-memory/mock và được giữ nguyên để không phá chức năng hiện hữu: Places, Tickets, Tours, Blogs, Booking store, Trip Session và dữ liệu đầu vào Recommendation/Tour Planner. Dashboard Admin/Partner mới không dùng các fallback mock này. Việc chuyển từng module sang Sequelize thuộc Giai đoạn 3–4 và cần migration/kiểm thử riêng.

## Cấu hình bảo mật

- `JWT_SECRET` bắt buộc trong production.
- `APP_ORIGINS` là danh sách origin phân tách bằng dấu phẩy; mặc định local là `http://localhost:5173`.
- Không nhận role từ request đăng ký.
- Sau khi admin cấp role PARTNER, người dùng đăng nhập lại để token mới mang role được cấp.
