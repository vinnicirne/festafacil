import { Link } from 'react-router-dom'
import RatingStars from './RatingStars'
import { formatCurrency } from '../utils/format'

export type Service = {
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

type Props = { s: Service, matchCep?: boolean, query?: string, exactName?: boolean, exactCategory?: boolean }

export default function ServiceCard({ s, matchCep, query, exactName, exactCategory }: Props){
  const highlight = (text: string, q?: string) => {
    const term = q?.trim()
    if(!term) return text
    const lower = text.toLowerCase()
    const t = term.toLowerCase()
    const parts: (string | JSX.Element)[] = []
    let i = 0
    while(true){
      const idx = lower.indexOf(t, i)
      if(idx === -1){ parts.push(text.slice(i)); break }
      if(idx > i) parts.push(text.slice(i, idx))
      parts.push(<span key={idx} className="hl">{text.slice(idx, idx + t.length)}</span>)
      i = idx + t.length
    }
    return <>{parts}</>
  }
  return (
    <article className="card fade-in" style={{display:'grid', gridTemplateColumns:'120px 1fr', gap:'.8rem', padding:'.6rem'}}>
      <Link to={`/fornecedor/${s.id}`} style={{borderRadius:12, overflow:'hidden'}}>
        <img src={s.mainImage} loading="lazy" alt={s.name} style={{width:'120px', height:'100%', objectFit:'cover'}} />
      </Link>
      <div style={{display:'grid', gap:'.35rem', alignContent:'start'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.6rem'}}>
          <Link to={`/fornecedor/${s.id}`} style={{fontWeight:600}}>{highlight(s.name, query)}</Link>
          <span className="chip">a partir de {formatCurrency(s.priceFrom)}</span>
        </div>
        <RatingStars value={s.rating} count={s.ratingCount} />
        <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap'}}>
          {(exactName || exactCategory) && <span className="chip">{highlight(`Match exato${exactName?': nome':': categoria'}`, query)}</span>}
          <span className="chip">{highlight(`Categoria: ${s.category}`, query)}</span>
          {matchCep && <span className="chip">{highlight('Atende seu CEP', query)}</span>}
          {s.hasCNPJ && <span className="chip">{highlight('Tem CNPJ', query)}</span>}
          {s.includesMonitor && <span className="chip">{highlight('Inclui Monitor', query)}</span>}
          <span className="chip">{highlight(`Raio ${s.radiusKm}km`, query)}</span>
        </div>
      </div>
    </article>
  )
}