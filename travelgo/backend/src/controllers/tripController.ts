import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { TripSessionService } from '../services/tripSessionService.js';

const id=(req:AuthenticatedRequest)=>String(req.params.id);
export class TripController {
  static async getTrips(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const data=await TripSessionService.getAllTrips(req.user!.id);res.json({success:true,count:data.length,data});}catch(error){next(error);}}
  static async getTripById(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const data=await TripSessionService.getTripById(id(req),req.user!.id);if(!data){res.status(404).json({success:false,message:'Không tìm thấy chuyến đi'});return;}res.json({success:true,data});}catch(error){next(error);}}
  static async createTrip(req:AuthenticatedRequest,res:Response,next:NextFunction){try{if(!req.body.itinerary?.days){res.status(400).json({success:false,message:'Dữ liệu lịch trình không hợp lệ'});return;}const data=await TripSessionService.createTripFromPlanner(req.body.itinerary,req.user!.id,req.user!.fullName);res.status(201).json({success:true,message:'Đã lưu hành trình',data});}catch(error){next(error);}}
  static async updateTrip(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const {title,name,notes,actualSpentVND,isPublic,days,itinerary}=req.body;const data=await TripSessionService.updateTrip(id(req),req.user!.id,{name:name||title,notes,actualSpentVND,isPublic,itinerary:itinerary||days});if(!data){res.status(404).json({success:false,message:'Không tìm thấy chuyến đi'});return;}res.json({success:true,data});}catch(error){next(error);}}
  static async deleteTrip(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const success=await TripSessionService.deleteTrip(id(req),req.user!.id);if(!success){res.status(404).json({success:false,message:'Không tìm thấy chuyến đi'});return;}res.json({success:true});}catch(error){next(error);}}
  static async checkinPlace(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const {placeId,placeName,geo,notes}=req.body;if(!placeId||!placeName){res.status(400).json({success:false,message:'Cần placeId và placeName'});return;}res.json(await TripSessionService.checkinPlace(id(req),req.user!.id,placeId,placeName,geo,notes));}catch(error){next(error);}}
  static async completeTrip(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const data=await TripSessionService.completeTrip(id(req),req.user!.id);if(!data){res.status(404).json({success:false,message:'Không tìm thấy chuyến đi'});return;}res.json({success:true,data});}catch(error){next(error);}}
  static async convertToBlog(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json(await TripSessionService.convertToBlogDraft(id(req),req.user!.id));}catch(error){next(error);}}
}
