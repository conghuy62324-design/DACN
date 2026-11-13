let pending: Promise<any> | undefined;
export const googleMapsSelected = () => (import.meta as any).env?.VITE_MAP_PROVIDER === 'google';
export function loadGoogleMaps(): Promise<any> {
  const env=(import.meta as any).env;
  if(env?.VITE_GOOGLE_MAPS_USAGE_APPROVED!=='true'||!env?.VITE_GOOGLE_MAPS_BROWSER_KEY||!env?.VITE_GOOGLE_MAP_ID)return Promise.reject(Error('Google Maps chưa được cấu hình/phê duyệt.'));
  if(pending)return pending;
  pending=new Promise((resolve,reject)=>{
    const script=document.createElement('script');script.async=true;script.dataset.travelgoGoogleMaps='true';
    const url=new URL('https://maps.googleapis.com/maps/api/js');url.searchParams.set('key',env.VITE_GOOGLE_MAPS_BROWSER_KEY);url.searchParams.set('v','quarterly');url.searchParams.set('loading','async');url.searchParams.set('language','vi');script.src=url.href;
    const timer=setTimeout(()=>reject(Error('Google Maps tải quá lâu. Hãy tải lại trang.')),12000);
    (window as any).gm_authFailure=()=>{clearTimeout(timer);reject(Error('Google Maps chưa được cấp quyền cho website này.'));};
    script.onerror=()=>{clearTimeout(timer);reject(Error('Không tải được Google Maps.'));};
    script.onload=async()=>{try{const gm=(window as any).google?.maps;if(!gm?.importLibrary)throw Error();await Promise.all(['maps','marker','geometry'].map(x=>gm.importLibrary(x)));resolve(gm);}catch{reject(Error('Không khởi tạo được Google Maps.'));}finally{clearTimeout(timer);}};
    document.head.appendChild(script);
  });return pending;
}
