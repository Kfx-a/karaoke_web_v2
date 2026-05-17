import React, { useEffect, useState } from 'react';
import { AppPreloader } from './components/AppPreloader';
import { PlayerGrid } from './components/PlayerGrid';

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored) return stored === 'dark';
      return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
    } catch {
      return true;
    }
  });
  const [isPreloading, setIsPreloading] = useState(true);

  useEffect(() => {
    window.hideWebflowPreloader?.();
    const timer = setTimeout(() => {
      setIsPreloading(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    } catch {
      // Storage can be blocked in private browsing or restricted embeds.
    }
  }, [isDark]);

  return (
    <main
      className={[
        'min-h-screen relative',
        'selection:bg-[#d946ef]/30',
        'transition-colors duration-500',
        isDark
          ? 'bg-[#0f0720] text-white'
          : 'bg-[#f0ebff] text-gray-900',
      ].join(' ')}
    >
      <AppPreloader visible={isPreloading} />

      {/* Ambient gradient adapts per theme. */}
      {isDark ? (
        <>
          <div className="fixed top-0 inset-x-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#d946ef]/20 via-[#a855f7]/10 to-transparent pointer-events-none z-0" />
          <div className="fixed top-0 -left-1/4 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#f0abfc]/10 via-transparent to-transparent blur-3xl pointer-events-none z-0" />
          <div className="fixed top-40 -right-1/4 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#67e8f9]/6 via-transparent to-transparent blur-3xl pointer-events-none z-0" />
        </>
      ) : (
        <>
          <div className="fixed top-0 inset-x-0 h-[600px] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#d946ef]/15 via-[#a855f7]/8 to-transparent pointer-events-none z-0" />
          <div className="fixed top-0 -left-1/4 w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#f0abfc]/25 via-transparent to-transparent blur-3xl pointer-events-none z-0" />
        </>
      )}

      <div className="relative z-10">
        <PlayerGrid isDark={isDark} onToggleTheme={() => setIsDark(d => !d)} />
      </div>
    </main>
  );
}
