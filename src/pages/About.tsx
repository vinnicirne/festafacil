import { Link } from 'react-router-dom'

export default function About(){
  return (
    <section className="section" id="sobre">
      <div className="container" style={{display:'grid', gap:'1rem'}}>
        <header className="card" style={{padding:'1.4rem'}}>
          <h1 style={{margin:0, fontSize:'1.6rem'}}>O que é a FestaFácil?</h1>
          <p style={{color:'var(--color-muted)', marginTop:'.4rem'}}>
            Plataforma para contratar fornecedores de eventos de forma direta. Cobramos taxa de negociação aplicada ao fechamento do pedido.
            Pesquise por serviço e CEP, converse com o fornecedor e combine pagamento e condições.
          </p>
          <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap', marginTop:'.4rem'}}>
            <Link className="btn btn-primary" to="/busca">Quero contratar</Link>
            <Link className="btn btn-secondary" to="/painel/fornecedor">Sou fornecedor</Link>
          </div>
        </header>

        <div className="card" style={{padding:'1.2rem'}}>
          <h2 id="como-funciona" style={{marginTop:0}}>Como funciona</h2>
          <ol style={{display:'grid', gap:'.8rem', paddingLeft:'1rem'}}>
            <li><strong>Busque</strong> por categoria e CEP para ver quem atende sua região.</li>
            <li><strong>Fale direto</strong> com o fornecedor por chat/whatsapp para tirar dúvidas.</li>
            <li><strong>Agende</strong> o serviço, combine pagamento e depois deixe sua avaliação.</li>
          </ol>
        </div>

        <div className="card" style={{padding:'1.2rem'}}>
          <h2 style={{marginTop:0}}>Vantagens</h2>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))', gap:'1rem'}}>
            <div className="card" style={{padding:'1rem'}}>
              <strong>Taxa transparente</strong>
              <p style={{color:'var(--color-muted)'}}>Cobramos taxa de negociação aplicada ao fechamento do pedido.</p>
            </div>
            <div className="card" style={{padding:'1rem'}}>
              <strong>Busca por CEP</strong>
              <p style={{color:'var(--color-muted)'}}>Mostramos quem realmente atende a sua área.</p>
            </div>
            <div className="card" style={{padding:'1rem'}}>
              <strong>Avaliações reais</strong>
              <p style={{color:'var(--color-muted)'}}>Escolha com confiança através da nota e comentários.</p>
            </div>
            <div className="card" style={{padding:'1rem'}}>
              <strong>Variedade</strong>
              <p style={{color:'var(--color-muted)'}}>Decoração, buffet, brinquedos, fotografia e muito mais.</p>
            </div>
          </div>
        </div>

        <aside className="card" style={{padding:'1.2rem'}}>
          <h2 style={{marginTop:0}}>Para fornecedores</h2>
          <p style={{color:'var(--color-muted)'}}>Divulgue seus serviços, receba contatos diretos e aumente sua agenda.</p>
          <Link className="btn btn-primary" to="/painel/fornecedor">Criar meu perfil</Link>
        </aside>
      </div>
    </section>
  )
}