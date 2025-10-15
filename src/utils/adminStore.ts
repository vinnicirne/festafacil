export type CoinPackage = { id: string; name: string; coins: number; priceBRL: number }
export type LeadCost = { category: string; coins: number }
export type CoinPurchase = { id: string; providerId: string; providerName: string; packageId: string; coins: number; priceBRL: number; createdAt: string }
export type HighlightSub = { providerId: string; providerName: string; active: boolean; monthlyPriceBRL: number }
export type BannerSlot = { id: string; position: string; monthlyPriceBRL: number }
export type BannerEntry = { id: string; slotId: string; imageUrl: string; linkUrl: string; contractorName: string; startsAt: string; endsAt: string }
export type Order = { id: string; providerId: string; providerName: string; clientName: string; totalBRL: number; commissionPct: number; date: string; status: 'fechado'|'pendente'|'cancelado' }
export type Review = { id: string; providerId: string; providerName: string; rating: number; text: string; approved: boolean; createdAt: string }
export type CategoryOverride = { name: string; active: boolean }
export type AdminLog = { id: string; ts: string; actor: 'superadmin'; action: string; reason?: string; details?: Record<string, unknown> }
export type ProviderOverride = { providerId: string; providerName: string; priceFrom?: number; promoPercent?: number; promoLabel?: string; updatedAt: string }
export type AdminUser = { id: string; email: string; status: 'active'|'invited'; invitedAt?: string; activatedAt?: string }

export type AdminState = {
  coins: Record<string, number>
  coinPackages: CoinPackage[]
  leadCosts: LeadCost[]
  coinPurchases: CoinPurchase[]
  highlights: HighlightSub[]
  bannerSlots: BannerSlot[]
  banners: BannerEntry[]
  orders: Order[]
  reviews: Review[]
  categoriesOverride: CategoryOverride[]
  providerOverrides: ProviderOverride[]
  adminUsers: AdminUser[]
  logs: AdminLog[]
}

const KEY = 'ff:admin:state'

function uid(prefix='id'){ return `${prefix}_${Math.random().toString(36).slice(2,8)}_${Date.now()}` }

export function getInitialAdminState(): AdminState {
  // Seeds mínimos usando IDs do providers.ts (1..5)
  const now = new Date()
  const iso = (d: Date) => d.toISOString()
  return {
    coins: { '1': 120, '2': 80, '3': 45, '4': 60, '5': 30 },
    coinPackages: [
      // Pacotes avulsos: 10/50/100 FestCoins com preço por coin decrescente
      { id: 'pkg_bronze', name: 'Bronze', coins: 10, priceBRL: 39.9 },
      { id: 'pkg_prata', name: 'Prata', coins: 50, priceBRL: 169.9 },
      { id: 'pkg_ouro', name: 'Ouro', coins: 100, priceBRL: 299.9 },
    ],
    leadCosts: [
      { category: 'Buffet', coins: 3 },
      { category: 'Brinquedos', coins: 2 },
      { category: 'Decoração', coins: 2 },
      { category: 'Bolo', coins: 1 },
      { category: 'Recreação', coins: 2 },
    ],
    coinPurchases: [
      { id: uid('cp'), providerId: '2', providerName: 'Buffet Sabor de Festa', packageId: 'pkg_ouro', coins: 300, priceBRL: 249.9, createdAt: iso(now) },
      { id: uid('cp'), providerId: '1', providerName: 'Castelo Inflável Divertix', packageId: 'pkg_prata', coins: 120, priceBRL: 109.9, createdAt: iso(new Date(now.getTime()-86400000)) },
    ],
    highlights: [
      { providerId: '2', providerName: 'Buffet Sabor de Festa', active: true, monthlyPriceBRL: 199.9 },
      { providerId: '1', providerName: 'Castelo Inflável Divertix', active: true, monthlyPriceBRL: 149.9 },
      { providerId: '3', providerName: 'Decora Tudo Festas', active: false, monthlyPriceBRL: 149.9 },
    ],
    bannerSlots: [
      { id: 'slot_home_topo', position: 'Topo da Home', monthlyPriceBRL: 399.9 },
      { id: 'slot_busca_sidebar', position: 'Barra Lateral da Busca', monthlyPriceBRL: 299.9 },
    ],
    banners: [
      { id: uid('bn'), slotId: 'slot_home_topo', imageUrl: '/og-image.png', linkUrl: 'https://festa-facil-13102025.vercel.app/', contractorName: 'Buffet Sabor de Festa', startsAt: iso(new Date(now.getTime()-10*86400000)), endsAt: iso(new Date(now.getTime()+20*86400000)) },
    ],
    orders: [
      { id: uid('ord'), providerId: '2', providerName: 'Buffet Sabor de Festa', clientName: 'João Silva', totalBRL: 3200, commissionPct: 0.06, date: iso(new Date(now.getTime()-12*86400000)), status: 'fechado' },
      { id: uid('ord'), providerId: '1', providerName: 'Castelo Inflável Divertix', clientName: 'Maria Souza', totalBRL: 650, commissionPct: 0.05, date: iso(new Date(now.getTime()-8*86400000)), status: 'fechado' },
      { id: uid('ord'), providerId: '3', providerName: 'Decora Tudo Festas', clientName: 'Carlos Lima', totalBRL: 1100, commissionPct: 0.08, date: iso(new Date(now.getTime()-3*86400000)), status: 'pendente' },
    ],
    reviews: [
      { id: uid('rv'), providerId: '2', providerName: 'Buffet Sabor de Festa', rating: 5, text: 'Excelente!', approved: true, createdAt: iso(new Date(now.getTime()-7*86400000)) },
      { id: uid('rv'), providerId: '1', providerName: 'Castelo Inflável Divertix', rating: 3, text: 'Foi ok, poderia ser melhor', approved: true, createdAt: iso(new Date(now.getTime()-20*86400000)) },
    ],
    categoriesOverride: [],
    providerOverrides: [],
    adminUsers: [],
    logs: [],
  }
}

export function getAdminState(): AdminState {
  try{
    const raw = localStorage.getItem(KEY)
    if(!raw){ const init = getInitialAdminState(); localStorage.setItem(KEY, JSON.stringify(init)); return init }
    const init = getInitialAdminState()
    const stored = JSON.parse(raw) as Partial<AdminState> | undefined
    // Merge defensively to avoid undefined fields from older states
    const merged: AdminState = {
      coins: stored?.coins ?? init.coins,
      coinPackages: stored?.coinPackages ?? init.coinPackages,
      leadCosts: stored?.leadCosts ?? init.leadCosts,
      coinPurchases: stored?.coinPurchases ?? init.coinPurchases,
      highlights: stored?.highlights ?? init.highlights,
      bannerSlots: stored?.bannerSlots ?? init.bannerSlots,
      banners: stored?.banners ?? init.banners,
      orders: stored?.orders ?? init.orders,
      reviews: stored?.reviews ?? init.reviews,
      categoriesOverride: stored?.categoriesOverride ?? init.categoriesOverride,
      providerOverrides: stored?.providerOverrides ?? init.providerOverrides,
      adminUsers: stored?.adminUsers ?? init.adminUsers,
      logs: stored?.logs ?? init.logs,
    }
    // Persist back to ensure shape stays up-to-date
    localStorage.setItem(KEY, JSON.stringify(merged))
    return merged
  }catch{ const init = getInitialAdminState(); localStorage.setItem(KEY, JSON.stringify(init)); return init }
}

export function saveAdminState(state: AdminState){
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function appendLog(action: string, details?: Record<string, unknown>, reason?: string){
  const st = getAdminState()
  const log: AdminLog = { id: uid('log'), ts: new Date().toISOString(), actor: 'superadmin', action, reason, details }
  st.logs.unshift(log)
  saveAdminState(st)
}

export function adjustCoins(providerId: string, providerName: string, delta: number, reason: string){
  const st = getAdminState()
  const current = st.coins[providerId] || 0
  st.coins[providerId] = Math.max(0, current + delta)
  appendLog(delta>=0? 'coins:add':'coins:remove', { providerId, providerName, delta, newBalance: st.coins[providerId] }, reason)
  saveAdminState(st)
}

export function setCoinPackages(pkgs: CoinPackage[]) {
  const st = getAdminState()
  st.coinPackages = [...pkgs]
  appendLog('coins:packages:update', { count: pkgs.length })
  saveAdminState(st)
}

export function setLeadCosts(costs: LeadCost[]) {
  const st = getAdminState()
  st.leadCosts = [...costs]
  appendLog('coins:leadcosts:update', { count: costs.length })
  saveAdminState(st)
}

export function recordCoinPurchase(rec: Omit<CoinPurchase,'id'|'createdAt'>){
  const st = getAdminState()
  const entry: CoinPurchase = { id: uid('cp'), createdAt: new Date().toISOString(), ...rec }
  st.coinPurchases.unshift(entry)
  st.coins[rec.providerId] = (st.coins[rec.providerId] || 0) + rec.coins
  appendLog('coins:purchase', entry)
  saveAdminState(st)
}

export function setHighlight(providerId: string, providerName: string, active: boolean, monthlyPriceBRL: number){
  const st = getAdminState()
  const idx = st.highlights.findIndex(h=>h.providerId===providerId)
  if(idx>=0) st.highlights[idx] = { providerId, providerName, active, monthlyPriceBRL }
  else st.highlights.push({ providerId, providerName, active, monthlyPriceBRL })
  appendLog('highlight:update', { providerId, providerName, active, monthlyPriceBRL })
  saveAdminState(st)
}

export function upsertBannerSlot(slot: BannerSlot){
  const st = getAdminState()
  const idx = st.bannerSlots.findIndex(s=>s.id===slot.id)
  if(idx>=0) st.bannerSlots[idx] = slot; else st.bannerSlots.push(slot)
  appendLog('banner:slot:upsert', slot as unknown as Record<string,unknown>)
  saveAdminState(st)
}

export function upsertBanner(entry: BannerEntry){
  const st = getAdminState()
  const idx = st.banners.findIndex(b=>b.id===entry.id)
  if(idx>=0) st.banners[idx] = entry; else st.banners.push(entry)
  appendLog('banner:entry:upsert', entry as unknown as Record<string,unknown>)
  saveAdminState(st)
}

export function moderateReview(id: string, approved: boolean){
  const st = getAdminState()
  const idx = st.reviews.findIndex(r=>r.id===id)
  if(idx>=0) { st.reviews[idx].approved = approved; appendLog('review:moderate', { id, approved }) }
  saveAdminState(st)
}

export function upsertOrder(ord: Order){
  const st = getAdminState()
  const idx = st.orders.findIndex(o=>o.id===ord.id)
  if(idx>=0) st.orders[idx] = ord; else st.orders.push(ord)
  appendLog('order:upsert', ord as unknown as Record<string,unknown>)
  saveAdminState(st)
}

export function setCategoriesOverride(list: CategoryOverride[]) {
  const st = getAdminState()
  st.categoriesOverride = [...list]
  appendLog('categories:override:update', { count: list.length })
  saveAdminState(st)
}

export function setProviderOverride(override: Omit<ProviderOverride,'updatedAt'>){
  const st = getAdminState()
  const entry: ProviderOverride = { ...override, updatedAt: new Date().toISOString() }
  const idx = st.providerOverrides.findIndex(o=> String(o.providerId)===String(override.providerId))
  if(idx>=0) st.providerOverrides[idx] = entry; else st.providerOverrides.push(entry)
  appendLog('provider:override:set', entry as unknown as Record<string,unknown>)
  saveAdminState(st)
}

export function removeProviderOverride(providerId: string){
  const st = getAdminState()
  st.providerOverrides = st.providerOverrides.filter(o=> String(o.providerId)!==String(providerId))
  appendLog('provider:override:remove', { providerId })
  saveAdminState(st)
}

export function computeRevenueBreakdownLast30Days(state?: AdminState){
  const st = state || getAdminState()
  const now = Date.now()
  const cutoff = now - (30*86400000)
  // Moedas
  const coinsRev = st.coinPurchases.filter(p=> new Date(p.createdAt).getTime() >= cutoff).reduce((sum, p)=> sum + p.priceBRL, 0)
  // MRR Destaques: assumimos todos ativos geram MRR atual
  const mrr = st.highlights.filter(h=>h.active).reduce((sum,h)=> sum + h.monthlyPriceBRL, 0)
  // Comissão: pedidos fechados nos últimos 30 dias
  const commissions = st.orders.filter(o=> o.status==='fechado' && new Date(o.date).getTime() >= cutoff).reduce((sum,o)=> sum + (o.totalBRL * o.commissionPct), 0)
  // Banners: considera todos ativos por mês
  const bannersMonthly = st.bannerSlots.reduce((sum,s)=> sum + s.monthlyPriceBRL, 0)
  return { coinsRev, mrr, commissions, bannersMonthly }
}

// Admin Users management
export function inviteAdmin(email: string){
  const st = getAdminState()
  const e = (email||'').trim().toLowerCase()
  if(!e) return
  const exists = st.adminUsers.some(u=> u.email.toLowerCase()===e)
  if(exists) return
  const entry: AdminUser = { id: uid('adm'), email: e, status: 'invited', invitedAt: new Date().toISOString() }
  st.adminUsers.push(entry)
  appendLog('admin:invite', { email: e })
  saveAdminState(st)
}

export function removeAdminUser(id: string){
  const st = getAdminState()
  st.adminUsers = st.adminUsers.filter(u=> u.id!==id)
  appendLog('admin:remove', { id })
  saveAdminState(st)
}

export function activateAdmin(id: string){
  const st = getAdminState()
  const idx = st.adminUsers.findIndex(u=> u.id===id)
  if(idx>=0){
    st.adminUsers[idx] = { ...st.adminUsers[idx], status: 'active', activatedAt: new Date().toISOString() }
    appendLog('admin:activate', { id })
    saveAdminState(st)
  }
}