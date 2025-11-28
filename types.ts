export type OperatingMode = 'standalone' | 'connected';

export interface MetronomeState {
  bpm: number;
  isPlaying: boolean;
  beat: number; // 1, 2, 3, 4
}

export interface TunerData {
  frequency: number;
  noteName: string;
  cents: number;
  isActive: boolean;
}

// Emulating the STM32 Communication Protocol
export enum BluetoothCommand {
  START_METRONOME = 'START_METRO',
  STOP_METRONOME = 'STOP_METRO',
  SET_BPM = 'SET_BPM',
  START_TUNER = 'START_TUNER',
  STOP_TUNER = 'STOP_TUNER'
}

export interface BluetoothService {
  connect: () => Promise<void>;
  disconnect: () => void;
  sendCommand: (cmd: string, value?: string | number) => Promise<void>;
  isConnected: () => boolean;
  onDataReceived: (callback: (data: string) => void) => void;
}
