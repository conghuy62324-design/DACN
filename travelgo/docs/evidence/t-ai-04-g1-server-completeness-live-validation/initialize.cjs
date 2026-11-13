const c=require('./common.cjs');c.write('integrity-before.json',{at:new Date().toISOString(),hashes:c.snapshot()});
c.preflight('preflight-initial.json').then(result=>console.log(JSON.stringify({status:result.status,reason:result.reason,at:result.at,
 rate:result.rate&&{known:result.rate.known,recent:result.rate.recent.length,remaining:result.rate.remainingConservativeSlots},
 metadata:result.metadata&&{version:result.metadata.version.body.version,resident:result.metadata.resident,context:result.metadata.residentContext},resources:result.resources})))
 .catch(e=>{console.error(e.code||e.name);process.exitCode=1;});
