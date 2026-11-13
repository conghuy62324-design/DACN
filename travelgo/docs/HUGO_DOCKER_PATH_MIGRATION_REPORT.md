# Docker sau khi chuyển thư mục DACN

Ngày thực hiện: 28/10/2026. Phạm vi: cập nhật Compose/bind mount, giữ dữ liệu Docker hiện có; không thay đổi nghiệp vụ ứng dụng.

## 1. Hiện trạng đã kiểm chứng

- Compose project thực tế: `travelgo`, hai service `postgres`, `pgadmin`.
- Trước sửa, nhãn `com.docker.compose.project.config_files` trỏ tới `C:\Users\Danh\Downloads\DACN\travelgo\docker-compose.yml`; working directory cũng ở thư mục cũ.
- PostgreSQL đang chạy; pgAdmin đã dừng với lỗi OCI bind mount `servers.json` ở đường dẫn cũ, báo không khớp kiểu file/thư mục.
- File mới `C:\Users\Danh\Downloads\HCH\DACN\travelgo\docker\pgadmin\servers.json` là **file thường**, parse JSON thành công; không phải thư mục.

| Volume trước | Volume sau | Mount trong container | Kết quả |
| --- | --- | --- | --- |
| `travelgo_postgres_data` | `travelgo_postgres_data` | `/var/lib/postgresql/data` | Giữ nguyên |
| `travelgo_pgadmin_data` | `travelgo_pgadmin_data` | `/var/lib/pgadmin` | Giữ nguyên |

Mountpoint Docker tương ứng vẫn là `/var/lib/docker/volumes/travelgo_postgres_data/_data` và `/var/lib/docker/volumes/travelgo_pgadmin_data/_data`. Không tạo volume PostgreSQL thay thế.

## 2. Cấu hình và trạng thái đã sửa

`docker-compose.yml`:

- Đặt `name: travelgo`; khi recreate cũng truyền rõ `--project-name travelgo`.
- Khai báo hai volume là `external: true`, ghim đúng tên thực tế phía trên. Nếu volume không tồn tại, Compose phải báo lỗi thay vì tạo volume trống.
- Bind `servers.json` theo cú pháp dài, read-only, `create_host_path: false`; đường dẫn sau recreate trỏ đúng thư mục mới.
- Healthcheck dùng truy vấn SQL thực trên `POSTGRES_DB`/`POSTGRES_USER` của container, thay cho tên database mặc định sai.

`docker/pgadmin/servers.json`: đổi duy nhất `MaintenanceDB` từ `travelgo_db` sang `travelgo_dev`.

pgAdmin còn lưu kết nối cũ trong `/var/lib/pgadmin/pgadmin4.db`; JSON không tự thay thế bản đã lưu. Đã cập nhật có điều kiện đúng server ID 1, tên `TravelGo PostgreSQL`, host `postgres`, port 5432: chỉ đổi cột `maintenance_db` sang `travelgo_dev`. Transaction kiểm tra hash các cột còn lại không đổi; cập nhật đúng một dòng, đọc lại xác nhận đã lưu. Không thay tài khoản, mật khẩu hoặc cấu hình khác của kết nối.

| Nơi cấu hình | Trước | Sau |
| --- | --- | --- |
| Backend `.env`, `DB_NAME` | `travelgo_dev` | Giữ nguyên |
| Container `POSTGRES_DB` | `travelgo_dev` | Giữ nguyên |
| Healthcheck | `pg_isready ... -d travelgo_db` | `psql` dùng biến runtime, `SELECT 1` trên `travelgo_dev` |
| pgAdmin JSON MaintenanceDB | `travelgo_db` | `travelgo_dev` |
| pgAdmin kết nối đã lưu | `travelgo_db` | `travelgo_dev` |

Database thực tế: `postgres`, `travelgo_ai_m0_test`, `travelgo_dev`, `travelgo_phase35_test`. Không có `travelgo_db`; đã sửa các nơi trỏ nhầm, không tạo database mới. `POSTGRES_DB` là cấu hình khởi tạo, không được dùng để suy diễn rằng database đã tồn tại; danh sách trên được truy vấn trực tiếp từ cluster.

Giữ nguyên image đang có bằng `--pull never`:

- PostgreSQL: `postgis/postgis:15-3.4-alpine`, image ID `sha256:d96be3a9c16d44e22d34d5c7b6e85be8875addf672672c6cd38171ea6055a94a`.
- pgAdmin: `dpage/pgadmin4:latest`, image ID `sha256:c332c5f6dfba995d9ebc4af261d93506d6876085d712eaaa3defc8dd1a3f26de`.

## 3. Lệnh và kết quả thực tế

Làm việc tại `C:\Users\Danh\Downloads\HCH\DACN\travelgo`. Các lệnh inspect/config được parse trong script và chỉ xuất trường an toàn; không xuất toàn bộ environment hoặc mật khẩu.

| Lệnh/kiểm tra đã thực hiện | Kết quả |
| --- | --- |
| `git status --short`, hash file trước/sau | Thành công; 436 file baseline được đối chiếu, chỉ hai file cấu hình Docker thay đổi trong tác vụ trước khi thêm báo cáo này |
| `docker inspect travelgo_postgres travelgo_pgadmin` (lọc nhãn, image, state, mount) | Exit 0; đường dẫn nhãn sau recreate là thư mục mới, project vẫn `travelgo` |
| `docker volume inspect travelgo_postgres_data travelgo_pgadmin_data` (lọc trường an toàn) | Exit 0; xác định volume và mountpoint cũ trước recreate |
| `docker volume ls --format '{{.Name}}' --filter 'label=com.docker.compose.project=travelgo'` | Exit 0; vẫn đúng hai volume đã nêu |
| `Get-Item docker/pgadmin/servers.json`; `Get-Content ... -Raw \| ConvertFrom-Json` | Exit 0; file thường, JSON hợp lệ |
| `docker compose --project-name travelgo --project-directory "C:\Users\Danh\Downloads\HCH\DACN\travelgo" --file "C:\Users\Danh\Downloads\HCH\DACN\travelgo\docker-compose.yml" config --format json` (lọc trong Node) | Exit 0; project, external volumes, bind path, database đúng; giá trị mật khẩu hiện có được đối chiếu nội bộ, không đổi |
| Lệnh recreate bên dưới | Exit 0; PostgreSQL và pgAdmin được recreate từ Compose mới |
| `docker exec travelgo_postgres psql -X -U postgres -d travelgo_dev -tAc 'SELECT current_database(), 1'` | Exit 0; `travelgo_dev\|1` |
| Node `pg.Client`, đọc backend `.env`, kết nối TCP theo cấu hình backend và truy vấn `SELECT current_database(), current_user, 1` | Exit 0; database `travelgo_dev`, user `postgres`, kết quả 1 |
| Python PostgreSQL driver trong container pgAdmin, kết nối `postgres:5432` bằng credential backend truyền qua stdin, cùng truy vấn | Exit 0; database `travelgo_dev`, user `postgres`, kết quả 1 |
| `docker exec -i travelgo_pgadmin /venv/bin/python3 -` với script SQLite cập nhật có điều kiện và đọc lại | Exit 0; đúng một dòng, các cột khác không đổi, MaintenanceDB mới đã lưu |
| `Invoke-WebRequest http://127.0.0.1:5050/misc/ping -UseBasicParsing -TimeoutSec 10` | Exit 0; HTTP 200, body `PING` |
| `docker logs --since <StartedAt> <container>` lọc lỗi database cũ/bind mount/Traceback | Exit 0; không có dòng khớp các lỗi này kể từ lần khởi động hiện tại |
| Script fingerprint chỉ đọc trước/sau (mô tả bên dưới) | Exit 0 cả hai lần; dữ liệu đối chiếu giống hoàn toàn |

Lệnh recreate đã chạy:

```powershell
docker compose --project-name travelgo --project-directory "C:\Users\Danh\Downloads\HCH\DACN\travelgo" --file "C:\Users\Danh\Downloads\HCH\DACN\travelgo\docker-compose.yml" up -d --no-build --pull never --force-recreate postgres pgadmin
```

Một lần kiểm tra hash file dùng dòng lệnh quá dài bị Windows từ chối khởi chạy (lỗi 206); đã chia thành các nhóm nhỏ và đối chiếu đủ 436 file thành công. Không có thao tác dữ liệu nào từ lần kiểm tra lỗi đó.

## 4. Bằng chứng bảo toàn dữ liệu

Cluster system identifier trước/sau: `7695273561320079395`; danh sách database trước/sau giống nhau.

Script Node gọi `docker exec ... psql -X ... -qAt -v ON_ERROR_STOP=1` chỉ đọc: liệt kê từng bảng `public`, trừ `spatial_ref_sys`, đếm dòng và MD5 của JSON từng dòng được sắp xếp; sau đó SHA-256 inventory `{table: {rows, digest}}`. Vì vậy không chỉ so sánh số dòng. Không xuất nội dung bản ghi.

| Database | Số bảng | Tổng dòng | SHA-256 inventory trước = sau |
| --- | ---: | ---: | --- |
| `travelgo_dev` | 24 | 114 | `fafc37f2358540a823e007c5bd42be811015e1e065cb04836734a01b2cab7025` |
| `travelgo_ai_m0_test` | 24 | 1050 | `1143677b20a13ef709cc6a8eab4d4bc45489c79080439adb70b9b199cc4c242a` |
| `travelgo_phase35_test` | 19 | 179 | `d248894d6aa00a7f647f785cd63e3e4eaf534f1cf038f2354e3781d2217ca971` |

Không chạy `down -v`, prune, DROP, reset, seed hoặc migration. Không sửa `.env`, code ứng dụng, thay đổi Python/report đang có; không checkout/reset Git, push hoặc deploy. Báo cáo này được thêm sau khi kiểm tra hash baseline.

## 5. Trạng thái sử dụng và giới hạn kiểm tra

- PostgreSQL: running, **healthy** bằng SQL healthcheck; truy cập TCP backend thành công tại localhost:5432.
- pgAdmin: running; HTTP ping 200 tại `http://localhost:5050`; bind mount đúng file mới, kết nối đã lưu dùng `travelgo_dev`, kết nối SQL từ container thành công.
- Chưa thao tác đăng nhập/click trong trình duyệt pgAdmin; bằng chứng phía trên là HTTP, cấu hình đã lưu và kết nối SQL thật từ container. Có thể mở giao diện bằng tài khoản pgAdmin hiện có; không cần tạo lại database hoặc volume.
