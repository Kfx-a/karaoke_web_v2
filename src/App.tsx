import React, { useCallback, useEffect, useState } from 'react';
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
  const [contentReady, setContentReady] = useState(false);
  const [revealContent, setRevealContent] = useState(false);
  const handleInitialContentReady = useCallback(() => {
    setContentReady(true);
  }, []);

  useEffect(() => {
    window.hideWebflowPreloader?.();
  }, []);

  useEffect(() => {
    if (!contentReady) return;

    setIsPreloading(false);
    const timer = window.setTimeout(() => {
      setRevealContent(true);
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [contentReady]);

  useEffect(() => {
    if (!isPreloading) {
      document.body.classList.remove('preloading');
      document.body.style.overflow = 'auto';
    } else {
      document.body.classList.add('preloading');
    }

    return () => {
      document.body.classList.remove('preloading');
    };
  }, [isPreloading]);

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
        'selection:bg-rose-500/30',
        'transition-colors duration-150',
        isDark
          ? 'bg-zinc-950 text-zinc-50'
          : 'bg-zinc-100 text-zinc-950',
      ].join(' ')}
    >
      <AppPreloader visible={isPreloading} />

      <div className="relative z-10">
        <PlayerGrid
          isDark={isDark}
          revealContent={revealContent}
          onInitialContentReady={handleInitialContentReady}
          onToggleTheme={() => setIsDark(d => !d)}
        />
      </div>
    </main>
  );
}
