import type { VercelRequest, VercelResponse } from '@vercel/node'

// Serverless function to create a Mercado Pago Checkout preference
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const envCandidates = [
    'MERCADO_PAGO_ACCESS_TOKEN',
    'MP_ACCESS_TOKEN',
    'VITE_MP_ACCESS_TOKEN',
    // comuns alternativos
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_TOKEN',
    'MERCADO_PAGO_TOKEN',
    'MP_TOKEN',
  ] as const
  const accessToken = envCandidates
    .map((k) => (process.env as Record<string, string | undefined>)[k])
    .find((v) => !!v && String(v).trim().length > 0)
  if (!accessToken) {
    const present = envCandidates.filter((k) => {
      const v = (process.env as Record<string, string | undefined>)[k]
      return !!v && String(v).trim().length > 0
    })
    res.status(500).json({ error: 'Missing Mercado Pago access token environment variable', tried: envCandidates, present })
    return
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    // Basic validation
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      res.status(400).json({ error: 'Invalid payload: items required' })
      return
    }

    const protocol = (req.headers['x-forwarded-proto'] as string) || 'https'
    const host = (req.headers['x-forwarded-host'] as string) || (req.headers.host as string) || 'localhost'
    const baseUrl = `${protocol}://${host}`

    const defaultBackUrls = {
      success: `${baseUrl}/checkout-success`,
      pending: `${baseUrl}/checkout-success?state=pending`,
      failure: `${baseUrl}/checkout?state=failure`,
    }

    const defaultNotificationUrl = `${baseUrl}/api/mp/notifications`

    const finalPayload = {
      ...payload,
      auto_return: payload.auto_return ?? 'approved',
      back_urls: { ...defaultBackUrls, ...(payload.back_urls ?? payload.redirect_urls ?? {}) },
      redirect_urls: { ...defaultBackUrls, ...(payload.redirect_urls ?? payload.back_urls ?? {}) },
      notification_url: payload.notification_url ?? defaultNotificationUrl,
    }

    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(finalPayload),
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