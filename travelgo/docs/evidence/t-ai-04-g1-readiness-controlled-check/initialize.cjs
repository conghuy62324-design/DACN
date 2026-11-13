const c = require('./common.cjs');
c.write('integrity-before.json', { at: new Date().toISOString(), hashes: c.snapshot() });
c.preflight('preflight-initial.json').then(record => console.log(JSON.stringify({ status: record.status, reason: record.reason,
  time: record.at, resources: record.resources, rate: record.rate && { known: record.rate.known, recent: record.rate.recent.length, slots: record.rate.remainingConservativeSlots },
  metadata: record.metadata && { version: record.metadata.version.body.version, resident: record.metadata.resident, context: record.metadata.residentContext, ready: record.metadata.ready } })))
  .catch(e => { console.error(e.code || e.message); process.exitCode = 1; });
