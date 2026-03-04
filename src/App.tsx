import React, { useState, useEffect } from 'react';
import { LiquidBackground } from './components/LiquidBackground';
import { PlayerGrid } from './components/PlayerGrid';
import { Sun, Moon } from 'lucide-react';

export default function App() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <main className="min-h-screen selection:bg-purple-500/30 selection:text-purple-200 relative">
      <LiquidBackground />
      
      {/* Theme Toggle */}
      <button
        onClick={() => setIsDark(!isDark)}
        className="fixed top-6 right-6 z-[60] p-3 rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 text-black dark:text-white hover:scale-110 transition-all shadow-xl"
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <PlayerGrid />
    </main>
  );
}
