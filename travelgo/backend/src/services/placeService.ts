import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AuditLog, Place } from '../models/index.js';
import { PlaceListQuery, PlaceRepository } from '../repositories/placeRepository.js';
import { HttpError } from '../utils/httpError.js';
import { BusinessAccessService } from './businessAccessService.js';
import { RatingService } from './ratingService.js';
import { RecommendationService } from './recommendationService.js';
import {publicGeography} from '../geography/vietnam.js';
import { catalogMetadataEnabled, demoCatalogEnabled, editableClassification, CATALOG_COHORT, type CatalogMetadata } from './catalogPolicy.js';

export type PlaceData = ReturnType<typeof serializePlace>;
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const number = (value: unknown) => Number(value || 0);
export function serializePlace(place: any) {
  const value = place.toJSON ? place.toJSON() : place;
  return { ...value, priceFrom: number(value.priceFrom), rating: number(value.rating), bayesianRating: number(value.bayesianRating), latitude: number(value.latitude), longitude: number(value.longitude) };
}
function publicPlace(place:any){const value=place.toJSON?place.toJSON():place;return {...serializePlace(place),geography:publicGeography(value),priceFrom:value.priceFrom==null?null:Number(value.priceFrom),rating:value.rating==null?null:Number(value.rating),reviewCount:value.reviewCount==null?null:Number(value.reviewCount),priceUnit:value.catalogMetadata?.source==='DEMO'?'VND giả định DEMO / đơn vị chưa xác minh':'VND / đơn vị chưa xác minh',isDemo:value.catalogMetadata?.source==='DEMO'};}
function cleanInput(input:any,previous:CatalogMetadata={}){
 const fields=['name','category','summary','description','city','province','district','address','latitude','longitude','priceFrom','duration','heroImage','galleryImages','highlights','amenities','openingHours','contactInfo'];
 const next:any=Object.fromEntries(fields.filter(k=>input[k]!==undefined).map(k=>[k,input[k]]));
 if(catalogMetadataEnabled())try{next.catalogMetadata={...previous,...(demoCatalogEnabled()?{source:'DEMO',cohort:CATALOG_COHORT,priceBasis:'ASSUMED_DEMO_VND',coordinateBasis:'SYNTHETIC_SCENARIO'}:{}),...(input.catalogMetadata?editableClassification(input.catalogMetadata):{})};}catch{throw new HttpError(400,'Phân loại catalog không hợp lệ.','INVALID_CATALOG_CLASSIFICATION');}
 return next;
}

export interface PlaceInput {
  name: string; category: 'tour'|'attraction'|'hotel'|'restaurant'; summary: string; description: string; city: string;
  province: string; district?: string; address: string; latitude: number; longitude: number; priceFrom?: number; duration?: string;
  heroImage: string; galleryImages?: string[]; highlights?: string[]; amenities?: string[]; openingHours?: Record<string,unknown>;
  contactInfo?: Record<string,unknown>;
  catalogMetadata?: Pick<CatalogMetadata,'accommodationType'|'cuisines'>;
}

export class PlaceService {
  static async getAllPlaces(params: PlaceListQuery = {}): Promise<PlaceData[]> {
    const result = await PlaceRepository.list({ ...params, page: params.page || 1, limit: params.limit || 100 }, { publicOnly: true });
    return result.items.map(serializePlace);
  }
  static async listPublic(params: PlaceListQuery = {}) {
    // Validate the caller's pagination even when relevance loads a larger internal batch.
    const {validatePlaceQuery}=await import('./catalogQuery.js');validatePlaceQuery(params);
    if(params.sort==='relevance'||(!params.sort||params.sort==='bayesian')&&(params.preferences?.length||params.dailyBudgetPerPerson>0)){
      const rows:any[]=[];let page=1,pages=1;
      do{const batch=await PlaceRepository.list({...params,sort:'bayesian',page,limit:100},{publicOnly:true});rows.push(...batch.items);pages=batch.pages;page++;}while(page<=pages);
      const ranked=RecommendationService.recommendPlaces(rows.map(serializePlace),{destinationCity:'all',dailyBudgetPerPerson:params.dailyBudgetPerPerson||0,preferences:params.preferences||[]});
      const current=params.page||1,limit=params.limit||20,lookup=new Map(rows.map(r=>[r.id,r]));
      return {items:ranked.slice((current-1)*limit,current*limit).map(r=>({...publicPlace(lookup.get(r.place.id)),score:r.score,why:r.explanation})),total:rows.length,page:current,limit,pages:Math.ceil(rows.length/limit)};
    }
    const result = await PlaceRepository.list(params, { publicOnly: true }); return { ...result, items: result.items.map(publicPlace) };
  }
  static async getPlaceByIdOrSlug(value: string) { const place = await PlaceRepository.find(value, true); return place ? publicPlace(place) : null; }
  static async partnerList(userId: string, query: PlaceListQuery = {}) { const ids = await BusinessAccessService.businessIds(userId); const result = await PlaceRepository.list(query, { businessIds: ids }); return { ...result, items: result.items.map(serializePlace) }; }
  static async getManaged(userId: string, id: string) { const place = await PlaceRepository.find(id); if (!place?.businessId) throw new HttpError(404, 'Không tìm thấy địa điểm'); await BusinessAccessService.assert(userId, place.businessId); return serializePlace(place); }
  static async createForPartner(userId: string, businessId: string, input: PlaceInput) {
    await BusinessAccessService.assert(userId, businessId, 'MANAGE_BUSINESS');
    input=cleanInput(input);
    const slug = `${slugify(input.name)}-${Date.now().toString(36)}`;
    return serializePlace(await Place.create({ ...input, businessId, slug, priceFrom: input.priceFrom || 0, galleryImages: input.galleryImages || [], highlights: input.highlights || [], amenities: input.amenities || [], openingHours: input.openingHours || {}, contactInfo: input.contactInfo || {}, rating: 0, reviewCount: 0, bayesianRating: RatingService.calculateBayesianAverage(0,0), isFeatured: false, status: 'DRAFT' }));
  }
  static async updateForPartner(userId: string, id: string, input: Partial<PlaceInput>) {
    const place = await Place.findByPk(id); if (!place?.businessId) throw new HttpError(404, 'Không tìm thấy địa điểm'); await BusinessAccessService.assert(userId, place.businessId, 'MANAGE_BUSINESS');
    if (!['DRAFT','REJECTED'].includes(place.status)) throw new HttpError(409, 'Chỉ có thể sửa địa điểm nháp hoặc bị từ chối', 'RESOURCE_LOCKED');
    await place.update(cleanInput(input,place.catalogMetadata)); return serializePlace(place);
  }
  static async archiveForPartner(userId: string, id: string) {
    const place = await Place.findByPk(id);
    if (!place?.businessId) throw new HttpError(404, 'Không tìm thấy địa điểm');
    await BusinessAccessService.assert(userId, place.businessId, 'MANAGE_BUSINESS');
    await place.update({ status: 'SUSPENDED',...(catalogMetadataEnabled()?{approvedAt:null}:{}) });
    return serializePlace(place);
  }
  static async submit(userId: string, id: string) { const place = await Place.findByPk(id); if (!place?.businessId) throw new HttpError(404, 'Không tìm thấy địa điểm'); await BusinessAccessService.assert(userId, place.businessId); if (!['DRAFT','REJECTED'].includes(place.status)) throw new HttpError(409, 'Trạng thái không cho phép gửi duyệt'); await place.update({ status: 'PENDING' }); return serializePlace(place); }
  static async adminList(query: PlaceListQuery = {}) { const result = await PlaceRepository.list(query); return { ...result, items: result.items.map(serializePlace) }; }
  static async adminGet(id: string) { const place = await PlaceRepository.find(id); if (!place) throw new HttpError(404, 'Không tìm thấy địa điểm'); return serializePlace(place); }
  static async moderate(id: string, status: 'APPROVED'|'REJECTED'|'SUSPENDED'|'DRAFT', actorUserId: string, reason?: string) {
    if ((status === 'REJECTED' || status === 'DRAFT') && !reason?.trim()) throw new HttpError(400, 'Cần nhập lý do moderation');
    return sequelize.transaction(async transaction => { const place = await Place.findByPk(id,{ transaction, lock: transaction.LOCK.UPDATE }); if (!place) throw new HttpError(404,'Không tìm thấy địa điểm'); const previous = place.status; await place.update({ status,...(catalogMetadataEnabled()?{approvedAt:status==='APPROVED'?(previous==='APPROVED'?place.approvedAt:new Date()):null}:{}) },{ transaction }); await AuditLog.create({ actorUserId, action:`PLACE_${status}`, entityType:'Place', entityId:id, previousData:{status:previous}, newData:{status}, reason },{ transaction }); return serializePlace(place); });
  }
  static async createPlace(input: PlaceInput) { return serializePlace(await Place.create({ ...input, slug: `${slugify(input.name)}-${Date.now().toString(36)}`, galleryImages: input.galleryImages || [], highlights: input.highlights || [], amenities: input.amenities || [], rating:0, reviewCount:0, bayesianRating:RatingService.calculateBayesianAverage(0,0), isFeatured:false, status:'APPROVED' })); }
  static async deletePlace(id: string) { const place = await Place.findByPk(id); if (!place) return false; await place.update({ status:'SUSPENDED' }); return true; }
}
