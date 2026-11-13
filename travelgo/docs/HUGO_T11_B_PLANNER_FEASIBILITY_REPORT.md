# T11-B — Dự toán trung thực và điều kiện tạo lịch trình

Ngày **31/10/2026**, Asia/Saigon. Làm trên working tree hiện tại, giữ các thay đổi T03–T11 chưa commit. Đã đọc source Planner/Recommendation/Trip, controller/error middleware, frontend, báo cáo T11 và cả scenarios/results v1 trước khi sửa. Không reset/stash, sửa giá catalog, sửa Booking, apply migration, seed, đổi trọng số/ranking, thêm solver, train sentiment, làm chatbot, push hoặc deploy.

## Kết quả

- Ngân sách chỉ tham gia chọn phương án; giá của cùng Place, số khách và đơn vị không còn bị cắt theo ngân sách.
- API trả trạng thái và số tiền vượt; UI thể hiện đúng ngân sách/dự toán/phần vượt, cho sửa yêu cầu hoặc lưu phương án tham khảo kèm cảnh báo.
- Generate không có điểm tham quan hợp lệ tại điểm đến trả **HTTP 422 / `NO_SIGHTSEEING_FOR_DESTINATION`**. UI giữ form, không hiển thị lịch chỉ có bữa ăn như kết quả hoàn chỉnh.
- Cảnh báo được tính từ số tiền hiện tại khi edit/save/reopen. Nguồn giá và giả định lưu được trong JSON itinerary, không cần migration.
- Frozen v3 trước/sau: **22 FAIL → 0 FAIL**, cùng spec SHA. Lượt cuối **37 PASS, 1 NOT RUN** trong harness bộ nhớ; P16 được kiểm riêng bằng HTTP/PostgreSQL thật, **16 nhóm snapshot + 12 nhóm lifecycle PASS**. Browser **5/5 PASS**; build backend/frontend PASS. Fingerprint DB **25/25 bảng trùng** sau cleanup.

Tổng hợp máy đọc được: [verification_summary.json](evidence/t11b/verification_summary.json). Không cộng unit doubles hoặc browser API replay thành bằng chứng DB.

## Tái hiện và nguyên nhân

Đã build và chạy nguyên harness T11 với spec v1 vào **thư mục mới** [baseline-v1-reproduction](evidence/t11b/baseline-v1-reproduction/scenario_results_v1.json): 25 PASS, 1 NOT RUN (DB không được chạy bởi harness bộ nhớ). Không ghi đè kết quả lịch sử T11.

P01/P05 cùng Đà Nẵng, `2027-03-01`, 1 người lớn, 0 trẻ em; chỉ đổi `totalBudget` 3.000.000 → 100.000. Cả hai chọn Biển Sáng và Cold Beach, cùng nhà hàng/bữa tối:

| Khoản | P01 trước | P05 trước | P01 sau | P05 sau |
|---|---:|---:|---:|---:|
| Biển Sáng | 100.000 | 40.000 | 100.000 | 100.000 |
| Cold Beach | 300.000 | 30.000 | 300.000 | 300.000 |
| Bữa trưa | 150.000 | 150.000 | 150.000 | 150.000 |
| Bữa tối | 200.000 | 200.000 | 200.000 | 200.000 |
| Tổng cả nhóm | 750.000 | 420.000 | 750.000 | 750.000 |
| Vượt ngân sách | 0 | 320.000 | 0 | 650.000 |

Lỗi ở **planner**, không phải harness thay giá: `TourPlannerService.generatePersonalizedItinerary` dùng `groupCost(Math.min(catalogPrice(...), dailyBudgetPerPerson * 0.4))` buổi sáng và `* 0.3` buổi chiều. Với ngân sách 100.000/ngày/người, hai mức trần là 40.000 và 30.000. Harness chép `estimatedCostVND` vào cột `cost`, không viết lại giá.

Phân biệt nguồn trường trong T11:

| Trường | Nguồn trước sửa | API/UI trước sửa |
|---|---|---|
| `budgetStatus`, `costDifferenceVND`, `budgetAdvice` | Service trả thật; harness chép lại | Controller `/api/tours/plan` chuyển nguyên itinerary vào `data`. Planner UI có đọc status/advice; không suy từ kết quả harness. |
| `constraintViolations` của kết quả planner T11 | Hàm `plannerActual` của harness tự suy từ tổng tiền, số sightseeing, capacity | Service/interface/controller không có trường này. Không có bằng chứng frontend nhận hay hiển thị danh sách đó. |

[before-v3](evidence/t11b/before-v3/scenario_results_v3.json) lưu `rawServiceResponse`: P01/P05 có `budgetStatus`, không có `constraintViolations`. [final-v3](evidence/t11b/final-v3/scenario_results_v3.json) lưu trường API/service riêng và `evaluatorConstraintViolations` để so độc lập. Test HTTP mới đi qua route/controller/error middleware thật xác nhận response sau sửa, không dùng projection của harness làm response API.

P06 trước sửa trả 350.000, chỉ trưa/tối, `within_budget`; `NO_SIGHTSEEING_FOR_DESTINATION` chỉ là nhãn harness. Source không chặn catalog rỗng; Recommendation có thể fallback sang tỉnh khác khi không có destination match. Matcher cũ còn cho chuỗi địa phương rỗng match vì `destination.includes('')`. Sau sửa planner lọc ứng viên theo city/province đã chuẩn hóa NFC, so khớp đầy đủ và không rỗng trước khi gọi recommendation. Không có attraction/tour tại điểm đến thì 422; hotel/restaurant cũng lấy trong điểm đến. Recommendation service/weights/fallback cho luồng recommendation khác giữ nguyên.

Một lỗi nguồn giá khác: `serializePlace` chuẩn hóa null/undefined thành 0. Repository thêm cờ `catalogPriceAvailable` từ giá thô **trước** khi chuẩn hóa để planner phân biệt thiếu giá với 0 thật. Không thay giá đã lưu hay công thức serialize/ranking hiện có. Kiểm cả null, undefined, rỗng, khoảng trắng, boolean, số âm, NaN và 0 dạng số/chuỗi qua boundary repository.

## Contract chi phí và API

`GROUP_VND_V1` tiếp tục là VND cho cả nhóm. Mỗi khoản hoạt động được quy đổi `adults + 0,7 × children`, làm tròn một lần tới VND. Tổng ngày = activities + lodging; tổng chuyến = tổng ngày, không nhân nhóm lần nữa. Chuyến N ngày có N−1 đêm; lưu trú giả định một phòng cho nhóm/đêm, không nhân theo khách. Activity khách sạn là mốc 0đ để không tính trùng.

| Khoản | Có giá catalog hợp lệ, kể cả 0 | Thiếu/không hợp lệ |
|---|---|---|
| Tham quan | Dùng nguyên `priceFrom` rồi quy đổi nhóm | 300.000/người lớn quy đổi/lượt, cùng định mức ở mọi slot |
| Bữa trưa gắn nhà hàng | Dùng nguyên `priceFrom` rồi quy đổi nhóm | 150.000/người lớn quy đổi/bữa |
| Bữa tối chưa chọn dịch vụ | Không giả là giá catalog | 200.000/người lớn quy đổi/bữa |
| Lưu trú | Dùng nguyên `priceFrom` làm giả định một phòng/nhóm/đêm | 400.000/nhóm/đêm |

Đây là ước tính lập kế hoạch, chưa xác minh đơn vị `priceFrom`, sức chứa hoặc giá nhà cung cấp. `costSource` trên activity và `lodgingCostSource` trên day ghi nguồn, định mức, đơn vị giả định và trạng thái chưa xác minh. Nguồn fallback là **định mức planner T11-B trong source**, không phải khảo sát thị trường. `costAssumptions` công khai các định mức và khoản chưa bao gồm. Bữa trưa có catalog dùng giá catalog thay cho định mức cố định cũ; fallback tham quan dùng một mức 300.000 thay cho 300.000/200.000 phụ thuộc slot. Không thay catalog/Booking.

`POST /api/tours/plan` thành công vẫn HTTP 200, kể cả phương án tham khảo vượt ngân sách. `data` có:

```json
{
  "totalBudgetUserVND": 100000,
  "totalEstimatedCostVND": 750000,
  "costDifferenceVND": -650000,
  "budgetStatus": "over_budget",
  "overBudgetVND": 650000,
  "constraintViolations": ["BUDGET_EXCEEDED"]
}
```

Bằng/dư ngân sách: `within_budget`, `overBudgetVND: 0`, `constraintViolations: []`. Không gọi dự toán hiện tại là ngân sách tối thiểu hay chứng minh tối ưu. Không tự tăng ngân sách, giảm giá hoặc loại mandatory Place để làm vừa ngân sách. Người dùng sửa yêu cầu rồi Generate lại; mandatory validation/capacity/exactly-once tiếp tục áp dụng.

Không có điểm tham quan hợp lệ:

```json
{
  "success": false,
  "code": "NO_SIGHTSEEING_FOR_DESTINATION",
  "message": "Chưa đủ dữ liệu để tạo lịch trình tham quan tại …"
}
```

HTTP 422, không có `data` itinerary. Dùng `HttpError`/mã UPPER_SNAKE_CASE theo quy ước dự án. Repository lỗi vẫn reject, controller chuyển sang error middleware (HTTP 500 trong test DB offline); không catch rồi đổi thành `[]` hoặc 422. Mandatory không tồn tại/sai tỉnh vẫn giữ mã lỗi mandatory tương ứng.

## Contract UI và Trip

- `PlannerBudgetNotice` dùng **hai số tiền hiện tại** để tính phần vượt, không tin status/advice cũ. Hiển thị ngân sách, dự toán, số tiền vượt và câu “chưa đáp ứng ngân sách”; nút lưu gọi là “Lưu phương án tham khảo” khi vượt.
- “Sửa yêu cầu và tạo lại” đưa về form còn nguyên input. Budget form nhận số dương, bỏ mức sàn 1 triệu/step 500.000 cũ để kiểm được 100.000 và trường hợp bằng dự toán. Chỉ input người dùng mới thay budget.
- 422 thiếu catalog giữ form và các giá trị; không hiển thị activity/result. UI xử lý đúng object lỗi trực tiếp do Axios interceptor trả, không chỉ `err.response`. Generate mới xóa kết quả đang giữ trước khi gọi.
- Nhãn nguồn hiện dưới từng activity và lưu trú. Thẻ hotel dùng cùng nhãn nguồn/giả định lưu trú; chuyến 0 đêm ghi chỉ tham khảo, không hiển thị `priceFrom / đêm` như giá đã xác minh. Form mandatory không trình bày giá thô đã chuẩn hóa 0 như báo giá.
- Remove activity tính lại tổng/difference/status/violations; reorder không đổi chi phí. Backend save/update cộng lại day/trip totals từ các khoản, bỏ các kết luận feasibility do client gửi. GET/create/update Trip tính lại budget status/excess/violations từ số tiền đã lưu. Không lưu một kết luận cảnh báo cũ để tái sử dụng sau edit.
- `tripSnapshot` nhận hai nhãn nguồn có giới hạn độ dài, lưu trong JSONB hiện có. Không thêm điều kiện sightseeing vào save/update/read Trip: itinerary tự nhập vẫn lưu được, Trip cũ vẫn xem và giữ các quyền sửa trước đó. Legacy chưa rõ đơn vị tiếp tục được bảo vệ bởi contract T04, không tự đổi giá/đơn vị. Không xóa dữ liệu cũ.

## Phiên bản đánh giá và bằng chứng trước/sau

Giữ nguyên `t11_scenarios_v1.json`, `t11_evaluate.ts`, báo cáo và mọi results T11. [historical-integrity.json](evidence/t11b/historical-integrity.json) xác nhận hash spec/final JSON/CSV lịch sử, recommendation/rating/geo và validator mode/input không đổi.

1. [CONTRACT_V2.md](evidence/t11b/CONTRACT_V2.md) và spec/evaluator v2 được viết trước lượt đầu. Before-v2: 15 PASS / 22 FAIL / 1 NOT RUN. After-v2: 34 PASS / 3 FAIL / 1 NOT RUN. Giữ toàn bộ artifact này.
2. Ba FAIL còn lại phát hiện lỗi evaluator/fixture mới, không sửa expected âm thầm: label tiếng Việt bị PowerShell pipe làm hỏng; expected zero-price group hai ngày bỏ sót bữa trưa fallback ngày 2; case missing-price 5.530.000 so budget 3.000.000 thiếu expected vượt ngân sách. Filter fixture Hà Nội cũng bị hỏng Unicode nên từng lọc rỗng ngoài ý định.
3. [CONTRACT_V3.md](evidence/t11b/CONTRACT_V3.md) ghi các sửa oracle trước lượt v3. V2 vẫn giữ nguyên. V3 giữ mọi expectation khác, dùng candidate Hà Nội thật và giá trị đúng 1.485.000 cho zero-price hai ngày (1.080.000 bữa tối + 405.000 bữa trưa thiếu nhà hàng ngày 2); P23 giữ nguyên input/tổng và thêm expected vượt ngân sách.
4. V3 SHA-256 **`63949242d2e24d462860de8f7bfb3f8b11c25f0b070420cd8f914626cea7739e`** dùng cho cả before/after. Chạy lại planner trước sửa bằng bản source lưu riêng, SHA **`03151bb6e281abe72c64496adaed9f551b34f3cdb67557141bba689c094584ba`**, khớp byte-for-byte hash đã ghi trước sửa. Script replay chỉ thay module trong process test; không chép đè working tree. Trường `executionOverride` ghi source/hash thực thi, còn `sourceSha256` ghi file trên working tree.
5. [before-v3](evidence/t11b/before-v3/scenario_results_v3.json): **15 PASS / 22 FAIL / 1 NOT RUN**. [final-v3 JSON](evidence/t11b/final-v3/scenario_results_v3.json), [CSV](evidence/t11b/final-v3/scenario_results_v3.csv): **37 PASS / 0 FAIL / 1 NOT RUN**. P16 chủ động NOT RUN trong harness bộ nhớ, được xác minh ngoài harness bằng DB regression mới bên dưới; không gắn evidence DB T11 cũ để biến thành PASS mới.

V3 kiểm bằng/thiếu/dư budget, same-service price invariance cả case thường và mandatory, zero/missing/group/N−1 nights, catalog rỗng, chỉ tỉnh khác, địa phương rỗng và repository failure. Các ca T11 thường/modes/capacity/ETA/recommendation vẫn chạy trong cùng bộ mới.

## Lệnh và kết quả thực chạy

Các path dưới đây tương đối từ `travelgo/`. Mọi file evidence mới nằm trong `docs/evidence/t11b`; evaluator/capture scripts dùng `wx`, khi chạy lại phải chọn thư mục output mới.

| Từ thư mục | Lệnh | Kết quả |
|---|---|---|
| backend | `npm.cmd run build` | PASS, TypeScript; chạy lại sau bản sửa cuối backend |
| backend | `node dist/evaluation/t11_evaluate.js src/evaluation/t11_scenarios_v1.json ../docs/evidence/t11b/baseline-v1-reproduction` | Tái hiện 25 PASS / 1 NOT RUN trước sửa |
| backend | `node dist/evaluation/t11b_evaluate.js src/evaluation/t11b_scenarios_v2.json <new-output>` | Hai lượt v2 nêu trên, giữ kết quả FAIL |
| backend | `python scripts/t11b_archive_baseline.py` | Khôi phục bản lưu riêng, guard SHA byte-for-byte; giữ nguyên app source |
| backend | `node scripts/t11b_replay_baseline.cjs src/evaluation/t11b_scenarios_v3.json ../docs/evidence/t11b/before-v3` | Regression trước sửa: 22 FAIL |
| backend | `node dist/evaluation/t11b_evaluate_v3.js src/evaluation/t11b_scenarios_v3.json ../docs/evidence/t11b/final-v3` | 37 PASS, 0 FAIL, 1 NOT RUN |
| backend | `node scripts/t11b_run_checks.cjs ../docs/evidence/t11b/checks-run1` | Captured toàn bộ checks; frontend build sandbox lỗi quyền đọc cấu hình, các checks khác PASS |
| backend | `node dist/tests/plannerFeasibility.test.js` | Lượt cuối **13/13 PASS**, HTTP 200/422/500, nguồn trường, save schema, repository price boundary |
| backend | `node dist/tests/plannerValidationCosts.test.js` | **50/50 PASS**; fixture hotel-only bổ sung attraction miễn phí, empty Generate nay expected 422 thay cho meals-only success |
| backend | `node dist/tests/plannerModes.test.js` | **17/17 PASS** |
| backend | `node dist/tests/tourPlannerMandatory.test.js` | **9/9 PASS** |
| backend | `node dist/tests/tripSnapshot.test.js` | **35/35 PASS**, unit doubles, không phải DB |
| backend | `node dist/tests/tripLifecycle.test.js` | **9/9 PASS**, unit doubles |
| backend | `node dist/tests/recommendationCorrectness.test.js` | **8 checks PASS** |
| backend | `node dist/tests/recommendationRepositoryPagination.test.js` | **2 checks PASS**, đọc đủ 101 item qua 2 trang; chạy lại sau sửa flag giá |
| backend | `node dist/tests/algorithm.test.js` | **14/14 PASS** |
| frontend | `npm.cmd run test:planner-costs` / `test:planner-modes` / `test:trip-costs` (3 lệnh) | **6 / 6 / 3 checks PASS** |
| frontend | `npm.cmd run build` | **PASS**, tsc + Vite 6.4.4, 1.734 modules; bản cuối build 3,12s, không coi là benchmark |
| frontend | `$env:T11B_BROWSER_EVIDENCE='../docs/evidence/t11b/browser-final5'; npx.cmd playwright test --config playwright.feasibility.config.ts` | **5/5 PASS**, Edge headless |
| backend | `node scripts/t11b_db_checks.cjs ../docs/evidence/t11b/db` | Preflight, fingerprints, snapshot/lifecycle PostgreSQL và compare đều exit 0 |

Chi tiết captures: [checks-run1](evidence/t11b/checks-run1/summary.json), [observed-final-checks](evidence/t11b/observed-final-checks.json). Có lỗi TypeScript trung gian trong test mới và JSX label khi thêm UI; đã sửa trước final builds. Không bỏ assertion để né lỗi. Sandbox chặn esbuild đọc thư mục cha, cả Vite build và browser lượt đầu không khởi động được; chạy lại ngoài sandbox được chấp thuận tự động và PASS. Các lần browser/build cuối đã quan sát exit code thật.

Browser [results](evidence/t11b/browser-final5/results.json) kiểm:

1. 100.000 / 750.000 / vượt 650.000; xóa activity 100.000 → dự toán 650.000 / vượt 550.000; lưu tham khảo, điều hướng Trip, reload vẫn cảnh báo đúng.
2. Edit giảm dự toán xuống dưới budget, save/reopen không giữ cảnh báo cũ.
3. 422 thiếu dữ liệu giữ form/budget, không result; đổi Hà Nội → Đà Nẵng rồi tạo lại.
4. Sửa yêu cầu từ 100.000 → 750.000 do người dùng nhập; giá/dự toán không tự giảm, trạng thái chuyển đúng khi bằng budget.
5. Missing-price group/two-day hiện nguồn fallback tham quan 300.000 và lưu trú 400.000, ghi chưa xác minh. Hotel 0 đêm cũng có assertion nhãn tham khảo.

Ảnh đã xem kiểm trực quan: [vượt budget sau edit](evidence/t11b/browser/over-budget-edited.png), [thiếu catalog](evidence/t11b/browser/insufficient-catalog.png). Tiles bản đồ không tải trong môi trường kiểm; không dùng ảnh này để chứng minh tuyến đường hay dữ liệu bản đồ. Browser dùng replay output thật của service với catalog synthetic, mock save/GET; HTTP/PostgreSQL bên dưới chứng minh persistence thật riêng.

## DB, guard và cleanup

Chỉ kết nối **`travelgo_ai_m0_test`**, loopback `127.0.0.1`, `DB_SSL=false`. Runner đặt exact `DB_NAME`/`TEST_DATABASE_NAME`, xóa write opt-in trước preflight. `verifyDatabase` kiểm guard/sentinel/schema: PostGIS 3.4.3, 12 migrations, 23 app tables, 39 FK, PASS. Fingerprint trước write kiểm lại sentinel trong transaction read-only.

Sau đó mới bật `ALLOW_TEST_DB_WRITES=true` cho hai process test; mỗi test tự xác minh exact DB/guard/sentinel, snapshot test kiểm checksum migration 11 trước fixture write. Không apply migration khi thiếu; không reset, seed, truncate hay sửa volume.

- [trip-snapshot-postgres](evidence/t11b/db/trip-snapshot-postgres.json): **16 nhóm PASS**, gồm 11 nhóm T04 hiện có và 5 nhóm mới: save/reopen ngân sách thiếu/bằng/dư; edit từ within → over → within; cố tình gửi kết luận client cũ vẫn trả đúng số hiện tại; nguồn activity/lodging lưu đúng DB JSON và GET. Cả itinerary tự nhập/legacy protection tiếp tục PASS.
- [trip-lifecycle-postgres](evidence/t11b/db/trip-lifecycle-postgres.json): **12 nhóm PASS**, gồm check-in/concurrency/delete, không reset dữ liệu nền.
- Cleanup `finally` chỉ Trip thuộc các UUID user fixture vừa tạo rồi xóa đúng UUID user đó; lifecycle cũng cleanup ID của riêng test. Không cleanup bằng prefix chung hoặc xóa dữ liệu có sẵn. Các Trip ID thấy qua HTTP nằm trong logs/fixture ID evidence.
- [before](evidence/t11b/db/fingerprint-before.json) và [after](evidence/t11b/db/fingerprint-after.json) cùng cách count + SHA-256 chuỗi row-MD5 đã sắp xếp. [compare](evidence/t11b/db/fingerprint-compare.json): **25 bảng, `changed: []`**. Write opt-in đã tắt trước snapshot sau/compare. Không tái sử dụng fingerprint/evidence T11 cũ.

## File thay đổi trong T11-B

| File/nhóm | Thay đổi |
|---|---|
| `backend/src/services/tourPlannerService.ts` | Bỏ budget cap; destination eligibility/422; nguồn từng khoản; budget feasibility fields |
| `backend/src/repositories/recommendationRepository.ts` | Giữ thông tin giá thô có/thiếu qua cờ availability, không đổi giá catalog |
| `backend/src/utils/plannerFeasibility.ts` (mới) | Hàm thuần suy status/difference/excess/violations |
| `backend/src/utils/tripSnapshot.ts` | Whitelist/validate source labels, nhận rồi bỏ kết luận feasibility của client |
| `backend/src/services/tripSessionService.ts` | Derive feasibility khi serialize Trip hiện tại |
| `backend/src/tests/plannerFeasibility.test.ts` (mới) | HTTP thật + synthetic repository boundary |
| `backend/src/tests/plannerValidationCosts.test.ts` | Fixture miễn phí hợp lệ và expected Generate rỗng 422 theo contract mới; giữ coverage 50 checks |
| `backend/src/tests/tripSnapshot.postgres.test.ts` | Bổ sung 5 nhóm persistence/budget/source labels |
| `backend/src/evaluation/t11b_{scenarios_v2,scenarios_v3}.json`, `t11b_evaluate.ts`, `t11b_evaluate_v3.ts` (mới) | Phiên bản contract mới, giữ V1 nguyên vẹn |
| `backend/scripts/t11b_*` (mới) | Capture checks/guarded DB, archive/replay baseline có SHA guard |
| `frontend/src/components/common/PlannerBudgetNotice.tsx` (mới) | Cảnh báo tính theo số hiện tại, nút sửa yêu cầu |
| `frontend/src/pages/TourPlannerPage.tsx` | Form/error/save reference, budget notice, source labels, hotel card |
| `frontend/src/pages/TripDetailPage.tsx` | Cảnh báo hiện tại khi mở lại, nguồn activity/lodging |
| `frontend/src/utils/plannerCosts.ts`, `frontend/src/types/index.ts` | Recompute excess/violations khi edit; type nguồn giá/trạng thái |
| `frontend/e2e/t11b-feasibility.spec.ts`, `playwright.feasibility.config.ts` (mới) | Browser regression riêng, không đụng configs/baseline T11 |
| `docs/evidence/t11b/**`, báo cáo này | Bằng chứng trước/sau, contract revisions, logs, fingerprints và screenshots |

[changed-source-manifest.json](evidence/t11b/changed-source-manifest.json) ghi SHA của các source thay đổi trong task. Các diff T03–T11 có sẵn vẫn nằm nguyên trên working tree; danh sách trên không nhận các thay đổi có sẵn thành công việc mới của T11-B.

## Giới hạn còn lại

- Không chứng minh phương án rẻ nhất; không solver, đổi ranking/weights hoặc đánh giá chất lượng người dùng. Không đo latency benchmark, NDCG/Precision, tuyến đường thực hoặc giá nhà cung cấp.
- `priceFrom` chưa có unit/capacity đáng tin cậy; giữ giả định nhóm/người/đêm đã chốt và ghi chưa xác minh. Chưa bao gồm toàn bộ vận chuyển/liên tỉnh/vé máy bay/tàu. Default 0 đã ghi trong catalog lịch sử không thể suy ngược thành missing; giữ 0, không sửa dữ liệu để đoán.
- Lỗi DB/API được kiểm bằng repository rejection qua HTTP thật; không tắt DB thật để kiểm outage. Null/missing-price boundary dùng fixture repository, không chèn giá null vào catalog DB có ràng buộc hiện tại.
- Browser desktop Edge dùng API replay, không kiểm full browser→API→DB trong cùng một test hoặc mobile. Persistence thật đã kiểm riêng HTTP/PostgreSQL. Chưa kiểm báo giá/Booking của nhà cung cấp ngoài phạm vi task.
- Trip legacy vẫn theo giới hạn sửa T04 hiện có; không nâng cấp đơn vị hoặc reprice dữ liệu cũ. Lịch tự nhập/đã lưu không bị áp điều kiện Generate mới. Không xóa dữ liệu.

**Dừng sau T11-B.**
