# HuGo Intelligence 2.0 — M3-D Place to Itinerary Report

Ngày hoàn thành: 2026-10-15 (Asia/Ho_Chi_Minh)  
Trạng thái: **COMPLETE — END-TO-END PASS**  
Phạm vi: Recommendation Place → Place Detail → Tour Planner → Save/Reopen Trip  
Database write test duy nhất: `travelgo_ai_m0_test`

## 1. Kết luận

M3-D đã hoàn tất luồng MVP thực tế từ Place được gợi ý đến Trip đã lưu. Người dùng đăng nhập có thể mở Place Detail, chọn **“Thêm vào lịch trình”**, kiểm tra hoặc bỏ chọn Place, tạo lịch trình có đúng Place đó, lưu Trip, refresh và mở lại từ danh sách chuyến đi. Người chưa đăng nhập được chuyển đến Login bằng return state an toàn; sau login quay lại Planner đúng Place và không có Trip giả được tạo.

Backend không dùng tên, giá, category hay recommendation metadata từ URL/client để quyết định Place bắt buộc. Client chỉ chuyển Place UUID; backend tự đọc catalog PostgreSQL, xác minh eligibility, Business status, destination và sức chứa lịch trình. Không có migration mới vì `trip_sessions.itinerary` và `trip_sessions.selected_place_ids` đã đủ.

## A. File đã chỉnh sửa

### Backend

- `backend/src/services/tourPlannerService.ts`
  - thực thi `mandatoryPlaceIds`;
  - validation UUID/số lượng/eligibility/destination/capacity;
  - chèn attraction/restaurant/hotel theo slot hiện có;
  - loại lặp, kiểm tra post-condition và trả `selectedPlaceIds`;
  - lọc Business không ACTIVE và giữ tương thích Place legacy không có Business;
  - sửa diễn giải recommendation/GIS/ngân sách cho đúng khả năng thật.
- `backend/src/services/tripSessionService.ts`
  - khử trùng `selectedPlaceIds` khi lưu;
  - trả `selectedPlaceIds` khi mở lại Trip.
- `backend/src/tests/tourPlannerMandatory.test.ts` — mới, 9 golden/unit scenarios.
- `backend/src/tests/recommendation.postgres.test.ts`
  - bổ sung generate/save/reopen/ownership và Business SUSPENDED cho mandatory Place.
- `backend/package.json` — thêm script `test:planner:mandatory`.

### Frontend

- `frontend/src/pages/PlaceDetailPage.tsx`
  - CTA responsive **“Thêm vào lịch trình”**;
  - chỉ chuyển Place ID trong query;
  - anonymous dùng Login return state có sẵn.
- `frontend/src/pages/TourPlannerPage.tsx`
  - đọc `mandatoryPlaceId` từ URL;
  - yêu cầu đăng nhập khi query có Place;
  - tải lại Place canonical từ API;
  - hiển thị tên/city/category/giá tham khảo, loading/error;
  - cho bỏ chọn trước generate;
  - gửi `mandatoryPlaceIds` đến backend;
  - bảo vệ activity bắt buộc khỏi xóa sau generate;
  - hiển thị lỗi generate/save rõ ràng;
  - ghi rõ Haversine là đường chim bay, không phải road routing.
- `frontend/src/pages/TripDetailPage.tsx` — marker ổn định để xác minh Place đã lưu/mở lại.
- `frontend/src/pages/MyTripsPage.tsx` — marker Trip ID để E2E mở lại đúng Trip.
- `frontend/src/types/index.ts` — thêm `selectedPlaceIds` vào generated itinerary và Trip response.
- `frontend/e2e/m3d-place-itinerary.spec.ts` — mới, desktop/anonymous/mobile.
- `frontend/e2e/roles.spec.ts`
  - làm test consent ổn định với consent decision đã lưu;
  - cuộn card vào viewport trước khi chờ server-verified visible impression.

### Báo cáo

- `docs/HUGO_AI_M3_D_PLACE_TO_ITINERARY_REPORT.md`.

Không sửa migration 01–10, schema, `.env`, registry/manifest AI hoặc model.

## B. Luồng dữ liệu Place → Planner → Generate → Save Trip

```text
Explore recommendation card
  -> /places/:placeId?recommendationRequestId=...
Place Detail
  -> CTA "Thêm vào lịch trình"
  -> nếu anonymous: /login với state.from an toàn
  -> nếu authenticated: /tour-planner?mandatoryPlaceId=:uuid
Tour Planner
  -> GET /api/places/:uuid để hiển thị dữ liệu canonical
  -> người dùng kiểm tra/bỏ chọn và giữ nguyên các tùy chọn planner
  -> POST /api/tours/plan { ..., mandatoryPlaceIds: [uuid] }
Backend Planner
  -> đọc catalog server-side
  -> xác minh Place/Business/city/capacity
  -> chèn đúng Place vào activity và kiểm tra post-condition
  <- itinerary + selectedPlaceIds
Save Trip
  -> POST /api/trips (JWT; không nhận userId từ client)
  -> owner lấy từ req.user.id
  -> selected_place_ids được suy ra và khử trùng từ itinerary activities
Reopen
  -> GET /api/trips/:id dùng findOwned(id, req.user.id)
  <- itinerary + selectedPlaceIds của đúng owner
```

Refresh trước generate giữ Place nhờ query ID. Refresh/relogin sau save giữ Place nhờ PostgreSQL `itinerary` và `selected_place_ids`.

## C. Contract và quy tắc `mandatoryPlaceIds`

### API generate hiện có, được hoàn thiện

`POST /api/tours/plan`

Body bổ sung/đã có:

```json
{
  "destinationCity": "Đà Nẵng",
  "startDate": "2027-06-01",
  "endDate": "2027-06-01",
  "mandatoryPlaceIds": ["uuid"]
}
```

Response có thêm:

```json
{
  "data": {
    "days": [],
    "selectedPlaceIds": ["uuid"]
  }
}
```

Quy tắc:

1. `mandatoryPlaceIds` phải là array, tối đa 10 phần tử raw.
2. Mỗi phần tử phải là UUID hợp lệ.
3. Duplicate ID được khử idempotent; một Place chỉ được chèn một lần.
4. Place phải có `status=APPROVED` khi trường status tồn tại.
5. Place có `business_id` chỉ hợp lệ khi Business `ACTIVE`; Place legacy `business_id=null` vẫn được phép.
6. `city` hoặc `province` phải phù hợp destination sau NFC/lowercase normalization.
7. Sức chứa MVP:
   - attraction/tour Place: tối đa 2 Place bắt buộc/ngày;
   - restaurant: tối đa 1 Place bắt buộc/ngày;
   - hotel: tối đa 1 Place bắt buộc/chuyến.
8. Mandatory Place đứng trước candidate thường trong slot cùng loại; không có silent substitution.
9. Sau khi lập lịch, backend kiểm tra mọi mandatory ID thật sự xuất hiện trong itinerary.
10. Khi không có `mandatoryPlaceIds`, planner cũ tiếp tục hoạt động.

Mã lỗi chính:

- `400 INVALID_MANDATORY_PLACE_IDS`
- `400 INVALID_MANDATORY_PLACE_ID`
- `400 MANDATORY_PLACE_LIMIT_EXCEEDED`
- `422 MANDATORY_PLACE_UNAVAILABLE`
- `422 MANDATORY_PLACE_DESTINATION_MISMATCH`
- `422 MANDATORY_PLACE_CAPACITY_EXCEEDED`
- `422 MANDATORY_PLACE_SCHEDULING_FAILED`

### Ownership và privacy

- `POST /api/trips` và toàn bộ `/api/trips/*` yêu cầu JWT + role cho phép.
- `userId` lấy từ JWT; client không được chọn owner.
- đọc/sửa/xóa Trip dùng `TripRepository.findOwned`.
- Place bắt buộc chỉ truyền bằng UUID; metadata hiển thị và lập lịch được server resolve lại.
- Luồng M3-D không thu thập hoặc lưu GPS người dùng. Tọa độ trong itinerary là tọa độ catalog công khai của Place để hiển thị bản đồ; không phải raw device location.
- Giá là `priceFrom`/ước tính planner, không phải cam kết giá thực tế.
- Haversine và transit minutes chỉ được ghi là ước lượng tham khảo, không tuyên bố road routing tối ưu.

## D. Kết quả kiểm thử thực tế

### D1. Bằng chứng FAIL trước sửa

Golden test đầu tiên chạy trên implementation cũ thất bại:

```text
Tour planner mandatory-place tests failed
AssertionError: 0 !== 1
```

Place bắt buộc có rank thấp xuất hiện 0 lần, xác nhận service đã bỏ qua `mandatoryPlaceIds`.

### D2. Database guard — PASS

Lệnh `npm run db:verify` với target explicit `travelgo_ai_m0_test`:

- database: `travelgo_ai_m0_test`;
- sentinel/write guards: PASS;
- PostGIS: `3.4.3`;
- migrations: 10;
- application tables: 23;
- foreign keys: 39.

Không reset, DROP hoặc TRUNCATE. Không kết nối write-test sang database khác.

### D3. Unit/golden — PASS

| Suite | Kết quả | Bằng chứng |
|---|---:|---|
| Mandatory Place golden tests | **PASS 9/9** | valid, missing, invalid UUID, max count, ineligible, duplicate, wrong city, no capacity, no mandatory |
| Algorithm/GIS regression | **PASS 14/14** | Bayesian, preference, budget, clustering, normal planner |
| Recommendation exposure unit | **PASS 6/6** | contract/spoof/visibility |
| Recommendation correctness | **PASS 8/8** | filter, center, fallback, eligibility, explanation, deterministic rank, score tolerance, opt-out |
| Repository pagination | **PASS 2/2** | 101 candidates qua 2 pages |
| Telemetry contract | **PASS 9/9** | consent/event contract |
| RBAC static/unit | **PASS** | auth, ownership, visibility, price/capacity/transitions |
| M3-C Explore UI unit | **PASS 4/4** | budget, request payload, reasons, fallback |

### D4. PostgreSQL/HTTP — PASS

| Suite | Kết quả | Nội dung liên quan |
|---|---:|---|
| Recommendation + Planner PostgreSQL | **PASS 52 checks** | Business SUSPENDED bị loại; mandatory hotel generate đúng một lần; save; DB selected IDs; reopen; cross-user 404; attribution/opt-out |
| Core integration PostgreSQL | **PASS 14 checks** | Trip persistence/ownership, Booking, partner/admin RBAC, planner/preferences |
| Favorite PostgreSQL | **PASS 59 checks** | idempotency/concurrency, owner isolation, consent, verified attribution, privacy deletion |

### D5. Frontend E2E — PASS

M3-D Edge headless, 1 worker:

- **PASS 1/1 desktop full flow** — Explore → recommendation → detail → CTA → query refresh → generate → exact Place once → save → Trip detail → refresh → My Trips → reopen; 5.3 giây.
- **PASS 1/1 anonymous** — CTA → Login → login return đúng Planner, không có `POST /api/trips`; 1.2 giây.
- **PASS 1/1 mobile 390×844** — CTA/panel/remove/re-add/generate hoạt động và không horizontal overflow; 2.0 giây.

Regression:

- **M3-C E2E PASS 4/4** — preference/budget/explanation/Favorite, stale response, anonymous fallback, personalization opt-out.
- **Role E2E PASS 3/3** — Customer Favorite/Review/Booking/Trip/refresh, Partner, Super Admin. Hai lần chạy đầu phát hiện giả định cũ của test về consent banner/viewport; test được sửa tối thiểu, lần chạy cuối PASS 3/3 trong 37.3 giây.

### D6. Build và hygiene — PASS

- backend production TypeScript build: **PASS**.
- frontend production `tsc && vite build`: **PASS**, 1,728 modules transformed.
- `git diff --check`: **PASS**; chỉ có cảnh báo dự kiến LF/CRLF của worktree Windows, không có whitespace error.

Không có nhóm bắt buộc nào BLOCKED.

## E. Tình huống lỗi đã kiểm tra

- UUID không hợp lệ;
- array vượt giới hạn;
- Place không tồn tại;
- Place APPROVED nhưng thuộc Business SUSPENDED;
- Place sai city/destination;
- số mandatory Place vượt slot itinerary;
- ID lặp;
- query Place không tải được ở frontend;
- anonymous CTA và login-return không redirect loop;
- anonymous không phát sinh Trip;
- cross-user mở Trip nhận 404;
- refresh/reopen giữ đúng Place;
- responsive mobile không overflow;
- normal planner không có mandatory ID không bị hỏng;
- Favorite, Review, Booking, consent, attribution và recommendation regression.

## F. Hạn chế và phần chưa thực hiện

- Frontend M3-D hiện chọn một Place từ một Place Detail; backend đã hỗ trợ tối đa 10 ID để giữ contract mở nhưng chưa có UI multi-select.
- Planner dùng heuristic, tối đa hai sightseeing slot/ngày, một lunch restaurant/ngày và một hotel/chuyến; không phải bài toán tối ưu tuyến đường.
- Transit minutes là ước lượng từ Haversine/detour factor, không dùng road network, traffic hoặc routing provider.
- `priceFrom` và tổng chi phí là ước tính demo, không phải báo giá/booking guarantee.
- Không mở rộng TourPackage/Ticket, sentiment DEMO_ONLY, Learning-to-Rank, chatbot hoặc model mới.
- Không có migration, deploy, push hoặc publish.

Các hạn chế trên là **DEFER**, không chặn demo M3-MVP đã khóa phạm vi.

## G. Trạng thái M3-MVP

**M3-MVP: COMPLETE END-TO-END trong phạm vi Place recommendation heuristic/Bayesian đã chốt.**

Lý do:

- M3-B correctness/eligibility/consent đã PASS;
- M3-C Explore preference/budget/explanation đã PASS;
- M3-D đã nối Place Detail → Planner → PostgreSQL Trip và E2E desktop/mobile/anonymous đều PASS;
- không sử dụng sentiment DEMO_ONLY và không claim Learning-to-Rank;
- không còn blocker P0 cho kịch bản demo recommendation → itinerary.

## H. Hướng dẫn demo thủ công

1. Khởi động backend và frontend theo cấu hình local hiện có; không chạy seed/migration nếu không chủ động làm việc với database test đã guard.
2. Đăng nhập tài khoản Customer.
3. Mở **Khám phá**, chọn sở thích, nhập ngân sách và chọn category/city.
4. Quan sát rank/lý do, mở **Chi tiết** một Place.
5. Nhấn **Thêm vào lịch trình**.
6. Ở Planner, kiểm tra panel **Địa điểm bắt buộc**; thử **Bỏ chọn** nếu muốn rồi quay lại chọn lại.
7. Chọn ngày, số khách, ngân sách, phương tiện, sở thích và nhịp độ. Destination phải phù hợp với Place.
8. Nhấn **Tạo lịch trình cho tôi**; kiểm tra Place xuất hiện đúng một lần. Khoảng cách là Haversine tham khảo.
9. Nhấn **Lưu hành trình này**; chờ chuyển sang `/my-trips/:id`.
10. Refresh trang, sau đó vào **Chuyến đi của tôi** và mở đúng Trip; Place vẫn phải hiển thị.
11. Để demo anonymous, đăng xuất, mở Place Detail và nhấn CTA; hệ thống phải yêu cầu đăng nhập và không tạo Trip trước khi người dùng bấm Save.

---

M3-D dừng tại đây. Không tự bắt đầu milestone tiếp theo.
