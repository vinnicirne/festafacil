import type { Service } from '@/components/ServiceCard'
import { providers as localProviders } from '@/data/providers'
import { PROVIDERS_CACHE_TTL_MS, CEP_PREFIX_MIN } from '@/config'
import { getSupabase } from '@/utils/supabase'
import { getAdminState } from '@/utils/adminStore'

let cache: Service[] | null = null
let cacheSource: 'local' | 'supabase' | null = null
const SESSION_KEY = 'providers_cache_v1'

type ProvidersCache = { ts: number; data: Service[]; source: 'local' | 'supabase' }

function loadFromSession(): ProvidersCache | null {
  try{
    const raw = sessionStorage.getItem(SESSION_KEY)
    if(!raw) return null
    const parsed = JSON.parse(raw) as ProvidersCache
    if(!parsed || !Array.isArray(parsed.data) || (parsed.source !== 'local' && parsed.source !== 'supabase')) return null
    const fresh = Date.now() - (parsed.ts || 0) < PROVIDERS_CACHE_TTL_MS
    return fresh ? parsed : null
  }catch{ return null }
}

function saveToSession(data: Service[], source: 'local' | 'supabase'): void {
  try{
    const payload: ProvidersCache = { ts: Date.now(), data, source }
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload))
  }catch{}
}

const mapRowToService = (row: any): Service => ({
  id: String(row.id),
  name: String(row.name),
  category: String(row.category),
  priceFrom: Number(row.priceFrom ?? 0),
  rating: Number(row.rating ?? 0),
  ratingCount: Number(row.ratingCount ?? 0),
  mainImage: String(row.mainImage ?? ''),
  radiusKm: Number(row.radiusKm ?? 0),
  hasCNPJ: Boolean(row.hasCNPJ),
  includesMonitor: Boolean(row.includesMonitor),
  cepAreas: Array.isArray(row.cepAreas) ? row.cepAreas.map(String) : [],
})

function applyOverrides(list: Service[]): Service[] {
  try{
    const st = getAdminState()
    const map = new Map(st.providerOverrides.map(o=> [String(o.providerId), o]))
    return list.map(p => {
      const o = map.get(String(p.id))
      if(!o) return p
      const next = { ...p }
      if(typeof o.priceFrom === 'number' && !Number.isNaN(o.priceFrom)) next.priceFrom = o.priceFrom
      if(typeof o.promoPercent === 'number' && !Number.isNaN(o.promoPercent)) (next as any).promoPercent = o.promoPercent
      if(o.promoLabel) (next as any).promoLabel = o.promoLabel
      return next
    })
  }catch{ return list }
}

const matchCep = (qCep: string, cepAreas: string[]) => {
  const clean = qCep.replace(/\D/g,'')
  if(clean.length < CEP_PREFIX_MIN) return false
  const q5 = clean.slice(0, CEP_PREFIX_MIN)
  return cepAreas.some(a => a.replace(/\D/g,'').slice(0, CEP_PREFIX_MIN) === q5)
}

export type ProvidersQuery = {
  q: string
  price: [number, number]
  minRating: number
  hasCNPJ: boolean
  includesMonitor: boolean
  sort: 'relevancia' | 'melhor' | 'preco-asc' | 'preco-desc'
  onlyCepMatch: boolean
  qCep: string
  page: number
  pageSize: number
}

const scoreRelevance = (p: Service, q: string) => {
  if(!q) return 0
  const tokens = q.split(/\s+/).filter(Boolean)
  const name = p.name.toLowerCase()
  const cat = p.category.toLowerCase()
  const esc = (s:string)=> s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let s = 0
  if(name === q) s += 120
  if(cat === q) s += 100
  if(name.startsWith(q)) s += 80
  if(cat.startsWith(q)) s += 70
  try {
    const re = new RegExp(`\\b${esc(q)}`)
    if(re.test(name)) s += 50
    if(re.test(cat)) s += 40
  } catch {}
  if(name.includes(q)) s += 35
  if(cat.includes(q)) s += 25
  for(const t of tokens){ if(!t) continue; if(name.startsWith(t)) s += 10; if(cat.startsWith(t)) s += 8 }
  return s
}

export async function queryProviders(opts: ProvidersQuery): Promise<{ items: Service[]; total: number | null; canPaginate: boolean }>{
  const sb = getSupabase()
  const q = opts.q.trim().toLowerCase()
  if(sb){
    try{
      let query = sb.from('providers').select('*', { count: 'exact' })
      query = query.gte('priceFrom', opts.price[0]).lte('priceFrom', opts.price[1])
      query = query.gte('rating', opts.minRating)
      if(opts.hasCNPJ) query = query.eq('hasCNPJ', true)
      if(opts.includesMonitor) query = query.eq('includesMonitor', true)
      if(q){
        // name ILIKE %q% OR category ILIKE %q%
        const like = `%${q}%`
        // supabase-js v2: use or() with filters
        query = query.or(`name.ilike.${like},category.ilike.${like}`)
      }
      if(opts.sort==='melhor') query = query.order('rating', { ascending:false }).order('ratingCount', { ascending:false })
      else if(opts.sort==='preco-asc') query = query.order('priceFrom', { ascending:true })
      else if(opts.sort==='preco-desc') query = query.order('priceFrom', { ascending:false })
      // Tenta filtrar CEP no banco quando possível para permitir paginação
      let canPaginate = !opts.onlyCepMatch
      let cepTriedServer = false
      if(opts.onlyCepMatch && opts.qCep){
        const clean = opts.qCep.replace(/\D/g,'')
        if(clean.length >= CEP_PREFIX_MIN){
          const q5 = clean.slice(0, CEP_PREFIX_MIN)
          try{
            // Estratégia: se o banco possui coluna cepPrefixes5 (text[]), usamos contains para match exato de prefixo
            // Caso a coluna não exista, a consulta irá falhar e cairemos no fallback abaixo.
            query = query.contains('cepPrefixes5' as any, [q5] as any)
            canPaginate = true
            cepTriedServer = true
          }catch{ /* noop - supabase client não lança aqui, só na execução */ }
        }
      }
      if(canPaginate){
        const page = Math.max(1, opts.page)
        const size = Math.max(1, opts.pageSize)
        const from = (page - 1) * size
        const to = from + size - 1
        const { data, error, count } = await query.range(from, to)
        if(!error && data){
          let out = applyOverrides((data as any[]).map(mapRowToService))
          if(opts.sort==='relevancia'){
            out = [...out].sort((a,b)=>{
              const sa = scoreRelevance(a, q)
              const sb = scoreRelevance(b, q)
              if(sb !== sa) return sb - sa
              return (b.rating - a.rating) || (b.ratingCount - a.ratingCount) || (a.priceFrom - b.priceFrom)
            })
          }
          return { items: out, total: typeof count==='number' ? count : null, canPaginate }
        }
      } else {
        const size = Math.max(1, opts.pageSize)
        const { data, error } = await query.range(0, size * 3 - 1)
        if(!error && data){
          let out = applyOverrides((data as any[]).map(mapRowToService))
          out = out.filter(p => matchCep(opts.qCep, p.cepAreas))
          if(opts.sort==='relevancia'){
            out = [...out].sort((a,b)=>{
              const sa = scoreRelevance(a, q)
              const sb = scoreRelevance(b, q)
              if(sb !== sa) return sb - sa
              return (b.rating - a.rating) || (b.ratingCount - a.ratingCount) || (a.priceFrom - b.priceFrom)
            })
          }
          return { items: out, total: null, canPaginate }
        }
      }
      // Se chegamos aqui, a consulta não retornou dados compatíveis para paginação
    }catch(e){ console.warn('[supabase] queryProviders failed:', (e as Error).message) }
  }
  // Fallback local
  let base = localProviders.filter(p =>
    p.priceFrom >= opts.price[0] && p.priceFrom <= opts.price[1] &&
    p.rating >= opts.minRating &&
    (!opts.hasCNPJ || p.hasCNPJ) && (!opts.includesMonitor || p.includesMonitor) &&
    (!q || p.category.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
  )
  base = applyOverrides(base)
  let out = opts.onlyCepMatch && opts.qCep ? base.filter(p => matchCep(opts.qCep, p.cepAreas)) : base
  if(opts.sort==='melhor') out = [...out].sort((a,b)=> (b.rating - a.rating) || (b.ratingCount - a.ratingCount))
  else if(opts.sort==='preco-asc') out = [...out].sort((a,b)=> (a.priceFrom - b.priceFrom))
  else if(opts.sort==='preco-desc') out = [...out].sort((a,b)=> (b.priceFrom - a.priceFrom))
  else {
    out = [...out].sort((a,b)=>{
      const sa = scoreRelevance(a, q)
      const sb = scoreRelevance(b, q)
      if(sb !== sa) return sb - sa
      return (b.rating - a.rating) || (b.ratingCount - a.ratingCount) || (a.priceFrom - b.priceFrom)
    })
  }
  const total = out.length
  const page = Math.max(1, opts.page)
  const size = Math.max(1, opts.pageSize)
  const start = (page - 1) * size
  const items = out.slice(start, start + size)
  return { items, total, canPaginate: true }
}

export async function getProviders(): Promise<Service[]>{
  const sb = getSupabase()
  if(cache){
    if(sb && cacheSource === 'local'){
      try{
        const { data, error } = await sb.from('providers').select('*')
        if(!error && data){
          cache = (data as any[]).map(mapRowToService)
          cacheSource = 'supabase'
          saveToSession(cache, 'supabase')
        }
      }catch(e){ /* noop, mantém cache atual */ }
    }
    return applyOverrides(cache)
  }

  const fromSession = loadFromSession()
  if(fromSession){
    cache = fromSession.data
    cacheSource = fromSession.source
    if(sb && fromSession.source === 'local'){
      try{
        const { data, error } = await sb.from('providers').select('*')
        if(!error && data){
          cache = (data as any[]).map(mapRowToService)
          cacheSource = 'supabase'
          saveToSession(cache, 'supabase')
        }
      }catch(e){ /* mantém session cache */ }
    }
    return applyOverrides(cache)
  }

  if(sb){
    try{
      const { data, error } = await sb.from('providers').select('*')
      if(!error && data){
        cache = (data as any[]).map(mapRowToService)
        cacheSource = 'supabase'
        saveToSession(cache, 'supabase')
        return applyOverrides(cache)
      }
      if(error) console.warn('[supabase] providers.select error:', error.message)
    }catch(e){
      console.warn('[supabase] providers.select failed:', (e as Error).message)
    }
  }
  cache = localProviders
  cacheSource = 'local'
  saveToSession(cache, 'local')
  return applyOverrides(cache)
}

export async function getProviderById(id: string): Promise<Service | null>{
  const list = await getProviders()
  return list.find(p => p.id === id) ?? null
}

export function invalidateProvidersCache(): void {
  cache = null
  cacheSource = null
  try{ sessionStorage.removeItem(SESSION_KEY) }catch{}
}

export async function refreshProviders(): Promise<Service[]>{
  invalidateProvidersCache()
  return getProviders()
}

export function getProvidersSource(): 'local' | 'supabase' | null {
  if(cacheSource) return cacheSource
  const fromSession = loadFromSession()
  return fromSession?.source ?? null
}