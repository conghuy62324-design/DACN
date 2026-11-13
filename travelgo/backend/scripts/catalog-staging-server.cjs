// Explicit isolated launcher; never reads or changes the website's default .env.
const {root,path,config,assert}=require('./catalog-staging-common.cjs');
const {sequelize}=require(path.join(root,'backend/dist/config/database.js'));
const app=require(path.join(root,'backend/dist/app.js')).default;
(async()=>{await sequelize.authenticate();const [rows]=await sequelize.query('SELECT count(*)::int AS n FROM schema_migrations');assert.equal(rows[0].n,13);const server=app.listen(+config.PORT,'127.0.0.1',()=>console.log('Isolated catalog staging API: http://127.0.0.1:'+config.PORT));const close=()=>server.close(()=>sequelize.close().then(()=>process.exit(0)));process.on('SIGINT',close);process.on('SIGTERM',close);})().catch(e=>{console.error(e.message);process.exitCode=1;});
