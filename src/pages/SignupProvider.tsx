import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchViaCEP } from '@/utils/viacep'
import { CATEGORIES } from '@/data/categories'
import { PLAN_CONFIG, type ProviderPlan, getPlanLabel } from '@/utils/saas'
import { getSupabase } from '@/utils/supabase'
import { signUpProvider } from '@/utils/auth'
import { isValidCPFOrCNPJ, isValidPhone } from '@/utils/validators'

type Step = 1|2|3

type Provider = {
  brandName: string
  taxId: string
  contactName: string
  email: string
  phone: string
  password: string
  categories: string[]
  pendingCategory?: string
  shortDescription: string
  baseCep: string
  serviceRadiusKm: number | ''
  socialUrl?: string
  pixKey: string
  termsAccepted: boolean
  plan: ProviderPlan
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

export default function SignupProvider(){
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>(1)
  const [loadingCep, setLoadingCep] = useState(false)
  const [touched, setTouched] = useState<Record<string, boolean>>({})

  const [data, setData] = useState<Provider>({
    brandName:'', taxId:'', contactName:'', email:'', phone:'', password:'',
    categories:[], pendingCategory:'', shortDescription:'', baseCep:'', serviceRadiusKm:'', socialUrl:'',
    pixKey:'', termsAccepted:false, plan:'GRATIS'
  })

  // Prefill from modal seed to avoid retyping duplicated fields
  useEffect(()=>{
    try{
      const raw = localStorage.getItem('ff:provider:seed')
      if(raw){
        const s = JSON.parse(raw) as { marca?:string, doc?:string, contato?:string, email?:string, phone?:string }
        setData(prev=>({
          ...prev,
          brandName: prev.brandName || s.marca || '',
          taxId: prev.taxId || s.doc || '',
          contactName: prev.contactName || s.contato || '',
          email: prev.email || s.email || '',
          phone: prev.phone || (s.phone ? maskPhone(String(s.phone)) : '')
        }))
        // Clear seed to prevent stale fills on later visits
        localStorage.removeItem('ff:provider:seed')
      }
    }catch{ /* ignore malformed seed */ }
  }, [])

  const step1Ok = useMemo(()=>{
    const taxIdOk = isValidCPFOrCNPJ(data.taxId)
    const phoneOk = isValidPhone(data.phone)
    return (
      data.brandName.trim().length>1 &&
      taxIdOk &&
      /.+@.+\..+/.test(data.email) &&
      phoneOk &&
      data.password.length>=8 &&
      data.contactName.trim().length>1
    )
  }, [data])
  const step2Ok = useMemo(()=>{
    return (
      (data.categories.filter(c=> c !== 'Outros').length>0 || (data.pendingCategory||'').trim().length>0) &&
      data.shortDescription.trim().length>0 && data.shortDescription.length<=250 &&
      data.baseCep.replace(/\D/g,'').length===8 &&
      !!data.serviceRadiusKm
    )
  }, [data])
  const step3Ok = useMemo(()=>{
    return !!data.pixKey && data.termsAccepted
  }, [data])

  const progress = step===1 ? 33 : step===2 ? 66 : 100

  const onChange = (k: keyof Provider, v: any)=>{
    if(k==='phone') v = maskPhone(v)
    if(k==='baseCep') v = maskCEP(v)
    if(k==='serviceRadiusKm') v = Number(v)
    setData(prev => ({ ...prev, [k]: v }))
  }

  const onSelectCategory = (value: string)=>{
    if(!value){
      setData(prev=> ({ ...prev, categories: [], pendingCategory: '' }))
      return
    }
    if(value==='Outros'){
      setData(prev=> ({ ...prev, categories: ['Outros'] }))
    } else {
      setData(prev=> ({ ...prev, categories: [value], pendingCategory: '' }))
    }
  }

  const next = async ()=>{
    if(step===1 && !step1Ok){ setTouched(t=>({...t, step1:true})); return }
    if(step===2 && !step2Ok){ setTouched(t=>({...t, step2:true})); return }
    if(step===1){ setStep(2) }
    else if(step===2){
      const raw = data.baseCep.replace(/\D/g,'')
      if(raw.length===8){ setLoadingCep(true); await fetchViaCEP(raw).finally(()=> setLoadingCep(false)) }
      setStep(3)
    }
  }
  const back = ()=> setStep(s=> (s>1 ? ((s-1) as Step) : s))

  const finish = async ()=>{
    if(!step3Ok){ setTouched(t=>({...t, step3:true})); return }
    const payload = { ...data, createdAt: new Date().toISOString() }
    const sb = getSupabase()
    if(sb){
      try{
        await signUpProvider({ email: data.email, password: data.password, brandName: data.brandName, plan: data.plan, taxId: data.taxId, phone: data.phone, pixKey: data.pixKey })
        // Sugestão de categoria local (aprovada via Superadmin)
        if((data.pendingCategory||'').trim()){
          try{
            const raw = localStorage.getItem('admin:pendingCategories')
            const list = raw ? JSON.parse(raw) as any[] : []
            list.push({ suggestion: (data.pendingCategory||'').trim(), fromBrand: data.brandName, contactEmail: data.email, createdAt: new Date().toISOString() })
            localStorage.setItem('admin:pendingCategories', JSON.stringify(list))
          }catch{}
        }
        alert('Cadastro enviado e pendente de validação. Você será avisado após aprovação.')
        navigate('/', { replace:false })
        return
      } catch(err){
        alert('Falha ao cadastrar no Supabase: ' + (err as Error)?.message + '\nUsaremos cadastro local para testes.')
      }
    }
    // Fallback local (dev sem Supabase): mantém comportamento antigo
    localStorage.setItem('ff:provider', JSON.stringify(payload))
    if((data.pendingCategory||'').trim()){
      try{
        const raw = localStorage.getItem('admin:pendingCategories')
        const list = raw ? JSON.parse(raw) as any[] : []
        list.push({ suggestion: (data.pendingCategory||'').trim(), fromBrand: data.brandName, contactEmail: data.email, createdAt: new Date().toISOString() })
        localStorage.setItem('admin:pendingCategories', JSON.stringify(list))
      }catch{}
    }
    navigate('/painel/fornecedor?onboarding=catalogo', { replace:false })
  }

  // removido: exportação para planilhas

  return (
    <section className="container" style={{maxWidth:860, padding:'1.5rem 1rem'}}>
      <h1 style={{margin:'0 0 .5rem'}}>Cadastro do Fornecedor</h1>
      <p style={{margin:'0 0 1rem', color:'var(--text-muted)'}}>Dividido em 3 etapas para reduzir esforço. Complete para começar a receber pedidos.</p>

      <div aria-label="Progresso" className="card" style={{padding:'.5rem', marginBottom:'1rem'}}>
        <div style={{height:10, background:'#eee', borderRadius:8, overflow:'hidden'}}>
          <div style={{width:`${progress}%`, height:'100%', background:'var(--color-primary)'}} />
        </div>
        <div style={{display:'flex', justifyContent:'space-between', marginTop:'.4rem', fontSize:'.9rem'}}>
          <span>Etapa {step}/3</span>
          <span>{progress}%</span>
        </div>
      </div>

      {step===1 && (
        <div className="card auth-form" style={{padding:'1rem', borderRadius:12}}>
          <h2 style={{marginTop:0}}>Dados Básicos e Contato</h2>
          <div className="grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.8rem'}}>
            <div>
              <label>Nome da Empresa/Marca</label>
              <input value={data.brandName} onChange={e=> onChange('brandName', e.target.value)} />
            </div>
          <div>
            <label>CNPJ ou CPF</label>
            <input value={data.taxId} onChange={e=> onChange('taxId', e.target.value)} onBlur={()=> setTouched(t=>({...t, taxId:true}))} aria-invalid={touched.taxId && !isValidCPFOrCNPJ(data.taxId)} placeholder="Somente números" inputMode="numeric" />
            {touched.taxId && !isValidCPFOrCNPJ(data.taxId) && (
              <small role="alert" aria-live="polite" style={{color:'#c2185b'}}>CPF/CNPJ inválido. Digite somente números e verifique os dígitos.</small>
            )}
          </div>
            <div>
              <label>Nome do Contato Principal</label>
              <input value={data.contactName} onChange={e=> onChange('contactName', e.target.value)} />
            </div>
            <div>
              <label>E-mail</label>
              <input type="email" value={data.email} onChange={e=> onChange('email', e.target.value)} onBlur={()=> setTouched(t=>({...t, email:true}))} aria-invalid={touched.email && !/.+@.+\..+/.test(data.email)} />
              {touched.email && !/.+@.+\..+/.test(data.email) && (
                <small role="alert" aria-live="polite" style={{color:'#c2185b'}}>E-mail inválido. Use o formato nome@dominio.com.</small>
              )}
            </div>
          <div>
            <label>Telefone (WhatsApp)</label>
            <input value={data.phone} onChange={e=> onChange('phone', e.target.value)} onBlur={()=> setTouched(t=>({...t, phone:true}))} aria-invalid={touched.phone && !isValidPhone(data.phone)} placeholder="(11) 98888-7777" inputMode="tel" />
            {touched.phone && !isValidPhone(data.phone) && (
              <small role="alert" aria-live="polite" style={{color:'#c2185b'}}>Telefone inválido. Use DDD com WhatsApp: (11) 98888-7777.</small>
            )}
          </div>
            <div>
              <label>Senha</label>
              <input type="password" value={data.password} onChange={e=> onChange('password', e.target.value)} onBlur={()=> setTouched(t=>({...t, password:true}))} aria-invalid={touched.password && data.password.length<8} minLength={8} />
              {touched.password && data.password.length<8 ? (
                <small role="alert" aria-live="polite" style={{color:'#c2185b'}}>Senha muito curta. Mínimo de 8 caracteres.</small>
              ) : (
                <small style={{color:'var(--color-muted)'}}>Mínimo de 8 caracteres.</small>
              )}
            </div>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:'1rem'}}>
            <button className="btn btn-primary" type="button" onClick={next} disabled={!step1Ok}>Continuar</button>
          </div>
        </div>
      )}

      {step===2 && (
        <div className="card auth-form" style={{padding:'1rem', borderRadius:12}}>
          <h2 style={{marginTop:0}}>Definição do Serviço e Localização</h2>
          <div>
            <label>Categorias de Serviço</label>
            <select value={data.categories[0]||''} onChange={e=> onSelectCategory(e.target.value)}>
              <option value="">Selecione…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              <option value="Outros">Outros…</option>
            </select>
            {data.categories.includes('Outros') && (
              <div style={{marginTop:'.6rem'}}>
                <label>Descreva sua categoria</label>
                <input value={data.pendingCategory||''} onChange={e=> setData(prev=>({...prev, pendingCategory: e.target.value }))} placeholder="Ex.: Personagens vivos, Carrinhos gourmet..." />
                <small style={{color:'var(--color-muted)'}}>Sua sugestão ficará pendente de aprovação no Painel do Superadmin.</small>
              </div>
            )}
          </div>
          <div style={{marginTop:'.8rem'}}>
            <label>Mini-Descrição</label>
            <textarea value={data.shortDescription} onChange={e=> onChange('shortDescription', e.target.value)} maxLength={250} rows={3} />
            <small style={{color:'var(--color-muted)'}}>{data.shortDescription.length}/250</small>
          </div>
          <div className="grid" style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'.8rem', marginTop:'.8rem'}}>
            <div>
              <label>CEP de Origem/Base</label>
              <div style={{display:'flex', alignItems:'center', gap:'.6rem'}}>
                <input value={data.baseCep} onChange={e=> onChange('baseCep', e.target.value)} placeholder="00000-000" />
                <span aria-live="polite">{loadingCep ? 'Validando…' : ''}</span>
              </div>
            </div>
            <div>
              <label>Raio de Atendimento (KM)</label>
              <select value={String(data.serviceRadiusKm)} onChange={e=> onChange('serviceRadiusKm', e.target.value)}>
                <option value="">Selecione…</option>
                {[10,15,25,35,50,75,100].map(km => <option key={km} value={km}>{km} KM</option>)}
              </select>
            </div>
          </div>
          <div style={{marginTop:'.8rem'}}>
            <label>URL de Perfil Social (opcional)</label>
            <input value={data.socialUrl} onChange={e=> onChange('socialUrl', e.target.value)} placeholder="https://instagram.com/sua_marca" />
          </div>
          <div style={{display:'flex', justifyContent:'space-between', marginTop:'1rem'}}>
            <button className="btn" type="button" onClick={back}>Voltar</button>
            <button className="btn btn-primary" type="button" onClick={next} disabled={!step2Ok}>Continuar</button>
          </div>
        </div>
      )}

      {step===3 && (
        <div className="card auth-form" style={{padding:'1rem', borderRadius:12}}>
          <h2 style={{marginTop:0}}>Financeiro e Termos</h2>
          <div>
            <label>Dados Bancários (Chave PIX)</label>
            <input value={data.pixKey} onChange={e=> onChange('pixKey', e.target.value)} placeholder="Chave PIX (CPF/CNPJ, e-mail, telefone ou aleatória)" />
          </div>
          <div style={{marginTop:'.8rem'}}>
            <label>Plano</label>
            <select value={data.plan} onChange={e=> setData(prev=> ({...prev, plan: e.target.value as ProviderPlan}))}>
              {(['GRATIS','START','PROFISSIONAL'] as ProviderPlan[]).map(p => (
                <option key={p} value={p}>{getPlanLabel(p)} — {PLAN_CONFIG[p].monthlyCoins} FestCoins/mês</option>
              ))}
            </select>
            <small style={{color:'var(--text-muted)'}}>Comissão: {Math.round(PLAN_CONFIG[data.plan].commissionRate*100)}%.</small>
          </div>
          <div style={{marginTop:'.8rem', display:'flex', gap:'.6rem', alignItems:'center'}}>
            <input id="termos" type="checkbox" checked={data.termsAccepted} onChange={e=> onChange('termsAccepted', e.target.checked)} />
            <label htmlFor="termos">Li e concordo com os Termos de Parceria e com a Comissão de {Math.round(PLAN_CONFIG[data.plan].commissionRate*100)}% da FestaFácil.</label>
          </div>
          <div style={{display:'flex', justifyContent:'flex-end', gap:'.6rem', marginTop:'1rem'}}>
            <button className="btn" type="button" onClick={back}>Voltar</button>
            <button className="btn btn-primary" type="button" disabled={!step3Ok} onClick={finish}>Concluir cadastro de fornecedor</button>
          </div>
        </div>
      )}
    </section>
  )
}