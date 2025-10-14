import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CATEGORIES } from '../data/categories'
import Autocomplete from '../components/Autocomplete'
import { useDebounce } from '../hooks/useDebounce'
import { fetchViaCEP } from '../utils/viacep'
import { HERO_CEP_DEBOUNCE_MS, CEP_PREFIX_MIN, SEARCH_PRICE_MIN_DEFAULT, SEARCH_PRICE_MAX_DEFAULT, MIN_RATING_DEFAULT } from '@/config'
import { cepFromCoords } from '@/utils/reverseGeocode'
import { TargetIcon, SearchIcon } from '@/components/icons'
import Modal from '@/components/Modal'
import ServiceCard, { type Service } from '@/components/ServiceCard'
import { queryProviders } from '@/utils/providersSource'

export default function HeroSearch(){
  const navigate = useNavigate()
  const [servico, setServico] = useState('')
  const [data, setData] = useState('')
  const [cep, setCep] = useState('')
  const dCep = useDebounce(cep, HERO_CEP_DEBOUNCE_MS)
  const [cepStatus, setCepStatus] = useState<{state:'idle'|'loading'|'ok'|'error', info?: string}>({state:'idle'})
  const [geoStatus, setGeoStatus] = useState<'idle'|'locating'|'error'>('idle')
  const [openModal, setOpenModal] = useState(false)
  const [loadingModal, setLoadingModal] = useState(false)
  const [providers, setProviders] = useState<Service[]>([])
  const [modalError, setModalError] = useState<string>('')

  const onCepChange = (v: string) => {
    const digits = v.replace(/\D/g, '').slice(0, 8)
    const masked = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5)}` : digits
    setCep(masked)
  }

  const submit = (e?: React.FormEvent)=>{
    e?.preventDefault()
    const p = new URLSearchParams()
    if(servico) p.set('servico', servico)
    if(data) p.set('data', data)
    if(cep) p.set('cep', cep)
    navigate(`/busca?${p.toString()}`)
  }

  const locateAndSearch = async ()=>{
    if(!('geolocation' in navigator)){
      setGeoStatus('error')
      return
    }
    setGeoStatus('locating')
    navigator.geolocation.getCurrentPosition(async pos=>{
      const { latitude, longitude } = pos.coords
      const foundCep = await cepFromCoords(latitude, longitude)
      if(foundCep){
        setCep(foundCep)
        setGeoStatus('idle')
        const p = new URLSearchParams()
        if(servico) p.set('servico', servico)
        if(data) p.set('data', data)
        p.set('cep', foundCep)
        p.set('apenasCep', 'true')
        navigate(`/busca?${p.toString()}`)
      } else {
        setGeoStatus('error')
      }
    }, ()=>{
      setGeoStatus('error')
    }, { enableHighAccuracy:true, timeout: 8000, maximumAge: 30000 })
  }

  useEffect(()=>{
    const onlyDigits = dCep.replace(/\D/g,'')
    if(!onlyDigits) { setCepStatus({state:'idle'}); return }
    if(onlyDigits.length<8){ setCepStatus({state:'error', info:'CEP incompleto'}) ; return }
    let active = true
    setCepStatus({state:'loading'})
    fetchViaCEP(dCep).then(res=>{
      if(!active) return
      if(res) setCepStatus({state:'ok', info: `${res.localidade}-${res.uf}`})
      else setCepStatus({state:'error', info:'CEP inválido'})
    })
    return ()=>{ active=false }
  }, [dCep])

  const matchCep = (cepAreas: string[]) => {
    const clean = cep.replace(/\D/g,'')
    if(clean.length < CEP_PREFIX_MIN) return false
    const q5 = clean.slice(0, CEP_PREFIX_MIN)
    return cepAreas.some(a => a.replace(/\D/g,'').slice(0, CEP_PREFIX_MIN) === q5)
  }

  const openSuppliersModal = async ()=>{
    setOpenModal(true)
    await runModalSearch()
  }

  const runModalSearch = async () => {
    const clean = cep.replace(/\D/g,'')
    setModalError('')
    if(clean.length < CEP_PREFIX_MIN){
      setModalError('Informe um CEP válido para ver fornecedores próximos.')
      setProviders([])
      return
    }
    setLoadingModal(true)
    try{
      const resp = await queryProviders({
        q: servico.trim().toLowerCase(),
        price: [SEARCH_PRICE_MIN_DEFAULT, SEARCH_PRICE_MAX_DEFAULT],
        minRating: MIN_RATING_DEFAULT,
        hasCNPJ: false,
        includesMonitor: false,
        sort: 'relevancia',
        onlyCepMatch: true,
        qCep: cep,
        page: 1,
        pageSize: 8,
      })
      setProviders(resp.items)
      if(resp.items.length === 0){
        setModalError('Nenhum fornecedor encontrado para o CEP informado.')
      }
    } catch(e){
      setModalError('Não foi possível carregar os fornecedores agora.')
    } finally{
      setLoadingModal(false)
    }
  }

  const locateForModal = async () => {
    if(!('geolocation' in navigator)){
      setModalError('Geolocalização não disponível no navegador.')
      return
    }
    setLoadingModal(true)
    navigator.geolocation.getCurrentPosition(async pos => {
      const cepFound = await cepFromCoords(pos.coords.latitude, pos.coords.longitude)
      if(cepFound){
        onCepChange(cepFound)
        await runModalSearch()
      } else {
        setModalError('Não foi possível obter seu CEP pela localização.')
        setLoadingModal(false)
      }
    }, ()=>{
      setModalError('Não foi possível acessar sua localização.')
      setLoadingModal(false)
    }, { enableHighAccuracy:true, timeout:8000, maximumAge:30000 })
  }

  return (
    <section className="section" style={{paddingTop:'3rem', paddingBottom:'3rem'}}>
      <div className="card" style={{overflow:'hidden'}}>
        <div style={{background:'linear-gradient(120deg, #fff 0%, #f7fdff 50%, #e7fbff 100%)'}}>
          <div className="container" style={{display:'grid', gap:'1rem', padding:'1.2rem', justifyItems:'center', textAlign:'center'}}>
            <div>
              <h1 style={{fontSize:'clamp(1.8rem, 3vw + 1rem, 2.6rem)', lineHeight:1.1, fontWeight:800}}>A plataforma que conecta <span style={{color:'var(--color-primary)'}}>Sua Festa</span> com os melhores serviços.</h1>
              <p style={{color:'var(--color-muted)'}}>Planeje, compare e agende fornecedores em minutos.</p>
              <div style={{display:'grid', justifyItems:'center', gap:'.4rem'}}>
                <button type="button" onClick={openSuppliersModal} style={{display:'inline-flex', alignItems:'center', gap:'.4rem', background:'#111', color:'#fff', padding:'.35rem .8rem', borderRadius:999, fontSize:'.78rem', marginTop:'.3rem', cursor:'pointer', border:0}}>CONTRATAÇÃO SEM COMPLICAÇÃO</button>
                <a href="/sobre#como-funciona" style={{fontSize:'.9rem', color:'var(--color-muted)', textDecoration:'underline'}}>Como funciona?</a>
              </div>
            </div>
            <div aria-hidden="true" style={{height:160, width:'100%', maxWidth:520, display:'grid', placeItems:'center'}}>
              <div style={{width:140, height:140, borderRadius:'50%', background:'radial-gradient(circle at 30% 30%, #ffe6f2, #e8f7ff 60%, #eaf6ff 100%)', display:'grid', placeItems:'center', boxShadow:'var(--shadow-md)'}}>
                <span style={{fontSize:'2rem'}}>🎈🎂🤹</span>
              </div>
            </div>
            <form onSubmit={submit} className="card" style={{display:'grid', gap:'.6rem', padding:'.9rem', boxShadow:'var(--shadow-md)', width:'min(640px, 100%)', margin:'0 auto', textAlign:'left'}}>
              <label style={{display:'grid', gap:'.3rem'}}>
                <span className="sr-only">Serviço</span>
                <Autocomplete value={servico} onChange={setServico} options={CATEGORIES} placeholder="Serviço (ex: Brinquedos)" ariaLabel="Serviço" />
              </label>
              <label style={{display:'grid', gap:'.3rem'}}>
                <span className="sr-only">Data do Evento</span>
                <input type="date" value={data} onChange={e=>setData(e.target.value)} aria-label="Data do Evento" required style={{border:'1px solid #e6edf1', borderRadius:12, padding:'.8rem'}}/>
              </label>
              <label style={{display:'grid', gap:'.3rem'}}>
                <span className="sr-only">CEP</span>
                <div style={{position:'relative'}}>
                  <input inputMode="numeric" pattern="\\d{5}-?\\d{3}" value={cep} onChange={e=>onCepChange(e.target.value)} placeholder="CEP (ex: 01234-567)" aria-label="CEP" required style={{width:'100%', border:'1px solid #e6edf1', borderRadius:999, padding:'.8rem 5.6rem .8rem 1rem'}}/>
                  <button type="button" onClick={locateAndSearch} aria-label="Usar minha localização" title="Usar minha localização" style={{position:'absolute', right:'3.2rem', top:'50%', transform:'translateY(-50%)', width:34, height:34, borderRadius:999, border:0, background:'transparent', cursor:'pointer', display:'grid', placeItems:'center'}}>
                    {geoStatus==='locating' ? <span style={{fontSize:12}}>⏳</span> : <TargetIcon />}
                  </button>
                  <button type="submit" aria-label="Buscar" title="Buscar" style={{position:'absolute', right:'.6rem', top:'50%', transform:'translateY(-50%)', width:34, height:34, borderRadius:999, border:0, background:'#2f3b46', color:'#fff', cursor:'pointer', display:'grid', placeItems:'center'}}>
                    <SearchIcon />
                  </button>
                </div>
                {cepStatus.state==='loading' && <small style={{color:'var(--color-muted)'}}>Verificando CEP...</small>}
                {cepStatus.state==='ok' && <small style={{color:'#0a8'}}>Atendendo: {cepStatus.info}</small>}
                {cepStatus.state==='error' && <small style={{color:'#c00'}}>{cepStatus.info}</small>}
                {geoStatus==='error' && <small style={{color:'#c00'}}>Não foi possível usar sua localização.</small>}
              </label>
              <button className="btn btn-primary" type="submit" style={{fontSize:'1rem'}}>Buscar fornecedores</button>
            </form>
            
          </div>
        </div>
      </div>
      <SuppliersModal 
        open={openModal}
        onClose={()=>setOpenModal(false)} 
        providers={providers} 
        loading={loadingModal} 
        error={modalError} 
        cep={cep} 
        servico={servico}
        onCepChange={onCepChange}
        onSearch={runModalSearch}
        onLocate={locateForModal}
      />
    </section>
  )
}

// Modal de fornecedores próximos
// Mantido no mesmo arquivo para simplicidade do fluxo do herói
function SuppliersModal({ open, onClose, providers, loading, error, cep, servico, onCepChange, onSearch, onLocate }: { open:boolean; onClose:()=>void; providers: Service[]; loading:boolean; error?: string; cep: string; servico: string; onCepChange: (v:string)=>void; onSearch: ()=>void; onLocate: ()=>void }){
  const navigate = useNavigate()
  return (
    <Modal open={open} onClose={onClose} title="Fornecedores próximos">
      <div style={{display:'grid', gap:'.8rem'}}>
        <div style={{display:'grid', gap:'.6rem'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
            <div style={{flex:1, minWidth:240}}>
              <label style={{display:'grid', gap:'.3rem'}}>
                <span className="sr-only">CEP</span>
                <div style={{position:'relative'}}>
                  <input inputMode="numeric" pattern="\\d{5}-?\\d{3}" value={cep} onChange={e=>onCepChange(e.target.value)} placeholder="CEP (ex: 01234-567)" aria-label="CEP" style={{width:'100%', border:'1px solid #e6edf1', borderRadius:999, padding:'.6rem 6.2rem .6rem 1rem'}}/>
                  <button type="button" onClick={onLocate} aria-label="Usar minha localização" title="Usar minha localização" style={{position:'absolute', right:'3.8rem', top:'50%', transform:'translateY(-50%)', width:32, height:32, borderRadius:999, border:0, background:'transparent', cursor:'pointer', display:'grid', placeItems:'center'}}>
                    <TargetIcon />
                  </button>
                  <button type="button" onClick={onSearch} aria-label="Buscar" title="Buscar" style={{position:'absolute', right:'.6rem', top:'50%', transform:'translateY(-50%)', width:32, height:32, borderRadius:999, border:0, background:'#2f3b46', color:'#fff', cursor:'pointer', display:'grid', placeItems:'center'}}>
                    <SearchIcon />
                  </button>
                </div>
              </label>
            </div>
            <button className="btn btn-secondary" onClick={()=>{
              const sp = new URLSearchParams()
              if(servico) sp.set('servico', servico)
              if(cep) sp.set('cep', cep)
              sp.set('apenasCep', 'true')
              navigate(`/busca?${sp.toString()}`)
              onClose()
            }}>Ver todos</button>
          </div>
          {servico && <div><span className="chip">Serviço: {servico}</span></div>}
        </div>
        {error && <div className="card" style={{padding:'.8rem', background:'#fff9f1', color:'#a53'}}>{error}</div>}
        {loading && <div className="loader">Carregando fornecedores…</div>}
        {!loading && providers.length>0 && (
          <div className="grid" style={{gap:'.8rem'}}>
            {providers.map(p => (
              <ServiceCard key={p.id} s={p} matchCep={true} query={servico} />
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}