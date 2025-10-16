import { getSupabase } from '@/utils/supabase'
import { isValidPhone, isValidCPFOrCNPJ, normalizeDoc } from '@/utils/validators'

export type ProviderAccount = {
  user_id: string
  brand_name: string
  plan: 'GRATIS' | 'START' | 'PROFISSIONAL'
  balance: number
  status: 'pending' | 'approved' | 'blocked'
  tax_id: string
  phone: string
  tax_id_valid: boolean
  phone_valid: boolean
  pix_key?: string
}

export async function getSession(){
  const sb = getSupabase()
  if(!sb) return null
  const { data } = await sb.auth.getSession()
  return data?.session || null
}

export async function signIn(email: string, password: string){
  const sb = getSupabase()
  if(!sb) throw new Error('Supabase não configurado (variáveis VITE_SUPABASE_*)')
  const { data, error } = await sb.auth.signInWithPassword({ email, password })
  if(error) throw new Error(error.message)
  return data
}

export async function signUpProvider(input: { email:string; password:string; brandName:string; plan: ProviderAccount['plan']; taxId:string; phone:string; pixKey?:string }){
  const sb = getSupabase()
  if(!sb) throw new Error('Supabase não configurado (variáveis VITE_SUPABASE_*)')
  const { data: sign, error: signErr } = await sb.auth.signUp({ email: input.email, password: input.password })
  if(signErr) throw new Error(signErr.message)
  const userId = sign?.user?.id || sign?.session?.user?.id
  if(!userId) throw new Error('Cadastro criado, mas usuário não retornado (verifique confirmação por e-mail)')

  // Garante sessão ativa para passar nas políticas RLS (auth.uid() = user_id)
  let session = sign?.session || (await sb.auth.getSession()).data?.session || null
  if(!session){
    // Tenta autenticar imediatamente; se confirmação de e-mail estiver ativa, esta etapa pode falhar
    const { data: signInData, error: signInErr } = await sb.auth.signInWithPassword({ email: input.email, password: input.password })
    if(signInErr) throw new Error(`${signInErr.message} (confirme o e-mail e tente novamente)`) 
    session = signInData?.session || null
  }
  const taxIdNormalized = normalizeDoc(input.taxId)
  const taxIdValid = isValidCPFOrCNPJ(taxIdNormalized)
  const phoneValid = isValidPhone(input.phone)
  const { error: insErr } = await sb.from('provider_accounts').insert({
    user_id: userId,
    brand_name: input.brandName,
    plan: input.plan,
    balance: 0,
    status: 'pending',
    tax_id: taxIdNormalized,
    phone: input.phone,
    tax_id_valid: taxIdValid,
    phone_valid: phoneValid,
    pix_key: input.pixKey || null
  } as any)
  if(insErr) throw new Error(insErr.message)
  return { userId }
}

// Cadastro de contratante (usuário comum)
// Cria usuário no Supabase Auth e garante sessão ativa.
// Os dados complementares (nome, contato, endereço) podem ser persistidos
// localmente por enquanto, já que não há tabela dedicada no backend.
export async function signUpClient(input: { email:string; password:string; nome?:string; contato?:string; cep?:string; endereco?:string; cidade?:string; uf?:string }){
  const sb = getSupabase()
  if(!sb) throw new Error('Supabase não configurado (variáveis VITE_SUPABASE_*)')
  const { data: sign, error: signErr } = await sb.auth.signUp({ email: input.email, password: input.password })
  if(signErr) throw new Error(signErr.message)
  // Se a confirmação por e-mail estiver habilitada, talvez não haja sessão imediatamente
  let session = sign?.session || (await sb.auth.getSession()).data?.session || null
  if(!session){
    const { data: signInData, error: signInErr } = await sb.auth.signInWithPassword({ email: input.email, password: input.password })
    if(signInErr) throw new Error(`${signInErr.message} (confirme o e-mail e tente novamente)`) 
    session = signInData?.session || null
  }
  const userId = session?.user?.id || sign?.user?.id || null
  // Tenta persistir perfil em tabela 'user_profiles' se existir
  try{
    if(userId){
      await sb.from('user_profiles').upsert({
        user_id: userId,
        nome: input.nome || null,
        contato: input.contato || null,
        cep: input.cep || null,
        endereco: input.endereco || null,
        cidade: input.cidade || null,
        uf: input.uf || null
      } as any, { onConflict: 'user_id' })
    }
  }catch{ /* ignora se tabela não existir ou RLS bloquear */ }
  return { userId: session?.user?.id || sign?.user?.id || null }
}

export async function getMyProviderAccount(): Promise<ProviderAccount | null>{
  const sb = getSupabase()
  if(!sb) return null
  const session = await getSession()
  const uid = session?.user?.id
  if(!uid) return null
  const { data, error } = await sb.from('provider_accounts').select('*').eq('user_id', uid).limit(1).maybeSingle()
  if(error) return null
  return data as unknown as ProviderAccount
}

export async function signOut(): Promise<void>{
  const sb = getSupabase()
  if(!sb) return
  try {
    await sb.auth.signOut()
  } catch {}
}