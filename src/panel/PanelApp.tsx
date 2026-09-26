import React, { useState, useEffect } from 'react';
import { panelApi } from './api';
import LoginModal from './components/LoginModal';
import WelcomeModal from './components/WelcomeModal';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import MainPage from './pages/MainPage';
import ChatsPage from './pages/ChatsPage';
import QuickActionsPage from './pages/QuickActionsPage';
import EconomyPage from './pages/EconomyPage';
import BroadcastsPage from './pages/BroadcastsPage';
import SessionsPage from './pages/SessionsPage';
import UsersPage from './pages/UsersPage';
import DatabasePage from './pages/DatabasePage';

export default function PanelApp() {
  const [session, setSession] = useState<{ token: string; isRoot: boolean; login: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [activeTab, setActiveTab] = useState('main');

  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await panelApi.verifySession();
        if (res.valid) {
          setSession({ token: res.session.id, isRoot: res.isRoot, login: res.login });
        }
      } catch (e) {
        // invalid
      } finally {
        setLoading(false);
      }
    };
    checkSession();
  }, []);

  const handleLoginSuccess = (data: { token: string; isRoot: boolean; login: string }) => {
    setSession(data);
    setShowWelcome(true);
  };

  const handleLogout = async () => {
    try {
      await panelApi.logout();
    } catch (e) {}
    localStorage.removeItem('panel_token');
    setSession(null);
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">Загрузка...</div>;
  }

  if (!session) {
    return <LoginModal onSuccess={handleLoginSuccess} />;
  }

  if (showWelcome) {
    return <WelcomeModal login={session.login} onFinish={() => setShowWelcome(false)} />;
  }

  return (
    <div className="flex h-screen bg-slate-950 text-slate-200 overflow-hidden font-sans">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRoot={session.isRoot}
        login={session.login}
        onLogout={handleLogout}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header login={session.login} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {activeTab === 'main' && <MainPage />}
          {activeTab === 'chats' && <ChatsPage />}
          {activeTab === 'actions' && <QuickActionsPage />}
          {activeTab === 'economy' && session.isRoot && <EconomyPage />}
          {activeTab === 'broadcasts' && session.isRoot && <BroadcastsPage />}
          {activeTab === 'sessions' && session.isRoot && <SessionsPage />}
          {activeTab === 'users' && session.isRoot && <UsersPage />}
          {activeTab === 'database' && session.isRoot && <DatabasePage />}
        </main>
      </div>
    </div>
  );
}
