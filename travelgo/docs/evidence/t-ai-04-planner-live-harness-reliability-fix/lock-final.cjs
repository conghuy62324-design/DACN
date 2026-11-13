const c=require('./common.cjs');
const files=['mock-browser-manifest.json','public-json.cjs','ui-strings.json','browser-checks.cjs','fail-fast.cjs','run-live.corrected.cjs','browser-tests/planner.spec.cjs','playwright.config.cjs','independent-acceptance.cjs','injection-child.cjs','offline-boundary.cjs'];
c.write('offline-input-lock-03.json',{at:new Date().toISOString(),tier:'OFFLINE_ONLY_NOT_LIVE_APPROVAL',reason:'Final process exit propagation and independent acceptance sources locked.',hashes:Object.fromEntries(files.map(f=>[f,c.sha(c.read(c.prefix+f))]))});
