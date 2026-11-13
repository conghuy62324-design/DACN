// Pure in-memory reproductions, no model/executor/database.
const c=require('./common.cjs'),{randomUUID}=require('node:crypto'),{LocalVerifiedHistoryStore,G2_CONSENT_VERSION}=require(c.path.join(c.root,'backend/dist/agent/verifiedHistory.js'));
const owner='77777777-2222-4222-8222-777777777777',store=new LocalVerifiedHistoryStore();
const req={action:'start',requestId:randomUUID(),consentVersion:G2_CONSENT_VERSION},full='Lập lịch trình từ Vinh đến Quy Nhơn, từ 12/05/2050 đến 14/05/2050, 2 người lớn, 8,4 triệu đồng cả nhóm, ô tô.';
const decision={kind:'tool',name:'plan_trip',arguments:{departureCity:'Vinh',destinationCity:'nơi nào cũng được',startDate:'2050-05-12',endDate:'2050-05-14',adults:2,totalBudget:8400000,transportation:'car'}};
const first=store.begin(owner,req,full),meta=first.metadata();first.finish();
const second=store.begin(owner,{action:'continue',id:meta.id,revision:meta.revision,requestId:randomUUID(),consentVersion:G2_CONSENT_VERSION},'Tôi muốn đi nơi nào cũng được.');
const indef={id:'G2-F01',message:'Tôi muốn đi nơi nào cũng được.',missing:second.missing,gate:second.check(decision),expected:'No ALLOW, invalidate destination'};second.finish();
const revoke=store.revoke(owner,meta.id.toUpperCase());const idcase={id:'G2-F02',result:revoke,sessionsAfterRevoke:store.stats().sessions,expected:0};store.dispose();
c.write('security-findings-before.json',{at:new Date().toISOString(),tier:'OFFLINE_PURE_STORE_NO_TOOL',indefinite:indef,caseVariantRevocation:idcase});
c.fs.writeFileSync(c.path.join(c.evidence,'g2-test-source-initial.ts'),c.read('backend/src/tests/agentVerifiedHistory.test.ts'),{flag:'wx'});
c.write('test-authoring-note.json',{at:new Date().toISOString(),initialResults:'g2-results-initial.json',initial:{passed:59,failed:1},failure:'G2-F01 real unknown-field proof handling defect; do not change its expected',httpTestCorrection:'Undefined invoked default authenticated actor; use explicit null sentinel and AUTH_REQUIRED401 expectation for truly anonymous request. Original auth source unchanged.',securityAudit:'Revoke lookup normalized UUID case but deletion did not; fix canonical record.id and add dedicated test',nativePosts:0,db:0});
console.log(JSON.stringify({indefinite:indef.gate,idCase:idcase.sessionsAfterRevoke}));
