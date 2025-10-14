import { useState } from 'react'

export default function Checkout(){
  const [ok, setOk] = useState(false)
  return (
    <section className="section" style={{display:'grid', gap:'1rem'}}>
      <div className="card" style={{padding:'1rem', display:'grid', gap:'.6rem'}}>
        <h1 style={{margin:0}}>Confirmação do Pedido</h1>
        <p style={{color:'var(--color-muted)'}}>Revise seus dados e conclua o pagamento.</p>
        <div className="grid grid-2">
          <div className="card" style={{padding:'.8rem'}}>
            <strong>Resumo</strong>
            <ul>
              <li>Serviço: Selecionado no fornecedor</li>
              <li>Data: Informada na solicitação</li>
              <li>Total estimado: A combinar com o fornecedor</li>
            </ul>
          </div>
          <div className="card" style={{padding:'.8rem'}}>
            <strong>Pagamento</strong>
            {!ok ? (
              <div style={{display:'grid', gap:'.5rem'}}>
                <label>Nome no cartão<input style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/></label>
                <label>Número<input inputMode="numeric" placeholder="0000 0000 0000 0000" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/></label>
                <div style={{display:'flex', gap:'.5rem'}}>
                  <label style={{flex:1}}>Validade<input placeholder="MM/AA" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/></label>
                  <label style={{flex:1}}>CVC<input inputMode="numeric" placeholder="000" style={{width:'100%', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/></label>
                </div>
                <button className="btn btn-secondary" onClick={()=>setOk(true)}>Pagar e enviar pedido</button>
              </div>
            ) : (
              <div className="fade-in">
                <p>Pagamento processado com sucesso! Você receberá atualizações pelo chat e e-mail.</p>
                <a className="btn btn-primary" href="/">Voltar à Home</a>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}