// Transparent child-process observation only. No assessor/gate/provider result stubs.
const path=require('node:path');const root=path.resolve(__dirname,'../../..');
const {AgentOrchestrator}=require(path.join(root,'backend/dist/services/agentService.js'));
const {assessCurrentCompleteness}=require(path.join(root,'backend/dist/agent/currentCompleteness.js'));
const original=AgentOrchestrator.prototype.chat;
globalThis.__compatTurns=[];
AgentOrchestrator.prototype.chat=async function(user,input){
 const item={input:structuredClone(input),assessment:assessCurrentCompleteness(input?.message),providerCalls:0,toolCalls:0,providerReturns:[],providerErrors:[],toolInputs:[]};
 globalThis.__compatTurns.push(item);const provider=this.provider,tools=this.tools,generate=provider.generate,execute=tools.execute;
 provider.generate=async function(...args){item.providerCalls++;try{const raw=await generate.apply(this,args);item.providerReturns.push(structuredClone(raw));return raw;}catch(error){item.providerErrors.push({code:error.code||null,name:error.name});throw error;}};
 tools.execute=async function(...args){item.toolCalls++;item.toolInputs.push(structuredClone(args[0]));return execute.apply(this,args);};
 try{const result=await original.call(this,user,input);item.result=structuredClone(result);return result;}catch(error){item.error={code:error.code||null,statusCode:error.statusCode||null,name:error.name};throw error;}
 finally{provider.generate=generate;tools.execute=execute;}
};
