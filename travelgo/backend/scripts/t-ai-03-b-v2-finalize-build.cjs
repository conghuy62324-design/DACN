// Creates a separate owner-review candidate; historical V1 and V2 draft stay untouched.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const draftPath = path.join(root, 'docs/evidence/t-ai-03-b-unblock/nlu-manifest-v2-draft.json');
const provenancePath = path.join(root, 'docs/evidence/t-ai-03-b-unblock/nlu-v2-provenance.json');
const outDir = path.join(root, 'docs/evidence/t-ai-03-b-v2-finalize');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const originalDraft = fs.readFileSync(draftPath);
const draft = JSON.parse(originalDraft.toString('utf8'));
const provenance = JSON.parse(fs.readFileSync(provenancePath, 'utf8'));
const vi04 = draft.cases.find(c => c.id === 'VI04');
const vi16 = draft.cases.find(c => c.id === 'VI16');
assert.ok(vi04 && vi16);
assert.equal(vi04.request.message, vi16.request.message, 'Historical draft no longer has the documented duplicate');
assert.equal(hash(originalDraft), '6bc1afaae17d9ecb973aab9c6331faa7beace7b09035d8a4bbec20e4ef82f5fb', 'Historical V2 draft changed');
const exactRequest = 'Nhóm tôi có khoảng 5 triệu để đi Đà Nẵng từ Hà Nội, gồm 2 người lớn, đi ô tô từ ngày 15 đến 17 tháng 6 năm 2030. Lập lịch trình giúp tôi.';
const candidate = structuredClone(draft);
candidate.version = 'T_AI_03_B_VI_V2_CANDIDATE';
candidate.cases.find(c => c.id === 'VI16').request.message = exactRequest;
assert.deepEqual(candidate.cases.find(c => c.id === 'VI16').expected, vi16.expected);
const candidateProvenance = structuredClone(provenance);
candidateProvenance.status = 'CANDIDATE_PENDING_OWNER_REVIEW';
candidateProvenance.sourceDraftSha256 = hash(originalDraft);
candidateProvenance.cases.VI16.fields['request.message'] = 'PROPOSED_RECONSTRUCTION';
candidateProvenance.cases.VI16.candidateRevision = {
  source: 'Owner task T-AI-03-B-V2-FINALIZE, request item 3',
  classification: 'PROPOSED_RECONSTRUCTION',
  verbatimV1Recovery: false,
  reason: 'Replace a duplicated V2 draft request with an independently worded Vietnamese 5 triệu prompt.',
  priorDraftRequest: vi16.request.message,
  candidateRequest: exactRequest
};
fs.mkdirSync(outDir, { recursive: true });
for (const [name, value] of [['nlu-manifest-v2-candidate.json', candidate], ['nlu-v2-candidate-provenance.json', candidateProvenance]]) {
  const file = path.join(outDir, name);
  const bytes = Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8');
  if (fs.existsSync(file)) assert.deepEqual(fs.readFileSync(file), bytes, `${name} exists with different content`);
  else fs.writeFileSync(file, bytes, { flag: 'wx' });
}
console.log(JSON.stringify({ duplicateInDraft: true, candidateCases: candidate.cases.length, approvalStatus: candidate.approvalStatus, draftSha256: hash(originalDraft) }));
