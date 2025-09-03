import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// COPIED FROM: /projects/rabbi/src/frontend/current/vite.config.ts
// Adapted for Sippar Algorand Bridge deployment
export default defineConfig({
  plugins: [
    react({
      // Disable refresh in production
      include: "**/*.{jsx,tsx}",
    })
  ],
  base: '/sippar/', // Use absolute paths for /sippar/ subdirectory deployment
  define: {
    // Ensure React is available globally for compatibility
    'global': 'globalThis',
    // Let Vite handle DEV/PROD mode naturally
  },
  build: {
    assetsDir: 'assets',
    // Ensure production build doesn't include dev dependencies
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      // FIXED: Less aggressive tree shaking to prevent module initialization errors
      treeshake: {
        preset: 'recommended',
        moduleSideEffects: true, // Allow side effects to prevent initialization errors
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
      },
      output: {
        manualChunks: (id) => {
          // EMERGENCY FIX: Minimal chunking to prevent ReferenceError
          if (id.includes('node_modules')) {
            return 'vendor';
          }
          return undefined;
        },
        
        // Production chunk naming - clean file names for stable deployments
        chunkFileNames: 'chunks/[name]-[hash].js',
        
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') ?? [];
          const extType = info[info.length - 1];
          
          if (/\.(png|jpe?g|svg|gif|tiff|bmp|ico)$/i.test(assetInfo.name || '')) {
            return `assets/images/[name]-[hash].[ext]`;
          }
          if (/\.(woff2?|eot|ttf|otf)$/i.test(assetInfo.name || '')) {
            return `assets/fonts/[name]-[hash].[ext]`;
          }
          return `assets/[name]-[hash].[ext]`;
        }
      },
    },
    
    // Advanced Build Optimizations (following Rabbi patterns)
    target: 'es2020', // Modern browsers only for better optimization
    
    // Aggressive asset optimization for critical rendering path
    assetsInlineLimit: 4096, // Inline more assets to reduce HTTP requests
    cssCodeSplit: true, // Split CSS for better caching
    
    // Bundle size optimization - target <200KB initial load
    reportCompressedSize: true, // Monitor compression
    chunkSizeWarningLimit: 200, // Strict chunk sizes
  },
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  
  // Development server configuration
  server: {
    hmr: true, // Re-enable HMR for proper development
    watch: {
      usePolling: false
    }
  },
  
  // Optimized dependency management for Sippar Algorand Bridge
  optimizeDeps: {
    include: [
      // Critical path dependencies - must be pre-bundled
      'react', 
      'react-dom', 
      'react/jsx-runtime',
      'react-dom/client',
      '@tanstack/react-query',
      '@dfinity/auth-client',
      '@dfinity/principal',
      'algosdk' // Algorand SDK for blockchain operations
    ],
    exclude: [
      // No exclusions needed for Algorand integration
    ],
    // Optimized for Algorand Chain Fusion architecture
    force: false,
    entries: [
      './src/main.tsx',
      './src/App.tsx'
    ]
  }
})