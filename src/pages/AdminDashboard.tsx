import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProviders } from '@/utils/providersSource'
import { exportCsv } from '@/utils/export'
import { appendLog } from '@/utils/adminStore'

type Lead = { providerId?: string; providerName?: string; nome: string; contato: string; data: string; cep: string; endereco: string; mensagem?: string; createdAt?: string }

export default function AdminDashboard(){
  const [providers, setProviders] = useState<{id:string, name:string, category:string}[]>([])
  const [leads, setLeads] = useState<Lead[]>([])
  const [pendingCats, setPendingCats] = useState<{suggestion:string, fromBrand?:string, contactEmail?:string, createdAt?:string}[]>([])
  const [mpToken, setMpToken] = useState('')

  useEffect(()=>{ let on=true; getProviders().then(list=>{ if(!on) return; setProviders(list.map(p=>({id:p.id, name:p.name, category:p.category}))) }); return ()=>{ on=false } }, [])
  useEffect(()=>{ try{ const raw = localStorage.getItem('leads'); setLeads(raw? JSON.parse(raw): []) }catch{} }, [])
  useEffect(()=>{ try{ const raw = localStorage.getItem('admin:pendingCategories'); setPendingCats(raw? JSON.parse(raw): []) }catch{} }, [])
  useEffect(()=>{ try{ setMpToken(localStorage.getItem('ff:mp:access_token') || '') }catch{} }, [])

  const stats = useMemo(()=>({
    providers: providers.length,
    leads: leads.length,
    lastLeadAt: leads.length ? new Date(Math.max(...leads.map(l=> Date.parse(l.createdAt||'0')))).toLocaleString() : '-'
  }), [providers, leads])

  const exportLeads = ()=> exportCsv('leads.csv', leads.map(l=> ({
    createdAt: l.createdAt, providerId: l.providerId, providerName: l.providerName, nome: l.nome, contato: l.contato, data: l.data, cep: l.cep, endereco: l.endereco, mensagem: l.mensagem
  })))

  const clearLeads = ()=>{ localStorage.setItem('leads', JSON.stringify([])); setLeads([]) }

  const saveMpToken = ()=>{
    try{
      localStorage.setItem('ff:mp:access_token', (mpToken||'').trim())
      appendLog('mp:token:set', { length: (mpToken||'').trim().length })
    }catch{}
  }
  const clearMpToken = ()=>{
    try{
      localStorage.removeItem('ff:mp:access_token')
      setMpToken('')
      appendLog('mp:token:clear')
    }catch{}
  }

  const approveCat = (idx:number)=>{
    const entry = pendingCats[idx]
    try{
      const raw = localStorage.getItem('admin:approvedCategories')
      const approved = raw ? JSON.parse(raw) as any[] : []
      approved.push({ ...entry, approvedAt: new Date().toISOString() })
      localStorage.setItem('admin:approvedCategories', JSON.stringify(approved))
    }catch{}
    const next = pendingCats.filter((_,i)=> i!==idx)
    setPendingCats(next)
    localStorage.setItem('admin:pendingCategories', JSON.stringify(next))
  }
  const rejectCat = (idx:number)=>{
    const next = pendingCats.filter((_,i)=> i!==idx)
    setPendingCats(next)
    localStorage.setItem('admin:pendingCategories', JSON.stringify(next))
  }

  const byProvider = useMemo(()=>{
    const map = new Map<string, number>()
    for(const l of leads){ const key = `${l.providerId}||${l.providerName}`; map.set(key, (map.get(key)||0)+1) }
    return Array.from(map.entries()).map(([k,v])=>{ const [id,name] = k.split('||'); return { id, name, count: v } }).sort((a,b)=> b.count-a.count)
  }, [leads])

  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.8rem'}}>
        <h1 style={{margin:0}}>Painel do Superadmin</h1>
        <p style={{color:'var(--color-muted)'}}>Visão geral do portal. Nesta versão, os dados de leads estão no navegador (localStorage). Podemos migrar para Supabase quando desejar.</p>

        <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap'}}>
          <span className="chip">Fornecedores: {stats.providers}</span>
          <span className="chip">Leads: {stats.leads}</span>
          <span className="chip">Último lead: {stats.lastLeadAt}</span>
        </div>

        <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
          <button className="btn btn-secondary" onClick={exportLeads} disabled={!leads.length}>Exportar leads (CSV)</button>
          <button className="btn" onClick={clearLeads} disabled={!leads.length}>Limpar leads</button>
        </div>
      </div>

      <div className="grid grid-lg-2">
        <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
          <h2 style={{margin:0}}>Fornecedores</h2>
          <div className="grid">
            {providers.map(p => (
              <div key={p.id} className="card" style={{padding:'.8rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
                <div>
                  <strong>{p.name}</strong>
                  <div style={{color:'var(--color-muted)'}}>Categoria: {p.category}</div>
                </div>
                <div style={{display:'flex', gap:'.4rem'}}>
                  <Link to={`/fornecedor/${p.id}`} className="btn btn-secondary">Ver</Link>
                  <Link to={`/painel/fornecedor?id=${p.id}`} className="btn">Abrir Painel do Fornecedor</Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
          <h2 style={{margin:0}}>Leads por fornecedor</h2>
          {byProvider.length === 0 ? (
            <small style={{color:'var(--color-muted)'}}>Ainda não há leads.</small>
          ) : (
            <div className="grid">
              {byProvider.map(x => (
                <div key={x.id + x.name} className="card" style={{padding:'.8rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
                  <div>
                    <strong>{x.name || 'Fornecedor'}</strong>
                    <div style={{color:'var(--color-muted)'}}>Leads: {x.count}</div>
                  </div>
                  {x.id && <Link to={`/fornecedor/${x.id}`} className="btn btn-secondary">Abrir</Link>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
          <h2 style={{margin:0}}>Categorias sugeridas (pendentes)</h2>
          {pendingCats.length === 0 ? (
            <small style={{color:'var(--color-muted)'}}>Nenhuma sugestão pendente.</small>
          ) : (
            <div className="grid">
              {pendingCats.map((p, i)=> (
                <div key={p.suggestion + i} className="card" style={{padding:'.8rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
                  <div>
                    <strong>{p.suggestion}</strong>
                    <div style={{color:'var(--color-muted)'}}>De: {p.fromBrand || 'Fornecedor'} {p.contactEmail? `• ${p.contactEmail}`:''}</div>
                  </div>
                  <div style={{display:'flex', gap:'.4rem'}}>
                    <button className="btn btn-secondary" onClick={()=> approveCat(i)}>Aprovar</button>
                    <button className="btn" onClick={()=> rejectCat(i)}>Recusar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
          <h2 style={{margin:0}}>Pagamentos (Mercado Pago)</h2>
          <small style={{color:'var(--color-muted)'}}>Para testes: salve o token de acesso no navegador. Em produção, configure a variável de ambiente na Vercel.</small>
          <label>
            Token de acesso (MP)
            <input value={mpToken} onChange={e=> setMpToken(e.target.value)} placeholder="APP_USR-..." style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}} />
          </label>
          <div style={{display:'flex', gap:'.5rem'}}>
            <button className="btn btn-secondary" onClick={saveMpToken} disabled={!mpToken.trim()}>Salvar token no navegador</button>
            <button className="btn" onClick={clearMpToken}>Remover token</button>
            <Link to="/painel/fornecedor?id=1" className="btn">Ir ao painel do fornecedor</Link>
          </div>
        </div>
      </div>
    </section>
  )
}