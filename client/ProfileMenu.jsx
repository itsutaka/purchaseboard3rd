import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { LogOut, Edit2, Loader2, ChevronDown } from 'lucide-react';

const getShortName = (name) => {
  if (!name || typeof name !== 'string' || name.trim() === '') {
    return '';
  }

  const trimmedName = name.trim();
  const chineseCharRegex = /[\u4e00-\u9fa5]/;

  if (chineseCharRegex.test(trimmedName)) {
    return trimmedName.slice(-2);
  } else {
    return trimmedName.charAt(0).toUpperCase();
  }
};

const ProfileMenu = () => {
  const { currentUser, logout, updateUserProfile, userProfile, updateUserPreferences } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [editError, setEditError] = useState('');
  
  const [notificationPref, setNotificationPref] = useState(false);
  const [purchaseCompletePref, setPurchaseCompletePref] = useState(false);
  const [isUpdatingPrefs, setIsUpdatingPrefs] = useState(false);
  const [prefsError, setPrefsError] = useState('');

  const menuRef = useRef(null);

  const isApproved = userProfile?.status === 'approved';

  // 點擊外部��閉選單的 Effect
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
        setIsEditing(false); // 關閉時也取消編輯
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 當 userProfile 變動時，同步更新通知設定的狀態
  useEffect(() => {
    setNotificationPref(!!userProfile?.wantsNewRequestNotification);
    setPurchaseCompletePref(!!userProfile?.wantsPurchaseCompleteNotification);
  }, [userProfile]);

  // 登出處理
  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  // 姓名編輯處理
  const handleEditName = () => {
    setDisplayName(currentUser?.displayName || '');
    setIsEditing(true);
    setEditError('');
  };
  const handleSaveName = async () => {
    if (!displayName.trim()) {
      setEditError('姓名不能為空。');
      return;
    }
    try {
      await updateUserProfile({ displayName: displayName.trim() });
      setIsEditing(false);
    } catch (err) {
      setEditError('更���失敗，請稍後再試。');
    }
  };

  // 通知偏好設定處理
  const handlePreferenceChange = async (prefKey, isChecked) => {
    setIsUpdatingPrefs(true);
    setPrefsError('');
    try {
      await updateUserPreferences({ [prefKey]: isChecked });
    } catch (err) {
      setPrefsError('更新失敗，請刷新再試。');
      // 如果失敗，恢復 UI 狀態
      if (prefKey === 'wantsNewRequestNotification') setNotificationPref(!isChecked);
      if (prefKey === 'wantsPurchaseCompleteNotification') setPurchaseCompletePref(!isChecked);
    } finally {
      setIsUpdatingPrefs(false);
    }
  };

  if (!currentUser) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-2 text-base font-medium text-graphite-700 hover:text-glory-red-600 p-2 rounded-lg transition-colors"
      >
        <span>{getShortName(currentUser.displayName) || currentUser.email}</span>
        <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-xl border z-50">
          <div className="p-4 border-b">
            {isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full border border-graphite-300 rounded-md px-2 py-1 text-sm focus:border-glory-red-500 focus:ring-1 focus:ring-glory-red-500"
                  autoFocus
                />
                {editError && <small className="text-danger-500">{editError}</small>}
                <div className="flex gap-2">
                  <button onClick={handleSaveName} className="flex-1 text-base bg-glory-red-500 text-white px-2 py-1 rounded hover:bg-glory-red-600 transition-colors">儲存</button>
                  <button onClick={() => setIsEditing(false)} className="flex-1 text-base bg-graphite-200 px-2 py-1 rounded hover:bg-graphite-300 transition-colors">取消</button>
                </div>
              </div>
            ) : (
              <div className="flex items-center">
                <p className="font-semibold text-graphite-800 truncate flex-1 text-lg">{currentUser.displayName || '��設定姓名'}</p>
                <button onClick={handleEditName} className="text-graphite-500 hover:text-glory-red-600 ml-2" title="編輯姓名">
                  <Edit2 size={20} />
                </button>
              </div>
            )}
            <p className="text-xs text-graphite-500 truncate mt-1">{currentUser.email}</p>
          </div>

          <div className="p-4 border-b">
            <h4 className="text-base font-bold text-graphite-500 uppercase mb-3">通知設定</h4>
            <div className="space-y-3">
              <label htmlFor="notif-new" className={`flex items-center justify-between cursor-pointer ${!isApproved ? 'opacity-50' : ''}`}>
                <span className="text-sm text-graphite-700">新需求通知</span>
                {isUpdatingPrefs ? <Loader2 size={20} className="animate-spin" /> : 
                  <input type="checkbox" id="notif-new" disabled={!isApproved} checked={notificationPref} onChange={(e) => handlePreferenceChange('wantsNewRequestNotification', e.target.checked)} className="form-checkbox h-6 w-6 rounded text-glory-red-600"/>
                }
              </label>
               <label htmlFor="notif-complete" className={`flex items-center justify-between cursor-pointer ${!isApproved ? 'opacity-50' : ''}`}>
                <span className="text-sm text-graphite-700">購買完成通知</span>
                 {isUpdatingPrefs ? <Loader2 size={20} className="animate-spin" /> : 
                  <input type="checkbox" id="notif-complete" disabled={!isApproved} checked={purchaseCompletePref} onChange={(e) => handlePreferenceChange('wantsPurchaseCompleteNotification', e.target.checked)} className="form-checkbox h-6 w-6 rounded text-glory-red-600"/>
                }
              </label>
            </div>
             {!isApproved && <p className="text-xs text-warning-600 mt-2">需管理員審核後才能設定</p>}
             {prefsError && <p className="text-xs text-danger-500 mt-2">{prefsError}</p>}
          </div>

          <div className="p-2">
            <button 
              onClick={handleLogout}
              className="w-full text-left flex items-center gap-2 text-sm text-danger-600 hover:bg-danger-50 rounded-md px-3 py-2 transition-colors"
            >
              <LogOut size={16} />
              登出
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
