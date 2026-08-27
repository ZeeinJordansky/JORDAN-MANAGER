import React from 'react';
import { LogOut, UserCircle } from 'lucide-react';

interface HeaderProps {
  login: string;
  onLogout: () => void;
}

export default function Header({ login, onLogout }: HeaderProps) {
  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
        <span className="text-xs font-medium text-slate-400">Система активна</span>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-bold text-white">{login}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Администратор</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
            <UserCircle className="w-6 h-6 text-slate-400" />
          </div>
        </div>
        
        <div className="h-8 w-px bg-slate-800" />
        
        <button
          onClick={onLogout}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Выйти</span>
        </button>
      </div>
    </header>
  );
}
