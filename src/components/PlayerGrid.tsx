import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { Loader2, ChevronLeft, ChevronRight, Search, Sun, Moon } from 'lucide-react';
import { fetchOdyseeVideos, sortByPriority, type OdyseeVideo } from '../services/odyseeService';

const VIDEOS_PER_PAGE = 20;

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isDark: boolean;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange, isDark }) => {
  if (totalPages <= 1) return null;

  const buildPages = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [];
    const near = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1].filter(p => p >= 1 && p <= totalPages));
    let prev = 0;
    for (const page of [...near].sort((a, b) => a - b)) {
      if (page - prev > 1) pages.push('...');
      pages.push(page);
      prev = page;
    }
    return pages;
  };

  const pages = buildPages();
  const btnBase = 'pagination-glass-button flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 select-none border';
  const btnActive = 'pagination-glass-active';
  const btnNormal = isDark ? 'pagination-glass-dark' : 'pagination-glass-light';
  const btnArrow = isDark ? 'pagination-glass-dark' : 'pagination-glass-light';
  const ellipsisColor = isDark ? 'text-white/30' : 'text-gray-500';

  return (
    <div className="flex items-center justify-center gap-2">
      <button
        className={`${btnBase} ${btnArrow}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Pagina anterior"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span key={`ellipsis-${idx}`} className={`w-8 h-8 flex items-center justify-center text-xs ${ellipsisColor}`}>...</span>
        ) : (
          <button
            key={page}
            className={`${btnBase} ${currentPage === page ? btnActive : btnNormal}`}
            onClick={() => onPageChange(page as number)}
          >
            {page}
          </button>
        )
      )}

      <button
        className={`${btnBase} ${btnArrow}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Pagina siguiente"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

interface PlayerGridProps {
  isDark?: boolean;
  onToggleTheme?: () => void;
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({ isDark = true, onToggleTheme }) => {
  const [videos, setVideos] = useState<OdyseeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<OdyseeVideo | null>(null);
  const [showPlayerFrame, setShowPlayerFrame] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedVideo) {
      document.body.style.overflow = 'hidden';
      history.pushState({ videoModal: true }, '');
    } else {
      document.body.style.overflow = 'auto';
      setShowPlayerFrame(false);
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [selectedVideo]);

  useEffect(() => {
    if (!selectedVideo) return;
    const timer = window.setTimeout(() => {
      setShowPlayerFrame(true);
    }, 260);
    return () => window.clearTimeout(timer);
  }, [selectedVideo]);

  useEffect(() => {
    const handlePopState = () => {
      if (selectedVideo) setSelectedVideo(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedVideo]);

  useEffect(() => {
    let isMounted = true;

    const loadVideos = async () => {
      setLoading(true);
      try {
        const data = await fetchOdyseeVideos('@Alis_FX:f');
        if (isMounted) setVideos(data);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadVideos();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredVideos = sortByPriority(
    videos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / VIDEOS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageVideos = filteredVideos.slice((safePage - 1) * VIDEOS_PER_PAGE, safePage * VIDEOS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const closeModal = () => {
    if (history.state?.videoModal) history.back();
    setSelectedVideo(null);
  };

  const mutedText = isDark ? 'text-white/30' : 'text-gray-500';

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <button
        onClick={onToggleTheme}
        className={[
          'fixed top-4 right-4 md:top-6 md:right-6 z-[180]',
          'w-[46px] h-[46px] flex items-center justify-center rounded-2xl border transition-all shrink-0 backdrop-blur-md',
          isDark
            ? 'bg-white/5 border-white/10 hover:border-white/20 text-white/75 hover:text-white'
            : 'bg-white/75 border-black/10 hover:border-black/20 text-gray-700 hover:text-gray-950 shadow-sm',
        ].join(' ')}
        aria-label="Toggle theme"
      >
        {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="w-full flex items-center gap-3 mb-6 md:mb-8 pr-14 md:pr-16">
        <div className="relative group/search flex-1">
          <input
            type="text"
            placeholder="Buscar videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={[
              'w-full h-[46px] pl-5 pr-12 rounded-2xl text-sm outline-none transition-all backdrop-blur-md',
              'border focus:border-[#ff0080]/50 focus:shadow-[0_0_15px_rgba(255,0,128,0.15)]',
              isDark
                ? 'bg-white/5 border-white/10 text-white placeholder-white/30'
                : 'bg-white/75 border-black/10 text-gray-950 placeholder-gray-500 shadow-sm',
            ].join(' ')}
          />
          <Search className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors group-focus-within/search:text-[#ff0080] ${isDark ? 'text-white/45' : 'text-gray-500'}`} />
        </div>
      </div>

      <div inert={selectedVideo ? true : undefined} className={selectedVideo ? 'pointer-events-none select-none' : ''}>
        <div className="flex items-center justify-center mb-5">
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} isDark={isDark} />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-12 h-12 text-[#ff0080] animate-spin" />
            <p className={`${mutedText} font-mono text-xs uppercase tracking-widest`}>Fetching from Odysee...</p>
          </div>
        ) : (
          <div ref={gridRef} className="scroll-mt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={safePage}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6"
              >
                {pageVideos.length > 0 ? (
                  pageVideos.map((video, idx) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22, ease: 'easeOut', delay: Math.min(idx * 0.02, 0.3) }}
                    >
                      <GlassCard
                        title={video.title}
                        thumbnail={video.thumbnail}
                        duration={video.duration}
                        viewCount={video.view_count}
                        onClick={() => setSelectedVideo(video)}
                        priority={idx < 8}
                      />
                    </motion.div>
                  ))
                ) : (
                  <div className="col-span-full py-20 text-center">
                    <p className={`${mutedText} font-mono text-xs uppercase tracking-widest`}>No videos found.</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        <div className="flex items-center justify-center mt-10">
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} isDark={isDark} />
        </div>
      </div>

      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 md:p-8"
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={closeModal}
              className={`absolute inset-0 backdrop-blur-md ${isDark ? 'bg-black/70' : 'bg-white/45'}`}
            />

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 18 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="glass-modal relative w-full max-w-[98vw] sm:max-w-[90vw] md:max-w-[75vw] lg:max-w-[65vw] rounded-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '90dvh' }}
            >
              <div className="modal-video-shell w-full bg-black overflow-hidden">
                {showPlayerFrame && (
                  <iframe
                    key={selectedVideo.id}
                    src={`${selectedVideo.embed_url}?autoplay=1`}
                    title={selectedVideo.title}
                    className="modal-video-frame"
                    allowFullScreen
                    allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                    referrerPolicy="no-referrer-when-downgrade"
                    loading="eager"
                  />
                )}
              </div>

              <div className="glass-modal-title w-full px-2 pt-4 pb-1 md:px-3 md:pt-5 md:pb-2 shrink-0">
                <h2 className="text-sm md:text-base font-semibold text-white line-clamp-2">
                  {selectedVideo.title}
                </h2>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
