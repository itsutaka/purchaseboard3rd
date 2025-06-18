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
         // id 是每個被打包檔案的完整路徑
          // 例如：/Users/user/project/node_modules/firebase/app/dist/index.mjs
          if (id.includes('node_modules')) {
            // 從路徑中提取出套件的名稱
            const moduleName = id.split('node_modules/')[1].split('/')[0];

            // 針對特定的大型套件進行拆分
            switch (moduleName) {
              case 'firebase':
              case 'jspdf':
              case 'jspdf-autotable':
              case 'html2canvas': // jspdf 可能會間接依賴
                return moduleName;
              
              case 'react':
              case 'react-dom':
              case 'lucide-react':
              case 'react-linkify':
                return 'react-vendor'; // 將 React 相關的打包在一起

              // 其他所有第三方套件，都打包到一個通用的 vendor 檔案
              default:
                return 'vendor';
            }
          }
        }
      }
    },
    // 👇 新增這個設定來調整警告門檻 (單位：kB)
    chunkSizeWarningLimit: 1000, 
  }
});