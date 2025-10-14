export default function StatsStrip(){
  const stats = [
    { value: '12K', label: 'festas planejadas' },
    { value: '8K', label: 'orçamentos solicitados' },
    { value: '2.1K', label: 'fornecedores cadastrados' },
    { value: '120', label: 'cidades ativas' }
  ]
  return (
    <section className="section" aria-label="Números da plataforma">
      <div className="card" style={{padding:'1rem'}}>
        <div className="container" style={{display:'grid', gridTemplateColumns:'repeat(2, 1fr)', gap:'1rem'}}>
          {stats.map(s=> (
            <div key={s.label} style={{textAlign:'center'}}>
              <div style={{fontWeight:800, fontSize:'1.4rem'}}>{s.value}</div>
              <div style={{color:'var(--color-muted)'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}