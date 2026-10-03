import React, { useState, useEffect } from 'react';
import BotLanding from './components/BotLanding';
import PanelApp from './panel/PanelApp';
import OrbBackground from './components/OrbBackground';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import NotFound from './components/NotFound';

type AppRoute = 'landing' | 'commands' | 'faq' | 'rules' | 'privacy' | 'adminPanel' | 'login' | 'panel' | '404';

function parseUrlRoute(): { route: AppRoute; queryUser?: string; refCode?: string } {
  if (typeof window === 'undefined') return { route: 'landing' };

  const pathname = window.location.pathname;
  const lower = pathname.toLowerCase();
  const search = window.location.search;

  if (lower.includes('/panel/zxclk2311498fslkjd')) return { route: 'adminPanel' };

  // Control Panel Routes
  if (lower === '/login') return { route: 'login' };
  if (lower === '/panel') return { route: 'panel' };

  // Ref link support: /ref=(код) или /ref/(код) или ?ref=(код)
  if (lower.startsWith('/ref=') || lower.startsWith('/ref/')) {
    const rawRef = pathname.slice(pathname.indexOf('=') !== -1 ? pathname.indexOf('=') + 1 : pathname.indexOf('/ref/') + 5);
    const refCode = decodeURIComponent(rawRef).trim();
    if (refCode) {
      try {
        localStorage.setItem('mint_ref', refCode);
      } catch (e) {}
    }
    return { route: 'landing', refCode };
  }

  if (search.includes('ref=')) {
    const params = new URLSearchParams(search);
    const refCode = params.get('ref');
    if (refCode) {
      try {
        localStorage.setItem('mint_ref', refCode);
      } catch (e) {}
    }
  }

  if (lower === '/commands' || lower === '/help' || lower === '/хелп') return { route: 'commands' };
  if (lower === '/faq' || lower === '/вопросы') return { route: 'faq' };
  if (lower === '/rules' || lower === '/reglament') return { route: 'rules' };
  if (lower === '/privacy') return { route: 'privacy' };
  if (lower === '/' || lower === '' || lower === '/main') return { route: 'landing' };

  return { route: '404' };
}

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mint_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const [currentRoute, setCurrentRoute] = useState<AppRoute>(() => parseUrlRoute().route);
  const [initialBanUser, setInitialBanUser] = useState<string>(() => parseUrlRoute().queryUser || '');
  const [user, setUser] = useState<any>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mint_auth_user');
      return saved ? JSON.parse(saved) : null;
    }
    return null;
  });

  const handleLogin = (userData: any) => {
    setUser(userData);
    localStorage.setItem('mint_auth_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('mint_auth_user');
  };

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      if (typeof window !== 'undefined') {
        localStorage.setItem('mint_theme', next);
        if (next === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.classList.remove('light');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.classList.add('light');
        }
      }
      return next;
    });
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      }
    }
  }, [theme]);

  // Dynamic site title
  useEffect(() => {
    const titles: Record<AppRoute, string> = {
      landing: 'Главная | «Mint» - чат-менеджер',
      commands: 'Команды | «Mint» - чат-менеджер',
      faq: 'Часто задаваемые вопросы (FAQ) | «Mint» - чат-менеджер',
      rules: 'Регламент и правила | «Mint» - чат-менеджер',
      privacy: 'Конфиденциальность | «Mint» - чат-менеджер',
      adminPanel: 'Админ-панель | «Mint» - чат-менеджер',
      login: 'Вход в панель | «Mint»',
      panel: 'Панель управления | «Mint»',
      '404': '404 - Страница не найдена',
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
      const parsed = parseUrlRoute();
      setCurrentRoute(parsed.route);
      if (parsed.queryUser !== undefined) {
        setInitialBanUser(parsed.queryUser);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', path);
    }
    const parsed = parseUrlRoute();
    setCurrentRoute(parsed.route);
  };

  const openWebsite = () => {
    navigateTo('/main');
  };

  if (currentRoute === '404') {
    return <NotFound onNavigate={navigateTo} theme={theme} />;
  }

  if (currentRoute === 'login') {
    return <Login onLogin={handleLogin} theme={theme} onNavigate={navigateTo} />;
  }

  if (currentRoute === 'panel') {
    if (!user) {
      navigateTo('/login');
      return null;
    }
    return <Dashboard user={user} onLogout={handleLogout} theme={theme} onNavigate={navigateTo} />;
  }

  if (currentRoute === 'adminPanel') {
    return (
      <div className={`relative min-h-screen ${theme === 'light' ? 'bg-[#f8fafc]' : 'bg-black'}`}>
        <OrbBackground theme={theme} />
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
    <div className={`relative min-h-screen transition-colors duration-300 ${theme === 'light' ? 'bg-[#f8fafc]' : 'bg-black'}`}>
      <OrbBackground theme={theme} />
      <div className="relative z-10">
        <BotLanding
          initialView={currentRoute === 'adminPanel' ? 'landing' : currentRoute}
          initialBanUser={initialBanUser}
          onNavigate={navigateTo}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      </div>
    </div>
  );
}
