import { Capacitor, registerPlugin } from '@capacitor/core';

export type Phase5NativeCapabilities = {
  native: boolean;
  codeScanner: boolean;
  documentScanner: boolean;
  biometric: boolean;
  deviceCredential: boolean;
};

interface EdunixoSmartContract {
  getCapabilities(): Promise<Phase5NativeCapabilities>;
  scanCode(): Promise<{ rawValue: string; displayValue?: string; format?: number; valueType?: number }>;
  scanDocument(): Promise<{ pageCount: number; fileName: string; savedUri: string; savedTo: string }>;
  authenticateDevice(): Promise<{ verified: boolean; authenticationType?: number }>;
}

const EdunixoSmart = registerPlugin<EdunixoSmartContract>('EdunixoSmart');

export function phase5NativeAvailable() {
  return Capacitor.isNativePlatform();
}

export async function getPhase5NativeCapabilities(): Promise<Phase5NativeCapabilities> {
  if (!Capacitor.isNativePlatform()) return { native:false, codeScanner:false, documentScanner:false, biometric:false, deviceCredential:false };
  return EdunixoSmart.getCapabilities();
}

export async function scanNativeCode() {
  if (!Capacitor.isNativePlatform()) throw new Error('Native ML Kit code scanner is available in the EDUNIXO Android app.');
  return EdunixoSmart.scanCode();
}

export async function scanNativeDocument() {
  if (!Capacitor.isNativePlatform()) throw new Error('Native ML Kit document scanner is available in the EDUNIXO Android app.');
  return EdunixoSmart.scanDocument();
}

export async function verifyNativeDeviceOwner() {
  if (!Capacitor.isNativePlatform()) throw new Error('Biometric/device credential verification is available in the EDUNIXO Android app.');
  return EdunixoSmart.authenticateDevice();
}
