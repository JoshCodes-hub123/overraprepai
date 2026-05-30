import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const FLW_SECRET_KEY = Deno.env.get('FLW_SECRET_KEY')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SUPA_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPA_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const FLW_V3_PAYMENTS = 'https://api.flutterwave.com/v3/payments'

// First-purchase discount (Pro Monthly only): ₦2,000 → ₦1,500
const FIRST_MONTH_DISCOUNT_KOBO = 50_000 // 500 NGN

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
      .select('full_name, first_purchase_used')
      .eq('id', userId)
      .maybeSingle()

    // First-month discount applies only to Pro Monthly, only on first purchase ever
    let priceKobo = Number(plan.price_cents)
    let discountApplied = false
    if (plan.id === 'pro_monthly' && !(profile as any)?.first_purchase_used) {
      priceKobo = Math.max(priceKobo - FIRST_MONTH_DISCOUNT_KOBO, 0)
      discountApplied = true
    }

    const reference = `op_${userId.slice(0, 8)}_${Date.now()}`
    const amountMajor = priceKobo / 100

    const payload = {
      tx_ref: reference,
      amount: amountMajor,
      currency: plan.currency || 'NGN',
      redirect_url: redirectUrl || 'https://overraprepai.com/subscription',
      customer: { email, name: (profile?.full_name as string) || email },
      customizations: {
        title: 'OverraPrep AI',
        description: discountApplied
          ? `${plan.name} — First-month special`
          : `${plan.name} subscription`,
      },
      meta: {
        user_id: userId,
        plan_id: plan.id,
        duration_days: durationDays,
        discount_applied: discountApplied,
      },
    }

    const res = await fetch(FLW_V3_PAYMENTS, {
      method: 'POST',
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}`, 'Content-Type': 'application/json' },
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
      amount_cents: priceKobo,
      currency: plan.currency || 'NGN',
      status: 'pending',
      raw_payload: { flutterwave_init: json.data, duration_days: durationDays, discount_applied: discountApplied },
    })

    return new Response(JSON.stringify({
      checkout_url: json.data.link,
      reference,
      discount_applied: discountApplied,
      amount: amountMajor,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('flutterwave-init exception', e)
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
