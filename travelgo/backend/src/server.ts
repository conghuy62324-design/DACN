import app from './app.js';
import { ENV } from './config/env.js';
import { sequelize, testDbConnection } from './config/database.js';
import { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } from './utils/testDatabaseGuard.js';

const startServer = async () => {
  const testWritesEnabled = process.env.ALLOW_TEST_DB_WRITES === 'true';
  if (testWritesEnabled) assertTestDatabaseWriteOptIn('Write-enabled test server');

  // Test database connection (PostgreSQL / PostGIS)
  const connected = await testDbConnection();
  if (connected && testWritesEnabled) {
    await assertDatabaseSentinel(sequelize, 'Write-enabled test server');
  }
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
