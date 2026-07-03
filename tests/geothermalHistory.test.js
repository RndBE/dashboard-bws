import test from 'node:test';
import assert from 'node:assert/strict';
import { HISTORY_TAGS, seedWellHistory, appendHistory, aggregate, queryHistory } from '../src/lib/geothermal/history.js';

function wells() {
  return [
    { id: 'WP-01', telemetry: { wellPressure: 124, heatPipePressure: 86, temperature: 192, level: 0.42, flowM3h: 84, flowLs: 23 } },
    { id: 'RI-01', telemetry: { wellPressure: 112, heatPipePressure: 78, temperature: 178, level: 0.42, flowM3h: 84, flowLs: 23 } },
  ];
}

test('seedWellHistory fills every well and tag with N points', () => {
  const b = seedWellHistory(wells(), 100000, 10, 5000);
  assert.deepEqual(Object.keys(b).sort(), ['RI-01', 'WP-01']);
  for (const tag of HISTORY_TAGS) assert.equal(b['WP-01'][tag].length, 10);
  const last = b['WP-01'].wellPressure.at(-1);
  assert.equal(last.t, 100000);
  assert.equal(last.v, 124);
});

test('appendHistory pushes one point per well/tag and caps length', () => {
  let b = seedWellHistory(wells(), 0, 3, 5000);
  b = appendHistory(b, wells(), 5000, 3);
  assert.equal(b['WP-01'].wellPressure.length, 3); // capped
  assert.equal(b['WP-01'].wellPressure.at(-1).t, 5000);
});

test('appendHistory does not mutate the input buffers', () => {
  const b0 = seedWellHistory(wells(), 0, 2, 5000);
  const beforeLen = b0['WP-01'].wellPressure.length;
  appendHistory(b0, wells(), 5000, 10);
  assert.equal(b0['WP-01'].wellPressure.length, beforeLen);
});

test('aggregate computes avg/min/max/last', () => {
  const pts = [{ t: 1, v: 10 }, { t: 2, v: 20 }, { t: 3, v: 30 }];
  assert.equal(aggregate(pts, 'avg'), 20);
  assert.equal(aggregate(pts, 'min'), 10);
  assert.equal(aggregate(pts, 'max'), 30);
  assert.equal(aggregate(pts, 'last'), 30);
  assert.equal(aggregate([], 'avg'), 0);
});

test('queryHistory filters by time window and unknown ids yield []', () => {
  const b = seedWellHistory(wells(), 10000, 5, 1000); // t: 6000..10000
  const q = queryHistory(b, 'WP-01', 'wellPressure', 8000, 10000);
  assert.ok(q.every((p) => p.t >= 8000 && p.t <= 10000));
  assert.deepEqual(queryHistory(b, 'NOPE', 'wellPressure', 0, 1e12), []);
});
