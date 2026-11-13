import assert from 'node:assert/strict';
import {
  BALANCED_PACING_DESCRIPTION,
  PLANNER_TRANSPORT_OPTIONS,
  initialPlannerModes,
  validatePlannerModes,
} from '../src/utils/plannerModes.ts';

let checks = 0;
const check = (name: string, run: () => void) => {
  run(); checks++; console.log(`PASS ${name}`);
};

check('new form defaults only missing fields to balanced/car', () => {
  assert.deepEqual(initialPlannerModes(undefined), { pacing: 'balanced', transportation: 'car' });
  assert.deepEqual(initialPlannerModes({ destinationCity: 'Đà Nẵng' }), { pacing: 'balanced', transportation: 'car' });
  assert.deepEqual(validatePlannerModes('balanced', 'car'), { valid: true, pacing: 'balanced', transportation: 'car' });
  assert.deepEqual(validatePlannerModes('balanced', 'motorbike'), { valid: true, pacing: 'balanced', transportation: 'motorbike' });
});
check('visible transport options are only car/motorbike and balanced label excludes meals', () => {
  assert.deepEqual(PLANNER_TRANSPORT_OPTIONS.map((option) => option.value), ['car', 'motorbike']);
  assert.match(BALANCED_PACING_DESCRIPTION, /Tối đa 2 điểm tham quan\/ngày/);
  assert.match(BALANCED_PACING_DESCRIPTION, /không tính bữa ăn/);
  assert.doesNotMatch(BALANCED_PACING_DESCRIPTION, /[34]\+|2-3|2–3/);
});
check('legacy relaxed/flight values remain unchanged and require explicit reselection', () => {
  const legacy = Object.freeze({ pacing: 'relaxed', transportation: 'flight' });
  const selection = initialPlannerModes(legacy);
  assert.deepEqual(selection, legacy);
  const invalid = validatePlannerModes(selection.pacing, selection.transportation);
  assert.equal(invalid.valid, false);
  if (invalid.valid === false) assert.match(invalid.message, /Hãy chọn/);
  assert.equal(validatePlannerModes('balanced', selection.transportation).valid, false);
  assert.equal(validatePlannerModes('balanced', 'motorbike').valid, true);
  assert.deepEqual(legacy, { pacing: 'relaxed', transportation: 'flight' });
});
check('packed/train and malformed explicit values never silently receive defaults', () => {
  for (const source of [
    { pacing: 'packed', transportation: 'train' },
    { pacing: null, transportation: '' },
    { pacing: false, transportation: {} },
  ]) {
    assert.deepEqual(initialPlannerModes(source), source);
    assert.equal(validatePlannerModes(source.pacing, source.transportation).valid, false);
  }
});
check('supported values from an existing template are retained', () => {
  const source = { pacing: 'balanced', transportation: 'motorbike', priceVND: 3_000_000 };
  assert.deepEqual(initialPlannerModes(source), { pacing: 'balanced', transportation: 'motorbike' });
  assert.equal(validatePlannerModes(source.pacing, source.transportation).valid, true);
});
check('unsupported transport warning explains local estimates and unpriced intercity travel', () => {
  const selection = validatePlannerModes('balanced', 'train');
  assert.equal(selection.valid, false);
  if (selection.valid === false) {
    assert.match(selection.message, /Ô tô hoặc Xe máy/);
    assert.match(selection.message, /chưa tính chặng và chi phí liên tỉnh/);
  }
});
console.log(JSON.stringify({ suite: 'planner-mode-ui', result: 'PASS', checks }));
