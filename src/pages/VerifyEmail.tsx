import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabase } from '@/utils/supabase'

export default function VerifyEmail(){
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const [email, setEmail] = useState<string>('')
  const [sending, setSending] = useState<boolean>(false)
  const [status, setStatus] = useState<string>('')

  useEffect(()=>{ setEmail(sp.get('email') || '') }, [sp])

  const resend = async ()=>{
    setSending(true)
    setStatus('')
    try{
      const sb = getSupabase()
      if(!sb) throw new Error('Supabase não configurado')
      if(!email) throw new Error('Informe seu e-mail')
      await sb.auth.resend({ type: 'signup', email })
      setStatus('Reenviado! Verifique sua caixa de entrada e spam.')
    }catch(err){
      setStatus('Não foi possível reenviar: ' + (err as Error)?.message)
    }finally{
      setSending(false)
    }
  }

  return (
    <section className="section" style={{display:'grid', justifyContent:'center'}}>
      <div className="container" style={{maxWidth:640}}>
        <div className="card" style={{padding:'1rem', display:'grid', gap:'.8rem'}}>
          <h1 style={{margin:0}}>Verifique seu e-mail</h1>
          <p style={{color:'var(--color-muted)'}}>Enviamos um link de confirmação para o seu e-mail. Confirme para concluir o cadastro e acessar o painel.</p>
          <label>E-mail
            <input type="email" value={email} onChange={e=> setEmail(e.target.value)} placeholder="seu e-mail" />
          </label>
          <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap'}}>
            <button className="btn btn-primary" onClick={resend} disabled={sending || !email}>{sending? 'enviando…' : 'reenviar confirmação'}</button>
            <button className="btn" onClick={()=> navigate('/auth?mode=login')}>voltar ao login</button>
          </div>
          {status && <small role="status" aria-live="polite" style={{color:'var(--color-muted)'}}>{status}</small>}
        </div>
      </div>
    </section>
  )
}