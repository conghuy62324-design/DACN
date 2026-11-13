const c=require('./common.cjs');
const files=['mock-browser-manifest.json','public-json.cjs','ui-strings.json','browser-checks.cjs','fail-fast.cjs','run-live.corrected.cjs','browser-tests/planner.spec.cjs','playwright.config.cjs'];
c.write('offline-input-lock-02.json',{at:new Date().toISOString(),tier:'OFFLINE_ONLY_NOT_LIVE_APPROVAL',reason:'Scope duplicate dinner titles to exact day/activity; preserve all expected prices/fields. Add exact mock GET favorites for app shell.',hashes:Object.fromEntries(files.map(f=>[f,c.sha(c.read(c.prefix+f))]))});
