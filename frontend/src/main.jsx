import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './PocketSmart.css'
import App from './PocketSmart.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
