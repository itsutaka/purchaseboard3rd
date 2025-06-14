import React, { useState, Suspense } from 'react';
import LoginModal from './LoginModal.jsx';         // 引入彈窗元件
import UserProfile from './UserProfile.jsx';       // 引入用戶狀態元件
import { useAuth } from './AuthContext.jsx';
import { LogIn } from 'lucide-react';
import './App.css'; 

// ✨ 2. 使用 React.lazy 動態引入 PurchaseRequestBoard
const PurchaseRequestBoard = React.lazy(() => import('./PurchaseRequestBoard.jsx'));

// ✨ (可選但建議) 建立一個簡單的載入中提示元件
const LoadingFallback = () => (
  <div className="text-center py-20">
    <p className="text-xl text-gray-600">正在載入採購看板...</p>
  </div>
);

function App() {
  const { currentUser } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 text-center">BQ GRACE CHURCH</h1>
        {!currentUser && (
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center sm:justify-start gap-2 transition-colors w-full sm:w-auto"
          >
            <LogIn size={18} />
            登入
          </button>
        )}
      </div>

        {/* 顯示已登入的用戶資訊 */}
        <UserProfile />
        
        {/* ✨ 3. 使用 Suspense 包裹動態載入的元件 */}
        <Suspense fallback={<LoadingFallback />}>
          <PurchaseRequestBoard />
        </Suspense>
        
        {/* 登入彈出視窗 (它會自己根據 isOpen 決定是否顯示) */}
        <LoginModal 
          isOpen={isLoginModalOpen} 
          onClose={() => setIsLoginModalOpen(false)} 
        />
      </div>
    </div>
  );
}

export default App;