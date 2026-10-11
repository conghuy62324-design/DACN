import { NextFunction, Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { BlogService } from '../services/blogService.js';
import { BookingService, BookingStatus } from '../services/bookingService.js';
import { PlaceService } from '../services/placeService.js';
import { TicketService } from '../services/ticketService.js';
import { TourService } from '../services/tourService.js';
import { HttpError } from '../utils/httpError.js';

const value = (body: any, keys: string[]) => Object.fromEntries(keys.filter((key) => body[key] !== undefined).map((key) => [key, body[key]]));
const pageQuery = (query: any) => ({ search: query.search as string, status: query.status as string, page: Number(query.page || 1), limit: Number(query.limit || 20) });
const id = (req: AuthenticatedRequest) => String(req.params.id);
const requireText = (input: any, fields: string[]) => {
  const missing = fields.filter((field) => typeof input[field] !== 'string' || !input[field].trim());
  if (missing.length) throw new HttpError(400, `Thiếu dữ liệu bắt buộc: ${missing.join(', ')}`, 'VALIDATION_ERROR');
};
const validateCoordinates = (input:any) => {
  if (input.latitude !== undefined && (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90)) throw new HttpError(400,'Vĩ độ phải nằm trong khoảng -90 đến 90','VALIDATION_ERROR');
  if (input.longitude !== undefined && (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180)) throw new HttpError(400,'Kinh độ phải nằm trong khoảng -180 đến 180','VALIDATION_ERROR');
};
const requirePositive = (input:any,fields:string[]) => { for(const field of fields) if(!Number.isFinite(input[field])||input[field]<0) throw new HttpError(400,`${field} không hợp lệ`,'VALIDATION_ERROR'); };

const placeFields = ['name','category','summary','description','city','province','district','address','latitude','longitude','priceFrom','duration','heroImage','galleryImages','highlights','amenities','openingHours','contactInfo'];
const tourFields = ['title','destinationCity','departureCity','durationDays','durationNights','category','summary','description','heroImage','priceVND','meetingPoint','galleryImages','capacity','inclusions','exclusions','highlights','itineraryDays','startDate','endDate','isTemplate'];
const ticketFields = ['title','type','operator','departureCity','arrivalCity','departureTime','arrivalTime','duration','price','originalPrice','capacity','features','imageUrl','placeId','tourId','validFrom','validUntil','status'];
const blogFields = ['title','excerpt','content','destinationName','coverImage','placeId','costEstimate','tripDuration','tags'];

export class PartnerResourceController {
  static async listPlaces(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await PlaceService.partnerList(req.user!.id,{...pageQuery(req.query),category:req.query.category as string,city:req.query.city as string})});}catch(error){next(error);}}
  static async getPlace(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await PlaceService.getManaged(req.user!.id,id(req))});}catch(error){next(error);}}
  static async createPlace(req: AuthenticatedRequest,res: Response,next: NextFunction){try{const input:any=value(req.body,placeFields);requireText(input,['name','category','summary','description','city','province','address','heroImage']);input.latitude=Number(input.latitude);input.longitude=Number(input.longitude);input.priceFrom=Number(input.priceFrom||0);validateCoordinates(input);requirePositive(input,['priceFrom']);const data=await PlaceService.createForPartner(req.user!.id,String(req.body.businessId),input);res.status(201).json({success:true,data});}catch(error){next(error);}}
  static async updatePlace(req: AuthenticatedRequest,res: Response,next: NextFunction){try{const input:any=value(req.body,placeFields);if(input.latitude!==undefined)input.latitude=Number(input.latitude);if(input.longitude!==undefined)input.longitude=Number(input.longitude);if(input.priceFrom!==undefined)input.priceFrom=Number(input.priceFrom);validateCoordinates(input);if(input.priceFrom!==undefined)requirePositive(input,['priceFrom']);res.json({success:true,data:await PlaceService.updateForPartner(req.user!.id,id(req),input)});}catch(error){next(error);}}
  static async archivePlace(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await PlaceService.archiveForPartner(req.user!.id,id(req))});}catch(error){next(error);}}
  static async submitPlace(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await PlaceService.submit(req.user!.id,id(req))});}catch(error){next(error);}}

  static async listTours(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await TourService.partnerList(req.user!.id,{...pageQuery(req.query),city:req.query.city as string,category:req.query.category as string})});}catch(error){next(error);}}
  static async getTour(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await TourService.getManaged(req.user!.id,id(req))});}catch(error){next(error);}}
  static async createTour(req: AuthenticatedRequest,res: Response,next: NextFunction){try{const input:any=value(req.body,tourFields);requireText(input,['title','destinationCity','departureCity','category','summary','description','heroImage']);for(const field of ['durationDays','durationNights','priceVND','capacity'])if(input[field]!==undefined)input[field]=Number(input[field]);requirePositive(input,['durationDays','durationNights','priceVND','capacity']);if(input.durationDays<1||input.capacity<1)throw new HttpError(400,'Số ngày và sức chứa phải lớn hơn 0','VALIDATION_ERROR');const data=await TourService.createForPartner(req.user!.id,String(req.body.businessId),input);res.status(201).json({success:true,data});}catch(error){next(error);}}
  static async updateTour(req: AuthenticatedRequest,res: Response,next: NextFunction){try{const input:any=value(req.body,tourFields);for(const field of ['durationDays','durationNights','priceVND','capacity'])if(input[field]!==undefined)input[field]=Number(input[field]);for(const field of ['durationDays','durationNights','priceVND','capacity'])if(input[field]!==undefined)requirePositive(input,[field]);if(input.durationDays!==undefined&&input.durationDays<1)throw new HttpError(400,'Số ngày phải lớn hơn 0','VALIDATION_ERROR');if(input.capacity!==undefined&&input.capacity<1)throw new HttpError(400,'Sức chứa phải lớn hơn 0','VALIDATION_ERROR');res.json({success:true,data:await TourService.updateForPartner(req.user!.id,id(req),input)});}catch(error){next(error);}}
  static async archiveTour(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await TourService.archiveForPartner(req.user!.id,id(req))});}catch(error){next(error);}}
  static async submitTour(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await TourService.submit(req.user!.id,id(req))});}catch(error){next(error);}}

  static async listTickets(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await TicketService.partnerList(req.user!.id,{...pageQuery(req.query),type:req.query.type as string})});}catch(error){next(error);}}
  static async getTicket(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await TicketService.getManaged(req.user!.id,id(req))});}catch(error){next(error);}}
  static async createTicket(req: AuthenticatedRequest,res: Response,next: NextFunction){try{const input:any=value(req.body,ticketFields);requireText(input,['title','type','operator','departureCity','arrivalCity','departureTime']);input.price=Number(input.price);input.capacity=Number(input.capacity);requirePositive(input,['price','capacity']);if(Number.isNaN(Date.parse(input.departureTime)))throw new HttpError(400,'Thời gian khởi hành không hợp lệ','VALIDATION_ERROR');const data=await TicketService.createForPartner(req.user!.id,String(req.body.businessId),input);res.status(201).json({success:true,data});}catch(error){next(error);}}
  static async updateTicket(req: AuthenticatedRequest,res: Response,next: NextFunction){try{const input:any=value(req.body,ticketFields);if(input.price!==undefined)input.price=Number(input.price);if(input.capacity!==undefined)input.capacity=Number(input.capacity);for(const field of ['price','capacity'])if(input[field]!==undefined)requirePositive(input,[field]);if(input.departureTime!==undefined&&Number.isNaN(Date.parse(input.departureTime)))throw new HttpError(400,'Thời gian khởi hành không hợp lệ','VALIDATION_ERROR');res.json({success:true,data:await TicketService.updateForPartner(req.user!.id,id(req),input)});}catch(error){next(error);}}
  static async archiveTicket(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await TicketService.archiveForPartner(req.user!.id,id(req))});}catch(error){next(error);}}

  static async listBlogs(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await BlogService.partnerList(req.user!.id,pageQuery(req.query))});}catch(error){next(error);}}
  static async getBlog(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await BlogService.getManaged(req.user!.id,id(req))});}catch(error){next(error);}}
  static async createBlog(req: AuthenticatedRequest,res: Response,next: NextFunction){try{const input:any=value(req.body,blogFields);requireText(input,['title','excerpt','content','destinationName','coverImage']);const data=await BlogService.createForPartner(req.user!,String(req.body.businessId),input);res.status(201).json({success:true,data});}catch(error){next(error);}}
  static async updateBlog(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await BlogService.updateForPartner(req.user!.id,id(req),value(req.body,blogFields))});}catch(error){next(error);}}
  static async archiveBlog(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await BlogService.archiveForPartner(req.user!.id,id(req))});}catch(error){next(error);}}
  static async submitBlog(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await BlogService.submit(req.user!.id,id(req))});}catch(error){next(error);}}

  static async listBookings(req: AuthenticatedRequest,res: Response,next: NextFunction){try{const businessId=String(req.query.businessId||'');if(!businessId)throw new HttpError(400,'businessId là bắt buộc','BUSINESS_ID_REQUIRED');res.json({success:true,data:await BookingService.listForPartner(req.user!.id,businessId,Number(req.query.page||1),Number(req.query.limit||20))});}catch(error){next(error);}}
  static async getBooking(req: AuthenticatedRequest,res: Response,next: NextFunction){try{res.json({success:true,data:await BookingService.getForPartner(req.user!.id,id(req))});}catch(error){next(error);}}
  static async updateBooking(req: AuthenticatedRequest,res: Response,next: NextFunction){try{const businessId=String(req.body.businessId||'');if(!businessId)throw new HttpError(400,'businessId là bắt buộc','BUSINESS_ID_REQUIRED');const status=req.body.status as BookingStatus;if(!['CONFIRMED','REJECTED','COMPLETED','CANCELLED'].includes(status))throw new HttpError(400,'Trạng thái booking không hợp lệ');await BookingService.getForPartner(req.user!.id,id(req));res.json({success:true,data:await BookingService.changeStatus(id(req),status,req.user!,req.body.reason,businessId)});}catch(error){next(error);}}
}
