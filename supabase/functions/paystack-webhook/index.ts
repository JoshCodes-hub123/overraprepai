import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createHmac } from 'node:crypto'

const PAYSTACK_SECRET = Deno.env.get('PAYSTACK_SECRET_KEY')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SUPA_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const raw = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''
  const expected = createHmac('sha512', PAYSTACK_SECRET).update(raw).digest('hex')
  if (signature !== expected) {
    console.warn('Invalid Paystack signature')
    return new Response('Invalid signature', { status: 401 })
  }

  let event: any
  try { event = JSON.parse(raw) } catch { return new Response('Bad JSON', { status: 400 }) }

  const admin = createClient(SUPA_URL, SUPA_SERVICE)

  try {
    if (event.event === 'charge.success') {
      const data = event.data
      const reference = data.reference as string
      const meta = data.metadata || {}
      const userId = meta.user_id as string
      const planId = meta.plan_id as string
      const intervalDays = Number(meta.interval_days || 30)

      // Mark transaction success (idempotent)
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
        .update({ status: 'success', paid_at: new Date().toISOString(), metadata: { paystack_event: data } })
        .eq('reference', reference)

      if (userId && planId) {
        await admin.rpc('activate_pro_subscription', {
          _user_id: userId,
          _plan_id: planId,
          _interval_days: intervalDays,
          _reference: reference,
        })
      }
    }
    return new Response('ok', { status: 200 })
  } catch (e) {
    console.error('webhook error', e)
    return new Response('error', { status: 500 })
  }
})
