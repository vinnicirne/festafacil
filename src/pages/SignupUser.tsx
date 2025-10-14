import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchViaCEP } from '@/utils/viacep'
import { exportCsv } from '@/utils/export'

type ClientForm = {
  fullName: string
  email: string
  password: string
  phone: string
  cep: string
  address: string
  district: string
  city: string
  uf: string
}

function maskPhone(v: string){
  const d = v.replace(/\D/g, '').slice(0, 11)
  const p1 = d.slice(0,2)
  const p2 = d.slice(2,7)
  const p3 = d.slice(7,11)
  if(d.length <= 2) return `(${p1}`
  if(d.length <= 7) return `(${p1}) ${p2}`
  return `(${p1}) ${p2}-${p3}`
}

function maskCEP(v: string){
  const d = v.replace(/\D/g, '').slice(0,8)
  if(d.length <= 5) return d
  return `${d.slice(0,5)}-${d.slice(5)}`
}

export default function SignupUser(){
  const navigate = useNavigate()
  const [form, setForm] = useState<ClientForm>({
    fullName:'', email:'', password:'', phone:'', cep:'', address:'', district:'', city:'', uf:''
  })
  const [loadingCep, setLoadingCep] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const emailOk = /.+@.+\..+/.test(form.email)
  const pwdOk = form.password.length >= 8
  const phoneOk = form.phone.replace(/\D/g,'').length === 11
  const cepOk = form.cep.replace(/\D/g,'').length === 8
  const nameOk = form.fullName.trim().length > 3
  const addressOk = !!form.address && !!form.city && !!form.uf
  const allOk = nameOk && emailOk && pwdOk && phoneOk && cepOk && addressOk

  useEffect(()=>{
    const raw = form.cep.replace(/\D/g,'')
    if(raw.length === 8){
      setLoadingCep(true)
      fetchViaCEP(raw).then(data=>{
        if(data){
          setForm(prev=>({
            ...prev,
            cep: maskCEP(raw),
            address: data.logradouro || prev.address,
            district: data.bairro || prev.district,
            city: data.localidade || prev.city,
            uf: data.uf || prev.uf,
          }))
        }
      }).finally(()=> setLoadingCep(false))
    }
  }, [form.cep])

  const onChange = (k: keyof ClientForm, v: string)=>{
    if(k === 'phone') v = maskPhone(v)
    if(k === 'cep') v = maskCEP(v)
    setForm(prev=> ({ ...prev, [k]: v }))
  }

  const validity = useMemo(()=>({
    fullName: nameOk,
    email: emailOk,
    password: pwdOk,
    phone: phoneOk,
    cep: cepOk,
    address: addressOk,
  }), [nameOk, emailOk, pwdOk, phoneOk, cepOk, addressOk])

  const submit = (e: React.FormEvent)=>{
    e.preventDefault()
    if(!allOk) { setTouched({ fullName:true, email:true, password:true, phone:true, cep:true, address:true }); return }
    localStorage.setItem('ff:client', JSON.stringify({ ...form, createdAt: new Date().toISOString() }))
    // Redireciona para continuidade do fluxo (ex: checkout)
    navigate('/checkout', { replace: false })
  }

  const exportar = ()=>{
    exportCsv('clientes.csv', [{
      nome: form.fullName,
      email: form.email,
      telefone: form.phone,
      cep: form.cep,
      endereco: form.address,
      bairro: form.district,
      cidade: form.city,
      uf: form.uf
    }])
  }

  return (
    <section className="container" style={{maxWidth:720, padding:'1.5rem 1rem'}}>
      <h1 style={{margin:'0 0 .5rem'}}>Cadastro rápido</h1>
      <p style={{margin:'0 0 1rem', color:'var(--text-muted)'}}>Conclua em menos de 2 minutos para solicitar orçamentos.</p>

      <div style={{display:'flex', gap:'.6rem', marginBottom:'1rem', flexWrap:'wrap'}}>
        <button type="button" className="btn btn-primary" aria-label="Continuar com Google" onClick={()=> alert('OAuth Google pendente de integração')}>Continuar com Google</button>
        <button type="button" className="btn" aria-label="Continuar com Facebook" onClick={()=> alert('OAuth Facebook pendente de integração')}>Facebook</button>
        <button type="button" className="btn" aria-label="Continuar com Apple" onClick={()=> alert('OAuth Apple pendente de integração')}>Apple</button>
      </div>

      <form onSubmit={submit} className="card" style={{padding:'1rem', borderRadius:12}}>
        <div className="grid" style={{display:'grid', gridTemplateColumns:'1fr', gap:'.8rem'}}>
          <div>
            <label>Nome Completo</label>
            <input value={form.fullName} onChange={e=> onChange('fullName', e.target.value)} onBlur={()=> setTouched(t=>({...t, fullName:true}))} aria-invalid={touched.fullName && !nameOk} required />
          </div>
          <div>
            <label>E-mail</label>
            <input type="email" value={form.email} onChange={e=> onChange('email', e.target.value)} onBlur={()=> setTouched(t=>({...t, email:true}))} aria-invalid={touched.email && !emailOk} required />
          </div>
          <div>
            <label>Senha</label>
            <input type="password" value={form.password} onChange={e=> onChange('password', e.target.value)} onBlur={()=> setTouched(t=>({...t, password:true}))} aria-invalid={touched.password && !pwdOk} minLength={8} required />
            <small style={{color:'var(--text-muted)'}}>Mínimo de 8 caracteres.</small>
          </div>
          <div>
            <label>Telefone (WhatsApp)</label>
            <input inputMode="tel" value={form.phone} onChange={e=> onChange('phone', e.target.value)} onBlur={()=> setTouched(t=>({...t, phone:true}))} aria-invalid={touched.phone && !phoneOk} placeholder="(11) 98888-7777" required />
            <small style={{color:'var(--text-muted)'}}>Usado para alertas de orçamento.</small>
          </div>
          <div>
            <label>CEP</label>
            <div style={{display:'flex', gap:'.6rem', alignItems:'center'}}>
              <input value={form.cep} onChange={e=> onChange('cep', e.target.value)} onBlur={()=> setTouched(t=>({...t, cep:true}))} aria-invalid={touched.cep && !cepOk} placeholder="00000-000" required />
              <span aria-live="polite">{loadingCep ? 'Buscando endereço…' : ''}</span>
            </div>
          </div>
          <div>
            <label>Endereço</label>
            <input value={form.address} onChange={e=> onChange('address', e.target.value)} onBlur={()=> setTouched(t=>({...t, address:true}))} aria-invalid={touched.address && !addressOk} placeholder="Rua, número" required />
          </div>
          <div className="grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.6rem'}}>
            <div>
              <label>Bairro</label>
              <input value={form.district} onChange={e=> onChange('district', e.target.value)} />
            </div>
            <div>
              <label>Cidade</label>
              <input value={form.city} onChange={e=> onChange('city', e.target.value)} />
            </div>
          </div>
          <div>
            <label>UF</label>
            <input value={form.uf} onChange={e=> onChange('uf', e.target.value.toUpperCase().slice(0,2))} style={{maxWidth:100}} />
          </div>
        </div>

        <div style={{display:'flex', gap:'.6rem', marginTop:'1rem', alignItems:'center', justifyContent:'space-between'}}>
          <button type="button" className="btn" onClick={exportar}>Exportar para Planilhas</button>
          <button className="btn btn-primary" disabled={!allOk} type="submit">Continuar</button>
        </div>
      </form>
    </section>
  )
}