import { Link } from 'react-router-dom'
import { useEffect } from 'react'

type Props = { open: boolean; onClose: () => void }

export default function MobileMenu({ open, onClose }: Props){
  // fecha com ESC
  useEffect(()=>{
    const onKey = (e: KeyboardEvent)=>{ if(e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return ()=> window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div
        className={`drawer-overlay ${open ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={`drawer ${open ? 'open' : ''}`}
        aria-hidden={!open}
        aria-label="Menu móvel"
      >
        <div className="drawer-header">
          <button aria-label="Fechar menu" className="drawer-close" onClick={onClose}>×</button>
          <div className="brand">
            <span className="brand-mark" />
            <strong>FestaFácil</strong>
          </div>
        </div>
        <nav className="drawer-content">
          <p className="drawer-heading">Navegue por</p>
          <ul className="drawer-list">
            <li><Link to="/busca" onClick={onClose}>Cidades</Link></li>
            <li><Link to="/busca" onClick={onClose}>Navegar pelo mapa</Link></li>
            <li><Link to="/busca" onClick={onClose}>Destaques</Link></li>
            <li><Link to="/sobre" onClick={onClose}>Sobre</Link></li>
          </ul>

          <div className="drawer-ctas">
            <Link className="btn drawer-btn drawer-btn--dark" to="/para-empresas" onClick={onClose}>Para Empresas</Link>
            <Link className="btn drawer-btn drawer-btn--accent" to="/auth?role=fornecedor" onClick={onClose}>Sou Fornecedor</Link>
          <Link className="btn drawer-btn drawer-btn--primary" to="/cadastro-cliente" onClick={onClose}>Quero Contratar</Link>
            <Link className="btn drawer-btn drawer-btn--success" to="/instalar" onClick={onClose}>Instalar App</Link>
          </div>
        </nav>
      </aside>
    </>
  )
}