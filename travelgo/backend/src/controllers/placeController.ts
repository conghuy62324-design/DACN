import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { PlaceService } from '../services/placeService.js';
import { ReviewService } from '../services/reviewService.js';

const placeFields=['name','category','summary','description','city','province','district','address','latitude','longitude','priceFrom','duration','heroImage','galleryImages','highlights','amenities','openingHours','contactInfo'] as const;
const placeInput=(body:any)=>Object.fromEntries(placeFields.filter(key=>body[key]!==undefined).map(key=>[key,body[key]]));

export class PlaceController {
  static async getPlaces(req:Request,res:Response,next:NextFunction){try{
    const text=(k:string)=>{const v=req.query[k];if(v!==undefined&&typeof v!=='string')throw Error('INVALID_FILTER_SHAPE');return v as string|undefined;};
    const numeric=(k:string)=>text(k)===undefined?undefined:Number(text(k));
    const result=await PlaceService.listPublic({locationId:text('locationId'),preferences:text('preferences')?.split(',').filter(Boolean),dailyBudgetPerPerson:numeric('dailyBudgetPerPerson'),category:text('category'),city:text('city'),search:text('search'),minRating:numeric('minRating'),minPriceFrom:numeric('minPriceFrom'),maxPriceFrom:numeric('maxPriceFrom'),accommodationType:text('accommodationType'),cuisine:text('cuisine'),amenities:text('amenities')?.split(',').filter(Boolean),approvedSince:text('approvedSince'),sort:text('sortBy'),page:numeric('page')??1,limit:numeric('limit')??20});
    res.setHeader('Cache-Control','no-store');res.json({success:true,count:result.items.length,data:result.items,meta:{total:result.total,page:result.page,limit:result.limit,pages:result.pages}});
  }catch(error){if(error instanceof Error&&error.message==='INVALID_FILTER_SHAPE'){res.status(400).json({success:false,message:'Bộ lọc không hợp lệ.'});return;}next(error);}}
  static async getPlaceById(req:Request,res:Response,next:NextFunction){try{const data=await PlaceService.getPlaceByIdOrSlug(String(req.params.id));if(!data){res.status(404).json({success:false,message:'Không tìm thấy địa điểm'});return;}res.json({success:true,data});}catch(error){next(error);}}
  static async getPlaceReviews(req:Request,res:Response,next:NextFunction){try{const data=await ReviewService.listPublished(String(req.params.id));res.json({success:true,count:data.length,data});}catch(error){next(error);}}
  static async addReview(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const data=await ReviewService.create(String(req.params.id),req.user!.id,req.body);res.status(201).json({success:true,message:'Gửi đánh giá thành công',data});}catch(error){next(error);}}
  static async createPlace(req:Request,res:Response,next:NextFunction){try{const data=await PlaceService.createPlace(placeInput(req.body) as any);res.status(201).json({success:true,data});}catch(error){next(error);}}
  static async deletePlace(req:Request,res:Response,next:NextFunction){try{const ok=await PlaceService.deletePlace(String(req.params.id));if(!ok){res.status(404).json({success:false,message:'Địa điểm không tồn tại'});return;}res.json({success:true,message:'Đã tạm ngừng địa điểm'});}catch(error){next(error);}}
}
