import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GlassCard } from './GlassCard';
import { Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchOdyseeVideos, sortByPriority, type OdyseeVideo } from '../services/odyseeService';

const VIDEOS_PER_PAGE = 20;

// ─── Pagination Component ────────────────────────────────────────────────────

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  // Build page number list with ellipsis
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

  const btnBase =
    'flex items-center justify-center w-9 h-9 rounded-xl text-sm font-semibold transition-all duration-200 select-none';
  const btnActive =
    'bg-purple-600 text-white shadow-lg shadow-purple-500/30 scale-105';
  const btnNormal =
    'bg-black/5 dark:bg-white/5 text-black/60 dark:text-white/60 border border-black/10 dark:border-white/10 hover:bg-purple-500/10 hover:text-purple-600 dark:hover:text-purple-400 hover:border-purple-500/30';
  const btnArrow =
    'bg-black/5 dark:bg-white/5 text-black/50 dark:text-white/50 border border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed';

  return (
    <div className="flex items-center justify-center gap-1.5 py-4">
      {/* Previous */}
      <button
        className={`${btnBase} ${btnArrow}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Página anterior"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      {/* Page numbers */}
      {pages.map((page, idx) =>
        page === '...' ? (
          <span
            key={`ellipsis-${idx}`}
            className="w-9 h-9 flex items-center justify-center text-black/30 dark:text-white/30 text-sm select-none"
          >
            …
          </span>
        ) : (
          <button
            key={page}
            className={`${btnBase} ${currentPage === page ? btnActive : btnNormal}`}
            onClick={() => onPageChange(page as number)}
            aria-label={`Página ${page}`}
            aria-current={currentPage === page ? 'page' : undefined}
          >
            {page}
          </button>
        )
      )}

      {/* Next */}
      <button
        className={`${btnBase} ${btnArrow}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Página siguiente"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

// ─── PlayerGrid ──────────────────────────────────────────────────────────────

export const PlayerGrid: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [videos, setVideos] = useState<OdyseeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<OdyseeVideo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const gridRef = useRef<HTMLDivElement>(null);

  // Back button (Android) handling
  useEffect(() => {
    if (selectedVideo) {
      document.body.style.overflow = 'hidden';
      history.pushState({ videoModal: true }, '');
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [selectedVideo]);

  useEffect(() => {
    const handlePopState = () => {
      if (selectedVideo) setSelectedVideo(null);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedVideo]);

  // Fetch all videos once
  useEffect(() => {
    const loadVideos = async () => {
      setLoading(true);
      const data = await fetchOdyseeVideos('@Alis_FX:f');
      setVideos(data);
      setLoading(false);
    };
    loadVideos();
  }, []);

  // Reset to page 1 whenever search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Filter → sort by priority → paginate
  const filteredVideos = sortByPriority(
    videos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / VIDEOS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageVideos = filteredVideos.slice((safePage - 1) * VIDEOS_PER_PAGE, safePage * VIDEOS_PER_PAGE);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Smooth scroll to the grid top
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-[2400px] mx-auto px-6 py-24">
      <div inert={selectedVideo ? true : undefined} className={selectedVideo ? 'pointer-events-none select-none' : ''}>

        {/* Grid Section */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
            <p className="text-black/20 dark:text-white/20 font-mono text-xs uppercase tracking-widest">Fetching from Odysee...</p>
          </div>
        ) : (
          <>
            {/* Pagination — top */}
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />

            {/* Grid */}
            <div ref={gridRef} className="scroll-mt-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={safePage}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8"
                >
                  {pageVideos.length > 0 ? (
                    pageVideos.map((video, idx) => (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: 'spring', stiffness: 100, damping: 15, delay: idx * 0.04 }}
                      >
                        <GlassCard
                          title={video.title}
                          thumbnail={video.thumbnail}
                          duration={video.duration}
                          onClick={() => setSelectedVideo(video)}
                          priority={idx < 8}
                        />
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-20 text-center">
                      <p className="text-black/20 dark:text-white/20 font-mono text-xs uppercase tracking-widest">No videos found in this channel.</p>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Pagination — bottom */}
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </>
        )}
      </div>

      {/* Video Modal */}
      <AnimatePresence>
        {selectedVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8"
          >
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => {
                if (history.state?.videoModal) history.back();
                setSelectedVideo(null);
              }}
              className="absolute inset-0 bg-white/20 dark:bg-black/60 backdrop-blur-md"
            />

            {/* Modal Content */}
            <motion.div
              initial={{ scale: 0.7, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.7, opacity: 0, y: 50 }}
              transition={{
                type: 'spring',
                damping: 28,
                stiffness: 180,
                opacity: { duration: 0.3 },
              }}
              className="relative w-full max-w-[95vw] md:max-w-[60vw] bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl rounded-xl p-4 md:p-6 shadow-[0_50px_120px_rgba(0,0,0,0.5)] border border-white/30 dark:border-white/10 flex flex-col items-center overflow-hidden"
            >
              <div className="w-full flex flex-col gap-6 items-center">
                {/* Video Container */}
                <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-transparent">
                  <iframe
                    src={selectedVideo.embed_url}
                    className="absolute top-0 left-0 w-full h-full border-none m-0 p-0"
                    allowFullScreen
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share; fullscreen"
                    referrerPolicy="no-referrer-when-downgrade"
                    loading="lazy"
                    style={{ background: 'transparent' }}
                  />
                  {/* Block Title Bar Overlay */}
                  <div className="absolute top-0 left-0 w-full h-[60px] bg-transparent z-10 pointer-events-auto cursor-default" />
                </div>

                {/* Info Section */}
                <div className="w-full px-2 pb-2 text-left">
                  <h2 className="text-lg md:text-xl font-bold text-black dark:text-white">
                    {selectedVideo.title}
                  </h2>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div inert={selectedVideo ? true : undefined} className={selectedVideo ? 'pointer-events-none select-none' : ''}>
        {/* Footer */}
        <footer className="mt-32 pt-12 border-t border-black/5 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 text-black/20 dark:text-white/20 text-xs font-mono uppercase tracking-widest">
          <div className="flex items-center gap-8">
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-black dark:hover:text-white transition-colors">Support</a>
          </div>
          <p>© 2026 Alis FX.</p>
        </footer>
      </div>
    </div>
  );
};
