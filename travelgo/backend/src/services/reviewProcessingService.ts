import {QueryTypes,Transaction} from 'sequelize';
import {randomUUID,createHash} from 'node:crypto';
import {sequelize} from '../config/database.js';
import {summarizeReviewEvidence,REVIEW_ANALYSIS_METHOD} from '../agent/reviewAspects.js';
import {REVIEW_OUTBOX_PRUNE_SQL,reviewOutboxPruneLimit} from '../workers/reviewOutboxRetention.js';
export const REVIEW_PROCESSING_VERSION='REVIEW_SCOPED_V4';
export const persistentReviewsEnabled=()=>process.env.REVIEW_PERSISTENCE_ENABLED==='true';
const q=async(sql:string,bind:any[]=[],transaction?:Transaction)=>sequelize.query<any>(sql,{bind,transaction,type:QueryTypes.SELECT});
const validId=(s:string)=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s);
const stamp=(rows:any[])=>createHash('sha256').update(JSON.stringify([REVIEW_PROCESSING_VERSION,REVIEW_ANALYSIS_METHOD,rows.map(r=>[r.review_id,String(r.ai_revision),r.room_type_id])])).digest('hex');
async function inputs(place:string,withText:boolean,t?:Transaction){
 const rows=await q(`SELECT review_id,place_id,ai_revision,room_type_id,rating,verification_status,created_at,updated_at,category,is_demo${withText?',comment':''} FROM review_ai_inputs WHERE place_id=$1 ORDER BY review_id LIMIT 501`,[place],t);
 if(rows.length>500)throw Error('REVIEW_INPUT_BOUND_EXCEEDED');return rows;
}
function scopeSummary(rows:any[],place:string,room:string|null,category:string){
 const summary=summarizeReviewEvidence(rows.map(r=>({id:r.review_id,revision:String(r.ai_revision),comment:r.comment,rating:+r.rating,verificationStatus:r.verification_status,aiUsageAllowed:true})),category);
 const dates=rows.flatMap(r=>[new Date(r.created_at).toISOString(),new Date(r.updated_at).toISOString()]).sort();
 return {...summary,placeId:place,roomTypeId:room,attribution:room?'EXACT_VERIFIED_BOOKING_ITEM':'HOTEL_ONLY',observationPeriod:dates.length?{from:dates[0],until:dates[dates.length-1],basis:'REVIEW_SUBMISSION_AND_LAST_EDIT_NOT_CURRENT_PRICE_OR_STAY_DATE'}:null,eligibilityState:summary.analyzedReviewCount?'ELIGIBLE':'INSUFFICIENT',processingVersion:REVIEW_PROCESSING_VERSION,sourceRevisions:rows.map(r=>({reviewId:r.review_id,revision:String(r.ai_revision)}))};
}
export class ReviewProcessingService {
 /** Public READ ONLY path. An old aggregate is unavailable immediately on any revision/eligibility mismatch. */
 static async read(placeId:string,roomTypeId?:string){
  const result=await this.readRooms(placeId,roomTypeId?[roomTypeId]:[]);
  return roomTypeId?result.rooms[roomTypeId]:result.hotel;
 }
 static async readRooms(placeId:string,roomTypeIds:readonly string[]){
  if(!validId(placeId)||roomTypeIds.length>10||roomTypeIds.some(id=>!validId(id)))throw Error('REVIEW_SCOPE_INVALID');
  return sequelize.transaction({isolationLevel:Transaction.ISOLATION_LEVELS.REPEATABLE_READ,readOnly:true},async t=>{
   await q('SET TRANSACTION READ ONLY',[],t);
   const target=(await q('SELECT * FROM review_ai_targets WHERE place_id=$1',[placeId],t))[0];
   const unavailable=(status:string)=>{
    const hotel={status,placeId,roomTypeId:null,hotel:null,room:null,isDemo:undefined,opinionOnly:true};
    return {hotel,rooms:Object.fromEntries(roomTypeIds.map(id=>[id,{...hotel,roomTypeId:id}]))};
   };
   if(!target?.eligible)return unavailable('INELIGIBLE');
   const rows=await inputs(placeId,false,t),job=(await q('SELECT revision,processed_revision FROM review_insight_jobs WHERE place_id=$1',[placeId],t))[0],cache=(await q('SELECT * FROM review_insights WHERE place_id=$1',[placeId],t))[0];
   if(!cache||cache.method!==REVIEW_ANALYSIS_METHOD||String(cache.source_revision)!==String(job?.revision)||cache.data.sourceStamp!==stamp(rows))return unavailable('PENDING_OR_INSUFFICIENT');
   const hotel={status:cache.status,placeId,roomTypeId:null,hotel:cache.data.hotel,room:null,sourceRevision:String(cache.source_revision),sourceStamp:cache.data.sourceStamp,processingVersion:REVIEW_PROCESSING_VERSION,generatedAt:cache.computed_at,validatedAt:new Date().toISOString(),isDemo:!!target.is_demo,opinionOnly:true};
   return {hotel,rooms:Object.fromEntries(roomTypeIds.map(id=>[id,{...hotel,roomTypeId:id,room:cache.data.rooms[id]||null}]))};
  });
 }
}
export type ScopedReviewEvidence=Awaited<ReturnType<typeof ReviewProcessingService.read>>;
export function nextReviewDaily(now=new Date(),time=process.env.REVIEW_RECONCILE_TIME||'03:00'){
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('REVIEW_SCHEDULE_INVALID');
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 let next=Date.parse(day+'T'+time+':00+07:00');if(next<=now.getTime())next+=86400000;return new Date(next);
}
export class ReviewProcessingWorker {
 private stopping=false;
 readonly key='REVIEW_SCOPED_V4';
 constructor(readonly options:{scope?:string[];leaseSeconds?:number;retrySeconds?:number;maxAttempts?:number}={}){
  if(options.scope&&(!options.scope.length||options.scope.length>20||options.scope.some(s=>!validId(s))))throw Error('REVIEW_WORKER_SCOPE');
  if(options.leaseSeconds!==undefined&&(options.leaseSeconds<5||options.leaseSeconds>300))throw Error('REVIEW_WORKER_LEASE');
 }
 stop(){this.stopping=true;}
 async claim(){
  if(this.stopping)return null;const token=randomUUID();
  return sequelize.transaction(async t=>{
   if(this.stopping)return null;
   await q("WITH exhausted AS (SELECT place_id FROM review_insight_jobs WHERE attempts>=$1 AND (state='PENDING' OR state='RUNNING' AND lease_until<now()) AND ($2::uuid[] IS NULL OR place_id=ANY($2::uuid[])) ORDER BY updated_at,place_id LIMIT 25 FOR UPDATE SKIP LOCKED), failed AS (UPDATE review_insight_jobs j SET state='FAILED',last_error='MAX_ATTEMPTS',lease_token=NULL,lease_until=NULL,updated_at=now() FROM exhausted x WHERE j.place_id=x.place_id RETURNING j.place_id,j.revision) UPDATE review_processing_events e SET state='FAILED' FROM failed f WHERE e.place_id=f.place_id AND e.place_revision<=f.revision AND e.state IN ('PENDING','RUNNING') RETURNING e.place_id",[this.options.maxAttempts||3,this.options.scope||null],t);
   if(this.stopping)return null;
   const rows=await q(`UPDATE review_insight_jobs j SET state='RUNNING',claimed_revision=revision,lease_token=$1,lease_until=now()+make_interval(secs=>$2),heartbeat_at=now(),attempts=attempts+1
    WHERE j.place_id=(SELECT place_id FROM review_insight_jobs WHERE ($3::uuid[] IS NULL OR place_id=ANY($3::uuid[])) AND attempts<$4 AND ((state='PENDING' AND next_attempt_at<=now()) OR (state='RUNNING' AND lease_until<now())) ORDER BY updated_at,place_id FOR UPDATE SKIP LOCKED LIMIT 1)
    RETURNING j.*`,[token,this.options.leaseSeconds||60,this.options.scope||null,this.options.maxAttempts||3],t);
   const job=rows[0];if(job)await q("UPDATE review_processing_events SET state='RUNNING' WHERE place_id=$1 AND place_revision<=$2 AND state IN ('PENDING','RUNNING')",[job.place_id,job.claimed_revision],t);return job||null;
  });
 }
 async heartbeat(job:any){return q('UPDATE review_insight_jobs SET heartbeat_at=now(),lease_until=now()+make_interval(secs=>$3) WHERE place_id=$1 AND lease_token=$2 AND lease_until>now() RETURNING place_id',[job.place_id,job.lease_token,this.options.leaseSeconds||60]);}
 async pruneCompletedEvents(limit:number){
  reviewOutboxPruneLimit(String(limit));
  if(this.stopping)return 0;
  return (await q(REVIEW_OUTBOX_PRUNE_SQL,[limit,this.options.scope||null])).length;
 }
 async process(job:any){
  try{
   const rows=await inputs(job.place_id,true),target=(await q('SELECT * FROM review_ai_targets WHERE place_id=$1',[job.place_id]))[0];
   const hotel=scopeSummary(rows.filter(r=>!r.room_type_id),job.place_id,null,target?.category||'hotel'),rooms:Record<string,any>={};for(const id of [...new Set(rows.map(r=>r.room_type_id).filter(Boolean))])rooms[id]=scopeSummary(rows.filter(r=>r.room_type_id===id),job.place_id,id,target?.category||'hotel');
   const data={placeId:job.place_id,isDemo:!!target?.is_demo,sourceStamp:stamp(rows),processingVersion:REVIEW_PROCESSING_VERSION,method:REVIEW_ANALYSIS_METHOD,hotel,rooms,eligibilityState:target?.eligible?'ELIGIBLE':'INELIGIBLE',generatedAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
   return await sequelize.transaction(async t=>{
    const current=(await q('SELECT * FROM review_insight_jobs WHERE place_id=$1 FOR UPDATE',[job.place_id],t))[0];
    if(!current||current.lease_token!==job.lease_token||String(current.revision)!==String(job.claimed_revision)||new Date(current.lease_until).getTime()<=Date.now())return{status:'SUPERSEDED',placeId:job.place_id};
    const fresh=await inputs(job.place_id,false,t);if(stamp(fresh)!==data.sourceStamp){await q("UPDATE review_insight_jobs SET state='PENDING',lease_token=NULL,lease_until=NULL,next_attempt_at=now() WHERE place_id=$1 AND lease_token=$2",[job.place_id,job.lease_token],t);return{status:'SUPERSEDED',placeId:job.place_id};}
    await q("INSERT INTO review_insights(place_id,source_revision,method,status,data) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(place_id) DO UPDATE SET source_revision=excluded.source_revision,method=excluded.method,status=excluded.status,data=excluded.data,computed_at=now() WHERE review_insights.source_revision<=excluded.source_revision",[job.place_id,job.claimed_revision,REVIEW_ANALYSIS_METHOD,rows.length?'READY':'INSUFFICIENT',JSON.stringify(data)],t);
    await q("UPDATE review_insight_jobs SET processed_revision=$2,state='COMPLETED',lease_token=NULL,lease_until=NULL,last_error=NULL,last_success_at=now(),updated_at=now() WHERE place_id=$1 AND lease_token=$3",[job.place_id,job.claimed_revision,job.lease_token],t);
    await q("UPDATE review_processing_events SET state='COMPLETED',processed_at=now() WHERE place_id=$1 AND place_revision<=$2 AND state<>'COMPLETED'",[job.place_id,job.claimed_revision],t);
    return{status:'COMPLETED',placeId:job.place_id,revision:String(job.claimed_revision),reviews:rows.length};
   });
  }catch{await this.fail(job);return{status:'RETRY_OR_FAILED',placeId:job.place_id};}
 }
 async fail(job:any){const delay=Math.min(3600,(this.options.retrySeconds||5)*2**Math.min(10,job.attempts-1));return sequelize.transaction(async t=>{
  const rows=await q("UPDATE review_insight_jobs SET state=CASE WHEN attempts>=$3 THEN 'FAILED' ELSE 'PENDING' END,last_error='REVIEW_PROCESSING_FAILED',next_attempt_at=now()+make_interval(secs=>$4),lease_token=NULL,lease_until=NULL WHERE place_id=$1 AND lease_token=$2 RETURNING state",[job.place_id,job.lease_token,this.options.maxAttempts||3,delay],t);
  if(rows[0]?.state==='FAILED')await q("UPDATE review_processing_events SET state='FAILED' WHERE place_id=$1 AND place_revision<=$2 AND state<>'COMPLETED'",[job.place_id,job.claimed_revision],t);
 });}
 async reconcile(limit=10,force=false){
  if(this.stopping)return{status:'STOPPED',checked:0};
  if(limit<1||limit>50)throw Error('REVIEW_RECONCILE_BOUND');const token=randomUUID();
  const state=await sequelize.transaction(async t=>{
   await q('INSERT INTO review_worker_state(state_key) VALUES($1) ON CONFLICT DO NOTHING',[this.key],t);
   return(await q(`UPDATE review_worker_state SET reconcile_token=$2,reconcile_until=now()+interval '60 seconds' WHERE state_key=$1 AND (reconcile_until IS NULL OR reconcile_until<now()) AND ($3::boolean OR next_reconcile_at<=now() OR reconcile_cursor IS NOT NULL OR coalesce(metrics->>'analysisMethod','')<>$4) RETURNING *`,[this.key,token,force,REVIEW_ANALYSIS_METHOD],t))[0];
  });if(!state)return{status:'NOT_DUE',checked:0};
  const targets=await q('SELECT * FROM review_ai_targets WHERE ($1::uuid[] IS NULL OR place_id=ANY($1::uuid[])) AND ($2::uuid IS NULL OR place_id>$2::uuid) ORDER BY place_id LIMIT $3',[this.options.scope||null,state.reconcile_cursor,limit]);let queued=0;
  for(const target of targets){if(this.stopping)return{status:'STOPPED',checked:0};const rows=await inputs(target.place_id,false),cache=(await q('SELECT data,method FROM review_insights WHERE place_id=$1',[target.place_id]))[0],job=(await q('SELECT state,revision,processed_revision FROM review_insight_jobs WHERE place_id=$1',[target.place_id]))[0];
   // Do not steal a live lease or reset retry/dead-letter policy during reconciliation.
   if(job&&['PENDING','RUNNING','FAILED'].includes(job.state))continue;
   if(!this.stopping&&(!job||!cache||cache.method!==REVIEW_ANALYSIS_METHOD||cache.data.sourceStamp!==stamp(rows)||cache.data.eligibilityState!==(target.eligible?'ELIGIBLE':'INELIGIBLE'))){await q('SELECT queue_place_review_insights($1)',[target.place_id]);queued++;}
  }
  const cursor=targets.length===limit?targets[targets.length-1].place_id:null;
  await q('UPDATE review_worker_state SET reconcile_cursor=$3,next_reconcile_at=$4,reconcile_token=NULL,reconcile_until=NULL,updated_at=now() WHERE state_key=$1 AND reconcile_token=$2',[this.key,token,cursor,cursor?new Date():nextReviewDaily()]);return{status:'RECONCILED',checked:targets.length,queued,cursor};
 }
 async runOnce(limit=2){if(!Number.isInteger(limit)||limit<0||limit>5)throw Error('REVIEW_WORKER_BATCH_BOUND');const results=[];for(let i=0;i<limit&&!this.stopping;i++){const job=await this.claim();if(!job)break;results.push(await this.process(job));}
  await q("INSERT INTO review_worker_state(state_key,heartbeat_at,last_success_at,metrics) VALUES($1,now(),CASE WHEN $3::boolean THEN now() ELSE NULL END,$2::jsonb) ON CONFLICT(state_key) DO UPDATE SET heartbeat_at=now(),last_success_at=CASE WHEN $3::boolean THEN now() ELSE review_worker_state.last_success_at END,metrics=excluded.metrics,updated_at=now()",[this.key,JSON.stringify({processed:results.length,completed:results.filter(r=>r.status==='COMPLETED').length,processingVersion:REVIEW_PROCESSING_VERSION,analysisMethod:REVIEW_ANALYSIS_METHOD}),results.every(r=>r.status==='COMPLETED')]);return{status:this.stopping?'STOPPED':'COMPLETE',results};
 }
}
