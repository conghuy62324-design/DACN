import {sequelize} from '../config/database.js';
import {ENV} from '../config/env.js';
import {ReviewProcessingWorker} from '../services/reviewProcessingService.js';
import {QueryTypes} from 'sequelize';
import {runReviewWorkerLoop} from './reviewWorkerLoop.js';
import {reviewOutboxPruneLimit} from './reviewOutboxRetention.js';
/** Separate Linux/Docker process. The timer merely wakes the persistent queue. */
export async function runReviewWorker(){
 if(process.env.REVIEW_PERSISTENT_WORKER_ENABLED!=='true')return{status:'DISABLED'};
 const scope=process.env.REVIEW_WORKER_SCOPE_IDS?.split(',').filter(Boolean),leaseSeconds=Number(process.env.REVIEW_WORKER_LEASE_SECONDS||60),retrySeconds=Number(process.env.REVIEW_WORKER_RETRY_SECONDS||5),maxCycles=process.argv.includes('--once')?1:Number(process.env.REVIEW_WORKER_MAX_CYCLES||0),pollMs=Number(process.env.REVIEW_WORKER_POLL_MS||60000);
 if(!Number.isInteger(pollMs)||pollMs<1000||pollMs>3600000||!Number.isInteger(retrySeconds)||retrySeconds<1||retrySeconds>3600||!Number.isInteger(maxCycles)||maxCycles<0||maxCycles>10000)throw Error('REVIEW_WORKER_CONFIGURATION');
 const worker=new ReviewProcessingWorker({scope,leaseSeconds,retrySeconds});
 const prune=process.env.REVIEW_WORKER_PRUNE_ENABLED==='true',pruneLimit=prune?reviewOutboxPruneLimit(process.env.REVIEW_WORKER_PRUNE_LIMIT):0;
 const acceptanceUntil=Date.parse(process.env.REVIEW_2141A_ACCEPTANCE_UNTIL||'');
 const scopedAcceptance=ENV.NODE_ENV==='test'&&process.env.REVIEW_2141A_ACCEPTANCE_PROFILE==='21.41-A'&&
  acceptanceUntil>Date.now()&&acceptanceUntil-Date.now()<=7200000&&
  scope?.length===1&&scope[0]==='2138c000-0000-4000-8000-000000000020'&&(!prune||pruneLimit===1);
 if(prune&&ENV.NODE_ENV!=='production'&&!scopedAcceptance)throw Error('REVIEW_WORKER_PRUNE_NOT_AUTHORIZED');
 sequelize.addHook('afterConnect',async(client:any)=>{await client.query("SELECT set_config('statement_timeout','8000ms',false)");});
 return runReviewWorkerLoop({
  prepare:async()=>{
   const row=(await sequelize.query<any>("SELECT current_database() db,current_user role,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,shobj_description(d.oid,'pg_database') sentinel,has_table_privilege(current_user,'users','SELECT') user_read,has_table_privilege(current_user,'reviews','SELECT') raw_review_read,has_table_privilege(current_user,'review_processing_events','DELETE') outbox_delete FROM pg_roles r CROSS JOIN pg_database d WHERE r.rolname=current_user AND d.datname=current_database()",{type:QueryTypes.SELECT}))[0];
   if(!row||row.db!==ENV.DB_NAME||row.role!==ENV.DB_USER||row.rolsuper||row.rolcreatedb||row.rolcreaterole||row.rolbypassrls||row.user_read||row.raw_review_read)throw Error('REVIEW_WORKER_PRIVILEGE_BOUNDARY');
   if(ENV.NODE_ENV==='test'){
    const historical=row.role==='review_b_worker'&&process.env.REVIEW_B_PROFILE==='21.40-B'&&
     Date.parse(process.env.REVIEW_B_WRITE_UNTIL||'')>Date.now()&&!!scope?.length;
    const current=row.role==='review_2141a_worker'&&scopedAcceptance&&(!prune||row.outbox_delete);
    if(row.db!=='hugotravel_web_integration_test_20261125'||row.sentinel!=='hugotravel-isolated-test-database-v1'||(!historical&&!current))throw Error('REVIEW_WORKER_TEST_AUTHORIZATION');
   }else if(ENV.NODE_ENV!=='production'||process.env.REVIEW_PRODUCTION_DATABASE!==row.db||row.sentinel!=='hugotravel-production-v1'||row.role!=='review_worker'||prune&&!row.outbox_delete){
    throw Error('REVIEW_WORKER_PRODUCTION_AUTHORIZATION');
   }
  },
  reconcile:()=>worker.reconcile(10,process.env.REVIEW_WORKER_RECONCILE_NOW==='true'&&ENV.NODE_ENV==='test'),
  drain:async()=>{
   if(process.env.REVIEW_WORKER_CRASH_AFTER_CLAIM==='true'&&ENV.NODE_ENV==='test'){
    const job=await worker.claim();
    console.log(JSON.stringify({event:'REVIEW_TEST_CRASH_AFTER_CLAIM',placeId:job?.place_id,claimed:!!job}));
    process.exit(73);
   }
   return worker.runOnce(2);
  },
  ...(prune?{prune:()=>worker.pruneCompletedEvents(pruneLimit)}:{}),
  stop:()=>worker.stop(),
  close:()=>sequelize.close(),
 },{pollMs,maxCycles,log:event=>console.log(JSON.stringify(event))});
}
if(require.main===module)runReviewWorker().then(result=>console.log(JSON.stringify({event:'REVIEW_WORKER_EXIT',...result}))).catch(()=>{console.error(JSON.stringify({event:'REVIEW_WORKER_FAILED',code:'REVIEW_WORKER_BOUNDARY_OR_DATABASE'}));process.exitCode=1;});
