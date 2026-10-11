import app from './app.js';
import { ENV } from './config/env.js';
import { testDbConnection } from './config/database.js';

const startServer = async () => {
  // Test database connection (PostgreSQL / PostGIS)
  const connected = await testDbConnection();
  if (!connected) throw new Error('PostgreSQL không khả dụng');

  const server = app.listen(ENV.PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 HuGo Travel API Server đang chạy tại: http://localhost:${ENV.PORT}`);
    console.log(`📡 Health Check: http://localhost:${ENV.PORT}/api/health`);
    console.log(`🗺️ Danh sách địa điểm: http://localhost:${ENV.PORT}/api/places`);
    console.log(`⭐ Thuật toán Bayesian Average: Đang hoạt động (m=${ENV.BAYESIAN_MIN_REVIEWS}, C=${ENV.BAYESIAN_MEAN_PRIOR})`);
    console.log(`=======================================================`);
  });

  process.on('SIGTERM', () => {
    console.log('Đang dừng server an toàn...');
    server.close(() => {
      console.log('Server đã dừng.');
      process.exit(0);
    });
  });
};

startServer().catch((err) => {
  console.error('Lỗi khi khởi động HuGo Travel server:', err);
  process.exitCode = 1;
});
