import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStore } from '@/utils/realtime'

export default function ClientDashboard(){
  const navigate = useNavigate()
  const [leads, setLeads] = useState<any[]>([])
  const [orders, setOrders] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [errPayments, setErrPayments] = useState<string | null>(null)
  const [leadStatusFilter, setLeadStatusFilter] = useState<'todos'|'abertos'|'fechados'>('todos')
  const [leadQuery, setLeadQuery] = useState('')
  const [orderQuery, setOrderQuery] = useState('')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<'todos'|'approved'|'pending'|'rejected'>('todos')
  const [paymentQuery, setPaymentQuery] = useState('')
  // adicionar estados de filtro por datas
  const [orderFrom, setOrderFrom] = useState('')
  const [orderTo, setOrderTo] = useState('')
  const [paymentFrom, setPaymentFrom] = useState('')
  const [paymentTo, setPaymentTo] = useState('')
  // helpers de datas e presets
  const fmtDateLocal = (d: Date)=> {
    const y = d.getFullYear()
    const m = String(d.getMonth()+1).padStart(2,'0')
    const day = String(d.getDate()).padStart(2,'0')
    return `${y}-${m}-${day}`
  }
  const clearOrderFilters = ()=> { setOrderQuery(''); setOrderFrom(''); setOrderTo('') }
  const setOrderRangeToday = ()=> { const t = new Date(); const s = fmtDateLocal(t); setOrderFrom(s); setOrderTo(s) }
  const setOrderRangeLast7 = ()=> { const t = new Date(); const to = fmtDateLocal(t); const from = new Date(t); from.setDate(t.getDate()-6); setOrderFrom(fmtDateLocal(from)); setOrderTo(to) }
  const setOrderRangeThisMonth = ()=> { const t = new Date(); const from = new Date(t.getFullYear(), t.getMonth(), 1); const to = new Date(t.getFullYear(), t.getMonth()+1, 0); setOrderFrom(fmtDateLocal(from)); setOrderTo(fmtDateLocal(to)) }
  const clearPaymentFilters = ()=> { setPaymentQuery(''); setPaymentStatusFilter('todos'); setPaymentFrom(''); setPaymentTo('') }
  const setPaymentRangeToday = ()=> { const t = new Date(); const s = fmtDateLocal(t); setPaymentFrom(s); setPaymentTo(s) }
  const setPaymentRangeLast7 = ()=> { const t = new Date(); const to = fmtDateLocal(t); const from = new Date(t); from.setDate(t.getDate()-6); setPaymentFrom(fmtDateLocal(from)); setPaymentTo(to) }
  const setPaymentRangeThisMonth = ()=> { const t = new Date(); const from = new Date(t.getFullYear(), t.getMonth(), 1); const to = new Date(t.getFullYear(), t.getMonth()+1, 0); setPaymentFrom(fmtDateLocal(from)); setPaymentTo(fmtDateLocal(to)) }
  useEffect(()=>{
    try{
      const rawLeads = localStorage.getItem('leads') || '[]'
      setLeads(JSON.parse(rawLeads))
    }catch{}
    try{
      const os = getStore('orders', []) as any[]
      setOrders(Array.isArray(os)? os : [])
    }catch{}
  }, [])

  const refreshOrders = ()=>{
    try{
      const os = getStore('orders', []) as any[]
      setOrders(Array.isArray(os)? os : [])
    }catch{}
  }

  const loadPayments = async ()=>{
    setLoadingPayments(true); setErrPayments(null)
    try{
      const isDev = import.meta.env.DEV
      const baseEnv = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
      const useProxy = String(import.meta.env.VITE_DEV_USE_PROXY || '').toLowerCase() === 'true'
      const url = (isDev && useProxy)
        ? '/api/mp/list_recent?type=payment&limit=10'
        : (baseEnv ? `${baseEnv}/api/mp/list_recent?type=payment&limit=10` : '/api/mp/list_recent?type=payment&limit=10')
      const resp = await fetch(url, { mode: 'cors' })
       const text = await resp.text()
       if(!resp.ok){
         throw new Error((text || resp.statusText || 'Falha ao carregar pagamentos') + ` (url: ${url})`)
       }
       let data: any = null
       try {
         data = JSON.parse(text)
       } catch {
         throw new Error(`Resposta não é JSON (url: ${url}). Em dev, configure VITE_API_BASE_URL ou habilite VITE_DEV_USE_PROXY=true com proxy do Vite.`)
       }
       const results = Array.isArray(data?.results) ? data.results : Array.isArray(data) ? data : []
       setPayments(results)
     }catch(err){
       const raw = String((err as Error)?.message || err || 'Falha ao carregar pagamentos')
       setErrPayments(/Unexpected token/i.test(raw)
         ? 'API não retornou JSON válido. Verifique backend Vercel, proxy Vite e MP_ACCESS_TOKEN.'
         : raw)
     }finally{ setLoadingPayments(false) }
   }

  const leadKey = (x:any)=> `${String(x?.providerId||'')}:${String(x?.contato||'')}:${String(x?.createdAt||'')}`
  const leadsSorted = useMemo(()=> {
    return [...(leads||[])].sort((a:any,b:any)=> new Date(b?.createdAt||0).getTime() - new Date(a?.createdAt||0).getTime())
  }, [leads])
  const ordersSorted = useMemo(()=>{
    return [...(orders||[])].sort((a:any,b:any)=> new Date(b?.date||0).getTime() - new Date(a?.date||0).getTime())
  }, [orders])
  // atualizar filtro de pedidos para considerar intervalo de datas
  const ordersFiltered = useMemo(()=>{
    const q = orderQuery.trim().toLowerCase()
    const fromTs = orderFrom ? new Date(orderFrom + 'T00:00:00').getTime() : -Infinity
    const toTs = orderTo ? new Date(orderTo + 'T23:59:59').getTime() : Infinity
    return ordersSorted.filter((o:any)=>{
      const list = [o?.providerName, o?.clientName, o?.status]
      const matchesQuery = !q || list.some(v=> String(v||'').toLowerCase().includes(q))
      const dt = o?.date ? new Date(o.date).getTime() : NaN
      const matchesRange = isFinite(dt) ? dt >= fromTs && dt <= toTs : true
      return matchesQuery && matchesRange
    })
  }, [ordersSorted, orderQuery, orderFrom, orderTo])

  const leadsFiltered = useMemo(()=>{
    const base = leadsSorted
    const q = leadQuery.trim().toLowerCase()
    return base.filter((l:any)=>{
      const statusOk = leadStatusFilter==='todos' ? true : leadStatusFilter==='fechados' ? Boolean(l?.closedAt) : !l?.closedAt
      const queryOk = !q ? true : [l?.contato, l?.servico||l?.service, l?.status].some(v=> String(v||'').toLowerCase().includes(q))
      return statusOk && queryOk
    })
  }, [leadsSorted, leadStatusFilter, leadQuery])

  const counters = {
    leads: leadsSorted.length,
    orders: ordersSorted.length,
    payments: payments.length,
  }

  const serializeCell = (v:any)=> `"${String(v ?? '').replace(/"/g,'""')}"`
  const toCSV = (headers:string[], rows:any[][])=> {
    const headerLine = headers.map(serializeCell).join(';')
    const lines = rows.map(r=> r.map(serializeCell).join(';'))
    return [headerLine, ...lines].join('\n')
  }
  const downloadCSV = (filename:string, csv:string)=>{
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    a.remove(); URL.revokeObjectURL(url)
  }
  const exportLeadsCSV = ()=>{
    const headers = ['Contato','Serviço','Status','Criado','Fechado']
    const rows = leadsFiltered.map(l=> [
      String(l?.contato||'-'),
      String(l?.servico||l?.service||'-'),
      String(l?.status||'-'),
      l?.createdAt? new Date(l.createdAt).toLocaleString(): '-',
      l?.closedAt? new Date(l.closedAt).toLocaleString(): '-',
    ])
    downloadCSV('solicitacoes.csv', toCSV(headers, rows))
  }
  const exportOrdersCSV = ()=>{
    const headers = ['Fornecedor','Cliente','Total (R$)','Status','Data']
    const rows = ordersFiltered.map(o=> [
      String(o?.providerName||'-'),
      String(o?.clientName||'-'),
      Number(o?.totalBRL||0).toFixed(2),
      String(o?.status||'-'),
      o?.date? new Date(o.date).toLocaleString(): '-',
    ])
    downloadCSV('pedidos.csv', toCSV(headers, rows))
  }
  const exportPaymentsCSV = ()=>{
    const headers = ['ID','Status','Valor (R$)','Ref','Data']
    const rows = paymentsFiltered.map(p=> [
      String(p?.id||'-'),
      String(p?.status||'-'),
      Number(p?.transaction_amount||0).toFixed(2),
      String(p?.external_reference||'-'),
      p?.date_created? new Date(p.date_created).toLocaleString(): '-',
    ])
    downloadCSV('pagamentos.csv', toCSV(headers, rows))
  }
  const paymentsFiltered = useMemo(()=>{
    const q = paymentQuery.trim().toLowerCase()
    const fromTs = paymentFrom ? new Date(paymentFrom + 'T00:00:00').getTime() : -Infinity
    const toTs = paymentTo ? new Date(paymentTo + 'T23:59:59').getTime() : Infinity
    return (payments||[]).filter((p:any)=>{
      const statusOk = paymentStatusFilter==='todos' ? true : String(p?.status||'').toLowerCase()===paymentStatusFilter
      const queryOk = !q ? true : [p?.id, p?.external_reference, p?.transaction_amount].some(v=> String(v||'').toLowerCase().includes(q))
      const dt = p?.date_created ? new Date(p.date_created).getTime() : NaN
      const rangeOk = isFinite(dt) ? dt >= fromTs && dt <= toTs : true
      return statusOk && queryOk && rangeOk
    })
  }, [payments, paymentStatusFilter, paymentQuery, paymentFrom, paymentTo])

  // Helper de correspondência: considera id e proximidade de data (±24h)
  const findOrderIdOrIndex = (ref: any, amount: number, paymentDate?: string | Date) => {
    if (ref && ref.orderId != null) return ref.orderId
    const normalize = (n:any) => Number(Number(n || 0).toFixed(2))
    const targetAmount = normalize(amount)
    const paymentTime = paymentDate ? new Date(paymentDate).getTime() : NaN
    const thresholdMs = 1000 * 60 * 60 * 24
    const idx = (ordersSorted || []).findIndex((o:any) => {
      const sameNames = String(o?.providerName || '') === String(ref?.providerName || '') &&
                        String(o?.clientName || '') === String(ref?.clientName || '')
      const sameAmount = normalize(o?.totalBRL) === targetAmount
      const orderTime = o?.date ? new Date(o.date).getTime() : NaN
      const closeInTime = isFinite(paymentTime) && isFinite(orderTime) ? Math.abs(paymentTime - orderTime) <= thresholdMs : true
      return sameNames && sameAmount && closeInTime
    })
    if (idx >= 0) return String((ordersSorted[idx] as any)?.id ?? idx)
    return null
  }
  return (
    <div className="container" style={{padding:'1rem 1rem 8rem'}}>
      <h2>Painel do Cliente</h2>
      <div className="grid" style={{display:'grid', gridTemplateColumns:'1fr', rowGap:'.75rem'}}>

        <section className="card" style={{margin:'0'}}>
          <div style={{display:'grid', rowGap:'.9rem', padding:'0 1rem 1.25rem'}}>
            <h3>Minhas Solicitações <span style={{fontWeight:400, color:'var(--color-muted)'}}>({counters.leads})</span></h3>
            <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap'}}>
              <select value={leadStatusFilter} onChange={e=> setLeadStatusFilter(e.target.value as any)} className="input" style={{padding:'.5rem 1rem'}}>
                <option value="todos">Todas</option>
                <option value="abertos">Abertas</option>
                <option value="fechados">Fechadas</option>
              </select>
              <input value={leadQuery} onChange={e=> setLeadQuery(e.target.value)} placeholder="Buscar contato/serviço/status" className="input" style={{padding:'.5rem 1rem', minWidth:'240px'}} />
              <button className="btn btn-secondary" onClick={exportLeadsCSV}>Exportar CSV</button>
            </div>
            <div style={{maxHeight:'280px', overflow:'auto'}}>
              <table className="table" style={{width:'100%'}}>
                <thead>
                  <tr>
                    <th style={{padding:'.6rem 1rem'}}>Contato</th>
                    <th style={{padding:'.6rem 1rem'}}>Serviço</th>
                    <th style={{padding:'.6rem 1rem'}}>Status</th>
                    <th style={{padding:'.6rem 1rem'}}>Criado</th>
                    <th style={{padding:'.6rem 1rem'}}>Fechado</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsFiltered.map((l:any)=> (
                    <tr key={leadKey(l)}>
                      <td style={{padding:'.5rem 1rem'}}>{String(l?.contato||'-')}</td>
                      <td style={{padding:'.5rem 1rem'}}>{String(l?.servico||l?.service||'-')}</td>
                      <td style={{padding:'.5rem 1rem'}}>{String(l?.status||'-')}</td>
                      <td style={{padding:'.5rem 1rem'}}>{l?.createdAt? new Date(l.createdAt).toLocaleString(): '-'}</td>
                      <td style={{padding:'.5rem 1rem'}}>{l?.closedAt? new Date(l.closedAt).toLocaleString(): '-'}</td>
                    </tr>
                  ))}
                  {leadsFiltered.length===0 && (
                    <tr>
                      <td colSpan={5} style={{padding:'.75rem 1rem', color:'var(--color-muted)'}}>Nenhuma solicitação encontrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <small style={{color:'var(--color-muted)', display:'block', marginTop:'.25rem'}}>Solicitações são listadas conforme sua criação durante orçamentos e atendimento.</small>
          </div>
        </section>

        <section className="card" style={{margin:'0'}}>
          <div style={{display:'grid', rowGap:'.9rem', padding:'0 1rem 1.25rem'}}>
             <h3>Meus Pedidos <span style={{fontWeight:400, color:'var(--color-muted)'}}>({counters.orders})</span></h3>
             {/* UI: Meus Pedidos – presets e limpar filtros */}
             <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap'}}>
              <button className="btn btn-secondary" onClick={refreshOrders}>Atualizar</button>
              <button className="btn btn-secondary" onClick={exportOrdersCSV}>Exportar CSV</button>
              <input value={orderQuery} onChange={e=> setOrderQuery(e.target.value)} placeholder="Buscar fornecedor/cliente/status" className="input" style={{padding:'.5rem 1rem', minWidth:'240px'}} />
              <input type="date" value={orderFrom} onChange={e=> setOrderFrom(e.target.value)} className="input" style={{padding:'.5rem 1rem'}} />
              <input type="date" value={orderTo} onChange={e=> setOrderTo(e.target.value)} className="input" style={{padding:'.5rem 1rem'}} />
              <button className="btn btn-secondary" onClick={setOrderRangeToday} title="Filtrar pedidos de hoje">Hoje</button>
              <button className="btn btn-secondary" onClick={setOrderRangeLast7} title="Últimos 7 dias">Últimos 7 dias</button>
              <button className="btn btn-secondary" onClick={setOrderRangeThisMonth} title="Este mês">Este mês</button>
              <button className="btn btn-secondary" onClick={clearOrderFilters} title="Limpar busca e datas">Limpar filtros</button>
            </div>
            <div style={{maxHeight:'280px', overflow:'auto'}}>
              <table className="table" style={{width:'100%'}}>
                <thead>
                  <tr>
                    <th style={{padding:'.6rem 1rem'}}>Fornecedor</th>
                    <th style={{padding:'.6rem 1rem'}}>Cliente</th>
                    <th style={{padding:'.6rem 1rem'}}>Total (R$)</th>
                    <th style={{padding:'.6rem 1rem'}}>Status</th>
                    <th style={{padding:'.6rem 1rem'}}>Data</th>
                    <th style={{padding:'.6rem 1rem'}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersFiltered.map((o:any, idx:number)=> (
                    <tr key={String(o?.id||Math.random())}>
                      <td style={{padding:'.5rem 1rem'}}>{String(o?.providerName||'-')}</td>
                      <td style={{padding:'.5rem 1rem'}}>{String(o?.clientName||'-')}</td>
                      <td style={{padding:'.5rem 1rem'}}>{Number(o?.totalBRL||0).toFixed(2)}</td>
                      <td style={{padding:'.5rem 1rem'}}>{String(o?.status||'-')}</td>
                      <td style={{padding:'.5rem 1rem'}}>{o?.date? new Date(o.date).toLocaleString(): '-'}</td>
                      <td style={{padding:'.5rem 1rem'}}>
                        <button className="btn btn-secondary" onClick={()=> navigate(`/painel/cliente/pedido/${encodeURIComponent(String(o?.id ?? idx))}`)}>
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                  {ordersFiltered.length===0 && (
                    <tr>
                      <td colSpan={6} style={{padding:'.75rem 1rem', color:'var(--color-muted)'}}>Nenhum pedido encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <small style={{color:'var(--color-muted)', display:'block'}}>Pedidos fechados via checkout aparecem aqui com status e totais.</small>
          </div>
        </section>

        <section className="card" style={{margin:'0'}}>
          <div style={{display:'grid', rowGap:'.9rem', padding:'0 1rem 1.25rem'}}>
            <h3>Pagamentos (Mercado Pago) <span style={{fontWeight:400, color:'var(--color-muted)'}}>({counters.payments})</span></h3>
            <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap'}}>
              <button className="btn btn-secondary" onClick={loadPayments}>Carregar pagamentos</button>
              <button className="btn btn-secondary" onClick={exportPaymentsCSV}>Exportar CSV</button>
              <select value={paymentStatusFilter} onChange={e=> setPaymentStatusFilter(e.target.value as any)} className="input" style={{padding:'.5rem 1rem'}}>
                <option value="todos">Todos</option>
                <option value="approved">Aprovados</option>
                <option value="pending">Pendentes</option>
                <option value="rejected">Rejeitados</option>
              </select>
              <input value={paymentQuery} onChange={e=> setPaymentQuery(e.target.value)} placeholder="Buscar id/ref/valor" className="input" style={{padding:'.5rem 1rem', minWidth:'220px'}} />
              <input type="date" value={paymentFrom} onChange={e=> setPaymentFrom(e.target.value)} className="input" style={{padding:'.5rem 1rem'}} />
              <input type="date" value={paymentTo} onChange={e=> setPaymentTo(e.target.value)} className="input" style={{padding:'.5rem 1rem'}} />
              <button className="btn btn-secondary" onClick={setPaymentRangeToday} title="Filtrar pagamentos de hoje">Hoje</button>
              <button className="btn btn-secondary" onClick={setPaymentRangeLast7} title="Últimos 7 dias">Últimos 7 dias</button>
              <button className="btn btn-secondary" onClick={setPaymentRangeThisMonth} title="Este mês">Este mês</button>
              <button className="btn btn-secondary" onClick={clearPaymentFilters} title="Limpar status, busca e datas">Limpar filtros</button>
            </div>
            {loadingPayments && <small style={{color:'var(--color-muted)'}}>Carregando…</small>}
            {errPayments && <small style={{color:'var(--color-danger)'}} role="alert">{errPayments}</small>}
            <div style={{maxHeight:'280px', overflow:'auto'}}>
              <table className="table" style={{width:'100%'}}>
                <thead>
                  <tr>
                    <th style={{padding:'.6rem 1rem'}}>ID</th>
                    <th style={{padding:'.6rem 1rem'}}>Status</th>
                    <th style={{padding:'.6rem 1rem'}}>Valor (R$)</th>
                    <th style={{padding:'.6rem 1rem'}}>Ref</th>
                    <th style={{padding:'.6rem 1rem'}}>Data</th>
                    <th style={{padding:'.6rem 1rem'}}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentsFiltered.map((p:any)=> {
                    const refStr = String(p?.external_reference||'')
                    let ref: any = null
                    try{ ref = JSON.parse(refStr) }catch{}
                    const isOrder = ref && ref.type==='order'
                    return (
                      <tr key={String(p.id)}>
                        <td style={{padding:'.5rem 1rem'}}>{String(p.id)}</td>
                        <td style={{padding:'.5rem 1rem'}}>{String(p.status)}</td>
                        <td style={{padding:'.5rem 1rem'}}>{Number(p.transaction_amount||0).toFixed(2)}</td>
                        <td style={{maxWidth:360, overflow:'hidden', textOverflow:'ellipsis', padding:'.5rem 1rem'}}>{isOrder? `${ref.providerName||'Fornecedor'} • ${ref.clientName||'Cliente'} • R$ ${Number(ref.amount||0).toFixed(2)}` : refStr || '-'}</td>
                        <td style={{padding:'.5rem 1rem'}}>{p?.date_created? new Date(p.date_created).toLocaleString(): '-'}</td>
                        <td style={{padding:'.5rem 1rem'}}>{isOrder ? (() => { const target = findOrderIdOrIndex(ref, Number(ref?.amount || p?.transaction_amount || 0), p?.date_created); return target != null ? <button className="btn btn-secondary" onClick={() => navigate(`/painel/cliente/pedido/${String(target)}`)}>Ver pedido</button> : '-'; })() : '-'}</td>
                      </tr>
                    )
                  })}
                  {paymentsFiltered.length===0 && (
                    <tr>
                      <td colSpan={6} style={{padding:'.75rem 1rem', color:'var(--color-muted)'}}>Nenhum pagamento carregado ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <small style={{color:'var(--color-muted)', display:'block'}}>Pagamentos usam `MP_ACCESS_TOKEN` no backend. Mostra status e referências do pedido.</small>
          </div>
        </section>

        <section className="card" style={{margin:'0'}}>
          <div style={{display:'grid', rowGap:'.9rem', padding:'0 1rem 1.25rem'}}>
            <h3>Suporte</h3>
            <p>Precisa de ajuda? Fale com nosso suporte ou com o fornecedor.</p>
            <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap'}}>
              <button className="btn btn-primary">Abrir chamado</button>
              <button className="btn btn-secondary">Mensagens</button>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}