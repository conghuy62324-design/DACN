'use strict';
const assert=require('node:assert/strict'),{LockModel}=require('./lock-model.cjs');
function createCurrent({tables,fixtureTable,aMode='SHARE_ROW_EXCLUSIVE',bMode='SHARE',order=tables,expectedOrder=tables}){
 assert.equal(aMode,'SHARE_ROW_EXCLUSIVE','UNEXPECTED_A_MODE');assert.equal(bMode,'SHARE','UNEXPECTED_B_MODE');assert.deepEqual(order,expectedOrder,'UNEXPECTED_TABLE_ORDER');assert.equal(new Set(order).size,tables.length);assert.equal(order.length,tables.length);assert.deepEqual([...order].sort(),[...tables].sort(),'APPROVED_TABLE_COVERAGE');
 const model=new LockModel(tables);model.begin('A');model.begin('B');for(const table of order)model.request('A',table,aMode);model.startProtection();model.fixtureDml('A',fixtureTable,'INSERT');let cursor=0;
 function stepB(){const b=model.tx('B');if(b.status!=='ACTIVE'||cursor===order.length)return false;model.request('B',order[cursor++],bMode);return true;}
 function finishB(){while(stepB()){}return model.heldBy('B').length;}
 return{model,stepB,finishB,get cursor(){return cursor;},order};
}
module.exports={createCurrent};
