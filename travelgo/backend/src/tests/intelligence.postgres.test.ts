import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import app from '../app.js';
import { sequelize } from '../config/database.js';
import { UserEvent } from '../models/index.js';
import { assertIsolatedTestDatabase } from '../utils/testDatabaseGuard.js';

async function main(): Promise<void> {
  assertIsolatedTestDatabase('HuGo Intelligence PostgreSQL integration test');
  await sequelize.authenticate();
  const server = await new Promise<Server>((resolve) => {
    const listening = app.listen(0, '127.0.0.1', () => resolve(listening));
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Unable to determine integration test port');
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const api = async (route: string, body: object, token?: string) => {
    const response = await fetch(`${baseUrl}${route}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  };

  try {
    const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const registered = await api('/api/auth/register', {
      email: `intelligence.${suffix}@example.test`,
      fullName: 'HuGo Intelligence Test',
      password: 'Intelligence2026!',
      phone: '0901234567',
    });
    assert.equal(registered.status, 201, JSON.stringify(registered.body));
    const userId = registered.body.data.user.id as string;
    const token = registered.body.data.token as string;

    const anonymous = await api('/api/intelligence/events', {
      sessionId: `anonymous-${suffix}`, itemId: 'discovery-da-nang', itemType: 'place',
      eventType: 'VIEW', source: 'integration_test', userId, context: { position: 1 },
    });
    assert.equal(anonymous.status, 202, JSON.stringify(anonymous.body));

    const authenticated = await api('/api/intelligence/events', {
      sessionId: `authenticated-${suffix}`, itemId: 'discovery-da-nang', itemType: 'place',
      eventType: 'CLICK', source: 'integration_test', userId: '00000000-0000-4000-8000-000000000000',
      context: { position: 1 },
    }, token);
    assert.equal(authenticated.status, 202, JSON.stringify(authenticated.body));

    const invalid = await api('/api/intelligence/events', {
      sessionId: `invalid-${suffix}`, itemId: 'x', itemType: 'place', eventType: 'ADMIN_GRANTED',
    });
    assert.equal(invalid.status, 400, JSON.stringify(invalid.body));

    const anonymousRow = await UserEvent.findByPk(anonymous.body.data.id);
    const authenticatedRow = await UserEvent.findByPk(authenticated.body.data.id);
    assert.equal(anonymousRow?.userId, null, 'Anonymous event must not accept body userId');
    assert.equal(authenticatedRow?.userId, userId, 'Authenticated event must use token identity');
    assert.deepEqual(authenticatedRow?.context, { position: 1 });

    console.log(JSON.stringify({ result: 'PASS', checks: 7, anonymousStatus: 202, authenticatedStatus: 202, invalidStatus: 400 }, null, 2));
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await sequelize.close();
  }
}

main().catch((error) => {
  console.error('HuGo Intelligence integration test failed:', error);
  process.exitCode = 1;
});
