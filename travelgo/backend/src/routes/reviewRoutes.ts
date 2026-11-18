import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';
import {sequelize} from '../config/database.js';
import {QueryTypes} from 'sequelize';
import {Review} from '../models/Review.js';
import {HttpError} from '../utils/httpError.js';
import {reviewInsightsEnabled} from '../services/reviewInsightService.js';

const router = Router();
router.use(authenticate);
router.get('/me', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), ReviewController.mine);
router.get('/moderation-queue',requireRoles('SUPER_ADMIN'),async(_req,res,next)=>{try{if(!reviewInsightsEnabled())throw new HttpError(503,'Ch?a b?t qu?n l? t?ng h?p ??nh gi?.','REVIEW_INSIGHTS_UNAVAILABLE');const data=await sequelize.query("SELECT r.id,r.target_id AS \"targetId\",r.comment,r.moderation_status AS \"moderationStatus\",count(p.review_id)::int AS reports FROM reviews r LEFT JOIN review_reports p ON p.review_id=r.id WHERE r.moderation_status='PENDING' OR p.review_id IS NOT NULL GROUP BY r.id ORDER BY r.created_at DESC LIMIT 100",{type:QueryTypes.SELECT});res.json({success:true,data});}catch(e){next(e);}});
router.post('/:id/report',requireRoles('CUSTOMER'),async(req:any,res,next)=>{try{if(!reviewInsightsEnabled())throw new HttpError(503,'Ch?a b?t b?o c?o ??nh gi?.','REVIEW_INSIGHTS_UNAVAILABLE');if(!req.body||Object.keys(req.body).some(k=>k!=='reason')||!['SPAM','ABUSE','PRIVACY','MISLEADING'].includes(req.body.reason))throw new HttpError(400,'Lý do báo cáo chưa hợp lệ.','INVALID_REVIEW_REPORT');const review=await Review.findByPk(String(req.params.id));if(!review||review.moderationStatus!=='PUBLISHED')throw new HttpError(404,'Không tìm thấy đánh giá công khai.','REVIEW_NOT_FOUND');await sequelize.query('INSERT INTO review_reports(review_id,reporter_id,reason) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',{bind:[review.id,req.user.id,req.body.reason]});res.json({success:true,data:{reported:true}});}catch(e){next(e);}});
router.patch('/:id', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), ReviewController.update);
router.delete('/:id', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), ReviewController.remove);
router.patch('/:id/moderation', requireRoles('SUPER_ADMIN'), ReviewController.moderate);

export default router;
