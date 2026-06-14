import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from "path"

const policiesDir = fs.existsSync(path.resolve(__dirname, './policies'))
  ? path.resolve(__dirname, './policies')
  : path.resolve(__dirname, '../policies')

// https://vite.dev/config/
export default defineConfig({
    resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@policies": policiesDir,
    },
  },
  plugins: [
    tailwindcss(),
    react()
  ],
  optimizeDeps: {
    // Pre-bundle heavy deps so the Vite 8 dev optimizer does not hang on first
    // page load inside Docker (stuck at "[optimizer] bundling dependencies...").
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react/jsx-dev-runtime',
      'react-markdown',
      'remark-gfm',
      '@opentelemetry/sdk-trace-web',
      '@opentelemetry/auto-instrumentations-web',
      '@opentelemetry/instrumentation',
      '@opentelemetry/core',
    ],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
})
