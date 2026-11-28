import assert from 'node:assert/strict';
import {test} from 'node:test';
import type {Transaction} from 'sequelize';
import {authorizeHotelLock, signHotelLock} from '../hotels/referenceLocks.js';
import {HttpError} from '../utils/httpError.js';

const key = Buffer.alloc(32, 7);
const actor = '2c840c54-1933-4c93-8358-4e706a9eb8d0';
const other = 'cfd1bdfa-f7ea-42d1-afe9-ff0e50006061';
const target = '2138c000-0000-4000-8000-000000000020';
const binding = {xid: '110', pid: 4, expiry: '12345678'};

test('hotel capability binds purpose, actor, target, session version, and database transaction', () => {
    const sign = signHotelLock.bind(null, key);
    const original = sign('confirm_customer', actor, target, 3, binding);
    assert.equal(original.length, 32);
    assert.deepEqual(sign('confirm_customer', actor.toUpperCase(), target, 3, binding), original);
    for (const changed of [
        sign('published_hotel', actor, target, 3, binding),
        sign('confirm_customer', other, target, 3, binding),
        sign('confirm_customer', actor, other, 3, binding),
        sign('confirm_customer', actor, target, 4, binding),
        sign('confirm_customer', actor, target, 3, {...binding, xid: '111'}),
        sign('confirm_customer', actor, target, 3, {...binding, pid: 5}),
        sign('confirm_customer', actor, target, 3, {...binding, expiry: '12345679'}),
    ]) assert.notDeepEqual(changed, original);
});

test('hotel capability uses the caller transaction and fails closed', async () => {
    const prior = process.env.HOTEL_REFERENCE_LOCK_KEY_HEX;
    const transaction = {} as Transaction;
    const calls: string[] = [];
    let allowed = true;
    const db: NonNullable<Parameters<typeof authorizeHotelLock>[5]> = async (sql, bind, received) => {
        assert.equal(received, transaction);
        calls.push(sql);
        if (sql.includes('pg_current_xact_id')) return [binding];
        assert.match(sql, /hotel_lock\.authorize/);
        assert.deepEqual(bind, [
            'confirm_customer', actor, target, 3, binding.expiry,
            signHotelLock(key, 'confirm_customer', actor, target, 3, binding),
        ]);
        return [{allowed}];
    };
    try {
        delete process.env.HOTEL_REFERENCE_LOCK_KEY_HEX;
        await assert.rejects(authorizeHotelLock('confirm_customer', actor, target, undefined, transaction, db),
            (error: HttpError) => error.code === 'HOTEL_AUTH_VERSION_REQUIRED');
        await assert.rejects(authorizeHotelLock('confirm_customer', actor, target, 3, transaction, db),
            (error: HttpError) => error.statusCode === 503);
        assert.deepEqual(calls, []);
        process.env.HOTEL_REFERENCE_LOCK_KEY_HEX = key.toString('hex');
        await authorizeHotelLock('confirm_customer', actor, target, 3, transaction, db);
        assert.equal(calls.length, 2);
        allowed = false;
        await assert.rejects(authorizeHotelLock('confirm_customer', actor, target, 3, transaction, db),
            (error: HttpError) => error.code === 'HOTEL_REFERENCE_LOCK_DENIED');
    } finally {
        if (prior === undefined) delete process.env.HOTEL_REFERENCE_LOCK_KEY_HEX;
        else process.env.HOTEL_REFERENCE_LOCK_KEY_HEX = prior;
    }
});
