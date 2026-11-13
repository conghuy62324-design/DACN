# T07 — Profile read-only và tài liệu auth đúng source

Ngày thực hiện: **30/10/2026**, giờ Việt Nam. Chỉ làm T07 theo CORE trong [scope 6 tuần](HUGO_6_WEEK_SCOPE.md), sau khi đọc [T06](HUGO_T06_BOOKING_REPORT.md) và source hiện tại.

**Kết quả:** frontend build PASS; **13/13 browser với API mock**, **2/2 browser với API/PostgreSQL thật mới cho T07**, **2/2 regression browser T06 chạy lại** PASS. Guard/sentinel/schema preflight PASS trên `travelgo_ai_m0_test`; cleanup và fingerprint 9 bảng không đổi, gồm **57 booking và 27 Trip**. Không migration mới, không sửa backend/auth format, không push/deploy.

## 1. Baseline và bảo toàn working tree

- Trước sửa đã chạy `git status --short`: **30 tracked modified, 38 untracked**. HEAD nền vẫn là `052531dfc77c4f289757794c0ee08b4d46e6af2e`; không reset/stash/checkout đè thay đổi.
- Có sẵn thay đổi T03/T04/T05/T06, Docker, `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py` và `docs/HUGO_AI_M2_B2_REPORT.md`. Cả backend/frontend package.json đã dirty trước T07; T07 không sửa chúng.
- Lưu diff trước sửa tại `%TEMP%/hugo-t07-before.diff` và SHA-256 của **456 file** trong `%TEMP%/hugo-t07-baseline.json` (loại `.git`, dependencies, build/test output). Đối chiếu cuối: **16 file cũ thay đổi đúng phạm vi bên dưới; 440 file cũ còn lại giữ nguyên hash; không file cũ nào bị mất**. T07 thêm 7 file.
- Một trong 16 file là bản bàn giao untracked đã có từ trước; chỉ đính chính auth có ngày, giữ các kết quả AI lịch sử. Toàn bộ 30 file tracked đã dirty trước T07 giữ nguyên nội dung. Booking/Planner/Trip/popup, migration11/12, Python/AI implementation, manifest và báo cáo T06 giữ nguyên hash.

## 2. Audit và lỗi đã tái hiện trước sửa

Đã đọc ProfilePage, Navbar, LoginPage, AuthContext, AuthService frontend/backend, api interceptor, ProtectedRoute/AppRouter, tokenService, auth middleware/routes/controller, role resolution và luồng Booking dùng chung AuthContext. Profile/menu đang có các đường dẫn thật; không thấy placeholder `href="#"` trong Navbar hoặc link Profile.

Regression hẹp viết trước khi sửa application source, chạy Edge/Vite bằng **API response mock**:

| Trường hợp | Actual trước sửa | Sau sửa |
|---|---|---|
| `/auth/me` trả user thiếu phone | Không có “Chưa cung cấp”; Profile dùng fallback phone từ source | Hiện “Chưa cung cấp”; không form/input/save |
| Giữ response bootstrap `/auth/me` của A, đăng nhập B thành công, rồi trả A | Cache user.id bị ghi đè từ B thành A | B vẫn là user/cache hiện tại |
| Giữ request Favorites của A, logout và login B, rồi trả 401 của A | Token phiên B bị xóa thành null; mất Profile B | Request cũ bị reject, phiên B giữ nguyên |

Lượt đầu **0/3 PASS, exit1**; case bootstrap dừng ở timeout tìm menu B. Sau đó chỉ làm rõ assertion test, chờ response và kiểm storage trực tiếp, **vẫn 0/3 PASS, exit1 trước mọi sửa application source**: nhận user.id A thay vì B, token B bị null. Không gọi đây là auth E2E thật hoặc lỗi backend đã tái hiện. Các log baseline giữ ở `%TEMP%/hugo-t07-baseline-browser.log` và `hugo-t07-baseline-browser-refined.log`.

Các phần fake save/banner, 3 chuyến, 450 điểm, Hạng Vàng, nhãn thành viên thân thiết, ảnh portrait fallback được xác định khi đọc source; không có thử nghiệm ghi profile backend vì endpoint đó không tồn tại. Không tuyên bố đã tái hiện một thao tác lưu DB giả.

## 3. Profile, session và điều hướng cuối cùng

- Profile **chỉ xem**, dùng trực tiếp `user` trong AuthContext; không sao chép name/phone sang state form. Họ tên/email/điện thoại và roles cập nhật theo identity đã xác minh. Thiếu phone hoặc chuỗi trắng hiện “Chưa cung cấp”.
- Xóa handleSave giả, nút lưu, banner thành công, fallback số điện thoại, thống kê 3/450/Hạng Vàng và nhãn loyalty. Xóa lời hứa điểm thưởng ở phần giới thiệu Login.
- Role labels: CUSTOMER → Khách hàng, PARTNER → Đối tác, SUPER_ADMIN → Quản trị viên; nhiều role hiển thị đủ. Avatar có thì dùng avatar từ user; thiếu thì dùng biểu tượng User ở cả Profile và nút tài khoản Navbar.
- Có thông báo “Hồ sơ hiện chỉ hỗ trợ xem.”, các giá trị là text/definition list. Giữ links `/bookings`, `/favorites`. Navbar giữ link Profile, Trip, Booking, admin/partner/become-partner theo điều kiện role hiện có; bổ sung tên truy cập nút tài khoản và icon Favorites mobile, wrap tên dài trong menu mobile. Không thêm link tính năng chưa làm.
- AuthContext bắt đầu `user=null/loading=true`, `/auth/me` xác minh xong mới render dữ liệu riêng tư. Version của phiên + token đối chiếu + cleanup effect ngăn bootstrap cũ ghi đè login/logout/401 mới; auth response bị supersede không được persist. Logout/401 xóa user trong bộ nhớ và kết thúc loading.
- Interceptor chỉ clear phiên khi request nhận 401 dùng đúng token đang lưu. 401 của token A không xóa phiên B; caller vẫn nhận lỗi. Không đổi policy RBAC hoặc routes; CUSTOMER không vào admin/partner; SUPER_ADMIN đơn lẻ không tự được thêm role PARTNER.
- Booking chưa rõ kết quả vẫn lưu intent theo userId trong sessionStorage như T06. Không xóa key khi logout; account khác không thấy form/confirmation cũ. Khi A đăng nhập lại trong cùng tab, retry dùng key đã giữ. Không sửa bất kỳ source Booking nào.

## 4. Contract auth và đính chính tài liệu

[HUGO_AUTH_CONTRACT.md](HUGO_AUTH_CONTRACT.md) là contract hiện hành, có đường dẫn source đối chiếu:

- Access token hai phần `base64url(JSON(payload)).base64url(HMAC-SHA256(encodedPayload))`, có `iat/exp`, mặc định 8 giờ; **không phải JWT ba phần**. Giữ nguyên tên `JWT_SECRET`/`JWT_EXPIRES_SECONDS`, không đổi thuật toán/định dạng.
- Frontend lưu `travelgo_token` và JSON `travelgo_user` ở localStorage. Reload gọi GET `/api/auth/me`; không dùng user cache chưa xác minh để hiển thị Profile. Bootstrap thất bại, kể cả lỗi mạng, vẫn clear phiên theo behavior hiện có.
- Token sai/hết hạn trả 401 theo middleware; frontend clear đúng phiên và chuyển ProtectedRoute về login. 403 không tự logout. `/auth/profile` là GET alias của `/auth/me`.
- Chưa refresh-token endpoint, profile update endpoint hoặc server-side revocation/denylist. Logout client không thu hồi token server; kiểm API thật trong T07 thấy token A vẫn gọi `/auth/me` được sau local logout.
- Sửa tài liệu hiện hành: README, API_DOCUMENTATION, SYSTEM_ARCHITECTURE, HUGO_AI_CURRENT_STATUS_AND_CHATGPT_HANDOFF.
- Chỉ thêm đính chính có ngày/liên kết, giữ nguyên phần thân và kết quả test lịch sử của Master Plan, TEST_REPORT, M1 Task4/Task5, M3-A/M3-C/M3-D. Master Plan còn dòng/sơ đồ JWT và refresh-token trong snapshot lịch sử, được đánh dấu sai bằng ghi chú đầu tài liệu; không coi chúng là contract đang triển khai.
- Không thay những chỗ “JWT” chỉ là ví dụ credential bị cấm export trong báo cáo data/privacy; đó không phải tuyên bố hệ thống có JWT/refresh token. Không ghi token hoặc secret thật vào báo cáo.

## 5. Kiểm thử thực chạy và lệnh

Các lệnh frontend chạy tại `frontend/`, PowerShell, `npm.cmd`. Vite/esbuild và Edge cần subprocess ngoài sandbox Windows; các lần escalation thực hiện được. Không có bước bị chặn bởi approval.

| Lệnh/lượt | Exit | Kết quả và loại bằng chứng |
|---|---:|---|
| `npm.cmd run test:e2e -- --config playwright.profile.config.ts` trước sửa, 3 case | 1 | 0/3; browser/API mock, lỗi như mục 2 |
| Cùng lệnh, refine assertion trước sửa | 1 | 0/3; xác nhận user A ghi đè B và 401 A xóa phiên B |
| Cùng lệnh sau sửa, suite mở rộng | 0 | **13/13**, 21.7s; browser mock |
| `npm.cmd run test:e2e -- --config playwright.profile-api.config.ts t07-profile.api.spec.ts` | 0 | **2/2**, 19.1s; Edge + API + PostgreSQL thật |
| `npm.cmd run test:e2e -- --config playwright.profile-api.config.ts t06-booking.spec.ts` | 0 | **2/2**, 7.9s; regression T06 thật |
| `npm.cmd run build` | 0 | `tsc && vite build` PASS, Vite 6.4.4, 1733 modules; build 2.54s |
| `npm.cmd run test:e2e -- --config playwright.profile-api.config.ts` sau tách project fixture pool | 0 | **4/4**, 17.0s; T07 2 + T06 2, cleanup từng suite PASS |
| `git diff --check` | 2 | Whitespace có sẵn ở `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py:42`; giữ nguyên ngoài scope |
| `git diff --check -- <15 tracked file T07>` | 0 | Diff tracked T07 sạch |
| So SHA-256 với baseline 456 file | 0 | 440 file không đổi; 16 file thay đổi đúng scope; 0 mất |

Một lượt chẩn đoán dùng `git -c core.autocrlf=false diff --check` exit1 tạo cảnh báo CRLF trên working tree Windows; đã bỏ override và kiểm lại theo cấu hình repo như bảng trên. Không normalize line ending hoặc sửa whitespace ngoài scope. Các lệnh đọc thử hai đường dẫn sai (`backend/migrations`, `components/booking/BookingModal.tsx`) không tìm thấy file; đã dùng `rg --files` để đọc đường dẫn đúng, không ảnh hưởng kết quả build/test.

### 13 case browser mock mới

- Ba regression baseline; delayed `/auth/me` ẩn identity cache, reload lấy me mới, current-session 401 clear Profile; logout không bị bootstrap trễ phục hồi lại phiên.
- Tám tổ hợp desktop/mobile × CUSTOMER/PARTNER/SUPER_ADMIN/cả ba role: Profile role đúng, avatar thiếu có biểu tượng, không editable controls; Bookings/Favorites đi được và quay lại; role menu đúng; route trái quyền về `/403`; tên/email dài không làm overflow ngang. Viewport **1440×900** và **390×844**.
- Các token/API responses của suite này là fixture tổng hợp. Không kết luận backend auth/DB PASS từ suite mock; không thêm unit chỉ để kiểm label.

### Hai case browser/API/PostgreSQL mới và regression T06

- Đăng ký fixture riêng qua API, đăng nhập bằng form thật, Profile đúng tên/email/phone/roles; reload thực gọi `/auth/me` 200 đúng user ID; logout xóa cache; login B thiếu phone/avatar hiện empty/icon; reload B không thấy A. Các links Profile → Booking/Favorites hoạt động trên cả desktop và mobile.
- Dùng token cố ý sai khi reload → `/auth/me` **401 thật**, Profile không giữ identity cũ, redirect login và xóa storage. Không mock success/auth response trong suite thật.
- Trên desktop: POST booking của A qua `route.fetch()` gọi API thật; xác nhận DB đã có booking rồi mới abort response. Logout A → login B: form dùng B, không có notes/confirmation A, không tạo booking B. Quay lại A: notes và pending alert còn, retry **cùng key/ID/code**; DB **1 booking, 1 history, capacity 20→18, 0 event** theo opt-out; history UI có booking code.
- Chạy lại nguyên file T06: mất response sau commit, block submit lặp, đóng/mở/reload/caller khác giữ intent, confirmation dùng giá server, history persist, payload mới đổi key; đổi payload rồi sửa lại dùng lại key cũ. Hai case PASS là **kết quả chạy mới trong T07**, source test T06 không đổi.
- Đã xem ảnh thật của Profile B desktop/mobile; text/links nằm trong viewport, không lưu hoặc stats giả. Ảnh cuối ở output Playwright, bản copy lượt đầu `%TEMP%/hugo-t07-screenshots/`; đây là dữ liệu fixture, không ảnh tài khoản thật.

Log mới: `%TEMP%/hugo-t07-mock-browser.log`, `hugo-t07-api-browser.log`, `hugo-t07-t06-regression.log`, `hugo-t07-final-api-regression.log`, `hugo-t07-frontend-build.log`. Các số test ở đây là case duy nhất; không cộng hai lượt chạy cùng test thành coverage mới.

## 6. DB guard, schema, cleanup và fingerprint

Env cho các lệnh có DB (không đưa credential vào báo cáo):

```powershell
$env:NODE_ENV='test'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5432'
$env:DB_NAME='travelgo_ai_m0_test'
$env:TEST_DATABASE_NAME='travelgo_ai_m0_test'
$env:ALLOW_TEST_DB_WRITES='true'
$env:DB_SSL='false'
$env:PLAYWRIGHT_BACKEND_PORT='5117'
$env:PLAYWRIGHT_FRONTEND_PORT='3117'
npm.cmd run test:e2e -- --config playwright.profile-api.config.ts
```

`t07-preflight.ts` gọi guard test write opt-in + exact DB name + sentinel, so checksum migration11/12 trên DB với file SQL và xác nhận hai cột `trip_sessions.planner_metadata`, `bookings.request_fingerprint` trước fixture writes. Guard tiếp tục chạy trong beforeAll và cleanup. **Không apply migration nào trong T07.** Backend chạy dist hiện có từ T06, backend source không đổi; không chạy lại backend build/full suite.

T07 dùng helper BookingFixtures hiện có nhưng **ID mới riêng** cho business/tour/ticket/hotel/restaurant và 4 user mới mỗi lượt T07. Không mutation tài khoản seed. Cleanup theo các user/resource/booking ID fixture; history và dữ liệu liên quan theo FK cascade. T06 regression tự cấp ID riêng và cleanup riêng. Không reset/seed/drop database/xóa volume.

Trước/sau mỗi suite dùng cùng biểu thức T06, có cả booking/inventory và 27 Trip:

```sql
SELECT count(*)::int AS count,
       md5(COALESCE(string_agg((to_jsonb(t)-'request_fingerprint')::text,
                              '' ORDER BY id),'')) AS fingerprint
FROM <allowlisted_table> t;
```

| Bảng | Count trước = sau | MD5 trước = sau |
|---|---:|---|
| bookings | 57 | `112ded6778062eee27d288a068d45497` |
| booking_status_history | 107 | `39b28ee0370b89a85370bbe0c2e217e5` |
| businesses | 24 | `008593bf93b7d16841530289628a43a7` |
| tours | 17 | `2ee9c044aec5559be2883c08f6caac1e` |
| tickets | 25 | `ad2e552404072f6427569c92753e9aab` |
| places | 22 | `2a4427a001a0d3f7b5e299aa8a476629` |
| trip_sessions | 27 | `ac8a616d27f65e93415205e3284154d1` |
| users | 98 | `9368dcfd40b05caed5fbe16748e89b43` |
| user_events | 126 | `2374e7a8958af561478aef77acfbbff0` |

Đây là số **đo lại trong T07**, không chỉ sao kết quả T06. Logs preflight/before/after của mọi lượt thật đều cùng fingerprint. Biểu thức loại `request_fingerprint` để giữ tương thích phép đo T06; không gọi đây là checksum bao phủ cột đó hoặc toàn bộ mọi bảng DB.

## 7. File thay đổi trong T07

| Nhóm | File |
|---|---|
| UI/read-only | `frontend/src/pages/ProfilePage.tsx`, `frontend/src/components/common/Navbar.tsx`, `frontend/src/pages/LoginPage.tsx` |
| Session tối thiểu | `frontend/src/context/AuthContext.tsx`, `frontend/src/services/api.ts` |
| Hướng dẫn hiện hành | `README.md`, `docs/API_DOCUMENTATION.md`, `docs/SYSTEM_ARCHITECTURE.md`, `docs/HUGO_AI_CURRENT_STATUS_AND_CHATGPT_HANDOFF.md` |
| Đính chính lịch sử, chỉ thêm ghi chú | `docs/HUGO_INTELLIGENCE_MASTER_PLAN.md`, `docs/TEST_REPORT.md`, `docs/HUGO_AI_M1_TASK4_REPORT.md`, `docs/HUGO_AI_M1_TASK5_REPORT.md`, `docs/HUGO_AI_M3_AUDIT_AND_MVP_PLAN.md`, `docs/HUGO_AI_M3_C_EXPLORE_UI_REPORT.md`, `docs/HUGO_AI_M3_D_PLACE_TO_ITINERARY_REPORT.md` |
| Mới: tài liệu | `docs/HUGO_AUTH_CONTRACT.md`, `docs/HUGO_T07_PROFILE_AUTH_REPORT.md` |
| Mới: kiểm thử/config | `frontend/e2e/t07-profile.mock.spec.ts`, `frontend/e2e/t07-profile.api.spec.ts`, `frontend/e2e/t07-preflight.ts`, `frontend/playwright.profile.config.ts`, `frontend/playwright.profile-api.config.ts` |

## 8. Giới hạn và điểm dừng

- Không xây profile update, thống kê/loyalty, refresh/revocation hoặc sửa auth backend. Định dạng token, ENV và phân quyền server giữ nguyên. Không đổi localStorage sang cookie hoặc thêm đồng bộ session nhiều tab.
- Chưa chạy hết hạn tự nhiên sau 8 giờ, ma trận token-parser/signature backend hoặc mọi browser/device; hành vi expiry được mô tả từ source, không gắn nhãn test runtime mới. 401 sai token thật và 401 có response trễ mock đã kiểm.
- Role/menu và redirect trái quyền trong T07 là **mock browser**; không tạo Partner/Admin thật hay chạy lại full backend RBAC. Các PASS unit/HTTP/PG concurrency/cancel/reject của T06 trong báo cáo trước vẫn là **lịch sử**, không khai là T07 vừa chạy lại. T07 chỉ chạy hai browser regression liên quan và luồng đổi account mới.
- Không kiểm Profile update vì không có tính năng đó; không sửa toàn bộ dashboard/footer/policy/social links ngoài liên kết trực tiếp Profile/Navbar. Chưa kiểm lỗi tải avatar URL có sẵn; nhánh thiếu avatar đã kiểm.
- Không thay Planner, Trip, Booking, popup T05, migration11/12, Python/AI hoặc manifest. Không train, push, deploy. **Dừng sau T07.**
