export type Listener = (key: string) => void

const channel = new EventTarget()

export function onStoreChange(cb: Listener){
  const handler = (e: Event)=>{
    const ce = e as CustomEvent<string>
    cb(ce.detail)
  }
  channel.addEventListener('ff:store', handler as EventListener)
  const storageHandler = (ev: StorageEvent)=>{ if(ev.key) cb(ev.key) }
  window.addEventListener('storage', storageHandler)
  return ()=>{
    channel.removeEventListener('ff:store', handler as EventListener)
    window.removeEventListener('storage', storageHandler)
  }
}

export function getStore<T>(key: string, fallback: T): T{
  try{ const raw = localStorage.getItem(key); return raw? JSON.parse(raw) as T : fallback }catch{ return fallback }
}

export function setStore<T>(key: string, value: T){
  localStorage.setItem(key, JSON.stringify(value))
  channel.dispatchEvent(new CustomEvent('ff:store', { detail: key }))
}

export function nowIso(){ return new Date().toISOString() }