import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { LogIn, X } from 'lucide-react';

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
  const { login, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 👇 ***** 補上這個遺漏的函式 *****
  const handleGoogleLogin = async () => {
    setError('');
    setIsLoggingIn(true);
    try {
      await signInWithGoogle();
      onClose(); // 登入成功後關閉視窗
    } catch (err) {
      console.error("Google Login failed:", err);
      setError("Google 登入失敗，請稍後再試。");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoggingIn(true);
    try {
      await login(email, password);
      onClose();
    } catch (err) {
      console.error("Login failed:", err);
      setError("登入失敗，請檢查帳號密碼或模擬器中是否有此用戶。");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="bg-blue-500 text-white p-4 rounded-t-lg flex justify-between items-center">
          <h2 className="text-lg font-semibold">登入</h2>
          <button onClick={onClose} className="text-white hover:bg-blue-600 p-1 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {error && <p className="text-red-500 text-sm bg-red-100 p-3 rounded-md text-center mb-4">{error}</p>}
          
          <button 
            onClick={handleGoogleLogin} // 現在這個函式存在了
            disabled={isLoggingIn}
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

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="test@example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="123456" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg transition-colors">
                取消
              </button>
              <button type="submit" disabled={isLoggingIn} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50">
                {isLoggingIn ? '登入中...' : <><LogIn size={16} /> 登入</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;