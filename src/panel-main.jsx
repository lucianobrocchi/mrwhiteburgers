import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Admin from './components/Admin.jsx'

// Entrada del panel (/panel/): carga solo el panel, sin la web ni las fotos de la carta
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Admin />
  </StrictMode>,
)
