import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const FLW_SECRET_HASH = Deno.env.get('FLW_SECRET_HASH')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SUPA_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // Flutterwave sends the configured Secret hash in the `verif-hash` header
  const signature = req.headers.get('verif-hash') || req.headers.get('Verif-Hash') || ''
  if (!signature || signature !== FLW_SECRET_HASH) {
    console.warn('Invalid FLW signature')
    return new Response('Invalid signature', { status: 401 })
  }

  const raw = await req.text()
  let event: any
  try { event = JSON.parse(raw) } catch { return new Response('Bad JSON', { status: 400 }) }

  const admin = createClient(SUPA_URL, SUPA_SERVICE)

  try {
    // V4 webhook envelope: { type, data: { ... } }. V3 fallback: { event, data: { ... } }.
    const eventType: string = event?.type || event?.event || ''
    const data = event?.data ?? event

    // Support both V4 (charge.completed / payment.successful) and V3 (charge.completed)
    const isSuccess =
      /completed|successful|success/i.test(eventType) &&
      /success|completed/i.test(String(data?.status || ''))

    if (!isSuccess) {
      console.log('FLW event ignored', eventType, data?.status)
      return new Response('ok', { status: 200 })
    }

    // Reference field is `reference` in V4 and `tx_ref` in V3.
    const reference: string = data?.reference || data?.tx_ref
    const meta = data?.meta || data?.metadata || {}
    const userId = meta.user_id as string
    const planId = meta.plan_id as string
    const intervalDays = Number(meta.interval_days || 30)

    if (!reference) {
      console.warn('Missing reference')
      return new Response('Missing reference', { status: 400 })
    }

    // Idempotency
    const { data: tx } = await admin
      .from('payment_transactions')
      .select('id, status')
      .eq('reference', reference)
      .maybeSingle()

    if (tx?.status === 'success') {
      return new Response('Already processed', { status: 200 })
    }

    await admin
      .from('payment_transactions')
      .update({
        status: 'success',
        paid_at: new Date().toISOString(),
        metadata: { flutterwave_event: data },
      })
      .eq('reference', reference)

    if (userId && planId) {
      const { error: rpcErr } = await admin.rpc('activate_pro_subscription', {
        _user_id: userId,
        _plan_id: planId,
        _interval_days: intervalDays,
        _reference: reference,
      })
      if (rpcErr) console.error('activate_pro_subscription error', rpcErr)
    } else {
      console.warn('Webhook missing user_id/plan_id in meta', meta)
    }

    return new Response('ok', { status: 200 })
  } catch (e: any) {
    console.error('flutterwave-webhook error', e)
    return new Response('error', { status: 500 })
  }
})
