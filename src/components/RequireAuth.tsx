import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSupabase } from '@/utils/supabase'

type Props = { children: React.ReactNode }

export default function RequireAuth({ children }: Props){
  const navigate = useNavigate()
  const [status, setStatus] = useState<'checking'|'allowed'|'blocked'>('checking')

  useEffect(()=>{
    const sb = getSupabase()
    if(!sb){
      // Fallback leve: se não houver backend, usa presença de perfil local
      try{ setStatus(localStorage.getItem('user:profile')? 'allowed':'blocked') }catch{ setStatus('blocked') }
      return
    }
    sb.auth.getSession().then(({ data })=>{
      setStatus(data?.session? 'allowed':'blocked')
    }).catch(()=> setStatus('blocked'))
  }, [])

  useEffect(()=>{
    if(status==='blocked'){
      navigate('/auth?mode=login&role=cliente', { replace: true })
    }
  }, [status, navigate])

  if(status==='checking'){
    return <div className="loader" aria-label="Verificando acesso">Carregando...</div>
  }
  if(status==='blocked'){
    return null
  }
  return <>{children}</>
}