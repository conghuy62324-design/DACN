import {Link} from 'react-router-dom';
import {BookOpen,CalendarDays,ChevronRight,Compass,Route,Ticket,UtensilsCrossed} from 'lucide-react';
import {SectionHeading} from './SectionHeading';

const services=[
 {title:'Nhà hàng',description:'Ẩm thực địa phương',to:'/restaurants',Icon:UtensilsCrossed},
 {title:'Khám phá',description:'Điểm đến & trải nghiệm',to:'/explore',Icon:Compass},
 {title:'Lập lịch trình',description:'Tự sắp xếp hành trình',to:'/tour-planner',Icon:CalendarDays},
 {title:'Tour du lịch',description:'Gói tour theo điểm đến',to:'/tours',Icon:Route},
 {title:'Vé tham quan',description:'Vé điểm du lịch',to:'/tickets',Icon:Ticket},
 {title:'Cẩm nang',description:'Kinh nghiệm du lịch',to:'/blog',Icon:BookOpen},
];

/** Section "Dịch vụ khác" (mục 4.10) — chỉ hiện ở trang chủ. */
export function ServiceLinks(){
 return (
  <section className="hg-container hg-section" aria-labelledby="hg-services-title">
   <SectionHeading id="hg-services-title" title="Trọn vẹn hơn một chuyến đi" subtitle="Thêm những trải nghiệm bạn muốn vào hành trình."/>
   <nav className="hg-services" aria-label="Các dịch vụ du lịch">
    {services.map(({title,description,to,Icon})=>(
     <Link key={to} to={to} className="hg-service">
      <span className="hg-service-icon" aria-hidden="true"><Icon size={24}/></span>
      <span className="hg-service-text">
       <b>{title}</b>
       <small>{description}</small>
      </span>
      <ChevronRight size={18} className="hg-service-arrow" aria-hidden="true"/>
     </Link>
    ))}
   </nav>
  </section>
 );
}
