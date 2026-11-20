import { Router } from 'express';
import { BookingController } from '../controllers/bookingController.js';
import { validateSecureBookingRequest } from '../validators/validators.js';
import { authenticate, requireRoles } from '../middlewares/authMiddleware.js';
import {BookingService} from '../services/bookingService.js';
import {objectOnly,uuid} from '../hotels/validation.js';
import {HttpError} from '../utils/httpError.js';

const router = Router();

router.use(authenticate);
const hotelEnabled=(_req:any,res:any,next:any)=>process.env.HOTEL_DOMAIN_ENABLED==='true'?next():res.status(404).json({success:false,code:'HOTEL_DOMAIN_DISABLED',message:'Module khách sạn chưa được mở.'});
const hotelWrap=(fn:any)=>(req:any,res:any,next:any)=>Promise.resolve(fn(req,res)).catch(e=>{if(e.parent||e.original)return next(new HttpError(409,'Giao dịch chưa hoàn thành; kiểm tra trạng thái ý định rồi lấy báo giá mới nếu cần.','HOTEL_TRANSACTION_CONFLICT'));next(e);});
router.post('/hotel/:placeId/prepare',hotelEnabled,requireRoles('CUSTOMER'),hotelWrap(async(req:any,res:any)=>{res.set('Cache-Control','no-store');const data=await BookingService.prepareHotelStay(req.user.id,uuid(req.params.placeId),req.body,req.header('Idempotency-Key'));res.json({success:true,data});}));
router.post('/hotel/confirm',hotelEnabled,requireRoles('CUSTOMER'),hotelWrap(async(req:any,res:any)=>{res.set('Cache-Control','no-store');const data=await BookingService.confirmHotelStay(req.user.id,req.body,req.header('Idempotency-Key'));res.status(data.idempotentReplay?200:201).json({success:true,message:'Đã ghi nhận đặt phòng sandbox, chưa thu tiền.',data});}));
router.post('/hotel/intent-status',hotelEnabled,requireRoles('CUSTOMER'),hotelWrap(async(req:any,res:any)=>{objectOnly(req.body,['idempotencyKey']);res.set('Cache-Control','no-store');res.json({success:true,data:await BookingService.hotelIntentStatus(req.user.id,req.body.idempotencyKey)});}));
router.post('/', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), validateSecureBookingRequest, BookingController.createBooking);
router.get('/my', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), BookingController.getMyBookings);
router.get('/', requireRoles('SUPER_ADMIN'), BookingController.getBookings);
router.post('/:id/cancel', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), BookingController.cancel);
router.get('/:code', requireRoles('CUSTOMER', 'PARTNER', 'SUPER_ADMIN'), BookingController.getBookingByCode);
router.patch('/:id/status', requireRoles('SUPER_ADMIN'), BookingController.updateStatus);

export default router;
