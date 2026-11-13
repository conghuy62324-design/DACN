'use strict';
const {ACTIVITY}=require('./managed-connections.cjs');
function makeClosingGuard({registry,readActivity,write}){
 return async function closing(label){const snapshot=registry.snapshot();try{const rows=await readActivity(ACTIVITY);write({type:'RAW_ACTIVITY_BEFORE_ASSERTION',at:new Date().toISOString(),label,rows,snapshotSequence:snapshot.sequence});registry.assertActivity(rows,snapshot);return true;}catch(error){registry.fail(error,'maintenance-ownership');throw error;}};
}
module.exports={makeClosingGuard};
