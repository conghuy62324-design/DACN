const express = require('express');
const { schema, sequelize } = require('./t13b01-support.cjs');
const app = require('../dist/app.js').default;
(async () => {
  const identity = await schema(); const wrapper = express();
  wrapper.get('/api/__t13b01/identity', (_req, res) => res.json({ runId: process.env.T13B01_RUN_ID, pid: process.pid, port: Number(process.env.PORT), ...identity }));
  wrapper.use(app);
  const server = wrapper.listen(Number(process.env.PORT), '127.0.0.1', () => console.log(JSON.stringify({ ready: true, pid: process.pid, port: process.env.PORT, database: identity.database })));
  for (const signal of ['SIGTERM','SIGINT']) process.on(signal, () => server.close(async () => { await sequelize.close(); process.exit(0); }));
})().catch(e => { console.error(e.message); process.exitCode = 1; });
