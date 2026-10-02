import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 250) {
        setVisible(true);
      } else {
        setVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  if (!visible) return null;

  return (
    <button
      onClick={scrollToTop}
      aria-label="В самый верх"
      title="Наверх"
      className="fixed bottom-6 right-6 z-[9999] p-3.5 sm:p-4 rounded-2xl bg-violet-600/90 hover:bg-violet-500 text-white shadow-2xl shadow-violet-600/50 backdrop-blur-xl border border-violet-400/40 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center group animate-in fade-in slide-in-from-bottom-5"
    >
      <ArrowUp className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
    </button>
  );
}
