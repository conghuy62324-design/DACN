import {stopTravelWebWorker} from './services/travelWebWorker.js';
import app from './app.js';
import { ENV } from './config/env.js';
import { sequelize, testDbConnection } from './config/database.js';
import { assertDatabaseSentinel, assertTestDatabaseWriteOptIn } from './utils/testDatabaseGuard.js';
import { closeAgentSharedState } from './agent/requestLimits.js';

const startServer = async () => {
  const testWritesEnabled = process.env.ALLOW_TEST_DB_WRITES === 'true';
  if (testWritesEnabled) assertTestDatabaseWriteOptIn('Write-enabled test server');

  // Test database connection (PostgreSQL / PostGIS)
  const connected = await testDbConnection();
  if (connected && testWritesEnabled) {
    await assertDatabaseSentinel(sequelize, 'Write-enabled test server');
  }
  if (!connected) throw new Error('PostgreSQL không khả dụng');

  const privateProxy=ENV.NODE_ENV==='production'&&process.env.TRAVELGO_PRIVATE_PROXY_ENABLED==='true';
  const bindHost=process.env.HOTEL_DOMAIN_ENABLED==='true'&&!privateProxy?'127.0.0.1':'0.0.0.0';
  const server = app.listen(ENV.PORT, bindHost, () => {
    console.log(`=======================================================`);
    console.log(`🚀 HuGo Travel API Server đang chạy tại: http://localhost:${ENV.PORT}`);
    console.log(`📡 Health Check: http://localhost:${ENV.PORT}/api/health`);
    console.log(`🗺️ Danh sách địa điểm: http://localhost:${ENV.PORT}/api/places`);
    console.log(`⭐ Thuật toán Bayesian Average: Đang hoạt động (m=${ENV.BAYESIAN_MIN_REVIEWS}, C=${ENV.BAYESIAN_MEAN_PRIOR})`);
    console.log(`=======================================================`);
  });

  let stopping=false;
  const stop=()=>{
    if(stopping)return;
    stopping=true;
    stopTravelWebWorker();
    console.log(JSON.stringify({event:'API_DRAIN_STARTED'}));
    const timer=setTimeout(()=>server.closeAllConnections(),25000);
    timer.unref();
    server.close(async error => {
      clearTimeout(timer);
      try{
        await Promise.all([sequelize.close(),closeAgentSharedState()]);
        console.log(JSON.stringify({event:'API_DRAIN_COMPLETED',ok:!error}));
        if(error)process.exitCode=1;
      }catch{
        console.error(JSON.stringify({event:'API_DRAIN_FAILED'}));
        process.exitCode=1;
      }
    });
  };
  process.on('SIGTERM',stop);
  process.on('SIGINT',stop);
};

startServer().catch((err) => {
  console.error('Lỗi khi khởi động HuGo Travel server:', err);
  process.exitCode = 1;
});
