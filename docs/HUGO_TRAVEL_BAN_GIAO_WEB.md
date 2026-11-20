# BÀN GIAO PHÁT TRIỂN WEBSITE HUGO TRAVEL
**DACN | TravelGo | Phạm vi WEB – UI/UX – ADMIN – CUSTOMER – PARTNER**  
Phiên bản 1.0 · 20/11/2026 · Tài liệu giao việc cho thành viên và AI lập trình

## 1. Mục tiêu, phân công và giới hạn

Hoàn thiện HuGo Travel thành website du lịch có giao diện thương mại chuyên nghiệp, chức năng hoạt động thật từ React đến Node.js và PostgreSQL/PostGIS. Khách có thể tìm khách sạn, xem phòng, đặt/hủy theo điều kiện; đối tác tự quản lý dữ liệu; Admin quản trị nội dung và kiểm duyệt. Sau bàn giao, người phụ trách AI sẽ tích hợp Agent vào dữ liệu nghiệp vụ đã hoàn thiện.

- **Thành viên WEB:** phụ trách toàn bộ bốn phân hệ trong tài liệu này, cả frontend, API nghiệp vụ và schema bổ sung được duyệt; sửa các lỗi thuộc web, kiểm thử và bàn giao source. Có quyền đề xuất cải tiến nhưng không tự thay kiến trúc hoặc mở rộng phạm vi AI.
- **Người phụ trách AI (chủ dự án):** giữ toàn quyền Agent Core V7.0, Qwen/Ollama, ngôn ngữ, memory, knowledge, review intelligence, recommendation/Planner reasoning và tích hợp AI 21.40. Tiếp nhận dữ liệu website sau khi WEB hoàn thành.
- **Phần giao nhau:** router/layout, auth, catalog, Booking, review, geography, API dùng chung và schema cần thay đổi tương thích; mọi thay đổi có thể ảnh hưởng AI phải được người phụ trách AI review trước khi merge. Không chỉnh AI để chữa lỗi website.
- **Ngoài scope lần này:** chạy/huấn luyện Qwen, worker Internet, triển khai VPS, thanh toán tiền thật, API bản đồ tính phí và mở rộng thuật toán Planner. Bản đồ/chỉ đường nâng cao để 21.41; chuẩn bị địa chỉ/tọa độ hợp lệ ngay bây giờ. Không hứa cung cấp phòng thật khi hệ thống chưa được kích hoạt production.

## 2. Hiện trạng và tài liệu bắt buộc đọc

Repository: https://github.com/conghuy62324-design/DACN.git; thư mục ứng dụng `travelgo`. Dùng branch/commit bàn giao được xác nhận thực tế, không mặc định GitHub đã có hết source local. Stack hiện hành React/Vite, Node.js/TypeScript, PostgreSQL/PostGIS, Docker; giữ framework, auth và API hiện có.

| Mốc | Kết quả được báo cáo | Ý nghĩa cho người nhận |
|---|---|---|
| 21.37 | Agent Core V7.0 model-OFF desktop/mobile PASS | Đóng băng AI; Qwen chưa verified, worker deferred, LIVE READY NO |
| 21.38-A | Domain 37/37; migration 18 được thiết kế | Có nền tảng Hotel, không tự tạo domain thứ hai |
| 21.38-B | Native 52 bảng/18 migration, 14 invariant + 3 attribution; 25 bản ghi HTTP/browser PASS cô lập | Có quản lý Partner/Admin, media, giá/tồn, publish; RBAC hiện hành đã kiểm |
| 21.38-C | Commercial search, UI trang chủ/search, desktop/mobile PASS cô lập | Tái sử dụng search, bộ lọc, URL, freshness |
| 21.38-D | HotelStay Booking, hủy, concurrency, idempotency, rollback, snapshot PASS cô lập | Không viết lại nghiệp vụ đã có |
| 21.38-D-UI | Bị gián đoạn vì quota Codex; chưa có báo cáo hoàn thành | Audit working tree, tiếp tục hình ảnh & UI; owner chưa duyệt |

Đọc theo thứ tự (đường dẫn tương đối từ `travelgo/`):
- `docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md`: mục 21.37, 21.38-A/B/C/D, D-UI nếu đã có; không cần đọc toàn bộ lịch sử AI.
- `docs/HUGO_HOTEL_DOMAIN_FOUNDATION.md`, `docs/HUGO_HOTEL_CUSTOMER_SEARCH.md`, `docs/HUGO_HOTEL_STAY_BOOKING.md`.
- `docs/HUGO_HOTEL_COORDINATE_COMPATIBILITY_PROPOSAL.md`, `docs/HUGO_HOTEL_UI_VISUAL_REDESIGN.md`, `docs/HUGO_CURRENT_TASK_HANDOFF.md` nếu có trong checkout; thiếu file thì ghi blocker, không bịa nội dung.
- `docs/evidence/travelgo-ai-agent-core/release-v70-20261118/`: freeze, route inventory, manifests; `hotel-management-2138b-20261118/`, `hotel-search-2138c-20261119/`, `hotel-stay-2138d-20261119/`: đọc evidence cần thiết, không chia sẻ credentials/raw private records.

Master 21.37 ghi 48 route patterns, 3 layouts, 34 shared TSX tại thời điểm audit. Một số AdminSectionPage (businesses/bookings/users/content/reports/settings) và PartnerSectionPage từng là placeholder. Phải audit lại source vì phase B–D đã bổ sung chức năng; không coi có menu đồng nghĩa đã có API hoạt động.

Nguồn hiện trạng: Master snapshot 19/11/2026 06:27:35 (tên file upload `TRAVELGO_AI_AGENT_CORE_MASTER_REPORT(20261119-062735).md`), ba tài liệu Hotel phía trên và ảnh/thông báo gián đoạn ngày 20/11. Đây là báo cáo đã đọc, chưa phải kiểm chứng độc lập trên máy người nhận. Mọi chức năng bên dưới là yêu cầu hoàn thiện, không mặc định đã tồn tại.

## 3. Chuẩn thiết kế chung và phần D-UI đang dở

Tham khảo https://www.ivivu.com/ và https://www.booking.com/index.vi.html cùng ảnh mẫu chủ dự án đã gửi. Kết hợp trang chủ, mosaic điểm đến và bố cục hạng phòng của iVIVU với tìm kiếm, bộ lọc, gallery, đánh giá của Booking.com. Giữ thương hiệu HuGo Travel, không sao chép logo/source/ảnh/dữ liệu kinh doanh. Nếu site tham khảo chặn truy cập, dùng ảnh mẫu, không bypass.

- Navy chủ đạo (gợi ý #083B63), cam CTA (#FF7900), nền trắng/xám nhạt (#F4F7FA), chữ navy đậm; font hỗ trợ tiếng Việt (Be Vietnam Pro/Inter hoặc font hiện hữu có quyền dùng). Header và footer nhất quán, chiều rộng desktop khoảng 1200–1320px, spacing hợp lý; hạn chế shadow dày, gradient, card lồng card và animation nặng.
- Hero phong cảnh ảnh chụp lớn, sắc nét (desktop khoảng 400–480px; điều chỉnh viewport), tiêu đề ngắn dễ đọc. Thay hình SVG phong cảnh và WebP sinh từ SVG dùng làm ảnh chính. Destination mosaic có ảnh đúng địa danh, chữ đặt trên ảnh, không chỉ các thẻ nhỏ. Ưu tiên ảnh thật có giấy phép; ảnh photorealistic minh họa phải ghi nhãn rõ, không giả ảnh cơ sở thật.
- Ảnh hợp pháp từ đối tác, nguồn mở có license phù hợp hoặc tài nguyên sở hữu. Manifest: tác giả, nguồn, license, attribution, mục đích, địa danh/illustrative, checksum, kích thước; không watermark, hotlink ngẫu nhiên, scrape Booking/iVIVU. Lưu local static assets hoặc managed media, tối ưu WebP/AVIF/JPEG, responsive sizes, alt, lazy load ngoài hero, fallback không vỡ layout. Không đưa font/tài nguyên không có quyền phân phối vào repo.
- UX: tiếng Việt nhất quán; loading/empty/error/disabled/focus/keyboard, touch targets, thông báo lỗi gần trường; date-range calendar và guest selector rõ ràng. Consent HuGo Intelligence không che CTA nhưng không bỏ consent hoặc đồng ý mặc định. Desktop 1440/1366, tablet 768, mobile 390/360; kiểm bằng ảnh chụp browser thật và thao tác thực tế.
- D-UI: Codex đã audit SVG, chọn lọc ảnh, bắt đầu sửa HotelDateRange và scripts evidence; chưa xác minh phần nào hoàn tất. Giữ staged/unstaged/untracked, không Undo/reset. Approval cũ chỉ cho tái sử dụng nguyên tọa độ fixture C/D trong target UI SYNTHETIC cô lập, không bản đồ/khoảng cách; không mở rộng sang máy thành viên hoặc quyền ghi thật nếu chưa cấp scope mới. Trang mới phải được chủ dự án trực tiếp xem và duyệt, không chỉ build PASS.

## 4. PHÂN HỆ 01 — Trang chủ và website công khai

### 4.1 Trang chủ chính và trang khách sạn
- Header: logo, Trang chủ, Khách sạn, Nhà hàng, Khám phá, Lịch trình, Trợ lý AI (giữ route hiện có), dịch vụ có thật, yêu thích, đăng nhập/account. Mobile menu dễ dùng; không tạo nút chết. Footer: giới thiệu, hỗ trợ, chính sách, đối tác, liên hệ được cấu hình thật.
- Hero quản trị được từ Admin: ảnh desktop/mobile, tiêu đề, mô tả, CTA, thứ tự, lịch hiển thị; search bar nổi bật. Có thể dùng slider điều khiển được, không bắt buộc auto-slide. Nếu thiếu nội dung hợp lệ, dùng fallback có quyền sử dụng.
- Search chung: địa điểm/tên khách sạn/tên đường, nhận–trả, số đêm, người lớn/trẻ em/tuổi trẻ, số phòng và phân bổ khách. Autocomplete registry hiện có, tiếng Việt dấu/không dấu, không trộn địa danh và tên đường trùng. Cho khám phá khi chưa chọn ngày, không nói còn phòng khi chưa kiểm.
- Điểm đến yêu thích trong nước dạng mosaic như mẫu: Phú Quốc, Đà Lạt, Vũng Tàu, Nha Trang, Đà Nẵng, Quy Nhơn, Phan Thiết, Phú Yên, Hà Nội, TP.HCM, Huế, Hội An, Sa Pa, Hạ Long theo registry/tài nguyên hợp lệ. Bấm ảnh đi đúng search và giữ criteria. Số lượng lấy eligible catalog; curated không được gọi là thống kê thịnh hành.
- Ưu đãi thật từ promotion đang hiệu lực; khách sạn nổi bật, khách sạn mới duyệt, các loại lưu trú, dịch vụ khác, giới thiệu AI và mục đã xem nếu có consent/contract. Admin quản lý nội dung/placement; giá xuất phát từ backend, không sửa trực tiếp trong banner. Không fake lượt bán, giá gạch ngang, review hoặc hotline.

### 4.2 Danh sách và bộ lọc
- Desktop: breadcrumb, search bar, tổng kết quả, sidebar 250–280px, cards ngang (ảnh trái, thông tin giữa, giá/CTA phải), sorting/pagination; mobile: filter drawer, cards dọc. Tên, ảnh, địa chỉ, khu vực, hạng sao có căn cứ, rating/count, tiện nghi, offer phù hợp, giá/đơn vị, ưu đãi/điều kiện, Xem phòng. Không review thì ghi chưa có.
- Bộ lọc kết hợp: khu vực/tên đường, giá, loại lưu trú, sao, điểm review, tiện nghi chung/phòng, hướng nhìn, phòng ngủ/tắm, sức chứa, bữa sáng, hoàn hủy, ưu đãi, availability. Chỉ bật điều kiện backend hỗ trợ. Thuộc tính phòng phải cùng room/rate đáp ứng, không ghép phòng rẻ và phòng view biển khác nhau. Sort theo cùng price basis; số lượng/phân trang thật.
- Giữ URL criteria, back/forward/reload, reset từng filter, cancel stale HTTP. Contract phase C dùng STAY_TOTAL khi chọn ngày; nếu muốn thêm giá/đêm phải thêm price basis rõ ràng và tương thích, không đổi ý nghĩa maxPrice cũ.

### 4.3 Chi tiết, phòng và đặt phòng
- Canonical `/places/:id`, compatibility `/hotels/:id`. Header tên/địa chỉ, anchor Tổng quan–Hạng phòng & giá–Tiện nghi–Quy định–Đánh giá. Album ảnh lớn + thumbnail + fullscreen, ảnh riêng từng hạng phòng. Địa chỉ và mô tả chi tiết; không hiển thị khoảng cách suy diễn. Bản đồ nâng cao deferred.
- Hạng phòng: diện tích, số phòng ngủ/tắm, giường, sức chứa, view biển/núi/thành phố/hồ/vườn, ban công, máy lạnh, TV, Wi-Fi, tủ lạnh, bếp, thiết bị, ảnh/nội thất và mô tả. Phân biệt tiện nghi chung và từng phòng; thiếu dữ liệu ghi chưa cung cấp. Rate plans: bữa sáng, thuế/phí, phụ thu, điều kiện hoàn hủy, giá theo đêm và tổng.
- Reuse flow D: chọn ngày/khách → chọn phòng/rate/promotion → checkout → login CUSTOMER → xem quote và policy → xác nhận chủ động → Booking/My Bookings → hủy hợp lệ. Không tạo đơn khi đọc trang/quote/login. Giá do server tính và kiểm lại; hết hạn/đổi giá phải lấy quote và xác nhận lại; không tự hold phòng.
- Giữ native allocation/idempotency/transaction/cancellation; không làm thanh toán thật, không giả paid/refunded, không thu dữ liệu thẻ. V1 chỉ hỗ trợ nhiều phòng cùng room type/rate. Không tự triển khai mixed-room nếu chưa duyệt contract. Dịch vụ ngoài Hotel giữ nghiệp vụ hiện có.
- Nhà hàng, Explore/điểm tham quan, tour/vé/blog và Planner: hoàn thiện UI, điều hướng và chức năng web thực sự có theo audit; không mở loại dịch vụ/transport mới chỉ để menu nhiều. Shared Planner UI canh lại layout ngoài vùng protected, logic/adapter AI không sửa.

## 5. PHÂN HỆ 02 — Admin/SUPER_ADMIN

Mục tiêu: người quản trị có thể vận hành website qua UI, không sửa file React/SQL tay để đổi nội dung. Dùng existing Admin layout, auth/RBAC, audit; mở rộng các placeholder thuộc scope đã xác nhận, không tạo Admin app thứ hai.

### 5.1 CMS trang chủ / nội dung website
- Banner/hero: danh sách, thêm/sửa, tải ảnh desktop/mobile, alt, title/subtitle, CTA (chỉ route/link an toàn), trạng thái, thứ tự, thời gian bắt đầu/kết thúc. Preview desktop/mobile trước publish; draft → publish/unpublish; revision, lịch sử và khôi phục phiên bản hợp lệ. Không cho nhập arbitrary HTML/script.
- Quản lý sections homepage: bật/tắt, sắp xếp, tiêu đề, điểm đến, loại hình lưu trú, featured hotels, bài viết, mục điều hướng, footer/liên hệ/SEO cơ bản. Featured chỉ tham chiếu existing eligible records; không duplicate catalog. Ảnh điểm đến, cover theo địa danh, rights/attribution, media reuse; không hard-code trong component.
- Ưu đãi: xem/lọc promotion theo thời gian, khách sạn, room/rate, hiệu lực. Admin quản lý placement/banner marketing và chiến dịch được phép, có thể duyệt/ẩn theo policy. Giá và điều kiện tính tiền do commercial service hiện có quản lý; không tự sửa rate của Partner trái quyền. Nếu cần quyền điều chỉnh giá quản trị, thiết kế permission riêng, lý do và audit, duyệt owner trước. Không fake discount/urgency; promotion hết hạn tự không eligible khi đọc.
- Publication dữ liệu CMS phải atomic, kiểm revision, thời gian server, role và input; public không thấy draft/archived. No-store/fresh retrieval hoặc invalidation sau commit. Test Admin đổi ảnh/tiêu đề/ưu đãi hợp lệ → trang chủ phản ánh dữ liệu mới sau reload, không build lại.

### 5.2 Quản trị vận hành
- Dashboard: số khách hàng, đối tác, listings, chờ duyệt, Booking theo trạng thái, review reports, lỗi vận hành; bộ lọc khoảng ngày và export dữ liệu tối thiểu nếu hỗ trợ. Metric từ DB, doanh thu/đã thu tiền chỉ khi có căn cứ payment; empty state thay số giả.
- Users/roles: tìm/lọc, xem trạng thái, quản lý active/suspend và role theo chính sách existing RBAC; không cấp SUPER_ADMIN tùy ý, không xem password/hash/token. Chặn tự hạ quyền Owner và thao tác vượt quyền; lý do và audit. Không sao chép tài khoản Owner sang môi trường dev.
- Partner applications: xem hồ sơ, Business, tài liệu cần thiết, duyệt/từ chối/yêu cầu bổ sung, trạng thái và thông báo. Quản lý Business/membership theo permission; suspend có ảnh hưởng public eligibility nhất quán. Không để Customer tự nhận role Partner.
- Hotel/catalog moderation: xem profile, địa chỉ, room, tiện nghi, media, policy và revision diff; duyệt đúng revision, từ chối có lý do, suspend/archive hợp lệ, giữ lịch sử. Quản lý các dịch vụ ngoài Hotel theo chức năng cũ.
- Booking oversight: tìm mã, hotel, Business, status, ngày; chi tiết snapshot và lịch sử; hỗ trợ xử lý ngoại lệ bằng existing authorized lifecycle, không chỉnh trực tiếp tồn phòng/tổng tiền, không xóa đơn. Admin không tự đánh dấu paid/refunded/completed trái contract.
- Reviews/reports: queue bình luận, ảnh, báo cáo vi phạm, publish/hide/reject theo policy; không chỉnh nội dung thay khách hoặc nâng rating. Audit ai, lúc nào, lý do; thay đổi visibility phải cập nhật public aggregate và invalidation/handoff cho AI.
- Settings: cấu hình website không nhạy cảm, nội dung điều khoản đã cung cấp, policy và thông báo; quản lý media. Không đưa secrets vào UI. Các menu quản trị AI (knowledge/source/candidate/language) giữ nguyên logic, không sửa hoặc tự duyệt dữ liệu AI.

## 6. PHÂN HỆ 03 — Tài khoản và trải nghiệm khách hàng

Tận dụng AuthContext/session/profile, Booking, Trip và favorites/review hiện có. Bố cục hiện đại: sidebar tài khoản desktop, menu/tab mobile, dashboard tóm tắt, trạng thái rõ và quick actions.

- Đăng ký, đăng nhập, đăng xuất, quên/đổi mật khẩu nếu có backend hợp lệ; xác minh email hoặc thêm quy trình reset có token ngắn hạn, chống enumeration và rate limit nếu được duyệt scope. Không fake email đã gửi. Giữ tài khoản Admin, phân quyền và bảo vệ session hiện có. Validation tiếng Việt, trạng thái lỗi/loading, show/hide password.
- Hồ sơ: avatar upload an toàn, tên hiển thị, email, SĐT, thông tin liên hệ cần thiết, tùy chọn ngôn ngữ/notification có data contract. Thay email/đổi mật khẩu yêu cầu xác thực lại nếu phù hợp. Không thu CCCD, thông tin thẻ hoặc dữ liệu không cần thiết; không tự cập nhật profile từ Booking contact.
- Dashboard cá nhân: chuyến đi sắp tới, Booking sắp đến, đơn gần đây, điểm đến đã lưu; dữ liệu cá nhân chỉ từ authenticated owner. Không hard-code thống kê/điểm thưởng.
- My Bookings: phân loại khách sạn/nhà hàng/dịch vụ thật, lọc mã/ngày/status; booking detail ảnh, địa chỉ, room/rate, stay dates, khách, giá snapshot, policy/lịch sử. Hủy khi server cho phép, trạng thái rõ, không double release. Chỉ hiện thanh toán nếu contract có thật. Tải/xem xác nhận đặt phòng nếu làm được mà không tạo hóa đơn/biên lai giả.
- My Trips: xem, lưu, mở lại, chỉnh sửa và tiến độ theo contract cũ; giữ group cost và proof. Không tự thay Planner algorithm hoặc Agent tool. Favorites: lưu/bỏ lưu hotel/place từ authenticated owner với backend API; nếu thiếu, bổ sung contract nhỏ có approval; không lưu giả chỉ bằng UI.
- Lịch sử xem/tìm kiếm và thông báo: optional có consent, retention, xóa lịch sử; notification từ sự kiện Booking/Partner/Review có thật, không tạo quảng cáo giả. Nếu chưa có email/push provider, giới hạn in-app, ghi rõ phạm vi.
- Đánh giá của tôi: chỉ Customer đủ điều kiện completed stay mới được nhãn verified; form rating, bình luận, ảnh trải nghiệm, room attribution lấy từ Booking item, danh sách/edit/delete/report. Không tự completed. Thực hiện Phase E nghiệp vụ review; phần AI phân tích nội dung sâu do chủ dự án làm sau. Không dùng rating tổng để dựng điểm hạng mục giả.
- Bảo mật và quyền riêng tư: đổi mật khẩu, phiên đăng nhập nếu contract hỗ trợ, quyền xem/xóa dữ liệu theo policy; giữ memory/AI consent controls tại `/profile` và Assistant nguyên vẹn, không tự bật hoặc chuyển lưu dữ liệu AI từ opt-in thành opt-out. Không hiển thị raw private review/identity cho người khác.

## 7. PHÂN HỆ 04 — Partner khách sạn và doanh nghiệp

Mục tiêu: chủ khách sạn có thể đăng ký, chờ Admin duyệt, quản lý cơ sở và vận hành thương mại trên dashboard thực. Reuse Partner/Business membership/MANAGE_BOOKINGS và managed Hotel APIs phase B. Không tạo Partner auth/database thứ hai.

### 7.1 Đăng ký và hồ sơ
- Customer nộp đơn trở thành Partner theo flow hiện có; Admin duyệt quyền và Business. Onboarding nhiều bước: thông tin doanh nghiệp cần thiết → hồ sơ khách sạn → địa chỉ → ảnh/tiện nghi → phòng/giá/tồn → gửi duyệt. Lưu draft, tiến độ, validation, hiển thị lý do rejection và submit lại. Không tự publish khi chưa duyệt.
- Hotel profile: tên, loại lưu trú, sao có provenance, mô tả ngắn/dài, điện thoại/liên hệ kinh doanh được phép hiển thị, check-in/out và policy trẻ em/giường phụ/hút thuốc/thú cưng/hủy. Địa chỉ có số nhà, đường, phường/xã, tỉnh/thành, địa danh du lịch, tọa độ, trạng thái xác minh. Giữ registry chung và canonical projection; không cho hai form sửa hai nguồn địa chỉ mâu thuẫn.
- Blocker đã biết: Place latitude/longitude NOT NULL, tạo mới thiếu tọa độ trả 422. Không dùng 0,0 hoặc tọa độ bịa để vượt guard. Form giải thích rõ và nhận tọa độ hợp lệ từ nguồn/đối tác; nếu muốn lưu draft không tọa độ, lập đề xuất compatibility/migration cho owner xem, vì liên quan AI/Planner/map serializers. Không tự apply.

### 7.2 Phòng, dịch vụ và hình ảnh
- Dashboard tổng quan, trạng thái publication, Booking theo ngày, tồn phòng và yêu cầu chờ xử lý; navigation rõ: Cơ sở, Hình ảnh, Phòng, Giá, Lịch tồn, Ưu đãi, Đơn, Đánh giá, Chính sách. Một Business nhiều cơ sở nếu contract hiện có hỗ trợ; switch đúng Business/place context.
- Quản lý hạng phòng CRUD/archive: tên, mô tả, diện tích, phòng ngủ, phòng tắm, giường/loại giường, sức chứa người lớn/trẻ, view, ban công, cửa sổ, bếp, TV, máy lạnh, tủ lạnh, Wi-Fi, minibar, máy sấy, thiết bị/tiện nghi. Tách hotel-level và room-level. Archive thay xóa khi có liên kết Booking.
- Ảnh hotel, lobby, hồ bơi, nhà hàng, phòng ngủ/tắm và view; upload nhiều, chọn cover, sắp xếp, preview, alt/caption, quyền sử dụng, xóa/archive scoped. Reuse managed media service; backend kiểm signature/decode/MIME/size/path traversal/EXIF/ownership, lưu persistent volume tương thích Linux; không hotlink ảnh ngẫu nhiên và không trộn room images.
- Dịch vụ/tiện nghi khách sạn: bữa sáng, hồ bơi, bãi xe, lễ tân, gym/spa, nhà hàng, accessibility; dịch vụ có phí/chính sách rõ. Không coi dịch vụ tùy chọn là đã bao gồm mọi rate.

### 7.3 Giá, tồn phòng, ưu đãi và đơn
- Rate plans: giá VND PER_ROOM_NIGHT, calendar daily/weekend, thời hạn, occupancy, meal plan, chính sách hủy, thuế/phí, phụ thu/child bands; preview giá server. Versioned batch update và stale revision conflict. Không dùng giá Place.priceFrom thay rate xác nhận.
- Inventory calendar theo ngày/tháng, mở/đóng bán, sellable, allocated readonly, remaining. Không giảm sellable thấp hơn allocated. Kiểm mọi đêm check-in inclusive/check-out exclusive. Allocation trigger hiện là writer duy nhất; không tự cộng/trừ lần hai.
- Promotions: giảm phần trăm/số tiền, thời gian đặt/lưu trú, min nights, hotel/room/rate scope, điều kiện và status. Kiểm no-stack theo policy, hết hạn đúng server time. Partner chỉnh giá/ưu đãi đúng quyền, Admin quản lý publication/marketing theo phân quyền. Sau commit website phải lấy dữ liệu mới.
- Booking list/detail: ngày, mã, room/rate, số phòng, status, thông tin vận hành tối thiểu; hành động hợp lệ theo lifecycle hiện có, không tự sửa total, paid hoặc allocated. Customer không thể tự COMPLETED; Partner hoàn thành theo clock/checkout provenance. Cancellation/rejection release đúng một lần.
- Review: xem public ratings/bình luận gắn đúng cơ sở/phòng, lọc, phản hồi của đối tác nếu có moderation contract, report vi phạm; không được sửa/xóa review khách tùy ý. Không trộn ý kiến room A sang room B. Analytics từ dữ liệu thật, không bịa feedback.
- Quyền sở hữu tất cả ở server: Partner A không đọc/sửa tài nguyên private Partner B, forged IDs/businessId/approvedRevision/allocatedQuantity bị từ chối; apply exact revision, atomic publication, audit. Kiểm responsive và các trạng thái lỗi/mất mạng/conflict.

## 8. Data/API contracts cần giữ để AI tiếp tục phát triển

**Cùng nguồn dữ liệu:** website, Admin, Partner và AI sử dụng backend nghiệp vụ + PostgreSQL; không tạo bảng giá dành riêng cho AI hoặc đưa giá vào prompt/weights. Partner update → RBAC/validation → moderation nếu cần → DB commit → fresh read → website và sau này AI cùng thấy dữ liệu đúng. V1 dùng no-store/fresh reads, không cần broker trừ khi có lý do và approval.

- Migration 18 đã định nghĩa 12 bảng: `hotel_profiles`, `hotel_addresses`, `hotel_room_types`, `hotel_media`, `hotel_rate_plans`, `hotel_rate_calendar`, `hotel_room_inventory`, `hotel_promotions`, `hotel_booking_stays`, `hotel_booking_items`, `hotel_room_allocations`, `hotel_review_stays`. Reuse Place/Business/Booking/Review identity; không sửa migration1–18 đã khóa, không thêm bảng trùng. CMS/notification/favorites mới nếu thiếu: đề xuất migration tiến tới, constraints, rollback, compatibility và phạm vi test, owner duyệt trước persistent apply.
- `HotelReadService` + adapter `backend/src/hotels/postgresStore.ts`: giữ hotel/place/room/rate/promotion IDs, address, approved content, commercial revision, sourceVersion, asOf, validUntil, provenance, price basis, DEMO/SYNTHETIC, availability UNKNOWN nếu thiếu. Eligibility: Place APPROVED, Business ACTIVE, revision phù hợp; loại DEMO khỏi production. Không expose private contacts hoặc unaudited fields qua public API.
- API public hiện có: `GET /api/hotels`, `GET /api/hotels/:placeId`, `POST /api/hotels/:placeId/quotes` (read/nonbinding). Search strict DTO, `rooms` allocations/ages, stable sorting, upper query caps, SQL parameterized, repeatable-read. Giá theo STAY_TOTAL khi có ngày; no-date reference không là availability. Giữ expiry ≤60s theo contract; không hard-code UI totals.
- HotelStay: `POST /api/bookings/hotel/:placeId/prepare`, `POST /api/bookings/hotel/confirm`, `POST /api/bookings/hotel/intent-status`; `GET /api/bookings/my`, `GET /api/bookings/:idOrCode`, `POST /api/bookings/:id/cancel`; Partner existing `/api/partner/bookings`, status API. Giữ server-owned HMAC/intent/idempotency/quote recheck, lifecycle, snapshots, no payment; không mở Hotel legacy bypass.
- Review Phase E: Review → hotel_review_stays → immutable Booking item để định danh room type; public moderation và AI-use consent tách biệt; edit/delete/hide/revoke → public aggregate cập nhật và cung cấp lifecycle/revision signal. Không gửi raw review/private identity đến Qwen. Trả hotel/room IDs, review ID/revision, scope, rating, trạng thái, thời điểm, eligibility theo policy. Giữ `ReviewInsightService`/`summarizeReviewEvidence` nguyên trạng; mở rộng NLP aspects/view/food access/beach/noise là việc AI 21.40.
- Tìm theo đường: địa chỉ chuẩn hóa dấu/không dấu, exact street + destination ID; phân biệt "trên đường" và "gần đường". Không suy gần biển từ tên phòng. Chuẩn bị tọa độ hợp lệ/provenance, chưa làm map routing. Giữ registry34 hiện hữu.
- Mọi API mới cung cấp DTO/docs ví dụ synthetic và error codes, ownership, versioning, source authority. Không đổi response cũ/bỏ fields/rename IDs; additive backward-compatible ưu tiên. Nếu cần breaking change, dừng phần đó, gửi impact matrix cho AI owner; dùng adapter/contract version mới sau approval. Không sửa AI parser để thích ứng thay người phụ trách.

## 9. Hàng rào bảo vệ AI Agent và Git workflow

Đây là điều kiện bắt buộc, không chỉ lời nhắc cho AI. Phải kiểm diff thực tế trước merge; prompt/CODEOWNERS một mình không chặn được AI sửa file.

### 9.1 Vùng ĐỎ – không thay đổi khi chưa được người phụ trách AI duyệt
- AgentCoreService và toàn bộ implementation / assistant-specific frontend, services/handlers/routes `/api/agent/*`, provider/Ollama/Qwen, prompts, model config, tools/adapters, natural language/semantic/session/continuity, deferred goals, intent/proof, Adaptive Language, Customer Memory, Knowledge/worker/search/candidate/source, ReviewInsight/NLP, AI ranking/Recommendation và Planner algorithms/cost/proof; AI-specific tests, quotas, resource/SQL/network guards, protected launcher và historical source/evidence locks.
- Xác định **đường dẫn exact từ repo**, không đoán theo tên module. Dùng manifests/source hashes của 21.37 (freeze26, 25 protected sau ngoại lệ AppRouter đã ghi nhận), các seal/evidence B–D; làm danh sách protected-paths kèm SHA256 hiện tại trước sửa. Các tên trên là nhóm logic, không phải danh sách file đã kiểm chứng đầy đủ. Không sửa baseline manifest để che thay đổi.
- Không sửa UI chat, AI admin source/knowledge/language, memory/privacy consent, API session/auth của AI hoặc gọi Agent model để test giao diện. Chỉ giữ link/mount/navigation tới Assistant; global layout/CSS phải test không phá giao diện AI, không đổi behavior. Không sửa ReviewInsight để làm review UI thuận tiện.

### 9.2 Vùng VÀNG – thay đổi có kiểm soát
- AppRouter, header/footer/global CSS, AuthContext, auth/RBAC, shared API clients/types, Place/Business serializers, geography, HotelReadService, BookingService và ReviewService. Chỉ thay đổi cần cho web, additive, không phá hợp đồng đang dùng; gửi diff/impact cho AI owner trước merge nếu liên quan contract/guard. Không general refactor, format hàng loạt hoặc rename.
- Nghiệp vụ CMS, Partner, customer account/review cũng không được sửa pricing, allocation trigger, cancellation, idempotency hoặc visibility đã PASS chỉ để UI dễ làm. Nếu lỗi thật, giữ evidence, fix phạm vi nhỏ và chạy regression có liên quan; thay đổi core contract cần approval.

### 9.3 Vùng XANH – phạm vi thành viên
- Page/layout/components/style dành cho Home/Hotel search/detail/checkout/My Bookings/Profile/Partner/Admin non-AI, feature modules CMS, media, favorites, booking UI, review CRUD/publication và thin API additions phù hợp. Được sửa chức năng WEB đã giao sau audit. Ghi rõ file mới/file đổi, không chạm vùng đỏ.

### 9.4 Bàn giao Git an toàn giữa hai máy
1. Chủ dự án dừng AI/coding trên working tree đang có D-UI. Kiểm `git status --short`, `git diff --stat`, `git diff`, `git diff --cached` và untracked files. Không Undo/reset/clean/stash toàn bộ tự động. So sánh HEAD/remote, xác nhận source D và D-UI chưa commit. Tạo backup source private ngoài repo trước thao tác. Không mặc định commit cũ có đủ phase A–D.
2. Audit secrets/tracked history và files local (env, keys, DPAPI, dumps, tokens, logs, test credentials, private media). Chọn lọc source/docs/evidence đã khử dữ liệu nhạy cảm. Chủ dự án duyệt và commit snapshot bàn giao trên branch riêng, ghi exact SHA; chỉ push remote được chủ dự án cho phép. Không dùng `git add .` hay force push. Nếu repo public, không push dữ liệu riêng.
3. Đề xuất branch `handoff/web-baseline-2138d-ui` (snapshot chung), `feature/web-ui-admin-partner` (thành viên), `feature/ai-agent` (chủ dự án). Các tên là phương án; chọn nhánh thực sau audit để tránh trùng. Thành viên clone/fetch/checkout riêng theo SHA bàn giao, không làm trực tiếp main và không dùng chung working tree với chủ dự án.
4. Chia nhỏ commit theo Web scope, push feature branch/PR sau khi được phép. Bảo vệ main, yêu cầu review; nếu GitHub repo hỗ trợ, CODEOWNERS cho exact AI paths và required status check. Tạo protected-diff check so với baseline + allowlist explicit cho file shared được duyệt; kiểm modified/deleted/renamed/untracked và integrity hashes trước/sau. Không sửa chính check/manifest để lách. Nếu chưa cấu hình branch protection, owner tự review diff và mới merge.
5. Dừng khi phát hiện conflict trong AI/shared file. Không chọn ours/theirs hàng loạt hoặc tự rebase ghi đè work của người khác. Gửi PR impact và danh sách file; AI owner giải quyết/duyệt. Khi WEB hoàn tất, merge feature web vào nhánh tích hợp có review, chạy kiểm thử mục 11; AI owner tiếp tục 21.40 trên integrated revision, không cherry-pick mù toàn bộ thay đổi.

## 10. Môi trường chạy, dữ liệu và quyền truy cập

| Môi trường theo báo cáo | Cấu hình | Giới hạn |
|---|---|---|
| Staging cũ | FE5177 / API5057 / PG15452; 40 bảng/17 migration, 130 Place/20 Business DEMO | Protected READ ONLY, không migrate/seed/ghi; tài khoản Owner tại đây |
| Preview C | FE5179 / API5059 / PG15454, 52/18 | Sáu hotel SYNTHETIC, chỉ đọc; không có login/booking sau cleanup |
| Preview D | FE5180 / API5062 / PG15455, 52/18 | CUSTOMER/PARTNER SYNTHETIC riêng; quyền ghi cũ hết hạn 15:12:54 ICT 19/11/2026, không tự gia hạn |
| Máy thành viên | Target dev/test mới có tên/sentinel/port/volume riêng, xác minh collision | Chỉ fixtures SYNTHETIC, quyền scoped mới; không kết nối DB cũ/Owner thật |

Các port/trạng thái trên là lịch sử báo cáo, không phải cam kết server đang chạy. Launcher cũ chỉ chạy nếu đúng target/volume/source seal; không mang DPAPI hoặc launcher chứa local machine dependencies sang rồi ép chạy. Git clone không mang Docker volumes, ảnh upload, tài khoản hoặc dữ liệu DB. Mỗi máy cần local env riêng, không gửi mật khẩu qua chat.

- Thành viên đọc package/compose/env templates hiện có, kiểm `node --version`, npm/Docker, source SHA và ports; dùng lockfile (`npm ci` khi cần). Tạo target test mới theo approval của chủ dự án; migration1–18 theo đúng checksum, fixture manifest riêng và test roles. Feature flag Hotel chỉ mở theo isolated runtime guard. Không thay default flags/loosening guard để dùng chung staging. Nếu cap/sentinel/role không khớp thì BLOCKED.
- Dữ liệu test đủ review/approval/Booking giả lập theo scope; mọi fixture ghi SYNTHETIC, không tạo review giả vào real corpus. Không copy Owner/customer/knowledge/memory thật. Không share .env, DPAPI, JWT, API keys, DB dump, raw logs chứa private info. Test accounts khác nhau CUSTOMER/PARTNER A/B/ADMIN do target dev tạo hợp lệ, không dùng SUPER_ADMIN thật để demo.
- Giữ original DB lịch sử 27 Trip; staging 40/40 fingerprint theo report D, no DML/migration ngoài scope; kiểm trước/sau nếu môi trường đó hiện diện và được phép đọc, không truy cập từ máy thành viên. Không DROP/reset/reseed, `.sync(force/alter)`, xóa volumes, stop unrelated processes. Chỉ cleanup task-owned IDs/resources, lưu evidence.
- Persistent migration 40→52/17→18 chưa thực hiện. Backup mã hóa + verified restore chưa đạt; cần scope riêng, schema/role/secret/media/deploy/rollback review trước khi bật chính thức. Không coi test-only guard là lỗi cần bỏ. Production VPS/GPU/domain/HTTPS, real business data, payment, map provider và Qwen/worker là gate riêng. Qwen/Ollama/worker OFF, không GET/POST metadata/inference hoặc AI quota bypass.

## 11. Thứ tự triển khai, nghiệm thu và bàn giao lại

Không yêu cầu viết lại tất cả trong một lượt chat. Mỗi batch cập nhật checkpoint, ưu tiên chức năng dùng được; nếu đổi model hoặc hết quota, tiếp tục từ diff và handoff.

| Batch đề xuất | Công việc | Gate trước khi chuyển |
|---|---|---|
| WEB-0 | Audit source/diff/AI protected manifests, branch, local test env; inventory pages/APIs/placeholder | Baseline SHA + scope + protected hashes + gap matrix |
| WEB-1 | Resume 21.38-D-UI; ảnh, homepage, design system, search/detail/checkout polish | Actual screenshot desktop/mobile; owner duyệt thiết kế |
| WEB-2 | Admin CMS/banner/sections/featured/promotion placement; moderation và quản trị non-AI | Admin publish → website đổi thật; quyền và revision PASS |
| WEB-3 | Customer account, My Bookings/Trips/favorites, security/settings | Owner isolation, persistence, navigation PASS |
| WEB-4 | Partner onboarding, profile/address/media/room/rate/inventory/promotions, Booking management | Partner ownership, Admin approval, fresh public data PASS |
| WEB-5 | Functional review Phase E và hoàn thiện website non-AI, responsive/compatibility | Review lifecycle/attribution; public API đúng; không sửa NLP |
| WEB-6 | Final regression, tài liệu, preview, PR/merge review | Owner approval + protected-file diff PASS + handoff AI |

WEB-2/3/4 có thể đổi thứ tự theo dependency nhưng phải giữ cùng domain. Nếu Admin CMS thiếu schema, đóng gate migration proposal trước native test. Không tự bắt đầu 21.40 hoặc 21.41.

### Ma trận nghiệm thu tối thiểu (actual browser → API → PostgreSQL)
- H01: homepage ảnh đúng địa danh, banner CTA, destination mosaic, mobile không overflow; ảnh tải/decode thật; owner duyệt visual. H02: Admin cập nhật ảnh/tiêu đề/thứ tự, schedule, draft/publish; Customer reload thấy đúng revision; Customer/Partner thường không sửa CMS.
- H03: tìm theo đường và địa danh có/không dấu; combined same-room filters, all-night stock, URL/back/link, empty/error. H04: gallery, room attributes/rates và price basis khớp DB; đổi giá/ưu đãi/hết hạn → lần đọc mới không stale. Không fake số lượng, review hay ảnh cơ sở.
- U01: đăng nhập đúng môi trường, profile persistence và ownership. U02: Booking list/detail immutable tổng, cancellation hợp lệ, duplicate request no duplicate; expired/forged quote fail. U03: Trip/favorites theo owner, edit/reload đúng; AI controls giữ nguyên. U04: Customer A không đọc/sửa dữ liệu B, role escalation fail.
- P01: Partner application → Admin approve → permission đúng; P02: hotel draft với địa chỉ/ảnh, room/rate/inventory/promo → duyệt revision → public visible; invalid coordinates bị chặn đúng contract. P03: price/promotion/inventory updates cập nhật public read; archived/suspended không hiện. P04: Partner B forged IDs bị 403/404 theo contract, stale version conflict; không allocated edit. P05: Partner Booking và status/cancel đúng quyền, không completed trái thời điểm.
- R01: completed stay thật trong synthetic target qua lifecycle → đúng owner/room review; wrong room/owner, chưa completed, duplicate bị xử lý đúng policy. R02: edit/delete/hide/report cập nhật public rating/count và revision/eligibility signal; không có review thì empty. Không chạy AI để chứng minh NLP.
- S01: Admin/users/reviews/media permissions, input/file validation, audit, no secrets in source/log/client. S02: backend/frontend build, targeted regression (Hotel foundation, commercial, Booking, RBAC, feature-OFF compatibility), protected source/seals diff, shared contract tests. S03: Docker/Linux path compatibility và persistent media; không thực hiện VPS. S04: responsive 360/390/768/1366/1440, keyboard, date/guest, privacy consent. Chỉ ghi ACTUAL PASS khi thật sự chạy; mock chỉ offline, thất bại/BLOCKED giữ evidence.

### Deliverables yêu cầu thành viên trả lại
- Branch/PR/commit SHA và file diff theo scope; `protected-paths` manifest + diff/hash report; shared contract impact và approvals. Không commit secrets, không tự merge main.
- `docs/HUGO_WEB_TEAM_HANDOFF_REPORT.md` (báo cáo riêng, không ghi đè Master AI): danh sách chức năng đã làm/chưa làm, files, routes/APIs/schema, tests PASS/FAIL/NOT RUN, screenshots before/after, blocker, migration/rollback proposal, assets/license và privacy notes. Ghi rõ target SYNTHETIC, không tuyên bố production ready.
- `docs/HUGO_WEB_API_AI_HANDOFF.md`: API/data dictionary, example synthetic JSON, room/rate/price/promotion/address/review relationships, revision/freshness/consent/eligibility, error codes và giới hạn; liệt kê những phần AI owner cần làm (21.40), không triển khai thay.
- `docs/HUGO_CURRENT_TASK_HANDOFF.md`: trạng thái mới nhất, exact branch/HEAD, working tree, task/phase, đã làm/chưa làm, approvals, restrictions, source/fixture/evidence paths, next action. Không ghi credentials. Cập nhật sau mỗi batch trước khi đổi model.
- Launcher/hướng dẫn chạy local theo target dev hợp lệ, `.env.example` chỉ tên biến/placeholder, fixture dựng lại được, media/backup instructions. URL homepage/home hotel/search/detail/customer/admin/partner thực tế đã check HTTP, trạng thái runtime. Không tự gia hạn sandbox cũ. Owner trực tiếp kiểm tra UI và nghiệp vụ rồi mới nghiệm thu.

## 12. Lệnh khởi động cho AI của thành viên

Gửi nguyên tài liệu này cho AI trong IDE cùng quyền truy cập workspace đã nhận. Không cần nhồi toàn bộ lịch sử chat. Dán lệnh sau:

> Bạn là AI lập trình phụ trách phần WEB của dự án DACN/HuGo Travel. Hãy đọc đầy đủ `HUGO_TRAVEL_BAN_GIAO_WEB.md`, Master mục 21.37 và 21.38-A/B/C/D/D-UI, cùng các tài liệu Hotel được liệt kê. Đây là nguồn yêu cầu và giới hạn công việc. Tiếp quản working tree/branch được bàn giao, KHÔNG làm lại dự án. Bắt đầu WEB-0: xác minh Git SHA, diff/staged/untracked, audit route/API/schema, xác định protected AI paths từ freeze manifests và tạo gap matrix/manifest trước sửa. Không chỉnh Agent Core, Assistant, Qwen, worker, memory/language/knowledge, ReviewInsight, Recommendation/Planner reasoning hoặc guards/evidence. Shared contracts chỉ additive và báo owner nếu có ảnh hưởng. Không tự reset/clean/Undo, đổi database, copy credentials, bật model hay deploy. Sau khi kiểm scope, tiếp tục WEB-1 (21.38-D-UI) ngay bằng code thật, hình ảnh có quyền sử dụng, actual browser preview và targeted tests. Chỉ dùng target test mới SYNTHETIC có approval/least privilege, không reuse quyền ghi đã hết hạn. Không dừng ở plan nếu có thể thực hiện phần an toàn. Dừng để owner duyệt giao diện WEB-1; sau đó thực hiện các batch được giao theo thứ tự, cập nhật checkpoint mỗi batch. Không tự commit/push/merge ngoài quyền được cấp; không bắt đầu AI 21.40. Mọi blocker, thiếu API hoặc thay đổi schema phải báo rõ và đề xuất phạm vi nhỏ. Khi xong cung cấp report, API handoff, source diff và preview để chủ dự án tiếp tục AI.

**Điều kiện hoàn thành chung:** website sử dụng được, nội dung quản lý được từ Admin/Partner, dữ liệu chính thức và có nguồn, khách dùng account/booking/review đúng quyền; người phụ trách AI nhận được hợp đồng dữ liệu ổn định và không phải phục hồi source AI bị sửa bởi thành viên.
