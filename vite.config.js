import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client', // Output directory for client build
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Proxy API requests from React dev server to Node.js server
      // Example: '/api': 'http://localhost:3001'
      // (if your Node server runs on 3001 and React dev on 5173)
    }
  }
});
