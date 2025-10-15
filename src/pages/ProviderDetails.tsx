import { useParams, useNavigate, useLocation } from 'react-router-dom'
import type { Service } from '@/components/ServiceCard'
import { getProviderById } from '@/utils/providersSource'
import ImageCarousel from '@/components/ImageCarousel'
import Tabs from '@/components/Tabs'
import RatingStars from '@/components/RatingStars'
import Modal from '@/components/Modal'
import ChatBox from '@/components/ChatBox'
import { useEffect, useMemo, useState } from 'react'
import { formatCurrency } from '@/utils/format'
import { isValidCEP, isValidPhone } from '@/utils/validators'
import { useDebounce } from '@/hooks/useDebounce'
import { fetchViaCEP } from '@/utils/viacep'
import { CEP_FULL_LENGTH, PROVIDER_CEP_DEBOUNCE_MS } from '@/config'
import { SUGGESTION_TRUNCATE_LIMIT } from '@/config'
import { getStore } from '@/utils/realtime'
import { PLAN_CONFIG, type ProviderPlan } from '@/utils/saas'
import { CrownIcon } from '@/components/icons'

export default function ProviderDetails(){
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const sp = new URLSearchParams(location.search)
  const dateFromSearch = sp.get('data') || ''
  const qRaw = sp.get('servico') || ''
  const q = qRaw.toLowerCase()
  const [p, setP] = useState<Service | null>(null)
  useEffect(()=>{ if(!id) return; let on = true; getProviderById(id).then(v=>{ if(on) setP(v) }); return ()=>{ on=false } }, [id])
  const [open, setOpen] = useState(false)
  const [lead, setLead] = useState(()=>{
    let nome = ''
    let contato = ''
    try{ const p = localStorage.getItem('user:profile'); if(p){ const obj = JSON.parse(p); nome = obj?.nome||''; contato = obj?.contato||'' } }catch{}
    return { nome, contato, data: dateFromSearch, cep:'', endereco:'', mensagem:'' }
  })
  const dCep = useDebounce(lead.cep, PROVIDER_CEP_DEBOUNCE_MS)
  const [cepInfo, setCepInfo] = useState<{state:'idle'|'loading'|'ok'|'error', info?: string}>({state:'idle'})
  const [cepSuggestion, setCepSuggestion] = useState('')
  const [enderecoTouched, setEnderecoTouched] = useState(false)
  const [enderecoAutoFilled, setEnderecoAutoFilled] = useState(false)
  const sugDisplay = useMemo(()=>{
    const s = cepSuggestion || ''
    if(s.length <= SUGGESTION_TRUNCATE_LIMIT) return s
    return s.slice(0, SUGGESTION_TRUNCATE_LIMIT).trimEnd() + '…'
  }, [cepSuggestion])
  const canSubmit = lead.nome && isValidPhone(lead.contato) && (lead.data) && (lead.endereco) && isValidCEP(lead.cep)

  // Removido: estados de catálogo e painel do fornecedor

  useEffect(()=>{
    const only = dCep.replace(/\D/g,'')
    if(!only){ setCepInfo({state:'idle'}); return }
    if(only.length<CEP_FULL_LENGTH){ setCepInfo({state:'error', info:'CEP incompleto'}); return }
    let active = true
    setCepInfo({state:'loading'})
    fetchViaCEP(dCep).then(res=>{
      if(!active) return
      if(res) {
        setCepInfo({state:'ok', info: `${res.localidade}-${res.uf}`})
        const sug = [res.logradouro, res.bairro].filter(Boolean).join(', ') + (res.localidade? ` - ${res.localidade}/${res.uf}`:'')
        setCepSuggestion(sug.trim())
        if(!enderecoTouched && !lead.endereco) {
          setLead(prev=> ({...prev, endereco: sug.trim()}))
          setEnderecoAutoFilled(true)
        }
      }
      else setCepInfo({state:'error', info:'CEP inválido'})
    })
    return ()=>{ active=false }
  }, [dCep])

  // Removido: efeitos e manipuladores de catálogo

  if(!p) return <section className="section"><div className="loader">Carregando fornecedor...</div></section>

  const images = [p.mainImage, p.mainImage+"&1", p.mainImage+"&2"]
  const exactName = !!(q && p.name.toLowerCase() === q)
  const exactCategory = !!(q && p.category.toLowerCase() === q)
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
  const plan = getStore<ProviderPlan>(`provider:${p.id}:plan`, 'GRATIS')
  const hasPromo = typeof p.promoPercent==='number' && p.promoPercent>0
  const finalPrice = hasPromo ? (p.priceFrom * (1 - (p.promoPercent||0)/100)) : p.priceFrom
  const calcPromo = (x:number) => hasPromo ? (x * (1 - (p.promoPercent||0)/100)) : x
  const showPromoBadge = (!!(p.promoLabel && p.promoLabel.trim())) || (typeof p.promoPercent==='number' && p.promoPercent>0)

  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      <div className="grid">
        <ImageCarousel images={images} />
        <div className="card" style={{padding:'1rem', display:'grid', gap:'clamp(.5rem, .9vw, .8rem)'}}>
          <div className="provider-header" style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
            <div>
              <h1 className="provider-title" style={{margin:0, display:'inline-flex', alignItems:'center', gap:'.5rem'}}>
                {highlight(p.name, qRaw)}
                {showPromoBadge && (
                  <span className="chip chip--promo">{p.promoLabel ? p.promoLabel : `Promo ${p.promoPercent}%`}</span>
                )}
              </h1>
              <div style={{marginTop:'clamp(.25rem, .6vw, .45rem)'}}>
                <RatingStars value={p.rating} count={p.ratingCount} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={()=>setOpen(true)}>SOLICITAR ORÇAMENTO / VER DISPONIBILIDADE</button>
          </div>
          <div style={{display:'flex', gap:'clamp(.5rem, 1.2vw, .8rem)', flexWrap:'wrap'}}>
            {PLAN_CONFIG[plan].premiumBadge && (
              <span className="chip" style={{display:'inline-flex', alignItems:'center', gap:6}}>
                <CrownIcon /> Premium
              </span>
            )}
            {(exactName || exactCategory) && <span className="chip">{highlight(`Match exato${exactName?': nome':': categoria'}`, qRaw)}</span>}
            <span className="chip">{highlight(`Categoria: ${p.category}`, qRaw)}</span>
            {hasPromo ? (
              <>
                <span className="chip" style={{textDecoration:'line-through', opacity:.7}}>de {formatCurrency(p.priceFrom)}</span>
                <span className="chip chip--promo">por {formatCurrency(finalPrice)}</span>
              </>
            ) : (
              <span className="chip">{highlight(`a partir de ${formatCurrency(p.priceFrom)}`, qRaw)}</span>
            )}
            {typeof p.promoPercent==='number' && p.promoPercent>0 && (
              <span className="chip chip--promo" title={`Promoção ${p.promoPercent}%`}>Promo {p.promoPercent}%</span>
            )}
            {p.promoLabel && (
              <span className="chip chip--promo">{highlight(p.promoLabel, qRaw)}</span>
            )}
            <span className="chip">{highlight(`Raio ${p.radiusKm}km`, qRaw)}</span>
            {p.hasCNPJ && <span className="chip">{highlight('Tem CNPJ', qRaw)}</span>}
            {p.includesMonitor && <span className="chip">{highlight('Inclui Monitor', qRaw)}</span>}
          </div>
        </div>
        <Tabs
          tabs={[
            { key:'descricao', label:'Descrição', content: <p>Serviço profissional na categoria {highlight(p.category, qRaw)}. Equipamentos testados e higienizados. Montagem rápida e segura.</p> },
            { key:'pacotes', label:(
              <span style={{display:'inline-flex', alignItems:'center', gap:'.35rem'}}>
                Pacotes/Preços
                {hasPromo && (
                  <span style={{background:'var(--color-promo-bg)', borderRadius:8, padding:'0 .35rem', fontSize:'.85em'}}>
                    {p.promoLabel ? p.promoLabel : `Promo ${p.promoPercent}%`}
                  </span>
                )}
              </span>
            ), content: (
              <ul style={{display:'grid', gap:'.4rem'}}>
                <li>
                  Básico: {hasPromo ? (
                    <>
                      <span style={{textDecoration:'line-through', opacity:.7}}>{formatCurrency(p.priceFrom)}</span>
                      <strong style={{marginLeft:'.35rem', background:'var(--color-promo-bg)', borderRadius:8, padding:'0 .4rem'}}>por {formatCurrency(calcPromo(p.priceFrom))}</strong>
                    </>
                  ) : (
                    formatCurrency(p.priceFrom)
                  )} (2h)
                </li>
                <li>
                  Padrão: {hasPromo ? (
                    <>
                      <span style={{textDecoration:'line-through', opacity:.7}}>{formatCurrency(p.priceFrom + 200)}</span>
                      <strong style={{marginLeft:'.35rem', background:'var(--color-promo-bg)', borderRadius:8, padding:'0 .4rem'}}>por {formatCurrency(calcPromo(p.priceFrom + 200))}</strong>
                    </>
                  ) : (
                    formatCurrency(p.priceFrom + 200)
                  )} (4h)
                </li>
                <li>
                  Premium: {hasPromo ? (
                    <>
                      <span style={{textDecoration:'line-through', opacity:.7}}>{formatCurrency(p.priceFrom + 500)}</span>
                      <strong style={{marginLeft:'.35rem', background:'var(--color-promo-bg)', borderRadius:8, padding:'0 .4rem'}}>por {formatCurrency(calcPromo(p.priceFrom + 500))}</strong>
                    </>
                  ) : (
                    formatCurrency(p.priceFrom + 500)
                  )} (6h + extra)
                </li>
              </ul>) },
            { key:'disponibilidade', label:'Disponibilidade', content: (
              <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:6}}>
                {Array.from({length:21}).map((_,i)=> <div key={i} style={{aspectRatio:'1/1', borderRadius:10, background: i%5===0? '#f9d7d7':'#d6f7df'}}></div>)}
              </div>) },
            { key:'avaliacoes', label:'Avaliações', content: (
              <div className="grid">
                <div className="card" style={{padding:'.8rem'}}>Excelente serviço! Voltarei a contratar. ⭐⭐⭐⭐⭐</div>
                <div className="card" style={{padding:'.8rem'}}>Equipe atenciosa e pontual. ⭐⭐⭐⭐</div>
              </div>) },
          ]}
        />
      </div>

      <Modal open={open} onClose={()=>setOpen(false)} side title="Solicitar orçamento">
        <form onSubmit={(e)=>{
          e.preventDefault();
          if(!canSubmit) return;
          try{ localStorage.setItem('user:profile', JSON.stringify({ nome: lead.nome, contato: lead.contato })) }catch{}
          try{
            const now = new Date().toISOString()
            const entry = { ...lead, providerId: id, providerName: p?.name, createdAt: now }
            const raw = localStorage.getItem('leads')
            const arr = raw? JSON.parse(raw): []
            arr.push(entry)
            localStorage.setItem('leads', JSON.stringify(arr))
          }catch{}
          navigate('/checkout')
        }} style={{display:'grid', gap:'.7rem'}}>
          <label>Nome
            <input required value={lead.nome} onChange={e=>setLead({...lead, nome:e.target.value})} style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/>
          </label>
          <label>Contato (WhatsApp)
            <input required value={lead.contato} onChange={e=>setLead({...lead, contato:e.target.value})} placeholder="(11) 9 1234-5678" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/>
            {!isValidPhone(lead.contato) && lead.contato && <small style={{color:'#c00'}}>Telefone inválido</small>}
          </label>
          <label>Data do evento
            <input type="date" required value={lead.data} onChange={e=>setLead({...lead, data:e.target.value})} style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/>
          </label>
          <label>CEP
            <input required inputMode="numeric" placeholder="01234-567" value={lead.cep} onChange={e=>setLead({...lead, cep:e.target.value})} style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/>
            {cepInfo.state==='loading' && <small style={{color:'var(--color-muted)'}}>Verificando CEP...</small>}
            {cepInfo.state==='ok' && <small style={{color:'#0a8'}}>Localidade: {highlight(cepInfo.info || '', qRaw)}</small>}
            {cepInfo.state==='error' && <small style={{color:'#c00'}}>{cepInfo.info}</small>}
          </label>
          <label>Endereço do evento (CEP na linha)
            <input required value={lead.endereco} onChange={e=>{ setEnderecoTouched(true); setEnderecoAutoFilled(false); setLead({...lead, endereco:e.target.value}) }} placeholder="Rua Exemplo, 123 - 01234-567" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/>
            {lead.endereco && !lead.endereco.match(/\d{5}-?\d{3}/) && <small style={{color:'#c00'}}>CEP ausente ou inválido</small>}
            {cepSuggestion && cepInfo.state==='ok' && (
              <div style={{marginTop:'.4rem', display:'flex', alignItems:'center', gap:'.5rem'}}>
                <small style={{color:'var(--color-muted)'}}>Sugestão: {highlight(cepSuggestion, qRaw)}</small>
                <button
                  type="button"
                  className="chip"
                  aria-label={`Usar sugestão ${cepSuggestion}`}
                  title={`Usar: ${cepSuggestion}`}
                  onClick={()=>{ setLead({...lead, endereco: cepSuggestion}); setEnderecoTouched(true); setEnderecoAutoFilled(true) }}
                >
                  {highlight(`Usar: ${sugDisplay}`, qRaw)}
                </button>
              </div>
            )}
            {enderecoAutoFilled && lead.endereco && qRaw && (
              <div style={{marginTop:'.3rem'}}>
                <small style={{color:'var(--color-muted)'}}>Endereço preenchido: {highlight(lead.endereco, qRaw)}</small>
              </div>
            )}
          </label>
          <label>Mensagem
            <textarea value={lead.mensagem} onChange={e=>setLead({...lead, mensagem:e.target.value})} rows={3} placeholder="Conte detalhes importantes (horário, local, tamanho da festa, etc.)" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/>
          </label>
          <button className="btn btn-primary" disabled={!canSubmit}>Enviar e abrir chat</button>
        </form>
        <div style={{marginTop:'1rem'}}>
          <h3>Chat com o fornecedor</h3>
          <ChatBox />
        </div>
      </Modal>
    </section>
  )
}