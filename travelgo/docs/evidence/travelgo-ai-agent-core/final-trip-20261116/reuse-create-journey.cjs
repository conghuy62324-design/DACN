// Reuse the actual browser/create driver from 21.27 in memory with the new approved five-chat plan.
const fs=require('fs'),path=require('path'),Module=require('module');
const original=path.resolve(__dirname,'../business-v61b-20261116/actual-browser-create-v2.cjs');let s=fs.readFileSync(original,'utf8');
s=s.replace("require('./actual-common.cjs')","require('./reuse-trip-tools.cjs')");
const start=s.indexOf('const j2=await chat(1);'),end=s.indexOf('const j4=await chat(3);');if(start<0||end<0)throw Error('EXISTING_CREATE_DRIVER_CHANGED');s=s.slice(0,start)+s.slice(end).replace('const j4=await chat(3);','const j4=await chat(1);');
s=s.replace("const foreign=await c.api(auth.b,", "c.reserve('N1','NEGATIVE_CONFIRMATION');const foreign=await c.api(auth.b,");
s=s.replace("body),forged=await c.api(auth.a,", "body);c.reserve('N2','NEGATIVE_CONFIRMATION');const forged=await c.api(auth.a,");
s=s.replace("const replay=await c.api(auth.a,", "c.reserve('N3','NEGATIVE_CONFIRMATION');const replay=await c.api(auth.a,");
s=s.replace("assert.equal(denied.status,404);const connection=", "assert.equal(denied.status,404);const editDenied=await c.api(auth.b,'PUT','/api/trips/'+packet.tripIds[0],{notes:'SYNTHETIC_FORBIDDEN_EDIT'});assert.equal(editDenied.status,404);write('actual-other-owner-edit.json',{at:new Date().toISOString(),get:denied,put:editDenied});const connection=");
s=s.replace("quota:c.quota(auth.a.user)","quota:{initial:read('fresh-quota-gate.json').quota.remainingConservativeSlots,entries:fs.readdirSync(__dirname).filter(f=>/^attempt-.*[.]json$/.test(f)).length}");
const file=path.join(__dirname,'_existing_create_driver.cjs'),runner=new Module(file,module);runner.filename=file;runner.paths=Module._nodeModulePaths(__dirname);runner._compile(s,file);
