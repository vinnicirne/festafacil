import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getProviders } from '@/utils/providersSource'
import { getStore, onStoreChange, setStore } from '@/utils/realtime'
import { formatMoney, responseRate, calcCommission, type Transaction, type ProviderPlan, PLAN_CONFIG, FESTCOIN_NAME, getPlanLabel, shouldStartNewCycle } from '@/utils/saas'
import { adjustCoins, getAdminState, upsertOrder } from '@/utils/adminStore'
import { createMpPreference, openCheckout } from '@/utils/payments'
import { CATEGORIES } from '@/data/categories'
import { CoinIcon } from '@/components/icons'
import { signOut } from '@/utils/auth'

export default function ProviderDashboard(){
  const location = useLocation()
  const navigate = useNavigate()
  const [providers, setProviders] = useState<{id:string, name:string, category:string}[]>([])
  const [providerId, setProviderId] = useState('')
  // Seção de catálogo (Brinquedos/Estações) removida por não ser funcional

  // Estado para KPIs/Financeiro/Plano
  const [leads, setLeads] = useState<any[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [availabilityUntil, setAvailabilityUntil] = useState<string | null>(null)
  const [plan, setPlan] = useState<ProviderPlan>('GRATIS')
  const [freebiesLeft, setFreebiesLeft] = useState<number>(0)
  const [cycleStart, setCycleStart] = useState<string | null>(null)
  // Inbox/Chat
  const [selectedLeadIdx, setSelectedLeadIdx] = useState<number | null>(null)
  const [chatText, setChatText] = useState('')

  const doLogout = async ()=>{
    try{
      await signOut()
      navigate('/auth?role=fornecedor&mode=login')
    }catch(err){
      alert('Falha ao sair: ' + (err as Error)?.message)
    }
  }
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteAmount, setQuoteAmount] = useState<number>(0)
  const [directLink, setDirectLink] = useState<boolean>(false)
  const [showPlanEditor, setShowPlanEditor] = useState<boolean>(false)

  // Serviços cadastrados com categoria e preço
  type ProviderService = { id:string; category:string; name:string; details:string; priceFrom:number; createdAt:string; pending?:boolean; photo?:string }
  const [services, setServices] = useState<ProviderService[]>([])
  const [selectedCat, setSelectedCat] = useState<string>('')
  const [pendingCat, setPendingCat] = useState<string>('')
  const [srvName, setSrvName] = useState<string>('')
  const [srvDetails, setSrvDetails] = useState<string>('')
  const [srvPhotoDataUrl, setSrvPhotoDataUrl] = useState<string>('')
  const [srvPhotoErr, setSrvPhotoErr] = useState<string>('')
  // Edição de poster (foto) de serviços existentes
  const [editingPosterFor, setEditingPosterFor] = useState<string | null>(null)
  const [editPhotoDataUrl, setEditPhotoDataUrl] = useState<string>('')
  const [editPhotoErr, setEditPhotoErr] = useState<string>('')

  useEffect(()=>{ let on=true; getProviders().then(list=>{ if(!on) return; setProviders(list.map(p=>({id:p.id, name:p.name, category:p.category}))) }); return ()=>{ on=false } }, [])

  // Auto-seleção: usa ?id na URL se existir; senão, escolhe o primeiro da lista
  useEffect(()=>{
    try{
      const sp = new URLSearchParams(window.location.search)
      const idParam = sp.get('id')
      if(idParam && providers.some(p=> String(p.id)===String(idParam))){
        if(providerId!==String(idParam)) setProviderId(String(idParam))
        return
      }
      if(!providerId && providers.length>0){
        setProviderId(String(providers[0].id))
      }
    }catch{ /* noop */ }
  }, [providers, providerId])

  // Carga inicial de dados do painel
  useEffect(()=>{ try{ const raw = localStorage.getItem('leads'); setLeads(raw? JSON.parse(raw): []) }catch{} }, [])
  useEffect(()=>{ setTransactions(getStore('transactions', [])) }, [])
  useEffect(()=>{ setAvailabilityUntil(getStore('provider:availabilityUntil', null)) }, [])

  // Sincronização em tempo real
  useEffect(()=>{
    const off = onStoreChange((key)=>{
      if(key==='leads'){
        try{ const raw = localStorage.getItem('leads'); setLeads(raw? JSON.parse(raw): []) }catch{}
      }
      if(key==='transactions') setTransactions(getStore('transactions', []))
      if(key==='provider:availabilityUntil') setAvailabilityUntil(getStore('provider:availabilityUntil', null))
    })
    return off
  }, [])

  useEffect(()=>{
    if(!providerId) return
    // Seção de catálogo removida
  }, [providerId])
  

  // Serviços: carregar e persistir
  useEffect(()=>{
    if(!providerId) return
    try{
      const raw = localStorage.getItem(`provider:${providerId}:services`)
      setServices(raw? JSON.parse(raw): [])
    }catch{ setServices([]) }
  }, [providerId])
  useEffect(()=>{ if(providerId) try{ localStorage.setItem(`provider:${providerId}:services`, JSON.stringify(services)) }catch{} }, [services, providerId])

  // Plano por fornecedor + ciclo mensal
  useEffect(()=>{
    if(!providerId) return
    const storedPlan = getStore<ProviderPlan>(`provider:${providerId}:plan`, 'GRATIS')
    setPlan(storedPlan)
    const storedCycle = getStore<string | null>(`provider:${providerId}:cycleStart`, null)
    setCycleStart(storedCycle)
    const cfg = PLAN_CONFIG[storedPlan]
    const fb = getStore<number>(`provider:${providerId}:freebiesLeft`, cfg.bonusLeadsPerMonth)
    setFreebiesLeft(fb)
    // Verifica e inicia ciclo novo com créditos automáticos
    const currentProvider = providers.find(p=> String(p.id)===String(providerId))
    if(shouldStartNewCycle(storedCycle || undefined)){
      const nowIso = new Date().toISOString()
      setCycleStart(nowIso)
      setStore(`provider:${providerId}:cycleStart`, nowIso)
      setFreebiesLeft(cfg.bonusLeadsPerMonth)
      setStore(`provider:${providerId}:freebiesLeft`, cfg.bonusLeadsPerMonth)
      if(cfg.monthlyCoins>0 && currentProvider){
        adjustCoins(String(providerId), String(currentProvider.name), cfg.monthlyCoins, `Crédito mensal do plano ${getPlanLabel(storedPlan)}`)
      }
    }
  }, [providerId, providers])

  // Navegação via querystring: view=planos|moedas
  useEffect(()=>{
    const sp = new URLSearchParams(location.search)
    const view = sp.get('view') || ''
    if(view === 'planos'){
      setShowPlanEditor(true)
      setTimeout(()=>{ try{ document.getElementById('plan-section')?.scrollIntoView({ behavior:'smooth', block:'start' }) }catch{} }, 0)
    } else if(view === 'moedas'){
      setTimeout(()=>{ try{ document.getElementById('coins-section')?.scrollIntoView({ behavior:'smooth', block:'start' }) }catch{} }, 0)
    }
  }, [location.search])

  // Seção de catálogo removida

  const [srvPrice, setSrvPrice] = useState<string>('')

  const addService = ()=>{
    const baseCat = selectedCat
    const cat = baseCat==='Outros' ? pendingCat.trim() : baseCat
    const nm = srvName.trim()
    const det = srvDetails.trim()
    const priceNum = Number((srvPrice||'').replace(/[,]/g,'.'))
    if(!cat){ alert('Selecione uma categoria ou informe sua sugestão.'); return }
    if(!nm){ alert('Informe o nome do serviço.'); return }
    if(det.length < 6){ alert('Descreva melhor seu serviço (mín. 6 caracteres).'); return }
    if(!(priceNum>0)){ alert('Informe um preço válido (R$).'); return }
    const entry: ProviderService = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      category: cat,
      name: nm,
      details: det,
      priceFrom: priceNum,
      createdAt: new Date().toISOString(),
      photo: srvPhotoDataUrl || undefined
    }
    setServices([entry, ...services])
    setSrvName('')
    setSrvDetails('')
    setSrvPrice('')
    setSrvPhotoDataUrl('')
    setSrvPhotoErr('')
  }
  const removeService = (id:string)=> setServices(services.filter(s=> s.id!==id))
  const startEditPoster = (id:string)=>{ setEditingPosterFor(id); setEditPhotoDataUrl(''); setEditPhotoErr('') }
  const cancelEditPoster = ()=>{ setEditingPosterFor(null); setEditPhotoDataUrl(''); setEditPhotoErr('') }
  const savePoster = ()=>{
    if(!editingPosterFor) return
    const next = services.map(s=> s.id===editingPosterFor ? { ...s, photo: editPhotoDataUrl || s.photo } : s)
    setServices(next)
    setEditingPosterFor(null)
    setEditPhotoDataUrl('')
    setEditPhotoErr('')
  }

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
    const { commission, net, rate } = calcCommission(gross, plan, { directLink })
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
    const quoteMsg: ChatMsg = { from:'vendor', text: `Orçamento enviado: ${formatMoney(gross)} • Comissão: ${formatMoney(commission)} (${(rate*100).toFixed(0)}%) • Líquido: ${formatMoney(net)} • Link: ${paymentLink}${directLink?' • Link Direto':''}`, ts: new Date().toISOString() }
    setMsgs(l, [...msgs, quoteMsg])
    setQuoteOpen(false)
    setQuoteAmount(0)
    if(!l.respondedAt) setLead(selectedLeadIdx, { respondedAt: new Date().toISOString() })
  }

  // Fechar pedido: registra ordem no AdminState e libera transação
  const closeOrder = ()=>{
    if(selectedLeadIdx===null) return
    const l:any = leads[selectedLeadIdx]
    const gross = Number(l?.quoteAmount) || 0
    if(!(gross>0)) { alert('Envie um orçamento antes de fechar o pedido.'); return }
    const { rate } = calcCommission(gross, plan, { directLink: !!l?.directLink })
    const currentProvider = providers.find(p=> String(p.id)===String(providerId))
    if(!providerId || !currentProvider){ alert('Fornecedor inválido. Selecione novamente.'); return }
    // Registrar pedido no AdminState
    upsertOrder({
      id: `ord_${Math.random().toString(36).slice(2)}_${Date.now()}`,
      providerId: String(providerId),
      providerName: String(currentProvider.name),
      clientName: String(l?.nome||'Cliente'),
      totalBRL: gross,
      commissionPct: rate,
      date: String(l?.data || new Date().toISOString()),
      status: 'fechado'
    })
    // Liberar transação vinculada ao lead (se existir)
    const list = getStore<Transaction[]>('transactions', [])
    const nextList = list.map(t=> t.leadId===leadKey(l) ? { ...t, status: 'Liberado/Pago' } : t)
    setStore('transactions', nextList)
    // Atualizar lead
    setLead(selectedLeadIdx, { status: 'Pedido Fechado', closedAt: new Date().toISOString() })
    const msgs = getMsgs(l)
    setMsgs(l, [...msgs, { from:'vendor', text: `Pedido fechado em ${new Date().toLocaleString('pt-BR')}.`, ts: new Date().toISOString() }])
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
  const changePlan = (next: ProviderPlan)=>{
    if(!providerId){ alert('Selecione um fornecedor primeiro.'); return }
    setPlan(next)
    setStore(`provider:${providerId}:plan`, next)
    // Reinicia ciclo ao mudar plano (crédito imediato do mês)
    const cfg = PLAN_CONFIG[next]
    const nowIso = new Date().toISOString()
    setCycleStart(nowIso)
    setStore(`provider:${providerId}:cycleStart`, nowIso)
    setFreebiesLeft(cfg.bonusLeadsPerMonth)
    setStore(`provider:${providerId}:freebiesLeft`, cfg.bonusLeadsPerMonth)
    const currentProvider = providers.find(p=> String(p.id)===String(providerId))
    if(cfg.monthlyCoins>0 && currentProvider){
      adjustCoins(String(providerId), String(currentProvider.name), cfg.monthlyCoins, `Crédito inicial do plano ${getPlanLabel(next)}`)
    }
    alert(`Plano atualizado para ${getPlanLabel(next)}. Benefícios aplicados.`)
  }

  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      {/* Visão Geral / KPIs */}
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.8rem'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
          <h1 style={{margin:0}}>Painel do Fornecedor</h1>
          <button className="btn btn-secondary" onClick={doLogout}>Sair</button>
        </div>
        {/* Chips de plano e saldo já aparecem no topo (Navbar). Removendo duplicados aqui para evitar redundância visual. */}
        <div id="plan-section" className="card" style={{background:'#f7fbff', padding:'1rem 1.2rem', borderRadius:12}}>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat__label">Bônus disponíveis</div>
              <div className="stat__value">{freebiesLeft}</div>
              <div className="stat__caption">de {PLAN_CONFIG[plan].bonusLeadsPerMonth}/mês</div>
            </div>
            <div className="stat stat--coins">
              <div className="stat__label">Custo de lead</div>
              <div className="stat__value"><CoinIcon /> {PLAN_CONFIG[plan].leadCostCoins} {FESTCOIN_NAME}</div>
            </div>
            <div className="stat">
              <div className="stat__label">Comissão Gateway</div>
              <div className="stat__value">{(PLAN_CONFIG[plan].commissionRate*100).toFixed(0)}%</div>
            </div>
            <div className="stat">
              <div className="stat__label">Novos Orçamentos</div>
              <div className="stat__value">{newQuotes}</div>
            </div>
            <div className="stat">
              <div className="stat__label">Ganhos Pendentes</div>
              <div className="stat__value">{formatMoney(pendingEarnings||0)}</div>
            </div>
            <div className="stat">
              <div className="stat__label">Taxa de Resposta</div>
              <div className="stat__value">{respRate}%</div>
            </div>
          </div>
          {showPlanEditor && (
            <div className="card" style={{padding:'.4rem .6rem', display:'grid', gap:'.4rem', marginTop:'.6rem'}}>
              <small style={{color:'var(--color-muted)'}}>Selecione um plano</small>
              <div className="grid" style={{gridTemplateColumns:'1fr', gap:'.4rem'}}>
                {(['GRATIS','START','PROFISSIONAL'] as ProviderPlan[]).map(p => (
                  <label key={p} style={{display:'flex', alignItems:'center', gap:'.6rem'}}>
                    <input type="radio" name="plan" checked={plan===p} onChange={()=> changePlan(p)} />
                    <span>{getPlanLabel(p)} — {PLAN_CONFIG[p].monthlyCoins} {FESTCOIN_NAME}/mês</span>
                  </label>
                ))}
              </div>
              <div style={{display:'flex', gap:'.4rem', justifyContent:'end'}}>
                <button className="btn" onClick={()=> setShowPlanEditor(false)}>Fechar</button>
              </div>
            </div>
          )}
        </div>
        {providerId && (getAdminState().coins[providerId]||0)===0 && (
          <div className="card" style={{padding:'.8rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', background:'#fff7f5'}}>
            <div>
              <strong>Seu saldo de {FESTCOIN_NAME} está zerado</strong>
              <div style={{color:'var(--color-muted)'}}>Recarregue para desbloquear leads e manter suas negociações ativas.</div>
            </div>
            <button className="btn btn-primary" onClick={()=>{
              try{ document.getElementById('coins-section')?.scrollIntoView({ behavior:'smooth', block:'start' }) }catch{}
            }}>Recarregar agora</button>
          </div>
        )}
        <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap', alignItems:'center'}}>
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

      {/* Serviços do fornecedor */}
      <div id="servicos" className="card" style={{padding:'1rem', display:'grid', gap:'.8rem'}}>
        <h2 style={{margin:0}}>Cadastrar meus serviços</h2>
        <p style={{color:'var(--color-muted)'}}>Adicione os serviços que você oferece para aparecer nas buscas e detalhar seu catálogo.</p>
        <div className="grid" style={{gap:'.8rem', alignItems:'start', gridTemplateColumns:'1fr'}}>
          <div className="card auth-form" style={{padding:'1rem', display:'grid', gap:'.9rem', boxShadow:'var(--shadow-md)'}}>
            <div style={{display:'grid', alignItems:'start', gap:'.4rem'}}>
              <strong style={{fontSize:'1.05rem'}}>Cadastro de Serviço</strong>
              {(selectedCat && (selectedCat!=='Outros' || (pendingCat||'').trim())) && (
                <span className="chip" aria-label="Categoria selecionada" style={{maxWidth:'100%', whiteSpace:'normal', fontSize:'1rem', padding:'.55rem .9rem'}}>{selectedCat==='Outros' ? (pendingCat||'Nova categoria') : selectedCat}</span>
              )}
            </div>
            <label>Categoria do serviço</label>
            <select value={selectedCat} onChange={e=>{ const v=e.target.value; setSelectedCat(v); if(v!=='Outros'){ setPendingCat('') } }}>
              <option value="">Selecione…</option>
              {CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
              <option value="Outros">Outros…</option>
            </select>
            {selectedCat==='Outros' && (
              <div style={{marginTop:'.4rem'}}>
                <label>Descreva a nova categoria</label>
                <input value={pendingCat} onChange={e=> setPendingCat(e.target.value)} placeholder="Ex.: Personagens vivos, Carrinhos gourmet..." />
                <small style={{color:'var(--color-muted)'}}>A categoria será usada imediatamente no seu serviço.</small>
              </div>
            )}
            {(selectedCat && (selectedCat!=='Outros' || (pendingCat||'').trim())) && (
              <>
                <div style={{display:'grid', gap:'.6rem', gridTemplateColumns:'minmax(200px, 1fr) minmax(140px, 220px)'}}>
                  <div>
                    <label>Nome do serviço</label>
                    <input value={srvName} onChange={e=> setSrvName(e.target.value)} placeholder="Ex.: Pula-pula gigante, Maquiagem artística VIP" />
                    <small style={{color:'var(--color-muted)'}}>Use um nome claro e comercial.</small>
                  </div>
                  <div>
                    <label>Preço a partir (R$)</label>
                    <input type="number" inputMode="decimal" step="0.01" min={0} value={srvPrice} onChange={e=> setSrvPrice(e.target.value)} placeholder="Ex.: 150" />
                    <div style={{display:'flex', justifyContent:'space-between'}}>
                      <small style={{color:'var(--color-muted)'}}>Valor base do serviço; pode variar por orçamento.</small>
                      {Number(String(srvPrice).replace(/[,]/g,'.'))>0 && (
                        <small className="chip" aria-live="polite">{formatMoney(Number(String(srvPrice).replace(/[,]/g,'.')))}</small>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  <label>Foto do serviço (opcional)</label>
                  <input type="file" accept="image/*" onChange={e=>{ const file = (e.target as HTMLInputElement).files?.[0]; setSrvPhotoErr(''); if(!file){ setSrvPhotoDataUrl(''); return; } if(file.size > 1.5*1024*1024){ setSrvPhotoErr('Imagem acima de 1.5MB. Escolha outra.'); return } const reader = new FileReader(); reader.onload = ()=> setSrvPhotoDataUrl(String(reader.result||'')); reader.readAsDataURL(file); }} />
                  {srvPhotoErr && <small style={{color:'var(--color-danger)'}} role="alert">{srvPhotoErr}</small>}
                  {srvPhotoDataUrl && (
                    <div style={{display:'grid', gap:'.4rem', marginTop:'.4rem'}}>
                      <img src={srvPhotoDataUrl} alt={`Foto do serviço ${srvName || selectedCat}`} style={{width:'100%', maxHeight:160, objectFit:'cover', borderRadius:12, border:'1px solid #e6edf1'}} />
                      <div style={{display:'flex', gap:'.4rem'}}>
                        <button className="btn" onClick={()=>{ setSrvPhotoDataUrl(''); setSrvPhotoErr('') }}>Remover foto</button>
                      </div>
                    </div>
                  )}
                  <small style={{color:'var(--color-muted)'}}>PNG/JPG até 1.5MB; usada nas buscas e detalhe.</small>
                </div>
                <div>
                  <label>Detalhes do serviço</label>
                  <textarea value={srvDetails} onChange={e=> setSrvDetails(e.target.value)} rows={4} maxLength={500} placeholder="Diferenciais, capacidade, duração, faixas de preço, observações" />
                  <div style={{display:'flex', justifyContent:'space-between'}}>
                    <small style={{color:'var(--color-muted)'}}>Dê detalhes suficientes para fechar negócios.</small>
                    <small style={{color:'var(--color-muted)'}}>{srvDetails.length}/500</small>
                  </div>
                </div>
                <div>
                  <button className="btn btn-primary" style={{width:'100%'}} onClick={addService} disabled={!srvName.trim() || srvDetails.trim().length<6 || !(Number((srvPrice||'').replace(/[,]/g,'.'))>0)}>Cadastrar serviço</button>
                  {(()=>{ const missingName = !srvName.trim(); const priceNum = Number((srvPrice||'').replace(/[,]/g,'.')); const missingPrice = !(priceNum>0); const detLen = srvDetails.trim().length; const missingDetails = detLen < 6; const msgs:string[] = []; if(missingName) msgs.push('nome'); if(missingPrice) msgs.push('preço'); if(missingDetails) msgs.push(`detalhes (+${Math.max(0, 6-detLen)})`); return msgs.length? <small style={{color:'var(--color-muted)', display:'block', marginTop:'.3rem'}}>Falta: {msgs.join(', ')}</small> : null })()}
                </div>
              </>
            )}
          </div>
          <div className="card" style={{padding:'1rem', display:'grid', gap:'.8rem', boxShadow:'var(--shadow-sm)'}}>
            <div style={{display:'grid', gap:'.4rem'}}>
              <strong style={{fontSize:'1.05rem'}}>Meus serviços</strong>
              <span className="chip" style={{maxWidth:'100%', whiteSpace:'normal'}}>Lista pública exibida nas buscas</span>
            </div>
            {services.length===0 ? (
              <div className="card" style={{padding:'1rem', textAlign:'center', background:'#f7fbff'}}>
                <div style={{fontSize:'1.6rem'}}>🎯</div>
                <div style={{marginTop:'.4rem'}}>Você ainda não possui serviços cadastrados.</div>
                <small style={{color:'var(--color-muted)'}}>Use o formulário ao lado para cadastrar.</small>
              </div>
            ) : (
              <div className="grid" style={{gap:'.6rem', gridTemplateColumns:'repeat(3, minmax(240px, 1fr))'}}>
                {services.map(s=> (
                  <article key={s.id} className="card fade-in" style={{padding:'.8rem', display:'grid', gap:'.5rem'}}>
                    {s.photo && (
                      <img src={s.photo} alt={`Foto de ${s.name}`} style={{width:'100%', height:160, objectFit:'cover', borderRadius:12, border:'1px solid #e6edf1'}} />
                    )}
                    <header style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
                      <div style={{display:'grid', alignItems:'start', gap:'.4rem', gridTemplateColumns:'1fr'}}>
                        <span className="chip" style={{justifySelf:'stretch', display:'block', width:'100%', maxWidth:'100%'}}>{s.name}</span>
                        <span className="chip" style={{justifySelf:'stretch', display:'block', width:'100%', maxWidth:'100%'}}>{s.category}</span>
                        {typeof s.priceFrom==='number' && s.priceFrom>0 && (
                          <span className="chip" style={{justifySelf:'stretch', display:'block', width:'100%', maxWidth:'100%'}}>a partir de {formatMoney(s.priceFrom)}</span>
                        )}
                        {s.pending && <span className="chip" style={{background:'#f59e0b', color:'#fff', justifySelf:'stretch', display:'block', width:'100%', maxWidth:'100%'}}>Categoria pendente</span>}
                      </div>
                      <div style={{display:'flex', gap:'.4rem'}}>
                        <button className="btn" onClick={()=> startEditPoster(s.id)}>Editar poster</button>
                        <button className="btn btn-secondary" onClick={()=> removeService(s.id)}>Remover</button>
                      </div>
                    </header>
                    {editingPosterFor===s.id && (
                      <div className="card" style={{padding:'.6rem', display:'grid', gap:'.5rem', background:'#f7fbff'}}>
                        <div style={{display:'grid', gap:'.3rem'}}>
                          <label>Atualizar poster (foto)</label>
                          <input type="file" accept="image/*" onChange={e=>{
                            const file = (e.target as HTMLInputElement).files?.[0]
                            setEditPhotoErr('')
                            if(!file){ setEditPhotoDataUrl(''); return }
                            if(file.size > 1.5*1024*1024){ setEditPhotoErr('Imagem acima de 1.5MB. Escolha outra.'); return }
                            const reader = new FileReader()
                            reader.onload = ()=> setEditPhotoDataUrl(String(reader.result||''))
                            reader.readAsDataURL(file)
                          }} />
                          {editPhotoErr && <small style={{color:'var(--color-danger)'}} role="alert">{editPhotoErr}</small>}
                          {(editPhotoDataUrl || s.photo) && (
                            <img src={editPhotoDataUrl || s.photo || ''} alt={`Poster de ${s.name}`} style={{width:'100%', maxHeight:180, objectFit:'cover', borderRadius:12, border:'1px solid #e6edf1'}} />
                          )}
                        </div>
                        <div style={{display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                          <button className="btn btn-primary" disabled={!editPhotoDataUrl} onClick={savePoster}>Salvar</button>
                          <button className="btn" onClick={cancelEditPoster}>Cancelar</button>
                        </div>
                        <small style={{color:'var(--color-muted)'}}>PNG/JPG até 1.5MB. A imagem será usada nas buscas e no detalhe.</small>
                      </div>
                    )}
                    <div style={{color:'var(--color-muted)'}}>{s.details}</div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seção "Brinquedos e Estações" removida por não ser funcional */}

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
                    <div>
                      <strong>{l?.nome || 'Cliente'}</strong>
                      <small style={{color:'var(--color-muted)', marginLeft:6}}>
                        {l?.unlocked ? (l?.contato || '') : 'contato oculto • desbloqueie o lead'}
                      </small>
                    </div>
                    <div style={{color:'var(--color-muted)'}}>Evento: {l?.data || '-'} • Endereço/CEP: {l?.endereco || l?.cep || '-'}</div>
                    {l?.mensagem && <div style={{whiteSpace:'pre-wrap'}}>{l.mensagem}</div>}
                    {l?.quoteAmount && (
                      <div className="chip" style={{display:'inline-flex', alignItems:'center', gap:8}}>
                        <span>Orçamento enviado: {formatMoney(l.quoteAmount)}</span>
                      </div>
                    )}
                    {l?.paymentLink && (
                      <div style={{display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                        <button className="btn btn-secondary" onClick={()=> window.open(String(l.paymentLink), '_blank')}>Abrir checkout</button>
                        <button className="btn" onClick={()=>{ try{ navigator.clipboard.writeText(String(l.paymentLink)); alert('Link copiado!') }catch{ alert('Não foi possível copiar o link.') } }}>Copiar link</button>
                      </div>
                    )}
                    <div style={{display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                      <button className="btn btn-primary" disabled={!l?.quoteAmount || !!l?.closedAt} onClick={closeOrder}>Fechar pedido</button>
                      {l?.closedAt && <span className="chip">Fechado em {new Date(String(l.closedAt)).toLocaleString('pt-BR')}</span>}
                    </div>
                    {!l?.unlocked && (
                      <div className="card" style={{padding:'.6rem', display:'grid', gap:'.4rem', background:'#f7fbff'}}>
                        <strong>Desbloquear lead</strong>
                        <div style={{display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                          {(()=>{ const fbLeft = getStore(`provider:${providerId}:freebiesLeft`, PLAN_CONFIG[plan].bonusLeadsPerMonth);
                            return <>
                          <span className="chip">Bônus disponíveis: {fbLeft}</span>
                          <span className="chip" style={{display:'inline-flex', alignItems:'center', gap:6}}><CoinIcon /> Custo: {PLAN_CONFIG[plan].leadCostCoins} {FESTCOIN_NAME}</span>
                              <span className="chip chip--saldo" style={{display:'inline-flex', alignItems:'center', gap:6}}><CoinIcon /> Saldo: {getAdminState().coins[providerId] || 0} {FESTCOIN_NAME}</span>
                            </>
                          })()}
                        </div>
                        <div style={{display:'flex', gap:'.4rem', flexWrap:'wrap'}}>
                          <button className="btn" disabled={getStore(`provider:${providerId}:freebiesLeft`, PLAN_CONFIG[plan].bonusLeadsPerMonth)<=0 || !providerId} onClick={()=>{
                            if(!providerId) { alert('Selecione um fornecedor.'); return }
                            const next = [...leads]
                            next[selectedLeadIdx] = { ...next[selectedLeadIdx], unlocked: true }
                            setLeads(next)
                            setStore('leads', next)
                            const current = getStore(`provider:${providerId}:freebiesLeft`, PLAN_CONFIG[plan].bonusLeadsPerMonth)
                            const fb = Math.max(0, current - 1)
                            setStore(`provider:${providerId}:freebiesLeft`, fb)
                          }}>Usar bônus</button>
                          <button className="btn btn-primary" disabled={(getAdminState().coins[providerId]||0) < PLAN_CONFIG[plan].leadCostCoins || !providerId} onClick={()=>{
                            if(!providerId) { alert('Selecione um fornecedor.'); return }
                            const currentProvider = providers.find(p=> String(p.id)===String(providerId))
                            const cost = PLAN_CONFIG[plan].leadCostCoins
                            adjustCoins(String(providerId), String(currentProvider?.name||providerId), -cost, 'Compra de lead')
                            const next = [...leads]
                            next[selectedLeadIdx] = { ...next[selectedLeadIdx], unlocked: true }
                            setLeads(next)
                            setStore('leads', next)
                          }}>Comprar com {FESTCOIN_NAME}</button>
                        </div>
                        {((getAdminState().coins[providerId]||0) < PLAN_CONFIG[plan].leadCostCoins) && (
                          <small style={{color:'var(--color-muted)'}}>Saldo insuficiente. Compre {FESTCOIN_NAME} no painel abaixo.</small>
                        )}
                      </div>
                    )}
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
                      {PLAN_CONFIG[plan].directLinkNoCommission && (
                        <label style={{display:'flex', alignItems:'center', gap:'.4rem'}}>
                          <input type="checkbox" checked={directLink} onChange={e=> setDirectLink(e.target.checked)} /> Link Direto (0% comissão)
                        </label>
                      )}
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

      {/* Moedas – Compra Avulsa de FestCoins */}
      <div id="coins-section" className="card" style={{padding:'1rem', display:'grid', gap:'.8rem'}}>
        <h2 style={{margin:0}}>Moedas – Comprar {FESTCOIN_NAME}</h2>
        <p style={{color:'var(--color-muted)'}}>Adquira pacotes avulsos para desbloquear leads e impulsionar suas negociações.</p>
        {!providerId ? (
          <small style={{color:'var(--color-muted)'}}>Carregando fornecedor…</small>
        ) : (
          <div className="grid" style={{gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:'.6rem'}}>
            {getAdminState().coinPackages.map(pkg => (
              <div key={pkg.id} className="card" style={{padding:'.8rem', display:'grid', gap:'.5rem'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <strong>Pacote {pkg.name}</strong>
                  <span className="chip">R$ {pkg.priceBRL.toFixed(2)}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{opacity:.8, display:'inline-flex', alignItems:'center', gap:6}}><CoinIcon /> {pkg.coins} {FESTCOIN_NAME}</span>
                  <button className="btn btn-primary" onClick={async ()=>{
                    try{
                      const currentProvider = providers.find(p=> String(p.id)===String(providerId))
                      if(!currentProvider){ alert('Fornecedor inválido. Selecione novamente.'); return }
                      const backBase = window.location.origin
                      const externalRef = JSON.stringify({ providerId: String(providerId), providerName: String(currentProvider.name), packageId: pkg.id })
                      const pref = await createMpPreference({
                        items: [{ title: `Pacote ${pkg.name} – ${pkg.coins} ${FESTCOIN_NAME}`, quantity: 1, unit_price: Number(pkg.priceBRL.toFixed(2)), currency_id: 'BRL' }],
                        external_reference: externalRef,
                        back_urls: {
                          success: `${backBase}/checkout/success?redirect=provider`,
                          failure: `${backBase}/painel/fornecedor`,
                          pending: `${backBase}/painel/fornecedor`
                        },
                        auto_return: 'approved',
                        metadata: { coins: pkg.coins, providerId }
                      })
                      openCheckout(pref.init_point, pref.sandbox_init_point)
                    } catch(err){
                      alert('Falha ao iniciar checkout: ' + (err as Error)?.message)
                    }
                  }}>Pagar com Mercado Pago</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}