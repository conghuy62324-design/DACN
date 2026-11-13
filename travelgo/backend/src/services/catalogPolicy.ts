import { ENV } from '../config/env.js';
export const CATALOG_COHORT = 'travelgo-catalog-10-v1';
export type CatalogMetadata = {
  source?: 'DEMO' | 'REAL_PARTNER' | 'REFERENCE'; cohort?: string;
  accommodationType?: string; cuisines?: string[]; priceSegment?: string;
  priceBasis?: 'ASSUMED_DEMO_VND' | 'UNKNOWN'; sourceUrls?: string[];
  coordinateBasis?: 'SYNTHETIC_SCENARIO' | 'VERIFIED'; imageLicense?: string;
};
export const ACCOMMODATION_TYPES=['hotel','resort','homestay','villa','apartment','guesthouse'] as const;
export const CUISINES=['vietnamese','seafood','local','vegetarian','bbq_hotpot','buffet','international','family'] as const;
export const catalogMetadataEnabled=()=>process.env.CATALOG_METADATA_ENABLED==='true';
export function demoCatalogEnabled(): boolean {
  return catalogMetadataEnabled() && process.env.CATALOG_DEMO_ENABLED==='true' && ENV.NODE_ENV!=='production' &&
    ENV.DB_HOST==='127.0.0.1' && ENV.DB_PORT===15452 && ENV.DB_NAME==='travelgo_staging_catalog_20261112' &&
    ENV.DB_USER==='catalog_runtime' && process.env.CATALOG_DEMO_SENTINEL==='travelgo-public-staging:catalog-20261112';
}
export function isDemoListing(p:any){return p.catalogMetadata?.source==='DEMO'||/^demo-|\bDEMO\b/i.test([p.slug,p.name].join(' '));}
export function catalogVisible(p:any){return p.status==='APPROVED'&&(!p.businessId||p.business?.status==='ACTIVE')&&(!isDemoListing(p)||demoCatalogEnabled());}
/** Source/cohort/price verification and approval time are never partner-editable. */
export function editableClassification(raw:any):Pick<CatalogMetadata,'accommodationType'|'cuisines'> {
  if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).some(k=>!['accommodationType','cuisines'].includes(k)))throw Error('INVALID_CATALOG_CLASSIFICATION');
  if(raw.accommodationType!==undefined&&!ACCOMMODATION_TYPES.includes(raw.accommodationType))throw Error('INVALID_ACCOMMODATION_TYPE');
  if(raw.cuisines!==undefined&&(!Array.isArray(raw.cuisines)||raw.cuisines.length>8||new Set(raw.cuisines).size!==raw.cuisines.length||raw.cuisines.some((v:any)=>!CUISINES.includes(v))))throw Error('INVALID_CUISINES');
  return {...raw};
}
