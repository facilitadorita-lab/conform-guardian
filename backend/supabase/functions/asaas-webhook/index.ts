import { createClient } from 'npm:@supabase/supabase-js@^2'

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405)

  const configuredToken = Deno.env.get('ASAAS_WEBHOOK_TOKEN')
  const receivedToken = req.headers.get('asaas-access-token') ?? req.headers.get('x-asaas-token')
  if (configuredToken && receivedToken !== configuredToken) {
    return respond({ error: 'forbidden' }, 403)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (!url || !serviceKey) return respond({ error: 'server_not_configured' }, 500)

  const adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const event = await req.json()
  const payment = event.payment ?? {}
  const subscription = event.subscription ?? {}
  const empresaId = String(payment.externalReference ?? subscription.externalReference ?? '')
  const paymentId = payment.id ? String(payment.id) : null
  const subscriptionId = payment.subscription ? String(payment.subscription) : subscription.id ? String(subscription.id) : null

  if (!empresaId) return respond({ received: true, ignored: 'missing_external_reference' })

  const { data: assinatura } = await adminClient
    .from('assinaturas_empresas')
    .select('id')
    .eq('empresa_id', empresaId)
    .is('deleted_at', null)
    .maybeSingle()

  const eventName = String(event.event ?? '')
  const paid = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'].includes(eventName)
  const overdue = ['PAYMENT_OVERDUE'].includes(eventName)
  const deletedOrRefunded = ['PAYMENT_DELETED', 'PAYMENT_REFUNDED', 'PAYMENT_CHARGEBACK_REQUESTED'].includes(eventName)

  if (paymentId && payment.dueDate) {
    if (!assinatura?.id) return respond({ received: true, ignored: 'subscription_not_found' })
    const status = paid ? 'paga' : overdue ? 'vencida' : deletedOrRefunded ? 'cancelada' : 'pendente'
    await adminClient.from('faturas').upsert(
      {
        empresa_id: empresaId,
        assinatura_id: assinatura.id,
        competencia: String(payment.dueDate).slice(0, 7) + '-01',
        vencimento: payment.dueDate,
        valor_centavos: Math.round(Number(payment.value ?? 0) * 100),
        valor_pago_centavos: paid ? Math.round(Number(payment.value ?? 0) * 100) : null,
        status,
        forma_pagamento: mapBillingType(payment.billingType),
        gateway: 'asaas',
        gateway_invoice_id: paymentId,
        link_pagamento: payment.invoiceUrl ?? payment.bankSlipUrl ?? null,
        paga_em: paid ? new Date().toISOString() : null,
      },
      { onConflict: 'empresa_id,competencia' },
    )
  }

  if (paid) {
    await adminClient
      .from('assinaturas_empresas')
      .update({
        status: 'ativa',
        ultimo_pagamento_em: new Date().toISOString(),
        gateway_subscription_id: subscriptionId,
        gateway: 'asaas',
      })
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
  } else if (overdue) {
    await adminClient
      .from('assinaturas_empresas')
      .update({
        status: 'inadimplente',
        bloqueada_em: new Date().toISOString(),
        gateway_subscription_id: subscriptionId,
        gateway: 'asaas',
      })
      .eq('empresa_id', empresaId)
      .is('deleted_at', null)
  }

  return respond({ received: true })
})

function mapBillingType(value: string | undefined) {
  if (value === 'PIX') return 'pix'
  if (value === 'BOLETO') return 'boleto'
  if (value === 'CREDIT_CARD') return 'cartao'
  return null
}
