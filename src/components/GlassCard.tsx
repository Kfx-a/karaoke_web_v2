import React from 'react';
import { Eye, Play } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps {
  title: string;
  thumbnail: string;
  duration: string;
  viewCount: number | null;
  className?: string;
  onClick?: () => void;
  priority?: boolean;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  title,
  thumbnail,
  duration,
  viewCount,
  className,
  onClick,
  priority = false,
}) => {
  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (!onClick || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    onClick();
  };

  const formattedViews = viewCount === null
    ? '--'
    : new Intl.NumberFormat('es', {
        notation: 'compact',
        maximumFractionDigits: 1,
      }).format(viewCount);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`Reproducir ${title}`}
      className={cn(
        'group cursor-pointer relative rounded-[20px] h-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff0080]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
        'transition-transform duration-300 ease-out',
        'hover:scale-[1.03] active:scale-[0.98]',
        className
      )}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      style={{ willChange: 'transform' }}
    >
      <div className="glass-card flex flex-col w-full h-full pt-0 px-0 pb-1 transition-shadow duration-300 z-10">
        <div className="relative w-full aspect-video overflow-hidden rounded-[8px] border border-black/10 dark:border-white/30 shrink-0">
          <img
            src={thumbnail}
            alt={title}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
            referrerPolicy="no-referrer"
          />

          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div className="scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300 bg-white/20 backdrop-blur-md w-12 h-12 rounded-full flex items-center justify-center border border-white/30">
              <Play className="w-5 h-5 text-white fill-white translate-x-0.5" />
            </div>
          </div>

          <div className="absolute bottom-2 right-2 z-20">
            <span className="text-[10px] font-mono font-bold tracking-widest text-white bg-white/10 backdrop-blur-md border border-white/30 px-1.5 py-0.5 rounded shadow-lg">
              {duration}
            </span>
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent z-10 pointer-events-none opacity-50" />
        </div>

        <div className="relative z-20 flex justify-between items-start gap-3 p-3 lg:p-4 flex-1">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white/90 line-clamp-2 leading-snug group-hover:text-black dark:group-hover:text-white transition-colors">
              {title}
            </h3>
          </div>

          <span
            className="inline-flex items-center gap-1.5 shrink-0 mt-0.5 text-[11px] font-mono font-semibold tracking-wide text-gray-600 dark:text-white/55"
            aria-label={`${viewCount ?? 0} visitas`}
            title={`${viewCount ?? 0} visitas`}
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
            <span>{formattedViews}</span>
          </span>
        </div>
      </div>
    </div>
  );
};
