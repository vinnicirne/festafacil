import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type Profile = { nome: string; contato: string }
type Lead = { providerId?: string; providerName?: string; nome: string; contato: string; data: string; cep: string; endereco: string; mensagem?: string; createdAt?: string }

export default function UserDashboard(){
  const [profile, setProfile] = useState<Profile>({ nome: '', contato: '' })
  const [leads, setLeads] = useState<Lead[]>([])

  useEffect(()=>{
    try{
      const p = localStorage.getItem('user:profile')
      if(p) setProfile(JSON.parse(p))
    }catch{}
    try{
      const l = localStorage.getItem('leads')
      setLeads(l? JSON.parse(l): [])
    }catch{}
  }, [])

  const saveProfile = ()=>{
    localStorage.setItem('user:profile', JSON.stringify(profile))
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

  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      <div className="grid grid-lg-2">
        <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
          <h1 style={{margin:0}}>Painel do Usuário</h1>
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
        </div>

        <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
            <h2 style={{margin:0}}>Orçamentos enviados</h2>
            {sortedLeads.length>0 && (
              <button className="btn" type="button" onClick={clearLeads} aria-label="Limpar orçamentos">Limpar</button>
            )}
          </div>
          {sortedLeads.length===0 ? (
            <div style={{color:'var(--color-muted)'}}>Nenhum orçamento ainda. <Link to="/busca" className="link">Comece uma busca</Link>.</div>
          ) : (
            <div className="grid">
              {sortedLeads.map((l, i)=> (
                <div key={i} className="card" style={{padding:'.8rem', display:'grid', gap:'.3rem'}}>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem', flexWrap:'wrap'}}>
                    <strong>{l.providerName || 'Fornecedor'}</strong>
                    <small style={{color:'var(--color-muted)'}}>{l.createdAt ? new Date(l.createdAt).toLocaleString(): ''}</small>
                  </div>
                  <div style={{color:'var(--color-muted)'}}>Data: {l.data || '-'} | CEP: {l.cep || '-'}</div>
                  <div style={{color:'var(--color-muted)'}}>Endereço: {l.endereco || '-'}</div>
                  {l.mensagem && <div style={{whiteSpace:'pre-wrap'}}>{l.mensagem}</div>}
                  <div style={{display:'flex', gap:'.5rem', marginTop:'.3rem'}}>
                    {l.providerId && <Link to={`/fornecedor/${l.providerId}`} className="btn btn-secondary">Ver fornecedor</Link>}
                    <button className="btn" type="button" onClick={()=>removeLead(leads.indexOf(l))}>Remover</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}