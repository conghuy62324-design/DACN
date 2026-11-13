# T03-A — Validation, ngày/đêm và chi phí Planner

Ngày thực thi: **28/10/2026**, giờ Việt Nam. Phạm vi: T03-A theo [scope 6 tuần](HUGO_6_WEEK_SCOPE.md).

**Kết quả:** đã sửa validation và tính ngày/đêm/chi phí trong Planner, có regression FAIL trước sửa → PASS sau sửa. Backend build, algorithm/mandatory/recommendation unit và frontend build PASS. **DB/HTTP end-to-end/Playwright NOT RUN** vì chưa xác minh setup DB cô lập/guard/sentinel trong phiên này; không dùng unit fixture thay bằng chứng persistence.

## 1. Phạm vi và trạng thái Git

HEAD nền: `052531dfc77c4f289757794c0ee08b4d46e6af2e`, ngày commit 16/10/2026. Kết quả dưới đây chạy trên **working tree có thay đổi chưa commit**, không phải kết quả lịch sử của HEAD.

Trước T03-A đã có:

- Modified: `ai/kaggle/02_vietnamese_sentiment_tfidf_mvp.py`, `docs/HUGO_AI_M2_B2_REPORT.md`.
- Untracked: scope T02, bản bàn giao và collection kit T01.

Đã ghi checksum các file có sẵn trước khi sửa và đối chiếu cuối task. Hai file Python/report có sẵn, các tài liệu trước đó và manifest/label map được giữ nguyên. Không sửa Trip persistence/Booking/auth, pacing/transport behavior, ranking weights, database schema, corpus, consent, model hoặc manifest. Không push/deploy. Build sinh output local theo scripts hiện có; không đưa output build vào source.

## 2. Contract validation đã chọn

Validation nằm ở service dùng chung cho controller và direct callers; controller không còn `Number(...) || default`.

| Trường | Contract |
|---|---|
| Body | Object, không null/array |
| destinationCity | Bắt buộc string 1–120 ký tự sau trim, NFC; không default |
| departureCity | String 1–120 ký tự; thiếu dùng `Hà Nội` |
| startDate | Date-only đúng `YYYY-MM-DD`, năm 0001–9999; phải tồn tại trong lịch. Thiếu dùng ngày hiện tại Việt Nam UTC+7 |
| endDate | Cùng quy tắc ngày; thiếu dùng **startDate đã chuẩn hóa + 2 ngày** |
| Khoảng ngày | Gồm cả ngày đầu/cuối; end≥start; 1–10 ngày. Sai/đảo/vượt 10 → HttpError 400, không abs/clamp/default che lỗi |
| nightsCount | `max(daysCount−1, 0)`; không có tùy chọn thêm đêm trong task này |
| adults | JSON number, safe integer ≥1; thiếu dùng 1 |
| children | JSON number, safe integer ≥0; thiếu dùng 0; tổng counts phải là safe integer |
| totalBudget | JSON number hữu hạn >0, cho cả nhóm; thiếu dùng 5.000.000 VND. Không tự tạo minimum mới; số dương thập phân vẫn được nhận |
| preferences | Giữ helper allowlist/dedupe/giới hạn hiện có; thiếu → []; `null` → [] theo tương thích helper hiện có |
| mandatoryPlaceIds | Thiếu → []; gửi non-array/null →400; giữ UUID/max10/eligibility/destination/capacity/dedupe/post-condition hiện có |
| pacing | Giữ `relaxed/balanced/packed`; thiếu balanced; enum sai →400. Chưa sửa cách pacing ảnh hưởng lịch |
| transportation | Giữ `flight/car/train/motorbike`; thiếu car; enum sai →400. Chưa đổi tính ETA/mode |

“Thiếu” nghĩa là field `undefined`/không được gửi. Giá trị đã gửi như `0`, chuỗi số, chuỗi rỗng, null, false, số âm/lẻ sai contract không được thay default. `preferences=null` là ngoại lệ tương thích **được định nghĩa sẵn** bởi allowlist helper, không thay mới hành vi này.

Ngày được kiểm bằng regex date-only, tính valid timestamp và round-trip ngày bằng `toISOString`; không chỉ Date.parse. Cộng ngày bằng UTC calendar, tránh lệch DST của host. Không bổ sung điều kiện ngày phải ở tương lai, vì các luồng/test hiện có cho phép ngày lịch hợp lệ trong quá khứ.

### Tương thích và thay đổi có chủ đích

- UI hiện gửi counts/budget dưới dạng number nên không cần coercion phía controller. Client khác từng gửi chuỗi số giờ nhận 400; đây là siết contract theo yêu cầu, không silently sửa dữ liệu.
- Trước đây end thiếu luôn lấy “hôm nay +2”, kể cả khi start đã gửi ở ngày khác. Nay default end dựa trên start để tạo đúng 3 ngày bao gồm hai đầu; không mở rộng nghiệp vụ.
- Số quá lớn không biểu diễn số nguyên/chi phí an toàn bị từ chối 400. Chưa đặt business maximum số khách ngoài giới hạn số học; không giả định một phòng có sức chứa tương ứng.
- Không disable hay thay thuật toán relaxed/packed/flight/train trong T03-A; sự không khớp UI/behavior đó vẫn dành cho T03-B.

## 3. Quy ước chi phí đã chọn

### 3.1. Đơn vị và công thức

Response mới ghi `costBasis=GROUP_VND_V1`:

```text
adultEquivalents = adults + 0.7 × children
activity.estimatedCostVND = round(ước tính/người lớn quy đổi × adultEquivalents)
day.dayEstimatedCostVND = sum(activity.estimatedCostVND) + day.lodgingEstimatedCostVND
trip.totalEstimatedCostVND = sum(day.dayEstimatedCostVND)
costDifferenceVND = totalBudgetUserVND − totalEstimatedCostVND
```

Mọi activity/subtotal/day/trip amount là **VND cho cả nhóm**, làm tròn mỗi khoản ước tính tới 1 VND. Không nhân tổng ngày thêm số người lần nữa. Budget giữ số dương người dùng đã nhập, nên difference có thể có phần thập phân nếu budget nhập thập phân.

Giữ giả định hoạt động của planner cũ: trưa/tối 150.000/200.000 VND mỗi người lớn quy đổi; tham quan dùng priceFrom/fallback có cap 40% buổi sáng, 30% buổi chiều của ngân sách ngày/người. Đây là **ước tính bị giới hạn theo ngân sách**, không phải tính giá vé thật hay bảo đảm đủ tiền.

### 3.2. Lưu trú tách riêng, N−1 đêm

- `lodgingNights=1` ở N−1 ngày đầu, 0 ở ngày cuối.
- `lodgingEstimatedCostVND` là ước tính **một phòng cho cả nhóm mỗi đêm**, lấy priceFrom hotel, làm tròn VND. Không chia/nhân phòng theo số khách; chưa có room unit/capacity đủ tin cậy để làm việc đó.
- Không hotel hoặc priceFrom thiếu/âm/không hữu hạn: dùng giả định 400.000 VND/nhóm/đêm. Giá 0 hợp lệ được giữ 0. Chuyến 0 đêm luôn có lưu trú 0, không áp fallback.
- Không lấy attraction thay hotel khi catalog thiếu hotel: đầu vào gợi ý khách sạn nay chỉ dùng hotel candidates. Đây là thay đổi selection tối thiểu liên quan đúng nguồn chi phí; đã chạy recommendation unit. Không đổi scoring/ranking weights.
- Mandatory hotel vẫn xuất hiện đúng ID, một lần. Activity hotel mang **0đ**, phí phòng nằm trong dòng lưu trú riêng nên không tính trùng. Chuyến trong ngày ghi “Khách sạn tham khảo”, không xác nhận nhận phòng/booking hay tự cộng đêm.

### 3.3. Công khai giả định và chỉnh sửa tại Planner UI

Response có `nightsCount`, `costBasis`, `costAssumptions`, và hai field lưu trú theo ngày. UI sửa badge 1 ngày thành 0 đêm, ghi VND cả nhóm, hiển thị lưu trú đã gồm trong subtotal và phần mở rộng giải thích giả định.

`priceFrom` chưa chắc là giá phòng/đêm hoặc giá người/vé; hệ số trẻ em 0,7 chỉ là giả định planner; không bao gồm giá vé máy bay/tàu, chặng khởi hành hay vận chuyển thực tế. Các giới hạn này được trình bày trong UI, không giấu trong code.

Xóa activity giờ chỉ trừ tiền activity, giữ nguyên phí lưu trú; tính lại total/difference/status/**budgetAdvice**. Reorder chỉ thay thứ tự, không định giá lại hoặc làm mất phí phòng. Hai helper pure được tách từ handler thực để kiểm regression. Không sửa replan, selectedPlaceIds persistence, GPS, route hoặc popup HTML.

## 4. File đã thay đổi/tạo mới trong T03-A

| File | Vai trò |
|---|---|
| `backend/src/utils/plannerValidation.ts` — mới | Calendar/range/count/budget/default validation dùng chung |
| `backend/src/controllers/tourController.ts` | Bỏ coercion/falsy defaults ở plan handler; giao body cho service validator |
| `backend/src/services/tourPlannerService.ts` | Validate trước catalog, N−1 đêm, group costing, lodging riêng, title, UTC calendar, metadata/assumptions; hotel-only cost source |
| `backend/src/tests/plannerValidationCosts.test.ts` — mới | Regression controller/service/helper và group/lodging/default edge cases, không DB |
| `backend/package.json` | Thêm `test:planner:validation`, có backend build trước test |
| `frontend/src/utils/plannerCosts.ts` — mới | Pure remove/reorder handlers, giữ lodging, cập nhật budget advice |
| `frontend/src/pages/TourPlannerPage.tsx` | Gọi helpers; nights badge, group labels, lodging breakdown, cost assumptions |
| `frontend/src/types/index.ts` | Field additive cho metadata cost và lưu trú theo ngày |
| `frontend/tests/plannerCosts.test.ts` — mới | Regression xóa/reorder/group totals/lodging, không browser/DB |
| `frontend/package.json` | Thêm `test:planner-costs` |
| `docs/HUGO_T03_A_PLANNER_REPORT.md` — mới | Báo cáo này |

Không sửa các suite algorithm/mandatory/recommendation để làm chúng PASS. Test mới dùng in-memory unit fixture, không tạo bản ghi PostgreSQL hoặc dữ liệu sentiment/training.

## 5. Case đã thực sự tái hiện trước sửa

Backend fixture: chỉ một hotel 600.000 VND; không có attraction/restaurant; 1 adult, 0 children, budget 10.000.000; start `2028-02-28`. Meals mặc định 350.000 VND/ngày. Đây là fixture unit để cô lập tính toán, không phải catalog thực hay bằng chứng chất lượng AI.

| Input / expected | Kết quả thực trước sửa | Sau sửa |
|---|---:|---:|
| End 28/02, 1 ngày, expected 350.000 | **950.000**, thừa 1 đêm | 350.000 |
| End 29/02, 2 ngày, expected 1.300.000 | **1.900.000**, tính 2 đêm | 1.300.000 |
| End 01/03, 3 ngày, expected 2.250.000 | **2.850.000**, tính 3 đêm | 2.250.000 |
| Title 1 ngày, expected 1N0Đ | **1N1Đ** | 1N0Đ |
| 2 adults +1 child, 3 ngày, expected 4.035.000 | **4.634.998**, sai đêm và rounding | 4.035.000; day sum bằng trip sum |
| Mandatory hotel 1 ngày, expected 1 ID/0 phí phòng | ID giữ được, nhưng total **950.000** | ID một lần; total 350.000 |
| Helper nhận ngày sai, đảo ngày, >10 ngày | Không throw theo expected; abs/clamp/default che lỗi | 400 |
| Controller nhận explicit counts/budget sai | Các case trong vòng regression trả **200**, không phải 400 | 400 trước catalog retrieval |
| Start gửi 28/02/2028, end thiếu | Trả end **30/10/2026**, theo today+2 của lần chạy | End 01/03/2028, start+2 |

Ngày sai được kiểm gồm: chuỗi `invalid`, 29/02 năm không nhuận 2027, 30/02/2028, 31/04/2028, định dạng thiếu zero, timestamp thay date-only, năm 0000, đảo range và range 11 ngày. Counts/budget gồm 0/âm/lẻ/chữ/chuỗi số/empty/null/boolean sai trường và Infinity ở mức unit service/controller; Infinity không phải JSON HTTP hợp lệ nên không gọi đó là request HTTP đã tái hiện.

Frontend: trước sửa costing, tách handler cũ thành pure helper giữ nguyên thuật toán rồi chạy fixture group cost hai ngày, ngày đầu có 600.000 phí phòng +150.000 lunch +200.000 dinner:

- Xóa lunch: expected ngày đầu 800.000, trước sửa còn **200.000** vì mất room subtotal.
- Xóa cả lunch/dinner: expected vẫn 600.000, trước sửa thành **0**.
- Reorder rồi xóa lunch: expected trip 1.150.000, trước sửa **550.000**. Reorder riêng vốn giữ tổng, lỗi nằm ở delete tiếp theo.

Đây là chạy handler tính toán thật đã trích thành helper, **không phải browser tương tác được quan sát**.

### Kết quả FAIL → PASS

- Backend lần trước sửa: **1 PASS /42 FAIL**, tổng 43 nhóm kiểm tra, exit **1**. Sau sửa cùng 43 nhóm PASS; bổ sung 7 nhóm edge cases, lần cuối **50 PASS /0 FAIL**, exit **0**.
- Frontend lần trước sửa: **1 PASS /3 FAIL**, tổng 4 nhóm, exit **1**. Sau sửa cùng 4 nhóm PASS; thêm 2 nhóm hotel marker/day trip, lần cuối **6 PASS /0 FAIL**, exit **0**.
- Những nhóm bổ sung sau sửa không được trình bày là đã có FAIL trước sửa.

## 6. Lệnh thực sự đã chạy, môi trường và kết quả

Windows x64, PowerShell; Node **v24.20.0**, npm.cmd **11.19.0**; installed TypeScript backend/frontend **5.9.3**; installed Vite **6.4.4**. Đây là version thực đọc từ công cụ/package local, không lấy version range trong package.json làm version runtime.

Các command trong bảng dùng cwd tương ứng `travelgo/backend` hoặc `travelgo/frontend`:

| Cwd / command | Lần trước sửa | Kết quả sau sửa / exit code |
|---|---|---|
| backend — `npm.cmd run test:planner:validation` | 1/43 PASS, exit 1 | **50/50 PASS, exit 0**; script thực hiện `npm run build --silent` → `node dist/tests/plannerValidationCosts.test.js` |
| frontend — `npm.cmd run test:planner-costs` | 1/4 PASS, exit 1 | **6/6 PASS, exit 0**; Node strip-types chạy helper test |
| backend — build `tsc` qua các scripts test | Compile regression mới trước sửa thành công; sau đó test fail | **PASS, exit 0**; final targeted command chỉ vào test sau khi build thành công |
| backend — `npm.cmd run test:algorithm` | Không chạy lại baseline trước sửa vì không cần cho tái hiện | **14/14 PASS, exit 0** |
| backend — `npm.cmd run test:planner:mandatory` | Dùng baseline lịch sử làm tham chiếu, không gọi là vừa chạy | **9/9 PASS, exit 0** |
| backend — `npm.cmd run test:recommendation:unit` | Không chạy trước sửa | **Exposure 6, correctness 8, pagination 2 PASS; exit 0** |
| frontend — `npm.cmd run build` | Không dùng làm baseline tái hiện | Lần sandbox: **exit 1** ở Vite/esbuild config access; retry cùng command ngoài sandbox: **exit 0**, 1.729 modules, Vite build thành công |
| workspace — `git diff --check -- backend frontend` | Không phải test behavior | **exit 0**; chỉ cảnh báo LF/CRLF, không whitespace error trong diff task |

Frontend build lần đầu đã qua `tsc` rồi lỗi `Cannot read directory ../../../../..: Access is denied` khi esbuild nạp vite.config. Chạy lại đúng command với quyền thực thi phù hợp đã PASS; không thay config/dependency để né lỗi. Sau lần build thành công chỉ bổ sung test cases, không đổi frontend production source.

Không cộng các nhóm/suite chồng lấn thành tổng test duy nhất. Các kết quả algorithm/mandatory/recommendation là lần chạy thực trong T03-A; lịch sử M3 không được ghi đè thành kết quả mới. Không chạy lặp chúng sau khi chỉ thêm case ở file regression mới vì implementation và môi trường tương ứng không đổi.

### Source fingerprint tại kết quả cuối

| File | SHA-256 |
|---|---|
| `backend/src/utils/plannerValidation.ts` | `dde0de259f23775bf1f8a14a1afd797b178abd3738d2cc31888ea0b299cfa6dc` |
| `backend/src/services/tourPlannerService.ts` | `d2143c39ef424c27824d8052b64a7d6e59ed47dfe8f5887a0f8191e271065ff0` |
| `backend/src/controllers/tourController.ts` | `1b3a8b682027fac321fe34fa42b321734950591abe0cd3f5d7824af24440f849` |
| `frontend/src/utils/plannerCosts.ts` | `adab09c77c79c0c12fa3098ea689dc300799574ca43152c41158553172f99db9` |
| `frontend/src/pages/TourPlannerPage.tsx` | `a52a1a303029cdfd6ea434f9dbd539fe6a5ee0801770ef24f8e28c94fed587c1` |

## 7. Phần chưa kiểm và rủi ro còn lại

- **DB readiness/guard/sentinel: chưa xác minh trong phiên này. DB integration/real HTTP/Playwright: NOT RUN.** Chưa khẳng định save/reopen/concurrency PASS cho version mới; không dùng loader fixture làm bằng chứng DB. Không seed/migrate/reset để chuẩn bị test.
- Chưa kiểm browser visual/responsive mới cho các nhãn/chi phí. Frontend unit kiểm helper mà page sử dụng; production build kiểm kiểu/bundle, không chứng minh browser interaction.
- Chỉ bảo đảm costing mới trên response Planner `GROUP_VND_V1`. Không migrate/reprice Trip cũ; JSON ngày mới có field lưu trú nhưng persistence/serializer và top-level assumptions/version khi reopen chưa kiểm, thuộc T04. Fallback helper giữ khoản chưa itemize ở day subtotal cũ, không phải thuật toán chuyển toàn bộ snapshot per-person cũ thành group.
- `priceFrom`, phòng/đêm, sức chứa, meal/child coefficients và sightseeing caps còn là giả định. Tổng không bao gồm chi phí đi lại thực, không phải báo giá hoặc hard affordability constraint.
- Pacing hiện vẫn tối đa hai sightseeing slot; ETA vẫn gọi car. Các enum cũ được giữ để không làm T03-B trong task này.
- Reorder chưa tính lại transit/route, delete chưa mở rộng đồng bộ selectedPlaceIds/check-in/persistence; đó là những phần ngoài T03-A. Lodging được xem là khoản riêng theo đêm, không tự hủy khi xóa marker hotel. UI hiện đã bảo vệ mandatory activity theo hành vi cũ.
- Không mở tùy chọn staycation một ngày qua đêm, room count theo khách hoặc giá provider. Nếu sau này cần thì phải chốt nghiệp vụ và regression riêng.

## 8. Việc dành cho T03-B và điểm dừng

T03-B cần chốt pacing/transport UI so với khả năng thật: triển khai hành vi được hỗ trợ hoặc disable/label rõ phần chưa làm; không mở routing/solver mới. Khi thay selection/capacity/duration/mode thì chạy lại đúng regression bị tác động, giữ contract ngày/đêm/cost T03-A.

Trip validation/update selected IDs/persistence (T04), popup HTML (T05), Booking (T06), Profile/auth docs (T07) giữ ở backlog; chưa thực hiện trong task này.

**T03-A dừng sau bản sửa, kiểm tra và báo cáo này.**
