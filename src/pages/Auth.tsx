import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Modal from '@/components/Modal'
import { fetchViaCEP } from '@/utils/viacep'

type Role = 'cliente' | 'fornecedor'
type Mode = 'login' | 'signup'

function maskPhone(v: string){
  const d = v.replace(/\D/g, '').slice(0,11)
  const p1 = d.slice(0,2), p2 = d.slice(2,7), p3 = d.slice(7)
  if(d.length<=2) return `(${p1}`
  if(d.length<=7) return `(${p1}) ${p2}`
  return `(${p1}) ${p2}-${p3}`
}
function maskCEP(v: string){
  const d = v.replace(/\D/g,'').slice(0,8)
  return d.length>5? `${d.slice(0,5)}-${d.slice(5)}` : d
}

export default function Auth(){
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const [open, setOpen] = useState(true)
  const [role, setRole] = useState<Role>((sp.get('role') as Role) || 'cliente')
  const [mode, setMode] = useState<Mode>('login')

  useEffect(()=>{ if(!open) navigate(-1) }, [open])

  // Login state (ilustrativo)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPwd, setLoginPwd] = useState('')

  // Signup Cliente (enxuto)
  const [cNome, setCNome] = useState('')
  const [cEmail, setCEmail] = useState('')
  const [cPwd, setCPwd] = useState('')
  const [cPhone, setCPhone] = useState('')
  const [cCep, setCCep] = useState('')
  const [cAddr, setCAddr] = useState('')
  const [cCity, setCCity] = useState('')
  const [cUf, setCUf] = useState('')
  const [loadingCep, setLoadingCep] = useState(false)

  const cValid = useMemo(()=> ({
    nome: cNome.trim().length>2,
    email: /.+@.+\..+/.test(cEmail),
    pwd: cPwd.length>=8,
    phone: cPhone.replace(/\D/g,'').length===11,
    cep: cCep.replace(/\D/g,'').length===8,
    addr: !!cAddr && !!cCity && !!cUf,
  }), [cNome,cEmail,cPwd,cPhone,cCep,cAddr,cCity,cUf])
  const cAllOk = Object.values(cValid).every(Boolean)

  useEffect(()=>{
    const raw = cCep.replace(/\D/g,'')
    if(raw.length===8){
      setLoadingCep(true)
      fetchViaCEP(raw).then(d=>{
        if(d){
          setCAddr(prev=> prev || d.logradouro || '')
          setCCity(prev=> prev || d.localidade || '')
          setCUf(prev=> prev || d.uf || '')
        }
      }).finally(()=> setLoadingCep(false))
    }
  }, [cCep])

  // Signup Fornecedor (primeira etapa)
  const [fMarca, setFMarca] = useState('')
  const [fDoc, setFDoc] = useState('')
  const [fContato, setFContato] = useState('')
  const [fEmail, setFEmail] = useState('')
  const [fPhone, setFPhone] = useState('')
  const [fPwd, setFPwd] = useState('')
  const fOk = fMarca.trim().length>1 && fDoc.replace(/\D/g,'').length>=11 && /.+@.+\..+/.test(fEmail) && fPhone.replace(/\D/g,'').length===11 && fPwd.length>=8 && fContato.trim().length>1

  const submitCliente = (e:React.FormEvent)=>{
    e.preventDefault()
    if(!cAllOk) return
    localStorage.setItem('ff:client', JSON.stringify({ nome:cNome, email:cEmail, phone:cPhone, cep:cCep, addr:cAddr, city:cCity, uf:cUf }))
    setOpen(false)
    navigate('/checkout')
  }
  const submitFornecedorPrimeiroPasso = (e:React.FormEvent)=>{
    e.preventDefault()
    if(!fOk) return
    localStorage.setItem('ff:provider:seed', JSON.stringify({ marca:fMarca, doc:fDoc, contato:fContato, email:fEmail, phone:fPhone }))
    setOpen(false)
    navigate('/cadastro-fornecedor')
  }

  return (
    <Modal open={open} onClose={()=> setOpen(false)} title="" >
      <div style={{display:'grid', gap:'.8rem'}}>
        <h2 style={{textAlign:'center', margin:'0 0 .2rem'}}>Você é fornecedor ou contratante?</h2>
        <div style={{display:'flex', gap:'.6rem', justifyContent:'center'}}>
          <button className={`chip ${role==='fornecedor'? 'chip--active':''}`} onClick={()=> setRole('fornecedor')} style={{borderRadius:24, padding:'.6rem 1rem', background: role==='fornecedor'? 'crimson':'#eee', color: role==='fornecedor'? '#fff':'#111'}}>fornecedor</button>
          <button className={`chip ${role==='cliente'? 'chip--active':''}`} onClick={()=> setRole('cliente')} style={{borderRadius:24, padding:'.6rem 1rem', background: role==='cliente'? 'var(--color-primary)':'#eee', color: role==='cliente'? '#fff':'#111'}}>contratante</button>
        </div>

        {mode==='login' && (
          <form className="card" style={{padding:'1rem', border:'2px solid #e3d5df'}} onSubmit={(e)=>{ e.preventDefault(); alert('Login demonstrativo'); }}>
            <label style={{marginBottom:'.3rem'}}>Qual foi seu e-mail de cadastro?</label>
            <input type="email" value={loginEmail} onChange={e=> setLoginEmail(e.target.value)} placeholder="e-mail" required />
            <div style={{height:'.6rem'}} />
            <label style={{marginBottom:'.3rem'}}>Senha</label>
            <input type="password" value={loginPwd} onChange={e=> setLoginPwd(e.target.value)} placeholder="Senha" required />
            <div style={{height:'.8rem'}} />
            <button className="btn" style={{background:'#0b6', color:'#fff', width:'100%'}}>acessar</button>
          </form>
        )}

        {mode==='signup' && role==='cliente' && (
          <form className="card" onSubmit={submitCliente} style={{padding:'1rem'}}>
            <div className="grid" style={{display:'grid', gap:'.6rem'}}>
              <input value={cNome} onChange={e=> setCNome(e.target.value)} placeholder="Nome completo" required />
              <input type="email" value={cEmail} onChange={e=> setCEmail(e.target.value)} placeholder="e-mail" required />
              <input type="password" value={cPwd} onChange={e=> setCPwd(e.target.value)} placeholder="Senha (mín. 8)" minLength={8} required />
              <input value={cPhone} onChange={e=> setCPhone(maskPhone(e.target.value))} placeholder="Telefone (WhatsApp)" required />
              <div style={{display:'flex', gap:'.6rem', alignItems:'center'}}>
                <input value={cCep} onChange={e=> setCCep(maskCEP(e.target.value))} placeholder="CEP" required />
                <small aria-live="polite" style={{color:'var(--text-muted)'}}>{loadingCep? 'buscando endereço…':''}</small>
              </div>
              <input value={cAddr} onChange={e=> setCAddr(e.target.value)} placeholder="Endereço" required />
              <div style={{display:'grid', gridTemplateColumns:'1fr 80px', gap:'.6rem'}}>
                <input value={cCity} onChange={e=> setCCity(e.target.value)} placeholder="Cidade" />
                <input value={cUf} onChange={e=> setCUf(e.target.value.toUpperCase().slice(0,2))} placeholder="UF" />
              </div>
              <button className="btn btn-primary" disabled={!cAllOk}>concluir cadastro</button>
            </div>
          </form>
        )}

        {mode==='signup' && role==='fornecedor' && (
          <form className="card" onSubmit={submitFornecedorPrimeiroPasso} style={{padding:'1rem'}}>
            <div className="grid" style={{display:'grid', gap:'.6rem'}}>
              <input value={fMarca} onChange={e=> setFMarca(e.target.value)} placeholder="Nome da Empresa/Marca" required />
              <input value={fDoc} onChange={e=> setFDoc(e.target.value)} placeholder="CNPJ ou CPF" required />
              <input value={fContato} onChange={e=> setFContato(e.target.value)} placeholder="Contato principal" required />
              <input type="email" value={fEmail} onChange={e=> setFEmail(e.target.value)} placeholder="e-mail" required />
              <input value={fPhone} onChange={e=> setFPhone(maskPhone(e.target.value))} placeholder="Telefone (WhatsApp)" required />
              <input type="password" value={fPwd} onChange={e=> setFPwd(e.target.value)} placeholder="Senha (mín. 8)" minLength={8} required />
              <button className="btn btn-primary" disabled={!fOk}>continuar cadastro</button>
            </div>
          </form>
        )}

        <div style={{display:'grid', gap:'.6rem', alignItems:'center', justifyItems:'center'}}>
          <div style={{display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'.6rem', width:'100%', alignItems:'center'}}>
            <hr />
            <span style={{color:'#888'}}>OU</span>
            <hr />
          </div>
          {mode==='login' ? (
            <button className="btn" style={{border:'2px solid #2b8', color:'#2b8', background:'#fff'}} onClick={()=> setMode('signup')}>quero me cadastrar</button>
          ) : (
            <button className="btn" onClick={()=> setMode('login')}>já tenho cadastro</button>
          )}
        </div>
      </div>
    </Modal>
  )
}