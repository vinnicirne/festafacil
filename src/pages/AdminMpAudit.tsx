import React, { useMemo, useState } from 'react'
import { upsertOrder, appendLog } from '@/utils/adminStore'
import { getStore, setStore } from '@/utils/realtime'

export default function AdminMpAudit(){
  const [mpRecent, setMpRecent] = useState<any[]>([])
  const [mpLoading, setMpLoading] = useState<boolean>(false)
  const [mpErr, setMpErr] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [fromDate, setFromDate] = useState<string>('')
  const [toDate, setToDate] = useState<string>('')

  const loadRecent = async ()=>{
    setMpLoading(true); setMpErr(null)
    try{
      const resp = await fetch('/api/mp/list_recent?type=payment&limit=20')
      if(!resp.ok){ const j = await resp.json().catch(()=>({})); throw new Error(j?.error || resp.statusText) }
      const data = await resp.json()
      setMpRecent(Array.isArray(data?.results) ? data.results : [])
      appendLog('mp:list_recent', { count: (data?.results||[]).length })
    }catch(err){
      setMpErr(String((err as Error)?.message || err || 'Falha ao carregar'))
    }finally{ setMpLoading(false) }
  }

  const reconcileApproved = ()=>{
    try{
      const approved = mpRecent.filter(r=> String(r?.status||'').toLowerCase()==='approved')
      let changed = 0
      approved.forEach((p:any)=>{
        let ref: any = null
        try{ ref = JSON.parse(String(p?.external_reference||'{}')) }catch{ ref = null }
        if(ref && ref.type==='order' && ref.leadId){
          upsertOrder({
            id: `ord_recon_${String(p.id)}_${Date.now()}`,
            providerId: String(ref.providerId||''),
            providerName: String(ref.providerName||'Fornecedor'),
            clientName: String(ref.clientName||'Cliente'),
            totalBRL: Number(ref.amount||p?.transaction_amount||0),
            commissionPct: 0,
            date: String(p?.date_created || new Date().toISOString()),
            status: 'fechado'
          })
          const list = getStore('transactions', []) as any[]
          const nextList = (list||[]).map(t=> t.leadId===ref.leadId ? { ...t, status: 'Liberado/Pago' } : t)
          setStore('transactions', nextList)
          try{
            const rawLeads = localStorage.getItem('leads') || '[]'
            const leads = JSON.parse(rawLeads)
            const k = (x:any)=> `${String(x?.providerId||'')}:${String(x?.contato||'')}:${String(x?.createdAt||'')}`
            const idx = leads.findIndex((x:any)=> k(x)===ref.leadId)
            if(idx>=0){
              leads[idx] = { ...leads[idx], closedAt: new Date().toISOString(), status: 'Pedido Fechado' }
              localStorage.setItem('leads', JSON.stringify(leads))
            }
          }catch{}
          appendLog('order:paid:reconcile', { paymentId: String(p.id), leadId: String(ref.leadId), providerId: String(ref.providerId||''), amount: Number(ref.amount||p?.transaction_amount||0) })
          changed++
        }
      })
      alert(`Conciliação concluída. Pedidos atualizados: ${changed}`)
    }catch(err){
      alert('Falha na conciliação: ' + String((err as Error)?.message || err))
    }
  }

  const filtered = useMemo(()=>{
    const s = statusFilter.toLowerCase()
    const start = fromDate ? new Date(fromDate).getTime() : null
    const end = toDate ? new Date(toDate).getTime() : null
    return mpRecent.filter((p:any)=>{
      const st = String(p?.status||'').toLowerCase()
      if(s!=='all' && st!==s) return false
      const created = p?.date_created ? new Date(p.date_created).getTime() : null
      if(start && created && created < start) return false
      if(end && created && created > end) return false
      return true
    })
  }, [mpRecent, statusFilter, fromDate, toDate])

  const exportCsv = ()=>{
    const rows = [
      ['id','status','transaction_amount','external_reference','date_created'],
      ...filtered.map((p:any)=>[
        String(p.id||''),
        String(p.status||''),
        String(p.transaction_amount||''),
        String(p.external_reference||''),
        String(p.date_created||'')
      ])
    ]
    const csv = rows.map(r=> r.map(x=>`"${String(x).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `mp_pagamentos_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="container" style={{padding:'1rem'}}>
      <h2>Auditoria Mercado Pago</h2>
      <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
        <button className="btn btn-secondary" onClick={loadRecent}>Carregar pagamentos recentes</button>
        <button className="btn btn-primary" disabled={!mpRecent.some(r=> String(r?.status||'').toLowerCase()==='approved')} onClick={reconcileApproved}>Conciliar aprovados com pedidos</button>
        <div style={{display:'flex', gap:'.4rem', alignItems:'center', flexWrap:'wrap'}}>
          <label><small>Status</small><br />
            <select value={statusFilter} onChange={e=> setStatusFilter(e.target.value)} style={{minWidth:140}}>
              <option value="all">Todos</option>
              <option value="approved">Aprovados</option>
              <option value="pending">Pendentes</option>
              <option value="rejected">Rejeitados</option>
              <option value="in_process">Em processo</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </label>
          <label><small>De</small><br />
            <input type="datetime-local" value={fromDate} onChange={e=> setFromDate(e.target.value)} />
          </label>
          <label><small>Até</small><br />
            <input type="datetime-local" value={toDate} onChange={e=> setToDate(e.target.value)} />
          </label>
          <button className="btn btn-secondary" onClick={()=>{ setStatusFilter('all'); setFromDate(''); setToDate('') }}>Limpar filtros</button>
          <button className="btn" onClick={exportCsv}>Exportar CSV</button>
        </div>
      </div>
      {mpLoading && <small style={{color:'var(--color-muted)'}}>Carregando…</small>}
      {mpErr && <small style={{color:'var(--color-danger)'}} role="alert">{mpErr}</small>}
      <div style={{maxHeight:'340px', overflow:'auto', marginTop:'.6rem'}}>
        <table className="table" style={{width:'100%'}}>
          <thead><tr><th>ID</th><th>Status</th><th>Valor (R$)</th><th>Ref</th><th>Data</th></tr></thead>
          <tbody>
            {filtered.map((p:any)=>{
              const refStr = String(p?.external_reference||'')
              let ref: any = null
              try{ ref = JSON.parse(refStr) }catch{}
              const isOrder = ref && ref.type==='order'
              return (
                <tr key={String(p.id)}>
                  <td>{String(p.id)}</td>
                  <td>{String(p.status)}</td>
                  <td>{Number(p.transaction_amount||0).toFixed(2)}</td>
                  <td style={{maxWidth:420, overflow:'hidden', textOverflow:'ellipsis'}}>{isOrder? `${ref.providerName||'Fornecedor'} • ${ref.clientName||'Cliente'} • R$ ${Number(ref.amount||0).toFixed(2)}` : refStr || '-'}</td>
                  <td>{p?.date_created? new Date(p.date_created).toLocaleString(): '-'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <small style={{color:'var(--color-muted)'}}>Busca pagamentos via backend (`/api/mp/list_recent`) com `MP_ACCESS_TOKEN` e reconcilia pedidos no Admin.</small>
    </div>
  )
}