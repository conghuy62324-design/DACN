

## 21.27-A — REAL TRIP PERSISTENCE CLOSURE & MODEL-OFF ISOLATION

Thực hiện16/11/2026. **MODEL-OFF ENTRYPOINT/TEST ISOLATION PASS; ACTUAL PERSISTENCE BLOCKED_QUOTA, NOT RUN.** Đã xác minh/sửa phần cách ly test và phần trình bày reopen, không viết lại Agent/Trip/Planner. Historical C1FAIL21.27 và metadata GET UNKNOWN giữ nguyên. [Summary](evidence/travelgo-ai-agent-core/persistence-closure-20261116/acceptance-summary.json).

### 21.27-A.1. ORM hook và scoped policy

Đã đọc actual-create-receipt, orm-identity-offline-results, scope-contract-results, final-current-source và actual-quota-final của21.27. C1 trước đó HTTP500, default UUID không đổi qua setter, exact SQL fence chặn INSERT trước driver và không có Trip commit. Không nâng historical FAIL thành PASS.

Existing installTripScopeHooks dùng setDataValue **chỉ cho new record**, owner/Trip IDs/cap/expiry được giữ; WeakMap tái sử dụng ID khi validation lặp. [New targeted ORM results](evidence/travelgo-ai-agent-core/persistence-closure-20261116/orm-scope-targeted-results.json) **8/8 groups PASS**, real Sequelize model và SQL generator, fake connection throw trước I/O: INSERT và UPDATE SQL hợp lệ qua đúng predicate, wrong owner/unknown ID bị chặn, existing ID không đổi, validation lặp không cấp thêm ID, second ID/max count/expiry/owner update/unbounded delete kiểm được. Không PostgreSQL thật và không production ID injection endpoint. Chỉ cho scope metadata nhận task21.27-A bên cạnh21.27; không nới ID/owner/SQL/column guards.

### 21.27-A.2. Permanent model-off isolation

Tận dụng thiết kế offline guard21.27 thành **backend/scripts/model-off-isolation.cjs**, preload trước application/dotenv. Ép model/provider/search/worker flagsOFF và provider none trong process; wrap cả dotenv.config/configDotenv, kể cả override:true, rồi kiểm effective configuration. Không sửa `.env` dự án. Guard chặn trước I/O ở fetch, HTTP/HTTPS, TCP socket, TLS và UDP. Offline không có endpoint được phép; staging chỉ loopback HTTP5057/5177 và TCP5057/5177/15452. Port11434/external endpoints bị chặn. Audit tách attempted/denied-before-I/O/dispatched-to-transport và native model dispatched; không đồng nhất denied attempt với request đã gửi.

Existing agent-staging-profile preload guard cho CLI/serve; child có audit file mới, state ghi modelOffAuditFile. Thêm backend/scripts/run-model-off-test.cjs và hai package entrypoints:

```text
cd backend
npm.cmd run test:model-off-isolation
npm.cmd run test:agent:model-off -- dist/tests/tripBusinessV61B.test.js
```

Regression runner mặc định ghi vào `.local/model-off/regressions` theo run mới, không overwrite evidence. [Latest hostile dotenv regression](evidence/travelgo-ai-agent-core/persistence-closure-20261116/model-off-regression-results-04.json) PASS: fixture bật model + override:true vẫn effectiveOFF, configuredCoreProvider không configured; **6 model/external probes +1 offline PostgreSQL socket probe** đều bị chặn trước network, **native actually dispatched0**, PG connections0. Đây là guard-negative probes, không chạy readiness helper/model inference. [Audit](evidence/travelgo-ai-agent-core/persistence-closure-20261116/model-off-regression-audit-04.json). Các iteration trước được giữ riêng; không đổi incident21.27, không khẳng định lịch sử GET hoặc tổng POST bằng0.

Reused targeted Core/Planner/confirmation/reopen/version/ownership/replay tests: **30/30 PASS OFFLINE** qua permanent entrypoint, không chạy full benchmark/legacy compatibility. [Results](evidence/travelgo-ai-agent-core/persistence-closure-20261116/targeted30.json), [guard audit](evidence/travelgo-ai-agent-core/persistence-closure-20261116/targeted30-audit.json). Backend build và frontend TypeScript/Vite build PASS với guard nạp trước entrypoints: [backend](evidence/travelgo-ai-agent-core/persistence-closure-20261116/backend-build.log), [frontend](evidence/travelgo-ai-agent-core/persistence-closure-20261116/frontend-build.log).

### 21.27-A.3. Reopen customer presentation

Current AgentCorePanel trước task chỉ render title/dates/link khi nhận result.type=trip dù server DTO có itinerary/cost. Đã thêm **read-only itinerary và dự toán cả nhóm/ngân sách/ngày từ DTO**, cost caveats và link hiện có; không tính lại giá ở client hoặc đưa notes/UUID vào nội dung. Không sửa AgentCoreService, TripSessionService, TripRepository, Planner hoặc cost formula.

Tái dùng UI replay21.27 trong RAM, không sửa source/evidence cũ. Edge1440/390 **PASS OFFLINE REPLAY ONLY**: reopened itinerary/cost, editing status, consent, preview/cancel, không overflow/private canary/UUID text. [Results](evidence/travelgo-ai-agent-core/persistence-closure-20261116/ui-offline-replay-results-closure.json), [network isolation audit](evidence/travelgo-ai-agent-core/persistence-closure-20261116/ui-replay-model-off-audit.json). Actual backend requests0/PG0; **không phải mobile/desktop persistence PASS**.

### 21.27-A.4. Fresh quota — actual STOP

**Một fresh Agent scan lúc08:07:13UTC =15:07:13ICT16/11/2026** đọc toàn historical attempts, cả at/createdAt, giữ latest timestamp bảo thủ và exact approved principal hash856f41…95c5. [Gate](evidence/travelgo-ai-agent-core/persistence-closure-20261116/fresh-quota-gate.json): remaining **14/20**, reserve10, spendable4. Không dùng con số14/20 của report21.27 thay scan mới.

Shortest complete save/reopen/edit/update cần ít nhất5chat+2valid confirmations=7turns (require remaining17). Planned security-complete bounded packet còn reserve thêm3negative confirmation entries, tổng10turns (require remaining20). **14 không đủ cho cả hai phương án; BLOCKED_QUOTA trước fixture/mutation/journey**, không cắt confirmation để giảm lượt. Không polling, reset limiter, đổi principal hoặc dùng B chat. Không scan quota lần nữa trong task, kể cả thời gian tiếp tục trôi qua lúc làm offline.

Theo đúng snapshot ledger này, full20slots có thể kiểm lại **sau khoảng15:29:53ICT16/11/2026** nếu không có attempt khác; đây là tính thời điểm theo ledger, **không phải quota đã phục hồi hoặc approval**. Không tự chạy lại tại mốc đó.

### 21.27-A.5. Fresh staging và packet chuẩn bị

[Fresh READ ONLY baseline](evidence/travelgo-ai-agent-core/persistence-closure-20261116/fresh-db-baseline.json) xác minh exact127.0.0.1:15452/travelgo_staging_catalog_20261112/catalog_runtime, role không super/createDB/createRole, exact sentinel,40tables/17migration checksums/130Place/20Business DEMO/Trip0. Có existing real SUPER_ADMIN đúng ID/role và retained source/candidate, hash/lifecycle không thay. Chỉ đọc, không DB gốc27Trip. Staging read-only helper chạy dưới permanent endpoint fence, [audit](evidence/travelgo-ai-agent-core/persistence-closure-20261116/readonly-staging-audit.json) native dispatched0.

Đã chuẩn bị **packet mới**, không dùng authorization21.27: [review packet](evidence/travelgo-ai-agent-core/persistence-closure-20261116/staging-authorization-review-packet.json), [exact planned cleanup IDs](evidence/travelgo-ai-agent-core/persistence-closure-20261116/cleanup-ledger-planned.json). Scope tối thiểu existing CUSTOMER A + tối đa1 temporary CUSTOMER B/role và1 exact Trip ID, chỉ users/user_roles/trip_sessions;5chat/2valid confirmations, max8chat/2valid; exact task-owned API restart nếu packet được duyệt, no Docker/DB restart, cleanup40/40 và protected restoration. **Packet chỉ PREPARED/NOT APPROVED/NOT ACTIVATED.** Vì quota đã STOP actual, không yêu cầu quyền ghi rồi thực hiện một hành trình không thể hoàn tất; activation vẫn cần fresh owner approval riêng trước bất kỳ mutation nào ở đợt tiếp tục.

Negative probes **không mặc định miễn quota**:

| Probe | Current limiter path | Charge trong planned approved-principal ledger |
|---|---|---|
| B gửi foreign A confirmation ticket | Ownership/ticket validation trước consume | Conservative1entry cho A trước POST; B không chat |
| A gửi forged owner/itinerary/cost extra fields | Strict body validation trước consume | Conservative1entry cho A |
| A replay consumed ticket | Used-ticket validation trước consume | Conservative1entry cho A |
| B GET/PUT task Trip | Trip routes, không gọi AgentLimits | Bounded non-Agent HTTP audit riêng; không coi là Agent/chat |

Mỗi valid confirmation attempt tính1 kể cả mutation thất bại; không auto retry. Actual expiry/concurrency/stale-catalog/cancel có thể giữ đúng offline tier nếu budget không đủ. Inputs/expected planned create→preview→confirm→new-conversation reopen→day2 edit→update preview→confirm đã ghi trong packet, nhưng **không gọi đó là final actual journey đã được duyệt/khóa/thực chạy**.

### 21.27-A.6. Cleanup, integrity, runtime và verdict

Task này actual normal chats0/confirmation requests0/DB writes0/temporary customer0/Trip0; không task credential artifacts hoặc fixture cần cleanup. [Final read-only integrity](evidence/travelgo-ai-agent-core/persistence-closure-20261116/final-db-integrity.json) **40/40 khớp fresh baseline**, owner/customer/retained rows/catalog giữ nguyên. Existing API **PID28308 protected READ ONLY**, health200, verified process owner, auditDML0/blocked0, model/search/worker/public writesOFF. Không mở write window hoặc restart API/Docker/DB khi actual đã bị quota chặn. Guard mới được cài tại launcher entrypoint và đã kiểm CLI describe; **new guarded serve startup/actual journey chưa chạy**, existing protected API không được mô tả như đã reload guard mới.

Changed existing4file: backend/scripts/agent-staging-profile.cjs, trip-write-scope.cjs, backend/package.json, frontend/src/components/agent/AgentCorePanel.tsx. Thêm permanent model-off guard/runner/regression; không module AI mới. [Source/historical integrity](evidence/travelgo-ai-agent-core/persistence-closure-20261116/source-integrity.json) kiểm **16.459 historical files** giữ hash, `.env` dự án không ghi, Master prefix nguyên. Guard probes/audit hiện tại không được dùng để sửa số GET UNKNOWN của incident21.27. Không Model/RAM/GPU/VRAM/quota-model checks, operator warm-load/inference, Booking/payment/knowledge approval/Owner provisioning/migration/reset/reseed/recreate/Internet collection/Maps/GPS/VPS/commit/push/deploy. Qwen manifest cũ vẫn lệch source; không tự nghiệm thu model.

| Verdict | Kết quả |
|---|---|
| MODEL-OFF ISOLATION | PASS cho permanent test entrypoints, hostile dotenv/transport regression và guarded read-only helpers; serve rollout chưa chạy |
| ACTUAL TRIP SAVE | NOT RUN — BLOCKED_QUOTA |
| ACTUAL TRIP REOPEN | NOT RUN — BLOCKED_QUOTA |
| ACTUAL TRIP UPDATE | NOT RUN — BLOCKED_QUOTA |
| POSTGRESQL PERSISTENCE | NOT RUN — không committed Trip mới |
| OWNERSHIP & REPLAY | Existing/new offline contracts PASS; actual NOT RUN |
| COST INTEGRITY | Existing oracle/formula giữ nguyên, offline30PASS; actual oracle NOT RUN mới |
| DESKTOP EXPERIENCE | OFFLINE replay PASS; actual journey NOT RUN |
| MOBILE EXPERIENCE | OFFLINE view/replay PASS; actual committed-Trip read/view/mutation NOT RUN |
| DATA INTEGRITY | PASS40/40 READ ONLY, no fixture delta, protected mode giữ nguyên |
| REAL KNOWLEDGE ACTIVATION | PENDING |
| QWEN REAL MODEL | DEFERRED; native dispatched0 trong các process kiểm mới, historical metadata UNKNOWN giữ nguyên |
| LIVE READY | **NO** |

**Dừng sau21.27-A**, không tự chờ/poll quota để tiếp tục, không21.28. Blockers còn lại: đủ fresh quota cho complete locked journey và fresh bounded owner authorization; actual persistence của hook đã sửa vẫn cần committed receipt + readback ở đợt được phép tiếp theo.
