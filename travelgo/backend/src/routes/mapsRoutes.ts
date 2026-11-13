import { Router, type ErrorRequestHandler } from 'express';
import { authenticate, type AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { GoogleMapsService } from '../services/googleMapsService.js';
import { HttpError } from '../utils/httpError.js';
import { MapsAgentService } from '../services/mapsAgentService.js';
export function createMapsRouter(service=new GoogleMapsService(),agent=new MapsAgentService(service)){
 const router=Router();router.use(authenticate);router.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 for(const action of ['search','details','route'] as const)router.post('/'+action,async(req:AuthenticatedRequest,res,next)=>{try{const body=req.body;if(!body||typeof body!=='object'||Array.isArray(body)||action!=='route'&&Object.keys(body).some(k=>k!==(action==='search'?'query':'placeId')))throw new HttpError(400,'Yêu cầu bản đồ không hợp lệ.','MAPS_INVALID_INPUT');const data=action==='search'?await service.search(req.user!.id,body.query):action==='details'?await service.details(req.user!.id,body.placeId):await service.route(req.user!.id,body);res.json({success:true,data});}catch(e){next(e);}});
 router.post('/assistant',async(req:AuthenticatedRequest,res,next)=>{const abort=new AbortController();const close=()=>{if(!res.writableEnded)abort.abort();};res.on('close',close);try{res.json({success:true,data:await agent.chat(req.user!.id,req.body,abort.signal)});}catch(e){next(e);}finally{res.off('close',close);}});
 const safe:ErrorRequestHandler=(e,_req,res,_next)=>{res.setHeader('Cache-Control','no-store');const ok=e instanceof HttpError;res.status(ok?e.statusCode:500).json({success:false,code:ok?e.code:'MAPS_INTERNAL_ERROR',message:ok?e.message:'Không thể xử lý bản đồ.'});};router.use(safe);return router;
}
export default createMapsRouter();
