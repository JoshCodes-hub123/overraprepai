import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const FLW_CLIENT_ID = Deno.env.get('FLW_CLIENT_ID')!
const FLW_CLIENT_SECRET = Deno.env.get('FLW_CLIENT_SECRET')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SUPA_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPA_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Flutterwave V4 live base URL
const FLW_BASE = 'https://api.flutterwave.cloud/f4bexperience'
const FLW_TOKEN_URL = 'https://idp.flutterwave.com/realms/flutterwave/protocol/openid-connect/token'

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: FLW_CLIENT_ID,
    client_secret: FLW_CLIENT_SECRET,
    grant_type: 'client_credentials',
  })
  const res = await fetch(FLW_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = await res.json()
  if (!res.ok || !json.access_token) {
    throw new Error(`FLW token failed: ${JSON.stringify(json)}`)
  }
  return json.access_token as string
}

function uuid() { return crypto.randomUUID() }

async function ensureCustomer(token: string, admin: any, userId: string, email: string, name: string): Promise<string> {
  const { data: profile } = await admin
    .from('profiles')
    .select('flw_customer_id')
    .eq('id', userId)
    .maybeSingle()
  if (profile?.flw_customer_id) return profile.flw_customer_id

  const first = (name?.split(' ')[0] || 'Student').slice(0, 50)
  const last = (name?.split(' ').slice(1).join(' ') || 'User').slice(0, 50)

  const res = await fetch(`${FLW_BASE}/customers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Trace-Id': uuid(),
      'X-Idempotency-Key': `cust_${userId}`,
    },
    body: JSON.stringify({
      name: { first, last },
      email,
    }),
  })
  const json = await res.json()
  if (!res.ok || !json?.data?.id) {
    throw new Error(`FLW create customer failed: ${JSON.stringify(json)}`)
  }
  const customerId = json.data.id as string
  await admin.from('profiles').update({ flw_customer_id: customerId }).eq('id', userId)
  return customerId
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const supabase = createClient(SUPA_URL, SUPA_ANON, { global: { headers: { Authorization: authHeader } } })
    const tokenJwt = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(tokenJwt)
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = claims.claims.sub as string
    const email = claims.claims.email as string

    const body = await req.json().catch(() => ({}))
    const planId = body?.plan_id as string | undefined // e.g. 'pro_monthly'
    const redirectUrl = body?.redirect_url as string | undefined

    if (!planId) {
      return new Response(JSON.stringify({ error: 'Missing plan_id' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(SUPA_URL, SUPA_SERVICE)
    const { data: plan, error: planErr } = await admin
      .from('subscription_plans')
      .select('id, name, price_cents, currency, interval, features')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle()
    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const durationDays = Number((plan.features as any)?.duration_days || 30)

    const { data: profile } = await admin
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()

    const accessToken = await getAccessToken()
    const customerId = await ensureCustomer(accessToken, admin, userId, email, (profile?.full_name as string) || email)

    const reference = `op_${userId.slice(0, 8)}_${Date.now()}`
    const amountMajor = Number(plan.price_cents) / 100 // naira

    const sessionRes = await fetch(`${FLW_BASE}/checkout/sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Trace-Id': uuid(),
        'X-Idempotency-Key': reference,
      },
      body: JSON.stringify({
        amount: amountMajor,
        currency: plan.currency || 'NGN',
        customer_id: customerId,
        reference,
        redirect_url: redirectUrl || 'https://overraprepai.com/subscription',
        meta: {
          user_id: userId,
          plan_id: plan.id,
          duration_days: durationDays,
        },
      }),
    })
    const sessionJson = await sessionRes.json()
    if (!sessionRes.ok || !sessionJson?.data?.checkout_url) {
      console.error('flw checkout error', sessionJson)
      return new Response(JSON.stringify({ error: sessionJson?.message || 'Flutterwave checkout failed', details: sessionJson }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await admin.from('payment_transactions').insert({
      user_id: userId,
      plan_id: plan.id,
      provider: 'flutterwave',
      reference,
      amount_cents: plan.price_cents,
      currency: plan.currency || 'NGN',
      status: 'pending',
      raw_payload: { flutterwave_session: sessionJson.data, customer_id: customerId, duration_days: durationDays },
    })

    return new Response(JSON.stringify({
      checkout_url: sessionJson.data.checkout_url,
      reference,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('flutterwave-init exception', e)
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
