'use strict';
const assert=require('node:assert/strict'),{AsyncLocalStorage}=require('node:async_hooks'),{managedClass,makeSequelize,sqlBoundary,SELF,ACTIVITY}=require('./managed-connections.cjs'),{ConnectionBudget}=require('./connection-budget.cjs');
function createFactories({pg,Sequelize,config,registry,fence,write}){
 const records=[],byClient=new WeakMap(),scope=new AsyncLocalStorage(),controls=new Set(['BEGIN READ WRITE','COMMIT','ROLLBACK']),transactions=new Set(),audit={statements:0,forbidden:0,dml:0,expectedConflicts:0,unexpectedErrors:0},budget=new ConnectionBudget({write,stop:(e,p)=>fence.fail(e,p),isStopped:()=>fence.state.stopped||fence.state.closed});
 let cleanupMode=false;
 function track(client,reg,kind){const view=reg.view(client),r={client,registry:reg,kind,instanceId:view.instanceId,factory:view.factory,disposed:false};records.push(r);byClient.set(client,r);write({type:'FACTORY_INSTANCE_CREATED',kind,instanceId:r.instanceId,factory:r.factory});return r;}
 function countedClass(reg){return class CountedClient extends pg.Client{
  constructor(options){super({...options,connectionTimeoutMillis:10000});}
  connect(...args){const r=byClient.get(this);assert.ok(r,'MISSING_PHYSICAL_FACTORY_RECORD');budget.reserve(this,{kind:r.kind,instanceId:r.instanceId,factory:r.factory});return super.connect(...args);}
  query(...args){const r=byClient.get(this),sql=typeof args[0]==='string'?args[0]:args[0]?.text;try{
   assert.ok(r,'MISSING_SQL_FACTORY_RECORD');assert.equal(typeof sql,'string');if((fence.state.stopped||fence.state.closed)&&!cleanupMode&&r.kind!=='final-verifier')throw Error('GLOBAL_STOP_SQL_BLOCKED');
   const control=controls.has(sql);if(control){assert.ok(['maintenance','probe'].includes(r.kind),'READER_TRANSACTION_CONTROL_FORBIDDEN');assert.ok(['REGISTERED','RELEASED'].includes(r.registry.view(this).state),'CONTROL_WITHOUT_OWNERSHIP');}
   else sqlBoundary(sql,{setup:r.registry.view(this).state==='PENDING_REGISTRATION'});
   if(cleanupMode)assert.ok(sql==='ROLLBACK'||sql===ACTIVITY||sql.includes('FROM pg_locks'),'CLEANUP_SQL_OUTSIDE_SCOPE');
  }catch(e){audit.forbidden++;r?.registry.fail(e,'sql-boundary');throw e;}
  const n=++audit.statements,started=Date.now();write({type:'SQL_INTENT',number:n,instanceId:r.instanceId,kind:r.kind,sql,valuesSha256:args[0]?.values?require('node:crypto').createHash('sha256').update(JSON.stringify(args[0].values)).digest('hex'):null});
  const finish=(error,result)=>{if(error){const expected=r.kind==='probe'&&sql==='LOCK TABLE public."places" IN ROW EXCLUSIVE MODE NOWAIT'&&error.code==='55P03';if(expected)audit.expectedConflicts++;else{audit.unexpectedErrors++;r.registry.fail(error,'sql-error');}write({type:expected?'EXPECTED_LOCK_CONFLICT':'SQL_ERROR',number:n,instanceId:r.instanceId,code:error.code||error.name,message:error.message});}
   else{if(sql==='BEGIN READ WRITE')transactions.add(this);if(sql==='ROLLBACK'||sql==='COMMIT')transactions.delete(this);write({type:'SQL_COMPLETED',number:n,instanceId:r.instanceId,durationMs:Date.now()-started,rowCount:result?.rowCount??null});if(sql.includes('FROM pg_locks')||sql.includes('pg_blocking_pids'))write({type:'RAW_LOCK_METADATA',number:n,rows:result.rows});}
  };
  const last=args.length-1;if(typeof args[last]==='function'){const callback=args[last];args[last]=(e,result)=>{try{finish(e,result);}catch(w){return callback(w);}callback(e,result);};return super.query(...args);}
  const promise=super.query(...args);return promise.then(result=>{finish(null,result);return result;},error=>{finish(error);throw error;});
  }
 };}
 function disposed(client){const r=byClient.get(client);r.disposed=true;transactions.delete(client);write({type:'FACTORY_INSTANCE_DISPOSED',instanceId:r.instanceId,kind:r.kind});}
 function raw(factory,{kind='observer',reg=registry,maintenance=false}={}){
  const Counted=countedClass(reg),Managed=managedClass({RawClient:Counted,registry:reg,factory,onCreated:x=>track(x,reg,kind),onDisposed:disposed});const client=new Managed(config);client.connectionParameters.options+=' -c timezone=UTC';
  if(maintenance){client.connectionParameters.options+=' -c lock_timeout=3000';const original=client.query.bind(client);client.query=(...args)=>controls.has(typeof args[0]==='string'?args[0]:args[0]?.text)?Counted.prototype.query.apply(client,args):original(...args);}
  byClient.get(client).rawQuery=(...args)=>Counted.prototype.query.apply(client,args);return client;
 }
 function pool(){const Counted=countedClass(registry);class BoundedSequelize extends Sequelize{constructor(db,user,password,options){super(db,user,password,{...options,pool:{...options.pool,max:2}});}}
  const sequelize=makeSequelize({Sequelize:BoundedSequelize,pg:{...pg,Client:Counted},config,registry,onCreated:x=>track(x,registry,scope.getStore()?.kind||'unclassified'),onDisposed:disposed});
  const manager=sequelize.connectionManager,connect=manager._connect.bind(manager);manager._connect=options=>scope.run({kind:sequelize.options.databaseVersion===0?'bootstrap':'pool'},()=>connect(options));return sequelize;
 }
 async function cleanupQuery(client,sql,values=[]){const r=byClient.get(client);assert.ok(r&&!r.disposed,'CLEANUP_REQUIRES_OWN_CLIENT');cleanupMode=true;try{return await r.rawQuery({text:sql,values});}finally{cleanupMode=false;}}
 return{records,byClient,controls,transactions,audit,budget,raw,pool,cleanupQuery,registry};
}
module.exports={createFactories};
