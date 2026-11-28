// OFFLINE fixtures only. Never PostgreSQL, browser or model acceptance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
import {readHotelRequest,withdrawnAmenities} from '../agent/hotelConstraints.js';
import {AgentHotelReadAdapter} from '../agent/hotelReadAdapter.js';
import {composeConversation} from '../agent/conversationSemantics.js';
import {AgentCoreService,CORE_CONSENT} from '../services/agentCoreService.js';
import {RegisteredCatalogService} from '../services/registeredCatalogService.js';
import {LocalVerifiedHistoryStore} from '../agent/verifiedHistory.js';
import {AgentLimits} from '../agent/limits.js';

Object.assign(process.env,{ADAPTIVE_LANGUAGE_ENABLED:'false',CONVERSATIONAL_INTELLIGENCE_ENABLED:'true',PERSONALIZED_DECISION_ENABLED:'true',AI_LONG_TERM_MEMORY_ENABLED:'false',REVIEW_INSIGHTS_ENABLED:'false',TRAVEL_KNOWLEDGE_ENABLED:'false',TRAVEL_COST_INTELLIGENCE_ENABLED:'false',INTELLIGENT_PLANNING_ENABLED:'false'});
const tests:Array<[string,()=>any]>=[],test=(name:string,f:()=>any)=>tests.push([name,f]);
test('room stay budget has no per-night or trip-budget inference',()=>{const r=readHotelRequest('Ở 5 người 4 đêm, tổng tiền phòng tối đa 9 triệu',false);assert.deepEqual(r.patch,{nights:4,partySize:5,stayTotalMaxVnd:9000000});assert(r.question);});
test('per-night cap stays separate from total stay',()=>{const r=readHotelRequest('Phòng tối đa 750k mỗi đêm',false);assert.equal(r.patch.perRoomNightMaxVnd,750000);assert.equal(r.patch.stayTotalMaxVnd,undefined);});
test('multiple amounts do not silently choose a stay total',()=>{assert.equal(readHotelRequest('Tổng tiền phòng dưới 5tr hoặc 6tr',false).patch.stayTotalMaxVnd,undefined);});
test('negated and hypothetical room constraints are not installed',()=>{for(const text of ['Không cần phòng view núi','Nếu có phòng view vườn dưới 800k','Đừng đổi phòng hướng biển'])assert.deepEqual(readHotelRequest(text,true).patch,{});});
test('street extraction stops at a geographic connector',()=>{assert.equal(readHotelRequest('Tìm khách sạn đường Hoàng Diệu ở Đà Lạt',false).patch.streetName,'Hoàng Diệu');});
test('view belongs to room criteria, not property amenities',()=>{assert.deepEqual(readHotelRequest('Muốn phòng hướng núi',false).patch,{roomView:'MOUNTAIN'});});
test('unknown availability requires clarification rather than dates mutation',()=>{const r=readHotelRequest('Nơi đó còn phòng ngày mai không?',true);assert(r.question?.includes('chưa xác minh'));assert.deepEqual(r.patch,{});});
test('amenity withdrawals are compositional across supported amenities',()=>{assert.deepEqual(withdrawnAmenities('Khỏi cần bãi đỗ xe, không cần wifi nữa'),['Wi-Fi','Bãi đỗ xe']);});
test('observations, double negatives and hypotheses do not revoke requirements',()=>{for(const text of ['Chỗ đó không có hồ bơi','Đừng bỏ hồ bơi','Không phải bỏ yêu cầu wifi','Nếu bỏ hồ bơi thì sao'])assert.deepEqual(withdrawnAmenities(text),[]);});
const none:any={status:'NONE',evidence:[]};
test('absolute budget replacement is typed and quotes exact source evidence',()=>{const input='Đổi ngân sách xuống 4 triệu';const r=composeConversation(input,undefined,{destinationCity:'Đà Lạt',totalBudget:7000000},{},none);assert.equal(r.patch.totalBudget,4000000);for(const f of r.frames)assert.equal(input.slice(f.span.start,f.span.end),f.span.quote);});
test('relative budget does not become an absolute replacement',()=>{const r=composeConversation('Tăng ngân sách thêm 2 triệu',undefined,{totalBudget:5000000},{},none);assert.notEqual(r.patch.totalBudget,2000000);});
const now=()=>Date.parse('2026-11-26T03:00:00Z'),id='a0400000-0000-4000-8000-000000000041';
function snapshot():any{return{identity:{id,name:'SYNTHETIC DTO',amenities:['Hồ bơi']},rooms:[{id:'room-test',placeId:id,view:'CITY',amenities:['WIFI'],offers:[{ratePlanId:'rate-test',authority:'UNDATED_RATE_REFERENCE',baseAmountVnd:500000,priceBasis:'PER_ROOM_NIGHT'}]}],provenance:{source:'AUTHORIZED_POSTGRESQL_HOTEL_SNAPSHOT'},asOf:new Date(now()).toISOString(),validUntil:new Date(now()+60000).toISOString(),sourceVersion:'synthetic-version',isDemo:true,caveats:['SYNTHETIC; not real availability']};}
test('unbound native adapter never reports execution',async()=>{assert.deepEqual(await new AgentHotelReadAdapter().detail(id),{status:'UNSUPPORTED',executed:false,capability:'NATIVE_HOTEL_READ_NOT_BOUND',mutationAuthority:false});});
test('DEMO snapshot is denied by default',async()=>{await assert.rejects(()=>new AgentHotelReadAdapter({detail:async()=>snapshot()},now).detail(id),(e:any)=>e.code==='AGENT_HOTEL_DEMO_NOT_ALLOWED');});
test('undated rates are not availability or a total, property pool is not room pool',async()=>{const r=await new AgentHotelReadAdapter({detail:async()=>snapshot()},now,true).detail(id);assert.equal(r.status,'READ');if(r.status!=='READ')throw Error();assert.equal(r.dataClass,'DEMO');assert.deepEqual(r.rooms[0].amenities,['WIFI']);assert.equal(r.rooms[0].offers[0].kind,'UNDATED_REFERENCE');assert.equal((r.rooms[0].offers[0] as any).availability,'UNKNOWN');assert.equal((r.rooms[0].offers[0] as any).totalStayVnd,undefined);assert.equal(r.bookingAuthority,false);});
for(const mode of ['expired','future','scope','invalid-clock'])test('native DTO rejects '+mode,async()=>{const d=snapshot();if(mode==='expired')d.validUntil=new Date(now()-1).toISOString();if(mode==='future')d.asOf=new Date(now()+1).toISOString();if(mode==='scope')d.identity.id=randomUUID();if(mode==='invalid-clock')d.asOf='not-a-date';await assert.rejects(()=>new AgentHotelReadAdapter({detail:async()=>d},now,true).detail(id),(e:any)=>e.code==='AGENT_HOTEL_SNAPSHOT_INVALID');});
test('mismatched room quote never becomes a recommendation',async()=>{const d=snapshot();d.rooms[0].offers=[{authority:'SERVER_QUOTE_SNAPSHOT',ratePlanId:'rate-test',quote:{placeId:randomUUID()}}];await assert.rejects(()=>new AgentHotelReadAdapter({detail:async()=>d},now,true).detail(id,{checkIn:'2026-12-01',checkOut:'2026-12-03',rooms:[{adults:2,childAges:[]}]}),(e:any)=>e.code==='AGENT_HOTEL_QUOTE_SCOPE');});
test('real Core retains unsupported room criteria, no provider/model/write fallback',async()=>{
 let meta:any;let reads=0;const user:any={id:randomUUID(),roles:['CUSTOMER']};
 const svc=new AgentCoreService({now,catalog:new RegisteredCatalogService(async()=>{reads++;return[];}),limits:new AgentLimits(20,1,now),store:new LocalVerifiedHistoryStore(now),provider:{configured:false,generate:async()=>{throw Error('MODEL_FORBIDDEN');}},knowledge:{approved:async()=>[]} as any});
 const send=async(message:string)=>{const r:any=await svc.chat(user,{message,intentVersion:'NATURAL_CHAT_V3',consentVersion:CORE_CONSENT,conversation:{...(meta?{action:'continue',id:meta.id,revision:meta.revision}:{action:'start'}),requestId:randomUUID(),consentVersion:CORE_CONSENT}});meta=r.conversation;return r;};
 try{let r=await send('Tìm phòng hướng hồ');assert.equal(r.hotelConstraints.roomView,'LAKE');assert.equal(r.tool,undefined);r=await send('Tìm khách sạn dưới 900k');assert.equal(r.status,'needs_input');assert.equal(r.hotelConstraints.roomView,'LAKE');assert.equal(reads,0);assert.equal(r.model.invoked,false);await send('Không cần điều kiện phòng, tìm khách sạn Đà Lạt');assert.equal((svc as any).states.get(meta.id).hotelConstraints,undefined);}finally{svc.dispose();}
});
(async()=>{const results=[];for(const[name,run]of tests){try{await run();results.push({name,status:'PASS'});}catch(e){results.push({name,status:'FAIL',reason:(e as Error).message});}}const out={scope:'OFFLINE_SYNTHETIC',passed:results.filter(r=>r.status==='PASS').length,total:results.length,results};if(process.env.A0_TEST_OUTPUT)fs.writeFileSync(process.env.A0_TEST_OUTPUT,JSON.stringify(out,null,2),{flag:'wx'});console.log(JSON.stringify(out));if(out.passed!==out.total)process.exitCode=1;})().catch(e=>{console.error(e.message);process.exitCode=1;});
