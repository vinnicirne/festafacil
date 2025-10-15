import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getAdminState, recordCoinPurchase } from '@/utils/adminStore'

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
      const ref = JSON.parse(external)
      const st = getAdminState()
      const pkg = st.coinPackages.find(p=> p.id === ref.packageId)
      if(pkg){
        recordCoinPurchase({ providerId: String(ref.providerId), providerName: String(ref.providerName), packageId: pkg.id, coins: pkg.coins, priceBRL: pkg.priceBRL })
      }
    }catch{}
  }, [loc.search])

  return (
    <div className="container" style={{padding:'1rem'}}>
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
        <h2 style={{margin:0}}>Pagamento aprovado!</h2>
        <p>Seu pagamento foi aprovado e o saldo de moedas foi atualizado. Você pode voltar ao painel para continuar gerenciando.</p>
        <div>
          <button className="btn btn-primary" onClick={()=> navigate('/painel/admin')}>Voltar ao Painel</button>
        </div>
      </div>
    </div>
  )
}