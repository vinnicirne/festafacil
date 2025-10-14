import { useEffect, useState } from 'react'
import { getProviders } from '@/utils/providersSource'

export default function ProviderDashboard(){
  const [providers, setProviders] = useState<{id:string, name:string, category:string}[]>([])
  const [providerId, setProviderId] = useState('')
  const [brinquedos, setBrinquedos] = useState<string[]>([])
  const [novoBrinquedo, setNovoBrinquedo] = useState('')
  const [estacoes, setEstacoes] = useState<string[]>([])
  const [novaEstacao, setNovaEstacao] = useState('')

  useEffect(()=>{ let on=true; getProviders().then(list=>{ if(!on) return; setProviders(list.map(p=>({id:p.id, name:p.name, category:p.category}))) }); return ()=>{ on=false } }, [])

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

  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.8rem'}}>
        <h1 style={{margin:0}}>Painel do Fornecedor</h1>
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
    </section>
  )
}