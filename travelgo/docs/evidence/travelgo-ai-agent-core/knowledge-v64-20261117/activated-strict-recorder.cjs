// Patch of the V6.3 browser recorder contract. No app/model/tool authority.
const assert=require('assert/strict'),fs=require('fs'),path=require('path'),crypto=require('crypto');
const sha=v=>crypto.createHash('sha256').update(v).digest('hex');
function descriptor(request){const u=new URL(typeof request.url==='function'?request.url():request.url);assert(['127.0.0.1','localhost'].includes(u.hostname)&&['5057','5177'].includes(u.port),'UNAPPROVED_ENDPOINT');return{path:u.pathname,method:typeof request.method==='function'?request.method():request.method,body:typeof request.postData==='function'?request.postData():request.body||''};}
class StrictRecorder{
 constructor({directory,principalId,principalHash,remaining,reserve=10,maxEntries=10,verify=()=>{}}){Object.assign(this,{directory,principalId,principalHash,remaining,reserve,maxEntries,verify});this.ready=false;this.seen=new WeakMap();this.entries=[];this.active=null;}
 activate(){this.verify();assert(this.remaining-this.maxEntries>=this.reserve,'INSUFFICIENT_COMPLETE_JOURNEY_QUOTA');this.ready=true;}
 arm(plan){assert(this.ready&&!this.active,'RECORDER_NOT_READY_OR_BUSY');assert(!this.entries.some(e=>e.label===plan.id),'NO_RETRY');this.active=plan;}
 reserveRequest(request){assert(this.ready,'RECORDER_NOT_READY');this.verify();if(this.seen.has(request))return this.seen.get(request);const d=descriptor(request),p=this.active;assert(p,'NO_APPROVED_ACTION');assert.equal(d.path,p.path);assert.equal(d.method,p.method);p.validate?.(JSON.parse(d.body||'{}'));assert(!this.entries.some(e=>e.label===p.id),'NO_RETRY');assert(this.entries.length<this.maxEntries&&this.remaining-this.entries.length-1>=this.reserve,'RESERVE');const at=new Date().toISOString(),entry={id:crypto.randomUUID(),at,createdAt:at,label:p.id,principalId:this.principalId,principalHash:this.principalHash,kind:p.kind,state:'RESERVED_BEFORE_ONE_DISPATCH',method:d.method,path:d.path,bodyHash:sha(d.body)};
 fs.writeFileSync(path.join(this.directory,'attempt-'+p.id+'.json'),JSON.stringify(entry,null,2)+'\n',{flag:'wx'});this.entries.push(entry);this.seen.set(request,entry);return entry;}
 // Backend/proxy observation of the SAME reserved request is evidence, never a second dispatch grant.
 observeForward(entry,request){assert(this.entries.includes(entry),'UNRESERVED_FORWARD');const d=descriptor(request);assert.equal(d.path,entry.path);assert.equal(d.method,entry.method);assert.equal(sha(d.body),entry.bodyHash);return entry;}
 complete(){assert(this.active&&this.entries.some(e=>e.label===this.active.id),'ACTION_NOT_RESERVED');this.active=null;}
 stop(){this.ready=false;this.active=null;}
}
// Attach rejection handlers immediately; await HTTP plus actual controlled React state after one click.
async function clickAndWait(page,locator,path,settled,onResponse=async()=>{}){const response=page.waitForResponse(r=>new URL(r.url()).pathname===path&&r.request().method()!=='GET');const observed=response.then(value=>({value}),error=>({error}));try{await locator.click();const result=await observed;if(result.error)throw result.error;await onResponse(result.value);assert.equal(result.value.status(),200);await settled();return result.value;}catch(e){response.catch(()=>{});throw e;}}
module.exports={StrictRecorder,descriptor,clickAndWait};
