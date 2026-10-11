import { NextFunction, Request, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { BlogService } from '../services/blogService.js';
export class BlogController {
  static async getBlogs(req:Request,res:Response,next:NextFunction){try{const result=await BlogService.listPublic({tag:req.query.tag as string,search:req.query.search as string,page:Number(req.query.page||1),limit:Number(req.query.limit||20)});res.json({success:true,count:result.items.length,data:result.items,meta:{total:result.total,page:result.page,pages:result.pages}});}catch(error){next(error);}}
  static async getBlogById(req:Request,res:Response,next:NextFunction){try{const data=await BlogService.getBlogByIdOrSlug(String(req.params.id));if(!data){res.status(404).json({success:false,message:'Không tìm thấy bài viết'});return;}res.json({success:true,data});}catch(error){next(error);}}
  static async createBlog(req:AuthenticatedRequest,res:Response,next:NextFunction){try{const{title,excerpt,content,destinationName,coverImage,costEstimate,tripDuration,tags,placeId}=req.body;const data=await BlogService.createCustomer(req.user!,{title,excerpt,content,destinationName,coverImage,costEstimate,tripDuration,tags,placeId});res.status(201).json({success:true,message:'Bài viết đã gửi duyệt',data});}catch(error){next(error);}}
  static async likeBlog(req:Request,res:Response,next:NextFunction){try{res.json({success:true,data:{likesCount:await BlogService.likeBlog(String(req.params.id))}});}catch(error){next(error);}}
}
