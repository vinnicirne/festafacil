export async function cepFromCoords(lat: number, lon: number): Promise<string | null> {
  try{
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: 'jsonv2',
      addressdetails: '1',
      zoom: '18'
    })
    const url = `https://nominatim.openstreetmap.org/reverse?${params.toString()}`
    const res = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } })
    if(!res.ok) return null
    const data = await res.json()
    const raw: string | undefined = data?.address?.postcode
    if(!raw) return null
    const digits = String(raw).replace(/\D/g,'')
    if(digits.length < 8) return null
    const cep = `${digits.slice(0,5)}-${digits.slice(5,8)}`
    return cep
  }catch{ return null }
}