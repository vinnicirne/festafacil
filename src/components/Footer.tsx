export default function Footer(){
  return (
    <footer className="section" style={{paddingTop:'2rem'}}>
      <div className="card" style={{padding:'1.2rem'}}>
        <div className="container" style={{display:'grid', gap:'.8rem'}}>
          <div style={{display:'flex', gap:'1rem', flexWrap:'wrap'}}>
            <a href="/sobre" aria-label="Sobre">Sobre</a>
            <a href="/painel/fornecedor" aria-label="Painel do Fornecedor">Painel do Fornecedor</a>
            <a href="/painel/usuario" aria-label="Login">Login</a>
          </div>
          <small style={{color:'var(--color-muted)'}}>© {new Date().getFullYear()} FestaFácil. Todos os direitos reservados.</small>
        </div>
      </div>
    </footer>
  )
}