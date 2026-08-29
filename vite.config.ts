import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // 1. Increases the warning threshold to 1000 kB (1 MB)
    chunkSizeWarningLimit: 1000, 
    
    // 2. Splits big libraries into smaller, manageable chunks
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react')) return 'vendor-react';
            if (id.includes('lucide-react')) return 'vendor-lucide';
            if (id.includes('motion') || id.includes('framer-motion')) return 'vendor-motion';
            if (id.includes('@supabase')) return 'vendor-supabase';
            return 'vendor-core'; // All other third-party deps
          }
        }
      }
    }
  }
});