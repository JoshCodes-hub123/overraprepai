// One-shot internal trigger that calls seed-official with the SEED_SECRET from env.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const secret = Deno.env.get("SEED_SECRET");
  if (!secret) {
    return new Response(JSON.stringify({ error: "SEED_SECRET not set" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/seed-official`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "x-seed-secret": secret,
      "Content-Type": "application/json",
      Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
      apikey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    },
  });
  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
