import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import RequireProvider from './components/RequireProvider'
import RequireAuth from './components/RequireAuth'
import Footer from './components/Footer'
import BottomNav from './components/BottomNav'

const Home = lazy(() => import('./pages/Home'))
const Search = lazy(() => import('./pages/Search'))
const ProviderDetails = lazy(() => import('./pages/ProviderDetails'))
const Checkout = lazy(() => import('./pages/Checkout'))
const CheckoutSuccess = lazy(() => import('./pages/CheckoutSuccess'))
const ProviderDashboard = lazy(() => import('./pages/ProviderDashboard'))
const UserDashboard = lazy(() => import('./pages/UserDashboard'))
const About = lazy(() => import('./pages/About'))
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'))
const SignupUser = lazy(() => import('./pages/SignupUser'))
const SignupProvider = lazy(() => import('./pages/SignupProvider'))
const Auth = lazy(() => import('./pages/Auth'))
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'))

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
            <Route path="/checkout/success" element={<CheckoutSuccess />} />
            <Route path="/cadastro-fornecedor" element={<Navigate to="/auth?role=fornecedor&mode=signup" replace />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/verificar-email" element={<VerifyEmail />} />
            <Route path="/painel/fornecedor" element={<RequireProvider><ProviderDashboard /></RequireProvider>} />
            <Route path="/painel/usuario" element={<RequireAuth><UserDashboard /></RequireAuth>} />
            <Route path="/painel/admin" element={<SuperAdminDashboard />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <BottomNav />
    </div>
  )
}