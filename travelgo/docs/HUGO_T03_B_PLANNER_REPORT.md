# T03-B — Đồng bộ pacing và phương tiện ETA của Planner MVP

Ngày thực thi: **28/10/2026**, giờ Việt Nam (`Asia/Ho_Chi_Minh`). Căn cứ: [scope T02](HUGO_6_WEEK_SCOPE.md), [báo cáo T03-A](HUGO_T03_A_PLANNER_REPORT.md) và source đang có.

**Kết quả:** generate mới chỉ nhận `balanced` và `car/motorbike`, có lỗi 400 rõ cho mode chưa hỗ trợ/sai; mode được truyền đúng vào GeoService. UI không quảng bá quá hai điểm tham quan/ngày hoặc vé/chặng liên tỉnh. Backend regression mới **17/17**, regression T03-A **50/50**, mandatory **9/9**, algorithm **14/14**, frontend mode unit **6/6**, backend/frontend builds đều PASS. **DB, browser/Playwright và HTTP end-to-end NOT RUN** trong task này.

## 1. Trạng thái nền và phạm vi

HEAD nền vẫn là `052531dfc77c4f289757794c0ee08b4d46e6af2e` (commit 16/10/2026). Test T03-B chạy trên **working tree chưa commit**, có toàn bộ T03-A và các thay đổi trước đó; không gán kết quả lần này cho commit gốc.

Trước sửa đã kiểm Git status và ghi checksum **258 file có sẵn** trong các nhánh source/tài liệu được kiểm kê. Không rollback hoặc ghi đè T03-A. Những file Planner/validator/UI dùng chung được sửa tiếp đúng phần modes; công thức ngày/đêm, `GROUP_VND_V1`, phí lưu trú và helpers chi phí được giữ.

Không sửa Booking/auth, Trip controller/service/repository/persistence, routing engine, GeoService formula, ranking weights, mandatory-place policy hoặc schema. Không train, tạo corpus/consent, đổi manifest, push/deploy. Các file Python/report có sửa đổi trước phiên này và tài liệu T01/T02/T03-A được giữ nguyên.

## 2. Contract trước và sau

| Phần | Sau T03-A / trước T03-B | Sau T03-B |
|---|---|---|
| Thiếu pacing | Default balanced | Giữ default balanced |
| Thiếu transportation | Default car | Giữ default car |
| Pacing gửi rõ | Nhận relaxed/balanced/packed; lịch thực tế tối đa hai sightseeing slot | **Chỉ nhận balanced** cho generate mới |
| Transportation gửi rõ | Nhận flight/car/train/motorbike, ETA luôn dùng car | **Chỉ nhận car/motorbike**, ETA dùng đúng mode |
| Pacing relaxed/packed | Có thể generate, chỉ khác summary | 400 `UNSUPPORTED_PLANNER_PACING`, yêu cầu chọn lại balanced |
| Transport flight/train | Có thể generate với ETA ô tô | 400 `UNSUPPORTED_PLANNER_TRANSPORTATION`, nói rõ chưa hỗ trợ chặng liên tỉnh |
| Unknown/null/empty/object/boolean sai | Validator T03-A đã reject enum sai | Giữ 400 `INVALID_PLANNER_PACING` / `INVALID_PLANNER_TRANSPORTATION` |
| Nhãn balanced | UI 2–3 điểm/ngày | **Tối đa 2 điểm tham quan/ngày, không tính bữa ăn** |
| ETA | Ước lượng Haversine, mode chưa được nối | Haversine + GeoService mode car/motorbike; không phải tuyến đường bộ hoặc thời gian thực |
| Cost/ngày/đêm/mandatory | Contract T03-A | Giữ nguyên; đổi transport không thay chi phí hoặc selection |

Chỉ field **thiếu/undefined** nhận default. Giá trị legacy đã gửi không tự đổi thành mode hợp lệ. Với cả hai field cùng sai, validator trả lỗi field được kiểm trước; sau khi sửa field đó có thể cần chọn lại field còn lại.

Các lỗi unsupported có message hướng dẫn chọn lại, nêu phạm vi hiện có; không im lặng nhận flight/train/relaxed/packed rồi chạy balanced/car. Invalid enum cũng trả 400 với code riêng. Service và controller dùng chung validator, reject trước catalog retrieval.

## 3. Backend và invariant của T03-A

- `PlannerInput` dùng cho generate được thu hẹp thành pacing `'balanced'`, transportation `'car' | 'motorbike'`.
- `GeoService.estimateTravelTimeMinutes(dist, input.transportation)` nhận mode thật, giữ nguyên công thức GeoService: car 30 km/h, motorbike 35 km/h, hệ số 1,35, làm tròn lên và tối thiểu 5 phút.
- Summary nói rõ giới hạn hai điểm tham quan/ngày, bữa ăn không được tính để tăng số điểm; ETA chỉ ước lượng và chưa tính chặng/chi phí liên tỉnh.
- Response generate mới có thêm `transportation` để mô tả mode của kết quả; không thay công thức giá theo mode và không tự thêm phí phương tiện.
- Không thay retrieval/ranking weights, số sightseeing slot, clustering, mandatory UUID/count/eligibility/destination/capacity/dedupe/post-condition.
- Giữ inclusive days 1–10, N−1 đêm, `GROUP_VND_V1`, lodging tách riêng và mọi giả định giá của T03-A. Hai mode cùng catalog/input có selection, activity costs, day totals, trip total, difference, budget status và lodging giống nhau.

Một case của `algorithm.test.ts` trước đây dùng `relaxed` để kiểm **budgetStatus**. Đã đổi input của case đó thành `balanced` để tiếp tục kiểm đường generate hợp lệ. Assertions budget không đổi; các trường hợp relaxed/packed bị reject được kiểm riêng trong suite modes mới. Không nới assertion hoặc xóa coverage để làm test PASS.

## 4. Frontend và dữ liệu legacy

### 4.1. Form generate mới

- Chỉ hiện hai lựa chọn Ô tô/Xe máy, dưới nhãn **“Phương tiện ước lượng giữa các điểm”**.
- Nhịp độ chỉ hiện Cân bằng với mô tả tối đa hai điểm tham quan/ngày, không tính bữa ăn. Không còn lựa chọn/nhãn 2–3 hay 4+ điểm/ngày.
- Có ghi chú chưa hỗ trợ máy bay/tàu, chưa tính chặng/chi phí liên tỉnh. Dòng ETA của từng leg ghi rõ ước lượng từ Haversine, không phải tuyến đường bộ hoặc thời gian thực.
- Client validate modes trước khi gọi API; mode chưa hợp lệ hiển thị cảnh báo, chặn submit và yêu cầu chọn lại.

### 4.2. Không âm thầm đổi mode của template cũ

Luồng copy template hiện có truyền `location.state.templateTour`. Helper `initialPlannerModes` đọc các field mode từ source đó **nếu có**, giữ nguyên mọi giá trị được cung cấp, kể cả legacy/invalid; chỉ field thiếu mới lấy balanced/car.

Ví dụ `templateTour` có `pacing=relaxed`, `transportation=flight`: cả hai giá trị được giữ ở form state, không sửa object template. Không có nút unsupported được tự chọn thành balanced/car. Người dùng phải chủ động chọn Cân bằng và Ô tô/Xe máy; chỉ chọn một field còn field kia sai thì form vẫn chưa cho generate. Hành vi này được kiểm ở helper unit, chưa quan sát bằng browser.

Luồng template hiện có chỉ mang city/price khi không có field mode sẽ nhận defaults như trước. Không thêm luồng regenerate Trip mới hoặc tự suy mode từ summary/text. Nếu client khác gửi legacy modes trực tiếp tới generate API, backend trả 400 yêu cầu chọn lại.

### 4.3. Mở xem Trip/template cũ

Chỉ **write/generate contract** bị thu hẹp. Kiểu đọc `TripSession.pacing` và `GeneratedItinerary.pacing` vẫn giữ relaxed/balanced/packed; field transportation đọc nếu có vẫn cho legacy flight/train. Trip Detail, Tour Detail và Blog Detail không bị sửa; không migrate hoặc định giá lại Trip/template đã lưu.

Đây là bảo toàn đường đọc theo source/types và checksum, **không phải kết quả mở Trip trên DB/browser vừa PASS**. Source hiện chưa có CTA regenerate Trip trực tiếp; không tuyên bố đã kiểm một luồng UI chưa tồn tại. Metadata transportation mới cũng chưa được kiểm persistence/reopen trong task này.

## 5. File thay đổi/tạo mới của T03-B

| File | Thay đổi T03-B |
|---|---|
| `backend/src/utils/plannerValidation.ts` | Phân biệt unsupported legacy với invalid; giữ default chỉ khi thiếu |
| `backend/src/services/tourPlannerService.ts` | Thu hẹp input modes, truyền mode ETA, thêm transportation response, summary trung thực; giữ costing T03-A |
| `backend/src/tests/plannerModes.test.ts` — mới | Defaults/rejection, spy gọi mode thật, so ETA từng leg, witness long leg, costing/mandatory invariants |
| `backend/src/tests/algorithm.test.ts` | Một input budget case relaxed→balanced, giữ nguyên assertions |
| `backend/package.json` | Thêm `test:planner:modes` |
| `frontend/src/utils/plannerModes.ts` — mới | Options/nhãn, khởi tạo giữ legacy values và validation trước generate |
| `frontend/src/pages/TourPlannerPage.tsx` | Controls supported-only, cảnh báo legacy/reselect, submit guard và ETA wording |
| `frontend/src/types/index.ts` | Thu hẹp PlannerInput; giữ read enums rộng; thêm optional transportation metadata |
| `frontend/tests/plannerModes.test.ts` — mới | Default/options/label, explicit legacy/malformed không bị đổi, reselect và source immutability |
| `frontend/package.json` | Thêm `test:planner-modes` |
| `docs/HUGO_T03_B_PLANNER_REPORT.md` — mới | Báo cáo này |

`frontend/src/utils/plannerCosts.ts`, test chi phí T03-A, controller Planner T03-A, GeoService và các module Trip/Booking/auth giữ nguyên trong phiên này.

## 6. Regression thực sự đã chạy

### 6.1. FAIL trước sửa → PASS sau sửa

Đã thêm backend suite modes và chạy trên source T03-A trước khi thay business modes:

```text
npm.cmd run test:planner:modes
suite=planner-modes, passed=11, failed=6, database=NOT USED
exit code=1
```

Sáu nhóm FAIL:

1. relaxed chưa bị từ chối.
2. packed chưa bị từ chối.
3. flight chưa bị từ chối.
4. train chưa bị từ chối.
5. Summary thiếu giới hạn hai điểm tham quan/ngày và không tính bữa ăn.
6. motorbike không được truyền tới GeoService; spy ghi nhận mode car.

Sau sửa, **17/17 nhóm PASS, exit 0**. Lần cuối bổ sung assertion transportation response và in witness long leg trong cùng nhóm; không gọi các assertion bổ sung đó là đã FAIL ở lần baseline.

Fixture chỉ trong bộ nhớ: hai attraction cùng city ở tọa độ khác nhau và một hotel; ba ngày `2028-02-28` đến `2028-03-01`, 2 adults +1 child, cùng budget/catalog/mandatory IDs cho hai mode. Không có DB write hoặc dữ liệu training.

### 6.2. Witness ETA thực tế từ lần chạy cuối

```json
{"longLegEtaWitness":{"distanceKm":21.98,"carMinutes":60,"motorbikeMinutes":51}}
```

Với d=21,98 km, công thức GeoService hiện có cho car `ceil(d×1,35/30×60)=60`, motorbike `ceil(d×1,35/35×60)=51`. Fixture có leg >10 km nên khác biệt không bị mức sàn 5 phút che. Test kiểm **tất cả leg có ETA** đúng hàm cho mode tương ứng; spy gọi hàm gốc, không thay hàm thành giá trị giả.

Đây là ETA theo giả định GeoService trong unit fixture, không phải tốc độ giao thông thật, tuyến đường thực tế hoặc phép đo provider.

### 6.3. Bảo toàn tính toán và mandatory Place

Suite modes deep-compare projection của car/motorbike: title, ngày, số đêm, `costBasis`, trip total/difference/status, selected IDs, lodging từng ngày và cost/activity IDs. Các ID bắt buộc xuất hiện đúng một lần trong cả hai kết quả.

Suite T03-A được chạy lại nguyên vẹn **50/50 PASS**: inclusive/leap dates, ngày/count/budget sai, defaults, 0/1/2 đêm, phí nhóm/lodging, mandatory hotel 0đ và price fallback/0. Không sửa fixture/expected của suite này.

## 7. Lệnh/exit code và môi trường

Ngày chạy 28/10/2026; Windows x64/PowerShell; Node **v24.20.0**, npm.cmd **11.19.0**, installed TypeScript backend/frontend **5.9.3**, installed Vite **6.4.4**.

| Cwd | Lệnh | Kết quả thực trong T03-B |
|---|---|---|
| backend | `npm.cmd run test:planner:modes` trước sửa | 11 PASS /6 FAIL; **exit 1** |
| backend | `npm.cmd run test:planner:modes` sau sửa, lần cuối | **17/17 PASS; exit 0**, có ETA witness |
| backend | `npm.cmd run test:planner:validation` | **50/50 PASS; exit 0** |
| backend | `npm.cmd run test:planner:mandatory` | **9/9 PASS; exit 0** |
| backend | `npm.cmd run test:algorithm` | **14/14 PASS; exit 0** |
| backend | `npm run build --silent` / tsc bên trong mỗi script trên | **PASS, exit 0** trước khi Node chạy suite; không bỏ backend build |
| frontend | `npm.cmd run test:planner-modes` | **6/6 PASS; exit 0** |
| frontend | `npm.cmd run build` | **PASS; exit 0**, tsc + Vite, 1.730 modules |
| workspace | `git diff --check -- backend frontend` | **exit 0**; chỉ cảnh báo LF/CRLF |

Frontend build được chạy với quyền thực thi phù hợp do cùng môi trường đã có lỗi sandbox/esbuild config access ở T03-A. T03-B không sửa cấu hình/build dependencies hoặc thử lại thất bại để tạo thêm baseline không cần thiết.

`test:planner-costs` không chạy lại trong T03-B: helper/test cost không đổi, phiên này không thay thao tác tính/xóa/reorder. Kết quả **6/6 của T03-A là baseline cũ**, không gọi là lần T03-B vừa chạy. Backend costing đã được kiểm lại 50 cases và mode-invariance như trên.

Không chạy recommendation suite lại vì không thay retrieval/ranking/weights trong T03-B; `test:algorithm` vẫn gồm recommendation smoke. Không cộng các suite chồng lấn thành tổng test độc nhất.

### Fingerprint source chính sau sửa

| File | SHA-256 |
|---|---|
| `backend/src/utils/plannerValidation.ts` | `c6f0eee319d92feee0b8afb248fcecc900bd2719f63d8a3fa7b914511741e57e` |
| `backend/src/services/tourPlannerService.ts` | `03151bb6e281abe72c64496adaed9f551b34f3cdb67557141bba689c094584ba` |
| `frontend/src/utils/plannerModes.ts` | `d711d810471c4551b77d1c04c46b2735ec57c2473c7e91317fb909e093fa0bbd` |
| `frontend/src/pages/TourPlannerPage.tsx` | `5e08060f5707af72a8eef4acdf172787c87c084ed4879858945fcd7ca782f388` |

## 8. Chưa kiểm và giới hạn còn lại

- **DB readiness/guard/sentinel, PostgreSQL tests, real HTTP và Playwright/browser: NOT RUN.** Chưa xác minh setup cô lập phù hợp; không dùng unit loader/controller stub để ghi PASS cho DB hoặc browser. Không seed/reset/migrate để chuẩn bị task này.
- Unit frontend kiểm helper thật được form gọi, không chứng minh tương tác/visual/mobile hoặc mở Trip/template qua trình duyệt. Browser smoke cho legacy warning/reselect và read-only Trip vẫn cần ở môi trường đã xác minh.
- Haversine và hệ số GeoService vẫn chỉ là ước lượng; car/motorbike không biểu diễn địa hình, traffic hoặc road network. Không tính chi phí intercity hay vận chuyển thực.
- Pacing balanced giữ nguyên hai sightseeing slot có sẵn; có thể ít hơn khi catalog không đủ. Bữa ăn/khách sạn không dùng để quảng bá thêm điểm tham quan.
- Reorder/delete chưa có replan ETA, giữ giới hạn đã ghi ở T03-A; không triển khai routing/recompute mới trong T03-B.
- Field transportation mới mô tả response generate; việc lưu/mở lại metadata này, group-cost metadata và các derived IDs chưa được kiểm persistence. Không ngầm mở rộng Trip schema để giải quyết trong task này.

## 9. Chuyển sang T04 — chưa thực hiện

Task tiếp theo đề xuất theo scope: **T04 Trip** — validate create/update itinerary và các scalar, derive/dedupe selectedPlaceIds cùng update, kiểm ownership/selected IDs/reopen, chốt consistency totals/check-in khi bỏ stop. Giữ khả năng **đọc** pacing legacy; không áp validator generate supported-only lên toàn bộ dữ liệu lịch sử khi chỉ mở xem.

Trước HTTP/PostgreSQL/E2E ở T04 phải xác minh target test loopback, identity/sentinel `hugotravel-isolated-test-database-v1`, exact DB opt-in và schema prerequisites. Nếu thiếu setup, ghi NOT RUN cho phần đó, vẫn làm unit/source work độc lập; không giả bằng chứng DB.

**Dừng sau T03-B.** Không bắt đầu T04, Booking/auth, training, manifest, push hoặc deploy.
