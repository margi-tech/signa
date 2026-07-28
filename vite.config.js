import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Signa — Limba Semnelor Române',
        short_name: 'Signa',
        description: 'Duolingo pentru Limba Semnelor Române',
        theme_color: '#FFFBF3',
        background_color: '#FFFBF3',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Cachează la prima încărcare fișierele MediaPipe WASM și model (offline PWA)
        globPatterns: ['**/*.{js,css,html,svg,png,wasm,bin,json}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-wasm-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mediapipe-model-cache',
              expiration: { maxEntries: 5, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: /\/models\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'signa-models-cache',
              networkTimeoutSeconds: 3,
              expiration: { maxEntries: 12, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
      },
    }),
  ],
  // Previne Vite să optimizeze pachetul MediaPipe (conține fișiere WASM binare)
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
