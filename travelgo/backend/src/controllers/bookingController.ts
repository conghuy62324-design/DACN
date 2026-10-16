import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { BookingService, BookingStatus } from '../services/bookingService.js';

export class BookingController {
  static async createBooking(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const{serviceType,serviceId,bookingDate,returnDate,adultsCount,childrenCount,quantity,customerPhone,notes,recommendationRequestId,recommendationSessionId}=req.body;const data=await BookingService.createBooking(req.user!.id,{serviceType,serviceId,bookingDate,returnDate,adultsCount:Number(adultsCount||1),childrenCount:Number(childrenCount||0),quantity:quantity?Number(quantity):undefined,customerPhone,notes,recommendationRequestId,recommendationSessionId},req.header('Idempotency-Key'));res.status(201).json({success:true,message:'Đã tạo booking, đang chờ xác nhận',data});}catch(error){next(error);}}
  static async getBookings(_req:AuthenticatedRequest,res:Response,next:NextFunction){try{const data=await BookingService.getAllBookings();res.json({success:true,count:data.length,data});}catch(error){next(error);}}
  static async getMyBookings(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const data=await BookingService.getBookingsByUser(req.user!.id);res.json({success:true,count:data.length,data});}catch(error){next(error);}}
  static async getBookingByCode(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const data=req.user!.roles.includes('SUPER_ADMIN')?await BookingService.getBookingByIdOrCode(String(req.params.code)):await BookingService.getOwned(req.user!.id,String(req.params.code));res.json({success:true,data});}catch(error){next(error);}}
  static async updateStatus(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const data=await BookingService.changeStatus(String(req.params.id),req.body.status as BookingStatus,req.user!,req.body.reason);res.json({success:true,data});}catch(error){next(error);}}
  static async cancel(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const data=await BookingService.cancelByCustomer(req.user!.id,String(req.params.id),req.body.reason);res.json({success:true,message:'Đã hủy booking',data});}catch(error){next(error);}}
}
