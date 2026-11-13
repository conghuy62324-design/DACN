import { Router, type ErrorRequestHandler } from 'express';
import { authenticate, requireRoles, type AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { PublicAgentService, PUBLIC_AGENT_NOTICE } from '../services/publicAgentService.js';
import { HttpError } from '../utils/httpError.js';
export function createPublicAgentRouter(service=new PublicAgentService()){
 const r=Router();r.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});r.use(authenticate,requireRoles('CUSTOMER'));
 r.get('/privacy',(_req,res)=>res.json({success:true,data:{...PUBLIC_AGENT_NOTICE,enabled:service.enabled()}}));
 r.post('/chat',async(req:AuthenticatedRequest,res,next)=>{const abort=new AbortController(),close=()=>{if(!res.writableEnded)abort.abort();};res.on('close',close);try{res.json({success:true,data:await service.chat(req.user!,req.body,abort.signal)});}catch(e){next(e);}finally{res.off('close',close);}});
 r.post('/confirm',async(req:AuthenticatedRequest,res,next)=>{try{res.json({success:true,data:await service.confirm(req.user!,req.body)});}catch(e){next(e);}});
 r.delete('/sessions',(req:AuthenticatedRequest,res)=>res.json({success:true,data:service.revoke(req.user!.id)}));
 const safe:ErrorRequestHandler=(e,_req,res,_next)=>{const ok=e instanceof HttpError;res.status(ok?e.statusCode:500).json({success:false,code:ok?e.code:'AGENT_INTERNAL_ERROR',message:ok?e.message:'Chưa xử lý được hội thoại.',...(ok&&(e as any).conversation?{conversation:(e as any).conversation}:{})});};r.use(safe);return r;
}
export default createPublicAgentRouter();
