import {TravelWebHttp} from './travelWebHttp.js';
import {TravelWebService,webWritesAllowed} from './travelWebService.js';
import {allowedSourceUrl,boundedSourceIds,publisherFamily} from '../agent/webTravelPolicy.js';
import {extractTravelArticle,discoverLinks} from '../agent/webTravelExtraction.js';
import {HttpError} from '../utils/httpError.js';
/** A bounded producer, never an admin/reviewer. Database leases survive process restart. */
export class TravelWebWorker {
 private busy=false;private abort?:AbortController;
 constructor(private store=new TravelWebService(),private client?:(domains:Set<string>)=>TravelWebHttp){}
 stop(){this.abort?.abort();}
 async runOnce(limit=2,scope?:{sourceIds:string[]}){if(this.busy)return{status:'BUSY',processed:0};if(!webWritesAllowed())return{status:'DISABLED',processed:0};if(scope&&(!Array.isArray(scope.sourceIds)||Object.keys(scope).some(k=>k!=='sourceIds')))throw new HttpError(400,'Phạm vi worker không hợp lệ.','WEB_SCOPE_INVALID');const sourceIds=boundedSourceIds(scope?.sourceIds);this.busy=true;this.abort=new AbortController();let processed=0;const results:any[]=[];
  try{if(typeof this.store.prune==='function')await this.store.prune(sourceIds);const selected=(await this.store.sources(true)).filter(s=>!sourceIds||sourceIds.includes(s.id));for(const source of selected){if(this.abort.signal.aborted)break;await this.store.enqueueSource(source);}
   const all=(await this.store.sources(true)).filter(s=>!sourceIds||sourceIds.includes(s.id)),http=this.client?.(new Set(all.map(s=>s.domain)))||new TravelWebHttp(new Set(all.map(s=>s.domain)),{maxAttempts:8,maxArticles:2,concurrency:1,publisherKey:host=>publisherFamily('https://'+host)||host,rateSeconds:host=>Math.max(5,...all.filter(s=>publisherFamily(s.homepage)===publisherFamily('https://'+host)).map(s=>s.rateSeconds))});
   for(let i=0;i<Math.min(2,Math.max(0,limit));i++){this.abort.signal.throwIfAborted();const job=await this.store.claim(new Date(),60,sourceIds);if(!job)break;if(sourceIds&&!sourceIds.includes(job.source_id))throw new HttpError(409,'Job nằm ngoài scope worker.','WEB_SCOPE_INVALID');processed++;
    try{allowedSourceUrl(job.source,job.url);if(Date.now()-Date.parse(job.source.robotsReviewedAt)>=6*3600000){const robotUrl=new URL('/robots.txt',job.url).href;const robot=await http.get(robotUrl,this.abort.signal,{maxBytes:131072,authorizeUrl:url=>{if(url!==robotUrl)throw Error('ROBOTS_REDIRECT_DENIED');}});if(robot.status!==200)throw Error('ROBOTS_UNAVAILABLE');job.source={...job.source,robotsText:robot.body};allowedSourceUrl(job.source,job.url);}const d=await http.get(job.url,this.abort.signal,{article:job.kind==='ARTICLE',authorizeUrl:url=>allowedSourceUrl(job.source,url),allowQuery:job.source.endpoint===job.url,headers:{etag:job.etag,modified:job.last_modified}});let result:any={notModified:d.status===304};
     if(d.status!==304){if(job.kind==='DISCOVER')await this.store.discover(job,discoverLinks(d.body,job.source.domain));else {const extraction=extractTravelArticle(d.body,d.url,job.source,d.retrievedAt);result=await this.store.storeExtraction(job,extraction);result.hasCosts=extraction.costs.length>0;}}
     await this.store.finish(job,{etag:d.headers.etag,modified:d.headers['last-modified'],hasCosts:result.hasCosts});results.push({jobId:job.id,status:d.status,...result});
    }catch(e){const code=e instanceof HttpError?e.code:this.abort.signal.aborted?'WEB_CANCELLED':'WEB_EXTRACTION_FAILED';await this.store.finish(job,{error:code});results.push({jobId:job.id,error:code});}
   }return{status:'COMPLETE',processed,results,network:http.counts};
  }finally{this.busy=false;this.abort=undefined;}
 }
}
let timer:ReturnType<typeof setInterval>|undefined,worker:TravelWebWorker|undefined;
export function startTravelWebWorker(){if(timer||process.env.TRAVEL_WEB_WORKER_ENABLED!=='true'||!webWritesAllowed())return;worker=new TravelWebWorker();timer=setInterval(()=>void worker!.runOnce().catch(()=>{}),60000);timer.unref();}
export function stopTravelWebWorker(){if(timer)clearInterval(timer);timer=undefined;worker?.stop();worker=undefined;}
