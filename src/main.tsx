import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
// Import i18n FIRST to initialize language before React
import './i18n'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
