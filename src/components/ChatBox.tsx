import { useState } from 'react'

type Msg = { from:'user'|'vendor', text:string, ts:number }

export default function ChatBox(){
  const [msgs, setMsgs] = useState<Msg[]>([
    { from:'vendor', text:'Olá! Como posso ajudar no seu evento?', ts: Date.now()-60000 }
  ])
  const [text, setText] = useState('')
  const send = ()=>{
    if(!text.trim()) return
    setMsgs(m=>[...m, { from:'user', text, ts: Date.now() }])
    setText('')
    setTimeout(()=>{
      setMsgs(m=>[...m, { from:'vendor', text:'Recebido! Vou verificar a disponibilidade e já retorno 🙂', ts: Date.now() }])
    }, 800)
  }
  return (
    <div className="card" style={{display:'grid', gridTemplateRows:'1fr auto', height:320}}>
      <div style={{overflow:'auto', padding:'.8rem', display:'grid', gap:'.5rem'}}>
        {msgs.map((m,i)=> (
          <div key={i} style={{justifySelf: m.from==='user'? 'end':'start', background: m.from==='user'? 'var(--color-secondary)':'#f1f6f9', color: m.from==='user'? '#fff':'inherit', padding:'.6rem .8rem', borderRadius:12, maxWidth:'80%'}}>
            {m.text}
          </div>
        ))}
      </div>
      <div style={{display:'flex', gap:'.5rem', padding:'.6rem'}}>
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Escreva sua mensagem" onKeyDown={e=> e.key==='Enter' && send()} style={{flex:1, padding:'.6rem', border:'1px solid #e6edf1', borderRadius:12}}/>
        <button className="btn btn-secondary" onClick={send}>Enviar</button>
      </div>
    </div>
  )
}