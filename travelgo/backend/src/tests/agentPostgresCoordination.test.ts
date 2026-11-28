import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {once} from 'node:events';
import {execFileSync} from 'node:child_process';
import express from 'express';
import {agentRequestHeader,openAgentCoordination,PostgresAgentLimits,type CoordinationQuery} from '../agent/postgresAgentLimits.js';
import {AgentCoreService,CORE_CONSENT} from '../services/agentCoreService.js';
import {AgentOrchestrator} from '../services/agentService.js';
import {LocalVerifiedHistoryStore} from '../agent/verifiedHistory.js';
import {UnconfiguredLlmProvider} from '../agent/provider.js';
import {createAgentCoreRouter} from '../routes/agentCoreRoutes.js';
import {signAccessToken} from '../services/tokenService.js';

const key=Buffer.alloc(32,19), expectedKeyProof=createHash('sha256').update(key).digest('hex');
const principal={id:'f3807495-f999-4c5e-b52d-10919188690e',email:'test-only@fixture.invalid',fullName:'Synthetic',roles:['CUSTOMER' as const]};
const dbError = new Error('DATABASE_INTERNAL_CREDENTIAL_CANARY');
const body=(message='Xin chào bạn')=>({message,consentVersion:CORE_CONSENT,intentVersion:'NATURAL_CHAT_V3',
    conversation:{action:'start',requestId:randomUUID(),consentVersion:CORE_CONSENT}});
const code=(wanted:string)=> (e:unknown)=>e instanceof Error&&'code'in e&&e.code===wanted;

/** Contract fixture only. PostgreSQL transaction correctness is a separate approval gate. */
function memoryTransport(){
    let now=0,available=true;
    const windows=new Map<string,{used:number;until:number}>(), claims=new Set<string>();
    let lease:{owner:unknown;token:unknown;until:number}|undefined;
    const query:CoordinationQuery=async(sql,args)=>{
        if(!available) throw dbError;
        const [proof,one,two,three] = args;
        assert.equal((proof as Buffer).toString('hex'),expectedKeyProof);
        if(sql.includes('.consume(')){
            assert((one as Buffer).length===32);
            assert(two===null||(two as Buffer).length===32);
            const owner=(one as Buffer).toString('hex');
            const id=two===null?null:owner+':'+(two as Buffer).toString('hex');
            if(id&&claims.has(id))return 'REPLAY';
            const w=windows.get(owner);
            if(w&&w.until>now&&w.used>=20)return 'LIMIT';
            windows.set(owner,w&&w.until>now?{...w,used:w.used+1}:{used:1,until:now+3600000});
            if(id)claims.add(id);
            return 'ACCEPTED';
        }
        if(sql.includes('.claim_provider(')){
            if(lease&&lease.until>now)return null;
            lease={owner:one,token:two,until:now+60000};
            return 1;
        }
        assert(sql.includes('.finish_provider('));
        assert.equal(one,1);
        if(!lease||lease.owner!==two||lease.token!==three||lease.until<=now)return false;
        lease=undefined;
        return true;
    };
    return {query,windows,claims,advance:(ms:number)=>{now+=ms;},down:()=>{available=false;}};
}
function latch(){
    let open!:()=>void;
    const wait=new Promise<void>(resolve=>{open=resolve;});
    return {open,wait};
}
test('opaque HMAC binds owner and session/request with shared identity across chat surfaces',async()=>{
    const calls:unknown[][]=[];
    const limits=new PostgresAgentLimits(async(_sql,p)=>{calls.push([...p]);return 'ACCEPTED';},key);
    const r={lane:'core-chat' as const,sessionId:randomUUID(),requestId:randomUUID()};
    await limits.consume(principal.id,r);
    await limits.consume(principal.id.toUpperCase(),{...r,requestId:r.requestId.toUpperCase()});
    await limits.consume(principal.id,{...r,lane:'legacy-chat'});
    await limits.consume(principal.id,{...r,sessionId:randomUUID()});
    assert.deepEqual(calls[0],calls[1]);
    assert.deepEqual(calls[0],calls[2]);
    assert.deepEqual(calls[0].slice(0,2),calls[3].slice(0,2));
    assert.notDeepEqual(calls[0][2],calls[3][2]);
    assert(!JSON.stringify(calls).includes(principal.id)&&!JSON.stringify(calls).includes(r.requestId));
});
test('two adapters share one policy fixture, dedup does not consume twice',async()=>{
    const f=memoryTransport(),a=new PostgresAgentLimits(f.query,key),b=new PostgresAgentLimits(f.query,key);
    const item={lane:'core-chat' as const,requestId:randomUUID()};
    await a.consume(principal.id,item);
    await assert.rejects(b.consume(principal.id,item),code('AGENT_G2_REPLAY'));
    const outcomes=await Promise.allSettled(Array.from({length:28},(_,i)=>(i%2?a:b).consume(principal.id)));
    assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,19);
    assert(outcomes.filter(r=>r.status==='rejected').every(r=>code('AGENT_RATE_LIMITED')(r.reason)));
    await assert.rejects(new PostgresAgentLimits(f.query,key).consume(principal.id),code('AGENT_RATE_LIMITED'));
    await b.consume(randomUUID(),item);
    assert.equal(f.windows.size,2);
    f.advance(3600001);
    await b.consume(principal.id);
});
test('model busy, caller abort and settled release across two adapters',async()=>{
    const f=memoryTransport(),a=new PostgresAgentLimits(f.query,key),b=new PostgresAgentLimits(f.query,key);
    const entered=latch(),resume=latch(),abort=new AbortController();
    const task=a.providerCall(async signal=>{entered.open();await resume.wait;assert(signal.aborted);return 'late';},abort.signal);
    task.catch(()=>{});
    await entered.wait;
    abort.abort(new Error('CANCELLED'));
    let extraCalls=0;
    await assert.rejects(b.providerCall(async()=>{extraCalls++;}),code('AGENT_BUSY'));
    assert.equal(extraCalls,0);
    resume.open();
    await assert.rejects(task,/CANCELLED/);
    assert.equal(await b.providerCall(async()=> 'settled'),'settled');
});
test('expired token cannot release replacement or publish stale output',async()=>{
    const f=memoryTransport(),a=new PostgresAgentLimits(f.query,key),b=new PostgresAgentLimits(f.query,key);
    const entered=latch(),resume=latch(),newEntered=latch(),newResume=latch();
    const stale=a.providerCall(async()=>{entered.open();await resume.wait;return 'stale';});
    stale.catch(()=>{});
    await entered.wait;
    f.advance(61000);
    const fresh=b.providerCall(async()=>{newEntered.open();await newResume.wait;return 'fresh';});
    await newEntered.wait;
    resume.open();
    await assert.rejects(stale,code('AGENT_MODEL_LEASE_LOST'));
    await assert.rejects(a.providerCall(async()=>0),code('AGENT_BUSY'));
    newResume.open();
    assert.equal(await fresh,'fresh');
});
test('database outage fails closed before provider and during release',async()=>{
    const unavailable=memoryTransport(),a=new PostgresAgentLimits(unavailable.query,key);
    await assert.rejects(a.providerCall(async()=>{unavailable.down();return 'do not return';}),code('AGENT_STATE_UNAVAILABLE'));
    await assert.rejects(a.consume(principal.id),code('AGENT_STATE_UNAVAILABLE'));
    let touched=false;
    await assert.rejects(a.providerCall(async()=>{touched=true;}),code('AGENT_STATE_UNAVAILABLE'));
    assert.equal(touched,false);
});
test('core and legacy paths both consume the injected authority; session remains local',async()=>{
    const f=memoryTransport(),limits=new PostgresAgentLimits(f.query,key);
    const core=new AgentCoreService({limits});
    const legacy=new AgentOrchestrator({limits,provider:{configured:true,generate:async()=>({kind:'unsupported'})},
      readConsent:async()=>({personalizationEnabled:false}),onDecision:()=>{}});
    try{
        const input=body(),result=await core.chat(principal,input);
        assert.equal(result.conversation.persisted,false);
        await assert.rejects(core.chat(principal,input),code('AGENT_G2_REPLAY'));
        const legacyId=randomUUID();
        await legacy.chat(principal,{message:'Tôi muốn tìm địa điểm'},undefined,legacyId);
        await assert.rejects(legacy.chat(principal,{message:'Tôi muốn tìm địa điểm'},undefined,legacyId),code('AGENT_G2_REPLAY'));
        assert.equal([...f.windows.values()][0].used,2);
        const replica=new AgentCoreService({limits});
        try {
            await assert.rejects(replica.chat(principal,{...input,conversation:{action:'continue',id:result.conversation.id,
                revision:result.conversation.revision,requestId:randomUUID(),consentVersion:CORE_CONSENT}}),code('AGENT_G2_SESSION_UNAVAILABLE'));
        }finally{replica.dispose();}
    }finally{core.dispose();}
});
test('revocation fences a start blocked on async quota admission',async()=>{
    const entered=latch(),resume=latch();
    const store=new LocalVerifiedHistoryStore();
    const core=new AgentCoreService({store,limits:{
        consume:async()=>{entered.open();await resume.wait;},
        providerCall:async()=>{throw Error('Model must stay off');}
    }});
    try{
        const pending=core.chat(principal,body());pending.catch(()=>{});
        await entered.wait;
        core.revoke(principal.id);
        resume.open();
        await assert.rejects(pending,code('AGENT_G2_STALE_TURN'));
        assert.equal(store.stats().sessions,0);
    }finally{core.dispose();}
});
test('reject local database paths unrelated to an approved coordination window',()=>{
    const make=(base:string)=>({NODE_ENV:'test',AGENT_STATE_DATABASE_NAME:'hugotravel_web_integration_test_20261125',
      AGENT_STATE_HMAC_KEY_HEX:key.toString('hex'),AGENT_STATE_TEST_UNTIL:new Date(Date.now()+10000).toISOString(),AGENT_STATE_DATABASE_URL:base});
    for(const input of ['postgresql://agent_p12_runtime:p@127.0.0.1:5432/hugotravel_web_integration_test_20261125',
        'postgresql://hotel_runtime:p@127.0.0.1:15457/hugotravel_web_integration_test_20261125',
        'postgresql://agent_p12_runtime:p@127.0.0.1:15457/hugotravel_web_integration_test_20261125?options=anything'])
        assert.throws(()=>openAgentCoordination(make(input),false),code('AGENT_STATE_UNAVAILABLE'));
    assert.throws(()=>agentRequestHeader('arbitrary-email@fixture.invalid'),code('AGENT_REQUEST_ID_INVALID'));
    const id=randomUUID();
    assert.equal(agentRequestHeader(id.toUpperCase()),id);
});
test('migration source has bounded expiry and an execute-only privilege surface',()=>{
    const sql=readFileSync(resolve(__dirname,'../../../database/migrations/20261127_21_agent_reliability_coordination.sql'),'utf8');
    assert.match(sql,/PRIMARY KEY \(owner_key, request_key\)/);
    assert.match(sql,/WHERE w\.expires_at <= at_time OR w\.used < settings\.quota_cap/);
    assert.match(sql,/owner_token = p_owner AND lease_token = p_token AND expires_at > clock_timestamp\(\)/);
    assert.equal(sql.match(/FOR UPDATE SKIP LOCKED/g)?.length,3);
    assert.match(sql,/REVOKE ALL ON ALL TABLES IN SCHEMA agent_reliability FROM PUBLIC/);
    assert.match(sql,/REVOKE ALL ON ALL FUNCTIONS IN SCHEMA agent_reliability FROM PUBLIC/);
    assert(!/raw_chat|booking_contact|email|user_id|jsonb/i.test(sql));
});

test('production local mode and invalid shared DSN fail closed without a fallback allowance',()=>{
    const program=[
      "const {agentRequestLimits}=require('./dist/agent/requestLimits.js');",
      "Promise.resolve().then(()=>agentRequestLimits.consume('test-only')).then(",
      "()=>process.exitCode=1,e=>{if(e.code!=='AGENT_STATE_UNAVAILABLE')process.exitCode=2;});",
    ].join('');
    for(const mode of ['local','postgres']){
        execFileSync(process.execPath,['-e',program],{cwd:resolve(__dirname,'../..'),env:{
            ...process.env,NODE_ENV:'production',JWT_SECRET:'test-only-not-a-real-credential',
            AGENT_SHARED_STATE_MODE:mode,AGENT_STATE_DATABASE_URL:'invalid-dsn',
        }});
    }
});

test('real loopback Core HTTP on simulated persistence preserves model OFF, replay and the safe outage status',async()=>{
    const f=memoryTransport();
    const service=new AgentCoreService({limits:new PostgresAgentLimits(f.query,key),provider:new UnconfiguredLlmProvider()});
    const before=process.env.WEB_ACCOUNT_SECURITY_ENABLED;
    process.env.WEB_ACCOUNT_SECURITY_ENABLED='false';
    const app=express();
    app.use(express.json());
    app.use('/core',createAgentCoreRouter(service));
    const server=app.listen(0,'127.0.0.1');
    await once(server,'listening');
    const addr=server.address();
    assert(addr&&typeof addr!=='string');
    const bearer=signAccessToken(principal),input=body();
    const post=(data:unknown,token?:string)=>fetch('http://127.0.0.1:'+addr.port+'/core/chat',{
        method:'POST',redirect:'error',signal:AbortSignal.timeout(2000),
        headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data),
    });
    try{
        const anon=await post(input);assert.equal(anon.status,401);await anon.json();
        assert.equal(f.windows.size,0);
        const first=await post(input,bearer);assert.equal(first.status,200);
        const j=await first.json() as any;
        assert.equal(j.data.model.invoked,false);
        assert.equal(j.data.conversation.persisted,false);
        assert.equal(first.headers.get('cache-control'),'no-store');
        const replay=await post(input,bearer);assert.equal(replay.status,409);
        assert.equal((await replay.json() as any).code,'AGENT_G2_REPLAY');
        f.down();
        const unavailable=await post(body(),bearer);assert.equal(unavailable.status,503);
        const failure=await unavailable.json() as any;
        assert.equal(failure.code,'AGENT_STATE_UNAVAILABLE');
        assert(!JSON.stringify(failure).includes(dbError.message));
    }finally{
        if(before===undefined)delete process.env.WEB_ACCOUNT_SECURITY_ENABLED;
        else process.env.WEB_ACCOUNT_SECURITY_ENABLED=before;
        service.dispose();
        await new Promise<void>(resolve=>server.close(()=>resolve()));
    }
});
