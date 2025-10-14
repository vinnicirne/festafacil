import { useEffect, useRef, useState } from 'react'
import { CAROUSEL_AUTOPLAY_INTERVAL_MS } from '@/config'

export default function ImageCarousel({ images }: { images: string[] }){
  const [idx, setIdx] = useState(0)
  const t = useRef<number | undefined>()
  useEffect(()=>{
    window.clearInterval(t.current)
    t.current = window.setInterval(()=> setIdx(i => (i+1)%images.length), CAROUSEL_AUTOPLAY_INTERVAL_MS)
    return ()=> window.clearInterval(t.current)
  }, [images.length])
  return (
    <div className="card" style={{overflow:'hidden'}}>
      <div style={{position:'relative'}}>
        <img src={images[idx]} alt={`Foto ${idx+1}`} loading="lazy" style={{width:'100%', aspectRatio:'16/9', objectFit:'cover'}}/>
        <div style={{position:'absolute', insetInline:0, bottom:10, display:'flex', gap:6, justifyContent:'center'}}>
          {images.map((_,i)=> <span key={i} style={{width:8, height:8, borderRadius:999, background: i===idx? 'var(--color-primary)':'rgba(255,255,255,.7)'}}></span>)}
        </div>
      </div>
    </div>
  )
}