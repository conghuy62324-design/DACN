// Review only: saved evidence, integrity checks and report. No network or DB.
const c=require('./common.cjs');
const plan=c.json(c.prefix+'manifest.json'),lock=c.json(c.prefix+'manifest-lock.json'),run=c.json(c.prefix+'results.json'),phase=c.json(c.prefix+'phase-a-gate.json'),pre=c.json(c.prefix+'preflight-initial.json'),final=c.json(c.prefix+'native-final-audit.json');
c.assert.equal(phase.status,'PHASE_A_PASS');c.assert.equal(pre.status,'PASS_READONLY_AND_GET_ONLY');c.assert.equal(c.sha(c.read(c.prefix+'manifest.json')),lock.sha256);
c.assert.equal(c.sha(c.read(c.prefix+'run-live.cjs')),lock.harnessSha256);c.assert.equal(c.sha(c.read(c.prefix+'binding.cjs')),lock.bindingSha256);
for(const[file,hash]of Object.entries(plan.sourceCompiled))c.assert.equal(c.sha(c.read(file)),hash,file);
c.assert.equal(run.results.length,7);c.assert.ok(run.results.every(x=>x.status==='PASS'));c.assert.equal(run.nativePosts.length,3);c.assert.equal(run.providerPending,0);c.assert.equal(run.remainingSessions.sessions,0);
const rows=[];
for(const id of ['E01','E07']){
 const item=run.results.find(x=>x.id===id),expected=plan.cases.find(x=>x.id===id),native=c.json(c.prefix+'ollama-response-'+id+'.json');
 c.assert.deepEqual(item.rawDecision,expected.expected.raw);c.assert.deepEqual(item.executed[0].arguments,item.rawDecision);c.assert.equal(item.executed.length,1);c.assert.equal(item.gates.length,1);c.assert.equal(item.gates[0].result.status,'ALLOW');
 c.assert.deepEqual(item.executed[0].result,expected.expected.serviceResult);c.assert.deepEqual(item.api.body.data.result,expected.expected.serviceResult);c.assert.deepEqual(item.renderedPlaces,expected.expected.serviceResult.places);
 c.assert.ok(item.executed[0].dbQueriesAfter>item.executed[0].dbQueriesBefore);c.assert.equal(item.finalRequest.actorHash,c.principalHash);
 c.assert.equal(item.stateAfter.slots.destinationCity.value,'Đà Nẵng');c.assert.equal(item.stateAfter.slots.dailyBudgetPerPerson.value,expected.expected.raw.arguments.dailyBudgetPerPerson);
 c.assert.deepEqual(Object.keys(item.stateAfter.slots).sort(),['dailyBudgetPerPerson','destinationCity']);
 c.assert.equal(c.sha(c.read(c.prefix+expected.nativeBody.file)),expected.nativeBody.sha256);c.assert.equal(native.bodySha256,expected.nativeBody.sha256);
 rows.push({id,browserLive:item.ui,rawNlu:item.rawNlu,schema:item.schemaValid,runtimeValidator:item.runtimeValid,history:item.history,safety:item.safety,fidelity:item.fidelity,runtime:item.runtime,gate:'ALLOW',executionCount:1,dbQueryDelta:item.executed[0].dbQueriesAfter-item.executed[0].dbQueriesBefore,actualNativeRaw:native.envelope.message.content,expected:expected.expected.raw,nativeMs:native.elapsedMs,providerMs:item.providerElapsedMs,browserTurnMs:item.elapsedMs,promptTokens:native.envelope.prompt_eval_count,cachedPromptTokens:native.envelope.prompt_eval_cached_count,outputTokens:native.envelope.eval_count,conversation:item.metadata});
}
const d1=run.results.find(x=>x.id==='D01'),d2=run.results.find(x=>x.id==='D02'),reset=run.results.find(x=>x.id==='D-RESET');
c.assert.equal(d1.metadata.id,d2.metadata.id);c.assert.equal(reset.metadata.id,d1.metadata.id);c.assert.equal(reset.metadata.expiresAt,d1.metadata.expiresAt);c.assert.equal(rows[0].conversation.expiresAt,d1.metadata.expiresAt);
c.assert.ok(!('id' in d1.finalRequest.body.conversation));c.assert.ok(!('id' in run.results.find(x=>x.id==='E07').finalRequest.body.conversation));
const ids=run.results.filter(x=>x.finalRequest.body?.conversation).map(x=>x.finalRequest.body.conversation.requestId);c.assert.equal(new Set(ids).size,ids.length);c.assert.ok(!ids.includes(d1.metadata.id));
const suites=['agentMissingSlotRecovery','agentSlotFillingPrompt','agentG1SafeContract','agentDecisionRouting','agentDecisionFormatSafety','agentFoundation','agentTransport','agentContractSlotInvestigation.g1-applicable'];
const comparisons=[];
for(const layer of ['actual-policy','downstream-control']){
 // Historical legacy181 includes the unchanged10-case frontend G1 suite.
 const frontendLegacy=c.json(c.prefix+'frontend-g1-final.json');c.assert.equal(frontendLegacy.passed,10);c.assert.equal(frontendLegacy.failed,0);
 let passed=frontendLegacy.passed,failed=0;
 for(const name of suites){const a=c.json(c.previous+`final-verified/${layer}-${name}.json`),b=c.json(c.prefix+`final-verified/${layer}-${name}.json`);const project=x=>x.results.map(r=>({name:r.name,status:r.status}));c.assert.deepEqual(project(a),project(b),layer+name);passed+=b.passed;failed+=b.failed;}
 comparisons.push({layer,passed,failed,caseByCaseBaselineMatch:true,composition:'171 backend cases +10 original frontend G1 cases'});
}
c.assert.equal(comparisons[0].passed,145);c.assert.equal(comparisons[0].failed,36);c.assert.equal(comparisons[1].passed,176);c.assert.equal(comparisons[1].failed,5);
const execution=c.json(c.prefix+'final-verified/execution.json').execution;
for(const [name,count]of [['new-completeness',52],['new-execution-correction',42]]){const x=execution.find(x=>x.name===name);c.assert.equal(x.passed,count);c.assert.equal(x.failed,0);}
const extra=c.json(c.prefix+'additional-offline-results.json');for(const [name,count]of [['g2-68',68],['natural-79',79],['compatibility-61',61]]){const x=extra.results.find(x=>x.name===name);c.assert.equal(x.passed,count);c.assert.equal(x.failed,0);}
const foundation=c.json(c.prefix+'foundation-fixture-diff.json');c.assert.equal(foundation.derivedSha256,c.sha(c.read(c.prefix+'agentFoundation.baseline-copy.js')));c.assert.equal(foundation.derivedSha256,c.sha(c.read(c.prefix+'agentFoundation.execution-correction-fixture.js')));
c.assert.match(c.read(c.prefix+'foundation-single-intent-control.log').toString(),/"passed"\s*:\s*22/);
const browser=c.json(c.prefix+'browser-01/results.json'),unit=c.json(c.prefix+'frontend-unit-final.json');c.assert.equal(browser.stats.expected,74);c.assert.equal(browser.stats.unexpected,0);c.assert.equal(browser.stats.skipped,0);c.assert.equal(browser.stats.flaky,0);c.assert.deepEqual(browser.errors,[]);
c.assert.equal(c.json(c.prefix+'browser-01/execution.json').code,0);c.assert.ok(unit.results.every(x=>x.exitCode===0));c.assert.equal(unit.results.reduce((n,x)=>n+x.passed,0),49);c.assert.equal(c.json(c.prefix+'frontend-build-final.json').exitCode,0);
const audits=c.fs.readdirSync(c.path.join(c.evidence,'regression-audit')).map(name=>({file:name,...JSON.parse(c.fs.readFileSync(c.path.join(c.evidence,'regression-audit',name)))}));c.assert.ok(audits.length>0);c.assert.ok(audits.every(a=>a.postgresConnectAttempts===0&&a.forbiddenNetworkAttempts===0));
c.write('regression-comparison.json',{at:new Date().toISOString(),legacy:comparisons,requiredBackend:[68,79,61,42,52],frontendUnit:49,mockedBrowser:{passed:74,failed:0,skipped:0,retry:0},foundation:{passed:22,failed:0,derivedFixtureMatchesBaseline:true,original: '17/5 preserved'},readiness:{actual:'32/1',control:'33/0'},diagnostics:{actual:'8/5',control:'13/0'},builds:{frontend:'PASS',backend:'PASS'},initialFoundationRunner:'NOT RUN due write-once EEXIST before tests; preserved initial FAIL runner status; reran only unchanged Foundation control successfully',assertionsChanged:0});
c.write('offline-boundary-audit.json',{at:new Date().toISOString(),auditFiles:audits.length,postgresConnectAttempts:0,forbiddenNetworkAttempts:0,audits,additionalNativePosts:0,proof: 'Native final audit server log confirms same3 POST after all regression. Browser API mock/dead proxy; test Node deny-native wrapper inherited.',npmAuditFilenameCollision:'One npm bootstrap EEXIST for reused Windows PID; original log preserved. UUID-suffixed output fixes evidence naming only. Playwright exit0/74 PASS/no errors.'});
c.write('results-reviewed.json',{at:new Date().toISOString(),classification:'SEARCH_LIVE_E2E_RESULT_RECORDED / PLANNER_E2E_BLOCKED_DATA_READINESS',phaseA:'PHASE_A_PASS',rows,liveHttpCases:7,deterministicSetupAndCleanup:5,rawNlu:{evaluated:2,passed:2,failed:0,notEvaluatedDeterministic:5},nativePosts:{loadOnly:1,inference:2,total:3,cap:3,retry:0,hiddenWarmup:0},history:{ownerHash:c.principalHash,serverCreatedIds:true,absoluteExpiryPreserved:true,freshRequestIds:ids.length,activeSessionsAfter:0,naturalExpiryAndReplayLive:'NOT RUN in resume; prior replay evidence and offline suites kept separate'},planner:'BLOCKED_DATA_READINESS',realLogin:'NOT RUN; authenticated test session via test-signed JWT',P1:'OPEN',P2:'OPEN',visualReview:{E01:'DOM exact names/prices passed; full-page screenshot has fixed navbar overlapping part of cards. Do not claim unobstructed pixel-perfect screenshot.',E07:'Actual mobile screenshot shows both exact place names/prices and catalog warning; emulated390x844, not physical device.'},limitations:['No full Planner success, no live natural TTL wait/logout/reload/G1 switch/in-flight race rerun','No global JWT revocation claim','No OS-wide packet capture or least-privilege DB role claim','Initial PhaseA Vite environment block and offline runner authoring errors retained; do not mix them with raw/model scoring']});
const baseline=c.json(c.prefix+'integrity-before.json').hashes,after=c.snapshot();c.assert.deepEqual(after,baseline);const integrity=c.integrity();
c.write('integrity-after.json',{at:new Date().toISOString(),status:'PASS',hashes:after,protectedFiles:Object.keys(after).length,changed:[],historical:integrity,compiledFiles:Object.keys(plan.sourceCompiled).length,compiledHashesMatch:true,originalE01E07AndScoringUnchanged:true,productionChanges:0});
const e='evidence/t-ai-04-g2-e2e-harness-fix-resume/';
const nativeRows=rows.map(x=>`| ${x.id} | ${x.nativeMs.toFixed(1)} | ${x.providerMs.toFixed(1)} | ${x.browserTurnMs} | ${x.promptTokens} / ${x.cachedPromptTokens} / ${x.outputTokens} |`).join('\n');
const scoreRows=rows.map(x=>`| ${x.id} | ${x.browserLive} | ${x.rawNlu} | ${x.history} | ${x.safety} | ${x.fidelity} | ${x.runtime} |`).join('\n');
const report=`# T-AI-04-G2-E2E-HARNESS-FIX-AND-RESUME

Ngày **11/11/2026**, Asia/Saigon. **PHASE_A_PASS**; desktop E01 và mobile E07 đã hoàn tất Browser → Agent → Ollama → real Catalog → PostgreSQL, **cả hai PASS** trong phạm vi search đã khóa. **1 load-only +2 inference =3/3 native POST**, không retry/hidden warm-up. PostgreSQL **25/25 bảng unchanged, Trip27/27**, source/benchmark/evidence cũ nguyên vẹn. Planner vẫn thiếu dữ liệu; **P1/P2 OPEN**.

**SEARCH_LIVE_E2E_RESULT_RECORDED / PLANNER_E2E_BLOCKED_DATA_READINESS**

## 1. Baseline và phạm vi

Đã đọc đầy đủ bốn báo cáo được giao và diagnosis/proposed patch/manifest/results-reviewed/data-readiness của lượt cũ. Baseline giữ nguyên:6 LIVE checks PASS,H01 harness FAIL,0 native POST; E01/E07 cũ NOT RUN; Planner blocked; frontend49/74,backend68/79/61/42/52; legacy145/36. [Owner task](${e}owner-task.txt) cấp ngân sách **mới**, không kế thừa cap cũ. Không production edits,benchmark edits,fixture,DB mutation,V2 LIVE hoặc deploy.

## 2. Harness root cause và review patch

Hàm cũ chỉ thay khi toàn bộ string là token, vì vậy URL reset vẫn chứa literal \`$desktop.id\`. Frontend đã gửi server-created ID đúng. Giữ nguyên run/500/evidence gốc. Proposed \`replaceAll\` đã review nhưng có nguy cơ thay substring không phải token; chọn [binding.cjs](${e}binding.cjs): complete lexical tokens, recursive value binding giữ numeric types, explicit URL component encoding, unresolved/nested token reject. Không lấy client UUID làm session ID. [Review/derivation](${e}harness-review.json), [runner](${e}run-live.cjs), [preparation](${e}prepare-harness.cjs).

## 3. Offline acceptance

[12 independent checks](${e}binding.test.cjs), [log](${e}binding-acceptance-02.log): **12 PASS/0 FAIL**. Whole value,absolute URL/path,reset/revoke,start/continue,UUID uniqueness/replay,server-ID binding,unknown token,wrong endpoint/method/body/client ID,template hash,encoding và partial-substring cases đều được kiểm. Exact method/path/body,template hash,canonical bound-body hash,raw body hash evidence,native exact bytes và compiled hashes vẫn giữ.

## 4. Dry integration và PHASE A gate

Actual React/Vite → local HTTP Express → production router/auth/Agent/store/reset/revoke, fake provider/consent,in-memory sessions. [Dry results](${e}dry-02/results.json): **5/5 PASS** gồm start,continue,reset,foreign-owner revoke404,owned revoke200/session removed. Reset giữ ID/expiry và tăng revision2→3; fake provider không được gọi. [Gate](${e}phase-a-gate.json): **PHASE_A_PASS**,0 Ollama POST,0 PostgreSQL connections,source/history integrity PASS.

Lượt offline ban đầu bị sandbox chặn Vite/esbuild đọc thư mục cha,0 app checks; [log](${e}dry/vite-live.log) và [initial gate](${e}phase-a-gate-initial.json) giữ nguyên. Các boolean integration trong initial gate mô tả planned coverage,không phải measured PASS; [erratum](${e}offline-environment-initial.json) phân loại **NOT RUN**. Chạy lại offline trong fresh dry-02 với quyền đọc phù hợp,không đổi production/expected. PHASE B chỉ bắt đầu sau final gate PASS.

## 5. Resume manifest và setup

[Manifest](${e}manifest.json) SHA-256 **${lock.sha256}**, [lock](${e}manifest-lock.json). Tham chiếu manifest cũ/hash và6 PASS đã đo; exact E01/E07 cases/native bodies/scoring giữ nguyên. Native hashes: E01 **${plan.cases.find(x=>x.id==='E01').nativeBody.sha256}**, E07 **${plan.cases.find(x=>x.id==='E07').nativeBody.sha256}**.

Old process/session đã dispose. D01/D02 là prerequisite duy nhất để có server-owned desktop ID/revision2; reset đưa revision3 để E01 continue đúng manifest cũ. Đây là setup bắt buộc,không retry inference cũ (cũ0). Không replay negative checks đã PASS. D-END/M-END chỉ cleanup owned memory sessions. Chuỗi **7 main Agent quota turns +1 conservative operator entry**, secondary LIVE0.

## 6. Quota,TTL,auth/consent preflight

[Preflight](${e}preflight-initial.json) **PASS_READONLY_AND_GET_ONLY**. Cùng principal SHA **${c.principalHash}**; scanner đọc cả \`at\`/\`createdAt\`, lấy timestamp mới nhất,scan tất cả historical attempts gồm4 main turns cũ; không dùng timestamp cũ như quota hiện tại. Run cũ đã ngoài rolling hour. Bốn main dry turns cùng principal được **tính bảo thủ thêm**,không loại khỏi ledger: recent4,còn16,đủ8. Sau LIVE:4 dry+7 main+1 operator=12 recent,còn8. Default20/h không reset/đổi account/bypass; AgentLimits process hydrate historical entries bảo thủ.

G2 TTL15 phút absolute,session IDs chỉ nhận response server; reset/continue không kéo dài expiry. Desktop ID **${rows[0].conversation.id}**,revision1→2→3→4,expiry **${rows[0].conversation.expiresAt}**. Mobile ID **${rows[1].conversation.id}**,revision1,expiry **${rows[1].conversation.expiresAt}**. Trước mỗi inference kiểm remaining TTL>90s,chain<15min,providerPending0,readiness và quota.

**Authenticated test session qua test-signed JWT/production authenticate**,không real-login E2E; approved UUID không có DB account,không tạo account hoặc đọc password. GET /auth/me chiếu signed test claims. Agent và consent read thật. G2 opt-in và exact LOCAL_DEMO_SLOTS_V1 acknowledgement bằng click thật; telemetry-consent panel chưa có decision được giữ nguyên,không click lưu vì sẽ ghi DB.

## 7. Ollama/model preflight

GET version/tags/ps,loopback listener process ollama,local-only/no proxy/cloud và exact digest đều PASS. Model **qwen3:4b-instruct-2507-q4_K_M**,digest **${c.digest}**,endpoint127.0.0.1:11434. Initial nonresident; conditional load-only theo exact body/deadline60000ms đã duyệt trả200/done_reason=load/response empty; không technical probe hay second load.

JSON mode,stream false,temp0,num_ctx16384,num_predict2048,application deadline15000ms,concurrency1 giữ nguyên. [Before-model](${e}preflight-before-model.json), [E01 readiness](${e}preflight-E01.json), [E07 readiness](${e}preflight-E07.json), [model-ready](${e}model-ready.json). Model resident exact16k trước cả hai inference; pending0,không eviction trong chuỗi. Verification ở URL/env/process/metadata/log scope,không OS-wide packet capture.

## 8. Database safety và current Catalog readiness

Exact **travelgo_ai_m0_test**,configured127.0.0.1:5432,sentinel **hugotravel-isolated-test-database-v1**,**12/12 migration checksums**,schema fingerprint match baseline. [DB guard](${e}db-preflight.json), [read-only harness](${e}readonly-db.cjs):startup/per-connection default_transaction_read_only=on,verify READ ONLY trước queries,SELECT/SHOW SQL guard;0 forbidden query. Role **postgres là superuser**,không least-privilege. Không thay grants/role/schema. Server internal Docker IP hiện172.18.0.3/32 (lượt trước .2); DB identity/sentinel/schema/migrations và25 table contents vẫn khớp.

[Fresh direct-service snapshot](${e}data-readiness.json) được đo trước inference,deepEqual exact expected cho cả hai budgets. **HuGo Seafood350000 VND,HuGo Riverside Hotel1200000 VND**. Snapshot readiness tách biệt khỏi actual tool E2E PASS. Không seed/migrate/truncate hoặc sửa Trip/Booking/user.

## 9. Native POST ledger

| Entry | Endpoint | HTTP | Count | Kết quả |
|---|---|---:|---:|---|
| OP-LOAD | /api/generate,empty prompt |200|1|done_reason=load,empty response|
| E01 | /api/chat |200|1|Exact raw search tool|
| E07 | /api/chat |200|1|Exact raw search tool|
| Tổng | | |**3/3**|0 retry,0 hidden warm-up|

\`ollama-attempt-*\` ghi trước dispatch,\`ollama-response-*\` giữ native raw/envelope/body SHA/resources/timing. [Final audit](${e}native-final-audit.json) đối chiếu server.log window **3 POST**,2 chat+1 generate,không phát sinh thêm sau regression. Sau cap chỉ cleanup memory/read-only audit; không gọi model thêm hoặc unload bằng POST.

## 10. Desktop E01 LIVE

Viewport **1440×900**,actual React/Vite3354→Express3355→production router/auth/Agent/provider/schema/gate/search executor→Catalog/PostgreSQL,**không Playwright route mocking**. Exact input: “Tìm địa điểm; Điểm đến: Đà Nẵng; Ngân sách mỗi người mỗi ngày: 462000 VND”. Fresh request UUID,continue ID/revision3; HTTP200 completed/revision4. Raw exact search_places/Đà Nẵng/462000;original schema/runtime valid,gate ALLOW,**1 actual read tool**,2 additional DB queries,exact Catalog result rendered. [Case](${e}case-E01.json), [screenshot](${e}E01.png).

## 11. Mobile E07 LIVE

Emulated **390×844**,không physical device. Exact input: “Tìm địa điểm; Điểm đến: Đà Nẵng; Ngân sách mỗi người mỗi ngày: 638000 VND”. G2 acknowledgement và fresh start UUID;server ID mới/revision1; HTTP200 completed. Raw exact search_places/Đà Nẵng/638000;schema/runtime valid,gate ALLOW,**1 actual read tool**,2 additional DB queries;hai place names/prices và Catalog warning render. [Case](${e}case-E07.json), [screenshot](${e}E07.png).

## 12. Raw NLU và scoring tách lớp

| Case | Browser/UI | Raw NLU | G2 History | Safety | Real Tool Fidelity | Runtime |
|---|---|---|---|---|---|---|
${scoreRows}

Native JSON trước fallback được parse bằng original schema/Ajv/parser/runtime validator và đối chiếu exact expected;review độc lập deepEqual raw decision/arguments,không repair output. **2 raw PASS/0 FAIL**,5 deterministic responses **NOT EVALUATED raw NLU**. Không lấy completeness hoặc direct Catalog readiness cộng vào raw/fidelity. [Reviewed results](${e}results-reviewed.json) giữ riêng từng lớp và native raw.

## 13. Verified History,lifecycle và Safety

Authenticated principal bind qua production owned store;server-created IDs/latest revisions,fresh request UUIDs vàcurrent-turn proof ghi SET destination/daily budget đúng. E01 intent search mới chỉ giữ2 search slots,không carry stale Planner budget/date/transport. Reset clear slots thật,giữ replay/absolute expiry. D-END/M-END revoke đúng owned session;final **0 active sessions,0 serialized travel bytes**,2 security-only start tombstones/1 owner epoch còn theo bounded TTL,không phải chat persistence/JWT revocation.

Mỗi inference ALLOW duy nhất1 read-only search tool;không unauthorized/stale execution/DB write. Ownership-negative revoke dry404 có evidence riêng. Natural15min expiry,replay/cross-owner negatives,logout/reload/G1 switch/in-flight races **NOT RUN LIVE trong resume**;6 kiểm tra lịch sử vàoffline regressions vẫn giữ độc lập. Không nhận resume đã mở rộng coverage sang các mục đó.

## 14. Real Catalog/UI fidelity

Actual executor output=locked fresh direct-service output=API result=rendered names/prices. Seafood **350.000 ₫**,Riverside **1.200.000 ₫**;cảnh báo giá catalog không phải booking quote giữ nguyên. Không fake place/price/itinerary hoặc Booking mutation. DOM assertions kiểm exact names,formatted prices,no horizontal overflow;mobile screenshot thấy rõ hai cards. Desktop full-page screenshot có fixed navbar che một phần tên card tại vị trí chụp;DOM checks PASS nhưng **không claim pixel-perfect/unobstructed screenshot**. Không sửa production CSS ngoài scope.

## 15. DB fingerprint và cleanup

[Before](${e}fingerprint-before.json), [after LIVE](${e}fingerprint-after.json), [after regression](${e}fingerprint-final.json), [final compare](${e}fingerprint-final-compare.json): **25/25 unchanged**,changed=[],Trip**27→27**. Before hiện tại cũng khớp fingerprint-final lượt cũ. Current identity/readonly/schema được kiểm lại,không tái dùng historical fingerprint làm phép đo mới.0 fixture/DB mutation/SQL cleanup;chỉ dispose memory,đóng đúng browser/backend/Vite child. Final port check3352/3354/3355 không còn listener.

## 16. Runtime và P2

| Case | Native POST ms | Provider wall ms | Browser turn ms | Prompt / cached / output tokens |
|---|---:|---:|---:|---|
${nativeRows}

Load-only **11842.0ms**,không tính là inference. Provider wall gồm readiness và synchronous harness integrity/resource checks trước native dispatch;nên không trộn với native latency. E07 có2236 cached prompt tokens,không hidden warm-up. No timeout/deadline/abort,pending0. Initial free RAM2521/16202MiB,VRAM5898/8188MiB;after E07 RAM1785MiB,VRAM1076MiB;model offload37/37 layers,16k context. [Runtime log](${e}native-log-window.json),[final audit](${e}native-final-audit.json).

Log có INFO waiting-for-runner “llm server error” trong authorized load vàcontext16384 nhỏ hơn training262144;load sau đó thành công. Không terminal load/GPU allocation failure,watchdog/timeout/abort trong window quan sát. Hai lượt search thành công **không đủ đóng P2 runtime lịch sử**;không đổi model/GPU flags/context/timeout để lấy PASS.

## 17. Regression/build và lỗi runner offline

| Suite | Actual kết quả mới |
|---|---|
| Frontend G1/G2 unit | **10/10 +39/39 PASS** |
| Mocked browser | **74/74 PASS**,desktop37/mobile37;0 skip/flaky/retry;MOCK_ONLY |
| Backend G2/Natural/Compatibility | **68/68,79/79,61/61 PASS** |
| Execution Correction/Completeness | **42/42,52/52 PASS** |
| Original legacy181 | **145 PASS/36 FAIL**,từng tên/status khớp baseline |
| Downstream isolated controls181 | **176 PASS/5 FAIL**,không production-policy PASS |
| Readiness/diagnostics | **32/1 và8/5** actual;controls**33/0 và13/0**,giữ historical conflicts |
| Foundation single-intent control | **22/22 PASS**,original17/5 giữ nguyên |
| Historical F unmodified | Exit1 fail-fast như baseline,không suy total PASS |
| Backend/frontend build | **PASS/PASS** |

[Comparison](${e}regression-comparison.json),[full execution](${e}final-verified/execution.json),[frontend units](${e}frontend-unit-final.json),[mock browser raw](${e}browser-01/results.json),[boundary audit](${e}offline-boundary-audit.json). Các offline Node processes kế thừa deny-native/PG connect guard;${audits.length} audit files ghi0 forbidden network/PG connect. Final server log xác nhận0 additional native POST,DB fingerprint không đổi.

Hai lỗi preparation mới được giữ raw evidence: (1) Foundation control ban đầu dừng EEXIST vì tôi copy sẵn file mà write-once runner sẽ tự sinh;giữ copy riêng rồi chạy lại **chỉ Foundation control**,unchanged assertions,22 PASS,hash derived fixture khớp baseline. [Observation](${e}foundation-runner-observation.json),initial status FAIL nằm nguyên trong additional-offline-results. (2) Windows tái sử dụng PID làm audit filename va chạm tại npm bootstrap;giữ log,đổi **chỉ filename** thànhPID+UUID. Browser vẫn exit0,74 PASS/errors0. [Observation](${e}audit-filename-observation.json). Không biến lỗi runner này thành production hoặc raw NLU FAIL/PASS.

## 18. Integrity và P1/P2

[Before](${e}integrity-before.json)/[after](${e}integrity-after.json): **${Object.keys(after).length} protected files unchanged**,changed=[],old report/evidence/manifest/benchmark vàoriginal tests giữ nguyên;${Object.keys(plan.sourceCompiled).length} compiled modules hash-match. Source production changes0;chỉ thêm report/evidence/test harness ở task mới. Build/derived test outputs nằm generated dist. [Artifact seal](${e}artifact-checksums.json) khóa report vàartifacts mới. Working tree đã có nhiều thay đổi từ trước,không claim clean Git tree/không revert chúng.

**H01 FIXED/OFFLINE+LIVE VERIFIED**. **TAI03B-B1-01 P1 raw NLU OPEN**,search2/2 không chứng minh natural correction multi-turn đã hết lỗi. **P2 runtime OPEN**,budget grammar/Map/VI14/T13-B untouched. Candidate SYSTEM B không apply. Không production rollout/commit/push/deploy,V2 inference hoặc Planner fixture.

## 19. Remaining Planner blocker và NEXT TASK PLAN

Đà Nẵng hiện0 eligible attraction/tour;fresh inventory giữ14 loader records,search public hotel/restaurant có data nhưngkhông đủ sightseeing cho Planner. **E02 completed Planner vàE03–E06 NOT RUN/BLOCKED_DATA_READINESS**;không tạo giả itinerary,không thay input sang city test để đạt PASS.

Đề xuất **T-AI-04-PLANNER-TEST-DATA-READINESS**: review current catalog eligibility/proof vàthiết kế data cần thiết cho original Planner scenarios;chủ dự án phải duyệt riêng trước mọi fixture/write,exact test DB scope,ID/FK ledger/cleanup/fingerprint vàmanifest review nếu cần thay data/input. Task hiện tại không thực hiện bước này,không tự mở V2 LIVE hoặc cap khác. **Dừng sau báo cáo.**
`;
c.fs.writeFileSync(c.path.join(c.root,c.report),report,{flag:'wx'});
const links=[...report.matchAll(/\]\(([^)]+)\)/g)].map(x=>x[1]);for(const link of links)if(link!==e+'artifact-checksums.json')c.assert.ok(c.fs.existsSync(c.path.resolve(c.root,'docs',link)),link);
c.write('report-validation.json',{at:new Date().toISOString(),status:'PASS',links:links.length,allExist:true,sections:19,classification:'SEARCH_LIVE_E2E_RESULT_RECORDED / PLANNER_E2E_BLOCKED_DATA_READINESS',noFurtherTaskExecuted:true});
const hashes={};for(const file of c.fs.readdirSync(c.evidence,{recursive:true})){const full=c.path.join(c.evidence,file);if(c.fs.statSync(full).isFile()&&file!=='artifact-checksums.json')hashes[file.replaceAll('\\','/')]=c.sha(c.fs.readFileSync(full));}
c.write('artifact-checksums.json',{at:new Date().toISOString(),status:'FINAL_INTEGRITY_PASS_SEARCH_RESULT_RECORDED',report:c.report,reportSha256:c.sha(c.read(c.report)),manifestSha256:lock.sha256,sourceHashes:c.json(c.previous+'artifact-checksums.json').sourceHashes,hashes});
c.assert.ok(c.fs.existsSync(c.path.join(c.evidence,'artifact-checksums.json')));
console.log(JSON.stringify({report:c.report,classification:'SEARCH_LIVE_E2E_RESULT_RECORDED / PLANNER_E2E_BLOCKED_DATA_READINESS',phaseA:'PHASE_A_PASS',search:'2/2 PASS',nativePosts:3,protectedFiles:Object.keys(after).length,artifacts:Object.keys(hashes).length,legacy:comparisons}));
