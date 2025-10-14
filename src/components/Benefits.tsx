export default function Benefits(){
  const items = [
    { icon: '💬', title: 'Fale direto', desc: 'Você negocia sem intermediários nem comissão.' },
    { icon: '📍', title: 'Perto de você', desc: 'Resultados priorizam fornecedores da sua região.' },
    { icon: '⭐', title: 'Avaliações reais', desc: 'Feedback de clientes para decidir com confiança.' },
    { icon: '⚡', title: 'Orçamentos rápidos', desc: 'Envie seu pedido e receba respostas agilmente.' },
  ]
  return (
    <section className="section" aria-label="Vantagens">
      <div className="container" style={{display:'grid', gap:'.9rem'}}>
        <h2 style={{fontSize:'1.2rem'}}>Por que usar a FestaFácil</h2>
        <div style={{display:'grid', gap:'.8rem', gridTemplateColumns:'repeat(auto-fit, minmax(210px, 1fr))'}}>
          {items.map(i=> (
            <div key={i.title} className="card" style={{padding:'1rem'}}>
              <div style={{fontSize:'1.5rem'}}>{i.icon}</div>
              <strong style={{display:'block', marginTop:'.4rem'}}>{i.title}</strong>
              <p style={{marginTop:'.2rem', color:'var(--color-muted)'}}>{i.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}