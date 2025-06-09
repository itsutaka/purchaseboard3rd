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
      '/api': {
        target: 'http://127.0.0.1:5007', // 指向您的 Functions 模擬器
        changeOrigin: true, // 建議加入，有助於解決一些 CORS 問題
      }
    }
  }
});
