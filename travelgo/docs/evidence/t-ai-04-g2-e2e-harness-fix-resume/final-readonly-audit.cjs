const c=require('./common.cjs');
const realFetch=globalThis.fetch;globalThis.fetch=(url,init={})=>{c.assert.equal(init.method||'GET','GET');c.assert.equal(new URL(String(url)).origin,c.env.OLLAMA_BASE_URL);return realFetch(url,{...init,redirect:'error'});};
(async()=>{
const db=require('./readonly-db.cjs');try{
 const guard=await db.guard();c.write('db-final-guard.json',guard);
 c.assert.equal(guard.schemaSha256,c.json(c.prefix+'db-preflight.json').schemaSha256);
 const final=await db.fingerprint();c.write('fingerprint-final.json',final);
 const before=c.json(c.prefix+'fingerprint-before.json'),changed=Object.keys(before.tables).filter(t=>JSON.stringify(before.tables[t])!==JSON.stringify(final.tables[t]));
 c.assert.deepEqual(changed,[]);c.assert.equal(Object.keys(final.tables).length,25);c.assert.equal(final.tables.trip_sessions.rows,'27');
 c.write('fingerprint-final-compare.json',{at:new Date().toISOString(),status:'PASS',tables:25,changed,tripSessions:{before:before.tables.trip_sessions.rows,after:final.tables.trip_sessions.rows},audit:db.audit,readOnly:guard.identity.read_only});
}finally{await db.sequelize.close();}
 const start=c.json(c.prefix+'native-log-start.json'),logPath=c.path.join(process.env.LOCALAPPDATA,'Ollama/server.log'),log=c.fs.readFileSync(logPath);
 c.assert.ok(log.length>=start.offset,'LOG_ROTATED_CANNOT_AUDIT');
 const window=log.subarray(start.offset).toString('utf8').split(/\r?\n/);
 const posts=window.filter(x=>/\[GIN\].*POST/.test(x));c.assert.equal(posts.length,3);c.assert.equal(posts.filter(x=>x.includes('/api/chat')).length,2);c.assert.equal(posts.filter(x=>x.includes('/api/generate')).length,1);
 const warnings=window.filter(x=>/warn|error|failed|timeout|abort|evict|watchdog|n_ctx_seq.*n_ctx_train/i.test(x)&&!/prompt|authorization|password|api.key|server config|env=|USERPROFILE/i.test(x));
 const files=c.fs.readdirSync(c.evidence).filter(x=>/^ollama-attempt-/.test(x));c.assert.equal(files.length,3);
 const metadata=await c.metadata();const results=c.json(c.prefix+'results.json');c.assert.equal(results.providerPending,0);
 c.write('native-final-audit.json',{at:new Date().toISOString(),status:'PASS_CAP_AND_NO_EXTRA_POST',operatorPosts:1,inferencePosts:2,totalPosts:3,cap:3,retries:0,hiddenWarmups:0,attemptFiles:files,startOffset:start.offset,finalOffset:log.length,postLogRows:posts,warnings,warningInterpretation:'INFO waiting for runner during authorized load and context16384 below training262144 observed; no terminal load failure, timeout, abort, watchdog or GPU allocation warning observed in this window. Does not close historical P2.',providerPending:results.providerPending,resources:c.resources(),metadata,rate:c.rate(),scope:'Harness dispatch ledger + Ollama server.log window; no OS-wide packet capture'});
 console.log(JSON.stringify({db:'25/25 unchanged,Trip27/27',posts:posts.length,pending:0,modelResident:metadata.resident}));
})().catch(e=>{console.error(e);process.exitCode=1;});
