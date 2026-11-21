import {Link} from 'react-router-dom';
import {ArrowRight,Sparkles} from 'lucide-react';

/** Banner Trợ lý AI (mục 4.11). Chỉ giữ link, không đụng khu chat. */
export function AiBanner({canUseAssistant}:{canUseAssistant:boolean}){
 return (
  <section className="hg-container hg-ai-banner" aria-labelledby="hg-ai-title">
   <span className="hg-ai-icon" aria-hidden="true"><Sparkles size={28}/></span>
   <div className="hg-ai-text">
    <h2 id="hg-ai-title">Bắt đầu từ điều bạn thích</h2>
    <p>Chia sẻ mong muốn, HuGo giúp bạn sắp xếp ý tưởng cho chuyến đi.</p>
   </div>
   {canUseAssistant?(
    <Link className="hg-btn-cta hg-ai-action" to="/assistant">
     Trò chuyện với HuGo
     <ArrowRight size={18} aria-hidden="true"/>
    </Link>
   ):(
    <Link className="hg-btn-outline-light hg-ai-action" to="/tour-planner">
     Lập lịch trình
     <ArrowRight size={18} aria-hidden="true"/>
    </Link>
   )}
  </section>
 );
}
