const ITEMS = [
  { key:'brinquedos', label:'Brinquedos', icon:'🎪' },
  { key:'estacoes', label:'Estações', icon:'🍿🍭' },
  { key:'buffet', label:'Buffet', icon:'🍽️' },
  { key:'decoracao', label:'Decoração', icon:'🎈' },
  { key:'recreacao', label:'Recreação', icon:'🤹' },
  { key:'bolo', label:'Bolo', icon:'🎂' },
]

export default function CategoryStrip(){
  return (
    <section className="section">
      <div className="container" style={{display:'grid', gap:'.8rem'}}>
        <h2 style={{fontSize:'1.1rem'}}>Categorias em destaque</h2>
        <div style={{
          display:'grid',
          gap:'.6rem',
          gridTemplateColumns:'repeat(auto-fit, minmax(90px, 1fr))'
        }}>
          {ITEMS.map(i => (
            <div key={i.key} className="card" role="button" tabIndex={0} style={{textAlign:'center', padding:'.9rem'}}>
              <div style={{fontSize:'1.6rem'}}>{i.icon}</div>
              <div style={{marginTop:'.4rem', fontSize:'.95rem'}}>{i.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}