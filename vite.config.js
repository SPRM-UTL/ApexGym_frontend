import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El navegador manda `Origin` con el puerto de Vite (5173 en dev, 4173 en preview),
// pero el backend solo lo permite para el origen de desarrollo. `changeOrigin` solo
// reescribe `Host`, así que además quitamos `Origin`/`Referer` al reenviar: la petición
// ya es same-origin para el navegador y el backend recibe una llamada de proxy normal.
const quitarOrigen = (proxy) => {
  proxy.on('proxyReq', (proxyReq) => {
    proxyReq.removeHeader('origin');
    proxyReq.removeHeader('referer');
  });
};

const apiProxy = {
  '/api': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    configure: quitarOrigen,
  },
  '/imagenes': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    configure: quitarOrigen,
  },
  '/uploads': {
    target: 'http://localhost:3000',
    changeOrigin: true,
    configure: quitarOrigen,
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registro inyectado en el HTML: el SW se activa aunque React no llegue a montar
      injectRegister: 'script-defer',

      pwaAssets: {
        disabled: false,
        config: true,
      },

      manifest: {
        name: 'ApexGym — Gestión y Punto de Venta',
        short_name: 'ApexGym',
        description: 'Plataforma integral de gestión, inventario multialmacén, control de acceso y punto de venta para gimnasios ApexGym.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#f4f6fb',
        theme_color: '#FF6A00',
        lang: 'es',
      },

      workbox: {
        // No incluir `webmanifest` aquí: vite-plugin-pwa ya agrega `manifest.webmanifest`
        // automáticamente al precaché; incluirlo lo duplica con distinta revisión y
        // hace fallar la instalación del SW (`add-to-cache-list-conflicting-entries`).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // Con registerType 'autoUpdate' el SW nuevo debe activarse al terminar de
        // precachear; sin skipWaiting quedaba en 'waiting' y la pestaña seguía
        // sirviéndose con los chunks del build anterior.
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) =>
              request.destination === 'image' || /^\/(imagenes|uploads)\//.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'apexgym-images-v1',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ request }) =>
              request.destination === 'style' || request.destination === 'font',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'apexgym-styles-v1',
              expiration: {
                maxEntries: 80,
                maxAgeSeconds: 30 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'apexgym-html-v1',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 7 * 24 * 60 * 60,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          // Los GET /api/ NO se cachean en el Service Worker: Workbox usa solo la URL como
          // clave, así que mezclaría datos entre sucursales/usuarios y no normaliza la barra
          // final. httpClient.js ya respalda cada GET en IndexedDB con la clave
          // sucursal:usuario:url, que es la copia que alimenta la venta y las vistas offline.
        ],
      },

      devOptions: {
        // Permite ver y probar el service worker también con `npm run dev`
        // (sin navigateFallback para no interferir con el HMR del servidor de Vite)
        enabled: true,
        suppressWarnings: true,
        type: 'module',
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    proxy: apiProxy,
  },
});
