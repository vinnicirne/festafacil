export type ThemeConfig = {
  colorPrimary?: string
  colorPrimaryContrast?: string
  colorSecondary?: string
  colorBg?: string
  colorText?: string
  colorMuted?: string
  promoBg?: string
  promoBorder?: string
  promoText?: string
}

function setCssVar(name: string, value?: string){
  if(!value) return
  document.documentElement.style.setProperty(name, value)
}

export async function applyTheme(themeKey?: string){
  try{
    if(!themeKey) return
    const res = await fetch(`/themes/${themeKey}.json`, { cache: 'no-cache' })
    if(!res.ok) { console.warn('[theme] Arquivo não encontrado para chave:', themeKey); return }
    const cfg = await res.json() as ThemeConfig
    setCssVar('--color-primary', cfg.colorPrimary)
    setCssVar('--color-primary-contrast', cfg.colorPrimaryContrast)
    setCssVar('--color-secondary', cfg.colorSecondary)
    setCssVar('--color-bg', cfg.colorBg)
    setCssVar('--color-text', cfg.colorText)
    setCssVar('--color-muted', cfg.colorMuted)
    setCssVar('--color-promo-bg', cfg.promoBg)
    setCssVar('--color-promo-border', cfg.promoBorder)
    setCssVar('--color-promo-text', cfg.promoText)
    // Atualiza meta theme-color para refletir o primário
    const meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null
    if(meta && cfg.colorPrimary) meta.content = cfg.colorPrimary
    document.documentElement.setAttribute('data-theme-key', themeKey)
    console.info('[theme] Aplicado tema:', themeKey)
  }catch(err){
    console.error('[theme] Falha ao aplicar tema', err)
  }
}