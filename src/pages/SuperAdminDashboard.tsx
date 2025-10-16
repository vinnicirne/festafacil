import { useEffect, useMemo, useState } from 'react'
import Tabs from '../components/Tabs'
import { CoinIcon } from '@/components/icons'
import {
  getAdminState,
  computeRevenueBreakdownLast30Days,
  adjustCoins,
  setCoinPackages,
  setLeadCosts,
  recordCoinPurchase,
  setHighlight,
  upsertBannerSlot,
  upsertBanner,
  moderateReview,
  upsertOrder,
  setCategoriesOverride,
  setProviderOverride,
  removeProviderOverride,
  inviteAdmin,
  removeAdminUser,
  activateAdmin,
  appendLog,
} from '../utils/adminStore'
import { getProviders } from '../utils/providersSource'
import { createMpPreference, openCheckout } from '@/utils/payments'
 

type Provider = any

export default function SuperAdminDashboard(){
  const [unlocked, setUnlocked] = useState<boolean>(()=>{
    try{ return sessionStorage.getItem('ff:superadmin:unlocked') === 'yes' }catch{ return false }
  })
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [admin, setAdmin] = useState(getAdminState())
  const [providers, setProviders] = useState<Provider[]>([])
  const [providerQuery, setProviderQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null)
  const [pendingCats, setPendingCats] = useState<{suggestion:string, fromBrand?:string, contactEmail?:string, createdAt?:string}[]>([])
  const [mpTestPref, setMpTestPref] = useState<{ id: string; url?: string } | null>(null)

  const refreshAdmin = () => setAdmin(getAdminState())
  useEffect(()=>{ getProviders().then(setProviders).catch(()=>setProviders([])) }, [])
  useEffect(()=>{ try{ const raw = localStorage.getItem('admin:pendingCategories'); setPendingCats(raw? JSON.parse(raw): []) }catch{} }, [])

  const filteredProviders = useMemo(()=>{
    const q = providerQuery.trim().toLowerCase()
    if(!q) return providers
    return providers.filter((p: any)=> p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q))
  }, [providers, providerQuery])

  const kpis = useMemo(()=> computeRevenueBreakdownLast30Days(admin), [admin])
  const activeSuppliersCount = useMemo(()=>{
    const highlightActiveIds = new Set(admin.highlights.filter(h=>h.active).map(h=>h.providerId))
    const coinPositiveIds = Object.entries(admin.coins).filter(([_, c])=> (c as number) > 0).map(([pid])=> pid)
    const setAll = new Set([...highlightActiveIds, ...coinPositiveIds])
    return setAll.size
  }, [admin])
  const averageCoinsPerSupplier = useMemo(()=>{
    const vals = Object.values(admin.coins)
    if(!vals.length) return 0
    return vals.reduce((s,v)=> s + (v || 0), 0) / vals.length
  }, [admin])
  const totalRevenue30d = useMemo(()=>{
    return kpis.coinsRev + kpis.mrr + kpis.commissions + kpis.bannersMonthly
  }, [kpis])

  // Série diária (últimos 14 dias) para gráficos
  const dailySeries = useMemo(()=>{
    const days = 14
    const out: { date: string; coinsRev: number; commissions: number }[] = []
    for(let i=days-1; i>=0; i--){
      const d = new Date(Date.now() - i*86400000)
      const key = d.toISOString().slice(0,10)
      const label = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`
      const coinsRev = admin.coinPurchases.filter(p=> (p.createdAt||'').slice(0,10)===key).reduce((s,p)=> s + (p.priceBRL||0), 0)
      const commissions = admin.orders.filter(o=> o.status==='fechado' && (o.date||'').slice(0,10)===key).reduce((s,o)=> s + (o.totalBRL||0) * (o.commissionPct||0), 0)
      out.push({ date: label, coinsRev, commissions })
    }
    return out
  }, [admin])

  const SVGChart = ({data}:{data:{date:string; coinsRev:number; commissions:number}[]}) => {
    const width = 800
    const height = 260
    const pad = 30
    const maxVal = Math.max(1, ...data.map(d=> Math.max(d.coinsRev, d.commissions)))
    const step = data.length > 1 ? (width - pad*2)/(data.length - 1) : 0
    const toY = (v:number) => height - pad - (v / maxVal) * (height - pad*2)
    const areaPath = `M ${pad} ${toY(data[0]?.coinsRev||0)} ` + data.slice(1).map((d,i)=> `L ${pad + (i+1)*step} ${toY(d.coinsRev)}`).join(' ') + ` L ${pad + (data.length-1)*step} ${height-pad} L ${pad} ${height-pad} Z`
    const commPoints = data.map((d,i)=> `${pad + i*step},${toY(d.commissions)}`).join(' ')
    return (
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="260" preserveAspectRatio="none">
        <rect x={pad} y={pad} width={width - pad*2} height={height - pad*2} fill="none" stroke="#e5e7eb"/>
        <path d={areaPath} fill="rgba(16,185,129,0.25)" stroke="#10b981" strokeWidth={2}/>
        <polyline points={commPoints} fill="none" stroke="#3b82f6" strokeWidth={2}/>
        {data.map((d,i)=> (<circle key={`c${i}`} cx={pad + i*step} cy={toY(d.commissions)} r={2.5} fill="#3b82f6"/>))}
        {data.map((d,i)=> (<text key={`t${i}`} x={pad + i*step} y={height - pad + 18} fontSize={10} textAnchor="middle" fill="#6b7280">{d.date}</text>))}
        <g fontSize={11} fill="#374151">
          <text x={pad} y={18}>Moedas</text>
          <text x={pad + 80} y={18} fill="#3b82f6">Comissões</text>
        </g>
      </svg>
    )
  }

  const unlock = (email: string, password: string) => {
    const okEmail = 'viniciuscirne@gmail.com'
    const okPwd = '@@Vinni1105@@'
    if((email||'').trim().toLowerCase() === okEmail && password === okPwd){
      try{
        sessionStorage.setItem('ff:superadmin:unlocked','yes')
        sessionStorage.setItem('ff:superadmin:user', email)
      }catch{}
      setUnlocked(true)
    } else {
      alert('Credenciais inválidas. Verifique e tente novamente.')
    }
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

  const MonetizacaoMoedas = (
    <div className="grid" style={{gap:'1rem'}}>
      <section className="card">
        <h3>Mercado Pago – Token e Teste</h3>
        <div style={{display:'grid', gap:'.6rem'}}>
          <label>Access Token
            <input id="mp_token" type="text" placeholder="APP_USR-..." defaultValue={(()=>{ try{ return localStorage.getItem('ff:mp:access_token') || '' }catch{ return '' } })()} />
          </label>
          <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
            <button className="btn btn-secondary" onClick={()=>{
              const t = (document.getElementById('mp_token') as HTMLInputElement)?.value?.trim() || ''
              if(!t){ alert('Informe o token antes de salvar.'); return }
              try{
                localStorage.setItem('ff:mp:access_token', t)
                ;(window as any).VITE_MP_ACCESS_TOKEN = t
                appendLog('mp:token:save', { length: t.length })
                alert('Token salvo no navegador (localStorage).')
              }catch(err){ alert('Falha ao salvar token: ' + (err as Error)?.message) }
            }}>Salvar token</button>
            <button className="btn" onClick={()=>{
              try{
                localStorage.removeItem('ff:mp:access_token')
                sessionStorage.removeItem('ff:mp:access_token')
                ;(window as any).VITE_MP_ACCESS_TOKEN = ''
                appendLog('mp:token:clear')
                alert('Token removido do navegador.')
              }catch(err){ alert('Falha ao limpar token: ' + (err as Error)?.message) }
            }}>Limpar token</button>
            <button className="btn btn-primary" onClick={async ()=>{
              try{
                const backBase = window.location.origin
                const pref = await createMpPreference({
                  items: [{ title: 'Teste de Checkout', quantity: 1, unit_price: 1.0, currency_id: 'BRL' }],
                  external_reference: 'admin_test',
                  back_urls: { success: `${backBase}/checkout/success?redirect=admin`, failure: `${backBase}/painel/admin`, pending: `${backBase}/painel/admin` },
                  auto_return: 'approved',
                  metadata: { test: true }
                })
                const url = pref.sandbox_init_point || pref.init_point
                setMpTestPref({ id: pref.id, url })
                appendLog('mp:preference:test:create', { id: pref.id, hasUrl: !!url })
                alert(`Preferência criada: ${pref.id}`)
              }catch(err){ alert('Falha ao criar preferência: ' + (err as Error)?.message) }
            }}>Testar criação de preferência</button>
          </div>
          {mpTestPref && (
            <div className="card" style={{padding:'.6rem', display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem'}}>
              <small style={{opacity:.8}}>Preferência ID: {mpTestPref.id}</small>
              <div style={{display:'flex', gap:'.4rem'}}>
                <button className="btn btn-secondary" disabled={!mpTestPref.url} onClick={()=>{
                  try{ openCheckout(mpTestPref?.url) }catch(err){ alert('Falha ao abrir checkout: ' + (err as Error)?.message) }
                }}>Abrir checkout</button>
              </div>
            </div>
          )}
          <small style={{color:'var(--color-muted)'}}>Produção ideal: configure MERCADO_PAGO_ACCESS_TOKEN no Vercel. Como fallback, salve o token aqui para uso direto no navegador.</small>
        </div>
      </section>
      <section className="card">
        <h3>Gestão de FestCoins</h3>
        <div style={{display:'flex', gap:'.5rem'}}>
          <input placeholder="Buscar fornecedor" value={providerQuery} onChange={e=>setProviderQuery(e.target.value)} />
          <span style={{opacity:.6}}>Resultados: {filteredProviders.length}</span>
        </div>
        <div style={{maxHeight:'220px', overflow:'auto', marginTop:'.6rem'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>Fornecedor</th><th>Categoria</th><th>FestCoins</th></tr></thead>
            <tbody>
              {filteredProviders.map((p:any)=> (
                <tr key={p.id} onClick={()=> setSelectedProvider(p)} style={{cursor:'pointer'}}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{admin.coins[p.id] || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h3>Ajuste de Saldo</h3>
        {selectedProvider ? (
          <div style={{display:'grid', gap:'.6rem'}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <strong>{selectedProvider.name}</strong>
              <div>Saldo: <span className="chip" style={{display:'inline-flex', alignItems:'center', gap:6}}><CoinIcon /> {admin.coins[selectedProvider.id] || 0} FestCoins</span></div>
            </div>
            <div style={{display:'flex', gap:'.5rem'}}>
              <input id="coins_delta" type="number" placeholder="Quantidade" />
              <select id="coins_reason" defaultValue="Suporte">
                <option>Suporte</option>
                <option>Bônus de Lançamento</option>
                <option>Ajuste Manual</option>
              </select>
              <button onClick={()=>{
                const delta = Number((document.getElementById('coins_delta') as HTMLInputElement)?.value || 0)
                const reason = (document.getElementById('coins_reason') as HTMLSelectElement)?.value || 'Ajuste'
                if(!delta) return
                adjustCoins(String(selectedProvider.id), String(selectedProvider.name), delta, reason)
                refreshAdmin()
              }}>Adicionar</button>
              <button className="danger" onClick={()=>{
                const delta = Number((document.getElementById('coins_delta') as HTMLInputElement)?.value || 0)
                const reason = (document.getElementById('coins_reason') as HTMLSelectElement)?.value || 'Ajuste'
                if(!delta) return
                adjustCoins(String(selectedProvider.id), String(selectedProvider.name), -Math.abs(delta), reason)
                refreshAdmin()
              }}>Retirar</button>
            </div>
            <hr />
            <div style={{display:'grid', gap:'.5rem'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <h4 style={{margin:0}}>Comprar FestCoins (Checkout Mercado Pago)</h4>
                <small style={{opacity:.65}}>Pacotes atuais: {admin.coinPackages.length}</small>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'.6rem'}}>
                {admin.coinPackages.map(pkg=> (
                  <div key={pkg.id} className="card" style={{padding:'.7rem'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <strong>{pkg.name}</strong>
                      <span className="chip">R$ {pkg.priceBRL.toFixed(2)}</span>
                    </div>
                    <div style={{marginTop:'.3rem', display:'flex', justifyContent:'space-between'}}>
                      <span style={{opacity:.8, display:'inline-flex', alignItems:'center', gap:6}}><CoinIcon /> {pkg.coins} FestCoins</span>
                      <button className="btn btn-primary" onClick={async ()=>{
                        try{
                          const backBase = window.location.origin
                          const externalRef = JSON.stringify({ providerId: String(selectedProvider.id), providerName: String(selectedProvider.name), packageId: pkg.id })
                          const pref = await createMpPreference({
                            items: [{ title: `Pacote ${pkg.name} – ${pkg.coins} FestCoins`, quantity: 1, unit_price: Number(pkg.priceBRL.toFixed(2)), currency_id: 'BRL' }],
                            external_reference: externalRef,
                            back_urls: {
                              success: `${backBase}/checkout/success`,
                              failure: `${backBase}/painel/admin`,
                              pending: `${backBase}/painel/admin`
                            },
                            auto_return: 'approved',
                            metadata: { coins: pkg.coins, providerId: selectedProvider.id }
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
            </div>
          </div>
        ) : <div>Selecione um fornecedor na lista ao lado.</div>}
      </section>
    </div>
  )

  const DestaquesEBanners = (
    <div className="grid" style={{gap:'1rem'}}>
      <section className="card">
        <h3>Assinaturas de Destaque</h3>
        <div style={{overflow:'auto'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>Fornecedor</th><th>Ativo</th><th>Mensalidade (R$)</th><th>Ações</th></tr></thead>
            <tbody>
              {admin.highlights.map(h=> (
                <tr key={h.providerId}>
                  <td>{h.providerName}</td>
                  <td>{h.active ? 'Sim' : 'Não'}</td>
                  <td>{h.monthlyPriceBRL.toFixed(2)}</td>
                  <td>
                    <button onClick={()=>{ setHighlight(h.providerId, h.providerName, !h.active, h.monthlyPriceBRL); refreshAdmin() }}>{h.active? 'Desativar':'Ativar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{display:'flex', gap:'.5rem', marginTop:'.5rem', flexWrap:'wrap'}}>
          <input id="hl_pid" placeholder="ID Fornecedor" />
          <input id="hl_pname" placeholder="Nome Fornecedor" />
          <input id="hl_price" type="number" step="0.01" placeholder="Mensalidade R$" />
          <label style={{display:'flex', alignItems:'center', gap:'.3rem'}}>
            <input id="hl_active" type="checkbox" defaultChecked /> Ativo
          </label>
          <button onClick={()=>{
            const pid = (document.getElementById('hl_pid') as HTMLInputElement)?.value?.trim()
            const pname = (document.getElementById('hl_pname') as HTMLInputElement)?.value?.trim()
            const price = Number((document.getElementById('hl_price') as HTMLInputElement)?.value || 0)
            const active = (document.getElementById('hl_active') as HTMLInputElement)?.checked
            if(!pid || !pname || !price) return
            setHighlight(pid, pname, !!active, price)
            refreshAdmin()
          }}>Salvar Assinatura</button>
        </div>
      </section>

      <section className="card">
        <h3>Espaços de Banner</h3>
        <div style={{overflow:'auto'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>ID</th><th>Posição</th><th>Preço Mensal (R$)</th></tr></thead>
            <tbody>
              {admin.bannerSlots.map(s=> (
                <tr key={s.id}><td>{s.id}</td><td>{s.position}</td><td>{s.monthlyPriceBRL.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{display:'flex', gap:'.5rem', marginTop:'.5rem', flexWrap:'wrap'}}>
          <input id="slot_id" placeholder="ID do Slot" />
          <input id="slot_pos" placeholder="Posição" />
          <input id="slot_price" type="number" step="0.01" placeholder="Preço Mensal R$" />
          <button onClick={()=>{
            const id = (document.getElementById('slot_id') as HTMLInputElement)?.value?.trim()
            const pos = (document.getElementById('slot_pos') as HTMLInputElement)?.value?.trim()
            const price = Number((document.getElementById('slot_price') as HTMLInputElement)?.value || 0)
            if(!id || !pos || !price) return
            upsertBannerSlot({ id, position: pos, monthlyPriceBRL: price })
            refreshAdmin()
          }}>Salvar Slot</button>
        </div>
      </section>

      <section className="card">
        <h3>Banners</h3>
        <div style={{maxHeight:'220px', overflow:'auto'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>ID</th><th>Slot</th><th>Imagem</th><th>Link</th><th>Cliente</th><th>Início</th><th>Fim</th></tr></thead>
            <tbody>
              {admin.banners.map(b=> (
                <tr key={b.id}><td>{b.id}</td><td>{b.slotId}</td><td>{b.imageUrl}</td><td>{b.linkUrl}</td><td>{b.contractorName}</td><td>{new Date(b.startsAt).toLocaleDateString()}</td><td>{new Date(b.endsAt).toLocaleDateString()}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{display:'flex', gap:'.5rem', marginTop:'.5rem', flexWrap:'wrap'}}>
          <input id="bn_id" placeholder="ID Banner" />
          <input id="bn_slot" placeholder="ID Slot" />
          <input id="bn_img" placeholder="URL Imagem" />
          <input id="bn_link" placeholder="URL Link" />
          <input id="bn_client" placeholder="Cliente" />
          <input id="bn_start" type="date" />
          <input id="bn_end" type="date" />
          <button onClick={()=>{
            const id = (document.getElementById('bn_id') as HTMLInputElement)?.value?.trim() || `bn_${Date.now()}`
            const slotId = (document.getElementById('bn_slot') as HTMLInputElement)?.value?.trim()
            const imageUrl = (document.getElementById('bn_img') as HTMLInputElement)?.value?.trim()
            const linkUrl = (document.getElementById('bn_link') as HTMLInputElement)?.value?.trim()
            const contractorName = (document.getElementById('bn_client') as HTMLInputElement)?.value?.trim()
            const startsAt = (document.getElementById('bn_start') as HTMLInputElement)?.value
            const endsAt = (document.getElementById('bn_end') as HTMLInputElement)?.value
            if(!slotId || !imageUrl || !linkUrl || !contractorName || !startsAt || !endsAt) return
            upsertBanner({ id, slotId, imageUrl, linkUrl, contractorName, startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString() })
            refreshAdmin()
          }}>Salvar Banner</button>
        </div>
      </section>
    </div>
  )

  const PrecoPromocao = (
    <div className="grid" style={{gap:'1rem'}}>
      <section className="card">
        <h3>Editar Preço e Promoção</h3>
        <div style={{display:'flex', gap:'.5rem'}}>
          <input placeholder="Buscar fornecedor" value={providerQuery} onChange={e=>setProviderQuery(e.target.value)} />
          <span style={{opacity:.6}}>Resultados: {filteredProviders.length}</span>
        </div>
        <div style={{maxHeight:'220px', overflow:'auto', marginTop:'.6rem'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>Fornecedor</th><th>Categoria</th><th>Preço atual</th></tr></thead>
            <tbody>
              {filteredProviders.map((p:any)=> (
                <tr key={p.id} onClick={()=> setSelectedProvider(p)} style={{cursor:'pointer'}}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>R$ {Number(p.priceFrom||0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h3>Overrides de Preço/Promo</h3>
        {selectedProvider ? (
          <div style={{display:'grid', gap:'.6rem'}}>
            <div style={{display:'flex', justifyContent:'space-between'}}>
              <strong>{selectedProvider.name}</strong>
              <small style={{opacity:.7}}>ID: {selectedProvider.id}</small>
            </div>
            <div style={{display:'grid', gap:'.5rem', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))'}}>
              <input id="ov_price" type="number" step="0.01" placeholder="Preço base (R$)" />
              <input id="ov_promo_pct" type="number" step="1" placeholder="Promo % (opcional)" />
              <input id="ov_promo_label" placeholder="Rótulo da promoção (opcional)" />
            </div>
            <div style={{display:'flex', gap:'.5rem'}}>
              <button className="btn btn-primary" onClick={()=>{
                const price = Number((document.getElementById('ov_price') as HTMLInputElement)?.value || NaN)
                const promoPercent = Number((document.getElementById('ov_promo_pct') as HTMLInputElement)?.value || NaN)
                const promoLabel = (document.getElementById('ov_promo_label') as HTMLInputElement)?.value?.trim()
                if(Number.isNaN(price)) { alert('Informe o preço base em reais.'); return }
                setProviderOverride({ providerId: String(selectedProvider.id), providerName: String(selectedProvider.name), priceFrom: price, promoPercent: Number.isNaN(promoPercent)? undefined : promoPercent, promoLabel: promoLabel || undefined })
                refreshAdmin()
              }}>Salvar Override</button>
              <button className="btn danger" onClick={()=>{ removeProviderOverride(String(selectedProvider.id)); refreshAdmin() }}>Remover Override</button>
            </div>
          </div>
        ) : <div>Selecione um fornecedor na lista ao lado.</div>}
      </section>

      <section className="card">
        <h3>Overrides Ativos</h3>
        <div style={{overflow:'auto'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>Fornecedor</th><th>Preço Base</th><th>Promo %</th><th>Rótulo</th><th>Atualizado</th><th>Ação</th></tr></thead>
            <tbody>
              {admin.providerOverrides.map(o=> (
                <tr key={o.providerId}>
                  <td>{o.providerName}</td>
                  <td>{typeof o.priceFrom==='number'? `R$ ${o.priceFrom.toFixed(2)}` : '-'}</td>
                  <td>{typeof o.promoPercent==='number'? `${o.promoPercent}%` : '-'}</td>
                  <td>{o.promoLabel || '-'}</td>
                  <td>{new Date(o.updatedAt).toLocaleString()}</td>
                  <td><button onClick={()=>{ removeProviderOverride(o.providerId); refreshAdmin() }}>Remover</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )

  const ConteudoEUsuarios = (
    <div className="grid" style={{gap:'1rem'}}>
      <section className="card">
        <h3>Administradores</h3>
        <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap', marginBottom:'.4rem'}}>
          <span className="chip">Ativos: {admin.adminUsers.filter(u=>u.status==='active').length}</span>
          <span className="chip">Convidados: {admin.adminUsers.filter(u=>u.status==='invited').length}</span>
        </div>
        <div style={{display:'grid', gap:'.6rem'}}>
          <div style={{display:'grid', gridTemplateColumns:'minmax(220px, 1fr) auto', gap:'.5rem'}}>
            <input id="adm_email" type="email" placeholder="email@dominio.com" />
            <button className="btn btn-primary" onClick={()=>{
              const email = (document.getElementById('adm_email') as HTMLInputElement)?.value || ''
              const e = email.trim()
              const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
              if(!ok){ alert('Informe um e-mail válido.'); return }
              fetch('/api/admin/invite', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: e, redirectTo: window.location.origin + '/login' })
              }).then(async (r)=>{
                if(!r.ok){
                  const err = await r.json().catch(()=>({}))
                  alert('Falha ao enviar convite via Supabase: ' + (err?.error || r.statusText))
                } else {
                  inviteAdmin(e)
                  refreshAdmin()
                  alert('Convite enviado por e-mail e registrado.')
                }
              }).catch((err)=>{
                console.error('[invite] error', err)
                inviteAdmin(e)
                refreshAdmin()
                alert('Convite registrado localmente. Configure SUPABASE_SERVICE_ROLE_KEY para enviar e-mail.')
              }).finally(()=>{
                ;(document.getElementById('adm_email') as HTMLInputElement).value = ''
              })
            }}>Convidar</button>
          </div>
          <small style={{color:'var(--color-muted)'}}>O sistema envia e-mail via Supabase e registra localmente. Se o service role não estiver configurado, apenas o registro local será feito.</small>
        </div>
        <div style={{maxHeight:'220px', overflow:'auto', marginTop:'.6rem'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>E-mail</th><th>Status</th><th>Convidado em</th><th>Ativado em</th><th>Ações</th></tr></thead>
            <tbody>
              {admin.adminUsers.map(u=> (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.status}</td>
                  <td>{u.invitedAt? new Date(u.invitedAt).toLocaleString(): '-'}</td>
                  <td>{u.activatedAt? new Date(u.activatedAt).toLocaleString(): '-'}</td>
                  <td style={{display:'flex', gap:'.4rem'}}>
                    {u.status==='invited' && (
                      <button className="btn btn-secondary" onClick={()=>{ activateAdmin(u.id); refreshAdmin() }}>Ativar</button>
                    )}
                    <button className="btn danger" onClick={()=>{ removeAdminUser(u.id); refreshAdmin() }}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h3>Fornecedores</h3>
        <div style={{maxHeight:'220px', overflow:'auto'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>Nome</th><th>Categoria</th><th>Rating</th></tr></thead>
            <tbody>
              {providers.map((p:any)=>(<tr key={p.id}><td>{p.name}</td><td>{p.category}</td><td>{p.rating?.toFixed(1)}</td></tr>))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h3>Categorias sugeridas (pendentes)</h3>
        {pendingCats.length === 0 ? (
          <small style={{color:'var(--color-muted)'}}>Nenhuma sugestão pendente.</small>
        ) : (
          <div className="grid" style={{gap:'.6rem'}}>
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
      </section>
      <section className="card">
        <h3>Gestão de Categorias</h3>
        <div style={{overflow:'auto'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>Categoria</th><th>Ativa</th></tr></thead>
            <tbody>
              {admin.categoriesOverride.map(c=> (<tr key={c.name}><td>{c.name}</td><td>{c.active? 'Sim':'Não'}</td></tr>))}
            </tbody>
          </table>
        </div>
        <div style={{display:'flex', gap:'.5rem', marginTop:'.5rem'}}>
          <input id="cat_name" placeholder="Nova categoria" />
          <label style={{display:'flex', alignItems:'center', gap:'.3rem'}}><input id="cat_active" type="checkbox" defaultChecked /> Ativa</label>
          <button onClick={()=>{
            const name = (document.getElementById('cat_name') as HTMLInputElement)?.value?.trim()
            const active = (document.getElementById('cat_active') as HTMLInputElement)?.checked
            if(!name) return
            const next = [...admin.categoriesOverride.filter(c=>c.name!==name), { name, active: !!active }]
            setCategoriesOverride(next)
            refreshAdmin()
          }}>Salvar Categoria</button>
        </div>
      </section>
      <section className="card">
        <h3>Avaliações</h3>
        <div style={{maxHeight:'220px', overflow:'auto'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>Fornecedor</th><th>Nota</th><th>Texto</th><th>Aprovada</th><th>Ação</th></tr></thead>
            <tbody>
              {admin.reviews.map(r=> (
                <tr key={r.id}>
                  <td>{r.providerName}</td><td>{r.rating}</td><td style={{maxWidth:'360px'}}>{r.text}</td><td>{r.approved?'Sim':'Não'}</td>
                  <td>
                    <button onClick={()=>{ moderateReview(r.id, !r.approved); refreshAdmin() }}>{r.approved?'Reprovar':'Aprovar'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )

  const TransacoesESuporte = (
    <div className="grid" style={{gap:'1rem'}}>
      <section className="card">
        <h3>Pedidos</h3>
        <div style={{maxHeight:'220px', overflow:'auto'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>Data</th><th>Fornecedor</th><th>Cliente</th><th>Total (R$)</th><th>Comissão</th><th>Status</th></tr></thead>
            <tbody>
              {admin.orders.map(o=> (
                <tr key={o.id}>
                  <td>{new Date(o.date).toLocaleDateString()}</td>
                  <td>{o.providerName}</td>
                  <td>{o.clientName}</td>
                  <td>{o.totalBRL.toFixed(2)}</td>
                  <td>R$ {(o.totalBRL * o.commissionPct).toFixed(2)}</td>
                  <td>
                    <select defaultValue={o.status} onChange={(e)=>{ upsertOrder({ ...o, status: e.target.value as any }); refreshAdmin() }}>
                      <option value="fechado">fechado</option>
                      <option value="pendente">pendente</option>
                      <option value="cancelado">cancelado</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h3>Busca Rápida (Suporte)</h3>
        <input id="q_order" placeholder="Cliente ou Fornecedor" />
        <div style={{maxHeight:'220px', overflow:'auto', marginTop:'.5rem'}}>
          <table className="table" style={{width:'100%'}}>
            <thead><tr><th>Data</th><th>Fornecedor</th><th>Cliente</th><th>Total (R$)</th><th>Status</th></tr></thead>
            <tbody>
              {admin.orders.filter(o=>{
                const q = ((document.getElementById('q_order') as HTMLInputElement)?.value || '').trim().toLowerCase()
                if(!q) return true
                return o.clientName.toLowerCase().includes(q) || o.providerName.toLowerCase().includes(q)
              }).map(o=> (
                <tr key={o.id}><td>{new Date(o.date).toLocaleDateString()}</td><td>{o.providerName}</td><td>{o.clientName}</td><td>{o.totalBRL.toFixed(2)}</td><td>{o.status}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card">
        <h3>Gestão de Repasse</h3>
        <div style={{display:'grid', gap:'.3rem'}}>
          {admin.orders.filter(o=> o.status==='fechado').map(o=>{
            const commission = o.totalBRL * o.commissionPct
            const liquid = o.totalBRL - commission
            return (
              <div key={o.id} style={{display:'flex', justifyContent:'space-between'}}>
                <div>{o.providerName} • {o.clientName} • {new Date(o.date).toLocaleDateString()}</div>
                <div>Comissão R$ {commission.toFixed(2)} • Repasse R$ {liquid.toFixed(2)}</div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )

  if(!unlocked){
    return (
      <div style={{position:'fixed', inset:0, display:'grid', placeItems:'center', background:'rgba(0,0,0,.45)'}}>
        <div className="card" style={{width:'100%', maxWidth:420, padding:'1rem', borderRadius:12, background:'#fff', color:'#000', boxShadow:'0 8px 24px rgba(0,0,0,.2)'}}>
          <h2 style={{marginTop:0}}>Super Admin – Login</h2>
          <p style={{color:'var(--color-muted)'}}>Acesse com suas credenciais administrativas para desbloquear.</p>
          <div style={{display:'grid', gap:'.6rem'}}>
            <label>E-mail
              <input type="email" value={loginEmail} onChange={e=> setLoginEmail(e.target.value)} placeholder="email@dominio.com" />
            </label>
            <label>Senha
              <input type="password" value={loginPassword} onChange={e=> setLoginPassword(e.target.value)} />
            </label>
            <div style={{display:'flex', justifyContent:'flex-end', gap:'.5rem', marginTop:'.4rem'}}>
              <button className="btn btn-primary" onClick={()=> unlock(loginEmail, loginPassword)}>Entrar</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{padding:'1rem'}}>
      <h2>Super Admin – FestaFácil</h2>
      <div className="card" style={{marginTop:'.6rem'}}>
        <h3>Dashboard Principal</h3>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(260px, 1fr))', gap:'1rem'}}>
          <div className="card" style={{display:'grid', gap:'.35rem', padding:'1rem'}}>
            <span style={{opacity:.7}}>Receita Total (30d)</span>
            <strong style={{fontSize:'1.25rem'}}>R$ {totalRevenue30d.toFixed(2)}</strong>
          </div>
          <div className="card" style={{display:'grid', gap:'.35rem', padding:'1rem'}}>
            <span style={{opacity:.7}}>FestCoins Vendidos (30d)</span>
            <strong style={{fontSize:'1.25rem'}}>R$ {kpis.coinsRev.toFixed(2)}</strong>
          </div>
          <div className="card" style={{display:'grid', gap:'.35rem', padding:'1rem'}}>
            <span style={{opacity:.7}}>MRR Destaques</span>
            <strong style={{fontSize:'1.25rem'}}>R$ {kpis.mrr.toFixed(2)}</strong>
          </div>
          <div className="card" style={{display:'grid', gap:'.35rem', padding:'1rem'}}>
            <span style={{opacity:.7}}>Comissão (30d)</span>
            <strong style={{fontSize:'1.25rem'}}>R$ {kpis.commissions.toFixed(2)}</strong>
          </div>
          <div className="card" style={{display:'grid', gap:'.35rem', padding:'1rem'}}>
            <span style={{opacity:.7}}>Banners Mensal</span>
            <strong style={{fontSize:'1.25rem'}}>R$ {kpis.bannersMonthly.toFixed(2)}</strong>
          </div>
      </div>
      </div>
      <div className="card" style={{marginTop:'.8rem'}}>
        <h3>Receita e Comissões (14 dias)</h3>
        <SVGChart data={dailySeries} />
      </div>
      <div className="card" style={{marginTop:'1rem'}}>
        <Tabs tabs={[
          {key:'moedas', label:'Monetização – FestCoins', content: MonetizacaoMoedas},
          {key:'preco', label:'Preço e Promoção', content: PrecoPromocao},
          {key:'destaques', label:'Destaques e Banners', content: DestaquesEBanners},
          {key:'conteudo', label:'Conteúdo e Usuários', content: ConteudoEUsuarios},
          {key:'transacoes', label:'Transações e Suporte', content: TransacoesESuporte},
        ]} initial={'moedas'} />
      </div>
    </div>
  )
}