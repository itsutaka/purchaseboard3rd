import React, { useState, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import LoginModal from './LoginModal.jsx';
import { useAuth } from './AuthContext.jsx';
import MainLayout from './layout/MainLayout.jsx';
import './App.css';

const PurchaseRequestBoard = React.lazy(() => import('./PurchaseRequestBoard.jsx'));
const TithingTaskList = React.lazy(() => import('./TithingTaskList.jsx'));
const TithingTaskDetail = React.lazy(() => import('./TithingTaskDetail.jsx'));

const LoadingFallback = () => (
  <div className="text-center py-20">
    <p className="text-xl text-graphite-500">正在載入頁面...</p>
  </div>
);

function App() {
  const { currentUser } = useAuth();
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  if (!currentUser) {
    return (
      <div className="bg-cloud-white min-h-screen p-1 sm:p-6">
        <div className="max-w-6xl mx-auto">
          <LoginModal
            isOpen={!currentUser}
            onClose={() => {}} // No close action until logged in
          />
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
      <Suspense fallback={<LoadingFallback />}>
        <Routes>
          <Route path="/purchase" element={<PurchaseRequestBoard />} />
          <Route path="/tithing" element={<TithingTaskList />} />
          <Route path="/tithing/:taskId" element={<TithingTaskDetail />} />
          <Route path="/" element={<Navigate to="/purchase" replace />} />
        </Routes>
      </Suspense>
    </MainLayout>
  );
}

export default App;
