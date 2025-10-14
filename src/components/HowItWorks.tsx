export default function HowItWorks(){
  const steps = [
    { n: 1, title: 'Informe serviço e CEP', desc: 'Diga o que precisa e onde será sua festa.' },
    { n: 2, title: 'Compare opções', desc: 'Veja avaliações, fotos e preços de fornecedores.' },
    { n: 3, title: 'Fale direto', desc: 'Combine detalhes sem taxa de intermediação.' },
  ]
  return (
    <section className="section" aria-label="Como funciona">
      <div className="container" style={{display:'grid', gap:'.9rem'}}>
        <h2 style={{fontSize:'1.2rem'}}>Como funciona</h2>
        <div style={{display:'grid', gap:'.8rem', gridTemplateColumns:'repeat(auto-fit, minmax(210px, 1fr))'}}>
          {steps.map(s=> (
            <div key={s.n} className="card" style={{padding:'1rem'}}>
              <div style={{display:'flex', alignItems:'center', gap:'.6rem'}}>
                <span style={{width:28, height:28, borderRadius:8, background:'#eef7ff', color:'#2a6fbe', display:'grid', placeItems:'center', fontWeight:700}}>{s.n}</span>
                <strong>{s.title}</strong>
              </div>
              <p style={{marginTop:'.4rem', color:'var(--color-muted)'}}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}