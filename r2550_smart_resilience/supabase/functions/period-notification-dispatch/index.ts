// Compatibility endpoint for deployments that prefer a dedicated scheduled Edge Function.
// The R7 database cron already enqueues exact-minute period events. This endpoint simply
// asks Postgres to enqueue any due events, then invokes the central communication dispatcher.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const result = await admin.rpc('edunixo_r7_enqueue_due_period_notifications');
  if (result.error) return new Response(JSON.stringify({ error: result.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ queued: Number(result.data || 0) }), { headers: { 'Content-Type': 'application/json' } });
});
