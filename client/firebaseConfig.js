import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// 根據環境決定要使用的 Firebase 設定
let firebaseConfig;

if (import.meta.env.DEV) {
  // 開發模式：使用一個最小化的模擬器專用設定
  // 這裡只需要提供正確的 projectId 即可，其他可以是任意假值
  console.log("開發模式：使用模擬器專用設定進行初始化。");
  firebaseConfig = {
    projectId: import.meta.env.VITE_PROJECT_ID, // 從 .env.local 讀取，確保 projectId 正確
    apiKey: "emulator-api-key", // 假的 API Key
    authDomain: `${import.meta.env.VITE_PROJECT_ID}.firebaseapp.com`,
  };
} else {
  // 生產模式：使用您 .env.local 檔案中的真實金鑰
  firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID,
  };
}

// 初始化 Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app); // 即使主要在後端用，前端也可初始化
const functions = getFunctions(app);

// ⭐ 當處於本地開發模式時，連接到模擬器
if (import.meta.env.DEV) {
  console.log("開發模式：正在連接到 Firebase Emulators...");
  
  // 連接到 Auth Emulator
  connectAuthEmulator(auth, "http://127.0.0.1:9099");

  // 連接到 Firestore Emulator
  connectFirestoreEmulator(firestore, "127.0.0.1", 8080);
  
  // 連接到 Functions Emulator
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export { app, auth, firestore, functions };