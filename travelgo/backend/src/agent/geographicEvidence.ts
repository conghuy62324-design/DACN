import {DESTINATIONS,PROVINCES,geoFold,type GeoLocation} from '../geography/vietnam.js';
import {normalizeVietnamese,moneyMentions} from './vietnameseNormalizer.js';

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
const source=()=>{const names=new Map<string,{geo:GeoLocation;key:string;words:number}>();
 for(const g of [...DESTINATIONS,...PROVINCES])for(const name of [g.name,g.catalogName,...g.aliases,...(g.legacyNames||[])]){const folded=geoFold(name),key=folded.replace(/ /g,'');if(key.length<5||names.has(key))continue;names.set(key,{geo:g,key,words:folded.split(' ').length});}return [...names.values()];};
export function geographicEvidence(message:string,awaiting?:string):{candidates:GeoEvidence[];ambiguous:boolean;uncertain:boolean}{
 const uncertain=uncertainTravelEdit(message),tokens=[...message.matchAll(/[\p{L}\p{M}]+/gu)].map(m=>({raw:m[0],fold:geoFold(m[0]),start:m.index!,end:m.index!+m[0].length}));
 if(tokens.length>160)return{candidates:[],ambiguous:false,uncertain};
 const found=new Map<string,GeoEvidence>();
 for(const candidate of source())for(let start=0;start<tokens.length;start++)for(const count of new Set([candidate.words,1])){
  const end=start+count;if(end>tokens.length)continue;const quote=message.slice(tokens[start].start,tokens[end-1].end),key=tokens.slice(start,end).map(t=>t.fold).join('');
  if(key.length<5)continue;const d=distance(key,candidate.key);if(d>1)continue;
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
