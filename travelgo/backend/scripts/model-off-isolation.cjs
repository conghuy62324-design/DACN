// Permanent version of the 21.27 offline guard. Preload BEFORE application/dotenv.
// Staging permits only the three authorized local endpoints; offline permits no network.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const symbol=Symbol.for('travelgo.modelOffIsolation');
const OFF=['AGENT_CORE_LLM_ENABLED','LLM_LIVE_ENABLED','LLM_USAGE_APPROVED','OLLAMA_LOCAL_ONLY_CONFIRMED','TRAVEL_SEARCH_ENABLED','TRAVEL_WEB_WORKER_ENABLED'];
function install(){
 if(global[symbol])return global[symbol];
 const mode=process.env.TRAVELGO_MODEL_OFF_MODE||'offline';assert(['offline','staging','collection'].includes(mode));
 // A separate, short-lived HTTPS GET capability. Never active in the website or staging launcher.
 const researchScope=new (require('node:async_hooks').AsyncLocalStorage)();let collection,collectionAttempts=0;
 if(mode==='collection'){
  const authorization=path.resolve(process.env.TRAVELGO_COLLECTION_AUTHORIZATION||'');assert(authorization.startsWith(path.resolve(__dirname,'../..')+path.sep));
  collection=JSON.parse(fs.readFileSync(authorization));assert(['APPROVED_BOUNDED_INTERNET_21_30','APPROVED_BOUNDED_INTERNET_21_32','APPROVED_BOUNDED_INTERNET_21_33','APPROVED_BOUNDED_INTERNET_21_34'].includes(collection.status));assert(Date.parse(collection.expiresAt)>Date.now());
  const packet=JSON.parse(fs.readFileSync(collection.packet));assert.equal(crypto.createHash('sha256').update(fs.readFileSync(collection.packet)).digest('hex'),collection.packetSha256);
  if(collection.status==='APPROVED_BOUNDED_INTERNET_21_32')assert.equal(packet.task,'21.32');
  if(collection.status==='APPROVED_BOUNDED_INTERNET_21_33')assert.equal(packet.task,'21.33');
  if(collection.status==='APPROVED_BOUNDED_INTERNET_21_34')assert.equal(packet.task,'21.34');
  assert(packet.maxAttempts<=30&&packet.maxArticles<=8&&packet.concurrency<=2&&packet.searchCalls===0&&packet.domains.length<=5);
  for(const u of packet.allowedUrls){const url=new URL(u);assert(url.protocol==='https:'&&!url.username&&!url.password&&!url.search&&!url.hash&&(!url.port||url.port==='443')&&packet.domains.includes(url.hostname));}
  for(const [file,hash]of Object.entries(collection.sourceHashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname,'../..',file))).digest('hex'),hash);
  collection={...collection,...packet};
 }
 const force=()=>{for(const key of OFF)process.env[key]='false';process.env.LLM_PROVIDER='none';};force();
 const root=path.resolve(__dirname,'../..'),logDir=path.join(root,'.local/model-off');fs.mkdirSync(logDir,{recursive:true});
 const file=path.resolve(process.env.TRAVELGO_MODEL_OFF_AUDIT_FILE||path.join(logDir,`isolation-${process.pid}-${crypto.randomBytes(4).toString('hex')}.json`));
 assert(file.toLowerCase().startsWith(root.toLowerCase()+path.sep),'AUDIT_OUTSIDE_WORKSPACE');assert(!fs.existsSync(file),'REFUSE_EXISTING_AUDIT');
 process.env.TRAVELGO_MODEL_OFF_AUDIT_FILE=file;
 const audit={version:1,pid:process.pid,mode,startedAt:new Date().toISOString(),effectiveConfigurations:[],deniedBeforeIO:[],dispatchedToTransport:[],networkRequestAttempts:0,nativeRequestAttempts:0,nativeDispatchedRequests:0};
 fs.writeFileSync(file,'{}',{flag:'wx'});const flush=()=>fs.writeFileSync(file,JSON.stringify(audit,null,2));
 function effective(label='boundary'){const config=Object.fromEntries([...OFF,'LLM_PROVIDER'].map(k=>[k,process.env[k]]));assert(OFF.every(k=>config[k]==='false')&&config.LLM_PROVIDER==='none','MODEL_OFF_EFFECTIVE_CONFIGURATION_MISMATCH');if(label!=='boundary')audit.effectiveConfigurations.push({label,at:new Date().toISOString(),config});return config;}
 function endpoint(protocol,host,port){return mode==='staging'&&['127.0.0.1','localhost','::1','[::1]'].includes(host)&&((protocol==='http:'&&[5057,5177].includes(+port))||(protocol==='tcp:'&&[5057,5177,15452].includes(+port)));}
 function boundary(kind,protocol,host,port,pathname){effective();const grant=researchScope.getStore(),research=mode==='collection'&&Date.parse(collection.expiresAt)>Date.now()&&grant?.host===host&&+port===443&&['https:','tls:','tcp:'].includes(protocol),allowed=endpoint(protocol,host,+port)||research,native=+port===11434||!research&&!['127.0.0.1','localhost','::1','[::1]'].includes(host),event={kind,protocol,host,port:+port,...(pathname?{path:pathname.split('?')[0]}:{}),at:new Date().toISOString(),approvedResearch:!!research};
  audit.networkRequestAttempts++;if(native)audit.nativeRequestAttempts++;event.nativeModelOrExternalEndpoint=native;if(!allowed){audit.deniedBeforeIO.push(event);flush();throw Object.assign(Error('MODEL_OFF_NETWORK_BLOCKED_BEFORE_IO'),{code:'MODEL_OFF_NETWORK_BLOCKED'});}
  if(native)audit.nativeDispatchedRequests++;audit.dispatchedToTransport.push(event);flush();
 }
 const originalFetch=global.fetch;if(originalFetch)global.fetch=async(input,options)=>{const u=new URL(typeof input==='string'||input instanceof URL?input:input.url);boundary('fetch',u.protocol,u.hostname,+(u.port||(u.protocol==='https:'?443:80)),u.pathname);return originalFetch(input,options);};
 function requestUrl(args,protocol){const first=args[0];if(typeof first==='string'||first instanceof URL)return new URL(first);const o=first||{},host=o.hostname||o.host||'localhost';return new URL((o.protocol||protocol)+'//'+host+(o.port?':'+o.port:'')+(o.path||'/'));}
 for(const [name,protocol]of[['node:http','http:'],['node:https','https:']]){const mod=require(name);for(const method of['request','get']){const original=mod[method];mod[method]=function(...args){const u=requestUrl(args,protocol);const dispatch=()=>{boundary(name+'.'+method,u.protocol,u.hostname,+(u.port||(u.protocol==='https:'?443:80)),u.pathname);return original.apply(this,args);};if(mode==='collection'&&protocol==='https:'){
   const options=typeof args[0]==='object'&&!(args[0] instanceof URL)?args[0]:typeof args[1]==='object'?args[1]:{};
   assert.equal(options.method||'GET','GET');assert(collection.allowedUrls.includes(u.href),'UNAPPROVED_COLLECTION_URL');assert(Date.parse(collection.expiresAt)>Date.now());assert(++collectionAttempts<=collection.maxAttempts,'COLLECTION_CAP');return researchScope.run({host:u.hostname},dispatch);
  }return dispatch();};}}
 const net=require('node:net'),connect=net.Socket.prototype.connect;net.Socket.prototype.connect=function(...args){const a=Array.isArray(args[0])?args[0]:args,first=a[0],o=typeof first==='object'?first:{port:first,host:typeof a[1]==='string'?a[1]:'localhost'};boundary('socket.connect','tcp:',o.host||'localhost',+o.port);return connect.apply(this,args);};
 const tls=require('node:tls'),tlsConnect=tls.connect;tls.connect=function(...args){const o=typeof args[0]==='object'?args[0]:{port:args[0],host:typeof args[1]==='string'?args[1]:'localhost'};boundary('tls.connect','tls:',o.host||'localhost',+o.port);return tlsConnect.apply(this,args);};
 const dgram=require('node:dgram');for(const method of['connect','send'])dgram.Socket.prototype[method]=function(){boundary('udp.'+method,'udp:','UNAPPROVED',0);};
 // dotenv override:true is also covered. Never alter the project's .env file.
 const dotenv=require(path.join(root,'backend/node_modules/dotenv')),config=dotenv.config,configDotenv=dotenv.configDotenv;
 dotenv.configDotenv=function(...args){const result=configDotenv.apply(this,args);force();effective('after dotenv.configDotenv');flush();return result;};
 dotenv.config=function(...args){const result=config.apply(this,args);force();effective('after dotenv.config');flush();return result;};
 effective('installed before application imports');flush();process.on('exit',()=>{audit.finishedAt=new Date().toISOString();try{effective('process exit');}catch{audit.effectiveConfigurationFailed=true;}flush();});
 const api={mode,auditFile:file,audit,effective,allowedEndpoint:endpoint};global[symbol]=api;return api;
}
module.exports=install();
