import { supabase } from './supabase';
import { IS_EDUNIXO_NATIVE_APP } from './mobileRuntime';

import { NativeSmsGateway as NativeSms, type NativeSmsGatewayState } from './nativeSmsGateway';

export type PlatformGatewayAssignment = 'primary' | 'backup';

export interface PlatformSmsGatewayDeviceRow {
  id: string;
  device_key: string;
  device_name: string;
  platform: string;
  app_version?: string | null;
  is_enabled: boolean;
  permission_granted: boolean;
  last_seen_at?: string | null;
  last_error?: string | null;
  gateway_assignment?: PlatformGatewayAssignment;
  routing_priority?: number;
  daily_sms_soft_limit?: number;
  sent_today?: number;
}

export interface PlatformSmsGatewayQueueRow {
  id: string;
  destination: string;
  message_body: string;
  message_kind: 'otp'|'security'|'emergency'|'critical_confirmation'|'gateway_test';
  priority: 'low'|'normal'|'high'|'urgent';
  status: 'queued'|'processing'|'sent'|'failed'|'cancelled';
  attempts: number;
  created_at: string;
  sent_at?: string | null;
  last_error?: string | null;
  source_kind?: string | null;
  gateway_device_id?: string | null;
  sms_parts?: number | null;
}

export interface PlatformSmsGatewaySnapshot {
  native: boolean;
  telephonyAvailable: boolean;
  permissionGranted: boolean;
  device: PlatformSmsGatewayDeviceRow | null;
  devices: PlatformSmsGatewayDeviceRow[];
  queued: number;
  sent: number;
  failed: number;
  recent: PlatformSmsGatewayQueueRow[];
}

const APP_VERSION = '0.2.70';

function requireNative() {
  if (!IS_EDUNIXO_NATIVE_APP) throw new Error('Platform SMS/OTP Gateway can be activated only from the installed Classtago Android app.');
}

function indiaDayStartIso(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60_000);
  const utcMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 330 * 60_000;
  return new Date(utcMs).toISOString();
}

export async function registerPlatformSmsGatewayDevice(requestPermission = false): Promise<PlatformSmsGatewayDeviceRow> {
  requireNative();
  let state = await NativeSms.getState();
  if (!state.telephonyAvailable) throw new Error('This Android device does not report SIM SMS capability. Use an Android phone with an active SIM.');
  if (requestPermission && !state.permissionGranted) {
    const permission = await NativeSms.requestSmsPermission();
    state = { ...state, permissionGranted: Boolean(permission.permissionGranted) };
  }
  const { data, error } = await supabase.rpc('edunixo_platform_sms_gateway_register_device', {
    p_device_key: state.deviceKey,
    p_device_name: state.deviceName,
    p_app_version: APP_VERSION,
    p_permission_granted: state.permissionGranted,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as PlatformSmsGatewayDeviceRow;
}

export async function setPlatformSmsGatewayEnabled(enabled: boolean): Promise<PlatformSmsGatewayDeviceRow> {
  requireNative();
  let state = await NativeSms.getState();
  if (enabled && !state.permissionGranted) {
    const permission = await NativeSms.requestSmsPermission();
    state = { ...state, permissionGranted: Boolean(permission.permissionGranted) };
    if (!state.permissionGranted) throw new Error('SMS permission was not granted. Platform Gateway remains disabled.');
  }
  await registerPlatformSmsGatewayDevice(false);
  const { data, error } = await supabase.rpc('edunixo_platform_sms_gateway_set_enabled', {
    p_device_key: state.deviceKey,
    p_enabled: enabled,
    p_permission_granted: state.permissionGranted,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as PlatformSmsGatewayDeviceRow;
}

export async function setPlatformSmsGatewayAssignment(
  deviceKey: string,
  assignment: PlatformGatewayAssignment,
  dailySmsSoftLimit = 80,
  routingPriority?: number,
): Promise<PlatformSmsGatewayDeviceRow> {
  const priority = routingPriority ?? (assignment === 'primary' ? 10 : 50);
  const { data, error } = await supabase.rpc('edunixo_platform_sms_gateway_set_assignment', {
    p_device_key: deviceKey,
    p_assignment: assignment,
    p_routing_priority: priority,
    p_daily_sms_soft_limit: Math.max(10, Math.min(Number(dailySmsSoftLimit || 80), 1000)),
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as PlatformSmsGatewayDeviceRow;
}

export async function loadPlatformSmsGatewaySnapshot(): Promise<PlatformSmsGatewaySnapshot> {
  let nativeState: NativeSmsGatewayState | null = null;
  if (IS_EDUNIXO_NATIVE_APP) {
    try { nativeState = await NativeSms.getState(); } catch { nativeState = null; }
  }

  const devicesResult = await supabase.from('edunixo_platform_sms_gateway_devices')
    .select('*')
    .order('gateway_assignment', { ascending: false })
    .order('routing_priority', { ascending: true });
  if (devicesResult.error) throw devicesResult.error;
  const devices = (devicesResult.data || []) as PlatformSmsGatewayDeviceRow[];

  let device: PlatformSmsGatewayDeviceRow | null = null;
  if (nativeState?.deviceKey) device = devices.find(row => row.device_key === nativeState?.deviceKey) || null;

  const queueResult = await supabase.from('edunixo_platform_sms_gateway_queue')
    .select('id,destination,message_body,message_kind,priority,status,attempts,created_at,sent_at,last_error,source_kind,gateway_device_id,sms_parts')
    .order('created_at', { ascending: false }).limit(150);
  if (queueResult.error) throw queueResult.error;
  const recent = (queueResult.data || []) as PlatformSmsGatewayQueueRow[];

  const todayResult = await supabase.from('edunixo_platform_sms_gateway_queue')
    .select('gateway_device_id,sms_parts,sent_at')
    .eq('status', 'sent')
    .gte('sent_at', indiaDayStartIso())
    .limit(2000);
  if (!todayResult.error) {
    const usage = new Map<string, number>();
    for (const row of todayResult.data || []) {
      const id = String((row as any).gateway_device_id || '');
      if (!id) continue;
      usage.set(id, (usage.get(id) || 0) + Math.max(1, Number((row as any).sms_parts || 1)));
    }
    for (const row of devices) row.sent_today = usage.get(row.id) || 0;
  }

  return {
    native: Boolean(nativeState?.native),
    telephonyAvailable: Boolean(nativeState?.telephonyAvailable),
    permissionGranted: Boolean(nativeState?.permissionGranted),
    device,
    devices,
    queued: recent.filter(row => row.status === 'queued' || row.status === 'processing').length,
    sent: recent.filter(row => row.status === 'sent').length,
    failed: recent.filter(row => row.status === 'failed').length,
    recent: recent.slice(0, 40),
  };
}

export async function processPlatformSmsGatewayQueue(limit = 5): Promise<{processed:number;sent:number;failed:number}> {
  requireNative();
  const state = await NativeSms.getState();
  if (!state.permissionGranted) return { processed: 0, sent: 0, failed: 0 };
  const { data, error } = await supabase.rpc('edunixo_platform_sms_gateway_claim_batch', {
    p_device_key: state.deviceKey,
    p_limit: Math.max(1, Math.min(limit, 10)),
  });
  if (error) throw error;
  const jobs = (Array.isArray(data) ? data : []) as PlatformSmsGatewayQueueRow[];
  let sent = 0; let failed = 0;
  for (const job of jobs) {
    let success = false; let reference = ''; let lastError = ''; let parts = 1;
    try {
      const result = await NativeSms.sendSms({ destination: job.destination, message: job.message_body });
      success = Boolean(result.success); reference = String(result.reference || ''); parts = Math.max(1, Number(result.parts || 1));
      if (!success) lastError = 'Android SMS engine did not confirm send.';
    } catch (error: any) { lastError = String(error?.message || error || 'Native SMS send failed.'); }
    const completion = await supabase.rpc('edunixo_platform_sms_gateway_complete_job_v2', {
      p_device_key: state.deviceKey, p_job_id: job.id, p_success: success,
      p_native_reference: reference || null, p_error: lastError || null, p_parts: parts,
    });
    if (completion.error) throw completion.error;
    if (success) sent += 1; else failed += 1;
    if (jobs.length > 1) await new Promise(resolve => window.setTimeout(resolve, 800));
  }
  await supabase.rpc('edunixo_platform_sms_gateway_heartbeat', {
    p_device_key: state.deviceKey,
    p_permission_granted: state.permissionGranted,
    p_last_error: failed ? `${failed} platform SMS message(s) failed in the latest cycle.` : null,
  });
  return { processed: jobs.length, sent, failed };
}
