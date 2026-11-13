// PROPOSED_NOT_APPLIED_TO_LIVE_RUN. Offline compatibility helper only.
// ASCII source escapes keep UI labels intact even through a non-UTF8 shell pipe.
const assert=require('node:assert/strict');
const UI=Object.freeze({dong:'\u20ab',motorbike:'Xe m\u00e1y',end:'K\u1ebft th\u00fac phi\u00ean G2',reference:'B\u1ea3n tham kh\u1ea3o t\u1eeb Planner. Ch\u01b0a l\u01b0u chuy\u1ebfn \u0111i ho\u1eb7c \u0111\u1eb7t d\u1ecbch v\u1ee5.'});
function asHttpJson(value){return JSON.parse(JSON.stringify(value));}
function normalizedWireResult(value){const v=asHttpJson(value);if(v.itinerary){delete v.itinerary.id;delete v.itinerary.createdAt;}return v;}
function compareWire(actual,expected){assert.deepEqual(normalizedWireResult(actual),normalizedWireResult(expected));}
module.exports={status:'PROPOSED_NOT_APPLIED_TO_LIVE_RUN',UI,asHttpJson,normalizedWireResult,compareWire};
