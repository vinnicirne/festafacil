export const COMMISSION_RATE = 0.15

export type Transaction = {
  id: string
  leadId?: string
  clientName?: string
  providerName?: string
  eventDate?: string
  gross: number
  commission: number
  net: number
  status: 'Aguardando Liberação' | 'Liberado/Pago'
  createdAt: string
}

export function calcCommission(gross: number){
  const commission = Math.round(gross * COMMISSION_RATE * 100) / 100
  const net = Math.round((gross - commission) * 100) / 100
  return { commission, net }
}

export function formatMoney(v: number){
  return v.toLocaleString('pt-BR', { style:'currency', currency:'BRL' })
}

export function responseRate(leads: { createdAt?: string, respondedAt?: string }[]){
  const withinHour = leads.filter(l=> l.respondedAt && l.createdAt && (Date.parse(l.respondedAt) - Date.parse(l.createdAt)) <= 60*60*1000).length
  const responded = leads.filter(l=> !!l.respondedAt).length
  if(responded===0) return 0
  return Math.round((withinHour / responded) * 100)
}

export type ProviderPlan = 'GRATIS' | 'PREMIUM'