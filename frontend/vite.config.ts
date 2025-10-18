import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['robots.txt', 'apple-touch-icon.png', 'logo.png'],
      manifest: {
        name: 'Lavanderia Control',
        short_name: 'Lavanderia Control',
        description: 'Controle completo da lavanderia com cadastro, envios e dashboard financeiro.',
        theme_color: '#2563eb',
        background_color: '#f8fafc',
        display: 'standalone',
        scope: './',
        start_url: './',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
