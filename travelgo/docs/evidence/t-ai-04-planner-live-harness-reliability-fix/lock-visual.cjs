const c=require('./common.cjs');
const previous=c.json(c.prefix+'offline-input-lock-03.json');
c.write('offline-input-lock-04.json',{at:new Date().toISOString(),tier:'OFFLINE_ONLY_NOT_LIVE_APPROVAL',reason:'Add ordinary-scroll screenshots of total, each sightseeing day, warnings and manual confirmation; do not change frontend/CSS/expected.',hashes:Object.fromEntries(Object.keys(previous.hashes).map(f=>[f,c.sha(c.read(c.prefix+f))]))});
