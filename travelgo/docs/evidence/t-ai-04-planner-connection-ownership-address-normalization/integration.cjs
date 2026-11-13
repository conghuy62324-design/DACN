'use strict';
const assert=require('node:assert/strict'),{makeClosingGuard}=require('./closing-guard.cjs');
// Mutates only the supplied test-harness instance, never Base/library/source.
function wireMaintenance(maintenance,{registry,createClient,write}){
 const closing=holder=>makeClosingGuard({registry,write,readActivity:async sql=>(await maintenance.sql(holder(),sql)).rows});
 maintenance.foreignConnections=closing(()=>maintenance.a);
 maintenance.foreignConnectionsViaB=closing(()=>maintenance.b);
 maintenance.client=async function(label){const client=await createClient(label);this.clients.push(client);return client;};
 return maintenance;
}
function makeRuntimeDb({Sequelize,pg,config,registry,onCreated,onDisposed}){
 const {makeSequelize,sqlBoundary}=require('./managed-connections.cjs');const sequelize=makeSequelize({Sequelize,pg,config,registry,onCreated,onDisposed});
 const original=sequelize.query.bind(sequelize),audit={queries:0,forbidden:0};sequelize.query=(sql,options)=>{try{sqlBoundary(typeof sql==='string'?sql:sql?.query);audit.queries++;return original(sql,options);}catch(e){audit.forbidden++;registry.fail(e,'runtime-readonly');return Promise.reject(e);}};
 return{sequelize,audit};
}
module.exports={wireMaintenance,makeRuntimeDb};
