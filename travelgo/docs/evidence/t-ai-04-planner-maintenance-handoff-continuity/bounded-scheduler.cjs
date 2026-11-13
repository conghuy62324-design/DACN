'use strict';
const {createCurrent}=require('./current-protocol.cjs'),{checkTrace}=require('./proof-checker.cjs');
function explore(input){const original=input.order,projection=[original[0],input.fixtureTable,original.at(-1)],results=[];if(new Set(projection).size!==3)throw Error('THREE_DISTINCT_PROJECTION_TABLES_REQUIRED');
 for(const target of projection){let prefixes=0,violating=0,terminal=0,firstWitness=null;const maxActions=6;
  function execute(actions){const p=createCurrent({tables:projection,fixtureTable:input.fixtureTable});p.stepB();p.model.guardSample();let requested=false,writerFinished=false;for(const a of actions){if(a==='COMMIT_A')p.model.commit('A');else if(a==='WRITE_REQUEST'){p.model.begin('W','EXTERNAL_WRITER');p.model.request('W',target,'ROW_EXCLUSIVE');requested=true;}else if(a==='B_NEXT')p.stepB();else if(a==='WRITER_COMMIT'){p.model.commit('W');p.model.disconnect('W');writerFinished=true;}p.model.invariant();}
   return{p,requested,writerFinished,proof:checkTrace(p.model.events,projection)};
  }
  function visit(actions){const x=execute(actions);prefixes++;if(x.proof.counterexamples.length){violating++;firstWitness??={actions,target,projection,events:x.p.model.events,proof:x.proof};return;}
   const enabled=[];if(x.p.model.tx('A').status==='ACTIVE')enabled.push('COMMIT_A');if(!x.requested)enabled.push('WRITE_REQUEST');if(x.p.cursor<projection.length&&x.p.model.tx('B').status==='ACTIVE')enabled.push('B_NEXT');if(x.requested&&!x.writerFinished&&x.p.model.tx('W').status==='ACTIVE')enabled.push('WRITER_COMMIT');
   if(!enabled.length||actions.length===maxActions){terminal++;return;}for(const a of enabled)visit([...actions,a]);
  }
  visit([]);results.push({target,prefixesExplored:prefixes,violatingPrefixes:violating,terminalFinitePrefixes:terminal,maxScheduledActions:maxActions,firstWitness});
 }
 return{tier:'BOUNDED_OFFLINE_ENUMERATION_NOT_POSTGRES_TRACE',projection,results,universalProof:false,scope:'Single external writer with no prior target locks; no lock groups/upgrades; failure branches tested separately. Valid counterexamples refute current protocol, absence here is not a proof.'};
}
module.exports={explore};
