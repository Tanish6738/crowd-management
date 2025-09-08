import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './Components/General/Toast.jsx'
import { ThemeProvider } from './Context/ThemeContext'
import { ClerkProvider } from '@clerk/clerk-react'
import { dark } from '@clerk/themes'
import { BrowserRouter } from 'react-router-dom'
  // Import your Publishable Key
  const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

  if (!PUBLISHABLE_KEY) {
    throw new Error('Add your Clerk Publishable Key to the .env file')
  }

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <ClerkProvider
        publishableKey={PUBLISHABLE_KEY}
        appearance={{
          baseTheme: dark,
          variables: {
            colorPrimary: '#f97316',
            borderRadius: '0.75rem'
          },
          elements: {
            formButtonPrimary: 'bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium rounded-lg h-10 transition shadow',
            socialButtonsBlockButton: 'border border-white/30 bg-white text-neutral-900 hover:bg-white/90 text-sm rounded-lg h-10 transition font-medium shadow-sm',
            socialButtonsProviderGoogle: 'bg-white text-neutral-900 hover:bg-white/90',
            socialButtonsProviderMicrosoft: 'bg-white text-neutral-900 hover:bg-white/90',
            formFieldInput: 'bg-white/5 border-white/10 focus:border-orange-500/60 focus:ring-2 focus:ring-orange-500/30 text-sm rounded-md placeholder:text-white/30'
          }
        }}
      >
        <BrowserRouter>
          <ThemeProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </ThemeProvider>
        </BrowserRouter>
      </ClerkProvider>
    </StrictMode>,
  )