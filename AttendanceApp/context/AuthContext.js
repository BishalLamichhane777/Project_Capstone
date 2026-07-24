import React, { createContext, useState, useContext } from 'react';
const AuthContext = createContext();
export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const loginState = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };
  const logoutState = () => {
    setToken(null);
    setUser(null);
  };
  const toggleDarkMode = () => setIsDarkMode(prev => !prev);
  return (
    <AuthContext.Provider value={{ token, user, loginState, logoutState, isDarkMode, toggleDarkMode }}>
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
