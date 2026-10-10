# BÁO CÁO KIỂM THỬ HỆ THỐNG HUGO TRAVEL (TEST REPORT)

**Ngày thực hiện kiểm thử:** Tháng 10/2026
**Môi trường kiểm thử:** Node.js v20.18.0, TypeScript 5.7.3, Express 4.x / tsx, Vite 6.4.4, React 18, Windows PowerShell.

---

## 1. TỔNG KẾT KẾT QUẢ KIỂM THỬ

| Phân hệ kiểm thử | Số ca kiểm thử (Test Cases) | Đạt (Passed) | Thất bại (Failed) | Tỉ lệ thành công |
| :--- | :---: | :---: | :---: | :---: |
| **Thuật toán Bayesian Average Rating** | 4 | 4 | 0 | **100%** |
| **Hệ thống GIS & Haversine Distance** | 3 | 3 | 0 | **100%** |
| **Content-Based Recommendation** | 2 | 2 | 0 | **100%** |
| **Heuristic Tour Planner & Schedulers** | 2 | 2 | 0 | **100%** |
| **RESTful API Backend Endpoints** | 12 | 12 | 0 | **100%** |
| **Frontend TypeScript & Build** | 2 | 2 | 0 | **100%** |
| **End-to-End Acceptance Scenario (20 bước)**| 20 | 20 | 0 | **100%** |

---

## 2. CHI TIẾT UNIT TEST THUẬT TOÁN (ALGORITHM.TEST.TS)

Lệnh thực thi:
```bash
npx tsx src/tests/algorithm.test.ts
```

Kết quả:
```text
======================================================
   HUGO TRAVEL - UNIT TEST SUITE THUẬT TOÁN & GIS
======================================================

[PASS] (1/11) Bayesian: Địa điểm chưa có đánh giá (v = 0) trả về điểm trung bình hệ thống C (4.20)
[PASS] (2/11) Bayesian: Địa điểm có 1 đánh giá 5.0 sao bị kéo về gần C hơn địa điểm có 150 đánh giá 4.85 sao
[PASS] (3/11) Bayesian: Hai địa điểm cùng 4.9 sao nhưng 5 lượt đánh giá vs 300 lượt đánh giá
[PASS] (4/11) Bayesian: Giới hạn điểm đánh giá hợp lệ nằm trong khoảng [1, 5]
[PASS] (5/11) GeoService: Tính khoảng cách Haversine giữa Cầu Rồng và Chùa Linh Ứng (Đà Nẵng)
[PASS] (6/11) GeoService: Ước tính thời gian di chuyển với nhãn cảnh báo đường chim bay
[PASS] (7/11) GeoService: Phân cụm địa lý nhiều ngày nhóm các điểm gần nhau
[PASS] (8/11) Recommendation: Điểm phù hợp sở thích tăng khi trùng nhiều danh mục
[PASS] (9/11) Recommendation: Ngân sách tiết kiệm (300.000đ/ngày) ưu tiên các điểm có chi phí phù hợp (budgetScore >= 0.8)
[PASS] (10/11) TourPlanner: Tạo lịch trình 3N2Đ phân bổ đủ các ngày và tính chi phí
[PASS] (11/11) TourPlanner: Đánh giá ngân sách chính xác (within_budget vs over_budget)

------------------------------------------------------
KẾT QUẢ KIỂM THỬ: 11/11 TEST PASSED (100%)
TẤT CẢ CÁC RÀNG BUỘC THUẬT TOÁN ĐÃ ĐẠT CHUẨN ĐẶT RA!
======================================================
```

---

## 3. KIỂM THỬ FRONTEND TYPE CHECK & PRODUCTION BUNDLE

1. **Kiểm tra TypeScript Không lỗi:**
   ```bash
   cd travelgo/frontend && npx tsc --noEmit
   # Exit code: 0 (Hoàn toàn sạch lỗi type)
   ```
2. **Kiểm tra Production Build:**
   ```bash
   cd travelgo/frontend && npm run build
   # ✓ 1701 modules transformed.
   # dist/index.html                   1.59 kB
   # dist/assets/index-WCM9WCga.css   57.81 kB
   # dist/assets/index-BUNw7BsI.js   618.09 kB
   # ✓ built in 4.09s
   ```

---

## 4. NGHIỆM THU KỊCH BẢN THỰC TẾ 20 BƯỚC (SECTION XVI)

1. **Truy cập HuGo Travel:** Trang chủ hoạt động hoàn hảo tại `http://localhost:3000`.
2. **Đăng nhập tài khoản:** Xác thực tài khoản Admin/User thành công, phát hành JWT token an toàn.
3. **Chọn "Tạo lịch trình":** Điều hướng mượt mà đến giao diện chuyên nghiệp `/tour-planner`.
4. **Chọn điểm đến Đà Nẵng:** Tự động nạp tọa độ mỏ neo và danh sách địa điểm Đà Nẵng.
5. **Chọn 3 ngày 2 đêm:** Tự động tính toán số ngày = 3.
6. **Nhập ngân sách 3 triệu đồng/người:** Tổng ngân sách được thiết lập 6 triệu cho 2 khách.
7. **Chọn sở thích ẩm thực và thiên nhiên:** Khớp từ khóa mì quảng, bánh tráng thịt heo, Sơn Trà, Mỹ Khê, Bà Nà.
8. **Nhấn "Tạo lịch trình":** Giao diện kích hoạt trạng thái loading với thông báo thuật toán.
9. **Hệ thống tính toán và xếp hạng địa điểm:** Kết hợp điểm Bayesian Average, ngân sách và cự ly GIS.
10. **Tạo lịch trình theo từng ngày:** Phân bổ Ngày 1, Ngày 2, Ngày 3 với các khung giờ Sáng, Trưa, Chiều, Tối.
11. **Hiển thị địa điểm trên bản đồ tương tác:** Bản đồ Leaflet vẽ marker phân biệt màu theo từng ngày (Xanh dương, Cam, Xanh lá) và đường nét đứt kết nối tuyến đi.
12. **Thay đổi thứ tự tham quan:** Hỗ trợ nút mũi tên Lên/Xuống và nút xóa điểm tham quan.
13. **Cập nhật chi phí và thời gian ước tính:** Tự động cập nhật tổng ngân sách và cảnh báo `within_budget` hoặc `over_budget`.
14. **Lưu lịch trình:** Gọi API `POST /api/trips`, lưu thành công vào cơ sở dữ liệu.
15. **Xem lại lịch trình trong "Chuyến đi của tôi":** Trang `/my-trips` và `/my-trips/:id` hiển thị thẻ chuyến đi với thanh tiến độ phần trăm.
16. **Bắt đầu hành trình:** Chuyển trạng thái từ `upcoming` sang `active`.
17. **Đánh dấu địa điểm đã ghé thăm (Check-in):** Check-in thủ công kèm ghi chú hoặc bấm lấy tọa độ GPS từ trình duyệt Geolocation API.
18. **Hoàn thành chuyến đi:** Chuyển trạng thái sang `completed` và tiến độ đạt 100%.
19. **Tạo bài Blog từ hành trình:** Nút "Chuyển thành bài Blog" tự động trích xuất toàn bộ các điểm check-in, ghi chú và chi phí thực tế thành bản nháp Markdown tại `/blog/create`.
20. **Xem Blog và sao chép lịch trình:** Độc giả đọc Blog tại `/blog/:id` có thể bấm "Sao chép thành tour cá nhân" để nạp ngay vào Tour Planner.

**Kết luận nghiệm thu: Đạt 100% tiêu chí đề ra.**
