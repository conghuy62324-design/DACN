# T02 — Phạm vi hoàn thành ĐACN HuGo Travel trong 6 tuần

Ngày kiểm kê: **28/10/2026**, giờ Việt Nam (`Asia/Ho_Chi_Minh`, UTC+7).

**Kế hoạch giả định: 28/10–08/12/2026; feature freeze hết ngày 24/11/2026.** Ngày nộp chính thức, rubric, yêu cầu AI của trường và giờ chốt từng mốc: **TODO — chủ dự án xác nhận**. Đây là phương án quản lý phạm vi kỹ thuật, không phải xác nhận đủ điều kiện chấm/bảo vệ của trường.

T02 chỉ tạo file này. Chưa sửa business logic, chưa thu dữ liệu/consent, chưa train, tạo/sửa manifest, push hoặc deploy. Các task dưới đây là backlog đề xuất, chưa được thực thi bởi T02.

## 1. Căn cứ và cách đọc bằng chứng

Đã đọc [kế hoạch MVP](HUGO_AI_M2_MVP_PLAN.md), [T01 collection kit](HUGO_MVP_DATA_COLLECTION_KIT.md), [bản bàn giao](HUGO_AI_CURRENT_STATUS_AND_CHATGPT_HANDOFF.md), `backend/package.json`, `frontend/package.json` và các controller/service/validator/model/routes/UI liên quan bên dưới.

Mã nguồn được đối chiếu tại HEAD **`052531dfc77c4f289757794c0ee08b4d46e6af2e`**, commit ngày **16/10/2026 14:47:41 +07:00**. Ngày đọc source là 28/10; không đồng nhất ngày commit với ngày chạy test. Trước T02, working tree đã có hai file modified (`ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py`, `docs/HUGO_AI_M2_B2_REPORT.md`) và hai tài liệu untracked (bản bàn giao, T01). Không có tracked diff backend/frontend khi kiểm kê. T02 giữ nguyên các thay đổi có sẵn này.

Phân loại bằng chứng:

| Loại | Ý nghĩa |
|---|---|
| **SOURCE FINDING** | Đã thấy đường thực thi/điều kiện trong source; chưa chạy request/UI để tái hiện hành vi |
| **REPRODUCED** | Có lần chạy cụ thể, input, kết quả, môi trường và ngày; chỉ dùng khi thật sự có bằng chứng |
| **HYPOTHESIS** | Hậu quả phụ thuộc dữ liệu, môi trường, tương tác hoặc chính sách; cần kiểm thử đích danh |
| **HISTORICAL BASELINE** | Báo cáo lần chạy trước; hữu ích trong phạm vi đã kiểm, không phải kết quả T02 vừa chạy |

**Không có phát hiện lỗi nào dưới đây được đánh dấu REPRODUCED trong T02.** Phiên này đọc source/tài liệu, kiểm tra Git và version công cụ; không gọi API, mở browser ứng dụng, nạp model, build hoặc chạy test. Việc có đủ cơ sở sửa một source finding không đồng nghĩa đã chứng minh mọi hậu quả runtime.

Ưu tiên: **P0** là lỗi an toàn, toàn vẹn dữ liệu, tính đúng hoặc lời hứa sai ảnh hưởng luồng CORE; **P1** là cải thiện/đồng bộ cần xếp sau P0. Không dùng nhãn ưu tiên để tuyên bố đã có khai thác hoặc sự cố thực tế.

## 2. CORE — bắt buộc trong bản nộp kỹ thuật dự kiến

| Phần | Phạm vi bắt buộc và acceptance chung |
|---|---|
| Auth/RBAC | Login/register, reload `/auth/me`, xử lý token hết hạn/401, logout phía client; giữ isolation CUSTOMER/PARTNER/SUPER_ADMIN. Tài liệu mô tả đúng token thực tế; không thêm refresh-token như chức năng mới |
| Catalog/Explore | Attraction/hotel/restaurant đã duyệt; preference/budget, server ranking heuristic/Bayesian, why/fallback trung thực; anonymous fallback và consent/opt-out hoạt động |
| Planner | Generate đúng ngày/số khách/ngân sách hợp lệ; tính đêm khách sạn đúng; UI chỉ quảng bá pacing/transport được hỗ trợ thật; mandatory Place được xử lý rõ; mọi cost/ETA là ước lượng |
| Trip | Save/reopen/update/remove/reorder theo khả năng UI thật; itinerary, selected IDs và tổng tiền nhất quán; ownership; input sai trả lỗi có kiểm soát, không lưu JSON hỏng |
| Map popup | Ba vị trí popup không diễn giải field từ API/itinerary thành HTML tùy ý; text/URL được xử lý đúng mục đích |
| Favorite/Review | Giữ server Favorite và verified-review provenance/consent/moderation hiện có; kiểm regression phần bị tác động, không xây lại M1 |
| Booking demo | Giá/owner/business lấy từ server; Business ACTIVE trước booking mới; validate counts; retry cùng thao tác không tạo booking/event/trừ kho lần hai; giữ transaction/concurrency/rollback và state transitions |
| Profile/UI | Loại thông báo lưu thành công giả, số điện thoại và thống kê tài khoản giả; error/loading/empty đủ cho luồng demo; có phương án read-only nếu chưa làm profile update API |
| Sentiment | Bàn giao minh bạch theo A hoặc B ở mục 5; A/B là quyết định kỹ thuật chờ đối chiếu rubric, không mặc định B được trường chấp nhận |
| Nghiệm thu/bảo vệ | Build/regression có phạm vi và bằng chứng; kịch bản Customer xuyên suốt, Partner/Admin smoke hợp lệ; báo cáo, slide, video và known limitations khớp source/artifact |

Luồng nghiệm thu chính: **Login → Explore theo tiêu chí → why/fallback → Place Detail → Favorite → Thêm vào lịch trình → Generate → chỉnh sửa trong phạm vi hỗ trợ → Save → refresh/reopen**. Booking demo/verified review và Partner/Admin là các luồng liên quan được kiểm theo thay đổi, không giả định end-to-end mới đều đã PASS.

Các phần M1/M3 đã có được giữ và sửa lỗi có mục tiêu. Lịch sử M3-MVP COMPLETE chứng minh luồng đã từng chạy, không có nghĩa mọi nhánh chi phí/validation hiện nay đều đã được kiểm đủ.

### 2.1. Giới hạn tối thiểu để giữ scope nhỏ

- **Pacing:** bản CORE có thể chỉ hỗ trợ `balanced` với số sightseeing slot đúng khả năng thật. Ẩn/disable `relaxed`/`packed` và thông báo rõ nếu chưa triển khai; backend từ chối giá trị chưa hỗ trợ thay vì nhận rồi chỉ đổi summary. Không giữ nhãn “4+ điểm/ngày” khi chỉ xếp tối đa hai điểm. Triển khai thêm nhịp độ là OPTIONAL.
- **Transportation:** CORE dùng các mode ước lượng địa phương được hỗ trợ thực, ưu tiên `car`/`motorbike` với GeoService hiện có. `flight`/`train` không được biến thành ETA ô tô hoặc giả báo giá di chuyển liên tỉnh; ẩn/disable phần chưa tính, tài liệu nói rõ giới hạn. Không thêm routing provider.
- **Khách sạn:** chuyến trong ngày mặc định 0 đêm; chuyến N ngày mặc định N−1 đêm. Hotel do người dùng chọn vẫn được bảo toàn đúng một Place theo contract mandatory, có nhãn tham khảo phù hợp nếu 0 đêm, không tự phát sinh booking/lưu trú.
- **Giá:** khóa một quy ước per-person/per-group cho day/trip totals, hiển thị đơn vị và dùng cùng quy tắc khi generate/delete/save/reopen. Không biến `priceFrom` thành cam kết giá thật hoặc thay đổi schema lớn để xây hệ thống định giá.
- **Profile:** CORE ưu tiên read-only trung thực vì source chưa có profile update API. API cập nhật hồ sơ thuộc OPTIONAL nếu rubric không bắt buộc CRUD profile.

Các lựa chọn tối giản trên là hướng scope đề xuất, không phải code đã đổi. Nếu rubric yêu cầu nhiều mode/profile CRUD, cần xác nhận sớm và đổi phạm vi trong thời gian trước freeze.

## 3. OPTIONAL — chỉ làm khi CORE hết lỗi và còn thời gian trước freeze

- Thêm pacing thật theo giới hạn số điểm/thời lượng có kiểm thử, giữ mandatory-place capacity nhất quán; không viết solver mới.
- Cập nhật profile thật qua authenticated owner API, validation và đồng bộ AuthContext nếu rubric/thời gian cho phép. CORE vẫn phải bỏ fake success dù không chọn mục này.
- Multi-select Place trong UI, cải thiện hiển thị tổng chi phí/khả năng sửa lịch trình vượt luồng tối thiểu.
- Inference sentiment nghiên cứu có nhãn Experimental **chỉ với nhánh A**, có model hợp lệ và đã qua kiểm tương thích, timeout/error/fallback. Không đưa sentiment vào score gợi ý trong 6 tuần này.
- Cải thiện accessibility, kiểm tra thêm browser và polish UI sau khi lỗi CORE đóng; không đổi thiết kế toàn site.

OPTIONAL không được chặn freeze, chiếm thời gian xử lý P0 hoặc trở thành cách bù cho dữ liệu không đạt gate. Sau 24/11 không bắt đầu OPTIONAL mới.

## 4. OUT_OF_SCOPE trong 6 tuần

- PhoBERT/fine-tune transformer; aspect sentiment; chatbot/LLM/NLU/memory mới.
- Learning-to-Rank, collaborative filtering, demand forecasting hoặc model tự retrain.
- Payment thật, cổng thanh toán/webhook, hoàn tiền thật, booking inventory production.
- Routing đường bộ, traffic, route matrix/provider mới; OR-Tools hoặc solver mới.
- Thay toàn bộ auth bằng chuẩn/token infrastructure mới, refresh-token rotation, social login.
- Public dataset release, thương mại hóa, mở rộng quyền dùng dữ liệu ngoài consent, tự động publish/deploy.
- Rewrite architecture, migration không cần thiết, xây lại những phần M1/M3 đã tồn tại.

## 5. Sentiment A/B — độc lập với đường găng sửa web

Hiện chưa có dữ liệu/consent thật theo T01; manifest cũ vẫn BLOCKED. Không mở nhánh A chỉ vì có script/CLI hoặc 45 câu fixture demo.

| Điều kiện | A — thí nghiệm dữ liệu thật | B — giữ DEMO_ONLY |
|---|---|---|
| Quyết định 06/11/2026 | Có bằng chứng đủ sàn hoặc kế hoạch có điều kiện khả thi trước 10/11; ghi rõ trạng thái chờ khóa | Thiếu quyền, dữ liệu, annotation, group isolation hoặc nguồn lực và không có đường khả thi |
| Khóa 10/11/2026 | Đạt tất cả gate và counts thực; A có điều kiện không đạt thì chuyển B | Ghi rõ chưa đủ gate, không âm thầm nới quota hoặc kéo dài |
| Số lượng sau lọc | Target 600 development +150 test; floor 360+90; từng lớp development ≥120/test ≥30 | Không lấy fixture/synthetic/test DB để bù số lượng |
| Quy trình con người | Pilot 45–60 riêng; test 100% hai người gán độc lập + adjudication; development cross-check ≥20%; consent/PII/dedupe/group audit | Không giả lập consent/annotation hoặc biến demo thành independent test |
| Protocol thí nghiệm | Group-safe train/validation trong development, independent test khóa riêng; chọn cấu hình trên validation; final evaluation theo protocol định trước, không tune từ test | Dùng notebook/artifact demo làm minh họa kỹ thuật; không claim độ chính xác thực tế |
| Đầu ra | Majority/word/char/combined TF-IDF+LR CPU; Macro-F1, per-class/support, confusion matrix, 95% CI, domain errors, latency, model card, version/hash/reload parity | Demo có watermark và quality false/production false; báo cáo giới hạn và instrumentation/heuristic thực tế |
| Website | Integration chỉ OPTIONAL sau gate và trước freeze | **Không kích hoạt model demo vào website**, không dùng trong score/Place insight |
| Điều kiện học thuật | TODO đối chiếu rubric/yêu cầu hội đồng | **TODO xin xác nhận của giảng viên/trường; chưa được coi là chấp nhận** |

Nhánh A phải sửa protocol hiện tại trước khi train thật: script B1 chưa có train/validation riêng trong nhánh independent-test, chưa kiểm đầy đủ cross-file/group/near duplicates, còn output tên/watermark demo. Không chọn mô hình bằng cách nhìn bảng final test rồi thử tiếp. Registry/manifest MVP mới chỉ tạo trong task riêng sau khi đủ evidence; manifest BLOCKED lịch sử giữ nguyên.

Consent Kaggle là quyền riêng. Tập thực sự upload/chạy phải đủ gate sau lọc quyền; nếu không có quyền Kaggle nhưng có quyền nghiên cứu local, đánh giá khả năng local phù hợp, không tự upload. Pipeline/inference implementation là công việc sau, không thuộc T02.

**T03–T07 không phụ thuộc có đủ corpus.** Con người thu/gán nhãn song song; nhánh A/B không được trì hoãn sửa Planner/Trip/Popup/Booking/UI.

## 6. Audit từng phát hiện và backlog sửa nhỏ nhất

Các dòng file dưới đây là vị trí source tại thời điểm kiểm kê; có thể dịch chuyển khi sửa. Acceptance là điều kiện phải kiểm ở task sửa, **chưa phải kết quả PASS**.

### F01 — Planner tính tiền khách sạn cho cả chuyến 1 ngày

- **File/hàm:** `backend/src/services/tourPlannerService.ts`, `generatePersonalizedItinerary`, dòng 220–358; `hotelNightCost` dòng 331–333; title dòng 383.
- **Bằng chứng SOURCE FINDING:** mỗi vòng lặp ngày đều cộng `hotelNightCost`, không có điều kiện còn đêm; thiếu hotel còn dùng fallback 400.000. Title 1 ngày dùng nhánh `... : 1` nên ghi 1N1Đ. `selectedHotel` được chọn trước vòng lặp dù chỉ đi trong ngày.
- **Ảnh hưởng:** ước tính đội thêm lưu trú, N ngày bị tính N đêm; label đêm không khớp date range. Hậu quả số tiền cụ thể trên catalog thật chưa tái hiện.
- **Ưu tiên/task:** **P0, T03**.
- **Sửa nhỏ nhất:** tính `nights = max(0, daysCount−1)`, chỉ cộng đúng các đêm; đồng bộ title, subtotal và thao tác xóa activity; không gọi fallback room cost cho 0 đêm. Giữ mandatory hotel ID đúng một lần với nhãn tham khảo rõ khi 0 đêm.
- **Acceptance:** 1 ngày → 0 đêm/0 overnight cost; 2 ngày →1 đêm; 3 ngày →2 đêm. Không hotel → phần thiếu được ghi estimated/unknown đúng policy. Day/group/trip totals cùng đơn vị, save/reopen không đổi số; mandatory hotel không bị mất hoặc lặp. Chưa có overnight override trong UI; nhu cầu staycation/overnight 1 ngày là TODO policy, không tự xây thêm.

### F02 — Pacing chỉ đổi mô tả, không đổi lịch theo nhãn UI

- **File/hàm:** cùng Planner, `spotsToSchedule.slice(0, daysCount*2)` dòng 185–189, lấy `daySpots[0]`/`[1]` dòng 231/275; input.pacing chỉ được trả về/đưa vào summary dòng 391/399. UI `frontend/src/pages/TourPlannerPage.tsx` dòng 610–612.
- **Bằng chứng SOURCE FINDING:** UI hứa relaxed 1–2, balanced 2–3, packed 4+ điểm/ngày; source xếp tối đa hai sightseeing slot, không nhánh pacing điều chỉnh selection/duration. Bữa ăn không được âm thầm tính như điểm tham quan để hợp thức nhãn.
- **Ảnh hưởng:** thay lựa chọn có thể chỉ đổi câu mô tả; so sánh ba kết quả thật chưa chạy.
- **Ưu tiên/task:** **P1, T03**, tính trung thực control là acceptance CORE phải đóng trước freeze.
- **Sửa nhỏ nhất:** chốt CORE balanced tối đa hai sightseeing/ngày; tắt lựa chọn chưa thực thi và sửa nhãn tương ứng. Nếu làm thêm pacing, phải điều chỉnh selection/capacity/duration cùng test, thuộc OPTIONAL.
- **Acceptance:** mỗi control đang enable có hành vi/giới hạn được mô tả và kiểm được; unsupported enum có lỗi 400 rõ. Mandatory vượt capacity vẫn trả 422, không lặng lẽ bỏ Place.

### F03 — Transportation chưa tác động tới ETA/chi phí như lựa chọn UI

- **File/hàm:** Planner dòng 342 luôn `GeoService.estimateTravelTimeMinutes(dist, 'car')`; `geoService.ts::estimateTravelTimeMinutes` dòng 49–65 có car/motorbike/walking; UI Planner dòng 58, 156, 579–581.
- **Bằng chứng SOURCE FINDING:** input transportation có flight/car/train/motorbike nhưng generator không dùng để chọn mode, không tính chặng khởi hành hay giá phương tiện. Hàm GeoService đã có mode motorbike, chưa được nối ở planner.
- **Ảnh hưởng:** UI dễ bị hiểu là đã tính ETA/cost theo lựa chọn; khác biệt thực tế theo mode chưa tái hiện.
- **Ưu tiên/task:** **P1, T03**; bỏ lời hứa sai thuộc CORE.
- **Sửa nhỏ nhất:** nối car/motorbike cho ETA ước lượng địa phương; flight/train disable/ẩn hoặc ghi rõ chưa hỗ trợ tính toán, không tiếp nhận như lựa chọn có tác dụng. Không thêm routing hoặc bảng giá vận tải.
- **Acceptance:** cùng cự ly tham khảo đủ lớn car/motorbike dùng đúng mode; nhãn luôn ghi Haversine/ước lượng, không gọi đường bộ thật; flight/train không tạo ETA ô tô dưới tên phương tiện đã chọn; thiếu transport cost không được gọi là chi phí trọn gói.

### F04 — Update itinerary chưa đồng bộ selectedPlaceIds

- **File/hàm:** `backend/src/services/tripSessionService.ts::createTripFromPlanner` dòng 111 tính selected IDs; `updateTrip` dòng 121–131 chỉ validate preferences rồi `trip.update(safeUpdates)`; `serialize` dòng 71–72 đọc hai field riêng. `TripController.updateTrip` dòng 10 nhận `itinerary || days`.
- **Bằng chứng SOURCE FINDING:** nhánh update nhận itinerary nhưng không derive lại selectedPlaceIds. **Create đã derive/dedupe**, nên không kết luận cả save flow bị thiếu. UI Trip hiện ưu tiên sửa preferences; lỗi update itinerary cần request đúng nhánh, không khẳng định người dùng hiện đã gặp.
- **Ảnh hưởng:** GET sau update có thể trả itinerary mới nhưng ID list cũ; nhánh check-in/progress cần xem đồng bộ khi bỏ stop.
- **Ưu tiên/task:** **P0, T04**.
- **Sửa nhỏ nhất:** validate itinerary và derive unique IDs từ activities ở cùng update/transaction; không nhận client-selected IDs làm source of truth. Chốt policy cho checkin của stop bị xóa, giữ lịch sử/loại khỏi progress theo quy tắc công bố, không tự xóa lịch sử người dùng.
- **Acceptance:** thêm/xóa/đổi thứ tự/ID lặp → GET và PostgreSQL nhất quán sau reopen; update preferences riêng giữ itinerary/IDs; input invalid không cập nhật một phần; cross-owner vẫn 404. Empty itinerary cho phép hay không phải có rule rõ.

### F05 — Validation Planner có khoảng trống thực tế

- **File/hàm:** `backend/src/controllers/tourController.ts::planItinerary` dòng 71–95; `tourPlannerService.ts::calculateDaysBetween` dòng 99–104; `tourRoutes.ts` route POST `/plan` không có validator riêng.
- **Bằng chứng SOURCE FINDING:** controller chỉ kiểm truthy destination, dùng `Number(...) || default` cho counts/budget; dates thiếu được default. Helper dùng `Math.abs`, clamp 1–10, `diffDays || 3`, nên đảo ngày/invalid có thể bị che trước khi tạo date. Chưa validate đầy đủ finite/integer, enum, ngày lịch thật hay field types. **Đã có** validateTravelPreferences và mandatory UUID/eligibility/capacity, không xây lại các phần đó.
- **Ảnh hưởng:** giá trị sai có thể biến thành mặc định, đảo ngày vẫn được xử lý hoặc lỗi 500 ở date formatting; payload nào ra status gì chưa chạy API để chứng minh.
- **Ưu tiên/task:** **P0, T03**.
- **Sửa nhỏ nhất:** validator dùng chung trước compute: destination string hữu hạn độ dài; ngày ISO date-only hợp lệ, end≥start, 1–10 ngày; adults integer ≥1, children integer ≥0, budget finite không âm theo contract; enum đúng supported scope. Default chỉ khi thiếu theo contract, không dùng falsy để sửa input sai. Upper bounds counts/budget: TODO khóa trước triển khai và test.
- **Acceptance:** test ngày không tồn tại/đảo ngày/vượt 10 ngày, số âm/lẻ/NaN hoặc chuỗi bẩn, destination object, enum lạ đều 400 trước catalog work; valid/default missing hợp lệ vẫn generate; mandatory 422/preference allowlist không regress.

### F06 — Validation Trip mới mạnh ở preferences, JSON itinerary còn lỏng

- **File/hàm:** `backend/src/controllers/tripController.ts::createTrip/updateTrip/checkinPlace` dòng 9–12; `tripSessionService.ts` dòng 92–130 và 141–169; `models/TripSession.ts`, `routes/tripRoutes.ts`.
- **Bằng chứng SOURCE FINDING:** create chỉ kiểm `itinerary?.days` truthy rồi `.flatMap`/`activities.map`; update nhận days/itinerary, notes, spent, isPublic nhưng chỉ validate preferences tại service. TS interface không validate JSON runtime. Check-in chỉ kiểm có placeId/name, `verifiedViaGeo=!!geo`, chưa kiểm membership/range/accuracy đầy đủ. DB model có kiểu/NOT NULL nhưng JSONB không thay thế validation structure/business rules.
- **Ảnh hưởng:** JSON sai có thể crash/lưu structure không nhất quán, giá trị số/boolean sai và check-in ngoài lịch; chưa tái hiện HTTP/DB. Lưu create đang dùng estimated totals client gửi nên cần coi là ước tính người dùng, không verified price.
- **Ưu tiên/task:** **P0, T04** cho shape/numbers/ownership/check-in membership; **P1** cho location verification nâng cao ngoài MVP.
- **Sửa nhỏ nhất:** explicit allowlist/type/bounds cho create/update, day/activity array, IDs/coords/cost/date consistency; reject thay vì coerce tùy tiện; kiểm stop thuộc itinerary. Geo thiếu/không xác minh không gắn nhãn “đã xác thực vị trí”; không xây GPS anti-fraud. Backend derive IDs/totals theo quy ước T03 hoặc ghi field user estimate đúng semantics.
- **Acceptance:** malformed days/activities, ID/coords invalid, negative/nonfinite costs/spent, boolean/string sai →4xx có kiểm soát, không write một phần; legacy Trip hợp lệ vẫn mở; unknown stop không nâng progress; opt-out/owner isolation giữ nguyên. Invalid route UUID không gây lỗi 500. Test cases cần xây ở T04, chưa có PASS trong T02.

### F07 — Leaflet popup nội suy dữ liệu vào HTML

- **File/hàm:** `frontend/src/components/explore/MapView.tsx`, effect Update Markers, `popupHtml`/`bindPopup` dòng 80–93; `pages/TourPlannerPage.tsx`, map effect/bindPopup dòng 306; `pages/TripDetailPage.tsx`, map effect/bindPopup dòng 236.
- **Bằng chứng SOURCE FINDING:** template string chèn `place.name`, city, heroImage/alt hoặc `act.title`, description trực tiếp vào HTML string. Các trường này đến từ API/itinerary; React escaping không được áp dụng cho chuỗi truyền sang Leaflet. Chưa thử browser payload hoặc chứng minh stored XSS end-to-end.
- **Ảnh hưởng/HYPOTHESIS:** HTML/attribute injection và có khả năng script qua event handler nếu dữ liệu độc hại tới sink; khả năng khai thác/nguồn ghi cụ thể cần test, không ghi “đã khai thác”.
- **Ưu tiên/task:** **P0, T05**.
- **Sửa nhỏ nhất:** DOM nodes + `textContent` cho text, thuộc tính ảnh qua DOM API và URL allowlist/fallback; tránh dynamic HTML. Audit ba popup và dynamic divIcon tương ứng, không refactor toàn map.
- **Acceptance:** tên/description có markup hiển thị như text; chuỗi phá quote không thêm attribute/event; URL scheme ngoài policy bị fallback; popup marker bình thường vẫn render/click; kiểm cả Explore, Planner, Trip. Có browser regression đích danh ở T05, không gán test này cho historical E2E cũ.

### F08 — Profile hiển thị lưu thành công nhưng không gọi API

- **File/hàm:** `frontend/src/pages/ProfilePage.tsx::handleSave` dòng 12–16; success banner dòng 74–78; phone fallback dòng 9; Quick Stats hard-coded trong cùng file. `backend/src/routes/authRoutes.ts` chỉ login/register/GET me/profile.
- **Bằng chứng SOURCE FINDING:** handleSave chỉ preventDefault, `setSavedSuccess(true)` rồi timeout; không gọi API/update AuthContext. Có số phone fallback và stats 3/450/Hạng Vàng cố định. Chưa thao tác browser để tái hiện refresh mất thay đổi.
- **Ảnh hưởng:** người dùng nhận xác nhận persistence giả và dữ liệu tài khoản không có nguồn.
- **Ưu tiên/task:** **P0 cho bỏ success giả; P1 cho profile CRUD/polish, T07**.
- **Sửa nhỏ nhất:** hiển thị read-only các field thật từ auth, bỏ fake phone/stats và disable thông báo/nút edit chưa được hỗ trợ. Nếu rubric bắt buộc edit, làm owner API có validation + error/persistence trong scope được chốt lại, không dựng API giả.
- **Acceptance:** không có success khi chưa có server success; không có số điện thoại/stats giả. Nếu read-only, không cho submit giả; nếu edit thật, save/reload/relogin giữ dữ liệu, failure không báo success và không sửa user khác.

### F09 — Booking mới thiếu guard Business ACTIVE chung

- **File/hàm:** `backend/src/services/bookingService.ts::resolveService` dòng 18–22, `createBooking` dòng 26–35; `routes/bookingRoutes.ts` + `validators.ts::validateSecureBookingRequest`. Business model có ACTIVE/SUSPENDED.
- **Bằng chứng SOURCE FINDING:** resolver kiểm Ticket ACTIVE/Tour APPROVED/Place APPROVED và businessId, nhưng không tải/kiểm trạng thái Business cho ba nhánh; BusinessAccessService không được gọi trong create mới. Source migration được rà không cho thấy guard Business ACTIVE tự động cho booking. Attribution chỉ là kiểm bổ sung khi có requestId, không thay guard chung cho direct booking.
- **Ảnh hưởng/HYPOTHESIS:** direct booking tài nguyên còn APPROVED của Business SUSPENDED có thể qua resolver. Chưa gọi API/transaction để tái hiện, chưa khẳng định trạng thái DB hiện tại.
- **Ưu tiên/task:** **P0, T06**.
- **Sửa nhỏ nhất:** resolve/lock Business trong transaction theo thứ tự nhất quán với inventory lock, fail closed nếu thiếu/inactive trước tạo mới hoặc trừ kho; giữ idempotent replay kết quả đã commit, không đánh đồng replay với booking mới.
- **Acceptance:** tour/ticket/hotel/restaurant của suspended/missing business bị chặn, không booking/history/event/trừ inventory; ACTIVE vẫn chạy; suspend/create concurrent tuân quy tắc lock đã khóa; retry booking đã commit trả cùng kết quả theo idempotency.

### F10 — adultsCount=0 không bị xử lý nhất quán giữa validator/controller

- **File/hàm:** `backend/src/validators/validators.ts::validateSecureBookingRequest` dòng 89–101; `controllers/bookingController.ts::createBooking` dòng 6; `bookingService.ts::calculateBookingPrice` dòng 13.
- **Bằng chứng SOURCE FINDING:** validator chấp nhận adults≥0 nếu children>0 hoặc có quantity. Controller dùng `Number(adultsCount || 1)`: **số 0 bị đổi thành 1**, còn chuỗi `"0"` truthy có thể thành số 0. Với adults=0, children=0, không quantity, validator đã từ chối; không kết luận mọi zero payload đều tạo booking.
- **Ảnh hưởng:** số khách/giá server có thể khác payload tùy biểu diễn; acceptance chính sách trẻ em đi riêng chưa được chốt. Chưa tái hiện response/API.
- **Ưu tiên/task:** **P0, T06**.
- **Sửa nhỏ nhất:** bỏ fallback falsy, thống nhất normalize + validate. Theo UI hiện tại adults tối thiểu 1; đề xuất CORE reject explicit zero thay vì tự sửa. **TODO:** chủ dự án xác nhận có cần child-only/ticket quantity độc lập; nếu có, bảo toàn zero và quy tắc tính giá/quantity phải được viết rõ.
- **Acceptance:** number/string/missing/null counts không âm thầm đổi nghĩa; zero được reject hoặc giữ theo contract đã chốt, không chuyển 0→1; negative/fraction/nonfinite bị từ chối; tổng tiền và số khách từ server khớp policy và inventory.

### F11 — Server có idempotency, client retry chưa giữ cùng key

- **File/hàm:** `frontend/src/services/bookingService.ts::createBooking` dòng 20 tạo `crypto.randomUUID()` mỗi lần gọi; `components/common/BookingModal.tsx::handleSubmit` dòng 38–68 gọi lại khi người dùng retry. Backend `BookingService.createBooking` dòng 28, 30–32 tìm booking theo user+key; migration 03 có unique user/key; `integration.postgres.test.ts` dòng 199–213 đã có case cùng key/cùng booking.
- **Bằng chứng SOURCE FINDING:** idempotency backend **đã tồn tại**, client tạo key mới cho mỗi lần gọi service. `api.ts` không có automatic retry; rủi ro chính là submit lại sau timeout/mất response, không phải đã xác nhận thư viện tự retry.
- **Ảnh hưởng/HYPOTHESIS:** nếu request đầu đã commit nhưng response mất, thao tác retry tạo key khác có thể tạo booking/trừ kho lần hai. Chưa mô phỏng network timeout. Source backend cũng trả existing theo key mà chưa so payload khác; đó là gap liên quan cần chốt lifecycle key.
- **Ưu tiên/task:** **P0 retry ổn định, T06**; payload conflict cùng key **P1 hardening trong cùng task nếu có thời gian**.
- **Sửa nhỏ nhất:** key gắn một logical booking attempt tại modal/caller, reuse trên retry payload không đổi; thao tác mới/payload thay đổi tạo attempt/key mới theo state rõ. Không dùng cùng key cho mọi booking hoặc mọi user. Không thay transaction/unique guard đã có; cân nhắc 409 khi reuse key khác normalized payload.
- **Acceptance:** mô phỏng commit thành công rồi mất response → retry trả cùng booking ID, 1 history/event/outcome và inventory chỉ giảm một lần; hai lượt submit concurrent cùng key giữ invariant; attempt mới nhận key mới; đổi payload không lặng lẽ nhận booking cũ; cross-user không dùng chung kết quả.

### F12 — Tài liệu auth chưa khớp token hiện tại

- **File/hàm:** `backend/src/services/tokenService.ts::signAccessToken/verifyAccessToken`, dòng 17–29; `middlewares/authMiddleware.ts::authenticate`; `routes/authRoutes.ts`; `frontend/src/context/AuthContext.tsx::persistSession/logout`; `frontend/src/services/api.ts` interceptor.
- **Bằng chứng SOURCE FINDING:** token là **hai phần** `base64url(payload).HMAC-SHA256(payload)`, có iat/exp; không phải JWT ba phần có JOSE header. Frontend lưu `travelgo_token`/user trong localStorage, gọi `/auth/me` khi reload và clear session khi 401; logout local, không thấy refresh/revoke endpoint.
- **Mâu thuẫn cụ thể:** bản bàn giao dòng 43 nói có refresh token; Master Plan ngày 12/10 có hàng “Auth, refresh token, RBAC”; nhiều báo cáo gọi token JWT. `MULTI_ROLE_PHASE_3_5.md` dòng 164 lại ghi đúng rằng chưa có refresh-token endpoint. **Dòng refresh-token trong bản bàn giao trước là sai so với source.**
- **Ảnh hưởng:** sơ đồ/auth contract và phần bảo vệ dễ mô tả cơ chế chưa có; không tự suy lỗ hổng chữ ký chỉ vì token là custom format.
- **Ưu tiên/task:** **P1, T07**; tài liệu đúng nằm trong CORE bàn giao.
- **Sửa nhỏ nhất:** cập nhật tài liệu hiện hành/sơ đồ để gọi access token HMAC có hạn, mô tả storage/expiry/401/logout; ghi chú lịch sử thay vì giả vờ đã có refresh/revocation. Không thêm auth rewrite để làm tài liệu thành đúng.
- **Acceptance:** docs/API/example không quảng bá refresh-cookie/JWT standard khi source chưa có; invalid/expired/signature/role behavior được đối chiếu test hiện có và kiểm thêm khi bị thay đổi; không lưu/in token thật vào báo cáo.

## 7. Thứ tự task và deliverable

Chuỗi sửa web bắt buộc: **T03 Planner → T04 Trip → T05 Popup → T06 Booking → T07 UI**. Con người thực hiện data/pilot riêng song song; các task sửa không chờ corpus. Ước lượng là ngày làm việc tập trung, chưa phải cam kết; thiếu DB test không cản unit/source work nhưng chặn acceptance persistence tương ứng.

| Task | Phạm vi / dependency | Deliverable và điều kiện dừng | Ước lượng |
|---|---|---|---:|
| **T03 Planner** | F01/F02/F03/F05; quy ước ngày/đêm/đơn vị chi phí; thay UI control tối thiểu đi cùng contract, không làm UI tổng thể | Validator và planner fix nhỏ; targeted tests; so sánh fail→pass cho lỗi được sửa khi có thể; giữ mandatory/preference behavior; build các workspace bị đổi. Dừng trước Trip/Booking | 2–3 ngày |
| **T04 Trip** | Sau T03, dùng contract ngày/cost; F04/F06 | Validate create/update/check-in tối thiểu, derive IDs/totals nhất quán và ownership; targeted persistence/reopen khi DB đúng guard. Dừng trước map/Booking | 2–3 ngày |
| **T05 Popup** | Sau T04 để biết shape itinerary; F07 ở cả ba sink | DOM/text/URL handling, browser checks đích danh, giữ marker behavior; không refactor toàn bản đồ | 1–2 ngày |
| **T06 Booking** | Sau T05; F09/F10/F11; có thể sửa service/modal để giữ key | Active-business guard, counts policy, retry key lifecycle; targeted concurrency/rollback/attribution/timeout evidence đúng DB; không payment integration | 2–3 ngày |
| **T07 UI** | Sau T06; F08/F12 và nối kiểm UX luồng CORE | Profile trung thực, bỏ fake state, loading/error/retry; đồng bộ docs auth; Customer E2E và role regression có liên quan; không làm lại giao diện toàn site | 1–2 ngày |
| **Data/pilot do con người** | Song song T03–T07, theo T01; có người giữ test và A/B/C | Consent thật, pilot riêng, annotations/groups/audit; quyết định 06/11 và khóa 10/11; không tự sinh text/receipt | Theo năng lực thực, TODO |
| **Sentiment A hoặc B** | Sau quyết định/khóa dữ liệu; không chặn chuỗi web | A: sửa protocol rồi thí nghiệm, report/card/hash; B: đóng gói demo và giới hạn. Integration chỉ OPTIONAL | A dự trù 3–5 ngày; B 0,5–1 ngày, cần điều chỉnh theo data |
| **Review trước freeze** | Sau các task CORE; branch sentiment có đầu ra minh bạch | Build/regression cần thiết, outstanding P0=0, bug list P1, snapshot/code/test evidence; go/no-go nội bộ 24/11 | 2–3 ngày dự phòng |

Không coi thời gian rảnh của người gán nhãn là thời gian rảnh của coding agent. Nếu một người vừa viết web vừa quản lý collection, phải tính tải thực; không tăng số task để lấp lịch.

## 8. Lịch 6 tuần và điểm cắt scope

| Tuần | Ngày | Chuỗi web / báo cáo | Nhánh dữ liệu/sentiment |
|---|---|---|---|
| 1 | **28/10–03/11** | T02 chốt scope; T03, bắt đầu T04 nếu đủ thời gian; ghi evidence phát hiện mới | Điền TODO T01; người thật thu/gán pilot 45–60; main collection sau pilot/guideline |
| 2 | **04–10/11** | Hoàn tất T04 → T05 → bắt đầu T06 theo năng lực; web tiếp tục dù corpus thiếu | **06/11 quyết định A/B**, A có điều kiện phải có số liệu/nguồn lực cụ thể; **10/11 khóa** hoặc chuyển B |
| 3 | **11–17/11** | Hoàn tất T06 → T07; integration kiểm chỗ thay đổi; cập nhật báo cáo dần | A: protocol + CPU experiment/evaluation đúng split; B: giữ demo-only và viết giới hạn. Không chạy thử model mới để kéo deadline |
| 4 | **18–24/11** | Xử lý CORE còn lại, targeted regression, video sơ bộ, đóng acceptance; **freeze 24/11** | Hoàn tất artifact/card/report A hoặc B; không tiếp tục thu để tune test đã mở; cắt toàn bộ OPTIONAL chưa xong |
| 5 | **25/11–01/12** | Báo cáo/slide/sơ đồ/bảng evidence/video dự phòng; sửa lỗi nghiêm trọng làm hỏng demo hoặc sai dữ liệu, kiểm lại đúng phạm vi | Không đổi corpus/model để chạy đua F1; mô tả hạn chế và branch đã chọn |
| 6 | **02–08/12** | Luyện bảo vệ, Q&A, kiểm đóng gói/repro trên môi trường nộp và final artifacts; ngày nộp thật TODO | Không mở feature/model mới; xử lý chỉ lỗi tái lập/sai số liệu nghiêm trọng có version/evidence |

Giờ quyết định/khóa/freeze: TODO công bố; dùng giờ Việt Nam. Sau freeze chỉ sửa lỗi nghiêm trọng về an toàn, mất dữ liệu, chạy demo hoặc tính đúng số liệu; ghi lý do, diff và kiểm lại phần ảnh hưởng. Không dùng ngoại lệ này để thêm feature.

Nếu tiến độ chậm: cắt OPTIONAL trước; giữ Profile read-only và một pacing thực thi thật; dùng nhánh B nếu gate dữ liệu không đạt. Nếu rubric không chấp nhận B, đó là blocker học thuật phải xử lý với giảng viên, không tự thay kết luận kỹ thuật thành PASS.

## 9. Baseline và chiến lược kiểm tra có giới hạn

### 9.1. Baseline lịch sử được tái sử dụng làm tham chiếu

| Bằng chứng | Ngày / môi trường đã ghi | Commit và cách sử dụng |
|---|---|---|
| M3-B correctness report: 8 golden, pagination 2, exposure 6, recommendation HTTP 50, core integration 14, build backend | **15/10/2026**, PostgreSQL local `travelgo_ai_m0_test`; guard/sentinel, PostGIS 3.4.3 | Commit run gốc **TODO/chưa ghi trong report**. Report nằm trong HEAD kiểm kê, không đồng nghĩa run xảy ra tại HEAD; dùng case/expected behavior làm baseline |
| M3-C report: Explore UI unit 4, E2E 4, frontend build | **15/10/2026**, Edge headless, desktop/mobile 390×844, DB cô lập như report | Run commit TODO; giữ evidence lịch sử cho controls/reason/consent, không chứng minh popup injection đã được test |
| M3-D report: mandatory 9, algorithms 14, correctness 8, recommendation+Planner HTTP 52, Favorite 59, core integration 14 | **15/10/2026**, `travelgo_ai_m0_test`, 10 migrations/23 tables/39 FKs, PostGIS 3.4.3 | Run commit TODO; dùng cho behavior mandatory/create/reopen/ownership đã kiểm, không suy thành update IDs/cost/night validation PASS |
| M3-D E2E desktop/anonymous/mobile 3, M3-C regression 4, role E2E 3, backend/frontend production builds | **15/10/2026**, Edge headless, 1 worker theo report | Run commit TODO; reuse kịch bản và kết quả có phạm vi; chạy lại chỉ khi luồng/source/môi trường liên quan thay đổi hoặc cần xác nhận bản nộp |
| Kaggle demo/evidence | Report xác minh **15/10/2026**, user-provided Kaggle CPU evidence, demo-only; T01/bản bàn giao có kiểm artifact local ngày 28/10 | Không phải quality baseline tiếng Việt. T02 chưa kiểm checksum lại hay rerun notebook; không cần train lại cho scope docs |

Không cộng các suite chồng lấn thành tổng “N tests” duy nhất. Historical PASS vẫn có giá trị đúng phạm vi, không được ghi là T02 vừa PASS hoặc bảo đảm các gap mới không tồn tại.

### 9.2. Môi trường T02 thực sự đã kiểm

- Host shell PowerShell, Windows; cwd workspace `travelgo`.
- `node --version` → **v24.20.0**; `npm.cmd --version` → **11.19.0**. Lệnh `npm --version` qua `npm.ps1` bị execution policy chặn; dùng `npm.cmd` đọc version thành công, không đổi policy.
- Đã đọc scripts/dependency declarations, **chưa xác nhận installed dependency versions/lockfile parity, compiler, browser, server hoặc DB readiness**. Version range trong package.json không phải version runtime đã xác minh.
- Test/build/API/browser/DB: **NOT RUN trong T02**, không phải FAILED. Read-only source audit không tạo bằng chứng runtime mới cho F01–F12.

### 9.3. Chọn đúng kiểm tra ở task sửa tiếp theo

| Thay đổi | Kiểm tra cần thiết, chạy khi có điều kiện |
|---|---|
| T03 planner/date/cost/mode | Targeted unit/golden cho regression mới; `test:algorithm`, `test:planner:mandatory`, recommendation unit nếu touched selection; backend build; frontend build nếu đổi control. E2E flow bị đổi khi DB đủ guard |
| T04 Trip/IDs/checkin | Targeted validation/derive tests; PostgreSQL create/update/reopen/ownership và check-in đúng DB; preferences/mandatory regression vì dùng chung shape |
| T05 popup | Frontend type/build và browser checks đích danh ba sink; không chạy lại mọi ML/DB suite chỉ vì đổi render text |
| T06 Booking | Counts/pricing validation + transaction/ACTIVE business/idempotency/concurrency/rollback; recommendation attribution/telemetry nếu chạm code chung; browser lost-response retry theo đúng setup |
| T07 UI/docs | Frontend build/targeted profile/session tests; Customer main flow và role scenarios bị tác động. Auth docs-only không cần chạy lại toàn backend nếu source/env không đổi |
| Bản freeze/bản nộp | Một lượt kiểm tổ hợp trọng yếu trên source snapshot và môi trường đã khóa; lỗi mới/chỉnh source/chuyển env mới làm phát sinh kiểm lại, không lặp toàn bộ suite sau mỗi sửa chữ |

Scripts có thật: backend `build`, `test`, `test:algorithm`, `test:planner:mandatory`, `test:recommendation:unit`, `test:recommendation`, `test:integration`, `test:intelligence`, `test:telemetry`, `test:favorite`, `test:review`, `db:verify`; frontend `build`, `test:explore-ui`, `test:e2e`. Dùng `npm.cmd` trong PowerShell hiện tại. `test:recommendation` và nhiều script khác **có build và/hoặc DB**, không coi toàn bộ là unit thuần. `test:e2e` có thể khởi động backend và ghi DB.

Không tạo test chỉ mirror implementation. Ưu tiên regression có trigger rõ cho sai ngày/đêm, stale IDs, injection, retry sau commit. Lệnh cụ thể/setup sẽ được chốt tại task sửa, không khởi chạy từ T02.

### 9.4. Điều kiện bắt buộc trước test có database

Đọc guard tại `backend/src/utils/testDatabaseGuard.ts`: `assertIsolatedTestDatabase`, `assertTestDatabaseWriteOptIn`, `assertDatabaseSentinel`. Trước bất kỳ PostgreSQL integration/E2E có write:

1. Xác nhận host loopback và target test đã chủ động cho phép, ưu tiên database lịch sử `travelgo_ai_m0_test`; không suy an toàn chỉ từ tên có chữ test/dev.
2. Cấu hình process rõ `NODE_ENV=test`, `DB_NAME` đúng target, `TEST_DATABASE_NAME` **khớp chính xác DB_NAME**, `ALLOW_TEST_DB_WRITES=true`; không sửa `.env` mặc định để tiện chạy.
3. Xác minh identity database thực và sentinel **`hugotravel-isolated-test-database-v1`**, schema/migration/checksum prerequisites, account fixture và quyền truy cập; thiếu credential chỉ hỏi cách cung cấp an toàn, không ghi secret vào scope.
4. Xác nhận E2E backend kế thừa đúng environment: `frontend/playwright.config.ts` đặt ports/origin nhưng không tự chọn DB/sentinel hoặc bật guard hộ.
5. Không reset/DROP/TRUNCATE/seed/migrate để dò lỗi. Nếu cần fixture/migration riêng ở task sau, phải có target và guard đã xác minh; không seed đè database khác để làm test PASS.

**Trạng thái DB hiện tại: UNVERIFIED trong T02.** Chưa chạy integration, seed, migrate hoặc E2E. Nếu guard/sentinel chưa đủ, ghi test liên quan NOT RUN/BLOCKED BY SETUP ở task đó; vẫn hoàn thành unit/source work độc lập. Không gán HTTP/PostgreSQL acceptance PASS bằng unit mock.

### 9.5. Bằng chứng cần lưu cho mỗi lần chạy sau này

Ngày/giờ + timezone; commit và dirty diff/source hash nếu chưa commit; command/cwd; Node/npm và dependency/lockfile version thực; DB identity/guard/schema không chứa secret hoặc browser/viewport nếu liên quan; case/count/exit code/log locator; phần chưa chạy và lý do. Không tự gắn commit run cũ khi report không ghi.

## 10. Blocker và quyết định chủ dự án cần trả lời

| Cần trả lời | Ảnh hưởng | Tạm thời để tiến hành |
|---|---|---|
| **Rubric chính thức, yêu cầu bắt buộc về model train/dataset/inference và ngày nộp?** | Chặn xác nhận scope đủ chuẩn học thuật; B chưa được trường xác nhận | Giữ lịch giả định 28/10–08/12, freeze 24/11; xin xác nhận B sớm, không chờ tới freeze |
| **Có những ai thực hiện annotation A/B/C và giữ final test; bao nhiêu giờ/ngày?** | Chặn tính khả thi nhánh A, quyết định 06/11 | Sửa web vẫn tiếp tục; chưa có nguồn lực thì không hứa dữ liệu thật |
| **T01 đã chốt công cụ/notice/retention/kênh rút và giờ 06/11,10/11 chưa?** | Chặn mở form hợp lệ/khóa corpus | Tất cả còn TODO thì chưa thu; không tạo receipt hộ |
| **DB test đúng sentinel có còn sẵn và được phép dùng ở task sửa không?** | Chặn test persistence/concurrency/E2E; không chặn T03 unit/source work | Chỉ xác minh setup tại task sau, không hỏi/in mật khẩu trong tài liệu |
| **Có bắt buộc giữ đủ ba pacing, flight/train và profile edit trong demo không?** | Có thể tăng scope T03/T07 | Đề xuất balanced, car/motorbike estimate và profile read-only; các tính năng chưa hỗ trợ phải thể hiện rõ |
| **Chuyến 1 ngày có cần overnight tùy chọn; booking có cho adults=0/child-only hoặc quantity-only không?** | Chốt contract cho F01/F10 | Đề xuất 0 đêm theo ngày; adults≥1 như UI, explicit zero không bị đổi thành 1. Nếu cần ngoại lệ, ghi policy/test trước sửa |

Các TODO này không chặn việc hoàn thành T02. Những câu hỏi về rubric/nguồn lực không tự trao quyền đổi scope, thu dữ liệu hoặc chạy DB. Không cần đợi đủ corpus để giao T03.

## 11. Task sửa code đầu tiên được đề xuất: T03 Planner

**Mục tiêu nhỏ nhất mở đầu:** sửa tính ngày/đêm và validate input trước compute; khóa contract cost/mode, giữ mandatory-place regression. Ưu tiên F01/F05 trước, sau đó làm control pacing/transport trung thực theo F02/F03. Không bắt đầu T04–T07 trong cùng task nếu chưa được giao.

Prompt có thể dùng ở lượt tiếp theo:

> TASK T03 — Sửa Planner theo `docs/HUGO_6_WEEK_SCOPE.md`, mục F01/F02/F03/F05. Đọc source và test liên quan trước. Viết regression có ý nghĩa cho chuyến 1 ngày/0 đêm, 2 ngày/1 đêm, ngày invalid/đảo/vượt giới hạn, counts/budget/enum sai; xác nhận lỗi ở phạm vi kiểm thử có thể chạy. Sửa nhỏ nhất validator và ngày/đêm/totals, giữ mandatory Place đúng một lần và preference/eligibility. Nối mode hỗ trợ thật; các pacing/transport chưa thực thi phải disable/label trung thực, không hứa 4+ điểm hay tính vé bay/tàu. Quy ước per-person/per-group phải nhất quán cả generate và thao tác xóa activity. Chỉ chạy targeted checks phù hợp; DB/E2E chỉ sau preflight guard/sentinel đúng DB cô lập. Giữ code/test/doc changes reviewable, ghi ngày/commit/môi trường và phần chưa chạy; không sửa Trip/Booking, train, tạo corpus/consent, đổi manifest, push hoặc deploy. Dừng sau T03.

Đây là **đề xuất giao việc tiếp theo**, chưa phải T03 đã được thực thi hay đã được cấp quyền bởi việc tạo T02.

## 12. Điều kiện kết thúc T02

Một file scope/backlog có CORE/OPTIONAL/OUT_OF_SCOPE, branch A/B và mốc ngày, triage có file/hàm/evidence/impact/priority/fix/acceptance, thứ tự T03–T07, baseline có nguồn/ngày/giới hạn và blocker thực tế. Không ghi PASS mới cho hành vi chưa chạy; không thay manifest BLOCKED hoặc chỉnh business logic.
