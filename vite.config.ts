import path from 'path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    port: 3000,
    host: '0.0.0.0',
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'logo.png'],
      manifest: {
        name: 'BarSafe',
        short_name: 'BarSafe',
        description: 'Menu QR, service en temps réel, encaissement sécurisé et stock maîtrisé pour les bars et lounges.',
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        theme_color: '#FAF4EA',
        background_color: '#FAF4EA',
        icons: [
          { src: '/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // SPA: serve index.html for deep links (/b/:barId, /patron…) when offline
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,png,svg,webp}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // Never cache Supabase API / realtime traffic
        navigateFallbackDenylist: [/^\/rest\//, /^\/realtime\//],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
