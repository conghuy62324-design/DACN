# HuGo Travel — Kết quả TASK21.41-B-FINAL

Ngày 28/11/2026 ICT. **Điều phối Agent qua PostgreSQL đã đạt trên hai backend thật. Vòng đời review và đồng bộ giá, khuyến mãi đã nghiệm thu tại isolated. HotelStay xác nhận và hủy còn BLOCKED_SCOPE. HuGo Travel chưa đủ điều kiện go-live.** [Ma trận P01–P20](HUGO_PRODUCTION_RELEASE_MATRIX.md) · [Runbook](HUGO_PRODUCTION_DEPLOYMENT_RUNBOOK.md)

## Nguồn và phạm vi duyệt

Worktree `DACN_WEB_REVIEW`, nhánh `integration/web-backend`, HEAD `46839ea38453d42accb040e30e1973a171638b66`. 17 tệp trong lock B và inventory trước sửa khớp; DACN/main `e76d187e8b824ee0c688001150a36cd279074c9d` giữ nguyên. Đã đối chiếu archive mã hóa B, thêm incremental checkpoint gồm bốn harness, mã hóa AES-GCM bằng khóa DPAPI hiện có với nonce mới và verify readback. Runtime source/migration giữ nguyên; các lần sửa harness có hash riêng trong manifest mỗi lượt. Lock cuối SHA-256 `2e6c1ae35c522acc1cd758eadeb9ba170b6643dfbeffc3031ff06f39bcf2338b`. [Lock B-FINAL](evidence/reliability-2141bf-20261128/final-source-lock.json) · [Biên nhận backup](evidence/reliability-2141bf-20261128/backup-incremental.json)

Hai gói chạy tuần tự trên container và DB `hugotravel_web_integration_test_20261125`, ID `ac892eafcb1099ca89de9914389f13db16cb6a88e0f82d35853a54a70d057bf0`, PostGIS image `sha256:d96be3a9c16d44e22d34d5c7b6e85be8875addf672672c6cd38171ea6055a94a`, volume `hugotravel_web_integration_test_20261125_data`, host `127.0.0.1:15457`, sentinel `hugotravel-isolated-test-database-v1`. Docker khởi động lại đúng container đã duyệt và đối chiếu full identity trước kết nối. Gói 1 xử lý schema điều phối và hai process, gói 2 có role và DML fence riêng cho exact cohort. [Manifest P12](evidence/reliability-2141bf-20261128/p12/manifest.json) · [Manifest nghiệp vụ](evidence/reliability-2141bf-20261128/business/manifest.json)

| Gói | Cửa sổ ICT trên manifest | DML dùng và cleanup |
|---|---|---|
| 1. P12, role tạm `agent_p12_runtime` | 07:01:49–09:01:49, mốc dành riêng cleanup 08:36:49. Hoàn tất 07:02:55. | 112/128 acceptance, 35/96 cleanup, **147/224**. |
| 2. Nghiệp vụ, role fixture/app/worker tách biệt | 07:07:23–09:07:23, mốc dành riêng cleanup 08:37:23. Ba lượt trong cùng cửa sổ hoàn tất 07:09:34. | 139/180 acceptance, 52/75 cleanup, **191/255**. Gói 2 không ghi coordination. |

## Gói 1 — Native PostgreSQL và hai backend

Applied migration 21 trong một transaction cùng migration ledger sau khi kiểm 20 checksums, thứ tự và fingerprint. SHA-256 **`fa7096c92def8844e8a262952a50d3194aa520133bbf659362a485fa9569e8cb`**. Bằng chứng runtime dùng `p12-api-a:5068` và `p12-api-b:5069` hai PID độc lập, cùng DB. DML counter tính cả row trigger của UPSERT và DML khởi tạo. [Receipt P12](evidence/reliability-2141bf-20261128/p12/result.json)

| Case | Verdict |
|---|---|
| Q01–Q06 quota, concurrent, restart, surfaces, isolation, accounting | **NATIVE PASS.** 26 lượt cùng principal giữa hai backend, 20 được nhận, 6 nhận 429, đúng 20 claims. DB xác nhận cửa sổ 3600s. Restart backend B với PID mới vẫn 429. Core, Legacy, Public và Maps từ chối cùng principal ở trần. Principal QA thứ hai vẫn được nhận theo ngân sách riêng. |
| Q07–Q09 global lease, abort/expiry/recovery, stale token | **NATIVE PASS** trên PostgreSQL, callback model mô phỏng. Slot toàn cục 1. Abort giữ slot đến khi work settle, late output bị loại. Kill process giữ lease, process còn lại bị từ chối cho tới khi hết 60s theo DB. Token cũ không thu hồi lease thay thế. |
| Q10 replay | **NATIVE PASS.** Replay khác backend trả 409, không tăng claims hoặc phát lại quote. |
| Q11–Q14 local session | **PASS trong phạm vi local.** Hai turn dùng cùng revision chỉ một tiếp tục. Cross-node và cross-owner bị 404. TTL 900s qua clock session điều khiển, revoke local khiến phiên vô hiệu. Reset, revoke trong lúc in-flight và stale revision đạt trong bộ G2 regression. |
| Q15–Q17 outage, ACL, actual HTTP | **NATIVE/HTTP PASS.** Tạm thu EXECUTE trên function consume của role thử khiến actual HTTP trả 503 fail-closed. App middleware xác thực principal thử Customer A qua session version từ DB. Model OFF 200, replay 409, session cũ 401. Runtime chỉ EXECUTE claim/consume/finish, không truy cập trực tiếp bốn bảng. PUBLIC 0 grants trên functions. DB chỉ lưu pin SHA-256, owner/request HMAC, expiry, bộ đếm và lease. |
| Q18 build/regression | Build PASS, 5 tệp regression chọn lọc, Node runner báo 15/15. Bốn lỗi baseline B vẫn được lưu tại báo cáo lịch sử. |

**P12 shared coordination PASS.** **P12 session persistence BLOCKED_PRIVACY** và **P12 cross-process consent/revision PARTIAL**, theo contract `persisted:false`. Gate tổng P12 vẫn PARTIAL. Khi cần đổi hợp đồng, đề xuất owner duyệt HMAC owner/session, revision, TTL 900s, consent epoch, địa điểm canonical, typed constraints và references allowlist. Triển khai CAS khi sửa, revoke xóa state, xác thực mỗi lượt và xóa hết hạn giới hạn batch. Raw chat, audio, token, profile và booking contact tiếp tục ngoài phạm vi. Trước khi duyệt, giữ một backend cho phiên Agent production. Native coordination test không cho phép mở nhiều production replicas hay bật Qwen.

## Gói 2 — HotelStay và đồng bộ dữ liệu

| Hạng mục | Kết quả |
|---|---|
| Search/quote/checkout prepare và RBAC | Actual HTTP search, quote và prepare 200. Reload fixture lịch sử cùng snapshot qua HTTP 200. Customer B nhận 404. Partner A đọc được qua service, Partner B nhận 403. |
| Giá và version | Partner A cập nhật exact SYNTHETIC rate `…081` thêm 10.000 VND/đêm qua HTTP. Quote hai đêm tăng đúng 20.000 VND, Website và Agent native khớp room/rate/tổng/sourceVersion mới. Commercial version tăng và audit có bản ghi. Partner B 403, If-Match cũ 412. Rate gốc NON_REFUNDABLE giữ nguyên. |
| Promo, expiry và hard budget | Exact promo `…091` giảm 50.000 VND trên đúng rate/phòng/ngày; ép promo lên rate gốc trả 409. Website và Agent native khớp sourceVersion cho quote có promo. Quote Agent còn hợp lệ tại mili giây cuối và bị loại ở đúng expiry. Shared search giữ trần 10.000 VND và trả 0 kết quả. |
| Availability | Fixture stock exact ngày 05–06/12 giảm về 1, Website và Agent native đọc cùng mức và sourceVersion cập nhật. Khôi phục stock về baseline trong cleanup. Parity sau confirm/cancel chưa chạy. |
| Confirm/cancel/idempotency/last-room | **BLOCKED_SCOPE**. PostgreSQL trả `42501` khi ứng dụng scoped thử `FOR SHARE` trên `users`, `user_roles`, `businesses`, `business_members`. PostgreSQL yêu cầu quyền UPDATE trên ít nhất một cột mỗi bảng được khóa. Các bảng này chỉ có SELECT theo scope. Kiểm blocker trước DML. Không dispatch confirm của hai contender, nên chưa nghiệm thu race, replay, release exactly once hoặc immutable snapshot của booking mới. |

Giới hạn ưu tiên kế tiếp là quyền row-lock tối thiểu có thiết kế và phê duyệt rõ ràng, đồng thời bảo toàn thứ tự lock, ownership, RBAC và audit. Các lần thử này giữ nguyên `FOR SHARE` trong business flow. [Kết quả giá và quyền](evidence/reliability-2141bf-20261128/business/result.json) · [Kết quả promo và stock](evidence/reliability-2141bf-20261128/business-followup/result.json) · [PostgreSQL SELECT locking privileges](https://www.postgresql.org/docs/15/sql-select.html)

### Verified review và Linux V5

Tạo exact lịch sử Booking `…120`, item `…121`, allocation `…122` từ pricing authority, dùng actual HTTP Admin chuyển CONFIRMED → COMPLETED và kiểm hai history/audit transitions. Review `…124` tạo qua Customer HTTP với trạng thái VERIFIED và exact room attribution. Vòng đời create, edit, hide, republish, consent revoke, delete và recreate `…125` phát transactional outbox. Sau mỗi commit, cùng reader Agent loại evidence cũ trước worker. Chạy **7 chu kỳ Linux thật** trên PostgreSQL isolated để xác nhận claim và persisted V5 revision; review eligible mới đi theo đúng `EXACT_VERIFIED_BOOKING_ITEM` và không reuse review ID đã xóa. Role worker dùng projection đã lọc. Browser B05 vẫn BLOCKED_POLICY. [Receipt review và worker](evidence/reliability-2141bf-20261128/business-review/result.json)

Gói 2 từng lỗi harness ở projection expiry và fixture SQL. Hai lỗi được sửa trong các lượt kế tiếp với cùng expiry và budget trừ số đã dùng. Lượt giữa đã commit cleanup dữ liệu trước lỗi biến cục bộ, sau đó operator thu hồi chính xác ba role, fence và counters rồi xác minh integrity trước khi mở lượt review. Các receipt lỗi ban đầu giữ nguyên. [Receipt thu hồi](evidence/reliability-2141bf-20261128/business-followup/revocation-recovery.json)

## Cleanup và gate còn mở

- P12 dừng hai backend, 0 row quota/request/lease thử, 0 role/phiên tạm. Còn **61 bảng public, 21 migration, 4 bảng và 4 functions trong schema riêng, 1 settings mặc định pin NULL**. Trước gói 2, các bảng public khớp ngoài một ledger migration được duyệt.
- Business normalized fingerprint khớp **61/61**, outside-cohort giữ nguyên, 0 record business mới, 0 temporary role/session/fence/counter. Khác biệt metadata trong cohort đã duyệt ở `hotel_profiles`, `hotel_room_inventory` và `places`. Commercial revision cuối 36. Version tồn cuối `4/3/3` cho 20/11, 05/12, 06/12. Sellable 5 cả ba ngày, allocated `1/0/0` khớp baseline. 17 review events có sẵn giữ nguyên. `hotel_runtime` READ ONLY, không có quyền DML.
- Tổng ledger Agent theo cap bảo thủ **10/20**, còn reserve 10 lúc chốt. Qwen vẫn OFF và 0 inference. Browser automation vẫn BLOCKED_POLICY, B04 FAIL lịch sử và B05 NOT RUN giữ nguyên. Owner có thể dùng checklist thủ công trên route được duyệt trong cửa sổ mới. Lượt này đã dừng các API thử và worker, không có preview URL.
- P04/P08 còn lock scope đã nêu. P07/P11 cần browser. P01/P02 cần Qwen GPU. P09 vẫn giới hạn fixture native từ A. P12 chưa có structured session bền và đồng bộ consent/revision giữa process. Các gate full Linux staging, backup/restore, data readiness, nguồn, VPS security, DNS/HTTPS và monitoring còn ở matrix. Dừng trước 21.41-C. [Integrity cuối](evidence/reliability-2141bf-20261128/final-integrity.json) · [Checklist browser và matrix](HUGO_PRODUCTION_RELEASE_MATRIX.md#checklist-browser)
