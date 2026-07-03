import test from 'node:test';
import assert from 'node:assert/strict';
import { MONITORED, evaluateAlarms, alarmStats } from '../src/lib/geothermal/alarms.js';
import { WELL_THRESHOLDS } from '../src/lib/geothermal/field.js';

function wellWith(id, over) {
  return { id, name: id, type: 'production', lat: 0, lng: 0,
    telemetry: { wellPressure: 124, heatPipePressure: 86, level: 0.42, ...over },
    output: { steamTh: 1, brineM3h: 1, mw: 1 }, status: 'normal' };
}

test('MONITORED covers the three thresholded tags', () => {
  assert.deepEqual(MONITORED.map((m) => m.tag).sort(),
    ['heatPipePressure', 'level', 'wellPressure']);
});

test('raises an active alarm when a tag breaches waspada', () => {
  const w = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
  const { alarms, nextId } = evaluateAlarms([w], [], 1000, 1);
  const a = alarms.find((x) => x.well === 'WP-01' && x.tag === 'wellPressure');
  assert.ok(a && a.status === 'active' && a.severity === 'waspada' && a.ack === false);
  assert.equal(nextId, 2);
});

test('does not duplicate an active alarm across ticks; updates severity in place', () => {
  const w1 = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
  const r1 = evaluateAlarms([w1], [], 1000, 1);
  const w2 = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.awas + 0.5 });
  const r2 = evaluateAlarms([w2], r1.alarms, 2000, r1.nextId);
  const active = r2.alarms.filter((x) => x.well === 'WP-01' && x.tag === 'wellPressure' && x.status === 'active');
  assert.equal(active.length, 1);
  assert.equal(active[0].severity, 'awas');
  assert.equal(active[0].id, r1.alarms[0].id); // same alarm, updated in place
});

test('clears an alarm when the tag returns to normal, preserving ack', () => {
  const hot = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
  const r1 = evaluateAlarms([hot], [], 1000, 1);
  r1.alarms[0].ack = true;
  const cool = wellWith('WP-01', {});
  const r2 = evaluateAlarms([cool], r1.alarms, 2000, r1.nextId);
  const a = r2.alarms.find((x) => x.id === r1.alarms[0].id);
  assert.equal(a.status, 'cleared');
  assert.equal(a.ack, true);
});

test('alarmStats counts active alarms by severity', () => {
  const wells = [
    wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.awas + 0.5 }),
    wellWith('WP-02', { heatPipePressure: WELL_THRESHOLDS.heatPipePressure.waspada + 0.5 }),
  ];
  const { alarms } = evaluateAlarms(wells, [], 1000, 1);
  const s = alarmStats(alarms);
  assert.equal(s.active, 2);
  assert.equal(s.bySeverity.awas, 1);
  assert.equal(s.bySeverity.waspada, 1);
});
