import React, { useState, useEffect } from 'react';
import { ShieldCheck, Cpu, Terminal, Activity } from 'lucide-react';
import { motion } from 'motion/react';

interface DDoSProps {
  onVerify: () => void;
}

export default function DDoSProtection({ onVerify }: DDoSProps) {
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const simulatedLogs = [
    'Инициализация защищенного SSL-канала...',
    'Анализ репутации IP-адреса клиента...',
    'Проверка отпечатков браузера (Fingerprinting)...',
    'WebGL & Canvas рендеринг тест...',
    'Проверка целостности заголовков HTTP/2...',
    'Анализ поведенческих маркеров сеанса...',
    'Сигнатуры DDoS атак не обнаружены.',
    'Доступ разрешен. Перенаправление...'
  ];

  useEffect(() => {
    let currentLogIndex = 0;
    const logInterval = setInterval(() => {
      if (currentLogIndex < simulatedLogs.length) {
        setLogs((prev) => [...prev, simulatedLogs[currentLogIndex]]);
        currentLogIndex++;
      }
    }, 300);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          clearInterval(logInterval);
          setTimeout(() => {
            onVerify();
          }, 400);
          return 100;
        }
        return prev + 4;
      });
    }, 100);

    return () => {
      clearInterval(logInterval);
      clearInterval(progressInterval);
    };
  }, [onVerify]);

  return (
    <div className="min-h-screen bg-[#0b0e14] flex flex-col items-center justify-center p-4 relative overflow-hidden text-[#c9d1d9] font-sans">
      {/* Abstract Glowing Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,191,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,191,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px]" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#161b22] border border-white/[0.08] rounded-2xl p-6 shadow-2xl relative z-10 space-y-6"
      >
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-sky-500/10 border border-[#00BFFF]/30 flex items-center justify-center relative">
            <ShieldCheck className="w-8 h-8 text-[#00BFFF] drop-shadow-[0_0_10px_#00BFFF]" />
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
              className="absolute inset-0 border-2 border-dashed border-[#00BFFF]/30 rounded-full"
            />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider uppercase text-white">GAMES MANAGER</h1>
            <p className="text-[10px] text-sky-400 font-bold uppercase tracking-widest mt-0.5">Cloudflare Anti-DDoS Protection</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-semibold text-[#8b949e]">
            <span className="flex items-center gap-1.5 uppercase tracking-wide">
              <Activity className="w-3.5 h-3.5 text-[#00BFFF] animate-pulse" />
              Анализ сигнатур
            </span>
            <span className="mono text-[#00BFFF] font-bold">{progress}%</span>
          </div>
          <div className="w-full bg-[#0b0e14] h-2 rounded-full overflow-hidden border border-white/[0.05] p-[1px]">
            <motion.div
              style={{ width: `${progress}%` }}
              className="h-full bg-gradient-to-r from-sky-500 to-[#00BFFF] rounded-full shadow-[0_0_8px_#00BFFF]"
            />
          </div>
        </div>

        {/* Terminal logs simulating advanced protection check */}
        <div className="bg-[#0b0e14] border border-white/[0.06] rounded-xl p-3.5 h-36 font-mono text-[10px] text-sky-300 overflow-y-auto space-y-1.5 scrollbar-thin">
          <div className="flex items-center gap-1.5 text-[#8b949e] border-b border-white/[0.05] pb-1.5 mb-1.5 font-sans font-semibold">
            <Terminal className="w-3.5 h-3.5 text-[#00BFFF]" />
            <span>Журнал проверок безопасности</span>
          </div>
          {logs.map((log, index) => (
            <div key={index} className="flex gap-2">
              <span className="text-[#8b949e] select-none">&gt;</span>
              <span>{log}</span>
            </div>
          ))}
        </div>

        <div className="text-center text-[10px] text-[#8b949e] leading-relaxed">
          Этот процесс полностью автоматизирован для предотвращения несанкционированного сканирования уязвимостей. Пожалуйста, подождите.
        </div>
      </motion.div>
    </div>
  );
}
