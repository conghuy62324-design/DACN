import assert from 'node:assert/strict';
import {readVietnameseConversation} from '../agent/vietnameseConversation.js';
import {mergeCorePlanProof} from '../agent/coreInput.js';
import {writeFileSync} from 'node:fs';
const destinations=['Đà Nẵng','Đà Lạt','Nha Trang','Hội An','Huế','Hà Nội','TP. Hồ Chí Minh','Phú Quốc','Hạ Long','Sa Pa'];
const results=[];for(const city of destinations){const expected=city==='TP. Hồ Chí Minh'?'Thành phố Hồ Chí Minh':city;const read=readVietnameseConversation('Đi '+city+' 3n2đ',{}, {},{},Date.parse('2026-11-12T00:00:00Z'));const proof=mergeCorePlanProof(undefined,read.interpretation.canonical);assert.equal(proof?.values.destinationCity,expected);assert.equal(proof?.states.destinationCity,'SET');assert.equal(read.state.durationDays,3);assert.equal(proof?.states.startDate,'OMITTED');results.push({city,expected,status:'PASS'});}
const result={tier:'OFFLINE_NLU_NO_DATABASE_OR_MODEL',passed:results.length,failed:0,results};if(process.env.CATALOG_LANGUAGE_OUTPUT)writeFileSync(process.env.CATALOG_LANGUAGE_OUTPUT,JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
