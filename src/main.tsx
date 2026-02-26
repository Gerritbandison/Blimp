import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './auth/AuthContext.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.tsx'
import { reportWebVitals } from './utils/vitals.ts'
import { validateEnv } from './utils/env.ts'

validateEnv()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>,
)

reportWebVitals()
