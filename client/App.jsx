import React, { useState, Suspense } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import LoginModal from './LoginModal.jsx';
import UserProfile from './UserProfile.jsx';
import { useAuth } from './AuthContext.jsx';
import { LogIn, LayoutDashboard, HandCoins } from 'lucide-react';
import './App.css';

const PurchaseRequestBoard = React.lazy(() => import('./PurchaseRequestBoard.jsx'));
const TithingTaskList = React.lazy(() => import('./TithingTaskList.jsx'));
const TithingTaskDetail = React.lazy(() => import('./TithingTaskDetail.jsx'));

const LoadingFallback = () => (
  <div className="text-center py-20">
    <p className="text-xl text-gray-600">正在載入頁面...</p>
  </div>
);

const NavLink = ({ to, children }) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-gray-700 hover:bg-gray-200'
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
    <div className="bg-gray-100 min-h-screen p-1 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
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
        </header>

        <UserProfile />

        {currentUser && (
          <nav className="bg-white shadow-md rounded-lg p-2 mb-6 flex items-center gap-2">
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
