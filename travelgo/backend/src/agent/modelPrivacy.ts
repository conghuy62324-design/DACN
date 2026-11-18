import {HttpError} from '../utils/httpError.js';

export const PRIVATE_MARKER='[đã ẩn]';
type Span={start:number;end:number};
export type SafeEvidence={safeStart:number;safeEnd:number;rawStart:number;rawEnd:number};
export type MessageProjection={text:string;redactions:number;mapQuote:(quote:string)=>SafeEvidence|undefined};
/** UTF-16 offsets match JS quotes, including decomposed Vietnamese and surrogate pairs. RAM only. */
export function projectModelMessage(raw:string):MessageProjection {
 const spans:Span[]=[],starts:number[]=[],ends:number[]=[];let folded='';
 for(let i=0;i<raw.length;){const char=String.fromCodePoint(raw.codePointAt(i)!),v=char.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase();for(let j=0;j<v.length;j++){folded+=v[j];starts.push(i);ends.push(i+char.length);}i+=char.length;}
 const foldedIndex=(rawAt:number)=>{let lo=0,hi=starts.length;while(lo<hi){const mid=(lo+hi)>>>1;if(starts[mid]<rawAt)lo=mid+1;else hi=mid;}return lo;};
 const add=(start:number,end:number)=>{if(start<end)spans.push({start,end});};
 const matches=(rx:RegExp)=>{for(const m of raw.matchAll(rx))add(m.index!,m.index!+m[0].length);};
 matches(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi);
 matches(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi);
 matches(/<[^>]*>/g);
 matches(/https?:\/\/[^\s<>]+/gi);
 matches(/\b(?:Bearer\s+[^\s,;]+|(?:sk-|ghp_|github_pat_)[a-z0-9_-]{8,}|AKIA[A-Z0-9]{16}|eyJ[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+)\b/gi);
 matches(/\b[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\b/gi);
 matches(/\[(?:đã ẩn|ẩn|private|redacted|sensitive)[^\]\n]{0,80}\]/giu);
 // Explicit sensitive labels own their clause. They never provide travel evidence.
 for(const m of folded.matchAll(/\b(?:toi|minh|tui) (?:o|song tai|cu tru tai)\s+(?:so\s*)?\d+[a-z0-9\/-]*[^;\n]*/g)){const rawSpan=m[0];if(/^(?:toi|minh|tui) (?:o|song tai|cu tru tai)\s+(?:so\s*)?\d+\s*(?:ngay|dem|nguoi|phong|dua|trieu|tr|cu)\b/.test(rawSpan))continue;const business=/\b(?:ngan sach|budget|muon (?:di|den|tim)|di du lich|khoi hanh|diem den)\b/.exec(rawSpan);const end=m.index!+(business?.index??rawSpan.length);add(starts[m.index!],ends[end-1]);}
 const keys=/\b(?:mat khau|password|access[_ -]?token|refresh[_ -]?token|token|api[_ -]?key|secret|cccd|cmnd|passport|ho chieu|so dien thoai|dien thoai|sdt|phone|so the|credit card|the tin dung|cvv|iban|so tai khoan|account[_ -]?id|user[_ -]?id|customer[_ -]?id|ma tai khoan|id (?:tai khoan|khach hang|nguoi dung)|ma khach hang|ma nguoi dung|ten dang nhap|username|dia chi nha(?: rieng)?|nha rieng|toi ten la|ngay sinh|private profile|bi benh|benh ly|chan doan|dang dieu tri|mang thai|khuyet tat|thu nhap|luong thang|ton giao|chinh tri)\b/g;
 for(const m of folded.matchAll(keys)){const at=m.index!,tail=folded.slice(at+m[0].length),stop=(/dia chi nha|nha rieng|private profile/.test(m[0])?/[;\n]|\b(?:ngan sach|budget|muon (?:di|den|tim)|di du lich|khoi hanh|diem den)\b/:/[,;\n]|\b(?:ngan sach|budget|muon (?:di|den|tim)|di du lich|khoi hanh|diem den)\b/).exec(tail);const end=at+m[0].length+(stop?.index??tail.length);const begin=/bi benh|benh ly|chan doan|dang dieu tri|mang thai|khuyet tat|thu nhap|luong thang|ton giao|chinh tri/.test(m[0])?Math.max(folded.lastIndexOf(';',at-1),folded.lastIndexOf('\n',at-1),folded.lastIndexOf(',',at-1))+1:at;add(starts[begin],ends[Math.max(at,end-1)]);}
 for(const m of raw.matchAll(/(?<![\w])(?:\+?\d[ .-]*){8,19}(?![\w])/g)){
  const at=m.index!,value=m[0].trimEnd(),foldedAt=foldedIndex(at),prefix=folded.slice(Math.max(0,foldedAt-35),foldedAt),tail=raw.slice(at+value.length,at+value.length+20);
  // Preserve literal monetary amounts with business evidence. Dates contain short digit groups.
  if(/^\s*(?:VND|USD|EUR|GBP|đồng|dong|triệu|trieu|tr|củ|cu|k)\b/iu.test(tail)||/\b(?:ngan sach|budget|tong tien|chi phi)\s*(?:la|:|=)?\s*$/.test(prefix))continue;
  const dates=/20\d\d-\d\d-\d\d|\d\d?[-.]\d\d?[-.]20\d\d/g;if(dates.test(value)&&!value.replace(dates,'').replace(/[\s–—-]/g,''))continue;
  add(at,at+value.length);
 }
 spans.sort((a,b)=>a.start-b.start);const merged:Span[]=[];for(const s of spans){const last=merged.at(-1);if(last&&s.start<=last.end)last.end=Math.max(last.end,s.end);else merged.push({...s});}
 const segments:SafeEvidence[]=[];let text='',cursor=0;
 const copy=(end:number)=>{if(end>cursor){const start=text.length;text+=raw.slice(cursor,end);segments.push({safeStart:start,safeEnd:text.length,rawStart:cursor,rawEnd:end});}};
 for(const s of merged){copy(s.start);text+=PRIVATE_MARKER;cursor=s.end;}copy(raw.length);
 return{text,redactions:merged.length,mapQuote(quote){if(typeof quote!=='string'||!quote.trim()||quote.includes(PRIVATE_MARKER))return;for(const segment of segments){let at=text.indexOf(quote,segment.safeStart);if(at<segment.safeStart||at+quote.length>segment.safeEnd)continue;const rawStart=segment.rawStart+at-segment.safeStart;if(raw.slice(rawStart,rawStart+quote.length)!==quote)return;return{safeStart:at,safeEnd:at+quote.length,rawStart,rawEnd:rawStart+quote.length};}return;}};
}
/** Validate raw model quotes before semantic validation. Neither mapping nor sensitive spans are persisted. */
export function assertProjectedProposal(raw:any,projection:MessageProjection){
 const fail=()=>{throw new HttpError(502,'Đề xuất AI chưa có bằng chứng hợp lệ sau bảo vệ riêng tư.','AGENT_UNVERIFIED_TOOL_INPUT');};
 if(!raw||!Array.isArray(raw.updates))return; // The strict schema validator reports structural errors.
 for(const update of raw.updates){if(!projection.mapQuote(update?.quote))fail();if(typeof update.value==='string'&&projectModelMessage(update.value).redactions)fail();}
 if(raw.change!==undefined&&!projection.mapQuote(raw.changeQuote))fail();
}
/** Sanitize all free text in controlled additions; no raw object/profile keys cross the boundary. */
export function safeModelValue(value:unknown,depth=0):any {
 if(depth>7)return undefined;
 if(typeof value==='string')return projectModelMessage(value).text.slice(0,500);
 if(typeof value==='boolean'||typeof value==='number'&&Number.isFinite(value)||value===null)return value;
 if(Array.isArray(value))return value.slice(0,8).map(v=>safeModelValue(v,depth+1)).filter(v=>v!==undefined);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([k])=>!/(?:password|token|secret|email|phone|accountId|customerId|ownerId|userId|transcript|rawMessage|comment|privateProfile)/i.test(k)).map(([k,v])=>[k,safeModelValue(v,depth+1)]).filter(([,v])=>v!==undefined));
 return undefined;
}
