import React, { useState, useEffect } from 'react';
import BotLanding from './components/BotLanding';
import PanelApp from './panel/PanelApp';
import OrbBackground from './components/OrbBackground';

type AppRoute = 'landing' | 'commands' | 'bans' | 'faq' | 'rules' | 'privacy' | 'adminPanel';

function parseUrlRoute(): { route: AppRoute; queryUser?: string; refCode?: string } {
  if (typeof window === 'undefined') return { route: 'landing' };

  const pathname = window.location.pathname;
  const lower = pathname.toLowerCase();
  const search = window.location.search;

  if (lower.includes('/panel/zxclk2311498fslkjd')) return { route: 'adminPanel' };

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

  // Exact requested route format: /getbans=(ид или юз)
  if (lower.startsWith('/getbans=') || lower.startsWith('/getbans/')) {
    const raw = pathname.slice(pathname.indexOf('=') !== -1 ? pathname.indexOf('=') + 1 : pathname.indexOf('/getbans/') + 9);
    const decoded = decodeURIComponent(raw).trim();
    return { route: 'bans', queryUser: decoded };
  }

  if (lower.startsWith('/getbans') || lower === '/bans' || lower === '/banlist') {
    const params = new URLSearchParams(search);
    const user = params.get('user') || params.get('id') || params.get('username') || '';
    return { route: 'bans', queryUser: user };
  }

  if (lower === '/commands' || lower === '/help' || lower === '/хелп') return { route: 'commands' };
  if (lower === '/faq' || lower === '/вопросы') return { route: 'faq' };
  if (lower === '/rules' || lower === '/reglament') return { route: 'rules' };
  if (lower === '/privacy') return { route: 'privacy' };

  return { route: 'landing' };
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

  // Dynamic site title: (название страницы) | «Mint» - чат-менеджер
  useEffect(() => {
    const titles: Record<AppRoute, string> = {
      landing: 'Главная | «Mint» - чат-менеджер',
      commands: 'Команды | «Mint» - чат-менеджер',
      bans: 'Блокировки в беседах | «Mint» - чат-менеджер',
      faq: 'Часто задаваемые вопросы (FAQ) | «Mint» - чат-менеджер',
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
    const lower = path.toLowerCase();
    if (lower.includes('/panel/zxclk2311498fslkjd')) {
      setCurrentRoute('adminPanel');
    } else if (lower.startsWith('/getbans=') || lower.startsWith('/getbans/') || lower.startsWith('/getbans') || lower === '/bans') {
      let rawUser = '';
      if (path.includes('=')) {
        rawUser = decodeURIComponent(path.split('=')[1] || '');
      } else if (path.startsWith('/getbans/')) {
        rawUser = decodeURIComponent(path.slice(9));
      }
      setInitialBanUser(rawUser);
      setCurrentRoute('bans');
    } else if (lower === '/commands' || lower === '/help' || lower === '/хелп') {
      setCurrentRoute('commands');
    } else if (lower === '/faq' || lower === '/вопросы') {
      setCurrentRoute('faq');
    } else if (lower === '/rules' || lower === '/reglament') {
      setCurrentRoute('rules');
    } else if (lower === '/privacy') {
      setCurrentRoute('privacy');
    } else {
      setCurrentRoute('landing');
    }
  };

  const openAdminPanel = () => {
    navigateTo('/panel/zxclk2311498Fslkjd');
  };

  const openWebsite = () => {
    navigateTo('/main');
  };

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
