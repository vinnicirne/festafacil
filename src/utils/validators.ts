export function isValidCEP(v: string){
  return /^\d{5}-?\d{3}$/.test(v)
}

export function isValidPhone(v: string){
  return /^(\+?55)?\s?(\(?\d{2}\)?\s?)?9?\d{4}[\-\s]?\d{4}$/.test(v)
}

// Normaliza documento para apenas dígitos
export function normalizeDoc(v: string){
  return (v || '').replace(/\D/g, '')
}

// Validação de CPF (11 dígitos) com dígitos verificadores
export function isValidCPF(v: string){
  const doc = normalizeDoc(v)
  if (!doc || doc.length !== 11) return false
  if (/^(\d)\1{10}$/.test(doc)) return false // evita sequências iguais

  const calcDV = (base: string, factor: number) => {
    let total = 0
    for (let i = 0; i < base.length; i++) total += parseInt(base[i]) * (factor - i)
    const rest = total % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const dv1 = calcDV(doc.slice(0,9), 10)
  const dv2 = calcDV(doc.slice(0,10), 11)
  return dv1 === parseInt(doc[9]) && dv2 === parseInt(doc[10])
}

// Validação de CNPJ (14 dígitos) com dígitos verificadores
export function isValidCNPJ(v: string){
  const doc = normalizeDoc(v)
  if (!doc || doc.length !== 14) return false
  if (/^(\d)\1{13}$/.test(doc)) return false

  const calcDV = (base: string, weights: number[]) => {
    let total = 0
    for (let i = 0; i < weights.length; i++) total += parseInt(base[i]) * weights[i]
    const rest = total % 11
    return rest < 2 ? 0 : 11 - rest
  }

  const w1 = [5,4,3,2,9,8,7,6,5,4,3,2]
  const w2 = [6,5,4,3,2,9,8,7,6,5,4,3,2]
  const dv1 = calcDV(doc.slice(0,12), w1)
  const dv2 = calcDV(doc.slice(0,13), w2)
  return dv1 === parseInt(doc[12]) && dv2 === parseInt(doc[13])
}

export function isValidCPFOrCNPJ(v: string){
  const doc = normalizeDoc(v)
  return doc.length === 11 ? isValidCPF(doc) : doc.length === 14 ? isValidCNPJ(doc) : false
}