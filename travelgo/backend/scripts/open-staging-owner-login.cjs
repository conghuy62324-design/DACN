// Local staging only. Reuse the existing DPAPI form filler and production login.
process.env.TRAVELGO_MODEL_OFF_MODE='staging';
require('./model-off-isolation.cjs');
process.env.DEBUG='';delete process.env.PWDEBUG;
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),net=require('node:net'),{spawn,execFileSync}=require('node:child_process');
const c=require('./catalog-staging-common.cjs'),root=c.root,launcher=require('./agent-staging-profile.cjs');
const ownerId='bae330d6-c3cb-462e-839e-cf07d73a64d2',roleId='fe016c5b-63a1-4e9a-9938-465aaae58f69';
const stateFile=path.join(root,'.local/catalog-staging/owner-login-frontend.json');
const args=process.argv.slice(2),reviewIndex=args.indexOf('--review-dir'),reviewMode=reviewIndex>=0,verifyLogin=args.includes('--verify-login')||reviewMode,index=reviewMode?reviewIndex:args.indexOf('--evidence-dir');
let evidenceDir,recorder,browser;
function write(name,data){if(evidenceDir)fs.writeFileSync(path.join(evidenceDir,name),JSON.stringify(data,null,2));}
async function health(port){try{return(await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(2000)})).status===200;}catch{return false;}}
function ownsPort(pid,port){const value=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`@(Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction Stop | Select-Object -ExpandProperty OwningProcess -Unique) | ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true,timeout:10000}));return(Array.isArray(value)?value:[value]).includes(pid);}
async function verifyBackend(){
 const s=JSON.parse(fs.readFileSync(path.join(root,'.local/catalog-staging/agent-integrated-profile.json'))),actual=launcher.owner(s.pid);
 assert(actual&&actual.owner===s.owner.owner&&actual.domain===s.owner.domain);
 assert(actual.command.includes('agent-staging-profile.cjs serve'));
 assert(ownsPort(s.pid,5057),'BACKEND_PORT_OWNER_MISMATCH');
 for(const key of ['AGENT_CORE_LLM_ENABLED','LLM_LIVE_ENABLED','LLM_USAGE_APPROVED','TRAVEL_SEARCH_ENABLED','TRAVEL_WEB_WORKER_ENABLED'])assert.equal(s.flags[key],'false');
 assert(await health(5057));
 const pg=require(path.join(root,'backend/node_modules/pg')),db=new pg.Client({host:c.config.DB_HOST,port:+c.config.DB_PORT,user:c.config.DB_USER,password:c.config.DB_PASSWORD,database:c.config.DB_NAME,options:'-c default_transaction_read_only=on'});
 try{await db.connect();await c.identity(db);const rows=(await db.query("SELECT u.id FROM users u JOIN user_roles r ON r.user_id=u.id WHERE u.id=$1 AND r.id=$2 AND r.role='SUPER_ADMIN'",[ownerId,roleId])).rows;assert.equal(rows.length,1);}finally{await db.end();}
 const audit=JSON.parse(fs.readFileSync(s.auditFile));assert(audit.identities>0&&audit.originalDb===0);
 return{pid:s.pid,mode:s.mode,database:c.config.DB_NAME,port:15452};
}
async function listening(){return new Promise(resolve=>{const socket=net.createConnection({host:'127.0.0.1',port:5177});socket.once('connect',()=>{socket.destroy();resolve(true);});socket.once('error',()=>resolve(false));});}
async function frontend(){
 if(await listening()){
  assert(fs.existsSync(stateFile),'FRONTEND_CONFIGURATION_NOT_VERIFIED');const prior=JSON.parse(fs.readFileSync(stateFile)),actual=launcher.owner(prior.pid);
  assert(actual&&actual.command.replaceAll('\\','/').toLowerCase().includes((root+'/frontend/node_modules/vite/bin/vite.js').replaceAll('\\','/').toLowerCase()));
  assert(ownsPort(prior.pid,5177),'FRONTEND_PORT_OWNER_MISMATCH');
  assert.equal(prior.proxyTarget,'http://127.0.0.1:5057');assert.equal(prior.apiBase,'/api');assert(await health(5177));return prior;
 }
 const log=fs.openSync(path.join(root,'.local/catalog-staging/owner-login-frontend.log'),'a'),env={...process.env,TRAVELGO_MODEL_OFF_MODE:'staging',TRAVELGO_MODEL_OFF_AUDIT_FILE:'',VITE_PROXY_TARGET:'http://127.0.0.1:5057',VITE_API_URL:'',VITE_MAP_PROVIDER:'leaflet',VITE_GOOGLE_MAPS_USAGE_APPROVED:'false'};
 delete env.DB_PASSWORD;delete env.JWT_SECRET;
 const argv=['--require',path.join(root,'backend/scripts/model-off-isolation.cjs'),path.join(root,'frontend/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5177','--strictPort'];
 const child=spawn(process.execPath,argv,{cwd:path.join(root,'frontend'),env,detached:true,windowsHide:true,stdio:['ignore',log,log]});child.unref();fs.closeSync(log);assert(child.pid);
 const receipt={at:new Date().toISOString(),pid:child.pid,proxyTarget:'http://127.0.0.1:5057',apiBase:'/api',frontend:'http://127.0.0.1:5177',purpose:'USER_REQUESTED_STAGING_OWNER_LOGIN',model:'OFF'};
 fs.writeFileSync(stateFile,JSON.stringify(receipt,null,2));
 for(let i=0;i<30;i++){if(await health(5177)){assert(ownsPort(child.pid,5177),'FRONTEND_PORT_OWNER_MISMATCH');return receipt;}await new Promise(r=>setTimeout(r,500));}throw Error('FRONTEND_READINESS_FAILED');
}
async function main(){
 if(index>=0){evidenceDir=path.resolve(args[index+1]||'');assert(fs.realpathSync(evidenceDir).toLowerCase().startsWith(fs.realpathSync(root).toLowerCase()+path.sep));}
 if(verifyLogin){assert(evidenceDir);const gate=JSON.parse(fs.readFileSync(path.join(evidenceDir,reviewMode?'fresh-agent-quota.json':'fresh-auth-quota.json'))),spent=fs.readdirSync(evidenceDir).filter(f=>/^attempt-.*\.json$/.test(f)).length;assert.equal(gate.status,'PASS');assert.equal(spent,reviewMode?0:1);if(reviewMode){const a=JSON.parse(fs.readFileSync(path.join(evidenceDir,'approval.json')));assert(a.stagingApproved&&Date.parse(a.expiresAt)>Date.now());}const {StrictRecorder}=require(path.join(root,'docs/evidence/travelgo-ai-agent-core/knowledge-v64-resume-20261118/strict-recorder.cjs'));recorder=new StrictRecorder({directory:evidenceDir,principalId:'57e6e64a-9dac-43af-bcf0-5f2c992a423a',principalHash:'856f41c9ad2ffc1e3f467eeb45f0069a943196101062d0e3ab3927bec64b95c5',remaining:gate.quota.remainingConservativeSlots-spent,maxEntries:1});recorder.activate();}
 const backend=await verifyBackend(),front=await frontend();write('runtime-ready.json',{at:new Date().toISOString(),backend,frontend:front,source:'EXPLICIT_PROCESS_ENV_NO_PRODUCTION_ENV_EDIT'});
 const {chromium,expect}=require(path.join(root,'frontend/node_modules/@playwright/test'));browser=await chromium.launch({channel:'msedge',headless:false,args:['--disable-save-password-bubble']});const context=await browser.newContext({serviceWorkers:'block'});let loginReserved=false;
 await context.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(!['127.0.0.1','localhost'].includes(url.hostname)||!['5177','5057'].includes(url.port))return route.abort();if(verifyLogin&&request.method()==='POST'&&url.pathname==='/api/auth/login'){try{assert(!loginReserved);recorder.arm({id:'OWNER_BROWSER_LOGIN',path:url.pathname,method:'POST',kind:reviewMode?'CONSERVATIVE_OWNER_SOURCE_SESSION_DPAPI_21_34':'CONSERVATIVE_OWNER_BROWSER_DPAPI_LOGIN_RAM_ONLY'});recorder.reserveRequest({url:()=>request.url(),method:()=>request.method(),postData:()=>JSON.stringify({credentials:'NOT_INSPECTED'})});loginReserved=true;}catch{return route.abort();}}return route.continue();});
 const page=await context.newPage();await page.goto('http://127.0.0.1:5177/login');await require(path.join(root,'docs/evidence/travelgo-ai-agent-core/knowledge-v64-20261117/secure-owner-login.cjs')).fill(page);
 if(verifyLogin){const pending=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/auth/login'&&r.request().method()==='POST').then(value=>({value}),()=>({failed:true}));await page.locator('button[type=submit]').click();const observed=await pending;assert(!observed.failed);assert.equal(observed.value.status(),200);const data=(await observed.value.json()).data;assert.equal(data.user.id,ownerId);assert(data.user.roles.includes('SUPER_ADMIN'));data.token='';recorder.complete();await page.waitForURL(u=>u.pathname!=='/login');await page.goto('http://127.0.0.1:5177/admin/travel-web');await expect(page.getByRole('heading',{name:'Nguồn web & kiến thức du lịch',exact:true})).toBeVisible();write('browser-login-proof.json',{at:new Date().toISOString(),status:'PASS_ACTUAL_EDGE_OWNER_LOGIN_VIA_5177_PROXY',http:200,ownerId,superAdmin:true,frontend:5177,backend:5057,databasePort:15452,credentialBodyInspected:false,credentialOrTokenLogged:false,passwordChanged:false,sourceFactApprovalClicks:0});await page.screenshot({path:path.join(evidenceDir,'owner-signed-in.png')});console.log('OWNER_EDGE_SIGNED_IN_SUPER_ADMIN_PASSWORD_UNCHANGED');}
 else console.log('SECURE_OWNER_LOGIN_READY_MASKED_USER_CLICKS_LOGIN');
 write('browser-ready.json',{at:new Date().toISOString(),pid:process.pid,status:verifyLogin?'SIGNED_IN':'MASKED_FORM_READY',frontendPid:front.pid,backendPid:backend.pid,model:'OFF'});
 if(reviewMode)await require('./source-review-browser.cjs').run({page,context,directory:evidenceDir});else await new Promise(resolve=>browser.once('disconnected',resolve));if(reviewMode)await browser.close();
}
main().catch(()=>{write('login-helper-blocked.json',{at:new Date().toISOString(),code:'OWNER_LOGIN_CHECK_FAILED',secretsPrinted:false});console.error('OWNER_LOGIN_BLOCKED_NO_SECRETS_PRINTED');process.exitCode=1;browser?.close().catch(()=>{});}).finally(()=>recorder?.stop());
