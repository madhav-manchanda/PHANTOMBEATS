import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // root is this directory (frontend/)
  root: '.',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['assets/logo.png'],
      manifest: {
        id: '/',
        name: 'PhantomBeats',
        short_name: 'PhantomBeats',
        description: 'A modern music streaming application.',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        categories: ['music', 'entertainment'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,woff,woff2,png,svg}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^(?!\/__).*/],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => {
              return url.pathname.startsWith('/api') || 
                     url.pathname.startsWith('/auth') ||
                     url.host.includes('supabase.co') ||
                     url.protocol === 'ws:' || 
                     url.protocol === 'wss:';
            },
            handler: 'NetworkOnly'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      // In dev, proxy /api requests to your local backend
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
