import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '@/utils/auth'
import Modal from '@/components/Modal'
import RatingStars from '@/components/RatingStars'
import { CoinIcon, ChatIcon } from '@/components/icons'
import { addReview, getAdminState, saveAdminState } from '@/utils/adminStore'
import { getStore, setStore, onStoreChange } from '@/utils/realtime'

type Profile = { nome: string; contato: string }
type Lead = { providerId?: string; providerName?: string; nome: string; contato: string; data: string; cep: string; endereco: string; mensagem?: string; createdAt?: string; respondedAt?: string; status?: string; quoteAmount?: number; paymentLink?: string; closedAt?: string; reviewedAt?: string }
type ChatMsg = { from:'user'|'vendor', text:string, ts:string }

export default function UserDashboard(){
  const location = useLocation()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<Profile>({ nome: '', contato: '' })
  const [leads, setLeads] = useState<Lead[]>([])
  const [adminOrders, setAdminOrders] = useState(getAdminState().orders || [])
  const [adminReviews, setAdminReviews] = useState(getAdminState().reviews || [])
  const [openChatFor, setOpenChatFor] = useState<number|null>(null)
  const [chatText, setChatText] = useState('')
  const [chatTick, setChatTick] = useState(0)
  const [inboxOpen, setInboxOpen] = useState(false)
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({})
  const [reviewOpen, setReviewOpen] = useState(false)
  const [reviewLeadIdx, setReviewLeadIdx] = useState<number|null>(null)
  const [reviewRating, setReviewRating] = useState<number>(5)
  const [reviewText, setReviewText] = useState('')
  const [ceps, setCeps] = useState<{ casa?: string; festa?: string }>({})

  useEffect(()=>{
    try{
      const p = localStorage.getItem('user:profile')
      if(p) setProfile(JSON.parse(p))
    }catch{}
    try{
      const rawC = localStorage.getItem('user:ceps')
      if(rawC) setCeps(JSON.parse(rawC))
    }catch{}
    try{
      const l = localStorage.getItem('leads')
      setLeads(l? JSON.parse(l): [])
    }catch{}
    try{
      const st = getAdminState()
      setAdminOrders(st.orders || [])
      setAdminReviews(st.reviews || [])
    }catch{}
    const off = onStoreChange((key)=>{
      if(key==='leads'){
        try{ const l = localStorage.getItem('leads'); setLeads(l? JSON.parse(l): []) }catch{}
      }
      if(key==='ff:admin:state'){
        try{ const st = getAdminState(); setAdminOrders(st.orders || []); setAdminReviews(st.reviews || []) }catch{}
      }
      if(key.startsWith('chat:')) setChatTick(t=> t+1)
      if(key.startsWith('typing:vendor:')){
        const k = key.slice('typing:vendor:'.length)
        setTypingMap(prev=> ({...prev, [k]: true}))
        setTimeout(()=>{ setTypingMap(prev=> ({...prev, [k]: false})) }, 1500)
      }
    })
    return off
  }, [])

  const saveProfile = ()=>{
    localStorage.setItem('user:profile', JSON.stringify(profile))
  }
  const saveCeps = ()=>{
    localStorage.setItem('user:ceps', JSON.stringify(ceps))
  }

  const doLogout = async ()=>{
    try{
      await signOut()
      navigate('/')
    }catch(err){
      alert('Falha ao sair: ' + (err as Error)?.message)
    }
  }

  const removeLead = (idx: number)=>{
    const next = leads.filter((_,i)=> i!==idx)
    setLeads(next)
    localStorage.setItem('leads', JSON.stringify(next))
  }

  const clearLeads = ()=>{
    setLeads([])
    localStorage.setItem('leads', JSON.stringify([]))
  }

  const sortedLeads = useMemo(()=>{
    return [...leads].sort((a,b)=> {
      const ad = a.createdAt? Date.parse(a.createdAt): 0
      const bd = b.createdAt? Date.parse(b.createdAt): 0
      return bd - ad
    })
  }, [leads])

  const upcoming = useMemo(()=>{
    const future = leads.filter(l=> l.data && Date.parse(l.data) > Date.now())
    return future.sort((a,b)=> Date.parse(a.data) - Date.parse(b.data))[0]
  }, [leads])

  const contractsPaid = useMemo(()=> adminOrders.filter(o=> o.status==='fechado' && (!profile.nome || o.clientName===profile.nome)).length, [adminOrders, profile.nome])
  const pendingQuotes = useMemo(()=> leads.filter(l=> !l.respondedAt).length, [leads])
  const nextPayments = useMemo(()=> adminOrders.filter(o=> o.status==='pendente' && (!profile.nome || o.clientName===profile.nome)).length, [adminOrders, profile.nome])

  const statusForLead = (l: Lead)=>{
    const order = adminOrders.find(o=> String(o.providerId)===String(l.providerId) && (!profile.nome || o.clientName===profile.nome))
    const past = l.data && Date.parse(l.data) < Date.now()
    if(order?.status==='fechado') return past? 'Concluído' : 'Contratado'
    if(l.paymentLink && order?.status==='pendente') return 'Aguardando Pagamento'
    if(l.respondedAt) return 'Em Negociação'
    return 'Em Aberto'
  }

  const leadKey = (l: Lead)=> `${String(l.providerId||'')}:${String(l.contato||'')}:${String(l.createdAt||'')}`
  const getMsgs = (l: Lead): ChatMsg[]=> getStore<ChatMsg[]>(`chat:${leadKey(l)}`, [])
  const setMsgs = (l: Lead, msgs: ChatMsg[])=> setStore(`chat:${leadKey(l)}`, msgs)
  const setReadNow = (l: Lead)=> setStore(`chat:read:user:${leadKey(l)}`, new Date().toISOString())
  const unreadForLead = (l: Lead)=>{
    const last = getStore<string>(`chat:read:user:${leadKey(l)}`, '1970-01-01T00:00:00.000Z')
    const msgs = getMsgs(l)
    return msgs.filter(m=> m.from==='vendor' && Date.parse(m.ts) > Date.parse(last)).length
  }
  const sendMsg = ()=>{
    if(openChatFor===null) return
    const l = sortedLeads[openChatFor]
    if(!l) return
    const t = chatText.trim()
    if(!t) return
    const msgs = getMsgs(l)
    setMsgs(l, [...msgs, { from:'user', text: t, ts: new Date().toISOString() }])
    setChatText('')
    setReadNow(l)
  }

  // Abrir Inbox via querystring e atalho flutuante
  useEffect(()=>{
    const sp = new URLSearchParams(location.search)
    const view = sp.get('view') || ''
    if(view==='mensagens'){
      setInboxOpen(true)
      setTimeout(()=>{ try{ document.getElementById('inbox-section')?.scrollIntoView({ behavior:'smooth', block:'start' }) }catch{} }, 0)
    }
  }, [location.search])

  const totalUnreadUser = useMemo(()=> (sortedLeads||[]).reduce((sum,l)=> sum + unreadForLead(l), 0), [sortedLeads, chatTick])
  const [isMobile, setIsMobile] = useState<boolean>(false)
  useEffect(()=>{
    const upd = ()=> setIsMobile(window.innerWidth <= 768)
    upd()
    window.addEventListener('resize', upd)
    return ()=> window.removeEventListener('resize', upd)
  }, [])

  useEffect(()=>{
    const idx = leads.findIndex(l=> l.providerId && l.data && Date.parse(l.data) < Date.now() && !l.reviewedAt)
    if(idx>=0){ setReviewLeadIdx(idx); setReviewOpen(true) }
  }, [leads])

  const submitReview = ()=>{
    if(reviewLeadIdx===null) return
    const l = leads[reviewLeadIdx]
    try{
      const entry = addReview({ providerId: String(l.providerId||''), providerName: String(l.providerName||'Fornecedor'), rating: reviewRating, text: reviewText })
      const st = getAdminState()
      const idx = st.reviews.findIndex(r=> r.id===entry.id)
      if(idx>=0){ st.reviews[idx].clientName = profile.nome; saveAdminState(st) }
      setAdminReviews(st.reviews || [])
      const next = [...leads]
      next[reviewLeadIdx] = { ...l, reviewedAt: new Date().toISOString() }
      setLeads(next)
      localStorage.setItem('leads', JSON.stringify(next))
      setReviewOpen(false)
      setReviewText('')
    }catch(err){
      alert('Falha ao enviar avaliação: ' + (err as Error)?.message)
    }
  }

  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      <div className="grid grid-lg-2">
        <div id="inbox-section" className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
            <h1 style={{margin:0}}>Painel do Organizador</h1>
            <button className="btn" onClick={doLogout}>Sair</button>
          </div>
          <p style={{color:'var(--color-muted)'}}>Gerencie seus dados e acompanhe os orçamentos enviados.</p>

          <label>Nome
            <input value={profile.nome} onChange={e=> setProfile(p=>({...p, nome:e.target.value}))} style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
          </label>
          <label>Contato (WhatsApp)
            <input value={profile.contato} onChange={e=> setProfile(p=>({...p, contato:e.target.value}))} placeholder="(11) 9 1234-5678" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
          </label>
          <div>
            <button className="btn btn-primary" type="button" onClick={saveProfile}>Salvar</button>
          </div>
          <div style={{display:'grid', gap:'.4rem'}}>
            <label>CEP (casa)
              <input value={ceps.casa||''} onChange={e=> setCeps(c=> ({...c, casa: e.target.value}))} placeholder="01234-567" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
            </label>
            <label>CEP (local da festa)
              <input value={ceps.festa||''} onChange={e=> setCeps(c=> ({...c, festa: e.target.value}))} placeholder="01234-567" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
            </label>
            <div>
              <button className="btn" type="button" onClick={saveCeps}>Salvar CEPs</button>
            </div>
          </div>
          <div style={{marginTop:'.6rem'}}>
            <strong>Próximo Evento</strong>
            {upcoming ? (
              <div>
                <div style={{fontSize:'1.05rem'}}>{`${upcoming.nome || 'Meu evento'} • ${upcoming.data}`}</div>
                <small style={{color:'var(--color-muted)'}}>Fornecedor: {upcoming.providerName || '-'}</small>
                <div style={{marginTop:'.4rem'}}>
                  <span className="chip">{Math.max(0, Math.ceil((Date.parse(upcoming.data)-Date.now())/86400000))} dias restantes</span>
                </div>
              </div>
            ) : (
              <div style={{color:'var(--color-muted)'}}>Nenhum evento futuro. <Link to="/busca" className="link">Comece uma busca</Link>.</div>
            )}
          </div>
        </div>

        <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
            <h2 style={{margin:0}}>Meus Pedidos</h2>
            <div style={{display:'flex', gap:'.4rem'}}>
              <button className="btn" type="button" onClick={()=> setInboxOpen(true)}>Mensagens</button>
              {sortedLeads.length>0 && (
                <button className="btn" type="button" onClick={clearLeads} aria-label="Limpar orçamentos">Limpar</button>
              )}
            </div>
          </div>
          <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap', marginTop:'.5rem'}}>
            <span className="chip">Contratados e pagos: {contractsPaid}</span>
            <span className="chip" style={{background:'#ffe9e0'}}>Orçamentos pendentes: {pendingQuotes}</span>
            <span className="chip"><CoinIcon style={{marginRight:6}}/> Próximos pagamentos: {nextPayments}</span>
          </div>
          {sortedLeads.length===0 ? (
            <div style={{color:'var(--color-muted)'}}>Nenhum orçamento ainda. <Link to="/busca" className="link">Comece uma busca</Link>.</div>
          ) : (
            <div className="grid">
              {sortedLeads.map((l, i)=> (
                <div key={i} className="card" style={{padding:'.8rem', display:'grid', gap:'.3rem'}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
                    <div>
                      <strong>{l.providerName || 'Fornecedor'}</strong>
                      <span className="chip" style={{marginLeft:'.5rem'}}>{statusForLead(l)}</span>
                    </div>
                    <small style={{color:'var(--color-muted)'}}>{l.createdAt ? new Date(l.createdAt).toLocaleString(): ''}</small>
                  </div>
                  <div style={{color:'var(--color-muted)'}}>Data: {l.data || '-'} | CEP: {l.cep || '-'}</div>
                  <div style={{color:'var(--color-muted)'}}>Endereço: {l.endereco || '-'}</div>
                  {l.mensagem && <div style={{whiteSpace:'pre-wrap'}}>{l.mensagem}</div>}
                  <div style={{display:'flex', gap:'.5rem', marginTop:'.3rem'}}>
                    {l.providerId && <Link to={`/fornecedor/${l.providerId}`} className="btn btn-secondary">Recontratar</Link>}
                    {l.paymentLink && <Link to={l.paymentLink} className="btn btn-primary">Pagar</Link>}
                    <button className="btn" type="button" onClick={()=> { const next = openChatFor===i? null : i; setOpenChatFor(next); if(next!==null) setReadNow(l) }}>{openChatFor===i? 'Fechar chat' : (unreadForLead(l)>0 ? `Chat (${unreadForLead(l)})` : 'Ver chat')}</button>
                    <button className="btn" type="button" onClick={()=>removeLead(leads.indexOf(l))}>Remover</button>
                  </div>
                  {openChatFor===i && (
                    <div className="card" style={{padding:'.8rem', display:'grid', gridTemplateRows:'1fr auto', height:260}}>
                      <div style={{overflow:'auto', display:'grid', gap:'.4rem'}}>
                        {getMsgs(l).map((m,j)=> (
                          <div key={j} style={{justifySelf: m.from==='user'? 'end':'start', background: m.from==='user'? 'var(--color-secondary)':'#f1f6f9', color: m.from==='user'? '#fff':'inherit', padding:'.5rem .7rem', borderRadius:12, maxWidth:'80%'}}>
                            {m.text}
                          </div>
                        ))}
                      </div>
                      {typingMap[leadKey(l)] && <small style={{color:'var(--color-muted)'}}>Fornecedor digitando…</small>}
                      <div style={{display:'flex', gap:'.5rem'}}>
                        <input value={chatText} onChange={e=> { setChatText(e.target.value); try{ setStore(`typing:user:${leadKey(l)}`, new Date().toISOString()) }catch{} }} placeholder="Escreva sua mensagem" onKeyDown={e=> e.key==='Enter' && sendMsg()} style={{flex:1, padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
                        <button className="btn btn-secondary" onClick={sendMsg}>Enviar</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <Modal open={inboxOpen} onClose={()=> setInboxOpen(false)}>
          <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
            <strong>Mensagens</strong>
            {sortedLeads.filter(l=> getMsgs(l).length>0).length===0 ? (
              <div style={{color:'var(--color-muted)'}}>Nenhuma conversa ainda. <Link to="/busca" className="link">Comece uma busca</Link>.</div>
            ) : (
              <div style={{display:'grid', gap:'.4rem'}}>
                {sortedLeads.map((l,i)=>{ const msgs = getMsgs(l); if(msgs.length===0) return null; const last = msgs[msgs.length-1]; const unread = unreadForLead(l); return (
                  <button key={leadKey(l)} className="chip" onClick={()=>{ setOpenChatFor(i); setInboxOpen(false); setReadNow(l) }} style={{display:'flex', justifyContent:'space-between'}}>
                    <span>{l.providerName || 'Fornecedor'} • {l.data || '-'}</span>
                    <span style={{color:'var(--color-muted)'}}>{(last?.text||'').slice(0,40)}{unread>0? ` • ${unread} novas`: ''}</span>
                  </button>
                )})}
              </div>
            )}
            <div style={{display:'flex', justifyContent:'end'}}>
              <button className="btn" onClick={()=> setInboxOpen(false)}>Fechar</button>
            </div>
          </div>
        </Modal>
      </div>
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
        <h2 style={{margin:0}}>Minhas Avaliações</h2>
        {adminReviews.filter(r=> !profile.nome || r.clientName===profile.nome).length===0 ? (
          <div style={{color:'var(--color-muted)'}}>Você ainda não avaliou fornecedores.</div>
        ) : (
          <div className="grid">
            {adminReviews.filter(r=> !profile.nome || r.clientName===profile.nome).map(r=> (
              <div key={r.id} className="card" style={{padding:'.8rem', display:'grid', gap:'.3rem'}}>
                <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                  <strong>{r.providerName}</strong>
                  <small style={{color:'var(--color-muted)'}}>{new Date(r.createdAt).toLocaleString()}</small>
                </div>
                <RatingStars value={r.rating} />
                <div>{r.text}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal open={reviewOpen} onClose={()=> setReviewOpen(false)} title="Avalie o fornecedor" size="sm">
        {reviewLeadIdx!==null && (()=>{ const l = leads[reviewLeadIdx]; return (
          <div style={{display:'grid', gap:'.6rem'}}>
            <div style={{color:'var(--color-muted)'}}>Evento concluído: {l.providerName} • {l.data}</div>
            <label>Nota
              <select value={reviewRating} onChange={e=> setReviewRating(Number(e.target.value))} style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}>
                {[5,4,3,2,1].map(v=> <option key={v} value={v}>{v} estrelas</option>)}
              </select>
            </label>
            <label>Comentário
              <textarea value={reviewText} onChange={e=> setReviewText(e.target.value)} rows={3} placeholder="Conte como foi sua experiência" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}></textarea>
            </label>
            <div style={{display:'flex', gap:'.5rem'}}>
              <button className="btn btn-primary" onClick={submitReview} disabled={!reviewText.trim()}>Enviar avaliação</button>
              <button className="btn" onClick={()=> setReviewOpen(false)}>Agora não</button>
            </div>
          </div>
        )})()}
      </Modal>
      {isMobile && (
        <button
          className="btn btn-primary"
          onClick={()=> setInboxOpen(true)}
          aria-label="Abrir mensagens"
          title="Abrir mensagens"
          style={{position:'fixed', bottom:72, right:16, borderRadius:999, display:'inline-flex', alignItems:'center', gap:8, boxShadow:'var(--shadow-md)'}}
        >
          <span style={{display:'inline-flex'}}><ChatIcon /></span>
          <span>Mensagens</span>
          {totalUnreadUser>0 && (
            <span className="chip" style={{position:'absolute', top:-6, right:-6, background:'#ef4444', color:'#fff', padding:'0 .35rem', borderRadius:999, fontSize:'.75rem'}}>{totalUnreadUser}</span>
          )}
        </button>
      )}
    </section>
  )
}