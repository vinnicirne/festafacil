type Props = {
  minPrice: number
  maxPrice: number
  price: [number, number]
  setPrice: (v:[number,number])=>void
  minRating: number
  setMinRating: (v:number)=>void
  hasCNPJ: boolean
  setHasCNPJ: (v:boolean)=>void
  includesMonitor: boolean
  setIncludesMonitor: (v:boolean)=>void
  sort: string
  setSort: (v:string)=>void
  onlyCepMatch: boolean
  setOnlyCepMatch: (v:boolean)=>void
  cepEnabled: boolean
}

import { RATING_MIN, RATING_MAX, RATING_STEP } from '@/config'
export default function FiltersSidebar(props: Props){
  const { minPrice, maxPrice, price, setPrice, minRating, setMinRating, hasCNPJ, setHasCNPJ, includesMonitor, setIncludesMonitor, sort, setSort, onlyCepMatch, setOnlyCepMatch, cepEnabled } = props
  return (
    <aside className="card" style={{padding:'1rem', position:'sticky', top:76, alignSelf:'start'}}>
      <div style={{display:'grid', gap:'.9rem'}}>
        <div>
          <strong>Ordenação</strong>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{width:'100%', marginTop:'.4rem', padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}>
            <option value="relevancia">Relevância</option>
            <option value="melhor">Melhor Avaliado</option>
            <option value="preco-asc">Preço: menor para maior</option>
            <option value="preco-desc">Preço: maior para menor</option>
          </select>
        </div>
        <div>
          <strong>Faixa de Preço</strong>
          <div style={{display:'flex', gap:'.5rem', marginTop:'.4rem'}}>
            <input type="number" value={price[0]} min={minPrice} max={price[1]} onChange={e=>setPrice([+e.target.value, price[1]])} style={{flex:1, padding:'.5rem', border:'1px solid #e6edf1', borderRadius:12}}/>
            <input type="number" value={price[1]} min={price[0]} max={maxPrice} onChange={e=>setPrice([price[0], +e.target.value])} style={{flex:1, padding:'.5rem', border:'1px solid #e6edf1', borderRadius:12}}/>
          </div>
        </div>
        <div>
          <strong>Avaliação mínima</strong>
          <input type="range" min={RATING_MIN} max={RATING_MAX} step={RATING_STEP} value={minRating} onChange={e=>setMinRating(+e.target.value)} style={{width:'100%', marginTop:'.4rem'}}/>
          <div style={{color:'var(--color-muted)'}}>{minRating.toFixed(1)}+</div>
        </div>
        <div style={{display:'grid', gap:'.4rem'}}>
          <label style={{display:'flex', alignItems:'center', gap:'.5rem'}}>
            <input type="checkbox" checked={hasCNPJ} onChange={e=>setHasCNPJ(e.target.checked)} /> Tem CNPJ
          </label>
          <label style={{display:'flex', alignItems:'center', gap:'.5rem'}}>
            <input type="checkbox" checked={includesMonitor} onChange={e=>setIncludesMonitor(e.target.checked)} /> Inclui Monitor
          </label>
          <label style={{display:'flex', alignItems:'center', gap:'.5rem'}}>
            <input type="checkbox" checked={onlyCepMatch} disabled={!cepEnabled} title={!cepEnabled ? 'Informe um CEP válido para usar este filtro' : undefined} onChange={e=>setOnlyCepMatch(e.target.checked)} /> Somente quem atende meu CEP
          </label>
          {!cepEnabled && <small style={{color:'var(--color-muted)'}}>Informe um CEP válido para usar este filtro</small>}
        </div>
      </div>
    </aside>
  )
}