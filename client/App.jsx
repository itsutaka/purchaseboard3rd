import React, { useState } from 'react';
import PurchaseRequestBoard from './PurchaseRequestBoard.jsx';
import LoginModal from './LoginModal.jsx';         // 引入彈窗元件
import UserProfile from './UserProfile.jsx';       // 引入用戶狀態元件
import { useAuth } from './AuthContext.jsx';
import { LogIn } from 'lucide-react';
import './App.css'; 

function App() {
  const { currentUser } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="bg-gray-100 min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-gray-800">Purchase Board App (Dev Mode)</h1>
          {/* 根據登入狀態顯示不同按鈕 */}
          {!currentUser && (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
            >
              <LogIn size={18} />
              登入
            </button>
          )}
        </div>

        {/* 顯示已登入的用戶資訊 */}
        <UserProfile />
        
        {/* 主要內容 */}
        <PurchaseRequestBoard />
        
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