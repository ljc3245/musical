import { BluetoothCommand } from '../types';

// Standard UART Service UUIDs (often used in DIY STM32 BLE projects)
const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e'; 
const CHAR_RX_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e'; // Write to device
const CHAR_TX_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // Notify from device

// --- Web Bluetooth Type Definitions ---
interface BluetoothCharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}

interface BluetoothRemoteGATTDescriptor {
  characteristic: BluetoothRemoteGATTCharacteristic;
  uuid: string;
  value?: DataView;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  service: BluetoothRemoteGATTService;
  uuid: string;
  properties: BluetoothCharacteristicProperties;
  value?: DataView;
  getDescriptor(descriptor: string | number): Promise<BluetoothRemoteGATTDescriptor>;
  getDescriptors(descriptor?: string | number): Promise<BluetoothRemoteGATTDescriptor[]>;
  readValue(): Promise<DataView>;
  writeValue(value: BufferSource): Promise<void>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

interface BluetoothRemoteGATTService extends EventTarget {
  device: BluetoothDevice;
  uuid: string;
  isPrimary: boolean;
  getCharacteristic(characteristic: string | number): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(characteristic?: string | number): Promise<BluetoothRemoteGATTCharacteristic[]>;
  getIncludedService(service: string | number): Promise<BluetoothRemoteGATTService>;
  getIncludedServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTServer {
  device: BluetoothDevice;
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string | number): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(service?: string | number): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice extends EventTarget {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  watchAdvertisements(): Promise<void>;
  unwatchAdvertisements(): void;
  readonly watchingAdvertisements: boolean;
  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void;
}

class BluetoothServiceImpl {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private dataCallback: ((data: string) => void) | null = null;

  public async connect(): Promise<void> {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      throw new Error("Web Bluetooth is not supported in this browser.");
    }

    try {
      this.device = await nav.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
        optionalServices: [SERVICE_UUID]
      });

      if (!this.device || !this.device.gatt) {
        throw new Error("Device not found or GATT not supported");
      }

      this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));
      
      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService(SERVICE_UUID);
      
      // Setup Write (RX on device side)
      this.rxCharacteristic = await service.getCharacteristic(CHAR_RX_UUID);

      // Setup Notify (TX on device side)
      const txCharacteristic = await service.getCharacteristic(CHAR_TX_UUID);
      await txCharacteristic.startNotifications();
      txCharacteristic.addEventListener('characteristicvaluechanged', this.handleCharacteristicValueChanged.bind(this));

    } catch (error) {
      console.error("Bluetooth connection failed", error);
      throw error;
    }
  }

  public disconnect() {
    if (this.device && this.device.gatt && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
    this.cleanup();
  }

  public isConnected(): boolean {
    return !!(this.device && this.device.gatt && this.device.gatt.connected);
  }

  public async sendCommand(cmd: string, value: string | number = ''): Promise<void> {
    if (!this.rxCharacteristic) return;
    
    // Protocol: "CMD:VALUE\n"
    const message = `${cmd}:${value}\n`;
    const encoder = new TextEncoder();
    await this.rxCharacteristic.writeValue(encoder.encode(message));
    console.log(`[BLE sent] ${message.trim()}`);
  }

  public onDataReceived(callback: (data: string) => void) {
    this.dataCallback = callback;
  }

  private handleCharacteristicValueChanged(event: Event) {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (!value) return;

    const decoder = new TextDecoder();
    const data = decoder.decode(value);
    console.log(`[BLE received] ${data}`);
    
    if (this.dataCallback) {
      this.dataCallback(data);
    }
  }

  private handleDisconnect() {
    console.log("Device disconnected");
    this.cleanup();
    // In a real app, you might emit an event here to update UI state
  }

  private cleanup() {
    this.device = null;
    this.server = null;
    this.rxCharacteristic = null;
  }
}

export const bluetoothService = new BluetoothServiceImpl();