import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// On Vercel the API address must be set for each environment (see
// docs/DEPLOYMENT.md); without it the site would call localhost and break.
if (process.env.VERCEL && !process.env.VITE_API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL is not set for this Vercel environment. Add it under Settings → Environment Variables.')
}

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/uploads': 'http://localhost:5000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
