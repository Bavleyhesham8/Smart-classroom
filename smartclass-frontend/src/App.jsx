import React from 'react'
import { Toaster } from 'react-hot-toast'
import AppRouter from './router/AppRouter'

function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'dark:bg-slate-800 dark:text-white',
          style: {
            borderRadius: '16px',
            background: 'var(--card)',
            color: 'var(--card-foreground)',
            border: '1px solid var(--border)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)'
          }
        }}
      />
      <AppRouter />
    </>
  )
}

export default App
