const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),sha=v=>crypto.createHash('sha256').update(v).digest('hex'),before=JSON.parse(fs.readFileSync(path.join(__dirname,'audit-before.json'))),changed=[],missing=[];
for(const[f,h]of Object.entries(before.hashes)){const file=path.join(root,f);if(!fs.existsSync(file))missing.push(f);else if(sha(fs.readFileSync(file))!==h)changed.push(f);}
const allowed=['backend/src/services/registeredCatalogService.ts','backend/src/services/tourPlannerService.ts','backend/src/services/tripSessionService.ts','backend/src/routes/agentRoutes.ts','frontend/src/pages/AssistantPage.tsx','frontend/src/services/api.ts'];
const unexpected=changed.filter(f=>!allowed.includes(f));assert.deepEqual(missing,[]);assert.deepEqual(unexpected,[]);
const oldDocs=Object.keys(before.hashes).filter(f=>f.startsWith('docs/'));
const maps=Object.keys(before.hashes).filter(f=>/google|mapsAgent|mapsRoutes|publicAgent|PublicAssistant|GoogleExplore|public-m1|publicStaging|public-release/i.test(f));
const result={at:new Date().toISOString(),status:'PASS',protectedFiles:Object.keys(before.hashes).length,changed,missing,unexpected,historicalDocsEvidenceUnchanged:oldDocs.length,priorMapsPublicFilesUnchanged:maps.length,sourcePolicy:'Only six intentional existing-source integrations changed. All baseline reports/evidence and prior Maps/Public work preserved. New Core files are listed separately in the report.'};
fs.writeFileSync(path.join(__dirname,'audit-after.json'),JSON.stringify(result,null,2),{flag:'wx'});console.log(JSON.stringify(result));
