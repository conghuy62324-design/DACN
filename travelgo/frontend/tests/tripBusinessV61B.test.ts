// OFFLINE frontend contracts from actual Core outputs using SYNTHETIC catalog/Trip doubles.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {readCoreResponse} from '../src/services/agentCoreClient.ts';
const dir='../docs/evidence/travelgo-ai-agent-core/business-v61b-20261116';
const data=JSON.parse(fs.readFileSync(dir+'/routing-fix-offline.json','utf8'));
let parsed=0;
for(const p of data.payloads){const d=p.response,request=d.conversation.revision===1?{action:'start'}:{action:'continue',id:d.conversation.id,revision:d.conversation.revision-1};try{readCoreResponse({success:true,data:d},request);parsed++;}catch(e){console.error(JSON.stringify({message:p.message,status:d.status,resultType:d.result?.type,planFields:Object.keys(d.result?.itinerary||{})}));throw e;}}
const edited=data.payloads.find((p:any)=>p.response.editingTrip).response,request={action:'continue',id:edited.conversation.id,revision:edited.conversation.revision-1};
for(const tamper of [(d:any)=>d.editingTrip.id='forged',(d:any)=>d.editingTrip.owner='forged',(d:any)=>d.editingTrip.title=8]){const d=structuredClone(edited);tamper(d);assert.throws(()=>readCoreResponse({success:true,data:d},request));}
const result={at:new Date().toISOString(),scope:'OFFLINE_PRODUCTION_FRONTEND_PARSER_SYNTHETIC_SERVICE_OUTPUTS',groups:2,parsedPayloads:parsed,editingTripNegativeContracts:3,http:0,postgres:0,native:0,status:'PASS'};
fs.writeFileSync(dir+'/frontend-contract-routing-fix.json',JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
