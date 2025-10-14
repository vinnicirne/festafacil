import { useEffect, useMemo, useState } from 'react'
import { getProviders } from '@/utils/providersSource'
import { getStore, onStoreChange, setStore } from '@/utils/realtime'
import { formatMoney, responseRate, calcCommission, type Transaction, type ProviderPlan } from '@/utils/saas'

export default function ProviderDashboard(){
  const [providers, setProviders] = useState<{id:string, name:string, category:string}[]>([])
  const [providerId, setProviderId] = useState('')
  const [brinquedos, setBrinquedos] = useState<string[]>([])
  const [novoBrinquedo, setNovoBrinquedo] = useState('')
  const [estacoes, setEstacoes] = useState<string[]>([])
  const [novaEstacao, setNovaEstacao] = useState('')

  // Estado para KPIs/Financeiro/Plano
  const [leads, setLeads] = useState<any[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [availabilityUntil, setAvailabilityUntil] = useState<string | null>(null)
  const [plan, setPlan] = useState<ProviderPlan>('GRATIS')
  // Inbox/Chat
  const [selectedLeadIdx, setSelectedLeadIdx] = useState<number | null>(null)
  const [chatText, setChatText] = useState('')
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteAmount, setQuoteAmount] = useState<number>(0)

  useEffect(()=>{ let on=true; getProviders().then(list=>{ if(!on) return; setProviders(list.map(p=>({id:p.id, name:p.name, category:p.category}))) }); return ()=>{ on=false } }, [])

  // Carga inicial de dados do painel
  useEffect(()=>{ try{ const raw = localStorage.getItem('leads'); setLeads(raw? JSON.parse(raw): []) }catch{} }, [])
  useEffect(()=>{ setTransactions(getStore('transactions', [])) }, [])
  useEffect(()=>{ setAvailabilityUntil(getStore('provider:availabilityUntil', null)) }, [])
  useEffect(()=>{ setPlan(getStore('provider:plan', 'GRATIS')) }, [])

  // Sincronização em tempo real
  useEffect(()=>{
    const off = onStoreChange((key)=>{
      if(key==='leads'){
        try{ const raw = localStorage.getItem('leads'); setLeads(raw? JSON.parse(raw): []) }catch{}
      }
      if(key==='transactions') setTransactions(getStore('transactions', []))
      if(key==='provider:availabilityUntil') setAvailabilityUntil(getStore('provider:availabilityUntil', null))
      if(key==='provider:plan') setPlan(getStore('provider:plan', 'GRATIS'))
    })
    return off
  }, [])

  useEffect(()=>{
    if(!providerId) return
    const b = localStorage.getItem(`provider:${providerId}:brinquedos`)
    const e = localStorage.getItem(`provider:${providerId}:estacoes`)
    setBrinquedos(b? JSON.parse(b): [])
    setEstacoes(e? JSON.parse(e): [])
  }, [providerId])

  useEffect(()=>{ if(providerId) localStorage.setItem(`provider:${providerId}:brinquedos`, JSON.stringify(brinquedos)) }, [brinquedos, providerId])
  useEffect(()=>{ if(providerId) localStorage.setItem(`provider:${providerId}:estacoes`, JSON.stringify(estacoes)) }, [estacoes, providerId])

  const addBrinquedo = ()=>{ const v = novoBrinquedo.trim(); if(!v) return; if(!brinquedos.includes(v)) setBrinquedos([...brinquedos, v]); setNovoBrinquedo('') }
  const delBrinquedo = (v:string)=> setBrinquedos(brinquedos.filter(x=>x!==v))
  const addEstacao = ()=>{ const v = novaEstacao.trim(); if(!v) return; if(!estacoes.includes(v)) setEstacoes([...estacoes, v]); setNovaEstacao('') }
  const delEstacao = (v:string)=> setEstacoes(estacoes.filter(x=>x!==v))

  // KPIs
  const newQuotes = leads.filter(l=> !l.respondedAt).length
  const nextEvent = leads
    .map((l:any)=> ({ d: Date.parse(l?.data||''), lead: l }))
    .filter(x=> !isNaN(x.d) && x.d>=Date.now())
    .sort((a,b)=> a.d-b.d)[0]?.lead as any
  const pendingEarnings = transactions
    .filter(t=> t.status==='Aguardando Liberação')
    .reduce((s,t)=> s + (t.net||0), 0)
  const respRate = responseRate(leads as any)

  // Ordenação/Prioridade: não respondidos primeiro
  const sortedLeads = useMemo(()=>{
    const withStatus = (leads||[]).map((l:any, i:number)=> ({...l, _idx:i}))
    return withStatus.sort((a,b)=>{
      const aPrio = a.respondedAt ? 1 : 0
      const bPrio = b.respondedAt ? 1 : 0
      if(aPrio !== bPrio) return aPrio - bPrio
      const ad = a.createdAt ? Date.parse(a.createdAt) : 0
      const bd = b.createdAt ? Date.parse(b.createdAt) : 0
      return bd - ad
    })
  }, [leads])

  type ChatMsg = { from:'user'|'vendor', text:string, ts:string }
  const leadKey = (l:any)=> `${(l.providerId||'')}:${(l.contato||'')}:${(l.createdAt||'')}`
  const getMsgs = (l:any)=> getStore<ChatMsg[]>(`chat:${leadKey(l)}`, [] as ChatMsg[])
  const setMsgs = (l:any, msgs:ChatMsg[])=> setStore(`chat:${leadKey(l)}`, msgs)

  const setLead = (idx:number, updates:any)=>{
    const next = [...leads]
    next[idx] = { ...next[idx], ...updates }
    setLeads(next)
    setStore('leads', next)
  }

  const sendMsg = ()=>{
    if(selectedLeadIdx===null) return
    const text = chatText.trim()
    if(!text) return
    const l = leads[selectedLeadIdx]
    const msgs = getMsgs(l)
    const next: ChatMsg[] = [...msgs, { from:'vendor' as const, text, ts: new Date().toISOString() }]
    setMsgs(l, next)
    setChatText('')
    if(!l.respondedAt) setLead(selectedLeadIdx, { respondedAt: new Date().toISOString() })
  }

  const sendQuote = ()=>{
    if(selectedLeadIdx===null) return
    const l:any = leads[selectedLeadIdx]
    const gross = Number(quoteAmount) || 0
    if(gross<=0) return
    const { commission, net } = calcCommission(gross)
    const tx: Transaction = {
      id: `${Date.now()}:${Math.random().toString(36).slice(2)}`,
      leadId: leadKey(l),
      clientName: l?.nome,
      providerName: l?.providerName,
      eventDate: l?.data,
      gross,
      commission,
      net,
      status: 'Aguardando Liberação',
      createdAt: new Date().toISOString()
    }
    const list = getStore<Transaction[]>('transactions', [])
    setStore('transactions', [...list, tx])
    const paymentLink = `/checkout?lead=${encodeURIComponent(leadKey(l))}`
    setLead(selectedLeadIdx, { quoteAmount: gross, quoteSentAt: new Date().toISOString(), status: 'Orçamento Enviado', paymentLink })
    const msgs = getMsgs(l)
    const quoteMsg: ChatMsg = { from:'vendor', text: `Orçamento enviado: ${formatMoney(gross)} • Comissão: ${formatMoney(commission)} • Líquido: ${formatMoney(net)} • Link: ${paymentLink}`, ts: new Date().toISOString() }
    setMsgs(l, [...msgs, quoteMsg])
    setQuoteOpen(false)
    setQuoteAmount(0)
    if(!l.respondedAt) setLead(selectedLeadIdx, { respondedAt: new Date().toISOString() })
  }

  // Disponibilidade global
  const setUnavailable = (hours:number)=>{
    const until = new Date(Date.now() + hours*60*60*1000).toISOString()
    setAvailabilityUntil(until)
    setStore('provider:availabilityUntil', until)
  }
  const availableNow = ()=>{
    setAvailabilityUntil(null)
    setStore('provider:availabilityUntil', null as any)
  }

  // Plano
  const upgradePlan = ()=>{ setPlan('PREMIUM'); setStore('provider:plan', 'PREMIUM') }

  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      {/* Visão Geral / KPIs */}
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.8rem', background:'#0b1f3f', color:'#fff'}}>
        <h1 style={{margin:0}}>Painel do Fornecedor</h1>
        {plan==='GRATIS' && (
          <div style={{background:'#102a57', padding:'.6rem .8rem', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
            <span>Plano atual: Gratuito. Faça upgrade para desbloquear métricas premium.</span>
            <button className="btn btn-secondary" onClick={upgradePlan}>Fazer upgrade</button>
          </div>
        )}
        <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap', alignItems:'center'}}>
          <span className="chip">Novos Orçamentos: {newQuotes}</span>
          <span className="chip">Ganhos Pendentes: {formatMoney(pendingEarnings||0)}</span>
          <span className="chip">Taxa de Resposta: {respRate}%</span>
          {availabilityUntil ? (
            <span className="chip" style={{background:'#ef4444', color:'#fff'}}>Indisponível até {new Date(availabilityUntil).toLocaleTimeString()}</span>
          ) : (
            <span className="chip" style={{background:'#22c55e', color:'#fff'}}>Disponível</span>
          )}
        </div>
        <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
          <button className="btn" onClick={()=>setUnavailable(1)}>Indisponível 1h</button>
          <button className="btn" onClick={()=>setUnavailable(2)}>2h</button>
          <button className="btn" onClick={()=>setUnavailable(3)}>3h</button>
          {availabilityUntil && <button className="btn btn-secondary" onClick={availableNow}>Voltar a disponível</button>}
        </div>
        {nextEvent && (
          <div className="card" style={{background:'#fff', color:'#000', padding:'.8rem'}}>
            <strong>Próximo Evento</strong>
            <div style={{color:'var(--color-muted)'}}>{nextEvent?.nome || 'Cliente'} • {nextEvent?.data || '-'} • {nextEvent?.cep || '-'}</div>
          </div>
        )}
      </div>

      {/* Catálogo atual */}
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.8rem'}}>
        <h2 style={{margin:0}}>Catálogo</h2>
        <p style={{color:'var(--color-muted)'}}>Gerencie seu catálogo. As alterações ficam salvas neste navegador.</p>

        <label>Escolha o fornecedor
          <select value={providerId} onChange={e=> setProviderId(e.target.value)} style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}>
            <option value="">Selecione...</option>
            {providers.map(p => <option key={p.id} value={p.id}>{p.name} — {p.category}</option>)}
          </select>
        </label>

        {!providerId && <small style={{color:'var(--color-muted)'}}>Selecione um fornecedor para editar o catálogo.</small>}

        {providerId && (
          <div className="grid">
            <div className="card" style={{padding:'.8rem', display:'grid', gap:'.6rem'}}>
              <h3 style={{margin:'0 0 .4rem 0'}}>Brinquedos</h3>
              <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
                <input value={novoBrinquedo} onChange={e=>setNovoBrinquedo(e.target.value)} placeholder="Ex.: Pula-pula grande" style={{flex:1, minWidth:220, padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
                <button className="btn" type="button" onClick={addBrinquedo}>Adicionar</button>
              </div>
              {brinquedos.length>0 ? (
                <div style={{display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                  {brinquedos.map(b => (
                    <span key={b} className="chip" style={{display:'inline-flex', alignItems:'center', gap:6}}>
                      {b}
                      <button type="button" onClick={()=>delBrinquedo(b)} aria-label={`Remover ${b}`} style={{border:'none', background:'transparent', cursor:'pointer'}}>×</button>
                    </span>
                  ))}
                </div>
              ) : <small style={{color:'var(--color-muted)'}}>Nenhum brinquedo cadastrado.</small>}
            </div>

            <div className="card" style={{padding:'.8rem', display:'grid', gap:'.6rem'}}>
              <h3 style={{margin:'0 0 .4rem 0'}}>Estações</h3>
              <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
                <input value={novaEstacao} onChange={e=>setNovaEstacao(e.target.value)} placeholder="Ex.: Estação de Pipoca" style={{flex:1, minWidth:220, padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
                <button className="btn" type="button" onClick={addEstacao}>Adicionar</button>
              </div>
              {estacoes.length>0 ? (
                <div style={{display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                  {estacoes.map(val => (
                    <span key={val} className="chip" style={{display:'inline-flex', alignItems:'center', gap:6}}>
                      {val}
                      <button type="button" onClick={()=>delEstacao(val)} aria-label={`Remover ${val}`} style={{border:'none', background:'transparent', cursor:'pointer'}}>×</button>
                    </span>
                  ))}
                </div>
              ) : <small style={{color:'var(--color-muted)'}}>Nenhuma estação cadastrada.</small>}
            </div>
          </div>
        )}

        <small style={{color:'var(--color-muted)'}}>Dica: as listas aparecem na página do fornecedor correspondente.</small>
      </div>

      {/* Leads e Pedidos */}
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.8rem'}}>
        <h2 style={{margin:0}}>Leads e Pedidos</h2>
        <div className="grid grid-lg-2">
          <div className="card" style={{padding:'.8rem', display:'grid', gap:'.6rem'}}>
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
              <strong>Inbox</strong>
              <small style={{color:'var(--color-muted)'}}>Não respondidos aparecem primeiro</small>
            </div>
            {sortedLeads.length===0 ? (
              <small style={{color:'var(--color-muted)'}}>Nenhum lead até o momento.</small>
            ) : (
              <div style={{display:'grid', gap:'.4rem'}}>
                {sortedLeads.map((l:any)=> (
                  <button key={leadKey(l)} className="chip" onClick={()=> setSelectedLeadIdx(l._idx)} style={{justifyContent:'space-between', display:'flex', background: l.respondedAt? '#fff':'#ffe9e0'}}>
                    <span>{l.nome || 'Cliente'} • {l.data || '-'} • {l.endereco || l.cep || '-'}</span>
                    <span style={{color:'var(--color-muted)'}}>{l.status || (l.respondedAt? 'Em negociação':'Novo')}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="card" style={{padding:'.8rem', display:'grid', gap:'.6rem'}}>
            <strong>Detalhes</strong>
            {selectedLeadIdx===null ? (
              <small style={{color:'var(--color-muted)'}}>Selecione um lead para conversar e enviar orçamento.</small>
            ) : (
              <>
                {(()=>{ const l:any = leads[selectedLeadIdx]; return (
                  <div style={{display:'grid', gap:'.3rem'}}>
                    <div><strong>{l?.nome || 'Cliente'}</strong> <small style={{color:'var(--color-muted)'}}>{l?.contato || ''}</small></div>
                    <div style={{color:'var(--color-muted)'}}>Evento: {l?.data || '-'} • Endereço/CEP: {l?.endereco || l?.cep || '-'}</div>
                    {l?.mensagem && <div style={{whiteSpace:'pre-wrap'}}>{l.mensagem}</div>}
                    {l?.quoteAmount && <div className="chip">Orçamento enviado: {formatMoney(l.quoteAmount)}</div>}
                  </div>
                )})()}

                <div className="card" style={{padding:'.6rem', display:'grid', gap:'.4rem'}}>
                  <div style={{overflow:'auto', maxHeight:220, display:'grid', gap:'.4rem'}}>
                    {getMsgs(leads[selectedLeadIdx]).map((m,i)=> (
                      <div key={i} style={{justifySelf: m.from==='vendor'? 'end':'start', background: m.from==='vendor'? 'var(--color-secondary)':'#f1f6f9', color: m.from==='vendor'? '#fff':'inherit', padding:'.5rem .7rem', borderRadius:12, maxWidth:'80%'}}>
                        {m.text}
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex', gap:'.4rem'}}>
                    <input value={chatText} onChange={e=> setChatText(e.target.value)} placeholder="Escreva sua mensagem" onKeyDown={e=> e.key==='Enter' && sendMsg()} style={{flex:1, padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
                    <button className="btn btn-secondary" onClick={sendMsg}>Enviar</button>
                    <button className="btn" onClick={()=> setQuoteOpen(v=>!v)}>Enviar orçamento</button>
                  </div>
                  {quoteOpen && (
                    <div className="fade-in" style={{display:'grid', gap:'.4rem'}}>
                      <label>Valor bruto (R$)
                        <input type="number" inputMode="decimal" value={String(quoteAmount||'')} onChange={e=> setQuoteAmount(Number(e.target.value))} style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
                      </label>
                      <div style={{display:'flex', gap:'.4rem'}}>
                        <button className="btn btn-primary" onClick={sendQuote}>Gerar link e registrar</button>
                        <button className="btn" onClick={()=>{ setQuoteOpen(false); setQuoteAmount(0) }}>Cancelar</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}