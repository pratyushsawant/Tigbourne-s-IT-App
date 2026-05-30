import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { bootstrapData } from './lib/bootstrap.ts'
import './index.css'

function render() {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </React.StrictMode>,
  )
}

// Pull live data from the API (if VITE_API_BASE is set) before first render;
// falls through instantly to bundled data when there's no backend.
bootstrapData().finally(render)
