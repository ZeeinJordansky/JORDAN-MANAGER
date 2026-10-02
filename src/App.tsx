import React, { useState, useEffect } from 'react';
import BotLanding from './components/BotLanding';
import PanelApp from './panel/PanelApp';
import OrbBackground from './components/OrbBackground';

type AppRoute = 'landing' | 'commands' | 'rules' | 'privacy' | 'adminPanel';

export default function App() {
  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/panel/zxclk2311498fslkjd')) return 'adminPanel';
      if (path === '/commands') return 'commands';
      if (path === '/rules' || path === '/reglament') return 'rules';
      if (path === '/privacy') return 'privacy';
    }
    return 'landing';
  });

  // Dynamic site title: (название страницы) | «Mint» - чат-менеджер
  useEffect(() => {
    const titles: Record<AppRoute, string> = {
      landing: 'Главная | «Mint» - чат-менеджер',
      commands: 'Команды | «Mint» - чат-менеджер',
      rules: 'Регламент и правила | «Mint» - чат-менеджер',
      privacy: 'Конфиденциальность | «Mint» - чат-менеджер',
      adminPanel: 'Админ-панель | «Mint» - чат-менеджер',
    };
    const title = titles[currentRoute] || 'Главная | «Mint» - чат-менеджер';
    if (typeof document !== 'undefined') {
      document.title = title;
    }
  }, [currentRoute]);

  useEffect(() => {
    // Sync initial canonical path to /main if user visited root /
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path === '/' || path === '') {
        window.history.replaceState({}, '', '/main');
      }
    }

    const handlePopState = () => {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/panel/zxclk2311498fslkjd')) {
        setCurrentRoute('adminPanel');
      } else if (path === '/commands') {
        setCurrentRoute('commands');
      } else if (path === '/rules' || path === '/reglament') {
        setCurrentRoute('rules');
      } else if (path === '/privacy') {
        setCurrentRoute('privacy');
      } else {
        setCurrentRoute('landing');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', path);
    }
    const lower = path.toLowerCase();
    if (lower.includes('/panel/zxclk2311498fslkjd')) setCurrentRoute('adminPanel');
    else if (lower === '/commands') setCurrentRoute('commands');
    else if (lower === '/rules' || lower === '/reglament') setCurrentRoute('rules');
    else if (lower === '/privacy') setCurrentRoute('privacy');
    else setCurrentRoute('landing');
  };

  const openAdminPanel = () => {
    navigateTo('/panel/zxclk2311498Fslkjd');
  };

  const openWebsite = () => {
    navigateTo('/main');
  };

  if (currentRoute === 'adminPanel') {
    return (
      <div className="relative min-h-screen bg-black">
        <OrbBackground />
        <div className="fixed top-3 right-3 z-[9999]">
          <button
            onClick={openWebsite}
            className="px-3.5 py-1.5 bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 text-xs font-bold rounded-xl shadow-xl backdrop-blur-md transition-all flex items-center gap-1.5"
          >
            <span>🌐 На главную сайта</span>
          </button>
        </div>
        <div className="relative z-10">
          <PanelApp />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-black">
      <OrbBackground />
      <div className="relative z-10">
        <BotLanding
          initialView={currentRoute === 'adminPanel' ? 'landing' : currentRoute}
          onNavigate={navigateTo}
        />
      </div>
    </div>
  );
}
