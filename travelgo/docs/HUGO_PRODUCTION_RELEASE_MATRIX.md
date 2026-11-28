# HuGo Travel — Production release matrix

Checkpoint TASK21.41 ngày 27/11/2026 ICT. **Chưa đủ điều kiện go-live.** `R2141` trong từng dòng là working tree ứng viên trên `integration/web-backend` tại HEAD `46839ea38453d42accb040e30e1973a171638b66` và source-lock SHA-256 `2aee844604d8881f4bc09928f66689214aeb00502e6aa54e6620beee78c721c2`. Bằng chứng D/B/C thuộc revision ghi trong từng artifact lịch sử. PASS chỉ áp dụng với phạm vi thực nêu ở từng dòng. [Khóa nguồn R2141](evidence/release-2141-20261127/final-source-lock.json)

**Checkpoint 21.41-A.** Các hàng dùng `R2141A` có HEAD như trên với source-lock SHA-256 `59c09692dbde8c11744eeb121e0e26b8f54258de8fcd6cca8b4e4f0624782dec`. Các hàng mang `R2141` tiếp tục dùng bằng chứng 21.41. P01 giữ BLOCKED_RESOURCE từ lần đo trước, không đo lại trong A. [Khóa nguồn A](evidence/business-2141a-20261127/final-source-lock.json)

**Checkpoint 21.41-B.** `R2141B` chỉ HEAD trên với source lock SHA-256 `c1402877712f9788a43147194eb31e799e678e54ee86c01c21b3e471d165606a`. B không áp migration, không thử ghi và không benchmark Qwen. Các dòng R2141A/R2141 giữ bằng chứng các revision đó. [Khóa nguồn B](evidence/reliability-2141b-20261127/final-source-lock.json)

**Checkpoint 21.41-B-FINAL.** `R2141BF` là HEAD trên với source lock SHA-256 `2e6c1ae35c522acc1cd758eadeb9ba170b6643dfbeffc3031ff06f39bcf2338b`. Production runtime code B giữ nguyên. Migration 21 chỉ áp vào DB isolated đã duyệt. [Khóa B-FINAL](evidence/reliability-2141bf-20261128/final-source-lock.json)

| Gate | Trạng thái | Revision | Bằng chứng | Việc còn lại | Ảnh hưởng phát hành |
|---|---|---|---|---|---|
| P01 Qwen actual GPU inference | BLOCKED | R2141 | Đúng tag/digest, RAM khả dụng 5.330 rồi 3.758 MiB, ngưỡng 6.144, 0/24 inference. [Preflight][verify] | Linux GPU đủ ngưỡng, offload thật, benchmark cold/warm/E2E. | Model giữ OFF. |
| P02 Grounded reasoning | PARTIAL | R2141 | HTTP model OFF trả dữ liệu giá, review native. Phase D native 7/7 với provider mô phỏng. [HTTP][http] · [Phase D][d] | Chấm 24-call cap theo bộ tiếng Việt niêm phong, so model OFF, kiểm trích dẫn và từ chối các claim ngoài dữ liệu. | Chưa bật grounded reasoning của Qwen. |
| P03 Model OFF fallback | PASS | R2141A | HTTP thật model OFF trả quote/review và làm rõ thành phần khách. Agent native gọi model 0. [HTTP A][a1] | Fault injection vào runtime đã bật model khi P01 chạy. | Model OFF đạt trong phạm vi đọc. |
| P04 Hotel, room, rate, promotion | PARTIAL | R2141BF | Partner update, exact promo 50.000 VND, quote expiry, budget và stock fixture sync đã chạy thật. [Business BF][bf] | Parity qua confirm/cancel thực, khóa quyền scope trước chạy. | Ghi nghiệp vụ checkout chưa nghiệm thu. |
| P05 Review Worker native reliability | PASS | R2141BF | V5 native claim/retry/prune từ A và verified review lifecycle 7 chu kỳ Linux PostgreSQL thật trên cohort. [A1][a1] · [A2][a2] · [Reviews BF][bfr] | Soak, alert và backlog theo staging/production ở P14/P20. | Đạt phạm vi native isolated; worker production vẫn OFF. |
| P06 Review Worker Linux runtime | PASS | R2141A | Process Linux thật dùng PostgreSQL cô lập, claim/crash/restart, heartbeat, SIGINT lúc poll và SIGTERM lúc đang xử lý job thật. [Worker lượt 1][a1] · [Worker lượt 2][a2] | Rehearsal cùng full Linux staging, host monitoring và tải production ở P14/P20. | Đạt vòng đời Linux bounded trên target cô lập. |
| P07 Review invalidation browser | BLOCKED | R2141BF | Invalidation trước worker và V5 sau worker đạt native. B04 browser historical FAIL, B05 historical NOT RUN. [Reviews BF][bfr] | Route browser được duyệt hoặc owner chạy manual theo checklist trong cửa sổ mới. | Browser policy gate vẫn mở. |
| P08 HotelStay E2E | PARTIAL | R2141BF | Search/quote/prepare, lịch sử COMPLETED/reload/RBAC đạt. Checkout mutation khu trú trả blocker ACL trước ghi. [Business BF][bf] | Scope row lock cho users/user_roles/businesses/business_members và actual confirm/cancel/idempotency/last room. | Giữ write checkout OFF. |
| P09 Multi-service Planner native | PARTIAL | R2141A | Agent/Planner thật với hai Place PostgreSQL scoped, 3 ngày, giờ, quote, budget estimate/over và chi phí di chuyển UNKNOWN. [Planner A][planA] | Có dữ liệu thật có quyền và routing xác minh, acceptance web đầy đủ. | Ca dương native đạt với fixture, full Planner E2E vẫn mở. |
| P10 HTTP Agent | PASS | R2141BF | Actual PostgreSQL auth model OFF, replay, stale token và 503 qua hai process. HTTP A 12/12 giữ nguyên. [P12 BF][bfp] | Login/refresh và browser P11/P13, model ON P01/P02. | Đạt HTTP với scope và privacy hiện tại. |
| P11 Essential website E2E | BLOCKED | R2141 | SPA route 200 trong Linux, browser automation chưa có route được phép. [Runtime][verify] | Customer/Partner/Admin chạy browser checklist với role và ownership, ghi evidence manual/automated. | Chưa phát hành luồng chính của website. |
| P12 Multi-process quota/session | PARTIAL | R2141BF | Shared PostgreSQL coordination PASS, hai backend, cap, restart, lease/replay, ACL, local sessions. [P12 BF][bfp] | Session persistence BLOCKED_PRIVACY. Consent/revision toàn cụm PARTIAL cần contract duyệt. | Chưa mở production replicas cho Agent session. |
| P13 Privacy/RBAC/consent | PARTIAL | R2141BF | DB auth và local session, Partner/Customer isolation, Admin moderation và review consent revoke actual. [Business BF][bf] | Browser login/refresh/logout, structured-state privacy và cross-process session policy. | Chưa chốt privacy toàn hành trình. |
| P14 Docker Linux runtime | PARTIAL | R2141 | Hai image linux/amd64, Compose config, nginx -t, SPA deep link 200. [Runtime][verify] | Full staging stack DB/gateway, resolver, health, GPU, private network và namespace restart/recreate. | Package sẵn để nghiệm thu, runtime production chưa đạt. |
| P15 Backup/restore | NOT RUN | R2141 | Runbook logical + media có checksum và restore sang target mới. [Runbook][run] | Xin target cô lập, chạy rehearsal, đo RPO/RTO và kiểm dữ liệu/role/media sau restore. | Chặn go-live với dữ liệu thật. |
| P16 Production data readiness | BLOCKED | R2141 | Chỉ audit isolated. Catalog đa dịch vụ đủ điều kiện bằng 0. [Integrity][http] | Chủ dữ liệu duyệt nguồn thực, quyền sử dụng media, structured address/giờ/giá/tồn và review consent. | Chặn hiển thị/booking danh mục chưa duyệt. |
| P17 Source consolidation | PARTIAL | R2141BF | Source lock B khớp, backup AES-GCM B và incremental B-FINAL verified, DACN/main giữ nguyên. [Business BF][bf] | Review nhóm, PR/merge được duyệt, verify DACN chính. | Chưa hợp nhất source phát hành. |
| P18 VPS security | PARTIAL | R2141 | Compose thiết kế private, runtime API non-root, npm audit 0 high/critical, còn moderate. [Runtime][verify] | Chốt image registry digests, host/firewall, secrets, scan image/OS và xử lý moderate theo ảnh hưởng. | Chặn mở dịch vụ công cộng. |
| P19 Domain/HTTPS | NOT RUN | R2141 | Chỉ kiểm syntax TLS với cert tự ký ở container không mạng. [Runtime][verify] | Tên miền được phép, DNS, cert public và renewal, HTTPS client test, redirect, kiểm cổng ngoài. | Chưa có public HTTPS và cutover. |
| P20 Monitoring/recovery | PARTIAL | R2141A | Worker Linux actual heartbeat, backoff/restart và shutdown; API DB health có evidence. [A1][a1] · [A2][a2] | Gắn alert, rehearse DB/Ollama/proxy, restore, rollback và xác nhận trực vận hành. | Chặn trực vận hành production. |

## Checklist browser

| Case | Vai trò và thao tác | Điều kiện ghi PASS |
|---|---|---|
| B04 giá và review có căn cứ | Customer A login thật, chọn kỳ ở, hỏi khách sạn và xem link quote/room/review. | Room/rate, tổng đêm và ưu đãi hiện hành đúng Website, review đúng scope và còn đủ điều kiện. Nhập thiếu tuổi/số trẻ phải được làm rõ trước báo giá. |
| B05 mất hiệu lực tức thời | Customer A sửa hoặc thu hồi consent của review có lưu trú xác thực. Admin hide/unpublish qua luồng được phép. Dùng case độc lập cho mỗi mutation và kiểm trước/sau worker. | Câu trả lời native và lượt mới loại evidence revision cũ ngay sau commit. Review bị xóa hoặc ẩn bị loại. Review công bố lại chỉ dùng revision mới đúng room. |
| HotelStay | Customer A quote → xác nhận → load chi tiết → replay cùng key → hủy. Customer B và Partner B thử xem/sửa ngoài quyền bằng route chuẩn. | Một booking, snapshot và giá giữ nguyên, tranh phòng cuối không oversell, hủy trả tồn đúng một lần. Partner A chỉ thấy tài nguyên thuộc mình. |
| Catalog và Planner | Partner A cập nhật một mục thuộc quyền; Admin duyệt. Customer A lập chuyến có khách sạn, restaurant, attraction. | Bản chưa duyệt không xuất hiện, bản duyệt có địa chỉ, giờ và loại giá đúng. Planner dùng ràng buộc giờ/ngân sách/tuyến. |
| Account và privacy | Customer A login/refresh/logout, thu hồi consent/reset, đăng nhập khác vai trò. | Session version cũ vô hiệu, không lộ history hoặc raw review giữa principal và không tiếp tục dùng dữ liệu đã thu hồi. |

B04 đã đạt quote/review trên HTTP 21.41-A. B05 verified lifecycle đã đạt native trong B-FINAL. Browser cần route hoặc lịch manual được duyệt. Hiện chưa có URL preview đang chạy. Ghi rõ người chạy, revision, target, giờ ICT, manual hay automated, role, ID đã lược PII và quyết định từng case. Giữ B04 FAIL/B05 NOT RUN lịch sử. Mỗi lần chạy mới cần bản ghi riêng. Cửa sổ ghi và browser route là hai điều kiện riêng cho case cần sửa dữ liệu. [Gói phê duyệt][report]

[verify]: evidence/release-2141-20261127/verification.json
[http]: evidence/release-2141-20261127/http-final-native-result.json
[baseline]: evidence/release-2141-20261127/baseline.json
[report]: HUGO_21_41_PRODUCTION_INTEGRATION_REPORT.md
[run]: HUGO_PRODUCTION_DEPLOYMENT_RUNBOOK.md
[d]: HUGO_AI_21_40_D_QWEN_LIVE_INTEGRATION_REPORT.md
[b]: HUGO_AI_21_40_B_REVIEW_INTELLIGENCE_WORKER_REPORT.md

[ar]: HUGO_21_41_A_BUSINESS_ACCEPTANCE_REPORT.md
[a1]: evidence/business-2141a-20261127/acceptance-01/result.json
[a2]: evidence/business-2141a-20261127/worker-followup/result.json
[planA]: evidence/business-2141a-20261127/acceptance-01/planner-observation.json
[invA]: evidence/business-2141a-20261127/inventory-after.json

[br]: HUGO_21_41_B_AI_RELIABILITY_REPORT.md
[bv]: evidence/reliability-2141b-20261127/verification.json
[bo]: evidence/reliability-2141b-20261127/business-readonly.json
[bb]: evidence/reliability-2141b-20261127/backup-receipt.json

[bf]: HUGO_21_41_B_FINAL_ACCEPTANCE_REPORT.md
[bfp]: evidence/reliability-2141bf-20261128/p12/result.json
[bfr]: evidence/reliability-2141bf-20261128/business-review/result.json


## TASK21.41-C · 28/11/2026 ICT

R2141C dùng HEAD review và hashes trong source lock mới. Giữ lịch sử các phase trước phía trên. [Report C](HUGO_21_41_C_LINUX_RELEASE_READINESS_REPORT.md) · [Lock C](evidence/linux-release-2141c-20261128/final-source-lock.json)

| Gate | Verdict hiện hành | Bằng chứng hoặc điều kiện còn lại |
|---|---|---|
| P01 Qwen GPU | BLOCKED | R2141 resource evidence giữ nguyên. Qwen OFF trong C. |
| P02 Grounded reasoning | PARTIAL | Cần actual Qwen benchmark, evidence mô phỏng D giữ nguyên. |
| P03 Model OFF | ACTUAL HTTP PASS | R2141A giữ nguyên, L09 cần Packet 2. |
| P04 Catalog commercial | PARTIAL | BF giữ rate/promo/stock actual; cần parity qua confirm/cancel. |
| P05 Worker native | NATIVE PASS | BF V5 scope, giữ queue/revision/prune policy. |
| P06 Worker Linux | LINUX RUNTIME PASS | R2141A bounded standalone Worker. L12/L16 Compose NOT RUN. |
| P07 Review browser | BLOCKED | B04 historical FAIL, B05 historical NOT RUN, hiện BLOCKED_POLICY. |
| P08 HotelStay | PARTIAL | H01/H02 ACTUAL HTTP PASS BF. Capability OFFLINE PASS C. H03–H16 và browser pending. |
| P09 Planner | PARTIAL | A synthetic evidence giữ nguyên, production data và browser pending. |
| P10 Agent HTTP | ACTUAL HTTP PASS | R2141BF model OFF auth/coordination. C có standalone generic API redaction. |
| P11 Website E2E | BLOCKED | C standalone SPA component HTTP PASS. Browser còn chờ route. |
| P12 Session/quota | PARTIAL | Shared coordination NATIVE PASS BF. `persisted:false`, một backend, privacy/cross-process gate. |
| P13 Privacy/RBAC | PARTIAL | BF scope actual đạt. Browser và native pilot denial còn mở. |
| P14 Linux full stack | PARTIAL | Hai images và component/Compose PASS C. L01–L20 NOT RUN. |
| P15 Backup/restore | NOT RUN | Portable tooling syntax PASS. Restore/readback/timing cần Packet 2. |
| P16 Production data | BLOCKED | 0 approved production listings. Nguồn, rights, consent chưa duyệt. |
| P17 Source consolidation | PARTIAL | Incremental backup và exact groups C. Review/merge còn mở. |
| P18 VPS security | PARTIAL | Role templates, private Compose và npm audit. Actual OS/image/host gate. |
| P19 Domain/HTTPS | NOT RUN | Nginx self-signed syntax PASS. Public DNS/TLS/renewal chưa chạy. |
| P20 Monitoring/recovery | PARTIAL | Worker heartbeat Linux prior pass. Cần integrated restart/recovery/restore/alerts. |


## TASK21.41-C-FINAL · 28/11/2026 ICT

R2141CF chỉ phạm vi actual trong hai packet riêng. History phía trên giữ nguyên. [Báo cáo](HUGO_21_41_C_FINAL_ACCEPTANCE_REPORT.md)

| Gate | Verdict hiện hành | Bằng chứng hoặc blocker |
|---|---|---|
| P01 Qwen actual GPU | BLOCKED | Qwen OFF, chưa benchmark GPU staging. |
| P02 Grounded reasoning | PARTIAL | Giữ evidence mô phỏng, cần Qwen thực và so model OFF. |
| P03 Model OFF | ACTUAL HTTP PASS | L09 trên private Linux staging và evidence A/BF. |
| P04 Catalog commercial | PARTIAL | BF giá/promo/stock đạt. L10 guard synthetic đạt, positive staging quote và parity sau Booking còn mở. |
| P05 Worker native | NATIVE PASS | Giữ BF scope, L12/L16 xác nhận synthetic job trên staging. |
| P06 Worker Linux | LINUX RUNTIME PASS | V5 heartbeat, shutdown và restart/lease recovery bounded trên staging. |
| P07 Review invalidation browser | BLOCKED | B04 historical FAIL, B05 historical NOT RUN, policy chưa mở. |
| P08 HotelStay E2E | PARTIAL | H01/H02 BF đạt. Migration22 NATIVE PASS. Fixture FAIL 42501, H03–H16 BLOCKED. |
| P09 Planner | PARTIAL | Prior native synthetic, browser và approved production data còn mở. |
| P10 Agent HTTP | ACTUAL HTTP PASS | L08/L09/L11 và evidence BF. |
| P11 Essential website E2E | BLOCKED | SPA/API internal đạt, host preview/browser blocked. |
| P12 Quota/session | PARTIAL | Shared quota/replay restart NATIVE/HTTP PASS. `persisted:false`, một backend, consent cross-process còn mở. |
| P13 Privacy/RBAC | PARTIAL | Auth/RBAC staging đạt, native pilot negatives và browser/privacy còn mở. |
| P14 Linux full stack | PARTIAL | 15/20 gates đạt trong scope, 5 PARTIAL. Host ingress/positive catalog/log/upload còn mở. |
| P15 Backup/restore | LINUX RUNTIME PASS | Synthetic portable restore schema21, verified ACL/data/media/API. Mục tiêu production RPO/RTO còn đánh giá. |
| P16 Production data | BLOCKED | 0 approved production catalog listings từ nguồn owner. |
| P17 Source consolidation | PARTIAL | Groups, diff scan và encrypted delta đã kiểm. Merge approval chưa có. |
| P18 VPS security | PARTIAL | Auth/boundaries đạt theo evidence. Image CVEs, login/general rate caps, upload và host policy cần xử lý. |
| P19 Domain/HTTPS | NOT RUN | Self-signed TLS riêng đã chạy. Public DNS/HTTPS renewal chưa chạy. |
| P20 Monitoring/recovery | PARTIAL | Restart/restore/recovery nội bộ đã đo, production observability/alerts và phục hồi đại diện còn mở. |


## TASK21.41-RELEASE-CLOSURE · 28/11/2026 ICT

R2141RC kế thừa kết quả đã đạt và thêm bounded actual synthetic. [Báo cáo](HUGO_21_41_RELEASE_CLOSURE_REPORT.md)

| Gate | Verdict cuối | Bằng chứng hoặc blocker |
|---|---|---|
| P01 Qwen GPU | BLOCKED | Qwen OFF, cần GPU staging được duyệt. |
| P02 Grounding | PARTIAL | Giữ prior native mô phỏng. Cần so Qwen thật với model OFF. |
| P03 Model OFF | ACTUAL HTTP PASS | L09 qua host loopback. |
| P04 Catalog price/availability | ACTUAL HTTP AND NATIVE PASS | Synthetic quote 500.000 VND, H16 availability và BF promo/rate. Production data ở P16. |
| P05 Worker | NATIVE PASS | Verified job, scrubbed views và retry/prune policy giữ. |
| P06 Worker Linux | LINUX RUNTIME PASS | Candidate heartbeat, graceful shutdown và expired lease recovery. |
| P07 Review UI | BLOCKED | Browser policy, B04 historical FAIL/B05 historical NOT RUN. |
| P08 HotelStay E2E | PARTIAL | H03–H16 native/HTTP đạt, browser và payment/product release policy còn mở. |
| P09 Planner | PARTIAL | Prior synthetic native giữ nguyên, browser/data còn mở. |
| P10 Agent HTTP | ACTUAL HTTP PASS | Model OFF, login/RBAC, replay 409 qua restart. |
| P11 Website E2E | BLOCKED | L05/L06 host HTTP đạt, browser vẫn blocked. |
| P12 Session/quota | PARTIAL | PostgreSQL shared quota/replay đã đạt. Một backend, `persisted:false`; cross-process/session consent scope chưa mở. |
| P13 Privacy/RBAC | PARTIAL | HotelStay authorization/concurrent revoke và header/RBAC/negative media đạt. Còn browser và broader privacy. |
| P14 Docker/Linux | LINUX RUNTIME PASS | L01–L20 synthetic qua các lượt, schema22 disabled pilot trên final DB digest được kiểm riêng. |
| P15 Restore | LINUX RUNTIME PASS | Portable schema22 restore, 26 fingerprints và API smoke trên final PostGIS distribution. |
| P16 Production data | BLOCKED | Không có production catalog đã được owner duyệt. |
| P17 Source consolidation | PARTIAL | Exact reviewed file groups order và checkpoint được xác minh, chưa hợp nhất. |
| P18 VPS security | PARTIAL | Bốn final candidates Trivy 0 critical/high, auth/rate/upload/CORS/log kiểm. Moderate còn theo dõi, host/registry prod cần duyệt. |
| P19 Public DNS/HTTPS | NOT RUN | Loopback TLS dùng cert synthetic riêng, public renewal chưa chạy. |
| P20 Monitoring/recovery | PARTIAL | Restart/restore measured, host production alerts và dữ liệu đại diện còn mở. |


## TASK21.41-SOURCE-CONSOLIDATION · 28/11/2026 ICT

| Gate | Trạng thái | Evidence | Điều kiện tiếp theo |
|---|---|---|---|
| P17 Source consolidation | PARTIAL | Exact commit allowlist, source backup xác thực và draft PR đã chuẩn bị. | Owner duyệt commit/push/draft PR, rồi quyết định merge riêng và verify DACN chính. |

[Checkpoint, nhóm commit và bàn giao TASK21.42-A](HUGO_21_41_SOURCE_CONSOLIDATION_REPORT.md)
