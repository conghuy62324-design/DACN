const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),principal='9997f6db-bfa1-4377-96f3-5b5ea19dbf34',principalHash='6b982d095bc6bc30c87955cd38c78afa9ef31d3447ef30f62e8684bbe8bce600',principalSource='docs/evidence/t-ai-04-e-final/run-20261109T041645807Z-ae626a88/attempt-E04-B.json';
// Reuse the historical scanner verbatim without executing historical write-once entrypoints.
const source=fs.readFileSync(path.join(root,'docs/evidence/t-ai-04-g2-live-multi-turn-validation/common.cjs'),'utf8');
const scanner=source.slice(source.indexOf('function rate('),source.indexOf('\nfunction resources('));
const rate=eval('('+scanner+')'),result=rate();
const out={...result,required:10,missing:Math.max(0,10-result.remainingConservativeSlots),verdict:result.remainingConservativeSlots>=10&&result.futureDatedEntries.length===0?'PASS':'STOP',policy:'20/hour; reserve 9 normal + 1 conservative operator; same approved principal; at and createdAt scanned'};
fs.writeFileSync(path.join(__dirname,'quota-fresh-'+Date.now()+'.json'),JSON.stringify(out,null,2),{flag:'wx'});console.log(JSON.stringify(out));
