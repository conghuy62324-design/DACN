"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TravelKnowledgeService = void 0;
exports.knowledgeDraft = knowledgeDraft;
const webTravelExtraction_js_1 = require("../agent/webTravelExtraction.js");
const costIntelligence_js_1 = require("../agent/costIntelligence.js");
const node_util_1 = require("node:util");
const node_crypto_1 = require("node:crypto");
const sequelize_1 = require("sequelize");
const database_js_1 = require("../config/database.js");
const httpError_js_1 = require("../utils/httpError.js");
const vietnam_js_1 = require("../geography/vietnam.js");
const travelKnowledge_js_1 = require("../agent/travelKnowledge.js");
const enabled = () => process.env.TRAVEL_KNOWLEDGE_ENABLED === 'true';
const columns = `id,location_id AS "locationId",place_id AS "placeId",topic,title,content,source_type AS "sourceType",source_url AS "sourceUrl",internal_source_id AS "internalSourceId",provenance,status,public_use AS "publicUse",reviewed_at AS "reviewedAt",valid_from AS "validFrom",expires_at AS "expiresAt",version`;
const bad = () => new httpError_js_1.HttpError(400, 'Kiến thức hoặc nguồn chưa hợp lệ.', 'KNOWLEDGE_INVALID');
function knowledgeDraft(raw) {
    const keys = ['locationId', 'placeId', 'topic', 'title', 'content', 'sourceType', 'sourceUrl', 'internalSourceId', 'provenance', 'validFrom', 'expiresAt'];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.keys(raw).some(k => !keys.includes(k)) || !(0, vietnam_js_1.resolveLocation)(raw.locationId) || (0, vietnam_js_1.resolveLocation)(raw.locationId)?.id !== raw.locationId || raw.locationId === 'all' || !travelKnowledge_js_1.KNOWLEDGE_TOPICS.includes(raw.topic) || !(0, travelKnowledge_js_1.safeKnowledgeText)(raw.title, 160) || !(0, travelKnowledge_js_1.safeKnowledgeText)(raw.content))
        throw bad();
    if (raw.placeId !== undefined && raw.placeId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.placeId))
        throw bad();
    if (raw.sourceType === 'INTERNAL_CATALOG') {
        if (!raw.placeId || raw.internalSourceId !== raw.placeId || raw.sourceUrl)
            throw bad();
    }
    else if (!['OFFICIAL', 'PARTNER_VERIFIED', 'EXTERNAL_REVIEWED'].includes(raw.sourceType) || !(0, travelKnowledge_js_1.safeKnowledgeUrl)(raw.sourceUrl) || raw.internalSourceId)
        throw bad();
    const p = raw.provenance;
    const web = p?.method === 'WEB_SOURCE_REVIEW';
    if (raw.sourceType === 'EXTERNAL_REVIEWED' && !web || web && raw.sourceType !== 'EXTERNAL_REVIEWED')
        throw bad();
    if (!p || typeof p !== 'object' || Array.isArray(p) || Object.keys(p).some(k => !(web ? ['method', 'retrievedAt', 'evidenceHash', 'webSourceId', 'webCandidateId', 'webCandidateVersion', 'webSourceVersion', 'independenceGroup', 'independenceReviewed', 'external', 'license', 'permissionUrl'] : ['method', 'retrievedAt', 'evidenceHash']).includes(k)) || !['MANUAL_OFFICIAL_REVIEW', 'PARTNER_DOCUMENT_REVIEW', 'CATALOG_FIELD_REVIEW', 'WEB_SOURCE_REVIEW'].includes(p.method) || typeof p.evidenceHash !== 'string' || !/^[a-f0-9]{64}$/.test(p.evidenceHash) || !Number.isFinite(Date.parse(p.retrievedAt)) || Date.parse(p.retrievedAt) > Date.now())
        throw bad();
    if (web && (!/^[0-9a-f-]{36}$/i.test(p.webSourceId) || !/^[0-9a-f-]{36}$/i.test(p.webCandidateId) || !Number.isSafeInteger(p.webSourceVersion) || p.webSourceVersion < 1 || !p.external || p.external.canonicalUrl !== raw.sourceUrl || p.external.contentHash !== p.evidenceHash || !(0, travelKnowledge_js_1.safeKnowledgeText)(p.license, 120) || !(0, travelKnowledge_js_1.safeKnowledgeUrl)(p.permissionUrl) || Buffer.byteLength(JSON.stringify(p)) > 100000))
        throw bad();
    if (web && !(0, webTravelExtraction_js_1.reviewedExtraction)(p.external))
        throw bad();
    for (const k of ['validFrom', 'expiresAt'])
        if (raw[k] !== undefined && raw[k] !== null && (typeof raw[k] !== 'string' || !Number.isFinite(Date.parse(raw[k]))))
            throw bad();
    if (raw.validFrom && raw.expiresAt && Date.parse(raw.expiresAt) <= Date.parse(raw.validFrom))
        throw bad();
    return { ...raw, placeId: raw.placeId || null, sourceUrl: raw.sourceUrl || null, internalSourceId: raw.internalSourceId || null, validFrom: raw.validFrom || null, expiresAt: raw.expiresAt || null };
}
/** No shared cache. Every retrieval sees current approval, expiry and source eligibility. */
class TravelKnowledgeService {
    async approved(locationId, transaction) { return this.approvedQuery([locationId], transaction); }
    async approvedBatch(locationIds, transaction) { if (!Array.isArray(locationIds) || !locationIds.length || locationIds.length > 3 || locationIds.some(id => (0, vietnam_js_1.resolveLocation)(id)?.id !== id || id === 'all'))
        throw bad(); return this.approvedQuery(locationIds, transaction); }
    async costDestinations() { return [...new Set((await this.approvedQuery()).filter(k => k.topic === 'cost' && Array.isArray(k.provenance.external?.costs)).map(k => k.locationId))].slice(0, 3); }
    async approvedForMaintenance(actor) { if (!actor?.roles?.includes('SUPER_ADMIN'))
        throw new httpError_js_1.HttpError(403, 'Chỉ quản trị viên được xem coverage.', 'FORBIDDEN'); return this.approvedQuery(); }
    async approvedQuery(locationIds, transaction) {
        if (!enabled())
            return [];
        const webFence = process.env.TRAVEL_WEB_ENABLED === 'true' ? `(k.source_type<>'EXTERNAL_REVIEWED' OR EXISTS(SELECT 1 FROM travel_web_sources ws JOIN travel_web_candidates wc ON wc.source_id=ws.id WHERE ws.id::text=k.provenance->>'webSourceId' AND wc.id::text=k.provenance->>'webCandidateId' AND wc.knowledge_id=k.id AND wc.status='APPROVED' AND wc.source_version=ws.version AND wc.version=(k.provenance->>'webCandidateVersion')::integer+1 AND wc.content_hash=k.provenance->>'evidenceHash' AND ws.enabled AND ws.permission='ALLOWED' AND ws.review_status='APPROVED' AND ws.version::text=k.provenance->>'webSourceVersion' AND (ws.config->>'robotsReviewedAt')::timestamptz>now()-interval '7 days'))` : `k.source_type<>'EXTERNAL_REVIEWED'`;
        const rows = await database_js_1.sequelize.query(`SELECT ${columns} FROM verified_travel_knowledge k WHERE ${webFence} AND ($1::varchar[] IS NULL OR location_id=ANY($1::varchar[])) AND status='APPROVED' AND public_use AND reviewed_at<=now() AND (valid_from IS NULL OR valid_from<=now()) AND (expires_at IS NULL OR expires_at>now()) AND (place_id IS NULL OR EXISTS(SELECT 1 FROM places p LEFT JOIN businesses b ON b.id=p.business_id WHERE p.id=k.place_id AND p.status='APPROVED' AND (p.business_id IS NULL OR b.status='ACTIVE'))) ORDER BY updated_at DESC,id LIMIT 100`, { bind: [locationIds || null], type: sequelize_1.QueryTypes.SELECT, transaction });
        return rows.flatMap(r => { if (r.sourceType === 'EXTERNAL_REVIEWED') {
            const selected = (0, webTravelExtraction_js_1.reviewedExtraction)(r.provenance.external);
            if (!selected)
                return [];
            r = { ...r, provenance: { ...r.provenance, external: selected } };
        } return [{ ...r, ...Object.fromEntries(['reviewedAt', 'validFrom', 'expiresAt'].map(k => [k, r[k] instanceof Date ? r[k].toISOString() : r[k]])) }]; });
    }
    async costObservations(filters) {
        const { observationMatches } = await import('../agent/webTravelPolicy.js');
        if (!filters || filters.currency !== undefined && !['VND', 'USD', 'EUR', 'GBP', 'UNKNOWN'].includes(filters.currency) || filters.category !== undefined && ![...costIntelligence_js_1.COST_CATEGORIES, 'TOTAL', 'SIGHTSEEING'].includes(filters.category) || filters.unit !== undefined && !costIntelligence_js_1.COST_UNITS.includes(filters.unit) || filters.origin !== undefined && !(0, vietnam_js_1.resolveLocation)(filters.origin) || filters.travelPeriod !== undefined && (typeof filters.travelPeriod !== 'string' || !/^[0-9/\-]{4,12}$/.test(filters.travelPeriod)) || Object.keys(filters).some(k => !['locationId', 'days', 'party', 'origin', 'travelPeriod', 'category', 'unit', 'currency'].includes(k)) || !(0, vietnam_js_1.resolveLocation)(filters.locationId) || filters.days !== undefined && (!Number.isInteger(filters.days) || filters.days < 1 || filters.days > 10) || filters.party !== undefined && (!Number.isInteger(filters.party) || filters.party < 1 || filters.party > 100))
            throw bad();
        return (await this.approved(filters.locationId)).filter(k => k.sourceType === 'EXTERNAL_REVIEWED' && k.provenance?.method === 'WEB_SOURCE_REVIEW' && observationMatches(k.provenance.external, filters)).map(k => ({ knowledgeId: k.id, sourceUrl: k.sourceUrl, version: k.version, observation: { ...k.provenance.external, costs: k.provenance.external.costs.map(costIntelligence_js_1.typedCostObservation).filter((o) => o && (!filters.category || o.costCategory === filters.category || o.category === filters.category) && (!filters.unit || o.unit === filters.unit) && (!filters.currency || o.currency === filters.currency)) } })).filter(k => k.observation.costs.length);
    }
    static async adminList() { if (!enabled())
        throw new httpError_js_1.HttpError(503, 'Kho kiến thức chưa được bật.', 'KNOWLEDGE_DISABLED'); return database_js_1.sequelize.query(`SELECT ${columns} FROM verified_travel_knowledge ORDER BY updated_at DESC,id LIMIT 100`, { type: sequelize_1.QueryTypes.SELECT }); }
    static async write(actor, raw, id, sharedTransaction) {
        if (!actor.roles.includes('SUPER_ADMIN') || process.env.TRAVEL_KNOWLEDGE_SCOPED_REVIEWER_ID && actor.id !== process.env.TRAVEL_KNOWLEDGE_SCOPED_REVIEWER_ID)
            throw new httpError_js_1.HttpError(403, 'Chỉ quản trị viên được duyệt kiến thức.', 'FORBIDDEN');
        if (!enabled() || process.env.ADVISORY_STAGING_READ_ONLY === 'true')
            throw new httpError_js_1.HttpError(403, 'Kho kiến thức đang chỉ đọc.', 'KNOWLEDGE_READ_ONLY');
        if (id && !/^[0-9a-f-]{36}$/i.test(id))
            throw bad();
        const moderation = !!id && raw && typeof raw === 'object' && ['APPROVED', 'REVOKED'].includes(raw.status);
        if (moderation && (Object.keys(raw).some(k => !['status', 'version', 'publicUse', 'reason'].includes(k)) || !Number.isSafeInteger(raw.version) || raw.version < 1 || typeof raw.reason !== 'string' || !(0, travelKnowledge_js_1.safeKnowledgeText)(raw.reason, 240) || raw.status === 'APPROVED' && raw.publicUse !== true))
            throw bad();
        const draft = moderation ? null : knowledgeDraft(raw);
        const work = async (transaction) => {
            let previous;
            if (id) {
                const rows = await database_js_1.sequelize.query('SELECT * FROM verified_travel_knowledge WHERE id=$1 FOR UPDATE', { bind: [id], transaction, type: sequelize_1.QueryTypes.SELECT });
                previous = rows[0];
                if (!previous)
                    throw new httpError_js_1.HttpError(404, 'Không tìm thấy kiến thức.', 'KNOWLEDGE_NOT_FOUND');
            }
            if (moderation && previous.version !== raw.version)
                throw new httpError_js_1.HttpError(409, 'Nguồn vừa thay đổi; cần xem lại trước khi duyệt.', 'KNOWLEDGE_REVISION_CONFLICT');
            const provenance = moderation ? previous?.provenance : draft?.provenance;
            if (provenance?.method === 'WEB_SOURCE_REVIEW' && provenance.external?.synthetic !== true && process.env.TRAVEL_KNOWLEDGE_REAL_REVIEW_ALLOWED === 'false')
                throw new httpError_js_1.HttpError(403, 'Kiến thức thật cần reviewer owner và authorization riêng.', 'WEB_REAL_REVIEW_REQUIRES_OWNER');
            if (provenance?.method === 'WEB_SOURCE_REVIEW' && (!moderation || raw.status === 'APPROVED')) {
                if (process.env.TRAVEL_WEB_ENABLED !== 'true')
                    throw bad();
                const sources = await database_js_1.sequelize.query("SELECT s.*,c.extraction,c.status AS candidate_status,c.source_version FROM travel_web_sources s JOIN travel_web_candidates c ON c.source_id=s.id WHERE s.id=$1 AND c.id=$2 FOR UPDATE OF s,c", { bind: [provenance.webSourceId, provenance.webCandidateId], transaction, type: sequelize_1.QueryTypes.SELECT });
                const src = sources[0];
                if (provenance.independenceReviewed !== undefined && (typeof provenance.independenceReviewed !== 'boolean' || provenance.independenceReviewed === true && (!(0, travelKnowledge_js_1.safeKnowledgeText)(provenance.independenceGroup, 100) || provenance.independenceGroup !== src?.config?.independenceGroup)))
                    throw bad();
                if (!src || !src.enabled || src.permission !== 'ALLOWED' || src.review_status !== 'APPROVED' || src.version !== provenance.webSourceVersion || src.source_version !== src.version || !['DRAFT', 'APPROVED'].includes(src.candidate_status) || !(0, node_util_1.isDeepStrictEqual)(src.extraction, provenance.external) || Date.now() - Date.parse(src.config.robotsReviewedAt) >= 7 * 86400000)
                    throw bad();
            }
            let result;
            if (moderation) {
                if (raw.status === 'APPROVED') {
                    knowledgeDraft({ locationId: previous.location_id, placeId: previous.place_id, topic: previous.topic, title: previous.title, content: previous.content, sourceType: previous.source_type, sourceUrl: previous.source_url, internalSourceId: previous.internal_source_id, provenance: previous.provenance, validFrom: previous.valid_from?.toISOString(), expiresAt: previous.expires_at?.toISOString() });
                    if (previous.expires_at && +previous.expires_at <= Date.now())
                        throw bad();
                }
                result = await database_js_1.sequelize.query(`UPDATE verified_travel_knowledge SET status=$2,public_use=$3,reviewed_at=now(),reviewed_by=$4,version=version+1,updated_at=now() WHERE id=$1 RETURNING ${columns}`, { bind: [id, raw.status, raw.status === 'APPROVED', actor.id], transaction, type: sequelize_1.QueryTypes.SELECT });
            }
            else {
                const d = draft, values = [d.locationId, d.placeId, d.topic, d.title, d.content, d.sourceType, d.sourceUrl, d.internalSourceId, JSON.stringify(d.provenance), d.validFrom, d.expiresAt];
                if (id)
                    result = await database_js_1.sequelize.query(`UPDATE verified_travel_knowledge SET location_id=$1,place_id=$2,topic=$3,title=$4,content=$5,source_type=$6,source_url=$7,internal_source_id=$8,provenance=$9::jsonb,valid_from=$10,expires_at=$11,status='DRAFT',public_use=false,reviewed_at=NULL,reviewed_by=NULL,version=version+1,updated_at=now() WHERE id=$12 RETURNING ${columns}`, { bind: [...values, id], transaction, type: sequelize_1.QueryTypes.SELECT });
                else
                    result = await database_js_1.sequelize.query(`INSERT INTO verified_travel_knowledge(location_id,place_id,topic,title,content,source_type,source_url,internal_source_id,provenance,valid_from,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11) RETURNING ${columns}`, { bind: values, transaction, type: sequelize_1.QueryTypes.SELECT });
            }
            const row = result[0];
            await database_js_1.sequelize.query("INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,previous_data,new_data,reason) VALUES($1,$2,'TravelKnowledge',$3,$4::jsonb,$5::jsonb,$6)", { bind: [actor.id, 'KNOWLEDGE_' + row.status, row.id, JSON.stringify(previous ? { status: previous.status, version: previous.version } : {}), JSON.stringify({ status: row.status, version: row.version, contentHash: (0, node_crypto_1.createHash)('sha256').update(row.content).digest('hex') }), moderation ? raw.reason : 'Kiến thức mới/sửa luôn cần duyệt lại'], transaction });
            return row;
        };
        return sharedTransaction ? work(sharedTransaction) : database_js_1.sequelize.transaction(work);
    }
}
exports.TravelKnowledgeService = TravelKnowledgeService;
