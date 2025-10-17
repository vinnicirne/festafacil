import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAdminState, recordCoinPurchase, upsertOrder, appendLog } from '@/utils/adminStore'
import { getStore, setStore } from '@/utils/realtime'

export default function CheckoutSuccess(){
  const loc = useLocation()
  const navigate = useNavigate()

  useEffect(()=>{
    const sp = new URLSearchParams(loc.search)
    const status = sp.get('collection_status') || sp.get('status') || ''
    const prefId = sp.get('preference_id') || ''
    const external = sp.get('external_reference') || ''
    if(status.toLowerCase() !== 'approved') return
    try{
      const ref = JSON.parse(external||'{}')
      const st = getAdminState()
      // Compra de moedas (fluxo existente)
      const pkg = ref?.packageId ? st.coinPackages.find(p=> p.id === ref.packageId) : null
      if(pkg){
        recordCoinPurchase({ providerId: String(ref.providerId), providerName: String(ref.providerName), packageId: pkg.id, coins: pkg.coins, priceBRL: pkg.priceBRL })
        appendLog('coins:purchase:paid', { providerId: String(ref.providerId), packageId: pkg.id, preference_id: prefId, amount: pkg.priceBRL })
      }
      // Pagamento de pedido por lead (novo fluxo)
      if(ref?.type==='order' && ref?.leadId){
        const ordId = `ord_${Math.random().toString(36).slice(2)}_${Date.now()}`
        upsertOrder({
          id: ordId,
          providerId: String(ref?.providerId||''),
          providerName: String(ref?.providerName||'Fornecedor'),
          clientName: String(ref?.clientName||'Cliente'),
          totalBRL: Number(ref?.amount||0),
          commissionPct: 0,
          date: new Date().toISOString(),
          status: 'fechado'
        })
        appendLog('order:paid:return', { leadId: String(ref.leadId), providerId: String(ref?.providerId||''), amount: Number(ref?.amount||0), preference_id: prefId })
        // Liberar transação vinculada
        const txs = getStore('transactions', []) as any[]
        setStore('transactions', (txs||[]).map(t=> t.leadId===ref.leadId ? { ...t, status: 'Liberado/Pago' } : t))
        // Atualizar lead em localStorage
        try{
          const rawLeads = localStorage.getItem('leads') || '[]'
          const leads = JSON.parse(rawLeads)
          const k = (x:any)=> `${String(x?.providerId||'')}:${String(x?.contato||'')}:${String(x?.createdAt||'')}`
          const idx = leads.findIndex((x:any)=> k(x)===ref.leadId)
          if(idx>=0){
            leads[idx] = { ...leads[idx], closedAt: new Date().toISOString(), status: 'Pedido Fechado' }
            localStorage.setItem('leads', JSON.stringify(leads))
            setStore('leads', leads)
          }
        }catch{}
      }
    }catch{}
  }, [loc.search])

  return (
    <div className="container" style={{padding:'1rem'}}>
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
        <h2 style={{margin:0}}>Pagamento aprovado!</h2>
        <p>Seu pagamento foi aprovado e o saldo de moedas foi atualizado. Você pode voltar ao painel para continuar gerenciando.</p>
        {(()=>{ const sp = new URLSearchParams(loc.search); const redirect = sp.get('redirect') || ''; const dest = redirect==='provider'? '/painel/fornecedor' : redirect==='client'? '/painel/usuario' : '/painel/admin'; return (
          <div>
            <button className="btn btn-primary" onClick={()=> navigate(dest)}>
              {redirect==='provider'? 'Voltar ao Painel do Fornecedor' : redirect==='client'? 'Ir ao Painel do Cliente' : 'Voltar ao Painel'}
            </button>
          </div>
        )})()}
      </div>
    </div>
  )
}