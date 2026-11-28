// Versioned offline contract checks; original V5 assertions/evidence remain untouched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {AgentCoreService,CORE_CONSENT} from '../services/agentCoreService.js';
import {RegisteredCatalogService} from '../services/registeredCatalogService.js';
import {LocalVerifiedHistoryStore} from '../agent/verifiedHistory.js';
import {AgentLimits} from '../agent/limits.js';
import {NativeHotelTools,NATIVE_HOTEL_TOOLS} from '../agent/nativeHotelTools.js';
Object.assign(process.env,{AI_NATIVE_HOTELS_ENABLED:'false',AI_LONG_TERM_MEMORY_ENABLED:'false',ADAPTIVE_LANGUAGE_ENABLED:'false',REVIEW_INSIGHTS_ENABLED:'false',TRAVEL_KNOWLEDGE_ENABLED:'false',CONVERSATIONAL_INTELLIGENCE_ENABLED:'true',PERSONALIZED_DECISION_ENABLED:'true'});
const tests:Array<[string,()=>any]>=[],test=(name:string,run:()=>any)=>tests.push([name,run]);
const user:any={id:randomUUID(),roles:['CUSTOMER']},tools=new NativeHotelTools();
test('all native tools are explicitly readonly with closed top-level input/output schemas',()=>{assert.deepEqual(Object.keys(NATIVE_HOTEL_TOOLS),['native_hotel_search','native_hotel_detail','native_hotel_quote']);for(const t of Object.values(NATIVE_HOTEL_TOOLS)){assert.equal(t.readOnly,true);assert.equal(t.input.additionalProperties,false);assert.equal(t.output.additionalProperties,false);}});
test('native role authorization precedes any SQL',async()=>{await assert.rejects(()=>tools.search({id:randomUUID(),roles:['PARTNER']} as any,{}),(e:any)=>e.code==='AGENT_NATIVE_HOTEL_FORBIDDEN');});
test('numeric string cannot bypass native input types',async()=>{await assert.rejects(()=>tools.search(user,{locationId:'destination:da-lat',limit:'3'} as any));});
test('unknown query fields are not executable',async()=>{await assert.rejects(()=>tools.search(user,{sql:'SELECT private'} as any));});
test('incomplete stay/extra quote fields fail before SQL',async()=>{await assert.rejects(()=>tools.quote(user,{placeId:randomUUID(),roomTypeId:randomUUID(),ratePlanId:randomUUID(),stay:{checkIn:'2026-12-05'},totalVnd:1} as any));});
test('unscoped street search is rejected before SQL',async()=>{await assert.rejects(()=>tools.search(user,{streetName:'Bùi Thị Xuân'}));});
test('V5 compatibility V2: structured safe href, not a mandatory URL inside prose; stale reference clarifies without guessed replacement',async()=>{
 const now=()=>Date.parse('2026-11-26T04:00:00Z');let rows:any[]=[1,2].map(n=>({id:'a1400000-0000-4000-8000-'+String(n).padStart(12,'0'),name:'SYNTHETIC V2 '+n,slug:'synthetic-v2-'+n,category:'hotel',status:'APPROVED',city:'Đà Nẵng',province:'Đà Nẵng',priceFrom:500000,amenities:['Bãi đỗ xe'],rating:0,reviewCount:0,catalogMetadata:{source:'REFERENCE',testOnly:true,accommodationType:'hotel'}}));
 const allow=new Set(rows.map(r=>r.id)),svc=new AgentCoreService({now,catalog:new RegisteredCatalogService(async()=>structuredClone(rows),allow),store:new LocalVerifiedHistoryStore(now),limits:new AgentLimits(20,1,now),provider:{configured:false,generate:async()=>{throw Error('NO_MODEL');}},knowledge:{approved:async()=>[]} as any});let meta:any;
 const send=async(message:string)=>{const r:any=await svc.chat(user,{message,consentVersion:CORE_CONSENT,intentVersion:'NATURAL_CHAT_V3',conversation:{...(meta?{action:'continue',id:meta.id,revision:meta.revision}:{action:'start'}),requestId:randomUUID(),consentVersion:CORE_CONSENT}});meta=r.conversation;return r;};
 try{const first=await send('Tìm khách sạn Đà Nẵng dưới 600k có bãi đỗ xe');assert(first.result.items.length);for(const p of first.result.items)assert.equal(p.href,'/places/'+p.id);rows=[];const stale=await send('Cái thứ 2 giá sao');assert.equal(stale.status,'needs_input');assert.equal(stale.result,undefined);assert.equal(stale.model.invoked,false);}finally{svc.dispose();}
});
(async()=>{const results=[];for(const[name,run]of tests){try{await run();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',error:(e as Error).message});}}const out={scope:'OFFLINE_V2_CONTRACT_NOT_NATIVE_BROWSER',passed:results.filter(r=>r.status==='PASS').length,total:results.length,results};if(process.env.AI_HOTEL_TEST_OUTPUT)fs.writeFileSync(process.env.AI_HOTEL_TEST_OUTPUT,JSON.stringify(out,null,2),{flag:'wx'});console.log(JSON.stringify(out));if(out.passed!==out.total)process.exitCode=1;})().catch(e=>{console.error(e.message);process.exitCode=1;});
