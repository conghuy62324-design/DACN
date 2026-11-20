const fs=require('fs'),assert=require('assert/strict'),c=require('../closure-v57-20261114/staging.cjs'),p=require('./actual-manifest.json');
const q=c.quota({id:p.principalId});assert.equal(q.principalHash,p.principalHash);
const journeys=q.futureDatedEntries.length?[]:q.remainingConservativeSlots>=20?['A','B']:q.remainingConservativeSlots>=15?['A']:[];
const reserved=journeys.length===2?10:journeys.length===1?5:0;
const out={at:new Date().toISOString(),status:journeys.length?'PASS':'BLOCKED_QUOTA',quota:q,reserve:10,capacityReservedBeforeAnyDispatch:reserved,selectedJourneys:journeys,quotaScanCount:1,modelQuotaChecked:false,loginIncluded:true,dbWrites:0};
fs.writeFileSync(__dirname+'/fresh-agent-quota.json',JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:out.status,remaining:q.remainingConservativeSlots,reserve:10,reserved,journeys}));
