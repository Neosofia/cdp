import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/theme.css'
import App from './App.tsx'
import { UiThemeProvider } from '@/lib/uiTheme'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <UiThemeProvider>
      <App />
    </UiThemeProvider>
  </StrictMode>,
)
