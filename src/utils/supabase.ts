import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

let client: SupabaseClient | null = null

export const getSupabase = () => {
  if (!url || !anonKey) return null
  if (!client) client = createClient(url, anonKey)
  return client
}

// Tipos sugeridos para futura migração de dados
export type DbProvider = {
  id: string
  name: string
  category: string
  priceFrom: number
  rating: number
  ratingCount: number
  mainImage: string
  radiusKm: number
  hasCNPJ: boolean
  includesMonitor: boolean
  cepAreas: string[]
}

// Função utilitária opcional: não usada ainda; mantemos dados locais por padrão
export async function fetchProvidersFromDb(): Promise<DbProvider[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  const { data, error } = await supabase.from('providers').select('*')
  if (error) { console.error('[supabase] providers:', error.message); return [] }
  return (data as unknown as DbProvider[]) || []
}