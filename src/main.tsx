import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/theme.css'
import './styles/global.css'
import { applyTheme } from './utils/theme'
import { THEME_KEY } from './config'

// Aplica tema via chave (se definida)
applyTheme(THEME_KEY)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
)