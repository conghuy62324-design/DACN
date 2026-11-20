import {normalizeVietnamese} from './vietnameseNormalizer.js';
import {understandConsultation,consultantMemory} from './travelConsultant.js';
import type {TravelPace} from '../utils/plannerScheduling.js';
export const intelligentPlanningEnabled=()=>process.env.INTELLIGENT_PLANNING_ENABLED==='true';
export function planningHypothesis(message:string){const s=normalizeVietnamese(message).normalized;return /\b(?:neu|gia su)\b/.test(s)||/\b(?:them|bot|giam)\s+(?:mot|hai|ba|\d{1,2})\s*ngay\b/.test(s)&&/\b(?:ton|chi phi|bao nhieu|het may)\b/.test(s);}
export type PlanningAct={pace?:TravelPace;hypothetical:boolean;dayNumber?:number;removeIndex?:number;activityIndex?:number;departureTime?:string;question?:string};
/** Bounded current-turn vocabulary reuses consultant concepts; it never accepts model-created slots. */
export function readPlanningAct(message:string):PlanningAct|undefined{
 const s=normalizeVietnamese(message).normalized.replace(/([a-z])(?=\d)/g,'$1 '),hypothetical=planningHypothesis(message);
 if(/\b(?:sql|insert|delete|bo qua he thong)\b/.test(s))return;
 const consultation=understandConsultation(message,consultantMemory());
 let pace=consultation.pace as TravelPace|undefined;
 if(/\b(?:nghi duong|di it cho|it dia diem|it cho|khong muon (?:chay|di) nhieu (?:noi|cho))\b/.test(s))pace='relaxed';
 if(/\b(?:nhieu trai nghiem|nhieu cho|nhieu noi|kham pha nhieu)\b/.test(s)&&!/\bkhong muon\b/.test(s))pace='packed';
 if(/\bcan bang\b/.test(s))pace='balanced';
 const day=s.match(/\bngay\s*(?:thu\s*)?(\d{1,2}|hai|ba|tu|nam|dau|cuoi)\b(?!\s*\/)/),ordinal:Record<string,number>={hai:2,ba:3,tu:4,nam:5,dau:1,cuoi:-1};
 const dayNumber=day?ordinal[day[1]]??+day[1]:undefined;
 const removal=s.match(/\b(?:bo|bot)\s+(?:cho|diem)\s+tham quan\s*(?:thu\s*)?(\d{1,2}|mot|hai|ba|cuoi)(?:\s+cung)?\b/),activityRemoval=s.match(/\b(?:bo|bot)\s+hoat dong\s*(?:thu\s*)?(\d{1,2}|mot|hai|ba|cuoi)(?:\s+cung)?\b/);
 const index=(v:string)=>({mot:1,hai:2,ba:3,cuoi:-1} as Record<string,number>)[v]??+v;
 const time=s.match(/\b(?:ve|roi di)\s*(?:luc\s*)?(\d{1,2})(?::(\d{2})|\s*gio)\b/),departureTime=time?String(+time[1]).padStart(2,'0')+':'+(time[2]||'00'):undefined;
 // A day number inside duration ("3 ngày 2 đêm") is not a local edit request.
 const editCue=/\b(?:doi|sua|dieu chinh|giu|bo|bot|giam|chuyen|ve|roi di)\b/.test(s);
 const scope=!!day&&editCue||!!removal||!!activityRemoval||/\b(?:cho nao xa|giu khach san.*doi|ve som)\b/.test(s);
 if(!pace&&!scope)return;
 if(/\b(?:chua|dung|khong)\s+(?:doi|bo|bot|chuyen|nghi duong|di it)\b/.test(s)||/\b(?:co le|hay la|co the)\b/.test(s))return{hypothetical,question:'Bạn muốn giữ lịch hiện tại hay xác nhận thay đổi cụ thể? Mình chưa sửa lịch theo lời còn mơ hồ hoặc phủ định.'};
 if(scope&&!pace&&!removal&&!activityRemoval&&!departureTime)return{hypothetical,question:'Bạn muốn sửa ngày nào, bỏ điểm nào hoặc về lúc mấy giờ? Mình giữ nguyên lịch hiện tại khi phạm vi chưa rõ.'};
 return{hypothetical,pace,dayNumber,removeIndex:removal?index(removal[1]):undefined,activityIndex:activityRemoval?index(activityRemoval[1]):undefined,departureTime};
}
export function renderPlanningSummary(plan:any){
 const m=plan?.planning;if(!m)return '';
 const pace:Record<string,string>={relaxed:'nghỉ dưỡng',balanced:'cân bằng',packed:'khám phá nhiều'};
 const status:Record<string,string>={FEASIBLE_UNDER_ASSUMPTIONS:'Lịch phù hợp dưới các giả định lập kế hoạch',PARTIALLY_FEASIBLE:'Một phần yêu cầu còn xung đột',DATA_INSUFFICIENT:'Còn thiếu dữ liệu để xác nhận tính khả thi',INFEASIBLE:'Chưa thể lập lịch phù hợp'};
 const lodging=plan.days.reduce((n:number,d:any)=>n+d.lodgingEstimatedCostVND,0),food=plan.days.flatMap((d:any)=>d.activities).filter((a:any)=>a.category==='food').reduce((n:number,a:any)=>n+a.estimatedCostVND,0),sights=plan.days.flatMap((d:any)=>d.activities).filter((a:any)=>a.category==='sightseeing').reduce((n:number,a:any)=>n+a.estimatedCostVND,0),money=(n:number)=>n.toLocaleString('vi-VN')+' VND';
 return 'Nhịp '+pace[m.requestedPace]+'. '+(m.warnings?.some((w:string)=>w.startsWith('PARTIAL_DAY'))?'Ngày đến hoặc ngày về rút ngắn: chỉ xếp phần vừa khung giờ, bữa ăn và nghỉ được thu gọn':status[m.feasibility])+'. Lưu trú '+money(lodging)+', ăn uống '+money(food)+', tham quan '+money(sights)+'. Chi phí vận chuyển chưa được tính. Thời gian di chuyển chỉ ước tính từ đường chim bay; giờ mở cửa, thời lượng, giá và còn chỗ cần xác nhận với cơ sở. '+(m.replanning?'Chỉ lập lại ngày '+m.replanning.changedDays.join(', ')+', giữ các ngày khác. Chưa lưu Trip.':'');
}
/** Controlled facts only, no raw catalog prose, private memory or execution authority. */
export function controlledPlanningContext(plan:any){if(!plan?.planning)return;return{pace:{requested:plan.planning.requestedPace,effective:plan.planning.effectivePace},feasibility:plan.planning.feasibility,warnings:plan.planning.warnings.slice(0,6),cost:{basis:plan.costBasis,total:plan.totalEstimatedCostVND,budget:plan.totalBudgetUserVND},days:plan.days.slice(0,10).map((d:any)=>({day:d.dayNumber,activities:d.activities.length})),proposedChanges:plan.planning.replanning?.changedDays||[],permittedActions:['SELECT_OFFERED_FACT_IDS'],executionAuthority:false};}
