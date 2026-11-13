// Saved-evidence review only. No DB, provider, model preparation or resumed LIVE.
const c=require('./common.cjs'),old='docs/evidence/t-ai-04-g2-e2e-harness-fix-resume/';
const quota=c.json(c.prefix+'quota-preflight.json'),db=c.json(c.prefix+'preflight-readonly-result.json'),finalDb=c.json(c.prefix+'final-db-comparison.json'),ledger=c.json(c.prefix+'fixture-ledger.json');
c.assert.equal(quota.status,'BLOCKED_QUOTA_PREWRITE');c.assert.equal(quota.available,8);c.assert.equal(quota.requiredSlots,10);c.assert.equal(db.databaseReadChecks,'PASS');c.assert.equal(finalDb.status,'DB_UNCHANGED_25_25_NO_INSERT');c.assert.equal(ledger.affectedRows,0);c.assert.equal(c.json(c.prefix+'native-final-audit.json').totalPosts,0);
const suites=['agentMissingSlotRecovery','agentSlotFillingPrompt','agentG1SafeContract','agentDecisionRouting','agentDecisionFormatSafety','agentFoundation','agentTransport','agentContractSlotInvestigation.g1-applicable'],comparisons=[];
const unit=c.json(c.prefix+'frontend-unit-final.json');c.assert.ok(unit.results.every(x=>x.exitCode===0&&x.failed===0));c.assert.equal(unit.results.reduce((n,x)=>n+x.passed,0),49);
for(const layer of ['actual-policy','downstream-control']){let passed=10,failed=0;for(const name of suites){const a=c.json(old+`final-verified/${layer}-${name}.json`),b=c.json(c.prefix+`final-verified/${layer}-${name}.json`);const project=x=>x.results.map(r=>({name:r.name,status:r.status}));c.assert.deepEqual(project(a),project(b),layer+name);passed+=b.passed;failed+=b.failed;}comparisons.push({layer,passed,failed,caseByCaseBaselineMatch:true,composition:'171 backend +10 original frontend G1 cases'});}
c.assert.equal(comparisons[0].passed,145);c.assert.equal(comparisons[0].failed,36);c.assert.equal(comparisons[1].passed,176);c.assert.equal(comparisons[1].failed,5);
const extra=c.json(c.prefix+'additional-offline-results.json');c.assert.ok(extra.results.every(x=>x.status==='PASS'));c.assert.deepEqual(extra.results.map(x=>x.passed),[68,79,61,22]);
const execution=c.json(c.prefix+'final-verified/execution.json').execution;
for(const[name,pass,fail]of [['new-completeness',52,0],['new-execution-correction',42,0],['readiness-33',32,1],['actual-policy-diagnostics',8,5],['downstream-control-diagnostics',13,0]]){const x=execution.find(x=>x.name===name);c.assert.equal(x.passed,pass);c.assert.equal(x.failed,fail);}
c.assert.equal(execution.find(x=>x.name==='backend-build').exitCode,0);c.assert.equal(c.json(c.prefix+'frontend-build-final.json').exitCode,0);
const browser=c.json(c.prefix+'browser-01/results.json');c.assert.equal(browser.stats.expected,74);c.assert.equal(browser.stats.unexpected,0);c.assert.equal(browser.stats.skipped,0);c.assert.equal(browser.stats.flaky,0);c.assert.deepEqual(browser.errors,[]);c.assert.equal(c.json(c.prefix+'browser-01/execution.json').code,0);
const auditFiles=c.fs.readdirSync(c.path.join(c.evidence,'regression-audit'));const audits=auditFiles.map(f=>({file:f,...JSON.parse(c.fs.readFileSync(c.path.join(c.evidence,'regression-audit',f)))}));c.assert.ok(audits.length>0);c.assert.ok(audits.every(x=>x.postgresConnectAttempts===0&&x.forbiddenNetworkAttempts===0));
c.write('regression-summary.json',{at:new Date().toISOString(),status:'REQUIRED_NEW_SUITES_PASS_HISTORICAL_CONFLICTS_UNCHANGED',frontendUnit:{passed:49,failed:0},mockedBrowser:{passed:74,failed:0,skipped:0,retry:0},requiredBackend:[68,79,61,42,52],legacy:comparisons,foundationControl:{passed:22,failed:0},readiness:{actual:'32 PASS/1 FAIL',control:'33 PASS/0 FAIL'},diagnostics:{actual:'8 PASS/5 FAIL',control:'13 PASS/0 FAIL'},builds:{frontend:'PASS',backend:'PASS'},assertionsChanged:0,liveInference:0,dbWrites:0,notLiveAcceptance:true});
c.write('offline-boundary-audit.json',{at:new Date().toISOString(),auditFiles:audits.length,audits,postgresConnectAttempts:0,forbiddenNetworkAttempts:0,nativePosts:0,dbWrites:0,source:'Inherited deny-native preload + original mock/dead-proxy browser config; final real DB fingerprint and Ollama local log independently checked'});
const rate=c.rate();c.assert.equal(rate.known,quota.rate.known);c.assert.equal(rate.recent.length,12);c.assert.equal(rate.remainingConservativeSlots,8);c.write('quota-final.json',{at:new Date().toISOString(),status:'STILL_BLOCKED_NO_NEW_ATTEMPTS',rate,requiredSlots:10,newAttempts:0,autoResume:false});
const review=[];for(const file of c.fs.readdirSync(c.path.join(c.root,c.previous))){const full=c.path.join(c.root,c.previous,file);if(!c.fs.statSync(full).isFile())continue;const data=c.fs.readFileSync(full);if(file.endsWith('.json'))JSON.parse(data);review.push({file:c.previous+file,bytes:data.length,sha256:c.sha(data)});}
const sourceFiles=['backend/src/services/tourPlannerService.ts','backend/src/services/recommendationService.ts','backend/src/services/geoService.ts','backend/src/services/placeService.ts','backend/src/repositories/recommendationRepository.ts','backend/src/repositories/placeRepository.ts','backend/src/agent/tools.ts','backend/src/agent/toolProvenance.ts','backend/src/agent/currentTurnProof.ts','backend/src/agent/verifiedHistory.ts','backend/src/agent/liveProvider.ts','backend/src/agent/limits.ts','backend/src/services/agentService.ts','backend/src/routes/agentRoutes.ts','backend/src/config/database.ts','backend/src/config/env.ts','backend/src/utils/testDatabaseGuard.ts','backend/src/utils/plannerValidation.ts'];
c.write('baseline-review.json',{at:new Date().toISOString(),fixtureDesignDirectory:review,designArtifactsParsed:true,source:sourceFiles.map(file=>({file,sha256:c.sha(c.read(file))})),notes:['Owner selected profile2; approval is present and not the blocker','Original full-chain reservation10, available8 at current execution; do not delete cases or ignore conditional slots to fit','Maintenance isolation remains unestablished; current empty pg_stat_activity is observation only','Full source/previous report/expected integrity checked separately; no original expectation change']});
const after=c.snapshot();c.assert.deepEqual(after,c.json(c.prefix+'integrity-before.json').hashes);const integrity=c.integrity();
c.write('integrity-after.json',{at:new Date().toISOString(),status:'PASS',hashes:after,protectedFiles:Object.keys(after).length,changed:[],previous:integrity,productionChanges:0,originalExpectedChanges:0,benchmarkChanges:0});
const statuses={FIXTURE_CREATION:'NOT RUN / BLOCKED_QUOTA_PREWRITE',DIRECT_PLANNER:'NOT RUN',RAW_NLU:'NOT RUN / NOT EVALUATED',G2_HISTORY:'NOT RUN LIVE; offline suite68 PASS separate',SAFETY:'PASS read-only/prewrite stop; model-to-tool LIVE NOT RUN',REAL_TOOL_FIDELITY:'NOT RUN',BROWSER_LIVE:'NOT RUN',DB_CLEANUP:'N/A:0 inserts,0 cleanup DELETE; approved IDs absent',DEMO_READINESS:'BLOCKED_QUOTA; maintenance isolation not established'};
c.write('results-reviewed.json',{at:new Date().toISOString(),classification:'BLOCKED_QUOTA_PREWRITE',ownerApproval:'PROFILE2 APPROVED_CONDITIONAL',layers:statuses,fixtureInserted:0,cleanupDeleted:0,nativePosts:0,principalChanged:false,quotaBypassed:false,caseScopeReduced:false,directCost3500000:'DESIGN_ORACLE_ONLY_NOT_MEASURED',database:finalDb,P1:'OPEN',P2:'OPEN',regressionIsLiveProof:false});
const e='evidence/t-ai-04-planner-real-tool-live-e2e/';
const layerTable=Object.entries(statuses).map(([k,v])=>`| ${k} | ${v} |`).join('\n');
const report=`# T-AI-04-PLANNER-REAL-TOOL-LIVE-E2E

Ngày **11/11/2026**, Asia/Saigon. Kết luận **BLOCKED_QUOTA_PREWRITE**. Chủ dự án đã duyệt **PROFILE 2 PLACES**, nhưng tại preflight principal còn **8** conservative rolling slots, trong khi toàn chuỗi cần **10**. Đã dừng **trước write-intent/INSERT/native POST**, không đổi principal, reset quota, chờ tự resume hoặc rút case để né giới hạn. **0 fixture INSERT,0 cleanup DELETE,0 Ollama POST,0 direct Planner execution**.

DB mới đo **25/25 unchanged**, places**22/22**,Trip**27/27**,hai fixture UUID không tồn tại. Regression mới frontend49,mocked browser74,backend68/79/61/42/52 vàhai build PASS;legacy145/36 giữ baseline. **P1/P2 OPEN**. Planner LIVE chưa được nghiệm thu.

## 1. Owner approval và profile2

[Owner task](${e}owner-task.txt) phê duyệt có điều kiện đúng2 Place trên **travelgo_ai_m0_test**,INSERT vàcleanup DELETE chỉ exact ledger-owned rows;không ghi Trip/Booking/User/Business/bảng khác. Native cap mới **7** gồm≤1 load-only+≤6 genuine inference,0 retry/hidden warm-up. Không production/benchmark/SYSTEM/schema/gate/Planner edits hoặc commit/push/deploy. **Không thiếu owner approval**;blocker là execution gate hiện tại.

Đã đọc bốn baseline reports được giao vàtoàn bộ artifact thiết kế trong [Data Readiness](evidence/t-ai-04-planner-test-data-readiness/),đặc biệt fixture/IDs/collision/FK/creation-cleanup/acceptance/manifest/cost oracle. [Review index](${e}baseline-review.json) giữ hashes/bytes/source paths;old evidence không sửa.

## 2. Quota gate trước write

[Fresh quota](${e}quota-preflight.json),[final recheck](${e}quota-final.json),[stop record](${e}stop.json).

| Mục | Actual |
|---|---:|
| Default normal quota |20/principal/hour|
| Historical records đã scan |97|
| Recent conservative entries |**12**|
| Còn lại |**8**|
| Full approved Agent turns |9|
| Conditional operator entry |1|
| Cần reserve |**10**|
| Thiếu |**2**|

Same principal SHA **${c.principalHash}**,source giữ từapproved historical attempt. Scan cả **at vàcreatedAt**,lấy timestamp mới nhất,0 future entries;recent12 gồm4 dry main+7 LIVE main+1 operator của lượt search resume. Không double-count native ledger,không bỏ dry/operator entries đã được conservative policy khóa. Không tạo attempt mới trong task này.

Chuỗi9 Agent turns:desktop incomplete1 +L01/L02/L03/L04 tối đa4 +conditional L05 thêm1 +desktop revoke1 +fresh mobile L06 thêm1 +mobile revoke1;conditional operator riêng1. Không được giả định model sẽ không clarify hoặcmodel đã resident để bỏ reservation. Theo snapshot ledger,thời điểm **sớm nhất có thể kiểm lại** đủ10 là **11/11/2026 10:17:32.409 Asia/Saigon** (03:17:32.409Z),nếu không có attempts mới. Đây **không phải lịch chạy hay quyền tự resume**;mốc này không thay fresh quota/readiness/isolation kiểm lại. Sau regression vẫncòn8;đã dừng.

## 3. PHASE A — database read-only subgates

[DB preflight](${e}db-preflight.json),[result](${e}preflight-readonly-result.json),[read-only harness](${e}readonly-db.cjs). Exact configured **127.0.0.1:5432 /travelgo_ai_m0_test**,sentinel **hugotravel-isolated-test-database-v1**,**12/12 migration checksums** DB=source=approved baseline;schema fingerprint **7805ddb1eb77028bfef96923c8adb8f0224bd54296dac39910546035154c544f** khớp. Current server internal IP172.18.0.3/32.

Startup/per-connection **default_transaction_read_only=on**,actual **transaction_read_only=on**;ORM SELECT/SHOW allowlist. Initial read audit96 queries/3 connections,0 forbidden SQL;final read-only audit riêng trong final compare. Role **postgres superuser/bypassRLS=true**,không least-privilege. Không thử write,không ALTER/GRANT hoặcdatabase khác. Read-only subgates PASS;**không nhận toàn PHASE A/write gate PASS** vì maintenance isolation chưa thiết lập vàquota đã stop.

## 4. Maintenance isolation — chưa establish

[Observation](${e}maintenance-isolation-observation.json):không thấy connection khác trong snapshot current DB ngoàiquery đang kiểm. **Snapshot trống không chứng minh các connection tương lai không thể ghi**,đặc biệt vớirole superuser. Không mở maintenance DML connection,không acquire write-exclusion locks,không sửa grants hoặcterminate process khác. Isolation/write guard **NOT ESTABLISHED / NOT RUN**,không gọi làPASS. Trước bất kỳ resume INSERT,nó vẫn làgate bắt buộc độc lập vớiquota.

## 5. Exact fixture profile vàcollision/FK

[Fresh fixture checks](${e}fixture-preflight.json),[baseline22 Place row hashes](${e}baseline-place-row-hashes.json). Approved full attributes lấy nguyên từold fixture-proposal.json;không đổi ID/slug/price/coords:

| Record | UUID | Price VND | Coordinates |
|---|---|---:|---|
|A01|f7433d4a-5f49-4991-8add-b55435b02eb0|100000|16.25,108.25|
|A02|5a1e8835-770c-41a2-8699-74deba239a86|150000|16.20,108.27|

Tên[TEST FIXTURE],category attraction,city/province Đà Nẵng,status APPROVED,business_id NULL vàcác field còn lại theoapproved JSON. Fresh ID/slug collisions0;FK refs0 trênblog_posts/bookings/tickets/tour_places/user_favorites;Trip selected_place_ids/itinerary JSON refs0. Actual constraints khớpdesign. Các PASS này chỉ làread-only checks,không chứng minh đã tạo fixture.

## 6. PHASE B — fixture ledger

[Ledger](${e}fixture-ledger.json):**NOT RUN_BLOCKED_BEFORE_WRITE_INTENT**. Approved IDs cóghi rõ nhưng **insertedIds=[]**,committedRowHashes=[],affectedRows0,transaction NOT STARTED. Không bịa createdAt/updatedAt/row hashes. No upsert/update/delete baseline rows,không disable FK/trigger/CASCADE/SET NULL. Không có trạng thái places24 hoặcfingerprint “chỉ khác2 fixture” trong run này;places luôn22.

## 7. Catalog eligibility hiện tại

[Current public-loader snapshot](${e}catalog-preflight.json):14 APPROVED loader rows,hai fixture chưa có. Source Business filter vẫn loại4 suspended-business hotels;cáceligible Đà Nẵng giữ HuGo Seafood350000 VND vàHuGo Riverside Hotel1200000 VND;không eligible attraction/tour đúngĐà Nẵng. Không nhận approved synthetic fixture data làtourism production completeness. Original source/eligibility không đổi.

## 8. PHASE C — direct Planner

**NOT RUN** vì chưa cófixture quaPHASE A/B. Không gọi production Planner để tạo kết quả từempty sightseeing,không fake itinerary hoặcinject loader. Scenario vẫnHuế→Đà Nẵng,2036-04-22→23,2 adults,6400000 VND,car. Date/day/night,one sightseeing/day,IDs exactly-once,hotel/meal assignments,costs,selectedPlaceIds,ETA vàpublic provenance **chưa có actual output để chấm**. Direct-service low-budget/invalid-field controls theoPHASE C cũngNOT RUN;offline regression riêng không thay cho chúng.

## 9. Independent oracle — chưa measured

Profile2 design dự kiến **2 ngày/1 đêm**,A02day1/A01day2,costs day1**2600000**,day2**900000**,grand total**3500000 VND**,budget remaining**2900000**. Đây làold staticcost design;không gánPASS từsố3500000 trước actual Planner. Low-budget100000 cho profile2 dự kiếnoverBudget3400000;không lấyminimum1-row oracle3200000/3100000 áp nhầmprofile2. Không sửa historical oracle/expected. Fidelity oracle/native-ready direct outputs **chưa khóa**.

## 10. PHASE D — manifest vàPOST ledger

[Blocked plan snapshot](${e}manifest-blocked.json) status **NOT_EXECUTABLE_BLOCKED_QUOTA_PREWRITE**,giữdraft exact messages/cases vàapproval/profile hashes,không giả manifest ready. Native body capture/lock chưa thực hiện,direct-service oracle chưa có.

[POST ledger](${e}native-post-ledger.json):load-only0,inference0,total**0/7**,retry0,hidden warm-up0;attempts=[]. Chưa instantiate live provider hoặcstart backend LIVE/G2. Không dùngcap dư cũ hoặc7 POST được duyệt đểbỏ quaquota gate. Full chain TTL15min/readiness/auth execution chưa được chứng minh.

## 11. Raw decisions L01–L06

| Case | Current result |
|---|---|
|L01 incomplete→complete car|NOT RUN|
|L02 budget9000000 correction|NOT RUN|
|L03 approved date correction|NOT RUN|
|L04 natural motorbike correction|NOT RUN|
|L05 conditional explicit click|NOT RUN;không click hoặcauto-resend|
|L06 fresh mobile complete|NOT RUN|

Native raw0,schema-evaluated0,semantic-compared0;**RAW_NLU NOT EVALUATED**,không gọiquota blocker làraw NLU FAIL hoặcPASS. Không model-output repair,tool synthesis hoặcshift expected. Nếu resume sau nàyraw clarify không cần thiết,raw FAIL phải giữ độc lập,vàL05 chỉ lànew user-confirmed turn trongmanifest đã duyệt.

## 12. G2 history

**NOT RUN LIVE**. Không tạo conversation/session UUID,không nhận revision hoặcverified state thật choPlanner ởrun này. Revoke/dispose LIVE N/A vì0 live sessions;không claim lifecycle PASS. Backend68 vàfrontend49/mocked74 mới cóevidence offline riêng. Current default-OFF/local-demo/absoluteTTL15min/server-created ID/owner proof/auth source giữ nguyên.

## 13. Execution safety

Prewrite stop tuân thủgate:0 entity writes,0 inference/tool invocation,0 scope bypass. SQL guardedREAD ONLY vàaudit0 forbidden SQL. **Model→gate→plan_trip LIVE safety NOT RUN**,không suy từno execution rằngwhole-chain safety PASS. Không shared .env/global G2/limits reset/account substitution. Offline mocked providers/executors không phảiLIVE evidence.

## 14. Real Planner fidelity

**NOT RUN**:không actual direct itinerary,tool invocation,result-source comparison hoặcUI price/date/ETA comparison vớifixture DB. Staticcost oracle/historical searchfidelity/controlled mock output không thay choPlanner fidelity. Syntheticplace/price vẫnphải gắn[TEST FIXTURE] nếu sau nàyđược tạo;không market quote hoặcbooking.

## 15. Desktop/mobile Browser LIVE

**NOT RUN** ởcả1440×900 và390×844. Browser74 regression **MOCK_ONLY**,giữđúngcách phân loại;không actualReact→backend→Qwen→Planner→DB chain. Không test-signed JWT LIVE hoặcreal-login claim mới. Không cóscreenshot LIVE đểnghiệm thu.

## 16. Runtime/GPU/native audit

Model/tag/digest/endpoint/options chỉ làapproved baseline reference;current GET version/tags/ps,residency,GPU/RAM/readiness/latency/tokens/deadline/abort **NOT RUN /NOT EVALUATED** vìquota stop xảy ra trướcmodel preparation. Không load/preload/unload/model switch/timeout increase.

[Final native audit](${e}native-final-audit.json) đọc localOllama server.log window trước/sauoffline regression: **0 POST** thêm;task không cónative dispatch. Đây làledger+local log scope,không OS-wide packet capture. Không córuntime sample mới đểđóngP2.

## 17. PHASE F — cleanup vàfinal DB

**DB_CLEANUP N/A_NO_INSERT**:không fixtuređược tạo nênkhôngcleanup DELETE,revoke hoặcforced erasure. Khôngresidualowned IDs. [Final DB comparison](${e}final-db-comparison.json),[before](${e}fingerprint-before.json),[after read](${e}fingerprint-after.json),[final after regression](${e}fingerprint-final.json):**25/25 unchanged**,changed=[],places**22→22**,Trip**27→27**,cảhaiapproved UUID vẫnabsent. Full table-rowhash expression giữnhưbaseline;beforecũngkhớpData Readiness snapshot.

Kết quả là **DB_UNCHANGED_25_25_NO_INSERT**,**không dùngDB_RESTORED_25_25** vìkhông cóinsert/cleanup đểchứng minhrestore. Không CLEANUP_BLOCKED_OWNER_REVIEW/residualfixtureclaim khi0 committedinserts. Nếu resume cóinsert sau này,cleanupexact IDs+fullrowhash/FK/TripJSON/isolationvẫn bắt buộc,tránhCASCADE/SETNULL/unknownrefs.

## 18. Regression/build sau stop

Không cầncleanupDML;đã hoàn tấtoffline regressionđược yêu cầu sau prewrite stop. [Summary](${e}regression-summary.json),[execution](${e}final-verified/execution.json),[boundary audit](${e}offline-boundary-audit.json).

| Suite | Kết quả mới |
|---|---|
|Frontend G1/G2 unit|**10/10 +39/39 PASS**|
|Mocked browser|**74/74 PASS**,desktop37/mobile37,0 skip/flaky/retry|
|Backend G2/Natural/Compatibility|**68/68,79/79,61/61 PASS**|
|Correction/Completeness|**42/42,52/52 PASS**|
|Original legacy181|**145 PASS/36 FAIL**,case-by-case baseline match|
|Isolated downstream controls181|**176 PASS/5 FAIL**,không production-policy acceptance|
|Readiness/diagnostics|Actual**32/1,8/5**;controls**33/0,13/0**,không regression mới|
|Foundation single-intent control|**22/22 PASS**,original17/5 giữnguyên|
|Historical F unmodified|Exit1 fail-fast nhưbaseline,không giả fullPASS|
|Frontend/backend build|**PASS/PASS**|

Legacy181 gồm171 backend+10 originalfrontendG1 cases. Original assertions/registrations/names/status giữ nguyên;derived continue-after-failure runners vàisolated assessor controls minh bạch,không tínhcontrols làproductionPASS. ${audits.length} processaudit files ghi0 forbidden network/PG connect;NODE_OPTIONS deny-nativeguard kế thừa,APIbrowsermock/deadproxy. FinalDB vànative log kiểmđộc lập khôngwrite/POSTthêm.

## 19. Integrity vàacceptance theo lớp

[Before](${e}integrity-before.json)/[after](${e}integrity-after.json):**${Object.keys(after).length} protectedfiles unchanged**,changed=[];DataReadiness33 artifacts/report,oldresume/search evidence,benchmarks/V2 locks và84 compiledmodules hash-match. Chỉnewreport/evidence/harness;build/deriveddist làgenerated output. Workingtreecóchanges từtrước,khôngrevert/claimclean. [Seal](${e}artifact-checksums.json).

| Lớp | Trạng thái thực |
|---|---|
${layerTable}

**P1 raw NLU OPEN**,**P2 runtime OPEN**;H01FIXED/search2rawPASS lịch sửgiữ nguyên. Không closeissue từofflinebuild/guards,không wholePlannerPASS.

## 20. NEXT TASK PLAN vàđiểm dừng

LượtPlannerLIVEhiện tạiđãdừng **BLOCKED_QUOTA_PREWRITE**. Khi được yêu cầuresume trongphạm viđãduyệt,cầnfreshquota đủtoànchuỗi,maintenancewrite isolation cóenforcement,DB/schema/collision/rowhashguards;chỉsauđó mớiINSERTprofile2→directPlanneractual3500000verification→lockmanifest/nativebodies→readiness→cappedLIVE→safecleanup→finalfingerprint. Không cầnngầmđổiprofile/ID/expected,không bypassquota hoặcauto-chạykhimốclýthuyếtđến.

NEXTTASKtheoyêucầu: **T-AI-04-V2-LIVE-EVALUATION-READINESS**,**chỉđềxuất**,cònphụthuộcPlannerLIVEchưađượcnghiệmthu. Không chạyV2/benchmark,inferencebổsung hoặcdeploy.

**DỪNG SAU BÁO CÁO.**
`;
// This task's report only: consistent spacing after punctuation, no edits to old docs.
const clean=report.replace(/,(?=\S)/g,', ').replace(/;(?=\S)/g,'; ').replace(/và(?=[A-Za-z0-9])/g,'và ').replace(/đúngcách/g,'đúng cách');
c.fs.writeFileSync(c.path.join(c.root,c.report),clean,{flag:'wx'});
const links=[...clean.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]);for(const l of links)if(!l.endsWith('/artifact-checksums.json'))c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',l)),l);
c.write('report-validation.json',{at:new Date().toISOString(),status:'PASS',sections:20,links:links.length,classification:'BLOCKED_QUOTA_PREWRITE',layersReported:Object.keys(statuses),noInheritedLivePass:true,noRestorationClaim:true});
const hashes={};for(const f of c.fs.readdirSync(c.evidence,{recursive:true})){const path=c.path.join(c.evidence,f);if(c.fs.statSync(path).isFile()&&f!=='artifact-checksums.json')hashes[f.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(path));}
c.write('artifact-checksums.json',{at:new Date().toISOString(),status:'FINAL_INTEGRITY_PASS_EXECUTION_BLOCKED_QUOTA',report:c.report,reportSha256:c.sha(c.read(c.report)),hashes});
for(const l of links)c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',l)),l);
console.log(JSON.stringify({report:c.report,classification:'BLOCKED_QUOTA_PREWRITE',quota:{available:8,required:10},fixturesInserted:0,nativePosts:0,db:'25/25 unchanged,Trip27/27',regression:'49/74/68/79/61/42/52 PASS;legacy145/36 preserved',protectedFiles:Object.keys(after).length,artifacts:Object.keys(hashes).length}));
