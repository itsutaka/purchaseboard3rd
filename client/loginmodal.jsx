import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, X, UserPlus } from 'lucide-react';

// Google Icon SVG Component
const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
    <path fill="none" d="M0 0h48v48H0z"></path>
  </svg>
);

const LoginModal = ({ isOpen, onClose }) => {
  const { login, signUp, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const [name, setName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 當 modal 開關或模式切換時，清空表單和錯誤訊息
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setMode('login');
        setError('');
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
      }, 200); // 等待淡出動畫結束
    }
  }, [isOpen]);

  const handleModeSwitch = () => {
    setError('');
    setMode(prevMode => prevMode === 'login' ? 'register' : 'login');
  }

  // 👇 ***** 補上這個遺漏的函式 *****
  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);
    try {
      await signInWithGoogle();
      onClose();
    } catch (err) {
      console.error("Google Login failed:", err);
      setError("Google 登入失敗，請稍後再試。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (mode === 'register') {
      // 註冊邏輯
      if (!name.trim()) {
        setError('請輸入您的姓名。');
        setIsSubmitting(false);
        return;
      }
      if (password !== confirmPassword) {
        setError('兩次輸入的密碼不一致。');
        setIsSubmitting(false);
        return;
      }
      try {
        await signUp(name, email, password);
        onClose();
      } catch (err) {
        console.error("Sign up failed:", err);
        if (err.code === 'auth/email-already-in-use') {
          setError('此電子郵件已經被註冊。');
        } else if (err.code === 'auth/weak-password') {
          setError('密碼強度不足，請設定至少6位數的密碼。');
        } else {
          setError("註冊失敗，請稍後再試。");
        }
      }
    } else {
      // 登入邏輯
      try {
        await login(email, password);
        onClose();
      } catch (err) {
        console.error("Login failed:", err);
        setError("登入失敗，請檢查帳號密碼或網路連線。");
      }
    }

    setIsSubmitting(false);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
          {/* 👇 3. 標題根據模式改變 */}
          <h2 className="text-lg font-semibold">{mode === 'login' ? '登入' : '註冊新帳號'}</h2>
          <button onClick={onClose} className="text-white hover:bg-blue-600 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md text-center mb-4">{error}</p>}
          
          <button 
            onClick={handleGoogleLogin} // 現在這個函式存在了
            disabled={isSubmitting}
            className="w-full border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg flex items-center justify-center gap-3 transition-colors disabled:opacity-50"
          >
            <GoogleIcon />
            使用 Google 帳號登入
          </button>

          <div className="my-4 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">或</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          {/* 👇 4. 將表單提交事件綁定到 handleSubmit */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 👇 5. 根據模式條件性渲染註冊欄位 */}
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名*</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="您的姓名" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email*</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="test@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密碼*</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="至少6位數" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
             {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">確認密碼*</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次輸入密碼" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
              </div>
            )}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors">
                取消
              </button>
              {/* 👇 6. 按鈕也根據模式改變 */}
              <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {isSubmitting ? (mode === 'login' ? '登入中...' : '註冊中...') : (
                  mode === 'login' ? <><LogIn size={16} /> 登入</> : <><UserPlus size={16} /> 註冊</>
                )}
              </button>
            </div>
          </form>

          {/* 👇 7. 新增模式切換的連結 */}
          <div className="text-center mt-4">
            <button onClick={handleModeSwitch} className="text-sm text-blue-600 hover:underline focus:outline-none">
              {mode === 'login' ? '還沒有帳號？點此註冊' : '已經有帳號？點此登入'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;