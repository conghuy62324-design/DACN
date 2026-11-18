const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),root=path.resolve(__dirname,'../../../..');
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,n))),sha=b=>crypto.createHash('sha256').update(b).digest('hex'),write=(n,o)=>fs.writeFileSync(path.join(__dirname,n),JSON.stringify(o,null,2)+'\n',{flag:'wx'});
const lock=read('final-source-lock.json'),baseline=read('baseline-source.json'),runtime=read('final-runtime-integrity.json'),initial=read('performance-baseline.json'),final=read('performance-final.json');
for(const[f,h]of Object.entries(lock.hashes))assert.equal(sha(fs.readFileSync(path.join(root,f))),h,f);
const changed=Object.entries(baseline.hashes).filter(([f,h])=>!f.startsWith('backend/dist/')&&sha(fs.readFileSync(path.join(root,f)))!==h).map(([f])=>f);
const oldDir=path.join(__dirname,'../conversation-v62-20261116'),oldSeal=JSON.parse(fs.readFileSync(path.join(oldDir,'final-seal.json')));for(const[f,h]of Object.entries(oldSeal.artifacts))assert.equal(sha(fs.readFileSync(path.join(oldDir,f))),h,f);
const previousSeals=[];for(const name of ['persistence-closure-20261116','final-trip-20261116']){const folder=path.join(__dirname,'../',name),seal=JSON.parse(fs.readFileSync(path.join(folder,'final-seal.json')));for(const[f,h]of Object.entries(seal.artifacts))assert.equal(sha(fs.readFileSync(path.join(folder,f))),h,f);previousSeals.push({name,artifacts:Object.keys(seal.artifacts).length});}
const families=final.families.map(row=>{const before=initial.families.find(r=>r.id===row.id);return{id:row.id,family:row.family,observations:row.observations,baselineMedianMs:before.medianMs,finalMedianMs:row.medianMs,baselineP95Ms:before.p95Ms,finalP95Ms:row.p95Ms,baselineCorrect:before.pass,finalCorrect:row.pass,countsBefore:before.counts,countsAfter:row.counts};});
write('performance-comparison.json',{tier:'OFFLINE_SYNTHETIC_NOT_PG_OR_HTTP',warmupPerFamily:2,observationsPerFamily:8,families,resources:{baseline:initial.resources,final:final.resources},limits:'Inclusive instrumentation timing, not additive. Small-sample p95 exploratory. Review batch double adapter keeps original null/error data; SQL batching measured separately in actual PostgreSQL. No all-families faster or memory-reduction claim.'});
const auditFiles=fs.readdirSync(__dirname).filter(n=>n.endsWith('-audit.json'));for(const name of auditFiles){const a=read(name);assert.equal(a.nativeRequestAttempts,0,name);assert.equal(a.nativeDispatchedRequests,0,name);}
assert.equal(runtime.status,'PASS_40_OF_40_PROTECTED_READ_ONLY');assert.equal(runtime.ledger.total,10);assert.equal(runtime.ledger.backfilled,6);assert.equal(runtime.ledger.preReserved,4);
const actualCases=['J1','J2','J3','J4','J5','J6','J7','J8'].map(id=>read('actual-'+id+'.json'));assert(actualCases.every(r=>r.status===200&&!r.body.data.model.invoked));
assert.equal(read('db-saved.json').mappings[0].id,'0f53d182-e2b2-4cbe-8317-85bfadb46787');assert.equal(read('cleanup-integrity.json').matchedTables,40);
const actual={at:new Date().toISOString(),status:'FUNCTIONAL_PATHS_PASS_STRICT_ACCEPTANCE_PARTIAL',cases:actualCases.map(r=>({id:r.id,http:r.status,latencyMs:r.latencyMs,status:r.body.data.status,tool:r.body.data.tool,transport:'ACTUAL_BROWSER'})),
 personalSave:{status:'PASS_ACTUAL_HTTP_COMMIT_AND_INDEPENDENT_PG_READBACK',transport:'M2 authenticated HTTP with original unexpired J5 ticket; browser Save-button click NOT ACCEPTED',proof:'db-saved.json'},newSessionReuse:{desktop:'PASS_ACTUAL_BROWSER',mobile:'PASS_ACTUAL_BROWSER',sourceUnchanged:true,noApiRestartBetweenLearnAndReuse:true},
 initialIncident:{checkbox:'FAIL async server-controlled .check assertion; M1 committed',proxyAudit:'FAIL only5057 matched; frontend used5177/api',rawFailure:'actual-failure.json',backfilledEntries:6,notClaimedPreReserved:true,continuationPreReserved:4,noRetryOfJ1ToJ5OrM1:true},
 countedNormal:8,countedManagement:2,totalAccounted:10,reserveRemainingDerived:10,strictProcessAcceptance:'PARTIAL',native:0,unauthorizedDbWrites:0,cleanup:'PASS40/40'};write('actual-final-scoring.json',actual);
const holdoutBefore=read('holdout-baseline.json'),holdoutFinal=read('holdout-final.json');assert.equal(holdoutFinal.passed,12);
const verdicts={geography:'PASS_TESTED_SCOPE',orchestration:'PASS_TESTED_SCOPE',performance:'PARTIAL_MIXED_LATENCY',queryEfficiency:'PASS_MEASURED_READ_ONLY_SCOPE',freshness:'PASS_TARGETED_CATALOG_REVIEW_LANGUAGE_FENCES',resource:'BOUNDS_CLEANUP_PASS_MEMORY_REDUCTION_NOT_DEMONSTRATED',faultTolerance:'PASS_TARGETED_NOT_EXHAUSTIVE',concurrency:'PASS_BOUNDED_SYNTHETIC_SCOPE',customerExperience:'ACTUAL_CHAT_REUSE_PASS_PERSONAL_SAVE_UI_PARTIAL',finalSourceStaging:'PARTIAL_INITIAL_HARNESS_AND_AUDIT_DEFECT',personalPersistence:'PASS_ACTUAL_HTTP_PG_BROWSER_REUSE_NOT_SAVE_BUTTON',privacyBusinessAuthority:'PASS_TESTED_SCOPE',modelOff:'PASS_NATIVE0',dataIntegrity:'PASS40/40',realKnowledge:'PENDING',qwen:'DEFERRED',liveReady:'NO'};
const summary={at:new Date().toISOString(),task:'21.29',status:'V63_CODE_QUERY_IMPROVEMENT_PASS_ACTUAL_STRICT_ACCEPTANCE_PARTIAL',changedExistingFiles:changed,newTest:'backend/src/tests/performanceV63.test.ts',sourceHashes:Object.keys(lock.hashes).length,newHoldout:{baseline:holdoutBefore.passed,final:12,total:12,knownH03H13Excluded:true},targeted:read('performanceV63-final.json'),compatibility:'V6.2 targeted20/20; existing compatibility77/78, one preserved legacy expectation mismatch',actual,verdicts,nativeAuditFiles:auditFiles.length,historicalV62ArtifactsVerified:Object.keys(oldSeal.artifacts).length,previousSeals,stopped:true};write('acceptance-summary.json',summary);
const p=(id,key)=>families.find(r=>r.id===id)[key].toFixed(2);
let section=`

## 21.29 — V6.3 PERFORMANCE OPTIMIZATION, SEMANTIC RELIABILITY & INTELLIGENT ORCHESTRATION

Thực hiện16/11/2026. **CODE/RELIABILITY và measured query optimization PASS trong tested scope; PERFORMANCE MIXED; FINAL-SOURCE STRICT STAGING ACCEPTANCE PARTIAL.** Có browser/HTTP/PostgreSQL thật, không all-green claim vì incident harness/audit bên dưới. QwenOFF, LIVE READY NO. [Summary](evidence/travelgo-ai-agent-core/performance-v63-20261116/acceptance-summary.json).

### 21.29.1. Audit và baseline

Đối chiếu Master21.15–21.19/21.24/21.25/21.27-A/B/21.28 và current Core/normalizer/geography/semantics/adaptive/decision/advisory/grounding, language/customer memory, catalog/review/knowledge-cost retrieval, verified store/Core routes và AgentCorePanel/AssistantPage. Không Agent/executor/cache private toàn cục/hạ tầng mới. [Baseline](evidence/travelgo-ai-agent-core/performance-v63-20261116/baseline-source.json)783 hashes, giữ historical holdout V6.2 15/16 và compatibility77/78.

[18 families +12 new semantic cases](evidence/travelgo-ai-agent-core/performance-v63-20261116/evaluation-manifest.json) khóa input/expected/methodology trước production edits; baseline compiled V6.2 được kiểm hash. Holdout baseline sealed tới final lock. H03/H13 là known regressions, không tính new holdout. Synthetic cases do Codex chuẩn bị, không independent human-labeled production accuracy.

Bottlenecks đo được: greeting vẫn memory2/language1 reads; hotel normalization58calls/14unique inputs, compound192/56, Planner273/75, natural parser lặp2lần. Language snapshot PERSONAL OFF dùng2 SQL. **Actual PG review5listing dùng30queries/pass** vì lặp catalog eligibility/review/job revision mỗi ID. Cost routing còn chiếm slot collection/price correction khi các feature cùng ON, P10/P11 baseline FAIL. Trace P03 trả cost advice thay vì owned budget; rubric cũ chỉ kiểm noPlanner/preservation nên chưa bắt relevance này, targeted mới kiểm structured verifiedContext riêng.

### 21.29.2. Semantic fixes và orchestration

H03: lexical gate coi folded name≤3 ký tự như abbreviation và thiếu directional cue “sang”. Đã phân biệt canonical names lấy từ shared geography, bổ sung directional/explicit replacement relations; “không đi A mà đi B” khác undecided/conditional. Search area không được coi là trip destination để invalidate selections vô cớ. Không hard-code Huế/H03, không geography map thứ hai/geography34 change.

Greeting/thanks và focused question về owned verified slots trả lời sau auth/consent/owner/session guards, trước retrieval không cần. Không lấy private persistent memory cho xã giao; slot collection/correction rõ thắng cost advice. Giá xe/transport question thực sự vào approved cost retrieval, không Planner. Một authoritative natural reading/primary operation, giữ deferred goals và meaning-only no-search/no-auto-save.

Legacy Adaptive14/15 là contract evolution: confirmed mapping + “đừng đặt phòng” cho phép requested read-only search, không Booking/confirmation/mutation. **Old expected CLARIFY và raw FAIL giữ nguyên**; current-contract case mới PASS, không ép78/78.

### 21.29.3. Optimizations và freshness

Existing normalizer thêm request-local AsyncLocalStorage reuse tối đa128 computed entries, nguyên raw keys/offsets và fresh returned object; không transcript/session/global private cache. Derived geography indexes dựng một lần từ registry static chung. Dynamic language snapshot chuyển thành **một fresh CTE statement**: owner/consent/expiry/allowed contribution predicates giữ ở SQL; mỗi final fence vẫn query lại.

Readonly review batch giới hạn5 unique UUID: catalog eligibility một lượt, permitted PUBLISHED review rows một lượt, revisions một lượt. Initial/final fences độc lập. Offline equality với per-ID freshReadOnly oracle và AI-consent withdrawal PASS; non-readonly path giữ sequential per-ID behavior. **Catalog eligibility/public fingerprint kiểm lại cả modelOFF**, có thêm query/clone nhưng ngăn suspended listing được present. CustomerMemory/knowledge freshness không bị bỏ; không index/migration/Redis/cache mutable facts hoặc đổi price/weights/Planner.

### 21.29.4. Measurements

[Đủ18 families](evidence/travelgo-ai-agent-core/performance-v63-20261116/performance-comparison.json): cùng130 synthetic rows/Node flags/harness,2warm-up +8 measured mỗi family, concurrency1. Semantic/composition instrumentation là inclusive, không cộng thành tổng. P95 nhỏ/exploratory; không production SLA.

| In-memory family | Median ms trước →sau | P95 ms trước →sau |
|---|---|---|
| Greeting | ~P01M~ | ~P01P~ |
| Owned context | ~P03M~ | ~P03P~ |
| Hotel search | ~P04M~ | ~P04P~ |
| Compound | ~P07M~ | ~P07P~ |
| Learned reuse | ~P09M~ | ~P09P~ |
| Planner | ~P13M~ | ~P13P~ |
| What-if | ~P14M~ | ~P14P~ |

**Không kết luận toàn Agent nhanh hơn.** Social/context tránh retrieval và nhanh hơn; một số complex paths chậm hơn sau mandatory catalog freshness. P03/P10 còn thay behavior sai, không là so sánh cùng lượng công việc đúng. Final18families đạt locked predicates; baseline3families FAIL. Review double adapter giữ null/error data trước/sau, actual SQL đo riêng.

| Actual PG READ ONLY service | Queries trước →sau | Median ms trước →sau | Mẫu |
|---|---|---|---|
| Language snapshot PERSONAL OFF | **2 →1** | **2,22 →2,13** |1warm-up +8 |
| Review5listing | **30 →6** | **49,21 →14,52** |1warm-up +4 |

[Snapshot baseline](evidence/travelgo-ai-agent-core/performance-v63-20261116/postgres-snapshot-baseline.json)/[final](evidence/travelgo-ai-agent-core/performance-v63-20261116/postgres-snapshot-final.json), [review baseline](evidence/travelgo-ai-agent-core/performance-v63-20261116/postgres-review-baseline.json)/[final](evidence/travelgo-ai-agent-core/performance-v63-20261116/postgres-review-final.json). Đúng role/PG15452, no review/job writes; query count có evidence, local timing/p95 với4/8 samples chỉ exploratory. Không trộn với HTTP/browser latency.

Sampled own Node peak heap **45,52 →47,72MiB**, peak RSS **114,52 →117,27MiB**: không chứng minh memory reduction. Bounded stress128sessions/per-owner8/32turns, expiration/reset/revoke/dispose và lease/listener cleanup PASS; không proof of no leak. Core plan state vẫn dựa vào session/Planner structural bounds, chưa đo mọi worst-case long-plan footprint. Concurrency kiểm riêng bằng bounded synthetic integration, không before/after throughput benchmark hoặc actual HTTP load test.

### 21.29.5. Reliability, concurrency, tests/build

Abort-aware read waiting theo outer/owned-turn signal release lease dù adapter còn pending; cleanup listeners, late result không present/restore, không retry mutation. Giữ25s chat budget cả caller-supplied signal; model15s/runtime/resource/concurrency guards không đổi. Underlying PG query chưa có cancellation riêng: read có thể hoàn tất sau abort, current fences chặn kết quả, không race write.

[New18/18](evidence/travelgo-ai-agent-core/performance-v63-20261116/performanceV63-final.json) kiểm atomic language reads/owner/revoke, review batch oracle/allowed evidence, social/recall no-retrieval, combined routing/correction, H03/H13, current negated-booking contract, listing suspension modelOFF, optional review failure, fresh review/language, optional memory/PG error, abort/late work, same-conversation busy/revision, owner revoke, distinct async scopes/owners, replay/stale metadata và bounded lifecycle stress. Không exhaustive mọi infrastructure timeout hoặc client failure.

[Targeted summary](evidence/travelgo-ai-agent-core/performance-v63-20261116/targeted-final-summary.json): V6.2 targeted20/20, Conversation10/10, Decision17/17, Trip preview/confirmation/authority30/30, provider-double payload3/3+3/3, Adaptive14/15. **Related compatibility77/78 PARTIAL**, giữ old assertion; không rerun full actual Trip21.27-B hoặc cộng số vòng thành thêm case PASS. Backend TypeScript build PASS; initial test-arrow syntax compile FAIL giữ log rồi sửa fixture code. Frontend không đổi nên không build/redesign lại.

**New holdout10/12 →12/12**, chạy final một lần sau lock; no post-holdout tuning. [Baseline](evidence/travelgo-ai-agent-core/performance-v63-20261116/holdout-baseline.json)/[final](evidence/travelgo-ai-agent-core/performance-v63-20261116/holdout-final.json). Historical V6.2 15/16 không regrade.

### 21.29.6. Authorization và final-source actual scope

Fresh identity/sentinel/catalog_runtime nonsuper/40tables/17migration checksums/130Place/20Business/Trip0, retained UNREVIEWED source/DRAFT candidate và owner kiểm READ ONLY. Approved staging CUSTOMER A có test-email và language baseline0; không rename/new account hoặc customer preference changes. Owner cấp [fresh packet approval](evidence/travelgo-ai-agent-core/performance-v63-20261116/staging-authorization.json) cho [exact scope](evidence/travelgo-ai-agent-core/performance-v63-20261116/staging-authorization-review-packet.json).

Fresh Agent scan **21:13:38ICT16/11/2026** đọc cả at/createdAt/latest conservative, same principal hash856f41…95c5, remaining20/20, reserve10, approved8chat+2management. Auth login/GET và RAM lifecycle DELETE không consume AgentLimits, được scope riêng. Không đổi principal/poll/reset ledger để thêm lượt; management consent/save vẫn charge conservative.

[Final lock](evidence/travelgo-ai-agent-core/performance-v63-20261116/final-source-lock.json) **785 hashes**. Existing scoped-knowledge-write launcher có languageOnly fence: đúng owner/settings và mapping **0f53d182-e2b2-4cbe-8317-85bfadb46787**, vulora→homestay, max1INSERT reservation; exact UUID bind chỉ ở isolated launcher, không public ID injection/default/schema change. Contributions DELETE chỉ0row housekeeping, mọi DML khác deny. Pure fence tests PASS. CIM owner read ban đầu bị sandbox Access denied, chạy lại read-only ngoài sandbox được auto-review cho phép, guard không bị bỏ.

Stop owned PID23020, start guarded scoped **PID28632**; [startup proof](evidence/travelgo-ai-agent-core/performance-v63-20261116/runtime-startup-proof.json)10critical loaded code hashes khớp final lock trước POST, health200/model/search/workerOFF. Không old-runtime health claim.

| Actual case | Kết quả có evidence |
|---|---|
| J1 desktop compound | HTTP200 hotel primary, separate caps/group6M |
| J2 geography | HTTP200 destinationHuế/departureHàNội, giữ budget6M |
| J3 party correction | HTTP200 party3, giữ unrelated slots |
| J4–J5 meaning-only | Browser200, không search; independent mapping0 trước explicit save |
| M1 consent | Actual checkbox click đã commit enabled/allowNew true, contributionfalse; raw HTTP body chưa lưu, có DB/SQL proof |
| M2 PERSONAL save | **Actual authenticated HTTP** với original unexpired J5 ticket, commit +independent exact-ID PG readback; browser Save-button click chưa nghiệm thu |
| J6 desktop new session | Real browser persisted mapping reuse, correct Đà Lạt area; không code edit/API restart giữa học/reuse |
| J7–J8 mobile390×844 | Real browser reuse, negative amenity không chặn search, focused referent clarification, no overflow; emulation, không physical device |

[Actual scoring](evidence/travelgo-ai-agent-core/performance-v63-20261116/actual-final-scoring.json). Case durations khoảng35–722ms cho8 different requests, không có actual HTTP baseline tương ứng, không production p95. Không API/model/DB success doubles.

### 21.29.7. Harness/audit incident — strict verdict PARTIAL

**Giữ hai lỗi QA:** .check() đòi server-controlled checkbox đổi ngay trước React nhận response nên harness dừng; M1 thực tế đã commit. Pending waitForResponse reject lúc browser đóng. Route recorder chỉ bắt port5057 nhưng frontend đi5177/api proxy, nên J1–J5/M1 đã gửi mà chưa pre-reserve. [Raw FAIL](evidence/travelgo-ai-agent-core/performance-v63-20261116/actual-failure.json), [DB reconciliation](evidence/travelgo-ai-agent-core/performance-v63-20261116/post-stop-db-proof.json).

Dừng request và kiểm settings revision2/mapping0, scoped3DML/blocked0. Ghi minh bạch **6 BACKFILLED entries**, createdAt là lúc phát hiện để latest timestamp vẫn conservative; không giả pre-reserved. **Không retry J1–J5/M1.** Continuation chỉ M2/J6/J7/J8,4 pre-reserved entries, bắt cả proxy5177 và5057, source/input/expected/ticket không đổi. M2 là actual HTTP vì browser state cũ đã đóng, không UI replay/success mock. [Plan](evidence/travelgo-ai-agent-core/performance-v63-20261116/continuation-plan.json).

Tổngaccounted**8normal+2management=10**, reserve remaining**10 derived từ initial gate**, không fresh rescan/poll/reset để chạy thêm. Không suy retrospective accounting thành full strict process compliance: **FINAL-SOURCE STAGING PARTIAL**, functional paths có receipts riêng, PERSONAL Save UI chưa PASS.

### 21.29.8. Cleanup, integrity và verdict

Đã stop scoped28632, restore guarded **PID10980 protected READ ONLY**. [Cleanup commit](evidence/travelgo-ai-agent-core/performance-v63-20261116/cleanup-committed.json) xóa đúng1mapping+1settings row; contributions0. [Final proof](evidence/travelgo-ai-agent-core/performance-v63-20261116/final-runtime-integrity.json): **40/40 fresh fingerprints**,130Place/20Business/Trip0/retained rows/Owner nguyên, health200,10runtime hashes khớp final source. Scoped DML5 chỉ2settings statements+zero contribution DELETE+mapping INSERT+settings revision, blocked0. Activated manifest được archive, operational manifest CLOSED.

Permanent guard preload trước dotenv/import: toàn audited Node/serve native attempts0/dispatched0. Không Qwen/Gemini/model-resource/model-quota/Ollama metadata/Internet/Owner DPAPI/DB gốc27Trip, không worker dài hạn, schema/reseed/reset/Trip/Booking/payment writes. Default .env/frontend/providers/ModelPrivacy/Planner/Recommendation formula giữ nguyên. Changed files có trong summary; old V6.2 seal93 artifacts và21.27-A/B46/78 giữ hash, Master prefix nguyên. Old Qwen manifests drift nên không reuse cho LIVE sau này.

| Verdict | Kết quả đúng phạm vi |
|---|---|
| GEOGRAPHIC SEMANTIC RELIABILITY | PASS tested scope, known regressions/new12of12 |
| INTELLIGENT REQUEST ORCHESTRATION | PASS tested intent paths |
| PERFORMANCE IMPROVEMENT | **PARTIAL/mixed**, không all-families faster |
| DATABASE QUERY EFFICIENCY | PASS measured readonly scope2→1/30→6 |
| DATA FRESHNESS | PASS targeted independent language/review/catalog fences |
| RESOURCE EFFICIENCY | Bounds/cleanup PASS; memory reduction NOT DEMONSTRATED |
| FAULT TOLERANCE | PASS targeted, not exhaustive/driver cancellation |
| CONCURRENCY SAFETY | PASS bounded synthetic scope |
| CUSTOMER EXPERIENCE | Actual desktop/mobile chat/reuse PASS; PERSONAL Save UI PARTIAL |
| FINAL-SOURCE V6.2/V6.3 STAGING ACCEPTANCE | **PARTIAL initial harness/pre-reservation audit defect** |
| PERSONAL LANGUAGE PERSISTENCE | PASS actual HTTP/PG/browser new-session reuse; Save-button UI NOT ACCEPTED |
| PRIVACY & BUSINESS AUTHORITY | PASS tested scope, no unauthorized DB mutations/cross-owner leaks observed |
| MODEL-OFF ISOLATION | PASS audited native0 |
| DATA INTEGRITY | PASS40/40/protected/window CLOSED |
| REAL KNOWLEDGE ACTIVATION | PENDING, real approved0 |
| QWEN REAL MODEL | DEFERRED |
| LIVE READY | **NO** |

Human helpfulness/production accuracy NOT MEASURED. Còn strict proxy-ledger/browser-save control acceptance, mixed complex latency/memory overhead, uncancelled underlying read drivers và untested lexical edge cases. Historical FAIL/BLOCKED không sửa. **Dừng sau TASK21.29; không thêm chat/model calls, commit/push/deploy hoặc tự bắt đầu21.30.**
`;
for(const id of ['P01','P03','P04','P07','P09','P13','P14'])section=section.replace('~'+id+'M~',p(id,'baselineMedianMs')+' →'+p(id,'finalMedianMs')).replace('~'+id+'P~',p(id,'baselineP95Ms')+' →'+p(id,'finalP95Ms'));
const master=path.join(root,'docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md'),before=fs.readFileSync(path.join(__dirname,'master-before.md'));assert.deepEqual(fs.readFileSync(master),before);fs.appendFileSync(master,section,'utf8');assert.deepEqual(fs.readFileSync(master).subarray(0,before.length),before);
const artifacts={};for(const name of fs.readdirSync(__dirname).sort()){const f=path.join(__dirname,name);if(fs.statSync(f).isFile()&&name!=='final-seal.json')artifacts[name]=sha(fs.readFileSync(f));}
write('final-seal.json',{at:new Date().toISOString(),status:summary.status,artifacts,masterSha256:sha(fs.readFileSync(master)),sourceFilesVerified:Object.keys(lock.hashes).length,historicalV62ArtifactsVerified:Object.keys(oldSeal.artifacts).length,previousSeals,masterPrefixPreserved:true,native:0,dataIntegrity:'40/40',actualStrictAcceptance:'PARTIAL',attempts:10,backfilled:6,preReserved:4,reserveRemainingDerived:10,qwen:'DEFERRED',liveReady:'NO',taskStopped:true});
console.log(JSON.stringify({status:summary.status,changedFiles:changed,sourceFiles:Object.keys(lock.hashes).length,artifacts:Object.keys(artifacts).length,holdout:'10/12 ->12/12',actual:'FUNCTIONAL_PASS_STRICT_PARTIAL',data:'40/40',native:0}));
