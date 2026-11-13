# Contract auth hiện hành — HuGo Travel

Đối chiếu source ngày **30/10/2026 (T07)**. Đây là mô tả implementation hiện có, không phải kế hoạch bổ sung auth. Kết quả kiểm thử mới và giới hạn nằm trong [báo cáo T07](HUGO_T07_PROFILE_AUTH_REPORT.md); kết quả Phase/M1/M3 trong các báo cáo cũ vẫn là bằng chứng lịch sử.

## Access token và backend

- `backend/src/services/tokenService.ts` phát hành access token **hai phần**: `base64url(JSON(payload)).base64url(HMAC-SHA256(encodedPayload))`. Payload có identity, roles và `iat`/`exp` theo giây Unix. HMAC ký trên **chuỗi payload đã encode**, không phải JSON thô. Token không mã hóa nội dung payload và **không phải JWT chuẩn ba phần có JOSE header**.
- Giữ tên cấu hình `JWT_SECRET`, `JWT_EXPIRES_SECONDS`; tên biến không chứng minh token là JWT. Thời hạn mặc định 8 giờ; không đưa giá trị secret/token thật vào tài liệu.
- `authenticate` trong `backend/src/middlewares/authMiddleware.ts` yêu cầu `Authorization: Bearer <access-token>`, gọi `verifyAccessToken`, rồi gắn identity đã xác minh vào request. Thiếu Bearer → 401 `AUTH_REQUIRED`; token sai/chữ ký sai/payload không hợp lệ → 401 `INVALID_TOKEN`; thiếu `exp` hoặc `exp <= now` → 401 `TOKEN_EXPIRED`.
- `requireRoles` kiểm vai trò trong token, thiếu quyền → 403 `FORBIDDEN`. Ba vai trò là `CUSTOMER`, `PARTNER`, `SUPER_ADMIN`; quyền business còn qua membership/permission hoặc nhánh SUPER_ADMIN tương ứng. Không suy ra quyền từ UI hay từ userId do client tự gửi.
- `AuthService` lấy user/roles từ PostgreSQL, xác minh password bằng password service hiện có. `/auth/me` đọc lại user và roles hiện tại từ DB; user không còn tồn tại → 401 `USER_NOT_FOUND`. Roles trong token đã phát hành không tự được cập nhật theo kết quả `/auth/me`.

Các đường dẫn dưới đây có prefix `/api` (xem `backend/src/routes/authRoutes.ts`, authController/authService):

| Endpoint | Hành vi hiện có |
|---|---|
| `POST /auth/login` | Email/password hợp lệ → `{user, token}`; sai thông tin → 401 `INVALID_CREDENTIALS` |
| `POST /auth/register` | Tạo tài khoản CUSTOMER và trả `{user, token}` |
| `GET /auth/me` | Bearer bắt buộc; trả public user mới đọc từ DB |
| `GET /auth/profile` | Alias GET cùng controller với `/auth/me` |

**Chưa có refresh-token endpoint, server logout/revocation/denylist hoặc profile update endpoint.** Không có refresh-token rotation/cookie được triển khai. Logout local không vô hiệu hóa access token ở server: token cũ còn có thể được chấp nhận đến khi hết hạn nếu vẫn hợp lệ và tài nguyên/user cho phép.

## Frontend, reload và kết thúc phiên

Nguồn: `frontend/src/context/AuthContext.tsx`, `services/authService.ts`, `services/api.ts`, `router/ProtectedRoute.tsx` và `router/` được gắn vào `App.tsx`.

1. Login/register thành công lưu `travelgo_token` và JSON `travelgo_user` vào **localStorage** của origin, đồng thời cập nhật user trong AuthContext. Đây không phải HttpOnly cookie hay session lưu ở server.
2. Khi mount/reload, AuthContext bắt đầu với `user=null`, `loading=true`. Cache `travelgo_user` không được dùng để hiển thị identity trước xác minh. Có token thì gọi `GET /api/auth/me`; thành công mới cập nhật user/cache. Không có token thì xóa cache user và kết thúc loading. ProtectedRoute chờ xác minh trước khi render Profile.
3. Nếu bootstrap `/auth/me` thất bại, kể cả lỗi mạng, phiên đang được xác minh bị xóa phía client và loading kết thúc; đây là hành vi hiện có, không có silent refresh. Không giữ profile cũ khi xác minh thất bại.
4. Axios gắn Bearer từ localStorage vào request. Với response **401 của token đang lưu**, interceptor xóa token/user cache và phát `travelgo:unauthorized`; AuthContext xóa identity trong bộ nhớ. ProtectedRoute chuyển về login và giữ đường dẫn đích trong navigation state. 403 không tự logout.
5. Response 401 của request gửi bằng **token cũ khác token hiện tại** vẫn bị reject cho caller nhưng không được xóa phiên mới. Bootstrap `/auth/me` trả trễ sau logout/401/login khác cũng không được ghi đè user/cache mới. T07 dùng version của phiên, token đối chiếu và cleanup effect để xử lý các trường hợp này.
6. Nút logout chỉ xóa session phía client và user trong AuthContext, không gọi endpoint revoke. Không gọi logout local là vô hiệu hóa token ở server. Chưa có đồng bộ AuthContext giữa nhiều tab qua sự kiện `storage`; T07 kiểm luồng một tab.

Frontend dùng roles thực từ public user để hiển thị menu/route: Profile, Bookings, Favorites cho cả ba role; `/admin` yêu cầu SUPER_ADMIN, `/partner` yêu cầu PARTNER. Không thêm mặc định SUPER_ADMIN được đi mọi frontend route. Backend tiếp tục là nơi kiểm quyền nghiệp vụ.

## Profile CORE và dữ liệu Booking còn chờ

Profile là **read-only**: họ tên, email, điện thoại và roles lấy trực tiếp từ AuthContext; thiếu dữ liệu hiện “Chưa cung cấp”; avatar thiếu dùng biểu tượng. Không có thao tác lưu, số liệu chuyến/điểm/hạng giả hoặc API cập nhật hồ sơ. Links `/bookings` và `/favorites` vẫn hoạt động.

T07 không đổi lifecycle Booking: intent chưa xác nhận vẫn ở sessionStorage theo `hugo_pending_booking_v1:<userId>`, tách khỏi auth localStorage. Logout không tự xóa intent chưa biết kết quả; account khác không được hiển thị form/confirmation của account trước. Trở lại đúng account trong cùng tab có thể retry cùng key. Chi tiết contract và giới hạn lưu trữ: [T06](HUGO_T06_BOOKING_REPORT.md).
