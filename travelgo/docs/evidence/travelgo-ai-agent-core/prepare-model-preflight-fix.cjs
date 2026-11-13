// Preserve first preflight. Correct OS socket classification, no inference retry (POST count remains zero).
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const previous=JSON.parse(fs.readFileSync(path.join(__dirname,'model-one-result.json')));assert.equal(previous.loadOnly,0);assert.equal(previous.inference,0);assert.equal(previous.reason,'COMPETING_OLLAMA_REQUEST');
let s=fs.readFileSync(path.join(__dirname,'model-one-with-approved-load.cjs'),'utf8');
const old="assert.ok(!lines.split(/\\r?\\n/).some(l=>/127\\.0\\.0\\.1:11434/.test(l)&&/ESTABLISHED/.test(l)),'COMPETING_OLLAMA_REQUEST');";
assert.ok(s.includes(old));
s=s.replace(old,"const clients=lines.split(/\\r?\\n/).map(l=>l.trim().split(/\\s+/)).filter(p=>p[0]==='TCP'&&p[2]==='127.0.0.1:11434'&&p[3]==='ESTABLISHED');result.metadataSocketClients=clients.map(p=>({pid:Number(p[4]),ownProcess:Number(p[4])===process.pid}));assert.ok(clients.every(p=>Number(p[4])===process.pid),'UNKNOWN_OLLAMA_CLIENT_STOP');");
s=s.replaceAll('model-one-','model-two-');
// Preserve original attempt ledger names and fixed cap2 across both preflights.
fs.writeFileSync(path.join(__dirname,'model-preflight-corrected.cjs'),s,{flag:'wx'});
fs.writeFileSync(path.join(__dirname,'model-preflight-classification-fix.json'),JSON.stringify({initial:'model-one-result.json',nativePostsBeforeFix:0,reason:'The first guard matched its own fetch keep-alive sockets from read-only Ollama metadata. Corrected guard inspects client-side remote11434 rows and exact current Node PID; unknown clients still STOP. Original preflight/source preserved. Inference remains at most one, conditional load at most one; no model retry.'},null,2),{flag:'wx'});
