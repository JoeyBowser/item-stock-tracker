import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StockChecker from './StockChecker.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StockChecker />
  </StrictMode>,
)
