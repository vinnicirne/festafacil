import { PropsWithChildren } from 'react'

type Props = PropsWithChildren<{ open: boolean, onClose: ()=>void, side?: boolean, title?: string }>
export default function Modal({ open, onClose, side, title, children }: Props){
  if(!open) return null
  return (
    <div role="dialog" aria-modal="true" className="fade-in" style={{position:'fixed', inset:0, background:'rgba(0,0,0,.35)', display:'grid', placeItems: side? 'stretch':'center', zIndex:1000}} onClick={onClose}>
      <div className="card" style={{width: side? 'min(420px, 92vw)':'min(680px, 92vw)', height: side? '100%':'auto', marginLeft: side? 'auto':'unset', borderRadius: side? '12px 0 0 12px':'12px', overflow:'auto'}} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'.9rem 1rem', borderBottom:'1px solid #eef2f5'}}>
          <strong>{title}</strong>
          <button className="chip" onClick={onClose} aria-label="Fechar">Fechar</button>
        </div>
        <div style={{padding:'1rem'}}>
          {children}
        </div>
      </div>
    </div>
  )
}