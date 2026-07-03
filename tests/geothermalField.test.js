// tests/geothermalField.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WELL_SEED, wellOutput, wellStatus, makeWells, stepField, fieldKpis, WELL_THRESHOLDS,
} from '../src/lib/geothermal/field.js';
import { RANGES } from '../src/lib/geothermal/wellpad.js';
import { SEED_TELEMETRY } from '../src/lib/geothermal/seed.js';

test('WELL_SEED has production and reinjection wells with unique ids', () => {
  const ids = WELL_SEED.map((w) => w.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(WELL_SEED.some((w) => w.type === 'production'));
  assert.ok(WELL_SEED.some((w) => w.type === 'reinjection'));
});

test('wellOutput anchors to seed telemetry', () => {
  const o = wellOutput(SEED_TELEMETRY);
  assert.equal(o.brineM3h, SEED_TELEMETRY.flowM3h);
  assert.ok(o.steamTh > 0 && o.mw > 0);
  assert.equal(o.mw, r2Ref(o.steamTh * 0.13));
});
function r2Ref(v) { return Math.round(v * 100) / 100; }

test('wellStatus is normal for nominal seed telemetry', () => {
  assert.equal(wellStatus(SEED_TELEMETRY), 'normal');
});

test('wellStatus escalates when heat-pipe pressure is high', () => {
  const hot = { ...SEED_TELEMETRY, heatPipePressure: WELL_THRESHOLDS.heatPipePressure.awas + 1 };
  assert.equal(wellStatus(hot), 'awas');
});

test('makeWells produces one Well per seed with derived output+status', () => {
  const wells = makeWells();
  assert.equal(wells.length, WELL_SEED.length);
  for (const w of wells) {
    assert.ok(w.telemetry && w.output && w.status);
    assert.equal(typeof w.output.mw, 'number');
  }
});

test('reinjection wells contribute no steam or MW', () => {
  const wells = makeWells();
  const ri = wells.find((w) => w.type === 'reinjection');
  assert.equal(ri.output.steamTh, 0);
  assert.equal(ri.output.mw, 0);
});

test('stepField keeps every well telemetry inside declared ranges', () => {
  let wells = makeWells();
  let draw = 0;
  const rnd = () => ((draw = (draw + 0.37) % 1), draw);
  for (let i = 0; i < 100; i++) {
    wells = stepField(wells, rnd);
    for (const w of wells) {
      for (const key of Object.keys(RANGES)) {
        assert.ok(w.telemetry[key] >= RANGES[key].min && w.telemetry[key] <= RANGES[key].max,
          `${w.id}.${key}=${w.telemetry[key]} out of range`);
      }
    }
  }
});

test('fieldKpis sums production output and reports availability', () => {
  const wells = makeWells();
  const k = fieldKpis(wells);
  const prodSteam = wells.filter((w) => w.type === 'production')
    .reduce((s, w) => s + w.output.steamTh, 0);
  assert.ok(Math.abs(k.steamTh - r2Ref(prodSteam)) < 1e-6);
  assert.equal(k.wellsTotal, wells.length);
  assert.ok(k.availability >= 0 && k.availability <= 100);
});
