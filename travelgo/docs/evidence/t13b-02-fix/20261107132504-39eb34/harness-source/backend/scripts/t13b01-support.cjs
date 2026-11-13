const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomUUID, createHash } = require('node:crypto');
require('dotenv').config({ path: path.resolve(__dirname, '../.env'), quiet: true });
const models = require('../dist/models/index.js');
const { sequelize, User, UserRole, Business, BusinessMember, PartnerApplication, AuditLog, TelemetryConsent, UserEvent, RecommendationRequest, RecommendationCandidate, RecommendationVisibleImpression, Favorite, Review, Booking, TripSession } = models;
const { Op } = require('sequelize');
const { ENV } = require('../dist/config/env.js');
const { assertTestDatabaseWriteOptIn, assertDatabaseSentinel } = require('../dist/utils/testDatabaseGuard.js');
const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); };
async function guard(purpose) {
  assert.equal(ENV.NODE_ENV, 'test'); assert.equal(ENV.DB_HOST, '127.0.0.1');
  assert.equal(ENV.DB_NAME, 'travelgo_ai_m0_test'); assert.equal(process.env.DB_SSL, 'false');
  assertTestDatabaseWriteOptIn(purpose); await assertDatabaseSentinel(sequelize, purpose);
}
async function schema() {
  await guard('T13-B-01 exact preflight');
  const migrations = [];
  for (const filename of fs.readdirSync(path.resolve(__dirname, '../../database/migrations')).filter(v => v.endsWith('.sql')).sort()) {
    const checksum = createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../../database/migrations', filename))).digest('hex');
    const [rows] = await sequelize.query('SELECT checksum FROM schema_migrations WHERE filename=:filename', { replacements: { filename } });
    assert.equal(rows[0]?.checksum, checksum, filename); migrations.push({ filename, checksum });
  }
  const [identity] = await sequelize.query('SELECT current_database() AS database, current_user AS username, inet_server_addr()::text AS server_address, inet_server_port() AS server_port');
  const [indexes] = await sequelize.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname='public' AND tablename IN ('user_roles','business_members','partner_applications') ORDER BY indexname");
  assert.ok(indexes.some(v => v.indexname === 'idx_partner_applications_one_active' && v.indexdef.includes('UNIQUE')));
  const [constraints] = await sequelize.query("SELECT conname,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conrelid IN ('public.user_roles'::regclass,'public.business_members'::regclass,'public.partner_applications'::regclass) ORDER BY conname");
  return { ...identity[0], nodeEnv: ENV.NODE_ENV, host: ENV.DB_HOST, sentinel: 'PASS', writeOptIn: true, migrations, indexes, constraints };
}
class Fixtures {
  constructor(dir, project) {
    this.file = path.join(dir, project, 'ledger.json');
    this.data = fs.existsSync(this.file) ? JSON.parse(fs.readFileSync(this.file)) : { runId: process.env.T13B01_RUN_ID, project, emails: [], users: [], applications: [], businesses: [], cleanup: 'PENDING', cleanupIds: {} };
    this.save();
  }
  save() { write(this.file, this.data); }
  plan(label) {
    const suffix = randomUUID().slice(0, 8);
    const email = `t13b01.${this.data.runId.slice(-6)}.${this.data.project}.${label.slice(0, 12)}.${suffix}@example.test`.toLowerCase();
    assert.ok(email.split('@')[0].length <= 64); this.data.emails.push(email); this.data.cleanup = 'PENDING'; this.save(); return email;
  }
  async discover() {
    await guard('T13-B-01 discover ledger-owned rows'); const d = this.data;
    if (!d.emails.length) return;
    const users = await User.findAll({ where: { email: d.emails }, attributes: ['id'] });
    d.users = [...new Set([...d.users, ...users.map(v => v.id)])];
    if (d.users.length) {
      const apps = await PartnerApplication.findAll({ where: { userId: d.users }, attributes: ['id'] });
      d.applications = [...new Set([...d.applications, ...apps.map(v => v.id)])];
      const members = await BusinessMember.findAll({ where: { userId: d.users } });
      const audits = await AuditLog.findAll({ where: { entityType: 'PartnerApplication', entityId: d.applications } });
      d.businesses = [...new Set([...d.businesses, ...members.map(v => v.businessId), ...audits.map(v => v.newData?.businessId).filter(Boolean)])];
    }
    this.save();
  }
  async promoteAdmin(userId) {
    await this.discover(); await guard('T13-B-01 isolated SA fixture grant'); assert.ok(this.data.users.includes(userId));
    await sequelize.transaction(async transaction => {
      const roles = await UserRole.findAll({ where: { userId }, transaction }); assert.deepEqual(roles.map(v => v.role), ['CUSTOMER']);
      await UserRole.destroy({ where: { userId }, transaction });
      await UserRole.create({ userId, role: 'SUPER_ADMIN' }, { transaction });
    });
    this.data.adminSetup ||= []; this.data.adminSetup.push({ userId, roles: ['SUPER_ADMIN'], source: 'Guarded fixture-only DB setup; not role-management acceptance' }); this.save();
  }
  async snapshot() {
    await this.discover(); const d = this.data; const userIds = d.users;
    const plain = rows => rows.map(v => v.toJSON());
    return {
      users: (await User.findAll({ where: { id: userIds }, attributes: ['id','email','role','fullName','createdAt','updatedAt'], order: [['id','ASC']] })).map(v => v.toJSON()),
      roles: plain(await UserRole.findAll({ where: { userId: userIds }, order: [['id','ASC']] })),
      applications: plain(await PartnerApplication.findAll({ where: { id: d.applications }, order: [['id','ASC']] })),
      businesses: plain(await Business.findAll({ where: { id: d.businesses }, order: [['id','ASC']] })),
      members: plain(await BusinessMember.findAll({ where: { userId: userIds }, order: [['id','ASC']] })),
      audit: plain(await AuditLog.findAll({ where: { actorUserId: userIds }, order: [['id','ASC']] })),
    };
  }
  async cleanup() {
    await this.discover(); await guard('T13-B-01 exact fixture cleanup'); const d = this.data;
    // Fail closed if an unexpected functional row exists. This batch creates no catalog, Booking, Review, Favorite or Trip.
    for (const [model, key] of [[Review,'userId'],[Favorite,'userId'],[Booking,'userId'],[TripSession,'userId']]) assert.equal(await model.count({ where: { [key]: d.users } }), 0, `Unexpected ${model.tableName} fixture row requires explicit recovery`);
    for (const model of [models.Place, models.Tour, models.Ticket, models.BlogPost]) assert.equal(await model.count({ where: { businessId: d.businesses } }), 0, 'No catalog row may depend on fixture business');
    assert.equal(await BusinessMember.count({ where: { businessId: d.businesses, userId: { [Op.notIn]: d.users } } }), 0, 'Non-fixture member must never cascade');
    assert.equal(await UserRole.count({ where: { grantedBy: d.users, userId: { [Op.notIn]: d.users } } }), 0, 'Non-fixture grant must never be changed');
    const capture = async (model, where, key = 'id') => {
      const rows = await model.findAll({ where, attributes: [key] }); const ids = rows.map(v => v.get(key));
      d.cleanupIds[model.tableName] = [...new Set([...(d.cleanupIds[model.tableName] || []), ...ids])]; this.save();
      if (ids.length) await model.destroy({ where: { [key]: ids }, transaction: this.transaction });
    };
    await sequelize.transaction(async transaction => {
      this.transaction = transaction;
      const requests = await RecommendationRequest.findAll({ where: { userId: d.users }, attributes: ['requestId'], transaction });
      const requestIds = requests.map(v => v.requestId);
      await capture(RecommendationVisibleImpression, { requestId: requestIds }); await capture(RecommendationCandidate, { requestId: requestIds });
      await capture(UserEvent, { userId: d.users }); await capture(models.RecommendationImpression, { userId: d.users });
      await capture(RecommendationRequest, { userId: d.users }, 'requestId'); await capture(TelemetryConsent, { userId: d.users }, 'userId');
      await capture(AuditLog, { actorUserId: d.users }); await capture(BusinessMember, { userId: d.users });
      await capture(PartnerApplication, { id: d.applications }); await capture(UserRole, { userId: d.users });
      await capture(Business, { id: d.businesses }); await capture(User, { id: d.users });
    });
    this.transaction = undefined;
    const residual = {};
    for (const [model, key] of [[User,'id'],[UserRole,'userId'],[PartnerApplication,'id'],[Business,'id'],[BusinessMember,'userId'],[AuditLog,'actorUserId'],[UserEvent,'userId'],[RecommendationRequest,'userId'],[TelemetryConsent,'userId']]) {
      const ids = model === PartnerApplication ? d.applications : model === Business ? d.businesses : d.users;
      residual[model.tableName] = await model.count({ where: { [key]: ids } }); assert.equal(residual[model.tableName], 0);
    }
    assert.equal(await User.count({ where: { email: d.emails } }), 0);
    d.residual = residual; d.cleanup = 'PASS'; this.save(); return { project: d.project, result: 'PASS', residual, users: d.users.length, applications: d.applications.length, businesses: d.businesses.length };
  }
}
module.exports = { models, sequelize, guard, schema, Fixtures, write };
