import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      // Authentication and reports go to the Node.js backend (mock server)
      '/api/auth': { target: 'http://localhost:5000', changeOrigin: true },
      '/api/teacher': { target: 'http://localhost:5000', changeOrigin: true },
      '/api/reports': { target: 'http://localhost:5000', changeOrigin: true },

      // Face enrollment, students, and attendance go to the Python CV backend
      '/api/enroll': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/students': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/attendance': { target: 'http://localhost:8000', changeOrigin: true },
      '/api/strangers': { target: 'http://localhost:8000', changeOrigin: true },
      '/stream': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
