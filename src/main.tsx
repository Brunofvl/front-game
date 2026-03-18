import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from '@/App'

if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  if (isLocalhost) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister()
      }
    })
    void caches.keys().then((keys) => {
      for (const key of keys) {
        void caches.delete(key)
      }
    })
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
