import { useState, PropsWithChildren, ReactNode } from 'react'

type Tab = { key:string, label:ReactNode, content: ReactNode }
export default function Tabs({ tabs, initial } : PropsWithChildren<{ tabs: Tab[], initial?: string }>){
  const [active, setActive] = useState(initial ?? tabs[0]?.key)
  const current = tabs.find(t=>t.key===active) ?? tabs[0]
  return (
    <div className="tabs">
      <div style={{display:'flex', gap:'.5rem', flexWrap:'wrap', borderBottom:'1px solid #eef2f5', paddingBottom:'.4rem', marginBottom:'.8rem'}}>
        {tabs.map(t => (
          <button key={t.key} className="chip" onClick={()=>setActive(t.key)} style={{background: t.key===active? 'var(--color-secondary)':'#fff', color: t.key===active? '#fff':'inherit'}}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="fade-in">{current?.content}</div>
    </div>
  )
}