// Sensor double only: plain JS arrays, never imports pg/Sequelize or executes SQL.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const proposal=JSON.parse(fs.readFileSync(path.join(__dirname,'../t-ai-04-planner-test-data-readiness/fixture-proposal.json'),'utf8'));
const approved=proposal.optionalProfile.records.map(x=>x.values),hash=(algo,s)=>crypto.createHash(algo).update(s).digest('hex');
class SyntheticDb{
 constructor({committed=true}={}){
  this.committed=committed;this.ambiguous=false;this.owned=committed;this.active=false;this.cleanupCalls=0;this.disposeCalls=0;this.preconditionReads=0;this.residualReads=0;this.unsafeActionCalls=0;this.failCleanup=false;this.failDispose=false;this.noDelete=false;this.skipResult=false;
  this.rows=committed?approved.map(v=>{const row={...structuredClone(v),created_at:'2030-01-01T00:00:00.000Z',updated_at:'2030-01-01T00:00:00.000Z'},full_row_json=JSON.stringify(row);return{row,full_row_json,sha256:hash('sha256',full_row_json),row_md5:hash('md5',full_row_json)};}):[];
  this.ledger=committed?{status:'COMMITTED_OWNERSHIP_VERIFIED',commit:'ACKNOWLEDGED_AND_READ_BACK',affectedRows:2,insertedIds:approved.map(x=>x.id),rows:structuredClone(this.rows)}:null;
  this.refs={foreign:['blog_posts','bookings','tickets','tour_places','user_favorites'].map(table=>({table,count:0})),tripJson:0};
  this.isolation={status:'PASS_ONLY_APPROVED_TWO_ROWS_DIFFER',isolation:'ALL25_SHARE_LOCKS_GRANTED',tables:25,unchangedOtherTables:24,existingPlaces:22,currentPlaces:24,tripSessions:27};
 }
 ports(){return{
  expectedIds:approved.map(x=>x.id),
  readState:async()=>{this.preconditionReads++;return{committed:this.committed,ambiguous:this.ambiguous,createdRows:this.rows.length};},
  readOwnership:async()=>this.ledger?{owned:this.owned,ledger:structuredClone(this.ledger)}:null,
  readRows:async()=>structuredClone(this.rows),readReferences:async()=>structuredClone(this.refs),verifyIsolation:async()=>structuredClone(this.isolation),
  removeOwnedFixtures:async ticket=>{
   this.cleanupCalls++;
   // Independent callback monitor; negative cases must never reach this callback.
   if(!this.committed||!this.owned||this.refs.foreign.some(x=>x.count)||this.refs.tripJson||this.isolation.isolation!=='ALL25_SHARE_LOCKS_GRANTED')this.unsafeActionCalls++;
   assert.equal(this.unsafeActionCalls,0,'UNSAFE_DELETE_CALLBACK');assert.deepEqual(ticket.ids.slice().sort(),approved.map(x=>x.id).sort());
   if(this.failCleanup)throw Error('SYNTHETIC_CLEANUP_CALLBACK_FAILED');if(this.skipResult)return undefined;
   if(!this.noDelete)this.rows=[];
   return{status:'DB_RESTORED_25_25',affectedRows:2,deletedIds:approved.map(x=>x.id),places:22,tripSessions:27,tables:25,changed:[]};
  },readResidualIds:async()=>{this.residualReads++;return this.rows.map(x=>x.row.id);}
 };}
 async dispose(){this.disposeCalls++;if(this.failDispose)throw Error('SYNTHETIC_DISPOSE_FAILED');}
}
module.exports={SyntheticDb,approved};
