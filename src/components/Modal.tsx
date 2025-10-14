import { PropsWithChildren, useEffect, useId } from 'react'

type Props = PropsWithChildren<{ open: boolean, onClose: ()=>void, side?: boolean, title?: string, size?: 'sm'|'md'|'lg'|'xl' }>
export default function Modal({ open, onClose, side, title, size='md', children }: Props){
  if(!open) return null
  const titleId = useId()

  useEffect(()=>{
    if(!open) return
    const onKey = (e: KeyboardEvent)=>{ if(e.key==='Escape') onClose() }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return ()=>{ window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [open, onClose])

  const widthMap = { sm: '420px', md: '560px', lg: '680px', xl: '820px' } as const
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={title? titleId: undefined} className="fade-in" style={{position:'fixed', inset:0, background:'rgba(0,0,0,.35)', display:'grid', placeItems: side? 'stretch':'center', zIndex:1000}} onClick={onClose}>
      <div className="card" style={{
        width: side? 'min(420px, 92vw)':`min(${widthMap[size]}, 92vw)`,
        height: side? '100%':'auto',
        maxHeight: side? '100%':'min(80vh, 100%)',
        marginLeft: side? 'auto':'unset',
        borderRadius: side? '12px 0 0 12px':'12px',
        overflow:'auto',
        background:'#fff',
        color:'#111',
        boxShadow:'var(--shadow-md)'
      }} onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'.8rem 1rem', borderBottom:'1px solid #eef2f5'}}>
          <strong id={titleId}>{title}</strong>
          <button className="chip" onClick={onClose} aria-label="Fechar" autoFocus>Fechar</button>
        </div>
        <div style={{padding:'1rem'}}>
          {children}
        </div>
      </div>
    </div>
  )
}