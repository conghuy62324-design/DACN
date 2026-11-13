'use strict';
const assert=require('node:assert/strict');
// Input is catalogPlannerTools' PUBLIC result, not raw TourPlannerService output.
// Match Express res.json -> JSON.parse at the browser; no business projection here.
function publicJson(value){
  const wire=JSON.stringify(value,(_key,v)=>{
    assert.ok(!['bigint','function','symbol'].includes(typeof v),'NON_JSON_VALUE');
    assert.ok(typeof v!=='number'||Number.isFinite(v),'NON_FINITE_JSON_NUMBER');
    return v;
  });
  assert.equal(typeof wire,'string','PUBLIC_JSON_REQUIRED');
  return JSON.parse(wire);
}
function normalizedPublicResult(input,{normalizedOracle=false}={}){
  const value=publicJson(input);
  assert.equal(value?.type,'itinerary','RESULT_TYPE');
  assert.equal(value.source,'TourPlannerService','RESULT_SOURCE');
  assert.ok(value.itinerary&&value.cost&&Array.isArray(value.warnings),'PUBLIC_CONTRACT');
  // Volatile values may differ; their required representation must still exist.
  if(!normalizedOracle||Object.hasOwn(value.itinerary,'id')){
    assert.equal(typeof value.itinerary.id,'string','ITINERARY_ID_REQUIRED');
    assert.ok(value.itinerary.id.length>0,'ITINERARY_ID_REQUIRED');
  }
  if(!normalizedOracle||Object.hasOwn(value.itinerary,'createdAt')){
    assert.equal(typeof value.itinerary.createdAt,'string','CREATED_AT_REQUIRED');
    assert.ok(Number.isFinite(Date.parse(value.itinerary.createdAt)),'CREATED_AT_REQUIRED');
  }
  assert.equal(value.cost.currency,'VND','CURRENCY');
  assert.equal(value.cost.basis,'GROUP_VND_V1','COST_BASIS');
  delete value.itinerary.id;
  delete value.itinerary.createdAt;
  return value;
}
function assertPublicFidelity(actual,independentOracle){
  assert.deepStrictEqual(normalizedPublicResult(actual),normalizedPublicResult(independentOracle,{normalizedOracle:true}),'PUBLIC_JSON_FIDELITY_MISMATCH');
  return true;
}
module.exports={publicJson,normalizedPublicResult,assertPublicFidelity};
