import manifest from '../../assets/travel-photo-manifest.json';
export type PhotoAsset={id:string;author:string;sourceUrl:string;license:string;licenseUrl:string;alt:string;actualLocation:string|null;illustrative:boolean;canonicalLocationId?:string;width:number;height:number;focalPoint?:string;variants:{url:string;width:number;height:number;sha256:string}[]};
export const travelPhotos=manifest.assets as PhotoAsset[];
export function TravelPhoto({assetId,className='',eager=false,sizes='(max-width: 767px) 100vw, 50vw'}:{assetId:string;className?:string;eager?:boolean;sizes?:string}){
 const asset=travelPhotos.find(a=>a.id===assetId);if(!asset)return null;
 return <img className={className} src={asset.variants[asset.variants.length-1].url} srcSet={asset.variants.map(v=>v.url+' '+v.width+'w').join(', ')} sizes={sizes} alt={asset.alt} width={asset.width} height={asset.height} loading={eager?'eager':'lazy'} decoding="async" {...(eager?{fetchpriority:'high'}:{})} style={{objectPosition:asset.focalPoint||'50% 50%'}} onError={e=>{e.currentTarget.style.visibility='hidden';e.currentTarget.parentElement?.classList.add('premium-image-failed');}}/>;
}
