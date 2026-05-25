import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

async function embed(text: string): Promise<number[]> {
  const r = await fetch('https://ai.gateway.lovable.dev/v1/embeddings', {
    method: 'POST',
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'google/text-embedding-004', input: text.slice(0, 6000) }),
  });
  if (!r.ok) throw new Error(`embed failed: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return j.data[0].embedding;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization');
    if (!auth?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const userClient = createClient(SUPABASE_URL, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: userData, error: authErr } = await userClient.auth.getUser();
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const body = await req.json();
    const items: Array<{ entity_type: string; entity_id: string; title: string; body?: string; url: string; owner_id?: string; is_public?: boolean }> = body.items ?? [];
    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ error: 'items required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let ok = 0;
    for (const it of items.slice(0, 50)) {
      try {
        const emb = await embed(`${it.title}\n${it.body ?? ''}`);
        await admin.from('search_index').upsert({
          entity_type: it.entity_type,
          entity_id: it.entity_id,
          title: it.title,
          body: it.body ?? null,
          url: it.url,
          owner_id: it.owner_id ?? null,
          is_public: it.is_public ?? true,
          embedding: emb as unknown as string,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'entity_type,entity_id' });
        ok++;
      } catch (e) { console.error('item failed', it.entity_id, e); }
    }
    return new Response(JSON.stringify({ indexed: ok }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
