import React, { useState, Suspense } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import LoginModal from "./loginmodal.jsx";
import ProfileMenu from './ProfileMenu.jsx'; 
import { useAuth } from './AuthContext.jsx';
import { useTheme } from './ThemeContext.jsx';
import { LogIn, LayoutDashboard, HandCoins } from 'lucide-react';
import './App.css';

const PurchaseRequestBoard = React.lazy(() => import('./PurchaseRequestBoard.jsx'));
const TithingTaskList = React.lazy(() => import('./TithingTaskList.jsx'));
const TithingTaskDetail = React.lazy(() => import('./TithingTaskDetail.jsx'));

const LoadingFallback = () => (
  <div className="text-center py-20">
    <p className="text-xl text-graphite-500 dark:text-dark-text-subtle transition-theme">正在載入頁面...</p>
  </div>
);

const NavLink = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-theme ${
        isActive
          ? 'bg-glory-red-500 dark:bg-dark-primary text-white'
          : 'text-graphite-700 dark:text-dark-text-main hover:bg-glory-red-50 dark:hover:bg-dark-surface hover:text-glory-red-700 dark:hover:text-dark-primary'
      }`}
    >
      {children}
    </Link>
  );
};

function App() {
  const { currentUser } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  return (
    <div className="bg-cloud-white dark:bg-dark-background min-h-screen p-1 sm:p-6 transition-theme">
     <div className="max-w-6xl mx-auto">
       {/* --- 核心修改區域 --- */}
       <header className="flex items-center justify-between md:grid md:grid-cols-3 md:gap-4 mb-3">
         {/* 在小螢幕上隱藏，以提供更多空間。在中等螢幕上顯示，用於對齊。 */}
         <div className="hidden md:block" />
         
         {/* 標題：小螢幕靠左，中等螢幕以上置中 */}
         <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-glory-red-700 dark:text-dark-primary md:text-center transition-theme">
           BQ GRACE CHURCH
         </h1>
         
         {/* 3. 將右側內容靠右對齊 */}
         <div className="flex justify-end">
           {currentUser ? (
             <ProfileMenu />
           ) : (
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="bg-glory-red-500 dark:bg-dark-primary hover:bg-glory-red-600 dark:hover:bg-dark-primary/90 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-theme"
              >
                <LogIn size={18} />
                登入
              </button>
            )}
          </div>
        </header>

        {/* 不再需要 <UserProfile /> 元件 */}

        {currentUser && (
          <nav className="bg-white dark:bg-dark-surface shadow-md rounded-lg p-2 mb-3 flex items-center gap-2 transition-theme">
            <NavLink to="/purchase">
              <LayoutDashboard size={18} />
              採購看板
            </NavLink>
            <NavLink to="/tithing">
              <HandCoins size={18} />
              奉獻計算
            </NavLink>
          </nav>
        )}


        <main>
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/purchase" element={<PurchaseRequestBoard />} />
              <Route path="/tithing" element={<TithingTaskList />} />
              <Route path="/tithing/:taskId" element={<TithingTaskDetail />} />
              <Route path="/" element={<Navigate to="/purchase" replace />} />
            </Routes>
          </Suspense>
        </main>

        <LoginModal
          isOpen={isLoginModalOpen}
          onClose={() => setIsLoginModalOpen(false)}
        />
      </div>
    </div>
  );
}

export default App;
