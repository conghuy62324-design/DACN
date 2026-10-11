import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { PlaceService } from '../services/placeService.js';

const placeFields=['name','category','summary','description','city','province','district','address','latitude','longitude','priceFrom','duration','heroImage','galleryImages','highlights','amenities','openingHours','contactInfo'] as const;
const placeInput=(body:any)=>Object.fromEntries(placeFields.filter(key=>body[key]!==undefined).map(key=>[key,body[key]]));

export class PlaceController {
  static async getPlaces(req:Request,res:Response,next:NextFunction){try{const result=await PlaceService.listPublic({category:req.query.category as string,city:req.query.city as string,search:req.query.search as string,minRating:req.query.minRating?Number(req.query.minRating):undefined,sort:req.query.sortBy as string,page:Number(req.query.page||1),limit:Number(req.query.limit||20)});res.json({success:true,count:result.items.length,data:result.items,meta:{total:result.total,page:result.page,limit:result.limit,pages:result.pages}});}catch(error){next(error);}}
  static async getPlaceById(req:Request,res:Response,next:NextFunction){try{const data=await PlaceService.getPlaceByIdOrSlug(String(req.params.id));if(!data){res.status(404).json({success:false,message:'Không tìm thấy địa điểm'});return;}res.json({success:true,data});}catch(error){next(error);}}
  static async getPlaceReviews(req:Request,res:Response,next:NextFunction){try{const data=await PlaceService.getReviewsByTarget(String(req.params.id));res.json({success:true,count:data.length,data});}catch(error){next(error);}}
  static async addReview(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const{rating,criteria,comment,userAvatar}=req.body;const data=await PlaceService.addReview(String(req.params.id),req.user!,{rating:Number(rating),criteria,comment,userAvatar});res.status(201).json({success:true,message:'Gửi đánh giá thành công',data});}catch(error){next(error);}}
  static async createPlace(req:Request,res:Response,next:NextFunction){try{const data=await PlaceService.createPlace(placeInput(req.body) as any);res.status(201).json({success:true,data});}catch(error){next(error);}}
  static async deletePlace(req:Request,res:Response,next:NextFunction){try{const ok=await PlaceService.deletePlace(String(req.params.id));if(!ok){res.status(404).json({success:false,message:'Địa điểm không tồn tại'});return;}res.json({success:true,message:'Đã tạm ngừng địa điểm'});}catch(error){next(error);}}
}
