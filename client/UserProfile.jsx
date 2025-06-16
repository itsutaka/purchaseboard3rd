import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { User, LogOut, Edit2, Check, X } from 'lucide-react';

const UserProfile = () => {
  const { currentUser, logout, updateUserProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [error, setError] = useState('');

  const handleLogout = async () => {
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
      alert("登出時發生錯誤。");
    }
  };

  const handleEdit = () => {
    setDisplayName(currentUser?.displayName || ''); // 每次編輯時重設為目前名稱
    setError('');
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setError('');
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      setError('姓名不能為空。');
      return;
    }
    setError('');
    try {
      await updateUserProfile({ displayName: displayName.trim() });
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      setError('更新失敗，請稍後再試。');
    }
  };



  if (!currentUser) {
    return null; // 如果沒有用戶登入，則不顯示任何東西
  }

  return (
    <div className="bg-white p-3 rounded-lg shadow-sm mb-4 flex justify-between items-center text-sm">
      <div className="flex items-center gap-2 text-green-700 font-medium">
        <User size={18} />
        {!isEditing ? (
          <div className="flex items-center gap-2">
            <span>
              已登入：{currentUser.displayName || currentUser.email}
            </span>
            <button onClick={handleEdit} className="text-gray-500 hover:text-blue-600" title="編輯姓名">
              <Edit2 size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 w-full max-w-xs">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="border-b-2 border-blue-500 focus:outline-none px-1 text-sm w-full"
              autoFocus
            />
            <button onClick={handleSave} className="text-green-600 hover:text-green-800" title="儲存">
              <Check size={18} />
            </button>
            <button onClick={handleCancel} className="text-red-500 hover:text-red-700" title="取消">
              <X size={18} />
            </button>
          </div>
        )}
      </div>
      {error && <small className="text-red-500 mx-4">{error}</small>}
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