import {useEffect,useRef,useState} from 'react';
import {ChevronLeft,ChevronRight,ImageOff,Images} from 'lucide-react';
import {HotelDialog} from './HotelDialog';
import '../../styles/hg-detail.css';

/** Ảnh có fallback khi lỗi tải (không làm vỡ layout). */
export function HgPhoto({src,alt,lazy=true,label='Chưa có ảnh'}:{src?:string;alt:string;lazy?:boolean;label?:string}){
 const[failed,setFailed]=useState(!src);
 useEffect(()=>{setFailed(!src);},[src]);
 if(failed){
  return <span className="hg-photo-failed" role="img" aria-label={alt}>
   <ImageOff size={24} aria-hidden="true"/>
   <span>{label}</span>
  </span>;
 }
 return <img src={src} alt={alt} loading={lazy?'lazy':'eager'} decoding="async" draggable={false} onError={()=>setFailed(true)}/>;
}

const layoutFor=(n:number)=>n>=5?'n5':n>=3?'n3':n===2?'n2':'n1';
const visibleFor=(n:number)=>n>=5?5:n>=3?3:n;

export function HotelGallery({images,title,compact=false}:{images:any[];title:string;compact?:boolean}){
 const list=Array.isArray(images)?images:[];
 const n=list.length;
 const[current,setCurrent]=useState(0);
 const[open,setOpen]=useState(false);
 const[slide,setSlide]=useState(0);
 const track=useRef<HTMLDivElement>(null);
 const thumbs=useRef<HTMLDivElement>(null);
 const touch=useRef(0);
 const step=(d:number)=>setCurrent(i=>(i+d+n)%n);
 const openAt=(i:number)=>{
  setCurrent(i);
  setOpen(true);
 };
 useEffect(()=>{
  if(!open)return;
  const fn=(e:KeyboardEvent)=>{
   if(e.key==='ArrowRight'){e.preventDefault();step(1);}
   if(e.key==='ArrowLeft'){e.preventDefault();step(-1);}
   if(e.key==='Home'){e.preventDefault();setCurrent(0);}
   if(e.key==='End'){e.preventDefault();setCurrent(n-1);}
  };
  window.addEventListener('keydown',fn);
  return()=>window.removeEventListener('keydown',fn);
 },[open,n]);
 useEffect(()=>{
  if(!open||n<2)return;
  const next=list[(current+1)%n];
  if(next?.url){
   const img=new Image();
   img.src=next.url;
  }
  thumbs.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({block:'nearest',inline:'center'});
 },[open,current,n]);
 if(!n){
  return <div className={'hg-gallery-empty'+(compact?' hg-gallery-empty--compact':'')}>
   <ImageOff size={compact?20:28} aria-hidden="true"/>
   <span>Chưa có ảnh được duyệt.</span>
  </div>;
 }
 const alt=(m:any)=>m?.altText||title;
 const lightbox=open&&<HotelDialog
  variant="fullscreen"
  className="hg-lightbox"
  onClose={()=>setOpen(false)}
  title={<>{current+1} / {n}<span>{title}</span></>}>
  <div
   className="hg-lb-stage"
   onTouchStart={e=>{touch.current=e.changedTouches[0].clientX;}}
   onTouchEnd={e=>{const delta=e.changedTouches[0].clientX-touch.current;if(Math.abs(delta)>40)step(delta<0?1:-1);}}>
   {n>1&&<button type="button" className="hg-lb-nav hg-lb-prev" aria-label="Ảnh trước" onClick={()=>step(-1)}><ChevronLeft size={24}/></button>}
   <figure className="hg-lb-figure">
    <HgPhoto key={current} src={list[current]?.url} alt={alt(list[current])} lazy={false} label="Chưa tải được ảnh"/>
    <figcaption>{alt(list[current])}</figcaption>
   </figure>
   {n>1&&<button type="button" className="hg-lb-nav hg-lb-next" aria-label="Ảnh sau" onClick={()=>step(1)}><ChevronRight size={24}/></button>}
  </div>
  {n>1&&<div className="hg-lb-thumbs" ref={thumbs}>
   {list.map((m,i)=><button key={m.id??i} type="button" aria-label={'Chọn ảnh '+(i+1)} aria-pressed={i===current} onClick={()=>setCurrent(i)}>
    <HgPhoto src={m.url} alt="" label=""/>
   </button>)}
  </div>}
 </HotelDialog>;

 if(compact){
  return <div className="hg-gallery hg-gallery--compact">
   <button type="button" className="hg-gallery-cover" aria-label={'Mở ảnh '+title+' (1/'+n+')'} onClick={()=>openAt(0)}>
    <HgPhoto src={list[0].url} alt={alt(list[0])}/>
    <span className="hg-gallery-pill"><Images size={14} aria-hidden="true"/>{n} ảnh</span>
   </button>
   {lightbox}
  </div>;
 }

 const visible=visibleFor(n);
 const hidden=n-visible;
 const onTrackScroll=()=>{
  const el=track.current;
  if(!el||!el.clientWidth)return;
  setSlide(Math.max(0,Math.min(n-1,Math.round(el.scrollLeft/el.clientWidth))));
 };
 const goSlide=(i:number)=>{
  const el=track.current;
  if(!el)return;
  const target=(i+n)%n;
  el.scrollTo({left:target*el.clientWidth,behavior:'smooth'});
  setSlide(target);
 };
 return <div className="hg-gallery">
  <div className={'hg-gallery-mosaic hg-gallery-mosaic--'+layoutFor(n)}>
   {list.slice(0,visible).map((m,i)=>{
    const last=i===visible-1&&hidden>0;
    return <button
     type="button"
     key={m.id??i}
     className={'hg-gallery-tile'+(i===0?' hg-gallery-tile--main':'')}
     aria-label={'Mở ảnh '+(i+1)+'/'+n+(last?' · còn '+hidden+' ảnh':'')}
     onClick={()=>openAt(i)}>
     <HgPhoto src={m.url} alt={alt(m)} lazy={i>0}/>
     {last&&<span className="hg-gallery-more" aria-hidden="true">+{hidden} ảnh</span>}
    </button>;
   })}
   {n>1&&<button type="button" className="hg-gallery-all" onClick={()=>openAt(0)}>
    <Images size={16} aria-hidden="true"/>Xem tất cả {n} ảnh
   </button>}
  </div>
  <div className="hg-gallery-carousel">
   <div className="hg-gallery-track" ref={track} onScroll={onTrackScroll}>
    {list.map((m,i)=><button
     type="button"
     key={m.id??i}
     className="hg-gallery-slide"
     aria-label={'Mở ảnh '+(i+1)+'/'+n+' toàn màn hình'}
     onClick={()=>openAt(i)}>
     <HgPhoto src={m.url} alt={alt(m)} lazy={i>0}/>
    </button>)}
   </div>
   {n>1&&<>
    <button type="button" className="hg-gallery-arrow hg-gallery-arrow--prev" aria-label="Ảnh trước" onClick={()=>goSlide(slide-1)}><ChevronLeft size={20}/></button>
    <button type="button" className="hg-gallery-arrow hg-gallery-arrow--next" aria-label="Ảnh sau" onClick={()=>goSlide(slide+1)}><ChevronRight size={20}/></button>
   </>}
   <span className="hg-gallery-counter" aria-live="polite">{slide+1}/{n}</span>
  </div>
  {lightbox}
 </div>;
}
