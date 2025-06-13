import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5007', // 指向您的 Functions 模擬器
        changeOrigin: true, // 建議加入，有助於解決一些 CORS 問題
      }
    }
  },
   // 👇 新增或修改 build 設定
   build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // 將所有來自 node_modules 的套件打包到一個名為 'vendor' 的 chunk 中
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    // 👇 新增這個設定來調整警告門檻 (單位：kB)
    chunkSizeWarningLimit: 1000, 
  }
});