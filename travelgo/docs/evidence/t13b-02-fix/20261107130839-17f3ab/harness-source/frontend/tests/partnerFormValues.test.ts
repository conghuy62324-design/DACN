import assert from 'node:assert/strict';
import { formValue, toLocalDateTime, serializeDateTime } from '../src/utils/partnerFormValues.ts';

assert.equal(formValue(0), 0);
assert.equal(formValue(null), '');
assert.equal(formValue(undefined), '');
assert.equal(formValue(''), '');
assert.equal(formValue(123456), 123456);
assert.equal(toLocalDateTime(null), '');
assert.equal(toLocalDateTime(undefined), '');
const instant = '2030-06-15T03:30:47.123Z';
assert.equal(toLocalDateTime(instant), '2030-06-15T10:30');
assert.equal(serializeDateTime('2030-06-15T10:30', instant), instant);
assert.equal(serializeDateTime('2030-06-15T11:45', instant), '2030-06-15T04:45:00.000Z');
assert.equal(serializeDateTime('2030-06-16T00:15'), '2030-06-15T17:15:00.000Z');
assert.equal(serializeDateTime('', null), null);
assert.equal(serializeDateTime('', undefined), undefined);
assert.equal(serializeDateTime('', instant), '');
console.log('PASS: zero/null/absent, UTC to local, unchanged sub-minute precision, deliberate local edit, midnight and optional clearing');
