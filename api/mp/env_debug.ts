import type { VercelRequest, VercelResponse } from '@vercel/node'

// Diagnostic endpoint: reports presence of expected env names without revealing values
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const candidates = [
    'MERCADO_PAGO_ACCESS_TOKEN',
    'MP_ACCESS_TOKEN',
    'VITE_MP_ACCESS_TOKEN',
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_TOKEN',
    'MERCADO_PAGO_TOKEN',
    'MP_TOKEN',
  ] as const

  const presence = candidates.map((k) => ({
    name: k,
    hasValue: !!(process.env as Record<string, string | undefined>)[k] && String((process.env as Record<string, string | undefined>)[k]).trim().length > 0,
  }))

  const any = presence.some((p) => p.hasValue)
  res.status(200).json({ any, presence, runtime: process.env.NODE_ENV || 'unknown' })
}