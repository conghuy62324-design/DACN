import {useCallback,useEffect,useRef,useState} from 'react';
import {api} from '../../services/api';
import {searchParams,type SearchState} from '../../utils/hotelSearchState';
export function useHotelSearch(state:SearchState,enabled=true){
 const [data,setData]=useState<any>(),[error,setError]=useState(''),[loading,setLoading]=useState(enabled),[tick,setTick]=useState(0),expiry=useRef(0);const key=searchParams(state).toString();
 const refresh=useCallback(()=>setTick(v=>v+1),[]);
 useEffect(()=>{if(!enabled){setLoading(false);return;}const c=new AbortController();setData(undefined);setLoading(true);setError('');void api.get('/hotels?'+key,{signal:c.signal}).then((r:any)=>{if(c.signal.aborted)return;setData(r.data);expiry.current=Date.parse(r.data.validUntil);setLoading(false);}).catch(e=>{if(c.signal.aborted)return;setError(e.code==='HOTEL_DOMAIN_DISABLED'?'Danh sách phòng đang được chuẩn bị. Bạn vẫn có thể khám phá điểm đến và các dịch vụ khác.':e.message||'Chưa tải được nơi lưu trú. Vui lòng thử lại.');setLoading(false);});return()=>c.abort();},[key,tick,enabled]);
 useEffect(()=>{const check=()=>{if(enabled&&document.visibilityState==='visible'&&Date.now()>=expiry.current)refresh();};window.addEventListener('focus',check);window.addEventListener('pageshow',check);document.addEventListener('visibilitychange',check);return()=>{window.removeEventListener('focus',check);window.removeEventListener('pageshow',check);document.removeEventListener('visibilitychange',check);};},[enabled,refresh]);
 // One expiry refresh while visible; no interval polling. Promotion boundaries use server validity.
 useEffect(()=>{if(!data||!enabled)return;const ms=Math.max(1000,Date.parse(data.validUntil)-Date.now()+50);const timer=setTimeout(()=>{setData(undefined);setError('Thông tin giá đã hết thời gian hiệu lực. Hãy tải lại để kiểm tra dữ liệu mới.');},ms);return()=>clearTimeout(timer);},[data,enabled]);
 return{data,error,loading,refresh};
}
