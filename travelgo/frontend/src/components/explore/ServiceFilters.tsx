import type {ReactNode} from 'react';
export type ServiceFilterState={min:string;max:string;type:string;cuisine:string;amenity:string};
export const emptyServiceFilters:ServiceFilterState={min:'',max:'',type:'',cuisine:'',amenity:''};
export const accommodationLabels:Record<string,string>={hotel:'Khách sạn',resort:'Resort',homestay:'Homestay',villa:'Villa',apartment:'Căn hộ lưu trú',guesthouse:'Nhà nghỉ'};
export const cuisineLabels:Record<string,string>={vietnamese:'Món Việt',seafood:'Hải sản',local:'Đặc sản địa phương',vegetarian:'Đồ chay',bbq_hotpot:'BBQ / lẩu',buffet:'Buffet',international:'Ẩm thực quốc tế',family:'Quán ăn gia đình'};
export function ServiceFilters({value,onChange,category,sort,onSort,extra}:{value:ServiceFilterState;onChange:(v:ServiceFilterState)=>void;category:string;sort:string;onSort:(v:string)=>void;extra?:ReactNode}){
 const change=(k:keyof ServiceFilterState,v:string)=>onChange({...value,[k]:v});
 const dirty=Object.values(value).some(Boolean);
 return <section aria-label="Lọc dịch vụ" className="hg-cat-form">
  <div className="hg-cat-filters">
   <label className="hg-cat-field">
    <span>Giá từ tối thiểu</span>
    <span className="hg-cat-inputwrap">
     <input aria-label="Giá từ tối thiểu" type="number" inputMode="numeric" min="0" step={50000} className="hg-cat-input" value={value.min} onChange={e=>change('min',e.target.value)}/>
     <i aria-hidden="true">₫</i>
    </span>
   </label>
   <label className="hg-cat-field">
    <span>Giá từ tối đa</span>
    <span className="hg-cat-inputwrap">
     <input aria-label="Giá từ tối đa" type="number" inputMode="numeric" min="0" step={50000} className="hg-cat-input" value={value.max} onChange={e=>change('max',e.target.value)}/>
     <i aria-hidden="true">₫</i>
    </span>
   </label>
   {category!=='restaurant'&&<label className="hg-cat-field">
    <span>Loại hình lưu trú</span>
    <select aria-label="Loại hình lưu trú" className="hg-cat-select" value={value.type} onChange={e=>change('type',e.target.value)}>
     <option value="">Tất cả</option>
     {Object.entries(accommodationLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
    </select>
   </label>}
   {category!=='hotel'&&<label className="hg-cat-field">
    <span>Loại ẩm thực</span>
    <select aria-label="Loại ẩm thực" className="hg-cat-select" value={value.cuisine} onChange={e=>change('cuisine',e.target.value)}>
     <option value="">Tất cả</option>
     {Object.entries(cuisineLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
    </select>
   </label>}
   <label className="hg-cat-field">
    <span>Tiện ích</span>
    <select aria-label="Tiện ích dịch vụ" className="hg-cat-select" value={value.amenity} onChange={e=>change('amenity',e.target.value)}>
     <option value="">Tất cả</option>
     {['Wi-Fi','Hồ bơi','Bãi đỗ xe','Điều hòa','Ăn sáng'].map(v=><option key={v}>{v}</option>)}
    </select>
   </label>
   <label className="hg-cat-field">
    <span>Sắp xếp</span>
    <select aria-label="Sắp xếp dịch vụ" className="hg-cat-select" value={sort} onChange={e=>onSort(e.target.value)}>
     <option value="bayesian">Uy tín (điểm Bayesian)</option>
     <option value="relevance">Mức độ phù hợp</option>
     <option value="priceAsc">Giá tăng dần</option>
     <option value="priceDesc">Giá giảm dần</option>
     <option value="approvedDesc">Mới được duyệt</option>
    </select>
   </label>
   {extra}
  </div>
  <p className="hg-cat-note">Giá lấy từ danh mục; đơn vị (phòng/đêm hoặc phần ăn) chưa được xác minh. Điểm đánh giá của khách không phải hạng sao.</p>
  <div>
   <button type="button" className="hg-cat-link" disabled={!dirty} onClick={()=>onChange({...emptyServiceFilters})}>Xóa bộ lọc dịch vụ</button>
  </div>
 </section>;
}
