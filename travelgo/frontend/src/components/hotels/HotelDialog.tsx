import {useEffect,useId,useRef} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import '../../styles/hg-dialog.css';

export type HotelDialogVariant='default'|'fullscreen';

const focusable='button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]';

/**
 * Hộp thoại dùng chung cho khách sạn.
 * - variant="default" (mặc định): giữ hành vi cũ (hộp giữa màn hình, `wide` để rộng hơn).
 * - variant="fullscreen": phủ toàn màn hình (lịch mobile, sheet sửa tìm kiếm, lightbox).
 * Luôn có focus trap, Esc để đóng, khóa cuộn body và trả focus về phần tử đã mở.
 */
export function HotelDialog({title,onClose,children,wide=false,variant='default',className='',footer}:{
 title:React.ReactNode;
 onClose:()=>void;
 children:React.ReactNode;
 wide?:boolean;
 variant?:HotelDialogVariant;
 className?:string;
 footer?:React.ReactNode;
}){
 const id=useId();
 const ref=useRef<HTMLDivElement>(null);
 const closeRef=useRef(onClose);
 closeRef.current=onClose;
 useEffect(()=>{
  const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  ref.current?.querySelector<HTMLElement>('button')?.focus();
  return()=>{
   document.body.style.overflow=overflow;
   previous?.focus();
  };
 },[]);
 const onKeyDown=(e:React.KeyboardEvent)=>{
  if(e.key==='Escape'){
   e.stopPropagation();
   closeRef.current();
   return;
  }
  if(e.key!=='Tab')return;
  e.stopPropagation();
  const items=Array.from(ref.current!.querySelectorAll<HTMLElement>(focusable)).filter(x=>x.offsetParent!==null||x===document.activeElement);
  if(!items.length){
   e.preventDefault();
   return;
  }
  const first=items[0];
  const last=items[items.length-1];
  const current=document.activeElement as HTMLElement|null;
  if(!current||!ref.current!.contains(current)||current===ref.current){
   e.preventDefault();
   (e.shiftKey?last:first).focus();
  }
  else if(e.shiftKey&&current===first){
   e.preventDefault();
   last.focus();
  }
  else if(!e.shiftKey&&current===last){
   e.preventDefault();
   first.focus();
  }
 };
 const layerClass=['hotel-ui','hd-dialog-layer','hg-dialog-layer','hg-dialog-layer--'+variant].join(' ');
 const dialogClass=['hd-dialog','hg-dialog','hg-dialog--'+variant,wide?'hd-dialog-wide hg-dialog--wide':'',className].filter(Boolean).join(' ');
 return createPortal(
  <div className={layerClass}>
   <button type="button" className="hd-dialog-shade hg-dialog-shade" aria-label="Đóng hộp thoại" tabIndex={-1} onClick={onClose}/>
   <div role="dialog" aria-modal="true" aria-labelledby={id} ref={ref} tabIndex={-1} className={dialogClass} onKeyDown={onKeyDown}>
    <header className="hg-dialog-header">
     <h2 id={id} className="hg-dialog-title">{title}</h2>
     <button type="button" className="hg-dialog-close" aria-label="Đóng" onClick={onClose}>
      <X size={22}/>
     </button>
    </header>
    <div className="hd-dialog-body hg-dialog-body">{children}</div>
    {footer&&<footer className="hg-dialog-footer">{footer}</footer>}
   </div>
  </div>,
  document.body,
 );
}
