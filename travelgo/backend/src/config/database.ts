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
