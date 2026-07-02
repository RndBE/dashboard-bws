import type { Camera } from '../data/cameras';

export type GeoStatus = 'normal' | 'waspada' | 'siaga' | 'awas';

export interface Telemetry {
  wellPressure: number;
  heatPipePressure: number;
  temperature: number;
  level: number;
  flowLs: number;
  flowM3h: number;
  battery: number;
  solarV: number;
  batteryV: number;
  chargeA: number;
  vsatSignal: number;
  vsatLink: number;
  latency: number;
}

export interface Site { name: string; field: string; lat: number; lng: number; altitude: number; }
export interface Weather { temp: number; cond: string; wind: number; humidity: number; }
export interface Valve { id: string; open: boolean; }
export interface SensorTag { id: string; kind: 'pressure' | 'temp' | 'level'; }
export interface SystemRow { key: string; label: string; state: GeoStatus; value: string; }
export interface AlarmRow { time: string; label: string; status: 'active' | 'cleared'; }
export type GeoCamera = Camera;
