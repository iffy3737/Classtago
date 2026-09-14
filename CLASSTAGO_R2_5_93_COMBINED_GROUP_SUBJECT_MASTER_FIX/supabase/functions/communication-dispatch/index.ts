import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(supabaseUrl, serviceKey);
  const body = await req.json().catch(() => ({}));
  const messageId = body?.messageId ? String(body.messageId) : '';

  let callerId = '';
  const authHeader = req.headers.get('Authorization');
  if (authHeader) {
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data } = await userClient.auth.getUser();
    callerId = data.user?.id || '';
  }

  // This function can be deployed with verify_jwt=false so Supabase Cron can invoke it.
  // In that mode a valid project apikey is still required when there is no authenticated user.
  const apiKeyHeader = req.headers.get('apikey') || '';
  if (!callerId && apiKeyHeader !== anonKey && apiKeyHeader !== serviceKey) return json({ error: 'Unauthorized dispatcher invocation.' }, 401);

  if (body?.action === 'health') {
    return json({
      whatsapp: Boolean(Deno.env.get('WHATSAPP_ACCESS_TOKEN') && Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') && Deno.env.get('WHATSAPP_GRAPH_VERSION') && Deno.env.get('WHATSAPP_TEMPLATE_NAME')),
      sms: Boolean(Deno.env.get('SMS_GATEWAY_URL') && Deno.env.get('SMS_GATEWAY_TOKEN')),
      email: Boolean(Deno.env.get('RESEND_API_KEY') && Deno.env.get('EMAIL_FROM')),
    });
  }

  if (messageId && callerId) {
    const { data: message } = await admin.from('edunixo_communication_messages').select('created_by,system_generated').eq('id', messageId).maybeSingle();
    if (!message || (!message.system_generated && String(message.created_by || '') !== callerId)) return json({ error: 'Message access denied.' }, 403);
  }

  let query: any = admin.from('edunixo_communication_deliveries')
    .select('*,edunixo_communication_messages(*)')
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(100);
  if (messageId) query = query.eq('message_id', messageId);
  const { data: deliveries, error } = await query;
  if (error) return json({ error: error.message }, 500);

  const due = (deliveries || []).filter((row: any) => !row.next_retry_at || new Date(row.next_retry_at).getTime() <= Date.now());
  let sent = 0; let failed = 0; let retried = 0;
  const touchedMessages = new Set<string>();

  for (const delivery of due) {
    touchedMessages.add(String(delivery.message_id));
    const message = delivery.edunixo_communication_messages;
    if (!message) continue;
    await admin.from('edunixo_communication_deliveries').update({ status: 'processing', attempts: Number(delivery.attempts || 0) + 1, last_attempt_at: new Date().toISOString() }).eq('id', delivery.id);
    try {
      const providerId = await dispatch(delivery.channel, delivery.destination, message.title, message.body, message?.metadata?.senderIdentity);
      await admin.from('edunixo_communication_deliveries').update({
        status: 'sent', provider_message_id: providerId || null, last_error: null, next_retry_at: null, updated_at: new Date().toISOString(),
      }).eq('id', delivery.id);
      sent += 1;
    } catch (e) {
      const attempts = Number(delivery.attempts || 0) + 1;
      const messageText = e instanceof Error ? e.message : 'Provider delivery failed.';
      if (attempts < 3) {
        await admin.from('edunixo_communication_deliveries').update({
          status: 'queued', last_error: messageText, next_retry_at: new Date(Date.now() + 5 * 60_000).toISOString(), updated_at: new Date().toISOString(),
        }).eq('id', delivery.id);
        retried += 1;
      } else {
        await admin.from('edunixo_communication_deliveries').update({
          status: 'failed', last_error: messageText, next_retry_at: null, updated_at: new Date().toISOString(),
        }).eq('id', delivery.id);
        failed += 1;
      }
    }
  }

  for (const id of touchedMessages) await refreshMessageStatus(admin, id);
  return json({ processed: due.length, sent, failed, retried });
});

async function dispatch(channel: string, destination: string, title: string, body: string, senderIdentity?: { teacherName?: string; mobile?: string; email?: string }): Promise<string | undefined> {
  if (!destination) throw new Error(`No destination is configured for ${channel}.`);
  if (channel === 'whatsapp') return sendWhatsApp(destination, title, body);
  if (channel === 'sms') return sendSms(destination, `${title}\n${body}`);
  if (channel === 'email') return sendEmail(destination, title, body, senderIdentity?.email);
  throw new Error(`Unsupported channel: ${channel}`);
}

function normalizeMobile(value: string) {
  let digits = value.replace(/\D/g, '');
  const defaultCountry = (Deno.env.get('DEFAULT_COUNTRY_CODE') || '91').replace(/\D/g, '');
  if (digits.length === 10 && defaultCountry) digits = `${defaultCountry}${digits}`;
  return digits;
}

async function sendWhatsApp(destination: string, title: string, body: string) {
  const token = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
  const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
  const graphVersion = Deno.env.get('WHATSAPP_GRAPH_VERSION');
  const templateName = Deno.env.get('WHATSAPP_TEMPLATE_NAME');
  const language = Deno.env.get('WHATSAPP_TEMPLATE_LANGUAGE') || 'en_US';
  if (!token || !phoneNumberId || !graphVersion || !templateName) throw new Error('WhatsApp Cloud API is not configured on the server.');
  const response = await fetch(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: normalizeMobile(destination),
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: [{ type: 'body', parameters: [{ type: 'text', text: title }, { type: 'text', text: body }] }],
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WhatsApp API failed (${response.status}): ${payload?.error?.message || 'Unknown error'}`);
  return String(payload?.messages?.[0]?.id || '');
}

async function sendSms(destination: string, message: string) {
  const url = Deno.env.get('SMS_GATEWAY_URL');
  const token = Deno.env.get('SMS_GATEWAY_TOKEN');
  const senderId = Deno.env.get('SMS_SENDER_ID') || '';
  if (!url || !token) throw new Error('SMS gateway is not configured on the server.');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ to: normalizeMobile(destination), message, senderId }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`SMS gateway failed (${response.status}).`);
  return String(payload?.id || payload?.messageId || payload?.requestId || '');
}

async function sendEmail(destination: string, subject: string, body: string, replyTo?: string) {
  const key = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');
  if (!key || !from) throw new Error('Email provider is not configured on the server.');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify({ from, to: [destination], subject, text: body, ...(replyTo ? { reply_to: replyTo } : {}) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Email provider failed (${response.status}).`);
  return String(payload?.id || '');
}

async function refreshMessageStatus(admin: any, messageId: string) {
  const { data } = await admin.from('edunixo_communication_deliveries').select('status').eq('message_id', messageId);
  const statuses = (data || []).map((row: any) => String(row.status));
  let status = 'completed';
  if (statuses.some((x: string) => x === 'queued' || x === 'processing')) status = 'processing';
  else if (statuses.some((x: string) => x === 'failed') && statuses.some((x: string) => x === 'sent' || x === 'delivered')) status = 'partial';
  else if (statuses.length && statuses.every((x: string) => x === 'failed' || x === 'skipped')) status = 'failed';
  await admin.from('edunixo_communication_messages').update({ status, updated_at: new Date().toISOString() }).eq('id', messageId);
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}
