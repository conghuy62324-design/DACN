import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {assertHotelDatabase} from '../hotels/postgresStore.js';
import {REVIEW_OUTBOX_PRUNE_SQL,reviewOutboxPruneLimit} from '../workers/reviewOutboxRetention.js';

const fixed={NODE_ENV:'production',DB_NAME:'hugotravel_prod_candidate',HOTEL_PRODUCTION_READ_DATABASE:'hugotravel_prod_candidate',
    HOTEL_PRODUCTION_READ_APPROVED:'true',WEB_FOUNDATION_ENABLED:'true',HOTEL_STAY_BOOKING_ENABLED:'false',ALLOW_TEST_DB_WRITES:'false',CATALOG_DEMO_ENABLED:'false',
    DB_HOST:'127.0.0.1',DB_PORT:'15457',HOTEL_2141B_BUSINESS_PROFILE:'',HOTEL_2141B_BUSINESS_UNTIL:''};
const identity={role:'hotel_runtime',db:fixed.DB_NAME,sentinel:'hugotravel-production-v1',rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolbypassrls:false};
type Scenario={env?:Record<string,string>;identity?:Partial<typeof identity>;access?:{readonly:string;writable:boolean};tables?:number;migrations?:number;badDigest?:boolean;expect?:RegExp};
const business={db:'hugotravel_web_integration_test_20261125',role:'hotel_2141b_business',sentinel:'hugotravel-isolated-test-database-v1'};
const businessEnv={NODE_ENV:'test',DB_NAME:business.db,HOTEL_2141B_BUSINESS_PROFILE:'21.41-B',
    HOTEL_2141B_BUSINESS_UNTIL:new Date(Date.now()+30000).toISOString()};
const scenarios:Scenario[]=[
    {},
    {migrations:21},
    {migrations:21,badDigest:true,expect:/AGENT_COORDINATION_SOURCE_DIGEST_MISMATCH/},
    {migrations:22},
    {migrations:22,badDigest:true,expect:/HOTEL_LOCK_SOURCE_DIGEST_MISMATCH/},
    {migrations:23,expect:/HOTEL_PRODUCTION_SCHEMA_REQUIRED/},
    {env:businessEnv,identity:business},
    {env:{...businessEnv,DB_PORT:'15452'},identity:business,expect:/HOTEL_ISOLATED_RUNTIME_REQUIRED/},
    {env:{...businessEnv,HOTEL_2141B_BUSINESS_UNTIL:'2000-01-01'},identity:business,expect:/HOTEL_ISOLATED_RUNTIME_REQUIRED/},
    {env:{HOTEL_PRODUCTION_READ_APPROVED:'false'},expect:/HOTEL_ISOLATED_RUNTIME_REQUIRED/},
    {env:{HOTEL_STAY_BOOKING_ENABLED:'true'},expect:/HOTEL_ISOLATED_RUNTIME_REQUIRED/},
    {identity:{sentinel:'hugotravel-isolated-test-database-v1'},expect:/HOTEL_ISOLATED_RUNTIME_REQUIRED/},
    {identity:{rolbypassrls:true},expect:/HOTEL_ISOLATED_RUNTIME_REQUIRED/},
    {access:{readonly:'on',writable:true},expect:/HOTEL_PRODUCTION_READ_ONLY_REQUIRED/},
    {access:{readonly:'off',writable:false},expect:/HOTEL_PRODUCTION_READ_ONLY_REQUIRED/},
    {tables:59,migrations:19,expect:/HOTEL_PRODUCTION_SCHEMA_REQUIRED/},
    {badDigest:true,expect:/REVIEW_SCHEMA_SOURCE_DIGEST_MISMATCH/},
];

async function main(){
    const before=Object.fromEntries(Object.keys(fixed).map(k=>[k,process.env[k]]));
    try{
        for(const test of scenarios){
            Object.assign(process.env,fixed,test.env??{});
            const client={query:async(sql:string,bind?:[string])=>{
                if(sql.includes('pg_roles'))return {rows:[{...identity,...test.identity}]};
                if(sql.includes('default_transaction_read_only'))return {rows:[test.access??{readonly:'on',writable:false}]};
                if(sql.includes('count(*)'))return {rows:[{tables:test.tables??61,migrations:test.migrations??20}]};
                assert(bind?.[0]);
                const file=resolve(__dirname,'../../../database/migrations',bind[0]);
                return {rows:[{checksum:test.badDigest?'0'.repeat(64):createHash('sha256').update(readFileSync(file)).digest('hex')}]};
            }};
            if(test.expect)await assert.rejects(()=>assertHotelDatabase(client),test.expect);
            else await assertHotelDatabase(client);
        }
        assert.equal(reviewOutboxPruneLimit(undefined),100);
        for(const invalid of ['0','501','NaN','1.5',''])assert.throws(()=>reviewOutboxPruneLimit(invalid));
        assert.match(REVIEW_OUTBOX_PRUNE_SQL,/state='COMPLETED'.*processed_at < now\(\)-interval '90 days'.*LIMIT \$1 FOR UPDATE OF e SKIP LOCKED/);
        assert.match(REVIEW_OUTBOX_PRUNE_SQL,/processed_revision>=e\.place_revision/);
        assert.match(REVIEW_OUTBOX_PRUNE_SQL,/DELETE FROM review_processing_events/);
        console.log(JSON.stringify({scope:'OFFLINE_PRODUCTION_BOUNDARIES',passed:scenarios.length+1,total:scenarios.length+1}));
    }finally{
        for(const [key,value] of Object.entries(before)){
            if(value===undefined)delete process.env[key];
            else process.env[key]=value;
        }
    }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
