# HuGo AI — GIS & Route Plan

## 1. Hiện trạng đã xác minh

HuGo Travel đang dùng:

- PostGIS và tọa độ trong PostgreSQL;
- Leaflet trên frontend;
- raster tiles `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` với attribution;
- Haversine trong backend;
- hệ số đường vòng cố định `1.35` và tốc độ giả định để ước lượng thời gian;
- nearest-neighbor/geo clustering heuristic trong planner;
- polyline nối thẳng tọa độ theo từng ngày trên map.

Đây là **hiển thị GIS và ước lượng demo**, không phải road routing. Dòng nét đứt hiện tại không được gắn nhãn như tuyến xe thật, còn thời gian Haversine không được trình bày như ETA lái xe.

Ngoài ra, public OSM tile server là best-effort, không có SLA và yêu cầu caching/attribution/identification; không phù hợp để mặc định chịu tải production lớn. Xem [OSMF Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/).

## 2. Yêu cầu P0

1. Tìm route geometry, road distance và duration thật từ routing provider.
2. Hỗ trợ ít nhất driving, walking; mode không hỗ trợ phải báo rõ.
3. Route từng ngày hiển thị trực tiếp trên Leaflet, có start/end, thứ tự stop và màu ngày.
4. Ma trận travel time làm đầu vào optimizer, không dùng Haversine làm ETA.
5. Tôn trọng opening hours, visit duration, budget và buffer.
6. Cache có TTL/provider/data-version; retry/timeout/circuit breaker.
7. Nếu provider lỗi, Haversine chỉ là fallback được dán nhãn “khoảng cách đường chim bay; chưa có thời gian đường bộ”.
8. Không tự động booking/payment; replan cần người dùng xác nhận thay đổi quan trọng.

## 3. So sánh routing engine/provider

| Lựa chọn | Điểm mạnh | Hạn chế/chi phí | License/điều kiện | Vai trò đề xuất |
|---|---|---|---|---|
| OSRM self-host | Nhanh; route/table/nearest/match; Docker; phù hợp car matrix | Tự tải và cập nhật OSM extract; profile tương đối tĩnh; vận hành RAM/disk | Backend BSD-2-Clause; OSM data ODbL và attribution. Demo server best-effort, không dùng làm backend production | P1 lựa chọn self-host đơn giản cho Việt Nam/driving |
| Valhalla self-host | Multimodal, time-dependent, matrix/isochrone/map-match/optimized route; costing linh hoạt | Vận hành/build tiles phức tạp hơn; cần benchmark tài nguyên/chất lượng Việt Nam | MIT; OSM data ODbL. Public demo chỉ fair use | P1 nếu cần nhiều mode/time-based |
| OpenRouteService hosted | Dễ tích hợp; directions/matrix/optimization/isochrones; API key; hợp demo | Quota/restrictions thay đổi; phụ thuộc dịch vụ; production plan cần kiểm giá/SLA | Hosted terms + quota; self-host source LGPL-3.0. Waypoints/matrix/optimization có giới hạn công bố | **P0 đề xuất cho local/đồ án**, qua adapter + cache |
| Google Routes API | Route/matrix, traffic-aware, waypoint optimization, ecosystem tốt | Billing/SKU, key security, vendor lock-in và điều khoản lưu/cache/content; traffic features tính phí cao hơn | Proprietary Terms; kiểm pricing trước bật; Google Maps Content không dùng train AI | Optional comparison/deep link, không mặc định P0 |

Nguồn kỹ thuật: [OSRM backend/API](https://github.com/Project-OSRM/osrm-backend), [Valhalla](https://github.com/valhalla/valhalla), [openrouteservice restrictions](https://openrouteservice.org/restrictions/), [Google Routes API](https://developers.google.com/maps/documentation/routes/reference/rest) và [Google pricing](https://developers.google.com/maps/billing-and-pricing/pricing).

Giá/quota là dữ liệu thay đổi. Không hard-code số quota/giá trong business logic; lưu link, ngày kiểm tra và cấu hình budget/rate limit. Tại 2026-10-12, Google pricing chính thức tính Routes theo SKU/billable event với free usage cap khác nhau; phải kiểm lại tại ngày triển khai.

## 4. Quyết định kiến trúc

### P0

- Giữ Leaflet và UI map hiện tại.
- Tạo `RoutingProvider` adapter ở backend; implementation đầu tiên là OpenRouteService hosted cho local/academic demo.
- Key chỉ ở backend `.env`; frontend không gọi provider trực tiếp.
- Tách `route`, `matrix`, `snap` contracts.
- Dùng OR-Tools ở Python optimizer hoặc thuật toán constraint deterministic ban đầu; route matrix là chi phí giữa các stop.
- Có `HaversineFallback` nhưng response phải `quality: FALLBACK_AIR_DISTANCE`, duration = unknown.

### P1

- Benchmark OSRM và Valhalla self-host trên extract Việt Nam/miền demo.
- Chọn OSRM nếu trọng tâm driving/table và vận hành nhẹ; chọn Valhalla nếu cần multimodal/time-dependent tốt hơn.
- Hosted provider vẫn là secondary fallback nếu license/chi phí cho phép.

Không gọi public demo OSRM/Valhalla như hạ tầng production; chính dự án của họ mô tả demo/fair-use và không bảo đảm chất lượng.

## 5. API nội bộ đề xuất

### Route

```http
POST /api/intelligence/routes
Authorization: Bearer <token>
Content-Type: application/json

{
  "profile": "driving-car",
  "stops": [
    {"itemId":"...", "latitude":16.06, "longitude":108.22},
    {"itemId":"...", "latitude":16.08, "longitude":108.24}
  ],
  "departAt":"2026-10-20T08:00:00+07:00",
  "alternatives":false
}
```

Response chuẩn hóa:

```json
{
  "provider": "openrouteservice",
  "profile": "driving-car",
  "quality": "ROAD_ROUTED",
  "distanceMeters": 12400,
  "durationSeconds": 1680,
  "geometry": {"type":"LineString", "coordinates":[]},
  "legs": [],
  "dataUpdatedAt": "2026-10-12T00:00:00Z",
  "cache": {"hit": false, "ttlSeconds": 86400},
  "attribution": "© OpenStreetMap contributors"
}
```

Không dùng các con số ví dụ trên làm dữ liệu UI/test expectation ngoài schema sample.

### Matrix

`POST /api/intelligence/routes/matrix` nhận tối đa N stop theo config, trả distance/duration matrix, cell status và provider. Endpoint chỉ dùng nội bộ/planner, có rate limit và cache.

## 6. Cache, key và observability

Cache key canonical:

`provider|profile|rounded-coordinates|options|depart-time-bucket|data-version`.

- Rounding phải đủ để cache nhưng không làm stop snap sai; đo sai số trước chọn precision.
- TTL: route tĩnh dài hơn, traffic-aware ngắn hơn; cấu hình theo provider terms.
- Không cache trái điều khoản provider.
- Metrics: request count, cache hit, p50/p95 latency, timeout, error by provider/profile, quota remaining nếu API hỗ trợ, fallback rate.
- Không log API key hoặc raw GPS user không cần thiết.
- Circuit breaker trả typed error/fallback; không trả duration bịa.

## 7. Itinerary optimization

### Input bắt buộc

- day start/end, hotel/start point;
- candidate coordinates và category;
- actual/estimated/unknown cost + unit;
- opening time windows;
- dwell duration;
- hard required/excluded stops;
- traveler count, budget, pace, transport profile;
- route matrix.

### Objective P0

Tối đa hóa:

`preference utility + quality utility + diversity − travel penalty − budget penalty − uncertainty penalty`

với hard constraints:

- tổng actual/estimated cost không vượt budget theo rule cấu hình;
- arrival + dwell nằm trong opening hours;
- một stop không xếp trùng;
- travel + visit + rest không vượt day window;
- required stops được xếp hoặc trả infeasible explanation;
- only APPROVED/ACTIVE and available.

OR-Tools cung cấp routing/constraint solvers, nhưng không tự cung cấp road-time truth; duration matrix vẫn phải đến từ routing engine. Solver có time limit và trả status `OPTIMAL/FEASIBLE/INFEASIBLE/TIME_LIMIT`, không im lặng trả lịch trình không khả thi.

### Ba phương án ngân sách

- Tiết kiệm: ưu tiên low-cost và public/walking feasibility.
- Cân bằng: utility/travel/cost cân đối.
- Thoải mái: tăng comfort/quality, vẫn dưới budget.

Mỗi cost hiển thị `ACTUAL`, `ESTIMATED` hoặc `UNKNOWN`, source và thời điểm cập nhật. Nếu unknown quan trọng, planner hỏi người dùng/loại candidate thay vì tự gán 150.000/200.000/400.000 như heuristic hiện tại.

## 8. Opening hours và timezone

Schema `opening_hours` hiện rỗng cho toàn bộ 9 places, nên constraint này **BLOCKED bởi dữ liệu**. Đề xuất format versioned:

```json
{
  "schemaVersion": 1,
  "timezone": "Asia/Ho_Chi_Minh",
  "weekly": {"mon":[["08:00","17:00"]]},
  "exceptions": [{"date":"2026-10-20", "closed":true}],
  "source": "partner_verified",
  "verifiedAt": "2026-10-01T00:00:00Z"
}
```

Partner nhập, admin/validation kiểm; không lấy Google content để train hoặc sao chép trái phép. DST ít liên quan Việt Nam nhưng timestamp API vẫn dùng ISO-8601 + timezone.

## 9. Frontend UX

### Planner full screen

- desktop: chat/form trái, itinerary giữa, Leaflet phải;
- mobile: itinerary + bottom sheet; nút chuyển list/map rõ;
- route theo ngày, legend, start/end, numbered stops;
- click card ↔ focus marker; reorder/remove cập nhật trạng thái “đang tính lại”; cancel stale request bằng request ID;
- route error giữ itinerary và báo “chưa tính được tuyến đường”, không vẽ đường thẳng như route thật;
- comparison hiển thị thêm phút/km/cost delta và data timestamp.

### Deep link

Cho phép mở Google Maps/ứng dụng bản đồ bằng URL do user bấm. Deep link là bước hỗ trợ điều hướng, không thay route preview trực tiếp trên HuGo và không gửi dữ liệu nhạy cảm không cần thiết.

### Attribution

Attribution OSM/provider luôn nhìn thấy, không bị overlay che. Cấu hình tile URL qua environment/provider adapter; production phải dùng dịch vụ tiles phù hợp SLA/terms hoặc self-host, không phụ thuộc vô điều kiện vào community tile server.

## 10. Kiểm thử

### Unit/contract

- coordinate bounds, duplicate/zero stop, unsupported profile;
- canonical cache key;
- provider response mapping;
- fallback không có fabricated duration;
- cost/opening-hour/timezone calculations;
- solver infeasible/time-limit behavior.

### Integration

- local stub chỉ cho contract/error tests; ít nhất một test opt-in gọi provider thật trong môi trường test có key;
- record status/provider/latency, không commit response có điều khoản hạn chế;
- route geometry bắt đầu/kết thúc gần requested snapped points;
- matrix diagonal = 0, unreachable cell được typed.

### E2E

- nhập chuyến 3 ngày → map có route từng ngày;
- reorder/remove → route và totals thay đổi;
- mobile responsive;
- loading, rate-limit, provider down, partial route;
- save/reopen giữ ordered stops và route metadata hợp lệ;
- key không xuất hiện trong browser network/source.

### Acceptance gate P0

- 100% hard constraints trên golden scenarios;
- 0 fabricated ETA/cost;
- route geometry thật hiển thị trên Leaflet;
- provider outage có UI/fallback đúng;
- attribution/license/key-security PASS;
- p95 latency được đo và báo cáo, chưa đặt con số PASS cho đến khi benchmark local.

## 11. Milestone thực hiện GIS đầu tiên

1. Thu thập opening hours/duration/price unit cho bộ địa điểm demo.
2. Viết provider-neutral contract và contract tests.
3. Tạo ORS key cho tài khoản development, giữ trong backend `.env` local.
4. Tích hợp route + matrix qua backend adapter và cache.
5. Thay dashed straight line bằng GeoJSON route; giữ air-distance fallback có nhãn.
6. Thêm golden scenarios Đà Nẵng/Đà Lạt, đo feasibility/latency/cost.
7. Sau demo mới benchmark self-host OSRM/Valhalla; không mở rộng hạ tầng sớm.

Trạng thái hiện tại: **GIS visualization PASS; road routing BLOCKED/chưa triển khai; kiến trúc P0 đã được xác định.**

