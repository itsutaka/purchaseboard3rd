import React from 'react';
import { useAuth } from './AuthContext';
import { User, LogOut } from 'lucide-react';

const UserProfile = () => {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
      alert("登出時發生錯誤。");
    }
  };

  if (!currentUser) {
    return null; // 如果沒有用戶登入，則不顯示任何東西
  }

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm mb-4 flex justify-between items-center text-sm">
      <div className="flex items-center gap-2 text-green-700 font-medium">
        <User size={18} />
        <span>已登入：{currentUser.email}</span>
      </div>
      <button 
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-600 text-white font-medium py-1 px-3 rounded-md flex items-center gap-1 transition-colors"
      >
        <LogOut size={16} />
        登出
      </button>
    </div>
  );
};

export default UserProfile;