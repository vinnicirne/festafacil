export function isValidCEP(v: string){
  return /^\d{5}-?\d{3}$/.test(v)
}

export function isValidPhone(v: string){
  return /^(\+?55)?\s?(\(?\d{2}\)?\s?)?9?\d{4}[\-\s]?\d{4}$/.test(v)
}