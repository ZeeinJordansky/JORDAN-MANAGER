import React, { useState } from 'react';
import { Shield, BookOpen, Lock, ChevronDown, ChevronRight, FileText, CheckCircle2, ArrowLeft, ExternalLink, ShieldCheck } from 'lucide-react';
import { RULES_SECTIONS } from '../data/rulesData';

interface RulesAndPrivacyProps {
  initialTab?: 'rules' | 'privacy';
  onBack?: () => void;
  theme?: 'dark' | 'light';
}

export default function RulesAndPrivacy({ initialTab = 'rules', onBack, theme = 'dark' }: RulesAndPrivacyProps) {
  const [activeTab, setActiveTab] = useState<'rules' | 'privacy'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    'section-1': true,
    'section-2': true,
  });

  const isLight = theme === 'light';

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
    <div className={`w-full max-w-5xl mx-auto space-y-8 font-sans ${isLight ? 'text-neutral-800' : 'text-neutral-200'}`}>
      {/* Top Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b ${isLight ? 'border-neutral-200' : 'border-white/10'}`}>
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className={`p-2 rounded-xl transition-colors cursor-pointer border ${
                isLight ? 'bg-white hover:bg-neutral-100 border-neutral-200 text-neutral-700' : 'bg-neutral-900 hover:bg-neutral-800 border-white/10 text-neutral-300'
              }`}
              title="Назад"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <div>
            <h1 className={`text-2xl font-black tracking-tight flex items-center gap-2.5 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
              <span>Документация и регламент</span>
              <span className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                isLight ? 'bg-violet-100 text-violet-800 border-violet-200' : 'text-violet-400 bg-violet-500/10 border-violet-500/20'
              }`}>
                Редакция 2026
              </span>
            </h1>
            <p className={`text-xs mt-1 ${isLight ? 'text-neutral-500' : 'text-neutral-400'}`}>
              Официальные правила использования чат-менеджера «Mint» и политика конфиденциальности
            </p>
          </div>
        </div>

        {/* Tab switchers */}
        <div className={`flex items-center gap-1.5 p-1 rounded-xl border ${isLight ? 'bg-neutral-100 border-neutral-200' : 'bg-neutral-900/80 border-white/10'}`}>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-neutral-900 text-white shadow-sm'
                : isLight ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Регламент и правила</span>
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-neutral-900 text-white shadow-sm'
                : isLight ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-400 hover:text-white'
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
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по статьям регламента..."
                className={`w-full rounded-xl pl-4 pr-4 py-2.5 text-xs outline-none transition-all ${
                  isLight
                    ? 'bg-white border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:border-violet-500 shadow-sm'
                    : 'bg-neutral-950/80 border border-white/10 text-white placeholder:text-neutral-500 focus:border-violet-500'
                }`}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  isLight ? 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100' : 'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                Развернуть всё
              </button>
              <button
                onClick={collapseAll}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
                  isLight ? 'bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-100' : 'bg-neutral-900 border-white/10 text-neutral-300 hover:bg-neutral-800'
                }`}
              >
                Свернуть всё
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredSections.map((sec) => {
              const isExpanded = !!expandedSections[sec.id];
              return (
                <div
                  key={sec.id}
                  className={`rounded-2xl border transition-all ${
                    isLight ? 'bg-white border-neutral-200 shadow-sm' : 'bg-neutral-950/70 backdrop-blur-xl border-white/10'
                  }`}
                >
                  <button
                    onClick={() => toggleSection(sec.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-violet-400" />
                      </div>
                      <span className={`text-sm sm:text-base font-bold group-hover:text-violet-500 transition-colors ${
                        isLight ? 'text-neutral-900' : 'text-white'
                      }`}>
                        {sec.title}
                      </span>
                    </div>
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-neutral-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-neutral-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className={`px-6 pb-6 pt-2 space-y-6 border-t ${isLight ? 'border-neutral-150' : 'border-white/5'}`}>
                      {sec.subsections.map((sub, idx) => (
                        <div key={idx} className="space-y-3">
                          {sub.subtitle && (
                            <h3 className="text-xs font-extrabold uppercase tracking-wider text-violet-400 pl-1">
                              {sub.subtitle}
                            </h3>
                          )}
                          <div className={`space-y-2.5 text-xs leading-relaxed font-normal ${isLight ? 'text-neutral-700' : 'text-neutral-300'}`}>
                            {sub.items.map((item, iIdx) => (
                              <p
                                key={iIdx}
                                className={`pl-3 border-l-2 py-0.5 ${
                                  item.startsWith('•')
                                    ? 'border-violet-500/40 text-violet-300 pl-4'
                                    : isLight ? 'border-neutral-300 text-neutral-700' : 'border-neutral-800 text-neutral-200'
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
          </div>
        </div>
      )}

      {/* TAB 2: REAL, COMPREHENSIVE PRIVACY POLICY (Политика конфиденциальности) */}
      {activeTab === 'privacy' && (
        <div className={`rounded-3xl p-6 sm:p-10 space-y-8 border shadow-xl ${
          isLight ? 'bg-white border-neutral-200 text-neutral-800' : 'bg-neutral-950/80 backdrop-blur-xl border-white/10 text-neutral-300'
        }`}>
          {/* Header */}
          <div className={`border-b pb-6 space-y-3 ${isLight ? 'border-neutral-200' : 'border-white/10'}`}>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-violet-500" />
              <h2 className={`text-xl sm:text-2xl font-black ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                Политика конфиденциальности сервиса «Mint»
              </h2>
            </div>
            <p className={`text-xs leading-relaxed ${isLight ? 'text-neutral-600' : 'text-neutral-400'}`}>
              Настоящая Политика конфиденциальности (далее — «Политика») определяет порядок сбора, записи, систематизации, накопления, хранения, уточнения, извлечения, использования, передачи, обезличивания, блокирования и уничтожения данных пользователей чат-менеджера «Mint» в социальной сети ВКонтакте в строгом соответствии с Федеральным законом РФ от 27.07.2006 № 152-ФЗ «О персональных данных» и регламентом VK API.
            </p>
            <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono text-neutral-500">
              <span>Дата вступления в силу: 1 января 2026 г.</span>
              <span>•</span>
              <span>Версия документа: 2.4-RU</span>
              <span>•</span>
              <span>Юрисдикция: Российская Федерация</span>
            </div>
          </div>

          {/* Legal Sections */}
          <div className="space-y-8 text-xs leading-relaxed">
            {/* Section 1 */}
            <div className="space-y-2">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                <span className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center font-mono text-[11px] font-black">
                  1
                </span>
                <span>Общие положения и правовые основания</span>
              </h3>
              <div className="pl-8 space-y-2">
                <p>
                  1.1. Администрация сервиса «Mint» (далее — «Оператор») ставит соблюдение прав и свобод граждан Российской Федерации и иных пользователей приоритетным условием ведения деятельности.
                </p>
                <p>
                  1.2. Правовыми основаниями обработки данных выступают:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-neutral-400">
                  <li>Федеральный закон РФ от 27.07.2006 № 152-ФЗ «О персональных данных»;</li>
                  <li>Пользовательское соглашение и правила социальной сети ВКонтакте (ООО «В Контакте»);</li>
                  <li>Согласие пользователя, выраженное фактом добавления бота в беседу, отправки команд с префиксом или использования интерактивных веб-сервисов чат-менеджера.</li>
                </ul>
              </div>
            </div>

            {/* Section 2 */}
            <div className="space-y-2">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                <span className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center font-mono text-[11px] font-black">
                  2
                </span>
                <span>Категории обрабатываемых данных (Принцип минимальности)</span>
              </h3>
              <div className="pl-8 space-y-2">
                <p>
                  2.1. В соответствии со ст. 5 152-ФЗ обработка ограничивается достижением конкретных целей. Сервис «Mint» обрабатывает исключительно:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Идентификатор пользователя ВКонтакте (ID / user_id)</strong> — для привязки игрового профиля, баланса и модераторских полномочий;</li>
                  <li><strong>Идентификатор беседы (peer_id)</strong> — для изолированного хранения настроек и правил конкретного чата;</li>
                  <li><strong>Общедоступные имя и фамилию профиля VK</strong> — исключительно для форматирования текстовых ответов в беседе;</li>
                  <li><strong>Текст входящих сообщений, содержащих установленный командный префикс</strong> — для парсинга и исполнения запрошенной функции;</li>
                  <li><strong>Внутриигровую статистику</strong>: виртуальный баланс монет, рейтинг, клановая принадлежность, дата вступления, количество выданных предупреждений и мутов.</li>
                </ul>
                <div className={`p-3.5 rounded-xl border mt-2 ${isLight ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-amber-500/10 border-amber-500/20 text-amber-200'}`}>
                  <strong>Важно:</strong> Сервис «Mint» <strong>НЕ собирает, НЕ анализирует и НЕ сохраняет</strong> личную переписку пользователей вне вызова команд, пароли, паспортные данные, номера телефонов, банковские карты и геолокацию.
                </div>
              </div>
            </div>

            {/* Section 3 */}
            <div className="space-y-2">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                <span className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center font-mono text-[11px] font-black">
                  3
                </span>
                <span>Цели обработки данных</span>
              </h3>
              <div className="pl-8 space-y-2">
                <p>3.1. Сбор и обработка информации осуществляются строго в следующих целях:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Обеспечение базовой работоспособности чат-менеджера и реагирования на команды участников;</li>
                  <li>Автоматическая защита бесед от спам-атак, нежелательных ссылок, нецензурной брани и рейдерских набегов;</li>
                  <li>Учет и синхронизация игрового прогресса, дуэлей, клановых турниров и виртуальной экономики;</li>
                  <li>Исполнение решений владельцев и модераторов бесед (ведение черных списков, учет варнов и мутов).</li>
                </ul>
              </div>
            </div>

            {/* Section 4 */}
            <div className="space-y-2">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                <span className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center font-mono text-[11px] font-black">
                  4
                </span>
                <span>Меры обеспечения безопасности и хранение (ст. 19 152-ФЗ)</span>
              </h3>
              <div className="pl-8 space-y-2">
                <p>
                  4.1. Все серверные мощности и базы данных, используемые сервисом «Mint», расположены на территории Российской Федерации.
                </p>
                <p>
                  4.2. Безопасность обеспечивается комплексом организационных и технических мер:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Шифрование каналов передачи данных с использованием протоколов TLS 1.3 / HTTPS;</li>
                  <li>Хэширование критических параметров алгоритмами SHA-512 и PBKDF2;</li>
                  <li>Строгое ролевое разграничение прав доступа администраторов и протоколирование действий;</li>
                  <li>Регулярное резервное копирование и защита от DDoS-атак на сетевом уровне.</li>
                </ul>
              </div>
            </div>

            {/* Section 5 */}
            <div className="space-y-2">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                <span className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center font-mono text-[11px] font-black">
                  5
                </span>
                <span>Передача третьим лицам</span>
              </h3>
              <div className="pl-8 space-y-2">
                <p>
                  5.1. Оператор <strong>категорически запрещает и исключает</strong> передачу, продажу, сдачу в аренду или распространение персональных идентификаторов пользователей третьим сторонам, маркетинговым агентствам или рекламным сетям.
                </p>
                <p>
                  5.2. Взаимодействие происходит исключительно с серверами ВКонтакте посредством регламентированных методов VK API в объеме, необходимом для доставки ответов бота.
                </p>
              </div>
            </div>

            {/* Section 6 */}
            <div className="space-y-2">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                <span className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center font-mono text-[11px] font-black">
                  6
                </span>
                <span>Права субъектов данных (Удаление и отзыв согласия)</span>
              </h3>
              <div className="pl-8 space-y-2">
                <p>
                  6.1. Каждый пользователь сервиса обладает правами, гарантированными законодательством РФ:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li><strong>Право на удаление:</strong> Владелец беседы вправе в любой момент выполнить команду полного удаления данных чата (/сброс беседы), либо обратиться в техническую поддержку для полного стирания профиля;</li>
                  <li><strong>Право на прекращение обработки:</strong> Исключение бота из беседы влечет немедленное прекращение получения и обработки обновлений LongPoll/Callback для данной беседы;</li>
                  <li><strong>Срок автоматической очистки:</strong> Данные бесед, где бот не активен более 180 календарных дней, подвергаются автоматической деперсонализации и плановому удалению.</li>
                </ul>
              </div>
            </div>

            {/* Section 7 */}
            <div className="space-y-2">
              <h3 className={`text-sm font-bold flex items-center gap-2 ${isLight ? 'text-neutral-900' : 'text-white'}`}>
                <span className="w-6 h-6 rounded-lg bg-violet-500/10 text-violet-500 border border-violet-500/20 flex items-center justify-center font-mono text-[11px] font-black">
                  7
                </span>
                <span>Контакты и обратная связь</span>
              </h3>
              <div className="pl-8 space-y-2">
                <p>
                  По любым вопросам, касающимся настоящей Политики конфиденциальности, порядка обработки или удаления ваших данных, вы можете обратиться к Оператору через официальное сообщество ВКонтакте:
                </p>
                <div className="pt-1">
                  <a
                    href="https://vk.ru/app6441755_-239281784"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    <span>Служба поддержки «Mint» ВКонтакте</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
