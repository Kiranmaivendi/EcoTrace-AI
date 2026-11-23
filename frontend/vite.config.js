import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  envDir: '..',
  plugins: [react(), tailwindcss()],
  server: {
    allowedHosts: true,
    ...(fs.existsSync(path.resolve(import.meta.dirname, '..', 'certs', 'localhost-cert.pem'))
      ? {
          https: {
            cert: fs.readFileSync(path.resolve(import.meta.dirname, '..', 'certs', 'localhost-cert.pem')),
            key: fs.readFileSync(path.resolve(import.meta.dirname, '..', 'certs', 'localhost-key.pem')),
          },
        }
      : {}),
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001',
    },
  },
})
