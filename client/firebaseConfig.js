import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// 您的 .env.local 檔案中的環境變數
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

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