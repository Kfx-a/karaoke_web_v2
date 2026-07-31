import React, { useEffect, useState } from 'react';
import { GlassCard } from './GlassCard';
import { ChevronLeft, ChevronRight, Search, Sun, Moon } from 'lucide-react';
import { fetchOdyseeVideos, sortByPriority, type OdyseeVideo } from '../services/odyseeService';

const VIDEOS_PER_PAGE = 16;
const THUMBNAIL_PRELOAD_TIMEOUT_MS = 10000;
const TEST_EMBED_VIDEOS: OdyseeVideo[] = [
  {
    id: 'youtube-test-NvccnhoXPQ4',
    name: 'youtube-test-NvccnhoXPQ4',
    title: 'YouTube test',
    thumbnail: 'https://img.youtube.com/vi/NvccnhoXPQ4/hqdefault.jpg',
    duration: 'YT',
    view_count: null,
    release_time: '',
    canonical_url: 'https://www.youtube-nocookie.com/embed/NvccnhoXPQ4?si=6y6cYboviDiLGzva',
    embed_url: 'https://www.youtube-nocookie.com/embed/NvccnhoXPQ4?si=6y6cYboviDiLGzva',
    description: '[test]',
  },
  {
    id: 'dailymotion-test-x2zw06g',
    name: 'dailymotion-test-x2zw06g',
    title: 'Dailymotion test',
    thumbnail: 'https://www.dailymotion.com/thumbnail/video/x2zw06g',
    duration: 'DM',
    view_count: null,
    release_time: '',
    canonical_url: 'https://geo.dailymotion.com/player.html?video=x2zw06g',
    embed_url: 'https://geo.dailymotion.com/player.html?video=x2zw06g',
    description: '[test]',
  },
  {
    id: 'vimeo-test-133230974',
    name: 'vimeo-test-133230974',
    title: 'Etotama Opening Karaoke AFX',
    thumbnail: 'https://vumbnail.com/133230974.jpg',
    duration: 'VM',
    view_count: null,
    release_time: '',
    canonical_url: 'https://player.vimeo.com/video/133230974?badge=0&autopause=0&player_id=0&app_id=58479',
    embed_url: 'https://player.vimeo.com/video/133230974?badge=0&autopause=0&player_id=0&app_id=58479',
    description: '[test]',
  },
];

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
  const btnBase = 'pagination-button flex items-center justify-center w-8 h-8 rounded-md text-xs font-bold transition-colors duration-150 select-none';
  const btnActive = 'pagination-active';
  const btnNormal = isDark ? 'pagination-dark' : 'pagination-light';
  const btnArrow = isDark ? 'pagination-dark' : 'pagination-light';
  const ellipsisColor = isDark ? 'text-zinc-500' : 'text-zinc-400';

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
  revealContent?: boolean;
  onInitialContentReady?: () => void;
  onToggleTheme?: () => void;
}

function preloadImage(src: string): Promise<void> {
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;

    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };

    const timer = window.setTimeout(finish, THUMBNAIL_PRELOAD_TIMEOUT_MS);
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    image.onload = finish;
    image.onerror = finish;
    image.src = src;
  });
}

async function preloadInitialThumbnails(videos: OdyseeVideo[]) {
  await Promise.all(videos.slice(0, VIDEOS_PER_PAGE).map(video => preloadImage(video.thumbnail)));
}

function insertVideosAtRandomIndexes(videos: OdyseeVideo[], testVideos: OdyseeVideo[]): OdyseeVideo[] {
  return testVideos.reduce((items, video) => {
    const filteredItems = items.filter(item => item.id !== video.id);
    const randomIndex = Math.floor(Math.random() * (filteredItems.length + 1));
    return [
      ...filteredItems.slice(0, randomIndex),
      video,
      ...filteredItems.slice(randomIndex),
    ];
  }, videos);
}

function getAutoplayEmbedUrl(embedUrl: string): string {
  try {
    const url = new URL(embedUrl);
    url.searchParams.set('autoplay', '1');
    if (url.hostname.includes('youtube')) {
      url.searchParams.set('mute', '1');
    } else if (url.hostname.includes('dailymotion')) {
      url.searchParams.set('mute', 'true');
    } else if (url.hostname.includes('vimeo')) {
      url.searchParams.set('muted', '1');
    }
    return url.toString();
  } catch {
    return embedUrl.includes('?') ? `${embedUrl}&autoplay=1` : `${embedUrl}?autoplay=1`;
  }
}

export const PlayerGrid: React.FC<PlayerGridProps> = ({
  isDark = true,
  revealContent = true,
  onInitialContentReady,
  onToggleTheme,
}) => {
  const [videos, setVideos] = useState<OdyseeVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVideo, setSelectedVideo] = useState<OdyseeVideo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [initialCardsAnimated, setInitialCardsAnimated] = useState(false);
  const [pageDirection, setPageDirection] = useState<'next' | 'previous'>('next');
  const [pageTransitionPhase, setPageTransitionPhase] = useState<'idle' | 'sliding'>('idle');
  const [outgoingPageVideos, setOutgoingPageVideos] = useState<OdyseeVideo[] | null>(null);

  useEffect(() => {
    if (selectedVideo) {
      document.body.style.overflow = 'hidden';
      history.pushState({ videoModal: true }, '');
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
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
        const dataWithTestVideos = insertVideosAtRandomIndexes(data, TEST_EMBED_VIDEOS);
        await preloadInitialThumbnails(dataWithTestVideos);
        if (isMounted) setVideos(dataWithTestVideos);
      } finally {
        if (isMounted) {
          setLoading(false);
          onInitialContentReady?.();
        }
      }
    };

    loadVideos();

    return () => {
      isMounted = false;
    };
  }, [onInitialContentReady]);

  useEffect(() => {
    setCurrentPage(1);
    setOutgoingPageVideos(null);
    setPageTransitionPhase('idle');
  }, [searchQuery]);

  const filteredVideos = sortByPriority(
    videos.filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const totalPages = Math.max(1, Math.ceil(filteredVideos.length / VIDEOS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const pageVideos = filteredVideos.slice((safePage - 1) * VIDEOS_PER_PAGE, safePage * VIDEOS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page === safePage || pageTransitionPhase !== 'idle') return;
    setPageDirection(page > safePage ? 'next' : 'previous');
    setOutgoingPageVideos(pageVideos);
    setPageTransitionPhase('sliding');
    setCurrentPage(page);
  };

  const closeModal = () => {
    if (history.state?.videoModal) history.back();
    setSelectedVideo(null);
  };

  const mutedText = isDark ? 'text-white/30' : 'text-gray-500';
  const shouldAnimateInitialCards = revealContent && !initialCardsAnimated;
  const cardEntryClass = shouldAnimateInitialCards
    ? 'grid-entry grid-entry-visible'
    : initialCardsAnimated
      ? undefined
      : 'grid-initial-hidden';

  const renderCards = (items: OdyseeVideo[], animateInitialEntry = false) => {
    if (items.length === 0) {
      return (
        <div className="col-span-full py-20 text-center">
          <p className={`${mutedText} font-mono text-xs uppercase tracking-widest`}>No videos found.</p>
        </div>
      );
    }

    return items.map((video, idx) => (
      <div
        key={video.id}
        className={animateInitialEntry ? cardEntryClass : undefined}
        style={animateInitialEntry && shouldAnimateInitialCards ? { animationDelay: `${Math.min(idx * 25, 400)}ms` } : undefined}
        onAnimationEnd={animateInitialEntry && idx === items.length - 1 ? () => setInitialCardsAnimated(true) : undefined}
      >
        <GlassCard
          title={video.title}
          thumbnail={video.thumbnail}
          duration={video.duration}
          viewCount={video.view_count}
          onClick={() => setSelectedVideo(video)}
          priority={idx < 8}
        />
      </div>
    ));
  };

  const handleOutgoingPageAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;
    setOutgoingPageVideos(null);
  };

  const handleIncomingPageAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {
    if (event.currentTarget !== event.target) return;
    setPageTransitionPhase('idle');
  };

  return (
    <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <button
        onClick={onToggleTheme}
        className={[
          'fixed top-6 right-4 md:top-10 md:right-6 z-[180]',
          'w-11 h-11 flex items-center justify-center rounded-lg border transition-colors shrink-0',
          isDark
            ? 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white'
            : 'bg-white border-zinc-300 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-950',
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
              'w-full h-11 pl-4 pr-12 rounded-lg text-sm outline-none transition-colors border',
              'focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20',
              isDark
                ? 'bg-zinc-900 border-zinc-700 text-white placeholder-zinc-500'
                : 'bg-white border-zinc-300 text-zinc-950 placeholder-zinc-500',
            ].join(' ')}
          />
          <Search className={`absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors group-focus-within/search:text-rose-500 ${isDark ? 'text-zinc-500' : 'text-zinc-500'}`} />
        </div>
      </div>

      <div inert={selectedVideo ? true : undefined} className={selectedVideo ? 'pointer-events-none select-none' : ''}>
        <div className="flex items-center justify-center mb-5">
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} isDark={isDark} />
        </div>

        {!loading && (
          <div className="scroll-mt-8">
            <div className="grid-page-viewport">
              {outgoingPageVideos && (
                <div
                  className={`grid-page grid-page-outgoing grid-page-outgoing-${pageDirection} grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6`}
                  onAnimationEnd={handleOutgoingPageAnimationEnd}
                >
                  {renderCards(outgoingPageVideos)}
                </div>
              )}
              <div
                key={safePage}
                className={`grid-page ${pageTransitionPhase === 'sliding' ? `grid-page-incoming grid-page-incoming-${pageDirection}` : ''} grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-5 lg:gap-6`}
                onAnimationEnd={pageTransitionPhase === 'sliding' ? handleIncomingPageAnimationEnd : undefined}
              >
                {renderCards(pageVideos, true)}
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-center mt-10">
          <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={handlePageChange} isDark={isDark} />
        </div>
      </div>

      {selectedVideo && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-6 md:p-8">
          <div onClick={closeModal} className="video-modal-backdrop" />

          <div className="video-modal max-w-[98vw] sm:max-w-[90vw] md:max-w-[75vw] lg:max-w-[65vw]">
              <div className="modal-video-shell w-full bg-black overflow-hidden">
                <iframe
                  key={selectedVideo.id}
                  src={getAutoplayEmbedUrl(selectedVideo.embed_url)}
                  title={selectedVideo.title}
                  className="modal-video-frame"
                  allowFullScreen
                  allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media; web-share"
                  referrerPolicy="no-referrer-when-downgrade"
                  loading="eager"
                />
              </div>

              <div className="video-modal-title w-full px-3 py-3 md:px-4 md:py-4 shrink-0">
                <h2 className="text-sm md:text-base font-semibold text-white line-clamp-2">
                  {selectedVideo.title}
                </h2>
              </div>
          </div>
        </div>
      )}

    </div>
  );
};
