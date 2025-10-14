export type ViaCEP = {
  cep: string
  logradouro: string
  complemento: string
  bairro: string
  localidade: string
  uf: string
  ibge?: string
  gia?: string
  ddd?: string
  siafi?: string
}

const cache = new Map<string, ViaCEP | null>()

export async function fetchViaCEP(rawCep: string){
  const cep = rawCep.replace(/\D/g, '')
  if(cep.length !== 8) return null
  if(cache.has(cep)) return cache.get(cep) ?? null
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await res.json()
    if(data.erro) { cache.set(cep, null); return null }
    cache.set(cep, data)
    return data as ViaCEP
  } catch {
    return null
  }
}