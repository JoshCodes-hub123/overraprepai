import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const FLW_SECRET_HASH = Deno.env.get('FLW_SECRET_HASH')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SUPA_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const NAIRA_PER_TOKEN = 25

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

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
    const eventType: string = event?.type || event?.event || ''
    const data = event?.data ?? event

    const status = String(data?.status || '').toLowerCase()
    const isSuccess =
      /completed|successful|success/i.test(eventType) &&
      (status === 'successful' || status === 'success' || status === 'completed')

    if (!isSuccess) {
      console.log('FLW event ignored', eventType, status)
      return new Response('ok', { status: 200 })
    }

    const reference: string = data?.reference || data?.tx_ref
    const flwTxId: string = String(data?.id || reference)
    const meta = data?.meta || data?.metadata || {}
    const userId = meta.user_id as string

    if (!reference || !userId) {
      console.warn('Webhook missing reference/user_id', { reference, userId, meta })
      return new Response('Missing reference', { status: 400 })
    }

    // Derive tokens from meta if present, otherwise from amount.
    let tokens = Number(meta.tokens)
    let amountNaira = Number(meta.amount_naira)
    if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
      amountNaira = Number(data?.amount) || 0
    }
    if (!Number.isFinite(tokens) || tokens <= 0) {
      tokens = Math.floor(amountNaira / NAIRA_PER_TOKEN)
    }
    if (tokens <= 0) {
      console.warn('Webhook: could not derive tokens', { meta, amountNaira })
      return new Response('Invalid amount', { status: 400 })
    }

    const { data: tx } = await admin
      .from('payment_transactions')
      .select('id, status, activated, raw_payload')
      .eq('reference', reference)
      .maybeSingle()

    if (tx?.activated) {
      return new Response('Already processed', { status: 200 })
    }

    await admin
      .from('payment_transactions')
      .update({
        status: 'success',
        activated: true,
        activated_at: new Date().toISOString(),
        raw_payload: { ...(tx?.raw_payload ?? {}), flutterwave_event: data },
        updated_at: new Date().toISOString(),
      })
      .eq('reference', reference)

    const { data: credit, error: rpcErr } = await admin.rpc('credit_wallet', {
      _user_id: userId,
      _tokens: tokens,
      _naira_amount: amountNaira,
      _ref_id: `flw_${flwTxId}`,
      _kind: 'topup',
    })
    if (rpcErr) console.error('credit_wallet error', rpcErr)

    // Fire-and-forget receipt email (don't block webhook ack)
    try {
      const { data: prof } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', userId)
        .maybeSingle()
      if (prof?.email) {
        await admin.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'topup-receipt',
            recipientEmail: prof.email,
            idempotencyKey: `topup-receipt-flw_${flwTxId}`,
            templateData: {
              name: (prof.full_name || '').split(' ')[0] || null,
              amount_naira: amountNaira,
              tokens,
              balance: (credit as any)?.balance ?? null,
              reference,
            },
          },
        })
      }
    } catch (mailErr) {
      console.error('topup receipt email error', mailErr)
    }

    return new Response('ok', { status: 200 })
  } catch (e: any) {
    console.error('flutterwave-webhook error', e)
    return new Response('error', { status: 500 })
  }
})
