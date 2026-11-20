import {DESTINATIONS,PROVINCES,geoFold,type GeoLocation} from '../geography/vietnam.js';
import {normalizeVietnamese,moneyMentions,travelLocations} from './vietnameseNormalizer.js';

export type GeographicRoleEvidence={mentions:Array<{id:string;name:string;role:'departureCity'|'destinationCity'|'SEARCH_AREA'|'REFERENCE';keep:boolean}>;patch:Partial<Record<'departureCity'|'destinationCity',string>>;ambiguous:boolean;blocked:boolean};
/** Current role labels bind the geographic argument before a pending question can supply a default. Geography comes solely from the shared resolver. */
export function currentGeographicRoles(message:string,awaiting?:string):GeographicRoleEvidence{
 const s=geoFold(message).replace(/([a-z])(?=\d)/g,'$1 '),hits=travelLocations(s,awaiting),contrastChange=/\bkhong\s+(?:di|den)\b.{1,100}\bma\s+(?:di|den|sang)\b/.test(s)&&!/\b(?:neu|gia su|co le|chua chac)\b/.test(s),blocked=uncertainTravelEdit(message)&&!contrastChange||/\?\s*$/.test(message)||/\b(?:gia su|co le|co nen|the nao|ra sao)\b/.test(s);
 const result:GeographicRoleEvidence={mentions:[],patch:{},ambiguous:false,blocked};
 const labels=/\b(diem den|noi den|diem du lich|noi xuat phat|diem xuat phat|noi khoi hanh|diem khoi hanh|noi di|xuat phat|khoi hanh)\b/g;
 for(const hit of hits){const prefix=s.slice(0,hit.start),tail=s.slice(hit.end),last=[...prefix.matchAll(labels)].at(-1),local=prefix.slice(Math.max(prefix.lastIndexOf(';'),prefix.lastIndexOf(','))+1),search=/\b(?:tim|kiem|goi y|doi sang)\b/.test(local)||/\bco\b/.test(local)&&/\bkhong\b/.test(tail),comment=/\b(?:tung|hom truoc|hom qua|nhan xet|ke ve)\b/.test(s);
  let role:GeographicRoleEvidence['mentions'][number]['role']='REFERENCE',keep=false;
  const recent=last&&hit.start-(last.index!+last[0].length)<90&&!/\b(?:nhung|con|va)\b/.test(prefix.slice(last.index!+last[0].length));
  if(/\b(?:(?:khong phai|chu khong phai)(?: di)?(?: tu)?|(?:khong|dung)\s+(?:di|den))\s*$/.test(prefix))role='REFERENCE';
  else if(search&&!comment&&!recent)role='SEARCH_AREA';
  else if(!blocked&&!comment){
   if(recent){role=/den|du lich/.test(last![1])?'destinationCity':'departureCity';keep=/\bgiu\s*$/.test(prefix.slice(0,last!.index));if(/\btu\s*$/.test(prefix)&&/^\s*sang\b/.test(tail))role='REFERENCE';}
   else if(search)role='SEARCH_AREA';
   else if(/\btu\s*$/.test(prefix)||/\b(?:toi|minh|tui)\s+(?:dang\s+)?o\s*$/.test(prefix))role='departureCity';
   else if(/\b(?:di|den|toi|ra|qua|sang|di du lich)\s*$/.test(prefix))role='destinationCity';
   else if(['departure','destination'].includes(awaiting||'')&&hits.length===1&&!/\b(?:khach san|nha hang|dep|thich|chon|gan)\b/.test(s))role=awaiting==='departure'?'departureCity':'destinationCity';
  }
  result.mentions.push({id:hit.geo.id,name:hit.geo.catalogName,role,keep});
  if((role==='departureCity'||role==='destinationCity')&&!keep){if(result.patch[role]&&result.patch[role]!==hit.geo.catalogName)result.ambiguous=true;result.patch[role]=hit.geo.catalogName;}
 }
 // Alternatives are candidates even when only the first location has a travel verb.
 if(hits.some((hit,i)=>i>0&&/\b(?:hoac|hay)\b/.test(s.slice(hits[i-1].end,hit.start)))&&!/\b(?:doi|chuyen).*\bsang\b/.test(s)){result.ambiguous=true;result.blocked=true;result.patch={};}
 if(result.ambiguous)result.patch={};
 return result;
}

export type GeoEvidence={id:string;name:string;quote:string;role:'departureCity'|'destinationCity';match:'exact'|'fuzzy';distance:number};
/** One typo at most, with context and a real name/alias from the existing geography. Never a nickname map. */
function distance(a:string,b:string){
 if(Math.abs(a.length-b.length)>1)return 2;
 const rows=Array.from({length:a.length+1},()=>new Array<number>(b.length+1));
 for(let i=0;i<=a.length;i++)rows[i][0]=i;for(let j=0;j<=b.length;j++)rows[0][j]=j;
 for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++){
  rows[i][j]=Math.min(rows[i-1][j]+1,rows[i][j-1]+1,rows[i-1][j-1]+(a[i-1]===b[j-1]?0:1));
  if(i>1&&j>1&&a[i-1]===b[j-2]&&a[i-2]===b[j-1])rows[i][j]=Math.min(rows[i][j],rows[i-2][j-2]+1);
 }
 return rows[a.length][b.length];
}
export function uncertainTravelEdit(message:string){const s=normalizeVietnamese(message).normalized;return /\b(?:neu|gia su|co le|hay la|chua chac)\b/.test(s)||/\b(?:khong|chua|dung)\s+(?:di|den|toi|doi|chuyen|muon|dat|luu|tang|giam|them|chon)\b/.test(s);}
const geographicCandidates=(()=>{const names=new Map<string,{geo:GeoLocation;key:string;words:number;canonical:boolean}>();
 for(const g of [...DESTINATIONS,...PROVINCES])for(const name of [g.name,g.catalogName,...g.aliases,...(g.legacyNames||[])]){const folded=geoFold(name),key=folded.replace(/ /g,'');if(key.length<5||names.has(key))continue;names.set(key,{geo:g,key,words:folded.split(' ').length,canonical:name===g.name||name===g.catalogName});}return [...names.values()];})();
export function geographicEvidence(message:string,awaiting?:string):{candidates:GeoEvidence[];ambiguous:boolean;uncertain:boolean}{
 const uncertain=uncertainTravelEdit(message),tokens=[...message.matchAll(/[\p{L}\p{M}]+/gu)].map(m=>({raw:m[0],fold:geoFold(m[0]),start:m.index!,end:m.index!+m[0].length}));
 if(tokens.length>160)return{candidates:[],ambiguous:false,uncertain};
 const found=new Map<string,GeoEvidence>();
 for(const candidate of geographicCandidates)for(let start=0;start<tokens.length;start++)for(const count of new Set([candidate.words,1])){
  const end=start+count;if(end>tokens.length)continue;const quote=message.slice(tokens[start].start,tokens[end-1].end),key=tokens.slice(start,end).map(t=>t.fold).join('');
  if(key.length<5)continue;const d=distance(key,candidate.key);if(d>1)continue;
  // Do not compare an ordinary single token to a concatenated multiword legacy alias.
  // Keep genuinely ambiguous multiword legacy names, so the caller still asks instead of guessing.
  if(d&&!candidate.canonical&&(count!==candidate.words||candidate.words<2))continue;
  const preceding=tokens.slice(Math.max(0,start-7),start).map(t=>t.fold),lastCue=[...preceding].reverse().find(t=>['tu','di','den','len','ra','qua','o','tai'].includes(t));
  const pending=awaiting==='departure'||awaiting==='destination';if(!lastCue&&!pending&&!/\b(?:du lich|kham pha)\b/.test(preceding.join(' ')))continue;
  const role=lastCue==='tu'?'departureCity':lastCue?'destinationCity':awaiting==='departure'?'departureCity':'destinationCity';
  const value:GeoEvidence={id:candidate.geo.id,name:candidate.geo.catalogName,quote,role,match:d?'fuzzy':'exact',distance:d};
  const identity=candidate.geo.id+':'+role,old=found.get(identity);if(!old||d<old.distance||d===old.distance&&quote.length>old.quote.length)found.set(identity,value);
 }
 const candidates=[...found.values()].slice(0,8),ambiguous=['departureCity','destinationCity'].some(role=>new Set(candidates.filter(c=>c.role===role).map(c=>c.id)).size>1);
 return{candidates,ambiguous,uncertain};
}

/** Evidence from this message, never an inherited slot value. */
export function transportEvidence(message:string):'car'|'motorbike'|undefined{
 const s=normalizeVietnamese(message).normalized;if(uncertainTravelEdit(message)||/\b(?:chua (?:biet|quyet)|de (?:minh|toi) tinh|xe nao)\b/.test(s))return;
 const car=/\b(?:o to|xe hoi)\b/.test(s),bike=/\b(?:xe may|xe ga)\b/.test(s);return car===bike?undefined:car?'car':'motorbike';
}

export function ambiguousBudgetQuestion(message:string):string|undefined{
 const s=normalizeVietnamese(message).normalized;
 if(!moneyMentions(s).length&&/\b(?:nhich|tang|them|giam|bot|dieu chinh)\b/.test(s)&&/\b(?:muc tien|ngan sach|kinh phi)\b/.test(s))return 'Bạn muốn ngân sách cả nhóm mới là bao nhiêu? Mình vẫn giữ mức đã xác nhận cho đến khi bạn nói rõ.';
}

/** Recognition only: these modes never enter the car/motorbike execution enum. */
export function unsupportedTransportEvidence(message:string):string|undefined{
 const s=normalizeVietnamese(message).normalized,labels:[RegExp,string][]=[[/\bxe khach\b/g,'xe khách'],[/\bxe buyt\b/g,'xe buýt'],[/\bmay bay\b/g,'máy bay'],[/\btau hoa\b/g,'tàu hỏa'],[/\bphuong tien cong cong\b/g,'phương tiện công cộng']];
 const found:string[]=[];for(const [pattern,label]of labels)for(const m of s.matchAll(pattern)){const prefix=s.slice(Math.max(0,m.index!-45),m.index);if(/\b(?:khong|chua|dung)\s+(?:di|dung|chon)(?: bang)?\s*$/.test(prefix))continue;if(!found.includes(label))found.push(label);}
 return found.length?found.join(' / '):undefined;
}
export const unsupportedTransportAnswer=(mode:string)=>'Hiện bộ lập lịch chưa hỗ trợ tính chi phí và thời gian di chuyển bằng '+mode+'. Mình vẫn có thể tư vấn lưu trú, ăn uống và tham quan từ dữ liệu đang có. Bạn muốn tiếp tục tư vấn các khoản này hay chọn ô tô hoặc xe máy để lập bản dự tính?';
