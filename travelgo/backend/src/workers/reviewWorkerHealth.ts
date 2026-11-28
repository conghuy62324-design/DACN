import {QueryTypes} from 'sequelize';
import {sequelize} from '../config/database.js';
import {REVIEW_PROCESSING_VERSION} from '../services/reviewProcessingService.js';

/** Read-only probe for a dedicated worker container. It never starts processing. */
export async function reviewWorkerHealth(maxAgeSeconds=180){
 if(process.env.REVIEW_PERSISTENT_WORKER_ENABLED!=='true'||!Number.isInteger(maxAgeSeconds)||maxAgeSeconds<30||maxAgeSeconds>3600)throw Error('REVIEW_WORKER_HEALTH_DISABLED');
 const [row]=await sequelize.query<any>("SELECT current_user AS role,r.rolsuper,r.rolcreatedb,r.rolcreaterole,r.rolbypassrls,has_table_privilege(current_user,'reviews','SELECT') AS raw_review_read,has_table_privilege(current_user,'users','SELECT') AS user_read,extract(epoch FROM (now()-s.heartbeat_at)) AS age_seconds FROM pg_roles r LEFT JOIN review_worker_state s ON s.state_key=$1 WHERE r.rolname=current_user",{bind:[REVIEW_PROCESSING_VERSION],type:QueryTypes.SELECT});
 const age=row?.age_seconds==null?NaN:Number(row.age_seconds);
 if(!row||row.rolsuper||row.rolcreatedb||row.rolcreaterole||row.rolbypassrls||row.raw_review_read||row.user_read||
    !Number.isFinite(age)||age<0||age>maxAgeSeconds)throw Error('REVIEW_WORKER_HEALTH_STALE_OR_PRIVILEGED');
 return{status:'READY',role:row.role,heartbeatAgeSeconds:Math.ceil(age)};
}
if(require.main===module)reviewWorkerHealth(Number(process.env.REVIEW_WORKER_HEALTH_MAX_AGE_SECONDS||180)).then(r=>console.log(JSON.stringify(r))).catch(()=>{console.error(JSON.stringify({status:'NOT_READY'}));process.exitCode=1;}).finally(()=>sequelize.close());
