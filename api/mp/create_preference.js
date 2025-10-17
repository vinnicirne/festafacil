export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const accessToken = process.env.MP_ACCESS_TOKEN
  if (!accessToken) {
    res.status(500).json({ error: 'MP_ACCESS_TOKEN missing' })
    return
  }

  let payload = req.body || {}
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload || '{}') } catch (_) { payload = {} }
  }

  try {
    const resp = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const json = await resp.json()
    res.status(resp.ok ? 200 : resp.status).json(json)
  } catch (err) {
    res.status(500).json({ error: 'Failed to create preference', details: String(err) })
  }
}