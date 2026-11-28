import {vnd} from './HotelResultCard';
import '../../styles/hg-checkout.css';

const weekdays=['CN','T2','T3','T4','T5','T6','T7'];
/** Ngày lưu trú dạng "T7, 22/11/2026" (chỉ đổi hiển thị, giữ nguyên dữ liệu). */
export const stayDateLabel=(iso:string)=>{
 if(!iso)return '';
 const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
 if(!m)return iso;
 const d=new Date(Number(m[1]),Number(m[2])-1,Number(m[3]));
 return `${weekdays[d.getDay()]}, ${m[3]}/${m[2]}/${m[1]}`;
};

/** Bảng giá do server tính. Chỉ hiển thị số liệu có sẵn trong quote, không tự cộng/trừ. */
export function HotelPriceBreakdown({quote:q}:{quote:any}){
 const extraAdults=q.extraAdultsVnd??q.extraGuestsVnd??0;
 const children=q.childrenVnd??0;
 const discount=q.discountVnd??0;
 return <div className="hg-price" data-testid="hotel-price-breakdown">
  <div className="hg-price__line">
   <span>Tiền phòng · {q.nights} đêm × {q.roomCount} phòng</span>
   <b>{vnd(q.baseVnd)}</b>
  </div>
  {Array.isArray(q.nightly)&&q.nightly.length>0&&<details className="hg-price__nightly">
   <summary>Giá từng đêm (mỗi phòng)</summary>
   {q.nightly.map((n:any)=><div className="hg-price__line hg-price__line--sub" key={n.stayDate}>
    <span>{stayDateLabel(n.stayDate)}</span>
    <span>{vnd(n.basePerRoomVnd)} × {q.roomCount} phòng</span>
   </div>)}
  </details>}
  {Number(extraAdults)!==0&&<div className="hg-price__line">
   <span>Phụ thu người lớn</span>
   <b>{vnd(extraAdults)}</b>
  </div>}
  {Number(children)!==0&&<div className="hg-price__line">
   <span>Phụ thu trẻ em</span>
   <b>{vnd(children)}</b>
  </div>}
  {Number(discount)!==0&&<div className="hg-price__line hg-price__line--discount">
   <span>Ưu đãi được áp dụng</span>
   <b>−{vnd(discount)}</b>
  </div>}
  <div className="hg-price__line">
   <span>Thuế cộng thêm</span>
   <b>{vnd(q.taxVnd)}</b>
  </div>
  <div className="hg-price__line">
   <span>Phí bắt buộc cộng thêm</span>
   <b>{vnd(q.feesVnd)}</b>
  </div>
  <div className="hg-price__line hg-price__total">
   <span>Tổng kỳ lưu trú</span>
   <strong data-testid="hotel-stay-total">{vnd(q.totalVnd)}</strong>
  </div>
  <p className="hg-price__note">VND · tổng kỳ lưu trú · đã tính các khoản bắt buộc được kê khai. Chưa thu tiền.</p>
 </div>;
}
