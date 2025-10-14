import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getProviders } from '@/utils/providersSource'
import { exportCsv } from '@/utils/export'

type Lead = { providerId?: string; providerName?: string; nome: string; contato: string; data: string; cep: string; endereco: string; mensagem?: string; createdAt?: string }

export default function AdminDashboard(){
  const [providers, setProviders] = useState<{id:string, name:string, category:string}[]>([])
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(()=>{ let on=true; getProviders().then(list=>{ if(!on) return; setProviders(list.map(p=>({id:p.id, name:p.name, category:p.category}))) }); return ()=>{ on=false } }, [])
  useEffect(()=>{ try{ const raw = localStorage.getItem('leads'); setLeads(raw? JSON.parse(raw): []) }catch{} }, [])

  const stats = useMemo(()=>({
    providers: providers.length,
    leads: leads.length,
    lastLeadAt: leads.length ? new Date(Math.max(...leads.map(l=> Date.parse(l.createdAt||'0')))).toLocaleString() : '-'
  }), [providers, leads])

  const exportLeads = ()=> exportCsv('leads.csv', leads.map(l=> ({
    createdAt: l.createdAt, providerId: l.providerId, providerName: l.providerName, nome: l.nome, contato: l.contato, data: l.data, cep: l.cep, endereco: l.endereco, mensagem: l.mensagem
  })))

  const clearLeads = ()=>{ localStorage.setItem('leads', JSON.stringify([])); setLeads([]) }

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
                  <Link to={`/painel/fornecedor`} className="btn">Gerenciar catálogo</Link>
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
      </div>
    </section>
  )
}