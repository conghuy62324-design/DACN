/** Completed outbox metadata only. Never delete reviews, attribution or live queue entries. */
export const REVIEW_OUTBOX_PRUNE_SQL = "WITH victims AS (SELECT e.review_id,e.review_revision,e.event_kind,e.processing_version FROM review_processing_events e JOIN review_insight_jobs j ON j.place_id=e.place_id AND j.processed_revision>=e.place_revision WHERE e.state='COMPLETED' AND e.processed_at < now()-interval '90 days' AND ($2::uuid[] IS NULL OR e.place_id=ANY($2::uuid[])) ORDER BY e.processed_at,e.review_id,e.review_revision,e.event_kind,e.processing_version LIMIT $1 FOR UPDATE OF e SKIP LOCKED) DELETE FROM review_processing_events e USING victims v WHERE (e.review_id,e.review_revision,e.event_kind,e.processing_version)=(v.review_id,v.review_revision,v.event_kind,v.processing_version) RETURNING 1 AS pruned";

export function reviewOutboxPruneLimit(value:string|undefined){
    const limit=Number(value??100);
    if(!Number.isInteger(limit)||limit<1||limit>500)throw Error('REVIEW_WORKER_PRUNE_LIMIT');
    return limit;
}
