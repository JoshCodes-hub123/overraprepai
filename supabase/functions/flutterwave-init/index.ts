import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const FLW_SECRET_KEY = Deno.env.get('FLW_SECRET_KEY')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SUPA_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPA_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const FLW_V3_PAYMENTS = 'https://api.flutterwave.com/v3/payments'

const NAIRA_PER_TOKEN = 50
const MIN_TOPUP_NAIRA = 100

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
    const rawAmount = Number(body?.amount_naira)
    const redirectUrl = body?.redirect_url as string | undefined

    if (!Number.isFinite(rawAmount) || rawAmount < MIN_TOPUP_NAIRA) {
      return new Response(JSON.stringify({ error: `Minimum top-up is ₦${MIN_TOPUP_NAIRA}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Round DOWN to nearest ₦25 so we always credit whole tokens.
    const amountNaira = Math.floor(rawAmount / NAIRA_PER_TOKEN) * NAIRA_PER_TOKEN
    const tokens = amountNaira / NAIRA_PER_TOKEN
    if (tokens < 1) {
      return new Response(JSON.stringify({ error: 'Amount too small for 1 token' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPA_URL, SUPA_SERVICE)
    const { data: profile } = await admin
      .from('profiles').select('full_name').eq('id', userId).maybeSingle()

    const reference = `wallet_${userId.slice(0, 8)}_${Date.now()}`

    const payload = {
      tx_ref: reference,
      amount: amountNaira,
      currency: 'NGN',
      redirect_url: redirectUrl || 'https://overraprepai.com/wallet',
      customer: { email, name: (profile?.full_name as string) || email },
      customizations: {
        title: 'OverraPrep Wallet',
        description: `Top up · ${tokens} tokens (₦${amountNaira.toLocaleString()})`,
      },
      meta: {
        user_id: userId,
        kind: 'wallet_topup',
        tokens,
        amount_naira: amountNaira,
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
      plan_id: 'wallet_topup',
      provider: 'flutterwave',
      reference,
      amount_cents: amountNaira * 100,
      currency: 'NGN',
      status: 'pending',
      raw_payload: { flutterwave_init: json.data, tokens, amount_naira: amountNaira },
    })

    return new Response(JSON.stringify({
      checkout_url: json.data.link,
      reference,
      amount: amountNaira,
      tokens,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('flutterwave-init exception', e)
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
