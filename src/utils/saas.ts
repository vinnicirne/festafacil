// Moeda oficial do sistema
export const FESTCOIN_NAME = 'FestCoins'

// Planos e regras de monetização
export type ProviderPlan = 'GRATIS' | 'START' | 'PROFISSIONAL'

export const PLAN_CONFIG: Record<ProviderPlan, {
  monthlyCoins: number
  bonusLeadsPerMonth: number
  leadCostCoins: number
  commissionRate: number // percentual do gateway
  premiumBadge: boolean
  directLinkNoCommission: boolean
}> = {
  GRATIS: {
    monthlyCoins: 0,
    bonusLeadsPerMonth: 2,
    leadCostCoins: 3,
    commissionRate: 0.08,
    premiumBadge: false,
    directLinkNoCommission: false,
  },
  START: {
    monthlyCoins: 20,
    bonusLeadsPerMonth: 4,
    leadCostCoins: 3,
    commissionRate: 0.07,
    premiumBadge: false,
    directLinkNoCommission: true,
  },
  PROFISSIONAL: {
    monthlyCoins: 50,
    bonusLeadsPerMonth: 6,
    leadCostCoins: 2,
    commissionRate: 0.05,
    premiumBadge: true,
    directLinkNoCommission: true,
  },
}

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

export function calcCommission(gross: number, plan: ProviderPlan = 'GRATIS', opts?: { directLink?: boolean }){
  const cfg = PLAN_CONFIG[plan]
  const direct = !!opts?.directLink && cfg.directLinkNoCommission
  const rate = direct ? 0 : cfg.commissionRate
  const commission = Math.round(gross * rate * 100) / 100
  const net = Math.round((gross - commission) * 100) / 100
  return { commission, net, rate }
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

// Ciclo mensal simples (30 dias). Útil para créditos recorrentes.
export const CYCLE_MS = 30 * 24 * 60 * 60 * 1000

export function shouldStartNewCycle(lastIso?: string): boolean {
  if(!lastIso) return true
  const last = Date.parse(lastIso)
  if(isNaN(last)) return true
  return Date.now() - last >= CYCLE_MS
}

export function getPlanLabel(plan: ProviderPlan): string {
  if(plan==='GRATIS') return 'Grátis'
  if(plan==='START') return 'Start'
  return 'Profissional'
}