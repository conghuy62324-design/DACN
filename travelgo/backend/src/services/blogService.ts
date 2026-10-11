import { sequelize } from '../config/database.js';
import { AuditLog, BlogPost, Business } from '../models/index.js';
import { BlogListQuery, BlogRepository } from '../repositories/blogRepository.js';
import { HttpError } from '../utils/httpError.js';
import { BusinessAccessService } from './businessAccessService.js';

const slugify=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/đ/g,'d').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
export interface BlogInput {title:string;excerpt:string;content:string;destinationName:string;coverImage:string;placeId?:string;costEstimate?:string;tripDuration?:string;tags?:string[];}
export class BlogService {
  static async getAllBlogs(query:BlogListQuery={}){const result=await BlogRepository.list({...query,page:query.page||1,limit:query.limit||100},{publicOnly:true});return result.items;}
  static async listPublic(query:BlogListQuery={}){return BlogRepository.list(query,{publicOnly:true});}
  static async getBlogByIdOrSlug(value:string){return BlogRepository.find(value,true);}
  static async likeBlog(id:string){const blog=await BlogRepository.find(id,true);if(!blog)throw new HttpError(404,'Không tìm thấy bài viết');await blog.increment('likesCount');await blog.reload();return blog.likesCount;}
  static async createCustomer(author:{id:string;fullName:string;avatarUrl?:string},input:BlogInput){return BlogPost.create({...input,slug:`${slugify(input.title)}-${Date.now().toString(36)}`,authorId:author.id,authorName:author.fullName,authorAvatar:author.avatarUrl,tags:input.tags||[],status:'PENDING',likesCount:0,isFeatured:false});}
  static async partnerList(userId:string,query:BlogListQuery={}){const ids=await BusinessAccessService.businessIds(userId);return BlogRepository.list(query,{businessIds:ids});}
  static async getManaged(userId:string,id:string){const blog=await BlogPost.findByPk(id);if(!blog?.businessId)throw new HttpError(404,'Không tìm thấy bài viết');await BusinessAccessService.assert(userId,blog.businessId);return blog;}
  static async createForPartner(user:{id:string;fullName:string},businessId:string,input:BlogInput){await BusinessAccessService.assert(user.id,businessId,'MANAGE_BUSINESS');return BlogPost.create({...input,businessId,slug:`${slugify(input.title)}-${Date.now().toString(36)}`,authorId:user.id,authorName:user.fullName,tags:input.tags||[],status:'DRAFT',likesCount:0,isFeatured:false});}
  static async updateForPartner(userId:string,id:string,input:Partial<BlogInput>){const blog=await BlogPost.findByPk(id);if(!blog?.businessId)throw new HttpError(404,'Không tìm thấy bài viết');await BusinessAccessService.assert(userId,blog.businessId);if(!['DRAFT','REJECTED'].includes(blog.status))throw new HttpError(409,'Chỉ có thể sửa bài nháp hoặc bị từ chối');await blog.update(input);return blog;}
  static async archiveForPartner(userId:string,id:string){const blog=await BlogPost.findByPk(id);if(!blog?.businessId)throw new HttpError(404,'Không tìm thấy bài viết');await BusinessAccessService.assert(userId,blog.businessId,'MANAGE_BUSINESS');await blog.update({status:'SUSPENDED'});return blog;}
  static async submit(userId:string,id:string){const blog=await BlogPost.findByPk(id);if(!blog?.businessId)throw new HttpError(404,'Không tìm thấy bài viết');await BusinessAccessService.assert(userId,blog.businessId);if(!['DRAFT','REJECTED'].includes(blog.status))throw new HttpError(409,'Trạng thái không cho phép gửi duyệt');await blog.update({status:'PENDING'});return blog;}
  static async adminList(query:BlogListQuery={}){return BlogRepository.list(query);}
  static async adminGet(id:string){const blog=await BlogPost.findByPk(id,{include:[{model:Business,as:'business',attributes:['id','name','type']}]});if(!blog)throw new HttpError(404,'Không tìm thấy bài viết');return blog;}
  static async moderate(id:string,status:'APPROVED'|'REJECTED'|'SUSPENDED'|'DRAFT',actorUserId:string,reason?:string){if((status==='REJECTED'||status==='DRAFT')&&!reason?.trim())throw new HttpError(400,'Cần nhập lý do moderation');return sequelize.transaction(async transaction=>{const blog=await BlogPost.findByPk(id,{transaction,lock:transaction.LOCK.UPDATE});if(!blog)throw new HttpError(404,'Không tìm thấy bài viết');const previous=blog.status;await blog.update({status},{transaction});await AuditLog.create({actorUserId,action:`BLOG_${status}`,entityType:'BlogPost',entityId:id,previousData:{status:previous},newData:{status},reason},{transaction});return blog;});}
  static async createBlog(input:any){throw new HttpError(410,'Sử dụng API tạo blog có xác thực');}
}
