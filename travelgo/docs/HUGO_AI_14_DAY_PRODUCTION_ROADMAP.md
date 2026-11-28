# HuGo Travel — proposed 14-day production roadmap

**Mốc cập nhật là TASK21.41-B-FINAL ngày 28/11/2026 ICT.** Các mốc bên dưới là kế hoạch. Tiến độ nghiệm thu dùng [ma trận P01–P20](HUGO_PRODUCTION_RELEASE_MATRIX.md).

Lập26/11/2026 ICT; cửa sổ14 ngày gồm26/11–09/12/2026. **09/12 là mục tiêu có điều kiện, không phải cam kết deploy hoặc quyền phát sinh chi phí.** Task hiện tại dừng A1/A2. Chưa thuê VPS/domain, mua dịch vụ hay deploy.

| Ngày | Kết quả cần review | Gate trước bước tiếp |
|---|---|---|
| 26/11 — D1 | A1/A2 native Hotel/Agent/browser closure; preserved failures/locks, READ ONLY preview | Bounded evidence, exact fixture delta, quyền ghi thu hồi |
| 27/11 — D2 |21.40-B review attribution design + privacy/eligibility contracts | Fresh approval cho review/fixture writes; không kế thừa quyền A2 đã đóng |
| 28–29/11 — D3–4 | Room attribution, edit/delete/hide/consent lifecycle; bounded persistent review processing | Exact source revisions, lease/crash recovery/idempotence; chưa worker lâu dài nếu chưa duyệt |
| 30/11 — D5 | Contextual language gaps/guest allocation/nightly-vs-total UX; holdout mới | Giữ A0/A1 FAIL; không tune rồi gọi holdout độc lập |
| 01/12 — D6 | Qwen reasoning acceptance với native facts | Owner approval mới; pinned model/digest/context16384, quota/resources/ownership guards, native cap và no-retry |
| 02/12 — D7 | Linux/Docker packaging test cho React/Node/PostgreSQL/PostGIS/Ollama | Không Windows dependency trong production; exact migrations/checksums/artifacts; tách dev/staging/prod |
| 03/12 — D8 | Media/database persistent volume + backup/restore drill | Restore thử, bảo toàn Admin/knowledge; secrets Linux riêng, không copy DPAPI làm runtime dependency |
| 04/12 — D9 | Production authentication/privacy/security và quota/session design | Ollama/PostgreSQL private only; model read tool boundaries; consent, RBAC, source policy |
| 05/12 — D10 | GPU capacity/load/concurrency/failure/fallback | Audit Linux/GPU runtime thật; sizing theo số đo, không hạ model/context/resource guards để qua |
| 06/12 — D11 | Full browser E2E Hotel/Agent/tools/reviews trên Linux staging | Current source, production-like data boundaries, no mock LIVE claims |
| 07/12 — D12 | Release candidate, monitoring/health/graceful restart/worker operations | Bounded queues, policy/robots/license/retention/egress caps, auditability; no autonomous fact approval |
| 08/12 — D13 | Owner review, final backup, rollback và domain/HTTPS preparation | Approval mới trước thuê/mua/publish/migrate production; không seed SYNTHETIC thành doanh nghiệp thật |
| 09/12 — D14 | Conditional go/no-go review | Chỉ deploy khi owner duyệt và toàn bộ essential gates PASS; thiếu gate thì hoãn phần release tương ứng |

## Architecture tiếp tục sử dụng

React frontend, Node backend, PostgreSQL/PostGIS, existing Agent Core/Recommendation/Planner/Adaptive Language/Memory/Review/Knowledge/Cost modules. Nginx + domain + HTTPS; Ollama/Qwen trên VPS GPU hoặc private Docker network, không expose11434/5432. Persistent DB/media volumes, encrypted/access-controlled backups, restore rehearsal, health/readiness checks, resource limits, log redaction/rotation và graceful restart.

Không viết lại Agent hoặc thay PostgreSQL. Preserve model `qwen3:4b-instruct-2507-q4_K_M`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, context16384 và accepted validation contracts. Ollama failure phải còn deterministic Core/native read advice; cần actual failure acceptance sau, task A2 không gọi Ollama.

## Dependencies chưa được tính PASS

- Native quote contract đã shared website/Agent trong SYNTHETIC target; chưa có real partner production inventory, payment hoặc HotelStay transaction acceptance mới trong A2.
- Review room attribution contract mới prepared; worker lifecycle/native review corpus/daily schedule chưa chạy.
- Current Agent per-process20/hour và in-memory sessions không phải distributed/restart-resistant production quota. Cần production quota persistence/coordination và multi-customer load/isolation acceptance; không reset ledger để lấy PASS.
- Qwen semantic reasoning với native tool schemas, Linux GPU residency/capacity và provider-failure behavior chưa chạy trong A2.
- DPAPI/PowerShell chỉ là local operator helper; production sử dụng Linux secret mechanism và environment-configured media, không hard-code user Windows paths.
- Migration artifacts phải khớp reviewed tracker checksums; không silently normalize LF/CRLF hoặc nới guards để deploy.
- Safe Git integration của main/worktree/uncommitted WEB+AI cần review riêng sau nghiệm thu; không tự merge, copy đè hoặc xóa worktree.

Không tự bắt đầu phaseB hoặc chạy lịch này bằng automation trong task A1/A2.


## 21.40-B checkpoint — 27/11/2026 ICT

D2–D4 review worker source and additive schema were implemented; a bounded worker ran two jobs. The isolated DB subsequently became unavailable and its approved write window expired, so R03–R24, final cleanup/fingerprints and browser acceptance remain BLOCKED/NOT RUN. Sealed review holdout is9/10 FAIL. The 09/12/2026 target remains conditional: restore the exact isolated container, obtain a fresh bounded authorization, finish native/browser acceptance and cleanup, then separately accept Linux/GPU/Qwen, real business data and release gates. Do not treat this checkpoint as production approval or automatically begin21.40-C.

B gate update: V5 extractor compatibility18/18 and targeted8/8 offline; sealed V4 holdout9/10 remains FAIL and V5 requires a new independent holdout plus native regeneration before any release gate. Existing DB/window blocker remains.

B read-only checkpoint correction: isolated15457 has restarted with exact old volume;61/20,2 persisted V4 insights and59/59 outside-cohort read-only fingerprints verified. Write window still expired, so V5 worker, R06–R24, cleanup and browser remain blocked. Release target remains conditional.


## 27/11 TASK21.40-B-RESUME gate update

V5 native worker/reconciliation/lifecycle/integrity completed on isolated SYNTHETIC DB; outside cohort59/59 and cleanup PASS. Browser actual batch stopped after B04 FAIL (detail prose omitted an existing validated quote); fix is offline8/8/build PASS but no browser reacceptance. B05 NOT RUN. Do not advance release or start21.40-C based on native PASS. Next bounded browser authorization must test current source B04/B05 without reusing quota/manifest. Linux worker SIGTERM/graceful shutdown, real reviews/business, Qwen/GPU, distributed quota/privacy and full browser E2E remain conditional production gates.


## TASK21.40-B-FINAL gate — 27/11/2026

Current grounded response source passes backend build, targeted15/15 and compatibility7/7 offline. Browser B04/B05 current-source acceptance remains NOT RUN: prior browser launch was rejected by automatic approval review and the fresh90-minute window expired before browser/DB execution. Historical B04 FAIL is retained. Prior cleanup511/1600 and 59/59 integrity are not fresh reruns. Do not mark phase B fully accepted or advance release on offline evidence. Next bounded browser gate needs policy-safe authorization plus fresh manifest/quota; Linux worker gate needs actual signal, scheduler, lease and retention acceptance with a dedicated container. Phase C handoff may be scoped in parallel, without treating B04/B05 or Linux worker as PASS.


## TASK21.40-C — 27/11/2026

Tư vấn đa dịch vụ đã vào source hiện tại. Build, development 21/21 và native chỉ đọc 10/10. Holdout niêm phong 9/10. Cần nghiệm thu tiếp với catalog có nhà hàng và điểm tham quan đủ điều kiện. HTTP chưa chạy. B04 historical FAIL và B05 NOT RUN được giữ nguyên. B04/B05 trên source hiện hành cần route browser được phê duyệt và scope mới.

Mục tiêu 09/12/2026 vẫn phụ thuộc tất cả gate. Còn mở Linux worker signal, logs và outbox retention, quota/phiên đa tiến trình, Qwen GPU thật, dữ liệu nghiệp vụ/review production, HotelStay, browser E2E, backup/restore, bảo mật VPS, HTTPS, giám sát và restart/recovery. Phase D cần phê duyệt riêng. [Báo cáo C](HUGO_AI_21_40_C_ADVANCED_TRAVEL_CONSULTANT_REPORT.md)


## TASK21.40-D — 27/11/2026

Xong tích hợp source, 22/22 offline, 7/7 native chỉ đọc với provider mô phỏng, Compose GPU proposal qua validate cấu hình. Qwen thật chặn bởi RAM/VRAM/GPU, inference 0/24. Cần preflight mới để đo Qwen GPU, cold/warm và latency. Giữ HTTP Agent, positive native multi-service/Planner, B04/B05, HotelStay, browser E2E, Linux Worker signal/logging/retention, session và quota đa tiến trình, dữ liệu production, backup/restore, VPS security, domain/HTTPS, monitoring/recovery. Mục tiêu 09/12/2026 vẫn có điều kiện. [Báo cáo D](HUGO_AI_21_40_D_QWEN_LIVE_INTEGRATION_REPORT.md)


## TASK21.41 — Checkpoint và đường găng đến 09/12/2026

HTTP Agent READ ONLY và model OFF đóng P10/P03 theo giới hạn có bằng chứng. P01 vẫn BLOCKED_RESOURCE (RAM 5.330 rồi 3.758/6.144 MiB); Qwen Linux staging cần benchmark. Linux image, gateway config và worker signal đạt cấp component. Full stack, restore và TLS công cộng chưa được nghiệm thu. Dừng 21.41. [Báo cáo](HUGO_21_41_PRODUCTION_INTEGRATION_REPORT.md)

| Cửa sổ mục tiêu ICT | Việc có thể làm song song sau quyết định owner | Điều kiện đi tiếp |
|---|---|---|
| 28/11–02/12 | Chốt gói isolated DML và browser route, chốt nguồn catalog được duyệt, xác nhận host staging đo GPU và artifact pin. Thiết kế/review PostgreSQL shared quota, scope privacy và runtime roles. | P01/P02 có số đo thật, P04/P05/P06/P07/P08/P09/P11/P13 có kết quả theo source lock. |
| 03–06/12 | Full Linux stage, benchmark tải, chạy hai backend với quota, backup/restore mới, security review, rehearsal monitor/rollback. | P12/P14/P15/P18/P20 có bằng chứng thật. |
| 07–08/12 | Chốt nguồn approved, hợp nhất qua PR được duyệt, kiểm production catalog, domain, cert/renewal và config. | P16/P17/P19 đạt, runtime config chuyển an toàn về DACN chính. |
| 09/12 | Owner go/no-go và quyết định phạm vi phát hành. | Nếu còn gate bắt buộc, hoãn phần release tương ứng. |

Không phân tách thành task sửa nhỏ bổ sung. 21.42 cần scope và quyết định mới. Chi phí VPS/domain chỉ xem xét sau số đo sizing staging và duyệt của owner. [Runbook](HUGO_PRODUCTION_DEPLOYMENT_RUNBOOK.md)


## TASK21.41-A — Nghiệm thu ghi có phạm vi và cập nhật đường găng

P06 đã qua Linux thật trên PostgreSQL cô lập. P04/P08 đạt parity/prepare chỉ đọc và bị chặn cho phần ghi, P09 có ca dương native với hai fixture. P05 đã có lease/retry/prune thật, còn verified review lifecycle và tải production. Cả hai lượt scoped acceptance đã cleanup hoàn tất. [Báo cáo A](HUGO_21_41_A_BUSINESS_ACCEPTANCE_REPORT.md)

Trước 09/12, các việc quyết định mốc là owner duyệt delta `audit_logs/hotel_profiles` theo khóa và rate có hủy hợp lệ, route browser, P12 shared quota/session sau review privacy, staging GPU và full stack, backup/restore, security và DNS/TLS. Nếu các gate cần cho scope phát hành còn mở vào 09/12, hoãn phần đó. Dừng A và chờ quyết định 21.41-B. [Ma trận](HUGO_PRODUCTION_RELEASE_MATRIX.md)


## TASK21.41-B — Quota/lease và đường găng

Code quota, chống replay, lease và migration 21 sẵn để review. P12 vẫn BLOCKED trước DDL/DML và hai backend thật. Session content giữ `persisted:false`. Gói business riêng chờ scope rate mới, audit, commercial revisions, HotelStay và verified review lifecycle. Browser và Qwen Linux GPU còn thiếu môi trường được phép. [Báo cáo B](HUGO_21_41_B_AI_RELIABILITY_REPORT.md)

Ưu tiên 2 gói quyền độc lập, sau đó xác nhận kết quả native, browser và GPU staging trên revision đã khóa. Backup/restore, full Linux stack, bảo mật, domain/HTTPS và nguồn consolidation tiếp tục là gate của mục tiêu 09/12. 21.41-C chỉ bắt đầu sau quyết định owner. [Ma trận](HUGO_PRODUCTION_RELEASE_MATRIX.md)


## TASK21.41-B-FINAL — 28/11/2026 ICT

PostgreSQL shared coordination đã đạt trên 2 backend isolated. P12 tổng giữ PARTIAL do session privacy. Verified review V5 native và giá/promo đạt. Đường găng còn HotelStay ghi với quyền lock hợp lệ, B04/B05 browser và essential website, native Qwen GPU, backup restore, full Linux stack, monitoring, bảo mật và DNS/HTTPS. Mốc 09/12 giữ có điều kiện theo các gate. Dừng trước 21.41-C. [Báo cáo](HUGO_21_41_B_FINAL_ACCEPTANCE_REPORT.md) · [Ma trận](HUGO_PRODUCTION_RELEASE_MATRIX.md)


## TASK21.41-C · 28/11/2026 ICT

Đường găng cần hai scope độc lập cho native H03–H16 và isolated L01–L20/P15. B04/B05, catalog production, security/monitoring và HTTPS giữ gate riêng. Assessment Qwen khi được cấp Linux GPU giữ exact tag/digest, 12 GiB VRAM, 24–32 GiB RAM, context 16384 và concurrency 1 để bắt đầu. Dừng trước 21.42. [Report C](HUGO_21_41_C_LINUX_RELEASE_READINESS_REPORT.md)


## TASK21.41-C-FINAL · 28/11/2026 ICT

P15 portable restore synthetic đạt trên schema 21, cần dữ liệu và timing đại diện trước chốt RPO/RTO. Đường găng HotelStay cần duyệt fence SELECT delta và H03–H16. Linux internal đạt một phần, cần ingress localhost đúng duyệt, positive quote, upload/logging/rate limits và xử lý image CVE. B04/B05, production data, public TLS, Qwen GPU và monitoring tiếp tục gate. Dừng trước 21.42. [Báo cáo](HUGO_21_41_C_FINAL_ACCEPTANCE_REPORT.md)


## TASK21.41-RELEASE-CLOSURE · 28/11/2026 ICT

Đường găng HotelStay native/HTTP và Linux synthetic đã đạt theo các lượt release closure. Schema22 backup/restore đạt trên candidate distribution. Trước GPU VPS staging cần duyệt exact host/registry, làm lại security scan theo image artifact, observability, nguồn catalog và plan browser được phê duyệt. Giữ pin model, 12 GiB VRAM, 24–32 GiB RAM, context 16.384, concurrency 1 cho assessment có quyền. Qwen và production Worker OFF, dừng trước 21.42. [Báo cáo](HUGO_21_41_RELEASE_CLOSURE_REPORT.md)


## TASK21.41-SOURCE-CONSOLIDATION · 28/11/2026 ICT

Đã chuẩn bị cây ứng viên, gói duyệt Git và bàn giao GPU staging. P17 PARTIAL. Owner duyệt commit, push và draft PR trước, rồi quyết định merge riêng sau review. TASK21.42-A cần duyệt riêng. Qwen OFF, P12 PARTIAL, persisted:false, một Agent backend.

[Checkpoint, nhóm commit và bàn giao TASK21.42-A](HUGO_21_41_SOURCE_CONSOLIDATION_REPORT.md)
