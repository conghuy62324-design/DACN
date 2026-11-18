import fs from 'node:fs';
import assert from 'node:assert/strict';
import {readCoreResponse} from '../src/services/agentCoreClient.ts';
import {readWebRetrieval} from '../src/utils/webSourceCards.ts';
const raw=JSON.parse(fs.readFileSync('../docs/evidence/travelgo-ai-agent-core/web-v58-20261114/offline-wire.json','utf8'));
readCoreResponse(raw.envelope,raw.request);
const good=raw.envelope.data.webRetrieval;let checks=1;
for(const patch of [{externalStages:2},{mutationAuthority:true},{unknown:'extra'},{status:'CANDIDATES'}]){assert.throws(()=>readWebRetrieval({...good,...patch}));checks++;}
for(const href of ['javascript:alert(1)','https://127.0.0.1/x','https://user:pass@example.org/x','https://example.org/x?token=private']){const v=structuredClone(good);v.sources[0].href=href;assert.throws(()=>readWebRetrieval(v));checks++;}
for(const patch of [{amount:'3000000'},{unit:'PER_MEAL'},{privateKey:'extra'}]){const v=structuredClone(good);Object.assign(v.sources[0].costs[0],patch);assert.throws(()=>readWebRetrieval(v));checks++;}
const unverified=structuredClone(good);unverified.status='CANDIDATES';unverified.externalStages=1;unverified.sources[0].trust='UNVERIFIED_CANDIDATE';assert.throws(()=>readWebRetrieval(unverified));checks++;unverified.sources[0].costs=[];assert.doesNotThrow(()=>readWebRetrieval(unverified));checks++;
console.log(JSON.stringify({group:'W29_FRONTEND_STRICT_WIRE_SUBASSERTIONS',tier:'OFFLINE_ACTUAL_FRONTEND_PARSER_ON_REAL_CORE_SYNTHETIC_FACTS',checks,passed:checks,failed:0,native:0}));
