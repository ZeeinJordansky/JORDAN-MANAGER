import React from 'react';
import { Home, AlertCircle } from 'lucide-react';

interface NotFoundProps {
  onNavigate: (path: string) => void;
  theme: 'dark' | 'light';
}

export default function NotFound({ onNavigate, theme }: NotFoundProps) {
  const isLight = theme === 'light';

  return (
    <div className={`min-h-screen flex items-center justify-center p-6 text-center ${
      isLight ? 'text-neutral-900' : 'text-white'
    }`}>
      <div className="max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="relative inline-block">
          <div className={`w-24 h-24 rounded-[2rem] border-2 flex items-center justify-center mx-auto ${
            isLight ? 'bg-neutral-100 border-neutral-200 text-neutral-400' : 'bg-white/5 border-white/10 text-neutral-500'
          }`}>
            <AlertCircle className="w-12 h-12" />
          </div>
          <div className="absolute -top-2 -right-2 px-3 py-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">
            404
          </div>
        </div>
        
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight">Упс! Ошибка.</h1>
          <p className={`text-lg font-medium ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
            Данной страницы не существует.
          </p>
        </div>

        <button
          onClick={() => onNavigate('/main')}
          className={`group px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 mx-auto transition-all active:scale-95 shadow-xl ${
            isLight 
              ? 'bg-neutral-950 text-white hover:bg-neutral-800' 
              : 'bg-white text-black hover:bg-neutral-100'
          }`}
        >
          <Home className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
          <span>Перейти на главную</span>
        </button>
      </div>
    </div>
  );
}
