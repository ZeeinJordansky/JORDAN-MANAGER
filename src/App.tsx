import React, { useState, useEffect } from 'react';
import BotLanding from './components/BotLanding';
import PanelApp from './panel/PanelApp';

export default function App() {
  const [viewMode, setViewMode] = useState<'website' | 'adminPanel'>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/panel/zxclk2311498Fslkjd')) {
      return 'adminPanel';
    }
    return 'website';
  });

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname.includes('/panel/zxclk2311498Fslkjd')) {
        setViewMode('adminPanel');
      } else {
        setViewMode('website');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const openAdminPanel = () => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/panel/zxclk2311498Fslkjd');
    }
    setViewMode('adminPanel');
  };

  const openWebsite = () => {
    if (typeof window !== 'undefined' && window.history.pushState) {
      window.history.pushState({}, '', '/');
    }
    setViewMode('website');
  };

  if (viewMode === 'adminPanel') {
    return (
      <div className="relative min-h-screen">
        <div className="fixed top-3 right-3 z-[9999]">
          <button
            onClick={openWebsite}
            className="px-3.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-700/80 text-slate-200 text-xs font-bold rounded-xl shadow-xl backdrop-blur-md transition-all flex items-center gap-1.5"
          >
            <span>🌐 На сайт бота</span>
          </button>
        </div>
        <PanelApp />
      </div>
    );
  }

  return <BotLanding onOpenAdminPanel={openAdminPanel} />;
}
