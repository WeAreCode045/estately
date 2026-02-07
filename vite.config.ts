import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const isDev = mode === 'development';

  return {
    // Global variable definitions
    define: {
      global: 'window',
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },

    // Server Configuration
    server: {
      port: 3000,
      host: '0.0.0.0',
      open: false,
      strictPort: false,
      hmr: {
        overlay: true,
      },
    },

    // Preview Configuration
    preview: {
      port: 4173,
      host: '0.0.0.0',
    },

    // Plugins
    plugins: [
      react({
        // Babel configuration for better JSX runtime
        babel: {
          plugins: [
            // Add any babel plugins here if needed
          ],
        },
      }),
    ],

    // Environment Variables - REMOVED (merged into define above)

    // Path Resolution
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@views': path.resolve(__dirname, './src/views'),
        '@services': path.resolve(__dirname, './src/api'),
        '@contexts': path.resolve(__dirname, './src/contexts'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@types': path.resolve(__dirname, './src/types.ts'),
      },
    },

    // Build Configuration
    build: {
      outDir: 'dist',
      sourcemap: isDev,
      minify: isDev ? false : 'esbuild',
      target: 'es2022',
      cssCodeSplit: true,
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks for better caching
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'appwrite-vendor': ['appwrite'],
            'ui-vendor': ['lucide-react'],
            'survey-vendor': [
              'survey-core',
              'survey-creator-core',
              'survey-creator-react',
              'survey-react-ui',
            ],
          },
          // Asset file naming
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]',
        },
      },
      // Chunk size warnings
      chunkSizeWarningLimit: 1000,
    },

    // Optimization
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react-router-dom',
        'appwrite',
        'lucide-react',
        'jspdf',
      ],
      exclude: [
        'node-fetch',
        'form-data',
        'jsdom',
      ],
    },

    // CSS Configuration
    css: {
      devSourcemap: isDev,
      modules: {
        localsConvention: 'camelCase',
      },
    },

    // JSON Configuration
    json: {
      stringify: false,
    },

    // ESBuild Configuration
    esbuild: {
      logOverride: { 'this-is-undefined-in-esm': 'silent' },
      drop: isDev ? [] : ['console', 'debugger'],
    },
  };
});
