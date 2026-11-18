import {Router} from 'express';import {authenticate,requireRoles,type AuthenticatedRequest} from '../middlewares/authMiddleware.js';import {LanguageMemoryService} from '../services/languageMemoryService.js';
const router=Router();router.use(authenticate,requireRoles('SUPER_ADMIN'));
const route=(f:(r:AuthenticatedRequest)=>Promise<any>)=>async(req:any,res:any,next:any)=>{try{res.setHeader('Cache-Control','no-store');res.json({success:true,data:await f(req)});}catch(e){next(e);}};
router.get('/',route(r=>LanguageMemoryService.candidates(r.user!)));
router.get('/:id/versions',route(r=>LanguageMemoryService.versions(r.user!,String(r.params.id))));
router.patch('/:id',route(r=>LanguageMemoryService.moderate(r.user!,String(r.params.id),r.body)));
router.delete('/:id',route(r=>LanguageMemoryService.pruneCandidate(r.user!,String(r.params.id),r.body)));
export default router;
