import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';

/** Heading section trang chủ: H2 + dòng phụ + link phải (mục 4.12). */
export function SectionHeading({id,title,subtitle,action,note}:{id:string;title:string;subtitle?:string;action?:{to:string;label:string};note?:string}){
 return (
  <div className="hg-section-head">
   <div className="hg-section-head-text">
    <h2 id={id} className="hg-section-title">{title}</h2>
    {subtitle&&<p className="hg-section-sub">{subtitle}</p>}
    {note&&<p className="hg-section-note">{note}</p>}
   </div>
   {action&&(
    <Link className="hg-section-link" to={action.to}>
     {action.label}
     <ArrowRight size={16} aria-hidden="true"/>
    </Link>
   )}
  </div>
 );
}
