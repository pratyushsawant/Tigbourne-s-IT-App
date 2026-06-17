import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { bootstrapData } from './lib/bootstrap.ts'
import './index.css'

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string
if (!CLERK_KEY) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY in .env')

const root = ReactDOM.createRoot(document.getElementById('root')!)
const tree = (
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_KEY}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ClerkProvider>
  </React.StrictMode>
)

// Render IMMEDIATELY with bundled data — never block first paint on the network (a cold/slow
// backend must not cause a white screen). Then pull live data and re-render once it's applied.
root.render(tree)
bootstrapData()
  .then(() => root.render(tree))
  .catch(() => {})
