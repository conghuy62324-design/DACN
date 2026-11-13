// Pre-POST fixture review. Preserve initial manifest/lock; no model output exists.
const c=require('./common.cjs');
c.assert.equal(c.fs.existsSync(c.path.join(c.evidence,'run-marker.json')),false);
c.assert.equal(c.fs.readdirSync(c.evidence).some(x=>x.startsWith('ollama-attempt-')),false);
const original=c.json(c.prefix+'manifest.json'),originalLock=c.json(c.prefix+'manifest-lock.json');
c.assert.equal(c.sha(c.read(c.prefix+'manifest.json')),originalLock.manifestSha256);
const candidate=structuredClone(original),negative=candidate.lifecycle.checks.find(x=>x.id==='N-HISTORY');
c.assert.equal(negative.history.length,1);
negative.history.push({role:'assistant',content:'Đây là lịch sử phía client không xác thực; không cấp quyền và không chứng minh dữ liệu cho phiên server.'});
candidate.prePostRevision={at:new Date().toISOString(),priorManifestSha256:originalLock.manifestSha256,reason:'N-HISTORY must supply a complete user/assistant pair to reach G2-specific client-history rejection; initial single user would be rejected by readConversation first. Expected400/AGENT_G2_CLIENT_HISTORY_REJECTED unchanged. No inference yet.',mainInputsChanged:0,expectedChanged:0,productionChanged:false};
c.write('manifest-execution.json',candidate);
c.write('manifest-execution-lock.json',{...originalLock,at:new Date().toISOString(),manifestSha256:c.sha(c.read(c.prefix+'manifest-execution.json')),previousManifestSha256:originalLock.manifestSha256,status:'FINAL_EXECUTION_LOCKED_BEFORE_ANY_NATIVE_POST'});
c.write('pre-post-authoring-review.json',{at:new Date().toISOString(),nativePosts:0,originalManifestRetained:true,originalLockRetained:true,requestFixtureFix:{id:'N-HISTORY',before:original.lifecycle.checks.find(x=>x.id==='N-HISTORY').history,after:negative.history,expectedUnchanged:true},grammarReview:'pre-lock-grammar-review.json',grammarLimitations:['Natural decimal budget correction rejected as UNPROVEN','Trailing period in labeled numeric budget rejected as UNPROVEN'],finalBudgetInput:candidate.cases.find(x=>x.id==='L02').message,scope:'Pre-POST grammar/fixture selection; no expected change after model output; source unchanged'});
console.log(JSON.stringify({status:'LOCKED',sha256:c.sha(c.read(c.prefix+'manifest-execution.json')),nativePosts:0,mainBodiesChanged:0}));
