
## 21.37 — TRAVELGO AI AGENT V7.0 FINAL FUNCTIONAL ACCEPTANCE & RELEASE FREEZE

Thực hiện **18/11/2026, ICT**. **CORE FUNCTIONAL FREEZE: PASS trong supported model-OFF contracts đã nghiệm thu. CURRENT MOBILE: PASS. CURRENT DESKTOP: PASS. REAL MODEL: NOT VERIFIED/OFF. WORKER: DEFERRED/OFF. PRODUCTION LIVE READY: NO.** Đây là closure chức năng Core để chuyển sang UI, không phải nghiệm thu Qwen hoặc public VPS. Evidence: [release-v70-20261118](evidence/travelgo-ai-agent-core/release-v70-20261118/), [final verdict](evidence/travelgo-ai-agent-core/release-v70-20261118/final-verdict.json).

### 21.37.1. Final source/build identity

Đã đọc21.34/21.34C,21.35,21.36 và matrix/blockers/freeze21.36.17–19. Machine `DESKTOP-KU5UHNI`, Windows/Node24.20.0, đúng workspace TravelGo hiện có. Git HEAD `9af594d58a328557fe53a30e46b31b01f51646be`;498working-tree entries trước task được ghi nhận, không reset/checkout/clean hoặc commit/tag/push. Final V6.8 TS/JS hashes khớp [offline lock21.36](evidence/travelgo-ai-agent-core/consultant-v68-20261118/source-final-offline-lock.json), historical evidence giữ nguyên. Backend build được reuse bằng hash identity, không build hoặc chạy lại30/30/115/115 để tăng PASS.

Frontend source/build đã được capture. Lần gọi `npm build` đầu bị guard **REFUSE_EXISTING_AUDIT** vì npm truyền audit filename riêng của process cha vào child Node. Giữ FAIL/log; chạy lại compiler và Vite như hai process độc lập, mỗi process có model-off guard/audit riêng theo existing contract: **tsc PASS, vite build PASS**,132source/public/config files và106build files được hash. Không sửa hoặc tắt guard, không sửa source frontend. [Build receipt](evidence/travelgo-ai-agent-core/release-v70-20261118/frontend-build-identity-v2.json).

Tạo **fresh execution manifest** từ final V6.8 source và prepared M/D inputs/expected21.36; không reuse prepared manifest đã lệch source. Hash26source/build/guard/UI files, source lock và frontend receipt, khóa trước dispatch. Browser dùng Vite source5177/proxy5057 cùng frozen revision; frontend dist build PASS không được diễn giải thành public production deployment acceptance.

### 21.37.2. Current staging data identity

Fresh READ ONLY preflight xác minh PostgreSQL127.0.0.1:15452, `travelgo_staging_catalog_20261112`, `catalog_runtime` non-super/non-createdb/non-createrole, sentinel `travelgo-public-staging:catalog-20261112`. Đúng40tables/17migration checksums/130Place/20Business, Owner/SUPER_ADMIN, retained approved knowledge v2 và baseline source/memory/language/catalog. Không database-transfer blocker; không seed/reset/recreate/migrate hoặc truy cập DB gốc27Trip. Không đọc Owner credentials/DPAPI hoặc hiển thị password hash/token.

### 21.37.3. Fresh quota gate và request accounting

Fresh scan **một lần** toàn bộ historical attempts theo cả at/createdAt, lấy timestamp muộn hơn, đúng approved CUSTOMER A/hash cũ: **20/20**, cap20/hour/reserve10. Dự báo20:37:05.812 của21.36 không được dùng thay measurement. Pre-reserve đủ10entries:1login dùng chung +5mobile chat +4desktop chat. Không polling, chờ scan lại, đổi principal/máy hoặc reset limiter.

Đã audit existing ledger contract: `DELETE /api/agent/core/sessions` gọi `service.revoke` chỉ xóa owned in-memory store/states, không `limits.consume`/PG DML; lifecycle recorder trước dispatch vẫn giữ, không tạo exemption mới. Bootstrap/privacy GET không tiêu thụ Agent turn limiter. Management/confirmation POST ngoài plan bị strict recorder chặn. [Accounting contract](evidence/travelgo-ai-agent-core/release-v70-20261118/request-accounting-contract.json).

Reload owned API chỉ để nạp source sau khi ledger gate PASS, không cấp thêm quota từ restart. Runtime cũ2124 được handoff sang **current V6.8 API18388**, owned frontend22704/Vite5177 proxy5057, cùng READ ONLY identity. Source/build hashes, direct API health/proxy health/frontend đều PASS200. Qwen/external search/worker/webwrites OFF; default .env không đổi.

### 21.37.4. Current mobile acceptance

**ACTUAL PASS**, Edge thật390×844, same approved authenticated CUSTOMER, no API doubles. Consent chưa tích thì Gửi disabled; tích session consent với message hợp lệ thì enabled, request thật và response hiện trong chat. M1–M5 đều HTTP200:

| Turn | Kiểm chứng current source |
|---|---|
|M1|Homestay Đà Lạt dưới800k/Wi-Fi từ catalog; chưa nâng search area thành verified destination|
|M2|Lập lịch cho2người/6triệu, ngày25–27/11/2026, car, xuất phát HCM; hỏi xác nhận đúng candidate Đà Lạt|
|M3|“Đúng rồi” xác nhận candidate; actual Planner preview3ngày với dates/party/budget/mode hợp contract|
|M4|Hỏi nhà hàng trong cùng conversation; giữ verified Trip context và main preview|
|M5|Resume đúng main preview; stable business fields bằng nhau theo comparator mới|

`ITINERARY_BUSINESS_V1`: equal=true, changedPaths=[], chỉ ignored `hotelSuggestion.reviewInsights.computedAt`. UI latest reply và preview action hiển thị; final [mobile screenshot](evidence/travelgo-ai-agent-core/release-v70-20261118/actual-journey-M.png). Không horizontal page overflow ở các turn đã kiểm, page/React errors0. Có2console resource errors từ optional external CSS bị policy chủ động abort; unexpected console errors0, không gọi ra Internet để tải lại.

Historical21.35 mobile B5 vẫn FAIL. M5 là current-contract acceptance mới, không rescore old run. [Mobile score](evidence/travelgo-ai-agent-core/release-v70-20261118/actual-journey-M-score.json).

### 21.37.5. Current desktop acceptance

**ACTUAL PASS**, Edge thật1440×1000, context mới cùng principal; dùng lại login RAM-only,4chat đều200:

| Turn | Kiểm chứng current source |
|---|---|
|D1|Current-source preview theo full verified car context và relaxed pace; calendar dates không bị hiểu thành local day edit|
|D2|Giải thích ngân sách/khoản lớn nhất từ existing server-calculated breakdown, không nhập lại budget hoặc recompute Planner vô cớ|
|D3|What-if budget7triệu trong result, main verified budget vẫn6triệu; không persist hoặc làm hỏng preview chính|
|D4|Resume main preview; comparator equal=true, giữ prices/totals/IDs/dates/activities/review evidence/source revisions|

Actual replies giữ reference-price assumptions, historical source link/period/unit, unknown availability và Booking caveats. [Desktop screenshot](evidence/travelgo-ai-agent-core/release-v70-20261118/actual-journey-D.png), [score](evidence/travelgo-ai-agent-core/release-v70-20261118/actual-journey-D-score.json). Page/React errors0, horizontal page overflow0;2expected CSS-abort console errors, unexpected0. Không click save/Booking hoặc dùng HTTP thay các thao tác chat UI.

### 21.37.6. Production defects và targeted closure

**Không phát hiện production bug cần sửa trong hai required journeys; production source edits0.** Không mở thêm intelligence/module/store/transport engine. Đã reuse assertions/strict recorder/comparator hiện có và frozen offline evidence21.36, không rerun full benchmark/regressions.

Post-capture analysis chỉ đọc current raw responses:6Planner breakdown sums khớp totals; M3 đúng3ngày/2người/car; M2 chưa verified destination; M/D có hai conversation IDs độc lập. Retained source v2 vẫn150.000VND/PER_PERSON/02-2026, budget comparison không khẳng định đủ theo giá hiện hành, không tạo BOOKING_AUTHORITY.

Một lỗi supplementary analysis adapter dùng `verification` vốn optional trên non-query CostAdvice được ghi riêng, rồi kiểm đúng contract `budgetComparison`/`evidenceAuthority`; không sửa production hoặc gửi lại request. Đây không phải actual journey failure/retry. Native10requests và các locked expected giữ nguyên. [Captured authority checks](evidence/travelgo-ai-agent-core/release-v70-20261118/captured-actual-authority-checks.json).

### 21.37.7. Final capability matrix A–T

[Release matrix đầy đủ](evidence/travelgo-ai-agent-core/release-v70-20261118/release-capability-matrix.json) ghi từng capability với **implementation, offline, real HTTP/PG, browser desktop, browser mobile, real model, data authority, remaining blocker, public eligibility**.

| Capability group | Current evidence và giới hạn |
|---|---|
|A/B/M Natural language/context/correction|Current prepared supported requests, candidate confirmation và continuity PASS; không phải Vietnamese model reasoning tổng quát|
|C/D Adaptive language/memory|Existing code/consent/ownership giữ; readonly integration, không tạo hoặc chấm lại persistent learning/memory writes|
|E Review intelligence|Fresh empty/DEMO insights/caveats; không có real-review corpus integration mới|
|F/O Knowledge/source authority|Actual retained historical source v2 và unit/period; không coi là current tariff hoặc Booking quote|
|G/I/N Cost/decision/what-if|Actual breakdown/needs/budget scenario và main-context isolation PASS trong M/D|
|H/J Recommendation/Planner|Actual staging DEMO catalog và existing Planner, valid car/pace/resume PASS; không đổi weights/formulas hoặc mở modes|
|K Trip integration|Preview/no-auto-save PASS;21.27-B persistence PASS lịch sử giữ nguyên, không Trip write mới|
|L Booking navigation|Existing code/authority giữ; full booking/checkout không chạy trong task|
|P/Q Worker/model|OFF; worker DEFERRED và Qwen NOT VERIFIED, chỉ packet đề xuất|
|R Desktop/mobile|Hai required current-source journeys PASS; không phải toàn bộ48route được browser-accept|
|S Privacy/security|Single principal,2session contexts, consent/auth/DML0; không phải concurrent multi-user production security/load test|
|T Linux/GPU|Source/build static readiness; Ubuntu/Docker/GPU/network/deployment actual NOT RUN|

### 21.37.8. Data integrity và runtime restoration

**40/40 table fingerprints trước/sau khớp**. API audit311queries/12identity checks, DML0/blocked0/originalDB0/native-model0. Không fixtures hoặc cleanup DELETE, không Trip/Booking/payment/memory/language/review/knowledge/catalog/Owner writes. Original DB27Trip không truy cập. Auth token và dedicated test credentials chỉ trong RAM, không copy vào evidence/Master/chat/log.

Tổng actual1login +9chat =10conservative entries, remaining suy ra10/reserve10; không scan lại hoặc phát sinh chat sau completion. Latency9local sequential model-OFF turns88–309ms, không phải load benchmark/SLA hoặc model latency.

Đóng Edge test contexts, dừng đúng frontend task-owned22704, handoff API18388 sang **protected READ ONLY11916**, owner/source/build identity khớp current build; model/search/worker/webwrites OFF. Không dừng unrelated processes. [Integrity receipt](evidence/travelgo-ai-agent-core/release-v70-20261118/post-actual-integrity.json).

### 21.37.9. Core functional freeze verdict

| Release gate độc lập | Kết quả |
|---|---|
|**AGENT CORE FUNCTIONAL FREEZE**|**PASS — supported model-OFF contracts, frozen V6.8 implementation accepted as V7.0 Core**|
|**CURRENT MOBILE ACCEPTANCE**|**PASS — M1–M5 actual Edge/API/PostgreSQL**|
|**CURRENT DESKTOP ACCEPTANCE**|**PASS — D1–D4 actual Edge/API/PostgreSQL**|
|**QWEN LIVE READINESS**|**NOT VERIFIED / OFF**|
|**KNOWLEDGE WORKER READINESS**|**DEFERRED / OFF**|
|**PRODUCTION LIVE READY**|**NO**|

Freeze được ghi bằng source/build/execution hashes và evidence, không commit/tag/push. Không gọi full AI V7.0 LIVE READY; không dùng Core fallback thành Qwen PASS hoặc current acceptance thành rescore historical H03/H04/B5/first-holdout/model failures. Core functional development kết thúc trong scope hiện tại; tiếp theo là UI/UX, chỉ sửa tiếp nếu có blocker thực tế được chứng minh.

### 21.37.10. Qwen acceptance packet — đề xuất, chưa được duyệt/chạy

Một [Qwen review packet](evidence/travelgo-ai-agent-core/release-v70-20261118/qwen-acceptance-review-packet.json), status **PROPOSED_NOT_APPROVED_NOT_EXECUTED**, dành cho giai đoạn model riêng. Source xác nhận tag `qwen3:4b-instruct-2507-q4_K_M`, digest `0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0`, context16384, temperature0, num_predict2048, inference deadline15giây, concurrency1. Đây là static source verification, không metadata/readiness/resource measurement.

Đề xuất fresh resource/ownership/quota guards, metadata scope localhost, tối đa1warm-load nếu cần +3semantic inferences, không retry. Full bound pre-reserve4conservative entries/cap20/reserve10 trên đúng principal. Q1 natural Vietnamese/typo/typed quotes, Q2 ambiguous change giữ verified slots, Q3 select server fact IDs rồi grounded renderer với price-unit/period/review-opinion caveats. Facts fixture phải SYNTHETIC khi không có authorized real review, không private/raw untrusted reviews hoặc PG writes.

Fresh builder phải khóa exact inputs/expected/source/fact pool trước native POST và có approval mới; thay source hoặc stale facts không được âm thầm dùng packet cũ. Chấm riêng raw output/schema/semantic, backend authority validation, grounding/renderer và fallback; fallback không được cấp Qwen PASS. Browser→Qwen→Tools không nằm trong3semantic cases. **Task21.37: model/resource/quota checks0, Ollama GET/POST0, warm-load0, inference0.** Không bật model mặc định.

### 21.37.11. Knowledge worker packet — deferred, không thực thi

[Worker review packet](evidence/travelgo-ai-agent-core/release-v70-20261118/worker-acceptance-review-packet.json) chỉ đề xuất fresh exact cohort/source/job/DRAFT candidate IDs, existing fence validation, Owner source-review COMMIT, lifecycle/idempotence/failure→actual next_due recovery/expiry/revoke/persistence/cleanup. SYNTHETIC transport + real PostgreSQL acceptance tách khỏi real Internet acquisition; source/fact approval không được Codex bấm thay Owner.

Đề xuất ≤4cycles/60total DML including API/worker/cleanup,≤2giờ, fresh quota/scope và40/40 restoration; không chạy theo packet này nếu chưa fresh authorization/guard compatibility. Real Internet cần permission/robots/license/redirect/request budget manifest riêng. DRAFT không được public retrieval; retained approved knowledge chỉ đọc, không approve fact mới. TASK21.34/extension cũ không resume; worker cycles0/Internet0 và scheduled worker tiếp tục OFF. Việc này không chặn UI development, nhưng phải đóng gate trước khi bật production worker.

### 21.37.12. UI route/page/component inventory

Static TSX/import-graph audit xác nhận **48page route patterns,3layouts,34shared TSX components**. [Full inventory](evidence/travelgo-ai-agent-core/release-v70-20261118/ui-route-inventory.json) ghi component, API service modules/templates, roles, functionality, desktop/mobile findings, priority và evidence của từng route; không tạo route vì danh sách ý tưởng.

- **CUSTOMER/public:** Home/Explore, hotels/restaurants/details, tours/details, tickets, Planner, blog/create/detail, auth, favorites, trips/details, profile/bookings/become-partner, Assistant/feature-gated routes, privacy/terms/error pages.
- **PARTNER:** dashboard, bookings/details, existing places/tours/tickets/blogs list/create/edit/detail và workspace patterns; role PARTNER giữ nguyên.
- **ADMIN:** dashboard, partner applications, place/tour/blog moderation, travel-web/source/candidate review, language lexicon và generic section route; role SUPER_ADMIN giữ nguyên.

Không có dedicated `/attractions` hoặc CUSTOMER `/reviews` route: dùng existing Explore/category/detail/review components. Memory controls ở `/profile`, consent/privacy/language controls ở Assistant; không tự tạo trang mới. `/blog/create` được router khai báo public nhưng component/API còn auth/business checks; route inventory không cấp thêm quyền.

**Confirmed placeholders:** AdminSectionPage labels businesses/bookings/users/content/reports/settings và PartnerSectionPage workspace labels chỉ render Construction/placeholder, không operational API UI. Không tuyên bố Users/RBAC/business/report/review-admin hoàn thiện chỉ vì có menu/route. Thiếu business UI phải scope riêng, không lén triển khai trong redesign.

Chỉ Assistant có fresh desktop/mobile browser acceptance trong task. Screenshot cho thấy nested chat scroll, footer lớn và HuGoTravel branding cần thống nhất với direction TravelGo; các trang khác chưa được audit browser mới, không tự gán lỗi responsive. API templates từ static import graph không phải requests đã thực thi.

### 21.37.13. Production blocker register

[Register24items](evidence/travelgo-ai-agent-core/release-v70-20261118/production-blocker-register.json) giữ21.34C và gate cho environment/data separation, DEMO segregation, auth/RBAC, sessions/privacy/concurrency/quota, API errors, backup/restore/secrets, Linux/Docker/PostGIS volumes, private Ollama/GPU, health/recovery, Nginx/domain/HTTPS, logs/monitoring, rollback và external-browser E2E.

Local model-OFF acceptance không đóng các gate hạ tầng/security/real-data/production. PostgreSQL/Ollama không được public trực tiếp; Owner/approved knowledge phải được bảo toàn qua backup/restore. Không thuê VPS, cấu hình DNS/HTTPS thật, deploy hoặc phát sinh chi phí trong task này.

### 21.37.14. Remaining P0/P1/P2

- **P0 trước production:** private network/TLS/secrets, đúng production data/DEMO separation, auth/privacy/session/quota trên deployed topology, backup/restore/recovery/rollback, Linux/Docker/PostGIS/runtime và external HTTPS E2E. Chưa nghiệm thu public production.
- **P1 trước public feature tương ứng:** Qwen real semantic acceptance, scheduled worker acceptance/nguồn hợp lệ, authorized real review/memory/partner integration, load/error-state/UI acceptance. Không cần giữ UI development chờ model/worker; chúng vẫn OFF và không được quảng bá READY.
- **P2 sau demo nếu có yêu cầu:** new transport modes/routing/ticketing hoặc intelligence vượt contract/data hiện có; không tạo thêm version/engine để kéo dài development.

### 21.37.15. TASK21.38 UI/UX handoff — chưa bắt đầu

[Handoff/design scope](evidence/travelgo-ai-agent-core/release-v70-20261118/ui-ux-handoff-2138.md): audit brand/assets/tokens, thống nhất typography/color/spacing/forms/cards/navigation; CUSTOMER journeys và responsive trước, rồi PARTNER/ADMIN; accessible loading/empty/error/disabled states và trạng thái provider OFF. Giữ API contracts, RBAC, consent/revocation, server authority, preview confirmation, DEMO labels và toàn bộ nghiệp vụ đã PASS.

Không đổi frontend framework, thay business logic để làm đẹp, thêm trang/backend chỉ vì placeholder label, tự bật Qwen/Maps/worker hoặc deploy. Missing business functionality phải được mô tả và scope riêng. Mục tiêu tiếp theo là website du lịch thống nhất, responsive và dễ dùng; hạ tầng Ubuntu/Docker/VPS GPU/domain/HTTPS là giai đoạn có authorization/acceptance riêng sau UI.

**Dừng sau21.37: Core functional freeze và hai current browser journeys PASS; Qwen NOT VERIFIED/OFF; worker DEFERRED/OFF; production LIVE READY:NO. TASK21.38 chỉ được chuẩn bị, không thực hiện.**
