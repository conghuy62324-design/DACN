// Process-only gate installed BEFORE production modules/dotenv. Never edits .env.
for(const k of ['AGENT_CORE_LLM_ENABLED','LLM_LIVE_ENABLED','LLM_USAGE_APPROVED','TRAVEL_SEARCH_ENABLED','TRAVEL_WEB_WORKER_ENABLED'])process.env[k]='false';
const fs=require('fs'),net=require('net'),attempts=[];
global.fetch=async(input,options={})=>{const u=new URL(typeof input==='string'?input:input.url||String(input));attempts.push({kind:'FETCH_BLOCKED_BEFORE_NETWORK',method:options.method||'GET',origin:u.origin,path:u.pathname});throw Error('OFFLINE_FETCH_FORBIDDEN');};
net.Socket.prototype.connect=function(){attempts.push({kind:'SOCKET_BLOCKED_BEFORE_NETWORK'});throw Error('OFFLINE_SOCKET_FORBIDDEN');};
process.on('exit',()=>{if(process.env.OFFLINE_GUARD_AUDIT)fs.writeFileSync(process.env.OFFLINE_GUARD_AUDIT,JSON.stringify({at:new Date().toISOString(),nativeRequests:0,postgresConnections:0,flagsForcedOff:true,blockedAttempts:attempts},null,2),{flag:'wx'});});
