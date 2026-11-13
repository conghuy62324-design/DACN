import { Sequelize } from 'sequelize';
import { ENV } from './env.js';

export const sequelize = new Sequelize(ENV.DB_NAME, ENV.DB_USER, ENV.DB_PASSWORD, {
  host: ENV.DB_HOST,
  port: ENV.DB_PORT,
  dialect: 'postgres',
  logging: ENV.NODE_ENV === 'development' ? false : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    // Optional SSL if connecting to cloud PostgreSQL
    ssl: process.env.DB_SSL === 'true' ? { require: true, rejectUnauthorized: false } : false,
  },
});

// DEMO remains opt-in for one local target; verify physical identity on every connection.
if(process.env.CATALOG_DEMO_ENABLED==='true')sequelize.addHook('afterConnect',async(client:any)=>{
 if(ENV.NODE_ENV==='production'||ENV.DB_HOST!=='127.0.0.1'||ENV.DB_PORT!==15452||ENV.DB_NAME!=='travelgo_staging_catalog_20261112'||ENV.DB_USER!=='catalog_runtime'||process.env.CATALOG_METADATA_ENABLED!=='true')throw Error('DEMO_TARGET_NOT_APPROVED');
 const row=(await client.query("SELECT current_database() AS db,current_user AS role,r.rolsuper,r.rolcreatedb,r.rolcreaterole,shobj_description(d.oid,'pg_database') AS sentinel FROM pg_database d JOIN pg_roles r ON r.rolname=current_user WHERE d.datname=current_database()")).rows[0];
 if(row.db!==ENV.DB_NAME||row.role!==ENV.DB_USER||row.rolsuper||row.rolcreatedb||row.rolcreaterole||row.sentinel!=='travelgo-public-staging:catalog-20261112'||row.sentinel!==process.env.CATALOG_DEMO_SENTINEL)throw Error('DEMO_DATABASE_IDENTITY_MISMATCH');
});

export const testDbConnection = async (): Promise<boolean> => {
  try {
    await sequelize.authenticate();
    console.log('✅ Kết nối PostgreSQL/PostGIS thành công!');
    return true;
  } catch (error) {
    console.error('❌ Không thể kết nối PostgreSQL; backend sẽ không khởi động để tránh trả dữ liệu giả:', (error as Error).message);
    return false;
  }
};
