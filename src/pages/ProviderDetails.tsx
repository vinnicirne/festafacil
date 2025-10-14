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

  // Painel do Fornecedor: Brinquedos e Estações
  const [brinquedos, setBrinquedos] = useState<string[]>([])
  const [novoBrinquedo, setNovoBrinquedo] = useState('')
  const [estacoes, setEstacoes] = useState<string[]>([])
  const [novaEstacao, setNovaEstacao] = useState('')

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

  // Carrega e persiste catálogo do fornecedor em localStorage
  useEffect(()=>{
    if(!id) return
    const b = localStorage.getItem(`provider:${id}:brinquedos`)
    const e = localStorage.getItem(`provider:${id}:estacoes`)
    if(b) setBrinquedos(JSON.parse(b))
    if(e) setEstacoes(JSON.parse(e))
  }, [id])

  useEffect(()=>{ if(id) localStorage.setItem(`provider:${id}:brinquedos`, JSON.stringify(brinquedos)) }, [brinquedos, id])
  useEffect(()=>{ if(id) localStorage.setItem(`provider:${id}:estacoes`, JSON.stringify(estacoes)) }, [estacoes, id])

  const addBrinquedo = ()=>{
    const v = novoBrinquedo.trim()
    if(!v) return
    if(!brinquedos.includes(v)) setBrinquedos([...brinquedos, v])
    setNovoBrinquedo('')
  }
  const delBrinquedo = (v:string)=> setBrinquedos(brinquedos.filter(x=>x!==v))
  const addEstacao = ()=>{
    const v = novaEstacao.trim()
    if(!v) return
    if(!estacoes.includes(v)) setEstacoes([...estacoes, v])
    setNovaEstacao('')
  }
  const delEstacao = (v:string)=> setEstacoes(estacoes.filter(x=>x!==v))

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

  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      <div className="grid">
        <ImageCarousel images={images} />
        <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
            <div>
              <h1 style={{margin:0}}>{highlight(p.name, qRaw)}</h1>
              <RatingStars value={p.rating} count={p.ratingCount} />
            </div>
            <button className="btn btn-primary" onClick={()=>setOpen(true)}>SOLICITAR ORÇAMENTO / VER DISPONIBILIDADE</button>
          </div>
          <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
            {(exactName || exactCategory) && <span className="chip">{highlight(`Match exato${exactName?': nome':': categoria'}`, qRaw)}</span>}
            <span className="chip">{highlight(`Categoria: ${p.category}`, qRaw)}</span>
            <span className="chip">{highlight(`a partir de ${formatCurrency(p.priceFrom)}`, qRaw)}</span>
            <span className="chip">{highlight(`Raio ${p.radiusKm}km`, qRaw)}</span>
            {p.hasCNPJ && <span className="chip">{highlight('Tem CNPJ', qRaw)}</span>}
            {p.includesMonitor && <span className="chip">{highlight('Inclui Monitor', qRaw)}</span>}
          </div>
        </div>
        <Tabs
          tabs={[
            { key:'descricao', label:'Descrição', content: <p>Serviço profissional na categoria {highlight(p.category, qRaw)}. Equipamentos testados e higienizados. Montagem rápida e segura.</p> },
            { key:'catalogo', label:'Catálogo', content: (
              <div style={{display:'grid', gap:'.8rem'}}>
                <div>
                  <h3 style={{margin:'0 0 .4rem 0'}}>Brinquedos</h3>
                  {brinquedos.length ? (
                    <div style={{display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                      {brinquedos.map(b => <span key={b} className="chip">{highlight(b, qRaw)}</span>)}
                    </div>
                  ) : <small style={{color:'var(--color-muted)'}}>Nenhum brinquedo cadastrado ainda.</small>}
                </div>
                <div>
                  <h3 style={{margin:'0 0 .4rem 0'}}>Estações</h3>
                  {estacoes.length ? (
                    <div style={{display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                      {estacoes.map(e => <span key={e} className="chip">{highlight(e, qRaw)}</span>)}
                    </div>
                  ) : <small style={{color:'var(--color-muted)'}}>Nenhuma estação cadastrada ainda.</small>}
                </div>
              </div>
            ) },
            { key:'pacotes', label:'Pacotes/Preços', content: (
              <ul>
                <li>Básico: {formatCurrency(p.priceFrom)} (2h)</li>
                <li>Padrão: {formatCurrency(p.priceFrom + 200)} (4h)</li>
                <li>Premium: {formatCurrency(p.priceFrom + 500)} (6h + extra)</li>
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
            { key:'politicas', label:'Políticas', content: <p>Cancelamento até 7 dias antes do evento com reembolso integral. Termos de serviço disponíveis mediante solicitação.</p> },
            { key:'painel', label:'Painel do Fornecedor', content: (
              <div className="card" style={{padding:'.8rem', display:'grid', gap:'.8rem'}}>
                <div>
                  <h3 style={{margin:'0 0 .4rem 0'}}>Adicionar Brinquedo</h3>
                  <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
                    <input value={novoBrinquedo} onChange={e=>setNovoBrinquedo(e.target.value)} placeholder="Ex.: Pula-pula grande, Piscina de bolinhas" style={{flex:1, minWidth:220, padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
                    <button className="btn" type="button" onClick={addBrinquedo}>Adicionar</button>
                  </div>
                  {brinquedos.length>0 && (
                    <div style={{marginTop:'.6rem', display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                      {brinquedos.map(b => (
                        <span key={b} className="chip" style={{display:'inline-flex', alignItems:'center', gap:6}}>
                          {b}
                          <button type="button" onClick={()=>delBrinquedo(b)} aria-label={`Remover ${b}`} style={{border:'none', background:'transparent', cursor:'pointer'}}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <h3 style={{margin:'0 0 .4rem 0'}}>Adicionar Estação</h3>
                  <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
                    <input value={novaEstacao} onChange={e=>setNovaEstacao(e.target.value)} placeholder="Ex.: Estação de Pipoca, Algodão Doce" style={{flex:1, minWidth:220, padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
                    <button className="btn" type="button" onClick={addEstacao}>Adicionar</button>
                  </div>
                  {estacoes.length>0 && (
                    <div style={{marginTop:'.6rem', display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                      {estacoes.map(e => (
                        <span key={e} className="chip" style={{display:'inline-flex', alignItems:'center', gap:6}}>
                          {e}
                          <button type="button" onClick={()=>delEstacao(e)} aria-label={`Remover ${e}`} style={{border:'none', background:'transparent', cursor:'pointer'}}>×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <small style={{color:'var(--color-muted)'}}>Os itens ficam salvos apenas neste navegador.</small>
              </div>
            ) },
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