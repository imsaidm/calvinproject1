import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import Dashboard from './components/Dashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Check for existing session
  useEffect(() => {
    const session = localStorage.getItem('csh_video_session');
    const savedKey = localStorage.getItem('csh_api_key');
    if (session === 'active' && savedKey) {
      setIsAuthenticated(true);
      setApiKey(savedKey);
    }
  }, []);

  const handleLogin = (key) => {
    localStorage.setItem('csh_video_session', 'active');
    localStorage.setItem('csh_api_key', key);
    setApiKey(key);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('csh_video_session');
    localStorage.removeItem('csh_api_key');
    setApiKey('');
    setIsAuthenticated(false);
  };

  return (
    <>
      {isAuthenticated ? (
        <Dashboard onLogout={handleLogout} apiKey={apiKey} />
      ) : (
        <LoginPage onLogin={handleLogin} />
      )}
    </>
  );
}

export default App;
