import React, { useEffect } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';

interface WelcomeModalProps {
  login: string;
  onFinish: () => void;
}

export default function WelcomeModal({ login, onFinish }: WelcomeModalProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2200);
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-600/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white mb-4 shadow-lg shadow-indigo-500/30 animate-bounce">
          <Sparkles className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-bold text-white mb-2">
          Здравствуйте, <span className="text-indigo-400 font-mono">{login}</span>!
        </h3>

        <p className="text-sm text-slate-300 font-medium leading-relaxed mb-6">
          Добро пожаловать! Сейчас мы вас перенаправим на главную страницу.
        </p>

        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 h-full w-full animate-pulse" />
        </div>

        <button
          onClick={onFinish}
          className="mt-5 text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 mx-auto transition-colors"
        >
          <span>Перейти не дожидаясь</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
