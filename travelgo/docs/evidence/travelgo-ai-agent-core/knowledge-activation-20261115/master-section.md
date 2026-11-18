

### 21.26-A — REAL KNOWLEDGE ACTIVATION CLOSURE

**PENDING OWNER ACTION — chưa có approved real knowledge hoặc real customer advisory PASS.** Hoàn thành fresh audit, fact-quality review, local owner provisioning workflow và các sửa code cần thiết/OFFLINE. Owner đã duyệt riêng provisioning và workflow/retention cho đúng1historical fact, nhưng fresh DB cuối task vẫn không có owner account đã chỉ định. Vì vậy không bật scoped-owner-review hoặc gửi source/fact approval thay owner, không chạy customer chat để lấy PASS.

#### 21.26-A.1. Fresh staging và retained data

[Fresh audit](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/fresh-staging.json) xác minh127.0.0.1:15452, db`travelgo_staging_catalog_20261112`, role`catalog_runtime` không super/createdb/createrole, đúng sentinel;40tables/17migration checksums/130Place/20Business. Fingerprint khớp final21.26, không dùng historical report thay fresh check. Không truy cập DB gốc/27Trip.

Source`3c427f07-c1e2-42eb-b380-42e46c28a2ca` vẫn version1/UNREVIEWED/permissionUNKNOWN/enabledfalse. Candidate`92760bb5-b51a-440e-ab7d-c4c053a5d36b` vẫn source_version1/version1/REAL DRAFT, knowledge_idNULL/reviewed_byNULL; content hash **`d0080c152f76172bd5451601e100f6824b10f5f28b29efa5428e896593634f9c`** khớp extraction.12cost observations/7fact candidates không bị ghi đè. Retention hiện hành đến **07:00 ICT15/12/2026**, không gia hạn/re-import/cleanup hai row đã được phép giữ.

#### 21.26-A.2. Owner provisioning, quyền đã cấp và actual blocker

Audit AuthService/authRoutes/validators/passwordService/UserRole/RBAC: public register chỉ tạo CUSTOMER; existing login dùng scrypt và DB user_roles. Không có public SUPER_ADMIN registration phù hợp bootstrap. Không dùng SYNTHETIC admin hoặc thăng quyền existing CUSTOMER.

[Exact provisioning scope](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/provisioning-scope.json) được [owner phê duyệt](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/provisioning-authorization.json): chỉ NEW owner user`bae330d6-c3cb-462e-839e-cf07d73a64d2` và SUPER_ADMIN role`fe016c5b-63a1-4e9a-9938-465aaae58f69`, giữ account/role cho owner quản trị staging. Không existing customer mutation/source/fact approval/DB gốc. Helper kiểm receipt/expiry/exact IDs/identity/sentinel, collision/new-user-only,40tables/17migrations/catalog, retained candidate hash, dùng existing production registration validator +passwordService.scrypt; INSERT2rows trong transaction và kiểm chỉ users/user_roles có delta. Không default password/backdoor/network registration endpoint hoặc credentials file/log/evidence. Owner tự nhập credentials và tự login.

Owner ban đầu báo đã tạo nhưng [fresh verification](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/owner-verification-1.json) và [lần sau](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/owner-verification-2.json) không thấy exact account/role, SUPER_ADMIN0/receipt absent. Không lấy câu trả lời UI thay DB proof. Windows effective ExecutionPolicy=`Restricted` chặn `.ps1`; đã giữ nguyên policy, không auto bypass. Owner yêu cầu mở cửa sổ PowerShell riêng, đã thử mở interactive prompt; không đọc màn hình/credentials. Đã bổ sung Node terminal prompt che toàn bộ ký tự password, vẫn same approved provisioning/hasher, không cần sửa ExecutionPolicy. **Actual provisioning vẫn NOT VERIFIED/OWNER_ACTION_PENDING** ở [closure state](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/closure-state.json), không tự tạo password để vượt blocker.

Owner chạy trong terminal riêng, từ thư mục`travelgo`:

```powershell
node .\docs\evidence\travelgo-ai-agent-core\knowledge-activation-20261115\owner-prompt.cjs
```

Nhập tên/email riêng và password≥12ký tự gồm chữ+số theo existing validator; không gửi qua chat. Chỉ coi hoàn tất khi thấy`OWNER_CREATED` và fresh exact role proof. Nếu prompt báo mã lỗi, chỉ gửi mã lỗi đã ẩn thông tin; không email/password/token. Helper một lần, từ chối account tồn tại/collision, không promote customer hoặc tự đăng nhập owner.

#### 21.26-A.3. Fact quality review và parser correction

[Human review packet](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/OWNER_REVIEW_STEPS.md) phân loại từng12cost/7fact, không approve đồng loạt:

- Khoản1shuttle150.000VND/person, quoteFeb2026, locator body:block:50:clause:0: **READY_FOR_OWNER_REVIEW historical + STALE_FOR_CURRENT_PRICE**. Không xác nhận giá hiện nay, lịch/chuyến/tuyến đầy đủ/availability/tổng chuyến.
- Khoản2,4,6,9 thiếu đơn vị/context hoặc stale;3/5không đủ chủ thể. Giữ UNKNOWN, không kế thừa per-person từ khoản khác.
- Khoản7/8:150.000khứ hồi/120.000một chiều, Feb2026; giữ đúng unit, **không per-person**. Retained paragraph chỉ nói monastery, heading“See”; exact điểm/station **NEEDS_CONTEXT**. Historical corpus có tên ThienVienTrucLam nhưng heading đó nằm trên context **khác paragraph hash**; không dùng heading lệch hoặc trí nhớ để khẳng định. Muốn chọn7/8 cần owner đối chiếu đúng bài/context hoặc Internet authorization mới; scope đầu chưa chọn.
- Khoản10: source ghi rõ“ride in a Jeep (360,000dong for1Jeep)”. Defect tổng quát là unit grammar chưa nhận `for one/a/1 vehicle` và priced-object reader chưa nhận ride/hire vehicle. Sửa thành **PER_VEHICLE/TRANSPORT/TRANSPORT_FARE** khi evidence đủ; không hard-code nguyên câu. Có negative tests nhiều xe→UNKNOWN, per-person precedence, admission included vehicle và thiếu chủ thể. Không chia tiền/xe hoặc suy capacity. **Retained row10 vẫn originalUNKNOWN_UNIT/OTHER**, chưa sửa DB thay owner.
- Khoản11/12 cần category/context; bike fee không tự thành giá thuê xe.3REPORTED_COST summaries không lách per-observation selection;4non-cost facts còn subjective/context/locator gaps, không guarantee hoặc tự activate.

Không fresh Internet request/re-extraction/import trong task này. Source/terms evidence21.26 là căn cứ chuẩn bị review, không actual source approval. Bài text thuộc Wikivoyage contributors/CC BY-SA4.0: article/history/license/attribution/changes/ShareAlike cần owner kiểm; không ảnh/logo, không official/independent-family claim.

#### 21.26-A.4. Các gap cần sửa để workflow hiện có vận hành

**Giữ nguyên Agent/Core/KB/review center/launcher hiện có**, không tạo hệ thống mới. Source APPROVE tăng version1→2 trong khi retained candidate còn source_version1; guard cũ chặn cả correction, khiến không thể dùng retained DRAFT mà không re-import. Thêm explicit adjacent-source binding vào existing typed correction: đúng contentHash/DRAFT/chưa knowledge, source APPROVE liền kề/không config edit hoặc revoke, retrieval còn trong policy window; owner xác nhận/reason/evidence/current version. Không nhận stale/hash khác/approved candidate. UI báo rõ bind snapshot và giữ evidence/content hash; không tự fetch hoặc approve.

`renderCostAdvice` trước đây chỉ nêu số observations nếu1nguồn, còn giá ở card; QwenOFF reply chưa trực tiếp trả amount/unit/period. Bổ sung tối đa3reported entries toàn response bằng existing server-owned price label +period/source URL/current-price caveat. Không tính tổng mới, không đổi scope/units/independence/Planner/Booking values. Có renderer tests150.000VND/mỗi người/02-2026/citation/unknown unit/bounds. Đây là **OFFLINE proof**, chưa real customer reply.

Existing real-review scope giữ exact actor/source/candidate/hash/version/selection; thêm optional `knowledgeExpiresAt` upper bound khi INSERT snapshot để không vượt deadline owner đã duyệt. Expiry extension bị chặn. Không nới RBAC/strict validation/consent/TTL/revocation, không Qwen provider/prompt/schema change.

Files production sửa: `backend/src/agent/costIntelligence.ts`, `backend/src/services/travelWebService.ts`, `backend/scripts/knowledge-review-scope.cjs`, `frontend/src/pages/admin/TravelWebPage.tsx`. Provisioning/prompt/tests/packets mới chỉ ở evidence task, không public route hoặc launcher cạnh tranh. Source/compiled freeze mới đã khóa; lần Qwen sau cần fresh manifest, không reuse21.25 source hashes đã drift. Historical raw/expected/FAIL, gồm web29/30, giữ nguyên.

#### 21.26-A.5. Source/fact workflow và retention đã được cho phép nhưng chưa thực hiện

Owner duyệt [workflow packet](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/owner-workflow-review-packet.json) qua [receipt](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/owner-workflow-authorization.json): sau fresh real-owner proof, scoped-owner-review tối đa2h; owner tự source APPROVE, typed correction period02/2026 +adjacent bind, tự chọn **chỉ khoản1**; giữ đúng1snapshot sinh từ selection và owner audit đến07:00 ICT15/12/2026. Không các11khoản/7facts khác, không worker/search/Internet/Qwen. Đây là authorization để owner thao tác, **không phải source/fact đã được approve**.

[Exact staged manifest](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/owner-review-manifest.json) ghi ownerID/sourceID/candidateID/hash/current1→planned2transition/selected observation`b3d1c91aa10db71369cc6168e41abf5a`, factHashes[],max1snapshot/expiry/retention. Chỉ có thể INSERT sau đúng candidate version2 và human review; actor chưa có trong DB nên **profile chưa bật**, assistant không login/submit owner approvals. Nếu scope hết hạn hoặc state/hash khác cần kiểm/authorization lại, không tự extend.

Owner flow đã chỉ dẫn đúng nút trong [review steps](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/OWNER_REVIEW_STEPS.md): login riêng→source`Duyệt/bật`một lần→`Sửa dữ liệu theo bài gốc`/`Thời điểm nguồn giá/chuyến đi`=`02/2026`→`Lưu bản sửa chờ duyệt`→chọn chỉ khoản1/reason/expiry≤deadline→`Duyệt kiến thức`. Không yêu cầu sửaSQL/JSON. Actual source moderation/fact approval/review identity/knowledge ID **NOT RUN/PENDING**, approved knowledge IDs=[]; source/candidate vẫn version1/UNREVIEWED/DRAFT.

#### 21.26-A.6. Kiểm thử, customer acceptance và runtime

[Targeted20/20](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/targeted-result.json) OFFLINE parser/renderer/binding; [cost compatibility25/25](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/cost-context-compatibility.json), [review compatibility10/10](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/review-compatibility.json), [owner input validation5checks](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/owner-input-validation-final.json), [retention boundary](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/retention-bound-check.json)PASS. Existing production registration validator/scrypt dùng nguyên trạng. OFFLINE boundary PG/model/Internet0; không chạy lại full benchmark hoặc regrade webW06. Backend TypeScript buildPASS; frontend TypeScript/Vite buildPASS.

**First real knowledge customer acceptance NOT RUN.** Conditional plan2normal chats (maximum task6): queryshuttle thật sau actual approval, rồi cùng query sau task-owned API restart/new authenticated session; đúng150.000VND/person,02/2026historical/source article, selection chỉ1/DRAFT khác không leak, desktop/mobile card href/unit/date. Không chạy khi prerequisite chưa đạt, không dùng OFFLINE doubles hoặc SYNTHETIC làm real PASS. Không revoke real rows để test; lifecycle evidence21.26 được giữ.

Agent quota **NOT SCANNED FRESH** do actual approval chưa có; không reuse14/20 lịch sử. Planned2turns cần freshremaining≥12/cap20/reserve10, tối đa6và không vượt spendable, no retry/poll/reset/account change. Actual normal turns0, source/fact approval requests thay owner0. Qwen resources/modelquota/OllamaGET/POST/load/inference0; không inference hoặc V6.0-D.

API protected task-owned11584 đã reload thành **23700**, cùng launcher/owner/command, READONLY, Qwen/search/workerOFF, `/api/health`200, DML0. Frontend5177/Docker/Ollama/process khác không bị đóng. Chỉ code/build/read-only được kiểm trên runtime này; real-owner startup/browser moderation/customer2cases/persistence/citations vẫn NOT RUN.

#### 21.26-A.7. Integrity, handoff và kết luận

[Closure fresh state](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/closure-state.json) cuối task: ownerReadyfalse/ownerRows[], knowledge0, sourceUNREVIEWED/candidateDRAFT đúng IDs/hash/version; **40bảng khớp fresh baseline đầu21.26-A vốn đã chứa2retained DRAFT**, không delta DB mới. Không gọi đó là baseline trước21.26 hoặc fingerprint DB gốc. Nếu provisioning thành công sau snapshot này cần fresh-check và ghi intentional users/user_roles delta trước bước tiếp; không dựa lời báo thành công thay DB proof.

Không SYNTHETIC fixtures/account/reviews, không cleanup/gia hạn hai real rows, không Trip/Booking/payment/catalog/schema/migration/Recommendation/GROUP_VND_V1/geography mutations. Account/knowledge retention đã có authorization nhưng **chưa có new account/knowledge thực tế để retain**. Không `.env` default/production changes, Internet request, worker daemon, commit/push/deploy. [Final integrity](evidence/travelgo-ai-agent-core/knowledge-activation-20261115/integrity-final.json) kiểm source lock/historical evidence/Master prefix và DB baseline.

Handoff: sau `OWNER_CREATED` cần exact owner role fresh verification; sau đó mới operator bật same launcher `start scoped-owner-review <manifest>` theo approval còn hạn. Owner login/thực hiện các nút trên UI, không assistant; sau actual retained knowledge mới fresh Agent gate/source+expected lock/customer2cases. Để khách dùng approved knowledge trong READONLY: existing `stop`→`start integrated-review`; xem `status`/`worker-status`. Thu hồi bằng source/candidate`Thu hồi` do owner; update qua candidate revision/correction/re-review, không overwrite snapshot đã duyệt. Cuối acceptance `stop`→`start protected`. Commands/profile đã kiểm trong21.26, real-owner start lần này chưa thực hiện. Continuous Internet worker vẫn cần network/operating approval riêng, không tự bật.

| Verdict | Kết quả |
|---|---|
| REAL OWNER READY | **PENDING OWNER ACTION** —provisioning approved, exact account/role chưa có trong fresh DB |
| REAL SOURCE APPROVAL | PENDING —workflow approved, actual moderation NOT RUN |
| REAL FACT APPROVAL | PENDING —chỉ khoản1 đề xuất historical; actual approval NOT RUN |
| PERSISTENT REAL KNOWLEDGE | NOT RUN —approved IDs=[]; giữ2DRAFT cũ đúng retention |
| REAL KNOWLEDGE CUSTOMER ADVISORY | NOT RUN —prerequisites chưa đạt |
| CONTINUOUS INTERNET WORKER | BLOCKED/NOT ENABLED —separate scope pending |
| DATA INTEGRITY | PASS cho code/read-only scope;0new DBdelta, protected restored, historical unchanged |
| QWEN REAL MODEL | DEFERRED; no new calls/gates |
| LIVE READY | **NO** |

Đã hoàn thành phần độc lập và cập nhật Master, không bắt đầu21.27. Hành động còn thiếu: owner thực sự chạy Node prompt trong terminal riêng tới`OWNER_CREATED`, sau đó tự source/fact review trên UI khi profile đã được xác minh/bật đúng scope. Không gửi credentials qua chat, không tự thay owner để hoàn tất approval.
