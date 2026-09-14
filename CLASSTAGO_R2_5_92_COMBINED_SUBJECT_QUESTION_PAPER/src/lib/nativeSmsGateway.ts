import { registerPlugin } from '@capacitor/core';

export interface NativeSmsGatewayState {
  native: boolean;
  telephonyAvailable: boolean;
  permissionGranted: boolean;
  deviceKey: string;
  deviceName: string;
}

export interface NativeSmsPermissionResult {
  permissionGranted: boolean;
}

export interface NativeSmsSendResult {
  success: boolean;
  reference?: string;
  parts?: number;
  destination?: string;
}

export interface EdunixoSmsGatewayNative {
  getState(): Promise<NativeSmsGatewayState>;
  requestSmsPermission(): Promise<NativeSmsPermissionResult>;
  sendSms(options: { destination: string; message: string }): Promise<NativeSmsSendResult>;
}

// Register the Capacitor bridge exactly once. Both the school gateway and the
// platform/Super Admin gateway import this singleton, preventing Capacitor's
// "plugin already registered" warning while preserving one native SMS engine.
export const NativeSmsGateway = registerPlugin<EdunixoSmsGatewayNative>('EdunixoSmsGateway');
