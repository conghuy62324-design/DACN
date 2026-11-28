# HuGo Travel · TASK21.41-C-FINAL · Nghiệm thu

28/11/2026 ICT · `integration/web-backend` · `46839ea38453d42accb040e30e1973a171638b66`.

**P15 synthetic restore đạt. HotelStay mutation chưa đạt. Linux full stack PARTIAL.** Hai packet đã chạy tuần tự. Packet 1 đã cleanup trước khi Packet 2 tạo tài nguyên. Candidate chưa đủ điều kiện phát hành. [Ma trận P01–P20](HUGO_PRODUCTION_RELEASE_MATRIX.md#task2141-c-final--28112026-ict)

## Packet 1 · Migration22 đạt, fixture FAIL

Owner duyệt native pilot đúng container `hugotravel_web_integration_test_20261125`, ID `ac892eafcb1099ca89de9914389f13db16cb6a88e0f82d35853a54a70d057bf0`, volume `hugotravel_web_integration_test_20261125_data`, `127.0.0.1:15457`, sentinel `hugotravel-isolated-test-database-v1`. Preflight xác minh HEAD, khóa C `751453fb330ad6ea7f8fcd98b50b86dfda9cbeec63b75bd04720ec7744ca6c02`, 61 fingerprint chuẩn hóa và 21 migration. Hai đêm 05–06/12 còn đúng baseline, cutoff 14:00 ICT 04/12 còn hiệu lực. [Preflight](evidence/linux-release-2141cf-20261128/packet1-preflight.json)

Migration22 và fence đã commit trong một transaction. Migration SHA-256 `915f18550888e8ea2e43bf6875318114027dc84437f5e70df58095cf87070d7f`, fence `24a579d3fcc64d24e08c38d37b4bb248cb1c03bdd81ff28f330a5eb4ca0c2287`, fixture `c74ef84c99fa6453f84d064fd8fcc0bc82747369d3d93516df59dcfe98a2bce6`. Fence đã giữ mutation trong cohort. Đã tính 5/100 thao tác acceptance, gồm metadata setup và thao tác fixture đã rollback, cùng 1/40 thao tác cleanup. Hai thời hạn 90/30 phút được thiết lập độc lập với Packet 2. [Migration receipt](evidence/linux-release-2141cf-20261128/packet1-migration22.json) · [Window](evidence/linux-release-2141cf-20261128/packet1-start.json)

**Root cause.** INSERT refundable rate kích hoạt `hotel_child_revision` để cập nhật commercial version của `hotel_profiles`. `hotel_profile_identity_guard` sau đó cần đọc `places(id,category,business_id)` bằng quyền caller. Role fixture được cấp SELECT trên rate, inventory và profile nên PostgreSQL trả `42501 permission denied for table places`. Toàn bộ fixture rollback. Đã chuẩn bị fence delta thêm đúng một column-level SELECT trên ba cột đó chỉ cho `hotel_2141c_fixture`. SHA-256 của bản đề xuất là `11b94d9d45eefc73d42c480c2ad63b963756c9e1a8b833162f02a8c7ec587c4e`. Xin owner duyệt delta trước khi thực thi. Giữ migration22 và fixture SQL hiện tại, hai booking keys, timebox và caps của packet khi mở lại theo phê duyệt. [Fence delta](../deploy/hotelstay-pilot-fence.cfinal-proposed.sql) · [Result](evidence/linux-release-2141cf-20261128/packet1-result.json)

| Gate | Verdict |
|---|---|
| H01–H02 | B-FINAL ACTUAL HTTP PASS giữ nguyên. |
| H03–H09 | BLOCKED sau fixture FAIL. Confirm, persistence, allocations, stock, audit/version, immutable snapshot và replay chưa chạy. |
| H10–H13 | BLOCKED. Hai contenders, free cancel, release một lần và repeat chưa chạy. |
| H14–H16 | BLOCKED. Cross-owner mutation, rollback sau allocation và parity sau confirm/cancel chưa chạy. |
| Row-lock security | ACL cleanup NATIVE PASS. Kiểm HMAC actor/purpose/target/version/PID/XID, direct protected UPDATE denial, lock lifetime và hai thứ tự concurrent revoke chưa chạy. |

Cleanup xác nhận 0 bookings/rate mới, 0 role/session/fence/function/counter tạm, singleton key/expiry NULL và `hotel_runtime` default read-only với 0 write grants và 0 EXECUTE capability. Retained đúng migration22, private owner, schema/extension, capability và singleton disabled. 60 bảng business khớp fingerprint chuẩn hóa B-FINAL và ledger được kiểm riêng 22/22. Không có delta metadata trên business tables trong lượt này. [Integrity](evidence/linux-release-2141cf-20261128/final-integrity.json)

## Packet 2 · Linux staging 01–21 và restore

Đúng project `hugotravel-2141c-staging` và `hugotravel-2141c-restore`, PostgreSQL/PostGIS riêng và synthetic IDs riêng. Staging `hugo_2141c_stage_test` dùng migrations 01–21. Restore `hugo_2141c_restore_test` tạo từ template0 với 0 public tables trước khi áp dump. Cả hai giữ role scopes và sentinels đã duyệt. Preflight thấy 12 CPU, 7,85 GB cấp cho Docker, 2.352 MiB host RAM rảnh, 164 GiB free disk và cổng không bị chiếm. Staging được quiesce và PostgreSQL dừng trước khi restore bắt đầu. [Manifest](evidence/linux-release-2141cf-20261128/packet2-preflight.json) · [Runtime receipt](evidence/linux-release-2141cf-20261128/packet2-result-resume-1795828782079.json)

Bootstrap lần đầu thiếu CREATE trên public schema của exact migrator. Đã cấp USAGE/CREATE chỉ cho migrator trong cluster staging và áp 21/21 với cùng image, DB và sentinel. Seed lần đầu rollback do source version fixture không đúng định dạng. Đã sửa synthetic version thành SHA-256 rồi seed thành công. Migrator trở về NOLOGIN khi bootstrap hoàn tất. [Bootstrap evidence](evidence/linux-release-2141cf-20261128/packet2-result-resume-1795828532149.json)

| Gate | Verdict | Bằng chứng |
|---|---|---|
| L01 | LINUX RUNTIME PASS | PostgreSQL healthy, PostGIS 3.4. |
| L02 | NATIVE PASS | 21 migration khớp checksum. Integration chạy 22 riêng. |
| L03 | NATIVE PASS | Runtime read-only, coordination EXECUTE-only, worker không đọc raw users/reviews và prune OFF. |
| L04 | LINUX RUNTIME PASS | Backend health từ container báo PostgreSQL connected. |
| L05 | ACTUAL HTTP PASS | SPA root và `/assistant` cùng app shell qua TLS nội bộ. |
| L06 | PARTIAL | Gateway nội bộ cho HTTPS 200, redirect 308 đúng authority, private health trả 404. Host `127.0.0.1:18443` từ chối kết nối. |
| L07 | LINUX RUNTIME PASS | Bundled JS 200, media volume khớp SHA-256, synthetic public media trả 404. |
| L08 | ACTUAL HTTP PASS | Login, signed bearer và Customer access đạt. Anonymous 401, Partner vào Customer Agent bị 403. |
| L09 | ACTUAL HTTP PASS | Agent model OFF, `persisted:false`. |
| L10 | PARTIAL | Website 404 và Agent `HOTEL_DEMO_NOT_PUBLIC` cho cùng fixture. Positive production quote cần dữ liệu được duyệt. |
| L11 | ACTUAL HTTP AND NATIVE PASS | Replay trả 409 qua restart và quota/request counters không tăng. |
| L12 | LINUX RUNTIME PASS | V5 xử lý verified review, heartbeat READY, no active lease sau khi hoàn tất. |
| L13 | LINUX RUNTIME PASS | API và worker graceful shutdown, exit 0. |
| L14 | LINUX RUNTIME PASS | Auth HTTP 200 sau restart backend. |
| L15 | LINUX RUNTIME PASS | PostgreSQL healthy trở lại, API reconnect, 2 quota uses và 2 claims còn nguyên. |
| L16 | LINUX RUNTIME PASS | Worker phục hồi một lease hết hạn được gieo có kiểm soát, attempt 2 và queue trở về completed. |
| L17 | LINUX RUNTIME PASS | Gateway và backend được tạo lại trên namespace staging, proxy tiếp tục 200. |
| L18 | PARTIAL | Storage/worker trên data network, gateway trên app/edge, chỉ gateway khai báo loopback ports. Host ingress và egress thực tế chưa đạt xác minh đầy đủ. |
| L19 | PARTIAL | Inspect runtime ghi API user `node`, memory caps và log local 10 MB × 3. One-shot migrator dùng default log driver nên harness dừng ở assertion. Mã harness đã sửa phạm vi check và khai báo rotation cho migrator tương lai. |
| L20 | PARTIAL | CORS allowed/denied, JSON >1MB trả 413, generic 404 và log API mẫu không lộ query. Aggregate log scan và upload content checks chưa chạy. |

Chưa có limiter cho login/API tổng quát ở gateway. Quota Agent 20/giờ và worker ACL vẫn được giữ. Với quyết định giữ tất cả staging networks internal, host preview không hoạt động trên Docker Desktop hiện tại. Endpoint hoạt động trên private Compose network. Runtime pilot và staging không đổi exposure. [Docker Compose networking](https://docs.docker.com/compose/how-tos/networking/#internal-networks) · [Cleanup và security](evidence/linux-release-2141cf-20261128/packet2-cleanup-and-security.json) · [Image CVE](evidence/linux-release-2141cf-20261128/image-cve-summary.json)

Trivy 0.76.2 quét bốn image local đã pin, sau khi tải database advisory công khai. Counts theo image, gồm package OS/tooling và thư viện, API 1 critical/48 high, frontend 0/6, gateway 0/6, PostgreSQL/PostGIS 7/97. Các entries có phiên bản sửa tương ứng là 14, 6, 6 và 104. P18 vẫn bị chặn ở bước review/fix theo image và revalidation. Kết quả npm production audit trước đó 0 high/critical và 2 moderate mỗi bên giữ riêng. [Trivy vulnerability scanner](https://trivy.dev/docs/dev/scanner/vulnerability/) · [CVE evidence](evidence/linux-release-2141cf-20261128/image-cve-summary.json)

## P15 · Portable backup/restore đạt trong rehearsal synthetic

Đã chạy `backup-portable.sh` với age 1.3.2 X25519. Archive 307.464 byte gồm PostgreSQL custom dump/schema/ledger, SQL khôi phục quyền, image/model/source metadata và media per-file checksum. Ciphertext SHA-256 `f615ee5bb569813273e17fd5da53a6dc3c19d76bd25daa542b2e8788d7950516`. `pg_restore --list`, ciphertext checksum và giải mã đều đạt. Identity portable giữ ở thư mục ACL riêng với archive. [Age release](https://github.com/FiloSottile/age/releases/tag/v1.3.2)

| Đo | Thời gian |
|---|---:|
| Quiesced export + dump + pack | 2,038 giây |
| Restore DB và media | 6,555 giây |
| Từ start restore project đến API smoke đạt | 27,194 giây |

25 fingerprint bảng khớp. Đã kiểm migration ledger, Booking/review attribution, worker queue/lease và shared quota/request state tại mốc backup, ACL và media SHA-256. Restore API health/auth trả 200. RPO 24 giờ và RTO 4 giờ là mục tiêu đề xuất. [Restore receipt](evidence/linux-release-2141cf-20261128/packet2-result-resume-1795828678743.json)

Đã xác minh bằng labels, names và IDs rằng hai project cùng containers/networks/volumes đã được dọn. Lượt teardown restore đã xóa tài nguyên trước khi assertion của harness phát hiện danh mục local còn cache. Hậu kiểm xác nhận 0 tài nguyên còn và harness đã sửa để đọc danh mục mới. Đã xóa 9 file secrets của rehearsal, giữ encrypted archive và recovery identity bằng ACL riêng. Existing integration container, original DACN/main và protected staging ở ngoài cleanup. [Cleanup receipt](evidence/linux-release-2141cf-20261128/packet2-cleanup-and-security.json)

## Release gates và source handoff

B04 historical FAIL, B05 historical NOT RUN, hiện cả hai BLOCKED_POLICY. Automatic approval review đã từ chối Edge CreateProcess. Checklist manual giữ Customer login/logout/refresh, B04 quote/review, B05 invalidation trong scope approved, confirm/cancel, Partner ownership, Admin moderation, Planner, consent/reset. Preview đã dọn, hiện không có URL. [Browser checklist](HUGO_PRODUCTION_RELEASE_MATRIX.md#checklist-browser)

P12 vẫn PARTIAL, một process phục vụ phiên Agent, `persisted:false`; shared PostgreSQL quota fail-closed. Qwen OFF, production Worker OFF. Gate còn lại gồm fence delta và HotelStay native, host ingress/release Linux positives, browser, production catalog, rate limit/upload/log/image gates, monitoring host, domain/TLS public và GPU staging. Phase21.42 chưa mở. [Roadmap](HUGO_AI_14_DAY_PRODUCTION_ROADMAP.md)

DACN/main `e76d187e8b824ee0c688001150a36cd279074c9d` tracked clean. File groups, secret scan và PR verification checklist nằm trong inventory C-FINAL. Bản ghi C cũ giữ checksum. Harness operator có trong checkpoint nội bộ cùng source delta và sanitized evidence. [Source groups C-FINAL](evidence/linux-release-2141cf-20261128/source-consolidation.json) · [Lock](evidence/linux-release-2141cf-20261128/final-source-lock.json) · [Backup receipt](evidence/linux-release-2141cf-20261128/backup-receipt.json)
