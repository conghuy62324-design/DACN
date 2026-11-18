const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'../../../..'),load=f=>require(path.join(root,'backend/dist/agent',f));
const {composeConversation,dialogueMemory,recordDialogueResult}=load('conversationSemantics.js'),{resolveLanguage,discoverExpression}=load('adaptiveLanguage.js');
const bytes=fs.readFileSync(path.join(__dirname,'benchmark-manifest.json'));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),fs.readFileSync(path.join(__dirname,'benchmark-manifest.json.sha256'),'utf8'));
const manifest=JSON.parse(bytes),phase=process.argv[2],split=process.argv[3]||'all';assert(['baseline','development-final','holdout-final'].includes(phase)||/^development-\d+$/.test(phase));
Object.assign(process.env,{CONVERSATIONAL_INTELLIGENCE_ENABLED:'true',PERSONALIZED_DECISION_ENABLED:'true',ADAPTIVE_LANGUAGE_ENABLED:'true'});
const at=Date.parse('2026-11-16T13:00:00Z'),none={status:'NONE',evidence:[]};
const results=[];
for(const c of manifest.cases.filter(c=>split==='all'||c.split===split)){
 const e=c.expected,x=c.expression||e.expression||'bavuli',map={expression:x,normalizedExpression:x,conceptId:'accommodation_type.homestay',domain:'travel_accommodation',scope:'PERSONAL',source:'USER_CONFIRMED',status:'ACTIVE',version:1,expiresAt:new Date(at+3600000).toISOString()};
 let mappings=e.mapping?[map]:[];if(e.mapping==='expired')map.expiresAt=new Date(at-1).toISOString();
 if(e.mapping==='sessionOverride')mappings.push({...map,scope:'SESSION',conceptId:'accommodation_type.resort'});
 if(e.mapping==='conflict')mappings.push({...map,conceptId:'accommodation_type.resort'});
 if(e.geoConflict)mappings=[{...map,expression:'SG',normalizedExpression:'sg',domain:'travel_location',conceptId:'location.destination:da-lat'}];
 let memory=dialogueMemory();const verified={destinationCity:'Đà Lạt',departureCity:'Thành phố Hồ Chí Minh',adults:2,totalBudget:5000000,transportation:'motorbike'},seed=composeConversation(c.turns[0],memory,verified,{},none,'destination:da-lat');memory=seed.memory;memory.currentGoal={category:'hotel',locationId:'destination:da-lat'};
 if(e.lists){recordDialogueResult(memory,{items:[{id:'H1',category:'hotel'},{id:'H2',category:'hotel'}]});recordDialogueResult(memory,{items:[{id:'R1',category:'restaurant'},{id:'R2',category:'restaurant'}]});}
 const input=c.turns[1],resolution=resolveLanguage(input,mappings,at,'travel_accommodation'),start=performance.now();let actual;
 try{actual=c.mode==='discover'?discoverExpression(input):c.mode==='resolve'?resolution:composeConversation(input,memory,verified,{awaiting:e.awaiting},resolution,'destination:da-lat');}catch(err){actual={error:err.message};}
 const value=k=>k.split('.').reduce((v,p)=>v?.[p],actual),checks=[];
 for(const[k,v]of Object.entries(e.equals||{}))checks.push({dimension:k,pass:JSON.stringify(value(k))===JSON.stringify(v),expected:v,actual:value(k)});
 for(const k of e.absent||[])checks.push({dimension:k,pass:value(k)===undefined});
 for(const[k,v]of Object.entries(e.contains||{}))checks.push({dimension:k,pass:Array.isArray(value(k))&&value(k).includes(v)});
 if(e.question)checks.push({dimension:'appropriateClarification',pass:typeof actual?.question==='string'&&actual.question.length>0});
 if(e.emptyPatch)checks.push({dimension:'contextPreservation',pass:Object.keys(actual?.patch||{}).length===0});
 if(e.noOperation)checks.push({dimension:'proposedOperation',pass:!actual?.interpretation?.operation});
 if(e.resolutionNotResolved)checks.push({dimension:'baseGeographyPrecedence',pass:actual?.status!=='RESOLVED'});
 if(e.frameMeaning)checks.push({dimension:'semanticFrame',pass:actual?.frames?.some(f=>f.meaning===e.frameMeaning)===true});
 if(c.mode==='compose')checks.push({dimension:'rawEvidence',pass:actual?.frames?.every(f=>input.slice(f.span.start,f.span.end)===f.span.quote)===true});
 results.push({id:c.id,split:c.split,status:checks.every(k=>k.pass)?'PASS':'FAIL',checks,actual,latencyMs:performance.now()-start});
}
const output={phase,tier:manifest.tier,manifestSha256:crypto.createHash('sha256').update(bytes).digest('hex'),passed:results.filter(r=>r.status==='PASS').length,failed:results.filter(r=>r.status==='FAIL').length,results};
fs.writeFileSync(path.join(__dirname,phase+'-'+split+'.json'),JSON.stringify(output,null,2)+'\n',{flag:'wx'});
// Holdout raw baseline remains sealed, not printed for development iteration.
console.log(JSON.stringify({phase,split,passed:split==='holdout'&&phase==='baseline'?'SEALED':output.passed,failed:split==='holdout'&&phase==='baseline'?'SEALED':output.failed,...(split==='development'?{failures:results.filter(r=>r.status==='FAIL').map(r=>({id:r.id,checks:r.checks.filter(c=>!c.pass)}))}:{})}));
