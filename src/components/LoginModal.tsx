import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Modal from '@/components/Modal'
import { signIn } from '@/utils/auth'
import { getSupabase } from '@/utils/supabase'

type Mode = 'login' | 'reset'

type Props = {
  open: boolean
  onClose: ()=>void
  mode?: Mode
}

export default function LoginModal({ open, onClose, mode='login' }: Props){
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stage, setStage] = useState<Mode>(mode)

  useEffect(()=>{ setStage(mode) }, [mode])

  const canLogin = useMemo(()=> (/.+@.+\..+/.test(email) && password.length>=8), [email, password])
  const canResetReq = useMemo(()=> /.+@.+\..+/.test(email), [email])
  const canSetNewPwd = useMemo(()=> newPassword.length>=8, [newPassword])

  const doLogin = async (e?: React.FormEvent)=>{
    if(e) e.preventDefault()
    if(!canLogin) return
    setLoading(true); setError(null)
    try{
      await signIn(email, password)
      onClose()
      navigate('/painel/usuario')
    }catch(err){ setError((err as Error)?.message || 'Falha ao entrar'); }
    finally{ setLoading(false) }
  }

  const startOAuth = async (provider: 'google'|'facebook')=>{
    const sb = getSupabase()
    if(!sb){ setError('Supabase não configurado'); return }
    try{
      const redirectTo = `${window.location.origin}/painel/usuario`
      await sb.auth.signInWithOAuth({ provider, options: { redirectTo } })
    }catch(err){ setError((err as Error)?.message || `Falha no login com ${provider}`) }
  }

  const requestPasswordReset = async ()=>{
    const sb = getSupabase()
    if(!sb){ setError('Supabase não configurado'); return }
    setLoading(true); setError(null)
    try{
      const redirectTo = `${window.location.origin}/auth?mode=reset`
      await sb.auth.resetPasswordForEmail(email, { redirectTo })
      alert('Enviamos um e-mail para redefinição de senha. Verifique sua caixa de entrada.')
    }catch(err){ setError((err as Error)?.message || 'Falha ao solicitar redefinição') }
    finally{ setLoading(false) }
  }

  const setNewPasswordNow = async ()=>{
    const sb = getSupabase()
    if(!sb){ setError('Supabase não configurado'); return }
    if(!canSetNewPwd) return
    setLoading(true); setError(null)
    try{
      await sb.auth.updateUser({ password: newPassword })
      alert('Senha atualizada com sucesso!')
      onClose()
      navigate('/painel/usuario')
    }catch(err){ setError((err as Error)?.message || 'Não foi possível atualizar a senha') }
    finally{ setLoading(false) }
  }

  return (
    <Modal open={open} onClose={onClose} title={stage==='login'? 'Entrar' : 'Redefinir senha'} size="md">
      {stage==='login' && (
        <form className="auth-form" onSubmit={doLogin}>
          {error && <div className="card" style={{border:'1px solid #f5c6cb', background:'#f8d7da', color:'#721c24', padding:'.6rem', borderRadius:8}}>{error}</div>}
          <label>E-mail</label>
          <input type="email" value={email} onChange={e=> setEmail(e.target.value)} placeholder="seu@email.com" required />
          <label>Senha</label>
          <input type="password" value={password} onChange={e=> setPassword(e.target.value)} placeholder="********" minLength={8} required />
          <button className="btn btn-primary" disabled={!canLogin || loading} type="submit">{loading? 'Entrando…':'Entrar'}</button>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <button type="button" className="btn" onClick={()=> setStage('reset')} style={{background:'#fff', border:'1px solid #e6edf1'}}>Esqueci a senha</button>
            <button type="button" className="btn" onClick={()=> { onClose(); navigate('/auth?mode=signup') }} style={{background:'#fff', border:'1px solid #e6edf1'}}>Cadastrar</button>
          </div>
          <div style={{display:'flex', gap:'.6rem', flexWrap:'wrap'}}>
            <button type="button" className="btn" onClick={()=> startOAuth('google')} style={{border:'2px solid #2b8', color:'#2b8', background:'#fff'}}>Entrar com Google</button>
            <button type="button" className="btn" onClick={()=> startOAuth('facebook')}>Facebook</button>
          </div>
        </form>
      )}
      {stage==='reset' && (
        <div className="auth-form">
          {error && <div className="card" style={{border:'1px solid #f5c6cb', background:'#f8d7da', color:'#721c24', padding:'.6rem', borderRadius:8}}>{error}</div>}
          <p>Informe seu e-mail para receber o link de redefinição.</p>
          <label>E-mail</label>
          <input type="email" value={email} onChange={e=> setEmail(e.target.value)} placeholder="seu@email.com" />
          <button className="btn btn-primary" disabled={!canResetReq || loading} onClick={requestPasswordReset}>{loading? 'Enviando…':'Enviar link de redefinição'}</button>
          <hr />
          <p>Se você já clicou no link do e-mail, defina a nova senha abaixo.</p>
          <label>Nova senha</label>
          <input type="password" value={newPassword} onChange={e=> setNewPassword(e.target.value)} placeholder="********" minLength={8} />
          <button className="btn btn-secondary" disabled={!canSetNewPwd || loading} onClick={setNewPasswordNow}>{loading? 'Salvando…':'Salvar nova senha'}</button>
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <button type="button" className="btn" onClick={()=> setStage('login')} style={{background:'#fff', border:'1px solid #e6edf1'}}>Voltar ao login</button>
          </div>
        </div>
      )}
    </Modal>
  )
}