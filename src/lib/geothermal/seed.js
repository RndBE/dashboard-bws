import { weirFlowLs, lsToM3h, r2 } from './wellpad.js';

const level0 = 0.423;
const flowLs0 = r2(weirFlowLs(level0));

export const SEED_TELEMETRY = {
  wellPressure: 124.6,
  heatPipePressure: 86.3,
  temperature: 192.4,
  level: level0,
  flowLs: flowLs0,
  flowM3h: r2(lsToM3h(flowLs0)),
  battery: 78,
  solarV: 54.2,
  batteryV: 48.6,
  chargeA: 8.7,
  vsatSignal: -48,
  vsatLink: 98,
  latency: 620,
};

export const SITE = { name: 'WELL PAD-01', field: 'Geothermal', lat: -7.25, lng: 109.1, altitude: 1250 };
export const WEATHER = { temp: 22.6, cond: 'Light Rain', wind: 12, humidity: 89 };

export const VALVES = [
  { id: 'XV-101', open: true },
  { id: 'XV-102', open: true },
];

export const SENSOR_TAGS = [
  { id: 'PT-101', kind: 'pressure' },
  { id: 'PT-102', kind: 'pressure' },
  { id: 'TT-101', kind: 'temp' },
  { id: 'LT-201', kind: 'level' },
];

export const SYSTEM_ROWS = [
  { key: 'rtu', label: 'RTU / PLC', state: 'normal', value: 'Normal' },
  { key: 'sensors', label: 'All Sensors', state: 'normal', value: 'Normal' },
  { key: 'logging', label: 'Data Logging', state: 'normal', value: 'Normal' },
  { key: 'vsat', label: 'VSAT Connection', state: 'normal', value: 'Connected' },
  { key: 'solar', label: 'Solar System', state: 'normal', value: 'Normal' },
  { key: 'cctv', label: 'CCTV System', state: 'normal', value: 'Normal' },
];

/** @type {import('../data/cameras').Camera[]} */
export const GEO_CAMERAS = [
  { id: 'cam-geo-wellpad', name: 'CAM 1 — Well Pad Overview', area: 'WELL PAD-01', group: 'geothermal', online: true },
  { id: 'cam-geo-separator', name: 'CAM 2 — Separator Area', area: 'WELL PAD-01', group: 'geothermal', online: true },
  { id: 'cam-geo-vnotch', name: 'CAM 3 — V-Notch Channel', area: 'WELL PAD-01', group: 'geothermal', online: true },
  { id: 'cam-geo-solar', name: 'CAM 4 — Solar Panel Area', area: 'WELL PAD-01', group: 'geothermal', online: true },
];

export const SEED_ALARMS = [
  { time: '10:22:15', label: 'High Heat Pipe Pressure', status: 'active' },
  { time: '10:18:47', label: 'High Water Level', status: 'active' },
  { time: '09:45:11', label: 'VSAT Signal Loss', status: 'cleared' },
  { time: '09:12:03', label: 'Low Battery Voltage', status: 'cleared' },
];
