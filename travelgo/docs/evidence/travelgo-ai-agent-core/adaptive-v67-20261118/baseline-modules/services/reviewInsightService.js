"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewInsightService = exports.reviewInsightsEnabled = void 0;
exports.startReviewInsightWorker = startReviewInsightWorker;
exports.stopReviewInsightWorker = stopReviewInsightWorker;
const sequelize_1 = require("sequelize");
const database_js_1 = require("../config/database.js");
const Review_js_1 = require("../models/Review.js");
const registeredCatalogService_js_1 = require("./registeredCatalogService.js");
const reviewAspects_js_1 = require("../agent/reviewAspects.js");
const reviewInsightsEnabled = () => process.env.REVIEW_INSIGHTS_ENABLED === 'true';
exports.reviewInsightsEnabled = reviewInsightsEnabled;
class ReviewInsightService {
    /** Bounded request batch. It is reloaded at the presentation fence; no cross-request cache. */
    static async getBatch(ids) {
        if (!Array.isArray(ids) || ids.length > 5 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)))
            throw Error('REVIEW_BATCH_INVALID');
        if (!(0, exports.reviewInsightsEnabled)())
            return ids.map(() => null);
        if (process.env.ADVISORY_STAGING_READ_ONLY !== 'true' && process.env.REVIEW_INSIGHTS_READ_ONLY !== 'true') {
            const results = [];
            for (const id of ids)
                results.push(await this.get(id));
            return results;
        }
        if (!ids.length)
            return [];
        const catalogService = new registeredCatalogService_js_1.RegisteredCatalogService(), catalog = await catalogService.eligible(), places = ids.map(id => catalog.find(p => p.id === id));
        const rows = await Review_js_1.Review.findAll({ where: { targetType: 'place', targetId: { [sequelize_1.Op.in]: ids }, moderationStatus: 'PUBLISHED' }, attributes: ['id', 'targetId', 'comment', 'rating', 'verificationStatus', 'aiUsageAllowed'] });
        const jobs = await database_js_1.sequelize.query('SELECT place_id,revision FROM review_insight_jobs WHERE place_id=ANY($1::uuid[])', { bind: [ids], type: sequelize_1.QueryTypes.SELECT });
        return places.map((place, i) => { if (!place)
            return null; const permitted = rows.filter(r => r.targetId === ids[i]); const data = { ...(0, reviewAspects_js_1.summarizeReviewEvidence)(permitted.map(r => ({ id: r.id, comment: r.comment, rating: Number(r.rating), verificationStatus: r.verificationStatus, aiUsageAllowed: r.aiUsageAllowed })), place.category), placeId: ids[i], isDemo: catalogService.publicListing(place).isDemo, evidenceScope: 'PUBLISHED_AND_AI_ALLOWED_ONLY', sourceRevision: String(jobs.find(j => j.place_id === ids[i])?.revision || 0) }; return { ...data, status: data.analyzedReviewCount ? 'READY' : 'INSUFFICIENT', computedAt: new Date().toISOString(), readMode: 'FRESH_READ_ONLY' }; });
    }
    static async get(placeId) {
        if (!(0, exports.reviewInsightsEnabled)())
            return null;
        if ((process.env.ADVISORY_STAGING_READ_ONLY === 'true' || process.env.REVIEW_INSIGHTS_READ_ONLY === 'true'))
            return this.freshReadOnly(placeId);
        const place = await new registeredCatalogService_js_1.RegisteredCatalogService().details(placeId);
        try {
            return await database_js_1.sequelize.transaction(async (transaction) => {
                await database_js_1.sequelize.query('INSERT INTO review_insight_jobs(place_id) VALUES($1) ON CONFLICT DO NOTHING', { bind: [placeId], transaction });
                const jobs = await database_js_1.sequelize.query('SELECT * FROM review_insight_jobs WHERE place_id=$1 FOR UPDATE', { bind: [placeId], type: sequelize_1.QueryTypes.SELECT, transaction }), job = jobs[0];
                const cached = await database_js_1.sequelize.query('SELECT * FROM review_insights WHERE place_id=$1', { bind: [placeId], type: sequelize_1.QueryTypes.SELECT, transaction });
                if (cached[0] && String(cached[0].source_revision) === String(job.revision) && cached[0].method === reviewAspects_js_1.REVIEW_ANALYSIS_METHOD)
                    return { ...cached[0].data, computedAt: cached[0].computed_at, status: cached[0].status };
                const rows = await Review_js_1.Review.findAll({ where: { targetType: 'place', targetId: placeId, moderationStatus: 'PUBLISHED' }, attributes: ['id', 'comment', 'rating', 'verificationStatus', 'aiUsageAllowed'], transaction });
                const source = rows.map(r => ({ id: r.id, comment: r.comment, rating: Number(r.rating), verificationStatus: r.verificationStatus, aiUsageAllowed: r.aiUsageAllowed }));
                const data = { ...(0, reviewAspects_js_1.summarizeReviewEvidence)(source, place.category), placeId, isDemo: place.isDemo, evidenceScope: 'PUBLISHED_AND_AI_ALLOWED_ONLY', sourceRevision: String(job.revision) }, status = data.analyzedReviewCount ? 'READY' : 'INSUFFICIENT';
                const stored = await database_js_1.sequelize.query('INSERT INTO review_insights(place_id,source_revision,method,status,data) VALUES($1,$2,$3,$4,$5::jsonb) ON CONFLICT(place_id) DO UPDATE SET source_revision=excluded.source_revision,method=excluded.method,status=excluded.status,data=excluded.data,computed_at=now() RETURNING computed_at', { bind: [placeId, job.revision, reviewAspects_js_1.REVIEW_ANALYSIS_METHOD, status, JSON.stringify(data)], type: sequelize_1.QueryTypes.SELECT, transaction });
                await database_js_1.sequelize.query('UPDATE review_insight_jobs SET processed_revision=revision,attempts=0,last_error=NULL WHERE place_id=$1', { bind: [placeId], transaction });
                return { ...data, status, computedAt: stored[0].computed_at };
            });
        }
        catch (e) {
            await database_js_1.sequelize.query("UPDATE review_insight_jobs SET attempts=attempts+1,last_error='ANALYSIS_FAILED',updated_at=now() WHERE place_id=$1", { bind: [placeId] }).catch(() => { });
            throw e;
        }
    }
    /** Explicit isolated readonly path: recompute from fresh permitted rows; never reuse stale cache or write jobs. */
    static async freshReadOnly(placeId) {
        const place = await new registeredCatalogService_js_1.RegisteredCatalogService().details(placeId);
        const rows = await Review_js_1.Review.findAll({ where: { targetType: 'place', targetId: placeId, moderationStatus: 'PUBLISHED' }, attributes: ['id', 'comment', 'rating', 'verificationStatus', 'aiUsageAllowed'] });
        const jobs = await database_js_1.sequelize.query('SELECT revision FROM review_insight_jobs WHERE place_id=$1', { bind: [placeId], type: sequelize_1.QueryTypes.SELECT });
        const data = { ...(0, reviewAspects_js_1.summarizeReviewEvidence)(rows.map(r => ({ id: r.id, comment: r.comment, rating: Number(r.rating), verificationStatus: r.verificationStatus, aiUsageAllowed: r.aiUsageAllowed })), place.category), placeId, isDemo: place.isDemo, evidenceScope: 'PUBLISHED_AND_AI_ALLOWED_ONLY', sourceRevision: String(jobs[0]?.revision || 0) };
        return { ...data, status: data.analyzedReviewCount ? 'READY' : 'INSUFFICIENT', computedAt: new Date().toISOString(), readMode: 'FRESH_READ_ONLY' };
    }
    static async runPending(limit = 20) { if (!(0, exports.reviewInsightsEnabled)())
        return; const jobs = await database_js_1.sequelize.query("SELECT j.place_id FROM review_insight_jobs j JOIN places p ON p.id=j.place_id LEFT JOIN businesses b ON b.id=p.business_id LEFT JOIN review_insights i ON i.place_id=j.place_id WHERE p.status='APPROVED' AND (p.business_id IS NULL OR b.status='ACTIVE') AND (j.revision>j.processed_revision OR i.place_id IS NULL OR i.method<>$2) ORDER BY j.updated_at LIMIT $1", { bind: [Math.min(20, limit), reviewAspects_js_1.REVIEW_ANALYSIS_METHOD], type: sequelize_1.QueryTypes.SELECT }); for (const row of jobs)
        await this.get(row.place_id).catch(() => { }); }
}
exports.ReviewInsightService = ReviewInsightService;
let worker;
function startReviewInsightWorker() { if (!(0, exports.reviewInsightsEnabled)() || (process.env.ADVISORY_STAGING_READ_ONLY === 'true' || process.env.REVIEW_INSIGHTS_READ_ONLY === 'true') || worker)
    return; let busy = false; worker = setInterval(async () => { if (busy)
    return; busy = true; try {
    await ReviewInsightService.runPending();
}
catch { }
finally {
    busy = false;
} }, 10000); worker.unref(); }
function stopReviewInsightWorker() { if (worker)
    clearInterval(worker); worker = undefined; }
