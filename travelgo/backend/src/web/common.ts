import { randomUUID } from 'node:crypto';
import { QueryTypes, Transaction } from 'sequelize';
import { sequelize } from '../config/database.js';
import { HttpError } from '../utils/httpError.js';

export const enabled = () => process.env.WEB_FOUNDATION_ENABLED === 'true';
export const securityEnabled = () => enabled() && process.env.WEB_ACCOUNT_SECURITY_ENABLED === 'true';
export function fail(code: string, message: string, status = 400): never { throw new HttpError(status, message, code); }
export function only(v: any, keys: string[]) {
  if (!v || typeof v !== 'object' || Array.isArray(v) || Object.keys(v).some(k => !keys.includes(k))) fail('WEB_FIELDS', 'Dữ liệu có trường không được phép.');
}
export function text(v: any, max = 1000, min = 1): string {
  if (typeof v !== 'string' || v.trim().length < min || v.length > max || /[<>\x00-\x08\x0b\x0c\x0e-\x1f]/.test(v)) fail('WEB_TEXT', 'Văn bản không hợp lệ.');
  return v.trim();
}
export function integer(v: any, min = 1, max = 2147483647): number {
  if (!Number.isSafeInteger(v) || v < min || v > max) fail('WEB_INTEGER', 'Số nguyên không hợp lệ.'); return v;
}
export function uuid(v: any): string {
  if (typeof v !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v)) fail('WEB_UUID', 'Mã định danh không hợp lệ.'); return v;
}
export function internalLink(v: any): string {
  const s = text(v, 500);
  if (!s.startsWith('/') || s.startsWith('//') || /[\\\s]/.test(s) || /%(?:2f|5c|0[ad])/i.test(s)) fail('WEB_LINK', 'Chỉ nhận đường dẫn nội bộ an toàn.'); return s;
}
export function page(q: any) {
  const number = (v: any, fallback: number, max: number) => v === undefined ? fallback : typeof v === 'string' && /^\d+$/.test(v) ? integer(Number(v), 1, max) : fail('WEB_PAGINATION', 'Phân trang không hợp lệ.');
  const p = number(q.page, 1, 100000), limit = number(q.limit, 20, 100);
  return { page: p, limit, offset: (p - 1) * limit };
}
export const sql = (statement: string, bind: any[] = [], transaction?: Transaction): Promise<any[]> => sequelize.query(statement, { bind, transaction, type: QueryTypes.SELECT });
export async function audit(actor: string, action: string, entity: string, id: string, reason: string, previous: any, next: any, t: Transaction) {
  await sql('INSERT INTO audit_logs(id,actor_user_id,action,entity_type,entity_id,reason,previous_data,new_data) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb)', [randomUUID(), actor, 'WEB_' + action, entity, id, reason, JSON.stringify(previous), JSON.stringify(next)], t);
}
export async function notify(user: string, title: string, body: string, href: string, event: string, t: Transaction, type = 'ACCOUNT') {
  internalLink(href);
  await sql('INSERT INTO web_notifications(id,user_id,type,title,body,href,event_key) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(event_key) DO NOTHING', [randomUUID(), user, type, title, body, href, event], t);
}
export function version(actual: number, expected: any) {
  integer(expected); if (actual !== expected) fail('WEB_VERSION_CONFLICT', 'Dữ liệu đã đổi. Hãy tải lại trước khi lưu.', 409);
}
