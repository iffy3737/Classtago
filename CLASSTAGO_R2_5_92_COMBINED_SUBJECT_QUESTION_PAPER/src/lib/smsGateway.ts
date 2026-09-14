import { supabase } from './supabase';
import { resolveActiveAppSchoolId } from './appSchoolContext';
import { IS_EDUNIXO_NATIVE_APP } from './mobileRuntime';

import { NativeSmsGateway as NativeSms, type NativeSmsGatewayState } from './nativeSmsGateway';

export type GatewayAssignment = 'primary' | 'backup';

export interface SmsGatewayDeviceRow {
  id: string;
  school_id: string;
  device_key: string;
  device_name: string;
  platform: string;
  app_version?: string | null;
  is_enabled: boolean;
  permission_granted: boolean;
  last_seen_at?: string | null;
  last_error?: string | null;
  owner_user_id?: string | null;
  owner_role?: string | null;
  gateway_assignment?: GatewayAssignment;
  routing_priority?: number;
  daily_sms_soft_limit?: number;
  sent_today?: number;
}

export interface SmsGatewayQueueRow {
  id: string;
  destination: string;
  message_body: string;
  priority: 'low'|'normal'|'high'|'urgent';
  status: 'queued'|'processing'|'sent'|'failed'|'cancelled';
  attempts: number;
  created_at: string;
  sent_at?: string | null;
  last_error?: string | null;
  gateway_device_id?: string | null;
  sms_parts?: number | null;
}

export interface SmsGatewaySnapshot {
  native: boolean;
  telephonyAvailable: boolean;
  permissionGranted: boolean;
  schoolId: string | null;
  device: SmsGatewayDeviceRow | null;
  devices: SmsGatewayDeviceRow[];
  queued: number;
  sent: number;
  failed: number;
  recent: SmsGatewayQueueRow[];
}

const APP_VERSION = '0.2.70';

function requireNative() {
  if (!IS_EDUNIXO_NATIVE_APP) throw new Error('SMS Gateway can be activated only from the installed Classtago Android app on the authorized school gateway phone.');
}

export function normalizeSmsDestination(value: string): string {
  const raw = String(value || '').trim();
  const plus = raw.startsWith('+');
  let digits = raw.replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10 || digits.length > 15) return '';
  return plus ? `+${digits}` : digits;
}

function indiaDayStartIso(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60_000);
  const utcMs = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - 330 * 60_000;
  return new Date(utcMs).toISOString();
}

export async function getNativeSmsState(): Promise<NativeSmsGatewayState> {
  requireNative();
  return NativeSms.getState();
}

async function activeSchoolId(): Promise<string> {
  const schoolId = await resolveActiveAppSchoolId();
  if (!schoolId) throw new Error('Active school could not be verified for SMS Gateway. Open the school through the normal school login flow and try again.');
  return schoolId;
}

export async function registerSmsGatewayDevice(requestPermission = false): Promise<SmsGatewayDeviceRow> {
  requireNative();
  const schoolId = await activeSchoolId();
  let state = await NativeSms.getState();
  if (!state.telephonyAvailable) throw new Error('This Android device does not report SIM SMS capability. Use an Android phone with an active SIM.');
  if (requestPermission && !state.permissionGranted) {
    const permission = await NativeSms.requestSmsPermission();
    state = { ...state, permissionGranted: Boolean(permission.permissionGranted) };
  }
  const { data, error } = await supabase.rpc('edunixo_sms_gateway_register_device', {
    p_school_id: schoolId,
    p_device_key: state.deviceKey,
    p_device_name: state.deviceName,
    p_app_version: APP_VERSION,
    p_permission_granted: state.permissionGranted,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as SmsGatewayDeviceRow;
}

export async function setSmsGatewayEnabled(enabled: boolean): Promise<SmsGatewayDeviceRow> {
  requireNative();
  const schoolId = await activeSchoolId();
  let state = await NativeSms.getState();
  if (enabled && !state.permissionGranted) {
    const permission = await NativeSms.requestSmsPermission();
    state = { ...state, permissionGranted: Boolean(permission.permissionGranted) };
    if (!state.permissionGranted) throw new Error('SMS permission was not granted. Gateway remains disabled.');
  }
  await registerSmsGatewayDevice(false);
  const { data, error } = await supabase.rpc('edunixo_sms_gateway_set_enabled', {
    p_school_id: schoolId,
    p_device_key: state.deviceKey,
    p_enabled: enabled,
    p_permission_granted: state.permissionGranted,
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as SmsGatewayDeviceRow;
}

export async function setSmsGatewayAssignment(
  deviceKey: string,
  assignment: GatewayAssignment,
  dailySmsSoftLimit = 80,
  routingPriority?: number,
): Promise<SmsGatewayDeviceRow> {
  const schoolId = await activeSchoolId();
  const priority = routingPriority ?? (assignment === 'primary' ? 10 : 50);
  const { data, error } = await supabase.rpc('edunixo_sms_gateway_set_assignment', {
    p_school_id: schoolId,
    p_device_key: deviceKey,
    p_assignment: assignment,
    p_routing_priority: priority,
    p_daily_sms_soft_limit: Math.max(10, Math.min(Number(dailySmsSoftLimit || 80), 1000)),
  });
  if (error) throw error;
  return (Array.isArray(data) ? data[0] : data) as SmsGatewayDeviceRow;
}

export async function loadSmsGatewaySnapshot(): Promise<SmsGatewaySnapshot> {
  const schoolId = await resolveActiveAppSchoolId();
  if (!schoolId) return { native: IS_EDUNIXO_NATIVE_APP, telephonyAvailable: false, permissionGranted: false, schoolId: null, device: null, devices: [], queued: 0, sent: 0, failed: 0, recent: [] };

  let nativeState: NativeSmsGatewayState | null = null;
  if (IS_EDUNIXO_NATIVE_APP) {
    try { nativeState = await NativeSms.getState(); } catch { nativeState = null; }
  }

  const devicesResult = await supabase
    .from('edunixo_sms_gateway_devices')
    .select('*')
    .eq('school_id', schoolId)
    .order('gateway_assignment', { ascending: false })
    .order('routing_priority', { ascending: true });
  if (devicesResult.error) throw devicesResult.error;
  const devices = (devicesResult.data || []) as SmsGatewayDeviceRow[];

  let device: SmsGatewayDeviceRow | null = null;
  if (nativeState?.deviceKey) device = devices.find(row => row.device_key === nativeState?.deviceKey) || null;

  const queueResult = await supabase
    .from('edunixo_sms_gateway_queue')
    .select('id,destination,message_body,priority,status,attempts,created_at,sent_at,last_error,gateway_device_id,sms_parts')
    .eq('school_id', schoolId)
    .order('created_at', { ascending: false })
    .limit(150);
  if (queueResult.error) throw queueResult.error;
  const recent = (queueResult.data || []) as SmsGatewayQueueRow[];

  const todayResult = await supabase
    .from('edunixo_sms_gateway_queue')
    .select('gateway_device_id,sms_parts,sent_at')
    .eq('school_id', schoolId)
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
    schoolId,
    device,
    devices,
    queued: recent.filter(row => row.status === 'queued' || row.status === 'processing').length,
    sent: recent.filter(row => row.status === 'sent').length,
    failed: recent.filter(row => row.status === 'failed').length,
    recent: recent.slice(0, 30),
  };
}

export async function enqueueSmsMessages(destinations: string[], message: string, options?: { priority?: 'low'|'normal'|'high'|'urgent'; sourceKind?: string; sourceId?: string }): Promise<number> {
  const schoolId = await activeSchoolId();
  const normalized = [...new Set(destinations.map(normalizeSmsDestination).filter(Boolean))];
  if (!normalized.length) throw new Error('No valid mobile number is available for the selected SMS recipients.');
  if (!message.trim()) throw new Error('SMS message cannot be empty.');
  const { data, error } = await supabase.rpc('edunixo_sms_gateway_enqueue_bulk', {
    p_school_id: schoolId,
    p_destinations: normalized,
    p_message_body: message.trim(),
    p_priority: options?.priority || 'normal',
    p_source_kind: options?.sourceKind || 'communication',
    p_source_id: options?.sourceId || null,
  });
  if (error) throw error;
  return Number(data || 0);
}

export async function processSmsGatewayQueue(limit = 5): Promise<{ processed: number; sent: number; failed: number }> {
  requireNative();
  const schoolId = await activeSchoolId();
  const state = await NativeSms.getState();
  if (!state.permissionGranted) return { processed: 0, sent: 0, failed: 0 };

  const { data, error } = await supabase.rpc('edunixo_sms_gateway_claim_batch', {
    p_school_id: schoolId,
    p_device_key: state.deviceKey,
    p_limit: Math.max(1, Math.min(limit, 10)),
  });
  if (error) throw error;
  const jobs = (Array.isArray(data) ? data : []) as SmsGatewayQueueRow[];
  let sent = 0;
  let failed = 0;

  for (const job of jobs) {
    let success = false;
    let reference = '';
    let lastError = '';
    let parts = 1;
    try {
      const result = await NativeSms.sendSms({ destination: job.destination, message: job.message_body });
      success = Boolean(result.success);
      reference = String(result.reference || '');
      parts = Math.max(1, Number(result.parts || 1));
      if (!success) lastError = 'Android SMS engine did not confirm send.';
    } catch (error: any) {
      lastError = String(error?.message || error || 'Native SMS send failed.');
    }

    const completion = await supabase.rpc('edunixo_sms_gateway_complete_job_v2', {
      p_school_id: schoolId,
      p_device_key: state.deviceKey,
      p_job_id: job.id,
      p_success: success,
      p_native_reference: reference || null,
      p_error: lastError || null,
      p_parts: parts,
    });
    if (completion.error) throw completion.error;
    if (success) sent += 1; else failed += 1;

    // Deliberately pace SIM-originated messages. Classtago never bypasses Android,
    // carrier or recharge-plan limits.
    if (jobs.length > 1) await new Promise(resolve => window.setTimeout(resolve, 1200));
  }

  await supabase.rpc('edunixo_sms_gateway_heartbeat', {
    p_school_id: schoolId,
    p_device_key: state.deviceKey,
    p_permission_granted: state.permissionGranted,
    p_last_error: failed ? `${failed} message(s) failed in the latest gateway cycle.` : null,
  });

  return { processed: jobs.length, sent, failed };
}
