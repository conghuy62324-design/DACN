// Exactly one Agent-ledger scan. Never imports a model readiness/preflight entrypoint.
const c=require('../closure-v57-20261114/staging.cjs'),fs=require('fs'),path=require('path');
const principal={id:'57e6e64a-9dac-43af-bcf0-5f2c992a423a'},quota=c.quota(principal);
const out={at:new Date().toISOString(),quota,cap:20,reserve:10,spendable:Math.max(0,quota.remainingConservativeSlots-10),plannedNormal:8,plannedConservativeManagement:2,plannedEntries:10,requiredInitial:20,minimumSessionLearningEntries:4,minimumSessionRequiredInitial:14,status:quota.remainingConservativeSlots>=20&&!quota.futureDatedEntries.length?'PASS':'BLOCKED_QUOTA',noPolling:true,noModelQuota:true};
if(out.status==='BLOCKED_QUOTA'){out.actualNormalChats=0;out.managementWrites=0;out.fixtureWrites=0;out.activation='NOT_AUTHORIZED_NOT_STARTED';}
fs.writeFileSync(path.join(__dirname,'fresh-agent-quota.json'),JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:out.status,remaining:quota.remainingConservativeSlots,reserve:10,spendable:out.spendable,planned:10,known:quota.known,checkedAt:quota.checkedAt}));
