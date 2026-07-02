import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WEIR_H0, WEIR_Q0, weirFlowLs, lsToM3h, r2, clamp, nudge, RANGES,
  stepTelemetry, worstStatus, sensorState, activeAlarmCount,
} from '../src/lib/geothermal/wellpad.js';
import { SEED_TELEMETRY } from '../src/lib/geothermal/seed.js';

test('weir flow hits the mockup anchor exactly', () => {
  assert.ok(Math.abs(weirFlowLs(WEIR_H0) - WEIR_Q0) < 1e-9);
});

test('weir flow is monotonic in head', () => {
  assert.ok(weirFlowLs(0.5) > weirFlowLs(0.4));
});

test('L/s to m3/h uses the 3.6 factor and matches the mockup', () => {
  assert.equal(r2(lsToM3h(23.48)), 84.53);
});

test('clamp bounds values', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(clamp(2, 0, 3), 2);
});

test('nudge stays within [min,max] for any rng draw', () => {
  for (const draw of [0, 0.5, 1]) {
    const v = nudge(10, 5, 0, 12, undefined, () => draw);
    assert.ok(v >= 0 && v <= 12);
  }
});

test('stepTelemetry keeps every field inside its declared range', () => {
  let t = {
    wellPressure: 124.6, heatPipePressure: 86.3, temperature: 192.4,
    level: 0.423, flowLs: 23.48, flowM3h: 84.53,
    battery: 78, solarV: 54.2, batteryV: 48.6, chargeA: 8.7,
    vsatSignal: -48, vsatLink: 98, latency: 620,
  };
  let draw = 0;
  const rnd = () => ((draw = (draw + 0.37) % 1), draw); // deterministic spread
  for (let i = 0; i < 200; i++) {
    t = stepTelemetry(t, rnd);
    for (const key of Object.keys(RANGES)) {
      assert.ok(t[key] >= RANGES[key].min && t[key] <= RANGES[key].max, `${key}=${t[key]} out of range`);
    }
    // flow stays coupled to level
    assert.ok(Math.abs(t.flowM3h - r2(lsToM3h(t.flowLs))) < 1e-6);
  }
});

test('worstStatus picks the most severe', () => {
  assert.equal(worstStatus(['normal', 'siaga', 'waspada']), 'siaga');
  assert.equal(worstStatus(['normal', 'normal']), 'normal');
});

test('sensorState escalates on rising thresholds', () => {
  const th = { waspada: 90, siaga: 100, awas: 110 };
  assert.equal(sensorState(80, th), 'normal');
  assert.equal(sensorState(95, th), 'waspada');
  assert.equal(sensorState(105, th), 'siaga');
  assert.equal(sensorState(120, th), 'awas');
});

test('activeAlarmCount counts only active rows', () => {
  assert.equal(activeAlarmCount([
    { status: 'active' }, { status: 'cleared' }, { status: 'active' },
  ]), 2);
});

test('seed flow is consistent with seed level via the weir', () => {
  assert.equal(SEED_TELEMETRY.flowLs, r2(weirFlowLs(SEED_TELEMETRY.level)));
  assert.equal(SEED_TELEMETRY.flowM3h, r2(lsToM3h(SEED_TELEMETRY.flowLs)));
});
