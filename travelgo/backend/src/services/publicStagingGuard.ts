import { ENV } from '../config/env.js';
import { sequelize } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';
/** No query at all unless separately approved, explicitly named staging target is configured. */
export async function assertPublicStagingWrite(){
 const name=process.env.PUBLIC_STAGING_DB_NAME,sentinel=process.env.PUBLIC_STAGING_DB_SENTINEL;
 const fail=()=>new HttpError(403,'Ghi Trip chỉ được bật trên staging riêng đã phê duyệt.','AGENT_STAGING_WRITE_BLOCKED');
 if(process.env.PUBLIC_STAGING_WRITES_APPROVED!=='true'||!name||name!==ENV.DB_NAME||!/^travelgo_(public|staging|demo)_[a-z0-9_]+$/.test(name)||['travelgo_dev','travelgo_ai_m0_test'].includes(name)||!sentinel||!sentinel.startsWith('travelgo-public-staging:')||ENV.DB_USER==='postgres')throw fail();
 const[r]:any=await sequelize.query("SELECT current_database() AS db,current_user AS role,r.rolsuper,shobj_description(d.oid,'pg_database') AS sentinel FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()");
 if(r.length!==1||r[0].db!==name||r[0].role!==ENV.DB_USER||r[0].rolsuper!==false||r[0].sentinel!==sentinel)throw fail();
}
