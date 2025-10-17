import React from 'react'
import { useMemo } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { getStore } from '@/utils/realtime'

export default function ClientOrderDetails(){
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const orders = useMemo(()=>{
    try{
      const os = getStore('orders', []) as any[]
      return Array.isArray(os) ? os : []
    }catch{ return [] }
  }, [])

  const idx = /^\\d+$/.test(String(id)) ? Number(id) : NaN
  const orderById = orders.find(o=> String(o?.id||'') === String(id))
  const order = orderById ?? (Number.isFinite(idx) ? orders[idx] : null)

  return (
    <div className="container" style={{padding:'1rem 1rem 6rem'}}>
      <div style={{display:'flex', alignItems:'center', gap:'.6rem', flexWrap:'wrap', marginBottom:'.5rem'}}>
        <button className="btn btn-secondary" onClick={()=> navigate('/painel/cliente')}>Voltar</button>
        <Link className="btn" to="/painel/cliente">Painel do Cliente</Link>
      </div>
      <section className="card" style={{margin:0}}>
        <div style={{display:'grid', rowGap:'.9rem', padding:'0 1rem 1.25rem'}}>
          <h3>Detalhes do Pedido</h3>
          {!order && (
            <small style={{color:'var(--color-danger)'}}>Pedido não encontrado.</small>
          )}
          {order && (
            <div style={{display:'grid', rowGap:'.75rem'}}>
              <div style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:'.75rem'}}>
                <div>
                  <strong>Fornecedor</strong>
                  <div>{String(order?.providerName||'-')}</div>
                </div>
                <div>
                  <strong>Cliente</strong>
                  <div>{String(order?.clientName||'-')}</div>
                </div>
                <div>
                  <strong>Status</strong>
                  <div>{String(order?.status||'-')}</div>
                </div>
                <div>
                  <strong>Data</strong>
                  <div>{order?.date? new Date(order.date).toLocaleString(): '-'}</div>
                </div>
                <div>
                  <strong>Total (R$)</strong>
                  <div>{Number(order?.totalBRL||0).toFixed(2)}</div>
                </div>
              </div>
              {Array.isArray(order?.items) && order.items.length>0 && (
                <div>
                  <h4 style={{margin:'0 0 .25rem'}}>Itens</h4>
                  <table className="table" style={{width:'100%'}}>
                    <thead>
                      <tr>
                        <th style={{padding:'.6rem 1rem'}}>Item</th>
                        <th style={{padding:'.6rem 1rem'}}>Qtde</th>
                        <th style={{padding:'.6rem 1rem'}}>Preço (R$)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((it:any, i:number)=> (
                        <tr key={String(it?.id||i)}>
                          <td style={{padding:'.5rem 1rem'}}>{String(it?.name||'-')}</td>
                          <td style={{padding:'.5rem 1rem'}}>{Number(it?.qty||1)}</td>
                          <td style={{padding:'.5rem 1rem'}}>{Number(it?.priceBRL||0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}