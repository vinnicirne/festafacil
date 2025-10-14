import { Link } from 'react-router-dom'

export default function CTASection(){
  return (
    <section className="section" aria-label="Ações">
      <div className="card" style={{padding:'1.2rem', textAlign:'center'}}>
        <h2 style={{fontSize:'1.2rem'}}>Pronto para começar?</h2>
        <p style={{color:'var(--color-muted)', margin:'.4rem 0 1rem'}}>Encontre fornecedores para a sua festa ou cadastre-se como profissional.</p>
        <div style={{display:'flex', gap:'.6rem', justifyContent:'center', flexWrap:'wrap'}}>
          <Link to="/busca" className="btn btn-primary">Encontrar profissional</Link>
          <Link to="/painel/fornecedor" className="btn btn-secondary">Sou profissional</Link>
        </div>
      </div>
    </section>
  )
}