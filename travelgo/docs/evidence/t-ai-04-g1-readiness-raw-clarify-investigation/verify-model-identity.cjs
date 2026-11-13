// Read small local manifest metadata only; never read/modify/download model weights.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const modelRoot = path.join(process.env.USERPROFILE, '.ollama/models');
const wrapperPath = path.join(modelRoot, 'manifests/registry.ollama.ai/library/qwen3/4b-instruct-2507-q4_K_M');
const bytes = fs.readFileSync(wrapperPath), wrapper = JSON.parse(bytes);
const approved = '0edcdef34593eac1aa2be9c7d06c432dcf81945adca5eca2f27662c18f168ba0';
const manifestLayer = wrapper.layers.find(layer => layer.digest === 'sha256:' + approved);
assert.ok(manifestLayer); assert.equal(manifestLayer.mediaType, 'application/vnd.docker.distribution.manifest.v2+json');
const originalPath = path.join(modelRoot, 'blobs', 'sha256-' + approved), original = fs.readFileSync(originalPath);
assert.equal(sha(original), approved);
const originalManifest = JSON.parse(original);
const weight = 'sha256:85e4a5b7b8ef0e48af0e8658f5aaab9c2324c76c1641493f4d1e25fce54b18b9';
assert.ok(wrapper.layers.some(layer => layer.digest === weight)); assert.ok(originalManifest.layers.some(layer => layer.digest === weight));
const result = { status: 'PASS', tag: 'qwen3:4b-instruct-2507-q4_K_M', apiAndApprovedDigest: approved,
  localWrapper: { path: wrapperPath, size: bytes.length, sha256: sha(bytes), nestedOriginalManifestLayer: manifestLayer },
  originalManifest: { path: originalPath, size: original.length, sha256: sha(original) }, loggedWeightBlob: weight,
  weightReferencedByBothManifests: true,
  note: 'Wrapper file hash and approved original-manifest digest identify different files. Both wrapper and original reference the weight blob printed in M-run logs. No digest change inferred.',
  inferencePosts: 0, modelDownloads: 0 };
fs.writeFileSync(path.join(__dirname, 'model-identity.json'), JSON.stringify(result, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: result.status, originalManifestBytes: original.length, approvedDigest: approved, weightReferencedByBothManifests: true }));
