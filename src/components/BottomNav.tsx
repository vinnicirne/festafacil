import { Link, useLocation } from 'react-router-dom'

export default function BottomNav(){
  const { pathname } = useLocation()
  const item = (to:string, label:string, icon:string)=> (
    <Link to={to} aria-label={label} className={pathname===to? 'active' : ''}>
      <span aria-hidden>{icon}</span>
      <small>{label}</small>
    </Link>
  )
  return (
    <nav className="bottom-nav" aria-label="Navegação inferior">
      <div className="inner">
        {item('/', 'Home', '🏠')}
  {item('/auth?role=cliente&mode=signup', 'Contratar', '🛒')}
  {item('/auth?mode=login', 'Login', '👤')}
      </div>
    </nav>
  )
}