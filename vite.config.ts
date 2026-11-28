import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, Plugin} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

const BUILD_TIMESTAMP = new Date().toISOString();
const APP_BUILD_VERSION = `sge-${BUILD_TIMESTAMP.replace(/[:.TZ-]/g, '').slice(0, 14)}`;

function sgeBuildVersionPlugin(version: string, buildTime: string): Plugin {
  const payload = JSON.stringify({ version, buildTime }, null, 2);
  const handleSubpathRewrite = (req: any, res: any, next: () => void, isPreview: boolean) => {
    const rawUrl = req.url || '/';
    const qIdx = rawUrl.indexOf('?');
    const urlPath = qIdx >= 0 ? rawUrl.slice(0, qIdx) : rawUrl;
    const querySuffix = qIdx >= 0 ? rawUrl.slice(qIdx) : '';

    if (urlPath === '/version.json' || urlPath.endsWith('/version.json')) {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.end(payload);
      return;
    }

    // Permitir acesso transparente via /docs, /docs/, /documentos e /docs/documentos
    if (
      urlPath === '/docs' ||
      urlPath === '/docs/' ||
      urlPath === '/documentos' ||
      urlPath === '/documentos/' ||
      urlPath === '/docs/documentos' ||
      urlPath === '/docs/documentos/'
    ) {
      req.url = (isPreview ? '/index.html' : '/') + querySuffix;
    } else if (urlPath.startsWith('/docs/documentos/')) {
      req.url = urlPath.slice('/docs/documentos'.length) + querySuffix;
    } else if (urlPath.startsWith('/docs/')) {
      req.url = urlPath.slice('/docs'.length) + querySuffix;
    } else if (urlPath.startsWith('/documentos/')) {
      req.url = urlPath.slice('/documentos'.length) + querySuffix;
    }
    next();
  };

  return {
    name: 'sge-build-version-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => handleSubpathRewrite(req, res, next, false));
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => handleSubpathRewrite(req, res, next, true));
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: payload
      });
    }
  };
}

export default defineConfig(() => {
  return {
    base: './',
    define: {
      __SGE_APP_VERSION__: JSON.stringify(APP_BUILD_VERSION),
      __SGE_BUILD_TIME__: JSON.stringify(BUILD_TIMESTAMP),
    },
    plugins: [
      react(),
      tailwindcss(),
      sgeBuildVersionPlugin(APP_BUILD_VERSION, BUILD_TIMESTAMP),
      VitePWA({
        registerType: 'prompt',
        manifest: false,
        includeAssets: [],
        workbox: {
          maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
          importScripts: ['./sw-notifications.js'],
          // Pre-cache completo do shell e módulos da aplicação para garantir funcionamento 100% offline-first em raiz e /documentos
          globPatterns: [
            'index.html',
            '404.html',
            'manifest.json',
            'sw-notifications.js',
            'robots.txt',
            'sitemap.xml',
            '*.{ico,png,svg}',
            '**/*.css',
            'assets/*.js'
          ],
          globIgnores: ['**/version.json'],
          navigateFallback: 'index.html',
          navigateFallbackDenylist: [/robots\.txt$/i, /sitemap\.xml$/i, /version\.json$/i],
          cleanupOutdatedCaches: true,
          skipWaiting: false,
          clientsClaim: false,
          runtimeCaching: [
            {
              urlPattern: /\/version\.json(\?.*)?$/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /\/assets\/.*\.(js|css|woff2?)(\?.*)?$/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'sge-modules-runtime-cache',
                expiration: {
                  maxEntries: 80,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
          type: 'classic',
        },
      }),
    ],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
              return 'vendor-react';
            }
            if (/[\\/]node_modules[\\/](firebase|@firebase)[\\/]/.test(id)) {
              return 'vendor-firebase';
            }
            if (/[\\/]node_modules[\\/]lucide-react[\\/]/.test(id)) {
              return 'vendor-icons';
            }
            if (/[\\/]node_modules[\\/](jspdf|html2canvas|canvg|dompurify|fflate)[\\/]/.test(id)) {
              return 'vendor-pdf';
            }
            if (/[\\/]node_modules[\\/]xlsx[\\/]/.test(id)) {
              return 'vendor-xlsx';
            }
            if (/[\\/]node_modules[\\/](recharts|d3-|victory-vendor)[\\/]/.test(id)) {
              return 'vendor-charts';
            }
            if (/[\\/]node_modules[\\/](html5-qrcode|qrcode)[\\/]/.test(id)) {
              return 'vendor-qr';
            }
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
