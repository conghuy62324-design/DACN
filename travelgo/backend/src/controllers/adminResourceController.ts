import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { BlogService } from '../services/blogService.js';
import { PlaceService } from '../services/placeService.js';
import { TourService } from '../services/tourService.js';
import { HttpError } from '../utils/httpError.js';

const query = (req: AuthenticatedRequest) => ({ search:req.query.search as string,status:req.query.status as string,page:Number(req.query.page||1),limit:Number(req.query.limit||20) });
const resourceId = (req: AuthenticatedRequest) => String(req.params.id);
const moderation = (req: AuthenticatedRequest) => {
  const status=String(req.body.status);
  if(!['APPROVED','REJECTED','SUSPENDED','DRAFT'].includes(status))throw new HttpError(400,'Trạng thái moderation không hợp lệ');
  return {status:status as 'APPROVED'|'REJECTED'|'SUSPENDED'|'DRAFT',reason:typeof req.body.reason==='string'?req.body.reason:undefined};
};

export class AdminResourceController {
  static async listPlaces(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:await PlaceService.adminList(query(req))});}catch(error){next(error);}}
  static async getPlace(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:await PlaceService.adminGet(resourceId(req))});}catch(error){next(error);}}
  static async moderatePlace(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const m=moderation(req);res.json({success:true,data:await PlaceService.moderate(resourceId(req),m.status,req.user!.id,m.reason)});}catch(error){next(error);}}
  static async listTours(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:await TourService.adminList(query(req))});}catch(error){next(error);}}
  static async getTour(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:await TourService.adminGet(resourceId(req))});}catch(error){next(error);}}
  static async moderateTour(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const m=moderation(req);res.json({success:true,data:await TourService.moderate(resourceId(req),m.status,req.user!.id,m.reason)});}catch(error){next(error);}}
  static async listBlogs(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:await BlogService.adminList(query(req))});}catch(error){next(error);}}
  static async getBlog(req:AuthenticatedRequest,res:Response,next:NextFunction){try{res.json({success:true,data:await BlogService.adminGet(resourceId(req))});}catch(error){next(error);}}
  static async moderateBlog(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const m=moderation(req);res.json({success:true,data:await BlogService.moderate(resourceId(req),m.status,req.user!.id,m.reason)});}catch(error){next(error);}}
}
