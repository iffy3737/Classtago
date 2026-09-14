import { supabase } from './supabase';

export type Phase1RealtimeTable =
  | 'edunixo_attendance_entries'
  | 'edunixo_result_subject_lists'
  | 'edunixo_result_books'
  | 'edunixo_progress_card_batches'
  | 'edunixo_user_notifications';

export interface Phase1RealtimeEvent {
  table: Phase1RealtimeTable;
  eventType: string;
  payload: any;
}

export function installPhase1Realtime(schoolId: string): () => void {
  if (!schoolId || typeof window === 'undefined') return () => undefined;
  const channelName = `edunixo-phase1-${schoolId}-${Math.random().toString(36).slice(2, 8)}`;
  let channel = supabase.channel(channelName);
  const tables: Phase1RealtimeTable[] = [
    'edunixo_attendance_entries',
    'edunixo_result_subject_lists',
    'edunixo_result_books',
    'edunixo_progress_card_batches',
    'edunixo_user_notifications',
  ];
  for (const table of tables) {
    channel = channel.on('postgres_changes' as any, {
      event: '*', schema: 'public', table, filter: `school_id=eq.${schoolId}`,
    } as any, (payload: any) => {
      const detail: Phase1RealtimeEvent = { table, eventType: String(payload?.eventType || '*'), payload };
      window.dispatchEvent(new CustomEvent('edunixo_realtime_change', { detail }));
      if (table === 'edunixo_user_notifications' && payload?.eventType === 'INSERT' && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        const row = payload.new || {};
        try {
          navigator.serviceWorker?.ready.then(reg => reg.showNotification(String(row.title || 'EDUNIXO'), {
            body: String(row.body || 'You have a new school notification.'),
            tag: `edunixo-notification-${row.id || Date.now()}`,
            data: { url: '/app' },
          })).catch(() => undefined);
        } catch {}
      }
    });
  }
  channel.subscribe();
  return () => { void supabase.removeChannel(channel); };
}
