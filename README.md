# HƯỚNG DẪN CÀI ĐẶT & CHẠY DỰ ÁN TRAVELGO (HUGO TRAVEL)

> **Đồ Án Chuyên Ngành (DACN) – HuGo Travel**  
> Nền tảng Gợi ý, Lập kế hoạch Hành trình Du lịch Thông minh & Trợ lý AI (HuGo Assistant)

---

## 🛠️ I. CÁC MÔI TRƯỜNG & CÔNG NGHỆ BẮT BUỘC CẦN CÀI ĐẶT

Trước khi chạy dự án, các thành viên trong nhóm cần đảm bảo máy tính đã cài đặt đầy đủ 4 công cụ sau:

1. **Git:**  
   - Tải và cài đặt tại: [https://git-scm.com/](https://git-scm.com/)  
   - Kiểm tra trong terminal: `git --version`

2. **Node.js (LTS v18.x, v20.x hoặc v22.x):**  
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

4. **Ollama (BẮT BUỘC để chạy & test Chatbot Trợ lý HuGo AI):**  
   - Dùng để chạy mô hình ngôn ngữ lớn (Local LLM) hoàn toàn cục bộ trên máy tính, bảo mật thông tin và không tốn chi phí API.  
   - **Tải và cài đặt:** [https://ollama.com/download](https://ollama.com/download) (hoặc qua lệnh `winget install Ollama.Ollama`).  
   - Sau khi cài, mở Terminal kiểm tra: `ollama --version`  
   - **Tải Model AI về máy:**  
     Dự án tối ưu cho họ mô hình Qwen (hỗ trợ tiếng Việt và sinh JSON cấu trúc rất tốt). Chạy một trong các lệnh sau trong terminal:  
     ```bash
     # Khuyên dùng cho máy thông thường (RAM >= 8GB, GPU hoặc CPU):
     ollama pull qwen2.5:3b

     # Hoặc mô hình chất lượng cao hơn (nếu có GPU hoặc RAM >= 16GB):
     ollama pull qwen2.5:7b
     ```
     *(Ghi chú: Nếu nhóm có file model `qwen3:4b-instruct-2507-q4_K_M`, bạn có thể nạp trực tiếp qua lệnh `ollama create`).*  
   - Kiểm tra model đã có trong máy: `ollama list`  
   - Đảm bảo service Ollama đang chạy nền tại cổng `http://127.0.0.1:11434`.

---

## 🚀 II. HƯỚNG DẪN CÁC BƯỚC KHỞI CHẠY DỰ ÁN (A - Z)

### Cách 1: Chạy nhanh bằng script 1-Click (Khuyên dùng trên Windows)
Chỉ cần mở PowerShell tại thư mục gốc dự án và chạy:
```powershell
.\start_project.ps1
```
*Script sẽ tự động bật Docker database, kiểm tra Ollama, cài đặt thư viện backend/frontend, migrate cơ sở dữ liệu và mở sẵn 2 cửa sổ server.*

---

### Cách 2: Chạy thủ công từng bước

#### Bước 1: Clone mã nguồn về máy
```bash
git clone https://github.com/conghuy62324-design/DACN.git
cd DACN
```

#### Bước 2: Khởi động Cơ sở dữ liệu (PostgreSQL + PostGIS qua Docker)
Di chuyển vào thư mục `travelgo` và khởi chạy Docker Compose:
```powershell
cd travelgo
docker-compose up -d
```
> Khi hoàn tất, container PostgreSQL sẽ lắng nghe ở cổng `5432` và pgAdmin ở cổng `5050`.

#### Bước 3: Đảm bảo Ollama đang chạy
Mở một terminal kiểm tra:
```bash
ollama serve
```
*(Nếu Ollama đã chạy sẵn dưới thanh Taskbar của Windows thì không cần mở lại).*

#### Bước 4: Cài đặt & Khởi động Backend (Express API)
Mở một cửa sổ Terminal/PowerShell mới:
```powershell
cd DACN/travelgo/backend

# 1. Tạo file cấu hình môi trường .env từ mẫu .env.example
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

#### Bước 5: Cài đặt & Khởi động Frontend (React + Vite)
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
| **Trợ lý HuGo AI (Assistant)** | [http://localhost:3000/assistant](http://localhost:3000/assistant) | Đăng nhập tài khoản Khách hàng để chat với AI |
| **Lập kế hoạch Tour (Planner)** | [http://localhost:3000/tour-planner](http://localhost:3000/tour-planner) | Thuật toán Heuristic & phân cụm địa lý GIS |
| **Backend REST API** | [http://localhost:5000](http://localhost:5000) | Express API, Sequelize ORM |
| **API Health Check** | [http://localhost:5000/api/health](http://localhost:5000/api/health) | Kiểm tra kết nối DB & engine thuật toán |
| **Dịch vụ Ollama Local LLM** | [http://127.0.0.1:11434](http://127.0.0.1:11434) | Quản lý mô hình Qwen phục vụ Chatbot AI |
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

## 🤖 V. HƯỚNG DẪN TEST CHI TIẾT CHATBOT TRỢ LÝ AI (HUGO ASSISTANT)

1. Mở trình duyệt vào **[http://localhost:3000/login](http://localhost:3000/login)**.
2. Đăng nhập với tài khoản:
   - **Email:** `customer.a@hugotravel.vn`
   - **Mật khẩu:** `travelgo2026seed`
3. Nhấp vào mục **Trợ lý AI** trên thanh Menu (hoặc vào thẳng `http://localhost:3000/assistant`).
4. **Các tính năng Chatbot AI:**
   - **Hỏi đáp thông tin điểm đến:** *"Gợi ý cho tôi các địa điểm du lịch đẹp ở Đà Nẵng"* hoặc *"Tìm các khách sạn gần biển ở Đà Nẵng ngân sách 800k/đêm"*.
   - **Lên kế hoạch & dự trù chi phí:** *"Lên lịch trình 3 ngày 2 đêm đi Hội An - Đà Nẵng cho 2 người lớn, ngân sách 6 triệu"*.
   - Chatbot sẽ gọi mô hình Ollama cục bộ, phân tích thực thể không gian địa lý GIS, bóc tách ngân sách và tự động hiển thị thẻ kết quả (Result Cards) cho phép bạn lưu chuyến đi hoặc tùy biến trực tiếp vào Tour Planner.

---

## ⚙️ VI. CÁC LỖI THƯỜNG GẶP (TROUBLESHOOTING)

1. **Lỗi `AGENT_PROVIDER_NOT_CONFIGURED` hoặc `Ollama local chưa sẵn sàng`:**
   - *Nguyên nhân:* Ứng dụng Ollama chưa được bật hoặc chưa kéo model về máy.
   - *Khắc phục:* Mở terminal chạy `ollama serve` và kiểm tra `ollama list` xem đã có model Qwen chưa (`ollama pull qwen2.5:3b`).

2. **Lỗi Docker không khởi động hoặc cổng 5432 bị chiếm dụng:**
   - *Nguyên nhân:* Máy tính có cài sẵn PostgreSQL local đang chạy nền chiếm cổng 5432.
   - *Khắc phục:* Mở `Services` (services.msc) trên Windows, tìm dịch vụ `postgresql-x64-...`, chuột phải chọn **Stop**. Sau đó chạy lại `docker-compose up -d`.

3. **Lỗi `EPERM: operation not permitted` khi cài đặt trên Windows:**
   - *Khắc phục:* Đóng toàn bộ các cửa sổ terminal hoặc trình soạn thảo đang mở file trong dự án, sau đó mở lại PowerShell với quyền **Run as Administrator** và chạy lại `npm install`.

4. **Backend báo lỗi không kết nối được Database (`ECONNREFUSED`):**
   - *Khắc phục:* Kiểm tra xem Docker Desktop đã mở chưa và container `travelgo_postgres` có trạng thái Healthy chưa (`docker ps`).
