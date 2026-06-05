import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { bootstrapData } from './lib/bootstrap.ts'
import './index.css'

const root = ReactDOM.createRoot(document.getElementById('root')!)
const tree = (
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)

// Render IMMEDIATELY with bundled data — never block first paint on the network (a cold/slow
// backend must not cause a white screen). Then pull live data and re-render once it's applied.
root.render(tree)
bootstrapData()
  .then(() => root.render(tree))
  .catch(() => {})
