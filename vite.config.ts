import { defineConfig } from 'vitest/config'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

// Backend port used by the dev proxy when VITE_API_BASE_URL is not set.
// Change this to match the PORT in backend/.env if you use a different port.
const BACKEND_PORT = process.env.BACKEND_PORT ?? '4000';
const BACKEND_ORIGIN = `http://localhost:${BACKEND_PORT}`;

// Rewrite helper: adds the /api prefix so Vite can proxy requests to the
// Express backend (which mounts all routes under /api) without requiring
// VITE_API_BASE_URL to be set in .env.local for local development.
const addApiPrefix = (path: string) => `/api${path}`;

export default defineConfig({
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    // Dev proxy: forwards API calls to the Express backend so they work
    // without setting VITE_API_BASE_URL in .env.local.
    // These prefixes match the paths used by the API adapters and do NOT
    // conflict with any React Router client-side routes.
    proxy: {
      '/content':      { target: BACKEND_ORIGIN, rewrite: addApiPrefix, changeOrigin: true },
      '/auth':         { target: BACKEND_ORIGIN, rewrite: addApiPrefix, changeOrigin: true },
      '/enrollments':  { target: BACKEND_ORIGIN, rewrite: addApiPrefix, changeOrigin: true },
      '/payments':     { target: BACKEND_ORIGIN, rewrite: addApiPrefix, changeOrigin: true },
      '/notifications':{ target: BACKEND_ORIGIN, rewrite: addApiPrefix, changeOrigin: true },
      '/subscriptions':{ target: BACKEND_ORIGIN, rewrite: addApiPrefix, changeOrigin: true },
      '/health':       { target: BACKEND_ORIGIN, rewrite: addApiPrefix, changeOrigin: true },
      // NOTE: /courses, /dashboard, /community, /admin CONFLICT with SPA routes
      // and must be accessed via VITE_API_BASE_URL=http://localhost:4000/api
      // when those domains are in "api" adapter mode.
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  build: {
    emptyOutDir: true,
    // Set chunk size warning limit to 1.5 MB (bundle is ~1.1 MB)
    // Consider code splitting in the future if bundle grows significantly
    chunkSizeWarningLimit: 1500,
    // Ensure reproducible builds by sorting module IDs
    rollupOptions: {
      output: {
        // Improve caching by using content hashes
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    unstubEnvs: true,
    unstubGlobals: true,
    passWithNoTests: false,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/app/**/*.{ts,tsx}'],
      exclude: [
        'src/app/components/ui/**',
        'src/app/mocks/**',
        'src/app/models/**',
        '**/*.test.{ts,tsx}',
      ],
      reporter: ['text', 'lcov'],
    },
  },
})
