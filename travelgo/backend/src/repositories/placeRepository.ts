import { Op, literal } from 'sequelize';
import { Business, Place } from '../models/index.js';
import { idOrSlug, PageQuery, pageOptions, paged, searchLike } from './query.js';
import { catalogMetadataEnabled, demoCatalogEnabled } from '../services/catalogPolicy.js';
import { validatePlaceQuery, type CatalogQuery } from '../services/catalogQuery.js';
import {resolveLocation} from '../geography/vietnam.js';
import {locationWhere} from '../geography/query.js';

export interface PlaceListQuery extends PageQuery, CatalogQuery {}
function visibility(){
 const parts:any[]=[{status:'APPROVED'},{[Op.or]:[{businessId:null},{'$business.status$':'ACTIVE'}]}];
 if(!demoCatalogEnabled()){
  parts.push({name:{[Op.notIRegexp]:'\\mDEMO\\M'}},{slug:{[Op.notILike]:'demo-%'}});
  if(catalogMetadataEnabled())parts.push(literal(`NOT ("Place"."catalog_metadata" @> '{"source":"DEMO"}'::jsonb)`));
 }
 return parts;
}
export class PlaceRepository {
  static async list(query: PlaceListQuery, scope: { publicOnly?: boolean; businessIds?: string[] } = {}) {
    validatePlaceQuery(query);const {page,limit,offset}=pageOptions(query),parts:any[]=scope.publicOnly?visibility():[];
    if(scope.businessIds)parts.push({businessId:{[Op.in]:scope.businessIds}});
    if(query.status&&!scope.publicOnly)parts.push({status:query.status});
    if(query.category&&query.category!=='all')parts.push({category:query.category});
    if(query.locationId&&query.locationId!=='all')parts.push(locationWhere(query.locationId,'Place.city','Place.province'));
    else if(query.city&&query.city!=='all')parts.push(resolveLocation(query.city)?locationWhere(query.city,'Place.city','Place.province'):{[Op.or]:[{city:searchLike(query.city)},{province:searchLike(query.city)}]});
    if(query.search)parts.push({[Op.or]:[{name:searchLike(query.search)},{summary:searchLike(query.search)},{city:searchLike(query.search)}]});
    if(query.minRating)parts.push({rating:{[Op.gte]:query.minRating},reviewCount:{[Op.gt]:0}});
    if(query.minPriceFrom!==undefined)parts.push({priceFrom:{[Op.gte]:query.minPriceFrom}});
    if(query.maxPriceFrom!==undefined)parts.push({priceFrom:{[Op.lte]:query.maxPriceFrom}});
    if(query.amenities?.length)parts.push({amenities:{[Op.contains]:query.amenities}});
    if(query.accommodationType||query.cuisine||query.approvedSince||query.sort==='approvedDesc'){
      if(!catalogMetadataEnabled())return paged([],0,page,limit);
      if(query.accommodationType)parts.push({category:'hotel',catalogMetadata:{accommodationType:query.accommodationType}});
      if(query.cuisine)parts.push({category:'restaurant',catalogMetadata:{[Op.contains]:{cuisines:[query.cuisine]}}});
      if(query.approvedSince||query.sort==='approvedDesc')parts.push({approvedAt:{[Op.ne]:null,...(query.approvedSince?{[Op.gte]:query.approvedSince}:{})}});
    }
    const where:any={[Op.and]:parts};
    const order:any=query.sort==='priceAsc'?[['priceFrom','ASC NULLS LAST'],['id','ASC']]:query.sort==='priceDesc'?[['priceFrom','DESC NULLS LAST'],['id','ASC']]:query.sort==='approvedDesc'?[['approvedAt','DESC'],['id','ASC']]:[['bayesianRating','DESC'],['id','ASC']];
    const result = await Place.findAndCountAll({ where, include: [{ model: Business, as: 'business', attributes: ['id','name','type','status'] }], order, limit, offset, distinct: true });
    return paged(result.rows, result.count, page, limit);
  }

  static find(value: string, publicOnly = false) {
    return Place.findOne({ where: { [Op.and]:[idOrSlug(value),...(publicOnly?visibility():[])] }, include: [{ model: Business, as: 'business', attributes: ['id','name','type','status'] }] });
  }
  static create(values: Parameters<typeof Place.create>[0]) { return Place.create(values); }
}
