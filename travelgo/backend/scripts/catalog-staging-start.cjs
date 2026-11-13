// Start only the two named local DEMO processes. Existing listeners are never reused or stopped.
const {root,path,fs,config,assert}=require('./catalog-staging-common.cjs'),{spawn}=require('node:child_process'),net=require('node:net');
const dir=path.join(root,'.local/catalog-staging');
async function free(port){await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve));});}
(async()=>{assert(fs.existsSync(path.join(dir,'accounts.json')),'Create the dedicated DEMO account first');const pidFile=path.join(dir,'running.json');assert(!fs.existsSync(pidFile),'Existing task PID record: inspect its ownership before starting another server');await free(5057);await free(5177);
 const children=[];
 for(const [name,args,cwd,env]of [
  ['api',[path.join(root,'backend/scripts/catalog-staging-server.cjs')],root,{...process.env,...config}],
  ['frontend',[path.join(root,'frontend/node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5177','--strictPort'],path.join(root,'frontend'),{...process.env,VITE_PROXY_TARGET:'http://127.0.0.1:5057',VITE_MAP_PROVIDER:'leaflet',VITE_GOOGLE_MAPS_USAGE_APPROVED:'false'}]
 ]){const out=fs.openSync(path.join(dir,name+'.log'),'a'),child=spawn(process.execPath,args,{cwd,env,detached:true,windowsHide:true,stdio:['ignore',out,out]});assert(child.pid);children.push({name,pid:child.pid,executable:process.execPath,args,cwd});child.unref();fs.closeSync(out);}
 fs.writeFileSync(pidFile,JSON.stringify({at:new Date().toISOString(),scope:'Isolated catalog DEMO only',children},null,2),{flag:'wx'});
 let ready=false;for(let i=0;i<20;i++){try{const api=await fetch('http://127.0.0.1:5057/api/places?category=hotel&limit=1',{signal:AbortSignal.timeout(1000)}),ui=await fetch('http://127.0.0.1:5177',{signal:AbortSignal.timeout(1000)});const data=await api.json();if(ui.ok&&data.meta?.total===50&&data.data[0]?.isDemo){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 assert(ready,'Owned server startup failed; inspect .local/catalog-staging/*.log and PID record');console.log(JSON.stringify({status:'READY',url:'http://127.0.0.1:5177/explore?category=hotel&city='+encodeURIComponent('Đà Nẵng'),api:'http://127.0.0.1:5057',pids:children.map(c=>({name:c.name,pid:c.pid})),credentialsFile:'.local/catalog-staging/accounts.json'}));
})().catch(e=>{console.error(e.message);process.exitCode=1;});
