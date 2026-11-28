import {createHmac} from 'node:crypto';
import type {Transaction} from 'sequelize';
import {HttpError} from '../utils/httpError.js';
import {query} from './postgresStore.js';

export type HotelLockAction='confirm_customer'|'published_hotel'|'cancel_customer'|'partner_transition'|'admin_transition';
export type HotelLockActor={id:string;roles:string[];sessionVersion?:number};
type LockQuery=(sql:string,bind:unknown[],t:Transaction)=>Promise<Record<string,any>[]>;
type Binding={xid:string;pid:number;expiry:string};

export const hotelCapabilityEnabled=()=>process.env.HOTEL_REFERENCE_LOCKS==='capability';
const currentBinding="SELECT pg_current_xact_id()::text xid,pg_backend_pid() pid,(floor(extract(epoch FROM clock_timestamp())*1000)::bigint+4000)::text expiry";
const takeLock="SELECT hotel_lock.authorize($1::text,$2::uuid,$3::uuid,$4::integer,$5::bigint,$6::bytea) AS allowed";
const unavailable=()=>new HttpError(503,'Khóa quyền đặt phòng chưa sẵn sàng.','HOTEL_LOCK_CAPABILITY_UNAVAILABLE');

export function signHotelLock(key:Buffer,action:HotelLockAction,actor:string,target:string,version:number,binding:Binding){
    return createHmac('sha256',key).update(['hotel-lock-v1',action,actor.toLowerCase(),target.toLowerCase(),
        version,binding.xid,binding.pid,binding.expiry].join(':')).digest();
}

export async function authorizeHotelLock(action:HotelLockAction,actor:string,target:string,version:number|undefined,
    transaction:Transaction,db:LockQuery=query){
    if(version===undefined||!Number.isInteger(version)||version<0||version>2147483647)
        throw new HttpError(403,'Cần phiên tài khoản hiện hành để tiếp tục.','HOTEL_AUTH_VERSION_REQUIRED');
    const key=process.env.HOTEL_REFERENCE_LOCK_KEY_HEX;
    if(!key||!/^[a-f0-9]{64}$/i.test(key))throw unavailable();
    const [binding]=await db(currentBinding,[],transaction);
    if(!binding||!/^[0-9]+$/.test(binding.xid)||!Number.isInteger(binding.pid)||!/^[0-9]+$/.test(binding.expiry))
        throw unavailable();
    const mac=signHotelLock(Buffer.from(key,'hex'),action,actor,target,version,binding as Binding);
    const [result]=await db(takeLock,[action,actor,target,version,binding.expiry,mac],transaction);
    if(result?.allowed!==true)throw new HttpError(403,'Tài khoản hoặc đối tượng đặt phòng không còn đủ quyền.','HOTEL_REFERENCE_LOCK_DENIED');
}
