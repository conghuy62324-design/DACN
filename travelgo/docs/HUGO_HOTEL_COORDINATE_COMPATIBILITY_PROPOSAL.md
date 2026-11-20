# Hotel draft coordinates — compatibility proposal

Status: **PROPOSED, NOT AUTHORIZED/APPLIED**. Prepared during 21.38-B; no additional migration is placed in the executable migrations directory.

The existing `places.latitude` and `places.longitude` columns are NOT NULL. The Hotel address extension deliberately accepts a null pair. Actual isolated tests confirm that removing the pair keeps the aggregate unpublished, Admin publication fails, and legacy public Place reads exclude the draft. Creating a new Hotel/Place without the pair currently returns **422**, before assigning an ID or inserting rows. No `(0,0)`, random hotel point or borrowed Business point is substituted.

This is an explicit remaining limitation for starting a new draft without coordinates. It is not an acceptance of full nullable-coordinate support.

## Consumers verified from current source

| Consumer | Finding / required compatibility work |
|---|---|
| `backend/src/services/placeService.ts` | `serializePlace` uses `Number(value || 0)` for coordinates. Before permitting null in Place, preserve null/unknown instead of converting it to zero; update create/edit types and validators. Hotel-enabled legacy edit/submit/moderation paths are already blocked in B to protect the canonical address. |
| `backend/src/hotels/management.ts` | Draft creation rejects missing coordinates; address editing accepts a null pair and invalidates publication. Admin publication requires a supplied pair and atomically projects canonical address/location to Place. Keep that publication rule unless a separate product policy explicitly changes it. |
| `backend/src/services/recommendationService.ts` | The centroid path filters finite coordinates. Audit all upstream conversions and candidate filters before allowing null records; never convert unknown to zero or claim distance without evidence. |
| `backend/src/services/tourPlannerService.ts` | Types already contain nullable activity/centroid coordinates, but some legacy fallback branches use fixed/sample coordinates. Do not silently route new unknown Hotel records through those branches. Planner is unchanged in this task. |
| `backend/src/repositories/recommendationRepository.ts` | Check PostGIS candidate selection, geographic distance ordering and NULL handling under the selected Planner modes. Unknown-coordinate Hotel drafts must remain outside public planning candidates. |
| `frontend/src/components/GoogleMap.tsx` | Finite-coordinate checks are present for pins. Verify selected pin/center and empty map behavior on nullable DTOs. No Maps calls were made during B. |
| `frontend/src/components/explore/MapView.tsx` | Some guards use truthiness and `flyTo` consumes selected coordinates. Replace implicit truthiness with explicit valid-pair checks before accepting null. |
| `frontend/src/utils/plannerContract.ts` | Supports paired null activity coordinates. Preserve strict paired-null/finite semantics and distance provenance. |
| `frontend/src/pages/partner/PartnerResourceFormPage.tsx` | Legacy coordinates are required. Review how existing non-Hotel creation stays compatible; do not weaken all services to make the Hotel draft work. |
| Catalog / serialization / Hotel search | Keep one canonical structured address and shared geography registry. Pair constraints, geometry generation/projection and public eligibility must agree in one transaction. |

## Proposed future scope

1. Freeze a fresh target identity, all schema/row fingerprints, current migration tracker and affected sources. Obtain separate approval for the additional migration and compatibility changes.
2. On a newly approved isolated target first, make the two Place columns nullable together; add paired-null and finite bounds checks; maintain `location=NULL` when unknown. Do not backfill zero coordinates or modify existing values.
3. Fix serializers, DTOs, validators and affected map/geo consumers. Keep published Hotel eligibility requiring an acceptable supplied/verified pair. A new unknown-coordinate draft can then persist with a true null pair.
4. Run positive/negative tests for unknown draft creation, null round trip, invalid/mixed pairs, public exclusion, later coordinate supply + exact-revision publication, map empty state, Recommendation/Planner compatibility and rollback.
5. A down migration must refuse to restore NOT NULL while any null pairs exist. Export/review those drafts or retain the nullable schema; never fabricate coordinates to force rollback.

Do not change the current 40/17 protected staging launcher or deploy this proposal as part of 21.38-B. The accepted Hotel migration18 remains 12 new tables with no existing coordinate-column alteration.
