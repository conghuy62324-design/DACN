import {geoFold,DESTINATIONS,PROVINCES,resolveLocation,type GeoLocation} from '../geography/vietnam.js';

/** Lexical normalization only. Raw text remains the source for model quotes; no raw text is retained. */
export function normalizeVietnamese(message:string){
 const raw=message.normalize('NFC').trim().replace(/\s+/g,' ');
 const aliases:Record<string,string>={ks:'khach san',ko:'khong',hong:'khong',hok:'khong',oto:'o to',moto:'xe may',xiu:'chut',tui:'toi',mik:'minh',mn:'moi nguoi',nhg:'nhung',dc:'duoc',nhe:'nha',tphcm:'tp hcm'};
 const compounds:Record<string,string>={ngansach:'ngan sach',phuongtien:'phuong tien',lichtrinh:'lich trinh'};
 const vocabulary=['khach','nguoi','trieu','phuong','ngay','dem','ngan','sach','trinh','hang','phong','thich','thuan','chuyen'];
 const near=(a:string,b:string)=>{if(Math.abs(a.length-b.length)>1)return false;let i=0,j=0,edits=0;while(i<a.length&&j<b.length){if(a[i]===b[j]){i++;j++;continue;}if(++edits>1)return false;if(a.length>=b.length)i++;if(b.length>=a.length)j++;}return edits+(i<a.length||j<b.length?1:0)<=1;};
 const word=(w:string)=>{if(aliases[w]||compounds[w])return aliases[w]||compounds[w];if(w.length<5||vocabulary.includes(w))return w;const alternatives=vocabulary.filter(v=>w.length===v.length+1&&near(w,v));return alternatives.length===1?alternatives[0]:w;};
 // Preserve decimals, dates and compact numeric units. Do not fuzzy-rewrite places or numbers.
 const normalized=raw.normalize('NFD').replace(/\p{M}/gu,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\b[a-z]+\b/g,word).replace(/\s+/g,' ').replace(/[.!?]+$/,'').trim();
 return {raw,normalized};
}

export function conversationalLocation(value:string,explicit:boolean):GeoLocation|undefined{
 const s=geoFold(value).replace(/^(?:tinh|thanh pho|tp)\s+/,''),known=resolveLocation(value);
 if(known){if(/^[a-z]{2}$/.test(s)&&!explicit)return;return known;}
 if(!explicit)return;
 // Initialisms derive from the existing geographic names, never a second city mapping.
 const compact=s.replace(/\s/g,''),initials=DESTINATIONS.filter(g=>geoFold(g.name).split(' ').map(w=>w[0]).join('')===compact);
 if(initials.length===1)return initials[0];
 if(compact==='tphcm')return resolveLocation('TP. HCM');
 return;
}

export function travelLocations(text:string,awaiting?:string){
 const candidates=[...DESTINATIONS,...PROVINCES].flatMap(g=>[g.name,g.catalogName,...g.aliases,...(g.kind==='destination'?[geoFold(g.name).split(' ').map(w=>w[0]).join('')]:[])].map(n=>({g,key:geoFold(n)}))).sort((a,b)=>b.key.length-a.key.length);
 const hits:{geo:GeoLocation;start:number;end:number;role?:'departureCity'|'destinationCity'}[]=[];
 for(const {g,key}of candidates){if(!key||key.length<2)continue;let from=0,index:number;while((index=text.indexOf(key,from))>=0){from=index+key.length;if(index>0&&/[a-z0-9]/.test(text[index-1])||/[a-z0-9]/.test(text[from]||'')||hits.some(h=>index<h.end&&from>h.start))continue;
   const prefix=text.slice(0,index),before=prefix.trim().split(/\s+/).at(-1),role=before==='tu'?'departureCity':/^(?:di|den|toi|ra|o|tai|qua)$/.test(before||'')||/\b(?:du lich|kham pha)\s*$/.test(prefix)?'destinationCity':undefined;
   const contextual=!!role||awaiting==='departure'||awaiting==='destination'||/\b(?:du lich|chuyen di|kham pha)\b/.test(prefix)||/^\s+(?:di|den|ra|toi)\b/.test(text.slice(from));
   if(key.replace(/\s/g,'').length<=3&&!contextual)continue;
   hits.push({geo:g,start:index,end:from,role});
  }}
 hits.sort((a,b)=>a.start-b.start);
 if(hits.length>=2&&!hits[0].role&&hits[1].role==='destinationCity')hits[0].role='departureCity';
 if(hits.length===1&&!hits[0].role&&['departure','destination'].includes(awaiting||''))hits[0].role=awaiting==='departure'?'departureCity':'destinationCity';
 return hits;
}

export type MoneyMention={amount:number;start:number;end:number;scope:'group'|'listing'|'person'|'person_day'|'group_day'|'unknown';relative?:1|-1;category?:'hotel'|'restaurant'};
export function moneyMentions(text:string):MoneyMention[]{
 const result:MoneyMention[]=[];
 const pattern=/\b(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|nghin|ngan|k|vnd|dong)(\d)?\b/g;
 for(const m of text.matchAll(pattern)){const unit=m[2],mult=/^(trieu|tr|cu)$/.test(unit)?1000000:/^(k|nghin|ngan)$/.test(unit)?1000:1;
  const amount=Number(m[1].replace(',','.'))*mult+(m[3]?Number(m[3])*mult/10:0),start=m.index!,end=start+m[0].length;
  const preceding=text.slice(Math.max(text.lastIndexOf(',',start-1),text.lastIndexOf(';',start-1),-1)+1,start),suffix=text.slice(end,end+35);
  const person=/^\s*(?:\/\s*|(?:cho )?moi\s+)(?:nguoi|ng)\b/.test(suffix),day=/^\s*(?:\/\s*|(?:cho )?moi\s+)(?:ngay|dem)\b/.test(suffix)||person&&/^\s*(?:\/\s*|(?:cho )?moi\s+)(?:nguoi|ng)\s*\/\s*ngay\b/.test(suffix);
  const hotel=/\b(?:khach san|phong|cho o)\b/.test(preceding),restaurant=/\b(?:nha hang|quan an|bua an)\b/.test(preceding),relative=/\b(?:tang them|them|cong them|giam(?: di| bot)?|bot)\s*$/.exec(preceding);
  const group=/\b(?:ngan sach (?:ca nhom|chuyen di)|tong (?:cong|ngan sach)|ca nhom)\b/.test(preceding);
  const listing=(hotel||restaurant)&&!group&&!relative;
  result.push({amount,start,end,scope:person?(day?'person_day':'person'):day?'group_day':listing?'listing':'group',...(listing?{category:hotel?'hotel':'restaurant'}:{}),...(relative?{relative:/giam|bot/.test(relative[0])?-1:1}:{})});
 }
 return result;
}
