# HuGo Travel · TASK21.41 RELEASE CLOSURE

28/11/2026 ICT · `integration/web-backend` · HEAD `46839ea38453d42accb040e30e1973a171638b66`

**H03–H16 đạt trên sandbox với HTTP và PostgreSQL thật. Host loopback HTTPS hoạt động. Portable restore schema 22 đạt trên PostgreSQL 15/PostGIS 3.7.** Release public chưa được duyệt. [Ma trận P01–P20](HUGO_PRODUCTION_RELEASE_MATRIX.md) · [Source lock](evidence/release-closure-2141-20261128/final-source-lock.json)

## HotelStay · native và HTTP

Preflight xác minh source lock C-FINAL `f5551a9e246b8ef890fd13942897636aa7f8bd5021ecb4b4d7c2e4ed04fe14e8`. Exact integration container `ac892eafcb1099ca89de9914389f13db16cb6a88e0f82d35853a54a70d057bf0`, loopback `15457`, volume và sentinel cũ. 61 public tables, 22 checksum đúng, coordination 4 tables/4 functions và pin NULL. Exact approved fence `11b94d9d45eefc73d42c480c2ad63b963756c9e1a8b833162f02a8c7ec587c4e` và fixture đã dùng. Migration22 retained, checksum `915f18550888e8ea2e43bf6875318114027dc84437f5e70df58095cf87070d7f`. Exact stay 05–07/12/2026, hai night 05–06/12, cutoff 14:00 ICT 04/12 được kiểm bằng đồng hồ DB. [Preflight](evidence/release-closure-2141-20261128/packet1-preflight.json) · [Fence receipt](evidence/release-closure-2141-20261128/packet1-fence-delta.json)

| Operation | Quan hệ/hàm | Quyền cần và quyền áp dụng | Verdict |
|---|---|---|---|
| Fixture rate và inventory | `hotel_rate_plans`, `hotel_room_inventory` | Fixture INSERT rate, SELECT rate/inventory/profile, UPDATE đúng sellable/closed | Native đạt |
| Commercial revision và identity | `hotel_child_revision`, `hotel_profile_identity_guard`, `places` | App/fixture UPDATE `hotel_profiles.commercial_version`; fixture chỉ SELECT `places(id,category,business_id)` | Native đạt |
| Booking authorization | `hotel_lock.authorize`, account/role/catalog/member references | App USAGE/EXECUTE đúng function, owner NOLOGIN có scoped UPDATE để lấy FOR SHARE, app 0 protected UPDATE | Native đạt |
| Confirm và cancel | booking, stay/item, inventory, allocations | App INSERT exact artifacts, UPDATE booking status/timestamp, allocation release fields và inventory allocated counter; khóa dùng quyền theo cột | Native/HTTP đạt |
| Audit và attribution | `booking_status_history`, `audit_logs` và immutable snapshots | App INSERT audit/history trong fence, FK/deferred guards giữ transaction | Native/HTTP đạt |
| Cleanup và counter | exact approved artifacts và singleton | Boot operator, cleanup flag, reserved counter, revoke/drop hai roles và fence | Native đạt |

| Gates | Bằng chứng |
|---|---|
| H03–H07 | Confirm 201. DB giữ một booking, một item, hai room-night allocations, tồn giảm đúng một mỗi đêm, commercial version tăng, một audit và history. |
| H08–H09 | Snapshot bất biến qua cancel. Replay trả 200 cùng booking ID và fingerprint dữ liệu. |
| H10–H13 | Contender còn lại trả 409. Free cancel trước cutoff, tồn được trả một lần. Cancel và replay lặp giữ nguyên DB. |
| H14 | Customer khác trả 404, Partner ngoài business trả 403. |
| H15 | Lock timeout trả 409. Lỗi có kiểm soát sau allocation/audit rollback toàn bộ, 0 rows/stock delta. Deadlock cycle chủ động chưa chạy. |
| H16 | Web/Agent read parity với model OFF, tồn 1 → 0 → 1. |

HMAC sai actor/purpose/target/version và replay khác PID/XID bị từ chối; PUBLIC và `hotel_runtime` thiếu EXECUTE; direct UPDATE 5 protected references trả 42501. Hai thứ tự native concurrent token version giữ row lock đến rollback hoặc commit. Token version hiện hành giữ nguyên. Cumulative DML **45/100 acceptance, 17/40 cleanup**, gồm lịch sử 5/1. 60 business fingerprints khớp, ledger 22/22 và ngoài cohort nguyên. Chỉ version/timestamp dẫn xuất của `hotel_profiles` và `hotel_room_inventory` thay đổi. Role, sessions, fence, counters và fixtures tạm được dọn. Singleton pilot disabled, `hotel_runtime` chỉ đọc. Integration được dừng lại theo trạng thái trước lượt. [Native/HTTP receipt](evidence/release-closure-2141-20261128/packet1-result.json)

## Image hardening · P18

Node 22 Alpine pin, upgrade OS packages, bỏ npm/Yarn/Corepack trong API runtime. Nginx mainline Alpine pin và nâng packages. Frontend build theo lockfile. PostgreSQL 15/PostGIS 3.7 Alpine pin, cập nhật gói và thay runtime privilege-drop helper bằng `su-exec` với UID/GID postgres được kiểm. API chạy UID 1000 với sharp 0.35.5, 15/15 component tests và Nginx syntax PASS. [Component checks](evidence/release-closure-2141-20261128/candidate-component.json) · [Bốn image digests](evidence/release-closure-2141-20261128/candidate-image-pins.json) · [PostgreSQL entrypoint](https://github.com/docker-library/postgres/blob/master/docker-entrypoint.sh)

| Image | Trivy trước critical/high/moderate | Sau critical/high/moderate | Fixable high/critical sau |
|---|---:|---:|---:|
| API | 1 / 48 / 119 | 0 / 0 / 1 | 0 |
| Frontend | 0 / 6 / 7 | 0 / 0 / 0 | 0 |
| Gateway | 0 / 6 / 7 | 0 / 0 / 0 | 0 |
| PostgreSQL/PostGIS distribution | 7 / 97 / 95 | 0 / 0 / 0 | 0 |

Image PostgreSQL/PostGIS trung gian vẫn báo 1 critical và 25 high trong Go `gosu` ở layer cha, dù runtime đã dùng `su-exec`. Target `postgis-distribution` chỉ đóng gói filesystem sau khi hợp nhất các layer. Scan mới giữ mọi mức severity và xác nhận layer cũ vắng mặt. Digest cuối `sha256:db68562ebb0a36b054a31bd14dd888f20cba9d698224ee8a2b484419a74f455d`. Không dùng image trung gian để phát hành. Npm audit production riêng còn 2 moderate mỗi workspace, gồm uuid gián tiếp qua Sequelize và React Router. Candidate Trivy API vẫn có 1 moderate `CVE-2026-41907` của uuid. Cần theo dõi tư vấn và kiểm compatibility trước thay lockfile. [Trivy before/after và phân loại](evidence/release-closure-2141-20261128/image-cve-before-after.json) · [Scan distribution](evidence/release-closure-2141-20261128/postgis-distribution-trivy.json) · [npm audit](evidence/release-closure-2141-20261128/image-verification-details.json)

## Linux · targeted acceptance

Docker Desktop giờ tới gateway qua edge bridge không masquerade, chỉ publish `127.0.0.1:18083/18443`. App/data vẫn internal. Gateway không tham gia data network. Nginx thay forwarding headers bằng socket peer, bỏ `Forwarded`, giới hạn login 12/phút/IP burst 12 và API 20/giây/IP burst 80. Shared Agent quota 20/giờ tiếp tục PostgreSQL. [Docker port publishing](https://docs.docker.com/engine/network/port-publishing/) · [NGINX limit_req](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html)

L06 host TLS 200, HTTP 308 đúng authority, private health 404, unauthorized API 401. L01–L09 chạy trên patched images. Migrations01–22 đúng thứ tự và checksums. Capability staging nằm disabled, owner NOLOGIN và runtime không có EXECUTE. [Candidate runtime](evidence/release-closure-2141-20261128/packet2-result.json)

| Gate | Verdict | Bằng chứng thực tế |
|---|---|---|
| L06 | ACTUAL HTTP PASS | Host loopback TLS 200, redirect 308, health 404, auth boundary 401. Gateway recreate tiếp tục 200. |
| L10 | ACTUAL HTTP AND NATIVE PASS | Web quote 500.000 VND khớp Agent read adapter và source version qua HTTP listener loopback chỉ có trong harness. Route production vẫn trả 404 cho cùng synthetic listing. |
| L18 | LINUX RUNTIME PASS | Exact published ports chỉ loopback. Postgres/worker/backend/frontend không có IPv4 default route; edge bridge tắt masquerade. Evidence kiểm topology và route table. |
| L19 | LINUX RUNTIME PASS | API UID 1000, caps và local log rotation 10 MB × 3 đã đối chiếu trên container. Log saturation chưa chạy. |
| L20 | LINUX RUNTIME PASS | Aggregate log scan, CORS, generic 404, JSON và media limits đạt. Login 4 và general API 23 phản hồi 429 trong kiểm tra bounded. Giả mạo X-Forwarded-For không tạo hạn mức mới. Upload hợp lệ, MIME/signature sai, oversize, owner/cross-owner và unpublished media đều có receipt. |

20/20 gate đạt trong phạm vi synthetic qua các lượt bounded. Restore trên digest PostGIS distribution kiểm lại schema/ACL, quote backend và API smoke. Gateway, frontend và API digests không đổi giữa lượt full-stack và lượt compatibility restore distribution. [Tổng hợp gate và cleanup](evidence/release-closure-2141-20261128/packet2-final-verification.json) · [Web security](evidence/release-closure-2141-20261128/packet2-result-web-security.json) · [Positive quote](evidence/release-closure-2141-20261128/packet2-result-quote.json)

## P15 · compatibility restore

Trên digest distribution PostgreSQL 15/PostGIS 3.7, backup age **1,169 giây**, restore DB/media **4,627 giây**, API smoke sau **25,100 giây**. Checksum, 26 fingerprint tables, recovery ACL, schema22 ledger, Booking/review attribution, queue/shared quota và media đạt. Archive schema21 và archive schema22 của image trung gian giữ riêng. RPO 24h/RTO 4h tiếp tục là mục tiêu để đánh giá trên dữ liệu đại diện. [Restore trên distribution](evidence/release-closure-2141-20261128/packet2-result-distribution.json)

Cả hai project đã dọn, còn 0 container/network/volume của rehearsal. Đã đọc lại hai archive schema22 sau khi tách identity vào thư mục ACL riêng, xác minh ciphertext schema21 cũ và dọn 50 file secrets vận hành của các lượt. [Cleanup](evidence/release-closure-2141-20261128/packet2-cleanup-distribution.json)

## Browser, source và điều kiện trước GPU VPS staging

B04 historical FAIL và B05 historical NOT RUN được giữ. Browser vẫn BLOCKED_POLICY vì Edge CreateProcess từng bị automatic approval review từ chối. Manual checklist cho ngày được duyệt gồm login/refresh/logout, B04 giá/review, B05 thu hồi consent/hide và revision, confirm/cancel, ownership, Admin moderation, Planner, consent/reset. Ghi manual result riêng. Trong lượt này host TLS đã chạy với domain synthetic và chứng chỉ riêng. Stack đã dừng sau nghiệm thu. [Browser checklist](HUGO_PRODUCTION_RELEASE_MATRIX.md#checklist-browser)

Trước GPU VPS staging cần owner review remaining image findings, chốt registry pins, data/rights, host ingress/egress/TLS, monitoring, backup của dữ liệu đại diện, browser route và exact deployment scope. Khi được duyệt, dùng model pin, context 16.384 và concurrency 1 theo runbook, đo cold/warm, GPU offload, RAM/VRAM, grounded, fallback và cancellation. Qwen/model download và production Worker giữ OFF. `persisted:false`, một Agent backend và P12 PARTIAL. 21.42 chưa mở. [Runbook](HUGO_PRODUCTION_DEPLOYMENT_RUNBOOK.md)

DACN/main vẫn `e76d187e8b824ee0c688001150a36cd279074c9d` và tracked clean. Exact five file groups, PR draft, secret scan và encrypted checkpoint ở evidence. [PR inventory](evidence/release-closure-2141-20261128/source-consolidation.json) · [Backup receipt](evidence/release-closure-2141-20261128/backup-receipt.json)
