import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  DB_USER: process.env.DB_USER || 'postgres',
  DB_PASSWORD: process.env.DB_PASSWORD || 'postgres',
  DB_NAME: process.env.DB_NAME || 'travelgo_db',
  APP_ORIGINS: (process.env.APP_ORIGINS || 'http://localhost:5173').split(',').map((origin) => origin.trim()),
  JWT_SECRET: process.env.JWT_SECRET || 'development-only-change-me',
  JWT_EXPIRES_SECONDS: process.env.JWT_EXPIRES_SECONDS
    ? parseInt(process.env.JWT_EXPIRES_SECONDS, 10)
    : 60 * 60 * 8,
  BAYESIAN_MIN_REVIEWS: 10,
  BAYESIAN_MEAN_PRIOR: 4.20,
};

if (ENV.NODE_ENV === 'production' && ENV.JWT_SECRET === 'development-only-change-me') {
  throw new Error('JWT_SECRET bắt buộc phải được cấu hình trong môi trường production');
}
