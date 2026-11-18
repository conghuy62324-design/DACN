'use strict';
// Documentation/seal only. No database, HTTP, authentication or model calls.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const dir = __dirname;
const root = path.resolve(dir, '../../../..');
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const write = (name, value) => fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const integrity = read('final-integrity-runtime.json');
const history = read('final-source-history-integrity.json');
const network = read('network-runtime-summary.json');
const created = read('actual-trip-created-db.json');
const updated = read('actual-trip-updated-db.json');
assert.equal(integrity.status, 'PASS_40_OF_40_PROTECTED_GUARDED_READ_ONLY');
assert.equal(network.nativeAttempts, 0);
assert.equal(network.nativeDispatched, 0);
assert.equal(updated.transactionCommitted, true);
assert.equal(updated.tripCount, 1);
assert.equal(history.sourceFiles, 764);
assert.equal(integrity.budget.totalCounted || (integrity.budget.normal + integrity.budget.valid + integrity.budget.negative), 10);
const masterPath = path.join(root, 'docs/TRAVELGO_AI_AGENT_CORE_MASTER_REPORT.md');
const before = fs.readFileSync(path.join(dir, 'master-before.md'));
assert.deepEqual(fs.readFileSync(masterPath), before);
assert(!before.toString('utf8').includes('## 21.27-B — FINAL REAL TRIP ACCEPTANCE'));
const summary = {
  at: new Date().toISOString(), task: '21.27-B', status: 'FINAL_REAL_TRIP_ACCEPTANCE_PASS_MODEL_OFF',
  environment: 'Actual Edge browser -> localhost5177 -> API5057 -> PostgreSQL staging15452; no API/model/DB doubles',
  approval: 'Fresh bounded packet21.27-B, explicit owner approval; no prior write authorization reused',
  tripId: '773bcf92-34fa-4dd5-90e3-cc37641fef24',
  verdicts: {
    actualTripSave: 'PASS_COMMITTED_READBACK', actualTripReopen: 'PASS_NEW_CONVERSATION_SEPARATE_CONSENT',
    actualTripUpdate: 'PASS_SAME_ID_COUNT_ONE_COMMITTED_READBACK', postgresqlPersistence: 'PASS_RELOAD_AND_TWO_API_RESTARTS',
    ownershipAndReplay: 'PASS_ACTUAL_BOUNDED_PROBES', costIntegrity: 'PASS_TWO_INDEPENDENT_CATALOG_ORACLES',
    desktopExperience: 'PASS_ACTUAL_CREATE_REOPEN_EDIT_UPDATE', mobileExperience: 'PASS_ACTUAL_READ_VIEW_ONLY',
    guardedServeModelOffIsolation: 'PASS_NATIVE_ATTEMPTS_0_DISPATCHED_0', dataIntegrity: 'PASS_40_OF_40_BASELINE',
    realKnowledgeActivation: 'PENDING', qwenRealModel: 'DEFERRED', browserQwenTools: 'NOT_RUN', liveReady: 'NO'
  },
  confirmedMutationReceipts: ['actual-create-receipt.json', 'actual-trip-created-db.json', 'actual-update-receipt.json', 'actual-trip-updated-db.json'],
  itineraryChange: 'Removed day2 zero-cost sightseeing; days1/3 unchanged; estimated group cost remains3760000VND',
  costCaveat: 'DEMO catalog and Planner assumptions, not a real supplier quote; GROUP_VND_V1 and N-1 lodging unchanged',
  security: { foreignTicket: 409, forgedOwnerAndItineraryBody: 400, consumedTicketReplay: 409, otherCustomerRead: 404, otherCustomerUpdate: 404,
    standaloneForgedCostProbe: 'NOT_RUN_ACTUAL; existing offline coverage only', expiryConcurrencyStaleCatalog: 'OFFLINE_ONLY' },
  quota: integrity.budget,
  cleanup: { tripDeleted: true, temporaryCustomerAndRoleDeleted: true, taskDpapiFilesRemoved: true, matchedTables: 40, stagingTripRows: 0,
    retainedOwnerCustomerCatalogSourceCandidateUnchanged: true, protectedApiPid: integrity.runtime.pid, mode: integrity.runtime.mode },
  source: history,
  limitations: ['Mobile conversational mutation not tested', 'Initial check-ins/progress were empty/zero; no claim of actual nonzero progress preservation',
    'Historical C1 FAIL, quota BLOCKED and metadata GET UNKNOWN remain unchanged', 'No Qwen, knowledge activation, Booking or payment acceptance'],
  stoppedAfterTask: true
};
write('acceptance-summary.json', summary);
const section = `

## 21.27-B — FINAL REAL TRIP ACCEPTANCE

Thực hiện16/11/2026, khoảng19:09–19:28ICT. **ACTUAL TRIP SAVE / REOPEN / UPDATE / POSTGRESQL PERSISTENCE PASS trong staging model-OFF.** Có committed receipts và PostgreSQL readback độc lập, không dùng replay/doubles để chấm actual PASS. [Summary](evidence/travelgo-ai-agent-core/final-trip-20261116/acceptance-summary.json). Historical C1 FAIL21.27, BLOCKED21.27-A và metadata GET UNKNOWN giữ nguyên.

### 21.27-B.1. Authorization, quota và source lock

Owner đã phê duyệt mới [bounded packet21.27-B](evidence/travelgo-ai-agent-core/final-trip-20261116/staging-authorization-review-packet.json), [receipt](evidence/travelgo-ai-agent-core/final-trip-20261116/staging-authorization.json), không tái dùng write approval cũ. Exact Trip 773bcf92-34fa-4dd5-90e3-cc37641fef24, existing CUSTOMER A và đúng1 CUSTOMER B/role tạm; chỉ users/user_roles/trip_sessions, exact SQL fence/owner/expiry/cap giữ nguyên. Window tối đa2giờ đến21:15:13ICT; đã đóng sau cleanup.

Một [fresh Agent scan](evidence/travelgo-ai-agent-core/final-trip-20261116/fresh-quota-gate.json) lúc19:09:53ICT đọc cả at/createdAt trên historical ledger cùng approved principal: **20/20**, reserve10. Đã sử dụng đúng **5chat +2valid confirmations +3negative conservative entries =10**, còn10 theo locked-gate accounting; không fresh-scan/poll thêm hoặc đổi principal. B không chat. API restart phục vụ persistence; bounded ledger/call cap không reset theo process. GET/PUT ownership được ghi riêng ngoài Agent routes.

764 source hashes trùng21.27-A trước và sau journey; không sửa production source, .env, Planner/cost formula/Trip implementation. Tái sử dụng ORM8/targeted30/build PASS đã khóa, không chạy benchmark lại. [Source/history integrity](evidence/travelgo-ai-agent-core/final-trip-20261116/final-source-history-integrity.json) xác minh ${history.priorHistoricalEvidenceFiles} historical evidence files và ${history.priorTaskSealArtifacts} artifacts trong seal21.27-A không đổi. Manifest/input/expected khóa trước actual requests; chỉ tái sử dụng helper/oracle và bổ sung continuation/evidence tại folder task mới.

### 21.27-B.2. Browser → API → PostgreSQL thật

**Create PASS:** Edge desktop5177 gửi P1 lập Đà Lạt3N2Đ/2người/ngân sách nhóm5triệu/xe máy và P2 lưu. Independent catalog oracle PASS, preview chưa tạo Trip. Sau checkbox xác nhận riêng, C1 HTTP200/saved và SELECT bằng connection độc lập xác nhận exact ID/owner đã commit. [Receipt](evidence/travelgo-ai-agent-core/final-trip-20261116/actual-create-receipt.json), [DB proof](evidence/travelgo-ai-agent-core/final-trip-20261116/actual-trip-created-db.json).

**Reopen/update PASS:** Restart scoped API, row vẫn bằng snapshot trước restart. Từ MyTrips/TripDetail vào hội thoại mới, chọn Trip server-owned và đồng ý riêng dùng Trip context; P3 hiển thị itinerary/cost/editing status, không nhập UUID. P4 “Ngày thứ2 muốn đi ít chỗ thôi” bỏ sightseeing miễn phí ngày2; ngày1/ngày3, lodging và các trường bảo vệ giữ nguyên. P5 tạo UPDATE preview trên cùng Trip; DB chưa đổi trước xác nhận. C2 HTTP200/saved, independent SELECT xác nhận UPDATE commit, **cùng ID và tổng số Trip vẫn1**. [Reopen](evidence/travelgo-ai-agent-core/final-trip-20261116/actual-reopen-scoring.json), [C2](evidence/travelgo-ai-agent-core/final-trip-20261116/actual-update-receipt.json), [before/after DB](evidence/travelgo-ai-agent-core/final-trip-20261116/actual-trip-updated-db.json).

Hai independent oracles create/update PASS. Tổng dự toán cả nhóm trước/sau đều **3.760.000VND** vì điểm bị bỏ có giá0; lodging N−1 và GROUP_VND_V1 giữ nguyên. Đây là catalog DEMO/Planner assumptions có caveats, không báo giá dịch vụ thật. Check-ins/progress ban đầu rỗng/0 được giữ; không suy rộng thành actual test với progress khác0.

Desktop reload TripDetail PASS. Restart lần2 về protected API rồi actual Edge mobile390×844 mở MyTrips→TripDetail/reload thấy itinerary/cost đã cập nhật, không overflow; PostgreSQL snapshot sau restart khớp updated row. [Create restart](evidence/travelgo-ai-agent-core/final-trip-20261116/persistence-after-create-restart.json), [update restart](evidence/travelgo-ai-agent-core/final-trip-20261116/persistence-after-update-restart.json), [mobile results](evidence/travelgo-ai-agent-core/final-trip-20261116/actual-mobile-read-results.json). **Mobile PASS chỉ cho read/view**, mutation/chat mobile0; không nhận là full mobile conversational mutation acceptance.

### 21.27-B.3. Security, model isolation và cleanup

Actual foreign confirmation409, forged owner/itinerary body400, consumed-ticket replay409, CUSTOMER B GET/PUT Trip404; không có Trip trước C1. [Pre-confirmation](evidence/travelgo-ai-agent-core/final-trip-20261116/actual-pre-confirmation-security.json), [replay](evidence/travelgo-ai-agent-core/final-trip-20261116/actual-post-create-security.json), [other-owner edit](evidence/travelgo-ai-agent-core/final-trip-20261116/actual-other-owner-edit.json). Standalone forged-cost payload không chạy actual riêng; cost-only/expiry/concurrency/stale-catalog vẫn ở tier offline đã có, không nâng thành actual PASS.

Actual guarded serve đã khởi động trước journey: integrated-review27880, scoped26168/28304, protected23020; permanent preload trước dotenv, effective model/provider/search/workerOFF sau dotenv. [Runtime audits](evidence/travelgo-ai-agent-core/final-trip-20261116/network-runtime-summary.json): current task native model **attempts0/dispatched0**, SQL fence blocked0; scoped API DML đúng1INSERT +1UPDATE. Không gọi Ollama metadata/warm-load/inference, không kiểm RAM/GPU/VRAM/model quota. Các kết luận này chỉ áp dụng task mới; không sửa incident lịch sử.

[Cleanup committed](evidence/travelgo-ai-agent-core/final-trip-20261116/cleanup-committed.json) xóa đúng task Trip/B/role và task DPAPI artifacts. [Final integrity/runtime](evidence/travelgo-ai-agent-core/final-trip-20261116/final-integrity-runtime.json): **40/40 fingerprint khớp fresh baseline**, staging Trip0 sau cleanup có chủ đích,130Place/20Business/17migrations/owner/customer/retained source/candidate nguyên vẹn. Owner DPAPI không đọc/thay; không truy cập DB gốc27Trip. API5057 PID23020 protected READ ONLY, health200, model/search/worker/public writesOFF; frontend5177 giữ nguyên.

| Verdict | Kết quả |
|---|---|
| ACTUAL TRIP SAVE / REOPEN / UPDATE | **PASS**, committed receipts + independent DB readback, cùng ID/count1 trước cleanup |
| POSTGRESQL PERSISTENCE | **PASS**, reload và hai API restart |
| OWNERSHIP & REPLAY | **PASS** cho actual probes nêu trên; phần còn lại giữ offline tier |
| COST INTEGRITY / DESKTOP | **PASS** actual bounded journey |
| MOBILE | **PASS actual read/view**, conversational mutation NOT RUN |
| MODEL-OFF GUARDED SERVE / DATA INTEGRITY | **PASS**, native0, cleanup40/40, protected READ ONLY |
| REAL KNOWLEDGE ACTIVATION | PENDING |
| QWEN REAL MODEL / Browser → Qwen → Tools | DEFERRED / NOT RUN |
| LIVE READY | **NO** |

**Dừng sau21.27-B.** Không Booking/payment/knowledge approval/catalog/schema changes, Internet/model calls, Maps/GPS/VPS/commit/push/deploy; không tự mở task tiếp theo.
`;
fs.appendFileSync(masterPath, section, 'utf8');
assert.deepEqual(fs.readFileSync(masterPath).subarray(0, before.length), before);
const artifacts = {};
for (const name of fs.readdirSync(dir).sort()) {
  const file = path.join(dir, name);
  if (fs.statSync(file).isFile() && name !== 'final-seal.json') artifacts[name] = sha(fs.readFileSync(file));
}
write('final-seal.json', {
  at: new Date().toISOString(), status: summary.status, artifacts,
  masterSha256: sha(fs.readFileSync(masterPath)), historicalMasterPrefixPreserved: true,
  sourceFilesVerified: history.sourceFiles, sourceDrift: [], quotaEntries: 10, reserveRemaining: 10,
  nativeModelAttempts: 0, nativeModelDispatched: 0, matchedTables: 40, protectedApiPid: integrity.runtime.pid,
  actualPersistenceAccepted: true, qwen: 'DEFERRED', liveReady: 'NO', taskStopped: true
});
console.log(JSON.stringify({status: summary.status, artifactsSealed: Object.keys(artifacts).length, masterUpdated: '21.27-B', native: 0, cleanup: '40/40', protectedApiPid: integrity.runtime.pid}));
