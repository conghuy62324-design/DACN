import { Op } from 'sequelize';
import { sequelize } from '../config/database.js';
import { AuditLog, Place } from '../models/index.js';
import { PlaceListQuery, PlaceRepository } from '../repositories/placeRepository.js';
import { HttpError } from '../utils/httpError.js';
import { BusinessAccessService } from './businessAccessService.js';
import { RatingService } from './ratingService.js';

export type PlaceData = ReturnType<typeof serializePlace>;
const slugify = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const number = (value: unknown) => Number(value || 0);
export function serializePlace(place: any) {
  const value = place.toJSON ? place.toJSON() : place;
  return { ...value, priceFrom: number(value.priceFrom), rating: number(value.rating), bayesianRating: number(value.bayesianRating), latitude: number(value.latitude), longitude: number(value.longitude) };
}

export interface PlaceInput {
  name: string; category: 'tour'|'attraction'|'hotel'|'restaurant'; summary: string; description: string; city: string;
  province: string; district?: string; address: string; latitude: number; longitude: number; priceFrom?: number; duration?: string;
  heroImage: string; galleryImages?: string[]; highlights?: string[]; amenities?: string[]; openingHours?: Record<string,unknown>;
  contactInfo?: Record<string,unknown>;
}

export class PlaceService {
  static async getAllPlaces(params: PlaceListQuery = {}): Promise<PlaceData[]> {
    const result = await PlaceRepository.list({ ...params, page: params.page || 1, limit: params.limit || 100 }, { publicOnly: true });
    return result.items.map(serializePlace);
  }
  static async listPublic(params: PlaceListQuery = {}) { const result = await PlaceRepository.list(params, { publicOnly: true }); return { ...result, items: result.items.map(serializePlace) }; }
  static async getPlaceByIdOrSlug(value: string) { const place = await PlaceRepository.find(value, true); return place ? serializePlace(place) : null; }
  static async partnerList(userId: string, query: PlaceListQuery = {}) { const ids = await BusinessAccessService.businessIds(userId); const result = await PlaceRepository.list(query, { businessIds: ids }); return { ...result, items: result.items.map(serializePlace) }; }
  static async getManaged(userId: string, id: string) { const place = await PlaceRepository.find(id); if (!place?.businessId) throw new HttpError(404, 'Không tìm thấy địa điểm'); await BusinessAccessService.assert(userId, place.businessId); return serializePlace(place); }
  static async createForPartner(userId: string, businessId: string, input: PlaceInput) {
    await BusinessAccessService.assert(userId, businessId, 'MANAGE_BUSINESS');
    const slug = `${slugify(input.name)}-${Date.now().toString(36)}`;
    return serializePlace(await Place.create({ ...input, businessId, slug, priceFrom: input.priceFrom || 0, galleryImages: input.galleryImages || [], highlights: input.highlights || [], amenities: input.amenities || [], openingHours: input.openingHours || {}, contactInfo: input.contactInfo || {}, rating: 0, reviewCount: 0, bayesianRating: RatingService.calculateBayesianAverage(0,0), isFeatured: false, status: 'DRAFT' }));
  }
  static async updateForPartner(userId: string, id: string, input: Partial<PlaceInput>) {
    const place = await Place.findByPk(id); if (!place?.businessId) throw new HttpError(404, 'Không tìm thấy địa điểm'); await BusinessAccessService.assert(userId, place.businessId, 'MANAGE_BUSINESS');
    if (!['DRAFT','REJECTED'].includes(place.status)) throw new HttpError(409, 'Chỉ có thể sửa địa điểm nháp hoặc bị từ chối', 'RESOURCE_LOCKED');
    await place.update(input); return serializePlace(place);
  }
  static async archiveForPartner(userId: string, id: string) {
    const place = await Place.findByPk(id);
    if (!place?.businessId) throw new HttpError(404, 'Không tìm thấy địa điểm');
    await BusinessAccessService.assert(userId, place.businessId, 'MANAGE_BUSINESS');
    await place.update({ status: 'SUSPENDED' });
    return serializePlace(place);
  }
  static async submit(userId: string, id: string) { const place = await Place.findByPk(id); if (!place?.businessId) throw new HttpError(404, 'Không tìm thấy địa điểm'); await BusinessAccessService.assert(userId, place.businessId); if (!['DRAFT','REJECTED'].includes(place.status)) throw new HttpError(409, 'Trạng thái không cho phép gửi duyệt'); await place.update({ status: 'PENDING' }); return serializePlace(place); }
  static async adminList(query: PlaceListQuery = {}) { const result = await PlaceRepository.list(query); return { ...result, items: result.items.map(serializePlace) }; }
  static async adminGet(id: string) { const place = await PlaceRepository.find(id); if (!place) throw new HttpError(404, 'Không tìm thấy địa điểm'); return serializePlace(place); }
  static async moderate(id: string, status: 'APPROVED'|'REJECTED'|'SUSPENDED'|'DRAFT', actorUserId: string, reason?: string) {
    if ((status === 'REJECTED' || status === 'DRAFT') && !reason?.trim()) throw new HttpError(400, 'Cần nhập lý do moderation');
    return sequelize.transaction(async transaction => { const place = await Place.findByPk(id,{ transaction, lock: transaction.LOCK.UPDATE }); if (!place) throw new HttpError(404,'Không tìm thấy địa điểm'); const previous = place.status; await place.update({ status },{ transaction }); await AuditLog.create({ actorUserId, action:`PLACE_${status}`, entityType:'Place', entityId:id, previousData:{status:previous}, newData:{status}, reason },{ transaction }); return serializePlace(place); });
  }
  static async createPlace(input: PlaceInput) { return serializePlace(await Place.create({ ...input, slug: `${slugify(input.name)}-${Date.now().toString(36)}`, galleryImages: input.galleryImages || [], highlights: input.highlights || [], amenities: input.amenities || [], rating:0, reviewCount:0, bayesianRating:RatingService.calculateBayesianAverage(0,0), isFeatured:false, status:'APPROVED' })); }
  static async deletePlace(id: string) { const place = await Place.findByPk(id); if (!place) return false; await place.update({ status:'SUSPENDED' }); return true; }
}
