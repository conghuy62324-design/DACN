import {Router} from 'express';
import {authenticate,requireRoles} from '../middlewares/authMiddleware.js';
import {TravelKnowledgeService} from '../services/travelKnowledgeService.js';
const router=Router();
router.use(authenticate,requireRoles('SUPER_ADMIN'));
router.get('/',async(_req,res,next)=>{try{res.json({success:true,data:await TravelKnowledgeService.adminList()});}catch(e){next(e);}});
router.post('/',async(req:any,res,next)=>{try{res.status(201).json({success:true,data:await TravelKnowledgeService.write(req.user,req.body)});}catch(e){next(e);}});
router.patch('/:id',async(req:any,res,next)=>{try{res.json({success:true,data:await TravelKnowledgeService.write(req.user,req.body,String(req.params.id))});}catch(e){next(e);}});
export default router;
