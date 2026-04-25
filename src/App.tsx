import React, { useState, useEffect, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { LiquidBackground } from './components/LiquidBackground';
import { PlayerGrid } from './components/PlayerGrid';
import { Sun, Moon, Search, X } from 'lucide-react';

export default function App() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return true;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    if (isSearchOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchOpen]);

  return (
    <main className="min-h-screen selection:bg-purple-500/30 selection:text-purple-200 relative">
      <LiquidBackground />
      
      {/* Theme Toggle */}
      <div className="fixed top-6 right-6 z-[60]">
        <button
          onClick={() => setIsDark(!isDark)}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-black/5 dark:bg-white/5 backdrop-blur-xl border border-black/10 dark:border-white/10 text-black dark:text-white hover:scale-110 transition-transform shadow-xl"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Expanding Search Bar */}
      <div 
        className={`fixed top-6 z-[60] flex items-center transition-all duration-500 ease-in-out overflow-hidden rounded-2xl backdrop-blur-xl border shadow-xl ${
          isSearchOpen 
            ? 'w-[calc(100vw-6.75rem)] md:w-[60vw] right-[5.25rem] md:right-[20vw] bg-white/90 dark:bg-black/90 border-black/20 dark:border-white/20' 
            : 'w-12 right-[5.25rem] bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer'
        }`}
        onClick={() => {
          if (!isSearchOpen) setIsSearchOpen(true);
        }}
      >
        {/* Search Icon */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center z-10 text-black dark:text-white pointer-events-none">
          <Search className={`w-5 h-5 transition-colors ${isSearchOpen ? 'text-black/40 dark:text-white/40' : 'text-black dark:text-white'}`} />
        </div>

        {/* Input field */}
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Buscar videos..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onBlur={() => {
            // Only close if there is no query typed
            if (!searchQuery) {
              setIsSearchOpen(false);
            }
          }}
          tabIndex={isSearchOpen ? 0 : -1}
          inputMode={isSearchOpen ? 'text' : 'none'}
          aria-hidden={!isSearchOpen}
          className={`h-12 w-full bg-transparent pl-12 pr-10 text-black dark:text-white text-sm placeholder:text-black/40 dark:placeholder:text-white/40 focus:outline-none transition-opacity duration-300 ${
            isSearchOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 select-none pointer-events-none'
          }`}
        />

        {/* Close/Clear button */}
        {isSearchOpen && (
          <button
            onMouseDown={(e) => e.preventDefault()} // Prevents blur when clicking
            onClick={(e) => {
              e.stopPropagation(); // Prevent reopening if clicking inside the container
              if (searchQuery) {
                setSearchQuery('');
                searchInputRef.current?.focus();
              } else {
                setIsSearchOpen(false);
              }
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl text-black/50 dark:text-white/50 hover:bg-black/5 dark:hover:bg-white/5 hover:text-black dark:hover:text-white transition-colors z-10"
            aria-label="Cerrar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <PlayerGrid searchQuery={searchQuery} />
      <Analytics />
    </main>
  );
}
