type PreferenceItem = {
  id?: string
  title: string
  description?: string
  quantity: number
  currency_id?: string
  unit_price: number
}

type PreferencePayload = {
  items: PreferenceItem[]
  external_reference?: string
  payer?: any
  back_urls?: { success?: string; pending?: string; failure?: string }
  auto_return?: 'approved' | 'all'
  notification_url?: string
  metadata?: Record<string, any>
}

export type PreferenceResponse = {
  id: string
  init_point?: string
  sandbox_init_point?: string
}

export async function createMpPreference(payload: PreferencePayload): Promise<PreferenceResponse> {
  // Try serverless API first (Vercel), fallback to direct API in dev if unavailable
  const serverUrl = '/api/mp/create_preference'
  try {
    const res = await fetch(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return res.json()
    // If server route not found or error, fallback
  } catch (_) {}

  const accessToken = (import.meta as any).env?.VITE_MP_ACCESS_TOKEN 
    || (window as any).VITE_MP_ACCESS_TOKEN 
    || (()=> { try { return localStorage.getItem('ff:mp:access_token') || sessionStorage.getItem('ff:mp:access_token') || '' } catch { return '' } })()
  if (!accessToken) throw new Error('Falha ao obter token do Mercado Pago. Defina VITE_MP_ACCESS_TOKEN ou salve em localStorage "ff:mp:access_token".')

  const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`Erro Mercado Pago: ${res.status}`)
  return res.json()
}

export function openCheckout(initPoint?: string, sandboxInitPoint?: string) {
  const url = initPoint || sandboxInitPoint
  if (!url) throw new Error('Preferência criada, mas sem URL de checkout')
  window.open(url, '_blank', 'noopener,noreferrer')
}