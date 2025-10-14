import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'

const Home = lazy(() => import('./pages/Home'))
const Search = lazy(() => import('./pages/Search'))
const ProviderDetails = lazy(() => import('./pages/ProviderDetails'))
const Checkout = lazy(() => import('./pages/Checkout'))
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'))
const UserDashboard = lazy(() => import('./pages/UserDashboard'))
const About = lazy(() => import('./pages/About'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const SignupUser = lazy(() => import('./pages/SignupUser'))
const SignupProvider = lazy(() => import('./pages/SignupProvider'))
const Auth = lazy(() => import('./pages/Auth'))

export default function App() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [location.pathname])

  return (
    <div className="app">
      <Navbar />
      <main>
        <Suspense fallback={<div className="loader" aria-label="Carregando">Carregando...</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sobre" element={<About />} />
            <Route path="/busca" element={<Search />} />
            <Route path="/fornecedor/:id" element={<ProviderDetails />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/cadastro-cliente" element={<SignupUser />} />
            <Route path="/cadastro-fornecedor" element={<SignupProvider />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/painel/fornecedor" element={<ProviderDashboard />} />
            <Route path="/painel/usuario" element={<UserDashboard />} />
            <Route path="/painel/admin" element={<AdminDashboard />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}