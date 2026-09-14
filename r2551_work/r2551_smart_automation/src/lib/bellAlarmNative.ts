import { Capacitor, registerPlugin } from '@capacitor/core';

export type NativeBellAlarm = { id: string; title: string; epochMs: number };

type BellAlarmStatus = {
  native: boolean;
  exactAlarmAllowed: boolean;
  notificationsAllowed: boolean;
  scheduledCount?: number;
};

interface BellAlarmPluginContract {
  getStatus(): Promise<BellAlarmStatus>;
  requestExactAlarmAccess(): Promise<{ opened: boolean }>;
  openNotificationSettings(): Promise<{ opened: boolean }>;
  replaceSchedule(options: { alarms: NativeBellAlarm[] }): Promise<{ scheduled: number; exactAlarmAllowed: boolean }>;
}

const BellAlarm = registerPlugin<BellAlarmPluginContract>('BellAlarm');

export const isNativeBellPlatform = () => Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

export async function getNativeBellStatus(): Promise<BellAlarmStatus> {
  if (!isNativeBellPlatform()) return { native: false, exactAlarmAllowed: false, notificationsAllowed: false, scheduledCount: 0 };
  return BellAlarm.getStatus();
}

export async function requestNativeExactAlarmAccess() {
  if (!isNativeBellPlatform()) return { opened: false };
  return BellAlarm.requestExactAlarmAccess();
}

export async function openNativeBellNotificationSettings() {
  if (!isNativeBellPlatform()) return { opened: false };
  return BellAlarm.openNotificationSettings();
}

export async function syncNativeBellSchedule(rows: Array<{ id: string; localDate: string; time: string; label: string; epochMs?: number }>) {
  if (!isNativeBellPlatform()) return { scheduled: 0, exactAlarmAllowed: false };
  const alarms: NativeBellAlarm[] = rows.map(row => {
    const serverEpoch = Number(row.epochMs);
    const epochMs = Number.isFinite(serverEpoch) && serverEpoch > 0 ? serverEpoch : new Date(`${row.localDate}T${row.time}:00`).getTime();
    return { id: row.id, title: row.label || 'School Bell', epochMs };
  }).filter(row => Number.isFinite(row.epochMs) && row.epochMs > Date.now() - 30_000);
  return BellAlarm.replaceSchedule({ alarms });
}
