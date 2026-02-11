import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check for existing session
  useEffect(() => {
    const session = localStorage.getItem('csh_video_session');
    if (session === 'active') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = () => {
    localStorage.setItem('csh_video_session', 'active');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('csh_video_session');
    setIsAuthenticated(false);
  };

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
