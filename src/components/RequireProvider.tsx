import { useEffect, useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { getSupabase } from '@/utils/supabase'

export default function RequireProvider({ children }: { children: React.ReactNode }){
  const loc = useLocation()
  const [ready, setReady] = useState(false)
  const [allowed, setAllowed] = useState(false)

  useEffect(()=>{
    let alive = true
    const run = async ()=>{
      const sb = getSupabase()
      if(!sb){
        // Sem Supabase configurado, não permitir acesso ao painel.
        // Redireciona para /auth para exigir login.
        if(alive) { setAllowed(false); setReady(true) }
        return
      }
      const { data } = await sb.auth.getSession()
      const sess = data?.session
      if(!sess){ if(alive){ setAllowed(false); setReady(true) } ; return }
      const uid = sess.user?.id
      const { data: acc, error } = await sb.from('provider_accounts').select('user_id, status').eq('user_id', uid).limit(1).maybeSingle()
      if(error){ if(alive){ setAllowed(false); setReady(true) } ; return }
      const ok = !!acc?.user_id && String(acc?.status||'') === 'approved'
      if(alive){ setAllowed(ok); setReady(true) }
    }
    run()
    return ()=>{ alive = false }
  }, [loc.pathname])

  if(!ready) return <div style={{padding:'1rem'}}>Carregando…</div>
  if(!allowed) return <Navigate to="/auth?role=fornecedor&mode=login" replace />
  return <>{children}</>
}