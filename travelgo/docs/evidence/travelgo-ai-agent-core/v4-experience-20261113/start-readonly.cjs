const {root,path,fs,config,assert}=require('../../../../backend/scripts/catalog-staging-common.cjs');
Object.assign(process.env,{PGOPTIONS:'-c default_transaction_read_only=on',AGENT_CORE_LLM_ENABLED:'false',LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false',PUBLIC_STAGING_WRITES_APPROVED:'false',ALLOW_TEST_DB_WRITES:'false'});
const pg=require(path.join(root,'backend/node_modules/pg'));pg.defaults.options=process.env.PGOPTIONS;
const original=pg.Client.prototype.connect;pg.Client.prototype.connect=function(...args){assert.equal(this.connectionParameters.host,'127.0.0.1');assert.equal(+this.connectionParameters.port,15452);assert.equal(this.connectionParameters.database,config.DB_NAME);assert.equal(this.connectionParameters.options,process.env.PGOPTIONS);return original.apply(this,args);};
const {sequelize}=require(path.join(root,'backend/dist/config/database.js'));sequelize.addHook('afterConnect',async client=>{assert.equal((await client.query('SHOW default_transaction_read_only')).rows[0].default_transaction_read_only,'on');});
require(path.join(root,'backend/scripts/catalog-staging-server.cjs'));
