'use strict';
const {ACTIVITY}=require('./managed-connections.cjs');
const LOCKS="SELECT l.pid,c.relname,l.mode,l.granted FROM pg_locks l JOIN pg_class c ON c.oid=l.relation JOIN pg_namespace n ON n.oid=c.relnamespace WHERE l.database=(SELECT oid FROM pg_database WHERE datname=current_database()) AND n.nspname='public' AND l.pid=ANY($1::int[]) ORDER BY l.pid,c.relname,l.mode";
async function cleanupOwned({factories:f,sequelize,held,observer,fence,write}){
 fence.close();const errors=[];const note=(phase,e)=>{errors.push({phase,message:e.message});fence.fail(e,phase);write({type:'RESOURCE_CLEANUP_ERROR',phase,message:e.message});};
 for(const client of [...f.transactions])try{await f.cleanupQuery(client,'ROLLBACK');}catch(e){note('rollback',e);}
 if(sequelize){for(const client of [...held])try{await sequelize.connectionManager.releaseConnection(client);held.delete(client);}catch(e){note('pool-release',e);}try{await sequelize.close();}catch(e){note('pool-close',e);}}
 for(const r of f.records.filter(x=>x.client!==observer&&!x.disposed))try{await r.client.end();}catch(e){note('client-end',e);}
 let activity=[],locks=[],residual=[],unknown=[];
 if(observer&&!f.byClient.get(observer)?.disposed)try{
  activity=(await f.cleanupQuery(observer,ACTIVITY)).rows;const ids=f.records.filter(x=>x.client!==observer).map(x=>x.client.processID).filter(Number.isInteger);locks=(await f.cleanupQuery(observer,LOCKS,[ids])).rows;
  const known=f.records.map(r=>r.registry.view(r.client));residual=activity.filter(row=>known.some(r=>r.instanceId!==f.byClient.get(observer).instanceId&&r.identity?.pid===row.pid&&r.identity?.backend_start===row.backend_start&&r.identity?.application_name===row.application_name));
  unknown=activity.filter(row=>!known.some(r=>r.identity?.pid===row.pid&&r.identity?.backend_start===row.backend_start&&r.identity?.application_name===row.application_name));write({type:'RAW_RESOURCE_CLOSING_INVENTORY',activity,locks,residual,unknown});
 }catch(e){note('cleanup-observation',e);}
 if(observer&&!f.byClient.get(observer)?.disposed)try{await observer.end();}catch(e){note('observer-end',e);}
 const allOwnedDisposed=f.records.every(x=>x.disposed),noOwnedResidual=residual.length===0&&locks.length===0&&f.transactions.size===0,status=allOwnedDisposed&&noOwnedResidual?(errors.length?'CLEANED_WITH_ERRORS':'RESOURCE_CLEANUP_PASS'):'RESOURCE_CLEANUP_BLOCKED';
 if(status==='RESOURCE_CLEANUP_BLOCKED')fence.fail(Error(status),'resource-cleanup');if(unknown.length)fence.fail(Error('UNKNOWN_EXTERNAL_AT_RESOURCE_CLOSING'),'resource-closing');return{status,allOwnedDisposed,noOwnedResidual,errors,residual,locks,unknown,records:f.records.map(r=>({instanceId:r.instanceId,kind:r.kind,disposed:r.disposed,identity:r.registry.view(r.client).identity}))};
}
module.exports={cleanupOwned,LOCKS};
