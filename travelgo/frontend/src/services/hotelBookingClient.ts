// Existing Bearer authentication, pinned to the account captured when this request starts.
// Contact/confirmation never goes in a URL or persistent browser storage.
export async function hotelBookingRequest(route:string,body:any,key:string|undefined,signal?:AbortSignal){
 const token=localStorage.getItem('travelgo_token');if(!token)throw{code:'AUTH_REQUIRED',message:'Vui lòng đăng nhập để đặt phòng.'};
 const response=await fetch(((import.meta as any).env.VITE_API_URL||'/api')+route,{method:'POST',signal,headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...(key?{'Idempotency-Key':key}:{})},body:JSON.stringify(body)});
 if(localStorage.getItem('travelgo_token')!==token)throw{code:'SESSION_CHANGED',message:'Phiên đăng nhập đã thay đổi.'};
 const result=await response.json();if(!response.ok)throw{...result,status:response.status};return result.data;
}
