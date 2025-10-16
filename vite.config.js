import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true,
      },
      includeAssets: ['vite.svg'],
      manifest: {
        name: 'ControlCar',
        short_name: 'ControlCar',
        description: 'Gerencie veículos, abastecimentos e manutenções.',
        theme_color: '#0ea5e9',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/controlcar-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/controlcar-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/controlcar-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/controlcar-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5174,
  },
})
