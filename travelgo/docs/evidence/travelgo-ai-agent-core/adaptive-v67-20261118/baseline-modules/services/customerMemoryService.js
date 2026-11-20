"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomerMemoryService = exports.memoryEnabled = exports.MEMORY_VALUES = exports.MEMORY_POLICY = void 0;
exports.preferenceInput = preferenceInput;
const sequelize_1 = require("sequelize");
const database_js_1 = require("../config/database.js");
const httpError_js_1 = require("../utils/httpError.js");
exports.MEMORY_POLICY = 'TRAVELGO_MEMORY_V1';
exports.MEMORY_VALUES = { quality: { quiet: 'Khách sạn yên tĩnh', clean: 'Ưu tiên vệ sinh', value: 'Giá hợp lý' }, interest: { nature: 'Khám phá thiên nhiên', culture: 'Văn hóa', food: 'Ẩm thực địa phương', relax: 'Nghỉ dưỡng' }, transportation: { car: 'Thường ưu tiên ô tô', motorbike: 'Thường ưu tiên xe máy' }, pace: { relaxed: 'Lịch trình thư giãn', balanced: 'Lịch trình cân bằng', packed: 'Khám phá nhiều địa điểm' } };
const memoryEnabled = () => process.env.AI_LONG_TERM_MEMORY_ENABLED === 'true';
exports.memoryEnabled = memoryEnabled;
function available() { if (!(0, exports.memoryEnabled)())
    throw new httpError_js_1.HttpError(503, 'Tính năng nhớ sở thích chưa được bật.', 'MEMORY_UNAVAILABLE'); }
function validId(id) { if (id && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))
    throw new httpError_js_1.HttpError(404, 'Không tìm thấy sở thích của bạn.', 'MEMORY_NOT_FOUND'); }
function payload(raw, keys) { if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(k => !keys.includes(k)))
    throw new httpError_js_1.HttpError(400, 'Thông tin sở thích chưa hợp lệ.', 'INVALID_MEMORY_INPUT'); }
function preferenceInput(raw) { payload(raw, ['type', 'value', 'confirmed']); if (raw.confirmed !== true || typeof raw.type !== 'string' || typeof raw.value !== 'string' || !Object.hasOwn(exports.MEMORY_VALUES, raw.type) || !Object.hasOwn(exports.MEMORY_VALUES[raw.type], raw.value))
    throw new httpError_js_1.HttpError(400, 'Bạn cần xác nhận một sở thích du lịch hợp lệ.', 'INVALID_MEMORY_INPUT'); return { type: raw.type, value: raw.value }; }
const query = (sql, bind = [], transaction) => database_js_1.sequelize.query(sql, { bind, type: sequelize_1.QueryTypes.SELECT, transaction });
class CustomerMemoryService {
    static async get(customerId) { available(); const settings = (await query('SELECT enabled,allow_new AS "allowNew",policy_version AS "policyVersion",updated_at AS "updatedAt" FROM customer_memory_settings WHERE customer_id=$1', [customerId]))[0] || { enabled: false, allowNew: false, policyVersion: null }; const items = await query('SELECT id,type,value,source,status,scope,created_at AS "createdAt",updated_at AS "updatedAt" FROM customer_travel_preferences WHERE customer_id=$1 ORDER BY created_at,id', [customerId]); return { settings, items: items.map(p => ({ ...p, label: exports.MEMORY_VALUES[p.type]?.[p.value] })), policyVersion: exports.MEMORY_POLICY, choices: exports.MEMORY_VALUES }; }
    static async forAdvice(customerId) { if (!(0, exports.memoryEnabled)())
        return []; const data = await this.get(customerId); return data.settings.enabled ? data.items.filter(p => p.status === 'ACTIVE') : []; }
    static async settings(customerId, raw) { available(); payload(raw, ['enabled', 'allowNew', 'policyVersion']); if (typeof raw.enabled !== 'boolean' || typeof raw.allowNew !== 'boolean' || raw.enabled && raw.policyVersion !== exports.MEMORY_POLICY)
        throw new httpError_js_1.HttpError(400, 'Cần đồng ý riêng với chính sách nhớ sở thích.', 'MEMORY_CONSENT_REQUIRED'); await database_js_1.sequelize.query('INSERT INTO customer_memory_settings(customer_id,enabled,allow_new,policy_version,consented_at) VALUES($1,$2,$3,$4,CASE WHEN $2 THEN now() ELSE NULL END) ON CONFLICT(customer_id) DO UPDATE SET enabled=excluded.enabled,allow_new=excluded.allow_new,policy_version=excluded.policy_version,consented_at=CASE WHEN excluded.enabled THEN now() ELSE customer_memory_settings.consented_at END,updated_at=now()', { bind: [customerId, raw.enabled, raw.enabled && raw.allowNew, raw.enabled ? exports.MEMORY_POLICY : null] }); return this.get(customerId); }
    static async save(customerId, raw, id) { available(); validId(id); const value = preferenceInput(raw); await database_js_1.sequelize.transaction(async (transaction) => { const settings = (await query('SELECT * FROM customer_memory_settings WHERE customer_id=$1 FOR UPDATE', [customerId], transaction))[0]; if (!settings?.enabled || !id && !settings.allow_new)
        throw new httpError_js_1.HttpError(428, 'Hãy bật và đồng ý ghi nhớ sở thích trước khi lưu.', 'MEMORY_CONSENT_REQUIRED'); if (id) {
        const rows = await query('UPDATE customer_travel_preferences SET type=$3,value=$4::jsonb,source=\'CONFIRMED\',updated_at=now() WHERE id=$1 AND customer_id=$2 RETURNING id', [id, customerId, value.type, JSON.stringify(value.value)], transaction);
        if (!rows.length)
            throw new httpError_js_1.HttpError(404, 'Không tìm thấy sở thích của bạn.', 'MEMORY_NOT_FOUND');
    }
    else {
        const count = +(await query('SELECT count(*)::int AS n FROM customer_travel_preferences WHERE customer_id=$1', [customerId], transaction))[0].n;
        if (count >= 20)
            throw new httpError_js_1.HttpError(409, 'Bạn có thể lưu tối đa 20 sở thích.', 'MEMORY_LIMIT');
        await database_js_1.sequelize.query("INSERT INTO customer_travel_preferences(customer_id,type,value,source) VALUES($1,$2,$3::jsonb,'CONFIRMED') ON CONFLICT(customer_id,type,value) DO NOTHING", { bind: [customerId, value.type, JSON.stringify(value.value)], transaction });
    } }); return this.get(customerId); }
    static async remove(customerId, id) { available(); validId(id); if (id) {
        await database_js_1.sequelize.query('DELETE FROM customer_travel_preferences WHERE customer_id=$1 AND id=$2', { bind: [customerId, id] });
    }
    else {
        await database_js_1.sequelize.transaction(async (transaction) => { await query('SELECT customer_id FROM customer_memory_settings WHERE customer_id=$1 FOR UPDATE', [customerId], transaction); await database_js_1.sequelize.query('DELETE FROM customer_travel_preferences WHERE customer_id=$1', { bind: [customerId], transaction }); await database_js_1.sequelize.query('DELETE FROM customer_memory_settings WHERE customer_id=$1', { bind: [customerId], transaction }); });
    } return this.get(customerId); }
}
exports.CustomerMemoryService = CustomerMemoryService;
