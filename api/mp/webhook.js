export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  // Mercado Pago envia notificações com diversas estruturas.
  // Mantemos um handler resiliente e registramos o evento.
  try {
    const accessToken = process.env.MP_ACCESS_TOKEN || ''
    const event = typeof req.body === 'string' ? JSON.parse(req.body||'{}') : (req.body || {})

    // Estrutura comum: { type/topic: 'payment'|'merchant_order', data/resource: { id } }
    const topic = event?.topic || event?.type || event?.action || 'unknown'
    const id = event?.data?.id || event?.resource?.id || event?.id || null

    let externalRef = null
    let status = 'unknown'
    let detail = null

    if (accessToken && topic === 'payment' && id) {
      try {
        const resp = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        if (resp.ok) {
          detail = await resp.json()
          externalRef = detail?.external_reference || detail?.metadata?.external_reference || null
          status = detail?.status || status
        }
      } catch (_) {}
    }

    if (accessToken && topic === 'merchant_order' && id) {
      try {
        const resp = await fetch(`https://api.mercadopago.com/merchant_orders/${id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        if (resp.ok) {
          const order = await resp.json()
          externalRef = order?.external_reference || externalRef
          // Derivar status pago a partir dos pagamentos associados
          const approved = Array.isArray(order?.payments) && order.payments.some(p => String(p?.status).toLowerCase() === 'approved')
          status = approved ? 'approved' : (order?.status || status || 'opened')
          detail = order
        }
      } catch (_) {}
    }

    // Responder rápido; em produção, persistir em banco/queue e processar offline
    res.status(200).json({ ok: true, received: { topic, id, status, external_reference: externalRef }, meta: { hasToken: !!accessToken } })
  } catch (err) {
    res.status(200).json({ ok: true, warn: 'invalid payload', error: String(err || '') })
  }
}