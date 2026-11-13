const c=require('./common.cjs'),previous=c.json(c.prefix+'offline-input-lock-04.json');
c.write('offline-input-lock-05.json',{at:new Date().toISOString(),tier:'OFFLINE_ONLY_NOT_LIVE_APPROVAL',reason:'Also prove CASE_START/guard evidence write failures mark current case FAIL before any dispatch.',hashes:Object.fromEntries(Object.keys(previous.hashes).map(f=>[f,c.sha(c.read(c.prefix+f))]))});
