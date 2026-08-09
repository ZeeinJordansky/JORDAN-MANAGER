import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [secret, setSecret] = useState<string | null>(() => {
    return localStorage.getItem('dashboard_secret');
  });

  const handleLogin = (newSecret: string) => {
    setSecret(newSecret);
    localStorage.setItem('dashboard_secret', newSecret);
  };

  const handleLogout = () => {
    setSecret(null);
    localStorage.removeItem('dashboard_secret');
  };

  if (!secret) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard secret={secret} onLogout={handleLogout} />;
}
