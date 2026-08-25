/**
 * Hardware-agnostic domain interfaces.
 * PZEM-004T and a future RS485 meter both implement EnergyMeter.
 */

export interface EnergyMeterReading {
  voltage?: number;
  current?: number;
  power?: number;
  energy_kwh?: number;
  frequency?: number;
  power_factor?: number;
}

export interface WaterMeterReading {
  flow_lpm?: number;
  volume_liters?: number;
}

export interface EnvironmentReading {
  temperature_c?: number;
  humidity_pct?: number;
}

export interface MotionReading {
  motion: boolean;
}

export interface LightingState {
  on: boolean;
  brightness?: number;
}

export interface EnergyMeter {
  read(): Promise<EnergyMeterReading>;
}

export interface WaterMeter {
  read(): Promise<WaterMeterReading>;
}

export interface EnvironmentSensor {
  read(): Promise<EnvironmentReading>;
}

export interface MotionSensor {
  read(): Promise<MotionReading>;
}

export interface LightingController {
  getState(): Promise<LightingState>;
  setOn(on: boolean): Promise<void>;
  setBrightness?(percent: number): Promise<void>;
}
