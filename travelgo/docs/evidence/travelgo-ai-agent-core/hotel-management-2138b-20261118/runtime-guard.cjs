// Dedicated NEW hotel test runtime, without changing the protected 40/17 launcher/guard.
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),net=require('net');
assert.equal(process.env.NODE_ENV,'test');assert.equal(process.env.DB_HOST,'127.0.0.1');assert.equal(process.env.DB_PORT,'15453');assert.equal(process.env.DB_NAME,'hugotravel_hotel_test_20261118');assert.equal(process.env.DB_USER,'hotel_runtime');assert.equal(process.env.PORT,'5058');
const off=['AGENT_CORE_LLM_ENABLED','LLM_LIVE_ENABLED','LLM_USAGE_APPROVED','OLLAMA_LOCAL_ONLY_CONFIRMED','TRAVEL_SEARCH_ENABLED','TRAVEL_WEB_WORKER_ENABLED','REVIEW_INSIGHTS_ENABLED','REVIEW_INSIGHTS_WORKER_ENABLED'];
for(const key of off)process.env[key]='false';process.env.LLM_PROVIDER='none';
process.env.ALLOW_TEST_DB_WRITES='true';process.env.TEST_DATABASE_NAME=process.env.DB_NAME;
const file=path.join(__dirname,'runtime-isolation-'+process.pid+'.json'),audit={pid:process.pid,at:new Date().toISOString(),allowedConnections:0,denied:[],modelCalls:0};
const flush=()=>fs.writeFileSync(file,JSON.stringify(audit,null,2));flush();
const original=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){const a=Array.isArray(args[0])?args[0]:args;const p=typeof a[0]==='object'?a[0]:{port:a[0],host:a[1]},host=p.host||'localhost';assert(off.every(k=>process.env[k]==='false')&&process.env.LLM_PROVIDER==='none');if(!['127.0.0.1','localhost','::1'].includes(host)||+p.port!==15453){audit.denied.push({host,port:p.port});flush();throw Error('HOTEL_TEST_NETWORK_DENIED');}audit.allowedConnections++;flush();return original.apply(this,args);};
const lock=JSON.parse(fs.readFileSync(path.join(__dirname,'execution-lock.json')));let next=20;
const ledger=path.join(__dirname,'fixture-id-ledger.jsonl');if(fs.existsSync(ledger)){for(const line of fs.readFileSync(ledger,'utf8').trim().split('\n').filter(Boolean)){const id=JSON.parse(line).id;const index=Object.entries(lock.caps.fixtureIds).find(([k,v])=>v===id)?.[0];if(index)next=Math.max(next,Number(index.slice(1))+1);}}
globalThis[Symbol.for('hotel.test.idFactory')]=()=>{assert(next<=60,'FIXTURE_ID_POOL_EXHAUSTED');const id=lock.caps.fixtureIds['f'+next++];fs.appendFileSync(path.join(__dirname,'fixture-id-ledger.jsonl'),JSON.stringify({id,at:new Date().toISOString()})+'\n');return id;};
process.on('exit',()=>{audit.finishedAt=new Date().toISOString();flush();});
