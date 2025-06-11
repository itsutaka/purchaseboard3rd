import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup /*, createUserWithEmailAndPassword */ } from 'firebase/auth';
import { auth } from './firebaseConfig'; // Ensure this path is correct

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Example login function (add more like signUp, etc.)
  const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
  };

  // 👇 2. 新增一個 Google 登入的函式
  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  };
  
  const logout = () => {
    return firebaseSignOut(auth);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setCurrentUser(user);
      setLoading(false);
    });
    return unsubscribe; // Cleanup subscription on unmount
  }, []);

  const value = {
    currentUser,
    login,
    signInWithGoogle, // <--- 3. 將新函式匯出
    logout
    // Add other auth functions like signup, passwordReset, etc.
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
