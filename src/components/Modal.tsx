import { PropsWithChildren, useEffect, useId, useRef } from 'react'

type Props = PropsWithChildren<{ open: boolean, onClose: ()=>void, side?: boolean, title?: string, size?: 'sm'|'md'|'lg'|'xl', closeOnOverlay?: boolean }>
export default function Modal({ open, onClose, side, title, size='md', closeOnOverlay=true, children }: Props){
  if(!open) return null
  const titleId = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(()=>{
    if(!open) return
    const onKey = (e: KeyboardEvent)=>{ if(e.key==='Escape') onClose() }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return ()=>{ window.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [open, onClose])

  // Focus management: trap focus inside modal and restore on close
  useEffect(()=>{
    if(!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    const node = containerRef.current
    if(!node) return
    const selector = 'a[href], button, textarea, input, select, details,[tabindex]:not([tabindex="-1"])'
    const getFocusable = () => Array.from(node.querySelectorAll<HTMLElement>(selector)).filter(el=>!el.hasAttribute('disabled') && !el.getAttribute('aria-hidden'))
    const handleKeyDown = (e: KeyboardEvent)=>{
      if(e.key !== 'Tab') return
      const focusable = getFocusable()
      if(focusable.length===0) return
      const first = focusable[0]
      const last = focusable[focusable.length-1]
      const active = document.activeElement as HTMLElement
      if(e.shiftKey){
        if(active === first || !node.contains(active)){
          last.focus()
          e.preventDefault()
        }
      } else {
        if(active === last){
          first.focus()
          e.preventDefault()
        }
      }
    }
    node.addEventListener('keydown', handleKeyDown)
    // Ensure something gets focus
    const focusable = getFocusable()
    ;(focusable[0] ?? node).focus()
    return ()=>{
      node.removeEventListener('keydown', handleKeyDown)
      previouslyFocused.current?.focus?.()
    }
  }, [open])

  const widthMap = { sm: '420px', md: '560px', lg: '680px', xl: '820px' } as const
  return (
    <div role="dialog" aria-modal="true" aria-labelledby={title? titleId: undefined} className="fade-in" style={{position:'fixed', inset:0, background:'rgba(17,24,39,.42)', backdropFilter:'blur(6px)', display:'grid', placeItems: side? 'stretch':'center', zIndex:1000}} onClick={()=>{ if(closeOnOverlay) onClose() }}>
      <div role="document" className="card" style={{
        width: side? 'min(440px, 92vw)':`min(${widthMap[size]}, 92vw)`,
        height: side? '100%':'auto',
        maxHeight: side? '100%':'min(80vh, 100%)',
        marginLeft: side? 'auto':'unset',
        borderRadius: side? '16px 0 0 16px':'16px',
        overflow:'auto',
        background:'#fff',
        color:'#111',
        boxShadow:'var(--shadow-md)'
      }} onClick={e=>e.stopPropagation()} ref={containerRef} tabIndex={-1}>
        <div style={{position:'sticky', top:0, background:'#fff', zIndex:1, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'clamp(1rem, 1.6vw, 1.2rem) clamp(1.1rem, 2vw, 1.3rem)', borderBottom:'1px solid #eef2f5'}}>
          <strong id={titleId} style={{fontSize:'1.05rem'}}>{title}</strong>
          <button className="btn" onClick={onClose} aria-label="Fechar" autoFocus style={{minHeight:'32px', padding:'.4rem .65rem'}}>✕</button>
        </div>
        <div style={{padding:'clamp(1.2rem, 2.4vw, 1.6rem)', display:'grid', gap:'clamp(.7rem, 1.6vw, .95rem)'}}>
          {children}
        </div>
      </div>
    </div>
  )
}