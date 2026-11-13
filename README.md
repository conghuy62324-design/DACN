# HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN TRAVELGO (HUGO TRAVEL)

> **Đồ Án Chuyên Ngành (DACN) – HuGo Travel**  
> Nền tảng Gợi ý, Lập kế hoạch Hành trình Du lịch Thông minh & Trợ lý AI (HuGo Assistant)

---

## 🛠️ I. CÁC MÔI TRƯỜNG & CÔNG NGHỆ BẮT BUỘC CẦN CÀI ĐẶT

Trước khi chạy dự án, các thành viên trong nhóm cần đảm bảo máy tính đã cài đặt đầy đủ các phần mềm sau:

1. **Git:**  
   - Tải và cài đặt tại: [https://git-scm.com/](https://git-scm.com/)  
   - Kiểm tra trong terminal: `git --version`

2. **Node.js (khuyên dùng Node.js LTS v18.x, v20.x hoặc v22.x):**  
   - Tải tại: [https://nodejs.org/](https://nodejs.org/)  
   - Đi kèm sẵn trình quản lý gói `npm`.  
   - Kiểm tra trong terminal:  
     ```bash
     node -v
     npm -v
     ```

3. **Docker Desktop:**  
   - Dùng để chạy cơ sở dữ liệu **PostgreSQL 15 tích hợp phần mở rộng PostGIS** và công cụ quản trị **pgAdmin 4**.  
   - Tải tại: [https://www.docker.com/products/docker-desktop/](https://www.docker.com/products/docker-desktop/)  
   - Sau khi cài đặt, hãy mở ứng dụng **Docker Desktop** và đảm bảo Docker Engine đang ở trạng thái **Running** (màu xanh).  
   - Kiểm tra trong terminal: `docker --version` và `docker-compose --version`

---

## 🚀 II. HƯỚNG DẪN CÁC BƯỚC KHỞI CHẠY DỰ ÁN (A - Z)

### Bước 1: Clone mã nguồn về máy
Mở Terminal / PowerShell và chạy:
```bash
git clone https://github.com/conghuy62324-design/DACN.git
cd DACN
```

---

### Bước 2: Khởi động Cơ sở dữ liệu (PostgreSQL + PostGIS qua Docker)

Di chuyển vào thư mục `travelgo` và khởi chạy Docker Compose:
```powershell
cd travelgo
docker-compose up -d
```
> Khi hoàn tất, container PostgreSQL sẽ lắng nghe ở cổng `5432` và pgAdmin ở cổng `5050`.

---

### Bước 3: Cài đặt & Khởi động Backend (Express API)

Mở một cửa sổ Terminal/PowerShell mới:
```powershell
cd DACN/travelgo/backend

# 1. Tạo file cấu hình môi trường .env từ mẫu .env.example (nếu chưa có)
copy .env.example .env

# 2. Cài đặt các thư viện phụ thuộc
npm install

# 3. Chạy migration để tự động tạo toàn bộ bảng trong database
npm run db:migrate:apply

# 4. Nạp dữ liệu mẫu ban đầu (Seed data)
npm run seed

# 5. Khởi động Backend Server
npm run dev
```
> **Backend Server sẽ chạy tại:** `http://localhost:5000`  
> Kiểm tra trạng thái API: `http://localhost:5000/api/health`

---

### Bước 4: Cài đặt & Khởi động Frontend (React + Vite)

Mở một cửa sổ Terminal/PowerShell riêng:
```powershell
cd DACN/travelgo/frontend

# 1. Cài đặt các thư viện phụ thuộc
npm install

# 2. Khởi động Frontend Dev Server
npm run dev
```
> **Giao diện Web Frontend sẽ chạy tại:** `http://localhost:3000`

---

## 🌐 III. DANH SÁCH CÁC CỔNG & LINK TRUY CẬP

| Dịch vụ | Địa chỉ URL | Ghi chú |
| :--- | :--- | :--- |
| **Giao diện người dùng (Frontend)** | [http://localhost:3000](http://localhost:3000) | Giao diện React Vite, bản đồ Leaflet |
| **Trợ lý HuGo AI (Assistant)** | [http://localhost:3000/assistant](http://localhost:3000/assistant) | Cần đăng nhập tài khoản Khách hàng |
| **Lập kế hoạch Tour (Planner)** | [http://localhost:3000/tour-planner](http://localhost:3000/tour-planner) | Thuật toán Heuristic & phân cụm địa lý |
| **Backend REST API** | [http://localhost:5000](http://localhost:5000) | Express API, Sequelize ORM |
| **API Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Kiểm tra kết nối DB & engine thuật toán |
| **Giao diện Quản trị DB (pgAdmin)** | [http://localhost:5050](http://localhost:5050) | Email: `admin@hugotravel.vn`<br>Mật khẩu: `admin123` |

---

## 🔑 IV. TÀI KHOẢN ĐĂNG NHẬP THỬ NGHIỆM (TEST ACCOUNTS)

Hệ thống đã chuẩn bị sẵn các tài khoản demo sau khi chạy lệnh `npm run seed`:

| Vai trò | Email đăng nhập | Mật khẩu mặc định | Quyền hạn & Chức năng kiểm thử |
| :--- | :--- | :--- | :--- |
| **Khách hàng (Customer)** | `customer.a@hugotravel.vn` | `travelgo2026seed` | Đăng nhập để test **Trợ lý HuGo AI**, Đặt tour/vé/phòng, Lưu chuyến đi (`/my-trips`), Viết blog |
| **Khách hàng 2** | `customer.b@hugotravel.vn` | `travelgo2026seed` | Tài khoản phụ test tương tác blog, đánh giá |
| **Quản trị viên (Super Admin)** | `admin@hugotravel.vn` | `travelgo2026seed` | Truy cập trang Quản trị (`/admin`), duyệt đối tác, kiểm duyệt nội dung |
| **Đối tác Khách sạn (Partner)** | `hotel.a@hugotravel.vn` | `travelgo2026seed` | Quản lý dịch vụ lưu trú, phòng nghỉ |
| **Đối tác Nhà hàng (Partner)** | `restaurant@hugotravel.vn` | `travelgo2026seed` | Quản lý dịch vụ ẩm thực |
| **Đối tác Tour (Partner)** | `tour@hugotravel.vn` | `travelgo2026seed` | Quản lý tour du lịch, lịch trình |

---

## 🧪 V. HƯỚNG DẪN TEST CÁC TÍNH NĂNG CHÍNH

1. **Test Trợ lý HuGo AI (`/assistant`):**
   - Đăng nhập với tài khoản `customer.a@hugotravel.vn` / `travelgo2026seed`.
   - Vào mục **Trợ lý AI** trên thanh Menu.
   - Nhập câu hỏi tư vấn (ví dụ: *"Gợi ý lịch trình du lịch Đà Nẵng 3 ngày 2 đêm với ngân sách 5 triệu"*).
   - Kiểm tra phản hồi thông minh, đề xuất địa điểm thực tế và bóc tách thực thể địa lý.

2. **Test Lập lịch trình thông minh (`/tour-planner`):**
   - Chọn điểm khởi hành, điểm đến (Đà Nẵng, Phú Quốc, Đà Lạt...), số ngày, ngân sách và sở thích.
   - Nhấn **Tạo lịch trình** để kiểm tra thuật toán phân cụm không gian GIS Haversine và Bayesian Average tự động sắp xếp điểm tham quan theo khung giờ.
   - Kéo thả/chỉnh sửa điểm tham quan và lưu vào danh sách chuyến đi cá nhân (`/my-trips`).

3. **Test Khám phá & Đánh giá xếp hạng Bayesian (`/explore`, `/tours`, `/hotels`, `/restaurants`):**
   - Xem danh sách địa điểm được sắp xếp theo điểm đánh giá Bayesian Rating (loại bỏ thiên vị đánh giá ít).
   - Xem bản đồ tương tác hiển thị vị trí các địa điểm.

---

## ⚙️ VI. CÁC LỖI THƯỜNG GẶP (TROUBLESHOOTING)

1. **Lỗi Docker không khởi động hoặc cổng 5432 bị chiếm dụng:**
   - *Nguyên nhân:* Máy tính có cài sẵn PostgreSQL local đang chạy nền chiếm cổng 5432.
   - *Khắc phục:* Mở `Services` (services.msc) trên Windows, tìm dịch vụ `postgresql-x64-...`, chuột phải chọn **Stop**. Sau đó chạy lại `docker-compose up -d`.

2. **Lỗi `EPERM: operation not permitted` khi cài đặt trên Windows:**
   - *Khắc phục:* Đóng toàn bộ các cửa sổ terminal hoặc trình soạn thảo đang mở file trong dự án, sau đó mở lại PowerShell với quyền **Run as Administrator** và chạy lại `npm install`.

3. **Backend báo lỗi không kết nối được Database (`ECONNREFUSED`):**
   - *Khắc phục:* Kiểm tra xem Docker Desktop đã mở chưa và container `travelgo_postgres` có trạng thái Healthy chưa (`docker ps`).

