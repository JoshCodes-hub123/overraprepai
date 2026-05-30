// Verifies a Flutterwave transaction by tx_ref (or transaction_id) and
// credits the user's wallet idempotently. Used as a polling fallback for
// the redirect flow so a missed webhook never strands a payment.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

const FLW_SECRET_KEY = Deno.env.get('FLW_SECRET_KEY')!
const SUPA_URL = Deno.env.get('SUPABASE_URL')!
const SUPA_ANON = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPA_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const NAIRA_PER_TOKEN = 25

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }
    const userClient = createClient(SUPA_URL, SUPA_ANON, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: claims, error: cErr } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''))
    if (cErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401)
    const userId = claims.claims.sub as string

    const body = await req.json().catch(() => ({}))
    const txRef: string | undefined = body?.tx_ref
    const transactionId: string | undefined = body?.transaction_id

    if (!txRef && !transactionId) {
      return json({ error: 'tx_ref or transaction_id required' }, 400)
    }

    // Look up the transaction at Flutterwave
    const url = transactionId
      ? `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`
      : `https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef!)}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } })
    const json1 = await res.json()
    if (json1?.status !== 'success' || !json1?.data) {
      return json({ ok: false, status: 'not_found', message: json1?.message || 'No transaction' }, 200)
    }
    const data = json1.data
    const status = String(data?.status || '').toLowerCase()
    const reference = data?.tx_ref as string
    const flwTxId = String(data?.id)

    if (status !== 'successful' && status !== 'success' && status !== 'completed') {
      return json({ ok: false, status, message: 'Payment not completed yet' }, 200)
    }

    const meta = data?.meta || {}
    const metaUser = (meta.user_id as string) || ''
    if (metaUser && metaUser !== userId) {
      return json({ error: 'Transaction does not belong to this user' }, 403)
    }

    let amountNaira = Number(meta.amount_naira) || Number(data?.amount) || 0
    let tokens = Number(meta.tokens) || Math.floor(amountNaira / NAIRA_PER_TOKEN)
    if (tokens <= 0) return json({ error: 'Invalid amount' }, 400)

    const admin = createClient(SUPA_URL, SUPA_SERVICE)

    // Mark payment_transactions row (if present) as activated
    const { data: tx } = await admin
      .from('payment_transactions')
      .select('id, activated, raw_payload')
      .eq('reference', reference)
      .maybeSingle()

    if (!tx?.activated) {
      await admin.from('payment_transactions').update({
        status: 'success',
        activated: true,
        activated_at: new Date().toISOString(),
        raw_payload: { ...(tx?.raw_payload ?? {}), flutterwave_verify: data },
        updated_at: new Date().toISOString(),
      }).eq('reference', reference)
    }

    const { data: credit, error: rpcErr } = await admin.rpc('credit_wallet', {
      _user_id: userId,
      _tokens: tokens,
      _naira_amount: amountNaira,
      _ref_id: `flw_${flwTxId}`,
      _kind: 'topup',
    })
    if (rpcErr) {
      console.error('credit_wallet error', rpcErr)
      return json({ error: rpcErr.message }, 500)
    }

    // Send receipt only on the first credit (skip if idempotent replay)
    if (!(credit as any)?.idempotent) {
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
    }

    return json({ ok: true, status: 'credited', tokens, balance: (credit as any)?.balance ?? null, idempotent: (credit as any)?.idempotent ?? false })
  } catch (e: any) {
    console.error('flutterwave-verify exception', e)
    return json({ error: String(e?.message || e) }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
