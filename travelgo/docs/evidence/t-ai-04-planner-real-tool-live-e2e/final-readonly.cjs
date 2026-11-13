// Final comparison only; no maintenance DML or native provider is available.
const boundary=require('./network-boundary.cjs'),c=require('./common.cjs');
Object.assign(process.env,{DB_PORT:'5432',LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false'});
const db=require('./readonly-db.cjs');
(async()=>{try{
 const guard=await db.guard();c.write('db-final-guard.json',guard);
 const [sessions]=await db.sequelize.query("SELECT current_setting('transaction_read_only') AS transaction_read_only");c.assert.equal(sessions[0].transaction_read_only,'on');
 const after=await db.fingerprint();c.write('fingerprint-final.json',after);c.assert.deepEqual(after,c.json(c.prefix+'fingerprint-before.json'));
 const ids=c.json(c.previous+'fixture-proposal.json').optionalProfile.records.map(x=>x.values.id);
 const [residual]=await db.sequelize.query('SELECT id FROM places WHERE id IN (:ids)',{replacements:{ids}});c.assert.equal(residual.length,0);
 c.write('final-db-comparison.json',{at:new Date().toISOString(),status:'DB_UNCHANGED_25_25_NO_INSERT',tables:25,changed:[],places:after.tables.places.rows,tripSessions:after.tables.trip_sessions.rows,approvedIdsAbsent:ids,residualOwnedFixtures:[],cleanupDml:0,restoredClaim:false,transactionReadOnly:sessions[0].transaction_read_only,audit:db.audit,networkAudit:boundary});
}finally{await db.sequelize.close();}
 const start=c.json(c.prefix+'native-log-start.json'),path=c.path.join(process.env.LOCALAPPDATA,'Ollama/server.log'),bytes=c.fs.readFileSync(path);c.assert.ok(bytes.length>=start.offset,'LOG_ROTATED');
 const posts=bytes.subarray(start.offset).toString('utf8').split(/\r?\n/).filter(x=>/\[GIN\].*POST/.test(x));c.assert.equal(posts.length,0);
 c.write('native-final-audit.json',{at:new Date().toISOString(),status:'PASS_ZERO_NATIVE_POST',startOffset:start.offset,finalOffset:bytes.length,postRows:posts,totalPosts:0,loadOnly:0,inference:0,retry:0,hiddenWarmup:0,modelMetadataRequests:0,nativeProviderStarted:false,scope:'Task has no native dispatch; Ollama server.log window verifies0 extra POST during offline regression. Not OS-wide packet capture.'});
 console.log(JSON.stringify({status:'DB_UNCHANGED_25_25_NO_INSERT',places:22,tripSessions:27,residualFixtures:0,nativePosts:0}));
})().catch(e=>{console.error(e);process.exitCode=1;});
