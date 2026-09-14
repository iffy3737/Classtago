import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authHeader } } });
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) return json({ error: 'Server storage/indexing credentials are not configured.' }, 500);
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const { materialId, notesContent } = await req.json();
  // Authorization gate: this select runs with the caller JWT and therefore respects RLS.
  const { data: material, error } = await supabase.from('edunixo_study_materials').select('*').eq('id', materialId).single();
  if (error || !material) return json({ error: 'Material not found or access denied.' }, 404);

  await admin.from('edunixo_study_materials').update({ extraction_status: 'processing', extraction_error: null }).eq('id', materialId);

  try {
    if (material.kind === 'notes') {
      const content = String(notesContent ?? '').trim();
      if (!content) throw new Error('Notes content is empty.');
      await admin.from('edunixo_study_material_segments').delete().eq('material_id', materialId);
      const { error: noteError } = await admin.from('edunixo_study_material_segments').insert({
        material_id: materialId,
        segment_no: 1,
        chapter: material.chapter ?? null,
        page_no: null,
        content: content.slice(0, 60000),
      });
      if (noteError) throw noteError;
      await admin.from('edunixo_study_materials').update({ extraction_status: 'ready' }).eq('id', materialId);
      return json({ ok: true, segments: 1 });
    }

    const extractorUrl = Deno.env.get('DOCUMENT_EXTRACTOR_URL');
    const extractorKey = Deno.env.get('DOCUMENT_EXTRACTOR_KEY');
    if (!extractorUrl) throw new Error('DOCUMENT_EXTRACTOR_URL is not configured. Configure a trusted PDF/DOC/image/link extraction service server-side.');

    let sourceUrl: string;
    if (material.kind === 'link') {
      const parsed = new URL(String(material.source_url ?? ''));
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http/https Study Material links are allowed.');
      sourceUrl = parsed.toString();
    } else {
      if (!material.storage_path) throw new Error('No uploaded file is associated with this material.');
      const { data: signed, error: signedError } = await admin.storage.from('teacher-study-materials').createSignedUrl(material.storage_path, 300);
      if (signedError || !signed?.signedUrl) throw signedError ?? new Error('Unable to create signed material URL.');
      sourceUrl = signed.signedUrl;
    }

    const response = await fetch(extractorUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(extractorKey ? { authorization: `Bearer ${extractorKey}` } : {}) },
      body: JSON.stringify({ url: sourceUrl, kind: material.kind, title: material.title, chapter: material.chapter, unit: material.unit }),
    });
    if (!response.ok) throw new Error(`Extractor failed (${response.status}).`);
    const payload = await response.json();
    const segments = Array.isArray(payload.segments) ? payload.segments : [];
    if (!segments.length) throw new Error('Extractor returned no usable text segments.');

    await admin.from('edunixo_study_material_segments').delete().eq('material_id', materialId);
    const rows = segments.slice(0, 500).map((s: any, index: number) => ({
      material_id: materialId,
      segment_no: index + 1,
      chapter: s.chapter ?? material.chapter ?? null,
      page_no: Number.isFinite(Number(s.pageNo)) ? Number(s.pageNo) : null,
      content: String(s.content ?? '').slice(0, 12000),
    })).filter((r: any) => r.content.trim());
    if (!rows.length) throw new Error('Extractor produced empty text.');
    const { error: insertError } = await admin.from('edunixo_study_material_segments').insert(rows);
    if (insertError) throw insertError;
    await admin.from('edunixo_study_materials').update({ extraction_status: 'ready' }).eq('id', materialId);
    return json({ ok: true, segments: rows.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown extraction error';
    await admin.from('edunixo_study_materials').update({ extraction_status: 'failed', extraction_error: message }).eq('id', materialId);
    return json({ error: message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors, 'content-type': 'application/json' } });
}
