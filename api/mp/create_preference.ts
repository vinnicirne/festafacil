import type { VercelRequest, VercelResponse } from '@vercel/node'

// Serverless function to create a Mercado Pago Checkout preference
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || process.env.MP_ACCESS_TOKEN || process.env.VITE_MP_ACCESS_TOKEN
  if (!accessToken) {
    res.status(500).json({ error: 'Missing Mercado Pago access token environment variable' })
    return
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    // Basic validation
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      res.status(400).json({ error: 'Invalid payload: items required' })
      return
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await mpRes.json()
    if (!mpRes.ok) {
      res.status(mpRes.status).json({ error: 'MercadoPago error', details: data })
      return
    }

    res.status(200).json(data)
  } catch (err: any) {
    res.status(500).json({ error: 'Unexpected error', details: err?.message || String(err) })
  }
}