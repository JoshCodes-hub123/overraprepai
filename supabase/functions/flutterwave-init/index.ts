import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const FLW_SECRET_KEY = Deno.env.get('FLW_SECRET_KEY')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SUPA_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPA_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// Flutterwave V3 "Standard" hosted checkout
const FLW_V3_PAYMENTS = 'https://api.flutterwave.com/v3/payments'

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
    const planId = body?.plan_id as string | undefined
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

    const reference = `op_${userId.slice(0, 8)}_${Date.now()}`
    const amountMajor = Number(plan.price_cents) / 100 // naira

    const payload = {
      tx_ref: reference,
      amount: amountMajor,
      currency: plan.currency || 'NGN',
      redirect_url: redirectUrl || 'https://overraprepai.com/subscription',
      customer: {
        email,
        name: (profile?.full_name as string) || email,
      },
      customizations: {
        title: 'OverraPrep AI',
        description: `${plan.name} subscription`,
      },
      meta: {
        user_id: userId,
        plan_id: plan.id,
        duration_days: durationDays,
      },
    }

    const res = await fetch(FLW_V3_PAYMENTS, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok || json?.status !== 'success' || !json?.data?.link) {
      console.error('flw v3 init error', json)
      return new Response(JSON.stringify({ error: json?.message || 'Flutterwave checkout failed', details: json }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await admin.from('payment_transactions').insert({
      user_id: userId,
      plan_id: plan.id,
      provider: 'flutterwave',
      reference,
      amount_cents: plan.price_cents,
      currency: plan.currency || 'NGN',
      status: 'pending',
      raw_payload: { flutterwave_init: json.data, duration_days: durationDays },
    })

    return new Response(JSON.stringify({
      checkout_url: json.data.link,
      reference,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('flutterwave-init exception', e)
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
