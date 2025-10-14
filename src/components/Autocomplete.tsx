import { useMemo, useRef, useState } from 'react'
import { useDebounce } from '@/hooks/useDebounce'
import { AUTOCOMPLETE_DEBOUNCE_MS, AUTOCOMPLETE_MAX_OPTIONS, AUTOCOMPLETE_BLUR_CLOSE_DELAY_MS } from '@/config'

type Props = {
  value: string
  onChange: (v:string)=>void
  options: string[]
  placeholder?: string
  ariaLabel?: string
}

export default function Autocomplete({ value, onChange, options, placeholder, ariaLabel }: Props){
  const [open, setOpen] = useState(false)
  const [focusIndex, setFocusIndex] = useState(-1)
  const debounced = useDebounce(value, AUTOCOMPLETE_DEBOUNCE_MS)
  const list = useMemo(()=> options.filter(o => o.toLowerCase().includes(debounced.toLowerCase())).slice(0, AUTOCOMPLETE_MAX_OPTIONS), [options, debounced])
  const ref = useRef<HTMLDivElement>(null)

  const select = (v:string)=>{ onChange(v); setOpen(false); setFocusIndex(-1) }

  return (
    <div ref={ref} style={{position:'relative'}}>
      <input
        value={value}
        onChange={e=>{onChange(e.target.value); setOpen(true)}}
        onFocus={()=> setOpen(true)}
        onBlur={()=> setTimeout(()=> setOpen(false), AUTOCOMPLETE_BLUR_CLOSE_DELAY_MS)}
        onKeyDown={e=>{
          if(!open) return
          if(e.key==='ArrowDown'){ e.preventDefault(); setFocusIndex(i=> Math.min(i+1, list.length-1)) }
          if(e.key==='ArrowUp'){ e.preventDefault(); setFocusIndex(i=> Math.max(i-1, 0)) }
          if(e.key==='Enter' && list[focusIndex]){ e.preventDefault(); select(list[focusIndex]) }
        }}
        placeholder={placeholder}
        aria-label={ariaLabel}
        style={{border:'1px solid #e6edf1', borderRadius:12, padding:'.8rem', width:'100%'}}
      />
      {open && list.length>0 && (
        <div className="card fade-in" role="listbox" style={{position:'absolute', insetInline:0, top:'calc(100% + 4px)', zIndex:20, maxHeight:240, overflow:'auto'}}>
          {list.map((o, i)=> (
            <button key={o} role="option" aria-selected={i===focusIndex} onMouseDown={()=> select(o)} className="chip" style={{display:'block', width:'100%', textAlign:'left', padding:'.7rem 1rem', borderRadius:0, background: i===focusIndex? '#f1fbff':'#fff'}}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}