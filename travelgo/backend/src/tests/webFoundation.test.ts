import assert from 'node:assert/strict';
import { validateContent } from '../web/cms.js';
import { updateProfile } from '../web/accountSecurity.js';
import { AdminService } from '../services/adminService.js';
import { integer, internalLink, only, version } from '../web/common.js';

// Boundary cases run under the unchanged permanent OFFLINE network-denial preload.
// Every rejected input must fail before any DB query or other I/O.
async function run() {
  assert.throws(()=>integer('1'),/Số nguyên/);
  assert.throws(()=>version(2,1),/Dữ liệu đã đổi/);
  assert.throws(()=>only({id:'x',role:'SUPER_ADMIN'},['id']),/trường không được phép/);
  for(const url of ['//external.invalid','/\\external.invalid','/%2fexternal.invalid','javascript:alert(1)'])assert.throws(()=>internalLink(url));
  assert.equal(internalLink('/hotels?city=destination%3Ada-lat'),'/hotels?city=destination%3Ada-lat');
  const banner={title:'SYNTHETIC',imageDesktop:null,imageMobile:null};
  for(const startsAt of ['2026-02-30T10:00:00+07:00','2026-11-25T24:00:00Z','2026-11-25T10:00:00'])await assert.rejects(()=>validateContent('BANNER','test',{...banner,startsAt},undefined),/Ngày|Thời|múi giờ/);
  const valid=await validateContent('BANNER','test',{...banner,startsAt:'2026-12-01T00:00:00+07:00'},undefined);assert.equal(valid.startsAt,'2026-11-30T17:00:00.000Z');
  for(const destination of ['Dalat','all','area:68:invented-place'])await assert.rejects(()=>validateContent('SECTION','destinations',{title:'Điểm đến',config:{destinationIds:[destination]}},undefined),/canonical ID/);
  const geo=await validateContent('SECTION','destinations',{title:'Điểm đến',config:{destinationIds:['destination:da-lat','48']}},undefined);assert.deepEqual(geo.config.destinationIds,['destination:da-lat','48']);
  await assert.rejects(()=>validateContent('SECTION','hero',{title:'Hero',enabled:false},undefined),/Không được tắt/);
  await assert.rejects(()=>validateContent('SECTION','offers',{title:'Ưu đãi',config:{limit:'6'}},undefined),/Số nguyên/);
  await assert.rejects(()=>updateProfile('unused',{phone:'12345678'}),/Số điện thoại/);
  await assert.rejects(()=>AdminService.getBookings(1,20,{businessId:'a'.repeat(36)}),/Mã bộ lọc/);
  await assert.rejects(()=>AdminService.getBookings(1,20,{from:'2026-99-99'}),/Ngày lọc/);
  console.log('PASS: targeted WEB input boundaries; canonical geography, real calendar/timezone, typed CAS/config, phone and UUID; zero network');
}
void run().catch(error=>{console.error(error.code||error.message);process.exitCode=1;});
