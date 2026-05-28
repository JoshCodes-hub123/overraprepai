import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SUPA_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPA_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const supabase = createClient(SUPA_URL, SUPA_ANON, { global: { headers: { Authorization: authHeader } } })
    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token)
    if (claimsErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const userId = claims.claims.sub as string
    const email = claims.claims.email as string

    const body = await req.json().catch(() => ({}))
    const planCode = body?.plan_code as string | undefined // 'pro_monthly' | 'pro_semester'
    const callbackUrl = body?.callback_url as string | undefined

    if (!planCode || !['pro_monthly', 'pro_semester'].includes(planCode)) {
      return new Response(JSON.stringify({ error: 'Invalid plan_code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const admin = createClient(SUPA_URL, SUPA_SERVICE)
    const { data: plan, error: planErr } = await admin
      .from('subscription_plans')
      .select('id, code, name, price_kobo, currency, interval_days')
      .eq('code', planCode)
      .maybeSingle()
    if (planErr || !plan) {
      return new Response(JSON.stringify({ error: 'Plan not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const reference = `op_${userId.slice(0, 8)}_${Date.now()}`

    const initRes = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: plan.price_kobo,
        currency: plan.currency || 'NGN',
        reference,
        callback_url: callbackUrl,
        metadata: {
          user_id: userId,
          plan_id: plan.id,
          plan_code: plan.code,
          interval_days: plan.interval_days,
        },
      }),
    })
    const initJson = await initRes.json()
    if (!initRes.ok || !initJson?.status) {
      console.error('paystack-init error', initJson)
      return new Response(JSON.stringify({ error: initJson?.message || 'Paystack init failed' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    await admin.from('payment_transactions').insert({
      user_id: userId,
      plan_id: plan.id,
      provider: 'paystack',
      reference,
      amount_kobo: plan.price_kobo,
      currency: plan.currency || 'NGN',
      status: 'pending',
      metadata: { paystack: initJson.data },
    })

    return new Response(JSON.stringify({
      authorization_url: initJson.data.authorization_url,
      access_code: initJson.data.access_code,
      reference,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('paystack-init exception', e)
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
