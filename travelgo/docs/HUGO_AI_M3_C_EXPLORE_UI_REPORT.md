# HuGo Intelligence 2.0 — M3-C Explore Preferences, Budget & Explainable Recommendation UI

**Ngày thực hiện:** 2026-10-15  
**Phạm vi:** Explore frontend + test; tái sử dụng nguyên backend M3-B  
**Trạng thái:** **M3-C COMPLETE — M3-D chưa được bắt đầu**

## Tóm tắt

Explore đã có luồng demo hoàn chỉnh cho Place recommendation:

`preference chips + ngân sách + category/city/search/minRating → server rank M3-B → why/reason chips → typed fallback → Detail → server-side Favorite`

Authenticated UI không còn tự sort hoặc giả lập ranking. Anonymous dùng public Place API, không gọi API recommendation có JWT và không tạo requestId/visible impression. Personalization opt-out vẫn dùng one-shot preference/budget nhưng không lưu chúng ở localStorage/profile và client không gửi visible acknowledgement khi analytics tắt.

Không sửa backend, migration, database schema, model AI, sentiment hoặc Place → Planner.

## A. File đã sửa

| File | Nội dung |
|---|---|
| `frontend/src/pages/ExplorePage.tsx` | State preference/budget; payload M3-B; loading/error/retry/empty; typed fallback; anonymous mode; request sequence chống race; ranking label; responsive list/map |
| `frontend/src/components/explore/FilterBar.tsx` | Preference chips từ `PREFERENCE_OPTIONS`; budget validation UI; category attraction/hotel/restaurant; public sort thật; server-rank label authenticated; opt-out note |
| `frontend/src/components/explore/PlaceSidebar.tsx` | Hiển thị `why`, tối đa 3 evidence chips, rank, giá tham khảo; chỉ attribution khi analytics bật |
| `frontend/src/services/recommendationService.ts` | Type tương thích ngược cho `fallback` và `rankingContext` M3-B |
| `frontend/src/utils/exploreRecommendation.ts` | Pure validation/payload/reason/fallback helpers |
| `frontend/tests/exploreRecommendation.test.ts` | 4 unit scenarios cho budget, payload, reason evidence và fallback |
| `frontend/e2e/m3c-explore.spec.ts` | 4 E2E: Customer, stale response race, anonymous, personalization opt-out; desktop/mobile |
| `frontend/package.json` | Script `test:explore-ui` |
| `docs/HUGO_AI_M3_C_EXPLORE_UI_REPORT.md` | Báo cáo này |

## B. Bằng chứng giao diện trước/sau

### Trước M3-C

- `explicitPreferences` bị hard-code `[]`;
- không có budget input;
- category `tour` dễ bị hiểu nhầm với TourPackage;
- authenticated sort selector trông có tác dụng nhưng không thay đổi server rank;
- card bỏ qua `why`, `reasonCodes`, typed fallback;
- response cũ có thể ghi đè response mới;
- opt-out vẫn đưa requestId vào visibility hook dù server không ghi impression.

### Sau M3-C

- panel “Gợi ý theo tiêu chí của bạn” đồng bộ visual HuGo hiện có;
- 8 preference chips dùng allowlist duy nhất `PREFERENCE_OPTIONS`;
- budget có đơn vị `VND/ngày/người`, preview định dạng và disclaimer `priceFrom`;
- category chỉ gồm `all/attraction/hotel/restaurant`, không quảng bá TourPackage/Ticket;
- authenticated hiển thị “Xếp hạng từ server”, không có sort giả;
- anonymous có sort public thật: Bayesian/price ascending/price descending;
- mỗi recommendation card có rank, server `why`, evidence chips và giá “tham khảo từ”;
- có loading, empty, error, retry, typed fallback banner và mode label;
- layout giữ split list/map desktop, toggle list/map mobile.

Môi trường hỗ trợ Edge headless và đã kiểm chứng UI bằng locator/viewport assertions. Không lưu ảnh chụp tĩnh; bằng chứng tái lập là E2E 4/4 PASS với desktop và mobile viewport, chi tiết ở mục E.

## C. Request payload thực tế

E2E đã bắt request thật khi Customer chọn:

- category: `restaurant`;
- city: `Hội An`;
- search: `HuGo Seafood`;
- preferences: `am-thuc`, `nghi-duong`;
- budget: `500000` VND/ngày/người.

Payload gửi backend:

```json
{
  "contractVersion": "1.0",
  "sessionId": "<browser-session-id>",
  "uiSurface": "explore_results",
  "filters": {
    "category": "restaurant",
    "destinationCity": "Hội An",
    "search": "HuGo Seafood"
  },
  "explicitPreferences": ["am-thuc", "nghi-duong"],
  "dailyBudgetPerPerson": 500000,
  "limit": 20
}
```

`minRating` được thêm khi giá trị lớn hơn 0. Filter `all`, search rỗng và city `all` được bỏ khỏi nested filters. Frontend không gửi `userId`, `businessId`, environment, score, rank, model/config version hoặc recommendation metadata do client tạo.

Budget validation:

- để trống → `0`, không dùng budget;
- giá trị dương tối thiểu `50.000`;
- tối đa `100.000.000`;
- chỉ nhận chữ số; không tự suy diễn dấu phân cách;
- input invalid không phát recommendation request mới.

Preference/budget chỉ nằm trong React state của trang. Không ghi localStorage, profile hoặc telemetry context.

## D. Explainability, fallback và cold-start

### D1. `why`

Card hiển thị nguyên văn `why` từ backend. Frontend không tính lại score/explanation và không hiển thị `finalScore` như xác suất AI.

### D2. Evidence chips

Chỉ map ba reason code server đã cung cấp, tối đa ba chip:

| Server reason code | UI label |
|---|---|
| `PREFERENCE_MATCH` | Hợp sở thích |
| `ESTIMATED_PRICE_FROM_BUDGET_FIT` | Hợp ngân sách ước tính |
| `HIGH_BAYESIAN_QUALITY` | Bayesian uy tín |

`BALANCED_BASELINE`, distance code và code không biết không được biến thành evidence chip. Budget wording luôn là ước tính; card dùng “Giá tham khảo từ”.

### D3. Typed fallback

Khi backend trả `fallback.applied=true` và `code=NO_DESTINATION_MATCH`, UI hiển thị banner:

> Chưa có địa điểm khớp chính xác tại [thành phố]. HuGo đang hiển thị lựa chọn phù hợp với các tiêu chí còn lại ở khu vực khác.

E2E dùng `HuGo Seafood` + city `Hội An`, xác minh banner và vẫn render recommendation ngoài city đúng nhãn.

### D4. Cold-start/anonymous

- Authenticated chưa chọn preference/budget: “Gợi ý cân bằng theo uy tín Bayesian”.
- Anonymous sort mặc định: “Đề xuất công khai phổ biến theo Bayesian”.
- Anonymous price sort đổi label tương ứng, không tiếp tục claim Bayesian-only.
- Anonymous chips/budget bị disable kèm hướng dẫn đăng nhập; chỉ gọi `GET /api/places`.
- Anonymous card nói rõ danh sách công khai, chưa cá nhân hóa; không có fake requestId/impression.

### D5. Sort correctness

- Authenticated: bỏ interactive sort selector và hiển thị “Xếp hạng từ server”; giữ nguyên thứ tự `items` backend trả về.
- Anonymous: chỉ để ba mode Place API thực sự hỗ trợ: `bayesian`, `priceAsc`, `priceDesc`.
- Loại option `rating` vì backend hiện không có contract sort raw rating riêng; không để control giả hoạt động.

## E. Kết quả kiểm thử

### E1. Frontend unit/type/build

| Nhóm | Command | Kết quả |
|---|---|---|
| Budget/payload/reason/fallback unit | `npm run test:explore-ui` | **PASS — 4/4** |
| TypeScript | `npx tsc --noEmit` | **PASS** |
| Production build | `npm run build` | **PASS — 1.728 modules transformed, Vite build exit 0** |

Vite lần đầu bị sandbox chặn đọc config ngoài execution boundary. Chạy lại cùng command với quyền thực thi phù hợp đã PASS; không sửa thuật toán/config để né lỗi.

### E2. E2E Edge headless

Command: `npx playwright test e2e/m3c-explore.spec.ts`

| Scenario | Kết quả |
|---|---|
| Customer chọn 2 preferences + budget + restaurant/city/search → payload đúng → typed fallback → why/chips → verified visibility → Detail → Favorite | **PASS** |
| Response search cũ bị delay 1,2 giây, về sau response mới nhưng không ghi đè UI mới | **PASS** |
| Anonymous public Bayesian/price fallback; không protected recommendation/requestId; mobile 390×844 không horizontal overflow | **PASS** |
| Personalization + analytics opt-out vẫn gửi 2 one-shot preferences + budget; card render; 0 visible acknowledgement từ client | **PASS** |

Kết quả cuối: **4/4 PASS trong 33,2 giây**.

### E3. PostgreSQL safety và regression

Preflight read-only trước write tests:

- database: `travelgo_ai_m0_test`;
- host: `localhost`;
- sentinel: PASS;
- migrations: 10;
- application tables: 23;
- foreign keys: 39;
- PostGIS: 3.4.3;
- write process dùng exact `TEST_DATABASE_NAME=travelgo_ai_m0_test` và `ALLOW_TEST_DB_WRITES=true`.

Không sửa `.env`, không chuyển sang database khác, không DROP/TRUNCATE/reset.

| Regression | Kết quả |
|---|---|
| Recommendation contract/golden/pagination | **PASS — 6 + 8 + 2 checks** |
| Recommendation HTTP/PostgreSQL/visible/booking attribution/opt-out | **PASS — 50 checks** |
| Favorite ownership/concurrency/visible attribution/consent | **PASS — 59 checks** |
| Backend build | **PASS** như phần đầu của regression commands; không có backend source change trong M3-C |

Các HTTP 400/401/409 xuất hiện trong log là negative-path assertions mong đợi; suite exit code 0.

## F. Responsive desktop/mobile

### Desktop

- Playwright project `Desktop Chrome` chạy bằng Edge;
- grid 5/7 giữ filter/list bên trái và map sticky bên phải;
- recommendation card mở rộng theo chiều dọc để why/chips không chen rating/price;
- toàn bộ 4 E2E chạy ở desktop mode và PASS.

### Mobile

- viewport thực tế kiểm tra: `390 × 844`;
- list/map dùng toggle, không render hai vùng chồng nhau;
- filter controls chuyển từ 3 cột sang 1 cột;
- category chips có horizontal scroll nội bộ;
- assertion `document.documentElement.scrollWidth <= window.innerWidth + 1` PASS;
- smart filter panel và public result vẫn visible sau reload.

Chưa chạy Safari/iOS thật hoặc Firefox; đây là giới hạn cross-browser còn lại, không phải blocker MVP.

## G. Vấn đề còn tồn tại

1. Không có manual visual regression/screenshot baseline; bằng chứng hiện là Edge headless assertions và production build.
2. Anonymous không dùng preference/budget vì recommendation endpoint yêu cầu JWT; UI disable trung thực thay vì tạo local ranking giả.
3. One-shot state cố ý mất khi rời/reload trang và khi đổi user; không lưu profile/localStorage trái consent.
4. Request cũ không thể ghi đè UI nhờ sequence guard, nhưng backend vẫn có thể hoàn tất request đã gửi và giữ functional request metadata theo retention M1.
5. Centroid/Haversine, budget `priceFrom` và heuristic limitations vẫn như M3-B; UI không nâng chúng thành travel time, giá chính xác hoặc ML probability.
6. TourPackage/Ticket, sentiment DEMO_ONLY, Learning-to-Rank và Place → Planner không nằm trong M3-C.
7. Chưa thực hiện accessibility audit chuyên sâu bằng screen reader; control chính đã có label, aria-pressed, aria-invalid và role status/alert.

## H. Quyết định chuyển M3-D

**GO cho M3-D** theo kế hoạch MVP vì:

- request contract thật được nối đầy đủ;
- ranking/explanation/fallback hiển thị trung thực;
- authenticated, anonymous và opt-out đều PASS E2E;
- stale response race đã được kiểm chứng;
- responsive desktop/mobile và production build PASS;
- recommendation/visibility/Favorite regression PASS.

M3-D chỉ nên xử lý Place → Planner như kế hoạch trước đó. **M3-D chưa được bắt đầu trong task này.**
