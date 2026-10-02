import React, { useState } from 'react';
import { Shield, BookOpen, Search, Lock, ChevronDown, ChevronRight, FileText, CheckCircle2, ArrowLeft } from 'lucide-react';
import { RULES_SECTIONS } from '../data/rulesData';

interface RulesAndPrivacyProps {
  initialTab?: 'rules' | 'privacy';
  onBack?: () => void;
}

export default function RulesAndPrivacy({ initialTab = 'rules', onBack }: RulesAndPrivacyProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'privacy'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'section-1': true,
    'section-2': true,
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    RULES_SECTIONS.forEach((s) => (all[s.id] = true));
    setExpandedSections(all);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  // Filter sections by search query
  const filteredSections = RULES_SECTIONS.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (sec.title.toLowerCase().includes(q)) return true;
    return sec.subsections.some((sub) =>
      (sub.subtitle && sub.subtitle.toLowerCase().includes(q)) ||
      sub.items.some((it) => it.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 font-sans text-neutral-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl transition-colors"
              title="Назад"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Документация и регламент</span>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                Редакция 2026
              </span>
            </h1>
            <p className="text-xs text-neutral-400 mt-1">
              Официальные правила использования чат-менеджера «Mint» и политика конфиденциальности
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'rules'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Регламент и правила</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'privacy'
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Конфиденциальность</span>
          </button>
        </div>
      </div>

      {/* TAB 1: RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-6">
          {/* Controls bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по статьям и пунктам правил..."
                className="w-full bg-neutral-950 border border-neutral-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-neutral-500 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Развернуть все
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg text-xs text-neutral-400 hover:text-white transition-colors"
              >
                Свернуть
              </button>
            </div>
          </div>

          {/* Quick Section Nav Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {RULES_SECTIONS.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  setExpandedSections((prev) => ({ ...prev, [sec.id]: true }));
                  document.getElementById(sec.id)?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="p-2.5 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800/80 hover:border-emerald-500/40 rounded-xl text-[11px] font-semibold text-neutral-300 text-center transition-all truncate"
              >
                {sec.title}
              </a>
            ))}
          </div>

          {/* Sections List */}
          <div className="space-y-5">
            {filteredSections.map((sec) => {
              const isExpanded = expandedSections[sec.id] || searchQuery.length > 0;
              return (
                <div
                  key={sec.id}
                  id={sec.id}
                  className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => toggleSection(sec.id)}
                    className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-neutral-900/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-xs font-bold flex items-center justify-center">
                        {sec.number}
                      </span>
                      <h2 className="text-base font-bold text-white tracking-tight">{sec.title}</h2>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-neutral-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 border-t border-neutral-900 space-y-6">
                      {sec.subsections.map((sub, sIdx) => (
                        <div key={sIdx} className="space-y-3">
                          {sub.subtitle && (
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400/90 pl-1">
                              {sub.subtitle}
                            </h3>
                          )}
                          <div className="space-y-2.5 text-xs text-neutral-300 leading-relaxed font-normal">
                            {sub.items.map((item, iIdx) => (
                              <p
                                key={iIdx}
                                className={`pl-3 border-l-2 py-0.5 ${
                                  item.startsWith('•')
                                    ? 'border-emerald-500/40 text-neutral-300 pl-4'
                                    : 'border-neutral-800 text-neutral-200'
                                }`}
                              >
                                {item}
                              </p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredSections.length === 0 && (
              <div className="text-center py-12 text-neutral-500 text-xs">
                По запросу «{searchQuery}» совпадений в Регламенте не найдено.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PRIVACY POLICY */}
      {activeTab === 'privacy' && (
        <div className="bg-neutral-950 border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-8">
          <div className="border-b border-neutral-800 pb-6 space-y-2">
            <h2 className="text-xl font-black text-white">Политика конфиденциальности чат-менеджера «Mint»</h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Настоящая Политика определяет порядок сбора, обработки, хранения и защиты данных пользователей чат-менеджера «Mint» ВКонтакте.
            </p>
          </div>

          <div className="space-y-6 text-xs text-neutral-300 leading-relaxed">
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-[11px]">
                  1
                </span>
                <span>Какие данные собираются</span>
              </h3>
              <p className="pl-7">
                Для корректной работы сервиса и выполнения команд бот обрабатывает общедоступные идентификаторы ВКонтакте (ID пользователя, ID беседы / peer_id), имя и фамилию профиля VK, отправленные команды и параметры, а также настройки бесед, установленные администраторами.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-[11px]">
                  2
                </span>
                <span>Цели обработки информации</span>
              </h3>
              <ul className="pl-7 list-disc space-y-1 text-neutral-400">
                <li>Предоставление игровых механик, ведение рейтинга и баланса участников;</li>
                <li>Автоматическая фильтрация спама, матерных слов и защита бесед от рейдов;</li>
                <li>Ведение журнала действий и истории модерации в беседах;</li>
                <li>Техническая поддержка и рассмотрение обращений через систему тикетов (/ticket).</li>
              </ul>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-[11px]">
                  3
                </span>
                <span>Криптографическая защита и хранение</span>
              </h3>
              <p className="pl-7">
                Все пароли и ключи доступа к панели управления не хранятся в открытом виде и шифруются алгоритмом PBKDF2 (SHA-512) с уникальной криптографической солью. Сессионные токены шифруются по стандарту AES-256. Доступ к служебным данным строго ограничен.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-[11px]">
                  4
                </span>
                <span>Непередача данных третьим лицам</span>
              </h3>
              <p className="pl-7">
                Чат-менеджер «Mint» никогда не продаёт, не передаёт и не распространяет данные пользователей сторонним организациям, рекламным сетям или частным лицам. Информация используется строго в рамках системы бота.
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-mono text-[11px]">
                  5
                </span>
                <span>Удаление и исправление данных</span>
              </h3>
              <p className="pl-7">
                Пользователь или владелец беседы имеет право запросить сброс статистики или удаление данных беседы через команду /cleardb либо посредством тикета в техническую поддержку чат-менеджера.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
