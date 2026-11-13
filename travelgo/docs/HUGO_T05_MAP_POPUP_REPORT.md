# T05 — Popup Leaflet an toàn

Ngày thực hiện **29/10/2026**, giờ Việt Nam; Windows/PowerShell tại `C:\Users\Danh\Downloads\HCH\DACN\travelgo`. HEAD nền `052531dfc77c4f289757794c0ee08b4d46e6af2e`; làm trên working tree chưa commit, giữ thay đổi T01–T04-B và Python/report có sẵn.

**Hoàn thành T05:** ba popup và ba divIcon dùng DOM nodes; text động không đi qua HTML parser. Frontend build exit0; Edge security/render **4/4 PASS**; chạy lại Edge T04-B với API/PostgreSQL thật **1/1 PASS**. Không thêm dependency, không sửa backend, API persistence, costing hoặc lifecycle.

Căn cứ: [scope T02](HUGO_6_WEEK_SCOPE.md), [T04-A](HUGO_T04_A_TRIP_REPORT.md), [T04-B](HUGO_T04_B_TRIP_REPORT.md), source hiện tại. Source finding và thử nghiệm dưới đây không phải bằng chứng website/dữ liệu người dùng đã từng bị khai thác.

## 1. Audit sink và nguồn dữ liệu

Tìm toàn bộ `frontend/src` bằng `rg` với `bindPopup|bindTooltip|divIcon|innerHTML|outerHTML|insertAdjacentHTML`: có **3 bindPopup +3 divIcon**, nằm ở ba file dưới đây. Không thấy bindTooltip hoặc thao tác innerHTML/outerHTML/insertAdjacentHTML trực tiếp khác trong source frontend. Leaflet vẫn có xử lý HTML nội bộ của thư viện; T05 chuyển đối số dữ liệu động sang HTMLElement.

| File / sink trước sửa | Field động và nguồn | Markup/icon cố định |
|---|---|---|
| `components/explore/MapView.tsx` / bindPopup | `Place.name` ở h4 và alt, `heroImage` ở src, `city`, `category`, `priceFrom`, `bayesianRating`. Dữ liệu public places/recommendation API; Place có thể do Partner tạo/cập nhật | div/img/h4/p/span, style, chữ Bayesian, dấu phân cách |
| MapView / divIcon | `rating.toFixed(1)`; selection boolean từ UI; category chỉ chọn một class màu cố định | Hình pin, ngôi sao, ring/class màu trong allowlist cục bộ |
| `pages/TourPlannerPage.tsx` / bindPopup | `dayNumber`, `timeSlot`, activity `title`, `description`, `estimatedCostVND` từ itinerary generate/template/state client. Tên/mô tả có thể bắt nguồn Place name/summary của Partner | Nhãn ngày/chi phí, bố cục/style |
| TourPlanner / divIcon | dayNumber, vị trí activity trong ngày | Màu từ DAY_COLORS cục bộ, vòng tròn 28px |
| `pages/TripDetailPage.tsx` / bindPopup | Activity `title`, `description` trong GET Trip, gồm lịch lưu từ Planner/custom/legacy | Hai nhãn đã ghé/dự kiến và màu cố định; boolean lấy từ projection T04-B |
| TripDetail / divIcon | dayNumber; trạng thái từ `trip.progress.checkedActivityIds.includes(act.id)` | Dấu ✓ hoặc tiền tố N, vòng tròn 30px, hai màu cố định |

Đường Partner được kiểm tại `backend/src/controllers/partnerResourceController.ts` (placeFields/createPlace/updatePlace) và `services/placeService.ts`: name/summary/description/city/heroImage được chấp nhận trong nội dung Place. Việc có approval/public visibility không làm chuỗi thành HTML đáng tin. Không thay validation Partner trong T05.

Attribution OpenStreetMap là HTML/link literal cố định, không nội suy API; giữ nguyên. Không có link động trong ba popup hiện tại. React sidebar/timeline và các nội dung ngoài bản đồ không được tuyên bố đã audit toàn bộ bởi task này.

## 2. Thay đổi nhỏ và chính sách URL

Helper mới `frontend/src/utils/mapPopup.ts` tạo element bằng `document.createElement`, nội dung bằng `textContent`, style qua DOM CSS API. `bindPopup` và `divIcon.html` nhận HTMLElement. Tên, mô tả, thành phố, category/timeSlot, nhãn ngày, số tiền/rating đều là plain text; không hỗ trợ rich text trong popup.

Ảnh Explore đặt `alt` và `src` bằng DOM property. `safeMapUrl`:

- Chấp nhận URL tuyệt đối có `http://` hoặc `https://`, không phân biệt hoa/thường; dùng `new URL` kiểm tra và chuẩn hóa.
- Chấp nhận đường dẫn nội bộ bắt đầu bằng một `/`, resolve theo origin frontend; phải giữ cùng origin. Query/hash trên URL hợp lệ được giữ.
- Từ chối URL rỗng/sai kiểu/sai cấu trúc, `javascript:`, `data:`, `vbscript:`, `file:`, `blob:` và mọi scheme khác; không nhận protocol-relative `//host`, bare relative `images/a.png` hoặc hash-only.
- Từ chối backslash, C0 control characters và DEL trước parse; trim khoảng trắng thường ở hai đầu. Không ghép URL vào chuỗi HTML.
- Dấu nháy trong HTTP(S) URL không tạo attribute: URL được chuẩn hóa rồi gán property. Không nhầm mọi dấu nháy với protocol nguy hiểm.
- URL bị từ chối: không đặt src. Ảnh tải lỗi: bỏ src bằng listener DOM một lần, giữ alt là tên Place. MapView trước task không có fallback image asset; giữ fallback alt text hiện có, không tạo data URL/ảnh giả hoặc dependency mới.

HTTP(S) được cho phép theo yêu cầu, không có host allowlist/proxy ảnh mới. Không tuyên bố URL đã được kiểm nội dung từ xa. Nếu thêm link từ dữ liệu sau này phải áp dụng policy trước khi đặt href; hiện không có dynamic link cần sửa.

Giữ nguyên onClick/selection/flyTo, fitBounds, tọa độ, DAY_COLORS, polyline, legend, formatCurrencyVND/Intl và projection check-in T04-B. Không thay ranking, pricing, GROUP_VND_V1, lodging, selectedPlaceIds hoặc legacy policy.

### Chiều cao bản đồ được sửa khi kiểm browser

Lần mở popup baseline cho thấy Planner và TripDetail có vùng map cao **0px**, marker nằm ngoài viewport. Rule `.leaflet-container { height:100% }` không nằm trong CSS layer ở `styles/index.css` thắng class Tailwind h-[480px]/h-[450px] trong container cha auto-height.

Đặt lại đúng chiều cao dự định bằng inline style **480px/450px** trên hai map containers; không đổi layout thiết kế, global CSS hay tile provider. Sau thay đổi này mới tái hiện được popup baseline của cả hai trang. Test cuối đo clientHeight lần lượt 480/450 và click marker thật thành công.

## 3. Tái hiện trước sửa và regression sau sửa

Payload chỉ nằm trong Playwright response fixtures, ví dụ tên tiếng Việt có dấu nháy, `&`, `<b>đẹp</b>` và `<img src='/t05-missing' onerror='window.__popupProbe++'>`. Mô tả cũng có markup/event handler vô hại. Handler chỉ tăng biến đếm trong trang test; không đọc token, không gửi dữ liệu, không lưu vào PostgreSQL/demo/người dùng.

**Trình tự baseline thực sự:**

1. Chạy suite ba trang trước sửa DOM: Explore có handler chạy; Planner/TripDetail timeout vì map 0px.
2. Chỉ sửa chiều cao, chưa sửa sink HTML, chạy lại cả ba: **3 FAIL**, exit1. Mỗi trang ghi `handlerExecutions=4`, `inlineHandlers=2`, `literalName=false`. Có cả sự kiện ảnh lỗi tự nhiên và dispatch error chủ động để không phụ thuộc timing mạng; số 4 không phải số cuộc tấn công độc lập.
3. Sau chuyển DOM: cả ba ghi **handlerExecutions=0, inlineHandlers=0, literalName=true**. Lượt đầu còn hai lỗi test khi chuyển marker: Leaflet giữ popup cũ trong fade animation khiến strict locator tạm khớp hai element. Planner và helper DOM đã PASS.
4. Test chờ count popup về 1 sau chuyển marker và 0 sau close; không sửa event flow ứng dụng hay bỏ assertion bảo mật. Lượt cuối **4/4 PASS**, exit0, 10,8 giây.

Đây là **frontend security test trên browser Edge thật, API/tiles được intercept**. Chứng minh sink cũ diễn giải fixture thành HTML và bản sửa hiển thị text; không chứng minh payload đã từng tồn tại trong DB hoặc đã khai thác Partner workflow thật.

| Test cuối | Kết quả/điều được kiểm |
|---|---|
| Explore | Popup thật hiển thị nguyên tên/city markup, tiếng Việt/dấu nháy/&/< >; không element/handler chèn thêm. Giá 123.000, ảnh và alt hợp lệ. Chọn card thứ hai mở popup đúng tên, có một marker selection ring; close rồi click marker mở lại |
| Planner | Click marker 1.1 mở popup thật; tên/mô tả nguyên văn, giá 123.000đ; timeline selection border, một polyline, title 1 Ngày 0 Đêm; map cao 480 |
| TripDetail | Click marker ✓: nhãn ĐÃ GHÉ THĂM, text nguyên văn; progress 1/2, nhãn VND cho cả nhóm/tổng123.000. Click marker N1 chuyển nhãn ĐIỂM DỰ KIẾN và tên đúng; map cao450 |
| Helper trong DOM browser thật | 14 input URL không hợp lệ đều bị từ chối, không src nguy hiểm, alt được giữ; 3 HTTP/HTTPS/internal hợp lệ được normalize. URL chứa dấu nháy không tạo event attributes; label marker và timeSlot có markup không tạo img. Ảnh hợp lệ decode thành công; ảnh lỗi giữ alt/bỏ src |

Mỗi fixture route ngoài allowlist bị trả500/ghi nhận; ba bài trang assert không có API route bất ngờ. Browser thực thi helper thật qua Vite, không dùng DOM mock. Không đếm từng assertion/input URL thành một test độc lập.

## 4. Edge T04-B với API/PostgreSQL thật

Chạy lại **nguyên** `frontend/e2e/t04b-trip.spec.ts`, không sửa test hoặc backend. Kết quả mới T05: **1/1 PASS**, exit0, toàn run17,9 giây (case4,1 giây).

Luồng: tạo fixture riêng qua API → Start qua UI → quyền GPS denied thật của browser context → check-in thủ công custom activity, request không geo → progress1/3 và33% → refresh → My Trips → reopen active/33% → Complete → refresh completed/33%. So GET và row DB giữ GROUP_VND_V1, motorbike, nights1, itinerary/day/activity/lodging amounts, tổng425, selectedPlaceIds; Complete không đổi financial snapshot.

Lần preflight đầu **exit1, ECONNREFUSED 127.0.0.1:5432**. `docker ps` cho thấy Linux engine chưa chạy. Khởi động Docker Desktop hiện có bằng `Start-Process ... -WindowStyle Hidden`; hai container travelgo_postgres/travelgo_pgadmin tự chạy lại. Không recreate/đổi Compose/project/volume.

Trước mọi fixture write: explicit DB **travelgo_ai_m0_test**, host127.0.0.1, port5432, NODE_ENV=test, ALLOW_TEST_DB_WRITES=true, TEST_DATABASE_NAME khớp, DB_SSL=false; repo guard và durable sentinel `hugotravel-isolated-test-database-v1` hợp lệ. Migration11 đã tồn tại, checksum so với file tại workspace:

```text
90c42676606d4d5e7458edde139b9c5b945dd3ca0d574490a581ad6bcd98a034
```

Không apply migration/seed/reset. Test tự guard/sentinel lại trước fixture và cleanup, chỉ xóa Trip của user fixture vừa đăng ký và chính user đó. Read-only audit trước/sau test:

| Dữ liệu kiểm | Trước | Sau cleanup |
|---|---|---|
| Trip count | 27 | 27 |
| User count | 98 | 98 |
| Fingerprint toàn bộ row Trip, sắp theo id | `49f0b5989571b0b7ee227308faf893cd` | `49f0b5989571b0b7ee227308faf893cd` |

SQL fingerprint T05: `SELECT count(*)::int AS trips, md5(string_agg(row_to_json(t)::text, '' ORDER BY id)) AS fingerprint FROM trip_sessions t`. Đây là cặp đo mới trước/sau cùng biểu thức; không so giá trị với fingerprint báo cáo cũ dùng cách serialize/aggregate khác. Không xuất nội dung row/password; không suy luận users content bất biến chỉ từ count. Không kết nối travelgo_dev làm DB test.

## 5. File thay đổi

| File | Nội dung |
|---|---|
| `frontend/src/utils/mapPopup.ts` — mới | DOM builders + URL policy |
| `frontend/src/components/explore/MapView.tsx` | Dùng DOM cho marker/popup |
| `frontend/src/pages/TourPlannerPage.tsx` | DOM marker/popup, phục hồi chiều cao480 |
| `frontend/src/pages/TripDetailPage.tsx` | DOM marker/popup, phục hồi chiều cao450; giữ projection T04-B |
| `frontend/e2e/t05-map-popup.spec.ts` — mới | Bốn regression browser/DOM bằng response fixture |
| `frontend/playwright.popup.config.ts` — mới | Edge/Vite frontend-only, không khởi động backend/DB |
| `docs/HUGO_T05_MAP_POPUP_REPORT.md` — mới | Audit và bằng chứng |

Đối chiếu SHA256 **444 file baseline**: chỉ ba source frontend có sẵn ở bảng trên đổi; thêm bốn file mới, không xóa file baseline. Package/lockfile không đổi. Mọi backend, migration11, Python/report cũ, Docker, AI/manifest và các helper costing/modes/progress ngoài ba page này giữ nguyên.

## 6. Lệnh và exit code

Node v24.20.0, npm11.19.0; frontend dùng tsc + Vite6.4.4, Playwright1.64.0, Edge desktop headless. Cwd frontend trừ khi ghi khác.

| Lệnh/kiểm tra | Kết quả thực trong T05 |
|---|---|
| Root: `git status --short`, `git rev-parse HEAD`, SHA256 inventory | Exit0, ghi nhận dirty baseline trước sửa |
| Root: `rg -n 'bindPopup|bindTooltip|divIcon|innerHTML|outerHTML|insertAdjacentHTML' frontend/src` | Exit0, 6 vị trí, ba file |
| `npm.cmd run test:e2e -- --config playwright.popup.config.ts` trước DOM fix | Hai lượt exit1 như mục3; lượt sau sửa riêng chiều cao tái hiện đủ ba sink |
| Thử lọc hai tên Planner/TripDetail bằng regex OR qua npm/Windows shell | Exit1, shell hiểu pipe; không có test chạy từ lệnh lọc này; sau đó dùng full suite |
| `npm.cmd run build` sau thay đổi application source cuối | **Exit0**, tsc +Vite,1732 modules; về sau chỉ chỉnh test chờ fade animation và viết report |
| Popup suite sau DOM fix, trước sửa timing locator | Exit1; 2 PASS/2 FAIL do popup cũ đang fade, cả ba security witness đều sạch |
| Popup suite cuối, cùng lệnh trên | **Exit0, 4/4 PASS** |
| Backend cwd: Node pg read-only audit + repo guard/sentinel/migration checksum/fingerprint | Đầu tiên exit1 do Docker tắt; sau bật Docker **exit0 trước/sau** T04-B Edge |
| `Start-Process -FilePath "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe" -WindowStyle Hidden` | Exit0; `docker ps -a --format "{{.Names}} {{.Status}} {{.Ports}}"` sau đó exit0 |
| T04-B Edge: lệnh dưới | **Exit0, 1/1 PASS**, real API/DB |
| Root: `git diff --check -- frontend docs/HUGO_T05_MAP_POPUP_REPORT.md` và hash diff cuối | Exit0; chỉ cảnh báo chuyển LF/CRLF nếu có |

Biến process cho **riêng** real DB regression (không sửa .env, không in secret):

```powershell
$env:NODE_ENV='test'
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='5432'
$env:DB_NAME='travelgo_ai_m0_test'
$env:TEST_DATABASE_NAME='travelgo_ai_m0_test'
$env:ALLOW_TEST_DB_WRITES='true'
$env:DB_SSL='false'
$env:PLAYWRIGHT_BACKEND_PORT='5114'
$env:PLAYWRIGHT_FRONTEND_PORT='3114'
npm.cmd run test:e2e -- e2e/t04b-trip.spec.ts
```

Security suite dùng config riêng frontend port3125, không cần các biến DB. Backend compiled/dist T04-B được tái sử dụng vì source/backend không đổi; không gọi đó là build backend mới. Baseline T04-A/T04-B ngày28/10 (unit35/35 và9/9, HTTP/DB11 và12 nhóm, planner regressions) nằm trong báo cáo trước, **không phải test vừa chạy T05**. Không chạy lại backend suites, train hoặc DB migration khi source liên quan không bị tác động.

## 7. Giới hạn và điểm dừng

- Browser đã kiểm Edge desktop headless; chưa mobile, Firefox/Safari hoặc kiểm hình thức bằng tay trên mọi độ rộng màn hình.
- Security test intercept API và tile/ảnh để cô lập render. Không test persistence payload bảo mật, không lưu payload vào database; không coi response fixture là bằng chứng ownership/Partner approval/PostgreSQL.
- T04-B Edge dùng real auth/API/test DB, không phải security fixture; các kiểm concurrency HTTP/DB đầy đủ là baseline T04-B, không chạy lại trong T05.
- Tile provider/attribution không đổi. Test dùng ảnh tile fixture nên không chứng minh khả dụng mạng của provider hiện tại. FlyTo handler giữ nguyên; test kiểm selection/popup/marker thực tế, không đo mọi frame/quỹ đạo animation.
- Không audit toàn bộ rich text/XSS ngoài ba bản đồ, không thêm CSP/sanitizer, không sửa Booking/auth, lifecycle, công thức giá, routing, AI hay manifest.

**Dừng sau T05. Không còn blocker cho phạm vi này; chưa thực hiện T06/T07, push hoặc deploy.**
