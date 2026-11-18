// Task-owned observer only: inclusive timings, no arguments, text, IDs or SQL values are recorded.
module.exports=(audit,save)=>{
 audit.performance={};const wrap=(target,key,phase)=>{const original=target[key];if(typeof original!=='function')return;target[key]=function(...args){const start=performance.now(),done=(value,error)=>{const ms=performance.now()-start,s=audit.performance[phase]||={calls:0,totalMs:0,maxMs:0,maxOutputBytes:0,errors:0};s.calls++;s.totalMs+=ms;s.maxMs=Math.max(s.maxMs,ms);if(error)s.errors++;else try{s.maxOutputBytes=Math.max(s.maxOutputBytes,Buffer.byteLength(JSON.stringify(value)||''));}catch{}save();};let result;try{result=original.apply(this,args);}catch(e){done(undefined,true);throw e;}if(result&&typeof result.then==='function')return result.then(v=>{done(v,false);return v;},e=>{done(undefined,true);throw e;});done(result,false);return result;};};
 wrap(require('../../../../backend/dist/agent/vietnameseConversation.js'),'readVietnameseConversation','nlu');
 wrap(require('../../../../backend/dist/agent/conversationSemantics.js'),'composeConversation','dialogue');
 wrap(require('../../../../backend/dist/services/customerMemoryService.js').CustomerMemoryService,'forAdvice','memory');
 wrap(require('../../../../backend/dist/services/reviewInsightService.js').ReviewInsightService,'get','review');
 wrap(require('../../../../backend/dist/services/travelKnowledgeService.js').TravelKnowledgeService.prototype,'approved','knowledge');
 const catalog=require('../../../../backend/dist/services/registeredCatalogService.js').RegisteredCatalogService.prototype;for(const method of ['eligible','search','details'])wrap(catalog,method,'catalog.'+method);
 wrap(require('../../../../backend/dist/agent/advisoryReasoning.js'),'advisoryDecision','decision');
 wrap(require('../../../../backend/dist/agent/advisoryReasoning.js'),'composeAdvisory','response.advisory');
 wrap(require('../../../../backend/dist/agent/naturalGrounding.js'),'renderGrounded','response.grounded');
 const planner=require('../../../../backend/dist/services/tourPlannerService.js').TourPlannerService;wrap(planner,'generatePersonalizedItinerary','planner');wrap(planner,'replanItinerary','replan');
};
