import { randomUUID } from 'node:crypto';
import { sequelize } from '../config/database.js';
import { AuthUser } from '../types/auth.js';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword } from '../services/passwordService.js';
import { AuthService } from '../services/authService.js';
import { audit, fail, integer, notify, only, page, securityEnabled, sql, text, uuid, version } from './common.js';

/** Only called AFTER the existing token signature/expiry validator. */
const validatedVersions=new WeakMap<AuthUser,number>();
export const validatedWebSessionVersion=(user:AuthUser)=>validatedVersions.get(user);

export async function validateWebSession(user: AuthUser, signedToken: string): Promise<AuthUser> {
  if (!securityEnabled()) return user;
  const payload = JSON.parse(Buffer.from(signedToken.split('.')[0], 'base64url').toString('utf8'));
  const rows = await sql(`SELECT u.id,u.full_name,u.email,u.role,COALESCE(s.status,'ACTIVE') status,COALESCE(s.token_version,0)::int token_version,
    COALESCE((SELECT jsonb_agg(role) FROM user_roles WHERE user_id=u.id),jsonb_build_array(CASE u.role WHEN 'admin' THEN 'SUPER_ADMIN' WHEN 'partner' THEN 'PARTNER' ELSE 'CUSTOMER' END)) roles
    FROM users u LEFT JOIN web_account_security s ON s.user_id=u.id WHERE u.id=$1`, [user.id]);
  const row = rows[0];
  if (!row || row.status !== 'ACTIVE' || !Number.isSafeInteger(payload.sessionVersion ?? 0) || (payload.sessionVersion ?? 0) !== row.token_version) fail('SESSION_REVOKED', 'Phiên đăng nhập đã hết hiệu lực. Vui lòng đăng nhập lại.', 401);
  const verified:AuthUser={id:row.id,email:row.email,fullName:row.full_name,roles:row.roles};
  validatedVersions.set(verified,row.token_version);
  return verified;
}
export async function loginSessionVersion(id: string): Promise<number | undefined> {
  if (!securityEnabled()) return undefined;
  const row = (await sql('SELECT status,token_version::int FROM web_account_security WHERE user_id=$1', [id]))[0];
  if (row && row.status !== 'ACTIVE') fail('ACCOUNT_SUSPENDED', 'Tài khoản đang bị tạm ngưng.', 403);
  return row?.token_version || 0;
}
const publicColumns = `u.id,u.full_name "fullName",u.email,u.phone,u.avatar_url "avatarUrl",u.created_at "createdAt",u.updated_at "updatedAt",
 COALESCE(s.status,'ACTIVE') status,s.status_reason "statusReason",COALESCE(s.version,1)::int version,
 COALESCE((SELECT jsonb_agg(role ORDER BY role) FROM user_roles WHERE user_id=u.id),jsonb_build_array(CASE u.role WHEN 'admin' THEN 'SUPER_ADMIN' WHEN 'partner' THEN 'PARTNER' ELSE 'CUSTOMER' END)) roles,
 (SELECT count(*)::int FROM business_members WHERE user_id=u.id) "businessCount",(SELECT count(*)::int FROM bookings WHERE user_id=u.id) "bookingCount"`;
export async function listUsers(q: any) {
  only(q, ['page','limit','search','role','status']); const p = page(q), search = q.search === undefined ? '' : text(q.search, 120, 0);
  if (q.role !== undefined && !['CUSTOMER','PARTNER','SUPER_ADMIN'].includes(q.role) || q.status !== undefined && !['ACTIVE','SUSPENDED'].includes(q.status)) fail('WEB_USER_FILTER', 'Bộ lọc không hợp lệ.');
  const where = `WHERE ($1='' OR u.full_name ILIKE $1 OR u.email ILIKE $1) AND ($2::text IS NULL OR EXISTS(SELECT 1 FROM user_roles WHERE user_id=u.id AND role=$2)) AND ($3::text IS NULL OR COALESCE(s.status,'ACTIVE')=$3)`;
  const bind = [search ? '%' + search.replace(/[\\%_]/g, '\\$&') + '%' : '', q.role || null, q.status || null];
  const total = (await sql(`SELECT count(*)::int n FROM users u LEFT JOIN web_account_security s ON s.user_id=u.id ${where}`, bind))[0].n;
  return { items: await sql(`SELECT ${publicColumns} FROM users u LEFT JOIN web_account_security s ON s.user_id=u.id ${where} ORDER BY u.created_at DESC,u.id LIMIT $4 OFFSET $5`, [...bind,p.limit,p.offset]), total, page:p.page, limit:p.limit, pages:Math.ceil(total/p.limit) };
}
export async function userDetail(id: string) {
  const row = (await sql(`SELECT ${publicColumns} FROM users u LEFT JOIN web_account_security s ON s.user_id=u.id WHERE u.id=$1`, [uuid(id)]))[0];
  if (!row) fail('USER_NOT_FOUND', 'Không tìm thấy tài khoản.', 404);
  return { ...row, audit: await sql("SELECT action,reason,created_at \"createdAt\",previous_data \"previousData\",new_data \"newData\" FROM audit_logs WHERE entity_type='WebUser' AND entity_id=$1 ORDER BY created_at DESC,id LIMIT 30", [id]) };
}
export async function manageUser(actor: string, id: string, body: any, kind: 'status'|'roles') {
  if (!securityEnabled()) fail('WEB_SECURITY_DISABLED', 'Quản trị tài khoản chưa được bật.', 503);
  only(body, [kind,'reason','version']); uuid(id); integer(body.version); const reason = text(body.reason,1000,3);
  if (kind === 'status' && !['ACTIVE','SUSPENDED'].includes(body.status)) fail('WEB_STATUS', 'Trạng thái không hợp lệ.');
  if (kind === 'roles' && (!Array.isArray(body.roles) || body.roles.length < 1 || body.roles.length > 2 || new Set(body.roles).size !== body.roles.length || !body.roles.includes('CUSTOMER') || body.roles.some((v: any) => !['CUSTOMER','PARTNER'].includes(v)))) fail('WEB_ROLE', 'Chỉ được quản lý quyền CUSTOMER/PARTNER; phải giữ CUSTOMER.');
  await sequelize.transaction(async t => {
    const user = (await sql('SELECT id,role FROM users WHERE id=$1 FOR UPDATE',[id],t))[0]; if (!user) fail('USER_NOT_FOUND','Không tìm thấy tài khoản.',404);
    const roles = await sql('SELECT role FROM user_roles WHERE user_id=$1',[id],t);
    const protectedIds = (process.env.WEB_PROTECTED_USER_IDS || '').split(',');
    if (id === actor || id === 'bae330d6-c3cb-462e-839e-cf07d73a64d2' || protectedIds.includes(id) || user.role === 'admin' || roles.some(r=>r.role==='SUPER_ADMIN')) fail('PROTECTED_ACCOUNT','Không được thay đổi tài khoản được bảo vệ hoặc chính mình.',403);
    await sql('INSERT INTO web_account_security(user_id) VALUES($1) ON CONFLICT DO NOTHING',[id],t);
    const old = (await sql('SELECT status,status_reason,version::int FROM web_account_security WHERE user_id=$1 FOR UPDATE',[id],t))[0]; version(old.version,body.version);
    if (kind === 'roles') {
      await sql('DELETE FROM user_roles WHERE user_id=$1 AND role IN (\'CUSTOMER\',\'PARTNER\')',[id],t);
      for (const role of body.roles) await sql('INSERT INTO user_roles(id,user_id,role,granted_by) VALUES($1,$2,$3,$4)',[randomUUID(),id,role,actor],t);
      await sql("UPDATE users SET role=$2,updated_at=now() WHERE id=$1",[id,body.roles.includes('PARTNER')?'partner':'user'],t);
    }
    await sql(`UPDATE web_account_security SET ${kind==='status'?'status=$2,status_reason=$3,':''}version=version+1,token_version=token_version+1,updated_at=now() WHERE user_id=$1`,kind==='status'?[id,body.status,reason]:[id],t);
    await audit(actor,'USER_'+kind.toUpperCase(),'WebUser',id,reason,kind==='roles'?{roles:roles.map(r=>r.role)}:old,{[kind]:body[kind]},t);
    await notify(id,'Tài khoản được cập nhật','Quản trị viên đã cập nhật '+(kind==='roles'?'quyền tài khoản.':'trạng thái tài khoản.'),'/profile','user:'+id+':'+(old.version+1),t);
  }); return userDetail(id);
}
export async function updateProfile(id: string, body: any) {
  only(body,['fullName','phone','avatarUrl','bio']); if (!Object.keys(body).length) fail('WEB_FIELDS','Cần ít nhất một trường.');
  const values: any = {};
  if ('fullName' in body) values.fullName=text(body.fullName,120,2);
  if ('phone' in body) { if (body.phone !== null && (typeof body.phone !== 'string' || !/^[+0-9() .-]{9,20}$/.test(body.phone))) fail('WEB_PHONE','Số điện thoại không hợp lệ.'); values.phone=body.phone; }
  if ('bio' in body) values.bio=text(body.bio,1000,0);
  await sequelize.transaction(async t => {
    const user=await User.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE}); if(!user) fail('USER_NOT_FOUND','Không tìm thấy tài khoản.',404);
    if ('avatarUrl' in body) {
      if(body.avatarUrl!==null){ const match=typeof body.avatarUrl==='string'&&/^\/api\/web-media\/([a-f0-9-]{36})$/.exec(body.avatarUrl); if(!match || !(await sql("SELECT id FROM web_media WHERE id=$1 AND owner_user_id=$2 AND kind='AVATAR'",[match[1],id],t)).length) fail('WEB_AVATAR','Chỉ nhận ảnh đại diện đã tải lên của chính tài khoản.'); }
      values.avatarUrl=body.avatarUrl;
    }
    await user.update(values,{transaction:t});
    await audit(id,'PROFILE_UPDATE','WebUser',id,'Self-service profile update',null,{fields:Object.keys(values)},t);
  }); return AuthService.getById(id);
}
const passwordAttempts = new Map<string, {start:number; count:number}>();
export async function changePassword(id: string, body: any) {
  if (!securityEnabled()) fail('WEB_SECURITY_DISABLED','Đổi mật khẩu chưa được bật.',503);
  only(body,['currentPassword','newPassword']);
  if (typeof body.currentPassword!=='string'||body.currentPassword.length>200||typeof body.newPassword!=='string'||body.newPassword.length<12||body.newPassword.length>200||!/[A-Za-z]/.test(body.newPassword)||!/[0-9]/.test(body.newPassword)) fail('PASSWORD_POLICY','Mật khẩu mới cần12–200 ký tự, có chữ và số.');
  const now=Date.now(); for(const [key,v] of passwordAttempts) if(now-v.start>3600000) passwordAttempts.delete(key);
  const attempt=passwordAttempts.get(id)||{start:now,count:0}; if(++attempt.count>5) fail('PASSWORD_RATE_LIMIT','Quá nhiều yêu cầu đổi mật khẩu. Vui lòng thử lại sau.',429); passwordAttempts.set(id,attempt);
  await sequelize.transaction(async t=>{
    const user=await User.findByPk(id,{transaction:t,lock:t.LOCK.UPDATE});
    if(!user || !(await verifyPassword(body.currentPassword,user.passwordHash))) fail('CURRENT_PASSWORD_INCORRECT','Mật khẩu hiện tại không chính xác.');
    if(body.currentPassword===body.newPassword) fail('PASSWORD_UNCHANGED','Mật khẩu mới cần khác mật khẩu hiện tại.');
    await user.update({passwordHash:await hashPassword(body.newPassword)},{transaction:t});
    await sql('INSERT INTO web_account_security(user_id,token_version) VALUES($1,1) ON CONFLICT(user_id) DO UPDATE SET token_version=web_account_security.token_version+1,version=web_account_security.version+1,updated_at=now()',[id],t);
    await audit(id,'PASSWORD_CHANGED','WebUser',id,'Current password verified',null,{reauthRequired:true},t);
    await notify(id,'Mật khẩu đã được đổi','Vui lòng đăng nhập lại trên các thiết bị của bạn.','/profile','password:'+randomUUID(),t);
  }); return {reauthRequired:true};
}
