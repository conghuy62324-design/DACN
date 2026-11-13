const fs=require('node:fs'),path=require('node:path');
const old=path.join(__dirname,'../t-ai-04-planner-real-tool-live-e2e-resume-run2');
let d=fs.readFileSync(path.join(old,'direct-planner.cjs'),'utf8');
d=d.replace('for(const x of proposal.cases.filter(x=>x.expectedDecision))',`for(const x of [
 {id:'R01',expectedDecision:{kind:'tool',name:'plan_trip',arguments:{...proposal.originalScenario,transportation:'motorbike'}}},
 {id:'R02',expectedDecision:{kind:'tool',name:'plan_trip',arguments:{...proposal.originalScenario,transportation:'motorbike',totalBudget:9000000}}},
 {id:'R03',expectedDecision:{kind:'tool',name:'plan_trip',arguments:proposal.originalScenario}}
])`);fs.writeFileSync(path.join(__dirname,'direct-planner.cjs'),d,'utf8');
let r=fs.readFileSync(path.join(__dirname,'runtime-adapters.cjs'),'utf8');
r=r.replace("if(current)current.integrityError=error.message;next(error);","if(current)current.integrityError=error.message;currentCtx?.fail(error,'incoming-request');next(error);");
r=r.replace("page.on('pageerror',error=>uiChecks.push({event:'pageerror',message:error.message}));","page.on('pageerror',error=>{uiChecks.push({event:'pageerror',message:error.message});currentCtx?.fail(error,'browser-pageerror');});");
r=r.replace("c.assert.ok(tokens.main);for(const s", "c.assert.equal(load('services/tokenService.js').verifyAccessToken(tokens.main).id,c.principal);for(const s");
fs.writeFileSync(path.join(__dirname,'runtime-adapters.cjs'),r,'utf8');
console.log('PREPARATION_FINISHED_NO_DB_NO_OLLAMA');
