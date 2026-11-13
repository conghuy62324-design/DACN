// Generate secrets only for this named, separate local staging. Does not contact a DB or Docker.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),dir=path.join(root,'.local/catalog-staging');fs.mkdirSync(dir,{recursive:true});
if(fs.existsSync(path.join(dir,'config.json')))throw Error('Local config already exists; use it without replacing credentials');
const runtimePassword=crypto.randomBytes(24).toString('hex'),bootstrapPassword=crypto.randomBytes(24).toString('hex');
const config={DB_HOST:'127.0.0.1',DB_PORT:'15452',DB_NAME:'travelgo_staging_catalog_20261112',DB_USER:'catalog_runtime',DB_PASSWORD:runtimePassword,DB_SSL:'false',NODE_ENV:'test',PORT:'5057',JWT_SECRET:crypto.randomBytes(32).toString('hex'),APP_ORIGINS:'http://127.0.0.1:5177',CATALOG_DEMO_ENABLED:'true',CATALOG_DEMO_SENTINEL:'travelgo-public-staging:catalog-20261112',CATALOG_STAGING_WRITE_APPROVED:'true',AGENT_CORE_LLM_ENABLED:'false',LLM_LIVE_ENABLED:'false',LLM_USAGE_APPROVED:'false',PUBLIC_STAGING_WRITES_APPROVED:'false'};
config.CATALOG_METADATA_ENABLED='true';
fs.writeFileSync(path.join(dir,'config.json'),JSON.stringify(config,null,2),{flag:'wx'});
fs.writeFileSync(path.join(dir,'backend.env'),Object.entries(config).map(([k,v])=>`${k}=${v}`).join('\n')+'\n',{flag:'wx'});
fs.writeFileSync(path.join(dir,'compose.env'),`CATALOG_BOOTSTRAP_PASSWORD=${bootstrapPassword}\n`,{flag:'wx'});
fs.writeFileSync(path.join(dir,'init.sql'),`CREATE ROLE catalog_runtime LOGIN PASSWORD '${runtimePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;\nALTER DATABASE travelgo_staging_catalog_20261112 OWNER TO catalog_runtime;\nCOMMENT ON DATABASE travelgo_staging_catalog_20261112 IS 'travelgo-public-staging:catalog-20261112';\nCREATE EXTENSION IF NOT EXISTS postgis;\nALTER SCHEMA public OWNER TO catalog_runtime;\nREVOKE CREATE ON SCHEMA public FROM PUBLIC;\n`,{flag:'wx'});
console.log('Generated ignored credentials for dedicated staging 127.0.0.1:15452/travelgo_staging_catalog_20261112; no existing environment changed.');
