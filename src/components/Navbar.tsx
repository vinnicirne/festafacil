import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { CATEGORIES } from '@/data/categories'
import type { Service } from '@/components/ServiceCard'
import { getProviders } from '@/utils/providersSource'
import { SUGGESTIONS_LIMIT, NAVBAR_SEARCH_DEBOUNCE_MS } from '@/config'
import { cepFromCoords } from '@/utils/reverseGeocode'
import { TargetIcon, UserIcon, CrownIcon, CoinIcon, ChatIcon } from '@/components/icons'
import MobileMenu from './MobileMenu'
import LoginModal from './LoginModal'
import { getStore, onStoreChange } from '@/utils/realtime'
import { getAdminState } from '@/utils/adminStore'
import { getPlanLabel, type ProviderPlan, FESTCOIN_NAME } from '@/utils/saas'
import { getSupabase } from '@/utils/supabase'

export default function Navbar(){
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [loginMode, setLoginMode] = useState<'login'|'reset'>('login')
  const [geoStatus, setGeoStatus] = useState<'idle'|'locating'|'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const dQ = useDebounce(q, NAVBAR_SEARCH_DEBOUNCE_MS)
  const [allProviders, setAllProviders] = useState<Service[]>([])
  useEffect(()=>{ let on=true; getProviders().then(d=>{ if(on) setAllProviders(d) }); return ()=>{ on=false } }, [])
  const isCategory = CATEGORIES.some(c => c.toLowerCase() === q.trim().toLowerCase())
  const isProvider = !isCategory && allProviders.some(p => p.name.toLowerCase() === q.trim().toLowerCase())
  const badge = isCategory ? { text: 'Categoria', kind: 'category' as const } : (isProvider ? { text: 'Fornecedor', kind: 'provider' as const } : null)
  const suggestions = useMemo(()=> {
    const vendorNames = [...allProviders]
      .sort((a,b)=> (b.ratingCount||0) - (a.ratingCount||0))
      .map(p=> p.name)
    return Array.from(new Set([ ...CATEGORIES, ...vendorNames ])).slice(0, SUGGESTIONS_LIMIT)
  }, [allProviders])
  
  // Mantém o input sincronizado com ?servico= quando estiver em /busca
  useEffect(()=>{
    if(pathname !== '/busca') return
    const sp = new URLSearchParams(search)
    const s = sp.get('servico') || ''
    if(s !== q) setQ(s)
  }, [pathname, search])

  // Dá foco automático no input quando entrar em /busca
  useEffect(()=>{
    if(pathname === '/busca'){
      // pequeno atraso para garantir renderização
      setTimeout(()=> {
        const el = inputRef.current
        if(!el) return
        el.focus({ preventScroll: true })
        try { el.select() } catch {}
      }, 0)
    }
  }, [pathname])

  // Atualiza a URL conforme digita (debounce) quando estiver em /busca
  useEffect(()=>{
    if(pathname !== '/busca') return
    const sp = new URLSearchParams(search)
    const trimmed = dQ.trim()
    if(trimmed) sp.set('servico', trimmed); else sp.delete('servico')
    const next = sp.toString() ? `?${sp.toString()}` : ''
    if(next !== search){
      navigate({ pathname: '/busca', search: next }, { replace: true })
    }
  }, [dQ])

  // Atalhos: "/" ou Ctrl/⌘+K para focar/selecionar o campo
  useEffect(()=>{
    const onKey = (e: KeyboardEvent)=>{
      const target = e.target as HTMLElement
      const tag = target?.tagName?.toLowerCase()
      const isEditable = (target as any)?.isContentEditable
      if(tag === 'input' || tag === 'textarea' || isEditable) return
      const ctrlK = e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey)
      if(e.key === '/' || ctrlK){
        e.preventDefault()
        const el = inputRef.current
        if(!el) return
        el.focus({ preventScroll: true })
        try{ el.select() }catch{}
      }
    }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [])

  const locateAndSearch = async ()=>{
    if(!('geolocation' in navigator)) { setGeoStatus('error'); return }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(async pos=>{
      const { latitude, longitude } = pos.coords
      const cep = await cepFromCoords(latitude, longitude)
      if(!cep){ setGeoStatus('error'); return }
      setGeoStatus('idle')
      const sp = new URLSearchParams()
      const trimmed = q.trim()
      if(trimmed) sp.set('servico', trimmed)
      sp.set('cep', cep)
      sp.set('apenasCep', 'true')
      navigate(`/busca?${sp.toString()}`)
    }, ()=>{ setGeoStatus('error') }, { enableHighAccuracy:true, timeout:8000, maximumAge:30000 })
  }
  const isHome = pathname === '/'
  const spGlobal = new URLSearchParams(search)
  const providerIdParam = spGlobal.get('id') || ''
  const isProviderDashboard = pathname.startsWith('/painel/fornecedor')
  const currentProviderId = isProviderDashboard ? (providerIdParam || (allProviders[0]?.id ? String(allProviders[0].id) : '')) : ''
  const currentPlan: ProviderPlan = (isProviderDashboard && currentProviderId)
    ? getStore<ProviderPlan>(`provider:${currentProviderId}:plan`, 'GRATIS')
    : 'GRATIS'
  const planLabel = isProviderDashboard && currentProviderId ? getPlanLabel(currentPlan) : null
  const coinsBalance = isProviderDashboard && currentProviderId ? (getAdminState().coins[currentProviderId] || 0) : null
  const [providerLogged, setProviderLogged] = useState<boolean>(false)
  const [userLogged, setUserLogged] = useState<boolean>(false)
  useEffect(()=>{
    const sb = getSupabase()
    if(!isProviderDashboard){ setProviderLogged(false); return }
    if(!sb){
      try{ setProviderLogged(!!localStorage.getItem('ff:provider')) }catch{ setProviderLogged(false) }
      return
    }
    sb.auth.getSession().then(({ data })=>{
      setProviderLogged(!!data?.session)
    }).catch(()=> setProviderLogged(false))
  }, [isProviderDashboard])

  // Estado de login do usuário (contratante) fora do painel de fornecedor
  useEffect(()=>{
    const sb = getSupabase()
    if(isProviderDashboard){ setUserLogged(false); return }
    if(!sb){
      try{ setUserLogged(!!localStorage.getItem('user:profile')) }catch{ setUserLogged(false) }
      return
    }
    sb.auth.getSession().then(({ data })=>{
      setUserLogged(!!data?.session)
    }).catch(()=> setUserLogged(false))
  }, [isProviderDashboard])

  // Ouve recuperação de senha do Supabase e abre o modal no modo de redefinição
  useEffect(()=>{
    const sb = getSupabase()
    if(!sb) return
    const { data: sub } = sb.auth.onAuthStateChange((event)=>{
      if(event === 'PASSWORD_RECOVERY'){
        setLoginMode('reset')
        setLoginOpen(true)
      }
    })
    return ()=> { sub.subscription.unsubscribe() }
  }, [])

  // Contagem de mensagens não lidas e botão Mensagens
  type ChatMsg = { from:'user'|'vendor', text:string, ts:string }
  const leadKey = (l:any)=> `${String(l?.providerId||'')}:${String(l?.contato||'')}:${String(l?.createdAt||'')}`
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const computeUnread = ()=>{
    let leads:any[] = []
    try{ const raw = localStorage.getItem('leads'); leads = raw? JSON.parse(raw): [] }catch{ leads = [] }
    const total = (leads||[]).reduce((sum,l)=>{
      const k = leadKey(l)
      const msgs = getStore<ChatMsg[]>(`chat:${k}`, [])
      if(isProviderDashboard){
        const last = getStore<string>(`chat:read:vendor:${k}`, '1970-01-01T00:00:00.000Z')
        return sum + msgs.filter(m=> m.from==='user' && Date.parse(m.ts) > Date.parse(last)).length
      } else {
        const last = getStore<string>(`chat:read:user:${k}`, '1970-01-01T00:00:00.000Z')
        return sum + msgs.filter(m=> m.from==='vendor' && Date.parse(m.ts) > Date.parse(last)).length
      }
    }, 0)
    setUnreadCount(total)
  }
  useEffect(()=>{ computeUnread() }, [pathname, search, isProviderDashboard])
  useEffect(()=>{
    const off = onStoreChange((key)=>{
      if(key==='leads' || key.startsWith('chat:') || key.startsWith('chat:read:')) computeUnread()
    })
    return off
  }, [isProviderDashboard])
  return (
    <header className="nav card navbar" style={{position:'sticky', top:0, zIndex:50, backdropFilter:'saturate(1.2) blur(6px)'}}>
      <div className="container navbar-inner">
        <div style={{display:'flex', alignItems:'center', gap:'.6rem'}}>
          <button
            className="btn"
            aria-label="Abrir menu"
            onClick={()=> setMenuOpen(true)}
            style={{padding:'.6rem', display:'inline-flex'}}
          >
            <span aria-hidden>☰</span>
          </button>
          <Link to="/" aria-label="FestaFácil Home" className="navbar-logo" style={{display:'inline-flex', alignItems:'center', gap:'.6rem'}}>
          <span style={{width:36, height:36, borderRadius:8, background:'var(--color-primary)'}}></span>
          <strong style={{fontSize:'1.1rem'}}>FestaFácil</strong>
          </Link>
        </div>
        <nav aria-label="principal" style={{display:'none'}}/>
        <div className="navbar-actions" style={{display:'flex', alignItems:'center', gap:'.5rem', flexWrap:'wrap'}}>
          {isHome ? (
            <>
              <Link to="/auth?role=fornecedor" style={{fontSize:'.98rem', fontWeight:600, color:'#111', textDecoration:'none'}}>Fornecedores</Link>
              <button className="btn btn-primary" onClick={()=>{ setLoginMode('login'); setLoginOpen(true) }} style={{padding:'.4rem .8rem', borderRadius:12, display:'inline-flex', alignItems:'center', gap:'.4rem', textTransform:'none'}}>
                <UserIcon />
                Entrar
              </button>
            </>
          ) : (
          <div className={`search-wrap ${badge ? 'has-badge' : ''}`} role="search" aria-label="Buscar">
            <span className="search-icon" aria-hidden="true">🔎</span>
            <input
              ref={inputRef}
              type="search"
              value={q}
              onChange={e=>{
                const val = e.target.value
                setQ(val)
                const t = val.trim()
                if(t && suggestions.includes(t)){
                  const url = `/busca?servico=${encodeURIComponent(t)}`
                  navigate(url, { replace: pathname === '/busca' })
                }
              }}
              onFocus={(e)=>{ if(e.currentTarget.value) { try { e.currentTarget.select() } catch {} } }}
              onKeyDown={e=>{ if(e.key==='Enter'){ const t = q.trim(); navigate(t? `/busca?servico=${encodeURIComponent(t)}` : '/busca') } if(e.key==='Escape'){ setQ('') } }}
              placeholder="Buscar serviços..."
              aria-label="Buscar serviços"
              autoComplete="off"
              enterKeyHint="search"
              list="navbar-suggestions"
            />
            <button
              type="button"
              className="search-locate"
              aria-label="Usar minha localização"
              title="Usar minha localização"
              onClick={locateAndSearch}
            >{geoStatus==='locating' ? '⏳' : <TargetIcon />}</button>
            {badge && (
              <span className={`search-badge search-badge--${badge.kind}`} aria-hidden="false" aria-label={badge.text}>{badge.text}</span>
            )}
            {q && (
              <button className="search-clear" aria-label="Limpar busca" onClick={()=> setQ('')}>×</button>
            )}
            <datalist id="navbar-suggestions">
              {suggestions.map(v => <option key={v} value={v} />)}
            </datalist>
          </div>
          )}
          {(isProviderDashboard ? providerLogged : userLogged) && (
          <button
            className="btn"
            onClick={()=>{
              if(isProviderDashboard){
                const base = `/painel/fornecedor${currentProviderId ? `?id=${encodeURIComponent(currentProviderId)}` : ''}`
                navigate(`${base}${base.includes('?')? '&':'?'}view=mensagens`)
              } else {
                navigate('/painel/usuario?view=mensagens')
              }
            }}
            aria-label="Abrir mensagens"
            title="Abrir mensagens"
            style={{position:'relative', display:'inline-flex', alignItems:'center', gap:6}}
          >
            <ChatIcon />
            <span>Mensagens</span>
            {unreadCount>0 && (
              <span aria-live="polite" className="chip" style={{position:'absolute', top:-6, right:-6, background:'#ef4444', color:'#fff', padding:'0 .35rem', borderRadius:999, fontSize:'.75rem'}}>{unreadCount}</span>
            )}
          </button>
          )}
          {isProviderDashboard && providerLogged && (
            <div style={{display:'flex', alignItems:'center', gap:'.4rem', flexWrap:'wrap'}}>
              <button
                className={`chip chip--plan-${String(currentPlan).toLowerCase()}`}
                style={{display:'inline-flex', alignItems:'center', gap:6}}
                onClick={()=> navigate(`/painel/fornecedor${currentProviderId ? `?id=${encodeURIComponent(currentProviderId)}&view=planos` : `?view=planos`}`)}
                aria-label="Ver planos"
                title="Ver planos"
              >
                <CrownIcon />
                <span style={{fontSize:'.9rem'}}>{planLabel ? `Plano: ${planLabel}` : 'Plano'}</span>
              </button>
              <button
                className="chip chip--saldo"
                style={{display:'inline-flex', alignItems:'center', gap:6}}
                onClick={()=> navigate(`/painel/fornecedor${currentProviderId ? `?id=${encodeURIComponent(currentProviderId)}&view=moedas` : `?view=moedas`}`)}
                aria-label={`Saldo ${FESTCOIN_NAME}`}
                title={`Saldo ${FESTCOIN_NAME}`}
              >
                <CoinIcon />
                <span style={{fontSize:'.9rem'}}>Saldo: {typeof coinsBalance==='number' ? coinsBalance : '-' } {FESTCOIN_NAME}</span>
              </button>
            </div>
          )}
        </div>
      </div>
      <MobileMenu open={menuOpen} onClose={()=> setMenuOpen(false)} />
      <LoginModal open={loginOpen} onClose={()=> setLoginOpen(false)} mode={loginMode} />
    </header>
  )
}