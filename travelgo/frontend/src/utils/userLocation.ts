export type UserLocation={latitude:number;longitude:number;accuracy:number};
/** Only called by an explicit user action. No watchPosition or persistent storage. */
export function requestUserLocation(geo:Pick<Geolocation,'getCurrentPosition'>|undefined=navigator.geolocation):Promise<UserLocation>{
 return new Promise((resolve,reject)=>{if(!window.isSecureContext){reject(Error('Định vị cần HTTPS hoặc localhost. Hãy nhập địa chỉ thủ công.'));return;}if(!geo){reject(Error('Thiết bị chưa hỗ trợ định vị. Hãy nhập địa chỉ thủ công.'));return;}geo.getCurrentPosition(p=>resolve({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy}),e=>reject(Error(e.code===1?'Bạn đã từ chối định vị. Hãy nhập địa chỉ thủ công.':e.code===3?'Định vị quá thời gian. Hãy nhập địa chỉ thủ công.':'Chưa xác định được vị trí. Hãy nhập địa chỉ thủ công.')),{enableHighAccuracy:false,timeout:10000,maximumAge:0});});
}
