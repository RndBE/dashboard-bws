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

test('F1: a shelved alarm whose tag is still breaching is updated in place, not re-raised', () => {
  const hot = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
  const r1 = evaluateAlarms([hot], [], 1000, 1);
  // Operator shelves the alarm (simulating store.shelveAlarm).
  r1.alarms[0].status = 'shelved';
  const stillHot = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.siaga + 0.5 });
  const r2 = evaluateAlarms([stillHot], r1.alarms, 2000, r1.nextId);
  const matches = r2.alarms.filter((x) => x.well === 'WP-01' && x.tag === 'wellPressure');
  assert.equal(matches.length, 1, 'exactly one alarm for this (well,tag)');
  assert.equal(matches[0].status, 'shelved', 'stays shelved while breaching');
  assert.equal(matches[0].id, r1.alarms[0].id, 'same alarm, no new one pushed');
  assert.equal(matches[0].severity, 'siaga', 'severity updated in place');
  assert.equal(r2.nextId, r1.nextId, 'no new id consumed');
});

test('F1: a shelved alarm whose tag returns to normal becomes cleared', () => {
  const hot = wellWith('WP-01', { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
  const r1 = evaluateAlarms([hot], [], 1000, 1);
  r1.alarms[0].status = 'shelved';
  const cool = wellWith('WP-01', {});
  const r2 = evaluateAlarms([cool], r1.alarms, 2000, r1.nextId);
  const a = r2.alarms.find((x) => x.id === r1.alarms[0].id);
  assert.equal(a.status, 'cleared');
});

test('F2: evaluateAlarms prunes cleared alarms to the most-recent 40, keeping all open alarms', () => {
  let alarms = [];
  let nextId = 1;
  // Drive many breach/clear cycles on distinct wells to accumulate >40 cleared alarms.
  for (let i = 0; i < 50; i++) {
    const id = `WP-${i}`;
    const hot = wellWith(id, { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
    const r1 = evaluateAlarms([hot], alarms, 1000 + i * 10, nextId);
    const cool = wellWith(id, {});
    const r2 = evaluateAlarms([cool], r1.alarms, 1000 + i * 10 + 5, r1.nextId);
    alarms = r2.alarms;
    nextId = r2.nextId;
  }
  // Keep one still-open alarm to verify open alarms are never pruned.
  const openWell = wellWith('WP-OPEN', { wellPressure: WELL_THRESHOLDS.wellPressure.waspada + 0.5 });
  const rOpen = evaluateAlarms([openWell], alarms, 5000, nextId);
  alarms = rOpen.alarms;

  const cleared = alarms.filter((a) => a.status === 'cleared');
  const open = alarms.filter((a) => a.status === 'active' || a.status === 'shelved');
  assert.ok(cleared.length <= 40, `expected <=40 cleared alarms, got ${cleared.length}`);
  assert.equal(open.length, 1, 'the still-open alarm must be preserved');
});
