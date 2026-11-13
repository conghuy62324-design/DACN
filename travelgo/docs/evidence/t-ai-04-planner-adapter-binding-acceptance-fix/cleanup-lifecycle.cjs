'use strict';
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
const md5=value=>crypto.createHash('md5').update(value).digest('hex');
const FK_TABLES=Object.freeze(['blog_posts','bookings','tickets','tour_places','user_favorites']);
function validateCleanupDecision(value){
  assert.ok(value&&typeof value==='object','CLEANUP_DECISION_REQUIRED');
  if(value.status==='NOT_APPLICABLE'){
    assert.equal(value.reason,'NO_COMMITTED_TASK_FIXTURES');assert.equal(value.committed,false);assert.equal(value.ambiguous,false);assert.equal(value.createdRows,0);assert.equal(value.ledgerPresent,false);
  }else{
    assert.equal(value.status,'READY','CLEANUP_NOT_READY');assert.equal(value.ids?.length,2);assert.match(value.ticketHash,/^[a-f0-9]{64}$/);
  }
  return value.status;
}
function createCleanupLifecycle(io){
  for(const name of ['readState','readOwnership','readRows','readReferences','verifyIsolation','removeOwnedFixtures','readResidualIds'])assert.equal(typeof io[name],'function','MISSING_CLEANUP_ADAPTER:'+name);
  assert.equal(io.expectedIds?.length,2,'EXACT_TWO_IDS_REQUIRED');assert.equal(new Set(io.expectedIds).size,2);
  const ids=io.expectedIds.slice().sort();let ticket=null,used=false,evaluations=0;
  async function assess(){
    assert.equal(used,false,'CLEANUP_ACTION_ALREADY_ATTEMPTED');ticket=null;evaluations++;
    const state=await io.readState();assert.equal(typeof state?.committed,'boolean','COMMIT_STATE_REQUIRED');assert.equal(state.ambiguous,false,'AMBIGUOUS_COMMIT');
    const ownership=await io.readOwnership();
    if(!state.committed){
      assert.equal(state.createdRows,0,'UNCOMMITTED_ROWS_REQUIRE_ROLLBACK_REVIEW');assert.equal(ownership,null,'UNCOMMITTED_STATE_WITH_LEDGER');
      return{status:'NOT_APPLICABLE',reason:'NO_COMMITTED_TASK_FIXTURES',committed:false,ambiguous:false,createdRows:0,ledgerPresent:false};
    }
    assert.equal(ownership?.owned,true,'TASK_OWNERSHIP_REQUIRED');const ledger=ownership.ledger;
    assert.equal(ledger?.status,'COMMITTED_OWNERSHIP_VERIFIED','COMMITTED_LEDGER_REQUIRED');assert.equal(ledger.commit,'ACKNOWLEDGED_AND_READ_BACK');assert.equal(ledger.affectedRows,2);
    assert.deepEqual(ledger.insertedIds.slice().sort(),ids,'EXACT_LEDGER_IDS');assert.equal(ledger.rows.length,2);
    const rows=await io.readRows();assert.equal(rows.length,2,'EXACT_OWNED_ROWS_REQUIRED');assert.deepEqual(rows.map(x=>x.row.id).sort(),ids,'EXACT_ROW_IDS');
    for(const row of rows){
      const owned=ledger.rows.find(x=>x.row?.id===row.row.id);assert.ok(owned,'LEDGER_ROW_REQUIRED');
      assert.equal(typeof row.full_row_json,'string');assert.deepEqual(JSON.parse(row.full_row_json),row.row,'ROW_PROJECTION_MISMATCH');
      assert.equal(row.row.slug,owned.row.slug,'SLUG_MISMATCH');assert.ok(row.row.slug,'SLUG_REQUIRED');
      assert.equal(sha(row.full_row_json),row.sha256,'ROW_SHA_MISMATCH');assert.equal(md5(row.full_row_json),row.row_md5,'ROW_MD5_MISMATCH');
      assert.equal(row.sha256,owned.sha256,'COMMITTED_ROW_HASH_MISMATCH');assert.equal(row.row_md5,owned.row_md5,'COMMITTED_ROW_MD5_MISMATCH');assert.equal(row.full_row_json,owned.full_row_json,'COMMITTED_FULL_ROW_MISMATCH');
    }
    const refs=await io.readReferences();assert.deepEqual(refs.foreign.map(x=>x.table).sort(),FK_TABLES.slice().sort(),'INCOMING_FK_COVERAGE_REQUIRED');
    for(const ref of refs.foreign)assert.equal(ref.count,0,'FOREIGN_REFERENCE:'+ref.table);assert.equal(refs.tripJson,0,'TRIP_JSON_REFERENCE');
    const isolation=await io.verifyIsolation(evaluations);assert.equal(isolation?.status,'PASS_ONLY_APPROVED_TWO_ROWS_DIFFER','MAINTENANCE_ISOLATION_INVALID');
    assert.equal(isolation.isolation,'ALL25_SHARE_LOCKS_GRANTED');assert.equal(isolation.tables,25);assert.equal(isolation.unchangedOtherTables,24);assert.equal(isolation.existingPlaces,22);assert.equal(isolation.currentPlaces,24);assert.equal(isolation.tripSessions,27);
    ticket={ids,ticketHash:sha(JSON.stringify({ledger,rows:rows.map(x=>({id:x.row.id,slug:x.row.slug,sha256:x.sha256})).sort((a,b)=>a.id.localeCompare(b.id))}))};
    return{status:'READY',...ticket};
  }
  async function perform(){
    assert.ok(ticket&&!used,'CLEANUP_PRECONDITION_NOT_EVALUATED');const authorized=structuredClone(ticket);
    // Recheck ownership/rows/references/isolation immediately before action.
    const fresh=await assess();assert.equal(fresh.status,'READY');assert.equal(fresh.ticketHash,authorized.ticketHash,'CLEANUP_STATE_CHANGED');
    used=true;ticket=null;const result=await io.removeOwnedFixtures(Object.freeze(authorized));
    assert.equal(result?.status,'DB_RESTORED_25_25','CLEANUP_RESULT_REQUIRED');assert.equal(result.affectedRows,2,'CLEANUP_AFFECTED_COUNT');assert.deepEqual(result.deletedIds.slice().sort(),ids,'CLEANUP_DELETED_IDS');
    assert.equal(result.places,22);assert.equal(result.tripSessions,27);assert.equal(result.tables,25);assert.deepEqual(result.changed,[]);
    assert.deepEqual(await io.readResidualIds(),[],'RESIDUAL_FIXTURES_AFTER_CLEANUP');return true;
  }
  return{assess,perform};
}
module.exports={createCleanupLifecycle,validateCleanupDecision,FK_TABLES};
