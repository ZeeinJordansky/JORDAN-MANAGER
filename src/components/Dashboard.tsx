import React, { useState } from 'react';
import { 
  MessageSquare, Settings, BarChart3, Users, LogOut, 
  ChevronRight, Shield, Zap, Search, Bell, Menu, X 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DashboardProps {
  user: any;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onNavigate: (path: string) => void;
}

export default function Dashboard({ user, onLogout, theme, onNavigate }: DashboardProps) {
  const [activeSection, setActiveSection] = useState('chats');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLight = theme === 'light';

  const sections = [
    { id: 'chats', label: 'Мои беседы', icon: MessageSquare },
    { id: 'stats', label: 'Статистика', icon: BarChart3 },
    { id: 'users', label: 'Участники', icon: Users },
    { id: 'settings', label: 'Настройки', icon: Settings },
  ];

  const handleLogout = () => {
    onLogout();
    onNavigate('/main');
  };

  return (
    <div className={`fixed inset-0 z-[100] flex overflow-hidden ${isLight ? 'bg-[#f8fafc]' : 'bg-black'}`}>
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${
        isLight ? 'bg-white border-r border-neutral-200' : 'bg-neutral-950 border-r border-white/5'
      } flex flex-col shadow-2xl lg:shadow-none`}>
        
        {/* User Profile Header */}
        <div className="p-6 border-b border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-violet-500/20 shadow-lg">
            <img src={user?.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`text-sm font-black truncate ${isLight ? 'text-neutral-900' : 'text-white'}`}>
              {user?.fullName}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">Владелец</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
          {sections.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group font-bold text-xs ${
                activeSection === item.id
                  ? 'bg-violet-600 text-white shadow-xl shadow-violet-600/20'
                  : isLight 
                    ? 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900' 
                    : 'text-neutral-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                activeSection === item.id ? 'text-white' : 'text-violet-500'
              }`} />
              <span>{item.label}</span>
              {activeSection === item.id && (
                <motion.div layoutId="active-pill" className="ml-auto w-1 h-4 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-white/5 space-y-2">
          <button 
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all font-bold text-xs ${
              isLight 
                ? 'text-rose-600 hover:bg-rose-50' 
                : 'text-rose-400 hover:bg-rose-500/10'
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Выйти из панели</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className={`h-16 flex items-center justify-between px-6 border-b ${
          isLight ? 'bg-white border-neutral-200' : 'bg-neutral-950 border-white/5'
        }`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 lg:hidden rounded-xl bg-white/5 hover:bg-white/10 text-neutral-400"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-violet-500" />
              <h1 className={`text-sm font-black uppercase tracking-widest ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                {sections.find(s => s.id === activeSection)?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border ${
               isLight ? 'bg-neutral-50 border-neutral-200' : 'bg-white/5 border-white/5'
             }`}>
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
               <span className="text-[10px] font-black text-neutral-500">SERVER ONLINE</span>
             </div>
             <button className="p-2.5 rounded-xl hover:bg-white/5 text-neutral-500 transition-colors">
               <Bell className="w-4 h-4" />
             </button>
          </div>
        </header>

        {/* Scrollable View */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-5xl mx-auto space-y-8"
            >
              {activeSection === 'chats' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h2 className={`text-2xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>Ваши беседы</h2>
                      <p className="text-xs font-bold text-neutral-500 uppercase tracking-widest">Управляйте настройками ваших чатов</p>
                    </div>
                    <button className="px-5 py-2.5 bg-violet-600 text-white rounded-xl text-xs font-black hover:bg-violet-500 shadow-lg shadow-violet-600/20 transition-all active:scale-95">
                      Добавить новую
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     {[1, 2].map((i) => (
                       <div key={i} className={`p-6 rounded-[2rem] border transition-all hover:shadow-xl group ${
                         isLight ? 'bg-white border-neutral-200' : 'bg-neutral-900 border-white/5'
                       }`}>
                         <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-4">
                               <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shadow-lg">
                                 {i === 1 ? 'Ч' : 'Т'}
                               </div>
                               <div>
                                  <h3 className={`font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                                    {i === 1 ? 'Чат с друзьями' : 'Тех. поддержка'}
                                  </h3>
                                  <p className="text-[10px] font-bold text-neutral-500 mt-0.5">ID: 20000000{i}</p>
                               </div>
                            </div>
                            <div className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase tracking-widest">
                               Активен
                            </div>
                         </div>
                         <div className="mt-8 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-6">
                               <div className="text-center">
                                  <div className={`text-sm font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>128</div>
                                  <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-tighter">Участников</div>
                               </div>
                               <div className="text-center">
                                  <div className={`text-sm font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>1.2k</div>
                                  <div className="text-[9px] font-bold text-neutral-500 uppercase tracking-tighter">Сообщений</div>
                               </div>
                            </div>
                            <button className={`p-3 rounded-2xl border transition-all ${
                              isLight ? 'bg-neutral-50 border-neutral-200 hover:bg-neutral-100' : 'bg-white/5 border-white/5 hover:bg-white/10'
                            }`}>
                               <ChevronRight className="w-4 h-4 text-violet-500" />
                            </button>
                         </div>
                       </div>
                     ))}
                  </div>
                </div>
              )}

              {activeSection !== 'chats' && (
                <div className={`p-20 rounded-[3rem] border border-dashed text-center space-y-4 ${
                  isLight ? 'bg-white border-neutral-200 text-neutral-400' : 'bg-neutral-900 border-white/10 text-neutral-600'
                }`}>
                   <Zap className="w-12 h-12 mx-auto opacity-20" />
                   <p className="text-sm font-black uppercase tracking-widest">Раздел в разработке</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
