import React, { useEffect } from 'react'
import { Toaster } from 'react-hot-toast'
import AppRouter from './router/AppRouter'
import { useAuth } from './context/AuthContext'
import useStore from './store/useStore'
import { ThemeProvider } from './components/ThemeProvider'

function App() {
  const { loading } = useAuth();
  const initTheme = useStore(s => s.initTheme);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

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

      {/* Global Initialization Overlay */}
      {loading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#070b14] font-sans">
          <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mb-8 shadow-2xl shadow-teal-500/20" />
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-black tracking-tighter uppercase italic text-teal-400">SmartClass AI</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest animate-pulse">Initializing Security Layer...</p>
          </div>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="absolute bottom-12 px-6 py-2 text-[10px] font-black text-slate-700 uppercase tracking-widest hover:text-slate-500 transition-colors"
          >
            Reset Session
          </button>
        </div>
      )}

      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </>
  )
}

export default App
