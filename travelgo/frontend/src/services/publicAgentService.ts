import { api } from './api';
import { parseAgentResponse } from '../utils/agentContract';
export const PUBLIC_AGENT_CONSENT='PUBLIC_VERIFIED_GOOGLE_V1';
export type PublicMetadata={id:string;revision:number;expiresAt:string;mode:'PUBLIC_VERIFIED';persisted:false};
const uuid=(v:any)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function acceptPublicMetadata(value:any,request:any,previous?:PublicMetadata):PublicMetadata{
 if(!value||Object.keys(value).some(k=>!['id','revision','expiresAt','mode','persisted'].includes(k))||!uuid(value.id)||value.mode!=='PUBLIC_VERIFIED'||value.persisted!==false||!Number.isSafeInteger(value.revision)||!Number.isFinite(Date.parse(value.expiresAt))||request.action==='start'&&value.revision!==1||request.action==='continue'&&(value.id!==request.id||value.revision!==request.revision+1)||previous&&(value.id!==previous.id||value.expiresAt!==previous.expiresAt))throw Error('Metadata hội thoại không hợp lệ. Hãy bắt đầu phiên mới.');
 return value;
}
export function readPublicResponse(envelope:any,request:any,previous?:PublicMetadata){
 const d=envelope?.data;if(envelope?.success!==true||!d||typeof d.reply!=='string'||!['needs_input','completed','unsupported','needs_confirmation','action_required'].includes(d.status))throw Error('Phản hồi Agent chưa hợp lệ.');
 const conversation=acceptPublicMetadata(d.conversation,request,previous);
 if(d.result)parseAgentResponse({success:true,data:{status:'completed',reply:d.reply,history:[],historyTruncated:false,context:{mode:'STATELESS',persisted:false,behavioralDataUsed:false,personalizationEnabled:false},result:d.result}});
 if(d.confirmation){const t=d.confirmation;if(!uuid(t.id)||!/^[a-f0-9]{64}$/.test(t.payloadHash)||!['CREATE','UPDATE_DAYS'].includes(t.operation)||!Number.isFinite(Date.parse(t.expiresAt))||!t.plan||!Array.isArray(t.plan.days)||!Number.isFinite(t.plan.totalEstimatedCostVND))throw Error('Bản xem trước chưa hợp lệ.');}
 return{...d,conversation};
}
export function publicAgentClient(token:string){const config=(signal?:AbortSignal)=>({signal,timeout:25000,headers:{Authorization:`Bearer ${token}`}});return{
 privacy:async(signal:AbortSignal)=>{const r:any=await api.get('/public-agent/privacy',config(signal));const p=r?.data;if(r?.success!==true||p?.version!==PUBLIC_AGENT_CONSENT||p?.externalVersion!=='external-chat-v1'||p?.mode!=='PUBLIC_VERIFIED'||p?.ttlSeconds!==900||typeof p.enabled!=='boolean'||typeof p.text!=='string')throw Error('Chưa tải được thông báo quyền riêng tư.');return p;},
 chat:(body:any,signal:AbortSignal)=>api.post('/public-agent/chat',body,config(signal)),
 confirm:(body:any,signal:AbortSignal)=>api.post('/public-agent/confirm',body,config(signal)),
 revoke:()=>api.delete('/public-agent/sessions',{...config(),timeout:5000}),
 };}
