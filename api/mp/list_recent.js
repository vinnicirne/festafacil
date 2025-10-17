export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    res.status(500).json({ error: 'MP_ACCESS_TOKEN missing' })
    return
  }

  const type = String((req.query || {}).type || 'payment')
  const limitRaw = Number((req.query || {}).limit || 20)
  const limit = Math.max(1, Math.min(50, Number.isFinite(limitRaw) ? limitRaw : 20))

  try {
    if (type === 'payment') {
      const url = `https://api.mercadopago.com/v1/payments/search?sort=date_created&criteria=desc&limit=${limit}`
      const resp = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      })
      const json = await resp.json()
      const results = Array.isArray(json?.results) ? json.results : []
      const mapped = results.map(p => ({
        id: p?.id,
        status: p?.status,
        external_reference: p?.external_reference || p?.metadata?.external_reference || null,
        transaction_amount: p?.transaction_amount || p?.amount || 0,
        date_created: p?.date_created || p?.date_approved || null,
        payer_email: p?.payer?.email || null,
      }))
      res.status(200).json({ ok: true, type, count: mapped.length, results: mapped })
      return
    }

    res.status(400).json({ error: 'Unsupported type. Use type=payment.' })
  } catch (err) {
    res.status(500).json({ error: 'Failed to list recent payments', details: String(err || '') })
  }
}