const c=require('./common.cjs'),previous=c.json(c.prefix+'offline-input-lock-06.json');
c.write('offline-input-lock-07.json',{at:new Date().toISOString(),tier:'OFFLINE_ONLY_NOT_LIVE_APPROVAL',reason:'Fail closed if a completed result is missing its independent oracle.',hashes:Object.fromEntries(Object.keys(previous.hashes).map(f=>[f,c.sha(c.read(c.prefix+f))]))});
