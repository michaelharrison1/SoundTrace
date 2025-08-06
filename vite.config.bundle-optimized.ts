import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Bundle analyzer plugin for development
const bundleAnalyzer = () => {
  return {
    name: 'bundle-analyzer',
    generateBundle(options: any, bundle: any) {
      // Silent bundle analysis
    }
  };
};

export default defineConfig({
  plugins: [
    react(),
    bundleAnalyzer()
  ],
  build: {
    // Optimize chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate Three.js into its own chunk for better caching
          'three-js': ['three', '@react-three/fiber', '@react-three/drei'],
          // Separate React libraries
          'react-vendor': ['react', 'react-dom'],
          // Separate chart libraries
          'charts': ['recharts'],
          // Separate utility libraries
          'utils': ['axios']
        }
      }
    },
    // Enable source maps for better debugging
    sourcemap: process.env.NODE_ENV !== 'production',
    // Optimize for production
    minify: 'esbuild',
    target: 'es2020'
  },
  // Dev server optimization
  server: {
    port: 5173,
    host: true
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', 'axios'],
    // Exclude Three.js from pre-bundling to enable lazy loading
    exclude: ['three', '@react-three/fiber', '@react-three/drei']
  }
});
