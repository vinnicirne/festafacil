import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import FiltersSidebar from '../components/FiltersSidebar'
import ServiceCard from '../components/ServiceCard'
import type { Service } from '@/components/ServiceCard'
import { getProviders, refreshProviders, getProvidersSource, queryProviders } from '@/utils/providersSource'
import { exportCsv } from '../utils/export'
import { CEP_PREFIX_MIN, SEARCH_PRICE_MIN_DEFAULT, SEARCH_PRICE_MAX_DEFAULT, MIN_RATING_DEFAULT, SEARCH_PAGE_SIZE } from '@/config'

export default function Search(){
  const loc = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(loc.search)
  const qRaw = params.get('servico') || ''
  const qServico = qRaw.toLowerCase() || ''
  const qCepRaw = params.get('cep') || ''
  const qCep = qCepRaw.replace(/\D/g,'')
  const cepEnabled = qCep.length >= CEP_PREFIX_MIN
  const [price, setPrice] = useState<[number,number]>([SEARCH_PRICE_MIN_DEFAULT, SEARCH_PRICE_MAX_DEFAULT])
  const [priceBounds, setPriceBounds] = useState<[number, number]>([SEARCH_PRICE_MIN_DEFAULT, SEARCH_PRICE_MAX_DEFAULT])
  const [minRating, setMinRating] = useState(MIN_RATING_DEFAULT)
  const [hasCNPJ, setHasCNPJ] = useState(false)
  const [includesMonitor, setIncludesMonitor] = useState(false)
  const [sort, setSort] = useState('relevancia')
  const [onlyCepMatch, setOnlyCepMatch] = useState(() => new URLSearchParams(loc.search).get('apenasCep') === 'true')

  const matchCep = (cepAreas: string[]) => {
    if(qCep.length < CEP_PREFIX_MIN) return false
    const q5 = qCep.slice(0, CEP_PREFIX_MIN)
    return cepAreas.some(a => a.replace(/\D/g,'').slice(0, CEP_PREFIX_MIN) === q5)
  }

  const [all, setAll] = useState<Service[]>([])
  const [reloading, setReloading] = useState(false)
  useEffect(()=>{ let on = true; getProviders().then(d=>{ if(on) setAll(d) }); return ()=>{ on=false } }, [])
  const doRefresh = async ()=>{
    try{
      setReloading(true)
      const d = await refreshProviders()
      setAll(d)
    } finally{ setReloading(false) }
  }

  // Calcula limites de preço com base nos dados carregados (fallback para defaults)
  useEffect(()=>{
    if(all.length){
      const mins = all.map(p => p.priceFrom).filter(n => Number.isFinite(n))
      const min = Math.max(0, Math.min(...mins))
      const max = Math.max(...mins)
      const next:[number,number] = [Math.min(min, SEARCH_PRICE_MIN_DEFAULT), Math.max(max, SEARCH_PRICE_MAX_DEFAULT)]
      setPriceBounds(next)
      // Garante que o range atual fique dentro dos novos limites
      setPrice(([lo, hi])=> [
        Math.min(Math.max(lo, next[0]), next[1]),
        Math.min(Math.max(hi, next[0]), next[1])
      ])
    } else {
      setPriceBounds([SEARCH_PRICE_MIN_DEFAULT, SEARCH_PRICE_MAX_DEFAULT])
    }
  }, [all])

  const [results, setResults] = useState<Service[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [canPaginate, setCanPaginate] = useState(true)
  const initialPage = Math.max(1, Number(params.get('pagina') || '1') || 1)
  const [page, setPage] = useState(initialPage)

  // Reset page when filters/query change
  useEffect(()=>{ setPage(1) }, [qServico, qCepRaw, price, minRating, hasCNPJ, includesMonitor, sort, onlyCepMatch])
  useEffect(()=>{
    const run = async ()=>{
      const resp = await queryProviders({
        q: qServico,
        price,
        minRating,
        hasCNPJ,
        includesMonitor,
        sort: (['melhor','preco-asc','preco-desc','relevancia'].includes(sort) ? sort as any : 'relevancia'),
        onlyCepMatch,
        qCep: qCepRaw,
        page,
        pageSize: SEARCH_PAGE_SIZE,
      })
      setResults(resp.items)
      setTotal(resp.total)
      setCanPaginate(resp.canPaginate)
    }
    run()
  }, [qServico, qCepRaw, price, minRating, hasCNPJ, includesMonitor, sort, onlyCepMatch, page])

  // Sincroniza 'pagina' na URL
  useEffect(()=>{
    const sp = new URLSearchParams(loc.search)
    const current = sp.get('pagina')
    const should = page > 1 ? String(page) : null
    if((current || null) !== (should || null)){
      if(should) sp.set('pagina', should)
      else sp.delete('pagina')
      navigate({ search: sp.toString() })
    }
  }, [page, loc.search, navigate])

  const exportar = ()=> exportCsv('fornecedores.csv', results.map(f=>({
    id: f.id, nome: f.name, categoria: f.category, preco_a_partir: f.priceFrom, avaliacao: f.rating, reviews: f.ratingCount
  })))

  const highlight = (text: string, term?: string) => {
    const t = term?.trim()
    if(!t) return text
    const lower = text.toLowerCase()
    const tl = t.toLowerCase()
    const out: (string | JSX.Element)[] = []
    let i = 0
    while(true){
      const idx = lower.indexOf(tl, i)
      if(idx === -1){ out.push(text.slice(i)); break }
      if(idx > i) out.push(text.slice(i, idx))
      out.push(<span key={idx} className="hl">{text.slice(idx, idx + tl.length)}</span>)
      i = idx + tl.length
    }
    return <>{out}</>
  }

  // Sincroniza o filtro "Somente quem atende meu CEP" com a URL (?apenasCep=true)
  useEffect(()=>{
    const sp = new URLSearchParams(loc.search)
    if(onlyCepMatch){
      sp.set('apenasCep', 'true')
    } else {
      sp.delete('apenasCep')
    }
    const newSearch = sp.toString() ? `?${sp.toString()}` : ''
    if(newSearch !== loc.search){
      navigate({ search: newSearch }, { replace: true })
    }
  }, [onlyCepMatch])

  // Se não houver CEP válido, desmarca o filtro e limpa da URL
  useEffect(()=>{
    if(!cepEnabled && onlyCepMatch){
      setOnlyCepMatch(false)
    }
  }, [cepEnabled])

  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      <div className="grid grid-lg-2">
        <FiltersSidebar
          minPrice={priceBounds[0]}
          maxPrice={priceBounds[1]}
          price={price}
          setPrice={setPrice}
          minRating={minRating}
          setMinRating={setMinRating}
          hasCNPJ={hasCNPJ}
          setHasCNPJ={setHasCNPJ}
          includesMonitor={includesMonitor}
          setIncludesMonitor={setIncludesMonitor}
          sort={sort}
          setSort={setSort}
          onlyCepMatch={onlyCepMatch}
          setOnlyCepMatch={setOnlyCepMatch}
          cepEnabled={cepEnabled}
        />
        <div className="grid" style={{alignContent:'start'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
            <h1 style={{fontSize:'1.1rem'}}>Resultados ({results.length}{typeof total==='number' ? ` de ${total}` : ''})</h1>
          <div style={{display:'flex', gap:'.4rem', alignItems:'center', flexWrap:'wrap'}}>
            {qCep && qCep.length>=CEP_PREFIX_MIN && <span className="chip">{highlight(`CEP: ${qCepRaw}`, qRaw)}</span>}
            {onlyCepMatch && qCep.length>=CEP_PREFIX_MIN && <span className="chip">{highlight('Filtro: atende meu CEP', qRaw)}</span>}
            {import.meta.env.DEV && (
              <span className="chip" title="Origem dos dados nesta sessão">
                fonte: {getProvidersSource() || 'desconhecida'}
              </span>
            )}
            <button className="btn btn-secondary" onClick={exportar}>Exportar para CSV</button>
            <button className="btn btn-secondary" onClick={doRefresh} disabled={reloading} title="Recarregar lista de fornecedores">
              {reloading ? 'Atualizando…' : 'Atualizar lista'}
            </button>
          </div>
          </div>
          <div className="grid" style={{gap:'.8rem'}}>
            {results.map(f => {
              const exactName = qServico && f.name.toLowerCase() === qServico
              const exactCategory = qServico && f.category.toLowerCase() === qServico
              return <ServiceCard key={f.id} s={f} matchCep={qCep.length>=CEP_PREFIX_MIN && matchCep(f.cepAreas)} query={qRaw} exactName={!!exactName} exactCategory={!!exactCategory} />
            })}
          </div>
          {canPaginate && typeof total==='number' && (
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'1rem'}}>
              <button className="btn btn-secondary" disabled={page<=1} onClick={()=>setPage(p=> Math.max(1, p-1))}>Anterior</button>
              <span style={{color:'var(--color-muted)'}}>Página {page} de {Math.max(1, Math.ceil(total / SEARCH_PAGE_SIZE))}</span>
              <button className="btn btn-secondary" disabled={page>=Math.ceil(total / SEARCH_PAGE_SIZE)} onClick={()=>setPage(p=> p+1)}>Próxima</button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}