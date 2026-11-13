// Dedicated loopback test wrapper. All /api application handlers are unchanged.
const express = require('express');
const { schema, sequelize } = require('./t13a-support.cjs');
const app = require('../dist/app.js').default;
async function main() {
  const identity = await schema();
  const wrapper = express();
  wrapper.get('/api/__t13a/identity', async (_req, res) => {
    const [rows] = await sequelize.query('SELECT current_database() AS database, current_user AS username');
    res.json({ runId: process.env.T13A_RUN_ID, pid: process.pid, port: Number(process.env.PORT), nodeEnv: process.env.NODE_ENV, host: process.env.DB_HOST, ...rows[0], sentinel: identity.sentinel });
  });
  wrapper.use(app);
  const server = wrapper.listen(Number(process.env.PORT), '127.0.0.1', () => console.log(JSON.stringify({ t13aServer: 'READY', ...identity, pid: process.pid, port: process.env.PORT })));
  for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(async () => { await sequelize.close(); process.exit(0); }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
